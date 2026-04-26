import asyncio
from datetime import datetime, timezone

import pytest

from agent.artifacts import ArtifactStore
from agent.config import Settings
from agent.pipeline import SessionManager
from agent.store import SessionStore
from agent.summarizer import SummaryResult


class FakeTranscriber:
    def transcribe_chunk(
        self,
        *,
        audio_bytes: bytes,
        timestamp_ms: int,
        speaker: str | None,
        encoding: str,
        sample_rate_hz: int,
        language_code: str,
    ):
        return [
            {
                'speaker': speaker or 'Alice',
                'text': f'chunk-{len(audio_bytes)}-{timestamp_ms}',
                'isFinal': True,
                'source': 'fake_stt',
                'startMs': timestamp_ms,
                'endMs': None,
                'observedAt': datetime.now(timezone.utc).isoformat(),
            }
        ]


class FakeVisionClient:
    def analyze(self, image_bytes: bytes):
        return {
            'ocrText': f'frame-{len(image_bytes)}',
            'labels': ['slide', 'text'],
        }


class FakeSummarizer:
    def summarize_rolling(self, prompt: str) -> SummaryResult:
        return SummaryResult(
            payload={
                'key_points': ['Rolling summary ready'],
                'action_items': ['Follow up'],
                'open_questions': [],
                'confidence': 0.9,
                'notes': 'ok',
            },
            model='fake',
        )

    def summarize_final(self, prompt: str) -> SummaryResult:
        return SummaryResult(
            payload={
                'title': 'Final Summary',
                'summary': 'Combined transcript and vision summary',
                'key_points': ['Point A'],
                'action_items': ['Action A'],
                'decisions': ['Decision A'],
                'risks': [],
                'visual_evidence': ['slide text'],
            },
            model='fake',
        )


@pytest.mark.asyncio
async def test_start_frame_stop_generates_artifacts(tmp_path):
    data_root = tmp_path / 'data'
    settings = Settings(
        host='127.0.0.1',
        port=8787,
        data_root=data_root,
        db_path=data_root / 'agent.db',
        sessions_root=data_root / 'sessions',
        summary_interval_seconds=0.1,
        frame_queue_size=8,
        audio_queue_size=8,
        vision_dedupe_hamming_threshold=0,
        livekit_url=None,
        livekit_api_key=None,
        livekit_api_secret=None,
        gcp_project=None,
        gcp_location='us-central1',
        vertex_model='fake-model',
    )

    store = SessionStore(settings.db_path)
    artifacts = ArtifactStore(settings.sessions_root)
    manager = SessionManager(
        settings=settings,
        store=store,
        artifact_store=artifacts,
        transcriber=FakeTranscriber(),
        vision_client=FakeVisionClient(),
        summarizer=FakeSummarizer(),
    )

    session_id = await manager.start_session(room_name='demo-room', world_id='world-1')
    await manager.ingest_frame(session_id=session_id, timestamp_ms=1234, frame_bytes=b'fake-jpeg')
    await manager.ingest_transcript(
        session_id=session_id,
        timestamp_ms=1500,
        text='Browser transcript landed quickly.',
        speaker='host',
        is_final=True,
        source='browser_speech_recognition',
    )
    await manager.ingest_audio(
        session_id=session_id,
        timestamp_ms=2000,
        audio_bytes=b'fake-webm-opus',
        encoding='WEBM_OPUS',
        sample_rate_hz=48000,
        language_code='en-US',
        speaker='host',
    )

    await asyncio.sleep(0.35)
    await manager.stop_session(session_id=session_id)

    view = await manager.get_session_view(session_id=session_id)
    assert view is not None
    assert view['status'] == 'ready'
    assert view['latestRollingSummary'] is not None
    assert view['finalSummary'] is not None
    assert view['finalSummary']['title'] == 'Final Summary'
    assert view['recentTranscript']
    assert view['recentVision']
    assert view['contentGeneration']['state'] == 'disabled'

    transcripts = list(store.list_transcript_chunks(session_id, after_id=0, limit=50))
    assert any('chunk-' in (chunk.get('text') or '') for chunk in transcripts)
    assert any('Browser transcript landed quickly.' in (chunk.get('text') or '') for chunk in transcripts)
    assert any(chunk.get('source') == 'browser_speech_recognition' for chunk in transcripts)
