import { NextRequest, NextResponse } from 'next/server';
import { getGameByIdFromDb } from '@/lib/db/neon';
import { sampleBilingualGame } from '@/lib/sample-data';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const game = await getGameByIdFromDb(id);

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({ game });
  } catch (error) {
    return NextResponse.json({
      game: sampleBilingualGame,
      error: (error as Error).message
    });
  }
}
