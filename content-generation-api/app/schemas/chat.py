from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1)
    source_ids: list[str] | None = None
    conversation_id: str | None = None


class AskResponse(BaseModel):
    answer: str
    conversation_id: str | None = None
    turn_number: int | None = None
    is_follow_up: bool | None = None
    references: list[dict] | None = None

    model_config = {"from_attributes": True}


class ChatHistoryItem(BaseModel):
    question: str
    answer: str
    turn_number: int


class ConfigureChatRequest(BaseModel):
    goal: str | None = None
    response_length: str | None = None
    custom_prompt: str | None = None
