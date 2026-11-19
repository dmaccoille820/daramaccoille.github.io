import { GoogleGenerativeAI } from '@google/generative-ai';
import { JeopardyGame, Round, Category, Question, SourceFile } from '@/types/jeopardy';

interface GenerateOptions {
  irishText: string;
  englishText: string;
  gameTitle?: string;
  gameDescription?: string;
  sourceFiles?: SourceFile[];
  roundsCount?: number;
  apiKey?: string;
  customInstructions?: string;
  allowFallback?: boolean;
  onProgress?: (stage: string) => void;
}

export function inferSubject(title = '', instructions = '', text = ''): string {
  const combined = `${title} ${instructions} ${text}`.toLowerCase();
  if (
    combined.includes('eolaíocht') ||
    combined.includes('science') ||
    combined.includes('biology') ||
    combined.includes('bitheolaíocht') ||
    combined.includes('ceimic') ||
    combined.includes('chemistry') ||
    combined.includes('fisic') ||
    combined.includes('physics')
  ) {
    return 'Science / Eolaíocht';
  }
  if (combined.includes('stair') || combined.includes('history')) {
    return 'History / Stair';
  }
  if (combined.includes('tíreolaíocht') || combined.includes('geography')) {
    return 'Geography / Tíreolaíocht';
  }
  if (combined.includes('mata') || combined.includes('math')) {
    return 'Mathematics / Matamaitic';
  }
  if (combined.includes('gnó') || combined.includes('business') || combined.includes('eacnamaíocht') || combined.includes('economics')) {
    return 'Business / Staidéar Gnó';
  }
  if (combined.includes('gaeilge') || combined.includes('irish language') || combined.includes('litríocht')) {
    return 'Gaeilge';
  }
  if (
    combined.includes('teicneolaíocht') ||
    combined.includes('technology') ||
    combined.includes('computer') ||
    combined.includes('digital') ||
    combined.includes('ríomhaireacht') ||
    combined.includes('coding') ||
    combined.includes('programming')
  ) {
    return 'Digital Technology';
  }
  return 'General Curriculum / Curaclam Ginearálta';
}

export function getGeminiApiKey(customKey?: string): string {
  if (customKey === 'SKIP_GEMINI') return '';
  const key =
    customKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GEMINI_API ||
    '';
  return key.trim();
}

// Sleep helper for backoff
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Detect transient errors eligible for retry with backoff (503, 504, 429, overload, network)
function isRetryableGeminiError(errorMsg: string): boolean {
  const lower = errorMsg.toLowerCase();
  return (
    lower.includes('503') ||
    lower.includes('504') ||
    lower.includes('429') ||
    lower.includes('overloaded') ||
    lower.includes('resource has been exhausted') ||
    lower.includes('temporarily unavailable') ||
    lower.includes('service unavailable') ||
    lower.includes('gateway timeout') ||
    lower.includes('deadline exceeded') ||
    lower.includes('fetch failed') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout')
  );
}

// Dynamically discover supported models directly from Google AI API
async function discoverSupportedModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const models = data.models || [];
      const supported = models
        .filter((m: { supportedGenerationMethods?: string[] }) =>
          m.supportedGenerationMethods?.includes('generateContent')
        )
        .map((m: { name: string }) => m.name.replace(/^models\//, ''));

      if (supported.length > 0) {
        console.log('Google AI Studio returned available models:', supported);
        // Sort to prioritize fast flash models
        return supported.sort((a: string, b: string) => {
          if (a.includes('flash') && !b.includes('flash')) return -1;
          if (!a.includes('flash') && b.includes('flash')) return 1;
          return 0;
        });
      }
    }
  } catch (err) {
    console.warn('Could not query dynamic ModelService:', err);
  }

  // Fallback candidate list if discovery endpoint is blocked
  return [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro'
  ];
}

