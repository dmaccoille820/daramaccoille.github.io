import { NextRequest, NextResponse } from 'next/server';
import { generateBilingualJeopardy } from '@/lib/gemini';
import { saveGameToDb, isDbConfigured } from '@/lib/db/neon';
import { SourceFile } from '@/types/jeopardy';
import pdfParse from 'pdf-parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow sufficient time for Gemini generation

export async function POST(req: NextRequest) {
  try {
    let irishText = '';
    let englishText = '';
    let gameTitle = 'Bilingual Jeopardy / Jeopardy Dátheangach';
    let gameDescription = '';
    let roundsCount = 3;
    let customInstructions = '';
    let apiKey = '';
    let autoSave = true;
    let forceCurriculumEngine = false;
    const sourceFiles: SourceFile[] = [];

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      gameTitle = (formData.get('gameTitle') as string)?.trim() || gameTitle;
      gameDescription = (formData.get('gameDescription') as string)?.trim() || '';
      roundsCount = parseInt((formData.get('roundsCount') as string) || '3', 10);
      customInstructions = (formData.get('customInstructions') as string)?.trim() || '';
      apiKey = (formData.get('apiKey') as string) || '';
      autoSave = formData.get('autoSave') !== 'false';
      forceCurriculumEngine = formData.get('forceCurriculumEngine') === 'true';

      // Parse Irish File
      const irishFile = formData.get('irishFile') as File | null;
      if (irishFile && typeof irishFile === 'object' && typeof irishFile.arrayBuffer === 'function' && irishFile.size > 0) {
        const buffer = Buffer.from(await irishFile.arrayBuffer());
        const isPdf = irishFile.type?.includes('pdf') || irishFile.name?.toLowerCase().endsWith('.pdf');
        if (isPdf) {
          try {
            const data = await pdfParse(buffer);
            irishText = (data.text || '').trim();
          } catch (e) {
            console.warn('PDF parsing error for Irish file, treating as text:', e);
            irishText = buffer.toString('utf-8').trim();
          }
        } else {
          irishText = buffer.toString('utf-8').trim();
        }

        sourceFiles.push({
          name: irishFile.name || 'Bileog_Firici_Gaeilge.pdf',
          size: irishFile.size,
          type: irishFile.type || 'application/pdf',
          language: 'ga',
          characterCount: irishText.length,
          snippet: irishText.slice(0, 200),
          uploadedAt: new Date().toISOString()
        });
      }

      // Parse English File
      const englishFile = formData.get('englishFile') as File | null;
      if (englishFile && typeof englishFile === 'object' && typeof englishFile.arrayBuffer === 'function' && englishFile.size > 0) {
        const buffer = Buffer.from(await englishFile.arrayBuffer());
        const isPdf = englishFile.type?.includes('pdf') || englishFile.name?.toLowerCase().endsWith('.pdf');
        if (isPdf) {
          try {
            const data = await pdfParse(buffer);
            englishText = (data.text || '').trim();
          } catch (e) {
            console.warn('PDF parsing error for English file, treating as text:', e);
            englishText = buffer.toString('utf-8').trim();
          }
        } else {
          englishText = buffer.toString('utf-8').trim();
        }

        sourceFiles.push({
          name: englishFile.name || 'English_Factfile.pdf',
          size: englishFile.size,
          type: englishFile.type || 'application/pdf',
          language: 'en',
          characterCount: englishText.length,
          snippet: englishText.slice(0, 200),
          uploadedAt: new Date().toISOString()
        });
      }

      // Check text overrides if files were empty or if pasted text was provided
      if (!irishText && formData.get('irishText')) {
        const rawIrishText = (formData.get('irishText') as string).trim();
        if (rawIrishText) {
          irishText = rawIrishText;
          sourceFiles.push({
            name: 'Téacs Gaeilge (Pasted Text)',
            size: Buffer.byteLength(rawIrishText, 'utf-8'),
            type: 'text/plain',
            language: 'ga',
            characterCount: rawIrishText.length,
            snippet: rawIrishText.slice(0, 200),
            uploadedAt: new Date().toISOString()
          });
        }
      }
      if (!englishText && formData.get('englishText')) {
        const rawEnglishText = (formData.get('englishText') as string).trim();
        if (rawEnglishText) {
          englishText = rawEnglishText;
          sourceFiles.push({
            name: 'English Text (Pasted Text)',
            size: Buffer.byteLength(rawEnglishText, 'utf-8'),
            type: 'text/plain',
            language: 'en',
            characterCount: rawEnglishText.length,
            snippet: rawEnglishText.slice(0, 200),
            uploadedAt: new Date().toISOString()
          });
        }
      }

      // If no files or text were attached, record manual curriculum instructions as source
      if (sourceFiles.length === 0 && customInstructions) {
        sourceFiles.push({
          name: 'Treoracha Lámhleabhair / Manual Instructions',
          size: Buffer.byteLength(customInstructions, 'utf-8'),
          type: 'text/plain',
          language: 'bilingual',
          characterCount: customInstructions.length,
          snippet: customInstructions.slice(0, 200),
          uploadedAt: new Date().toISOString()
        });
      }
    } else {
      const body = await req.json();
      irishText = body.irishText || '';
      englishText = body.englishText || '';
      gameTitle = body.gameTitle?.trim() || gameTitle;
      gameDescription = body.gameDescription?.trim() || '';
      roundsCount = body.roundsCount || 3;
      customInstructions = body.customInstructions?.trim() || '';
      apiKey = body.apiKey || '';
      autoSave = body.autoSave !== false;
      forceCurriculumEngine = !!body.forceCurriculumEngine;

      if (body.sourceFiles && Array.isArray(body.sourceFiles)) {
        sourceFiles.push(...body.sourceFiles);
      } else {
        if (irishText) {
          sourceFiles.push({
            name: 'Téacs Gaeilge (Input Text)',
            size: Buffer.byteLength(irishText, 'utf-8'),
            type: 'text/plain',
            language: 'ga',
            characterCount: irishText.length,
            snippet: irishText.slice(0, 200),
            uploadedAt: new Date().toISOString()
          });
        }
        if (englishText) {
          sourceFiles.push({
            name: 'English Input Text',
            size: Buffer.byteLength(englishText, 'utf-8'),
            type: 'text/plain',
            language: 'en',
            characterCount: englishText.length,
            snippet: englishText.slice(0, 200),
            uploadedAt: new Date().toISOString()
          });
        }
        if (sourceFiles.length === 0 && customInstructions) {
          sourceFiles.push({
            name: 'Treoracha Lámhleabhair / Manual Instructions',
            size: Buffer.byteLength(customInstructions, 'utf-8'),
            type: 'text/plain',
            language: 'bilingual',
            characterCount: customInstructions.length,
            snippet: customInstructions.slice(0, 200),
            uploadedAt: new Date().toISOString()
          });
        }
      }
    }

    // Generate bilingual jeopardy game using Gemini (or force curriculum engine)
    const game = await generateBilingualJeopardy({
      irishText,
      englishText,
      gameTitle,
      gameDescription,
      sourceFiles,
      roundsCount,
      apiKey: forceCurriculumEngine ? 'SKIP_GEMINI' : apiKey,
      customInstructions,
      allowFallback: forceCurriculumEngine
    });

    game.sourceFiles = sourceFiles;

    let savedToDb = false;
    let savedGameId = game.id;

    // Only save real AI-generated games — never save fallback/template games
    if (autoSave && isDbConfigured() && !game.fallbackUsed) {
      const saveResult = await saveGameToDb(game);
      if (saveResult.success) {
        savedToDb = true;
        savedGameId = saveResult.gameId || game.id;
      } else {
        console.warn('[Route] DB save failed:', saveResult.error);
      }
    } else if (game.fallbackUsed) {
      console.log('[Route] Curriculum Engine fallback used — skipping DB save (not teacher content).');
    }

    return NextResponse.json({
      success: true,
      game: {
        ...game,
        id: savedGameId,
        sourceFiles
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
