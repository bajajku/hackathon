from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import json
from typing import Any, Protocol

import httpx


def _clip(text: str, max_len: int) -> str:
    text = text.strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 1].rstrip() + '…'


def build_rolling_prompt(
    *,
    room_name: str,
    session_id: str,
    transcripts: list[dict[str, Any]],
    vision_events: list[dict[str, Any]],
) -> str:
    transcript_lines = []
    for chunk in transcripts[-30:]:
        speaker = chunk.get('speaker') or 'Speaker'
        text = _clip(str(chunk.get('text', '')), 280)
        transcript_lines.append(f'- [{speaker}] {text}')
    if not transcript_lines:
        transcript_lines.append('- No transcript chunks yet.')

    vision_lines = []
    for event in vision_events[-20:]:
        if event.get('error'):
            vision_lines.append(f"- Vision error: {_clip(str(event['error']), 240)}")
            continue
        ocr = _clip(str(event.get('ocrText') or ''), 240)
        labels = _clip(str(event.get('labels') or ''), 120)
        if ocr or labels:
            vision_lines.append(f'- OCR: {ocr} | Labels: {labels}')
    if not vision_lines:
        vision_lines.append('- No new visual changes.')

    return (
        'You are generating an incremental meeting summary from live transcript and screen-share OCR.\n'
        f'Room: {room_name}\n'
        f'Session ID: {session_id}\n'
        'Respond as strict JSON with keys: key_points (string[]), action_items (string[]), '
        'open_questions (string[]), confidence (number 0..1), notes (string).\n\n'
        'Latest transcript window:\n'
        + '\n'.join(transcript_lines)
        + '\n\nLatest screen window:\n'
        + '\n'.join(vision_lines)
    )


def build_final_prompt(
    *,
    room_name: str,
    session_id: str,
    transcript_text: str,
    vision_text: str,
) -> str:
    transcript_text = _clip(transcript_text, 16_000)
    vision_text = _clip(vision_text, 8_000)
    return (
        'You are generating a final meeting summary that combines spoken discussion and screen-share evidence.\n'
        f'Room: {room_name}\n'
        f'Session ID: {session_id}\n'
        'Return strict JSON with keys: title, summary, key_points (string[]), action_items (string[]), '
        'decisions (string[]), risks (string[]), visual_evidence (string[]).\n\n'
        'Transcript:\n'
        f'{transcript_text}\n\n'
        'Vision timeline:\n'
        f'{vision_text}\n'
    )


@dataclass
class SummaryResult:
    payload: dict[str, Any]
    model: str


class Summarizer(Protocol):
    def summarize_rolling(self, prompt: str) -> SummaryResult:
        ...

    def summarize_final(self, prompt: str) -> SummaryResult:
        ...


