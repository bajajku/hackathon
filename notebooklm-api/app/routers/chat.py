from fastapi import APIRouter

from app.dependencies import get_service
from app.schemas.chat import AskRequest, AskResponse, ChatHistoryItem, ConfigureChatRequest

router = APIRouter()


@router.post("/{notebook_id}/chat", response_model=AskResponse)
async def ask(notebook_id: str, body: AskRequest):
    service = get_service()
    result = await service.ask(
        notebook_id,
        body.question,
        source_ids=body.source_ids,
        conversation_id=body.conversation_id,
    )
    refs = None
    if result.references:
        refs = [
            {
                "source_id": r.source_id,
                "citation_number": r.citation_number,
                "cited_text": r.cited_text,
            }
            for r in result.references
        ]
    return AskResponse(
        answer=result.answer,
        conversation_id=result.conversation_id,
        turn_number=result.turn_number,
        is_follow_up=result.is_follow_up,
        references=refs,
    )


@router.get("/{notebook_id}/chat/history", response_model=list[ChatHistoryItem])
async def get_chat_history(notebook_id: str, limit: int = 100, conversation_id: str | None = None):
    service = get_service()
    history = await service.get_chat_history(
        notebook_id, limit=limit, conversation_id=conversation_id
    )
    if not history and not conversation_id:
        conv_id = await service._client.chat.get_conversation_id(notebook_id)
        if conv_id:
            history = await service.get_chat_history(
                notebook_id, limit=limit, conversation_id=conv_id
            )
    return [
        ChatHistoryItem(question=q, answer=a, turn_number=i + 1) for i, (q, a) in enumerate(history)
    ]


@router.post("/{notebook_id}/chat/configure")
async def configure_chat(notebook_id: str, body: ConfigureChatRequest):
    service = get_service()
    await service.configure_chat(
        notebook_id,
        goal=body.goal,  # type: ignore
        response_length=body.response_length,  # type: ignore
        custom_prompt=body.custom_prompt,
    )
    return {"status": "ok"}
