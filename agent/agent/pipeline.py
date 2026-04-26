from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import asyncio
import json
from pathlib import Path
from typing import Any
from uuid import uuid4

from .artifacts import ArtifactStore, SessionArtifacts
from .config import Settings
from .store import SessionStore
from .summarizer import (
    FallbackSummarizer,
    VertexGeminiSummarizer,
    build_final_prompt,
    build_rolling_prompt,
)
from .transcription import GoogleSpeechTranscriber
from .vision import GoogleVisionClient, dhash_hex, hamming_distance, sha256_hex


def now_ms() -> int:
    return int(datetime.now(tz=timezone.utc).timestamp() * 1000)


def iso_now() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


@dataclass(frozen=True)
class FrameEnvelope:
    timestamp_ms: int
    image_bytes: bytes


@dataclass(frozen=True)
class AudioEnvelope:
    timestamp_ms: int
    audio_bytes: bytes
    encoding: str
    sample_rate_hz: int
    language_code: str
    speaker: str | None


class SessionRuntime:
    def __init__(
        self,
        *,
        session_id: str,
        room_name: str,
        world_id: str | None,
        settings: Settings,
        store: SessionStore,
        artifact_store: ArtifactStore,
        transcriber: GoogleSpeechTranscriber,
        vision_client: GoogleVisionClient,
        summarizer: VertexGeminiSummarizer | FallbackSummarizer,
    ) -> None:
        self.session_id = session_id
        self.room_name = room_name
        self.world_id = world_id
        self.settings = settings
        self.store = store
        self.artifact_store = artifact_store
        self.transcriber = transcriber
        self.vision_client = vision_client
        self.summarizer = summarizer

        self.stop_event = asyncio.Event()
        self.frame_queue: asyncio.Queue[FrameEnvelope] = asyncio.Queue(maxsize=settings.frame_queue_size)
        self.audio_queue: asyncio.Queue[AudioEnvelope] = asyncio.Queue(maxsize=settings.audio_queue_size)
        self.tasks: list[asyncio.Task[None]] = []
        self.artifacts: SessionArtifacts = artifact_store.paths_for(session_id)

        self._vision_last_dhash: str | None = None
        self._transcript_cursor_id: int = 0
        self._vision_cursor_id: int = 0

    async def start(self) -> None:
        created_at = now_ms()
        self.store.create_session(
            session_id=self.session_id,
            room_name=self.room_name,
            world_id=self.world_id,
            created_at=created_at,
            transcript_path=str(self.artifacts.transcript_jsonl),
            vision_path=str(self.artifacts.vision_jsonl),
            rolling_summary_path=str(self.artifacts.rolling_summary_jsonl),
            final_summary_path=str(self.artifacts.final_summary_json),
        )

        self.tasks = [
            asyncio.create_task(self._transcribe_worker(), name=f'transcribe:{self.session_id}'),
            asyncio.create_task(self._vision_worker(), name=f'vision:{self.session_id}'),
            asyncio.create_task(self._summary_worker(), name=f'summary:{self.session_id}'),
        ]

    async def enqueue_frame(self, frame: FrameEnvelope) -> None:
        if self.stop_event.is_set():
            raise RuntimeError('session is stopping')
        try:
            self.frame_queue.put_nowait(frame)
        except asyncio.QueueFull as exc:
            raise RuntimeError('frame queue is full') from exc

    async def enqueue_audio(self, envelope: AudioEnvelope) -> None:
        if self.stop_event.is_set():
            raise RuntimeError('session is stopping')
        try:
            self.audio_queue.put_nowait(envelope)
        except asyncio.QueueFull as exc:
            raise RuntimeError('audio queue is full') from exc

    async def stop(self) -> None:
        self.store.update_session_status(self.session_id, status='stopping', updated_at=now_ms())
        self.stop_event.set()

        if self.tasks:
            done, pending = await asyncio.wait(self.tasks, timeout=20)
            for task in pending:
                task.cancel()
            for task in done:
                if task.exception() is not None:
                    self._record_runtime_error(task.exception())

        await self._generate_final_summary()
        self.store.update_session_status(
            self.session_id,
            status='ready',
            updated_at=now_ms(),
            stopped_at=now_ms(),
        )

    def _record_runtime_error(self, error: BaseException) -> None:
        self.store.update_session_status(
            self.session_id,
            status='running',
            updated_at=now_ms(),
            error=f'{type(error).__name__}: {error}',
        )

    async def _persist_transcript_chunk(self, payload: dict[str, Any]) -> None:
        created_at = now_ms()
        row_id = self.store.add_transcript_chunk(self.session_id, payload, created_at)
        persisted = {
            'id': row_id,
            'createdAt': created_at,
            **payload,
        }
        self.artifact_store.append_jsonl(self.artifacts.transcript_jsonl, persisted)

    async def _transcribe_worker(self) -> None:
        while not self.stop_event.is_set() or not self.audio_queue.empty():
            try:
                envelope = await asyncio.wait_for(self.audio_queue.get(), timeout=0.5)
            except asyncio.TimeoutError:
                continue

            try:
                chunks = await asyncio.to_thread(
                    self.transcriber.transcribe_chunk,
                    audio_bytes=envelope.audio_bytes,
                    timestamp_ms=envelope.timestamp_ms,
                    speaker=envelope.speaker,
                    encoding=envelope.encoding,
                    sample_rate_hz=envelope.sample_rate_hz,
                    language_code=envelope.language_code,
                )
            except Exception as exc:
                await self._persist_transcript_chunk(
                    {
                        'speaker': 'system',
                        'text': f'Transcription error: {type(exc).__name__}: {exc}',
                        'isFinal': True,
                        'source': 'google_stt_error',
                        'startMs': envelope.timestamp_ms,
                        'endMs': None,
                        'observedAt': iso_now(),
                    }
                )
                continue

            for chunk in chunks:
                await self._persist_transcript_chunk(chunk)

    async def _vision_worker(self) -> None:
        while not self.stop_event.is_set() or not self.frame_queue.empty():
            try:
                frame = await asyncio.wait_for(self.frame_queue.get(), timeout=0.5)
            except asyncio.TimeoutError:
                continue

            try:
                digest = sha256_hex(frame.image_bytes)
                perception = await asyncio.to_thread(dhash_hex, frame.image_bytes)
                if (
                    self._vision_last_dhash is not None
                    and hamming_distance(self._vision_last_dhash, perception)
                    <= self.settings.vision_dedupe_hamming_threshold
                ):
                    continue
                self._vision_last_dhash = perception

                analysis = await asyncio.to_thread(self.vision_client.analyze, frame.image_bytes)
                payload = {
                    'frameTsMs': frame.timestamp_ms,
                    'frameHash': digest,
                    'ocrText': analysis.get('ocrText', ''),
                    'labels': analysis.get('labels', []),
                    'labelsJson': json.dumps(analysis.get('labels', []), ensure_ascii=True),
                    'error': None,
                }
            except Exception as exc:
                payload = {
                    'frameTsMs': frame.timestamp_ms,
                    'frameHash': None,
                    'ocrText': None,
                    'labels': [],
                    'labelsJson': json.dumps([], ensure_ascii=True),
                    'error': f'{type(exc).__name__}: {exc}',
                }

            created_at = now_ms()
            row_id = self.store.add_vision_event(self.session_id, payload, created_at)
            persisted = {
                'id': row_id,
                'createdAt': created_at,
                'frameTsMs': payload['frameTsMs'],
                'frameHash': payload['frameHash'],
                'ocrText': payload['ocrText'],
                'labels': payload['labels'],
                'error': payload['error'],
            }
            self.artifact_store.append_jsonl(self.artifacts.vision_jsonl, persisted)

    async def _summary_worker(self) -> None:
        while not self.stop_event.is_set():
            await asyncio.sleep(self.settings.summary_interval_seconds)
            try:
                await self._generate_rolling_summary()
            except Exception as exc:
                payload = {
                    'generatedAt': iso_now(),
                    'error': f'{type(exc).__name__}: {exc}',
                    'model': 'summary_worker_error',
                }
                created_at = now_ms()
                self.store.add_summary_update(
                    self.session_id,
                    kind='rolling',
                    payload_json=json.dumps(payload, ensure_ascii=True),
                    created_at=created_at,
                )
                self.artifact_store.append_jsonl(self.artifacts.rolling_summary_jsonl, payload)

    async def _generate_rolling_summary(self) -> None:
        transcript_chunks = self.store.list_transcript_chunks(
            self.session_id,
            after_id=self._transcript_cursor_id,
            limit=400,
        )
        vision_events = self.store.list_vision_events(
            self.session_id,
            after_id=self._vision_cursor_id,
            limit=250,
        )

        if not transcript_chunks and not vision_events:
            return

        prompt = build_rolling_prompt(
            room_name=self.room_name,
            session_id=self.session_id,
            transcripts=transcript_chunks,
            vision_events=vision_events,
        )
        try:
            result = await asyncio.to_thread(self.summarizer.summarize_rolling, prompt)
        except Exception:
            fallback = FallbackSummarizer()
            result = await asyncio.to_thread(fallback.summarize_rolling, prompt)
        payload = {
            **result.payload,
            'model': result.model,
            'kind': 'rolling',
            'generatedAt': result.payload.get('generatedAt', iso_now()),
            'window': {
                'transcriptCount': len(transcript_chunks),
                'visionCount': len(vision_events),
            },
        }

        created_at = now_ms()
        self.store.add_summary_update(
            self.session_id,
            kind='rolling',
            payload_json=json.dumps(payload, ensure_ascii=True),
            created_at=created_at,
        )
        self.artifact_store.append_jsonl(self.artifacts.rolling_summary_jsonl, payload)

        if transcript_chunks:
            self._transcript_cursor_id = int(transcript_chunks[-1]['id'])
        if vision_events:
            self._vision_cursor_id = int(vision_events[-1]['id'])

    def _collect_full_transcript_text(self) -> str:
        chunks: list[str] = []
        cursor = 0
        while True:
            batch = self.store.list_transcript_chunks(self.session_id, after_id=cursor, limit=500)
            if not batch:
                break
            for item in batch:
                speaker = item.get('speaker') or 'Speaker'
                text = (item.get('text') or '').strip()
                if not text:
                    continue
                chunks.append(f'[{speaker}] {text}')
            cursor = int(batch[-1]['id'])
        return '\n'.join(chunks)

    def _collect_full_vision_text(self) -> str:
        lines: list[str] = []
        cursor = 0
        while True:
            batch = self.store.list_vision_events(self.session_id, after_id=cursor, limit=500)
            if not batch:
                break
            for item in batch:
                if item.get('error'):
                    lines.append(f"ERROR: {item['error']}")
                    continue
                ocr = (item.get('ocrText') or '').strip()
                labels_raw = item.get('labelsJson') or '[]'
                try:
                    labels = json.loads(labels_raw)
                except json.JSONDecodeError:
                    labels = []
                lines.append(f"OCR: {ocr} | labels: {', '.join(labels)}")
            cursor = int(batch[-1]['id'])
        return '\n'.join(lines)

    async def _generate_final_summary(self) -> None:
        transcript_text = self._collect_full_transcript_text()
        vision_text = self._collect_full_vision_text()

        prompt = build_final_prompt(
            room_name=self.room_name,
            session_id=self.session_id,
            transcript_text=transcript_text,
            vision_text=vision_text,
        )

        try:
            result = await asyncio.to_thread(self.summarizer.summarize_final, prompt)
        except Exception:
            fallback = FallbackSummarizer()
            result = await asyncio.to_thread(fallback.summarize_final, prompt)
        payload = {
            **result.payload,
            'model': result.model,
            'kind': 'final',
            'generatedAt': result.payload.get('generatedAt', iso_now()),
        }

        self.artifact_store.write_json(self.artifacts.final_summary_json, payload)
        created_at = now_ms()
        self.store.add_summary_update(
            self.session_id,
            kind='final',
            payload_json=json.dumps(payload, ensure_ascii=True),
            created_at=created_at,
        )


