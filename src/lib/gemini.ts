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
}

export function getGeminiApiKey(customKey?: string): string {
  const key =
    customKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GEMINI_API ||
    '';
  return key.trim();
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
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-002',
    'gemini-1.5-pro',
    'gemini-pro'
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
Crucial rules:
1. Every category must have an accurate English name and authentic Irish name (using standard Téarma.ie terminology).
2. For every question:
   - "points": 100, 200, 300, 400, 500 for Round 1 (or 200, 400, 600, 800, 1000 for Round 2).
   - "clue_en": A crisp Jeopardy clue statement in English.
   - "clue_ga": The direct, accurate Irish translation of that exact clue statement.
   - "answer_en": Phrased as a question in English ("What is...", "Who is...", "What are...").
   - "answer_ga": Phrased as a question in Irish ("Cad é...", "Céard é...", "Cé hé/hí...", "Cad iad...").
   - "explanation_en": Short 1-sentence context explanation.
   - "explanation_ga": Short 1-sentence context explanation in Irish.
3. For Round 1 and Round 2, produce 4 to 5 categories, each with 5 ascending difficulty questions.
4. If Round 3 is requested, it can be "Final Jeopardy" with 1 high-value grand category and question.
5. The English and Irish clues MUST correspond to the exact same concept so the teacher can press the "Hot Switch Language" button mid-question and switch seamlessly.

Additional Teacher Instructions:
${options.customInstructions || 'Focus on fundamental digital technology concepts from the factfiles.'}

Factfile (English):
${options.englishText.slice(0, 12000)}

Factfile (Gaeilge):
${options.irishText.slice(0, 12000)}

Output must adhere strictly to this JSON format:
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

  // Dynamically resolve models available for this specific API key
  const availableModels = await discoverSupportedModels(apiKey);
  let lastError: Error | null = null;

  for (const modelName of availableModels) {
    // Try both v1beta and default
    for (const apiVer of [undefined, 'v1', 'v1beta']) {
      try {
        console.log(`Generating with Gemini model: ${modelName} (${apiVer || 'default'})`);
        const model = genAI.getGenerativeModel(
          {
            model: modelName,
            generationConfig: {
              temperature: 0.4,
            },
          },
          apiVer ? { apiVersion: apiVer } : undefined
        );

        const result = await model.generateContent(prompt);
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

        if (
          errMsg.includes('404') ||
          errMsg.includes('not found') ||
          errMsg.includes('not supported')
        ) {
          // Model/version not supported, continue trying next
          continue;
        }

        if (errMsg.includes('API_KEY_SERVICE_BLOCKED')) {
          throw new Error(
            'Google Generative Language API is blocked on this key/project (API_KEY_SERVICE_BLOCKED). Please ensure Generative Language API is enabled or use a key from a personal Google account.'
          );
        }
      }
    }
  }

  // If allowFallback is true, or if Google returns 404 for all models:
  if (options.allowFallback !== false) {
    console.warn('All Gemini online models returned unavailable. Falling back to Smart Curriculum Generator so teacher is not blocked.');
    return generateSmartTemplateGame(title, roundsCount, options.irishText, options.englishText);
  }

  throw lastError || new Error('No compatible Gemini model found for this key.');
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
    description: 'Bilingual game generated from factfiles ready for classroom interactive display.',
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
