'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDataChannel } from '@livekit/components-react';
import type { Participant } from 'livekit-client';
import { TOUR_TOPIC, type TourPacket, type Vec3 } from './dataChannelTypes';
import { isHostParticipant } from './useHostGate';
import { useWorldSession } from './useWorldSession';

const PUBLISH_INTERVAL_MS = 100; // 10 Hz
const POS_EPSILON = 0.01; // metres
const RING_SIZE = 3;

export type TourState = {
  cam: { pos: Vec3; target: Vec3 };
  sel: string | null;
  vel?: Vec3;
};

export type TourReceiver = {
  buffer: ReadonlyArray<{ packet: TourPacket; receivedAt: number }>;
  latest: () => TourPacket | null;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function vecChanged(a: Vec3, b: Vec3): boolean {
  return (
    Math.abs(a[0] - b[0]) > POS_EPSILON ||
    Math.abs(a[1] - b[1]) > POS_EPSILON ||
    Math.abs(a[2] - b[2]) > POS_EPSILON
  );
}

export function useTourSync(args: {
  enabled: boolean;
  /** Live tour state ref — host renderer mutates this each frame; we sample it. */
  tourStateRef?: React.MutableRefObject<TourState | null>;
}): TourReceiver {
  const { isHost } = useWorldSession();
  const bufferRef = useRef<{ packet: TourPacket; receivedAt: number }[]>([]);
  const lastSentRef = useRef<TourPacket | null>(null);

  const onMessage = useCallback(
    (msg: { payload: Uint8Array; from?: Participant }) => {
      if (!isHostParticipant(msg.from)) return; // gate: drop non-host
      let packet: TourPacket;
      try {
        packet = JSON.parse(decoder.decode(msg.payload)) as TourPacket;
      } catch {
        return;
      }
      if (packet.v !== 1) return;
      const buf = bufferRef.current;
      buf.push({ packet, receivedAt: performance.now() });
      if (buf.length > RING_SIZE) buf.shift();
    },
    [],
  );

  const { send } = useDataChannel(TOUR_TOPIC, onMessage);

  // Host publish loop — only when host AND enabled AND ref is wired
  useEffect(() => {
    if (!isHost || !args.enabled || !args.tourStateRef) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      const state = args.tourStateRef!.current;
      if (state) {
        const next: TourPacket = {
          v: 1,
          t: performance.now(),
          cam: { pos: state.cam.pos, target: state.cam.target },
          sel: state.sel,
          vel: state.vel,
        };
        const last = lastSentRef.current;
        const changed =
          !last ||
          last.sel !== next.sel ||
          vecChanged(last.cam.pos, next.cam.pos) ||
          vecChanged(last.cam.target, next.cam.target);
        if (changed) {
          lastSentRef.current = next;
          const payload = encoder.encode(JSON.stringify(next));
          if (process.env.NODE_ENV !== 'production') {
            console.assert(payload.byteLength <= 200, `tour packet ${payload.byteLength}B > 200B`);
          }
          try {
            await send(payload, { reliable: false, topic: TOUR_TOPIC });
          } catch (e) {
            console.warn('tour publish failed', e);
          }
        }
      }
    };

    const id = window.setInterval(tick, PUBLISH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isHost, args.enabled, args.tourStateRef, send]);

  return useMemo<TourReceiver>(
    () => ({
      buffer: bufferRef.current,
      latest: () => bufferRef.current[bufferRef.current.length - 1]?.packet ?? null,
    }),
    [],
  );
}
