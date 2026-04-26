import { afterEach, describe, expect, it, vi } from 'vitest';
import { postAiTranscript } from './aiSessionClient';

describe('postAiTranscript', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts finalized browser speech text to the transcript endpoint', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    }));
    vi.stubGlobal('fetch', fetchMock);

    await postAiTranscript({
      sessionId: 'session-1',
      text: 'hello from speech',
      timestampMs: 1234,
      speaker: 'host',
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/ai/session/session-1/transcript', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: 'hello from speech',
        timestampMs: 1234,
        speaker: 'host',
        isFinal: true,
        source: 'browser_speech_recognition',
      }),
    });
  });
});
