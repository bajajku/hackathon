from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


class GoogleSpeechTranscriber:
    """
    Transcribes browser-captured audio chunks via Google Cloud Speech-to-Text.

    The frontend records short WebM/Opus chunks (each chunk is a complete,
    decodable WebM file because the recorder is restarted between chunks),
    uploads them to the agent, and the agent calls `recognize` per chunk.
    """

    DEFAULT_ENCODING = 'WEBM_OPUS'
    DEFAULT_SAMPLE_RATE = 48000
    DEFAULT_LANGUAGE = 'en-US'

    def __init__(
        self,
        *,
        language_code: str = DEFAULT_LANGUAGE,
        sample_rate_hz: int = DEFAULT_SAMPLE_RATE,
    ) -> None:
        self._client = None
        self._language_code = language_code
        self._sample_rate_hz = sample_rate_hz

    def _ensure_client(self):
        if self._client is not None:
            return self._client
        try:
            from google.cloud import speech  # type: ignore
        except Exception as exc:  # pragma: no cover - optional dependency path
            raise RuntimeError('google-cloud-speech client not available') from exc
        self._client = speech.SpeechClient()
        return self._client

    def transcribe_chunk(
        self,
        *,
        audio_bytes: bytes,
        timestamp_ms: int,
        speaker: str | None = None,
        encoding: str | None = None,
        sample_rate_hz: int | None = None,
        language_code: str | None = None,
    ) -> list[dict[str, Any]]:
        if not audio_bytes:
            return []

        client = self._ensure_client()
        from google.cloud import speech  # type: ignore

        encoding_name = (encoding or self.DEFAULT_ENCODING).upper()
        encoding_enum = getattr(
            speech.RecognitionConfig.AudioEncoding,
            encoding_name,
            speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
        )

        config = speech.RecognitionConfig(
            encoding=encoding_enum,
            sample_rate_hertz=sample_rate_hz or self._sample_rate_hz,
            language_code=language_code or self._language_code,
            enable_automatic_punctuation=True,
            model='latest_long',
        )
        audio = speech.RecognitionAudio(content=audio_bytes)
        response = client.recognize(config=config, audio=audio)

        observed_at = datetime.now(timezone.utc).isoformat()
        chunks: list[dict[str, Any]] = []
        for result in response.results or []:
            alternatives = list(result.alternatives or [])
            if not alternatives:
                continue
            best = alternatives[0]
            text = (best.transcript or '').strip()
            if not text:
                continue
            chunks.append(
                {
                    'speaker': speaker or 'host',
                    'text': text,
                    'isFinal': True,
                    'source': 'google_stt_recognize',
                    'startMs': timestamp_ms,
                    'endMs': None,
                    'confidence': float(best.confidence) if best.confidence else None,
                    'observedAt': observed_at,
                }
            )
        return chunks
