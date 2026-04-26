import os
from pathlib import Path

from fastapi import APIRouter, Query
from fastapi.responses import FileResponse

from app.config import settings as global_settings
from app.dependencies import get_service

router = APIRouter()


def _cache_dir(notebook_id: str) -> Path:
    path = Path(global_settings.storage_dir) / notebook_id
    path.mkdir(parents=True, exist_ok=True)
    return path


@router.get(
    "/{notebook_id}/video/{artifact_id}",
    response_class=FileResponse,
    responses={200: {"content": {"video/mp4": {}}, "description": "Video file"}},
)
async def download_video(notebook_id: str, artifact_id: str):
    service = get_service()
    output_path = str(_cache_dir(notebook_id) / f"{artifact_id}.mp4")
    if not os.path.exists(output_path):
        output_path = await service.download_video(
            notebook_id, output_path, artifact_id=artifact_id
        )
    return FileResponse(
        output_path, media_type="video/mp4", filename=f"video_{artifact_id}.mp4"
    )


@router.get(
    "/{notebook_id}/video/latest",
    response_class=FileResponse,
    responses={200: {"content": {"video/mp4": {}}, "description": "Latest video file"}},
)
async def download_latest_video(notebook_id: str):
    service = get_service()
    output_path = str(_cache_dir(notebook_id) / "latest_video.mp4")
    output_path = await service.download_video(notebook_id, output_path)
    return FileResponse(
        output_path, media_type="video/mp4", filename="latest_video.mp4"
    )


@router.get(
    "/{notebook_id}/audio/{artifact_id}",
    response_class=FileResponse,
    responses={200: {"content": {"audio/mpeg": {}}, "description": "Audio file"}},
)
async def download_audio(notebook_id: str, artifact_id: str):
    service = get_service()
    output_path = str(_cache_dir(notebook_id) / f"{artifact_id}.mp3")
    if not os.path.exists(output_path):
        output_path = await service.download_audio(
            notebook_id, output_path, artifact_id=artifact_id
        )
    return FileResponse(
        output_path, media_type="audio/mpeg", filename=f"audio_{artifact_id}.mp3"
    )


@router.get(
    "/{notebook_id}/audio/latest",
    response_class=FileResponse,
    responses={200: {"content": {"audio/mpeg": {}}, "description": "Latest audio file"}},
)
async def download_latest_audio(notebook_id: str):
    service = get_service()
    output_path = str(_cache_dir(notebook_id) / "latest_audio.mp3")
    output_path = await service.download_audio(notebook_id, output_path)
    return FileResponse(
        output_path, media_type="audio/mpeg", filename="latest_audio.mp3"
    )


@router.get(
    "/{notebook_id}/report/{artifact_id}",
    response_class=FileResponse,
    responses={200: {"content": {"text/markdown": {}}, "description": "Report as Markdown"}},
)
async def download_report(notebook_id: str, artifact_id: str):
    service = get_service()
    output_path = str(_cache_dir(notebook_id) / f"{artifact_id}.md")
    if not os.path.exists(output_path):
        output_path = await service.download_report(
            notebook_id, output_path, artifact_id=artifact_id
        )
    return FileResponse(
        output_path, media_type="text/markdown", filename=f"report_{artifact_id}.md"
    )


@router.get(
    "/{notebook_id}/infographic/{artifact_id}",
    response_class=FileResponse,
    responses={200: {"content": {"image/png": {}}, "description": "Infographic image"}},
)
async def download_infographic(notebook_id: str, artifact_id: str):
    service = get_service()
    output_path = str(_cache_dir(notebook_id) / f"{artifact_id}.png")
    if not os.path.exists(output_path):
        output_path = await service.download_infographic(
            notebook_id, output_path, artifact_id=artifact_id
        )
    return FileResponse(
        output_path, media_type="image/png", filename=f"infographic_{artifact_id}.png"
    )


