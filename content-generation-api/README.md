# NotebookLM API


## Quick Start

```bash
# Install dependencies
uv sync
uv run playwright install chromium

# Authenticate with Google (opens browser)
notebooklm login

# Start the server
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/auth/status` | Check authentication status |
| `POST` | `/api/auth/login?browser=chromium` | Browser-based Google login |

### Notebooks
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/notebooks` | Create notebook |
| `GET` | `/api/notebooks` | List notebooks |
| `GET` | `/api/notebooks/{id}` | Get notebook details |
| `DELETE` | `/api/notebooks/{id}` | Delete notebook |
| `PATCH` | `/api/notebooks/{id}` | Rename notebook |

### Sources (Transcript Upload)
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/notebooks/{id}/sources/file` | Upload file (PDF, TXT, MD, etc.) |
| `POST` | `/api/notebooks/{id}/sources/text` | Upload raw text content |
| `POST` | `/api/notebooks/{id}/sources/url` | Add URL source |
| `GET` | `/api/notebooks/{id}/sources` | List sources |
| `GET` | `/api/notebooks/{id}/sources/{sid}` | Get source fulltext |
| `DELETE` | `/api/notebooks/{id}/sources/{sid}` | Delete source |

### Artifact Generation
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/notebooks/{id}/artifacts/video` | Generate video overview |
| `POST` | `/api/notebooks/{id}/artifacts/cinematic-video` | Generate cinematic video (Veo 3) |
| `POST` | `/api/notebooks/{id}/artifacts/audio` | Generate podcast |
| `POST` | `/api/notebooks/{id}/artifacts/report` | Generate report |
| `POST` | `/api/notebooks/{id}/artifacts/quiz` | Generate quiz |
| `POST` | `/api/notebooks/{id}/artifacts/flashcards` | Generate flashcards |
| `POST` | `/api/notebooks/{id}/artifacts/slide-deck` | Generate slide deck |
| `POST` | `/api/notebooks/{id}/artifacts/infographic` | Generate infographic |
| `POST` | `/api/notebooks/{id}/artifacts/mind-map` | Generate mind map |
| `POST` | `/api/notebooks/{id}/artifacts/data-table` | Generate data table |
| `GET` | `/api/notebooks/{id}/artifacts` | List artifacts |
| `GET` | `/api/notebooks/{id}/artifacts/{task_id}/status` | Poll generation status |

### Downloads
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/downloads/{id}/video/{aid}` | Download specific video |
| `GET` | `/api/downloads/{id}/video/latest` | Download latest video |
| `GET` | `/api/downloads/{id}/audio/{aid}` | Download specific audio |
| `GET` | `/api/downloads/{id}/audio/latest` | Download latest audio |
| `GET` | `/api/downloads/{id}/report/{aid}` | Download report (.md) |
| `GET` | `/api/downloads/{id}/infographic/{aid}` | Download infographic (.png) |
| `GET` | `/api/downloads/{id}/slide-deck/{aid}?format=pdf` | Download slide deck |
| `GET` | `/api/downloads/{id}/quiz/{aid}?format=json` | Download quiz |
| `GET` | `/api/downloads/{id}/flashcards/{aid}?format=json` | Download flashcards |
| `GET` | `/api/downloads/{id}/mind-map/{aid}` | Download mind map (.json) |
| `GET` | `/api/downloads/{id}/data-table/{aid}` | Download data table (.csv) |

### Chat
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/notebooks/{id}/chat` | Ask a question |
| `GET` | `/api/notebooks/{id}/chat/history` | Get chat history |
| `POST` | `/api/notebooks/{id}/chat/configure` | Configure chat persona |
