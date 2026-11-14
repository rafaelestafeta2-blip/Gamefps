/**
 * hudBridge.ts
 * Throttled / dirty-checked HUD emission to React.
 * Avoids spreading a fresh object every call when nothing meaningful changed.
 */

import { HudState } from '../types/game';

/** Minimal target shape used for radar caching (avoids importing heavy bot types). */
export interface RadarTargetSource {
  id: string;
  sector: 'RANGE' | 'KILLHOUSE';
  root: { position: { x: number; z: number } };
  isDown: boolean;
  isAlly?: boolean;
}

export interface HudRadarCacheEntry {
  id: string;
  sector: 'RANGE' | 'KILLHOUSE';
  x: number;
  z: number;
  isDown: boolean;
  isAlly?: boolean;
}

export interface HudEmitContext {
  state: HudState;
  primaryWeapon: HudState['activeWeapon'];
  playerPos: { x: number; y: number; z: number };
  yaw: number;
  targets: RadarTargetSource[];
  cachedRadarTargets: HudRadarCacheEntry[];
  /** Last payload fingerprint (mutated by bridge). */
  lastFingerprint: { value: string };
  /** Force next emit even if fingerprint matches (e.g. modal open). */
  forceNext: { value: boolean };
}

function syncRadarCache(
  targets: RadarTargetSource[],
  cached: HudRadarCacheEntry[]
): HudRadarCacheEntry[] {
  if (cached.length !== targets.length) {
    return targets.map((t) => ({
      id: t.id,
      sector: t.sector,
      x: t.root.position.x,
      z: t.root.position.z,
      isDown: t.isDown,
      isAlly: t.isAlly,
    }));
  }
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const c = cached[i];
    c.x = t.root.position.x;
    c.z = t.root.position.z;
    c.isDown = t.isDown;
    c.isAlly = t.isAlly;
  }
  return cached;
}

/**
 * Builds a compact fingerprint of HUD fields that drive React UI.
 * Position quantized so micro-moves don't spam React during play.
 */
export function buildHudFingerprint(state: HudState, yaw: number): string {
  const bomb = state.yardBomb;
  return [
    state.screen,
    state.activeWeapon,
    state.currentMagRounds,
    state.magCapacity,
    state.chambered,
    state.health | 0,
    state.armor | 0,
    state.supportCharges,
    Math.round(state.reviveChargeProgress * 10),
    state.reviveMarkers?.length ?? 0,
    state.supportPrompt || '-',
    state.stamina | 0,
    state.isAds ? 1 : 0,
    Math.round(state.adsAlpha * 20),
    state.stance,
    state.leanDirection,
    state.reloadPhase,
    Math.round(state.reloadProgress * 10),
    state.fireMode,
    state.optic,
    state.laserActive ? 1 : 0,
    Math.round(state.hitMarkerAlpha * 12),
    Math.round(state.damageFlashAlpha * 12),
    state.liveFps,
    state.renderScalePercent,
    state.score,
    state.hits,
    state.headshots,
    state.courseTimerSec | 0,
    state.fragGrenades,
    state.smokeGrenades,
    state.equippedGrenade || '-',
    state.isThrowingGrenade ? 1 : 0,
    state.killfeed.length,
    state.rankLevel,
    state.playerXp,
    state.rankUpNotification ? 1 : 0,
    state.pointerLocked ? 1 : 0,
    state.touchControlsVisible ? 1 : 0,
    state.dockCollapsed ? 1 : 0,
    state.nearWallStand ? 1 : 0,
    state.focusedWallWeapon || '-',
    Math.round(state.playerPos.x * 4),
    Math.round(state.playerPos.z * 4),
    Math.round(yaw * 8),
    bomb?.bombStatus || '-',
    bomb ? bomb.roundTimerSec | 0 : -1,
    bomb?.alliesAlive ?? -1,
    bomb?.enemiesAlive ?? -1,
    bomb?.roundState || '-',
    bomb?.plantProgress != null ? Math.round(bomb.plantProgress * 10) : 0,
  ].join('|');
}

/**
 * Syncs engine state into a HUD payload and returns it only when React must update.
 * Returns null when the fingerprint is unchanged (skip setState).
 */
export function emitHudIfChanged(
  ctx: HudEmitContext,
  onHudUpdate: (state: HudState) => void
): boolean {
  ctx.cachedRadarTargets = syncRadarCache(ctx.targets, ctx.cachedRadarTargets);

  ctx.state.playerPos.x = ctx.playerPos.x;
  ctx.state.playerPos.y = ctx.playerPos.y;
  ctx.state.playerPos.z = ctx.playerPos.z;
  ctx.state.playerYaw = ctx.yaw;
  ctx.state.primaryWeapon = ctx.primaryWeapon;
  ctx.state.secondaryWeapon = 'P50_PISTOL';
  ctx.state.radarTargets = ctx.cachedRadarTargets;

  const fingerprint = buildHudFingerprint(ctx.state, ctx.yaw);
  if (!ctx.forceNext.value && fingerprint === ctx.lastFingerprint.value) {
    return false;
  }

  ctx.forceNext.value = false;
  ctx.lastFingerprint.value = fingerprint;

  // Shallow clone so React sees a new reference when we do emit;
  // nested mutable objects (radarTargets, playerPos) stay shared intentionally.
  onHudUpdate({
    ...ctx.state,
    primaryWeapon: ctx.primaryWeapon,
    secondaryWeapon: 'P50_PISTOL',
    playerPos: {
      x: ctx.state.playerPos.x,
      y: ctx.state.playerPos.y,
      z: ctx.state.playerPos.z,
    },
    playerYaw: ctx.yaw,
    radarTargets: ctx.cachedRadarTargets,
  });
  return true;
}
