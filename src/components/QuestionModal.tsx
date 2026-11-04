'use client';

import React, { useState, useEffect } from 'react';
import { Category, Question, Language, Team } from '@/types/jeopardy';
import { soundEffects } from '@/lib/audio';
import {
  X,
  Eye,
  CheckCircle2,
  XCircle,
  Sparkles,
  HelpCircle,
  Languages,
  Award,
  Timer
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuestionModalProps {
  category: Category;
  question: Question;
  language: Language;
  onToggleLanguage: () => void;
  onClose: () => void;
  onMarkAnswered: (questionId: string) => void;
  teams: Team[];
  onAwardPoints: (teamId: string, points: number) => void;
}

export const QuestionModal: React.FC<QuestionModalProps> = ({
  category,
  question,
  language,
  onToggleLanguage,
  onClose,
  onMarkAnswered,
  teams,
  onAwardPoints,
}) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [timerActive, setTimerActive] = useState(false);

  // Countdown timer for classroom gameplay
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            soundEffects.playIncorrect();
            setTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timerSeconds]);

  // Current texts based on hot switch language
  const categoryName = language === 'ga' ? category.name_ga : category.name_en;
  const clueText = language === 'ga' ? question.clue_ga : question.clue_en;
  const answerText = language === 'ga' ? question.answer_ga : question.answer_en;
  const explanationText = language === 'ga' ? question.explanation_ga : question.explanation_en;

  const handleReveal = () => {
    setShowAnswer(true);
    soundEffects.playReveal();
  };

  const handleScoreTeam = (teamId: string, isCorrect: boolean) => {
    const pointsDelta = isCorrect ? question.points : -question.points;
    onAwardPoints(teamId, pointsDelta);

    if (isCorrect) {
      soundEffects.playCorrect();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });
      // Automatically reveal answer if not yet revealed
      if (!showAnswer) setShowAnswer(true);
    } else {
      soundEffects.playIncorrect();
    }
  };

  const handleFinishQuestion = () => {
    onMarkAnswered(question.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="w-full max-w-4xl bg-gradient-to-b from-[#030a5c] via-[#050c77] to-[#02052b] border-4 border-jeopardy-board rounded-3xl shadow-2xl shadow-blue-600/50 flex flex-col max-h-[92vh] overflow-y-auto animate-pop-in">
        {/* MODAL HEADER */}
        <div className="bg-jeopardy-deep/90 border-b border-blue-500/30 px-6 py-4 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20 backdrop-blur-sm">
          {/* Category & Points */}
          <div className="flex items-center gap-3">
            <span className="font-jeopardy text-2xl sm:text-3xl font-black text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              ${question.points}
            </span>
            <span className="text-blue-300/60 font-bold">|</span>
            <h2 className="font-jeopardy text-lg sm:text-xl uppercase font-bold text-blue-100 tracking-wider">
              {categoryName}
            </h2>
            {question.isDailyDouble && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-black uppercase tracking-wider animate-bounce">
                Daily Double!
              </span>
            )}
          </div>

          {/* Controls: Hot Switch + Timer + Close */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* HOT LANGUAGE SWITCH BUTTON */}
            <button
              onClick={onToggleLanguage}
              title="Athraigh Teanga / Switch Language"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs tracking-wide bg-gradient-to-r from-emerald-900 to-blue-900 hover:from-emerald-800 hover:to-blue-800 border-2 border-emerald-400 text-emerald-200 shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              <Languages className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>{language === 'ga' ? '🇮🇪 GAEILGE' : '🇬🇧 ENGLISH'}</span>
              <span className="text-[9px] uppercase font-mono bg-black/50 px-1 py-0.5 rounded text-emerald-300">
                SWITCH
              </span>
            </button>

            {/* Timer Button */}
            <button
              onClick={() => {
                if (timerActive) {
                  setTimerActive(false);
                } else {
                  if (timerSeconds === 0) setTimerSeconds(30);
                  setTimerActive(true);
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                timerActive
                  ? 'bg-amber-950/80 border-amber-500 text-amber-300 animate-pulse'
                  : 'bg-blue-950/60 border-blue-500/40 text-blue-300'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>{timerSeconds}s</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-blue-950/60 hover:bg-red-950 hover:text-red-300 text-blue-300 border border-blue-500/30 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY: THE CLUE */}
        <div className="p-6 sm:p-10 flex-1 flex flex-col justify-center text-center">
          <div className="max-w-2xl mx-auto w-full my-auto py-6">
            <span className="text-xs font-bold font-mono tracking-widest uppercase text-blue-300/60 block mb-4">
              {language === 'ga' ? '— CLUE / LEID —' : '— JEOPARDY CLUE —'}
            </span>

            {/* Dramatic Clue Text */}
            <p className="font-clue text-2xl sm:text-3xl lg:text-4xl text-white font-medium leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] select-text">
              "{clueText}"
            </p>
          </div>

          {/* ANSWER REVEAL SECTION */}
          {showAnswer ? (
            <div className="mt-6 p-6 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-blue-950/80 to-emerald-950/80 border-2 border-emerald-400/50 shadow-lg shadow-emerald-950/40 text-left animate-pop-in">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" />
                <span>{language === 'ga' ? 'Freagra Ceart' : 'Correct Response'}</span>
              </div>
              <p className="font-jeopardy text-2xl sm:text-3xl text-emerald-200 font-black tracking-wide">
                {answerText}
              </p>
              {explanationText && (
                <p className="mt-2 text-sm text-blue-200/80 font-sans border-t border-emerald-500/20 pt-2">
                  <span className="font-bold text-blue-300">{language === 'ga' ? 'Comhthéacs: ' : 'Context: '}</span>
                  {explanationText}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleReveal}
                className="flex items-center gap-2.5 px-6 py-3 rounded-2xl font-jeopardy text-lg uppercase tracking-wider bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-jeopardy-dark shadow-gold-glow hover:scale-105 active:scale-95 transition-all font-black"
              >
                <Eye className="w-5 h-5" />
                <span>{language === 'ga' ? 'Taispeáin Freagra' : 'Reveal Answer'}</span>
              </button>
            </div>
          )}
        </div>

        {/* MODAL FOOTER: CLASSROOM TEAM SCORING BAR */}
        <div className="bg-jeopardy-dark/95 border-t border-blue-500/30 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-blue-300/80 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span>{language === 'ga' ? 'Scóráil Foirne:' : 'Score Team:'}</span>
            </span>

            {/* Team scoring buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {teams.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center bg-blue-950/70 border border-blue-500/30 rounded-xl p-1 gap-1"
                >
                  <span className="text-xs font-bold text-white px-2">
                    {t.name} (${t.score})
                  </span>
                  <button
                    onClick={() => handleScoreTeam(t.id, true)}
                    title={`Award +$${question.points} to ${t.name}`}
                    className="p-1 rounded-lg bg-emerald-600/40 hover:bg-emerald-500 text-emerald-200 hover:text-black transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleScoreTeam(t.id, false)}
                    title={`Deduct -$${question.points} from ${t.name}`}
                    className="p-1 rounded-lg bg-red-600/40 hover:bg-red-500 text-red-200 hover:text-black transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Complete Question & Return to Board */}
          <button
            onClick={handleFinishQuestion}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-jeopardy-board hover:bg-blue-600 text-white shadow-md shadow-blue-900/50 border border-blue-400/40 hover:scale-105 active:scale-95 transition-all ml-auto"
          >
            <span>{language === 'ga' ? 'Marcáil Déanta & Ar Ais' : 'Mark Done & Return'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
