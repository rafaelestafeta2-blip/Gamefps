import React from 'react';
import { soundEngine } from '../audio/soundEngine';
import { DrillMode } from '../types/game';
import { MapPreviewBanner } from './MapPreviewBanner';
import {
  WARFACE_CLASS_META,
  WarfaceClassIcon,
  WarfaceClassId,
} from './WarfaceClassIcons';
import {
  CompetitiveRankBadgeSvg,
  CompetitiveRankTier,
} from './RankedInsigniasSvg';

export type MainMenuPlayModeId =
  | 'CASUAL_DUST2'
  | 'CASUAL_ASSAULT'
  | 'CASUAL_INDUSTRIA'
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
  { id: 'CASUAL_DUST2', label: 'CASUAL 5V5 - DUST2', arena: 'DUST2_BOMB_5V5' },
  { id: 'CASUAL_ASSAULT', label: 'CASUAL 5V5 - ASSAULT', arena: 'ASSAULT_BOMB_5V5' },
  { id: 'CASUAL_INDUSTRIA', label: 'CASUAL 5V5 - INDUSTRIA', arena: 'INDUSTRIA_BOMB_5V5' },
  { id: 'RANKED', label: 'RANKED 5V5 - DUST2', arena: 'DUST2_BOMB_5V5' },
  { id: 'PRIVATE_ROOM', label: 'SALA PRIVADA - DUST2', arena: 'DUST2_BOMB_5V5' },
  { id: 'RANGE', label: 'ESTANDE DE TIRO' },
  { id: 'KILLHOUSE', label: 'KILLHOUSE CQB', arena: 'KILLHOUSE_BLITZ' },
  { id: 'VS_AI', label: 'CONTRA IA - PATRULHAS', arena: 'TACTICAL_WAVE' },
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
  onOpenInventory: () => void;
  selectedClass: WarfaceClassId;
  weaponName: string;
  onHover: () => void;
}

