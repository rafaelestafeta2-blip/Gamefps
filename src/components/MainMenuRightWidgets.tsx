import React from 'react';
import { soundEngine } from '../audio/soundEngine';
import { DrillMode } from '../types/game';
import {
  CompetitiveRankBadgeSvg,
  CompetitiveRankTier,
} from './RankedInsigniasSvg';

export type MainMenuPlayModeId =
  | 'CASUAL_DUST2'
  | 'CASUAL_ASSAULT'
  | 'RANKED'
  | 'PRIVATE_ROOM'
  | 'RANGE'
  | 'KILLHOUSE'
  | 'VS_AI';

export const PLAY_MODE_OPTIONS: Array<{
  id: MainMenuPlayModeId;
  label: string;
  arena?: DrillMode;
}> = [
  { id: 'CASUAL_DUST2', label: 'CASUAL 5V5 · DUST2', arena: 'DUST2_BOMB_5V5' },
  { id: 'CASUAL_ASSAULT', label: 'CASUAL 5V5 · ASSAULT', arena: 'ASSAULT_BOMB_5V5' },
  { id: 'RANKED', label: 'COMPETITIVO RANKED', arena: 'DUST2_BOMB_5V5' },
  { id: 'PRIVATE_ROOM', label: 'SALA PRIVADA (X1)', arena: 'DUST2_BOMB_5V5' },
  { id: 'RANGE', label: 'ESTANDE DE TIRO' },
  { id: 'KILLHOUSE', label: 'KILLHOUSE CQB', arena: 'KILLHOUSE_BLITZ' },
  { id: 'VS_AI', label: 'CONTRA IA', arena: 'TACTICAL_WAVE' },
];

interface MainMenuRightWidgetsProps {
  currentRank: CompetitiveRankTier;
  nextRank: CompetitiveRankTier | null;
  playerMmr: number;
  progressPct: number;
  selectedPlayMode: MainMenuPlayModeId;
  onCyclePlayMode: (next: MainMenuPlayModeId) => void;
  onLaunchSelectedMode: () => void;
  onOpenRankedScreen: () => void;
  onOpenRanksModal: () => void;
  onOpenWeaponSelect: () => void;
  weaponName: string;
  onHover: () => void;
}

