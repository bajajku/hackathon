import { NextRequest, NextResponse } from 'next/server';
import { getAgentBaseUrl, proxyAgentJson } from '@/lib/aiAgentServer';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const form = await request.formData();

  const frame = form.get('frame');
  const timestampRaw = form.get('timestampMs');
  const timestampMs = Number(timestampRaw);

  if (!(frame instanceof Blob)) {
    return NextResponse.json({ error: 'Missing frame file' }, { status: 400 });
  }
  if (!Number.isFinite(timestampMs)) {
    return NextResponse.json({ error: 'Invalid timestampMs' }, { status: 400 });
  }

  const out = new FormData();
  out.append('frame', frame, 'frame.jpg');
  out.append('timestampMs', String(Math.floor(timestampMs)));

  const agentUrl = `${getAgentBaseUrl()}/sessions/${sessionId}/frame`;
  return proxyAgentJson(agentUrl, {
    method: 'POST',
    body: out,
    cache: 'no-store',
  });
}
