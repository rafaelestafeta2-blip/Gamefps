import React from 'react';
import { HudElementPlacement } from '../controls/hudLayoutSettings';
import { GrenadeType, HudState } from '../types/game';
import { bindTap } from './hudTapUtils';

export const getPlacementStyle = (
  p: HudElementPlacement,
  extraTouchNone = false
): React.CSSProperties => ({
  left: `${p.xPercent}%`,
  top: `${p.yPercent}%`,
  transform: `translate(-50%, -50%) scale(${p.scale})`,
  opacity: p.opacity,
  ...(extraTouchNone ? { touchAction: 'none' } : {}),
});

export const CrouchProneButton: React.FC<{
  stance: HudState['stance'];
  placement: HudElementPlacement;
  onCrouchOrSlide: () => void;
}> = ({ stance, placement, onCrouchOrSlide }) => {
  const isProne = stance === 'PRONE';
  const isCrouchOrSlide = stance === 'CROUCH' || stance === 'SLIDE';

  return (
    <button
      type="button"
      {...bindTap(onCrouchOrSlide)}
      style={getPlacementStyle(placement)}
      aria-label="Agachar e Deitar no Chão"
      title="Toque para agachar e deitar no chão (Posição Prone)"
      className={`fixed w-13 h-13 rounded-full border flex items-center justify-center pointer-events-auto z-30 select-none active:brightness-125 transition-colors cursor-pointer ${
        isProne
          ? 'bg-amber-500 border-amber-300 text-black shadow-[0_0_18px_rgba(245,158,11,0.8)] font-bold'
          : isCrouchOrSlide
            ? 'bg-white/35 border-amber-300 text-amber-300'
            : 'bg-black/45 border-white/35 text-white/95'
      }`}
    >
      {isProne ? (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <circle cx="5" cy="14" r="2.2" fill="currentColor" />
          <path d="M3 17.5L8 16.5L14 16.5L21 16.5M10 16.5L7 19.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="13.5" cy="6" r="2.2" fill="currentColor" />
          <path d="M7 11.5L12 10L15 13.5L10.5 15.5L14.5 19.5M10.5 15.5L7.5 19.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
};

export const FireTriggerButton: React.FC<{
  equippedGrenade: GrenadeType | null;
  pressed: boolean;
  placement: HudElementPlacement;
  sizeClass?: string;
  innerSizeClass?: string;
  label: string;
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onFireHeld: (held: boolean) => void;
}> = ({
  equippedGrenade,
  pressed,
  placement,
  sizeClass = 'w-21 h-21',
  innerSizeClass = 'w-17 h-17',
  label,
  onPointerDown,
  onFireHeld,
}) => (
  <button
    type="button"
    onPointerDown={onPointerDown}
    onClick={(e) => {
      e.stopPropagation();
      if (equippedGrenade) {
        onFireHeld(true);
        setTimeout(() => onFireHeld(false), 60);
      }
    }}
    style={getPlacementStyle(placement, true)}
    aria-label={equippedGrenade ? 'Tirar o Pino e Jogar Granada' : label}
    className={`fixed ${sizeClass} rounded-full border-2 flex items-center justify-center pointer-events-auto z-30 select-none transition-colors cursor-pointer ${
      equippedGrenade === 'FRAG'
        ? pressed
          ? 'bg-orange-500/55 border-orange-200 shadow-[0_0_28px_rgba(249,115,22,0.75)]'
          : 'bg-orange-500/30 border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.45)] animate-pulse'
        : equippedGrenade === 'SMOKE'
          ? pressed
            ? 'bg-sky-500/55 border-sky-200 shadow-[0_0_28px_rgba(56,189,248,0.75)]'
            : 'bg-sky-500/30 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.45)] animate-pulse'
          : pressed
            ? 'bg-white/35 border-amber-300 shadow-[0_0_24px_rgba(255,255,255,0.45)]'
            : 'bg-black/35 border-white/55 shadow-lg'
    }`}
  >
    <div className={`${innerSizeClass} rounded-full border border-white/25 flex flex-col items-center justify-center`}>
      {equippedGrenade ? (
        <>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white drop-shadow">
            <ellipse cx="12" cy="14" rx="5.5" ry="6.5" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="1.8" />
            <path d="M9.5 7.5H14.5V5H9.5V7.5Z" stroke="currentColor" strokeWidth="1.6" />
            <path d="M14.5 6H18L19 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="7.5" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          <span className="text-[8px] font-mono font-black tracking-tighter text-white uppercase leading-none mt-0.5">
            JOGAR
          </span>
        </>
      ) : (
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" className="-rotate-45 text-white drop-shadow">
          <path d="M12 2C9.8 5 9 8 9 11.5H15C15 8 14.2 5 12 2Z" fill="currentColor" />
          <rect x="9" y="12.5" width="6" height="7" rx="0.5" fill="currentColor" />
          <rect x="8.5" y="20.2" width="7" height="1.8" rx="0.5" fill="currentColor" />
        </svg>
      )}
    </div>
  </button>
);

export const ContextualHudRow: React.FC<{
  hud: HudState;
  needsBoltAction: boolean;
  placement: HudElementPlacement;
  onHoldBreath: (held: boolean) => void;
  onCycleZoom: () => void;
  onBoltRack: () => void;
}> = ({ hud, needsBoltAction, placement, onHoldBreath, onCycleZoom, onBoltRack }) => (
  <div
    style={getPlacementStyle(placement)}
    className="fixed flex items-center gap-2 pointer-events-auto z-30 select-none"
  >
    {hud.isAds && (
      <>
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onHoldBreath(true);
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            onHoldBreath(false);
          }}
          onPointerCancel={() => onHoldBreath(false)}
          aria-label="Segurar fôlego"
          className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
            hud.isHoldingBreath
              ? 'bg-cyan-400/80 text-slate-950 border-white'
              : 'bg-black/45 text-white/90 border-white/30'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 4V13M12 13C9.5 13 7 10.5 5 11C3 11.5 2.5 15 4 18C5.5 21 9 20 10.5 17.5M12 13C14.5 13 17 10.5 19 11C21 11.5 21.5 15 20 18C18.5 21 15 20 13.5 17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {hud.optic === 'lpvo' && !hud.cantedActive && (
          <button
            type="button"
            {...bindTap(onCycleZoom)}
            aria-label="Alternar zoom"
            className="w-10 h-10 rounded-full bg-black/45 border border-white/30 text-amber-300 flex items-center justify-center active:brightness-125 transition-colors cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20L16 16M11 8V14M8 11H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </>
    )}

    {needsBoltAction && (
      <button
        type="button"
        {...bindTap(onBoltRack)}
        aria-label="Puxar ferrolho ou recarregar"
        className="w-11 h-11 rounded-full bg-amber-500/80 border-2 border-white text-slate-950 flex items-center justify-center animate-pulse shadow-lg cursor-pointer"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 12H16M16 12L12 8M16 12L12 16M20 7V17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    )}
  </div>
);
