from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any

import httpx


@dataclass(frozen=True)
class ArtifactTrigger:
    artifact_type: str
    endpoint: str
    payload: dict[str, Any]


@dataclass(frozen=True)
class ArtifactTriggerResult:
    artifact_type: str
    status: str
    task_id: str | None
    error: str | None


class ContentGenerationClient:
    def __init__(self, *, base_url: str, timeout_seconds: float = 30.0) -> None:
        self._base_url = base_url.rstrip('/')
        self._timeout_seconds = timeout_seconds

    async def generate_all(
        self,
        *,
        notebook_title: str,
        source_title: str,
        source_content: str,
    ) -> dict[str, Any]:
        async with httpx.AsyncClient(
            base_url=self._base_url,
            timeout=self._timeout_seconds,
        ) as client:
            notebook_id = await self._create_notebook(client=client, title=notebook_title)
            source_id = await self._add_text_source(
                client=client,
                notebook_id=notebook_id,
                title=source_title,
                content=source_content,
            )
            artifacts = self._artifact_requests(notebook_id=notebook_id, source_id=source_id)
            results = await asyncio.gather(
                *[
                    self._trigger_artifact(client=client, trigger=artifact)
                    for artifact in artifacts
                ]
            )

        return {
            'notebookId': notebook_id,
            'sourceId': source_id,
            'artifacts': [
                {
                    'artifactType': item.artifact_type,
                    'status': item.status,
                    'taskId': item.task_id,
                    'error': item.error,
                }
                for item in results
            ],
        }

    async def _create_notebook(self, *, client: httpx.AsyncClient, title: str) -> str:
        response = await client.post('/api/notebooks', json={'title': title})
        response.raise_for_status()
        payload = response.json()
        notebook_id = str(payload.get('id') or '').strip()
        if not notebook_id:
            raise RuntimeError('Content API returned empty notebook id')
        return notebook_id

    async def _add_text_source(
        self,
        *,
        client: httpx.AsyncClient,
        notebook_id: str,
        title: str,
        content: str,
    ) -> str:
        response = await client.post(
            f'/api/notebooks/{notebook_id}/sources/text',
            json={
                'title': title,
                'content': content,
            },
        )
        response.raise_for_status()
        payload = response.json()
        source_id = str(payload.get('id') or '').strip()
        if not source_id:
            raise RuntimeError('Content API returned empty source id')
        return source_id

    def _artifact_requests(self, *, notebook_id: str, source_id: str) -> list[ArtifactTrigger]:
        with_source = {'source_ids': [source_id], 'language': 'en'}
        return [
            ArtifactTrigger('video', f'/api/notebooks/{notebook_id}/artifacts/video', dict(with_source)),
            ArtifactTrigger(
                'cinematic_video',
                f'/api/notebooks/{notebook_id}/artifacts/cinematic-video',
                dict(with_source),
            ),
            ArtifactTrigger('audio', f'/api/notebooks/{notebook_id}/artifacts/audio', dict(with_source)),
            ArtifactTrigger('report', f'/api/notebooks/{notebook_id}/artifacts/report', dict(with_source)),
            ArtifactTrigger('quiz', f'/api/notebooks/{notebook_id}/artifacts/quiz', dict(with_source)),
            ArtifactTrigger(
                'flashcards',
                f'/api/notebooks/{notebook_id}/artifacts/flashcards',
                dict(with_source),
            ),
            ArtifactTrigger(
                'slide_deck',
                f'/api/notebooks/{notebook_id}/artifacts/slide-deck',
                dict(with_source),
            ),
            ArtifactTrigger(
                'infographic',
                f'/api/notebooks/{notebook_id}/artifacts/infographic',
                dict(with_source),
            ),
            ArtifactTrigger(
                'mind_map',
                f'/api/notebooks/{notebook_id}/artifacts/mind-map',
                {'language': 'en'},
            ),
            ArtifactTrigger(
                'data_table',
                f'/api/notebooks/{notebook_id}/artifacts/data-table',
                {'language': 'en'},
            ),
        ]

    async def _trigger_artifact(
        self,
        *,
        client: httpx.AsyncClient,
        trigger: ArtifactTrigger,
    ) -> ArtifactTriggerResult:
        try:
            response = await client.post(trigger.endpoint, json=trigger.payload)
            response.raise_for_status()
            payload = response.json()
            task_id = str(payload.get('task_id') or payload.get('taskId') or '').strip() or None
            status = str(payload.get('status') or 'submitted').strip() or 'submitted'
            return ArtifactTriggerResult(
                artifact_type=trigger.artifact_type,
                status=status,
                task_id=task_id,
                error=None,
            )
        except Exception as exc:
            return ArtifactTriggerResult(
                artifact_type=trigger.artifact_type,
                status='failed',
                task_id=None,
                error=f'{type(exc).__name__}: {exc}',
            )