export async function generateBilingualJeopardy(options: GenerateOptions): Promise<JeopardyGame> {
  const apiKey = getGeminiApiKey(options.apiKey);
  const roundsCount = Math.min(Math.max(options.roundsCount || 3, 1), 3);
  const userTitle = options.gameTitle?.trim() || '';
  const userDescription = options.gameDescription?.trim() || '';
  const customInstructions = options.customInstructions?.trim() || '';
  const irishText = options.irishText?.trim() || '';
  const englishText = options.englishText?.trim() || '';
  const hasFactfiles = irishText.length > 0 || englishText.length > 0;

  const titlePrompt = userTitle || 'Bilingual Jeopardy / Jeopardy Dátheangach';
  const detectedSubject = inferSubject(userTitle, customInstructions, `${irishText} ${englishText}`);

  if (!apiKey) {
    console.warn('Gemini API key not found. Using intelligent curriculum template generator.');
    return generateSmartTemplateGame(
      titlePrompt,
      userDescription,
      detectedSubject,
      roundsCount,
      customInstructions,
      options.irishText,
      options.englishText,
      options.sourceFiles || []
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // ── Build a focused single-round prompt ──────────────────────────────────
  const buildRoundPrompt = (roundIndex: number) => {
    const roundNum = roundIndex + 1;
    const pointRows = [
      '100, 200, 300, 400, 500',
      '200, 400, 600, 800, 1000',
      '300, 600, 900, 1200, 1500',
    ];
    const roundLabel = ['Jeopardy Round', 'Double Jeopardy Round', 'Final Jeopardy Round'][roundIndex];
    const roundLabelGa = ['Babhta 1: Jeopardy', 'Babhta 2: Jeopardy Dúbailte', 'Babhta 3: Jeopardy Deiridh'][roundIndex];
    const roundFocus = [
      'Focus strictly on FOUNDATIONAL CONCEPTS, DEFINITIONS, CORE VOCABULARY, and PRIMARY STRUCTURES from the content.',
      'Focus strictly on PROCESSES, MECHANISMS, SYSTEMS, COMPARISONS, and FUNCTIONAL RELATIONSHIPS from the content.',
      'Focus strictly on ADVANCED APPLICATIONS, CASE STUDIES, SYNTHESIS, PROBLEM-SOLVING, and IMPACT/SIGNIFICANCE from the content.',
    ][roundIndex];

    return `You are a bilingual Irish-English Master Educator for the Irish secondary curriculum (Junior Cycle & Leaving Certificate).

TASK: Generate ROUND ${roundNum} ONLY of a ${roundsCount}-round bilingual Jeopardy game.
ROUND PEDAGOGICAL FOCUS: ${roundFocus}

GAME CONTEXT:
- Title / Ábhar: "${titlePrompt}"
${userDescription ? `- Description / Cur Síos: "${userDescription}"` : ''}
${customInstructions ? `- Teacher's Custom Instructions (Treoracha Breise): "${customInstructions}"` : ''}
${options.sourceFiles && options.sourceFiles.length > 0 ? `- Attached Source Files: ${options.sourceFiles.map((f) => `${f.name} (${f.language.toUpperCase()})`).join(', ')}` : ''}

${hasFactfiles ? `CURRICULUM FACTFILES (extract ALL 4 categories and 20 questions from this content ONLY):
${englishText ? `--- ENGLISH FACTFILE ---\n${englishText.slice(0, 10000)}\n` : ''}
${irishText ? `--- GAEILGE (IRISH) FACTFILE ---\n${irishText.slice(0, 10000)}\n` : ''}
CRITICAL MANDATE:
1. Every category title and every clue MUST be drawn directly from the factfile content above.
2. Do NOT use generic Computer Science / Digital Technology categories unless the uploaded factfile is specifically about computers!
` : `NO FACTFILES ATTACHED (MANUAL TOPIC CREATION):
Use the Title "${titlePrompt}", Subject "${detectedSubject}", and Teacher Instructions above as your syllabus brief.
Generate high-quality, topic-specific questions strictly aligned to "${titlePrompt}". Do NOT default to Digital Technology!
`}

ROUND ${roundNum} RULES:
- Round name (English): "${roundLabel}"
- Round name (Irish): "${roundLabelGa}"
- Create exactly 4 categories, each with exactly 5 questions
- Point values: ${pointRows[roundIndex]}
- Categories must be distinct thematic groupings from the factfile/topic
- Keep clues concise (max 15 words) and answers in Jeopardy format ("What is ...?", "Cad é ...?")

REQUIRED JSON FORMAT (output ONLY valid JSON, no markdown):
{
  "roundNumber": ${roundNum},
  "name_en": "${roundLabel}",
  "name_ga": "${roundLabelGa}",
  "categories": [
    {
      "name_en": "Category Name in English",
      "name_ga": "Ainm an Chatagóir i nGaeilge",
      "questions": [
        {
          "points": ${roundNum === 1 ? 100 : roundNum === 2 ? 200 : 300},
          "clue_en": "English clue statement",
          "clue_ga": "Ráiteas leide i nGaeilge",
          "answer_en": "What is ...?",
          "answer_ga": "Cad é ...?",
          "explanation_en": "One sentence context",
          "explanation_ga": "Comhthéacs aon abairt"
        }
      ]
    }
  ]
}`;
  };

  // ── Normalizer for a single parsed round object ───────────────────────────
  const normalizeRound = (raw: Record<string, unknown>, rIdx: number) => {
    const pointsByRound = [
      [100, 200, 300, 400, 500],
      [200, 400, 600, 800, 1000],
      [300, 600, 900, 1200, 1500],
    ];
    const roundNum = typeof raw.roundNumber === 'number' ? raw.roundNumber :
                     typeof raw.round_number === 'number' ? raw.round_number : rIdx + 1;
    const roundNameEn = (raw.name_en ?? raw.round_name_en ?? raw.name ?? `Round ${roundNum}`) as string;
    const roundNameGa = (raw.name_ga ?? raw.round_name_ga ?? raw.name_irish ?? `Babhta ${roundNum}`) as string;
    const rawCats: Record<string, unknown>[] = Array.isArray(raw.categories) ? raw.categories as Record<string, unknown>[] : [];
    const pts = pointsByRound[rIdx] || pointsByRound[0];

    const categories = rawCats.map((c: Record<string, unknown>, cIdx: number) => {
      const nameEn = (c.name_en ?? c.name ?? c.category_name ?? c.category ?? c.title ?? `Category ${cIdx + 1}`) as string;
      const nameGa = (c.name_ga ?? c.name_irish ?? c.category_ga ?? c.name_gle ?? c.gaeilge ?? c.irish ?? nameEn ?? `Catagóir ${cIdx + 1}`) as string;
      const rawQs: Record<string, unknown>[] = Array.isArray(c.questions) ? c.questions as Record<string, unknown>[] : [];

      const questions = rawQs.map((q: Record<string, unknown>, qIdx: number) => {
        const ptVal = typeof q.points === 'number' ? q.points : pts[qIdx] ?? (qIdx + 1) * (rIdx + 1) * 100;
        return {
          id: `q-${roundNum}-${cIdx + 1}-${qIdx + 1}`,
          points: ptVal,
          clue_en: ((q.clue_en ?? q.clue ?? q.question_en ?? q.question ?? 'Clue unavailable') as string).slice(0, 500),
          clue_ga: ((q.clue_ga ?? q.clue_irish ?? q.question_ga ?? q.clue_en ?? q.clue ?? 'Leide gan fáil') as string).slice(0, 500),
          answer_en: ((q.answer_en ?? q.answer ?? q.answer_english ?? 'What is the answer?') as string).slice(0, 500),
          answer_ga: ((q.answer_ga ?? q.answer_irish ?? q.answer_gle ?? q.answer_en ?? q.answer ?? 'Cad é an freagra?') as string).slice(0, 500),
          explanation_en: ((q.explanation_en ?? q.explanation ?? q.context_en ?? '') as string).slice(0, 500) || undefined,
          explanation_ga: ((q.explanation_ga ?? q.explanation_irish ?? q.context_ga ?? '') as string).slice(0, 500) || undefined,
          isDailyDouble: qIdx === 3 && cIdx === 2,
        };
      });

      return {
        id: `cat-${roundNum}-${cIdx + 1}`,
        name_en: nameEn.slice(0, 255),
        name_ga: nameGa.slice(0, 255),
        questions,
      };
    });

    return {
      id: `round-${roundNum}`,
      roundNumber: roundNum,
      name_en: roundNameEn.slice(0, 100),
      name_ga: roundNameGa.slice(0, 100),
      categories,
    };
  };

  // ── Attempt a single round with model fallback + retries ─────────────────
  const PRIMARY_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro'];
  const PER_CALL_TIMEOUT_MS = 24000; // 24s per round call (runs concurrently so total time is ~12-20s)
  const MAX_RETRIES = 1;

  const generateOneRound = async (roundIndex: number): Promise<ReturnType<typeof normalizeRound>> => {
    const prompt = buildRoundPrompt(roundIndex);
    let lastErr: Error | null = null;

    for (const modelName of PRIMARY_MODELS) {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`[Gemini] Round ${roundIndex + 1} — ${modelName} attempt ${attempt + 1}`);
          options.onProgress?.(`Round ${roundIndex + 1}: contacting Gemini (${modelName})...`);

          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              temperature: 0.25,
              responseMimeType: 'application/json',
              maxOutputTokens: 4096,
            },
          });

          const result = await Promise.race([
            model.generateContent(prompt),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Round timed out after 24s')), PER_CALL_TIMEOUT_MS)
            ),
          ]);

          const text = result.response.text().trim();
          const cleanJson = text.startsWith('```')
            ? text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
            : text;

          const parsed = JSON.parse(cleanJson) as Record<string, unknown>;
          const normalized = normalizeRound(parsed, roundIndex);
          console.log(`[Gemini] Round ${roundIndex + 1} OK — ${normalized.categories.length} categories`);
          return normalized;
        } catch (err) {
          lastErr = err as Error;
          const msg = lastErr.message || '';
          console.warn(`[Gemini] Round ${roundIndex + 1} ${modelName} attempt ${attempt + 1} failed:`, msg);

          if (msg.includes('API_KEY_SERVICE_BLOCKED')) {
            throw new Error('Google Generative Language API is blocked on this key (API_KEY_SERVICE_BLOCKED).');
          }
          if (msg.includes('404') || msg.includes('not found') || msg.includes('not supported')) {
            break; // Try next model
          }
          if (isRetryableGeminiError(msg) && attempt < MAX_RETRIES) {
            const backoffMs = 1200 + Math.random() * 800;
            await sleep(backoffMs);
            continue;
          }
          break;
        }
      }
    }
    throw lastErr || new Error(`All models failed for round ${roundIndex + 1}`);
  };

  // ── Main generation: parallel round requests (each call is focused on 1 round) ──
  try {
    options.onProgress?.(`Generating ${roundsCount} rounds in parallel with Gemini...`);
    const rounds = await Promise.all(
      Array.from({ length: roundsCount }, (_, i) => generateOneRound(i))
    );

    const finalTitle = userTitle || titlePrompt;
    const finalDescription = userDescription || 'Bilingual game generated from Irish & English curriculum content';

    return {
      id: 'game-' + Date.now(),
      title: finalTitle,
      subject: detectedSubject,
      description: finalDescription,
      sourceFiles: options.sourceFiles || [],
      fallbackUsed: false,
      generationSource: 'gemini',
      rounds,
    };
  } catch (err) {
    console.warn('[Gemini] Round-by-round generation failed:', (err as Error).message);

    if (options.allowFallback !== false) {
      console.warn('[Gemini] Falling back to Curriculum Engine template.');
      const fallbackGame = generateSmartTemplateGame(
        titlePrompt,
        userDescription,
        detectedSubject,
        roundsCount,
        customInstructions,
        options.irishText,
        options.englishText,
        options.sourceFiles || []
      );
      fallbackGame.fallbackUsed = true;
      fallbackGame.generationSource = 'curriculum-engine';
      return fallbackGame;
    }

    throw err;
  }
}

