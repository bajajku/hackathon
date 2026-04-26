import type { Vec3 } from './dataChannelTypes';

export const HARNESS_VERSION = 1;

export type HarnessFromIframe =
  | { type: 'sp:ready'; v: 1; t: number; sceneId?: string }
  | { type: 'sp:camera'; v: 1; t: number; pos: Vec3; target: Vec3 }
  | { type: 'sp:cursor'; v: 1; t: number; hit: { pos: Vec3; bId?: string } | null }
  | { type: 'sp:select'; v: 1; t: number; bId: string | null }
  | { type: 'sp:captureFrame'; v: 1; t: number; dataUrl: string; source?: string }
  | { type: 'sp:captureError'; v: 1; t: number; error: string };

export type RemoteCursorMarker = {
  id: string;
  name: string;
  pos: Vec3;
  bId?: string;
};

export type HarnessToIframe =
  | { type: 'sp:role'; v: 1; t: number; role: 'host' | 'participant' }
  | { type: 'sp:setCamera'; v: 1; t: number; pos: Vec3; target: Vec3 }
  | { type: 'sp:setSelection'; v: 1; t: number; bId: string | null }
  | { type: 'sp:remoteCursors'; v: 1; t: number; cursors: RemoteCursorMarker[] }
  | {
      type: 'sp:capture';
      v: 1;
      t: number;
      format?: 'image/jpeg' | 'image/png';
      quality?: number;
      maxWidth?: number;
    };

export function isHarnessFromIframe(value: unknown): value is HarnessFromIframe {
  if (!value || typeof value !== 'object') return false;
  const v = value as { type?: unknown; v?: unknown };
  if (v.v !== HARNESS_VERSION) return false;
  return (
    v.type === 'sp:ready' ||
    v.type === 'sp:camera' ||
    v.type === 'sp:cursor' ||
    v.type === 'sp:select' ||
    v.type === 'sp:captureFrame' ||
    v.type === 'sp:captureError'
  );
}
