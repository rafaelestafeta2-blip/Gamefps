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
import { AllyNeedIndicators } from './AllyNeedIndicators';
import { MedicReviveIndicators } from './MedicReviveIndicators';
import { WarfaceKillfeed } from './WarfaceKillfeed';
import { YardBombHudBar } from './YardBombHudBar';

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
  onSupportHeld?: (held: boolean) => void;
  onThrowGrenade: (type: GrenadeType) => void;
  onToggleMute: () => void;
  onToggleDock: () => void;
  onToggleFullscreen: () => void;
  onPause: () => void;
  onPlantBomb?: () => void;
  onReturnToMenu?: () => void;
  onCycleSpectator?: (dir: -1 | 1) => void;
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
  onSupportHeld,
  onThrowGrenade,
  onToggleMute,
  onToggleDock,
  onToggleFullscreen,
  onPause,
  onPlantBomb,
  onReturnToMenu,
  onCycleSpectator,
}) => {
  const isSpectating = Boolean(hud.yardBomb?.isSpectating);
  const isMatchOver = hud.yardBomb?.roundState === 'MATCH_OVER';
  const isSniperScopeActive =
    !isSpectating &&
    !isMatchOver &&
    (hud.activeWeapon === 'SNIPER_BOLT' ||
      hud.activeWeapon === 'SNIPER_TACTICAL') &&
    !hud.cantedActive &&
    hud.adsAlpha > 0.35;

  const hipCrosshairOpacity =
    isSniperScopeActive || isSpectating || isMatchOver
      ? 0
      : Math.max(
          0,
          (1 - hud.adsAlpha * 1.35) * (hud.reloadPhase === 'IDLE' ? 1 : 0.25)
        );

  return (
    <>
      {/* Damage Vignette Flash & Critical Low Health Pulsing Blood Fringe */}
      {!isSpectating && (hud.damageFlashAlpha > 0.01 || (hud.health > 0 && hud.health < 35)) && (
        <div
          className={`fixed inset-0 pointer-events-none z-15 transition-opacity ${
            hud.health < 35 ? 'animate-pulse bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(220,38,38,0.38)_100%)]' : ''
          }`}
          style={{
            boxShadow: hud.damageFlashAlpha > 0.01
              ? `inset 0 0 ${Math.round(hud.damageFlashAlpha * 60 + 24)}px rgba(239, 68, 68, ${Math.min(0.95, hud.damageFlashAlpha)})`
              : 'inset 0 0 50px rgba(220, 38, 38, 0.45)',
            opacity: Math.max(hud.damageFlashAlpha, hud.health < 35 ? 0.85 : 0),
          }}
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

      {/* WARFACE TACTICAL 5V5 KILLFEED (Canto superior direito abaixo do radar) */}
      <WarfaceKillfeed entries={hud.killfeed} />

      {/* TOP-CENTER: 5v5 PLANT THE BOMB HUD BAR (YARD, DE_DUST2 & CS_ASSAULT) */}
      {(hud.drillMode === 'YARD_BOMB_5V5' ||
        hud.drillMode === 'DUST2_BOMB_5V5' ||
        hud.drillMode === 'ASSAULT_BOMB_5V5' ||
        hud.drillMode === 'INDUSTRIA_BOMB_5V5' ||
        hud.drillMode === 'HANGAR_BOMB_5V5' ||
        hud.drillMode === 'EASTERN_CITY_BOMB_5V5') &&
        hud.yardBomb && (
          <YardBombHudBar
            yardBomb={hud.yardBomb}
            onPlantBomb={() => onPlantBomb?.()}
            onReturnToMenu={onReturnToMenu}
            onCycleSpectator={onCycleSpectator}
          />
        )}

      {/* TOP-RIGHT: SQUARE MINIMAP + UTILITY BUTTONS + OPTICS POPOVER */}
      {!isMatchOver && (
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
      )}

      {/* WALL WEAPON PICKUP ICON BUTTON */}
      {!isSpectating && hud.focusedWallWeapon && (
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
      {!isSpectating && hud.reloadTypeLabel && (
        <div className="fixed bottom-18 left-1/2 -translate-x-1/2 pointer-events-none z-30 select-none font-mono">
          <div className="bg-black/80 border border-amber-400/50 rounded-lg px-3 py-1 text-[10px] sm:text-xs font-mono font-bold text-amber-300 tracking-wider uppercase shadow-lg whitespace-nowrap">
            {hud.reloadTypeLabel}
          </div>
        </div>
      )}

      <MedicReviveIndicators hud={hud} />
      <AllyNeedIndicators hud={hud} />

      {/* BOTTOM-CENTER: WEAPON SLOTS + GRENADE SLOTS + HP BAR (Hidden in Spectator Mode & Match Over) */}
      {!isSpectating && !isMatchOver && (
        <HudBottomWeaponDock
          hud={hud}
          onSelectWeapon={onSelectWeapon}
          onToggleWeaponSlot={onToggleWeaponSlot}
          onInspectWeapon={onInspectWeapon}
          onCycleFireMode={onCycleFireMode}
          onResupply={onResupply}
          onSupportHeld={onSupportHeld}
          onThrowGrenade={onThrowGrenade}
        />
      )}
    </>
  );
};
