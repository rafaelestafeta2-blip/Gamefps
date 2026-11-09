import React from 'react';
import {
  GrenadeType,
  HudState,
  OpticType,
  WeaponId,
} from '../types/game';
import { HudBottomWeaponDock } from './HudBottomWeaponDock';
import { HudTopRightControls } from './HudTopRightControls';
import { bindTap, WeaponSilhouette } from './hudTapUtils';
import { WarfaceRankIcon } from './WarfaceRankIcon';

interface TacticalHudOverlayProps {
  hud: HudState;
  onSelectWeapon: (weaponId: WeaponId) => void;
  onToggleWeaponSlot: () => void;
  onInspectWeapon: () => void;
  onSelectOptic: (optic: OpticType) => void;
  onToggleCanted: () => void;
  onToggleSuppressor: () => void;
  onCycleCharm: () => void;
  onToggleLaser: () => void;
  onCycleFireMode: () => void;
  onResupply: () => void;
  onThrowGrenade: (type: GrenadeType) => void;
  onToggleMute: () => void;
  onToggleDock: () => void;
  onToggleFullscreen: () => void;
  onPause: () => void;
}

export const TacticalHudOverlay: React.FC<TacticalHudOverlayProps> = ({
  hud,
  onSelectWeapon,
  onToggleWeaponSlot,
  onInspectWeapon,
  onSelectOptic,
  onToggleCanted,
  onToggleSuppressor,
  onCycleCharm,
  onToggleLaser,
  onCycleFireMode,
  onResupply,
  onThrowGrenade,
  onToggleMute,
  onToggleDock,
  onToggleFullscreen,
  onPause,
}) => {
  const isSniperScopeActive =
    (hud.activeWeapon === 'SNIPER_BOLT' ||
      hud.activeWeapon === 'SNIPER_TACTICAL' ||
      hud.optic === 'lpvo') &&
    !hud.cantedActive &&
    hud.adsAlpha > 0.35;

  const hipCrosshairOpacity = isSniperScopeActive
    ? 0
    : Math.max(
        0,
        (1 - hud.adsAlpha * 1.35) * (hud.reloadPhase === 'IDLE' ? 1 : 0.25)
      );

  return (
    <>
      {/* Damage Vignette Flash */}
      {hud.damageFlashAlpha > 0.01 && (
        <div
          className="fixed inset-0 pointer-events-none z-15 border-[16px] border-red-600/60"
          style={{ opacity: hud.damageFlashAlpha }}
        />
      )}

      {/* PHOTOREALISTIC SNIPER SCOPE OPTICAL APERTURE */}
      {isSniperScopeActive && (
        <div
          className="fixed inset-0 pointer-events-none flex items-center justify-center z-15 overflow-hidden transition-opacity duration-100"
          style={{
            opacity: Math.min(1, Math.max(0, (hud.adsAlpha - 0.35) / 0.45)),
          }}
        >
          <div className="w-[min(92vmin,640px)] h-[min(92vmin,640px)] rounded-full relative border-[4px] border-[#0f172a] shadow-[0_0_0_9999px_#000000] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,transparent_55%,rgba(0,0,0,0.92)_100%)] pointer-events-none" />
            <div className="absolute inset-1.5 rounded-full border border-amber-500/15 pointer-events-none" />

            <svg
              viewBox="0 0 400 400"
              className="w-full h-full pointer-events-none"
            >
              <line x1="0" y1="200" x2="110" y2="200" stroke="#090d16" strokeWidth="4" />
              <line x1="290" y1="200" x2="400" y2="200" stroke="#090d16" strokeWidth="4" />
              <line x1="200" y1="0" x2="200" y2="110" stroke="#090d16" strokeWidth="4" />
              <line x1="200" y1="290" x2="200" y2="400" stroke="#090d16" strokeWidth="4" />

              <line x1="110" y1="200" x2="290" y2="200" stroke="#0f172a" strokeWidth="1.6" />
              <line x1="200" y1="110" x2="200" y2="290" stroke="#0f172a" strokeWidth="1.6" />

              {[-60, -45, -30, -15, 15, 30, 45, 60].map((dx) => (
                <circle key={`h-${dx}`} cx={200 + dx} cy={200} r="1.6" fill="#0f172a" />
              ))}
              {[-60, -45, -30, -15].map((dy) => (
                <circle key={`v-${dy}`} cx={200} cy={200 + dy} r="1.6" fill="#0f172a" />
              ))}

              <line x1="194" y1="225" x2="206" y2="225" stroke="#0f172a" strokeWidth="1.4" />
              <line x1="190" y1="250" x2="210" y2="250" stroke="#0f172a" strokeWidth="1.5" />
              <line x1="186" y1="275" x2="214" y2="275" stroke="#0f172a" strokeWidth="1.5" />
              <line x1="182" y1="300" x2="218" y2="300" stroke="#0f172a" strokeWidth="1.5" />

              <circle cx="200" cy="200" r="2.2" fill="#ef4444" />
              <circle cx="200" cy="200" r="4.5" fill="#ef4444" opacity="0.35" />
            </svg>
          </div>
        </div>
      )}

      {/* Dynamic Center Crosshair & Ballistic Hitmarker */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-15">
        <svg
          width="44"
          height="44"
          viewBox="0 0 48 48"
          className="transition-opacity duration-75"
          style={{ opacity: hipCrosshairOpacity }}
        >
          <line x1="24" y1="7" x2="24" y2="15" stroke="#ffffff" strokeWidth="1.6" strokeOpacity="0.85" />
          <line x1="24" y1="33" x2="24" y2="41" stroke="#ffffff" strokeWidth="1.6" strokeOpacity="0.85" />
          <line x1="7" y1="24" x2="15" y2="24" stroke="#ffffff" strokeWidth="1.6" strokeOpacity="0.85" />
          <line x1="33" y1="24" x2="41" y2="24" stroke="#ffffff" strokeWidth="1.6" strokeOpacity="0.85" />
          <circle cx="24" cy="24" r="1.5" fill="#ffffff" />
        </svg>

        {hud.hitMarkerAlpha > 0.02 && (
          <svg
            width="36"
            height="36"
            viewBox="0 0 36 36"
            className="absolute"
            style={{ opacity: hud.hitMarkerAlpha }}
          >
            <line x1="7" y1="7" x2="14" y2="14" stroke={hud.hitMarkerIsCrit ? '#ef4444' : '#f8fafc'} strokeWidth="2.2" />
            <line x1="29" y1="7" x2="22" y2="14" stroke={hud.hitMarkerIsCrit ? '#ef4444' : '#f8fafc'} strokeWidth="2.2" />
            <line x1="7" y1="29" x2="14" y2="22" stroke={hud.hitMarkerIsCrit ? '#ef4444' : '#f8fafc'} strokeWidth="2.2" />
            <line x1="29" y1="29" x2="22" y2="22" stroke={hud.hitMarkerIsCrit ? '#ef4444' : '#f8fafc'} strokeWidth="2.2" />
          </svg>
        )}
      </div>

      {/* PROMOÇÃO DE PATENTE WARFACE NOTIFICATION BANNER */}
      {hud.rankUpNotification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none select-none font-mono">
          <div className="bg-[#0b0e14]/95 border-2 border-amber-400 rounded-2xl px-5 py-2.5 shadow-[0_0_30px_rgba(245,158,11,0.6)] flex items-center gap-3">
            <WarfaceRankIcon level={hud.rankLevel} className="w-8 h-8" />
            <div>
              <div className="text-[10px] font-mono font-bold text-amber-400 tracking-widest uppercase">
                ★ WARFACE CAREER PROMOTION ★
              </div>
              <div className="font-display font-black text-sm sm:text-base text-white tracking-wide">
                {hud.rankUpNotification}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOP-LEFT: WARFACE RANK BADGE + SCORE BAR */}
      <div className="fixed top-2.5 left-2.5 flex items-center z-20 pointer-events-none select-none font-mono">
        <div className="w-8 h-8 rounded-lg bg-black/80 border border-amber-500/40 flex items-center justify-center shadow-lg z-10">
          <WarfaceRankIcon level={hud.rankLevel} className="w-6 h-6" />
        </div>

        <div className="-ml-2 pl-4 pr-3 py-1 bg-black/60 border border-white/20 rounded-r-lg flex items-center gap-3 font-mono tabular-nums text-xs">
          <div className="flex flex-col gap-0.5">
            <div className="text-[10px] font-bold text-amber-300 leading-none">
              NÍV. {hud.rankLevel} · {hud.rankTitle.toUpperCase()}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sky-400 font-bold">{hud.hits}</span>
              <div className="w-10 h-1 bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400"
                  style={{
                    width: `${Math.min(100, (hud.hits / Math.max(1, hud.totalTargetsInDrill)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
          <span className="text-white/90 font-bold text-sm">{hud.score}</span>
        </div>
      </div>

      {/* TOP-RIGHT: SQUARE MINIMAP + UTILITY BUTTONS + OPTICS POPOVER */}
      <HudTopRightControls
        hud={hud}
        onSelectOptic={onSelectOptic}
        onToggleCanted={onToggleCanted}
        onToggleSuppressor={onToggleSuppressor}
        onCycleCharm={onCycleCharm}
        onToggleLaser={onToggleLaser}
        onToggleMute={onToggleMute}
        onToggleDock={onToggleDock}
        onToggleFullscreen={onToggleFullscreen}
        onPause={onPause}
      />

      {/* WALL WEAPON PICKUP ICON BUTTON */}
      {hud.focusedWallWeapon && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed top-20 left-1/2 -translate-x-1/2 pointer-events-auto z-40 select-none"
        >
          <button
            type="button"
            {...bindTap(() => onSelectWeapon(hud.focusedWallWeapon!))}
            aria-label="Pegar arma"
            className="w-16 h-14 rounded-2xl bg-black/80 border-2 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(250,204,21,0.4)] flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-transform cursor-pointer"
          >
            <WeaponSilhouette
              weaponId={hud.focusedWallWeapon}
              className="w-12 h-5"
            />
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className="text-white"
            >
              <path
                d="M12 19V5M12 5L6 11M12 5L18 11"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}

      {/* TACTICAL ACTION / RELOAD / ATTACHMENT STATUS FEEDBACK BANNER */}
      {hud.reloadTypeLabel && (
        <div className="fixed bottom-18 left-1/2 -translate-x-1/2 pointer-events-none z-30 select-none font-mono">
          <div className="bg-black/80 border border-amber-400/50 rounded-lg px-3 py-1 text-[10px] sm:text-xs font-mono font-bold text-amber-300 tracking-wider uppercase shadow-lg whitespace-nowrap">
            {hud.reloadTypeLabel}
          </div>
        </div>
      )}

      {/* BOTTOM-CENTER: WEAPON SLOTS + GRENADE SLOTS + HP BAR */}
      <HudBottomWeaponDock
        hud={hud}
        onSelectWeapon={onSelectWeapon}
        onToggleWeaponSlot={onToggleWeaponSlot}
        onInspectWeapon={onInspectWeapon}
        onCycleFireMode={onCycleFireMode}
        onResupply={onResupply}
        onThrowGrenade={onThrowGrenade}
      />
    </>
  );
};
