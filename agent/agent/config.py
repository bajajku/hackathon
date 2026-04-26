from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import os

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    host: str
    port: int
    data_root: Path
    db_path: Path
    sessions_root: Path
    summary_interval_seconds: float
    frame_queue_size: int
    audio_queue_size: int
    vision_dedupe_hamming_threshold: int
    livekit_url: str | None
    livekit_api_key: str | None
    livekit_api_secret: str | None
    gcp_project: str | None
    gcp_location: str
    vertex_model: str
    summarizer_backend: str = 'ollama'
    ollama_base_url: str = 'http://127.0.0.1:11434'
    ollama_model: str = 'gemma3:latest'
    ollama_timeout_seconds: float = 45.0
    content_generation_enabled: bool = False
    content_generation_api_base_url: str = 'http://127.0.0.1:8000'
    content_generation_timeout_seconds: float = 30.0


def _env_int(name: str, fallback: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == '':
        return fallback
    try:
        return int(raw)
    except ValueError as exc:
        raise ValueError(f'{name} must be an integer') from exc


def _env_float(name: str, fallback: float) -> float:
    raw = os.getenv(name)
    if raw is None or raw.strip() == '':
        return fallback
    try:
        return float(raw)
    except ValueError as exc:
        raise ValueError(f'{name} must be a float') from exc


def _env_bool(name: str, fallback: bool) -> bool:
    raw = os.getenv(name)
    if raw is None or raw.strip() == '':
        return fallback
    return raw.strip().lower() in {'1', 'true', 'yes', 'on'}


def load_settings() -> Settings:
    agent_root = Path(__file__).resolve().parents[1]
    # Ensure local agent env is loaded even when uvicorn is started without --env-file
    # or from a different working directory.
    load_dotenv(agent_root / '.env', override=False)

    root_default = Path(__file__).resolve().parents[1] / 'data'
    data_root = Path(os.getenv('AGENT_DATA_ROOT', root_default)).resolve()
    db_path = Path(os.getenv('AGENT_DB_PATH', data_root / 'agent.db')).resolve()
    sessions_root = Path(os.getenv('AGENT_SESSIONS_ROOT', data_root / 'sessions')).resolve()

    return Settings(
        host=os.getenv('AGENT_HOST', '0.0.0.0'),
        port=_env_int('AGENT_PORT', 8787),
        data_root=data_root,
        db_path=db_path,
        sessions_root=sessions_root,
        summary_interval_seconds=_env_float('AGENT_SUMMARY_INTERVAL_SECONDS', 15.0),
        frame_queue_size=_env_int('AGENT_FRAME_QUEUE_SIZE', 64),
        audio_queue_size=_env_int('AGENT_AUDIO_QUEUE_SIZE', 32),
        vision_dedupe_hamming_threshold=_env_int('AGENT_VISION_DEDUPE_THRESHOLD', 4),
        livekit_url=os.getenv('LIVEKIT_URL'),
        livekit_api_key=os.getenv('LIVEKIT_API_KEY'),
        livekit_api_secret=os.getenv('LIVEKIT_API_SECRET'),
        gcp_project=os.getenv('GCP_PROJECT'),
        gcp_location=os.getenv('GCP_LOCATION', 'us-central1'),
        vertex_model=os.getenv('VERTEX_MODEL', 'gemini-2.5-flash'),
        summarizer_backend=os.getenv('SUMMARIZER_BACKEND', 'ollama').strip().lower(),
        ollama_base_url=os.getenv('OLLAMA_BASE_URL', 'http://127.0.0.1:11434').strip(),
        ollama_model=os.getenv('OLLAMA_MODEL', 'gemma3:latest').strip(),
        ollama_timeout_seconds=_env_float('OLLAMA_TIMEOUT_SECONDS', 45.0),
        content_generation_enabled=_env_bool('CONTENT_GENERATION_ENABLED', False),
        content_generation_api_base_url=os.getenv(
            'CONTENT_GENERATION_API_BASE_URL',
            'http://127.0.0.1:8000',
        ).strip(),
        content_generation_timeout_seconds=_env_float(
            'CONTENT_GENERATION_TIMEOUT_SECONDS',
            30.0,
        ),
    )
