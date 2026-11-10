import React, { useEffect, useState } from 'react';
import { mobileHardware } from '../mobile/nativeHardware';

const loadingArtwork = '/assets/images/tactical_loading_art_1794056561341.jpg';

interface LoadingScreenProps {
  onComplete: () => void;
  progress?: number;
  statusLabel?: string;
}

const TIPS = [
  'DICA: No estande de tiro, aproxime-se da parede de armas e aperte [E] para pegar qualquer armamento.',
  'DICA: O rifle Sniper Bolt cicla o ferrolho a cada tiro — aguarde o engatilhamento da próxima bala.',
  'DICA: Disparos em semi-automático oferecem maior precisão e controle de recuo em alvos distantes.',
  'DICA: No estande balístico, atire nos gongos de aço AR500 para ouvir o impacto sonoro característico.',
  'DICA: Pressione [H] para abrir a bancada e personalizar mira holográfica, LPVO, supressor e laser PEQ.',
  'DICA: Suba de patente no sistema Warface eliminando alvos para desbloquear novas armas e mira telescópica LPVO.',
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  onComplete,
  progress = 0,
  statusLabel,
}) => {
  const [tipIndex, setTipIndex] = useState(0);

  const displayProgress = Math.min(100, Math.max(0, progress));

  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 3000);

    return () => {
      clearInterval(tipInterval);
    };
  }, []);

  // Libera o Lobby assim que os recursos reais do Boot atingirem 100%
  useEffect(() => {
    if (displayProgress >= 100) {
      const timer = setTimeout(() => {
        onComplete();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [displayProgress, onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-[#05070a] select-none overflow-hidden flex flex-col justify-between">
      {/* Background Cinematic Artwork */}
      <div className="absolute inset-0">
        <img
          src={loadingArtwork}
          alt="Rafael Games Tactical Loading Artwork"
          className="w-full h-full object-cover object-center scale-105 animate-[pulse_10s_ease-in-out_infinite]"
        />
        {/* Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-[#05070a]/40 to-[#05070a]/80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,#05070a_95%)]" />
      </div>

      {/* Top Header Bar */}
      <div className="relative z-10 px-6 py-6 sm:px-10 sm:py-8 flex items-start justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center font-display font-black text-amber-400 text-lg shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            RG
          </div>
          <div>
            <h2 className="font-display font-bold text-sm sm:text-base tracking-[0.2em] text-white uppercase">
              RAFAEL GAMES
            </h2>
            <p className="font-mono text-[10px] text-amber-400/90 tracking-widest uppercase">
              KINETIC TACTICAL FPS · SIMULAÇÃO MILITAR
            </p>
          </div>
        </div>

        {/* System Telemetry Check */}
        <div className="hidden sm:flex flex-col items-end gap-1 font-mono text-[10px] tabular-nums text-slate-400 bg-black/60 px-3 py-2 rounded-lg border border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">PRELOADER:</span>
            <span className="text-emerald-400 font-semibold">THREE.LoadingManager + GPU Shaders</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">ARSENAL 3D:</span>
            <span className="text-emerald-400 font-semibold">8 ARMAS COMPILAÇÃO TOTAL</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">FÍSICA BALÍSTICA:</span>
            <span className="text-amber-400 font-semibold">ALTA PRECISÃO 120HZ</span>
          </div>
        </div>
      </div>

      {/* Bottom Loading Progress Bar & Tactical Tips */}
      <div className="relative z-10 px-6 py-8 sm:px-12 sm:py-10 max-w-4xl w-full mx-auto">
        {/* Dynamic Tip Readout */}
        <div className="mb-4 bg-black/70 border border-white/10 rounded-xl px-4 py-2.5 backdrop-blur-xs flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-ping" />
          <p className="font-mono text-xs sm:text-sm text-slate-200 tracking-wide line-clamp-2">
            {TIPS[tipIndex]}
          </p>
        </div>

        {/* Percentage & Loading Status */}
        <div className="flex justify-between items-baseline mb-2 font-mono text-xs">
          <span className="text-slate-400 uppercase tracking-wider flex items-center gap-2 truncate pr-4">
            <span className="text-amber-400 font-semibold">
              {statusLabel || 'CARREGANDO RECURSOS E SHADERS DO JOGO...'}
            </span>
          </span>
          <span className="text-amber-400 font-bold tabular-nums text-sm sm:text-base shrink-0">
            {Math.round(displayProgress)}%
          </span>
        </div>

        {/* Tactical Progress Bar */}
        <div className="w-full h-2.5 sm:h-3 bg-slate-900/90 rounded-full border border-white/20 p-[1px] overflow-hidden shadow-2xl">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-300 transition-all duration-150 shadow-[0_0_15px_rgba(245,158,11,0.8)] relative"
            style={{ width: `${displayProgress}%` }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[size:16px_16px] animate-[shimmer_1.2s_linear_infinite]" />
          </div>
        </div>
      </div>
    </div>
  );
};

