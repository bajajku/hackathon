from typing import Literal

from pydantic import BaseModel


class GenerateVideoRequest(BaseModel):
    source_ids: list[str] | None = None
    instructions: str | None = None
    format: Literal["explainer", "brief"] = "explainer"
    style: Literal[
        "auto_select",
        "custom",
        "classic",
        "whiteboard",
        "kawaii",
        "anime",
        "watercolor",
        "retro_print",
        "heritage",
        "paper_craft",
    ] = "auto_select"
    language: str = "en"


class GenerateCinematicVideoRequest(BaseModel):
    source_ids: list[str] | None = None
    instructions: str | None = None
    language: str = "en"


class GenerateAudioRequest(BaseModel):
    source_ids: list[str] | None = None
    instructions: str | None = None
    format: Literal["deep_dive", "brief", "critique", "debate"] = "deep_dive"
    length: Literal["short", "default", "long"] = "default"
    language: str = "en"


class GenerateReportRequest(BaseModel):
    source_ids: list[str] | None = None
    format: Literal["briefing_doc", "study_guide", "blog_post", "custom"] = "briefing_doc"
    custom_prompt: str | None = None
    extra_instructions: str | None = None
    language: str = "en"


class GenerateQuizRequest(BaseModel):
    source_ids: list[str] | None = None
    instructions: str | None = None
    quantity: Literal["fewer", "standard"] = "standard"
    difficulty: Literal["easy", "medium", "hard"] = "medium"


class GenerateFlashcardsRequest(BaseModel):
    source_ids: list[str] | None = None
    instructions: str | None = None
    quantity: Literal["fewer", "standard"] = "standard"
    difficulty: Literal["easy", "medium", "hard"] = "medium"


class GenerateSlideDeckRequest(BaseModel):
    source_ids: list[str] | None = None
    instructions: str | None = None
    format: Literal["detailed_deck", "presenter_slides"] = "detailed_deck"
    length: Literal["default", "short"] = "default"
    language: str = "en"


class GenerateInfographicRequest(BaseModel):
    source_ids: list[str] | None = None
    instructions: str | None = None
    orientation: Literal["landscape", "portrait", "square"] = "landscape"
    detail: Literal["concise", "standard", "detailed"] = "standard"
    style: Literal[
        "auto_select", "sketch_note", "professional", "bento_grid",
        "editorial", "instructional", "bricks", "clay", "anime", "kawaii", "scientific",
    ] = "auto_select"
    language: str = "en"


class GenerateMindMapRequest(BaseModel):
    language: str = "en"
    instructions: str | None = None


class GenerateDataTableRequest(BaseModel):
    language: str = "en"
    instructions: str | None = None


class GenerationStatusResponse(BaseModel):
    task_id: str
    status: str
    artifact_type: str
    artifact_id: str | None = None

    model_config = {"from_attributes": True}


class ArtifactResponse(BaseModel):
    id: str
    title: str | None = None
    kind: str | None = None
    status: str | None = None
    url: str | None = None

    model_config = {"from_attributes": True}
