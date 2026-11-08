import React, { useEffect, useRef, useState } from 'react';
import { GrenadeType, HudState } from '../types/game';

interface MobileTouchControlsProps {
  hud: HudState;
  onMove: (moveX: number, moveY: number, sprinting: boolean) => void;
  onLookDelta: (dx: number, dy: number) => void;
  onFireHeld: (held: boolean) => void;
  onToggleAds: () => void;
  onToggleWeaponSlot: () => void;
  onReload: (speedReload: boolean) => void;
  onBoltRack: () => void;
  onMagCheck: () => void;
  onInspectWeapon: () => void;
  onJump: () => void;
  onCrouchOrSlide: () => void;
  onToggleLean: (dir: -1 | 1) => void;
  onHoldBreath: (held: boolean) => void;
  onCycleZoom: () => void;
  onThrowGrenade: (type: GrenadeType) => void;
}

interface CrouchProneButtonProps {
  stance: HudState['stance'];
  onCrouchOrSlide: () => void;
}

const bindTap = (action: () => void) => ({
  onPointerDown: (e: React.PointerEvent) => {
    e.stopPropagation();
    action();
  },
});

const CrouchProneButton: React.FC<CrouchProneButtonProps> = ({
  stance,
  onCrouchOrSlide,
}) => {
  const isProne = stance === 'PRONE';
  const isCrouchOrSlide = stance === 'CROUCH' || stance === 'SLIDE';

  return (
    <button
      type="button"
      {...bindTap(onCrouchOrSlide)}
      aria-label="Agachar e Deitar no Chão"
      title="Toque para agachar e deitar no chão (Posição Prone)"
      className={`fixed bottom-5 right-5 w-13 h-13 rounded-full border flex items-center justify-center pointer-events-auto z-30 active:scale-90 transition-transform cursor-pointer ${
        isProne
          ? 'bg-amber-500 border-amber-300 text-black shadow-[0_0_18px_rgba(245,158,11,0.8)] font-bold'
          : isCrouchOrSlide
            ? 'bg-white/35 border-amber-300 text-amber-300'
            : 'bg-black/45 border-white/35 text-white/95'
      }`}
    >
      {isProne ? (
        // Prone Soldier Silhouette (Lying flat on stomach)
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <circle cx="5" cy="14" r="2.2" fill="currentColor" />
          <path
            d="M3 17.5L8 16.5L14 16.5L21 16.5M10 16.5L7 19.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        // Crouching Soldier Silhouette
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="13.5" cy="6" r="2.2" fill="currentColor" />
          <path
            d="M7 11.5L12 10L15 13.5L10.5 15.5L14.5 19.5M10.5 15.5L7.5 19.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
};

const MobileTouchControlsBase: React.FC<MobileTouchControlsProps> = ({
  hud,
  onMove,
  onLookDelta,
  onFireHeld,
  onToggleAds,
  onReload,
  onBoltRack,
  onJump,
  onCrouchOrSlide,
  onHoldBreath,
  onCycleZoom,
}) => {
  // Left Virtual Joystick State
  const joyContainerRef = useRef<HTMLDivElement | null>(null);
  const joyPointerIdRef = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isSprinting, setIsSprinting] = useState(false);
  const [joyActive, setJoyActive] = useState(false);

  // Full-Screen Touch-Look Camera State (Right thumb / Free screen area)
  const lookPointerIdRef = useRef<number | null>(null);
  const lookLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Right Fire-and-Aim Button State
  const firePointerIdRef = useRef<number | null>(null);
  const fireLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [firePressed, setFirePressed] = useState(false);

  // Keep latest callbacks in refs so window-level listeners never go stale
  const callbacksRef = useRef({
    onMove,
    onLookDelta,
    onFireHeld,
  });
  callbacksRef.current = { onMove, onLookDelta, onFireHeld };

  const maxRadius = 48;

  const updateJoystickFromPoint = (clientX: number, clientY: number) => {
    const el = joyContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;
    setKnobOffset({ x: kx, y: ky });

    const normX = kx / maxRadius;
    const normY = -ky / maxRadius;
    const sprintActive = normY > 0.78;
    setIsSprinting(sprintActive);
    callbacksRef.current.onMove(normX, normY, sprintActive);
  };

  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (e.pointerId === joyPointerIdRef.current) {
        updateJoystickFromPoint(e.clientX, e.clientY);
      } else if (e.pointerId === lookPointerIdRef.current) {
        const rawDx = e.clientX - lookLastPosRef.current.x;
        const rawDy = e.clientY - lookLastPosRef.current.y;
        lookLastPosRef.current = { x: e.clientX, y: e.clientY };
        // Clamp spikes from multi-touch transitions
        if (Math.abs(rawDx) < 140 && Math.abs(rawDy) < 140) {
          callbacksRef.current.onLookDelta(rawDx, rawDy);
        }
      } else if (e.pointerId === firePointerIdRef.current) {
        const rawDx = e.clientX - fireLastPosRef.current.x;
        const rawDy = e.clientY - fireLastPosRef.current.y;
        fireLastPosRef.current = { x: e.clientX, y: e.clientY };
        if (Math.abs(rawDx) < 140 && Math.abs(rawDy) < 140) {
          callbacksRef.current.onLookDelta(rawDx, rawDy);
        }
      }
    };

    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (e.pointerId === joyPointerIdRef.current) {
        joyPointerIdRef.current = null;
        setJoyActive(false);
        setKnobOffset({ x: 0, y: 0 });
        setIsSprinting(false);
        callbacksRef.current.onMove(0, 0, false);
      }
      if (e.pointerId === lookPointerIdRef.current) {
        lookPointerIdRef.current = null;
      }
      if (e.pointerId === firePointerIdRef.current) {
        firePointerIdRef.current = null;
        setFirePressed(false);
        callbacksRef.current.onFireHeld(false);
      }
    };

    window.addEventListener('pointermove', handleGlobalPointerMove, {
      passive: true,
    });
    window.addEventListener('pointerup', handleGlobalPointerUp, {
      passive: true,
    });
    window.addEventListener('pointercancel', handleGlobalPointerUp, {
      passive: true,
    });

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, []);

  const handleJoyPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    joyPointerIdRef.current = e.pointerId;
    setJoyActive(true);
    updateJoystickFromPoint(e.clientX, e.clientY);
  };

  const handleLookPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    // Always accept the latest camera look touch so fullscreen transitions never lock the pointerId
    lookPointerIdRef.current = e.pointerId;
    lookLastPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleFirePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    firePointerIdRef.current = e.pointerId;
    fireLastPosRef.current = { x: e.clientX, y: e.clientY };
    setFirePressed(true);
    onFireHeld(true);
  };

  if (!hud.touchControlsVisible) return null;

  const needsBoltAction =
    hud.reloadPhase === 'IDLE' && (hud.boltLockedBack || hud.chambered === 0);

  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none select-none overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      {/* =================================================================== */}
      {/* FULL-SCREEN TOUCH-LOOK CAMERA LAYER (COMO NO COD MOBILE / FREE FIRE)*/}
      {/* Qualquer área livre da tela gira a câmera e controla a mira         */}
      {/* =================================================================== */}
      <div
        onPointerDown={handleLookPointerDown}
        className="fixed inset-0 z-10 pointer-events-auto"
        style={{ touchAction: 'none' }}
        aria-label="Área livre da tela para movimentar a câmera e mirar"
      />

      {/* =================================================================== */}
      {/* LEFT THUMB ZONE: CALL OF DUTY MOBILE VIRTUAL JOYSTICK (NO TEXT)     */}
      {/* =================================================================== */}
      <div className="fixed bottom-12 left-7 sm:left-12 pointer-events-auto z-30">
        <div
          ref={joyContainerRef}
          onPointerDown={handleJoyPointerDown}
          style={{ touchAction: 'none' }}
          className={`relative w-32 h-32 rounded-full bg-black/25 border flex items-center justify-center transition-colors ${
            isSprinting
              ? 'border-amber-400/80 shadow-[0_0_16px_rgba(250,204,21,0.25)]'
              : 'border-white/25'
          }`}
        >
          {/* COD Mobile Curved Sprint Chevron Arc at Top of Joystick */}
          <svg
            width="44"
            height="22"
            viewBox="0 0 44 22"
            fill="none"
            className={`absolute -top-3.5 pointer-events-none transition-colors ${
              isSprinting ? 'text-amber-400' : 'text-white/75'
            }`}
          >
            <path
              d="M6 16C11 11 16.5 9 22 9C27.5 9 33 11 38 16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M17 7L22 2L27 7"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Clean Circular Thumb Knob (Matching COD Mobile Screenshot) */}
          <div
            className={`w-12 h-12 rounded-full border-2 pointer-events-none transition-transform duration-75 ${
              joyActive
                ? 'bg-white/85 border-white scale-105 shadow-md'
                : 'bg-white/65 border-white/80'
            }`}
            style={{
              transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
            }}
          />
        </div>
      </div>

      {/* =================================================================== */}
      {/* RIGHT THUMB ZONE: CALL OF DUTY MOBILE ICON-ONLY BUTTON CLUSTER      */}
      {/* =================================================================== */}
      {/* Contextual Icon Buttons (Hold Breath / Zoom / Bolt Rack) positioned cleanly to the left of ADS */}
      <div className="fixed bottom-38 right-40 flex items-center gap-2 pointer-events-auto z-30">
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
                <path
                  d="M12 4V13M12 13C9.5 13 7 10.5 5 11C3 11.5 2.5 15 4 18C5.5 21 9 20 10.5 17.5M12 13C14.5 13 17 10.5 19 11C21 11.5 21.5 15 20 18C18.5 21 15 20 13.5 17.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {hud.optic === 'lpvo' && !hud.cantedActive && (
              <button
                type="button"
                {...bindTap(onCycleZoom)}
                aria-label="Alternar zoom"
                className="w-10 h-10 rounded-full bg-black/45 border border-white/30 text-amber-300 flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
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
              <path
                d="M4 12H16M16 12L12 8M16 12L12 16M20 7V17"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 1. ADS / AIM CROSSHAIR BUTTON (Upper-Right, matching COD Mobile screenshot) */}
      <button
        type="button"
        {...bindTap(onToggleAds)}
        aria-label="Mirar"
        className={`fixed bottom-38 right-24 w-13 h-13 rounded-full border flex items-center justify-center pointer-events-auto z-30 transition-transform active:scale-90 cursor-pointer ${
          hud.isAds
            ? 'bg-white/35 border-amber-300 text-amber-300 scale-105 shadow-[0_0_15px_rgba(250,204,21,0.4)]'
            : 'bg-black/45 border-white/35 text-white/90'
        }`}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
          <line x1="12" y1="2" x2="12" y2="7" stroke="currentColor" strokeWidth="1.8" />
          <line x1="12" y1="17" x2="12" y2="22" stroke="currentColor" strokeWidth="1.8" />
          <line x1="2" y1="12" x2="7" y2="12" stroke="currentColor" strokeWidth="1.8" />
          <line x1="17" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </button>

      {/* 2. JUMP BUTTON (Far-Right Middle, Jumping Soldier Silhouette) */}
      <button
        type="button"
        {...bindTap(onJump)}
        aria-label="Pular"
        className="fixed bottom-28 right-5 w-13 h-13 rounded-full bg-black/45 border border-white/35 text-white/95 flex items-center justify-center pointer-events-auto z-30 active:scale-90 transition-transform cursor-pointer"
      >
        <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
          <circle cx="13" cy="4.5" r="2.2" fill="currentColor" />
          <path
            d="M7 9.5L11.5 8L15.5 10.5L18.5 7.5M11.5 8L10.5 13.5L7 16.5M10.5 13.5L14.5 15.5L16.5 19.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* 3. PRIMARY FIRE / THROW GRENADE BUTTON (Large Translucent Circle) */}
      <button
        type="button"
        onPointerDown={handleFirePointerDown}
        style={{ touchAction: 'none' }}
        aria-label={
          hud.equippedGrenade
            ? 'Tirar o Pino e Jogar Granada'
            : 'Atirar'
        }
        className={`fixed bottom-18 right-38 sm:right-44 w-21 h-21 rounded-full border-2 flex items-center justify-center pointer-events-auto z-30 transition-all cursor-pointer ${
          hud.equippedGrenade === 'FRAG'
            ? firePressed
              ? 'bg-orange-500/55 border-orange-200 scale-95 shadow-[0_0_28px_rgba(249,115,22,0.75)]'
              : 'bg-orange-500/30 border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.45)] animate-pulse'
            : hud.equippedGrenade === 'SMOKE'
              ? firePressed
                ? 'bg-sky-500/55 border-sky-200 scale-95 shadow-[0_0_28px_rgba(56,189,248,0.75)]'
                : 'bg-sky-500/30 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.45)] animate-pulse'
              : firePressed
                ? 'bg-white/35 border-amber-300 scale-95 shadow-[0_0_24px_rgba(255,255,255,0.45)]'
                : 'bg-black/35 border-white/55 shadow-lg'
        }`}
      >
        <div className="w-17 h-17 rounded-full border border-white/25 flex flex-col items-center justify-center">
          {hud.equippedGrenade ? (
            <>
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                className="text-white drop-shadow"
              >
                <ellipse
                  cx="12"
                  cy="14"
                  rx="5.5"
                  ry="6.5"
                  fill="currentColor"
                  fillOpacity="0.35"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M9.5 7.5H14.5V5H9.5V7.5Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M14.5 6H18L19 12"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="7.5"
                  cy="5.5"
                  r="2"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
              <span className="text-[8px] font-mono font-black tracking-tighter text-white uppercase leading-none mt-0.5">
                JOGAR
              </span>
            </>
          ) : (
            <svg
              width="38"
              height="38"
              viewBox="0 0 24 24"
              fill="none"
              className="-rotate-45 text-white drop-shadow"
            >
              <path
                d="M12 2C9.8 5 9 8 9 11.5H15C15 8 14.2 5 12 2Z"
                fill="currentColor"
              />
              <rect
                x="9"
                y="12.5"
                width="6"
                height="7"
                rx="0.5"
                fill="currentColor"
              />
              <rect
                x="8.5"
                y="20.2"
                width="7"
                height="1.8"
                rx="0.5"
                fill="currentColor"
              />
            </svg>
          )}
        </div>
      </button>

      {/* 4. RELOAD BUTTON (Below-Right of Fire Button, 3 Bullets + Reload Arc Icon) */}
      <button
        type="button"
        {...bindTap(() => onReload(false))}
        aria-label="Recarregar"
        className={`fixed bottom-8 right-22 w-12 h-12 rounded-full border flex items-center justify-center pointer-events-auto z-30 active:scale-90 transition-transform cursor-pointer ${
          hud.reloadPhase !== 'IDLE'
            ? 'bg-amber-500/40 border-amber-300 text-amber-200'
            : 'bg-black/45 border-white/35 text-white/95'
        }`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <g transform="rotate(-30 12 12)">
            <rect x="7" y="7" width="2.2" height="7" rx="1" fill="currentColor" />
            <rect x="10.8" y="6" width="2.2" height="7" rx="1" fill="currentColor" />
            <rect x="14.6" y="7" width="2.2" height="7" rx="1" fill="currentColor" />
          </g>
          <path
            d="M5 16.5C7 19.5 11.5 20.5 15.5 19C17.5 18.2 19 16.5 19.5 14.5M19.5 14.5L16.8 15.2M19.5 14.5L20.5 17.2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* 5. CROUCH / PRONE / SLIDE BUTTON (Tap for Crouch, Hold for Prone) */}
      <CrouchProneButton
        stance={hud.stance}
        onCrouchOrSlide={onCrouchOrSlide}
      />
    </div>
  );
};

export const MobileTouchControls = React.memo(MobileTouchControlsBase);
