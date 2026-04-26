from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from .artifacts import ArtifactStore
from .config import Settings, load_settings
from .pipeline import SessionManager
from .store import SessionStore


class StartSessionRequest(BaseModel):
    room_name: str = Field(alias='roomName', min_length=1)
    world_id: str | None = Field(default=None, alias='worldId')

    model_config = {
        'populate_by_name': True,
        'str_strip_whitespace': True,
    }


class StartSessionResponse(BaseModel):
    session_id: str = Field(alias='sessionId')
    started_at: str = Field(alias='startedAt')


class StopSessionResponse(BaseModel):
    session_id: str = Field(alias='sessionId')
    status: str


class TranscriptIngestRequest(BaseModel):
    text: str = Field(min_length=1)
    timestamp_ms: int = Field(alias='timestampMs')
    speaker: str | None = None
    is_final: bool = Field(default=True, alias='isFinal')
    source: str = 'browser_speech_recognition'

    model_config = {
        'populate_by_name': True,
        'str_strip_whitespace': True,
    }


class SessionStatusResponse(BaseModel):
    session_id: str = Field(alias='sessionId')
    room_name: str = Field(alias='roomName')
    world_id: str | None = Field(alias='worldId')
    status: str
    created_at: int = Field(alias='createdAt')
    updated_at: int = Field(alias='updatedAt')
    stopped_at: int | None = Field(alias='stoppedAt')
    error: str | None
    artifacts: dict[str, str]
    latest_rolling_summary: dict[str, Any] | None = Field(alias='latestRollingSummary')
    final_summary: dict[str, Any] | None = Field(alias='finalSummary')
    recent_transcript: list[dict[str, Any]] = Field(alias='recentTranscript')
    recent_vision: list[dict[str, Any]] = Field(alias='recentVision')
    content_generation: dict[str, Any] | None = Field(alias='contentGeneration')


class HealthResponse(BaseModel):
    ok: bool
    timestamp: str


def create_app(settings: Settings | None = None) -> FastAPI:
    runtime_settings = settings or load_settings()

    session_store = SessionStore(runtime_settings.db_path)
    artifact_store = ArtifactStore(runtime_settings.sessions_root)
    session_manager = SessionManager(
        settings=runtime_settings,
        store=session_store,
        artifact_store=artifact_store,
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.settings = runtime_settings
        app.state.store = session_store
        app.state.artifacts = artifact_store
        app.state.sessions = session_manager
        yield

    app = FastAPI(title='SpacePresent Agent', version='0.1.0', lifespan=lifespan)

    @app.get('/healthz', response_model=HealthResponse)
    async def healthcheck() -> HealthResponse:
        return HealthResponse(ok=True, timestamp=datetime.now(timezone.utc).isoformat())

    @app.post('/sessions/start', response_model=StartSessionResponse)
    async def start_session(body: StartSessionRequest) -> StartSessionResponse:
        session_id = await session_manager.start_session(room_name=body.room_name, world_id=body.world_id)
        return StartSessionResponse(sessionId=session_id, startedAt=datetime.now(timezone.utc).isoformat())

    @app.post('/sessions/{session_id}/frame')
    async def ingest_frame(
        session_id: str,
        frame: UploadFile = File(...),
        timestamp_ms: int = Form(alias='timestampMs'),
    ) -> dict[str, Any]:
        data = await frame.read()
        if not data:
            raise HTTPException(status_code=400, detail='Empty frame payload')
        try:
            await session_manager.ingest_frame(
                session_id=session_id,
                timestamp_ms=timestamp_ms,
                frame_bytes=data,
            )
        except KeyError:
            raise HTTPException(status_code=404, detail='Session not found')
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail=str(exc))

        return {'ok': True}

    @app.post('/sessions/{session_id}/audio')
    async def ingest_audio(
        session_id: str,
        audio: UploadFile = File(...),
        timestamp_ms: int = Form(alias='timestampMs'),
        encoding: str = Form(default='WEBM_OPUS'),
        sample_rate_hz: int = Form(default=48000, alias='sampleRateHz'),
        language_code: str = Form(default='en-US', alias='languageCode'),
        speaker: str | None = Form(default=None),
    ) -> dict[str, Any]:
        data = await audio.read()
        if not data:
            raise HTTPException(status_code=400, detail='Empty audio payload')
        try:
            await session_manager.ingest_audio(
                session_id=session_id,
                timestamp_ms=timestamp_ms,
                audio_bytes=data,
                encoding=encoding,
                sample_rate_hz=sample_rate_hz,
                language_code=language_code,
                speaker=speaker,
            )
        except KeyError:
            raise HTTPException(status_code=404, detail='Session not found')
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail=str(exc))
        return {'ok': True}

    @app.post('/sessions/{session_id}/transcript')
    async def ingest_transcript(
        session_id: str,
        body: TranscriptIngestRequest,
    ) -> dict[str, Any]:
        try:
            await session_manager.ingest_transcript(
                session_id=session_id,
                text=body.text,
                timestamp_ms=body.timestamp_ms,
                speaker=body.speaker,
                is_final=body.is_final,
                source=body.source,
            )
        except KeyError:
            raise HTTPException(status_code=404, detail='Session not found')
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail=str(exc))
        return {'ok': True}

    @app.post('/sessions/{session_id}/stop', response_model=StopSessionResponse)
    async def stop_session(session_id: str) -> StopSessionResponse:
        try:
            await session_manager.stop_session(session_id=session_id)
        except KeyError:
            row = session_store.get_session(session_id)
            if row is None:
                raise HTTPException(status_code=404, detail='Session not found')
        return StopSessionResponse(sessionId=session_id, status='stopped')

    @app.get('/sessions/{session_id}', response_model=SessionStatusResponse)
    async def get_session(session_id: str) -> SessionStatusResponse:
        data = await session_manager.get_session_view(session_id=session_id)
        if data is None:
            raise HTTPException(status_code=404, detail='Session not found')
        return SessionStatusResponse(**data)

    return app


app = create_app()
