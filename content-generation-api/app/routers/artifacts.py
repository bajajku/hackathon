from fastapi import APIRouter
from notebooklm import (
    AudioFormat,
    AudioLength,
    InfographicDetail,
    InfographicOrientation,
    InfographicStyle,
    QuizDifficulty,
    QuizQuantity,
    ReportFormat,
    SlideDeckFormat,
    SlideDeckLength,
    VideoFormat,
    VideoStyle,
)

from app.dependencies import get_service
from app.schemas.artifact import (
    ArtifactResponse,
    GenerateAudioRequest,
    GenerateCinematicVideoRequest,
    GenerateDataTableRequest,
    GenerateFlashcardsRequest,
    GenerateInfographicRequest,
    GenerateMindMapRequest,
    GenerateQuizRequest,
    GenerateReportRequest,
    GenerateSlideDeckRequest,
    GenerateVideoRequest,
    GenerationStatusResponse,
)

router = APIRouter()

_FORMAT_MAP: dict[str, VideoFormat] = {
    "explainer": VideoFormat.EXPLAINER,
    "brief": VideoFormat.BRIEF,
}

_STYLE_MAP: dict[str, VideoStyle] = {
    "auto_select": VideoStyle.AUTO_SELECT,
    "custom": VideoStyle.CUSTOM,
    "classic": VideoStyle.CLASSIC,
    "whiteboard": VideoStyle.WHITEBOARD,
    "kawaii": VideoStyle.KAWAII,
    "anime": VideoStyle.ANIME,
    "watercolor": VideoStyle.WATERCOLOR,
    "retro_print": VideoStyle.RETRO_PRINT,
    "heritage": VideoStyle.HERITAGE,
    "paper_craft": VideoStyle.PAPER_CRAFT,
}

_AUDIO_FORMAT_MAP: dict[str, AudioFormat] = {
    "deep_dive": AudioFormat.DEEP_DIVE,
    "brief": AudioFormat.BRIEF,
    "critique": AudioFormat.CRITIQUE,
    "debate": AudioFormat.DEBATE,
}

_AUDIO_LENGTH_MAP: dict[str, AudioLength] = {
    "short": AudioLength.SHORT,
    "default": AudioLength.DEFAULT,
    "long": AudioLength.LONG,
}

_REPORT_FORMAT_MAP: dict[str, ReportFormat] = {
    "briefing_doc": ReportFormat.BRIEFING_DOC,
    "study_guide": ReportFormat.STUDY_GUIDE,
    "blog_post": ReportFormat.BLOG_POST,
    "custom": ReportFormat.CUSTOM,
}

_QUANTITY_MAP: dict[str, QuizQuantity] = {
    "fewer": QuizQuantity.FEWER,
    "standard": QuizQuantity.STANDARD,
}

_DIFFICULTY_MAP: dict[str, QuizDifficulty] = {
    "easy": QuizDifficulty.EASY,
    "medium": QuizDifficulty.MEDIUM,
    "hard": QuizDifficulty.HARD,
}

_SLIDE_FORMAT_MAP: dict[str, SlideDeckFormat] = {
    "detailed_deck": SlideDeckFormat.DETAILED_DECK,
    "presenter_slides": SlideDeckFormat.PRESENTER_SLIDES,
}

_SLIDE_LENGTH_MAP: dict[str, SlideDeckLength] = {
    "default": SlideDeckLength.DEFAULT,
    "short": SlideDeckLength.SHORT,
}

_INFO_ORIENTATION_MAP: dict[str, InfographicOrientation] = {
    "landscape": InfographicOrientation.LANDSCAPE,
    "portrait": InfographicOrientation.PORTRAIT,
    "square": InfographicOrientation.SQUARE,
}

_INFO_DETAIL_MAP: dict[str, InfographicDetail] = {
    "concise": InfographicDetail.CONCISE,
    "standard": InfographicDetail.STANDARD,
    "detailed": InfographicDetail.DETAILED,
}

_INFO_STYLE_MAP: dict[str, InfographicStyle] = {
    "auto_select": InfographicStyle.AUTO_SELECT,
    "sketch_note": InfographicStyle.SKETCH_NOTE,
    "professional": InfographicStyle.PROFESSIONAL,
    "bento_grid": InfographicStyle.BENTO_GRID,
    "editorial": InfographicStyle.EDITORIAL,
    "instructional": InfographicStyle.INSTRUCTIONAL,
    "bricks": InfographicStyle.BRICKS,
    "clay": InfographicStyle.CLAY,
    "anime": InfographicStyle.ANIME,
    "kawaii": InfographicStyle.KAWAII,
    "scientific": InfographicStyle.SCIENTIFIC,
}


def _make_status_response(status, artifact_type: str) -> GenerationStatusResponse:
    return GenerationStatusResponse(
        task_id=status.task_id,
        status=status.status,
        artifact_type=artifact_type,
        artifact_id=status.task_id,
    )


@router.post(
    "/{notebook_id}/artifacts/video", response_model=GenerationStatusResponse, status_code=202
)
async def generate_video(notebook_id: str, body: GenerateVideoRequest):
    service = get_service()
    status = await service.generate_video(
        notebook_id,
        source_ids=body.source_ids,
        instructions=body.instructions,
        video_format=_FORMAT_MAP[body.format],
        video_style=_STYLE_MAP[body.style],
        language=body.language,
    )
    return _make_status_response(status, "video")


