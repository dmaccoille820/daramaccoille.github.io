import { NextRequest, NextResponse } from 'next/server';
import { generateBilingualJeopardy } from '@/lib/gemini';
import { saveGameToDb, isDbConfigured } from '@/lib/db/neon';
import pdfParse from 'pdf-parse';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow sufficient time for Gemini generation

export async function POST(req: NextRequest) {
  try {
    let irishText = '';
    let englishText = '';
    let gameTitle = 'Digital Technology / Teicneolaíocht Dhigiteach';
    let roundsCount = 2;
    let customInstructions = '';
    let apiKey = '';
    let autoSave = true;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      gameTitle = (formData.get('gameTitle') as string) || gameTitle;
      roundsCount = parseInt((formData.get('roundsCount') as string) || '2', 10);
      customInstructions = (formData.get('customInstructions') as string) || '';
      apiKey = (formData.get('apiKey') as string) || '';
      autoSave = formData.get('autoSave') !== 'false';

      // Parse Irish File
      const irishFile = formData.get('irishFile') as File | null;
      if (irishFile) {
        const buffer = Buffer.from(await irishFile.arrayBuffer());
        if (irishFile.type.includes('pdf') || irishFile.name.endsWith('.pdf')) {
          try {
            const data = await pdfParse(buffer);
            irishText = data.text;
          } catch (e) {
            console.warn('PDF parsing error for Irish file, treating as text:', e);
            irishText = buffer.toString('utf-8');
          }
        } else {
          irishText = buffer.toString('utf-8');
        }
      }

      // Parse English File
      const englishFile = formData.get('englishFile') as File | null;
      if (englishFile) {
        const buffer = Buffer.from(await englishFile.arrayBuffer());
        if (englishFile.type.includes('pdf') || englishFile.name.endsWith('.pdf')) {
          try {
            const data = await pdfParse(buffer);
            englishText = data.text;
          } catch (e) {
            console.warn('PDF parsing error for English file, treating as text:', e);
            englishText = buffer.toString('utf-8');
          }
        } else {
          englishText = buffer.toString('utf-8');
        }
      }

      // Check text overrides if files were empty
      if (!irishText && formData.get('irishText')) {
        irishText = formData.get('irishText') as string;
      }
      if (!englishText && formData.get('englishText')) {
        englishText = formData.get('englishText') as string;
      }
    } else {
      const body = await req.json();
      irishText = body.irishText || '';
      englishText = body.englishText || '';
      gameTitle = body.gameTitle || gameTitle;
      roundsCount = body.roundsCount || 2;
      customInstructions = body.customInstructions || '';
      apiKey = body.apiKey || '';
      autoSave = body.autoSave !== false;
    }

    // Generate bilingual jeopardy game using Gemini
    const game = await generateBilingualJeopardy({
      irishText,
      englishText,
      gameTitle,
      roundsCount,
      apiKey,
      customInstructions
    });

    let savedToDb = false;
    let savedGameId = game.id;

    if (autoSave && isDbConfigured()) {
      const saveResult = await saveGameToDb(game);
      if (saveResult.success) {
        savedToDb = true;
        savedGameId = saveResult.gameId || game.id;
      }
    }

    return NextResponse.json({
      success: true,
      game: {
        ...game,
        id: savedGameId
      },
      savedToDb,
      isDbConfigured: isDbConfigured()
    });
  } catch (err) {
    console.error('Error generating jeopardy game:', err);
    return NextResponse.json({
      success: false,
      error: (err as Error).message
    }, { status: 500 });
  }
}
