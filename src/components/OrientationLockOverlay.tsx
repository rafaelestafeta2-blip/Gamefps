import React, { useEffect, useState } from 'react';
import { mobileHardware } from '../mobile/nativeHardware';

export const OrientationLockOverlay: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth && window.innerWidth < 1024;
  });

  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth && window.innerWidth < 1024;
      setIsPortrait(portrait);
    };

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    // Also attempt fullscreen landscape on first user interaction anywhere
    const onFirstUserGesture = () => {
      void mobileHardware.enterFullscreenLandscape();
    };

    window.addEventListener('pointerdown', onFirstUserGesture, { once: true });
    window.addEventListener('keydown', onFirstUserGesture, { once: true });

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      window.removeEventListener('pointerdown', onFirstUserGesture);
      window.removeEventListener('keydown', onFirstUserGesture);
    };
  }, []);

  if (!isPortrait) return null;

  return (
    <div
      onClick={() => {
        void mobileHardware.enterFullscreenLandscape();
      }}
      className="fixed inset-0 z-[100] bg-[#05070a]/98 text-white flex flex-col items-center justify-center p-6 text-center select-none backdrop-blur-xl"
    >
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.15)_0%,transparent_70%)] pointer-events-none" />

      {/* Animated Phone Rotation */}
      <div className="relative mb-8 flex items-center justify-center">
        <div className="w-24 h-40 border-2 border-amber-400/80 rounded-2xl flex flex-col items-center justify-between p-2 shadow-[0_0_30px_rgba(245,158,11,0.3)] animate-[spin_3s_ease-in-out_infinite]" style={{ animationDirection: 'alternate' }}>
          <div className="w-8 h-1 bg-amber-400/60 rounded-full" />
          <div className="w-8 h-8 rounded-full border border-amber-400/40 flex items-center justify-center text-amber-400 text-xs font-bold">
            ↻
          </div>
          <div className="w-3 h-3 rounded-full border border-amber-400/60" />
        </div>
      </div>

      <div className="max-w-sm flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-300 font-mono text-[11px] font-bold tracking-widest uppercase mb-3">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          MODO HORIZONTAL OBRIGATÓRIO
        </div>

        <h2 className="text-xl sm:text-2xl font-black font-display tracking-wider uppercase text-white mb-2">
          GIRE SEU DISPOSITIVO
        </h2>

        <p className="text-xs font-mono text-slate-300 leading-relaxed mb-6">
          Para garantir a jogabilidade tática idêntica aos consoles e PCs, este simulador deve ser executado em <b>Tela Cheia</b> e na posição <b>Horizontal (Paisagem)</b>.
        </p>

        <button
          type="button"
          onClick={async (e) => {
            e.stopPropagation();
            await mobileHardware.enterFullscreenLandscape();
          }}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black font-mono text-xs uppercase tracking-widest shadow-[0_0_25px_rgba(245,158,11,0.5)] active:scale-95 transition-all cursor-pointer"
        >
          ⛶ ATIVAR TELA CHEIA HORIZONTAL
        </button>
      </div>
    </div>
  );
};