// Extract structured categories & questions dynamically from raw factfile text
function extractFactfileRounds(
  englishText: string,
  irishText: string,
  roundsCount: number,
  fallbackSubject: string
): Round[] {
  const combinedText = `${englishText}\n\n${irishText}`.trim();
  // Split into raw candidate paragraphs / sections
  const rawBlocks = combinedText
    .split(/(?:\r?\n\s*\r?\n|[0-9]+\.\s+|[A-Z]\.\s+|Section\s+[0-9]+[:.]?\s*)/i)
    .map((b) => b.trim())
    .filter((b) => b.length > 25);

  const pointsByRound = [
    [100, 200, 300, 400, 500],
    [200, 400, 600, 800, 1000],
    [300, 600, 900, 1200, 1500],
  ];

  const roundNamesEn = ['Jeopardy Round', 'Double Jeopardy Round', 'Final Jeopardy Round'];
  const roundNamesGa = ['Babhta 1: Jeopardy', 'Babhta 2: Jeopardy Dúbailte', 'Babhta 3: Jeopardy Deiridh'];

  const rounds: Round[] = [];

  for (let rIdx = 0; rIdx < roundsCount; rIdx++) {
    const roundNum = rIdx + 1;
    const pts = pointsByRound[rIdx] || pointsByRound[0];
    const categories: Category[] = [];

    for (let cIdx = 0; cIdx < 4; cIdx++) {
      const blockIdx = rIdx * 4 + cIdx;
      const block = rawBlocks[blockIdx % (rawBlocks.length || 1)] || '';

      // Derive category title from first line or phrase (max 50 chars)
      const firstLine = block.split(/[\r\n.:]/)[0]?.trim() || '';
      const catNameEn = (firstLine.length > 3 && firstLine.length < 50
        ? firstLine
        : `${fallbackSubject}: Topic ${cIdx + 1}`
      ).slice(0, 255);
      const catNameGa = `${catNameEn} (Gaeilge)`;

      // Split block into sentences for clues
      const sentences = block
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 15);

      const questions: Question[] = [];
      for (let qIdx = 0; qIdx < 5; qIdx++) {
        const sentence = sentences[qIdx % (sentences.length || 1)] || `Key curriculum concept relating to ${catNameEn}.`;
        const clueEn = sentence.slice(0, 300);
        const clueGa = `Coincheap curaclaim a bhaineann le ${catNameEn}: ${clueEn}`.slice(0, 300);

        // Derive answer from key words
        const words = sentence.split(/\s+/).filter((w) => w.length > 4);
        const keyWord = words[0] || catNameEn;

        questions.push({
          id: `q-${roundNum}-${cIdx + 1}-${qIdx + 1}`,
          points: pts[qIdx],
          clue_en: clueEn,
          clue_ga: clueGa,
          answer_en: `What is ${keyWord}?`,
          answer_ga: `Cad é ${keyWord}?`,
          explanation_en: `Curriculum factfile content for ${catNameEn}.`,
          explanation_ga: `Ábhar bileog fíricí don chatagóir ${catNameEn}.`,
          isDailyDouble: qIdx === 3 && cIdx === 2,
        });
      }

      categories.push({
        id: `cat-${roundNum}-${cIdx + 1}`,
        name_en: catNameEn,
        name_ga: catNameGa,
        questions,
      });
    }

    rounds.push({
      id: `round-${roundNum}`,
      roundNumber: roundNum,
      name_en: roundNamesEn[rIdx],
      name_ga: roundNamesGa[rIdx],
      categories,
    });
  }

  return rounds;
}

