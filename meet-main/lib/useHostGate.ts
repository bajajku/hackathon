'use client';

import { useCallback } from 'react';
import type { Participant } from 'livekit-client';
import { parseParticipantMetadata } from './dataChannelTypes';

export function isHostParticipant(p: Participant | undefined): boolean {
  if (!p) return false;
  const meta = parseParticipantMetadata(p.metadata);
  return meta?.role === 'host';
}

export function useHostGate() {
  return useCallback((p: Participant | undefined) => isHostParticipant(p), []);
}
