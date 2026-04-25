import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createWorld, normalizeRoomName } from '@/lib/worldStore';
import { mintParticipantToken } from '@/lib/livekitToken';
import { getLiveKitURL } from '@/lib/getLiveKitURL';

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const COOKIE_KEY = 'random-participant-postfix';

export async function POST(request: NextRequest) {
  try {
    if (!LIVEKIT_URL) {
      return new NextResponse('LIVEKIT_URL is not defined', { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const hostName = typeof body.hostName === 'string' && body.hostName.trim() ? body.hostName.trim() : null;
    if (!hostName) {
      return new NextResponse('Missing required field: hostName', { status: 400 });
    }
    const region = typeof body.region === 'string' ? body.region : undefined;
    const serverUrl = region ? getLiveKitURL(LIVEKIT_URL, region) : LIVEKIT_URL;
    if (!serverUrl) {
      return new NextResponse('Invalid region', { status: 400 });
    }

    const worldId = nanoid(12);
    const requestedRoomName =
      typeof body.roomName === 'string' && body.roomName.trim()
        ? body.roomName.trim()
        : `${nanoid(4)}-${nanoid(4)}`;
    const roomName = normalizeRoomName(requestedRoomName);
    const hostPostfix = nanoid(4);
    const hostIdentity = `${hostName}__${hostPostfix}`;

    const world = createWorld({ id: worldId, roomName, hostIdentity });

    const hostToken = await mintParticipantToken({
      identity: hostIdentity,
      name: hostName,
      roomName: world.roomName,
      metadata: { worldId, role: 'host' },
    });

    const response = NextResponse.json({
      worldId,
      roomName: world.roomName,
      hostIdentity,
      hostToken,
      serverUrl,
    });
    response.cookies.set(COOKIE_KEY, hostPostfix, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' || request.nextUrl.protocol === 'https:',
      expires: getCookieExpirationTime(),
    });
    return response;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'unknown error';
    return new NextResponse(msg, { status: 500 });
  }
}

function getCookieExpirationTime(): Date {
  const now = new Date();
  const expireTime = now.getTime() + 60 * 120 * 1000;
  now.setTime(expireTime);
  return now;
}
