'use client';

import React, { useState } from 'react';
import { Team, Language } from '@/types/jeopardy';
import { Users, Plus, Minus, RotateCcw, UserPlus, Trophy } from 'lucide-react';
import { soundEffects } from '@/lib/audio';

interface ScoreBoardProps {
  teams: Team[];
  onUpdateTeams: (teams: Team[]) => void;
  language: Language;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  teams,
  onUpdateTeams,
  language,
}) => {
  const [newTeamName, setNewTeamName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleScoreChange = (teamId: string, amount: number) => {
    onUpdateTeams(
      teams.map((t) => (t.id === teamId ? { ...t, score: t.score + amount } : t))
    );
    if (amount > 0) soundEffects.playCorrect();
    else soundEffects.playIncorrect();
  };

  const handleAddTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    const newTeam: Team = {
      id: 'team-' + Date.now(),
      name: newTeamName.trim(),
      score: 0
    };

    onUpdateTeams([...teams, newTeam]);
    setNewTeamName('');
    setIsAdding(false);
  };

  const handleResetScores = () => {
    if (confirm(language === 'ga' ? 'Athshocraigh na scóir go léir go 0?' : 'Reset all team scores to 0?')) {
      onUpdateTeams(teams.map((t) => ({ ...t, score: 0 })));
    }
  };

  // Find leader
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const leaderId = sortedTeams[0]?.score > 0 ? sortedTeams[0].id : null;

  return (
    <div className="bg-jeopardy-deep/90 border border-blue-500/30 rounded-2xl p-4 shadow-xl shadow-blue-950/40">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-blue-500/20 pb-2">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          <h3 className="font-jeopardy text-base sm:text-lg uppercase tracking-wider text-blue-100">
            {language === 'ga' ? 'Scórchlár na Ranganna' : 'Classroom Teams'}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-950/60 hover:bg-blue-900 border border-blue-400/30 text-blue-200 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5 text-blue-300" />
              <span>{language === 'ga' ? 'Cuir Foireann Leis' : 'Add Team'}</span>
            </button>
          ) : (
            <form onSubmit={handleAddTeam} className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                placeholder={language === 'ga' ? 'Ainm na Foirne...' : 'Team name...'}
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg bg-black/60 border border-blue-400 text-white placeholder-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-2 py-1 text-xs rounded-lg bg-slate-800 text-slate-300"
              >
                ✕
              </button>
            </form>
          )}

          <button
            onClick={handleResetScores}
            title={language === 'ga' ? 'Athshocraigh Scóir' : 'Reset Scores'}
            className="p-1 rounded-lg bg-blue-950/40 hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-700 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {teams.map((team) => {
          const isLeader = team.id === leaderId;

          return (
            <div
              key={team.id}
              className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                isLeader
                  ? 'bg-gradient-to-b from-amber-950/40 via-blue-950/60 to-black border-amber-400/50 shadow-gold-glow'
                  : 'bg-black/40 border-blue-500/20'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-bold text-blue-200 truncate" title={team.name}>
                  {team.name}
                </span>
                {isLeader && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
              </div>

              {/* Score Display */}
              <div className="text-center my-1">
                <span
                  className={`font-jeopardy text-xl sm:text-2xl font-black ${
                    team.score < 0
                      ? 'text-red-400'
                      : team.score > 0
                      ? 'text-amber-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]'
                      : 'text-slate-300'
                  }`}
                >
                  ${team.score}
                </span>
              </div>

              {/* Quick +/- 100 buttons */}
              <div className="flex items-center justify-center gap-1.5 pt-1 border-t border-blue-500/10">
                <button
                  onClick={() => handleScoreChange(team.id, -100)}
                  title="-$100"
                  className="p-1 rounded bg-red-950/50 hover:bg-red-900 text-red-300 border border-red-700/40"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleScoreChange(team.id, 100)}
                  title="+$100"
                  className="p-1 rounded bg-emerald-950/50 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/40"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
