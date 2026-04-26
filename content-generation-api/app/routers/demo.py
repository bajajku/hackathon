"""One-shot demo endpoint: ingest sample-transcript.md, fan out to all artifact generators."""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.dependencies import get_service

logger = logging.getLogger(__name__)
router = APIRouter()

LAST_RUN_FILE = Path(settings.storage_dir) / "last-generated.json"
RUNS_FILE = Path(settings.storage_dir) / "runs.json"
SAMPLE_TRANSCRIPT = Path(settings.storage_dir) / "sample-transcript.md"


def _load_runs() -> list[dict[str, Any]]:
    if not RUNS_FILE.exists():
        return []
    try:
        data = json.loads(RUNS_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:  # noqa: BLE001
        return []


def _append_run(record: dict[str, Any]) -> None:
    runs = _load_runs()
    runs.append(record)
    RUNS_FILE.parent.mkdir(parents=True, exist_ok=True)
    RUNS_FILE.write_text(json.dumps(runs, indent=2), encoding="utf-8")


class DemoRunRequest(BaseModel):
    title: str | None = None
    transcript: str | None = None
    transcript_title: str | None = None


class DemoRunResponse(BaseModel):
    notebook_id: str
    source_id: str
    tasks: list[dict[str, Any]]
    started_at: str


def _read_sample_transcript() -> str:
    if not SAMPLE_TRANSCRIPT.exists():
        raise HTTPException(status_code=500, detail=f"Sample transcript not found at {SAMPLE_TRANSCRIPT}")
    return SAMPLE_TRANSCRIPT.read_text(encoding="utf-8")


async def _safe_kick(coro, label: str) -> dict[str, Any]:
    try:
        status = await coro
        task_id = getattr(status, "task_id", None) or (
            status.get("note_id") if isinstance(status, dict) else None
        )
        return {"kind": label, "task_id": str(task_id) if task_id else None, "started": True}
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to start %s generation", label)
        return {"kind": label, "task_id": None, "started": False, "error": str(exc)}


@router.post("/run", response_model=DemoRunResponse)
async def run_demo(body: DemoRunRequest | None = None):
    """Create a notebook, ingest the sample transcript, and fan-out all artifact generators."""
    body = body or DemoRunRequest()
    service = get_service()

    title = body.title or "Meeting Recap - Sample Transcript"
    transcript_text = body.transcript or _read_sample_transcript()
    transcript_title = body.transcript_title or "Meeting Transcript"

    notebook = await service.create_notebook(title)
    logger.info("Demo notebook created: %s", notebook.id)

    source = await service.add_source_text(notebook.id, transcript_title, transcript_text)
    logger.info("Demo source added: %s", source.id)

    kicks = [
        _safe_kick(service.generate_video(notebook.id, source_ids=[source.id]), "video"),
        _safe_kick(service.generate_audio(notebook.id, source_ids=[source.id]), "audio"),
        _safe_kick(service.generate_report(notebook.id, source_ids=[source.id]), "report"),
        _safe_kick(service.generate_quiz(notebook.id, source_ids=[source.id]), "quiz"),
        _safe_kick(service.generate_flashcards(notebook.id, source_ids=[source.id]), "flashcards"),
        _safe_kick(service.generate_slide_deck(notebook.id, source_ids=[source.id]), "slide_deck"),
        _safe_kick(service.generate_infographic(notebook.id, source_ids=[source.id]), "infographic"),
        _safe_kick(service.generate_mind_map(notebook.id, source_ids=[source.id]), "mind_map"),
        _safe_kick(service.generate_data_table(notebook.id), "data_table"),
    ]
    tasks = await asyncio.gather(*kicks)

    started_at = datetime.now(timezone.utc).isoformat()
    payload: dict[str, Any] = {
        "notebook_id": notebook.id,
        "source_id": source.id,
        "tasks": tasks,
        "started_at": started_at,
        "title": title,
    }
    LAST_RUN_FILE.parent.mkdir(parents=True, exist_ok=True)
    LAST_RUN_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    _append_run(payload)

    return DemoRunResponse(
        notebook_id=notebook.id,
        source_id=source.id,
        tasks=tasks,
        started_at=started_at,
    )


@router.get("/last", response_model=dict)
async def get_last_run():
    if not LAST_RUN_FILE.exists():
        return {"notebook_id": None}
    try:
        return json.loads(LAST_RUN_FILE.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Could not read last run: {exc}")


@router.get("/runs", response_model=list[dict])
async def list_runs():
    """Return all past demo runs, newest first."""
    runs = _load_runs()
    runs.sort(key=lambda r: r.get("started_at") or "", reverse=True)
    return runs
