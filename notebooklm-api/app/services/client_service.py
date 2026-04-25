from pathlib import Path

from notebooklm import (
    Artifact,
    AskResult,
    AudioFormat,
    AudioLength,
    ChatGoal,
    ChatResponseLength,
    GenerationStatus,
    InfographicDetail,
    InfographicOrientation,
    InfographicStyle,
    Notebook,
    NotebookDescription,
    NotebookLMClient,
    QuizDifficulty,
    QuizQuantity,
    ReportFormat,
    SlideDeckFormat,
    SlideDeckLength,
    Source,
    VideoFormat,
    VideoStyle,
)


class NotebookLMService:
    def __init__(self, client: NotebookLMClient) -> None:
        self._client = client

    # --- Notebooks ---

    async def create_notebook(self, title: str) -> Notebook:
        return await self._client.notebooks.create(title)

    async def list_notebooks(self) -> list[Notebook]:
        return await self._client.notebooks.list()

    async def get_notebook(self, notebook_id: str) -> Notebook:
        return await self._client.notebooks.get(notebook_id)

    async def delete_notebook(self, notebook_id: str) -> bool:
        return await self._client.notebooks.delete(notebook_id)

    async def rename_notebook(self, notebook_id: str, new_title: str) -> Notebook:
        return await self._client.notebooks.rename(notebook_id, new_title)

    async def get_notebook_description(self, notebook_id: str) -> NotebookDescription:
        return await self._client.notebooks.get_description(notebook_id)

    async def get_notebook_metadata(self, notebook_id: str):
        return await self._client.notebooks.get_metadata(notebook_id)

    # --- Sources ---

    async def add_source_file(
        self, notebook_id: str, file_path: Path, wait: bool = True, wait_timeout: float = 120.0
    ) -> Source:
        return await self._client.sources.add_file(
            notebook_id, file_path, wait=wait, wait_timeout=wait_timeout
        )

    async def add_source_text(self, notebook_id: str, title: str, content: str) -> Source:
        return await self._client.sources.add_text(notebook_id, title, content)

    async def add_source_url(
        self, notebook_id: str, url: str, wait: bool = True, wait_timeout: float = 120.0
    ) -> Source:
        return await self._client.sources.add_url(
            notebook_id, url, wait=wait, wait_timeout=wait_timeout
        )

    async def list_sources(self, notebook_id: str) -> list[Source]:
        return await self._client.sources.list(notebook_id)

    async def get_source(self, notebook_id: str, source_id: str) -> Source | None:
        return await self._client.sources.get(notebook_id, source_id)

    async def get_source_fulltext(self, notebook_id: str, source_id: str):
        return await self._client.sources.get_fulltext(notebook_id, source_id)

    async def delete_source(self, notebook_id: str, source_id: str) -> bool:
        return await self._client.sources.delete(notebook_id, source_id)

    async def wait_source_ready(
        self, notebook_id: str, source_id: str, timeout: float = 120.0
    ) -> Source:
        return await self._client.sources.wait_until_ready(notebook_id, source_id, timeout=timeout)

    # --- Artifacts Generation ---

    async def generate_video(
        self,
        notebook_id: str,
        source_ids: list[str] | None = None,
        instructions: str | None = None,
        video_format: VideoFormat | None = None,
        video_style: VideoStyle | None = None,
        language: str = "en",
    ) -> GenerationStatus:
        return await self._client.artifacts.generate_video(
            notebook_id,
            source_ids=source_ids,
            instructions=instructions,
            video_format=video_format,
            video_style=video_style,
            language=language,
        )

    async def generate_cinematic_video(
        self,
        notebook_id: str,
        source_ids: list[str] | None = None,
        instructions: str | None = None,
        language: str = "en",
    ) -> GenerationStatus:
        return await self._client.artifacts.generate_cinematic_video(
            notebook_id,
            source_ids=source_ids,
            instructions=instructions,
            language=language,
        )

    async def generate_audio(
        self,
        notebook_id: str,
        source_ids: list[str] | None = None,
        instructions: str | None = None,
        audio_format: AudioFormat | None = None,
        audio_length: AudioLength | None = None,
        language: str = "en",
    ) -> GenerationStatus:
        return await self._client.artifacts.generate_audio(
            notebook_id,
            source_ids=source_ids,
            instructions=instructions,
            audio_format=audio_format,
            audio_length=audio_length,
            language=language,
        )

    async def generate_report(
        self,
        notebook_id: str,
        source_ids: list[str] | None = None,
        report_format: ReportFormat = ReportFormat.BRIEFING_DOC,
        custom_prompt: str | None = None,
        extra_instructions: str | None = None,
        language: str = "en",
    ) -> GenerationStatus:
        return await self._client.artifacts.generate_report(
            notebook_id,
            source_ids=source_ids,
            report_format=report_format,
            custom_prompt=custom_prompt,
            extra_instructions=extra_instructions,
            language=language,
        )

    async def generate_study_guide(
        self,
        notebook_id: str,
        language: str = "en",
        extra_instructions: str | None = None,
    ) -> GenerationStatus:
        return await self._client.artifacts.generate_study_guide(
            notebook_id,
            language=language,
            extra_instructions=extra_instructions,
        )

    async def generate_quiz(
        self,
        notebook_id: str,
        source_ids: list[str] | None = None,
        instructions: str | None = None,
        quantity: QuizQuantity = QuizQuantity.STANDARD,
        difficulty: QuizDifficulty = QuizDifficulty.MEDIUM,
    ) -> GenerationStatus:
        return await self._client.artifacts.generate_quiz(
            notebook_id,
            source_ids=source_ids,
            instructions=instructions,
            quantity=quantity,
            difficulty=difficulty,
        )

    async def generate_flashcards(
        self,
        notebook_id: str,
        source_ids: list[str] | None = None,
        instructions: str | None = None,
        quantity: QuizQuantity = QuizQuantity.STANDARD,
        difficulty: QuizDifficulty = QuizDifficulty.MEDIUM,
    ) -> GenerationStatus:
        return await self._client.artifacts.generate_flashcards(
            notebook_id,
            source_ids=source_ids,
            instructions=instructions,
            quantity=quantity,
            difficulty=difficulty,
        )

    async def generate_slide_deck(
        self,
        notebook_id: str,
        source_ids: list[str] | None = None,
        slide_format: SlideDeckFormat = SlideDeckFormat.DETAILED_DECK,
        slide_length: SlideDeckLength = SlideDeckLength.DEFAULT,
        language: str = "en",
        instructions: str | None = None,
    ) -> GenerationStatus:
        return await self._client.artifacts.generate_slide_deck(
            notebook_id,
            source_ids=source_ids,
            slide_format=slide_format,
            slide_length=slide_length,
            language=language,
            instructions=instructions,
        )

    async def generate_infographic(
        self,
        notebook_id: str,
        source_ids: list[str] | None = None,
        orientation: InfographicOrientation = InfographicOrientation.LANDSCAPE,
        detail_level: InfographicDetail = InfographicDetail.STANDARD,
        style: InfographicStyle = InfographicStyle.AUTO_SELECT,
        language: str = "en",
        instructions: str | None = None,
    ) -> GenerationStatus:
        return await self._client.artifacts.generate_infographic(
            notebook_id,
            source_ids=source_ids,
            orientation=orientation,
            detail_level=detail_level,
            style=style,
            language=language,
            instructions=instructions,
        )

    async def generate_mind_map(
        self,
        notebook_id: str,
        source_ids: list[str] | None = None,
    ) -> dict:
        return await self._client.artifacts.generate_mind_map(
            notebook_id,
            source_ids=source_ids,
        )

    async def generate_data_table(
        self,
        notebook_id: str,
        language: str = "en",
        instructions: str | None = None,
    ) -> GenerationStatus:
        return await self._client.artifacts.generate_data_table(
            notebook_id,
            language=language,
            instructions=instructions,
        )

    # --- Artifact Status & Listing ---

    async def poll_status(self, notebook_id: str, task_id: str) -> GenerationStatus:
        return await self._client.artifacts.poll_status(notebook_id, task_id)

    async def wait_for_completion(
        self,
        notebook_id: str,
        task_id: str,
        timeout: float = 300.0,
        poll_interval: float = 5.0,
    ) -> GenerationStatus:
        return await self._client.artifacts.wait_for_completion(
            notebook_id, task_id, timeout=timeout, poll_interval=poll_interval
        )

    async def list_artifacts(
        self, notebook_id: str, artifact_type: int | None = None
    ) -> list[Artifact]:
        return await self._client.artifacts.list(notebook_id, artifact_type=artifact_type)

    async def get_artifact(self, notebook_id: str, artifact_id: str) -> Artifact:
        return await self._client.artifacts.get(notebook_id, artifact_id)

    async def delete_artifact(self, notebook_id: str, artifact_id: str) -> bool:
        return await self._client.artifacts.delete(notebook_id, artifact_id)

    # --- Downloads ---

    async def download_audio(
        self, notebook_id: str, output_path: str, artifact_id: str | None = None
    ) -> str:
        return await self._client.artifacts.download_audio(
            notebook_id, output_path, artifact_id=artifact_id
        )

    async def download_video(
        self, notebook_id: str, output_path: str, artifact_id: str | None = None
    ) -> str:
        return await self._client.artifacts.download_video(
            notebook_id, output_path, artifact_id=artifact_id
        )

    async def download_report(
        self, notebook_id: str, output_path: str, artifact_id: str | None = None
    ) -> str:
        return await self._client.artifacts.download_report(
            notebook_id, output_path, artifact_id=artifact_id
        )

    async def download_infographic(
        self, notebook_id: str, output_path: str, artifact_id: str | None = None
    ) -> str:
        return await self._client.artifacts.download_infographic(
            notebook_id, output_path, artifact_id=artifact_id
        )

    async def download_slide_deck(
        self,
        notebook_id: str,
        output_path: str,
        artifact_id: str | None = None,
        output_format: str = "pdf",
    ) -> str:
        return await self._client.artifacts.download_slide_deck(
            notebook_id, output_path, artifact_id=artifact_id, output_format=output_format
        )

    async def download_quiz(
        self,
        notebook_id: str,
        output_path: str,
        artifact_id: str | None = None,
        output_format: str = "json",
    ) -> str:
        return await self._client.artifacts.download_quiz(
            notebook_id, output_path, artifact_id=artifact_id, output_format=output_format
        )

    async def download_flashcards(
        self,
        notebook_id: str,
        output_path: str,
        artifact_id: str | None = None,
        output_format: str = "json",
    ) -> str:
        return await self._client.artifacts.download_flashcards(
            notebook_id, output_path, artifact_id=artifact_id, output_format=output_format
        )

    async def download_mind_map(
        self, notebook_id: str, output_path: str, artifact_id: str | None = None
    ) -> str:
        return await self._client.artifacts.download_mind_map(
            notebook_id, output_path, artifact_id=artifact_id
        )

    async def download_data_table(
        self, notebook_id: str, output_path: str, artifact_id: str | None = None
    ) -> str:
        return await self._client.artifacts.download_data_table(
            notebook_id, output_path, artifact_id=artifact_id
        )

    # --- Chat ---

    async def ask(
        self,
        notebook_id: str,
        question: str,
        source_ids: list[str] | None = None,
        conversation_id: str | None = None,
    ) -> AskResult:
        return await self._client.chat.ask(
            notebook_id,
            question,
            source_ids=source_ids,
            conversation_id=conversation_id,
        )

    async def get_chat_history(
        self,
        notebook_id: str,
        limit: int = 100,
        conversation_id: str | None = None,
    ) -> list[tuple[str, str]]:
        return await self._client.chat.get_history(
            notebook_id, limit=limit, conversation_id=conversation_id
        )

    async def configure_chat(
        self,
        notebook_id: str,
        goal: ChatGoal | None = None,
        response_length: ChatResponseLength | None = None,
        custom_prompt: str | None = None,
    ) -> None:
        await self._client.chat.configure(
            notebook_id,
            goal=goal,
            response_length=response_length,
            custom_prompt=custom_prompt,
        )

    # --- Settings ---

    async def get_output_language(self) -> str | None:
        return await self._client.settings.get_output_language()

    async def set_output_language(self, language: str) -> str | None:
        return await self._client.settings.set_output_language(language)