def _parse_json_text(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith('```'):
        text = text.strip('`')
        if '\n' in text:
            text = text.split('\n', 1)[1]
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {
            'summary': _clip(text, 3000),
            'key_points': [],
            'action_items': [],
            'open_questions': [],
            'confidence': 0.35,
            'notes': 'Model returned non-JSON response.',
        }


class VertexGeminiSummarizer:
    def __init__(self, *, project: str | None, location: str, model: str) -> None:
        self._project = project
        self._location = location
        self._model_name = model
        self._active_model_name = model
        self._model_cache: dict[str, Any] = {}

    def _ensure_vertex(self):
        try:
            import vertexai  # type: ignore
            from vertexai.generative_models import GenerativeModel  # type: ignore
        except Exception as exc:  # pragma: no cover - optional dependency path
            raise RuntimeError('vertexai client not available') from exc

        if not self._project:
            raise RuntimeError('GCP_PROJECT is required for Vertex Gemini summarization')

        vertexai.init(project=self._project, location=self._location)
        return GenerativeModel

    def _candidate_models(self) -> list[str]:
        candidates = [
            self._active_model_name,
            self._model_name,
            'gemini-2.5-flash',
            'gemini-2.5-flash-lite',
        ]
        # Preserve order while de-duping.
        return list(dict.fromkeys(candidates))

    def _generate_text(self, prompt: str) -> tuple[str, str]:
        GenerativeModel = self._ensure_vertex()
        errors: list[str] = []
        for model_name in self._candidate_models():
            try:
                model = self._model_cache.get(model_name)
                if model is None:
                    model = GenerativeModel(model_name)
                    self._model_cache[model_name] = model
                response = model.generate_content(prompt)
                self._active_model_name = model_name
                return (getattr(response, 'text', '') or '', model_name)
            except Exception as exc:
                errors.append(f'{model_name}: {type(exc).__name__}')
        raise RuntimeError('All Vertex model candidates failed: ' + '; '.join(errors))

    def summarize_rolling(self, prompt: str) -> SummaryResult:
        text, model_name = self._generate_text(prompt)
        parsed = _parse_json_text(text)
        parsed.setdefault('generatedAt', datetime.now(timezone.utc).isoformat())
        return SummaryResult(payload=parsed, model=model_name)

    def summarize_final(self, prompt: str) -> SummaryResult:
        text, model_name = self._generate_text(prompt)
        parsed = _parse_json_text(text)
        parsed.setdefault('generatedAt', datetime.now(timezone.utc).isoformat())
        return SummaryResult(payload=parsed, model=model_name)


class OllamaSummarizer:
    def __init__(
        self,
        *,
        base_url: str,
        model: str,
        timeout_seconds: float = 45.0,
    ) -> None:
        self._base_url = base_url.rstrip('/')
        self._model = model
        self._timeout = timeout_seconds

    def _generate_text(self, prompt: str) -> tuple[str, str]:
        payload = {
            'model': self._model,
            'prompt': prompt,
            'stream': False,
            'format': 'json',
        }
        with httpx.Client(timeout=self._timeout) as client:
            response = client.post(
                f'{self._base_url}/api/generate',
                json=payload,
            )
            response.raise_for_status()
            body = response.json()

        text = str(body.get('response') or '').strip()
        if not text:
            raise RuntimeError('Ollama returned an empty response payload')
        return text, self._model

    def summarize_rolling(self, prompt: str) -> SummaryResult:
        text, model_name = self._generate_text(prompt)
        parsed = _parse_json_text(text)
        parsed.setdefault('generatedAt', datetime.now(timezone.utc).isoformat())
        return SummaryResult(payload=parsed, model=f'ollama:{model_name}')

    def summarize_final(self, prompt: str) -> SummaryResult:
        text, model_name = self._generate_text(prompt)
        parsed = _parse_json_text(text)
        parsed.setdefault('generatedAt', datetime.now(timezone.utc).isoformat())
        return SummaryResult(payload=parsed, model=f'ollama:{model_name}')


class FallbackSummarizer:
    def summarize_rolling(self, prompt: str) -> SummaryResult:
        return SummaryResult(
            payload={
                'key_points': ['Rolling summary fallback in use (Vertex unavailable).'],
                'action_items': [],
                'open_questions': [],
                'confidence': 0.2,
                'notes': _clip(prompt, 600),
                'generatedAt': datetime.now(timezone.utc).isoformat(),
            },
            model='fallback',
        )

    def summarize_final(self, prompt: str) -> SummaryResult:
        return SummaryResult(
            payload={
                'title': 'Meeting Summary (Fallback)',
                'summary': 'Vertex Gemini unavailable. Captured transcript and vision artifacts were saved.',
                'key_points': ['Check transcript.jsonl and vision.jsonl for raw extracted content.'],
                'action_items': [],
                'decisions': [],
                'risks': ['Final summary generated without LLM due to unavailable Vertex client.'],
                'visual_evidence': [],
                'generatedAt': datetime.now(timezone.utc).isoformat(),
                'promptExcerpt': _clip(prompt, 700),
            },
            model='fallback',
        )
