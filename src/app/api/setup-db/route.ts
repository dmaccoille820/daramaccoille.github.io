import { NextResponse } from 'next/server';
import { initDb, isDbConfigured } from '@/lib/db/neon';

export const dynamic = 'force-dynamic';

export async function POST() {
  if (!isDbConfigured()) {
    return NextResponse.json({
      success: false,
      configured: false,
      message: 'DATABASE_URL is not set in environment. App is running in zero-config offline/demo mode.'
    });
  }

  try {
    const result = await initDb();
    return NextResponse.json({
      success: result.success,
      configured: true,
      message: result.message
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      configured: true,
      error: (err as Error).message
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    configured: isDbConfigured(),
    status: isDbConfigured() ? 'Neon DB is connected' : 'Local/Demo mode (DATABASE_URL not set)'
  });
}
