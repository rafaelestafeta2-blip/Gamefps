/**
 * Combat raycast helpers — prefer spatial triangle collider for GLB arenas
 * instead of Three.js intersecting every environment mesh.
 */

import * as THREE from 'three';
import { Dust2TriangleCollider } from './dust2Collider';

export interface CombatRayHit {
  distance: number;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  object: THREE.Object3D | null;
  isEnvironment: boolean;
}

const _combatOnly: THREE.Object3D[] = [];
const _envNormal = new THREE.Vector3();
const _tmpHitPoint = new THREE.Vector3();

/**
 * Fills reusable list with combat/interactable meshes only (bots, wall weapons).
 * Avoids allocating a new array every shot.
 */
export function collectCombatRayTargets(
  shootableMeshes: THREE.Object3D[],
  out: THREE.Object3D[] = _combatOnly
): THREE.Object3D[] {
  out.length = 0;
  for (let i = 0; i < shootableMeshes.length; i++) {
    const m = shootableMeshes[i];
    const ud = m.userData;
    if (ud?.targetId || ud?.wallWeaponId || ud?.hitZone) {
      out.push(m);
    }
  }
  return out;
}

/**
 * Shot raycast: combat meshes via Three.js + optional GLB triangle collider for world.
 * Returns the closest hit. `outHit` is mutated and returned when something is hit.
 */
export function raycastCombatShot(
  raycaster: THREE.Raycaster,
  shootableMeshes: THREE.Object3D[],
  collider: Dust2TriangleCollider | null | undefined,
  outHit: CombatRayHit
): CombatRayHit | null {
  let bestDist = Infinity;
  let best: CombatRayHit | null = null;

  if (collider?.ready) {
    // GLB arenas: tiny combat list + spatial triangle collider (not every map mesh).
    const combatTargets = collectCombatRayTargets(shootableMeshes);
    const combatHits = raycaster.intersectObjects(combatTargets, false);
    if (combatHits.length > 0) {
      const h = combatHits[0];
      bestDist = h.distance;
      outHit.distance = h.distance;
      outHit.point.copy(h.point);
      if (h.face && h.object) {
        outHit.normal
          .copy(h.face.normal)
          .transformDirection(h.object.matrixWorld)
          .normalize();
      } else {
        outHit.normal.set(0, 1, 0);
      }
      outHit.object = h.object;
      outHit.isEnvironment = false;
      best = outHit;
    }

    const origin = raycaster.ray.origin;
    const dir = raycaster.ray.direction;
    const maxDist = raycaster.far;
    const detailed = collider.raycastDetailed(
      origin,
      dir,
      maxDist,
      _tmpHitPoint,
      _envNormal
    );
    if (detailed && detailed.distance < bestDist) {
      outHit.distance = detailed.distance;
      outHit.point.copy(_tmpHitPoint);
      outHit.normal.copy(_envNormal);
      outHit.object = null;
      outHit.isEnvironment = true;
      best = outHit;
    }
    return best;
  }

  // Procedural arenas: single pass over the existing shootable list.
  const allHits = raycaster.intersectObjects(shootableMeshes, false);
  if (allHits.length > 0) {
    const h = allHits[0];
    outHit.distance = h.distance;
    outHit.point.copy(h.point);
    if (h.face && h.object) {
      outHit.normal
        .copy(h.face.normal)
        .transformDirection(h.object.matrixWorld)
        .normalize();
    } else {
      outHit.normal.set(0, 1, 0);
    }
    outHit.object = h.object;
    outHit.isEnvironment = Boolean(h.object.userData?.isEnvironment);
    return outHit;
  }

  return null;
}

/** Adaptive aim/laser ray interval: faster when laser/ADS, slower when hip. */
export function getAimRaycastIntervalSec(opts: {
  laserActive: boolean;
  isAds: boolean;
}): number {
  if (opts.laserActive) return 0.033;
  if (opts.isAds) return 0.04;
  return 0.066;
}
