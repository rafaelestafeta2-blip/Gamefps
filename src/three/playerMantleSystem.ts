/**
 * Code-only mantle / vault (COD-style ledge climb).
 * No dedicated mantle GLB anim — uses physics lerp + camera punch.
 * Works with Dust2/Assault triangle ground height and Yard AABB colliders.
 */

import * as THREE from 'three';
import { soundEngine } from '../audio/soundEngine';
import { Dust2TriangleCollider } from './dust2Collider';
import { ColliderBox } from './levelBuilder';
import { getMantleClip } from './mixamoAnimPackLoader';

export interface MantleState {
  active: boolean;
  t: number;
  duration: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
}

const _fwd = new THREE.Vector3();
const _probe = new THREE.Vector3();

export function createMantleState(): MantleState {
  return {
    active: false,
    t: 0,
    duration: 0.42,
    start: new THREE.Vector3(),
    end: new THREE.Vector3(),
  };
}

function probeLedgeHeight(
  x: number,
  y: number,
  z: number,
  glb: Dust2TriangleCollider | null,
  colliders: ColliderBox[] | undefined,
  radius: number
): number {
  if (glb && glb.ready) {
    return glb.getGroundHeight(x, y + 1.6, z);
  }
  let best = -Infinity;
  if (!colliders) return best;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (x + radius > c.minX && x - radius < c.maxX && z + radius > c.minZ && z - radius < c.maxZ) {
      if (c.maxY > best && c.maxY <= y + 1.35) best = c.maxY;
    }
  }
  return best;
}

/**
 * Try to start a mantle when the player is jammed into a waist/chest ledge
 * while holding forward (and ideally jumping). Returns true if mantle began.
 */
