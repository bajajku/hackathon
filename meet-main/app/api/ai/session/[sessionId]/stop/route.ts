import { NextRequest } from 'next/server';
import { getAgentBaseUrl, proxyAgentJson } from '@/lib/aiAgentServer';

export const runtime = 'nodejs';

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const agentUrl = `${getAgentBaseUrl()}/sessions/${sessionId}/stop`;

  return proxyAgentJson(agentUrl, {
    method: 'POST',
    cache: 'no-store',
  });
}
