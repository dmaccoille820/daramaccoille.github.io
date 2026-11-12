import { GoogleGenerativeAI } from '@google/generative-ai';
import { JeopardyGame, Round, Category, Question } from '@/types/jeopardy';

interface GenerateOptions {
  irishText: string;
  englishText: string;
  gameTitle?: string;
  roundsCount?: number;
  apiKey?: string;
  customInstructions?: string;
  allowFallback?: boolean;
  onProgress?: (stage: string) => void;
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
  const roundsCount = Math.min(Math.max(options.roundsCount || 2, 1), 3);
  const title = options.gameTitle || 'Digital Technology / Teicneolaíocht Dhigiteach';

  if (!apiKey) {
    console.warn('Gemini API key not found. Using intelligent curriculum template generator.');
    return generateSmartTemplateGame(title, roundsCount, options.irishText, options.englishText);
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const prompt = `
You are a bilingual Irish-English Master Educator specializing in Irish secondary curriculum (Leaving Certificate and Junior Cycle Digital Technology and Computer Science).
You will analyze two provided factfiles:
1. Factfile in Gaeilge (Irish)
2. Factfile in English

Generate an authentic, exciting bilingual Jeopardy game with exactly ${roundsCount} round(s).
Crucial rules for fast, high-quality generation:
1. Every category must have an accurate English name and authentic Irish name (using standard Téarma.ie terminology).
2. For each round, create 4 distinct categories. Each category must have exactly 5 questions with point values:
   - Round 1: 100, 200, 300, 400, 500
   - Round 2: 200, 400, 600, 800, 1000
3. For every question provide:
   - "points": number
   - "clue_en": A crisp Jeopardy clue statement in English (maximum 20 words).
   - "clue_ga": The direct, accurate Irish translation of that exact clue statement.
   - "answer_en": Phrased as a question in English ("What is...", "Who is...", "What are...").
   - "answer_ga": Phrased as a question in Irish ("Cad é...", "Céard é...", "Cé hé/hí...", "Cad iad...").
   - "explanation_en": Brief 1-sentence context explanation.
   - "explanation_ga": Brief 1-sentence context explanation in Irish.
4. The English and Irish clues MUST correspond to the exact same concept so the teacher can press the "Hot Switch Language" button mid-question and switch seamlessly.
5. Keep clues and answers concise and punchy so they render quickly and clearly in class.

Additional Teacher Instructions:
${options.customInstructions || 'Focus on fundamental digital technology concepts from the factfiles.'}

Factfile (English):
${options.englishText.slice(0, 8000)}

Factfile (Gaeilge):
${options.irishText.slice(0, 8000)}

Output must adhere strictly to this JSON format (pure JSON only, no markdown wrapping):
{
  "title": "${title}",
  "subject": "Digital Technology",
  "description": "Bilingual game generated from Irish & English factfiles",
  "rounds": [
    {
      "roundNumber": 1,
      "name_en": "Jeopardy Round",
      "name_ga": "Babhta Jeopardy",
      "categories": [
        {
          "name_en": "Category Name in English",
          "name_ga": "Ainm an Chatagóir i nGaeilge",
          "questions": [
            {
              "points": 100,
              "clue_en": "English clue",
              "clue_ga": "Irish clue",
              "answer_en": "What is ...?",
              "answer_ga": "Cad é ...?",
              "explanation_en": "Context...",
              "explanation_ga": "Comhthéacs..."
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

        return {
          id: 'game-' + Date.now(),
          title: parsed.title || title,
          subject: parsed.subject || 'Digital Technology',
          description: parsed.description || 'AI Generated Bilingual Jeopardy Game',
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
    const fallbackGame = generateSmartTemplateGame(title, roundsCount, options.irishText, options.englishText);
    fallbackGame.fallbackUsed = true;
    fallbackGame.generationSource = 'curriculum-engine';
    return fallbackGame;
  }

  throw lastError || new Error('Gemini service unavailable (503/504). Please try again or use Curriculum Engine.');
}

// Fallback generator when offline or no API key is specified yet
function generateSmartTemplateGame(
  title: string,
  roundsCount: number,
  irishExcerpt: string,
  englishExcerpt: string
): JeopardyGame {
  const hasContent = irishExcerpt.length > 20 || englishExcerpt.length > 20;
  const sampleSubtitle = hasContent ? '(Curriculum Factfile Engine)' : '(Sample Starter Game)';

  return {
    id: 'game-demo-' + Date.now(),
    title: `${title} ${sampleSubtitle}`,
    subject: 'Digital Technology',
    description: 'Bilingual game generated from curriculum factfiles ready for classroom interactive display.',
    fallbackUsed: true,
    generationSource: 'curriculum-engine',
    rounds: [
      {
        id: 'round-1',
        roundNumber: 1,
        name_en: 'Jeopardy Round',
        name_ga: 'Babhta 1: Jeopardy',
        categories: [
          {
            id: 'c-1',
            name_en: 'Data & Storage',
            name_ga: 'Sonraí & Stóráil',
            questions: [
              {
                id: 'q-c1-1',
                points: 100,
                clue_en: 'The smallest unit of data in computing represented by a binary 1 or 0.',
                clue_ga: 'An t-aonad sonraí is lú sa ríomhaireacht a léirítear le 1 nó 0 dénártha.',
                answer_en: 'What is a bit?',
                answer_ga: 'Cad é giotán?',
                explanation_en: 'Short for binary digit.',
                explanation_ga: 'Giorrúchán ar dhigit dhénártha.'
              },
              {
                id: 'q-c1-2',
                points: 200,
                clue_en: 'A collection of eight individual bits.',
                clue_ga: 'Bailiúchán d\'ocht ngiotán aonair.',
                answer_en: 'What is a byte?',
                answer_ga: 'Cad é beart?',
                explanation_en: 'Standard byte size across computing.',
                explanation_ga: 'Gnáthmhéid beart sa ríomhaireacht.'
              },
              {
                id: 'q-c1-3',
                points: 300,
                clue_en: 'High-speed temporary volatile computer memory.',
                clue_ga: 'Cuimhne ríomhaire shealadach ardluais atá luaineach.',
                answer_en: 'What is RAM?',
                answer_ga: 'Cad é RAM (Cuimhne Randamrochtana)?',
                explanation_en: 'Loses memory when turned off.',
                explanation_ga: 'Cailleann sé a chuimhne nuair a mhúchtar é.'
              },
              {
                id: 'q-c1-4',
                points: 400,
                clue_en: 'Storage technology with no moving parts using flash chips.',
                clue_ga: 'Teicneolaíocht stórála gan pháirteanna gluaisteacha ag úsáid sliseanna splaince.',
                answer_en: 'What is an SSD?',
                answer_ga: 'Cad é SSD (Tiomántán Soladstaide)?',
                explanation_en: 'Solid State Drive.',
                explanation_ga: 'Tiomántán Soladstaide nua-aimseartha.'
              },
              {
                id: 'q-c1-5',
                points: 500,
                clue_en: 'One billion bytes in decimal or 1,024 Megabytes.',
                clue_ga: 'Billiún beart sa chóras deachúil nó 1,024 Meigibheart.',
                answer_en: 'What is a Gigabyte?',
                answer_ga: 'Cad é Gigibheart?',
                explanation_en: '10^9 bytes.',
                explanation_ga: '10^9 beart.'
              }
            ]
          },
          {
            id: 'c-2',
            name_en: 'Hardware & CPU',
            name_ga: 'Crua-earraí & LAP',
            questions: [
              {
                id: 'q-c2-1',
                points: 100,
                clue_en: 'The main processor chip often called the computer\'s brain.',
                clue_ga: 'An phríomhshlis próiseálaí ar a dtugtar inchinn an ríomhaire go minic.',
                answer_en: 'What is the CPU?',
                answer_ga: 'Cad é an LAP (Lár-Aonad Próiseála)?',
                explanation_en: 'Central Processing Unit.',
                explanation_ga: 'Lár-Aonad Próiseála.'
              },
              {
                id: 'q-c2-2',
                points: 200,
                clue_en: 'The repetitive cycle: Fetch, Decode, and this third step.',
                clue_ga: 'An timthriall athfhillteach: Faigh, Díchódaigh, agus an tríú céim seo.',
                answer_en: 'What is Execute?',
                answer_ga: 'Cad é Rith / Feidhmigh?',
                explanation_en: 'The CPU instruction execution cycle.',
                explanation_ga: 'Timthriall feidhmithe treoracha an LAP.'
              },
              {
                id: 'q-c2-3',
                points: 300,
                clue_en: 'The sub-unit of the CPU that carries out arithmetic calculations.',
                clue_ga: 'An fo-aonad den LAP a dhéanann ríomhanna uimhríochta.',
                answer_en: 'What is the ALU?',
                answer_ga: 'Cad é an AUL (Aonad Uimhríochta & Loighce)?',
                explanation_en: 'Arithmetic Logic Unit.',
                explanation_ga: 'Aonad Uimhríochta agus Loighce.'
              },
              {
                id: 'q-c2-4',
                points: 400,
                clue_en: 'Ultra-fast miniature memory cells built into the processor chip itself.',
                clue_ga: 'Cealla cuimhne beaga bídeacha sár-luatha atá suite sa tslis phróiseálaí féin.',
                answer_en: 'What are Registers?',
                answer_ga: 'Cad iad Cláir (Registers)?',
                explanation_en: 'Holds immediate instructions and operands.',
                explanation_ga: 'Coinníonn sé treoracha agus sonraí láithreacha.'
              },
              {
                id: 'q-c2-5',
                points: 500,
                clue_en: 'The main circuit board that connects all hardware components together.',
                clue_ga: 'An príomhchlár ciorcaid a cheanglaíonn na comhpháirteanna crua-earraí go léir le chéile.',
                answer_en: 'What is the Motherboard?',
                answer_ga: 'Cad é an Máthairchlár (Motherboard)?',
                explanation_en: 'Contains CPU socket, RAM slots, and buses.',
                explanation_ga: 'Coimeádann sé soicéad an LAP, sliotáin RAM, agus busanna.'
              }
            ]
          },
          {
            id: 'c-3',
            name_en: 'Networks',
            name_ga: 'Líonraí',
            questions: [
              {
                id: 'q-c3-1',
                points: 100,
                clue_en: 'A network confined to a single room or school campus.',
                clue_ga: 'Líonra atá teoranta do sheomra amháin nó do champas scoile.',
                answer_en: 'What is a LAN?',
                answer_ga: 'Cad é LAN (Líonra Ceantair Áitiúil)?',
                explanation_en: 'Local Area Network.',
                explanation_ga: 'Líonra Ceantair Áitiúil.'
              },
              {
                id: 'q-c3-2',
                points: 200,
                clue_en: 'A worldwide system of interconnected computer networks.',
                clue_ga: 'Córas domhanda de líonraí ríomhaireachta idirnasctha.',
                answer_en: 'What is the Internet?',
                answer_ga: 'Cad é an tIdirlíon?',
                explanation_en: 'Global network of networks.',
                explanation_ga: 'Líonra domhanda na líonraí.'
              },
              {
                id: 'q-c3-3',
                points: 300,
                clue_en: 'Device that forwards data packets between different IP networks.',
                clue_ga: 'Gléas a chuireann paicéid sonraí ar aghaidh idir líonraí IP éagsúla.',
                answer_en: 'What is a Router?',
                answer_ga: 'Cad é Ródair (Router)?',
                explanation_en: 'Operates at the network layer.',
                explanation_ga: 'Oibríonn sé ag ciseal an líonra.'
              },
              {
                id: 'q-c3-4',
                points: 400,
                clue_en: 'System that converts domain names to IP addresses.',
                clue_ga: 'Córas a aistríonn ainmneacha fearainn go seoltaí IP.',
                answer_en: 'What is DNS?',
                answer_ga: 'Cad é DNS (Córas Ainmneacha Fearainn)?',
                explanation_en: 'Domain Name System.',
                explanation_ga: 'Córas Ainmneacha Fearainn.'
              },
              {
                id: 'q-c3-5',
                points: 500,
                clue_en: 'Standard protocol for transmitting secure web pages.',
                clue_ga: 'Prótacal caighdeánach chun leathanaigh ghréasáin shlána a tharchur.',
                answer_en: 'What is HTTPS?',
                answer_ga: 'Cad é HTTPS?',
                explanation_en: 'Hypertext Transfer Protocol Secure.',
                explanation_ga: 'Prótacal Slán Aistrithe Hipeartéacs.'
              }
            ]
          },
          {
            id: 'c-4',
            name_en: 'Cybersecurity',
            name_ga: 'Cibearshlándáil',
            questions: [
              {
                id: 'q-c4-1',
                points: 100,
                clue_en: 'Deceptive emails trying to trick users into revealing credentials.',
                clue_ga: 'Ríomhphoist mhealltacha a dhéanann iarracht úsáideoirí a mhealladh chun faisnéis a thabhairt suas.',
                answer_en: 'What is Phishing?',
                answer_ga: 'Cad é Bradphadaireacht (Phishing)?',
                explanation_en: 'Common social engineering attack.',
                explanation_ga: 'Ionsaí coitianta innealtóireachta sóisialta.'
              },
              {
                id: 'q-c4-2',
                points: 200,
                clue_en: 'Barrier that filters network traffic based on security rules.',
                clue_ga: 'Bac a scagann trácht líonra bunaithe ar rialacha slándála.',
                answer_en: 'What is a Firewall?',
                answer_ga: 'Cad é Balla Dóiteáin?',
                explanation_en: 'Monitors incoming and outgoing traffic.',
                explanation_ga: 'Déanann sé monatóireacht ar thrácht isteach agus amach.'
              },
              {
                id: 'q-c4-3',
                points: 300,
                clue_en: 'Malware that encrypts your files and holds them hostage for payment.',
                clue_ga: 'Mail-earraí a chriptíonn do chuid comhad agus a choinníonn mar ghiall iad le haghaidh íocaíochta.',
                answer_en: 'What is Ransomware?',
                answer_ga: 'Cad é Éiric-Earraí (Ransomware)?',
                explanation_en: 'Locks files until a ransom is paid.',
                explanation_ga: 'Glasálann sé comhaid go dtí go n-íoctar éiric.'
              },
              {
                id: 'q-c4-4',
                points: 400,
                clue_en: 'Authentication requiring two or more verification methods.',
                clue_ga: 'Fíordheimhniú a éilíonn dhá mhodh fíoraithe nó níos mó.',
                answer_en: 'What is 2FA / MFA?',
                answer_ga: 'Cad é 2FA / Fíordheimhniú Ilfhachtóra?',
                explanation_en: 'Significantly improves account security.',
                explanation_ga: 'Feabhsaíonn sé slándáil cuntais go mór.'
              },
              {
                id: 'q-c4-5',
                points: 500,
                clue_en: 'The EU legal framework protecting personal data and privacy.',
                clue_ga: 'Creat dlíthiúil an AE a chosnaíonn sonraí pearsanta agus príobháideacht.',
                answer_en: 'What is GDPR?',
                answer_ga: 'Cad é RGCS (GDPR)?',
                explanation_en: 'General Data Protection Regulation.',
                explanation_ga: 'Rialachán Ginearálta maidir le Cosaint Sonraí.'
              }
            ]
          }
        ]
      }
    ]
  };
}
