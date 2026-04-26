from pydantic import BaseModel, Field


class AddTextSourceRequest(BaseModel):
    title: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)


class AddURLSourceRequest(BaseModel):
    url: str = Field(..., pattern=r"^https?://")


class SourceResponse(BaseModel):
    id: str
    title: str | None = None
    url: str | None = None
    kind: str | None = None

    model_config = {"from_attributes": True}


class SourceFulltextResponse(BaseModel):
    source_id: str
    title: str | None = None
    content: str
    char_count: int

    model_config = {"from_attributes": True}