@router.get(
    "/{notebook_id}/slide-deck/{artifact_id}",
    response_class=FileResponse,
    responses={
        200: {
            "content": {
                "application/pdf": {},
                "application/vnd.openxmlformats-officedocument.presentationml.presentation": {},
            },
            "description": "Slide deck file (PDF or PPTX)",
        }
    },
)
async def download_slide_deck(
    notebook_id: str,
    artifact_id: str,
    format: str = Query(default="pdf", pattern="^(pdf|pptx)$"),
):
    service = get_service()
    ext = format
    output_path = str(_cache_dir(notebook_id) / f"{artifact_id}.{ext}")
    if not os.path.exists(output_path):
        output_path = await service.download_slide_deck(
            notebook_id, output_path, artifact_id=artifact_id, output_format=format
        )
    media_type = (
        "application/pdf"
        if format == "pdf"
        else "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    )
    return FileResponse(
        output_path, media_type=media_type, filename=f"slide_deck_{artifact_id}.{ext}"
    )


@router.get(
    "/{notebook_id}/quiz/{artifact_id}",
    response_class=FileResponse,
    responses={
        200: {
            "content": {
                "application/json": {},
                "text/markdown": {},
                "text/html": {},
            },
            "description": "Quiz file",
        }
    },
)
async def download_quiz(
    notebook_id: str,
    artifact_id: str,
    format: str = Query(default="json", pattern="^(json|markdown|html)$"),
):
    service = get_service()
    ext_map = {"json": "json", "markdown": "md", "html": "html"}
    ext = ext_map[format]
    media_map = {
        "json": "application/json",
        "markdown": "text/markdown",
        "html": "text/html",
    }
    output_path = str(_cache_dir(notebook_id) / f"{artifact_id}.{ext}")
    if not os.path.exists(output_path):
        output_path = await service.download_quiz(
            notebook_id, output_path, artifact_id=artifact_id, output_format=format
        )
    return FileResponse(
        output_path, media_type=media_map[format], filename=f"quiz_{artifact_id}.{ext}"
    )


@router.get(
    "/{notebook_id}/flashcards/{artifact_id}",
    response_class=FileResponse,
    responses={
        200: {
            "content": {
                "application/json": {},
                "text/markdown": {},
                "text/html": {},
            },
            "description": "Flashcards file",
        }
    },
)
async def download_flashcards(
    notebook_id: str,
    artifact_id: str,
    format: str = Query(default="json", pattern="^(json|markdown|html)$"),
):
    service = get_service()
    ext_map = {"json": "json", "markdown": "md", "html": "html"}
    ext = ext_map[format]
    media_map = {
        "json": "application/json",
        "markdown": "text/markdown",
        "html": "text/html",
    }
    output_path = str(_cache_dir(notebook_id) / f"{artifact_id}.{ext}")
    if not os.path.exists(output_path):
        output_path = await service.download_flashcards(
            notebook_id, output_path, artifact_id=artifact_id, output_format=format
        )
    return FileResponse(
        output_path,
        media_type=media_map[format],
        filename=f"flashcards_{artifact_id}.{ext}",
    )


@router.get(
    "/{notebook_id}/mind-map/{artifact_id}",
    response_class=FileResponse,
    responses={200: {"content": {"application/json": {}}, "description": "Mind map JSON"}},
)
async def download_mind_map(notebook_id: str, artifact_id: str):
    service = get_service()
    output_path = str(_cache_dir(notebook_id) / f"{artifact_id}.json")
    if not os.path.exists(output_path):
        output_path = await service.download_mind_map(
            notebook_id, output_path, artifact_id=artifact_id
        )
    return FileResponse(
        output_path,
        media_type="application/json",
        filename=f"mind_map_{artifact_id}.json",
    )


@router.get(
    "/{notebook_id}/data-table/{artifact_id}",
    response_class=FileResponse,
    responses={200: {"content": {"text/csv": {}}, "description": "Data table CSV"}},
)
async def download_data_table(notebook_id: str, artifact_id: str):
    service = get_service()
    output_path = str(_cache_dir(notebook_id) / f"{artifact_id}.csv")
    if not os.path.exists(output_path):
        output_path = await service.download_data_table(
            notebook_id, output_path, artifact_id=artifact_id
        )
    return FileResponse(
        output_path, media_type="text/csv", filename=f"data_table_{artifact_id}.csv"
    )
