import { NextRequest } from 'next/server';
import { getAgentBaseUrl, proxyAgentJson } from '@/lib/aiAgentServer';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const agentUrl = `${getAgentBaseUrl()}/sessions/${sessionId}`;

  return proxyAgentJson(agentUrl, {
    method: 'GET',
    cache: 'no-store',
  });
}
