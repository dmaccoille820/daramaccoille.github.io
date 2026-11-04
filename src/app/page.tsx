'use client';

import React, { useState, useEffect } from 'react';
import { JeopardyGame, Language, Team, Category, Question } from '@/types/jeopardy';
import { sampleBilingualGame } from '@/lib/sample-data';
import { Header } from '@/components/Header';
import { GameBoard } from '@/components/GameBoard';
import { QuestionModal } from '@/components/QuestionModal';
import { ScoreBoard } from '@/components/ScoreBoard';
import { TeacherUpload } from '@/components/TeacherUpload';
import { DbStatusModal } from '@/components/DbStatusModal';
import { soundEffects } from '@/lib/audio';

export default function Home() {
  // Main Game State
  const [game, setGame] = useState<JeopardyGame>(sampleBilingualGame);
  const [currentRoundNumber, setCurrentRoundNumber] = useState<number>(1);
  const [language, setLanguage] = useState<Language>('ga'); // Defaults to Gaeilge
  const [currentView, setCurrentView] = useState<'game' | 'upload' | 'db'>('game');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Active Question Modal State
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<string[]>([]);

  // Classroom Teams
  const [teams, setTeams] = useState<Team[]>([
    { id: 'team-1', name: 'Foireann A', score: 0 },
    { id: 'team-2', name: 'Foireann B', score: 0 },
    { id: 'team-3', name: 'Foireann C', score: 0 },
  ]);

  // Database Connection Indicator
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState<boolean>(false);

  // Check database status on startup
  useEffect(() => {
    async function checkDb() {
      try {
        const res = await fetch('/api/setup-db');
        const data = await res.json();
        setIsDbConnected(Boolean(data.configured));
      } catch (e) {
        setIsDbConnected(false);
      }
    }
    checkDb();
  }, []);

  // HOT SWITCH LANGUAGE HANDLER
  const handleToggleLanguage = () => {
    setLanguage((prev) => (prev === 'ga' ? 'en' : 'ga'));
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEffects.enabled = next;
  };

  const handleSelectQuestion = (category: Category, question: Question) => {
    setActiveCategory(category);
    setActiveQuestion(question);
  };

  const handleMarkAnswered = (questionId: string) => {
    setAnsweredQuestionIds((prev) =>
      prev.includes(questionId) ? prev : [...prev, questionId]
    );
  };

  const handleAwardPoints = (teamId: string, points: number) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, score: t.score + points } : t))
    );
  };

  const handleResetBoard = () => {
    if (confirm(language === 'ga' ? 'Athshocraigh na tíleanna go léir don bhabhta seo?' : 'Reset all tiles on this board?')) {
      setAnsweredQuestionIds([]);
    }
  };

  const handleGameCreated = (newGame: JeopardyGame) => {
    setGame(newGame);
    setCurrentRoundNumber(newGame.rounds[0]?.roundNumber || 1);
    setAnsweredQuestionIds([]);
    setCurrentView('game');
  };

  return (
    <main className="min-h-screen flex flex-col justify-between">
      {/* Top Navigation & Hot Switcher */}
      <Header
        currentView={currentView}
        onViewChange={(view) => {
          if (view === 'db') {
            setIsDbModalOpen(true);
          } else {
            setCurrentView(view);
          }
        }}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        gameTitle={game.title}
        isDbConnected={isDbConnected}
        onResetGame={handleResetBoard}
      />

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 flex-1 flex flex-col gap-6">
        {currentView === 'game' ? (
          <>
            {/* The signature cool blue Jeopardy game board */}
            <GameBoard
              game={game}
              currentRoundNumber={currentRoundNumber}
              onSelectRound={(num) => setCurrentRoundNumber(num)}
              language={language}
              onSelectQuestion={handleSelectQuestion}
              answeredQuestionIds={answeredQuestionIds}
            />

            {/* Interactive Classroom Team Scoreboard */}
            <ScoreBoard
              teams={teams}
              onUpdateTeams={setTeams}
              language={language}
            />
          </>
        ) : (
          /* Teacher Upload & AI Generation View */
          <TeacherUpload
            onGameCreated={handleGameCreated}
            language={language}
            isDbConnected={isDbConnected}
          />
        )}
      </div>

      {/* Active Question Clue & Answer Presenter Modal */}
      {activeQuestion && activeCategory && (
        <QuestionModal
          category={activeCategory}
          question={activeQuestion}
          language={language}
          onToggleLanguage={handleToggleLanguage}
          onClose={() => {
            setActiveQuestion(null);
            setActiveCategory(null);
          }}
          onMarkAnswered={handleMarkAnswered}
          teams={teams}
          onAwardPoints={handleAwardPoints}
        />
      )}

      {/* Neon Database & Schema Modal */}
      <DbStatusModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        onLoadGame={(loadedGame) => {
          setGame(loadedGame);
          setCurrentRoundNumber(loadedGame.rounds[0]?.roundNumber || 1);
          setAnsweredQuestionIds([]);
          setCurrentView('game');
        }}
      />

      {/* Footer */}
      <footer className="border-t border-blue-900/30 bg-jeopardy-dark/80 py-3 text-center text-xs text-blue-300/60">
        <p>
          Jeopardy AI • Múinteoirí Teicneolaíochta Digití & Eolaíochta • Gemini AI & Neon PostgreSQL
        </p>
      </footer>
    </main>
  );
}
