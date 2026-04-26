export const CONTENT_API_URL =
  process.env.NEXT_PUBLIC_CONTENT_API_URL ?? 'http://localhost:8000';

export type ArtifactItem = {
  id: string;
  title: string | null;
  kind: string | null;
  status: string;
  url: string | null;
};

export type DemoRunResponse = {
  notebook_id: string;
  source_id: string;
  tasks: Array<{ kind: string; task_id: string | null; started: boolean; error?: string }>;
  started_at: string;
};

export type ArtifactKind =
  | 'video'
  | 'audio'
  | 'report'
  | 'quiz'
  | 'flashcards'
  | 'slide_deck'
  | 'infographic'
  | 'mind_map'
  | 'data_table'
  | 'unknown';

export const KIND_META: Record<
  Exclude<ArtifactKind, 'unknown'>,
  { label: string; icon: string; ext: string }
> = {
  video: { label: 'Video', icon: '🎬', ext: 'mp4' },
  audio: { label: 'Audio podcast', icon: '🎧', ext: 'mp3' },
  report: { label: 'Report', icon: '📄', ext: 'md' },
  quiz: { label: 'Quiz', icon: '❓', ext: 'json' },
  flashcards: { label: 'Flashcards', icon: '🃏', ext: 'json' },
  slide_deck: { label: 'Slide deck', icon: '🎞️', ext: 'pdf' },
  infographic: { label: 'Infographic', icon: '🖼️', ext: 'png' },
  mind_map: { label: 'Mind map', icon: '🧠', ext: 'json' },
  data_table: { label: 'Data table', icon: '📊', ext: 'csv' },
};

export function normalizeKind(kind: string | null | undefined): ArtifactKind {
  if (!kind) return 'unknown';
  const stripped = kind.replace(/^ArtifactType\./, '').toLowerCase();
  switch (stripped) {
    case 'video':
    case 'audio':
    case 'report':
    case 'quiz':
    case 'flashcards':
    case 'slide_deck':
    case 'infographic':
    case 'mind_map':
    case 'data_table':
      return stripped;
    default:
      return 'unknown';
  }
}

export function downloadUrl(
  notebookId: string,
  kind: ArtifactKind,
  artifactId: string,
): string | null {
  const base = `${CONTENT_API_URL}/api/downloads/${encodeURIComponent(notebookId)}`;
  const aid = encodeURIComponent(artifactId);
  switch (kind) {
    case 'video':
      return `${base}/video/${aid}`;
    case 'audio':
      return `${base}/audio/${aid}`;
    case 'report':
      return `${base}/report/${aid}`;
    case 'infographic':
      return `${base}/infographic/${aid}`;
    case 'slide_deck':
      return `${base}/slide-deck/${aid}?format=pdf`;
    case 'quiz':
      return `${base}/quiz/${aid}?format=json`;
    case 'flashcards':
      return `${base}/flashcards/${aid}?format=json`;
    case 'mind_map':
      return `${base}/mind-map/${aid}`;
    case 'data_table':
      return `${base}/data-table/${aid}`;
    default:
      return null;
  }
}

export async function fetchArtifacts(notebookId: string): Promise<ArtifactItem[]> {
  const resp = await fetch(
    `${CONTENT_API_URL}/api/notebooks/${encodeURIComponent(notebookId)}/artifacts`,
    { mode: 'cors' },
  );
  if (!resp.ok) throw new Error(`Failed to fetch artifacts (${resp.status})`);
  return (await resp.json()) as ArtifactItem[];
}

export type PastRun = {
  notebook_id: string;
  source_id?: string;
  title?: string;
  started_at?: string;
  tasks?: Array<{ kind: string; task_id: string | null; started: boolean; error?: string }>;
};

export async function fetchRuns(): Promise<PastRun[]> {
  try {
    const resp = await fetch(`${CONTENT_API_URL}/api/demo/runs`, { mode: 'cors' });
    if (!resp.ok) return [];
    return (await resp.json()) as PastRun[];
  } catch {
    return [];
  }
}

export async function runDemo(title?: string): Promise<DemoRunResponse> {
  const resp = await fetch(`${CONTENT_API_URL}/api/demo/run`, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(title ? { title } : {}),
  });
  if (!resp.ok) throw new Error(`Failed to start demo run (${resp.status})`);
  return (await resp.json()) as DemoRunResponse;
}
