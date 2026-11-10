import React, { useEffect } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { WARFACE_RANKS } from '../progression/ranks';
import { WarfaceRankIcon } from './WarfaceRankIcon';

interface WarfaceRankUpModalProps {
  rankLevel: number;
  onConfirm: () => void;
}

/**
 * Tela dedicada de Promoção de Patente do Warface exibida no Menu Principal
 * quando o jogador sai de uma partida após atingir o XP necessário para subir de nível.
 * Recria fielmente o layout oficial da referência ("Parabéns! Você atingiu uma nova patente!").
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
  }, [rankLevel]);

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playMenuSelect();
    onConfirm();
  };

  return (
    <div
      onClick={handleConfirm}
      className="fixed inset-0 z-50 bg-black/92 flex flex-col items-center justify-center px-4 select-none animate-in fade-in duration-300"
    >
      {/* Brilho radial sutil ao fundo da caixa de patente */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,88,12,0.12)_0%,rgba(0,0,0,0.96)_68%)] pointer-events-none" />

      {/* Container Principal Estilo Warface */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-3xl flex flex-col items-center text-center py-6"
      >
        {/* Linha Horizontal Superior Laranja-Avermelhada */}
        <div className="w-full h-[1.5px] bg-gradient-to-r from-transparent via-[#c85a3c] to-transparent opacity-90" />

        {/* Seção Superior: Cofre Tático 3D ao Fundo + Textos + Insígnia da Patente */}
        <div className="relative w-full py-7 sm:py-9 flex flex-col items-center justify-center">
          {/* Caixa Metálica 3D Warface ao fundo do emblema */}
          <div className="relative w-40 h-44 sm:w-48 sm:h-52 flex flex-col items-center justify-center">
            <svg
              viewBox="0 0 200 220"
              className="absolute inset-0 w-full h-full drop-shadow-[0_18px_35px_rgba(0,0,0,0.95)]"
            >
              <defs>
                <linearGradient id="wfBoxTop" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#27303f" />
                </linearGradient>
                <linearGradient id="wfBoxBody" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#333d4d" />
                  <stop offset="50%" stopColor="#1e2430" />
                  <stop offset="100%" stopColor="#12161f" />
                </linearGradient>
                <linearGradient id="wfRibbonRed" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7f1d1d" />
                  <stop offset="50%" stopColor="#dc2626" />
                  <stop offset="100%" stopColor="#7f1d1d" />
                </linearGradient>
              </defs>

              {/* Topo chanfrado 3D do cofre */}
              <polygon
                points="24,14 176,14 188,26 12,26"
                fill="url(#wfBoxTop)"
                stroke="#94a3b8"
                strokeWidth="1"
              />
              {/* Corpo blindado principal */}
              <rect
                x="12"
                y="26"
                width="176"
                height="168"
                rx="4"
                fill="url(#wfBoxBody)"
                stroke="#475569"
                strokeWidth="1.5"
              />
              {/* Linhas técnicas de encaixe do cofre */}
              <path
                d="M12 135 H58 V162 H142 V135 H188"
                fill="none"
                stroke="#090c10"
                strokeWidth="3.5"
              />
              <line
                x1="76"
                y1="14"
                x2="76"
                y2="65"
                stroke="#090c10"
                strokeWidth="2.5"
              />
              {/* Brasão V escuro entalhado no centro do cofre */}
              <polygon
                points="68,68 100,145 132,68 115,68 100,108 85,68"
                fill="#0b0e14"
                stroke="#334155"
                strokeWidth="1.2"
              />
              {/* Fita Militar Vermelha & Dourada abaixo do brasão */}
              <rect
                x="62"
                y="130"
                width="76"
                height="14"
                rx="2"
                fill="url(#wfRibbonRed)"
                stroke="#f59e0b"
                strokeWidth="1.2"
              />
              <line
                x1="78"
                y1="130"
                x2="78"
                y2="144"
                stroke="#fbbf24"
                strokeWidth="2"
              />
              <line
                x1="122"
                y1="130"
                x2="122"
                y2="144"
                stroke="#fbbf24"
                strokeWidth="2"
              />
            </svg>

            {/* Textos Superiores Sobrepostos ao Topo do Cofre */}
            <div className="relative z-10 -mt-6 flex flex-col items-center">
              <h2 className="font-display font-bold text-xl sm:text-3xl text-white tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                Parabéns!
              </h2>
              <p className="font-display font-bold text-base sm:text-2xl text-white tracking-wide mt-0.5 whitespace-nowrap drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                Você atingiu uma nova patente!
              </p>
            </div>

            {/* Emblema Oficial da Patente Dourada no Centro */}
            <div className="relative z-10 mt-3 mb-1 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-amber-400/25 blur-xl scale-125 pointer-events-none" />
              <WarfaceRankIcon
                level={rankDef.level}
                className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-[0_6px_16px_rgba(250,204,21,0.65)]"
              />
            </div>
          </div>

          {/* Subtítulo Cinza + Nome da Patente em Branco */}
          <div className="relative z-10 mt-2 flex flex-col items-center">
            <p className="text-[11px] sm:text-xs font-sans text-slate-500 tracking-wide">
              Chegue a uma nova patente para receber um Bônus aleatório.
            </p>
            <div className=" -mt-2 sm:-mt-2.5 font-display font-bold text-base sm:text-xl text-white tracking-wide drop-shadow-[0_2px_6px_rgba(0,0,0,1)]">
              {rankDef.title}
            </div>
          </div>
        </div>

        {/* Segunda Linha Horizontal Laranja-Avermelhada */}
        <div className="w-full h-[1.5px] bg-gradient-to-r from-transparent via-[#c85a3c] to-transparent opacity-90" />

        {/* Título Gigante Dourado: PATENTE XX WARFACE */}
        <div className="py-4 sm:py-5 flex flex-col items-center">
          <h1 className="font-display font-black text-3xl sm:text-5xl md:text-6xl tracking-[0.06em] uppercase text-transparent bg-clip-text bg-gradient-to-b from-[#fff7ad] via-[#facc15] to-[#ca8a04] drop-shadow-[0_4px_20px_rgba(234,179,8,0.45)]">
            PATENTE {rankDef.level} WARFACE
          </h1>

          {/* Recompensa Desbloqueada + Bônus em Créditos */}
          <div className="mt-2 px-3.5 py-1 rounded bg-amber-500/10 border border-amber-400/30 text-[10px] sm:text-xs font-mono text-amber-300 tracking-wider">
            RECOMPENSA: {rankDef.unlockRewardLabel} · BÔNUS +$1.500
          </div>

          <p className="mt-3 text-[11px] sm:text-xs font-sans text-slate-400 tracking-wide">
            Clique em OK para abrir
          </p>
        </div>

        {/* Botão OK com Borda Laranja-Avermelhada Idêntico ao Warface */}
        <button
          type="button"
          onClick={handleConfirm}
          className="mt-2 w-44 sm:w-52 py-1.5 bg-[#0b0d12] hover:bg-[#1c1210] active:scale-95 border border-[#c85a3c] text-[#e06d4f] hover:text-amber-300 font-display font-bold text-xs sm:text-sm tracking-[0.15em] uppercase transition-all cursor-pointer shadow-[0_0_16px_rgba(200,90,60,0.25)]"
        >
          OK
        </button>
      </div>
    </div>
  );
};
