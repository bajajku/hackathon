from fastapi import APIRouter

from app.dependencies import get_service
from app.schemas.notebook import (
    CreateNotebookRequest,
    NotebookDetailResponse,
    NotebookResponse,
    RenameNotebookRequest,
)

router = APIRouter()


@router.post("", response_model=NotebookResponse, status_code=201)
async def create_notebook(body: CreateNotebookRequest):
    service = get_service()
    nb = await service.create_notebook(body.title)
    return NotebookResponse(
        id=nb.id,
        title=nb.title,
        sources_count=nb.sources_count,
        is_owner=nb.is_owner,
    )


@router.get("", response_model=list[NotebookResponse])
async def list_notebooks():
    service = get_service()
    notebooks = await service.list_notebooks()
    return [
        NotebookResponse(
            id=nb.id,
            title=nb.title,
            sources_count=nb.sources_count,
            is_owner=nb.is_owner,
        )
        for nb in notebooks
    ]


@router.get("/{notebook_id}", response_model=NotebookDetailResponse)
async def get_notebook(notebook_id: str):
    service = get_service()
    nb = await service.get_notebook(notebook_id)
    try:
        desc = await service.get_notebook_description(notebook_id)
        description = {
            "summary": desc.summary,
            "suggested_topics": [t.question for t in desc.suggested_topics],
        }
    except Exception:
        description = None
    return NotebookDetailResponse(
        id=nb.id,
        title=nb.title,
        sources_count=nb.sources_count,
        is_owner=nb.is_owner,
        description=description,
    )


@router.delete("/{notebook_id}", response_model=dict)
async def delete_notebook(notebook_id: str):
    service = get_service()
    success = await service.delete_notebook(notebook_id)
    return {"deleted": success}


@router.patch("/{notebook_id}", response_model=NotebookResponse)
async def rename_notebook(notebook_id: str, body: RenameNotebookRequest):
    service = get_service()
    nb = await service.rename_notebook(notebook_id, body.title)
    return NotebookResponse(
        id=nb.id,
        title=nb.title,
        sources_count=nb.sources_count,
        is_owner=nb.is_owner,
    )
