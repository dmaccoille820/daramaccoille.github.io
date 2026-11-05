'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { JeopardyGame, Language } from '@/types/jeopardy';
import {
  BookOpen, Gamepad2, Trash2, RefreshCw, Search,
  Calendar, Layers, AlertCircle, Loader2, DatabaseZap, ChevronRight
} from 'lucide-react';

interface GameLibraryProps {
  language: Language;
  onGameLoaded: (game: JeopardyGame) => void;
  isDbConnected: boolean;
}

interface LibraryGame extends JeopardyGame {
  roundCount?: number;
}

export const GameLibrary: React.FC<GameLibraryProps> = ({
  language,
  onGameLoaded,
  isDbConnected,
}) => {
  const [games, setGames] = useState<LibraryGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGameId, setLoadingGameId] = useState<string | null>(null);
  const [deletingGameId, setDeletingGameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const t = (ga: string, en: string) => (language === 'ga' ? ga : en);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/games');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Filter out the sample game (it has a static id prefix)
      const real: LibraryGame[] = (data.games || []).filter(
        (g: LibraryGame) => !g.id?.startsWith('sample-')
      );
      setGames(real);
    } catch (e) {
      setError((e as Error).message || 'Failed to load games');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const handleLoad = async (gameId: string) => {
    setLoadingGameId(gameId);
    try {
      const res = await fetch(`/api/games/${gameId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.game) {
        onGameLoaded(data.game);
      } else {
        throw new Error('No game data returned');
      }
    } catch (e) {
      alert(`${t('Earráid ag lódáil cluiche', 'Error loading game')}: ${(e as Error).message}`);
    } finally {
      setLoadingGameId(null);
    }
  };

  const handleDelete = async (gameId: string, gameTitle: string) => {
    const confirmMsg = language === 'ga'
      ? `An bhfuil tú cinnte gur mhaith leat "${gameTitle}" a scriosadh go buan?`
      : `Are you sure you want to permanently delete "${gameTitle}"?`;
    if (!confirm(confirmMsg)) return;

    setDeletingGameId(gameId);
    try {
      const res = await fetch(`/api/games/${gameId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setGames((prev) => prev.filter((g) => g.id !== gameId));
    } catch (e) {
      alert(`${t('Earráid ag scriosadh', 'Error deleting game')}: ${(e as Error).message}`);
    } finally {
      setDeletingGameId(null);
    }
  };

  const filteredGames = games.filter((g) => {
    const q = searchQuery.toLowerCase();
    return (
      g.title?.toLowerCase().includes(q) ||
      g.subject?.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(
        language === 'ga' ? 'ga-IE' : 'en-IE',
        { day: 'numeric', month: 'short', year: 'numeric' }
      );
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Library Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-jeopardy-navy via-jeopardy-board to-blue-400 flex items-center justify-center shadow-gold-glow border border-jeopardy-gold/40">
            <BookOpen className="w-5 h-5 text-jeopardy-gold" />
          </div>
          <div>
            <h2 className="font-jeopardy text-2xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400">
              {t('Mo Leabharlann Cluichí', 'My Games Library')}
            </h2>
            <p className="text-xs text-blue-300/70 mt-0.5">
              {t('Cluichí a sábháladh sa bhunachar sonraí Neon', 'Games saved to your Neon database')}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-400/60 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('Cuardaigh...', 'Search...')}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-jeopardy-dark/80 border border-blue-500/30 text-sm text-blue-100 placeholder:text-blue-400/40 focus:outline-none focus:border-blue-400/60 w-44"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={fetchGames}
            disabled={loading}
            title={t('Athnuaigh liosta', 'Refresh list')}
            className="p-2 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-500/30 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* DB not connected banner */}
      {!isDbConnected && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200">
          <DatabaseZap className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">
              {t('Neon DB gan nascadh.', 'Neon DB not connected.')}
            </span>{' '}
            {t(
              'Cuir DATABASE_URL le Vercel chun cluichí a shábháil agus a athghlao.',
              'Add DATABASE_URL to Vercel to save and recall games.'
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-blue-300/60">
          <Loader2 className="w-10 h-10 animate-spin text-jeopardy-board" />
          <p className="text-sm">{t('Ag lódáil cluichí...', 'Loading games...')}</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">{t('Earráid:', 'Error:')} </span>{error}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredGames.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-5 text-blue-300/50">
          <div className="w-20 h-20 rounded-2xl bg-jeopardy-dark/80 border border-blue-500/20 flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-blue-700/60" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-blue-300/70">
              {searchQuery
                ? t('Gan torthaí cuardaigh', 'No matching games found')
                : t('Gan cluichí sábháilte fós', 'No games saved yet')}
            </p>
            <p className="text-sm mt-1 max-w-sm">
              {searchQuery
                ? t('Bain triail as cuardach difriúil', 'Try a different search term')
                : t(
                    'Uaslódáil do chéad PDF factfile sa chluaisín "Uaslódáil PDF & AI" chun tús a chur le do leabharlann cluichí!',
                    'Upload your first PDF factfile in the "Teacher Upload" tab to start your games library!'
                  )}
            </p>
          </div>
        </div>
      )}

      {/* Game Cards Grid */}
      {!loading && !error && filteredGames.length > 0 && (
        <>
          <p className="text-xs text-blue-400/60 -mt-2">
            {filteredGames.length}{' '}
            {filteredGames.length === 1
              ? t('cluiche', 'game')
              : t('cluichí', 'games')}
            {searchQuery ? ` ${t('aimsíodh', 'found')}` : t(' sábháilte', ' saved')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGames.map((game) => (
              <div
                key={game.id}
                className="group relative flex flex-col bg-jeopardy-dark/70 border border-blue-500/20 rounded-2xl overflow-hidden hover:border-jeopardy-board/60 hover:shadow-lg hover:shadow-blue-900/40 transition-all duration-200"
              >
                {/* Card Top Accent */}
                <div className="h-1.5 bg-gradient-to-r from-jeopardy-board via-blue-400 to-jeopardy-board opacity-70 group-hover:opacity-100 transition-all" />

                <div className="flex flex-col flex-1 p-4 gap-3">
                  {/* Subject Badge */}
                  {game.subject && (
                    <span className="self-start text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-500/30">
                      {game.subject}
                    </span>
                  )}

                  {/* Title */}
                  <h3 className="font-jeopardy text-lg tracking-wide text-amber-200 leading-tight line-clamp-2">
                    {game.title}
                  </h3>

                  {/* Description */}
                  {game.description && (
                    <p className="text-xs text-blue-300/60 line-clamp-2 leading-relaxed">
                      {game.description}
                    </p>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center gap-4 text-xs text-blue-400/60 mt-auto pt-2 border-t border-blue-500/10">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(game.createdAt)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      {game.rounds?.length > 0
                        ? `${game.rounds.length} ${language === 'ga' ? 'babhta' : 'round(s)'}`
                        : t('Mír amháin', '1 round')}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 px-4 pb-4">
                  {/* Load Game */}
                  <button
                    onClick={() => handleLoad(game.id)}
                    disabled={loadingGameId === game.id || deletingGameId === game.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-jeopardy-board hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-blue-900/40 transition-all disabled:opacity-60 disabled:cursor-wait hover:scale-[1.02] active:scale-95"
                  >
                    {loadingGameId === game.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Gamepad2 className="w-4 h-4" />
                    )}
                    {loadingGameId === game.id
                      ? t('Ag lódáil...', 'Loading...')
                      : t('Imir Anois', 'Play Game')}
                    {loadingGameId !== game.id && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(game.id, game.title)}
                    disabled={loadingGameId === game.id || deletingGameId === game.id}
                    title={t('Scrios cluiche', 'Delete game')}
                    className="p-2 rounded-xl bg-red-950/50 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-400/40 transition-all disabled:opacity-50 disabled:cursor-wait"
                  >
                    {deletingGameId === game.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
