/**
 * Soft rotational aim assist for touch/gyro — slows look near valid enemy hitboxes
 * and applies a tiny magnetic pull. Never expands hitboxes or changes ray damage.
 */

import * as THREE from 'three';

const _toTarget = new THREE.Vector3();
const _camDir = new THREE.Vector3();

export interface AimAssistTarget {
  position: THREE.Vector3;
  isDown?: boolean;
  isAlly?: boolean;
}

/**
 * Returns a scaled look delta after assist.
 * strength 0 = off, 1 = strong casual assist.
 */
export function applyAimAssistToLookDelta(
  dx: number,
  dy: number,
  camera: THREE.Camera,
  targets: AimAssistTarget[],
  strength: number,
  isAds: boolean
): { dx: number; dy: number } {
  if (strength <= 0.01 || targets.length === 0) return { dx, dy };

  camera.getWorldPosition(_toTarget);
  const camPos = _toTarget.clone();
  camera.getWorldDirection(_camDir);

  let bestDot = 0.92; // ~cone
  let best: AimAssistTarget | null = null;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    if (!t || t.isDown || t.isAlly) continue;
    _toTarget.copy(t.position);
    _toTarget.y += 1.35;
    _toTarget.sub(camPos);
    const dist = _toTarget.length();
    if (dist < 1.5 || dist > 48) continue;
    _toTarget.normalize();
    const dot = _camDir.dot(_toTarget);
    if (dot > bestDot) {
      bestDot = dot;
      best = t;
    }
  }

  if (!best) return { dx, dy };

  const adsBoost = isAds ? 1.15 : 1.0;
  const proximity = Math.min(1, (bestDot - 0.92) / 0.08);
  const slow = 1 - proximity * 0.45 * strength * adsBoost;
  let outDx = dx * Math.max(0.35, slow);
  let outDy = dy * Math.max(0.4, slow);

  // Tiny magnetic pull toward target center in screen space (yaw/pitch proxy via world).
  _toTarget.copy(best.position);
  _toTarget.y += 1.35;
  _toTarget.sub(camPos).normalize();
  const crossY = _camDir.x * _toTarget.z - _camDir.z * _toTarget.x;
  const pitchErr = _toTarget.y - _camDir.y;
  const magnet = 0.12 * strength * proximity * adsBoost;
  outDx -= crossY * magnet * 18;
  outDy -= pitchErr * magnet * 14;

  return { dx: outDx, dy: outDy };
}
