import React, { useEffect, useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { mobileHardware } from '../mobile/nativeHardware';

interface IntroScreenProps {
  onComplete: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'FADE_IN' | 'LOGO_LOCK' | 'FADE_OUT'>('FADE_IN');

  const handleStartFullscreen = () => {
    void mobileHardware.enterFullscreenLandscape();
    onComplete();
  };

  useEffect(() => {
    // Attempt audio on mount (or on first interaction)
    const playAudio = () => {
      soundEngine.playIntroTheme();
    };

    const audioTimer = setTimeout(playAudio, 200);
    const lockTimer = setTimeout(() => setPhase('LOGO_LOCK'), 1400);
    const fadeOutTimer = setTimeout(() => setPhase('FADE_OUT'), 5200);
    const completeTimer = setTimeout(onComplete, 5800);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
        handleStartFullscreen();
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      clearTimeout(audioTimer);
      clearTimeout(lockTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(completeTimer);
      window.removeEventListener('keydown', onKey);
    };
  }, [onComplete]);

  return (
    <div
      onClick={handleStartFullscreen}
      className={`fixed inset-0 z-50 bg-[#05070a] flex flex-col items-center justify-center select-none cursor-pointer overflow-hidden transition-opacity duration-500 ${
        phase === 'FADE_OUT' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Background Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.12)_0%,rgba(15,23,42,0.4)_50%,#05070a_85%)] pointer-events-none" />

      {/* Cyber Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Main Logo Container */}
      <div
        className={`relative z-10 flex flex-col items-center transform transition-all duration-700 ${
          phase === 'LOGO_LOCK'
            ? 'scale-100 opacity-100'
            : 'scale-90 opacity-80'
        }`}
      >
        {/* Tactical Crest / Emblem */}
        <div className="relative mb-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-600 to-amber-800 p-[2px] shadow-[0_0_50px_rgba(245,158,11,0.4)] flex items-center justify-center">
            <div className="w-full h-full bg-[#0a0d14] rounded-2xl flex items-center justify-center relative overflow-hidden">
              {/* Inner glowing geometric crosshair emblem */}
              <svg
                width="64"
                height="64"
                viewBox="0 0 64 64"
                className="text-amber-400"
                fill="none"
              >
                <circle
                  cx="32"
                  cy="32"
                  r="24"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  className="opacity-40 animate-spin"
                  style={{ animationDuration: '14s' }}
                />
                <path
                  d="M32 10 L48 24 L48 40 L32 54 L16 40 L16 24 Z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                />
                <circle cx="32" cy="32" r="5" fill="#f59e0b" />
                <line x1="32" y1="16" x2="32" y2="24" stroke="currentColor" strokeWidth="2" />
                <line x1="32" y1="40" x2="32" y2="48" stroke="currentColor" strokeWidth="2" />
                <line x1="16" y1="32" x2="24" y2="32" stroke="currentColor" strokeWidth="2" />
                <line x1="40" y1="32" x2="48" y2="32" stroke="currentColor" strokeWidth="2" />
              </svg>
              {/* Subtle sweep highlight */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            </div>
          </div>
          {/* Subtle amber pulse ring */}
          <div className="absolute -inset-2 rounded-3xl border border-amber-400/30 -z-10 animate-ping opacity-25" style={{ animationDuration: '3s' }} />
        </div>

        {/* Studio Title Typography */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-[0.22em] uppercase font-display bg-gradient-to-b from-white via-slate-200 to-amber-400/90 bg-clip-text text-transparent drop-shadow-[0_2px_20px_rgba(245,158,11,0.45)]">
            RAFAEL GAMES
          </h1>

          <div className="flex items-center justify-center gap-3 mt-3">
            <span className="h-[1px] w-8 sm:w-16 bg-gradient-to-r from-transparent to-amber-500/80" />
            <span className="font-mono text-xs sm:text-sm tracking-[0.35em] text-amber-400/90 font-semibold uppercase">
              STUDIOS · INTERACTIVE
            </span>
            <span className="h-[1px] w-8 sm:w-16 bg-gradient-to-l from-transparent to-amber-500/80" />
          </div>

          <p className="mt-4 font-mono text-[10px] sm:text-xs text-slate-400/70 tracking-widest uppercase">
            DESENVOLVEDOR INDEPENDENTE · BRASIL
          </p>

          <div className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-semibold tracking-wider animate-pulse">
            <span>⛶</span>
            <span>CLIQUE PARA ENTRAR EM TELA CHEIA (HORIZONTAL)</span>
          </div>
        </div>
      </div>

      {/* Skip Prompt */}
      <div className="absolute bottom-6 right-6 z-20 pointer-events-auto">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleStartFullscreen();
          }}
          className="px-3.5 py-1.5 rounded-lg bg-black/60 hover:bg-slate-900 border border-white/15 text-slate-400 hover:text-white font-mono text-xs tracking-wider transition-colors cursor-pointer"
        >
          Pular [Espaço] ➔
        </button>
      </div>
    </div>
  );
};
