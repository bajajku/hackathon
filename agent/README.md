# SpacePresent Agent Service

FastAPI service for concurrent meeting transcript + screen vision summarization.

## Run

```bash
cd agent
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn agent.main:app --host 0.0.0.0 --port 8787 --reload
```

## APIs

- `POST /sessions/start`
- `POST /sessions/{session_id}/frame`
- `POST /sessions/{session_id}/stop`
- `GET /sessions/{session_id}`
- `GET /healthz`

## Artifacts

Each session writes to `agent/data/sessions/{sessionId}`:

- `transcript.jsonl`
- `vision.jsonl`
- `rolling_summary.jsonl`
- `final_summary.json`
