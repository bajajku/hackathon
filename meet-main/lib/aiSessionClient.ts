export type AiSessionStatus = {
  sessionId: string;
  roomName: string;
  worldId?: string | null;
  status: string;
  error?: string | null;
  latestRollingSummary?: {
    notes?: string;
    key_points?: string[];
    action_items?: string[];
  } | null;
  finalSummary?: {
    title?: string;
    summary?: string;
    key_points?: string[];
    action_items?: string[];
  } | null;
};

function extractErrorMessage(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  if (!('error' in value)) return undefined;
  const maybe = (value as { error?: unknown }).error;
  return typeof maybe === 'string' && maybe.trim() ? maybe : undefined;
}

async function parseJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const raw = await response.text();
    throw new Error(raw || `Unexpected response status ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function startAiSession(args: {
  roomName: string;
  worldId?: string;
}): Promise<{ sessionId: string }> {
  const response = await fetch('/api/ai/session/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!response.ok) {
    const err = await parseJson<{ error?: string }>(response).catch(() => undefined);
    throw new Error(
      extractErrorMessage(err) || `Failed to start AI session (${response.status})`,
    );
  }
  return parseJson<{ sessionId: string }>(response);
}

export async function postAiFrame(args: {
  sessionId: string;
  frame: Blob;
  timestampMs: number;
}): Promise<void> {
  const formData = new FormData();
  formData.append('frame', args.frame, 'frame.jpg');
  formData.append('timestampMs', String(args.timestampMs));

  const response = await fetch(`/api/ai/session/${args.sessionId}/frame`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await parseJson<{ error?: string }>(response).catch(() => undefined);
    throw new Error(extractErrorMessage(err) || `Failed to upload frame (${response.status})`);
  }
}

export async function postAiAudio(args: {
  sessionId: string;
  audio: Blob;
  timestampMs: number;
  encoding?: string;
  sampleRateHz?: number;
  languageCode?: string;
  speaker?: string;
}): Promise<void> {
  const formData = new FormData();
  formData.append('audio', args.audio, 'chunk.webm');
  formData.append('timestampMs', String(args.timestampMs));
  if (args.encoding) formData.append('encoding', args.encoding);
  if (args.sampleRateHz) formData.append('sampleRateHz', String(args.sampleRateHz));
  if (args.languageCode) formData.append('languageCode', args.languageCode);
  if (args.speaker) formData.append('speaker', args.speaker);

  const response = await fetch(`/api/ai/session/${args.sessionId}/audio`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await parseJson<{ error?: string }>(response).catch(() => undefined);
    throw new Error(extractErrorMessage(err) || `Failed to upload audio (${response.status})`);
  }
}

export async function stopAiSession(sessionId: string): Promise<void> {
  const response = await fetch(`/api/ai/session/${sessionId}/stop`, {
    method: 'POST',
  });

  if (!response.ok && response.status !== 404) {
    const err = await parseJson<{ error?: string }>(response).catch(() => undefined);
    throw new Error(extractErrorMessage(err) || `Failed to stop AI session (${response.status})`);
  }
}

export async function fetchAiSessionStatus(sessionId: string): Promise<AiSessionStatus> {
  const response = await fetch(`/api/ai/session/${sessionId}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    const err = await parseJson<{ error?: string }>(response).catch(() => undefined);
    throw new Error(extractErrorMessage(err) || `Failed to fetch AI session (${response.status})`);
  }

  return parseJson<AiSessionStatus>(response);
}
