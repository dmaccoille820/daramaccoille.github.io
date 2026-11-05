import { NextRequest, NextResponse } from 'next/server';
import { getGameByIdFromDb, deleteGameFromDb } from '@/lib/db/neon';

export const dynamic = 'force-dynamic';

// GET /api/games/[id] — load a single complete game with all rounds/categories/questions
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const game = await getGameByIdFromDb(params.id);
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    return NextResponse.json({ game });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/games/[id] — permanently delete a game (cascades via FK)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await deleteGameFromDb(params.id);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
