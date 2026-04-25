import { randomString } from '@/lib/client-utils';
import { getLiveKitURL } from '@/lib/getLiveKitURL';
import { ConnectionDetails, ParticipantRole } from '@/lib/types';
import { mintParticipantToken } from '@/lib/livekitToken';
import { getWorldById, getWorldByRoom } from '@/lib/worldStore';
import { validateWorldForConnection } from '@/lib/connectionDetailsValidation';
import { NextRequest, NextResponse } from 'next/server';

const LIVEKIT_URL = process.env.LIVEKIT_URL;

const COOKIE_KEY = 'random-participant-postfix';

export async function GET(request: NextRequest) {
  try {
    const roomNameRaw = request.nextUrl.searchParams.get('roomName');
    const roomName = typeof roomNameRaw === 'string' ? roomNameRaw.trim() : roomNameRaw;
    const participantName = request.nextUrl.searchParams.get('participantName');
    const region = request.nextUrl.searchParams.get('region');
    const worldIdParam = request.nextUrl.searchParams.get('worldId');

    if (!LIVEKIT_URL) {
      throw new Error('LIVEKIT_URL is not defined');
    }
    const livekitServerUrl = region ? getLiveKitURL(LIVEKIT_URL, region) : LIVEKIT_URL;
    if (livekitServerUrl === undefined) {
      throw new Error('Invalid region');
    }

    if (typeof roomName !== 'string' || roomName.length === 0) {
      return new NextResponse('Missing required query parameter: roomName', { status: 400 });
    }
    if (participantName === null) {
      return new NextResponse('Missing required query parameter: participantName', { status: 400 });
    }

    let randomParticipantPostfix = request.cookies.get(COOKIE_KEY)?.value;
    if (!randomParticipantPostfix) {
      randomParticipantPostfix = randomString(4);
    }
    const participantIdentity = `${participantName}__${randomParticipantPostfix}`;

    const worldByRoom = getWorldByRoom(roomName);
    const worldById = worldIdParam ? getWorldById(worldIdParam) : null;
    const validation = validateWorldForConnection({
      roomName,
      worldIdParam,
      worldByRoom,
      worldById,
    });
    if (!validation.ok) {
      return new NextResponse(validation.message, { status: validation.status });
    }

    const worldId = validation.world.id;
    const canonicalRoomName = validation.world.roomName;
    const role: ParticipantRole =
      participantIdentity === validation.world.hostIdentity ? 'host' : 'participant';

    const participantToken = await mintParticipantToken({
      identity: participantIdentity,
      name: participantName,
      roomName: canonicalRoomName,
      metadata: { worldId, role },
    });

    const data: ConnectionDetails = {
      serverUrl: livekitServerUrl,
      roomName: canonicalRoomName,
      participantToken,
      participantName,
      worldId,
      role,
    };
    const response = NextResponse.json(data);
    response.cookies.set(COOKIE_KEY, randomParticipantPostfix, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' || request.nextUrl.protocol === 'https:',
      expires: getCookieExpirationTime(),
    });
    return response;
  } catch (error) {
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 500 });
    }
  }
}

function getCookieExpirationTime(): Date {
  const now = new Date();
  const expireTime = now.getTime() + 60 * 120 * 1000;
  now.setTime(expireTime);
  return now;
}
