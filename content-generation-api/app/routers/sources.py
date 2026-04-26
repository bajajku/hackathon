import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, UploadFile

from app.dependencies import get_service
from app.schemas.source import (
    AddTextSourceRequest,
    AddURLSourceRequest,
    SourceFulltextResponse,
    SourceResponse,
)

router = APIRouter()


@router.post("/{notebook_id}/sources/file", response_model=SourceResponse, status_code=201)
async def add_source_file(
    notebook_id: str,
    file: UploadFile = File(...),
    wait: bool = Form(default=True),
    wait_timeout: float = Form(default=120.0),
):
    service = get_service()
    suffix = Path(file.filename).suffix if file.filename else ".tmp"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        source = await service.add_source_file(
            notebook_id, tmp_path, wait=wait, wait_timeout=wait_timeout
        )
        return SourceResponse(
            id=source.id,
            title=source.title,
            url=source.url,
            kind=str(source.kind) if source.kind else None,
        )
    finally:
        tmp_path.unlink(missing_ok=True)


@router.post("/{notebook_id}/sources/text", response_model=SourceResponse, status_code=201)
async def add_source_text(notebook_id: str, body: AddTextSourceRequest):
    service = get_service()
    source = await service.add_source_text(notebook_id, body.title, body.content)
    return SourceResponse(
        id=source.id,
        title=source.title,
        url=source.url,
        kind=str(source.kind) if source.kind else None,
    )


@router.post("/{notebook_id}/sources/url", response_model=SourceResponse, status_code=201)
async def add_source_url(notebook_id: str, body: AddURLSourceRequest):
    service = get_service()
    source = await service.add_source_url(notebook_id, body.url)
    return SourceResponse(
        id=source.id,
        title=source.title,
        url=source.url,
        kind=str(source.kind) if source.kind else None,
    )


@router.get("/{notebook_id}/sources", response_model=list[SourceResponse])
async def list_sources(notebook_id: str):
    service = get_service()
    sources = await service.list_sources(notebook_id)
    return [
        SourceResponse(
            id=s.id,
            title=s.title,
            url=s.url,
            kind=str(s.kind) if s.kind else None,
        )
        for s in sources
    ]


@router.get("/{notebook_id}/sources/{source_id}", response_model=SourceFulltextResponse)
async def get_source(notebook_id: str, source_id: str):
    service = get_service()
    fulltext = await service.get_source_fulltext(notebook_id, source_id)
    return SourceFulltextResponse(
        source_id=fulltext.source_id,
        title=fulltext.title,
        content=fulltext.content,
        char_count=fulltext.char_count,
    )


@router.delete("/{notebook_id}/sources/{source_id}", response_model=dict)
async def delete_source(notebook_id: str, source_id: str):
    service = get_service()
    success = await service.delete_source(notebook_id, source_id)
    return {"deleted": success}