export const MainMenuRightWidgets: React.FC<MainMenuRightWidgetsProps> = ({
  currentRank,
  nextRank,
  playerMmr,
  progressPct,
  selectedPlayMode,
  onCyclePlayMode,
  onLaunchSelectedMode,
  onOpenRankedScreen,
  onOpenRanksModal,
  onOpenWeaponSelect,
  weaponName,
  onHover,
}) => {
  const activeModeMeta =
    PLAY_MODE_OPTIONS.find((m) => m.id === selectedPlayMode) || PLAY_MODE_OPTIONS[0];

  const handleNextMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playMenuSelect();
    const idx = PLAY_MODE_OPTIONS.findIndex((m) => m.id === selectedPlayMode);
    const nextIdx = (idx + 1) % PLAY_MODE_OPTIONS.length;
    onCyclePlayMode(PLAY_MODE_OPTIONS[nextIdx].id);
  };

  return (
    <div className="h-full min-h-0 flex flex-col justify-between items-end gap-2 w-[220px] sm:w-[258px] shrink-0 pointer-events-auto py-1">
      <div className="w-full flex flex-col gap-2">
        {/* 1. TEMPORADA 1: A NOVA ERA */}
        <div
          onClick={() => {
            soundEngine.playMenuSelect();
            onOpenRankedScreen();
          }}
          onMouseEnter={onHover}
          className="relative overflow-hidden rounded-lg bg-gradient-to-br from-[#2a090d]/92 via-[#15080c]/92 to-[#0b0d13]/92 border border-red-500/50 hover:border-red-400 px-3 py-2 shadow-[0_6px_22px_rgba(220,38,38,0.22)] cursor-pointer transition-all group backdrop-blur-md"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-display font-black text-xs sm:text-sm tracking-wider uppercase text-white leading-tight">
                TEMPORADA 1
                <span className="block text-red-500 group-hover:text-red-400">
                  A NOVA ERA
                </span>
              </div>
              <div className="text-[8px] font-mono text-amber-300 font-semibold mt-0.5">
                ⏱ Restante: 29d 15h
              </div>
            </div>
            <CompetitiveRankBadgeSvg
              tier="LEGEND"
              className="w-10 h-10 shrink-0 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]"
            />
          </div>
        </div>

        {/* 2. PATENTE RANKED & ARMA EQUIPADA */}
        <div className="rounded-lg bg-[#0c0f16]/90 border border-white/15 shadow-[0_6px_18px_rgba(0,0,0,0.7)] overflow-hidden backdrop-blur-md">
          <div className="px-2.5 py-1.5 border-b border-red-500/25 bg-[#131722]/90 flex items-center justify-between">
            <span className="font-display font-bold text-[9px] tracking-wider uppercase text-slate-200">
              PATENTE RANKED
            </span>
            <span className="font-mono font-bold text-[9px] text-amber-300 tabular-nums">
              {playerMmr.toLocaleString('pt-BR')} MMR
            </span>
          </div>

          <div className="p-2.5 flex items-center gap-2.5">
            <CompetitiveRankBadgeSvg
              tier={currentRank.id}
              className="w-11 h-11 shrink-0 drop-shadow-[0_0_12px_rgba(239,68,68,0.45)]"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-[10px] font-display font-black text-white uppercase">
                <span className="truncate">{currentRank.name}</span>
                <span className="font-mono text-amber-300 text-[9px] tabular-nums">
                  {Math.round(progressPct)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-black/80 border border-white/15 rounded-full overflow-hidden my-1">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-yellow-300 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[8px] font-mono text-slate-400 truncate">
                  {nextRank ? `Próx: ${nextRank.shortName}` : 'Máximo'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playMenuSelect();
                    onOpenRanksModal();
                  }}
                  className="text-[8px] font-mono font-bold uppercase text-red-300 hover:text-white cursor-pointer shrink-0"
                >
                  DETALHES &gt;
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playMenuSelect();
              onOpenWeaponSelect();
            }}
            className="w-full px-2.5 py-1 bg-black/45 hover:bg-red-950/40 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-slate-300 hover:text-white cursor-pointer transition-colors"
          >
            <span className="truncate">ARMA: <strong className="text-amber-300">{weaponName}</strong></span>
            <span className="text-[8px] text-slate-400 shrink-0">TROCAR &gt;</span>
          </button>
        </div>
      </div>

      {/* 3. MODO DE JOGO + INICIAR >> */}
      <div className="w-full rounded-lg overflow-hidden border-2 border-red-500 shadow-[0_0_26px_rgba(239,68,68,0.5)] bg-gradient-to-r from-[#5a0b12]/95 via-[#8e1018]/95 to-[#b91c1c]/95 shrink-0">
        <button
          type="button"
          onMouseEnter={onHover}
          onClick={handleNextMode}
          title="Alternar Modo de Jogo"
          className="w-full px-3 py-1.5 bg-black/45 hover:bg-black/60 border-b border-red-400/40 flex items-center justify-between gap-2 text-left cursor-pointer transition-colors"
        >
          <span className="font-display font-extrabold text-[9px] sm:text-[10px] tracking-wider uppercase text-white truncate">
            ⌖ <span className="text-amber-300">{activeModeMeta.label}</span>
          </span>
          <span className="text-[8px] font-mono font-bold text-red-200 uppercase shrink-0">
            TROCAR ↻
          </span>
        </button>

        <button
          type="button"
          onMouseEnter={onHover}
          onClick={() => {
            soundEngine.playMenuSelect();
            onLaunchSelectedMode();
          }}
          className="w-full py-2.5 px-4 flex items-center justify-center gap-2 hover:brightness-115 active:scale-[0.99] transition-all cursor-pointer"
        >
          <span className="font-display font-black text-xl sm:text-2xl tracking-[0.14em] italic uppercase text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
            INICIAR
          </span>
          <span className="font-display font-black text-xl sm:text-2xl text-red-200 drop-shadow-[0_0_8px_rgba(248,113,113,0.95)]">
            »
          </span>
        </button>
      </div>
    </div>
  );
};