// Fallback generator when offline or no API key is specified yet
function generateSmartTemplateGame(
  title: string,
  description: string,
  subject: string,
  roundsCount: number,
  customInstructions: string,
  irishExcerpt: string,
  englishExcerpt: string,
  sourceFiles: SourceFile[] = []
): JeopardyGame {
  const hasContent = irishExcerpt.length > 25 || englishExcerpt.length > 25;
  const clampedRounds = Math.min(Math.max(roundsCount, 1), 3);
  const detectedSubject = subject || inferSubject(title, customInstructions, `${irishExcerpt} ${englishExcerpt}`);

  // If teacher provided factfile text, extract categories directly from that text!
  if (hasContent) {
    const extractedRounds = extractFactfileRounds(englishExcerpt, irishExcerpt, clampedRounds, detectedSubject);
    return {
      id: 'game-curriculum-' + Date.now(),
      title: title || `${detectedSubject} (Curriculum Factfile)`,
      subject: detectedSubject,
      description: description || 'Bilingual Jeopardy game generated from teacher factfile content',
      sourceFiles: sourceFiles,
      fallbackUsed: true,
      generationSource: 'curriculum-engine',
      rounds: extractedRounds,
    };
  }

  // Multi-subject curriculum templates when no factfile text is attached:
  const isScience = detectedSubject.includes('Science') || detectedSubject.includes('Eolaíocht') || detectedSubject.includes('Biology') || detectedSubject.includes('Bitheolaíocht');
  const isHistory = detectedSubject.includes('History') || detectedSubject.includes('Stair');
  const isGeography = detectedSubject.includes('Geography') || detectedSubject.includes('Tíreolaíocht');
  const isBusiness = detectedSubject.includes('Business') || detectedSubject.includes('Gnó');
  const isGaeilge = detectedSubject.includes('Gaeilge') || detectedSubject.includes('Irish');
  const isMaths = detectedSubject.includes('Math') || detectedSubject.includes('Mata');

  let roundTemplates: Round[];

  if (isScience) {
    roundTemplates = [
      {
        id: 'round-1',
        roundNumber: 1,
        name_en: 'Jeopardy Round',
        name_ga: 'Babhta 1: Jeopardy',
        categories: [
          {
            id: 'c-1-1',
            name_en: 'Cell Biology & Organelles',
            name_ga: 'Bitheolaíocht Cille & Orgánaigh',
            questions: [
              { id: 'q-1-1-1', points: 100, clue_en: 'The control center of the cell containing genetic material.', clue_ga: 'Lárionad rialaithe na cille ina bhfuil an t-ábhar géiniteach.', answer_en: 'What is the Nucleus?', answer_ga: 'Cad é an Núicléas?', explanation_en: 'Holds DNA in eukaryotic cells.', explanation_ga: 'Coinníonn sé DNA i gcealla eocarótacha.' },
              { id: 'q-1-1-2', points: 200, clue_en: 'The powerhouse of the cell where cellular respiration produces ATP.', clue_ga: 'Teach cumhachta na cille ina dtáirgtear ATP trí riospráid cheallach.', answer_en: 'What is the Mitochondrion?', answer_ga: 'Cad é an Miteacoindre?', explanation_en: 'Produces ATP through aerobic respiration.', explanation_ga: 'Táirgeann sé ATP trí riospráid aeróbach.' },
              { id: 'q-1-1-3', points: 300, clue_en: 'Plant organelle containing chlorophyll where photosynthesis occurs.', clue_ga: 'Orgánach planda ina bhfuil clóraifill agus ina dtarlaíonn fótaisintéis.', answer_en: 'What is the Chloroplast?', answer_ga: 'Cad é an Clóraplast?', explanation_en: 'Absorbs light energy.', explanation_ga: 'Ionsúnn sé fuinneamh solais.' },
              { id: 'q-1-1-4', points: 400, clue_en: 'Selectively permeable barrier surrounding all living cells.', clue_ga: 'Bac roghnach tréscaoilteach a thimpeallaíonn gach cill bheo.', answer_en: 'What is the Cell Membrane?', answer_ga: 'Cad é Scannán na Cille?', explanation_en: 'Composed of phospholipid bilayer.', explanation_ga: 'Comhdhéanta de dhéchiseal fosfailipide.' },
              { id: 'q-1-1-5', points: 500, clue_en: 'Cellular structure responsible for protein synthesis in the cytoplasm.', clue_ga: 'Struchtúr ceallach atá freagrach as sintéis próitéine sa chíteaplasma.', answer_en: 'What is the Ribosome?', answer_ga: 'Cad é an Ribeasóm?', explanation_en: 'Translates mRNA into polypeptide chains.', explanation_ga: 'Aistríonn sé mRNA go slabhraí polaipeiptíde.' },
            ],
          },
          {
            id: 'c-1-2',
            name_en: 'Photosynthesis & Respiration',
            name_ga: 'Fótaisintéis & Riospráid',
            questions: [
              { id: 'q-1-2-1', points: 100, clue_en: 'Gas absorbed by plants from the air to carry out photosynthesis.', clue_ga: 'Gás a ghlacann plandaí ón aer chun fótaisintéis a dhéanamh.', answer_en: 'What is Carbon Dioxide (CO2)?', answer_ga: 'Cad é Dé-ocsaíd Charbóin (CO2)?', explanation_en: 'Taken in through stomata.', explanation_ga: 'Tógtar isteach é trí stómaí.' },
              { id: 'q-1-2-2', points: 200, clue_en: 'Simple sugar produced during photosynthesis serving as energy storage.', clue_ga: 'Siúcra simplí a tháirgtear le linn fótaisintéise mar stóras fuinnimh.', answer_en: 'What is Glucose?', answer_ga: 'Cad é Glúcós?', explanation_en: 'Chemical formula C6H12O6.', explanation_ga: 'Foirmle cheimiceach C6H12O6.' },
              { id: 'q-1-2-3', points: 300, clue_en: 'The green pigment in plants that absorbs solar energy.', clue_ga: 'An lí ghlas i bplandaí a ionsúnn fuinneamh na gréine.', answer_en: 'What is Chlorophyll?', answer_ga: 'Cad é Clóraifill?', explanation_en: 'Reflects green light wavelengths.', explanation_ga: 'Léiríonn sé tonnfhaid solais ghlais.' },
              { id: 'q-1-2-4', points: 400, clue_en: 'Energy-carrying molecule known as the universal currency of life.', clue_ga: 'Móilín iompair fuinnimh ar a dtugtar airgeadra uilíoch na beatha.', answer_en: 'What is ATP?', answer_ga: 'Cad é ATP (Trífhosfáit Adanóisín)?', explanation_en: 'Adenosine Triphosphate.', explanation_ga: 'Trífhosfáit Adanóisín.' },
              { id: 'q-1-2-5', points: 500, clue_en: 'Gas released as a byproduct of the light stage of photosynthesis.', clue_ga: 'Gás a scaoiltear mar sheachtháirge de chéim solais na fótaisintéise.', answer_en: 'What is Oxygen (O2)?', answer_ga: 'Cad é Ocsaigin (O2)?', explanation_en: 'Produced by photolysis of water.', explanation_ga: 'Táirgthe trí fhótalaíocht uisce.' },
            ],
          },
          {
            id: 'c-1-3',
            name_en: 'Genetics & DNA',
            name_ga: 'Géineolaíocht & DNA',
            questions: [
              { id: 'q-1-3-1', points: 100, clue_en: 'The double-helix macromolecule carrying genetic instructions in organisms.', clue_ga: 'An macramóilín dé-héilice a iompraíonn treoracha géiniteacha.', answer_en: 'What is DNA?', answer_ga: 'Cad é DNA?', explanation_en: 'Deoxyribonucleic acid.', explanation_ga: 'Aigéad dí-ocsairibeanúicléasach.' },
              { id: 'q-1-3-2', points: 200, clue_en: 'Unit of heredity consisting of a specific segment of DNA coding for protein.', clue_ga: 'Aonad oidhreachta ar chuid ar leith de DNA é a chódaíonn próitéin.', answer_en: 'What is a Gene?', answer_ga: 'Cad é Géin?', explanation_en: 'Passed from parent to offspring.', explanation_ga: 'Faightear é ó na tuismitheoirí.' },
              { id: 'q-1-3-3', points: 300, clue_en: 'The complementary nitrogenous base that pairs with adenine in DNA.', clue_ga: 'An bun nítrigineach comhlántach a phéireálann le hadainín i DNA.', answer_en: 'What is Thymine?', answer_ga: 'Cad é Tímín?', explanation_en: 'A pairs with T in DNA.', explanation_ga: 'A péireáilte le T i DNA.' },
              { id: 'q-1-3-4', points: 400, clue_en: 'Cell division resulting in two genetically identical diploid daughter cells.', clue_ga: 'Rannán cille a tháirgeann dhá iníonchill dhéphlóideacha comhionanna.', answer_en: 'What is Mitosis?', answer_ga: 'Cad é Miotóis?', explanation_en: 'Used for growth and tissue repair.', explanation_ga: 'Úsáidtear é le haghaidh fáis agus deisiúcháin.' },
              { id: 'q-1-3-5', points: 500, clue_en: 'Austrian monk known as the father of modern genetics for his pea plant experiments.', clue_ga: 'Manach Ostarach ar a dtugtar athair na géineolaíochta nua-aimseartha.', answer_en: 'Who is Gregor Mendel?', answer_ga: 'Cé hé Gregor Mendel?', explanation_en: 'Formulated the laws of inheritance.', explanation_ga: 'Leag sé síos dlíthe na hoidhreachta.' },
            ],
          },
          {
            id: 'c-1-4',
            name_en: 'Human Biology & Systems',
            name_ga: 'Bitheolaíocht an Duine & Córais',
            questions: [
              { id: 'q-1-4-1', points: 100, clue_en: 'The muscular organ that pumps blood throughout the circulatory system.', clue_ga: 'An t-orgán matánach a phéacann fuil tríd an gcóras imshruthaithe.', answer_en: 'What is the Heart?', answer_ga: 'Cad é an Croí?', explanation_en: 'Has four chambers in humans.', explanation_ga: 'Tá ceithre sheomra aige sa duine.' },
              { id: 'q-1-4-2', points: 200, clue_en: 'Blood vessels that carry oxygenated blood away from the heart.', clue_ga: 'Fuileadáin a iompraíonn fuil ocsaiginithe amach ón gcroí.', answer_en: 'What are Arteries?', answer_ga: 'Cad iad Artairí?', explanation_en: 'Thick muscular walls to handle high pressure.', explanation_ga: 'Ballaí tiubha matánacha faoi bhrú ard.' },
              { id: 'q-1-4-3', points: 300, clue_en: 'The largest organ in the human body protecting against external pathogens.', clue_ga: 'An t-orgán is mó i gcorp an duine a chosnaíonn ar phataiginí seachtracha.', answer_en: 'What is the Skin?', answer_ga: 'Cad é an Craiceann?', explanation_en: 'Part of the integumentary system.', explanation_ga: 'Cuid den chóras cumhdaigh.' },
              { id: 'q-1-4-4', points: 400, clue_en: 'Gas exchange in the lungs takes place across these microscopic air sacs.', clue_ga: 'Tarlaíonn malartú gás sna scamhóga trasna na saic aeir bídeacha seo.', answer_en: 'What are Alveoli?', answer_ga: 'Cad iad Ailbheolais?', explanation_en: 'High surface area for diffusion.', explanation_ga: 'Achar dromchla mór le haghaidh idirleata.' },
              { id: 'q-1-4-5', points: 500, clue_en: 'Hormone produced by the pancreas regulating blood glucose levels.', clue_ga: 'Hormón a tháirgtear sa phaincréas a rialaíonn leibhéal glúcóis fola.', answer_en: 'What is Insulin?', answer_ga: 'Cad é Inslin?', explanation_en: 'Facilitates glucose uptake into cells.', explanation_ga: 'Cuidíonn sé le cealla glúcós a ghlacadh isteach.' },
            ],
          },
        ],
      },
    ];
  } else if (isHistory) {
    roundTemplates = [
      {
        id: 'round-1',
        roundNumber: 1,
        name_en: 'Jeopardy Round',
        name_ga: 'Babhta 1: Jeopardy',
        categories: [
          {
            id: 'c-1-1',
            name_en: 'The 1916 Rising',
            name_ga: 'Éirí Amach 1916',
            questions: [
              { id: 'q-1-1-1', points: 100, clue_en: 'The main Dublin building used as rebel headquarters during Easter 1916.', clue_ga: 'An príomhfhoirgneamh i mBaile Átha Cliath mar cheanncheathrú na reibiliúnaithe.', answer_en: 'What is the GPO (General Post Office)?', answer_ga: 'Cad é Ard-Oifig an Phoist (GPO)?', explanation_en: 'Located on O\'Connell Street.', explanation_ga: 'Lonnaithe ar Shráid Uí Chonaill.' },
              { id: 'q-1-1-2', points: 200, clue_en: 'Leader who read the Proclamation of the Irish Republic on the GPO steps.', clue_ga: 'Ceannaire a léigh Forógra Phoblacht na hÉireann ar chéimeanna an GPO.', answer_en: 'Who is Patrick Pearse (Pádraig Mac Piarais)?', answer_ga: 'Cé hé Pádraig Mac Piarais?', explanation_en: 'Signatory of the 1916 Proclamation.', explanation_ga: 'Sínitheoir Fhorógra 1916.' },
              { id: 'q-1-1-3', points: 300, clue_en: 'Socialist leader and founder of the Irish Citizen Army executed in 1916.', clue_ga: 'Ceannaire sóisialach agus bunaitheoir Arm Cathartha na hÉireann.', answer_en: 'Who is James Connolly?', answer_ga: 'Cé hé Séamus Ó Conghaile?', explanation_en: 'Executed while strapped to a chair.', explanation_ga: 'Cuireadh chun báis é i gCill Mhaighneann.' },
              { id: 'q-1-1-4', points: 400, clue_en: 'Dublin prison where fourteen leaders of the 1916 Rising were executed.', clue_ga: 'Príosún i mBaile Átha Cliath inar cuireadh 14 cheannaire chun báis.', answer_en: 'What is Kilmainham Gaol?', answer_ga: 'Cad é Príosún Chill Mhaighneann?', explanation_en: 'Executions turned public opinion.', explanation_ga: 'D\'athraigh na básuithe dearcadh an phobail.' },
              { id: 'q-1-1-5', points: 500, clue_en: 'Historic document declaring an independent Irish Republic in Easter 1916.', clue_ga: 'Doiciméad stairiúil a d\'fhógair Poblacht neamhspleách na hÉireann.', answer_en: 'What is the 1916 Proclamation (Forógra na Poblachta)?', answer_ga: 'Cad é Forógra na Poblachta?', explanation_en: 'Guaranteed religious and civil liberty.', explanation_ga: 'Gheall sé saoirse reiligiúnach agus shibhialta.' },
            ],
          },
          {
            id: 'c-1-2',
            name_en: 'Medieval Ireland',
            name_ga: 'Éire na Meánaoise',
            questions: [
              { id: 'q-1-2-1', points: 100, clue_en: 'Norse invaders who established Dublin and major port towns in Ireland.', clue_ga: 'Ionróirí Lochlannacha a bhunaigh Baile Átha Cliath agus calafoirt.', answer_en: 'Who are the Vikings (Lochlannaigh)?', answer_ga: 'Cé hiad na Lochlannaigh?', explanation_en: 'Arrived in the late 8th century.', explanation_ga: 'Tháinig siad ag deireadh an 8ú haois.' },
              { id: 'q-1-2-2', points: 200, clue_en: 'High King of Ireland who defeated the Vikings at Clontarf in 1014.', clue_ga: 'Ard-Rí na hÉireann a bhris ar na Lochlannaigh ag Cluain Tarbh i 1014.', answer_en: 'Who is Brian Boru (Brian Bóramha)?', answer_ga: 'Cé hé Brian Bóramha?', explanation_en: 'Killed in his tent after the battle.', explanation_ga: 'Maraíodh ina phuball é tar éis an chatha.' },
              { id: 'q-1-2-3', points: 300, clue_en: 'Anglo-Norman knight known as Strongbow who invaded Ireland in 1169.', clue_ga: 'Ridirí Angla-Normannach ar a dtugtar Strongbow a tháinig go hÉirinn i 1169.', answer_en: 'Who is Richard de Clare (Strongbow)?', answer_ga: 'Cé hé Richard de Clare (Strongbow)?', explanation_en: 'Married Aoife, daughter of Dermot MacMurrough.', explanation_ga: 'Phós sé Aoife, iníon Dhiarmada Mhic Mhurchadha.' },
              { id: 'q-1-2-4', points: 400, clue_en: 'Stone tower houses built throughout medieval Ireland for defensive dwelling.', clue_ga: 'Tithe túir chloiche a tógadh ar fud na hÉireann mar dhaingnithe cosanta.', answer_en: 'What are Tower Houses / Castles?', answer_ga: 'Cad iad Caisleáin / Tithe Túir?', explanation_en: 'Prevalent in 15th-16th century Ireland.', explanation_ga: 'Coitianta in Éirinn sa 15ú agus 16ú haois.' },
              { id: 'q-1-2-5', points: 500, clue_en: 'Area around Dublin directly controlled by the English Crown in the Middle Ages.', clue_ga: 'An limistéar timpeall Bhaile Átha Cliath faoi smacht díreach Choróin Shasana.', answer_en: 'What is The Pale (An Pháil)?', answer_ga: 'Cad é An Pháil?', explanation_en: 'Origin of phrase "beyond the pale".', explanation_ga: 'Bunús an nath "lasmuigh den pháil".' },
            ],
          },
          {
            id: 'c-1-3',
            name_en: 'The War of Independence',
            name_ga: 'Cogadh na Saoirse',
            questions: [
              { id: 'q-1-3-1', points: 100, clue_en: 'Irish revolutionary leader and Director of Intelligence nicknamed The Big Fellow.', clue_ga: 'Ceannaire réabhlóideach agus Stiúrthóir Faisnéise ar a dtugtar The Big Fellow.', answer_en: 'Who is Michael Collins (Mícheál Ó Coileáin)?', answer_ga: 'Cé hé Mícheál Ó Coileáin?', explanation_en: 'Masterminded the guerrilla campaign.', explanation_ga: 'D\'eagraigh sé an feachtas eadarnaí.' },
              { id: 'q-1-3-2', points: 200, clue_en: 'Notorious British paramilitary force sent to Ireland in 1920 wearing mixed uniforms.', clue_ga: 'Fórsa paraimíleata Briotanach a seoladh go hÉirinn i 1920 i gculaith mheasctha.', answer_en: 'Who are the Black and Tans?', answer_ga: 'Cé hiad na Dúchrónaigh (Black and Tans)?', explanation_en: 'Known for brutal reprisals.', explanation_ga: 'Clúiteach as a gcuid brúidiúlachta.' },
              { id: 'q-1-3-3', points: 300, clue_en: 'First meeting place of Dáil Éireann on 21 January 1919 in Dublin.', clue_ga: 'An chéad áit ar tháinig Dáil Éireann le chéile ar 21 Eanáir 1919.', answer_en: 'What is the Mansion House?', answer_ga: 'Cad é Teach an Mhéara (Mansion House)?', explanation_en: 'Adopted the Declaration of Independence.', explanation_ga: 'Ghlac siad le Dearbhú Neamhspleáchais.' },
              { id: 'q-1-3-4', points: 400, clue_en: 'Guerrilla warfare tactic using small, mobile combat units to ambush enemies.', clue_ga: 'Beartán cogaíochta eadarnaí ag baint úsáid as aonaid bheaga soghluaiste.', answer_en: 'What are Flying Columns?', answer_ga: 'Cad iad Colúin Reatha (Flying Columns)?', explanation_en: 'Key strategy of IRA brigades.', explanation_ga: 'Príomhstraitéis de chuid bhriogáidí an IRA.' },
              { id: 'q-1-3-5', points: 500, clue_en: 'Treaty signed in December 1921 creating the Irish Free State and causing Civil War.', clue_ga: 'Conradh a síníodh i mí na Nollag 1921 a bhunaigh Saorstát Éireann.', answer_en: 'What is the Anglo-Irish Treaty?', answer_ga: 'Cad é an Conradh Angla-Éireannach?', explanation_en: 'Split the republican movement.', explanation_ga: 'Snaidhm sé an ghluaiseacht phoblachtach.' },
            ],
          },
          {
            id: 'c-1-4',
            name_en: 'Ancient Civilizations',
            name_ga: 'Sean-Sibhialtachtaí',
            questions: [
              { id: 'q-1-4-1', points: 100, clue_en: 'Ancient Irish passage tomb in the Boyne Valley older than the Egyptian Pyramids.', clue_ga: 'Tuama pasáiste ársa i nGleann na Bóinne níos sine ná Pirimidí na hÉigipte.', answer_en: 'What is Newgrange (Sí an Bhrú)?', answer_ga: 'Cad é Sí an Bhrú (Newgrange)?', explanation_en: 'Illuminated at winter solstice.', explanation_ga: 'Lascann grian an gheimhridh an seomra.' },
              { id: 'q-1-4-2', points: 200, clue_en: 'Ancient writing system of early Ireland carved on standing stones using notches.', clue_ga: 'Córas scríbhneoireachta ársa na hÉireann greanta ar chlocha seasaimh.', answer_en: 'What is Ogham?', answer_ga: 'Cad é an tOgham?', explanation_en: 'Used between the 4th and 9th centuries.', explanation_ga: 'Úsáidte idir an 4ú agus an 9ú haois.' },
              { id: 'q-1-4-3', points: 300, clue_en: 'Mesopotamian rivers between which the world\'s earliest cities developed.', clue_ga: 'Aibhneacha na Measpatáime idir a dforbraíodh na chéad chathracha ar domhan.', answer_en: 'What are the Tigris and Euphrates?', answer_ga: 'Cad iad an Tiogras agus an Eofráit?', explanation_en: 'The Fertile Crescent cradle of civilization.', explanation_ga: 'Talamh thorthúil na sibhialtachta.' },
              { id: 'q-1-4-4', points: 400, clue_en: 'Early form of democracy was developed in this ancient Greek city-state.', clue_ga: 'Forbraíodh luathfhoirm den daonlathas sa chathair-stát Gréagach ársa seo.', answer_en: 'What is Athens?', answer_ga: 'Cad é an Aithin?', explanation_en: 'Led by Pericles during golden age.', explanation_ga: 'Faoi cheannas Pericles sa ré órga.' },
              { id: 'q-1-4-5', points: 500, clue_en: 'System of writing developed by the ancient Egyptians using pictorial symbols.', clue_ga: 'Córas scríbhneoireachta na Sean-Éigipte ag baint úsáide as siombailí pictiúrtha.', answer_en: 'What are Hieroglyphics?', answer_ga: 'Cad iad Iaroglaifigh?', explanation_en: 'Deciphered using the Rosetta Stone.', explanation_ga: 'Díchódaíodh iad leis an Leac Rosetta.' },
            ],
          },
        ],
      },
    ];
  } else {
    // General Curriculum / Curaclam Ginearálta across STEM & Humanities
    roundTemplates = [
      {
        id: 'round-1',
        roundNumber: 1,
        name_en: 'Jeopardy Round',
        name_ga: 'Babhta 1: Jeopardy',
        categories: [
          {
            id: 'c-1-1',
            name_en: 'Living World & Nature',
            name_ga: 'An Saol Beo & Dúlra',
            questions: [
              { id: 'q-1-1-1', points: 100, clue_en: 'The basic unit of life in all living organisms.', clue_ga: 'Aonad bunúsach na beatha i ngach orgánach beo.', answer_en: 'What is a Cell?', answer_ga: 'Cad é Cill?', explanation_en: 'Discovered by Robert Hooke.', explanation_ga: 'Aimsithe ag Robert Hooke.' },
              { id: 'q-1-1-2', points: 200, clue_en: 'Process by which plants convert sunlight into chemical energy.', clue_ga: 'Próiseas trína n-iompaíonn plandaí solas na gréine go fuinneamh.', answer_en: 'What is Photosynthesis?', answer_ga: 'Cad é Fótaisintéis?', explanation_en: 'Occurs in chloroplasts.', explanation_ga: 'Tarlaíonn sé i gclóraplaist.' },
              { id: 'q-1-1-3', points: 300, clue_en: 'Community of interacting organisms and their physical environment.', clue_ga: 'Pobal d\'orgánaigh idirghníomhacha agus a dtimpeallacht fhisiciúil.', answer_en: 'What is an Ecosystem?', answer_ga: 'Cad é Éiceachóras?', explanation_en: 'Includes biotic and abiotic factors.', explanation_ga: 'Cuimsíonn sé tosca bithacha agus aibitheacha.' },
              { id: 'q-1-1-4', points: 400, clue_en: 'Molecule carrying hereditary blueprints for organism development.', clue_ga: 'Móilín a iompraíonn treoracha oidhreachta d\'fhorbairt an orgánaigh.', answer_en: 'What is DNA?', answer_ga: 'Cad é DNA?', explanation_en: 'Double helix structure.', explanation_ga: 'Struchtúr dé-héilice.' },
              { id: 'q-1-1-5', points: 500, clue_en: 'Change in inherited characteristics of biological populations over generations.', clue_ga: 'Athrú ar thréithe oidhreachta daonraí bitheolaíocha thar ghlúnta.', answer_en: 'What is Evolution by Natural Selection?', answer_ga: 'Cad é Éabhlóid trí Roghnú Nádúrtha?', explanation_en: 'Proposed by Charles Darwin.', explanation_ga: 'Molta ag Charles Darwin.' },
            ],
          },
          {
            id: 'c-1-2',
            name_en: 'Earth & Physical Geography',
            name_ga: 'An Domhan & Tíreolaíocht Fhisiciúil',
            questions: [
              { id: 'q-1-2-1', points: 100, clue_en: 'Large rigid slabs of the Earth\'s lithosphere that move slowly.', clue_ga: 'Leaca móra do-lúbtha de litisféar an Domhain a ghluaiseann go mall.', answer_en: 'What are Tectonic Plates?', answer_ga: 'Cad iad Plátaí Teicteonacha?', explanation_en: 'Cause earthquakes and volcanoes.', explanation_ga: 'Cúisíonn siad creathanna talún agus bolcáin.' },
              { id: 'q-1-2-2', points: 200, clue_en: 'The continuous movement of water on, above and below the surface of Earth.', clue_ga: 'Gluaiseacht leanúnach uisce ar, os cionn agus faoi bhun dhromchla an Domhain.', answer_en: 'What is the Water Cycle (Timthriall an Uisce)?', answer_ga: 'Cad é Timthriall an Uisce?', explanation_en: 'Evaporation, condensation, precipitation.', explanation_ga: 'Galú, comhdhlúthú, deascadh.' },
              { id: 'q-1-2-3', points: 300, clue_en: 'Instrument used to measure and record atmospheric air pressure.', clue_ga: 'Ionstraim a úsáidtear chun brú aeir an atmaisféir a thomhas.', answer_en: 'What is a Barometer?', answer_ga: 'Cad é Baraiméadar?', explanation_en: 'Predicts weather changes.', explanation_ga: 'Tuarann sé athruithe aimsire.' },
              { id: 'q-1-2-4', points: 400, clue_en: 'The molten rock beneath the Earth\'s crust before it erupts.', clue_ga: 'An charraig leáite faoi screamh an Domhain sula mbrúchtann sí.', answer_en: 'What is Magma?', answer_ga: 'Cad é Magma?', explanation_en: 'Called lava once on the surface.', explanation_ga: 'Glaoitear laibhe air ar an dromchla.' },
              { id: 'q-1-2-5', points: 500, clue_en: 'The long-term shift in global average temperatures and weather patterns.', clue_ga: 'An t-aistriú fadtéarmach i meánteochtaí domhanda agus patrúin aimsire.', answer_en: 'What is Climate Change?', answer_ga: 'Cad é Athrú Aeráide?', explanation_en: 'Driven by greenhouse gas emissions.', explanation_ga: 'Tiomáinte ag astuithe gás ceaptha teasa.' },
            ],
          },
          {
            id: 'c-1-3',
            name_en: 'Irish History & Heritage',
            name_ga: 'Stair & Oidhreacht na hÉireann',
            questions: [
              { id: 'q-1-3-1', points: 100, clue_en: 'Historic rebellion that began in Dublin on Easter Monday in 1916.', clue_ga: 'Éirí amach stairiúil a thosaigh i mBaile Átha Cliath Luan Cásca 1916.', answer_en: 'What is the 1916 Easter Rising?', answer_ga: 'Cad é Éirí Amach na Cásca 1916?', explanation_en: 'Foundational event for modern Ireland.', explanation_ga: 'Bunimeacht do stát nua-aimseartha na hÉireann.' },
              { id: 'q-1-3-2', points: 200, clue_en: 'World-famous 9th-century illuminated Gospel manuscript housed at Trinity College Dublin.', clue_ga: 'Lámhscríbhinn shoiscéil ón 9ú haois i gColáiste na Tríonóide.', answer_en: 'What is the Book of Kells (Leabhar Cheanannais)?', answer_ga: 'Cad é Leabhar Cheanannais?', explanation_en: 'Masterpiece of Celtic monastic art.', explanation_ga: 'Sárshaothar ealaíne manaí Ceilteacha.' },
              { id: 'q-1-3-3', points: 300, clue_en: 'The disastrous blight in the 1840s that caused mass starvation and emigration in Ireland.', clue_ga: 'An dubhachan tubaisteach sna 1840idí a chúisigh gorta agus imirce.', answer_en: 'What is the Great Famine (An Gorta Mór)?', answer_ga: 'Cad é An Gorta Mór?', explanation_en: 'Potato crop failure 1845-1852.', explanation_ga: 'Teip ar bharr na bprátaí 1845-1852.' },
              { id: 'q-1-3-4', points: 400, clue_en: 'Patron saint of Ireland credited with bringing Christianity in the 5th century.', clue_ga: 'Éarlamh na hÉireann a thug an Chríostaíocht go hÉirinn sa 5ú haois.', answer_en: 'Who is Saint Patrick (Naomh Pádraig)?', answer_ga: 'Cé hé Naomh Pádraig?', explanation_en: 'Celebrated globally on March 17.', explanation_ga: 'Déantar ceiliúradh air ar 17 Márta.' },
              { id: 'q-1-3-5', points: 500, clue_en: 'Peace agreement signed on Good Friday 1998 resolving the Northern Ireland conflict.', clue_ga: 'Comhaontú síochána Aoine an Chéasta 1998 a chuir deireadh leis an gcoimhlint.', answer_en: 'What is the Good Friday Agreement (Comhaontú Aoine an Chéasta)?', answer_ga: 'Cad é Comhaontú Aoine an Chéasta?', explanation_en: 'Established devolved power-sharing.', explanation_ga: 'Bhunaigh sé comhroinnt cumhachta díláraithe.' },
            ],
          },
          {
            id: 'c-1-4',
            name_en: 'Curriculum Concepts & Vocabulary',
            name_ga: 'Coincheapa & Foclóir Curaclaim',
            questions: [
              { id: 'q-1-4-1', points: 100, clue_en: 'A proposed scientific explanation tested through experimentation.', clue_ga: 'Míniú eolaíoch molta a thástáiltear trí thurgnamh.', answer_en: 'What is a Hypothesis?', answer_ga: 'Cad é Hipitéis?', explanation_en: 'Foundation of the scientific method.', explanation_ga: 'Bonn an mhodha eolaíochta.' },
              { id: 'q-1-4-2', points: 200, clue_en: 'A visual diagram illustrating numerical relationships and trends.', clue_ga: 'Léaráid amhairc a thaispeánann caidrimh uimhriúla agus treochtaí.', answer_en: 'What is a Graph / Chart?', answer_ga: 'Cad é Graf / Cairt?', explanation_en: 'e.g. bar chart, line graph.', explanation_ga: 'm.sh. barra-chairt, líne-ghraf.' },
              { id: 'q-1-4-3', points: 300, clue_en: 'The legal protection granting exclusive rights to creators for original work.', clue_ga: 'Cosaint dhlíthiúil a thugann cearta eisiacha do chruthaitheoirí.', answer_en: 'What is Copyright?', answer_ga: 'Cad é Cóipcheart?', explanation_en: 'Protects literary and artistic works.', explanation_ga: 'Cosnaíonn sé saothair liteartha agus ealaíne.' },
              { id: 'q-1-4-4', points: 400, clue_en: 'The ability to read, write, comprehend, and communicate effectively.', clue_ga: 'An cumas chun léamh, scríobh, tuiscint agus cumarsáid go héifeachtach.', answer_en: 'What is Literacy?', answer_ga: 'Cad é Litearthacht?', explanation_en: 'Core skill across the entire curriculum.', explanation_ga: 'Príomhscil trasna an churaclaim ar fad.' },
              { id: 'q-1-4-5', points: 500, clue_en: 'Meeting present human needs without compromising the ability of future generations to meet theirs.', clue_ga: 'Freastal ar riachtanais an lae inniu gan dochar a dhéanamh do na glúnta atá le teacht.', answer_en: 'What is Sustainability / Forbairt Inbhuanaithe?', answer_ga: 'Cad é Forbairt Inbhuanaithe (Sustainability)?', explanation_en: 'Balancing economic, social, environmental needs.', explanation_ga: 'Cothromaíocht eacnamaíoch, shóisialta agus chomhshaoil.' },
            ],
          },
        ],
      },
    ];
  }

  const gameTitle = title || `${detectedSubject} Jeopardy / Jeopardy Dátheangach`;
  const gameDesc = description || (hasContent ? 'Bilingual game generated from Irish & English curriculum content' : 'Bilingual Jeopardy game ready for classroom interactive display.');

  return {
    id: 'game-demo-' + Date.now(),
    title: gameTitle,
    subject: detectedSubject,
    description: gameDesc,
    sourceFiles: sourceFiles,
    fallbackUsed: true,
    generationSource: 'curriculum-engine',
    rounds: roundTemplates.slice(0, clampedRounds),
  };
}
