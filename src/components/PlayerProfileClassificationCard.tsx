import React from 'react';
import { PlayerCloudProfile } from '../firebase/playerProfileModel';
import { getNextRank, getRankForXp } from '../progression/ranks';
import { WarfaceRankIcon } from './WarfaceRankIcon';

interface PlayerProfileClassificationCardProps {
  profile: PlayerCloudProfile;
}

export const PlayerProfileClassificationCard: React.FC<PlayerProfileClassificationCardProps> = ({
  profile,
}) => {
  const currentRank = getRankForXp(profile.playerXp);
  const nextRank = getNextRank(currentRank.level);

  const prevXp = currentRank.requiredXp;
  const targetXp = nextRank ? nextRank.requiredXp : currentRank.requiredXp + 5000;
  const rankProgress = Math.min(
    100,
    Math.max(0, ((profile.playerXp - prevXp) / Math.max(1, targetXp - prevXp)) * 100)
  );

  return (
    <div className="flex flex-col justify-between bg-[#0b0e14]/90 border border-white/10 rounded-xl p-3.5 sm:p-4 backdrop-blur-md h-full">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <h4 className="font-display font-black text-xs sm:text-sm tracking-wider uppercase text-white">
          CLASSIFICAÇÃO
        </h4>
        <span className="font-mono text-[9px] text-amber-400 font-bold">
          PATENTE #{currentRank.level}
        </span>
      </div>

      {/* Brasão Monumental com Aura Neon Azul */}
      <div className="relative flex flex-col items-center justify-center py-4 my-auto">
        {/* Halo / Glow Radial Azul Neon */}
        <div className="absolute w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-sky-500/15 blur-2xl pointer-events-none" />
        <div className="absolute w-24 h-24 sm:w-32 sm:h-32 rounded-full border border-sky-400/30 shadow-[0_0_30px_rgba(56,189,248,0.35)] pointer-events-none animate-pulse" />

        {/* Emblema Tridimensional da Patente */}
        <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center drop-shadow-[0_0_20px_rgba(56,189,248,0.5)]">
          <WarfaceRankIcon
            level={currentRank.level}
            className="w-full h-full object-contain filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]"
          />
        </div>

        {/* Título da Patente em Destaque */}
        <div className="relative z-10 mt-3 text-center">
          <div className="font-display font-black text-sm sm:text-base tracking-[0.14em] uppercase text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-sky-300 drop-shadow-md">
            {currentRank.title}
          </div>
          <div className="font-mono text-[9px] tracking-wider text-sky-400 font-bold uppercase mt-0.5">
            {currentRank.category}
          </div>
        </div>
      </div>

      {/* Barra de Progresso de XP até a próxima patente */}
      <div className="border-t border-white/10 pt-2.5 space-y-1.5">
        <div className="flex items-center justify-between font-mono text-[9px]">
          <span className="text-slate-400">PROGRESSO DE PATENTE</span>
          <span className="text-amber-300 font-bold">
            {profile.playerXp.toLocaleString('pt-BR')} / {targetXp.toLocaleString('pt-BR')} XP
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-black/60 border border-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-500"
            style={{ width: `${rankProgress}%` }}
          />
        </div>
        <div className="text-center font-mono text-[8.5px] text-slate-400">
          {nextRank ? `Próximo: ${nextRank.title} (${nextRank.requiredXp} XP)` : 'Patente Máxima Atingida'}
        </div>
      </div>
    </div>
  );
};
