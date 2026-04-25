from pydantic import BaseModel, Field


class CreateNotebookRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)


class RenameNotebookRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)


class NotebookResponse(BaseModel):
    id: str
    title: str
    sources_count: int | None = None
    is_owner: bool | None = None

    model_config = {"from_attributes": True}


class NotebookDetailResponse(BaseModel):
    id: str
    title: str
    sources_count: int | None = None
    is_owner: bool | None = None
    description: dict | None = None

    model_config = {"from_attributes": True}
