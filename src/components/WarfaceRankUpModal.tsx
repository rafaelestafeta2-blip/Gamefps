import React, { useEffect } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { WARFACE_RANKS } from '../progression/ranks';
import { WarfaceRankIcon } from './WarfaceRankIcon';

interface WarfaceRankUpModalProps {
  rankLevel: number;
  onConfirm: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  INICIANTE: 'DIVISÃO DE BASE',
  SOLDADO: 'INFANTARIA DE LINHA',
  SARGENTO: 'COMANDO DE ESQUADRÃO',
  OFICIAL: 'CORPO DE OFICIAIS',
  COMANDANTE: 'ALTO COMANDO TÁTICO',
  SF_ELITE: 'FORÇAS ESPECIAIS (SF)',
  SUPREMO: 'COMANDO SUPREMO KINETIC',
};

/**
 * Modal compacto e premium de Promoção de Patente KINETIC exibido no Menu Principal
 * quando o jogador atinge o XP necessário para subir de nível.
 */
export const WarfaceRankUpModal: React.FC<WarfaceRankUpModalProps> = ({
  rankLevel,
  onConfirm,
}) => {
  const rankDef =
    WARFACE_RANKS.find((r) => r.level === rankLevel) ||
    WARFACE_RANKS[WARFACE_RANKS.length - 1];

  useEffect(() => {
    soundEngine.playMechanicalSwitch(1.35);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [rankLevel, onConfirm]);

  const handleConfirm = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    soundEngine.playMenuSelect();
    onConfirm();
  };

  const divisionLabel =
    CATEGORY_LABELS[rankDef.category] || 'DIVISÃO OPERACIONAL';

  return (
    <div
      onClick={() => handleConfirm()}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200"
    >
      {/* Card Compacto Tático Premium */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[360px] sm:max-w-[400px] rounded-xl bg-gradient-to-b from-[#111622]/98 via-[#0b0e17]/98 to-[#07090f]/98 border border-amber-400/35 shadow-[0_20px_60px_rgba(0,0,0,0.92),0_0_32px_rgba(245,158,11,0.14)] overflow-hidden text-center"
      >
        {/* Filete Superior Metálico Dourado */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

        {/* Brilho Radial Sutil no Topo */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-36 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />

        {/* Cabeçalho Micro-Tag KINETIC com Botão Fechar Explícito */}
        <div className="relative z-10 pt-3 pb-2 px-4 flex items-center justify-between border-b border-white/[0.07]">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
            <span className="font-mono text-[9px] font-bold tracking-[0.2em] text-amber-300/90 uppercase">
              KINETIC // PROMOÇÃO TÁTICA
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[9px] font-semibold tracking-widest text-slate-400 uppercase">
              NÍV. {String(rankDef.level).padStart(2, '0')} / 70
            </span>
            <button
              type="button"
              onClick={() => handleConfirm()}
              aria-label="Fechar janela de promoção"
              className="w-6 h-6 rounded flex items-center justify-center bg-white/5 hover:bg-amber-500/20 active:scale-90 border border-white/10 hover:border-amber-400/50 text-slate-400 hover:text-amber-300 font-mono text-xs font-bold transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Corpo Central: Moldura Hexagonal + Insígnia + Título da Patente */}
        <div className="relative z-10 px-5 pt-4 pb-3.5 flex flex-col items-center">
          {/* Emblema com Moldura Hexagonal Tática */}
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg
              viewBox="0 0 120 120"
              className="absolute inset-0 w-full h-full drop-shadow-[0_8px_20px_rgba(0,0,0,0.85)]"
            >
              <defs>
                <linearGradient id="kinHexBg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#090d16" />
                </linearGradient>
                <linearGradient id="kinHexStroke" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fde68a" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#78350f" />
                </linearGradient>
              </defs>
              <polygon
                points="60,6 108,33 108,87 60,114 12,87 12,33"
                fill="url(#kinHexBg)"
                stroke="url(#kinHexStroke)"
                strokeWidth="2"
              />
              <polygon
                points="60,13 101,37 101,83 60,107 19,83 19,37"
                fill="none"
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="4 3"
              />
            </svg>

            <div className="absolute inset-3 rounded-full bg-amber-400/15 blur-md pointer-events-none" />
            <WarfaceRankIcon
              level={rankDef.level}
              className="relative z-10 w-14 h-14 drop-shadow-[0_4px_12px_rgba(250,204,21,0.55)]"
            />
          </div>

          {/* Subtítulo da Divisão */}
          <span className="mt-2 font-mono text-[9px] font-bold tracking-[0.22em] text-amber-400/85 uppercase">
            {divisionLabel}
          </span>

          {/* Título Principal da Patente */}
          <h2 className="mt-0.5 font-display font-black text-xl sm:text-2xl tracking-wider uppercase text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
            {rankDef.title}
          </h2>

          {/* Selo de Nível */}
          <div className="mt-1 inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/35">
            <span className="font-mono font-black text-[10px] tracking-[0.16em] text-amber-300 uppercase">
              PATENTE NÍVEL {rankDef.level} ALCANÇADA
            </span>
          </div>

          {/* Caixa de Recompensa & Bônus */}
          <div className="mt-3.5 w-full rounded-lg bg-black/55 border border-white/10 p-2.5 text-left space-y-1.5">
            <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-wider text-slate-400">
              <span>DESBLOQUEIO DE CARREIRA</span>
              <span className="text-emerald-400 font-bold">+$1.500 CRÉDITOS</span>
            </div>
            <p className="font-sans text-[11px] font-semibold text-slate-200 leading-snug">
              {rankDef.unlockRewardLabel}
            </p>
          </div>

          {/* Botão de Confirmação */}
          <button
            type="button"
            onClick={handleConfirm}
            className="mt-3.5 w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-display font-black text-xs tracking-[0.2em] uppercase transition-all cursor-pointer shadow-[0_4px_18px_rgba(245,158,11,0.35)]"
          >
            CONTINUAR
          </button>
        </div>
      </div>
    </div>
  );
};
