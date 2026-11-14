/**
 * Dynamic Resolution Scaling governor — extracted from fpsEngine for clarity/tests.
 * Adjusts WebGL pixel ratio from rolling FPS averages without GC pressure.
 */

import * as THREE from 'three';
import { QualityPreset } from '../types/game';

export interface DrsRuntimeState {
  accumTime: number;
  frameCount: number;
  lowFpsStreak: number;
  highFpsStreak: number;
  cooldownSec: number;
  currentRenderScale: number;
}

export interface DrsHudMirror {
  liveFps: number;
  renderScalePercent: number;
  dynamicResolutionEnabled: boolean;
  qualityPreset: QualityPreset;
}

export function createDrsRuntimeState(initialScale: number): DrsRuntimeState {
  return {
    accumTime: 0,
    frameCount: 0,
    lowFpsStreak: 0,
    highFpsStreak: 0,
    cooldownSec: 0,
    currentRenderScale: initialScale,
  };
}

export function updateDynamicResolutionGovernor(
  drs: DrsRuntimeState,
  hud: DrsHudMirror,
  renderer: THREE.WebGLRenderer,
  rawDt: number,
  opts: { isSoftwareGl: boolean }
): void {
  if (drs.cooldownSec > 0) {
    drs.cooldownSec = Math.max(0, drs.cooldownSec - rawDt);
  }

  drs.accumTime += rawDt;
  drs.frameCount += 1;

  if (drs.accumTime < 0.48) return;

  const avgFps = drs.frameCount / drs.accumTime;
  hud.liveFps = Math.min(120, Math.round(avgFps));
  drs.accumTime = 0;
  drs.frameCount = 0;

  if (opts.isSoftwareGl || !hud.dynamicResolutionEnabled) return;

  if (drs.cooldownSec > 0) {
    drs.lowFpsStreak = 0;
    drs.highFpsStreak = 0;
    return;
  }

  const maxDpr = Math.min(
    typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
    2.0
  );
  const targetCeiling =
    hud.qualityPreset === 'COMPETITIVE_120'
      ? Math.min(maxDpr, 1.05)
      : hud.qualityPreset === 'BALANCED_60'
        ? Math.min(maxDpr, 1.4)
        : maxDpr;

  if (avgFps < 48) {
    drs.lowFpsStreak += 1;
    drs.highFpsStreak = 0;
  } else if (avgFps >= 58) {
    drs.highFpsStreak += 1;
    drs.lowFpsStreak = 0;
  } else {
    drs.lowFpsStreak = 0;
    drs.highFpsStreak = 0;
  }

  let nextScale = drs.currentRenderScale;
  if (drs.lowFpsStreak >= 2 && drs.currentRenderScale > 0.65) {
    nextScale = Math.max(0.65, drs.currentRenderScale - 0.08);
  } else if (drs.highFpsStreak >= 6 && drs.currentRenderScale < targetCeiling) {
    nextScale = Math.min(targetCeiling, drs.currentRenderScale + 0.08);
  }

  if (Math.abs(nextScale - drs.currentRenderScale) >= 0.01) {
    drs.currentRenderScale = nextScale;
    renderer.setPixelRatio(drs.currentRenderScale);
    hud.renderScalePercent = Math.round((drs.currentRenderScale / maxDpr) * 100);
    drs.lowFpsStreak = 0;
    drs.highFpsStreak = 0;
    drs.cooldownSec = 4.0;
  }
}
