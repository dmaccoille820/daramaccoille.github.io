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
  // Form state
  const [gameTitle, setGameTitle] = useState('Digital Technology / Teicneolaíocht Dhigiteach');
  const [roundsCount, setRoundsCount] = useState<number>(2);
  const [irishFile, setIrishFile] = useState<File | null>(null);
  const [englishFile, setEnglishFile] = useState<File | null>(null);
  const [irishText, setIrishText] = useState('');
  const [englishText, setEnglishText] = useState('');
  const [customInstructions, setCustomInstructions] = useState(
    'Focus on Leaving Certificate and Junior Cycle Digital Technology, computer hardware, binary representations, networks and cybersecurity.'
  );
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [allowFallback, setAllowFallback] = useState(true);

  // Status & Progress
  const [loading, setLoading] = useState(false);
  const [progressStage, setProgressStage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [generatedGame, setGeneratedGame] = useState<JeopardyGame | null>(null);

  // Key tester state
  const [testingKey, setTestingKey] = useState(false);
  const [keyTestStatus, setKeyTestStatus] = useState<{
    ok?: boolean;
    message?: string;
    models?: string[];
  } | null>(null);

  // Pre-fill sample factfile content for Digital Technology teachers
  const handleLoadSampleFactfiles = () => {
    setGameTitle('Digital Technology: Systems & Data / Teicneolaíocht Dhigiteach');
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
    setLoading(true);

    try {
      setProgressStage(
        language === 'ga'
          ? '1/3: Ag próiseáil comhaid agus ag baint téacs amach...'
          : '1/3: Parsing Irish & English factfiles...'
      );

      const formData = new FormData();
      formData.append('gameTitle', gameTitle);
      formData.append('roundsCount', roundsCount.toString());
      formData.append('customInstructions', customInstructions);
      if (apiKey && !forceCurriculumEngine) formData.append('apiKey', apiKey);

      if (irishFile) formData.append('irishFile', irishFile);
      if (englishFile) formData.append('englishFile', englishFile);
      if (irishText) formData.append('irishText', irishText);
      if (englishText) formData.append('englishText', englishText);

      setProgressStage(
        language === 'ga'
          ? '2/3: Ag cruthú ceisteanna dátheangacha Jeopardy...'
          : '2/3: Generating aligned bilingual Jeopardy rounds & clues...'
      );

      const res = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${res.status}`);
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
      setError((err as Error).message);
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
              <h4 className="font-bold text-white text-base">
                {language === 'ga' ? 'Cluiche Nua Cruthaithe go hIontach!' : 'Bilingual Game Created Successfully!'}
              </h4>
              <p className="text-xs text-emerald-300/80">
                {generatedGame.title} • {generatedGame.rounds.length}{' '}
                {language === 'ga' ? 'babhta(í) réidh le himirt' : 'round(s) ready to play'}
              </p>
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

      {/* ERROR BANNER WITH QUICK FALLBACK BUTTON */}
      {error && (
        <div className="p-5 rounded-2xl bg-red-950/80 border-2 border-red-500/60 text-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl animate-pop-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs font-mono font-medium leading-relaxed">{error}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => executeGeneration(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-jeopardy-dark text-xs font-black uppercase tracking-wider shadow-gold-glow hover:scale-105 transition-all shrink-0 whitespace-nowrap"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Generate via Curriculum Engine</span>
          </button>
        </div>
      )}

      {/* UPLOAD FORM */}
      <form onSubmit={handleGenerate} className="flex flex-col gap-6">
        {/* Game Title & Rounds Setup */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-jeopardy-deep/90 p-5 rounded-2xl border border-blue-500/30">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-1.5">
              {language === 'ga' ? 'Teideal an Chluiche / Ábhar' : 'Game Title / Subject'}
            </label>
            <input
              type="text"
              required
              value={gameTitle}
              onChange={(e) => setGameTitle(e.target.value)}
              placeholder="e.g. Digital Technology / Teicneolaíocht Dhigiteach"
              className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-blue-500/40 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-yellow-400 transition-colors"
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
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-1">
              {language === 'ga'
                ? 'Treoracha Breise don Mhúinteoir (Roghnach)'
                : 'Curriculum Guidance / Custom Instructions'}
            </label>
            <input
              type="text"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g. Focus on memory, CPU registers, logic gates, and cybersecurity..."
              className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-blue-500/30 text-white placeholder-slate-400 text-xs focus:outline-none"
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
            <div className="mt-2 flex flex-col gap-2 p-3 bg-black/50 rounded-xl border border-blue-500/30 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste Gemini API Key (or leave blank to use GEMINI_API_KEY from Vercel)"
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

        {/* SUBMIT BUTTON WITH LIVE PROGRESS */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="submit"
            disabled={loading || (!irishFile && !irishText && !englishFile && !englishText)}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl font-jeopardy text-lg sm:text-xl font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-jeopardy-dark shadow-gold-glow hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
          >
            <Sparkles className="w-6 h-6 animate-pulse" />
            <span>
              {loading
                ? language === 'ga'
                  ? 'Ag Cruthú Ceisteanna...'
                  : 'Generating Questions...'
                : language === 'ga'
                ? 'Cruthaigh Cluiche Dátheangach'
                : 'Generate Bilingual Jeopardy'}
            </span>
          </button>

          {loading && progressStage && (
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-300 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>{progressStage}</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
