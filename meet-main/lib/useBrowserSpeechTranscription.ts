'use client';

import React from 'react';

type SpeechRecognitionAlternativeLike = {
  transcript?: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike | undefined;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike | undefined;
  };
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
  message?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export type BrowserTranscriptSegment = {
  text: string;
  timestampMs: number;
  speaker: string;
  isFinal: boolean;
  source: 'browser_speech_recognition';
};

export type BrowserSpeechTranscriptionState = {
  supported: boolean;
  listening: boolean;
  interimText: string;
  status: string;
};

export function useBrowserSpeechTranscription(args: {
  enabled: boolean;
  language?: string;
  speaker?: string;
  onFinalTranscript: (segment: BrowserTranscriptSegment) => void | Promise<void>;
  onError?: (message: string) => void;
}): BrowserSpeechTranscriptionState {
  const [supported, setSupported] = React.useState(() => Boolean(getSpeechRecognitionConstructor()));
  const [listening, setListening] = React.useState(false);
  const [interimText, setInterimText] = React.useState('');
  const [status, setStatus] = React.useState('Browser transcription unavailable');
  const onFinalTranscriptRef = React.useRef(args.onFinalTranscript);
  const onErrorRef = React.useRef(args.onError);

  React.useEffect(() => {
    onFinalTranscriptRef.current = args.onFinalTranscript;
    onErrorRef.current = args.onError;
  }, [args.onFinalTranscript, args.onError]);

  React.useEffect(() => {
    const Ctor = getSpeechRecognitionConstructor();
    const isSupported = Boolean(Ctor);
    setSupported(isSupported);
    if (!isSupported) {
      setListening(false);
      setInterimText('');
      setStatus('Browser transcription unavailable');
      return;
    }
    if (!args.enabled) {
      setListening(false);
      setInterimText('');
      setStatus('Browser transcription paused');
      return;
    }

    let cancelled = false;
    let restartTimer: number | null = null;
    const recognition = new Ctor!();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = args.language ?? 'en-US';

    const scheduleRestart = () => {
      if (cancelled || !args.enabled) return;
      if (restartTimer !== null) return;
      restartTimer = window.setTimeout(() => {
        restartTimer = null;
        try {
          recognition.start();
        } catch {
          // Chrome throws when start is called while already active.
        }
      }, 300);
    };

    recognition.onstart = () => {
      if (cancelled) return;
      setListening(true);
      setStatus('Browser transcription listening');
    };
    recognition.onend = () => {
      if (cancelled) return;
      setListening(false);
      scheduleRestart();
    };
    recognition.onerror = (event) => {
      if (cancelled) return;
      const detail = event.error || event.message || 'unknown error';
      const message = `Browser transcription error: ${detail}`;
      setStatus(message);
      onErrorRef.current?.(message);
    };
    recognition.onresult = (event) => {
      if (cancelled) return;
      let nextInterim = '';
      const finals: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result?.[0]?.transcript?.trim() ?? '';
        if (!transcript) continue;
        if (result?.isFinal) {
          finals.push(transcript);
        } else {
          nextInterim = `${nextInterim} ${transcript}`.trim();
        }
      }
      setInterimText(nextInterim);
      for (const text of finals) {
        void Promise.resolve(
          onFinalTranscriptRef.current({
            text,
            timestampMs: Date.now(),
            speaker: args.speaker ?? 'host',
            isFinal: true,
            source: 'browser_speech_recognition',
          }),
        ).catch((error) => {
          const message = error instanceof Error ? error.message : 'Failed to upload transcript';
          setStatus(message);
          onErrorRef.current?.(message);
        });
      }
    };

    try {
      recognition.start();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start browser transcription';
      setStatus(message);
      onErrorRef.current?.(message);
    }

    return () => {
      cancelled = true;
      if (restartTimer !== null) {
        window.clearTimeout(restartTimer);
      }
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      try {
        recognition.abort();
      } catch {
        try {
          recognition.stop();
        } catch {
          // ignore cleanup failures
        }
      }
      setListening(false);
      setInterimText('');
    };
  }, [args.enabled, args.language, args.speaker]);

  return { supported, listening, interimText, status };
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const candidate = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}
