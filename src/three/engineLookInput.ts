/**
 * Look / aim input helpers extracted from TacticalFPSEngine.
 * Keeps sensitivity math in one place for touch, mouse and gyro.
 */

import * as THREE from 'three';
import { HudState } from '../types/game';

export interface LookInputState {
  yaw: number;
  pitch: number;
  swayVel: THREE.Vector2;
}

/**
 * Applies a screen-space look delta into yaw/pitch + weapon sway velocity.
 * Returns false if the current screen should ignore look input.
 */
export function applyLookDelta(
  state: HudState,
  look: LookInputState,
  dx: number,
  dy: number
): boolean {
  if (state.screen !== 'PLAYING') return false;

  const userSens = state.isAds
    ? state.lookSensitivity * state.adsSensitivity
    : state.lookSensitivity;

  const zoomSensFactor =
    state.isAds && state.optic === 'lpvo' && !state.cantedActive
      ? 0.48 / Math.sqrt(state.lpvoZoom)
      : state.isAds
        ? 0.68
        : 1.0;

  const sens = 0.0044 * zoomSensFactor * userSens;
  look.yaw -= dx * sens;
  look.pitch = THREE.MathUtils.clamp(
    look.pitch - dy * sens,
    -Math.PI * 0.46,
    Math.PI * 0.46
  );

  look.swayVel.x -= dx * 0.00075;
  look.swayVel.y += dy * 0.00075;
  return true;
}
