import { NextRequest, NextResponse } from 'next/server';
import { getAgentBaseUrl, proxyAgentJson } from '@/lib/aiAgentServer';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const roomName = typeof body?.roomName === 'string' ? body.roomName.trim() : '';
  const worldId = typeof body?.worldId === 'string' ? body.worldId.trim() : undefined;

  if (!roomName) {
    return NextResponse.json({ error: 'Missing roomName' }, { status: 400 });
  }

  const agentUrl = `${getAgentBaseUrl()}/sessions/start`;
  const response = await proxyAgentJson(agentUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ roomName, worldId }),
    cache: 'no-store',
  });

  return response;
}
