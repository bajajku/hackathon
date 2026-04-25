import { AccessToken, VideoGrant } from 'livekit-server-sdk';
import type { ParticipantMetadata } from './dataChannelTypes';

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

export function mintParticipantToken(args: {
  identity: string;
  name: string;
  roomName: string;
  metadata?: ParticipantMetadata;
}): Promise<string> {
  const at = new AccessToken(API_KEY, API_SECRET, {
    identity: args.identity,
    name: args.name,
    metadata: args.metadata ? JSON.stringify(args.metadata) : undefined,
  });
  at.ttl = '5m';
  const grant: VideoGrant = {
    room: args.roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);
  return at.toJwt();
}
