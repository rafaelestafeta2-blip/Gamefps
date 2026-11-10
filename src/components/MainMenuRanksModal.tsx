import React from 'react';
import { WARFACE_RANKS } from '../progression/ranks';
import { WarfaceRankIcon } from './WarfaceRankIcon';

interface MainMenuRanksModalProps {
  currentRank: {
    level: number;
    title: string;
    requiredXp: number;
  };
  playerXp: number;
  onClose: () => void;
}

export const MainMenuRanksModal: React.FC<MainMenuRanksModalProps> = ({
  currentRank,
  playerXp,
  onClose,
}) => {
  return (
    <div className="max-w-5xl w-full max-h-full bg-[#0a0d14]/95 border border-amber-500/40 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-xl pointer-events-auto flex flex-col overflow-hidden">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <WarfaceRankIcon level={currentRank.level} className="w-7 h-7" />
          <div>
            <h3 className="font-display font-black text-sm sm:text-base text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <span>PROGRESSÃO DE PATENTES · KINETIC</span>
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                70 NÍVEIS
              </span>
            </h3>
            <p className="font-mono text-[10px] text-slate-300">
              Patente Atual:{' '}
              <b className="text-white">
                Nív. {currentRank.level} — {currentRank.title}
              </b>{' '}
              ({playerXp.toLocaleString()} XP)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-[10px] font-mono font-bold rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          FECHAR ✕
        </button>
      </div>

      {/* 5-Column Compact Scrollable Roster */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 overflow-y-auto pr-1 font-mono text-xs flex-1 min-h-0">
        {[
          { colTitle: 'NÍV. 1 AO 15', range: WARFACE_RANKS.slice(0, 15) },
          { colTitle: 'NÍV. 16 AO 30', range: WARFACE_RANKS.slice(15, 30) },
          { colTitle: 'NÍV. 31 AO 45', range: WARFACE_RANKS.slice(30, 45) },
          { colTitle: 'NÍV. 46 AO 60', range: WARFACE_RANKS.slice(45, 60) },
          {
            colTitle: '61 AO 70 · ELITE',
            range: WARFACE_RANKS.slice(60, 70),
          },
        ].map((col, cIdx) => (
          <div
            key={cIdx}
            className="bg-black/60 border border-white/10 rounded-xl p-1.5 flex flex-col gap-1"
          >
            <div className="text-[9px] font-bold text-amber-400/90 border-b border-white/10 pb-1 text-center uppercase tracking-wider">
              {col.colTitle}
            </div>
            <div className="space-y-1">
              {col.range.map((r) => {
                const isCurrent = currentRank.level === r.level;
                const isReached = playerXp >= r.requiredXp;

                return (
                  <div
                    key={r.level}
                    className={`px-1.5 py-1 rounded-lg border flex items-center justify-between gap-1 transition-all ${
                      isCurrent
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                        : isReached
                          ? 'bg-black/75 border-emerald-500/30 text-slate-200'
                          : 'bg-black/85 border-slate-800/80 opacity-60 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-slate-400 text-[9px] w-4 text-right shrink-0">
                        {r.level}
                      </span>
                      <WarfaceRankIcon level={r.level} className="w-4 h-4" />
                      <span
                        className="font-semibold truncate text-[9px] text-white"
                        title={r.title}
                      >
                        {r.title}
                      </span>
                    </div>

                    {isCurrent && (
                      <span className="text-[7px] font-black bg-amber-400 text-black px-1 rounded shrink-0">
                        ATUAL
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