@router.post(
    "/{notebook_id}/artifacts/cinematic-video",
    response_model=GenerationStatusResponse,
    status_code=202,
)
async def generate_cinematic_video(notebook_id: str, body: GenerateCinematicVideoRequest):
    service = get_service()
    status = await service.generate_cinematic_video(
        notebook_id,
        source_ids=body.source_ids,
        instructions=body.instructions,
        language=body.language,
    )
    return _make_status_response(status, "cinematic_video")


@router.post(
    "/{notebook_id}/artifacts/audio", response_model=GenerationStatusResponse, status_code=202
)
async def generate_audio(notebook_id: str, body: GenerateAudioRequest):
    service = get_service()
    status = await service.generate_audio(
        notebook_id,
        source_ids=body.source_ids,
        instructions=body.instructions,
        audio_format=_AUDIO_FORMAT_MAP[body.format],
        audio_length=_AUDIO_LENGTH_MAP[body.length],
        language=body.language,
    )
    return _make_status_response(status, "audio")


@router.post(
    "/{notebook_id}/artifacts/report", response_model=GenerationStatusResponse, status_code=202
)
async def generate_report(notebook_id: str, body: GenerateReportRequest):
    service = get_service()
    status = await service.generate_report(
        notebook_id,
        source_ids=body.source_ids,
        report_format=_REPORT_FORMAT_MAP[body.format],
        custom_prompt=body.custom_prompt,
        extra_instructions=body.extra_instructions,
        language=body.language,
    )
    return _make_status_response(status, "report")


@router.post(
    "/{notebook_id}/artifacts/quiz", response_model=GenerationStatusResponse, status_code=202
)
async def generate_quiz(notebook_id: str, body: GenerateQuizRequest):
    service = get_service()
    status = await service.generate_quiz(
        notebook_id,
        source_ids=body.source_ids,
        instructions=body.instructions,
        quantity=_QUANTITY_MAP[body.quantity],
        difficulty=_DIFFICULTY_MAP[body.difficulty],
    )
    return _make_status_response(status, "quiz")


@router.post(
    "/{notebook_id}/artifacts/flashcards", response_model=GenerationStatusResponse, status_code=202
)
async def generate_flashcards(notebook_id: str, body: GenerateFlashcardsRequest):
    service = get_service()
    status = await service.generate_flashcards(
        notebook_id,
        source_ids=body.source_ids,
        instructions=body.instructions,
        quantity=_QUANTITY_MAP[body.quantity],
        difficulty=_DIFFICULTY_MAP[body.difficulty],
    )
    return _make_status_response(status, "flashcards")


@router.post(
    "/{notebook_id}/artifacts/slide-deck", response_model=GenerationStatusResponse, status_code=202
)
async def generate_slide_deck(notebook_id: str, body: GenerateSlideDeckRequest):
    service = get_service()
    status = await service.generate_slide_deck(
        notebook_id,
        source_ids=body.source_ids,
        slide_format=_SLIDE_FORMAT_MAP[body.format],
        slide_length=_SLIDE_LENGTH_MAP[body.length],
        language=body.language,
        instructions=body.instructions,
    )
    return _make_status_response(status, "slide_deck")


@router.post(
    "/{notebook_id}/artifacts/infographic", response_model=GenerationStatusResponse, status_code=202
)
async def generate_infographic(notebook_id: str, body: GenerateInfographicRequest):
    service = get_service()
    status = await service.generate_infographic(
        notebook_id,
        source_ids=body.source_ids,
        orientation=_INFO_ORIENTATION_MAP[body.orientation],
        detail_level=_INFO_DETAIL_MAP[body.detail],
        style=_INFO_STYLE_MAP[body.style],
        language=body.language,
        instructions=body.instructions,
    )
    return _make_status_response(status, "infographic")


@router.post(
    "/{notebook_id}/artifacts/mind-map", response_model=GenerationStatusResponse, status_code=202
)
async def generate_mind_map(notebook_id: str, body: GenerateMindMapRequest):
    service = get_service()
    result = await service.generate_mind_map(
        notebook_id,
    )
    note_id = result.get("note_id", "") if isinstance(result, dict) else ""
    return GenerationStatusResponse(
        task_id=str(note_id),
        status="completed",
        artifact_type="mind_map",
        artifact_id=str(note_id) if note_id else None,
    )


@router.post(
    "/{notebook_id}/artifacts/data-table", response_model=GenerationStatusResponse, status_code=202
)
async def generate_data_table(notebook_id: str, body: GenerateDataTableRequest):
    service = get_service()
    status = await service.generate_data_table(
        notebook_id,
        language=body.language,
        instructions=body.instructions,
    )
    return _make_status_response(status, "data_table")


@router.get("/{notebook_id}/artifacts", response_model=list[ArtifactResponse])
async def list_artifacts(notebook_id: str):
    service = get_service()
    artifacts = await service.list_artifacts(notebook_id)
    return [
        ArtifactResponse(
            id=a.id,
            title=a.title,
            kind=str(a.kind) if a.kind else None,
            status="completed" if a.is_completed else "processing",
            url=a.url,
        )
        for a in artifacts
    ]


@router.get("/{notebook_id}/artifacts/{task_id}/status", response_model=GenerationStatusResponse)
async def poll_artifact_status(notebook_id: str, task_id: str):
    service = get_service()
    status = await service.poll_status(notebook_id, task_id)
    return _make_status_response(status, "artifact")