class SessionManager:
    def __init__(
        self,
        *,
        settings: Settings,
        store: SessionStore,
        artifact_store: ArtifactStore,
        transcriber: GoogleSpeechTranscriber | None = None,
        vision_client: GoogleVisionClient | None = None,
        summarizer: VertexGeminiSummarizer | FallbackSummarizer | None = None,
    ) -> None:
        self.settings = settings
        self.store = store
        self.artifact_store = artifact_store

        self.transcriber = transcriber or GoogleSpeechTranscriber()
        self.vision_client = vision_client or GoogleVisionClient()
        self.summarizer: VertexGeminiSummarizer | FallbackSummarizer = summarizer or VertexGeminiSummarizer(
            project=settings.gcp_project,
            location=settings.gcp_location,
            model=settings.vertex_model,
        )

        self._runtimes: dict[str, SessionRuntime] = {}
        self._lock = asyncio.Lock()

    async def start_session(self, *, room_name: str, world_id: str | None) -> str:
        session_id = f'sess_{uuid4().hex[:16]}'
        runtime = SessionRuntime(
            session_id=session_id,
            room_name=room_name,
            world_id=world_id,
            settings=self.settings,
            store=self.store,
            artifact_store=self.artifact_store,
            transcriber=self.transcriber,
            vision_client=self.vision_client,
            summarizer=self.summarizer,
        )
        await runtime.start()
        async with self._lock:
            self._runtimes[session_id] = runtime
        return session_id

    async def ingest_frame(self, *, session_id: str, timestamp_ms: int, frame_bytes: bytes) -> None:
        runtime = await self._get_runtime(session_id)
        await runtime.enqueue_frame(FrameEnvelope(timestamp_ms=timestamp_ms, image_bytes=frame_bytes))

    async def ingest_audio(
        self,
        *,
        session_id: str,
        timestamp_ms: int,
        audio_bytes: bytes,
        encoding: str,
        sample_rate_hz: int,
        language_code: str,
        speaker: str | None,
    ) -> None:
        runtime = await self._get_runtime(session_id)
        await runtime.enqueue_audio(
            AudioEnvelope(
                timestamp_ms=timestamp_ms,
                audio_bytes=audio_bytes,
                encoding=encoding,
                sample_rate_hz=sample_rate_hz,
                language_code=language_code,
                speaker=speaker,
            )
        )

    async def stop_session(self, *, session_id: str) -> None:
        runtime = await self._get_runtime(session_id)
        await runtime.stop()
        async with self._lock:
            self._runtimes.pop(session_id, None)

    async def _get_runtime(self, session_id: str) -> SessionRuntime:
        async with self._lock:
            runtime = self._runtimes.get(session_id)
        if runtime is None:
            raise KeyError(f'Unknown or inactive session: {session_id}')
        return runtime

    async def get_session_view(self, *, session_id: str) -> dict[str, Any] | None:
        row = self.store.get_session(session_id)
        if row is None:
            return None

        latest_rolling = self.artifact_store.read_last_jsonl(Path(row.rolling_summary_path))
        final_summary = self.artifact_store.read_json(Path(row.final_summary_path))

        return {
            'sessionId': row.id,
            'roomName': row.room_name,
            'worldId': row.world_id,
            'status': row.status,
            'createdAt': row.created_at,
            'updatedAt': row.updated_at,
            'stoppedAt': row.stopped_at,
            'error': row.error,
            'artifacts': {
                'transcriptJsonl': row.transcript_path,
                'visionJsonl': row.vision_path,
                'rollingSummaryJsonl': row.rolling_summary_path,
                'finalSummaryJson': row.final_summary_path,
            },
            'latestRollingSummary': latest_rolling,
            'finalSummary': final_summary,
        }
