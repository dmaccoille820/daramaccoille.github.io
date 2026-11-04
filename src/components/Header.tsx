'use client';

import React from 'react';
import { Language } from '@/types/jeopardy';
import { Sparkles, UploadCloud, Gamepad2, Volume2, VolumeX, Database, RefreshCw, Languages } from 'lucide-react';
import { soundEffects } from '@/lib/audio';

interface HeaderProps {
  currentView: 'game' | 'upload' | 'db';
  onViewChange: (view: 'game' | 'upload' | 'db') => void;
  language: Language;
  onToggleLanguage: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  gameTitle: string;
  isDbConnected: boolean;
  onResetGame?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  language,
  onToggleLanguage,
  soundEnabled,
  onToggleSound,
  gameTitle,
  isDbConnected,
  onResetGame
}) => {
  return (
    <header className="bg-jeopardy-deep/95 border-b border-jeopardy-board/40 backdrop-blur-md sticky top-0 z-40 px-4 py-3 shadow-lg shadow-black/50">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onViewChange('game')}
            className="flex items-center gap-2 group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-jeopardy-navy via-jeopardy-board to-blue-400 flex items-center justify-center shadow-gold-glow border border-jeopardy-gold/50 group-hover:scale-105 transition-all">
              <span className="font-jeopardy text-xl text-jeopardy-gold tracking-wider">J!</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-jeopardy text-2xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  JEOPARDY AI
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-500/30">
                  Gaeilge / EN
                </span>
              </div>
              <p className="text-xs text-blue-200/70 font-medium truncate max-w-[280px] sm:max-w-md">
                {gameTitle}
              </p>
            </div>
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-jeopardy-dark/80 p-1 rounded-xl border border-blue-500/20">
          <button
            onClick={() => onViewChange('game')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              currentView === 'game'
                ? 'bg-jeopardy-board text-white shadow-md shadow-blue-900/50'
                : 'text-blue-300/80 hover:text-white hover:bg-white/5'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>{language === 'ga' ? 'Cluiche' : 'Game View'}</span>
          </button>

          <button
            onClick={() => onViewChange('upload')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              currentView === 'upload'
                ? 'bg-jeopardy-board text-white shadow-md shadow-blue-900/50'
                : 'text-blue-300/80 hover:text-white hover:bg-white/5'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>{language === 'ga' ? 'Uaslódáil PDF & AI' : 'Teacher Upload'}</span>
          </button>
        </div>

        {/* Action Controls & Hot Language Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* HOT LANGUAGE SWITCH BUTTON */}
          <button
            onClick={onToggleLanguage}
            title={language === 'ga' ? 'Athraigh go Béarla / Switch to English' : 'Athraigh go Gaeilge / Switch to Irish'}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-emerald-950 via-slate-900 to-blue-950 hover:from-emerald-900 hover:to-blue-900 border-2 border-emerald-400/40 text-emerald-200 shadow-lg shadow-emerald-950/40 hover:scale-105 active:scale-95 transition-all"
          >
            <Languages className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="flex items-center gap-1.5">
              <span className="text-base">{language === 'ga' ? '🇮🇪' : '🇬🇧'}</span>
              <span className="font-extrabold text-white">
                {language === 'ga' ? 'GAEILGE' : 'ENGLISH'}
              </span>
            </span>
            <span className="text-[10px] text-emerald-400/80 uppercase font-mono bg-black/40 px-1.5 py-0.5 rounded">
              HOT SWITCH
            </span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
            className="p-2 rounded-lg bg-blue-950/50 hover:bg-blue-900/60 text-blue-300 border border-blue-500/30 transition-all"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-yellow-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Database Status Button */}
          <button
            onClick={() => onViewChange('db')}
            title="Neon Database Connection & Schema"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isDbConnected
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
                : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Database className={`w-3.5 h-3.5 ${isDbConnected ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Neon DB</span>
            <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'}`} />
          </button>

          {/* Reset Board */}
          {currentView === 'game' && onResetGame && (
            <button
              onClick={onResetGame}
              title="Reset All Tiles to Unanswered"
              className="p-2 rounded-lg bg-blue-950/50 hover:bg-blue-900/60 text-blue-300 border border-blue-500/30 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
