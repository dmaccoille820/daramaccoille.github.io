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

  const prompt = `
You are a bilingual Irish-English Master Educator across all subjects in the Irish secondary curriculum (Junior Cycle and Leaving Certificate, including STEM, Humanities, Languages, Social Sciences, Business, and Digital Technologies).

TASK: Generate an authentic, diverse, and engaging bilingual Jeopardy game with exactly ${roundsCount} round(s).

GAME PARAMETERS SPECIFIED BY THE TEACHER:
- Title / Ábhar: "${titlePrompt}"
${userDescription ? `- Description / Cur Síos: "${userDescription}"` : ''}
${customInstructions ? `- Teacher's Custom Instructions ("Treoracha Breise"): "${customInstructions}"` : ''}
${options.sourceFiles && options.sourceFiles.length > 0 ? `- Attached Source Files: ${options.sourceFiles.map((f) => `${f.name} (${f.language.toUpperCase()})`).join(', ')}` : ''}

${hasFactfiles ? `
CURRICULUM FACTFILES PROVIDED BY TEACHER:
${englishText ? `--- ENGLISH FACTFILE ---\n${englishText.slice(0, 9000)}\n` : ''}
${irishText ? `--- GAEILGE (IRISH) FACTFILE ---\n${irishText.slice(0, 9000)}\n` : ''}

SOURCE INSTRUCTIONS:
- You MUST extract the clues, questions, facts, and concepts directly from the provided factfile(s).
- If only one language was provided (e.g. only English or only Irish), translate and align faithfully to create the counterpart language for all clues, answers, and category names.
` : `
NO FACTFILES ATTACHED (MANUAL PROMPT & INSTRUCTION CREATION PATH):
- The teacher has NOT uploaded PDF factfiles. You MUST use the Game Title, Description, and Teacher's Custom Instructions ("Treoracha Breise") above as your syllabus brief.
- Generate high-quality, authentic, diverse, and curriculum-aligned questions and categories covering this topic thoroughly.
`}

CRUCIAL RULES FOR AUTHENTIC BILINGUAL JEOPARDY:
1. CATEGORIES:
   - For each round, create 4 distinct, engaging, creative categories directly pertinent to the specified topic and curriculum (do NOT revert to generic computer hardware unless that is the requested topic).
   - Each category MUST have an accurate English name ("name_en") and an authentic Irish translation/name ("name_ga") using appropriate terminology from Téarma.ie.
2. ROUNDS & POINT PROGRESSION:
   - Create exactly ${roundsCount} round(s).
   - Each category in a round MUST contain exactly 5 questions with standard point values:
     - Round 1: 100, 200, 300, 400, 500
     - Round 2: 200, 400, 600, 800, 1000
     - Round 3: 300, 600, 900, 1200, 1500
   - Difficulty should increase smoothly with point value.
3. QUESTIONS & DUAL-LANGUAGE HOT SWITCH ALIGNMENT:
   - For every question provide:
     - "points": number
     - "clue_en": Concise Jeopardy clue statement in English (max 20 words).
     - "clue_ga": The direct, accurate Irish translation of that exact clue statement.
     - "answer_en": Phrased as a question in English ("What is...", "Who is...", "What are...", "Where is...").
     - "answer_ga": Phrased as a question in Irish ("Cad é...", "Céard é...", "Cé hé/hí...", "Cad iad...", "Cá bhfuil...").
     - "explanation_en": Brief 1-sentence explanatory context in English.
     - "explanation_ga": Brief 1-sentence explanatory context in Irish.
   - The English and Irish clues MUST correspond to the EXACT same concept so the teacher can hit the "Hot Switch Language" button mid-round and display seamlessly in either language.
