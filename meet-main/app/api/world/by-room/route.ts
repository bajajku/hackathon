import { NextRequest, NextResponse } from 'next/server';
import { getWorldByRoom } from '@/lib/worldStore';

export async function GET(request: NextRequest) {
  const roomNameParam = request.nextUrl.searchParams.get('roomName');
  const roomName = typeof roomNameParam === 'string' ? roomNameParam.trim() : '';
  if (!roomName) {
    return new NextResponse('Missing required query parameter: roomName', { status: 400 });
  }

  const world = getWorldByRoom(roomName);
  if (!world) {
    return new NextResponse('Room not found', { status: 404 });
  }

  return NextResponse.json({
    worldId: world.id,
    roomName: world.roomName,
    hostIdentity: world.hostIdentity,
    s3Key: world.s3Key,
  });
}
