/**
 * Intermittent shadow-map updates for mobile directional lights.
 * Full soft/PCF shadows every frame are a common FPS killer on mid-range GPUs.
 */

import * as THREE from 'three';

export interface ShadowBudgetState {
  accumSec: number;
  lastPlayerX: number;
  lastPlayerZ: number;
  forceNext: boolean;
}

export function createShadowBudgetState(): ShadowBudgetState {
  return {
    accumSec: 0,
    lastPlayerX: Number.NaN,
    lastPlayerZ: Number.NaN,
    forceNext: true,
  };
}

/**
 * Call once after enabling shadows / resizing shadow map.
 */
export function configureIntermittentShadows(renderer: THREE.WebGLRenderer): void {
  if (!renderer.shadowMap.enabled) return;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
}

/**
 * Updates shadow maps only when the player moved enough or the interval elapsed.
 * Keeps visuals stable while cutting GPU cost on mobile.
 */
export function tickShadowBudget(
  renderer: THREE.WebGLRenderer,
  state: ShadowBudgetState,
  playerPos: { x: number; z: number },
  dt: number,
  opts?: {
    /** Seconds between forced refreshes while mostly still. */
    intervalSec?: number;
    /** Planar move (meters) that forces an immediate refresh. */
    moveThreshold?: number;
  }
): void {
  if (!renderer.shadowMap.enabled) return;

  const intervalSec = opts?.intervalSec ?? 0.12;
  const moveThreshold = opts?.moveThreshold ?? 0.55;
  const moveThresholdSq = moveThreshold * moveThreshold;

  state.accumSec += dt;

  const moved =
    Number.isFinite(state.lastPlayerX) &&
    (() => {
      const dx = playerPos.x - state.lastPlayerX;
      const dz = playerPos.z - state.lastPlayerZ;
      return dx * dx + dz * dz >= moveThresholdSq;
    })();

  if (state.forceNext || moved || state.accumSec >= intervalSec) {
    renderer.shadowMap.needsUpdate = true;
    state.accumSec = 0;
    state.forceNext = false;
    state.lastPlayerX = playerPos.x;
    state.lastPlayerZ = playerPos.z;
  }
}

export function requestShadowRefresh(state: ShadowBudgetState): void {
  state.forceNext = true;
}

/**
 * Tightens the directional shadow camera around the player (smaller frustum → better
 * texel density and cheaper fills). Safe for a single key sun light.
 */
export function followKeyLightShadowFrustum(
  keyLight: THREE.DirectionalLight,
  playerPos: THREE.Vector3,
  opts?: { height?: number; radius?: number; followLerp?: number }
): void {
  if (!keyLight.castShadow) return;
  const height = opts?.height ?? 36;
  const radius = opts?.radius ?? 38;
  const cam = keyLight.shadow.camera;

  keyLight.target.position.set(playerPos.x, playerPos.y, playerPos.z);
  keyLight.target.updateMatrixWorld();

  const desired = _lightPos.set(
    playerPos.x + 18,
    playerPos.y + height,
    playerPos.z + 14
  );
  keyLight.position.lerp(desired, opts?.followLerp ?? 1);

  cam.left = -radius;
  cam.right = radius;
  cam.top = radius;
  cam.bottom = -radius;
  cam.near = 1;
  cam.far = height + radius + 40;
  cam.updateProjectionMatrix();
}

const _lightPos = new THREE.Vector3();
