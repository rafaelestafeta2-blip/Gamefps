import React from 'react';
import { MinimapRadar } from './MinimapRadar';
import { WarfaceRankIcon } from './WarfaceRankIcon';
import {
  isAttachmentUnlockedAtXp,
  isOpticUnlockedAtXp,
} from '../progression/ranks';
import {
  DrillMode,
  GrenadeType,
  GyroMode,
  HudState,
  OpticType,
  QualityPreset,
  WeaponId,
} from '../types/game';

interface TacticalHudOverlayProps {
  hud: HudState;
  onSelectWeapon: (weaponId: WeaponId) => void;
  onToggleWeaponSlot: () => void;
  onInspectWeapon: () => void;
  onSelectOptic: (optic: OpticType) => void;
  onToggleCanted: () => void;
  onToggleSuppressor: () => void;
  onToggleLaser: () => void;
  onCycleFireMode: () => void;
  onTriggerReload: (speed: boolean) => void;
  onTriggerMagCheck: () => void;
  onResupply: () => void;
  onThrowGrenade: (type: GrenadeType) => void;
  onSelectDrill: (mode: DrillMode) => void;
  onToggleMute: () => void;
  onToggleDock: () => void;
  onToggleTouchControls: () => void;
  onSetQualityPreset: (preset: QualityPreset) => void;
  onToggleDrs: () => void;
  onSetGyroMode: (mode: GyroMode) => void;
  onRecalibrateGyro: () => void;
  onToggleHaptics: () => void;
  onToggleFullscreen: () => void;
  onSetGraphicQuality: (quality: 'HIGH' | 'LOW') => void;
  onSetFpsLimit: (fps: number) => void;
  onPause: () => void;
}

