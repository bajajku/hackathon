from fastapi import Request
from fastapi.responses import JSONResponse
from notebooklm import (
    ArtifactNotFoundError,
    ArtifactNotReadyError,
    AuthError,
    NetworkError,
    NotebookLMError,
    NotebookNotFoundError,
    RateLimitError,
    RPCError,
    SourceNotFoundError,
    SourceProcessingError,
    SourceTimeoutError,
    ValidationError,
)


async def notebooklm_error_handler(request: Request, exc: NotebookLMError) -> JSONResponse:
    status_map: dict[type[NotebookLMError], int] = {
        AuthError: 401,
        NotebookNotFoundError: 404,
        SourceNotFoundError: 404,
        ArtifactNotFoundError: 404,
        SourceProcessingError: 422,
        SourceTimeoutError: 504,
        RateLimitError: 429,
        ValidationError: 400,
        NetworkError: 503,
        ArtifactNotReadyError: 409,
    }

    status_code = status_map.get(type(exc), 502)
    return JSONResponse(
        status_code=status_code,
        content={
            "detail": str(exc),
            "error_type": type(exc).__name__,
        },
    )


async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    error_type = type(exc).__name__
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "error_type": error_type,
        },
    )


def register_error_handlers(app):
    app.add_exception_handler(AuthError, notebooklm_error_handler)
    app.add_exception_handler(NotebookNotFoundError, notebooklm_error_handler)
    app.add_exception_handler(SourceNotFoundError, notebooklm_error_handler)
    app.add_exception_handler(ArtifactNotFoundError, notebooklm_error_handler)
    app.add_exception_handler(SourceProcessingError, notebooklm_error_handler)
    app.add_exception_handler(SourceTimeoutError, notebooklm_error_handler)
    app.add_exception_handler(RateLimitError, notebooklm_error_handler)
    app.add_exception_handler(NetworkError, notebooklm_error_handler)
    app.add_exception_handler(ArtifactNotReadyError, notebooklm_error_handler)
    app.add_exception_handler(ValidationError, notebooklm_error_handler)
    app.add_exception_handler(NotebookLMError, notebooklm_error_handler)
    app.add_exception_handler(RPCError, notebooklm_error_handler)
    app.add_exception_handler(Exception, generic_error_handler)