const CHAMFER_CLIP =
  'polygon(8px 0%, calc(100% - 8px) 0%, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0% calc(100% - 8px), 0% 8px)';

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
  onOpenInventory,
  selectedClass,
  weaponName,
  onHover,
}) => {
  const activeModeMeta =
    PLAY_MODE_OPTIONS.find((m) => m.id === selectedPlayMode) || PLAY_MODE_OPTIONS[0];
  const classMeta = WARFACE_CLASS_META[selectedClass];

  const handleNextMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playMenuSelect();
    const idx = PLAY_MODE_OPTIONS.findIndex((m) => m.id === selectedPlayMode);
    const nextIdx = (idx + 1) % PLAY_MODE_OPTIONS.length;
    onCyclePlayMode(PLAY_MODE_OPTIONS[nextIdx].id);
  };

  const displayPct = Math.max(3, Math.round(progressPct));

  return (
    <div className="h-full max-h-full min-h-0 flex flex-col justify-between items-end gap-1.5 lg:gap-2 w-[224px] sm:w-[248px] lg:w-[312px] shrink-0 pointer-events-auto py-0.5">
      {/* BLOCO SUPERIOR: TEMPORADA 1 + PATENTE RANKED */}
      <div className="w-full flex flex-col gap-1.5 lg:gap-2 min-h-0">
        {/* 1. CARD TEMPORADA 1: A NOVA ERA */}
        <div
          onClick={() => {
            soundEngine.playMenuSelect();
            onOpenRankedScreen();
          }}
          onMouseEnter={onHover}
          style={{ clipPath: CHAMFER_CLIP }}
          className="relative overflow-hidden bg-gradient-to-r from-[#24070b]/95 via-[#14070a]/95 to-[#2b090e]/95 border border-red-500/80 hover:border-red-400 px-2.5 py-1.5 lg:px-3.5 lg:py-2.5 shadow-[0_0_22px_rgba(239,68,68,0.32)] cursor-pointer transition-all group backdrop-blur-md shrink-0"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-display font-black text-[11px] lg:text-base tracking-wider uppercase text-white leading-tight">
                TEMPORADA 1
                <span className="block text-red-500 group-hover:text-red-400">
                  A NOVA ERA
                </span>
              </div>
              <div className="flex items-center gap-1 text-[8px] lg:text-[10px] font-mono text-amber-400 font-semibold mt-0.5 lg:mt-1">
                <span>🕒</span>
                <span>Restante: 29d 15h</span>
              </div>
            </div>
            <CompetitiveRankBadgeSvg
              tier="LEGEND"
              className="w-9 h-9 lg:w-14 lg:h-14 shrink-0 drop-shadow-[0_0_14px_rgba(251,191,36,0.65)]"
            />
          </div>
        </div>

        {/* 2. CARD PATENTE RANKED + CLASSE E ARMA EQUIPADA */}
        <div
          style={{ clipPath: CHAMFER_CLIP }}
          className="bg-[#0b0e15]/92 border border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-md shrink-0"
        >
          <div className="px-2.5 py-1 lg:px-3 lg:py-1.5 border-b border-white/10 bg-[#11151f]/90 flex items-center justify-between">
            <span className="font-display font-extrabold text-[9px] lg:text-[11px] tracking-wider uppercase text-white">
              PATENTE RANKED
            </span>
            <span className="font-mono font-bold text-[9px] lg:text-xs text-amber-400 tabular-nums">
              {playerMmr.toLocaleString('pt-BR')} MMR
            </span>
          </div>

          <div className="px-2.5 py-1.5 lg:px-3 lg:py-2 flex items-center gap-2 lg:gap-3">
            <CompetitiveRankBadgeSvg
              tier={currentRank.id}
              className="w-9 h-9 lg:w-13 lg:h-13 shrink-0 drop-shadow-[0_0_12px_rgba(56,189,248,0.45)]"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-[11px] lg:text-sm font-display font-black text-white uppercase leading-none">
                <span className="truncate">{currentRank.name}</span>
                <span className="font-mono text-amber-400 text-[9px] lg:text-xs tabular-nums">
                  {displayPct}%
                </span>
              </div>
              <div className="w-full h-1 lg:h-1.5 bg-black/85 border border-white/10 rounded-full overflow-hidden my-1 lg:my-1.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-300"
                  style={{ width: `${Math.max(6, displayPct)}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-1 leading-none">
                <span className="text-[8px] lg:text-[10px] font-mono text-slate-400 truncate">
                  {nextRank ? `Próx. ${nextRank.shortName}` : 'Patente Máxima'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playMenuSelect();
                    onOpenRanksModal();
                  }}
                  className="text-[8px] lg:text-[10px] font-mono font-bold uppercase text-red-400 hover:text-red-300 cursor-pointer shrink-0"
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
              onOpenInventory();
            }}
            className="w-full px-2.5 py-1 lg:px-3 lg:py-1.5 bg-black/55 hover:bg-red-950/35 border-t border-white/10 flex items-center justify-between gap-2 text-[8px] lg:text-[10px] font-mono text-slate-300 hover:text-white cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-1.5 min-w-0">
              <WarfaceClassIcon classId={selectedClass} className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
              <span className="truncate">
                <strong className="text-white">{classMeta.label}</strong>
                <span className="text-slate-400 mx-1">·</span>
                <strong className="text-amber-400">{weaponName}</strong>
              </span>
            </span>
            <span className="text-[8px] lg:text-[9px] text-amber-300 font-bold shrink-0">CLASSES &gt;</span>
          </button>
        </div>
      </div>

      {/* BLOCO INFERIOR: CARD COM A FOTO DO MAPA + BOTÃO INICIAR >> */}
      <div className="w-full flex flex-col gap-1.5 lg:gap-2 shrink-0">
        {/* 3. CARD DO MAPA SELECIONADO COM FOTO REAL DO MAPA (DUST2 / ASSAULT / ETC) */}
        <div
          onClick={handleNextMode}
          onMouseEnter={onHover}
          title="Clique para trocar o Modo de Jogo / Mapa"
          style={{ clipPath: CHAMFER_CLIP }}
          className="w-full bg-[#16070a]/95 border border-red-500/85 hover:border-red-400 shadow-[0_0_22px_rgba(239,68,68,0.38)] overflow-hidden cursor-pointer transition-all group"
        >
          <div className="px-2.5 py-1 lg:px-3 lg:py-1.5 bg-gradient-to-r from-[#28080d] via-[#18070a] to-[#24080c] border-b border-red-500/40 flex items-center justify-between gap-2">
            <span className="font-display font-extrabold text-[9px] lg:text-xs tracking-wider uppercase text-amber-400 truncate flex items-center gap-1">
              <span className="text-amber-300 text-[10px] lg:text-xs">✦</span>
              <span>{activeModeMeta.label}</span>
            </span>
            <span className="text-[8px] lg:text-[10px] font-mono font-bold text-slate-200 group-hover:text-white uppercase shrink-0">
              TROCAR ↻
            </span>
          </div>

          <div className="p-1 lg:p-1.5 bg-[#0d0608]">
            <div className="overflow-hidden rounded-xs border border-white/15">
              <MapPreviewBanner modeId={selectedPlayMode} />
            </div>
          </div>
        </div>

        {/* 4. BOTÃO GIGANTE INICIAR >> */}
        <button
          type="button"
          onMouseEnter={onHover}
          onClick={() => {
            soundEngine.playMenuSelect();
            onLaunchSelectedMode();
          }}
          style={{ clipPath: CHAMFER_CLIP }}
          className="relative w-full py-1.5 lg:py-3.5 px-4 lg:px-5 border-2 border-red-500 bg-gradient-to-r from-[#4c080d]/95 via-[#8f1119]/95 to-[#580910]/95 shadow-[0_0_30px_rgba(239,68,68,0.65)] hover:brightness-115 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 lg:gap-3 group"
        >
          <span className="font-display font-black text-xl lg:text-3xl tracking-[0.12em] italic uppercase text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
            INICIAR
          </span>
          <span className="font-display font-black text-xl lg:text-3xl text-red-300 group-hover:translate-x-1 transition-transform drop-shadow-[0_0_10px_rgba(248,113,113,0.95)]">
            »
          </span>
        </button>
      </div>
    </div>
  );
};
