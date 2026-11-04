'use client';

import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertTriangle, RefreshCw, Layers, Play, Table } from 'lucide-react';
import { JeopardyGame } from '@/types/jeopardy';

interface DbStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadGame: (game: JeopardyGame) => void;
}

export const DbStatusModal: React.FC<DbStatusModalProps> = ({
  isOpen,
  onClose,
  onLoadGame,
}) => {
  const [isDbConfigured, setIsDbConfigured] = useState<boolean>(false);
  const [dbStatusMsg, setDbStatusMsg] = useState<string>('Checking database connection...');
  const [savedGames, setSavedGames] = useState<JeopardyGame[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [setupResult, setSetupResult] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkDbAndLoadGames();
    }
  }, [isOpen]);

  const checkDbAndLoadGames = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/games');
      const data = await res.json();
      setIsDbConfigured(data.configured);
      setSavedGames(data.games || []);
      setDbStatusMsg(
        data.configured
          ? 'Connected to Neon PostgreSQL Serverless'
          : 'Running in Local Memory / Demo mode (DATABASE_URL not set in .env)'
      );
    } catch (e) {
      setDbStatusMsg('Error connecting to backend API');
    } finally {
      setLoading(false);
    }
  };

  const handleInitDb = async () => {
    setLoading(true);
    setSetupResult(null);
    try {
      const res = await fetch('/api/setup-db', { method: 'POST' });
      const data = await res.json();
      setSetupResult(data);
      checkDbAndLoadGames();
    } catch (e) {
      setSetupResult({ success: false, message: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-gradient-to-b from-[#030a5c] to-[#02052b] border-2 border-blue-500/50 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-950 border border-blue-400/40 text-blue-300">
              <Database className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-jeopardy text-xl text-white tracking-wider">
                Neon Database & Schema
              </h3>
              <p className="text-xs text-blue-200/70">
                PostgreSQL storage for bilingual Jeopardy questions & game history
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-300 hover:text-white text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>

        {/* Status Card */}
        <div className="p-4 rounded-2xl bg-black/40 border border-blue-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {isDbConfigured ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
            )}
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>{isDbConfigured ? 'Neon Database: Connected' : 'Neon Database: Offline'}</span>
                <span className={`w-2 h-2 rounded-full ${isDbConfigured ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
              </div>
              <p className="text-xs text-blue-300/80 mt-0.5">{dbStatusMsg}</p>
            </div>
          </div>

          <button
            onClick={checkDbAndLoadGames}
            disabled={loading}
            className="p-2 rounded-lg bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-500/30"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Setup database tables */}
        {isDbConfigured && (
          <div className="flex items-center justify-between bg-blue-950/40 p-3 rounded-xl border border-blue-500/20">
            <div className="text-xs text-blue-200">
              Run automated schema migration to ensure all 5 tables exist in Neon.
            </div>
            <button
              onClick={handleInitDb}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Verify & Create Tables
            </button>
          </div>
        )}

        {setupResult && (
          <div
            className={`p-3 rounded-xl text-xs font-mono ${
              setupResult.success
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                : 'bg-red-950/80 text-red-300 border border-red-500/40'
            }`}
          >
            {setupResult.message}
          </div>
        )}

        {/* Schema Summary */}
        <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/20">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300 mb-2">
            <Table className="w-4 h-4 text-amber-300" />
            <span>Database Tables & Schema</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2 rounded-lg bg-black/40 border border-blue-500/20 text-blue-200">
              <div className="font-bold text-white">games</div>
              <div className="text-[10px] text-blue-400">title, subject</div>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-blue-500/20 text-blue-200">
              <div className="font-bold text-white">rounds</div>
              <div className="text-[10px] text-blue-400">round 1, 2, 3</div>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-blue-500/20 text-blue-200">
              <div className="font-bold text-white">categories</div>
              <div className="text-[10px] text-blue-400">name_en, name_ga</div>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-blue-500/20 text-blue-200">
              <div className="font-bold text-white">questions</div>
              <div className="text-[10px] text-blue-400">clues & answers</div>
            </div>
          </div>
        </div>

        {/* Saved Games List */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-300 mb-2">
            Saved Games in Library ({savedGames.length})
          </h4>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
            {savedGames.map((g) => (
              <div
                key={g.id}
                className="p-3 rounded-xl bg-black/50 border border-blue-500/20 flex items-center justify-between hover:border-blue-400 transition-all"
              >
                <div>
                  <h5 className="font-bold text-sm text-white">{g.title}</h5>
                  <p className="text-[11px] text-blue-300/70">{g.subject || 'Digital Technology'}</p>
                </div>
                <button
                  onClick={async () => {
                    const res = await fetch(`/api/games/${g.id}`);
                    const data = await res.json();
                    if (data.game) {
                      onLoadGame(data.game);
                      onClose();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-jeopardy-dark transition-all"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Load</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
