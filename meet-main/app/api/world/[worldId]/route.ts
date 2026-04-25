import { NextRequest, NextResponse } from 'next/server';
import { getWorldById } from '@/lib/worldStore';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ worldId: string }> }) {
  const { worldId } = await ctx.params;
  const world = getWorldById(worldId);
  if (!world) {
    return new NextResponse('World not found', { status: 404 });
  }
  return NextResponse.json({
    worldId: world.id,
    roomName: world.roomName,
    hostIdentity: world.hostIdentity,
    s3Key: world.s3Key,
  });
}
