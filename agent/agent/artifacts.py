from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import json


@dataclass(frozen=True)
class SessionArtifacts:
    session_dir: Path
    transcript_jsonl: Path
    vision_jsonl: Path
    rolling_summary_jsonl: Path
    final_summary_json: Path


class ArtifactStore:
    def __init__(self, sessions_root: Path) -> None:
        self.sessions_root = sessions_root
        self.sessions_root.mkdir(parents=True, exist_ok=True)

    def paths_for(self, session_id: str) -> SessionArtifacts:
        session_dir = self.sessions_root / session_id
        session_dir.mkdir(parents=True, exist_ok=True)
        return SessionArtifacts(
            session_dir=session_dir,
            transcript_jsonl=session_dir / 'transcript.jsonl',
            vision_jsonl=session_dir / 'vision.jsonl',
            rolling_summary_jsonl=session_dir / 'rolling_summary.jsonl',
            final_summary_json=session_dir / 'final_summary.json',
        )

    @staticmethod
    def append_jsonl(path: Path, payload: dict) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        line = json.dumps(payload, ensure_ascii=True)
        with path.open('a', encoding='utf-8') as f:
            f.write(line)
            f.write('\n')

    @staticmethod
    def write_json(path: Path, payload: dict) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open('w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=True, indent=2)

    @staticmethod
    def read_json(path: Path) -> dict | None:
        if not path.exists():
            return None
        with path.open('r', encoding='utf-8') as f:
            return json.load(f)

    @staticmethod
    def read_last_jsonl(path: Path) -> dict | None:
        if not path.exists():
            return None
        last = None
        with path.open('r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                last = line
        if last is None:
            return None
        return json.loads(last)
