import { NextRequest, NextResponse } from 'next/server';
import { getGeminiApiKey } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const apiKey = getGeminiApiKey(body.apiKey);

    if (!apiKey) {
      return NextResponse.json({
        ok: false,
        error: 'No Gemini API key provided or found in environment variables.'
      });
    }

    // Query Google AI Studio ModelService directly
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        status: res.status,
        error: data.error?.message || `Google API returned status ${res.status}`,
        details: data.error
      });
    }

    const models = (data.models || [])
      .filter((m: { supportedGenerationMethods?: string[] }) =>
        m.supportedGenerationMethods?.includes('generateContent')
      )
      .map((m: { name: string; displayName?: string }) => ({
        name: m.name.replace(/^models\//, ''),
        displayName: m.displayName
      }));

    return NextResponse.json({
      ok: true,
      count: models.length,
      models,
      rawCount: (data.models || []).length
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: (err as Error).message
    }, { status: 500 });
  }
}