const WeaponSilhouette: React.FC<{ weaponId: WeaponId; className?: string }> = ({
  weaponId,
  className = 'w-16 h-6',
}) => {
  if (weaponId === 'P50_PISTOL') {
    return (
      <svg viewBox="0 0 64 28" fill="none" className={className}>
        <path
          d="M14 7H46L48 11H30L26 23H17L20 12H14V7Z"
          fill="currentColor"
        />
        <rect x="28" y="11" width="6" height="4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (weaponId === 'SNIPER_BOLT' || weaponId === 'SNIPER_TACTICAL') {
    return (
      <svg viewBox="0 0 88 28" fill="none" className={className}>
        <path
          d="M4 13L18 11V17L4 19V13ZM18 11H58V14H84V12.5H87V15.5H58V17H38L35 23H29L31 17H22L19 22H15L18 11Z"
          fill="currentColor"
        />
        <rect x="28" y="6" width="22" height="3.5" rx="1" fill="currentColor" />
        <line x1="33" y1="9.5" x2="33" y2="11" stroke="currentColor" strokeWidth="2" />
        <line x1="45" y1="9.5" x2="45" y2="11" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  // Default Assault Rifle / Carbine / SMG silhouette
  return (
    <svg viewBox="0 0 84 28" fill="none" className={className}>
      <path
        d="M6 11L18 10V16L6 18V11ZM18 10H56V12H76V11H80V14.5H56V16H42L39 24H33L35 16H25L22 22H17L20 16H18V10Z"
        fill="currentColor"
      />
      <rect x="30" y="6.5" width="12" height="3" rx="1" fill="currentColor" />
    </svg>
  );
};

export const TacticalHudOverlay: React.FC<TacticalHudOverlayProps> = ({
  hud,
  onSelectWeapon,
  onToggleWeaponSlot,
  onInspectWeapon,
  onSelectOptic,
  onToggleCanted,
  onToggleSuppressor,
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

  const reserveAmmo = hud.magazines.reduce((acc, r) => acc + r, 0);
  const currentTotalLoaded = hud.currentMagRounds + hud.chambered;
  const isPrimaryActive = hud.activeWeapon !== 'P50_PISTOL';

  const primaryCycleOrder: WeaponId[] = [
    'M4_CARBINE',
    'SMG_45',
    'AK47_RIFLE',
    'CARBINE_AR',
    'L49_LMG',
    'SNIPER_TACTICAL',
    'SNIPER_BOLT',
  ];

  const handlePrimarySlotClick = () => {
    if (hud.equippedGrenade !== null) {
      onSelectWeapon(hud.primaryWeapon);
      return;
    }
    if (!isPrimaryActive) {
      onToggleWeaponSlot();
    } else {
      const idx = primaryCycleOrder.indexOf(hud.primaryWeapon);
      const nextWeapon =
        primaryCycleOrder[(idx + 1) % primaryCycleOrder.length];
      onSelectWeapon(nextWeapon);
    }
  };

  /**
   * Instant-tap binder for mobile multi-touch + desktop click:
   * - Fires once on pointerdown (even while left thumb holds the joystick)
   * - Does NOT bind onClick so React re-renders during touch never cause a second toggle on finger release
   */
  const bindTap = (action: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.stopPropagation();
      action();
    },
  });

  return (
    <div className="fixed inset-0 pointer-events-none select-none overflow-hidden font-mono">
      {/* Damage Vignette Flash */}
      {hud.damageFlashAlpha > 0.01 && (
        <div
          className="fixed inset-0 pointer-events-none z-10 border-[16px] border-red-600/60"
          style={{ opacity: hud.damageFlashAlpha }}
        />
      )}

      {/* =================================================================== */}
      {/* PHOTOREALISTIC SNIPER SCOPE OPTICAL APERTURE (CLEAN, NO TEXT)       */}
      {/* Rendered at z-10 so MobileTouchControls (z-20: Fire & Aim buttons)  */}
      {/* and HUD bars (z-40) remain 100% visible on top of the scope mask!   */}
      {/* =================================================================== */}
      {isSniperScopeActive && (
        <div
          className="fixed inset-0 pointer-events-none flex items-center justify-center z-10 overflow-hidden transition-opacity duration-100"
          style={{ opacity: Math.min(1, Math.max(0, (hud.adsAlpha - 0.35) / 0.45)) }}
        >
          <div className="w-[min(92vmin,640px)] h-[min(92vmin,640px)] rounded-full relative border-[4px] border-[#0f172a] shadow-[0_0_0_9999px_#000000] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,transparent_55%,rgba(0,0,0,0.92)_100%)] pointer-events-none" />
            <div className="absolute inset-1.5 rounded-full border border-amber-500/15 pointer-events-none" />

            <svg viewBox="0 0 400 400" className="w-full h-full pointer-events-none">
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

      {/* =================================================================== */}
      {/* PROMOÇÃO DE PATENTE WARFACE NOTIFICATION BANNER                    */}
      {/* =================================================================== */}
      {hud.rankUpNotification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
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

      {/* =================================================================== */}
      {/* TOP-LEFT: WARFACE RANK BADGE + SCORE BAR                            */}
      {/* =================================================================== */}
      <div className="fixed top-2.5 left-2.5 flex items-center z-20 pointer-events-none">
        {/* Tactical Rank Badge Icon */}
        <div className="w-8 h-8 rounded-lg bg-black/80 border border-amber-500/40 flex items-center justify-center shadow-lg z-10">
          <WarfaceRankIcon level={hud.rankLevel} className="w-6 h-6" />
        </div>

        {/* Angled Score & Rank Progress Wing */}
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
                  style={{ width: `${Math.min(100, (hud.hits / Math.max(1, hud.totalTargetsInDrill)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
          <span className="text-white/90 font-bold text-sm">{hud.score}</span>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TOP-RIGHT: SQUARE MINIMAP + CIRCULAR ICON UTILITY BUTTONS           */}
      {/* =================================================================== */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="fixed top-2.5 right-2.5 flex items-start gap-2 z-40 pointer-events-auto"
      >
        {/* Circular Utility Buttons to the left of Minimap (exact COD Mobile layout) */}
        <div className="flex items-start gap-1.5 pt-0.5">
          {/* Gunsmith / Optics Toggle Icon */}
          <button
            type="button"
            {...bindTap(onToggleDock)}
            aria-label="Acessórios e Miras"
            title="Abrir/Fechar Miras e Acessórios"
            className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors active:scale-90 cursor-pointer ${
              !hud.dockCollapsed
                ? 'bg-amber-500/85 border-white text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                : 'bg-black/55 border-white/30 text-white/90 hover:bg-black/75'
            }`}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
              <path d="M12 2V5M12 19V22M2 12H5M19 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Column of Settings Gear, Audio Speaker, Fullscreen Icons */}
          <div className="flex flex-col gap-1.5">
            {/* Single Settings / Pause Gear Button next to Minimap */}
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onPause();
              }}
              aria-label="Configurações e Pausa"
              title="Configurações, Gráficos e Pausa"
              className="w-9 h-9 rounded-full bg-black/55 hover:bg-black/75 border border-white/30 text-white/90 flex items-center justify-center transition-colors active:scale-90 cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
            </button>

            {/* Audio / Mute Speaker Icon */}
            <button
              type="button"
              {...bindTap(onToggleMute)}
              aria-label="Alternar áudio"
              title={hud.muted ? 'Ativar Som' : 'Silenciar Som'}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors active:scale-90 cursor-pointer ${
                hud.muted
                  ? 'bg-red-500/60 border-red-300 text-white'
                  : 'bg-black/55 border-white/30 text-white/90 hover:bg-black/75'
              }`}
            >
              {hud.muted ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path d="M11 5L6 9H2V15H6L11 19V5Z" fill="currentColor" />
                  <path d="M23 9L17 15M17 9L23 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path d="M11 5L6 9H2V15H6L11 19V5Z" fill="currentColor" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </button>

            {/* Fullscreen Icon */}
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFullscreen();
              }}
              aria-label="Tela cheia"
              title="Alternar Tela Cheia"
              className="w-9 h-9 rounded-full bg-black/55 hover:bg-black/75 border border-white/30 text-white/90 flex items-center justify-center transition-colors active:scale-90 cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Square COD Mobile Minimap */}
        <MinimapRadar
          playerX={hud.playerPos?.x || 0}
          playerZ={hud.playerPos?.z || 0}
          playerYaw={hud.playerYaw || 0}
          targets={hud.radarTargets}
        />
      </div>

      {/* =================================================================== */}
      {/* POPOVER ICON BAR FOR OPTICS & ATTACHMENTS                           */}
      {/* =================================================================== */}
      {!hud.dockCollapsed && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed top-14 right-32 z-40 pointer-events-auto bg-black/90 border border-amber-500/40 rounded-2xl p-2 flex items-center gap-1.5 shadow-2xl"
        >
          {/* Iron Sight Icon */}
          <button
            type="button"
            {...bindTap(() => onSelectOptic('iron'))}
            aria-label="Mira de ferro"
            title="Mira de Ferro Padrão"
            className={`w-10 h-10 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-90 ${
              hud.optic === 'iron' && !hud.cantedActive
                ? 'bg-amber-500 text-slate-950 border-amber-200 font-bold'
                : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 18H20M7 18V10M17 18V10M12 18V7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Holo Sight Icon */}
          {(() => {
            const unlocked = isOpticUnlockedAtXp('holo', hud.playerXp);
            return (
              <button
                type="button"
                {...bindTap(() => onSelectOptic('holo'))}
                aria-label="Mira Holográfica"
                title="Mira Holográfica EOTech"
                className={`relative w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition-transform active:scale-90 ${
                  hud.optic === 'holo' && !hud.cantedActive
                    ? 'bg-amber-500 text-slate-950 border-amber-200 font-bold'
                    : unlocked
                      ? 'bg-white/10 text-white border-white/15 hover:bg-white/20'
                      : 'bg-white/5 text-slate-300 border-white/15 hover:bg-white/15'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="6" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
              </button>
            );
          })()}

          {/* LPVO Scope Icon */}
          {(() => {
            const unlocked = isOpticUnlockedAtXp('lpvo', hud.playerXp);
            return (
              <button
                type="button"
                {...bindTap(() => onSelectOptic('lpvo'))}
                aria-label="Luneta LPVO"
                title="Luneta Tática LPVO 1-4x"
                className={`relative w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition-transform active:scale-90 ${
                  hud.optic === 'lpvo' && !hud.cantedActive
                    ? 'bg-amber-500 text-slate-950 border-amber-200 font-bold'
                    : unlocked
                      ? 'bg-white/10 text-white border-white/15 hover:bg-white/20'
                      : 'bg-white/5 text-slate-300 border-white/15 hover:bg-white/15'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 4V20M4 12H20" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            );
          })()}

          {/* Canted 45° Sight Icon */}
          {(() => {
            const unlocked = isAttachmentUnlockedAtXp('canted', hud.playerXp);
            return (
              <button
                type="button"
                {...bindTap(onToggleCanted)}
                aria-label="Mira inclinada 45 graus"
                title="Mira Inclinada 45°"
                className={`relative w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition-transform active:scale-90 ${
                  hud.cantedActive
                    ? 'bg-amber-500 text-slate-950 border-amber-200 font-bold'
                    : unlocked
                      ? 'bg-white/10 text-white border-white/15 hover:bg-white/20'
                      : 'bg-white/5 text-slate-300 border-white/15 hover:bg-white/15'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M6 18L18 6M14 6H18V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            );
          })()}

          {/* Suppressor Icon */}
          {(() => {
            const unlocked = isAttachmentUnlockedAtXp('suppressor', hud.playerXp);
            return (
              <button
                type="button"
                {...bindTap(onToggleSuppressor)}
                aria-label="Supressor"
                title="Supressor Acústico Tático"
                className={`relative w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition-transform active:scale-90 ${
                  hud.suppressorAttached
                    ? 'bg-amber-500 text-slate-950 border-amber-200 font-bold'
                    : unlocked
                      ? 'bg-white/10 text-white border-white/15 hover:bg-white/20'
                      : 'bg-white/5 text-slate-300 border-white/15 hover:bg-white/15'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="9" width="18" height="6" rx="2" stroke="currentColor" strokeWidth="2" />
                  <line x1="8" y1="9" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="14" y1="9" x2="14" y2="15" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            );
          })()}

          {/* Laser Icon */}
          {(() => {
            const unlocked = isAttachmentUnlockedAtXp('laser', hud.playerXp);
            return (
              <button
                type="button"
                {...bindTap(onToggleLaser)}
                aria-label="Laser tático"
                title="Laser Tático PEQ-15 Verde"
                className={`relative w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition-transform active:scale-90 ${
                  hud.laserActive
                    ? 'bg-emerald-500 text-slate-950 border-emerald-200 font-bold'
                    : unlocked
                      ? 'bg-white/10 text-white border-white/15 hover:bg-white/20'
                      : 'bg-white/5 text-slate-300 border-white/15 hover:bg-white/15'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="6" cy="12" r="3" fill="currentColor" />
                  <path d="M9 12H22" stroke="currentColor" strokeWidth="2.2" strokeDasharray="3 2" strokeLinecap="round" />
                </svg>
              </button>
            );
          })()}
        </div>
      )}

      {/* =================================================================== */}
      {/* WALL WEAPON PICKUP ICON BUTTON (CLEAN ICON ONLY)                    */}
      {/* =================================================================== */}
      {hud.focusedWallWeapon && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed top-20 left-1/2 -translate-x-1/2 pointer-events-auto z-40"
        >
          <button
            type="button"
            {...bindTap(() => onSelectWeapon(hud.focusedWallWeapon!))}
            aria-label="Pegar arma"
            className="w-16 h-14 rounded-2xl bg-black/75 border-2 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(250,204,21,0.35)] flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-transform cursor-pointer"
          >
            <WeaponSilhouette weaponId={hud.focusedWallWeapon} className="w-12 h-5" />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M12 19V5M12 5L6 11M12 5L18 11" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* TACTICAL ACTION / RELOAD / ATTACHMENT STATUS FEEDBACK BANNER        */}
      {/* =================================================================== */}
      {hud.reloadTypeLabel && (
        <div className="fixed bottom-18 left-1/2 -translate-x-1/2 pointer-events-none z-30">
          <div className="bg-black/75 border border-amber-400/50 rounded-lg px-3 py-1 text-[10px] sm:text-xs font-mono font-bold text-amber-300 tracking-wider uppercase shadow-lg whitespace-nowrap">
            {hud.reloadTypeLabel}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* BOTTOM-CENTER: CALL OF DUTY MOBILE WEAPON + GRENADE SLOTS + HP BAR  */}
      {/* =================================================================== */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="fixed bottom-1.5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-40 pointer-events-auto"
      >
        {/* Weapon & Tactical Grenade Slots Row */}
        <div className="flex items-end gap-1">
          {/* Left Utility Box: Fire Mode Toggle Icon (Single / Burst / Auto) */}
          <button
            type="button"
            {...bindTap(onCycleFireMode)}
            aria-label="Alternar modo de disparo"
            title={`Modo de Disparo: ${hud.fireMode}`}
            className="w-9 sm:w-10 h-11 bg-black/70 hover:bg-black/85 border border-white/30 text-white/90 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform cursor-pointer"
          >
            {hud.fireMode === 'AUTO' ? (
              <svg width="16" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="6" width="2.5" height="12" rx="1" fill="currentColor" />
                <rect x="10.5" y="4" width="2.5" height="14" rx="1" fill="currentColor" />
                <rect x="16" y="6" width="2.5" height="12" rx="1" fill="currentColor" />
              </svg>
            ) : hud.fireMode === 'BURST' ? (
              <svg width="16" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="7" y="5" width="2.5" height="13" rx="1" fill="currentColor" />
                <rect x="13.5" y="5" width="2.5" height="13" rx="1" fill="currentColor" />
              </svg>
            ) : (
              <svg width="16" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="10.5" y="5" width="3" height="14" rx="1" fill="currentColor" />
              </svg>
            )}
            <span className="text-[8px] font-bold text-amber-300 leading-none">
              {hud.fireMode}
            </span>
          </button>

          {/* Left Utility Box 2: Inspect Weapon Icon */}
          <button
            type="button"
            {...bindTap(onInspectWeapon)}
            aria-label="Inspecionar arma"
            title="Inspecionar Arma 3D"
            className="w-9 sm:w-10 h-11 bg-black/70 hover:bg-black/85 border border-white/30 text-white/90 flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
          </button>

          {/* SLOT 1: PRIMARY RIFLE / SNIPER */}
          <button
            type="button"
            {...bindTap(handlePrimarySlotClick)}
            aria-label="Arma principal"
            title="Equipar ou Alternar Arma Principal"
            className={`relative w-24 sm:w-28 h-11 px-2 flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              isPrimaryActive && hud.equippedGrenade === null
                ? 'bg-gradient-to-t from-amber-500/30 to-black/80 border-2 border-amber-400/90 text-white shadow-[0_0_12px_rgba(250,204,21,0.25)]'
                : 'bg-black/70 border border-white/25 text-white/60 hover:text-white/90'
            }`}
          >
            <WeaponSilhouette
              weaponId={hud.primaryWeapon}
              className="w-16 h-6 -mt-1.5"
            />
            {isPrimaryActive && (
              <span className="absolute bottom-0.5 right-1.5 font-mono tabular-nums text-[10px] font-bold text-white leading-none">
                {currentTotalLoaded}/{reserveAmmo}
              </span>
            )}
          </button>

          {/* SLOT 2: SECONDARY PISTOL */}
          <button
            type="button"
            {...bindTap(() => {
              if (hud.equippedGrenade !== null) {
                onSelectWeapon('P50_PISTOL');
              } else if (isPrimaryActive) {
                onToggleWeaponSlot();
              } else {
                onSelectWeapon('P50_PISTOL');
              }
            })}
            aria-label="Pistola secundária"
            title="Equipar Pistola Secundária Mark 23"
            className={`relative w-20 sm:w-24 h-11 px-2 flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              !isPrimaryActive && hud.equippedGrenade === null
                ? 'bg-gradient-to-t from-amber-500/30 to-black/80 border-2 border-amber-400/90 text-white shadow-[0_0_12px_rgba(250,204,21,0.25)]'
                : 'bg-black/70 border border-white/25 text-white/60 hover:text-white/90'
            }`}
          >
            <WeaponSilhouette
              weaponId="P50_PISTOL"
              className="w-12 h-5 -mt-1"
            />
            {!isPrimaryActive && (
              <span className="absolute bottom-0.5 right-1.5 font-mono tabular-nums text-[10px] font-bold text-white leading-none">
                {currentTotalLoaded}/{reserveAmmo}
              </span>
            )}
          </button>

          {/* SLOT 3: FRAG GRENADE [G] (1º toque equipa na mão, Botão de Tiro ou 2º toque puxa o pino e joga) */}
          <button
            type="button"
            {...bindTap(() => onThrowGrenade('FRAG'))}
            aria-label="Granada de Fragmentação"
            title="Toque para segurar a Granada Frag na mão [G]"
            className={`relative w-12 h-11 flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer ${
              hud.equippedGrenade === 'FRAG'
                ? 'bg-gradient-to-t from-orange-500/45 to-black/85 border-2 border-orange-400 text-orange-200 shadow-[0_0_14px_rgba(249,115,22,0.55)] scale-105'
                : hud.fragGrenades > 0
                  ? 'bg-black/70 hover:bg-black/85 border border-orange-400/70 text-orange-300'
                  : 'bg-black/45 border border-white/15 text-white/30'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <ellipse cx="12" cy="14" rx="5.5" ry="6.5" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.8" />
              <path d="M9.5 7.5H14.5V5H9.5V7.5Z" stroke="currentColor" strokeWidth="1.6" />
              <path d="M14.5 6H18L19 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="8" cy="5.5" r="1.8" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <span className="text-[8px] font-bold leading-none mt-0.5">
              {hud.equippedGrenade === 'FRAG' ? 'MÃO' : `x${hud.fragGrenades}`}
            </span>
          </button>

          {/* SLOT 4: SMOKE GRENADE [J] (1º toque equipa na mão, Botão de Tiro ou 2º toque puxa o pino e joga) */}
          <button
            type="button"
            {...bindTap(() => onThrowGrenade('SMOKE'))}
            aria-label="Granada de Fumaça"
            title="Toque para segurar a Granada de Fumaça na mão [J]"
            className={`relative w-12 h-11 flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer ${
              hud.equippedGrenade === 'SMOKE'
                ? 'bg-gradient-to-t from-sky-500/45 to-black/85 border-2 border-sky-400 text-sky-200 shadow-[0_0_14px_rgba(56,189,248,0.55)] scale-105'
                : hud.smokeGrenades > 0
                  ? 'bg-black/70 hover:bg-black/85 border border-sky-400/70 text-sky-300'
                  : 'bg-black/45 border border-white/15 text-white/30'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="8" y="8" width="8" height="12" rx="1.5" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.8" />
              <line x1="8" y1="12.5" x2="16" y2="12.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="M10 8V5.5H14V8" stroke="currentColor" strokeWidth="1.6" />
              <path d="M7 4.5C8.5 2.5 11 2.5 12 4C13.5 2.5 16 2.5 17.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span className="text-[8px] font-bold leading-none mt-0.5">
              {hud.equippedGrenade === 'SMOKE' ? 'MÃO' : `x${hud.smokeGrenades}`}
            </span>
          </button>

          {/* Right Utility Box: Resupply Ammo & Grenades Crate Icon */}
          <button
            type="button"
            {...bindTap(onResupply)}
            aria-label="Reabastecer munição e granadas"
            title="Reabastecer Munição e Granadas [U]"
            className="w-10 h-11 bg-black/70 hover:bg-black/85 border border-white/30 text-amber-300 flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Bottom Sleek HP Bar (Exact COD Mobile Bottom Health Bar) */}
        <div className="w-64 sm:w-76 h-3 bg-black/65 border border-white/25 px-1.5 flex items-center gap-1.5">
          <div className="flex-1 h-1.5 bg-white/15 overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-150"
              style={{ width: `${hud.health}%` }}
            />
          </div>
          {hud.reloadPhase !== 'IDLE' && (
            <div className="w-14 h-1.5 bg-amber-500/25 overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-75"
                style={{ width: `${Math.round(hud.reloadProgress * 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
