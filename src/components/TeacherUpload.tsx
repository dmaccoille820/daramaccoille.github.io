'use client';

import React, { useState } from 'react';
import { JeopardyGame, Language } from '@/types/jeopardy';
import {
  UploadCloud,
  FileText,
  Sparkles,
  Database,
  CheckCircle2,
  AlertCircle,
  Play,
  Key,
  Layers,
  HelpCircle,
  BookOpen,
  Check,
  RefreshCw,
  Zap
} from 'lucide-react';

interface TeacherUploadProps {
  onGameCreated: (game: JeopardyGame) => void;
  language: Language;
  isDbConnected: boolean;
}

export const TeacherUpload: React.FC<TeacherUploadProps> = ({
  onGameCreated,
  language,
  isDbConnected,
}) => {
  // Form state — start empty so teacher enters their own topic
  const [gameTitle, setGameTitle] = useState('');
  const [gameDescription, setGameDescription] = useState('');
  const [roundsCount, setRoundsCount] = useState<number>(3);
  const [irishFile, setIrishFile] = useState<File | null>(null);
  const [englishFile, setEnglishFile] = useState<File | null>(null);
  const [irishText, setIrishText] = useState('');
  const [englishText, setEnglishText] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [allowFallback, setAllowFallback] = useState(true);

  // Load saved API key from localStorage on mount
  React.useEffect(() => {
    try {
      const savedKey = localStorage.getItem('jeopardy_gemini_api_key');
      if (savedKey) {
        setApiKey(savedKey);
        setShowApiKeyInput(true);
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    try {
      if (val.trim()) {
        localStorage.setItem('jeopardy_gemini_api_key', val.trim());
      } else {
        localStorage.removeItem('jeopardy_gemini_api_key');
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  };

  // Status & Progress
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [progressStage, setProgressStage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isTimeoutOrOverloadError, setIsTimeoutOrOverloadError] = useState(false);
  const [generatedGame, setGeneratedGame] = useState<JeopardyGame | null>(null);

  // Key tester state
  const [testingKey, setTestingKey] = useState(false);
  const [keyTestStatus, setKeyTestStatus] = useState<{
    ok?: boolean;
    message?: string;
    models?: string[];
  } | null>(null);

  // Live timer and dynamic stage transitions during generation
  React.useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (loading) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          if (next === 3) {
            setProgressStage(
              language === 'ga'
                ? '2/3: Ag glaoch ar Gemini Flash & ag ailíniú ceisteanna...'
                : '2/3: Communicating with Gemini Flash & generating bilingual clues...'
            );
          } else if (next === 10) {
            setProgressStage(
              language === 'ga'
                ? '2/3: Gemini ag próiseáil (cúltaca uathoibríoch ar fáil má bhíonn moill)...'
                : '2/3: Gemini processing (automatic exponential backoff active if congested)...'
            );
          } else if (next === 20) {
            setProgressStage(
              language === 'ga'
                ? '2/3: Ag seiceáil freagairt Gemini roimh an sprioc-am...'
                : '2/3: Finalizing Gemini generation before gateway timeout window...'
            );
          }
          return next;
        });
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [loading, language]);

  // Pre-fill sample factfile content for Digital Technology teachers
  const handleLoadSampleFactfiles = () => {
    setGameTitle('Digital Technology: Systems & Data / Teicneolaíocht Dhigiteach');
    setGameDescription('Junior Cycle & Leaving Certificate Digital Technology: Computer architecture, storage units, logic gates, and cybersecurity.');
    setCustomInstructions('Focus on Leaving Certificate Digital Technology terminology, CPU registers, logic gates, von Neumann architecture, and networking.');
    setIrishText(`TEICNEOLAÍOCHT DHIGITEACH - BILEOG FÍRICÍ
1. Aonaid Stórála Sonraí:
Is é an giotán (bit) an t-aonad stórála sonraí is lú, agus ní féidir leis ach luach 0 nó 1 a choinneáil. Cruthaíonn ocht ngiotán beart (byte) amháin. Tá 1,024 Meigibheart i nGigibheart (GB) amháin. Is cuimhne phríomhúil luaineach í RAM (Cuimhne Randamrochtana) a chailleann a chuid sonraí nuair a mhúchtar an chumhacht. Úsáideann tiomántáin soladstaide (SSDanna) sliseanna splaince gan aon pháirteanna gluaisteacha, rud a fhágann go bhfuil siad i bhfad níos tapúla ná gnáthdhioscaí crua (HDDanna).

2. Bunús Dénártha agus Geataí Loighce:
Úsáideann an córas dénártha bun 2 (0 agus 1). Is féidir 8 luach ar leith a léiriú le 3 ghiotán (2^3 = 8). Is é 10 luach deachúil an uimhir dhénártha 00001010. Ní tháirgeann geata AGUS (AND gate) 1 ach amháin nuair atá an dá ionchur cothrom le 1. Úsáideann an córas heicsidheachúil bun 16 (0-9 agus A-F).

3. Ailtireacht an Ríomhaire:
Is é an LAP (Lár-Aonad Próiseála) inchinn an ríomhaire. Feidhmíonn sé an timthriall Faigh-Díchódaigh-Rith (Fetch-Decode-Execute). Is é an tAonad Uimhríochta agus Loighce (AUL) a dhéanann na hoibríochtaí uimhríochta go léir. Is suíomhanna cuimhne beaga sár-luatha taobh istigh den LAP iad na Cláir (Registers). Mhol John von Neumann an ailtireacht ina stóráiltear sonraí agus cláir le chéile sa chuimhne chéanna.`);

    setEnglishText(`DIGITAL TECHNOLOGY - FACTFILE
1. Data Storage Units:
A bit is the smallest unit of data storage, holding only a 0 or 1. Eight bits grouped together form a byte. There are 1,024 Megabytes in one Gigabyte (GB). RAM (Random Access Memory) is volatile primary memory that loses its contents when powered down. Solid State Drives (SSDs) use flash memory chips with no moving parts, making them vastly faster than traditional mechanical Hard Disk Drives (HDDs).

2. Binary Basics & Logic Gates:
The binary system uses base 2 (0 and 1). With 3 bits, exactly 8 distinct values can be represented (2^3 = 8). The binary number 00001010 equals 10 in denary/decimal. An AND gate outputs 1 only when both of its inputs are 1. The hexadecimal system uses base 16 (0-9 and A-F).

3. Computer Architecture:
The CPU (Central Processing Unit) is the computer's brain. It executes instructions through the Fetch-Decode-Execute cycle. The Arithmetic Logic Unit (ALU) performs all math and logic comparisons. Registers are small, ultra-fast memory locations inside the CPU. John von Neumann proposed the architecture where programs and data reside in the same memory.`);
  };

  const handleTestKey = async () => {
    setTestingKey(true);
    setKeyTestStatus(null);
    try {
      const res = await fetch('/api/gemini-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      if (data.ok) {
        const modelNames = (data.models || []).map((m: { name: string }) => m.name);
        setKeyTestStatus({
          ok: true,
          message: `Connected! Google returned ${modelNames.length} supported models: ${modelNames.slice(0, 3).join(', ')}...`,
          models: modelNames,
        });
      } else {
        setKeyTestStatus({
          ok: false,
          message: data.error || 'Key check failed',
        });
      }
    } catch (e) {
      setKeyTestStatus({ ok: false, message: (e as Error).message });
    } finally {
      setTestingKey(false);
    }
  };

  const executeGeneration = async (forceCurriculumEngine = false) => {
    setError(null);
    setIsTimeoutOrOverloadError(false);
    setLoading(true);

    try {
      setProgressStage(
        language === 'ga'
          ? '1/3: Ag próiseáil comhaid agus ag baint téacs amach...'
          : '1/3: Parsing Irish & English factfiles...'
      );

      const formData = new FormData();
      formData.append('gameTitle', gameTitle.trim() || 'Bilingual Jeopardy / Jeopardy Dátheangach');
      formData.append('gameDescription', gameDescription.trim());
      formData.append('roundsCount', roundsCount.toString());
      formData.append('customInstructions', customInstructions.trim());
      if (forceCurriculumEngine) {
        formData.append('forceCurriculumEngine', 'true');
      } else if (apiKey) {
        formData.append('apiKey', apiKey);
      }

      if (irishFile) formData.append('irishFile', irishFile);
      if (englishFile) formData.append('englishFile', englishFile);
      if (irishText) formData.append('irishText', irishText);
      if (englishText) formData.append('englishText', englishText);

      setProgressStage(
        forceCurriculumEngine
          ? (language === 'ga' ? '2/3: Inneall Curaclaim ag ailíniú ceisteanna...' : '2/3: Curriculum Engine assembling factfile questions...')
          : (language === 'ga' ? '2/3: Ag glaoch ar Gemini Flash (cúltaca uathoibríoch ar 503/504)...' : '2/3: Generating bilingual clues with Gemini Flash (automatic backoff on 503/504)...')
      );

      const res = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const status = res.status;
        const msg = errData.error || (status === 504 ? 'Gateway Timeout (504): Gemini generation exceeded proxy limit' : status === 503 ? 'Service Unavailable (503): Gemini model is temporarily overloaded' : `Server responded with status ${status}`);
        if (status === 503 || status === 504 || msg.includes('503') || msg.includes('504') || msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('overloaded')) {
          setIsTimeoutOrOverloadError(true);
        }
        throw new Error(msg);
      }

      setProgressStage(
        language === 'ga'
          ? '3/3: Ag stóráil i mbunachar sonraí Neon...'
          : '3/3: Saving bilingual game to Neon database...'
      );

      const data = await res.json();
      if (!data.success || !data.game) {
        throw new Error(data.error || 'Failed to generate game');
      }

      setGeneratedGame(data.game);
      onGameCreated(data.game);
    } catch (err) {
      console.error(err);
      const errMsg = (err as Error).message || '';
      if (errMsg.includes('503') || errMsg.includes('504') || errMsg.toLowerCase().includes('timeout') || errMsg.toLowerCase().includes('overloaded')) {
        setIsTimeoutOrOverloadError(true);
      }
      if (errMsg.includes('API_KEY') || errMsg.includes('blocked') || errMsg.includes('key') || errMsg.includes('403') || errMsg.includes('unauthorized')) {
        setShowApiKeyInput(true);
      }
      setError(errMsg);
    } finally {
      setLoading(false);
      setProgressStage('');
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    executeGeneration(false);
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-[#050c77] to-indigo-950 p-6 rounded-3xl border-2 border-blue-500/40 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </span>
            <h2 className="font-jeopardy text-xl sm:text-2xl uppercase tracking-wider text-white">
              {language === 'ga' ? 'Uaslódáil Bileoga Fíricí do Mhúinteoirí' : 'Teacher Factfile AI Studio'}
            </h2>
          </div>
          <p className="text-sm text-blue-200/80 max-w-xl">
            {language === 'ga'
              ? 'Uaslódáil PDF Gaeilge agus a aistriúchán díreach i mBéarla. Cruthóidh an córas sraith iomlán de chatagóirí Jeopardy dátheangacha le stóráil i Neon DB.'
              : 'Upload an Irish PDF factfile and its direct English translation. Gemini AI generates aligned bilingual Jeopardy categories ready for hot-switch classroom play.'}
          </p>
        </div>

        {/* Preload Sample button */}
        <button
          type="button"
          onClick={handleLoadSampleFactfiles}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-400/40 text-xs font-bold transition-all shadow-md hover:scale-105 shrink-0"
        >
          <BookOpen className="w-4 h-4 text-amber-300" />
          <span>{language === 'ga' ? 'Luchtaigh Sonraí Samplacha' : 'Load Sample Factfile'}</span>
        </button>
      </div>

      {/* SUCCESS BANNER AFTER GENERATION */}
      {generatedGame && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950 via-blue-950 to-emerald-950 border-2 border-emerald-400 text-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl animate-pop-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-base">
                  {language === 'ga' ? 'Cluiche Nua Cruthaithe go hIontach!' : 'Bilingual Game Created Successfully!'}
                </h4>
                {generatedGame.fallbackUsed ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    Curriculum Engine Mode
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Gemini AI Generated
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-300/80">
                {generatedGame.title} • {generatedGame.rounds.length}{' '}
                {language === 'ga' ? 'babhta(í) réidh le himirt' : 'round(s) ready to play'}
                {generatedGame.sourceFiles && generatedGame.sourceFiles.length > 0 && (
                  <span>
                    {' '}• {generatedGame.sourceFiles.length}{' '}
                    {language === 'ga' ? 'comhad foinse stóráilte i Neon' : 'source file(s) saved in Neon'}
                  </span>
                )}
              </p>
              {generatedGame.fallbackUsed && (
                <p className="text-[11px] text-amber-300/90 mt-1 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-400/30">
                  {language === 'ga'
                    ? 'ℹ️ Gineadh an cluiche seo le hInneall an Churaclaim (Mód Neamhlíne). Chun réasúnaíocht Gemini & aistriúcháin fhíorúla a úsáid, cuir eochair phearsanta Gemini API isteach thíos.'
                    : 'ℹ️ Generated via offline Curriculum Engine (Gemini API was not reached). To generate authentic bilingual clues and deep reasoning, enter your personal Gemini API key below.'}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => onGameCreated(generatedGame)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-jeopardy-dark font-jeopardy text-base font-black uppercase tracking-wider shadow-gold-glow hover:scale-105 transition-all shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{language === 'ga' ? 'Imir Anois' : 'Launch Game'}</span>
          </button>
        </div>
      )}

      {/* ERROR BANNER WITH SPECIFIC 503/504 BACKOFF & FALLBACK CONTROLS */}
      {error && (
        <div className="p-5 rounded-2xl bg-red-950/90 border-2 border-red-500/70 text-red-100 flex flex-col gap-3 shadow-2xl animate-pop-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm text-white">
                  {isTimeoutOrOverloadError
                    ? (language === 'ga' ? 'Gemini Gnóthach nó Moill (503/504)' : 'Gemini AI Overloaded or Timed Out (503/504)')
                    : (language === 'ga' ? 'Earráid Ghiniúna' : 'Generation Error')}
                </span>
                {isTimeoutOrOverloadError && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/30 text-amber-200 border border-amber-400/50">
                    Transient AI Traffic Spike
                  </span>
                )}
              </div>
              <div className="text-xs font-mono text-red-200/90 leading-relaxed mb-2">
                {error}
              </div>
              <p className="text-xs text-amber-200/90">
                {isTimeoutOrOverloadError
                  ? 'The Gemini service is experiencing high traffic or took longer than the serverless timeout. You can retry with exponential backoff, or generate instantly using the built-in Curriculum Engine with your factfiles.'
                  : 'You can retry or generate immediately with the built-in Curriculum Engine.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-red-500/20">
            <button
              type="button"
              onClick={() => executeGeneration(false)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-900/80 hover:bg-blue-800 text-blue-200 text-xs font-bold border border-blue-400/40 transition-all hover:scale-105"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Gemini (with Backoff)</span>
            </button>

            <button
              type="button"
              onClick={() => executeGeneration(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-jeopardy-dark text-xs font-black uppercase tracking-wider shadow-gold-glow hover:scale-105 transition-all whitespace-nowrap"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>⚡ Generate Instantly (Curriculum Engine)</span>
            </button>
          </div>
        </div>
      )}

      {/* UPLOAD FORM */}
      <form onSubmit={handleGenerate} className="flex flex-col gap-6">
        {/* Game Title, Description & Rounds Setup */}
        <div className="flex flex-col gap-4 bg-jeopardy-deep/90 p-5 rounded-2xl border border-blue-500/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-1.5 flex items-center justify-between">
                <span>{language === 'ga' ? 'Teideal an Chluiche / Ábhar' : 'Game Title / Subject'}</span>
                <span className="text-[10px] text-amber-300 font-semibold">{language === 'ga' ? 'Riachtanach' : 'Required'}</span>
              </label>
              <input
                type="text"
                required
                value={gameTitle}
                onChange={(e) => setGameTitle(e.target.value)}
                placeholder={language === 'ga' ? 'M.sh. Stair: Éirí Amach 1916 / Eolaíocht: Géineolaíocht / Teicneolaíocht Dhigiteach' : 'e.g. Science: Genetics / History: 1916 Rising / Digital Technology'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-blue-500/40 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-yellow-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'ga' ? 'Líon na mBabhtaí (Uas. 3)' : 'Rounds (Max 3)'}</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((num) => (
                  <button
                    type="button"
                    key={num}
                    onClick={() => setRoundsCount(num)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      roundsCount === num
                        ? 'bg-amber-500 text-jeopardy-dark shadow-gold-glow'
                        : 'bg-blue-950/50 hover:bg-blue-900/50 text-blue-200 border border-blue-500/30'
                    }`}
                  >
                    {num} {num === 1 ? 'Round' : 'Rounds'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-1.5 flex items-center justify-between">
              <span>{language === 'ga' ? 'Cur Síos ar an gCluiche (Roghnach)' : 'Game Description (Optional)'}</span>
              <span className="text-[10px] text-blue-300/60 font-normal">
                {language === 'ga' ? 'Taispeánfar é i Mo Leabharlann' : 'Shown in My Games Library'}
              </span>
            </label>
            <input
              type="text"
              value={gameDescription}
              onChange={(e) => setGameDescription(e.target.value)}
              placeholder={language === 'ga' ? 'M.sh. Athbhreithniú don Ardteist ar phríomhchoincheapa, sainmhínithe agus foclóir' : 'e.g. Leaving Cert exam revision covering key concepts, vocabulary and case studies'}
              className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-blue-500/30 text-white placeholder-slate-400 text-xs focus:outline-none focus:border-yellow-400/80 transition-colors"
            />
          </div>
        </div>

        {/* 2 Flexible Creation Pathways Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-start gap-2.5">
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold font-mono text-[10px] shrink-0 mt-0.5">
              {language === 'ga' ? 'MODH 1' : 'PATH 1'}
            </span>
            <p className="text-blue-200/90 leading-relaxed">
              <strong>{language === 'ga' ? 'Treoracha Lámhleabhair: ' : 'Manual Instructions: '}</strong>
              {language === 'ga'
                ? 'Ní theastaíonn PDF! Cuir isteach Teideal agus "Treoracha Breise" thíos chun cluiche nua a chruthú láithreach.'
                : 'No PDF needed! Enter a Title and "Curriculum Guidance" instructions below to generate a fresh game instantly.'}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-2.5">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold font-mono text-[10px] shrink-0 mt-0.5">
              {language === 'ga' ? 'MODH 2' : 'PATH 2'}
            </span>
            <p className="text-emerald-200/90 leading-relaxed">
              <strong>{language === 'ga' ? 'Uaslódáil Bileoga Fíricí: ' : 'Upload Factfiles: '}</strong>
              {language === 'ga'
                ? 'Uaslódáil PDF Gaeilge agus/nó Béarla. Bainfidh Gemini ceisteanna agus catagóirí díreach as do chuid comhad.'
                : 'Upload Irish and/or English PDFs. Gemini extracts aligned bilingual clues directly from your documents.'}
            </p>
          </div>
        </div>

        {/* 2 FACTFILE UPLOAD DROPZONES (IRISH & ENGLISH) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 1. IRISH FACTFILE ZONE */}
          <div className="bg-gradient-to-b from-emerald-950/40 via-blue-950/60 to-black p-5 rounded-2xl border-2 border-emerald-500/40 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🇮🇪</span>
                  <h3 className="font-jeopardy text-base font-bold uppercase tracking-wider text-emerald-200">
                    Bileog Fíricí Gaeilge (Irish PDF)
                  </h3>
                </div>
                <span className="text-[10px] font-mono bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                  GAEILGE
                </span>
              </div>

              {/* File upload input */}
              <label className="border-2 border-dashed border-emerald-500/30 hover:border-emerald-400 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bg-black/30 hover:bg-emerald-950/30 transition-all group mb-3">
                <FileText className="w-8 h-8 text-emerald-400/80 group-hover:scale-110 transition-transform mb-2" />
                <span className="text-xs font-bold text-white">
                  {irishFile ? irishFile.name : 'Roghnaigh comhad PDF Gaeilge'}
                </span>
                <span className="text-[11px] text-emerald-300/60 mt-1">
                  {irishFile
                    ? `${(irishFile.size / 1024).toFixed(1)} KB`
                    : 'Cliceáil nó tarraing PDF anseo'}
                </span>
                <input
                  type="file"
                  accept=".pdf,text/plain"
                  onChange={(e) => setIrishFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>

              {/* Text fallback / preview */}
              <textarea
                rows={4}
                value={irishText}
                onChange={(e) => setIrishText(e.target.value)}
                placeholder="Nó greamaigh téacs an bhileog fíricí i nGaeilge anseo..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-black/60 border border-emerald-500/30 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* 2. ENGLISH FACTFILE ZONE */}
          <div className="bg-gradient-to-b from-blue-950/60 via-[#050c77]/40 to-black p-5 rounded-2xl border-2 border-blue-500/40 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🇬🇧</span>
                  <h3 className="font-jeopardy text-base font-bold uppercase tracking-wider text-blue-100">
                    English Factfile (English PDF)
                  </h3>
                </div>
                <span className="text-[10px] font-mono bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                  ENGLISH
                </span>
              </div>

              {/* File upload input */}
              <label className="border-2 border-dashed border-blue-500/30 hover:border-blue-400 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bg-black/30 hover:bg-blue-950/40 transition-all group mb-3">
                <FileText className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform mb-2" />
                <span className="text-xs font-bold text-white">
                  {englishFile ? englishFile.name : 'Select English PDF Factfile'}
                </span>
                <span className="text-[11px] text-blue-300/60 mt-1">
                  {englishFile
                    ? `${(englishFile.size / 1024).toFixed(1)} KB`
                    : 'Click or drag translated PDF here'}
                </span>
                <input
                  type="file"
                  accept=".pdf,text/plain"
                  onChange={(e) => setEnglishFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>

              {/* Text fallback / preview */}
              <textarea
                rows={4}
                value={englishText}
                onChange={(e) => setEnglishText(e.target.value)}
                placeholder="Or paste the English factfile text here..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-black/60 border border-blue-500/30 text-white placeholder-slate-400 focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>
        </div>

        {/* Custom prompt instructions & Optional Gemini Key */}
        <div className="bg-jeopardy-deep/90 p-5 rounded-2xl border border-blue-500/30 flex flex-col gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-1 flex items-center justify-between">
              <span>{language === 'ga'
                ? 'Treoracha Breise don Mhúinteoir (Treoracha Lámhleabhair)'
                : 'Teacher Curriculum Guidance ("Treoracha Breise")'}</span>
              <span className="text-[10px] text-amber-300/80 font-normal">
                {language === 'ga' ? 'Curtha go díreach sa leid AI' : 'Injected directly into AI prompt'}
              </span>
            </label>
            <textarea
              rows={3}
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder={language === 'ga'
                ? 'M.sh. Dírigh ar théarmaíocht don Ardteist, sainmhínithe eochrach, cás-staidéir, ceisteanna níos dúshlánaí i mbabhta 3, etc.'
                : 'e.g. Focus on Leaving Certificate Higher Level syllabus, exam question formats, specific subtopics, case studies, or difficulty...'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-blue-500/30 text-white placeholder-slate-400 text-xs focus:outline-none focus:border-yellow-400 transition-colors"
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-blue-500/20">
            <button
              type="button"
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className="flex items-center gap-1.5 text-blue-300/80 hover:text-white"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>{showApiKeyInput ? 'Hide API Key Settings' : 'Configure / Test Gemini API Key'}</span>
            </button>

            <span className="text-[11px] text-blue-300/60">
              {isDbConnected ? '🟢 Neon DB Active (Auto-save enabled)' : '🟡 Local Mode (Neon DB not connected)'}
            </span>
          </div>

          {showApiKeyInput && (
            <div className="mt-2 flex flex-col gap-2 p-3.5 bg-black/50 rounded-xl border border-amber-500/40 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wide">
                  Gemini API Key (Google AI Studio)
                </span>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-amber-400 hover:text-amber-300 underline font-semibold"
                >
                  Get a free Gemini API key (Google AI Studio) ↗
                </a>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder="Paste your personal Gemini API key here (persists in your browser)"
                  className="flex-1 w-full px-3.5 py-2 rounded-xl bg-black/80 border border-amber-500/40 text-amber-200 placeholder-slate-500 text-xs focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={handleTestKey}
                  disabled={testingKey}
                  className="px-4 py-2 rounded-xl bg-blue-900/80 hover:bg-blue-800 text-blue-200 text-xs font-bold border border-blue-400/40 flex items-center gap-1.5 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingKey ? 'animate-spin' : ''}`} />
                  <span>Test Key</span>
                </button>
              </div>
              <p className="text-[10px] text-blue-200/70">
                Your key is stored securely in your browser and used directly for parallel AI clue generation with authentic Irish translations.
              </p>

              {keyTestStatus && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-mono flex items-start gap-2 ${
                    keyTestStatus.ok
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                      : 'bg-red-950/80 text-red-300 border border-red-500/40'
                  }`}
                >
                  {keyTestStatus.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <span>{keyTestStatus.message}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SUBMIT BUTTON WITH LIVE PROGRESS & TIME ELAPSED */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="submit"
            disabled={
              loading ||
              (!gameTitle.trim() &&
                !customInstructions.trim() &&
                !irishFile &&
                !irishText.trim() &&
                !englishFile &&
                !englishText.trim())
            }
            className="w-full sm:w-auto px-8 py-4 rounded-2xl font-jeopardy text-lg sm:text-xl font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-jeopardy-dark shadow-gold-glow hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
          >
            {loading ? (
              <RefreshCw className="w-6 h-6 animate-spin text-jeopardy-dark" />
            ) : (
              <Sparkles className="w-6 h-6 animate-pulse" />
            )}
            <span>
              {loading
                ? language === 'ga'
                  ? `Ag Cruthú Ceisteanna (${elapsedSeconds}s)...`
                  : `Generating Questions (${elapsedSeconds}s)...`
                : language === 'ga'
                ? 'Cruthaigh Cluiche Dátheangach'
                : 'Generate Bilingual Jeopardy'}
            </span>
          </button>

          {loading && (
            <div className="flex flex-col items-center gap-1.5 animate-fade-in text-center">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span>{progressStage}</span>
              </div>
              <span className="text-[11px] text-blue-300/70">
                {language === 'ga'
                  ? 'Uath-chúiteamh agus cúltaca ar fáil má bhíonn freastalaí Gemini gafa.'
                  : 'Automatic backoff and curriculum engine safety fallback active.'}
              </span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
