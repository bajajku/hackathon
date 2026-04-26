import { NextRequest, NextResponse } from 'next/server';
import { getAgentBaseUrl, proxyAgentJson } from '@/lib/aiAgentServer';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const form = await request.formData();

  const audio = form.get('audio');
  const timestampRaw = form.get('timestampMs');
  const timestampMs = Number(timestampRaw);

  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: 'Missing audio file' }, { status: 400 });
  }
  if (!Number.isFinite(timestampMs)) {
    return NextResponse.json({ error: 'Invalid timestampMs' }, { status: 400 });
  }

  const out = new FormData();
  out.append('audio', audio, 'chunk.webm');
  out.append('timestampMs', String(Math.floor(timestampMs)));

  const passthrough = ['encoding', 'sampleRateHz', 'languageCode', 'speaker'];
  for (const key of passthrough) {
    const value = form.get(key);
    if (typeof value === 'string' && value.length > 0) {
      out.append(key, value);
    }
  }

  const agentUrl = `${getAgentBaseUrl()}/sessions/${sessionId}/audio`;
  return proxyAgentJson(agentUrl, {
    method: 'POST',
    body: out,
    cache: 'no-store',
  });
}
