import * as THREE from 'three';
import { DrillMode } from '../types/game';
import { Dust2TriangleCollider } from './dust2Collider';
import { TacticalGrenadeSystem } from './grenadeSystem';
import { ColliderBox } from './levelBuilder';
import { YardBotEntity } from './yardPropsBuilder';

export interface BotNavData {
  waypoints: THREE.Vector3[];
  wpIndex: number;
  tacticalState:
    | 'PATROL'
    | 'INVESTIGATE'
    | 'COMBAT'
    | 'RUSH_PLANTED'
    | 'PLANTING'
    | 'DEFUSING';
  lastKnownPos: THREE.Vector3 | null;
  investigateTimer: number;
  fireCooldown: number;
  grenadeCooldown: number;
  grenadesLeft: number;
  strafeTimer: number;
  strafeDir: number;
  stuckTimer: number;
  verticalVel: number;
  plantOrDefuseTimer: number;
  visionRange: number;
  fieldOfView: number;
}

export interface TacticalMapRoutes {
  vgA: THREE.Vector3[];
  vgB: THREE.Vector3[];
  vgMid: THREE.Vector3[];
  btA: THREE.Vector3[];
  btB: THREE.Vector3[];
  btMid: THREE.Vector3[];
  siteA: THREE.Vector3;
  siteB: THREE.Vector3;
}

const _losDir = new THREE.Vector3();
const _navDir = new THREE.Vector3();
const _resolvedHoriz = { x: 0, z: 0 };

/**
 * Rotas táticas calibradas com as coordenadas métricas reais dos corredores,
 * portas e Bomb Sites de cada mapa (`de_dust2`, `cs_assault` e `yard`).
 */
