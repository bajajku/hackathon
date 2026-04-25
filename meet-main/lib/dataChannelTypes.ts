import type { ParticipantRole } from './types';

export const TOUR_TOPIC = 'tour';
export const CURSOR_TOPIC = 'cursor';

export type Vec3 = [number, number, number];

export type ParticipantMetadata = {
  worldId: string;
  role: ParticipantRole;
};

export type TourPacket = {
  v: 1;
  t: number;
  cam: { pos: Vec3; target: Vec3 };
  sel: string | null;
  vel?: Vec3;
};

export type CursorPacket = {
  v: 1;
  t: number;
  hit: { pos: Vec3; bId?: string } | null;
};

export function parseParticipantMetadata(raw: string | undefined): ParticipantMetadata | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.worldId === 'string' &&
      (parsed.role === 'host' || parsed.role === 'participant')
    ) {
      return parsed as ParticipantMetadata;
    }
  } catch {
    // fall through
  }
  return null;
}
