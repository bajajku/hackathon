'use client';

import React from 'react';
import { useTourSync, type TourState } from './useTourSync';
import { useCursorSync, type CursorState, type RemoteCursor } from './useCursorSync';
import { useWorldSession } from './useWorldSession';
import {
  HARNESS_VERSION,
  isHarnessFromIframe,
  type HarnessToIframe,
  type RemoteCursorMarker,
} from './worldHarnessProtocol';

const REMOTE_CURSOR_BROADCAST_HZ = 10;

export function WorldWorkspace(props: {
  sceneSrc: string | null;
  onClose?: () => void;
  captureEnabled?: boolean;
  captureIntervalMs?: number;
  onCaptureFrame?: (frame: Blob) => void | Promise<void>;
}) {
  const { isHost, role } = useWorldSession();
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const harnessReadyRef = React.useRef(false);
  const captureInFlightRef = React.useRef(false);

  // Refs the data-channel hooks read from on each tick
  const tourStateRef = React.useRef<TourState | null>(null);
  const cursorStateRef = React.useRef<CursorState | null>(null);

  const tourReceiver = useTourSync({ enabled: Boolean(props.sceneSrc), tourStateRef });
  const remoteCursors = useCursorSync({
    enabled: Boolean(props.sceneSrc),
    cursorStateRef,
  });

  const postToIframe = React.useCallback((msg: HarnessToIframe) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(msg, '*');
  }, []);

  // Reset ready flag when src changes
  React.useEffect(() => {
    harnessReadyRef.current = false;
    tourStateRef.current = null;
    cursorStateRef.current = null;
  }, [props.sceneSrc]);

  // Listen for messages from the iframe
  React.useEffect(() => {
    if (!props.sceneSrc) return;
    const onMessage = (e: MessageEvent) => {
      const win = iframeRef.current?.contentWindow;
      if (!win || e.source !== win) return;
      if (!isHarnessFromIframe(e.data)) return;
      const data = e.data;

      if (data.type === 'sp:ready') {
        harnessReadyRef.current = true;
        postToIframe({
          type: 'sp:role',
          v: HARNESS_VERSION,
          t: performance.now(),
          role: isHost ? 'host' : 'participant',
        });
        return;
      }

      if (data.type === 'sp:camera' && isHost) {
        const prev = tourStateRef.current;
        tourStateRef.current = {
          cam: { pos: data.pos, target: data.target },
          sel: prev?.sel ?? null,
        };
        return;
      }

      if (data.type === 'sp:select' && isHost) {
        const prev = tourStateRef.current;
        if (prev) {
          tourStateRef.current = { ...prev, sel: data.bId };
        } else {
          tourStateRef.current = {
            cam: { pos: [0, 0, 0], target: [0, 0, 0] },
            sel: data.bId,
          };
        }
        return;
      }

      if (data.type === 'sp:cursor') {
        cursorStateRef.current = { hit: data.hit };
        return;
      }

      if (data.type === 'sp:captureFrame') {
        captureInFlightRef.current = false;
        if (!props.captureEnabled || !isHost || typeof data.dataUrl !== 'string') return;
        const frameBlob = dataUrlToBlob(data.dataUrl);
        if (frameBlob && props.onCaptureFrame) {
          void Promise.resolve(props.onCaptureFrame(frameBlob)).catch(() => {
            // swallow callback errors so capture loop remains stable
          });
        }
        return;
      }

      if (data.type === 'sp:captureError') {
        captureInFlightRef.current = false;
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [isHost, postToIframe, props.captureEnabled, props.onCaptureFrame, props.sceneSrc]);

  // Participant: replay host tour packets into iframe via RAF loop
  React.useEffect(() => {
    if (!props.sceneSrc) return;
    if (isHost) return;
    let raf = 0;
    let lastT = -1;
    let lastSel: string | null | undefined = undefined;
    const tick = () => {
      if (harnessReadyRef.current) {
        const packet = tourReceiver.latest();
        if (packet && packet.t !== lastT) {
          lastT = packet.t;
          postToIframe({
            type: 'sp:setCamera',
            v: HARNESS_VERSION,
            t: performance.now(),
            pos: packet.cam.pos,
            target: packet.cam.target,
          });
          if (packet.sel !== lastSel) {
            lastSel = packet.sel;
            postToIframe({
              type: 'sp:setSelection',
              v: HARNESS_VERSION,
              t: performance.now(),
              bId: packet.sel,
            });
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isHost, postToIframe, props.sceneSrc, tourReceiver]);

  // Everyone: forward remote cursors map to iframe at ~10Hz
  React.useEffect(() => {
    if (!props.sceneSrc) return;
    const id = window.setInterval(() => {
      if (!harnessReadyRef.current) return;
      const list: RemoteCursorMarker[] = [];
      remoteCursors.forEach((c: RemoteCursor) => {
        if (!c.packet.hit) return;
        list.push({
          id: c.identity,
          name: c.participantName,
          pos: c.packet.hit.pos,
          bId: c.packet.hit.bId,
        });
      });
      postToIframe({
        type: 'sp:remoteCursors',
        v: HARNESS_VERSION,
        t: performance.now(),
        cursors: list,
      });
    }, 1000 / REMOTE_CURSOR_BROADCAST_HZ);
    return () => window.clearInterval(id);
  }, [postToIframe, props.sceneSrc, remoteCursors]);

  // Host-only: request periodic frame snapshots from the embedded world so they can
  // feed the AI vision pipeline even when screen share is not active.
  React.useEffect(() => {
    if (!props.sceneSrc || !props.captureEnabled || !isHost || !props.onCaptureFrame) return;
    const captureEveryMs = Math.max(500, props.captureIntervalMs ?? 1000);
    const id = window.setInterval(() => {
      if (!harnessReadyRef.current || captureInFlightRef.current) return;
      captureInFlightRef.current = true;
      postToIframe({
        type: 'sp:capture',
        v: HARNESS_VERSION,
        t: performance.now(),
        format: 'image/jpeg',
        quality: 0.72,
        maxWidth: 1280,
      });
      window.setTimeout(() => {
        captureInFlightRef.current = false;
      }, 1400);
    }, captureEveryMs);
    return () => {
      window.clearInterval(id);
      captureInFlightRef.current = false;
    };
  }, [
    isHost,
    postToIframe,
    props.captureEnabled,
    props.captureIntervalMs,
    props.onCaptureFrame,
    props.sceneSrc,
  ]);

  if (!props.sceneSrc) return null;

  return (
    <div className="world-workspace">
      <div className="world-workspace-header">
        <span className="world-workspace-title">Shared workspace</span>
        <span className="world-workspace-role">{role === 'host' ? 'You drive' : 'Following host'}</span>
        {isHost && props.onClose && (
          <button
            className="lk-button world-workspace-close"
            type="button"
            onClick={props.onClose}
            title="Close workspace for everyone"
          >
            Close
          </button>
        )}
      </div>
      <iframe
        ref={iframeRef}
        className="world-workspace-iframe"
        src={props.sceneSrc}
        title="Interactive workspace"
        sandbox="allow-scripts"
      />
    </div>
  );
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) return null;
  const [, mimeType, b64] = match;
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType || 'image/jpeg' });
  } catch {
    return null;
  }
}