export function getMapRoutes(mode: DrillMode): TacticalMapRoutes {
  if (mode === 'DUST2_BOMB_5V5') {
    return {
      vgA: [new THREE.Vector3(-4, 4.8, 16), new THREE.Vector3(18, 4.8, 12), new THREE.Vector3(33.5, 4.8, -16), new THREE.Vector3(34, 4.8, -42), new THREE.Vector3(28.8, 7.2, -60.4)],
      vgB: [new THREE.Vector3(-18, 6.0, 8), new THREE.Vector3(-38, 5.6, -16), new THREE.Vector3(-41, 4.8, -42), new THREE.Vector3(-40, 4.8, -67.2)],
      vgMid: [new THREE.Vector3(-11.5, 4.8, 4), new THREE.Vector3(-11, 2.8, -22), new THREE.Vector3(2, 4.8, -36.5), new THREE.Vector3(16, 6.0, -48), new THREE.Vector3(28.8, 7.2, -60.4)],
      btA: [new THREE.Vector3(28.5, 7.2, -58.5), new THREE.Vector3(34.5, 4.8, -36), new THREE.Vector3(22, 6.0, -52), new THREE.Vector3(28.8, 7.2, -60.4)],
      btB: [new THREE.Vector3(-39.5, 4.8, -65), new THREE.Vector3(-33, 4.8, -56), new THREE.Vector3(-40.5, 4.8, -46), new THREE.Vector3(-40, 4.8, -67.2)],
      btMid: [new THREE.Vector3(-6.2, 1.6, -54), new THREE.Vector3(-11, 2.8, -36), new THREE.Vector3(2, 4.8, -36.5), new THREE.Vector3(-11, 2.8, -36)],
      siteA: new THREE.Vector3(28.8, 7.2, -60.4),
      siteB: new THREE.Vector3(-40.0, 4.8, -67.2),
    };
  }

  if (mode === 'ASSAULT_BOMB_5V5') {
    return {
      vgA: [new THREE.Vector3(-28, 0, 30), new THREE.Vector3(-27, 0, 18.5), new THREE.Vector3(-22.9, 0, 11.6)],
      vgB: [new THREE.Vector3(-16, 0, 28), new THREE.Vector3(-9.5, 0, 20), new THREE.Vector3(-8.8, 0, 12.5), new THREE.Vector3(-2.3, 0, 6.9)],
      vgMid: [new THREE.Vector3(8.5, 0, 34), new THREE.Vector3(18.2, 0, 22), new THREE.Vector3(18.2, 0, 2.5), new THREE.Vector3(14.5, 0, 0.2), new THREE.Vector3(-2.3, 0, 6.9)],
      btA: [new THREE.Vector3(-21.1, 0, 6), new THREE.Vector3(-22.9, 0, 11.6), new THREE.Vector3(-16.5, 0, 19.5), new THREE.Vector3(-22.9, 0, 11.6)],
      btB: [new THREE.Vector3(3.5, 0, 6.9), new THREE.Vector3(-2.3, 0, 6.9), new THREE.Vector3(-8.5, 0, 12.5), new THREE.Vector3(-2.3, 0, 6.9)],
      btMid: [new THREE.Vector3(17.8, 0, 5.5), new THREE.Vector3(18, 0, 18), new THREE.Vector3(-8.7, 0, 22), new THREE.Vector3(-2.3, 0, 6.9)],
      siteA: new THREE.Vector3(-22.9, 0, 11.6),
      siteB: new THREE.Vector3(-2.3, 0, 6.9),
    };
  }

  return {
    vgA: [new THREE.Vector3(6, 0, 28), new THREE.Vector3(16, 0, 18), new THREE.Vector3(22, 0, 4), new THREE.Vector3(26, 0, -7.5)],
    vgB: [new THREE.Vector3(-8, 0, 28), new THREE.Vector3(-16, 0, 16), new THREE.Vector3(-20, 0, 2), new THREE.Vector3(-21.5, 0, -6.5)],
    vgMid: [new THREE.Vector3(0, 0, 26), new THREE.Vector3(-1, 0, 10), new THREE.Vector3(2, 0, -2), new THREE.Vector3(11.5, 0, -15)],
    btA: [new THREE.Vector3(24, 0, -18), new THREE.Vector3(26, 0, -8), new THREE.Vector3(28, 0, -2), new THREE.Vector3(26, 0, -8)],
    btB: [new THREE.Vector3(-20, 0, -18), new THREE.Vector3(-21.5, 0, -6.5), new THREE.Vector3(-18, 0, 0), new THREE.Vector3(-21.5, 0, -6.5)],
    btMid: [new THREE.Vector3(2, 0, -20), new THREE.Vector3(-0.8, 0, -4), new THREE.Vector3(2, 0, 4), new THREE.Vector3(-0.8, 0, 6.2)],
    siteA: new THREE.Vector3(26, 0, -7.5),
    siteB: new THREE.Vector3(-21.5, 0, -6.5),
  };
}

export function isTargetInFieldOfView(
  botPos: THREE.Vector3,
  botYaw: number,
  targetPos: THREE.Vector3,
  fovDegrees = 90
): boolean {
  const dx = targetPos.x - botPos.x;
  const dz = targetPos.z - botPos.z;
  const distSq = dx * dx + dz * dz;
  if (distSq < 23.04) return true;
  const dist = Math.sqrt(distSq);
  if (dist < 0.001) return true;
  const dot = (Math.sin(botYaw) * dx + Math.cos(botYaw) * dz) / dist;
  return dot >= Math.cos(THREE.MathUtils.degToRad(fovDegrees * 0.5));
}

export function checkBotLineOfSight(
  from: THREE.Vector3,
  to: THREE.Vector3,
  grenadeSystem: TacticalGrenadeSystem,
  colliders?: ColliderBox[],
  activeGlbCollider?: Dust2TriangleCollider | null
): boolean {
  if (grenadeSystem.isLineOfSightBlockedBySmoke(from, to)) return false;

  _losDir.subVectors(to, from);
  const dist = _losDir.length();
  if (dist < 0.001) return true;
  _losDir.multiplyScalar(1 / dist);

  if (activeGlbCollider && activeGlbCollider.ready) {
    const hitDist = activeGlbCollider.raycastDistance(from, _losDir, Math.max(0.2, dist - 0.35));
    if (hitDist !== null) return false;
  }

  if (!colliders || colliders.length === 0) return true;

  const invX = 1 / (to.x - from.x || 0.000001);
  const invY = 1 / (to.y - from.y || 0.000001);
  const invZ = 1 / (to.z - from.z || 0.000001);

  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (c.maxY - c.minY < 0.8) continue;
    const t1 = (c.minX - from.x) * invX;
    const t2 = (c.maxX - from.x) * invX;
    const t3 = (c.minY - from.y) * invY;
    const t4 = (c.maxY - from.y) * invY;
    const t5 = (c.minZ - from.z) * invZ;
    const t6 = (c.maxZ - from.z) * invZ;
    const tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
    const tmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));
    if (tmax >= tmin && tmin >= 0 && tmin <= 1) return false;
  }
  return true;
}

