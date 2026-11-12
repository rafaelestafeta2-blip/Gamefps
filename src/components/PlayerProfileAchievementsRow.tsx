import React, { useState } from 'react';
import {
  TACTICAL_ACHIEVEMENTS,
  TacticalAchievement,
} from '../progression/achievementsData';

interface PlayerProfileAchievementsRowProps {
  unlockedIds: string[];
}

export const PlayerProfileAchievementsRow: React.FC<PlayerProfileAchievementsRowProps> = ({
  unlockedIds,
}) => {
  const [selectedAchievement, setSelectedAchievement] = useState<TacticalAchievement | null>(
    null
  );

  const unlockedCount = unlockedIds.length;
  const totalCount = TACTICAL_ACHIEVEMENTS.length;

  return (
    <div className="w-full bg-[#0b0e14]/90 border border-white/10 rounded-xl p-3 sm:p-4 backdrop-blur-md shrink-0">
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
        <h4 className="font-display font-black text-xs sm:text-sm tracking-wider uppercase text-white flex items-center gap-2">
          <span>CONQUISTAS</span>
        </h4>
        <span className="font-mono text-[9px] text-amber-400 font-bold">
          {unlockedCount}/{totalCount} DESBLOQUEADAS
        </span>
      </div>

      {/* Carrossel Horizontal de Insígnias */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
        {TACTICAL_ACHIEVEMENTS.map((ach) => {
          const isUnlocked = unlockedIds.includes(ach.id);
          const isSelected = selectedAchievement?.id === ach.id;

          return (
            <button
              key={ach.id}
              type="button"
              onClick={() => setSelectedAchievement(ach)}
              className={`relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                isUnlocked
                  ? isSelected
                    ? 'bg-amber-500/25 border-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105'
                    : 'bg-white/[0.04] border border-amber-500/50 hover:border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                  : 'bg-black/50 border border-white/5 opacity-40 grayscale'
              }`}
            >
              {/* Emblema / Ícone */}
              <span className="text-xl sm:text-2xl drop-shadow-md">{ach.icon}</span>

              {/* Borda Dourada Tática */}
              {isUnlocked && (
                <div className="absolute inset-0 rounded-xl border border-yellow-300/30 pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>

      {/* Detalhe da Conquista Selecionada */}
      {selectedAchievement && (
        <div className="mt-2 p-2 rounded-lg bg-white/[0.03] border border-amber-400/30 flex items-center justify-between text-left">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl">{selectedAchievement.icon}</span>
            <div className="min-w-0">
              <div className="font-display font-bold text-xs text-amber-300 uppercase truncate">
                {selectedAchievement.title}
              </div>
              <div className="font-mono text-[9px] text-slate-300 truncate">
                {selectedAchievement.description}
              </div>
            </div>
          </div>
          <span className="font-mono text-[9px] font-bold text-emerald-400 shrink-0 ml-2">
            {unlockedIds.includes(selectedAchievement.id) ? 'DESBLOQUEADA ✓' : 'BLOQUEADA'}
          </span>
        </div>
      )}
    </div>
  );
};
