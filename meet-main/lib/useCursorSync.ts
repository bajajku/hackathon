'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDataChannel, useRoomContext } from '@livekit/components-react';
import { RoomEvent, type Participant, type RemoteParticipant } from 'livekit-client';
import { CURSOR_TOPIC, type CursorPacket, type Vec3 } from './dataChannelTypes';

const PUBLISH_INTERVAL_MS = 80; // ~12.5 Hz
const POS_EPSILON = 0.01;
const MAX_REMOTE_CURSORS = 32;

export type RemoteCursor = {
  identity: string;
  participantName: string;
  packet: CursorPacket;
  receivedAt: number;
};

export type CursorState = { hit: { pos: Vec3; bId?: string } | null };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function vecChanged(a: Vec3 | undefined, b: Vec3 | undefined): boolean {
  if (!a || !b) return a !== b;
  return (
    Math.abs(a[0] - b[0]) > POS_EPSILON ||
    Math.abs(a[1] - b[1]) > POS_EPSILON ||
    Math.abs(a[2] - b[2]) > POS_EPSILON
  );
}

export function useCursorSync(args: {
  enabled: boolean;
  cursorStateRef?: React.MutableRefObject<CursorState | null>;
}): ReadonlyMap<string, RemoteCursor> {
  const room = useRoomContext();
  const [, force] = useState(0);
  const cursorsRef = useRef<Map<string, RemoteCursor>>(new Map());
  const lastSentRef = useRef<CursorPacket | null>(null);

  const onMessage = useCallback(
    (msg: { payload: Uint8Array; from?: Participant }) => {
      if (!msg.from || msg.from.identity === room.localParticipant.identity) return;
      let packet: CursorPacket;
      try {
        packet = JSON.parse(decoder.decode(msg.payload)) as CursorPacket;
      } catch {
        return;
      }
      if (packet.v !== 1) return;
      const map = cursorsRef.current;
      if (!map.has(msg.from.identity) && map.size >= MAX_REMOTE_CURSORS) return;
      map.set(msg.from.identity, {
        identity: msg.from.identity,
        participantName: msg.from.name ?? msg.from.identity,
        packet,
        receivedAt: performance.now(),
      });
      force((n) => (n + 1) & 0xffff);
    },
    [room],
  );

  const { send } = useDataChannel(CURSOR_TOPIC, onMessage);

  // Local publish loop
  useEffect(() => {
    if (!args.enabled || !args.cursorStateRef) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      const state = args.cursorStateRef!.current;
      if (!state) return;
      const next: CursorPacket = { v: 1, t: performance.now(), hit: state.hit };
      const last = lastSentRef.current;
      const changed =
        !last ||
        (last.hit === null) !== (next.hit === null) ||
        (last.hit && next.hit && (last.hit.bId !== next.hit.bId || vecChanged(last.hit.pos, next.hit.pos)));
      if (!changed) return;
      lastSentRef.current = next;
      const payload = encoder.encode(JSON.stringify(next));
      if (process.env.NODE_ENV !== 'production') {
        console.assert(payload.byteLength <= 200, `cursor packet ${payload.byteLength}B > 200B`);
      }
      try {
        await send(payload, { reliable: false, topic: CURSOR_TOPIC });
      } catch (e) {
        console.warn('cursor publish failed', e);
      }
    };

    const id = window.setInterval(tick, PUBLISH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [args.enabled, args.cursorStateRef, send]);

  // Cleanup remote cursors on disconnect
  useEffect(() => {
    const onDisconnected = (p: RemoteParticipant) => {
      if (cursorsRef.current.delete(p.identity)) {
        force((n) => (n + 1) & 0xffff);
      }
    };
    room.on(RoomEvent.ParticipantDisconnected, onDisconnected);
    return () => {
      room.off(RoomEvent.ParticipantDisconnected, onDisconnected);
    };
  }, [room]);

  return cursorsRef.current;
}