4. METADATA:
   - "title": Use the teacher's title "${titlePrompt}" (or an authentic bilingual version if suitable).
   - "subject": Identify the curriculum subject accurately (e.g. "Biology", "History", "Geography", "Digital Technology", "Business", "Gaeilge", "Science").
   - "description": Provide an engaging, informative description summarizing what this game covers (incorporating the teacher's description if provided).

Output must adhere strictly to this JSON format (pure JSON only, no markdown wrapping):
{
  "title": "${titlePrompt}",
  "subject": "${detectedSubject}",
  "description": "${userDescription || 'Cluiche dátheangach Jeopardy / Bilingual Jeopardy Game'}",
  "rounds": [
    {
      "roundNumber": 1,
      "name_en": "Jeopardy Round",
      "name_ga": "Babhta 1: Jeopardy",
      "categories": [
        {
          "name_en": "Category Name in English",
          "name_ga": "Ainm an Chatagóir i nGaeilge",
          "questions": [
            {
              "points": 100,
              "clue_en": "English clue statement",
              "clue_ga": "Ráiteas leide i nGaeilge",
              "answer_en": "What is ...?",
              "answer_ga": "Cad é ...?",
              "explanation_en": "Short context",
              "explanation_ga": "Comhthéacs gairid"
            }
          ]
        }
      ]
    }
  ]
}
`;

  // Start with high-speed models that support fast JSON responses
  const primaryModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-1.5-flash-8b'];
  let candidateModels = primaryModels;

  let lastError: Error | null = null;
  const startTime = Date.now();
  // Gateway safety deadline: don't let calls exceed 28 seconds to prevent HTTP 504
  const MAX_ONLINE_WINDOW_MS = 28000;

  for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
    const modelName = candidateModels[mIdx];

    // If approaching server gateway timeout limit, break out and fall back safely
    if (Date.now() - startTime > MAX_ONLINE_WINDOW_MS) {
      console.warn(`Approaching gateway timeout limit (${Date.now() - startTime}ms). Safe fallback triggered.`);
      break;
    }

    // Attempt generation with backoff (up to 2 retries on 503/429/timeout)
    const MAX_RETRIES = 2;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (Date.now() - startTime > MAX_ONLINE_WINDOW_MS) break;

      try {
        console.log(`[Gemini] Attempting ${modelName} (attempt ${attempt + 1}/${MAX_RETRIES + 1})...`);
        options.onProgress?.(`Contacting Gemini (${modelName})...`);

        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        });

        // Run with an internal promise timeout per call
        const generatePromise = model.generateContent(prompt);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Model response timed out (504 limit protection)')), 22000)
        );

        const result = await Promise.race([generatePromise, timeoutPromise]);
        const text = result.response.text();

        let cleanJson = text.trim();
        if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
        }

        const parsed = JSON.parse(cleanJson);

        const finalTitle = userTitle || parsed.title || titlePrompt;
        const finalSubject = parsed.subject || detectedSubject;
        const finalDescription = userDescription || parsed.description || 'Bilingual game generated from Irish & English curriculum content';

        return {
          id: 'game-' + Date.now(),
          title: finalTitle,
          subject: finalSubject,
          description: finalDescription,
          sourceFiles: options.sourceFiles || [],
          fallbackUsed: false,
          generationSource: 'gemini',
          rounds: (parsed.rounds || []).map((r: { roundNumber: number; name_en: string; name_ga: string; categories: { name_en: string; name_ga: string; questions: { points: number; clue_en: string; clue_ga: string; answer_en: string; answer_ga: string; explanation_en?: string; explanation_ga?: string; }[] }[] }, rIdx: number) => ({
            id: `round-${r.roundNumber || rIdx + 1}`,
            roundNumber: r.roundNumber || rIdx + 1,
            name_en: r.name_en || `Round ${rIdx + 1}`,
            name_ga: r.name_ga || `Babhta ${rIdx + 1}`,
            categories: (r.categories || []).map((c, cIdx: number) => ({
              id: `cat-${rIdx + 1}-${cIdx + 1}`,
              name_en: c.name_en,
              name_ga: c.name_ga,
              questions: (c.questions || []).map((q, qIdx: number) => ({
                id: `q-${rIdx + 1}-${cIdx + 1}-${qIdx + 1}`,
                points: q.points || (qIdx + 1) * 100,
                clue_en: q.clue_en,
                clue_ga: q.clue_ga,
                answer_en: q.answer_en,
                answer_ga: q.answer_ga,
                explanation_en: q.explanation_en,
                explanation_ga: q.explanation_ga,
                isDailyDouble: qIdx === 3 && cIdx === 2
              }))
            }))
          }))
        };
      } catch (err) {
        const errMsg = (err as Error).message || '';
        lastError = err as Error;
        console.warn(`[Gemini] ${modelName} error on attempt ${attempt + 1}:`, errMsg);

        if (errMsg.includes('API_KEY_SERVICE_BLOCKED')) {
          throw new Error(
            'Google Generative Language API is blocked on this key/project (API_KEY_SERVICE_BLOCKED). Please ensure Generative Language API is enabled in Google Cloud Console or use a key from a personal Google account.'
          );
        }

        // If it's a 404 or unsupported model, don't retry this model, jump to next candidate
        if (errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('not supported')) {
          break;
        }

        // If it's 503 (overloaded) or 504 (timeout) or 429 (rate-limited), apply exponential backoff
        if (isRetryableGeminiError(errMsg) && attempt < MAX_RETRIES) {
          const backoffMs = Math.min(1200 * Math.pow(1.8, attempt) + Math.random() * 400, 3500);
          console.log(`[Gemini Backoff] 503/504/429 detected. Backing off for ${Math.round(backoffMs)}ms before retry...`);
          options.onProgress?.(`Gemini is busy (503/overloaded). Backing off for ${Math.round(backoffMs / 1000)}s...`);
          await sleep(backoffMs);
          continue; // Retry same model
        }

        // If retries exhausted for this model, try next candidate model
        break;
      }
    }
  }

  // If online models returned 503/504 or were unavailable and allowFallback is true:
  if (options.allowFallback !== false) {
    console.warn('Gemini online service unavailable or timed out (503/504). Automatically falling back to Curriculum Engine so classroom play is never blocked.');
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

  throw lastError || new Error('Gemini service unavailable (503/504). Please try again or use Curriculum Engine.');
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
  const hasContent = irishExcerpt.length > 20 || englishExcerpt.length > 20;
  const sampleSubtitle = hasContent ? '(Curriculum Factfile Engine)' : '';
  const clampedRounds = Math.min(Math.max(roundsCount, 1), 3);

  // All template content — 3 rounds × 4 categories × 5 questions each
  const roundTemplates: Round[] = [
    {
      id: 'round-1',
      roundNumber: 1,
      name_en: 'Jeopardy Round',
      name_ga: 'Babhta 1: Jeopardy',
      categories: [
        {
          id: 'c-1-1',
          name_en: 'Data & Storage',
          name_ga: 'Sonraí & Stóráil',
          questions: [
            { id: 'q-1-1-1', points: 100, clue_en: 'The smallest unit of data in computing, holding only 0 or 1.', clue_ga: 'An t-aonad sonraí is lú sa ríomhaireacht, ní féidir leis ach 0 nó 1 a choinneáil.', answer_en: 'What is a bit?', answer_ga: 'Cad é giotán?', explanation_en: 'Short for binary digit.', explanation_ga: 'Giorrúchán ar dhigit dhénártha.' },
            { id: 'q-1-1-2', points: 200, clue_en: 'A collection of eight individual bits.', clue_ga: 'Bailiúchán d\'ocht ngiotán aonair.', answer_en: 'What is a byte?', answer_ga: 'Cad é beart?', explanation_en: 'Standard byte size across computing.', explanation_ga: 'Gnáthmhéid beart sa ríomhaireacht.' },
            { id: 'q-1-1-3', points: 300, clue_en: 'High-speed temporary volatile computer memory.', clue_ga: 'Cuimhne ríomhaire shealadach ardluais atá luaineach.', answer_en: 'What is RAM?', answer_ga: 'Cad é RAM?', explanation_en: 'Loses data when powered off.', explanation_ga: 'Cailleann sé sonraí nuair a mhúchtar é.' },
            { id: 'q-1-1-4', points: 400, clue_en: 'Storage technology with no moving parts using flash chips.', clue_ga: 'Teicneolaíocht stórála gan pháirteanna gluaisteacha.', answer_en: 'What is an SSD?', answer_ga: 'Cad é SSD?', explanation_en: 'Solid State Drive.', explanation_ga: 'Tiomántán Soladstaide.' },
            { id: 'q-1-1-5', points: 500, clue_en: 'One billion bytes, or 1,024 megabytes.', clue_ga: 'Billiún beart, nó 1,024 meigibheart.', answer_en: 'What is a Gigabyte?', answer_ga: 'Cad é Gigibheart?', explanation_en: 'Common storage unit.', explanation_ga: 'Aonad coitianta stórála.' },
          ],
        },
        {
          id: 'c-1-2',
          name_en: 'Hardware & CPU',
          name_ga: 'Crua-earraí & LAP',
          questions: [
            { id: 'q-1-2-1', points: 100, clue_en: 'The main processor chip, often called the computer\'s brain.', clue_ga: 'An phríomhshlis próiseálaí, ar a dtugtar inchinn an ríomhaire.', answer_en: 'What is the CPU?', answer_ga: 'Cad é an LAP?', explanation_en: 'Central Processing Unit.', explanation_ga: 'Lár-Aonad Próiseála.' },
            { id: 'q-1-2-2', points: 200, clue_en: 'The repetitive CPU cycle: Fetch, Decode, and this third step.', clue_ga: 'Timthriall an LAP: Faigh, Díchódaigh, agus an tríú céim seo.', answer_en: 'What is Execute?', answer_ga: 'Cad é Rith?', explanation_en: 'The CPU instruction cycle.', explanation_ga: 'Timthriall treoracha an LAP.' },
            { id: 'q-1-2-3', points: 300, clue_en: 'CPU sub-unit that performs arithmetic and logic operations.', clue_ga: 'Fo-aonad den LAP a dhéanann oibríochtaí uimhríochta agus loighce.', answer_en: 'What is the ALU?', answer_ga: 'Cad é an AUL?', explanation_en: 'Arithmetic Logic Unit.', explanation_ga: 'Aonad Uimhríochta agus Loighce.' },
            { id: 'q-1-2-4', points: 400, clue_en: 'Ultra-fast miniature memory cells built into the processor.', clue_ga: 'Cealla cuimhne beaga bídeacha sár-luatha sa phróiseálaí.', answer_en: 'What are Registers?', answer_ga: 'Cad iad Cláir?', explanation_en: 'Hold immediate data inside the CPU.', explanation_ga: 'Coinníonn siad sonraí láithreacha sa LAP.' },
            { id: 'q-1-2-5', points: 500, clue_en: 'Main circuit board connecting all hardware components.', clue_ga: 'Príomhchlár ciorcaid a cheanglaíonn na comhpháirteanna crua-earraí.', answer_en: 'What is the Motherboard?', answer_ga: 'Cad é an Máthairchlár?', explanation_en: 'Houses CPU, RAM, and expansion slots.', explanation_ga: 'Coimeádann sé LAP, RAM agus sliotáin leathnaithe.' },
          ],
        },
        {
          id: 'c-1-3',
          name_en: 'Networks',
          name_ga: 'Líonraí',
          questions: [
            { id: 'q-1-3-1', points: 100, clue_en: 'A network confined to a single building or campus.', clue_ga: 'Líonra atá teoranta d\'fhoirgneamh amháin nó campas.', answer_en: 'What is a LAN?', answer_ga: 'Cad é LAN?', explanation_en: 'Local Area Network.', explanation_ga: 'Líonra Ceantair Áitiúil.' },
            { id: 'q-1-3-2', points: 200, clue_en: 'A worldwide system of interconnected computer networks.', clue_ga: 'Córas domhanda de líonraí ríomhaireachta idirnasctha.', answer_en: 'What is the Internet?', answer_ga: 'Cad é an tIdirlíon?', explanation_en: 'Global network of networks.', explanation_ga: 'Líonra domhanda na líonraí.' },
            { id: 'q-1-3-3', points: 300, clue_en: 'Device that forwards data packets between IP networks.', clue_ga: 'Gléas a chuireann paicéid sonraí ar aghaidh idir líonraí IP.', answer_en: 'What is a Router?', answer_ga: 'Cad é Ródaire?', explanation_en: 'Operates at the network layer.', explanation_ga: 'Oibríonn sé ag ciseal an líonra.' },
            { id: 'q-1-3-4', points: 400, clue_en: 'System that converts domain names to IP addresses.', clue_ga: 'Córas a aistríonn ainmneacha fearainn go seoltaí IP.', answer_en: 'What is DNS?', answer_ga: 'Cad é DNS?', explanation_en: 'Domain Name System.', explanation_ga: 'Córas Ainmneacha Fearainn.' },
            { id: 'q-1-3-5', points: 500, clue_en: 'Protocol for secure encrypted web browsing.', clue_ga: 'Prótacal do bhrabhsáil gréasáin slán criptithe.', answer_en: 'What is HTTPS?', answer_ga: 'Cad é HTTPS?', explanation_en: 'HTTP Secure.', explanation_ga: 'HTTP Slán.' },
          ],
        },
        {
          id: 'c-1-4',
          name_en: 'Cybersecurity',
          name_ga: 'Cibearshlándáil',
          questions: [
            { id: 'q-1-4-1', points: 100, clue_en: 'Deceptive emails tricking users into revealing credentials.', clue_ga: 'Ríomhphoist mhealltacha a dhéanann iarracht faisnéis a bhaint amach.', answer_en: 'What is Phishing?', answer_ga: 'Cad é Bradphadaireacht?', explanation_en: 'Common social engineering attack.', explanation_ga: 'Ionsaí coitianta innealtóireachta sóisialta.' },
            { id: 'q-1-4-2', points: 200, clue_en: 'Barrier that filters network traffic by security rules.', clue_ga: 'Bac a scagann trácht líonra bunaithe ar rialacha slándála.', answer_en: 'What is a Firewall?', answer_ga: 'Cad é Balla Dóiteáin?', explanation_en: 'Monitors incoming and outgoing traffic.', explanation_ga: 'Déanann sé monatóireacht ar thrácht líonra.' },
            { id: 'q-1-4-3', points: 300, clue_en: 'Malware that encrypts files and demands a ransom payment.', clue_ga: 'Mail-earraí a chriptíonn comhaid agus a éilíonn éiric.', answer_en: 'What is Ransomware?', answer_ga: 'Cad é Éiric-Earraí?', explanation_en: 'Locks files until ransom is paid.', explanation_ga: 'Glasálann sé comhaid go dtí go n-íoctar éiric.' },
            { id: 'q-1-4-4', points: 400, clue_en: 'Authentication using two or more verification methods.', clue_ga: 'Fíordheimhniú ag úsáid dhá mhodh fíoraithe nó níos mó.', answer_en: 'What is MFA / 2FA?', answer_ga: 'Cad é Fíordheimhniú Ilfhachtóra?', explanation_en: 'Significantly improves account security.', explanation_ga: 'Feabhsaíonn sé slándáil cuntais go mór.' },
            { id: 'q-1-4-5', points: 500, clue_en: 'EU legal framework protecting personal data and privacy rights.', clue_ga: 'Creat dlíthiúil AE a chosnaíonn sonraí pearsanta agus ceart príobháideachta.', answer_en: 'What is GDPR?', answer_ga: 'Cad é RGCS (GDPR)?', explanation_en: 'General Data Protection Regulation.', explanation_ga: 'Rialachán Ginearálta maidir le Cosaint Sonraí.' },
          ],
        },
      ],
    },
    {
      id: 'round-2',
      roundNumber: 2,
      name_en: 'Double Jeopardy Round',
      name_ga: 'Babhta 2: Jeopardy Dúbailte',
      categories: [
        {
          id: 'c-2-1',
          name_en: 'Binary & Number Systems',
          name_ga: 'Córais Uimhreacha & Dénártha',
          questions: [
            { id: 'q-2-1-1', points: 200, clue_en: 'The number base used by all digital computers internally.', clue_ga: 'Bonn an uimhreach a úsáideann ríomhairí digiteacha go hinmheánach.', answer_en: 'What is binary (base 2)?', answer_ga: 'Cad é an córas dénártha (bun 2)?', explanation_en: 'Uses only 0 and 1.', explanation_ga: 'Úsáideann sé 0 agus 1 amháin.' },
            { id: 'q-2-1-2', points: 400, clue_en: 'The denary value of the binary number 00001010.', clue_ga: 'Luach deachúil na huimhreach dénártha 00001010.', answer_en: 'What is 10?', answer_ga: 'Cad é 10?', explanation_en: '8+2=10 in denary.', explanation_ga: '8+2=10 sa chóras deachúil.' },
            { id: 'q-2-1-3', points: 600, clue_en: 'The number of distinct values representable with 3 bits.', clue_ga: 'Líon na luachanna ar leith is féidir a léiriú le 3 ghiotán.', answer_en: 'What is 8 (2³)?', answer_ga: 'Cad é 8 (2³)?', explanation_en: '2 to the power of 3.', explanation_ga: '2 faoi chumhacht 3.' },
            { id: 'q-2-1-4', points: 800, clue_en: 'Number system using base 16, digits 0–9 and A–F.', clue_ga: 'Córas uimhreach ag úsáid bun 16, digití 0-9 agus A-F.', answer_en: 'What is Hexadecimal?', answer_ga: 'Cad é Heicsidheachúil?', explanation_en: 'Used in memory addresses and colour codes.', explanation_ga: 'Úsáidtear é i seoltaí cuimhne agus cóid dathanna.' },
            { id: 'q-2-1-5', points: 1000, clue_en: 'Binary operation outputting 1 only when both inputs are 1.', clue_ga: 'Oibríocht dhénártha a thugann 1 amach nuair atá an dá ionchur ina 1.', answer_en: 'What is an AND gate?', answer_ga: 'Cad é Geata AGUS?', explanation_en: 'Fundamental digital logic gate.', explanation_ga: 'Geata loighce digiteach bunúsach.' },
          ],
        },
        {
          id: 'c-2-2',
          name_en: 'Software & Operating Systems',
          name_ga: 'Bogearraí & Córais Oibriúcháin',
          questions: [
            { id: 'q-2-2-1', points: 200, clue_en: 'Software that manages computer hardware and software resources.', clue_ga: 'Bogearraí a bhainistíonn acmhainní crua-earraí agus bogearraí.', answer_en: 'What is an Operating System?', answer_ga: 'Cad é Córas Oibriúcháin?', explanation_en: 'e.g. Windows, macOS, Linux.', explanation_ga: 'm.sh. Windows, macOS, Linux.' },
            { id: 'q-2-2-2', points: 400, clue_en: 'Programs running in RAM that temporarily need processor time.', clue_ga: 'Cláir ag rith i RAM a bhfuil am próiseálaí uathu go sealadach.', answer_en: 'What are Processes?', answer_ga: 'Cad iad Próisis?', explanation_en: 'OS manages process scheduling.', explanation_ga: 'Bainistíonn an Córas Oibriúcháin sceidealú próisis.' },
            { id: 'q-2-2-3', points: 600, clue_en: 'OS technique running multiple tasks by rapidly switching between them.', clue_ga: 'Teicníc OS a ritheann ilchúraimí trí athrú tapa eatarthu.', answer_en: 'What is Multitasking?', answer_ga: 'Cad é Ilchúraimíocht?', explanation_en: 'Gives illusion of parallel execution.', explanation_ga: 'Tugann sé an léiriú go bhfuil rith comhthreomhar ann.' },
            { id: 'q-2-2-4', points: 800, clue_en: 'Stored machine code instructions directly executed by the CPU.', clue_ga: 'Treoracha cód meaisín stóráilte a fheidhmíonn an LAP go díreach.', answer_en: 'What is a Program / Executable?', answer_ga: 'Cad é Clár / Comhad Inrite?', explanation_en: 'Compiled source code.', explanation_ga: 'Cód foinse tiomsaithe.' },
            { id: 'q-2-2-5', points: 1000, clue_en: 'OS component deciding which process gets CPU time next.', clue_ga: 'Comhpháirt OS a chinnteann cén próiseas a gheobhaidh am LAP ansin.', answer_en: 'What is the Scheduler?', answer_ga: 'Cad é an Sceidealóir?', explanation_en: 'Manages CPU time allocation.', explanation_ga: 'Bainistíonn sé leithdháileadh ama LAP.' },
          ],
        },
        {
          id: 'c-2-3',
          name_en: 'The Internet & Web',
          name_ga: 'An tIdirlíon & an Gréasán',
          questions: [
            { id: 'q-2-3-1', points: 200, clue_en: 'Unique numerical address identifying each device on a network.', clue_ga: 'Seoladh uimhriúil uathúil a aithníonn gach gléas ar líonra.', answer_en: 'What is an IP Address?', answer_ga: 'Cad é Seoladh IP?', explanation_en: 'e.g. 192.168.1.1', explanation_ga: 'm.sh. 192.168.1.1' },
            { id: 'q-2-3-2', points: 400, clue_en: 'Protocol used to send email messages across the internet.', clue_ga: 'Prótacal a úsáidtear chun teachtaireachtaí ríomhphoist a sheoladh.', answer_en: 'What is SMTP?', answer_ga: 'Cad é SMTP?', explanation_en: 'Simple Mail Transfer Protocol.', explanation_ga: 'Prótacal Aistrithe Ríomhphoist Simplí.' },
            { id: 'q-2-3-3', points: 600, clue_en: 'Software that requests and displays web pages for users.', clue_ga: 'Bogearraí a iarrann agus a thaispeánann leathanaigh ghréasáin.', answer_en: 'What is a Web Browser?', answer_ga: 'Cad é Brabhsálaí Gréasáin?', explanation_en: 'e.g. Chrome, Firefox, Safari.', explanation_ga: 'm.sh. Chrome, Firefox, Safari.' },
            { id: 'q-2-3-4', points: 800, clue_en: 'Server storing and serving website files to browsers worldwide.', clue_ga: 'Freastalaí a stórálann agus a sheirbheálann comhaid suíomh gréasáin.', answer_en: 'What is a Web Server?', answer_ga: 'Cad é Freastalaí Gréasáin?', explanation_en: 'e.g. Apache, Nginx.', explanation_ga: 'm.sh. Apache, Nginx.' },
            { id: 'q-2-3-5', points: 1000, clue_en: 'Set of rules governing how data is transmitted across networks.', clue_ga: 'Sraith rialacha a rialaíonn conas sonraí a tharchur ar líonraí.', answer_en: 'What is a Protocol?', answer_ga: 'Cad é Prótacal?', explanation_en: 'e.g. TCP/IP, HTTP, FTP.', explanation_ga: 'm.sh. TCP/IP, HTTP, FTP.' },
          ],
        },
        {
          id: 'c-2-4',
          name_en: 'Input & Output Devices',
          name_ga: 'Gléasanna Ionchuir & Aschuir',
          questions: [
            { id: 'q-2-4-1', points: 200, clue_en: 'Hardware device that captures and digitises physical documents.', clue_ga: 'Gléas crua-earraí a ghabhann agus a dhigitíonn doiciméid fhisiciúla.', answer_en: 'What is a Scanner?', answer_ga: 'Cad é Scanóir?', explanation_en: 'Converts paper to digital images.', explanation_ga: 'Tiontaíonn sé páipéar go híomhánna digiteacha.' },
            { id: 'q-2-4-2', points: 400, clue_en: 'Output device rendering visual information as printed physical copies.', clue_ga: 'Gléas aschuir a léiríonn faisnéis amhairc mar chóipeanna fisiciúla.', answer_en: 'What is a Printer?', answer_ga: 'Cad é Clóire?', explanation_en: 'Produces hard-copy output.', explanation_ga: 'Táirgeann sé aschur cruachóipe.' },
            { id: 'q-2-4-3', points: 600, clue_en: 'Touch-sensitive display combining input and output in one surface.', clue_ga: 'Taispeáint íogair don teagmháil a chomhcheanglaíonn ionchur agus aschur.', answer_en: 'What is a Touchscreen?', answer_ga: 'Cad é Scáileán Teagmhála?', explanation_en: 'Used in phones, tablets, kiosks.', explanation_ga: 'Úsáidtear é i ngutháin, táibléid agus ciosca.' },
            { id: 'q-2-4-4', points: 800, clue_en: 'Peripheral translating physical movement into on-screen cursor control.', clue_ga: 'Forimeallaigh a aistríonn gluaiseacht fhisiciúil go rialú cúrsóra.', answer_en: 'What is a Mouse?', answer_ga: 'Cad é Luch (Mouse)?', explanation_en: 'Pointing input device.', explanation_ga: 'Gléas ionchuir pointeála.' },
            { id: 'q-2-4-5', points: 1000, clue_en: 'Sensor array in smartphones measuring device orientation and motion.', clue_ga: 'Sraith braiteoir i bhfóin chliste a thomhaiseann treoshuíomh agus gluaiseacht.', answer_en: 'What is an Accelerometer / Gyroscope?', answer_ga: 'Cad é Luasmhéadar / Gireascóp?', explanation_en: 'Enables screen rotation and motion sensing.', explanation_ga: 'Cumasaíonn sé rothlú scáileáin agus braite gluaiseachta.' },
          ],
        },
      ],
    },
    {
      id: 'round-3',
      roundNumber: 3,
      name_en: 'Final Jeopardy Round',
      name_ga: 'Babhta 3: Jeopardy Deiridh',
      categories: [
        {
          id: 'c-3-1',
          name_en: 'Programming & Algorithms',
          name_ga: 'Ríomhchlárú & Algartaim',
          questions: [
            { id: 'q-3-1-1', points: 300, clue_en: 'Step-by-step finite set of instructions to solve a problem.', clue_ga: 'Sraith teoranta treoracha céim ar chéim chun fadhb a réiteach.', answer_en: 'What is an Algorithm?', answer_ga: 'Cad é Algartam?', explanation_en: 'Foundation of all programming.', explanation_ga: 'Bonn gach ríomhchlárúcháin.' },
            { id: 'q-3-1-2', points: 600, clue_en: 'Human-readable code translated into machine code by a compiler.', clue_ga: 'Cód inléite ag daoine a aistríonn tiomsaitheoir go cód meaisín.', answer_en: 'What is Source Code?', answer_ga: 'Cad é Cód Foinse?', explanation_en: 'Written in high-level languages.', explanation_ga: 'Scríofar é i dteangacha ardleibhéil.' },
            { id: 'q-3-1-3', points: 900, clue_en: 'Error in a program causing incorrect or unexpected behaviour.', clue_ga: 'Earráid i gclár a chúisíonn iompar mícheart nó neamhionchais.', answer_en: 'What is a Bug?', answer_ga: 'Cad é Fabht (Bug)?', explanation_en: 'Debugging finds and fixes bugs.', explanation_ga: 'Faigheann agus deisíonn dífhabhtú fabhtanna.' },
            { id: 'q-3-1-4', points: 1200, clue_en: 'Repeating block of code that runs until a condition is met.', clue_ga: 'Bloc cóid athfhillteach a ritheann go dtí go gcomhlíontar coinníoll.', answer_en: 'What is a Loop?', answer_ga: 'Cad é Lúb?', explanation_en: 'e.g. for loop, while loop.', explanation_ga: 'm.sh. lúb for, lúb while.' },
            { id: 'q-3-1-5', points: 1500, clue_en: 'OOP concept where a class inherits attributes from a parent class.', clue_ga: 'Coincheap OOP ina n-oirdheiscíonn rang tréithe ó rang tuismitheora.', answer_en: 'What is Inheritance?', answer_ga: 'Cad é Oidhreacht?', explanation_en: 'Core principle of object-oriented programming.', explanation_ga: 'Prionsabal croí ríomhchlárúcháin réad-dhírithe.' },
          ],
        },
        {
          id: 'c-3-2',
          name_en: 'Data Representation',
          name_ga: 'Léiriú Sonraí',
          questions: [
            { id: 'q-3-2-1', points: 300, clue_en: 'File format storing images as a grid of individually coloured pixels.', clue_ga: 'Formáid comhaid a stórálann íomhánna mar eangach de phicsilí daite.', answer_en: 'What is a Bitmap / Raster image?', answer_ga: 'Cad é íomhá Bitmap / Raster?', explanation_en: 'e.g. PNG, JPEG, BMP.', explanation_ga: 'm.sh. PNG, JPEG, BMP.' },
            { id: 'q-3-2-2', points: 600, clue_en: 'Standard encoding mapping text characters to numerical values.', clue_ga: 'Ionchódú caighdeánach a mhapálann carachtair téacs go luachanna uimhriúla.', answer_en: 'What is ASCII or Unicode?', answer_ga: 'Cad é ASCII nó Unicode?', explanation_en: 'Allows computers to store text.', explanation_ga: 'Ligeann do ríomhairí téacs a stóráil.' },
            { id: 'q-3-2-3', points: 900, clue_en: 'Reducing file size without permanently losing any data.', clue_ga: 'Méid comhaid a laghdú gan aon sonraí a chailleadh go buan.', answer_en: 'What is Lossless Compression?', answer_ga: 'Cad é Comhbhrú gan Chaillteanas?', explanation_en: 'e.g. ZIP, PNG, FLAC.', explanation_ga: 'm.sh. ZIP, PNG, FLAC.' },
            { id: 'q-3-2-4', points: 1200, clue_en: 'Number of pixels per inch determining image print sharpness.', clue_ga: 'Líon na bpicsilí in aghaidh an orlach a chinnteann géire priontála íomhá.', answer_en: 'What is DPI / Resolution?', answer_ga: 'Cad é DPI / Taifeach?', explanation_en: 'Higher DPI = sharper print.', explanation_ga: 'DPI níos airde = priont géire.' },
            { id: 'q-3-2-5', points: 1500, clue_en: 'Sampling rate determining the quality of digital audio recordings.', clue_ga: 'Ráta samplála a chinnteann cáilíocht taifeadtaí fuaime digití.', answer_en: 'What is Sample Rate / Bit Depth?', answer_ga: 'Cad é Ráta Samplála / Doimhneacht Ghiotán?', explanation_en: 'e.g. 44.1kHz CD quality.', explanation_ga: 'm.sh. cáilíocht CD 44.1kHz.' },
          ],
        },
        {
          id: 'c-3-3',
          name_en: 'Artificial Intelligence',
          name_ga: 'Intleacht Shaorga',
          questions: [
            { id: 'q-3-3-1', points: 300, clue_en: 'AI subset where computers learn from data without explicit programming.', clue_ga: 'Fo-thacar AI ina bhfoghlaimíonn ríomhairí ó shonraí gan ríomhchlárú sainráite.', answer_en: 'What is Machine Learning?', answer_ga: 'Cad é Meaisínfhoghlaim?', explanation_en: 'Powers recommendation systems and image recognition.', explanation_ga: 'Cumhachtaíonn sé córais molta agus aitheantas íomhá.' },
            { id: 'q-3-3-2', points: 600, clue_en: 'AI technique using layered neural networks to process complex data.', clue_ga: 'Teicníc AI ag úsáid líonraí néaracha srathacha chun sonraí casta a phróiseáil.', answer_en: 'What is Deep Learning?', answer_ga: 'Cad é Domhanfhoghlaim?', explanation_en: 'Powers speech and vision AI.', explanation_ga: 'Cumhachtaíonn sé AI cainte agus radhairc.' },
            { id: 'q-3-3-3', points: 900, clue_en: 'Dataset used to teach a machine learning model patterns.', clue_ga: 'Tacar sonraí a úsáidtear chun patrúin a mhúineadh do shamhail mheaisínfhoghlama.', answer_en: 'What is Training Data?', answer_ga: 'Cad é Sonraí Oiliúna?', explanation_en: 'Quality of training data determines model accuracy.', explanation_ga: 'Cinneann cáilíocht sonraí oiliúna cruinneas samhla.' },
            { id: 'q-3-3-4', points: 1200, clue_en: 'AI ethical concern about unfair outcomes caused by biased training data.', clue_ga: 'Imní eiticiúil AI faoi thorthaí éagóracha ó shonraí oiliúna claonta.', answer_en: 'What is AI Bias?', answer_ga: 'Cad é Claontacht AI?', explanation_en: 'Bias in = bias out.', explanation_ga: 'Claontacht isteach = claontacht amach.' },
            { id: 'q-3-3-5', points: 1500, clue_en: 'Turing test assessing whether machine responses are indistinguishable from humans.', clue_ga: 'Tástáil Turing a mheasann an bhfuil freagraí meaisín indistinguishable ó dhaoine.', answer_en: 'What is the Turing Test?', answer_ga: 'Cad é Tástáil Turing?', explanation_en: 'Proposed by Alan Turing in 1950.', explanation_ga: 'Molta ag Alan Turing sa bhliain 1950.' },
          ],
        },
        {
          id: 'c-3-4',
          name_en: 'Digital Ethics & Society',
          name_ga: 'Eitice Dhigiteach & An tSochaí',
          questions: [
            { id: 'q-3-4-1', points: 300, clue_en: 'Legal right protecting original creative works from copying.', clue_ga: 'Ceart dlíthiúil a chosnaíonn saothair chruthaitheacha bunaidh ó chóipeáil.', answer_en: 'What is Copyright?', answer_ga: 'Cad é Cóipcheart?', explanation_en: 'Automatic protection for original works.', explanation_ga: 'Cosaint uathoibríoch do shaothair bhunaidh.' },
            { id: 'q-3-4-2', points: 600, clue_en: 'The unequal access to digital technology and internet across society.', clue_ga: 'Rochtain éagothrom ar theicneolaíocht dhigiteach agus idirlíon sa tsochaí.', answer_en: 'What is the Digital Divide?', answer_ga: 'Cad é an Scoilt Dhigiteach?', explanation_en: 'A major equality concern globally.', explanation_ga: 'Imní mhór comhionannais ar fud an domhain.' },
            { id: 'q-3-4-3', points: 900, clue_en: 'Principle that all internet traffic should be treated equally.', clue_ga: 'Prionsabal gur chóir gach trácht idirlín a chóireáil go cothrom.', answer_en: 'What is Net Neutrality?', answer_ga: 'Cad é Neodracht Líonra?', explanation_en: 'Prevents ISPs from throttling specific services.', explanation_ga: 'Coiscíonn sé Soláthraithe Seirbhíse Idirlín ó sheirbhísí sonracha a mhoilliú.' },
            { id: 'q-3-4-4', points: 1200, clue_en: 'Practice of deliberately spreading false information online.', clue_ga: 'Cleachtas faisnéis bhréagach a scaipeadh d\'aon ghnó ar líne.', answer_en: 'What is Disinformation / Fake News?', answer_ga: 'Cad é Mífhaisnéis / Nuacht Bhréagach?', explanation_en: 'A major digital literacy challenge.', explanation_ga: 'Dúshlán mór litearthachta digití.' },
            { id: 'q-3-4-5', points: 1500, clue_en: 'Designing technology so it is usable by people of all abilities.', clue_ga: 'Teicneolaíocht a dhearadh ionas gur féidir le daoine de gach cumas í a úsáid.', answer_en: 'What is Digital Accessibility?', answer_ga: 'Cad é Inrochtaineacht Dhigiteach?', explanation_en: 'e.g. screen readers, captions, high contrast.', explanation_ga: 'm.sh. léitheoirí scáileáin, fotheideal, ardcodarsnacht.' },
          ],
        },
      ],
    },
  ];

  const gameTitle = title ? (sampleSubtitle ? `${title} ${sampleSubtitle}` : title) : `Digital Technology ${sampleSubtitle}`.trim();
  const gameDesc = description || (hasContent ? 'Bilingual game generated from Irish & English curriculum factfiles' : 'Bilingual Jeopardy game ready for classroom interactive display.');

  return {
    id: 'game-demo-' + Date.now(),
    title: gameTitle,
    subject: subject || 'General Curriculum',
    description: gameDesc,
    sourceFiles: sourceFiles,
    fallbackUsed: true,
    generationSource: 'curriculum-engine',
    rounds: roundTemplates.slice(0, clampedRounds),
  };
}
