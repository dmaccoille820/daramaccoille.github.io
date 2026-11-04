'use client';

import React from 'react';
import { JeopardyGame, Language, Category, Question, Round } from '@/types/jeopardy';
import { soundEffects } from '@/lib/audio';
import { Award, Zap, ChevronRight, Layers } from 'lucide-react';

interface GameBoardProps {
  game: JeopardyGame;
  currentRoundNumber: number;
  onSelectRound: (roundNum: number) => void;
  language: Language;
  onSelectQuestion: (category: Category, question: Question) => void;
  answeredQuestionIds: string[];
}

export const GameBoard: React.FC<GameBoardProps> = ({
  game,
  currentRoundNumber,
  onSelectRound,
  language,
  onSelectQuestion,
  answeredQuestionIds,
}) => {
  // Find current round
  const currentRound = game.rounds.find((r) => r.roundNumber === currentRoundNumber) || game.rounds[0];

  if (!currentRound || !currentRound.categories.length) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-blue-200">
        <Layers className="w-16 h-16 text-blue-400 mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold mb-2">
          {language === 'ga' ? 'Níl aon cheisteanna ar fáil don bhabhta seo.' : 'No categories found for this round.'}
        </h2>
        <p className="text-sm text-blue-300/70">
          {language === 'ga' ? 'Uaslódáil bileoga fíricí nua sa chluaisín Uaslódáil.' : 'Upload new factfiles in the Teacher Upload tab to generate categories.'}
        </p>
      </div>
    );
  }

  // Calculate highest number of questions across categories (usually 5)
  const maxQuestions = Math.max(...currentRound.categories.map((c) => c.questions.length), 5);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Round Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-jeopardy-deep/80 p-3 rounded-2xl border border-blue-600/30 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider font-bold text-blue-300">
            {language === 'ga' ? 'Babhta Reatha:' : 'Active Round:'}
          </span>
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-blue-500/20">
            {game.rounds.map((r) => {
              const isActive = r.roundNumber === currentRoundNumber;
              const roundTitle = language === 'ga' ? r.name_ga : r.name_en;

              return (
                <button
                  key={r.id || r.roundNumber}
                  onClick={() => onSelectRound(r.roundNumber)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold tracking-wide transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-jeopardy-dark shadow-gold-glow scale-105'
                      : 'text-blue-200/80 hover:text-white hover:bg-blue-900/40'
                  }`}
                >
                  {roundTitle || `Round ${r.roundNumber}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick info badges */}
        <div className="flex items-center gap-2 text-xs text-blue-300/80">
          <span className="bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-500/30">
            {currentRound.categories.length} {language === 'ga' ? 'Catagóir' : 'Categories'}
          </span>
          <span className="bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-500/30">
            {answeredQuestionIds.length} {language === 'ga' ? 'Freagartha' : 'Answered'}
          </span>
        </div>
      </div>

      {/* JEOPARDY BOARD GRID */}
      <div className="w-full overflow-x-auto pb-4">
        <div
          className="min-w-[760px] grid gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-blue-950 via-[#030a5c] to-black border-4 border-jeopardy-board shadow-2xl shadow-blue-950/80"
          style={{
            gridTemplateColumns: `repeat(${currentRound.categories.length}, minmax(130px, 1fr))`,
          }}
        >
          {/* CATEGORY HEADERS ROW */}
          {currentRound.categories.map((cat) => {
            const catName = language === 'ga' ? cat.name_ga : cat.name_en;
            return (
              <div
                key={cat.id}
                className="h-24 sm:h-28 bg-gradient-to-b from-jeopardy-board to-jeopardy-navy p-2 sm:p-3 rounded-xl border-2 border-blue-400/50 shadow-card-inset flex items-center justify-center text-center group"
              >
                <h3 className="font-jeopardy text-sm sm:text-base lg:text-lg font-black uppercase text-white tracking-wider leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] line-clamp-3">
                  {catName}
                </h3>
              </div>
            );
          })}

          {/* QUESTION TILES ROWS */}
          {Array.from({ length: maxQuestions }).map((_, rowIndex) => (
            <React.Fragment key={`row-${rowIndex}`}>
              {currentRound.categories.map((cat) => {
                const q = cat.questions[rowIndex];
                if (!q) {
                  return (
                    <div
                      key={`empty-${cat.id}-${rowIndex}`}
                      className="h-20 sm:h-24 bg-blue-950/30 rounded-xl border border-blue-900/30 opacity-40"
                    />
                  );
                }

                const isAnswered = answeredQuestionIds.includes(q.id);

                return (
                  <button
                    key={q.id}
                    disabled={isAnswered}
                    onClick={() => {
                      if (!isAnswered) {
                        if (q.isDailyDouble) {
                          soundEffects.playDailyDouble();
                        } else {
                          soundEffects.playClueOpen();
                        }
                        onSelectQuestion(cat, q);
                      }
                    }}
                    className={`h-20 sm:h-24 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center relative overflow-hidden group select-none ${
                      isAnswered
                        ? 'bg-blue-950/30 border-blue-900/40 text-blue-500/20 shadow-none cursor-default'
                        : 'bg-gradient-to-b from-jeopardy-card via-jeopardy-board to-[#080f80] hover:from-jeopardy-cardHover hover:to-blue-600 border-blue-400/40 hover:border-yellow-400 shadow-card-inset hover:shadow-gold-glow hover:-translate-y-1 active:scale-95 cursor-pointer'
                    }`}
                  >
                    {!isAnswered ? (
                      <>
                        {/* Glow highlight */}
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                        {/* Daily double subtle indicator */}
                        {q.isDailyDouble && (
                          <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        )}

                        <span className="font-jeopardy text-2xl sm:text-3xl lg:text-4xl font-black text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tracking-wider group-hover:scale-110 group-hover:text-yellow-200 transition-transform">
                          ${q.points}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-mono font-bold uppercase tracking-widest text-blue-400/30">
                        {language === 'ga' ? 'DÉANTA' : 'TAKEN'}
                      </span>
                    )}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