export function tryStartMantle(engine: any): boolean {
  const mantle = engine.mantle as MantleState | undefined;
  if (!mantle || mantle.active) return false;
  if (engine.slideTimer > 0) return false;
  if (engine.state.stance === 'PRONE') return false;

  const forwardInput =
    (engine.keysHeld.has('KeyW') || engine.keysHeld.has('ArrowUp') ? 1 : 0) +
    (engine.touchMoveY > 0.2 ? engine.touchMoveY : 0);
  if (forwardInput < 0.35) return false;

  // Want jump intent or already airborne into the wall.
  const jumpIntent =
    engine.jumpBufferTimer > 0 ||
    engine.keysHeld.has('Space') ||
    (!engine.isGrounded && engine.playerVel.y > -1.5);
  if (!jumpIntent && engine.isGrounded) {
    // Allow grounded mantle only when pressed against wall (blocked last frame).
    if (!engine.mantleWallBlocked) return false;
  }

  _fwd.set(-Math.sin(engine.yaw), 0, -Math.cos(engine.yaw)).normalize();
  const probeDist = 0.62;
  _probe.set(
    engine.playerPos.x + _fwd.x * probeDist,
    engine.playerPos.y,
    engine.playerPos.z + _fwd.z * probeDist
  );

  const isDust2 = engine.state.drillMode === 'DUST2_BOMB_5V5';
  const isAssault = engine.state.drillMode === 'ASSAULT_BOMB_5V5';
  const glb = isDust2
    ? engine.dust2LevelData.collider
    : isAssault
      ? engine.assaultLevelData.collider
      : null;
  const colliders: ColliderBox[] | undefined =
    engine.colliders ||
    (engine.state.drillMode === 'YARD_BOMB_5V5'
      ? engine.yardLevelData?.colliders
      : engine.state.drillMode === 'FREE_RANGE'
        ? engine.standerTiroLevelData?.colliders
        : engine.facilityLevelData?.colliders);

  const radius = 0.28;
  const ledgeY = probeLedgeHeight(
    _probe.x,
    engine.playerPos.y,
    _probe.z,
    glb,
    colliders,
    radius
  );
  if (!Number.isFinite(ledgeY) || ledgeY === -Infinity) return false;

  const rise = ledgeY - engine.playerPos.y;
  // Mantle window: crate / window sill / short wall (not full building).
  if (rise < 0.42 || rise > 1.22) return false;

  // Must be blocked at current height in front (otherwise just walk).
  let blocked = false;
  if (glb && glb.ready) {
    const out = { x: 0, z: 0 };
    glb.resolveHorizontal(
      engine.playerPos.x + _fwd.x * 0.4,
      engine.playerPos.z + _fwd.z * 0.4,
      engine.playerPos.y,
      1.5,
      radius,
      out
    );
    const moved =
      Math.hypot(out.x - (engine.playerPos.x + _fwd.x * 0.4), out.z - (engine.playerPos.z + _fwd.z * 0.4)) <
      0.08;
    blocked = moved || engine.mantleWallBlocked;
  } else {
    blocked =
      engine.mantleWallBlocked ||
      engine.checkHorizontalCollision(
        engine.playerPos.x + _fwd.x * 0.35,
        engine.playerPos.z + _fwd.z * 0.35,
        engine.playerPos.y,
        radius
      );
  }
  if (!blocked && engine.isGrounded) return false;

  // Landing pad slightly past the ledge lip.
  const endX = engine.playerPos.x + _fwd.x * 0.85;
  const endZ = engine.playerPos.z + _fwd.z * 0.85;
  const endGround = probeLedgeHeight(endX, ledgeY + 0.4, endZ, glb, colliders, radius);
  const landY = Number.isFinite(endGround) && endGround > ledgeY - 0.15 ? endGround : ledgeY;

  mantle.active = true;
  mantle.t = 0;
  mantle.duration = 0.38 + Math.min(0.18, rise * 0.12);
  mantle.start.copy(engine.playerPos);
  mantle.end.set(endX, landY, endZ);

  engine.playerVel.set(0, 0, 0);
  engine.slideTimer = 0;
  engine.jumpBufferTimer = 0;
  engine.isGrounded = false;
  engine.cameraFovPunch = Math.min((engine.cameraFovPunch || 0) + 3.2, 8);
  engine.landingDipVel = Math.min(engine.landingDipVel || 0, -0.08);
  soundEngine.playPlayerJump();
  // Prefer Mixamo braced-hang clip timing when Animaçao pack is loaded.
  const mantleClip = getMantleClip();
  if (mantleClip?.duration) {
    mantle.duration = THREE.MathUtils.clamp(mantleClip.duration * 0.42, 0.38, 0.85);
  }
  return true;
}

/** Advance active mantle; returns true while mantle owns movement this frame. */
export function updateMantle(engine: any, dt: number): boolean {
  const mantle = engine.mantle as MantleState | undefined;
  if (!mantle || !mantle.active) return false;

  mantle.t += dt;
  const u = Math.min(1, mantle.t / mantle.duration);
  // Ease: pull up fast, settle forward.
  const ease = u < 0.55 ? u / 0.55 : 1;
  const upBlend = Math.sin(Math.min(1, u / 0.55) * Math.PI * 0.5);
  const midY = mantle.start.y + (mantle.end.y - mantle.start.y) * upBlend + Math.sin(upBlend * Math.PI) * 0.12;

  engine.playerPos.x = THREE.MathUtils.lerp(mantle.start.x, mantle.end.x, ease);
  engine.playerPos.z = THREE.MathUtils.lerp(mantle.start.z, mantle.end.z, ease);
  engine.playerPos.y = midY;
  engine.playerVel.set(0, 0, 0);
  engine.touchFireHeld = false;

  if (u >= 1) {
    mantle.active = false;
    engine.playerPos.copy(mantle.end);
    engine.isGrounded = true;
    engine.playerVel.x = -Math.sin(engine.yaw) * 2.4;
    engine.playerVel.z = -Math.cos(engine.yaw) * 2.4;
    engine.landingDipVel = -0.1;
    engine.cameraFovPunch = Math.min((engine.cameraFovPunch || 0) + 1.5, 7);
    soundEngine.playFootstep(true, false);
  }
  return true;
}
