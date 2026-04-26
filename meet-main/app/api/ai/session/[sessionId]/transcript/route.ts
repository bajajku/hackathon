import { NextRequest, NextResponse } from 'next/server';
import { getAgentBaseUrl, proxyAgentJson } from '@/lib/aiAgentServer';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const body = await request.json().catch(() => null);

  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  const timestampMs = Number(body?.timestampMs);
  const speaker = typeof body?.speaker === 'string' && body.speaker.trim() ? body.speaker.trim() : 'host';
  const isFinal = typeof body?.isFinal === 'boolean' ? body.isFinal : true;
  const source =
    typeof body?.source === 'string' && body.source.trim()
      ? body.source.trim()
      : 'browser_speech_recognition';

  if (!text) {
    return NextResponse.json({ error: 'Missing transcript text' }, { status: 400 });
  }
  if (!Number.isFinite(timestampMs)) {
    return NextResponse.json({ error: 'Invalid timestampMs' }, { status: 400 });
  }

  const agentUrl = `${getAgentBaseUrl()}/sessions/${sessionId}/transcript`;
  return proxyAgentJson(agentUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      text,
      timestampMs: Math.floor(timestampMs),
      speaker,
      isFinal,
      source,
    }),
    cache: 'no-store',
  });
}
