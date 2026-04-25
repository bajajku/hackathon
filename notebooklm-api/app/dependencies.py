import contextlib
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from notebooklm import NotebookLMClient, NotebookLMError

from app.config import settings
from app.services.client_service import NotebookLMService

logger = logging.getLogger(__name__)

_global_service: NotebookLMService | None = None
_auth_error: str | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _global_service, _auth_error

    if settings.notebooklm_auth_json:
        os.environ["NOTEBOOKLM_AUTH_JSON"] = settings.notebooklm_auth_json
    if settings.notebooklm_home:
        os.environ["NOTEBOOKLM_HOME"] = settings.notebooklm_home
    if settings.notebooklm_profile:
        os.environ["NOTEBOOKLM_PROFILE"] = settings.notebooklm_profile

    try:
        client = await NotebookLMClient.from_storage()
        await client.__aenter__()
        _global_service = NotebookLMService(client)
        app.state.service = _global_service
        _auth_error = None
        logger.info(
            "NotebookLMClient initialized with profile=%s", settings.notebooklm_profile
        )
    except (FileNotFoundError, NotebookLMError, Exception) as e:
        _global_service = None
        _auth_error = str(e)
        logger.warning(
            "NotebookLMClient not initialized: %s. Run /api/auth/login to authenticate.",
            e,
        )

    yield

    if _global_service is not None:
        with contextlib.suppress(Exception):
            await _global_service._client.__aexit__(None, None, None)
        _global_service = None
    logger.info("NotebookLMClient shut down")


def get_service() -> NotebookLMService:
    if _global_service is None:
        raise RuntimeError(
            f"NotebookLM client not authenticated. {_auth_error or 'Please run /api/auth/login first.'}"
        )
    return _global_service


def is_authenticated() -> bool:
    return _global_service is not None
