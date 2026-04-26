import { NextResponse } from 'next/server';

const DEFAULT_AGENT_URL = 'http://127.0.0.1:8787';

export function getAgentBaseUrl(): string {
  const configured = process.env.AI_AGENT_BASE_URL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_AGENT_URL;
}

export async function proxyAgentJson(
  url: string,
  init: RequestInit,
): Promise<NextResponse<unknown>> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    return NextResponse.json(
      {
        error: `Unable to reach AI agent service at ${url}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      },
      { status: 502 },
    );
  }
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const json = await response.json().catch(() => ({
      error: 'Invalid JSON returned from agent service',
    }));
    return NextResponse.json(json, { status: response.status });
  }

  const text = await response.text();
  return NextResponse.json(
    {
      error: text || `Agent request failed (${response.status})`,
    },
    { status: response.status },
  );
}
