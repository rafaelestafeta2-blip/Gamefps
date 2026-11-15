import React from 'react';
import { YardBombHudInfo } from '../types/game';

interface PreRoundEquipOverlayProps {
  yardBomb: YardBombHudInfo;
}

/** Warface-style pre-round equip freeze (~7s) before combat starts. */
export const PreRoundEquipOverlay: React.FC<PreRoundEquipOverlayProps> = ({
  yardBomb,
}) => {
  const sec = Math.max(0, Math.ceil(yardBomb.equipTimerSec || 0));
  return (
    <div className="fixed inset-0 z-40 pointer-events-none select-none flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-[#04070e]/55" />
      <div className="relative z-10 flex flex-col items-center gap-3 px-6 py-5 rounded-2xl border border-amber-400/40 bg-[#0a1220]/92 shadow-[0_0_40px_rgba(245,158,11,0.25)]">
        <div className="text-[10px] font-mono tracking-[0.35em] text-amber-300/90 uppercase">
          Fase de Equipamento
        </div>
        <div className="font-display font-black text-5xl sm:text-6xl tabular-nums text-white drop-shadow-[0_0_18px_rgba(251,191,36,0.55)]">
          {sec}
        </div>
        <div className="text-sm sm:text-base font-display font-black tracking-wider text-sky-200 uppercase">
          Rodada {yardBomb.currentRound} · Prepare-se
        </div>
        <p className="text-[11px] font-mono text-slate-300 text-center max-w-xs">
          Todos os operadores têm 7 segundos para se posicionar e confirmar o loadout.
          O combate começa ao zerar o cronômetro.
        </p>
        <div className="w-48 h-1.5 rounded-full bg-slate-800 overflow-hidden border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-sky-400 transition-[width] duration-200"
            style={{ width: `${Math.min(100, (sec / 7) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