export function isBotCollidingHorizontallyWithBoxes(
  x: number,
  z: number,
  yBottom: number,
  radius: number,
  colliders?: ColliderBox[]
): boolean {
  if (!colliders || colliders.length === 0) return false;
  const botTop = yBottom + 1.7;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (botTop <= c.minY || yBottom >= c.maxY - 0.45) continue;
    if (x + radius > c.minX && x - radius < c.maxX && z + radius > c.minZ && z - radius < c.maxZ) {
      return true;
    }
  }
  return false;
}

export function moveBotWithPhysics(
  bot: YardBotEntity,
  nav: BotNavData,
  moveTarget: THREE.Vector3,
  moveSpeed: number,
  dt: number,
  colliders?: ColliderBox[],
  activeGlbCollider?: Dust2TriangleCollider | null
): void {
  const bPos = bot.root.position;
  const botRadius = 0.36;

  if (moveSpeed > 0.05) {
    _navDir.subVectors(moveTarget, bPos);
    _navDir.y = 0;
    const dist = _navDir.length();
    if (dist > 0.1) {
      _navDir.normalize();
      const step = Math.min(dist, moveSpeed * dt);
      const prevX = bPos.x;
      const prevZ = bPos.z;
      const candX = prevX + _navDir.x * step;
      const candZ = prevZ + _navDir.z * step;

      if (activeGlbCollider && activeGlbCollider.ready) {
        activeGlbCollider.resolveHorizontal(candX, candZ, bPos.y, 1.72, botRadius, _resolvedHoriz);
        bPos.x = _resolvedHoriz.x;
        bPos.z = _resolvedHoriz.z;
      } else {
        if (!isBotCollidingHorizontallyWithBoxes(candX, prevZ, bPos.y, botRadius, colliders)) bPos.x = candX;
        if (!isBotCollidingHorizontallyWithBoxes(bPos.x, candZ, bPos.y, botRadius, colliders)) bPos.z = candZ;
      }

      if (Math.hypot(bPos.x - prevX, bPos.z - prevZ) < step * 0.35) {
        nav.stuckTimer += dt;
        if (nav.stuckTimer > 0.45) {
          nav.stuckTimer = 0;
          nav.strafeDir *= -1;
          if (nav.waypoints.length > 0) nav.wpIndex = (nav.wpIndex + 1) % nav.waypoints.length;
        }
      } else {
        nav.stuckTimer = Math.max(0, nav.stuckTimer - dt * 2);
      }

      const lookAngle = Math.atan2(_navDir.x, _navDir.z);
      bot.root.rotation.y = THREE.MathUtils.damp(bot.root.rotation.y, lookAngle, 8.5, dt);
    }
  }

  const floorY =
    activeGlbCollider && activeGlbCollider.ready
      ? activeGlbCollider.getGroundHeight(bPos.x, bPos.y + 0.35, bPos.z)
      : 0;

  if (bPos.y <= floorY + 0.52 && bPos.y >= floorY - 0.6) {
    bPos.y = THREE.MathUtils.damp(bPos.y, floorY, 18, dt);
    nav.verticalVel = 0;
  } else if (bPos.y > floorY) {
    nav.verticalVel = Math.max(-18.0, nav.verticalVel - 15.5 * dt);
    bPos.y = Math.max(floorY, bPos.y + nav.verticalVel * dt);
    if (bPos.y <= floorY + 0.02) {
      bPos.y = floorY;
      nav.verticalVel = 0;
    }
  } else {
    bPos.y = floorY;
    nav.verticalVel = 0;
  }
}
