import React from 'react';
import { MinimapRadar } from './MinimapRadar';
import {
  DrillMode,
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
  onToggleLaser,
  onCycleFireMode,
  onResupply,
  onSelectDrill,
  onToggleMute,
  onToggleDock,
  onToggleTouchControls,
  onSetQualityPreset,
  onToggleDrs,
  onSetGyroMode,
  onRecalibrateGyro,
  onToggleHaptics,
  onToggleFullscreen,
  onPause,
}) => {
  const accuracy =
    hud.shotsFired > 0 ? Math.round((hud.hits / hud.shotsFired) * 100) : 100;

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

  const cycleGyroMode = () => {
    const order: GyroMode[] = ['OFF', 'ADS_ONLY', 'ALWAYS'];
    const next = order[(order.indexOf(hud.gyroMode) + 1) % order.length];
    onSetGyroMode(next);
  };

  const cycleQualityPreset = () => {
    const order: QualityPreset[] = [
      'COMPETITIVE_120',
      'BALANCED_60',
      'ULTRA_PBR',
    ];
    const next = order[(order.indexOf(hud.qualityPreset) + 1) % order.length];
    onSetQualityPreset(next);
  };

  const presetLabel =
    hud.qualityPreset === 'COMPETITIVE_120'
      ? '120 FPS'
      : hud.qualityPreset === 'BALANCED_60'
        ? '60 FPS'
        : 'ULTRA';

  const gyroLabel =
    hud.gyroMode === 'OFF'
      ? 'OFF'
      : hud.gyroMode === 'ADS_ONLY'
        ? 'MIRA ADS'
        : 'SEMPRE';

  const weaponBadgeMap: Record<WeaponId, string> = {
    P50_PISTOL: 'MARK 23 · .45 ACP',
    SMG_45: 'SMG .45 · .45 ACP',
    M4_CARBINE: 'M4A1 SOPMOD · 5.56MM',
    CARBINE_AR: 'CARABINA · 5.56MM',
    AK47_RIFLE: 'AK-47 · 7.62MM',
    L49_LMG: 'LMG PESADA · 5.56MM',
    SNIPER_BOLT: 'SNIPER BOLT · .338',
    SNIPER_TACTICAL: 'SNIPER TÁTICA · .308',
  };
  const weaponBadgeLabel = weaponBadgeMap[hud.activeWeapon];

  const weaponNamesMap: Record<WeaponId, string> = {
    P50_PISTOL: 'Mark 23',
    SMG_45: 'SMG .45',
    M4_CARBINE: 'M4A1 SOPMOD',
    CARBINE_AR: 'Carabina Tática',
    AK47_RIFLE: 'AK-47 Comando',
    L49_LMG: 'LMG Pesada',
    SNIPER_BOLT: 'Sniper Bolt',
    SNIPER_TACTICAL: 'Sniper Tática',
  };

  const weaponCalibersMap: Record<WeaponId, string> = {
    P50_PISTOL: '.45 ACP',
    SMG_45: '.45 ACP',
    M4_CARBINE: '5.56mm',
    CARBINE_AR: '5.56mm',
    AK47_RIFLE: '7.62mm',
    L49_LMG: '5.56mm',
    SNIPER_BOLT: '.338 Lapua',
    SNIPER_TACTICAL: '.308 Win',
  };

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-10 overflow-hidden">
      {/* Damage Vignette Flash (No backdrop-filter over WebGL) */}
      {hud.damageFlashAlpha > 0.01 && (
        <div
          className="fixed inset-0 pointer-events-none border-[16px] border-red-600/60"
          style={{ opacity: hud.damageFlashAlpha }}
        />
      )}

      {/* =================================================================== */}
      {/* PHOTOREALISTIC SNIPER SCOPE OPTICAL APERTURE & MIL-DOT RETICLE     */}
      {/* =================================================================== */}
      {isSniperScopeActive && (
        <div
          className="fixed inset-0 pointer-events-none flex items-center justify-center z-25 overflow-hidden transition-opacity duration-100"
          style={{ opacity: Math.min(1, Math.max(0, (hud.adsAlpha - 0.35) / 0.45)) }}
        >
          {/* Circular Sniper Scope Aperture with Pure Black Surrounding Mask */}
          <div className="w-[min(92vmin,640px)] h-[min(92vmin,640px)] rounded-full relative border-[4px] border-[#0f172a] shadow-[0_0_0_9999px_#000000] flex items-center justify-center overflow-hidden">
            {/* Optical Lens Vignette & Barrel Shading */}
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,transparent_55%,rgba(0,0,0,0.92)_100%)] pointer-events-none" />
            <div className="absolute inset-1.5 rounded-full border border-amber-500/15 pointer-events-none" />

            {/* Tactical Sniper Scope Crosshair & Ballistic Drop Ladder */}
            <svg
              viewBox="0 0 400 400"
              className="w-full h-full pointer-events-none"
            >
              {/* Outer Heavy Posts */}
              <line x1="0" y1="200" x2="110" y2="200" stroke="#090d16" strokeWidth="4" />
              <line x1="290" y1="200" x2="400" y2="200" stroke="#090d16" strokeWidth="4" />
              <line x1="200" y1="0" x2="200" y2="110" stroke="#090d16" strokeWidth="4" />
              <line x1="200" y1="290" x2="200" y2="400" stroke="#090d16" strokeWidth="4" />

              {/* Fine Optical Crosshairs */}
              <line x1="110" y1="200" x2="290" y2="200" stroke="#0f172a" strokeWidth="1.6" />
              <line x1="200" y1="110" x2="200" y2="290" stroke="#0f172a" strokeWidth="1.6" />

              {/* Mil-Dots on Horizontal Axis */}
              {[-60, -45, -30, -15, 15, 30, 45, 60].map((dx) => (
                <circle key={`h-${dx}`} cx={200 + dx} cy={200} r="1.6" fill="#0f172a" />
              ))}

              {/* Mil-Dots on Upper Vertical Axis */}
              {[-60, -45, -30, -15].map((dy) => (
                <circle key={`v-${dy}`} cx={200} cy={200 + dy} r="1.6" fill="#0f172a" />
              ))}

              {/* Ballistic Drop Compensation (BDC) Ladder Marks on Lower Vertical Axis */}
              <line x1="194" y1="225" x2="206" y2="225" stroke="#0f172a" strokeWidth="1.4" />
              <line x1="190" y1="250" x2="210" y2="250" stroke="#0f172a" strokeWidth="1.5" />
              <text x="214" y="253" fontSize="8" fontFamily="monospace" fill="#0f172a">2</text>
              <line x1="186" y1="275" x2="214" y2="275" stroke="#0f172a" strokeWidth="1.5" />
              <text x="218" y="278" fontSize="8" fontFamily="monospace" fill="#0f172a">3</text>
              <line x1="182" y1="300" x2="218" y2="300" stroke="#0f172a" strokeWidth="1.5" />
              <text x="222" y="303" fontSize="8" fontFamily="monospace" fill="#0f172a">4</text>
              <line x1="178" y1="325" x2="222" y2="325" stroke="#0f172a" strokeWidth="1.5" />
              <text x="226" y="328" fontSize="8" fontFamily="monospace" fill="#0f172a">5</text>

              {/* Illuminated Precision Center Dot */}
              <circle cx="200" cy="200" r="2.2" fill="#ef4444" />
              <circle cx="200" cy="200" r="4.5" fill="#ef4444" opacity="0.35" />
            </svg>

            {/* Scope Telemetry & Rangefinder Designation Readout */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded bg-black/60 border border-white/10 font-mono text-[9px] font-semibold text-slate-300 tracking-wider whitespace-nowrap">
              ELEV: +1.2 MIL · WIND: 0.0 MIL
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded bg-black/75 border border-amber-500/20 font-mono text-[10px] font-bold text-amber-400 tracking-widest uppercase whitespace-nowrap">
              {hud.activeWeapon === 'SNIPER_BOLT'
                ? 'LEUPOLD MK4 · 12X50 · .338 LAPUA MAGNUM'
                : hud.activeWeapon === 'SNIPER_TACTICAL'
                  ? 'SCHMIDT & BENDER PM II · 10X42 · .308 WIN'
                  : `LPVO ${hud.lpvoZoom.toFixed(1)}X · FFP MIL-DOT`}
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Center Crosshair & Ballistic Hitmarker */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          className="transition-opacity duration-75"
          style={{ opacity: hipCrosshairOpacity }}
        >
          <line
            x1="24"
            y1="6"
            x2="24"
            y2="15"
            stroke="#f8fafc"
            strokeWidth="1.5"
            strokeOpacity="0.8"
          />
          <line
            x1="24"
            y1="33"
            x2="24"
            y2="42"
            stroke="#f8fafc"
            strokeWidth="1.5"
            strokeOpacity="0.8"
          />
          <line
            x1="6"
            y1="24"
            x2="15"
            y2="24"
            stroke="#f8fafc"
            strokeWidth="1.5"
            strokeOpacity="0.8"
          />
          <line
            x1="33"
            y1="24"
            x2="42"
            y2="24"
            stroke="#f8fafc"
            strokeWidth="1.5"
            strokeOpacity="0.8"
          />
          <circle cx="24" cy="24" r="1.5" fill="#f59e0b" />
        </svg>

        {hud.hitMarkerAlpha > 0.02 && (
          <svg
            width="36"
            height="36"
            viewBox="0 0 36 36"
            className="absolute"
            style={{ opacity: hud.hitMarkerAlpha }}
          >
            <line
              x1="7"
              y1="7"
              x2="14"
              y2="14"
              stroke={hud.hitMarkerIsCrit ? '#ef4444' : '#f8fafc'}
              strokeWidth="2.2"
            />
            <line
              x1="29"
              y1="7"
              x2="22"
              y2="14"
              stroke={hud.hitMarkerIsCrit ? '#ef4444' : '#f8fafc'}
              strokeWidth="2.2"
            />
            <line
              x1="7"
              y1="29"
              x2="14"
              y2="22"
              stroke={hud.hitMarkerIsCrit ? '#ef4444' : '#f8fafc'}
              strokeWidth="2.2"
            />
            <line
              x1="29"
              y1="29"
              x2="22"
              y2="22"
              stroke={hud.hitMarkerIsCrit ? '#ef4444' : '#f8fafc'}
              strokeWidth="2.2"
            />
          </svg>
        )}
      </div>

      {/* =================================================================== */}
      {/* TOP PERIMETER STATUS BAR WITH INTEGRATED MINIMAP RADAR             */}
      {/* =================================================================== */}
      <div className="fixed top-3 left-3 right-3 flex flex-wrap items-start justify-between gap-2.5 z-20">
        {/* Top-Left: Tactical Radar / Minimap + Player Status & Telemetry */}
        <div className="flex items-start gap-2.5">
          <MinimapRadar
            playerX={hud.playerPos?.x || 0}
            playerZ={hud.playerPos?.z || 0}
            playerYaw={hud.playerYaw || 0}
            targets={hud.radarTargets}
          />

          <div className="flex flex-col gap-1.5">
            <div className="bg-[#0b0e14]/94 border border-slate-700/80 rounded-xl px-3 py-1.5 flex items-center gap-3 shadow-lg">
              <div>
                <div className="font-display text-xs font-bold tracking-wider text-slate-100 flex items-center gap-2">
                  <span>KINETIC</span>
                  <span className="text-[10px] font-mono font-semibold text-emerald-400 tabular-nums">
                    {hud.liveFps} FPS
                  </span>
                </div>
                {/* Health & Breath Bars */}
                <div className="flex flex-col gap-0.5 mt-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-mono text-slate-400 w-5">HP</span>
                    <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-150"
                        style={{ width: `${hud.health}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-mono text-slate-400 w-5">FO</span>
                    <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                      <div
                        className="h-full bg-cyan-400 transition-all duration-150"
                        style={{ width: `${Math.round(hud.stamina)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-8 w-[1px] bg-white/10" />

              <div className="flex items-center gap-2.5 font-mono tabular-nums">
                <div>
                  <div className="text-[9px] text-slate-400">PONTOS</div>
                  <div className="text-xs font-bold text-amber-400">
                    {hud.score}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400">PREC.</div>
                  <div className="text-xs font-semibold text-slate-100">
                    {accuracy}%
                  </div>
                </div>
                {hud.drillMode !== 'FREE_RANGE' && (
                  <div>
                    <div className="text-[9px] text-slate-400">ALVOS</div>
                    <div className="text-xs font-semibold text-cyan-400">
                      {hud.targetsRemaining}/{hud.totalTargetsInDrill}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Ballistic Impact Telemetry */}
            {hud.lastShotTelemetry && (
              <div className="bg-[#0b0e14]/85 border border-white/10 rounded-lg px-2.5 py-1 text-[10px] font-mono tabular-nums text-slate-300 flex items-center gap-1.5">
                <span className="text-amber-400 font-semibold">
                  {hud.lastShotTelemetry.distanceMeters}m
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {hud.lastShotTelemetry.zone === 'HEAD' && 'Headshot'}
                  {hud.lastShotTelemetry.zone === 'TORSO_A' && 'Torso-A'}
                  {hud.lastShotTelemetry.zone === 'ARMOR' && 'Blindagem'}
                  {hud.lastShotTelemetry.zone === 'STEEL_GONG' && 'Gongo AR500'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-100">
                  {hud.lastShotTelemetry.damage} DMG
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Top-Right: Live Weapon Status Card with Weapon Switcher Button */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Primary / Secondary Weapon Switch Quick Button */}
          <button
            type="button"
            onClick={onToggleWeaponSlot}
            className="bg-[#0b0e14]/90 hover:bg-[#161b26] border border-amber-500/50 hover:border-amber-400 rounded-xl px-3 py-2 flex items-center gap-2 transition-colors cursor-pointer group shadow-lg active:scale-95"
            title="Alternar entre Arma Principal (Rifle) e Secundária (Pistola)"
          >
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-mono font-bold text-amber-400 tracking-wider">
                ALTERNAR ARMA
              </span>
              <span className="text-xs font-mono font-semibold text-slate-200">
                {hud.activeWeapon === 'P50_PISTOL' ? '◄ PISTOLA' : 'RIFLE ►'}
              </span>
            </div>
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 group-hover:bg-amber-500/30 flex items-center justify-center border border-amber-400/40 text-amber-300">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </button>

          <div className="bg-[#0b0e14]/94 border border-slate-700/80 rounded-xl px-3 py-1.5 flex items-center gap-3 shadow-lg">
            <div>
              <div className="text-[9px] font-mono text-slate-400 flex items-center gap-1.5">
                <span className="font-semibold text-slate-200">{weaponBadgeLabel}</span>
                <span>·</span>
                <span>{hud.fireMode}</span>
              </div>
              <div className="flex items-baseline gap-1 font-mono tabular-nums">
                <span
                  className={`text-xl font-bold ${
                    hud.currentMagRounds <= Math.max(3, Math.floor(hud.magCapacity * 0.2))
                      ? 'text-amber-400 animate-pulse'
                      : 'text-slate-100'
                  }`}
                >
                  {hud.currentMagRounds}
                </span>
                <span className="text-xs text-emerald-400 font-semibold">
                  {hud.chambered === 1 ? '+1' : '+0'}
                </span>
                <span className="text-[11px] text-slate-500">
                  /{hud.magCapacity}
                </span>
              </div>
            </div>

            {/* Chest Rig Retained Magazine Bars */}
            <div className="flex items-end gap-1 h-6 pl-2 border-l border-white/10">
              {hud.magazines.map((rounds, idx) => {
                const pct = Math.round((rounds / hud.magCapacity) * 100);
                return (
                  <div
                    key={idx}
                    className="w-2.5 h-5 bg-slate-800 border border-white/15 rounded-xs flex flex-col justify-end p-[1px]"
                    title={`Carregador #${idx + 1}: ${rounds} munições`}
                  >
                    <div
                      className="w-full bg-amber-500"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleFullscreen}
            className={`min-h-[42px] bg-[#0b0e14]/90 hover:bg-[#161b26] border text-xs font-mono font-semibold px-2.5 rounded-xl transition-colors whitespace-nowrap shrink-0 ${
              hud.isFullscreen
                ? 'border-amber-500/60 text-amber-300'
                : 'border-white/15 text-slate-200'
            }`}
            title="Tela Cheia Horizontal"
          >
            {hud.isFullscreen ? 'SAIR TELA' : 'FULLSCREEN'}
          </button>

          <button
            type="button"
            onClick={onPause}
            className="min-h-[42px] min-w-[42px] bg-[#0b0e14]/90 hover:bg-[#161b26] border border-white/15 text-slate-200 text-xs font-mono font-semibold px-2.5 rounded-xl transition-colors whitespace-nowrap shrink-0"
          >
            PAUSA
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* CONTEXTUAL IN-WORLD 3D WALL WEAPON PICKUP PROMPT                    */}
      {/* =================================================================== */}
      {hud.focusedWallWeapon && (
        <div className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 pointer-events-auto z-40 animate-in fade-in zoom-in-95 duration-150">
          <button
            type="button"
            onClick={() => onSelectWeapon(hud.focusedWallWeapon!)}
            className="min-h-[46px] px-4 sm:px-5 py-2 bg-[#0b0e14]/95 border-2 border-amber-400 text-amber-300 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center gap-2.5 active:scale-95 transition-all cursor-pointer hover:bg-amber-500/20"
          >
            <span className="bg-amber-400 text-slate-950 font-mono font-bold text-xs px-2 py-0.5 rounded shadow">
              E
            </span>
            <span className="font-display font-bold text-xs sm:text-sm tracking-wide text-slate-100">
              Pegar {weaponNamesMap[hud.focusedWallWeapon] || 'Arma'}
            </span>
            <span className="font-mono text-[11px] text-amber-400/90 font-semibold">
              · {weaponCalibersMap[hud.focusedWallWeapon] || ''}
            </span>
          </button>
        </div>
      )}

      {/* Center-Top Reload / Bolt-Lock / Mag-Check Active Mechanical Banner */}
      {(hud.reloadPhase !== 'IDLE' ||
        hud.boltLockedBack ||
        hud.reloadTypeLabel) && (
        <div className="fixed top-32 sm:top-34 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-30">
          <div className="bg-[#0b0e14]/94 border border-amber-500/40 rounded-xl px-4 py-2 text-center min-w-[260px]">
            <div className="text-xs font-mono font-semibold tracking-wide text-amber-400 tabular-nums">
              {hud.reloadTypeLabel ||
                (hud.boltLockedBack
                  ? 'FERROLHO ABERTO — TOQUE EM [RECARGA] OU [FERROLHO]'
                  : 'PRONTO')}
            </div>

            {hud.reloadPhase !== 'IDLE' && hud.reloadPhase !== 'MAG_CHECK' && (
              <div className="mt-1.5">
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-75"
                    style={{ width: `${Math.round(hud.reloadProgress * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                  <span
                    className={
                      hud.reloadPhase === 'MAG_OUT'
                        ? 'text-amber-300 font-semibold'
                        : ''
                    }
                  >
                    1. Ejetar
                  </span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={
                      hud.reloadPhase === 'MAG_IN'
                        ? 'text-amber-300 font-semibold'
                        : ''
                    }
                  >
                    2. Inserir Mag
                  </span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={
                      hud.reloadPhase === 'BOLT_SLAP' ||
                      hud.reloadPhase === 'CHARGING_PULL'
                        ? 'text-amber-300 font-semibold'
                        : ''
                    }
                  >
                    3. Ferrolho
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* UNIFIED COLLAPSIBLE BOTTOM CONTROL DOCK (WEAPONS, OPTICS, GPU)      */}
      {/* =================================================================== */}
      {/* Discreet bottom button when dock is collapsed */}
      {hud.dockCollapsed && (
        <button
          type="button"
          onClick={onToggleDock}
          className="fixed bottom-2 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-[#0b0e14]/90 hover:bg-[#161b26] border border-white/15 text-slate-300 text-[11px] font-mono px-3.5 py-1.5 rounded-full transition-colors whitespace-nowrap shadow-lg flex items-center gap-1.5"
        >
          <span>▴ Acessórios & Opções [H]</span>
        </button>
      )}

      {/* Unified collapsible bottom dock (without weapon selection buttons) */}
      <div
        className="fixed left-1/2 -translate-x-1/2 transition-transform duration-200 pointer-events-auto flex flex-col items-center z-30"
        style={{
          bottom: '8px',
          maxWidth: 'min(980px, 96vw)',
          display: hud.dockCollapsed ? 'none' : 'flex',
        }}
      >
        <button
          type="button"
          onClick={onToggleDock}
          className="bg-[#0b0e14]/94 hover:bg-[#161b26] border border-b-0 border-white/15 text-slate-300 text-[11px] font-mono px-3.5 py-1.5 rounded-t-lg transition-colors whitespace-nowrap shrink-0"
        >
          ▾ Ocultar [H]
        </button>

        <div className="bg-[#0b0e14]/96 border border-white/15 rounded-xl px-3 py-2 flex flex-wrap items-center justify-center gap-1.5 shadow-2xl">
          <button
            type="button"
            onClick={onInspectWeapon}
            className="px-2 py-1.5 text-xs font-medium rounded-lg bg-slate-900/80 border border-emerald-500/40 text-emerald-300 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            Inspecionar [F]
          </button>

          {/* Optic Selection */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-white/5">
            <button
              type="button"
              onClick={() => onSelectOptic('holo')}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                hud.optic === 'holo' && !hud.cantedActive
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Holo EXPS3
            </button>
            <button
              type="button"
              onClick={() => onSelectOptic('lpvo')}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                hud.optic === 'lpvo' && !hud.cantedActive
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              LPVO 1-4x
            </button>
            <button
              type="button"
              onClick={() => onSelectOptic('iron')}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                hud.optic === 'iron' && !hud.cantedActive
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Ferro
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleCanted}
            className={`px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              hud.cantedActive
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-slate-900/80 border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            45° RDS
          </button>

          <button
            type="button"
            onClick={onToggleSuppressor}
            className={`px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              hud.suppressorAttached
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-slate-900/80 border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            Supressor
          </button>

          <button
            type="button"
            onClick={onToggleLaser}
            className={`px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              hud.laserActive
                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                : 'bg-slate-900/80 border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            Laser PEQ
          </button>

          <button
            type="button"
            onClick={onCycleFireMode}
            className="px-2 py-1.5 text-xs font-medium rounded-lg bg-slate-900/80 border border-white/10 text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            Modo: {hud.fireMode}
          </button>

          <button
            type="button"
            onClick={onResupply}
            className="px-2 py-1.5 text-xs font-medium rounded-lg bg-slate-900/80 border border-white/10 text-amber-300 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            +Munição
          </button>

          {/* Drill Scenario Selector */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-white/5">
            <button
              type="button"
              onClick={() => onSelectDrill('FREE_RANGE')}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                hud.drillMode === 'FREE_RANGE'
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Estande
            </button>
            <button
              type="button"
              onClick={() => onSelectDrill('KILLHOUSE_BLITZ')}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                hud.drillMode === 'KILLHOUSE_BLITZ'
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Killhouse
            </button>
            <button
              type="button"
              onClick={() => onSelectDrill('TACTICAL_WAVE')}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                hud.drillMode === 'TACTICAL_WAVE'
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Combate IA
            </button>
          </div>

          {/* Mobile Hardware & Anti-Lag Controls */}
          <button
            type="button"
            onClick={cycleQualityPreset}
            className="px-2 py-1.5 text-xs font-mono font-medium rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition-colors whitespace-nowrap shrink-0"
            title="Alternar Preset Gráfico da GPU"
          >
            GPU: {presetLabel}
          </button>

          <button
            type="button"
            onClick={onToggleDrs}
            className={`px-2 py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              hud.dynamicResolutionEnabled
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900/80 border-white/10 text-slate-400'
            }`}
            title="Escala Dinâmica de Resolução Anti-Travamento"
          >
            DRS: {hud.dynamicResolutionEnabled ? 'AUTO' : 'FIXO'}
          </button>

          <button
            type="button"
            onClick={cycleGyroMode}
            className={`px-2 py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              hud.gyroMode !== 'OFF'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-900/80 border-white/10 text-slate-400'
            }`}
          >
            Giro: {gyroLabel}
          </button>

          {hud.gyroMode !== 'OFF' && (
            <button
              type="button"
              onClick={onRecalibrateGyro}
              className="px-2 py-1.5 text-xs font-mono font-medium rounded-lg bg-slate-900/80 border border-white/15 text-slate-200 hover:text-white transition-colors whitespace-nowrap shrink-0"
              title="Centralizar Giroscópio"
            >
              Zerar Giro
            </button>
          )}

          <button
            type="button"
            onClick={onToggleHaptics}
            className={`px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              hud.hapticsEnabled
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                : 'bg-slate-900/80 border-white/10 text-slate-400'
            }`}
          >
            Vibração: {hud.hapticsEnabled ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={onToggleTouchControls}
            className={`px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              hud.touchControlsVisible
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                : 'bg-slate-900/80 border-white/10 text-slate-400'
            }`}
          >
            Touch: {hud.touchControlsVisible ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="px-2 py-1.5 text-xs font-medium rounded-lg bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            {hud.muted ? 'Mudo' : 'Som'}
          </button>
        </div>
      </div>
    </div>
  );
};
