import React, { useEffect, useRef, useState } from 'react';
import { HudState } from '../types/game';

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
}

const MobileTouchControlsBase: React.FC<MobileTouchControlsProps> = ({
  hud,
  onMove,
  onLookDelta,
  onFireHeld,
  onToggleAds,
  onToggleWeaponSlot,
  onReload,
  onBoltRack,
  onMagCheck,
  onInspectWeapon,
  onJump,
  onCrouchOrSlide,
  onToggleLean,
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

  // Right Touch-Look Pad State
  const lookPointerIdRef = useRef<number | null>(null);
  const lookLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Right Fire-and-Drag Button State
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
    const normY = -ky / maxRadius; // Up on screen is +Forward
    const sprintActive = normY > 0.78;
    setIsSprinting(sprintActive);
    callbacksRef.current.onMove(normX, normY, sprintActive);
  };

  // Global window pointer tracking so dragging outside any control works without setPointerCapture errors
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (e.pointerId === joyPointerIdRef.current) {
        updateJoystickFromPoint(e.clientX, e.clientY);
      } else if (e.pointerId === lookPointerIdRef.current) {
        const dx = e.clientX - lookLastPosRef.current.x;
        const dy = e.clientY - lookLastPosRef.current.y;
        lookLastPosRef.current = { x: e.clientX, y: e.clientY };
        callbacksRef.current.onLookDelta(dx, dy);
      } else if (e.pointerId === firePointerIdRef.current) {
        const dx = e.clientX - fireLastPosRef.current.x;
        const dy = e.clientY - fireLastPosRef.current.y;
        fireLastPosRef.current = { x: e.clientX, y: e.clientY };
        callbacksRef.current.onLookDelta(dx, dy);
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

  const safeCapturePointer = (el: Element, pointerId: number) => {
    try {
      if (typeof el.setPointerCapture === 'function') {
        el.setPointerCapture(pointerId);
      }
    } catch {
      // Ignore InvalidStateError on synthetic/emulated mobile touch events;
      // window-level pointermove/pointerup listeners handle tracking seamlessly.
    }
  };

  const handleJoyPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (joyPointerIdRef.current !== null) return;
    joyPointerIdRef.current = e.pointerId;
    setJoyActive(true);
    safeCapturePointer(e.currentTarget, e.pointerId);
    updateJoystickFromPoint(e.clientX, e.clientY);
  };

  const handleLookPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerIdRef.current !== null) return;
    lookPointerIdRef.current = e.pointerId;
    lookLastPosRef.current = { x: e.clientX, y: e.clientY };
    safeCapturePointer(e.currentTarget, e.pointerId);
  };

  const handleFirePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    firePointerIdRef.current = e.pointerId;
    fireLastPosRef.current = { x: e.clientX, y: e.clientY };
    safeCapturePointer(e.currentTarget, e.pointerId);
    setFirePressed(true);
    onFireHeld(true);
  };

  if (!hud.touchControlsVisible) return null;

  const needsBoltAction = hud.boltLockedBack || hud.chambered === 0;

  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none select-none overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      {/* Full Right-Half & Center Touch-Look Aiming Zone */}
      <div
        onPointerDown={handleLookPointerDown}
        className="fixed top-14 bottom-20 left-[38%] right-0 pointer-events-auto"
        style={{ touchAction: 'none' }}
        aria-label="Área de toque para girar a câmera e mirar"
      />

      {/* =================================================================== */}
      {/* LEFT THUMB ZONE: ANALOG VIRTUAL JOYSTICK + Q/E LEAN                 */}
      {/* =================================================================== */}
      <div className="fixed bottom-14 left-5 sm:left-8 flex flex-col items-center gap-3 pointer-events-auto">
        {/* Q/E Corner Lean Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onToggleLean(-1);
            }}
            className={`min-h-[44px] min-w-[54px] px-2.5 rounded-xl border font-mono text-xs font-semibold transition-colors ${
              hud.leanDirection === -1
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-[#0b0e14]/88 text-slate-200 border-white/15 active:bg-slate-800'
            }`}
          >
            ◄ Q
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onToggleLean(1);
            }}
            className={`min-h-[44px] min-w-[54px] px-2.5 rounded-xl border font-mono text-xs font-semibold transition-colors ${
              hud.leanDirection === 1
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-[#0b0e14]/88 text-slate-200 border-white/15 active:bg-slate-800'
            }`}
          >
            E ►
          </button>
        </div>

        {/* 360° Virtual Analog Stick */}
        <div
          ref={joyContainerRef}
          onPointerDown={handleJoyPointerDown}
          style={{ touchAction: 'none' }}
          className={`relative w-32 h-32 rounded-full bg-[#0b0e14]/80 border-2 flex items-center justify-center transition-colors ${
            isSprinting
              ? 'border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
              : 'border-white/20'
          }`}
        >
          {/* Sprint Top Indicator */}
          <span
            className={`absolute -top-5 text-[10px] font-mono font-semibold tracking-wider px-2 py-0.5 rounded ${
              isSprinting
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 bg-[#0b0e14]/80'
            }`}
          >
            {isSprinting ? 'CORRENDO' : '▲ CORRER'}
          </span>

          {/* Crosshair Axis Guides inside Joystick */}
          <div className="w-16 h-[1px] bg-white/10 absolute pointer-events-none" />
          <div className="h-16 w-[1px] bg-white/10 absolute pointer-events-none" />

          {/* Movable Thumb Knob */}
          <div
            className={`w-14 h-14 rounded-full border-2 flex items-center justify-center pointer-events-none transition-transform duration-75 ${
              joyActive
                ? 'bg-amber-500/90 border-amber-200 text-slate-950 scale-105'
                : 'bg-slate-800/90 border-white/30 text-slate-200'
            }`}
            style={{
              transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3L15 7H9L12 3ZM12 21L9 17H15L12 21ZM3 12L7 9V15L3 12ZM21 12L17 15V9L21 12Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>

        <span className="text-[10px] font-mono text-slate-400">
          MOVER / CORRER
        </span>
      </div>

      {/* =================================================================== */}
      {/* RIGHT THUMB ZONE: CALL OF DUTY MOBILE HUD CLUSTER                   */}
      {/* =================================================================== */}
      <div className="fixed bottom-10 right-4 sm:right-8 flex flex-col items-end gap-2 pointer-events-auto">
        {/* Top Secondary Action Row: Breath, LPVO Zoom, Bolt Rack, Inspect */}
        <div className="flex items-center gap-1.5 mb-1">
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
                className={`h-9 px-2.5 rounded-lg border font-mono text-[11px] font-semibold shadow-md transition-colors ${
                  hud.isHoldingBreath
                    ? 'bg-cyan-400 text-slate-950 border-cyan-200'
                    : 'bg-[#0b0e14]/92 text-cyan-300 border-cyan-500/40'
                }`}
              >
                FÔLEGO
              </button>

              {hud.optic === 'lpvo' && !hud.cantedActive && (
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onCycleZoom();
                  }}
                  className="h-9 px-2 rounded-lg bg-[#0b0e14]/92 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-semibold shadow-md"
                >
                  {hud.lpvoZoom.toFixed(0)}X
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onBoltRack();
            }}
            className={`h-9 px-2.5 rounded-lg border font-mono text-[11px] font-semibold shadow-md transition-colors ${
              needsBoltAction
                ? 'bg-amber-500 text-slate-950 border-amber-300 animate-pulse'
                : 'bg-[#0b0e14]/92 text-slate-300 border-white/15 active:bg-slate-800'
            }`}
          >
            FERROLHO
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onInspectWeapon();
            }}
            className="h-9 px-2.5 rounded-lg bg-[#0b0e14]/92 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-medium shadow-md active:bg-slate-800"
          >
            INSPECIONAR
          </button>
        </div>

        {/* COD Mobile Primary Thumb Action Diamond Grid */}
        <div className="relative w-64 h-48">
          {/* 1. WEAPON SWITCH BUTTON (Top Left of Fire Button) */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onToggleWeaponSlot();
            }}
            className="absolute top-2 left-2 w-14 h-14 rounded-full border-2 bg-[#0b0e14]/94 border-amber-400/80 text-amber-300 flex flex-col items-center justify-center font-mono text-[9px] font-bold shadow-lg active:scale-90 transition-transform"
            title="Alternar entre Rifle e Pistola"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>TROCAR</span>
          </button>

          {/* 2. ADS MIRA BUTTON (Top Right of Fire Button) */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onToggleAds();
            }}
            className={`absolute top-0 right-14 w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center font-mono text-[10px] font-bold transition-all shadow-lg active:scale-90 ${
              hud.isAds
                ? 'bg-amber-500 text-slate-950 border-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-105'
                : 'bg-[#0b0e14]/94 text-slate-100 border-white/30 active:bg-slate-800'
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2" />
              <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="2" />
              <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="2" />
              <line x1="2" y1="12" x2="6" y2="12" stroke="currentColor" strokeWidth="2" />
              <line x1="18" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span>MIRA</span>
          </button>

          {/* 3. RELOAD BUTTON (Middle Left of Fire Button) */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onReload(false);
            }}
            className="absolute bottom-16 left-12 w-14 h-14 rounded-full border-2 bg-[#0b0e14]/94 border-slate-400 text-slate-100 flex flex-col items-center justify-center font-mono text-[9px] font-bold shadow-lg active:scale-90 transition-transform"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>RECARGA</span>
          </button>

          {/* 4. PRIMARY ATIRAR / FIRE BUTTON (Large Bottom Right) */}
          <button
            type="button"
            onPointerDown={handleFirePointerDown}
            style={{ touchAction: 'none' }}
            className={`absolute bottom-2 right-0 w-22 h-22 rounded-full border-2 flex flex-col items-center justify-center font-display font-bold text-xs tracking-wider transition-transform ${
              firePressed
                ? 'bg-red-500/95 text-white border-amber-200 scale-95 shadow-[0_0_28px_rgba(239,68,68,0.7)]'
                : 'bg-red-600/90 text-white border-red-300/70 shadow-2xl'
            }`}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2.2" />
              <circle cx="12" cy="12" r="3.5" fill="currentColor" />
            </svg>
            <span className="mt-0.5 font-sans font-black tracking-widest text-[11px]">ATIRAR</span>
          </button>

          {/* 5. CROUCH / SLIDE BUTTON (Bottom Left Stack) */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onCrouchOrSlide();
            }}
            className={`absolute bottom-1 left-0 w-12 h-12 rounded-2xl border-2 flex flex-col items-center justify-center font-mono text-[9px] font-bold shadow-md transition-colors ${
              hud.stance === 'CROUCH' || hud.stance === 'SLIDE'
                ? 'bg-amber-500 text-slate-950 border-amber-300'
                : 'bg-[#0b0e14]/94 text-slate-200 border-white/20 active:bg-slate-800'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M19 14l-7 7-7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{isSprinting ? 'SLIDE' : 'AGACHAR'}</span>
          </button>

          {/* 6. JUMP BUTTON (Above Crouch Button) */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onJump();
            }}
            className="absolute bottom-16 left-0 w-12 h-12 rounded-2xl border-2 bg-[#0b0e14]/94 border-white/20 text-slate-200 flex flex-col items-center justify-center font-mono text-[9px] font-bold shadow-md active:bg-slate-800"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 10l7-7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>PULAR</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const MobileTouchControls = React.memo(
  MobileTouchControlsBase,
  (prev, next) =>
    prev.hud.isAds === next.hud.isAds &&
    prev.hud.isHoldingBreath === next.hud.isHoldingBreath &&
    prev.hud.boltLockedBack === next.hud.boltLockedBack &&
    prev.hud.chambered === next.hud.chambered &&
    prev.hud.stance === next.hud.stance &&
    prev.hud.leanDirection === next.hud.leanDirection &&
    prev.hud.optic === next.hud.optic &&
    prev.hud.cantedActive === next.hud.cantedActive &&
    prev.hud.lpvoZoom === next.hud.lpvoZoom &&
    prev.hud.touchControlsVisible === next.hud.touchControlsVisible &&
    prev.hud.activeWeapon === next.hud.activeWeapon
);
