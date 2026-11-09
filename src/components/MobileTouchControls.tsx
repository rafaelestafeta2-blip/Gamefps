import React, { useEffect, useRef, useState } from 'react';
import {
  ControlSettings,
  loadControlSettings,
} from '../controls/hudLayoutSettings';
import { GrenadeType, HudState } from '../types/game';
import { bindTap } from './hudTapUtils';
import {
  ContextualHudRow,
  CrouchProneButton,
  FireTriggerButton,
  getPlacementStyle,
} from './TouchControlIcons';

interface MobileTouchControlsProps {
  hud: HudState;
  controlSettings?: ControlSettings;
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

const MobileTouchControlsBase: React.FC<MobileTouchControlsProps> = ({
  hud,
  controlSettings: externalControlSettings,
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
  const [fallbackControls] = useState<ControlSettings>(() => loadControlSettings());
  const activeControls = externalControlSettings ?? fallbackControls;
  const layout = activeControls.hudLayout;

  const joyContainerRef = useRef<HTMLDivElement | null>(null);
  const joyPointerIdRef = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSprinting, setIsSprinting] = useState(false);
  const [joyActive, setJoyActive] = useState(false);

  const lookPointerIdRef = useRef<number | null>(null);
  const lookLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const firePointerIdRef = useRef<number | null>(null);
  const fireLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [firePressed, setFirePressed] = useState(false);

  const leftFirePointerIdRef = useRef<number | null>(null);
  const [leftFirePressed, setLeftFirePressed] = useState(false);

  const callbacksRef = useRef({ onMove, onLookDelta, onFireHeld });
  callbacksRef.current = { onMove, onLookDelta, onFireHeld };

  const baseMaxRadius = 48;

  const updateJoystickFromPoint = (clientX: number, clientY: number) => {
    const el = joyContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const joyScale = Math.max(0.6, layout.joystick.scale || 1);
    const scaledMaxRadius = baseMaxRadius * joyScale;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, scaledMaxRadius);
    const angle = Math.atan2(dy, dx);

    const normDist = clampedDist / joyScale;
    const kx = Math.cos(angle) * normDist;
    const ky = Math.sin(angle) * normDist;
    setKnobOffset({ x: kx, y: ky });

    const normX = kx / baseMaxRadius;
    const normY = -ky / baseMaxRadius;
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
        if (leftFirePointerIdRef.current === null) {
          callbacksRef.current.onFireHeld(false);
        }
      }
      if (e.pointerId === leftFirePointerIdRef.current) {
        leftFirePointerIdRef.current = null;
        setLeftFirePressed(false);
        if (firePointerIdRef.current === null) {
          callbacksRef.current.onFireHeld(false);
        }
      }
    };

    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: true });
    window.addEventListener('pointerup', handleGlobalPointerUp, { passive: true });
    window.addEventListener('pointercancel', handleGlobalPointerUp, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [layout.joystick.scale]);

  const handleJoyPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    joyPointerIdRef.current = e.pointerId;
    setJoyActive(true);
    updateJoystickFromPoint(e.clientX, e.clientY);
  };

  const handleLookPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
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

  const handleLeftFirePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    leftFirePointerIdRef.current = e.pointerId;
    setLeftFirePressed(true);
    onFireHeld(true);
  };

  if (!hud.touchControlsVisible) return null;

  const needsBoltAction =
    hud.reloadPhase === 'IDLE' && (hud.boltLockedBack || hud.chambered === 0);

  return (
    <>
      <div
        onPointerDown={handleLookPointerDown}
        className="fixed inset-0 z-10 pointer-events-auto select-none"
        style={{ touchAction: 'none' }}
        aria-label="Área livre da tela para movimentar a câmera e mirar"
      />

      {/* LEFT THUMB ZONE: VIRTUAL JOYSTICK */}
      <div
        style={getPlacementStyle(layout.joystick)}
        className="fixed pointer-events-auto z-30 select-none"
      >
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
          <svg
            width="44"
            height="22"
            viewBox="0 0 44 22"
            fill="none"
            className={`absolute -top-3.5 pointer-events-none transition-colors ${
              isSprinting ? 'text-amber-400' : 'text-white/75'
            }`}
          >
            <path d="M6 16C11 11 16.5 9 22 9C27.5 9 33 11 38 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M17 7L22 2L27 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          <div
            className={`w-12 h-12 rounded-full border-2 pointer-events-none transition-transform duration-75 ${
              joyActive
                ? 'bg-white/85 border-white scale-105 shadow-md'
                : 'bg-white/65 border-white/80'
            }`}
            style={{ transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)` }}
          />
        </div>
      </div>

      {/* CONTEXTUAL ICON BUTTONS (Hold Breath / Zoom / Bolt Rack) */}
      <ContextualHudRow
        hud={hud}
        needsBoltAction={needsBoltAction}
        placement={layout.contextual}
        onHoldBreath={onHoldBreath}
        onCycleZoom={onCycleZoom}
        onBoltRack={onBoltRack}
      />

      {/* 1. ADS / AIM CROSSHAIR BUTTON */}
      <button
        type="button"
        {...bindTap(onToggleAds)}
        style={getPlacementStyle(layout.ads)}
        aria-label="Mirar"
        className={`fixed w-13 h-13 rounded-full border flex items-center justify-center pointer-events-auto z-30 select-none transition-colors active:brightness-125 cursor-pointer ${
          hud.isAds
            ? 'bg-white/35 border-amber-300 text-amber-300 shadow-[0_0_15px_rgba(250,204,21,0.4)]'
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

      {/* 2. JUMP BUTTON */}
      <button
        type="button"
        {...bindTap(onJump)}
        style={getPlacementStyle(layout.jump)}
        aria-label="Pular"
        className="fixed w-13 h-13 rounded-full bg-black/45 border border-white/35 text-white/95 flex items-center justify-center pointer-events-auto z-30 select-none active:brightness-125 transition-colors cursor-pointer"
      >
        <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
          <circle cx="13" cy="4.5" r="2.2" fill="currentColor" />
          <path d="M7 9.5L11.5 8L15.5 10.5L18.5 7.5M11.5 8L10.5 13.5L7 16.5M10.5 13.5L14.5 15.5L16.5 19.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* 3. PRIMARY FIRE / THROW GRENADE BUTTON */}
      <FireTriggerButton
        equippedGrenade={hud.equippedGrenade}
        pressed={firePressed}
        placement={layout.fire}
        label="Atirar"
        onPointerDown={handleFirePointerDown}
        onFireHeld={onFireHeld}
      />

      {/* 3B. OPTIONAL SECONDARY LEFT FIRE BUTTON */}
      {activeControls.leftFireButtonEnabled && (
        <FireTriggerButton
          equippedGrenade={hud.equippedGrenade}
          pressed={leftFirePressed}
          placement={layout.leftFire}
          sizeClass="w-16 h-16"
          innerSizeClass="w-13 h-13"
          label="2º Botão de Tiro Esquerdo"
          onPointerDown={handleLeftFirePointerDown}
          onFireHeld={onFireHeld}
        />
      )}

      {/* 4. RELOAD BUTTON */}
      <button
        type="button"
        {...bindTap(() => onReload(false))}
        style={getPlacementStyle(layout.reload)}
        aria-label="Recarregar"
        className={`fixed w-12 h-12 rounded-full border flex items-center justify-center pointer-events-auto z-30 select-none active:brightness-125 transition-colors cursor-pointer ${
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
          <path d="M5 16.5C7 19.5 11.5 20.5 15.5 19C17.5 18.2 19 16.5 19.5 14.5M19.5 14.5L16.8 15.2M19.5 14.5L20.5 17.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* 5. CROUCH / PRONE / SLIDE BUTTON */}
      <CrouchProneButton
        stance={hud.stance}
        placement={layout.crouch}
        onCrouchOrSlide={onCrouchOrSlide}
      />
    </>
  );
};

export const MobileTouchControls = React.memo(MobileTouchControlsBase);
