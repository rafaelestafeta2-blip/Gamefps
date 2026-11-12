import React from 'react';
import { soundEngine } from '../audio/soundEngine';
import {
  CompetitiveRankBadgeSvg,
  CompetitiveRankTier,
  RadarWavePulseIcon,
} from './RankedInsigniasSvg';

interface RankedLeftWidgetsProps {
  currentRank: CompetitiveRankTier;
  nextRank: CompetitiveRankTier | null;
  displayMmr: number;
  targetMmr: number;
  mmrRemaining: number;
  progressPct: number;
  onOpenAllRanks: () => void;
  isSearching: boolean;
  elapsedSec: number;
  shownPlayersCount: number;
  requiredPlayers: number;
  mmrTolerance: number;
}

const formatTimer = (sec: number) =>
  `${Math.floor(sec / 60)}:${sec % 60 < 10 ? '0' : ''}${sec % 60}`;

export const RankedLeftWidgets: React.FC<RankedLeftWidgetsProps> = ({
  currentRank,
  nextRank,
  displayMmr,
  targetMmr,
  mmrRemaining,
  progressPct,
  onOpenAllRanks,
  isSearching,
  elapsedSec,
  shownPlayersCount,
  requiredPlayers,
  mmrTolerance,
}) => {
  const activeStars = progressPct >= 66 ? 3 : progressPct >= 33 ? 2 : 1;

  return (
    <div className="col-span-4 h-full min-h-0 flex flex-col justify-between items-start gap-2">
      {/* 1. Card Patente Atual & Próxima Patente */}
      <div
        onClick={() => {
          soundEngine.playMenuSelect();
          onOpenAllRanks();
        }}
        title="Clique para visualizar todas as patentes"
        className="w-full max-w-[300px] bg-gradient-to-b from-[#0b1933]/92 to-[#070f21]/95 hover:border-sky-300/70 border border-sky-400/45 rounded-lg p-2.5 sm:p-3 shadow-[0_8px_28px_rgba(0,0,0,0.72)] cursor-pointer transition-all"
      >
        <div className="flex items-center gap-2.5">
          <CompetitiveRankBadgeSvg
            tier={currentRank.id}
            className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 drop-shadow-[0_0_16px_rgba(56,189,248,0.8)]"
          />
          <div className="min-w-0 flex-1">
            <span className="block text-[8px] font-mono uppercase tracking-widest text-sky-300">
              PATENTE ATUAL
            </span>
            <div className="font-display font-black text-sm sm:text-base tracking-wider text-white uppercase leading-tight truncate">
              {currentRank.name}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              {[0, 1, 2].map((starIdx) => (
                <span
                  key={starIdx}
                  className={`text-xs ${
                    starIdx < activeStars
                      ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                      : 'text-slate-600'
                  }`}
                >
                  ★
                </span>
              ))}
              <span className="ml-1 text-[9px] font-mono font-bold text-slate-200 tabular-nums">
                {displayMmr.toLocaleString('en-US')} MMR
              </span>
            </div>
          </div>
        </div>

        <div className="w-full h-1.5 sm:h-2 bg-[#040914] border border-sky-400/45 rounded-full overflow-hidden p-[1px] my-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-300 to-amber-300 shadow-[0_0_10px_rgba(56,189,248,0.95)] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[8px] sm:text-[9px] font-mono font-bold text-slate-200 tabular-nums">
          <span>
            {nextRank ? `PRÓXIMA: ${nextRank.name.toUpperCase()}` : 'PATENTE MÁXIMA'}
          </span>
          <span className="text-amber-300">
            {nextRank ? `Faltam ${mmrRemaining} MMR` : `${targetMmr}+ MMR`}
          </span>
        </div>
      </div>

      {/* 2. Widget Fila Ranked / Busca Ativa 0/10 */}
      <div className="w-full max-w-[300px] bg-[#081224]/94 border border-sky-400/40 rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.75)] overflow-hidden shrink-0">
        <div className="px-2.5 py-1 bg-[#0e1c36] border-b border-sky-400/25 flex items-center justify-between">
          <span className="font-display font-bold text-[10px] sm:text-[11px] tracking-wider uppercase text-slate-100">
            FILA RANKED · VANGUARD
          </span>
          <span
            className={`text-[9px] font-mono font-bold tabular-nums ${
              isSearching ? 'text-amber-400' : 'text-sky-300'
            }`}
          >
            {isSearching ? `TEMPO: ${formatTimer(elapsedSec)}` : '5 VS 5 · MMR'}
          </span>
        </div>

        <div className="px-2.5 py-1.5 flex items-center gap-2">
          <RadarWavePulseIcon active={isSearching} />
          <div className="min-w-0 flex-1">
            <div className="font-display font-extrabold text-[11px] sm:text-xs tracking-wide uppercase text-white leading-tight">
              {shownPlayersCount >= requiredPlayers
                ? 'PARTIDA ENCONTRADA!'
                : isSearching
                  ? 'BUSCA ATIVA'
                  : 'PRONTO PARA BUSCA'}
            </div>
            <div className="text-[9px] font-mono font-semibold text-sky-200 tracking-wide truncate tabular-nums">
              {shownPlayersCount} / {requiredPlayers} JOGADORES ENCONTRADOS
            </div>
            <div className="text-[8px] font-mono text-slate-400 tracking-wide truncate tabular-nums">
              {isSearching
                ? `FAIXA MMR: ${Math.max(100, displayMmr - mmrTolerance)} – ${displayMmr + mmrTolerance}`
                : 'TEMPO ESTIMADO: 1:30 MIN.'}
            </div>
          </div>
        </div>

        <div className="px-2.5 pb-2 grid grid-cols-10 gap-1">
          {Array.from({ length: requiredPlayers }, (_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-xs transition-all duration-200 ${
                idx < shownPlayersCount
                  ? 'bg-gradient-to-r from-sky-400 to-cyan-300 shadow-[0_0_8px_rgba(56,189,248,0.9)]'
                  : 'bg-slate-800 border border-white/10'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
