from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.dependencies import lifespan
from app.middleware.error_handler import register_error_handlers
from app.routers import artifacts, auth, chat, downloads, notebooks, sources

app = FastAPI(
    title="Content Generation API",
    version="0.1.0",
    description="REST API for AI-powered content generation (video, audio, quizzes, reports, etc.) from transcripts via notebooklm-py",
    lifespan=lifespan,
)

origins = [origin.strip() for origin in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(notebooks.router, prefix="/api/notebooks", tags=["Notebooks"])
app.include_router(sources.router, prefix="/api/notebooks", tags=["Sources"])
app.include_router(artifacts.router, prefix="/api/notebooks", tags=["Artifacts"])
app.include_router(downloads.router, prefix="/api/downloads", tags=["Downloads"])
app.include_router(chat.router, prefix="/api/notebooks", tags=["Chat"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
