import React from 'react';
import { soundEngine } from '../audio/soundEngine';
import {
  COMPETITIVE_RANKS,
  CompetitiveRankBadgeSvg,
  CompetitiveRankTier,
  SeasonalOperatorSuitSvg,
  SeasonalWeaponSkinSvg,
} from './RankedInsigniasSvg';

interface RankedRightWidgetsProps {
  currentRank: CompetitiveRankTier;
  nextRank: CompetitiveRankTier | null;
  rankPage: 0 | 1;
  onChangeRankPage: (page: 0 | 1) => void;
  onOpenAllRanks: () => void;
  isSearching: boolean;
  shownPlayersCount: number;
  requiredPlayers: number;
  onToggleSearch: () => void;
}

export const RankedRightWidgets: React.FC<RankedRightWidgetsProps> = ({
  currentRank,
  nextRank,
  rankPage,
  onChangeRankPage,
  onOpenAllRanks,
  isSearching,
  shownPlayersCount,
  requiredPlayers,
  onToggleSearch,
}) => {
  const showcaseTiers =
    rankPage === 0
      ? [COMPETITIVE_RANKS[6], COMPETITIVE_RANKS[5], COMPETITIVE_RANKS[4]]
      : [COMPETITIVE_RANKS[3], COMPETITIVE_RANKS[2], COMPETITIVE_RANKS[1]];

  return (
    <div className="col-span-4 h-full min-h-0 flex flex-col gap-1.5 sm:gap-2 items-end justify-between">
      <div className="w-full max-w-[318px] flex flex-col gap-1.5 sm:gap-2">
        {/* 1. TEMPORADA 1: A NOVA ERA (Hero Card estilo AAA) */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0b1f3f]/95 via-[#09162e]/95 to-[#060d1c]/95 border border-sky-400/45 rounded-md px-3 py-1.5 sm:py-2 shadow-[0_6px_22px_rgba(14,165,233,0.22)]">
          <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-sky-500/20 blur-xl pointer-events-none" />
          <div className="flex items-center justify-between gap-2 relative z-10">
            <div className="min-w-0">
              <div className="font-display font-black text-[11px] sm:text-xs tracking-wider uppercase text-white leading-tight">
                TEMPORADA 1: <span className="text-sky-400">A NOVA ERA</span>
              </div>
              <div className="text-[8px] sm:text-[9px] font-mono text-amber-300/95 font-semibold mt-0.5">
                ⏱ RESTANTE: 24D 15H
              </div>
            </div>
            <CompetitiveRankBadgeSvg
              tier="LEGEND"
              className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 drop-shadow-[0_0_10px_rgba(251,191,36,0.55)]"
            />
          </div>
        </div>

        {/* 2. RECOMPENSAS DA TEMPORADA */}
        <div className="bg-[#091326]/92 border border-sky-400/35 rounded-md shadow-[0_6px_18px_rgba(0,0,0,0.65)] overflow-hidden">
          <div className="px-2.5 py-1 border-b border-sky-400/20 bg-[#0e1c36]/95 flex items-center justify-between">
            <span className="font-display font-bold text-[9px] sm:text-[10px] tracking-wider uppercase text-slate-100">
              RECOMPENSAS DA TEMPORADA
            </span>
            <span className="text-[8px] font-mono text-sky-300 uppercase">ELITE+</span>
          </div>
          <div className="px-2 py-1.5 grid grid-cols-2 gap-1.5 items-center">
            <div className="flex flex-col items-center text-center bg-black/25 border border-white/10 rounded py-1 px-1">
              <SeasonalWeaponSkinSvg className="w-20 sm:w-22 h-7 sm:h-8 drop-shadow-[0_4px_10px_rgba(251,191,36,0.3)]" />
              <span className="text-[7px] sm:text-[8px] font-mono font-bold uppercase tracking-wider text-slate-200 mt-0.5">
                SKIN EXCLUSIVA
              </span>
            </div>
            <div className="flex flex-col items-center text-center bg-black/25 border border-white/10 rounded py-1 px-1">
              <SeasonalOperatorSuitSvg className="w-11 sm:w-12 h-7 sm:h-8 drop-shadow-[0_4px_10px_rgba(56,189,248,0.4)]" />
              <span className="text-[7px] sm:text-[8px] font-mono font-bold uppercase tracking-wider text-slate-200 mt-0.5">
                TRAJE VANGUARD
              </span>
            </div>
          </div>
        </div>

        {/* 3. AVANÇO DE PATENTE + VER TODAS */}
        <div className="bg-[#091326]/92 border border-sky-400/35 rounded-md shadow-[0_6px_18px_rgba(0,0,0,0.65)] overflow-hidden">
          <div className="px-2.5 py-1 border-b border-sky-400/20 bg-[#0e1c36]/95 flex items-center justify-between">
            <span className="font-display font-bold text-[9px] sm:text-[10px] tracking-wider uppercase text-slate-100">
              AVANÇO DE PATENTE
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onChangeRankPage(0)}
                className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold cursor-pointer ${
                  rankPage === 0 ? 'bg-sky-500 text-slate-950' : 'bg-white/10 text-slate-300'
                }`}
              >
                ELITE+
              </button>
              <button
                type="button"
                onClick={() => onChangeRankPage(1)}
                className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold cursor-pointer ${
                  rankPage === 1 ? 'bg-sky-500 text-slate-950' : 'bg-white/10 text-slate-300'
                }`}
              >
                BASE
              </button>
            </div>
          </div>

          <div className="px-2 pt-1.5 pb-1.5">
            <div className="grid grid-cols-3 gap-1.5 items-center text-center">
              {showcaseTiers.map((tier) => {
                const isCurr = tier.id === currentRank.id;
                const isNxt = nextRank?.id === tier.id;
                return (
                  <div
                    key={tier.id}
                    onClick={onOpenAllRanks}
                    className={`flex flex-col items-center p-1 rounded border transition-all cursor-pointer ${
                      isCurr
                        ? 'bg-sky-500/20 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.35)]'
                        : isNxt
                          ? 'bg-amber-500/15 border-amber-400/70'
                          : 'bg-black/30 border-white/10 hover:border-white/30'
                    }`}
                  >
                    <CompetitiveRankBadgeSvg tier={tier.id} className="w-8 h-8 sm:w-9 sm:h-9" />
                    <span className="text-[8px] font-display font-bold text-white uppercase leading-tight mt-0.5">
                      {tier.shortName}
                    </span>
                    <span
                      className={`text-[7px] font-mono font-extrabold uppercase ${
                        isCurr ? 'text-sky-300' : isNxt ? 'text-amber-300' : 'text-slate-400'
                      }`}
                    >
                      {isCurr ? '● ATUAL' : isNxt ? '▲ PRÓXIMA' : `${tier.minMmr}`}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playMenuSelect();
                onOpenAllRanks();
              }}
              className="mt-1.5 w-full py-1 px-2 rounded bg-gradient-to-r from-sky-600/35 via-indigo-600/35 to-sky-600/35 hover:from-sky-500/50 hover:to-indigo-500/50 border border-sky-400/50 text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-wider text-sky-200 hover:text-white transition-all cursor-pointer"
            >
              VISUALIZAR TODAS AS PATENTES ›
            </button>
          </div>
        </div>
      </div>

      {/* 4. BOTÃO PRINCIPAL INFERIOR DIREITO: ENCONTRAR PARTIDA COMPETITIVA */}
      <button
        type="button"
        onClick={onToggleSearch}
        className={`w-full max-w-[318px] py-2 sm:py-2.5 px-3 rounded-md border-2 font-display font-black text-xs sm:text-sm tracking-[0.08em] uppercase text-center transition-all cursor-pointer shrink-0 ${
          isSearching
            ? 'bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 border-amber-300 text-white shadow-[0_0_24px_rgba(239,68,68,0.65)] hover:brightness-110'
            : 'bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#2563eb] border-sky-300 text-white shadow-[0_0_26px_rgba(56,189,248,0.6)] hover:brightness-110'
        }`}
      >
        {isSearching ? (
          <span className="block leading-tight">
            BUSCANDO ({shownPlayersCount}/{requiredPlayers}) · CANCELAR ✕
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2 leading-tight">
            <span>ENCONTRAR PARTIDA</span>
            <span className="text-sky-100 text-sm">»</span>
          </span>
        )}
      </button>
    </div>
  );
};
