import { NextRequest, NextResponse } from 'next/server';
import { getGamesFromDb, saveGameToDb, isDbConfigured } from '@/lib/db/neon';
import { sampleBilingualGame } from '@/lib/sample-data';
import { JeopardyGame } from '@/types/jeopardy';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const games = await getGamesFromDb();
    return NextResponse.json({
      configured: isDbConfigured(),
      games
    });
  } catch (err) {
    return NextResponse.json({
      configured: false,
      games: [sampleBilingualGame],
      error: (err as Error).message
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const game = (await req.json()) as JeopardyGame;
    if (!game || !game.title || !game.rounds) {
      return NextResponse.json({ error: 'Invalid game payload' }, { status: 400 });
    }

    if (isDbConfigured()) {
      const result = await saveGameToDb(game);
      if (result.success) {
        return NextResponse.json({
          success: true,
          savedToDb: true,
          gameId: result.gameId,
          game
        });
      }
    }

    // In local mode or if DB save fails
    return NextResponse.json({
      success: true,
      savedToDb: false,
      message: 'Game stored in local session (Neon DB not connected)',
      game
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
