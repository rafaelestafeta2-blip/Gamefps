import * as THREE from 'three';
import { DrillMode } from '../types/game';
import { Dust2TriangleCollider } from './dust2Collider';
import { TacticalGrenadeSystem } from './grenadeSystem';
import { ColliderBox } from './levelBuilder';
import { YardBotEntity } from './yardPropsBuilder';

export interface BotNavData {
  waypoints: THREE.Vector3[];
  wpIndex: number;
  patrolDir: 1 | -1;
  tacticalState:
    | 'PATROL'
    | 'FOLLOW_PLAYER'
    | 'INVESTIGATE'
    | 'COMBAT'
    | 'COVER'
    | 'PEEK'
    | 'RUSH_PLANTED'
    | 'DEFEND_PLANTED'
    | 'PLANTING'
    | 'DEFUSING';
  lockedTargetId: string | null;
  chaseTimer: number;
  lastKnownPos: THREE.Vector3 | null;
  investigateTimer: number;
  fireCooldown: number;
  burstShotsLeft: number;
  burstShotTimer: number;
  grenadeCooldown: number;
  grenadesLeft: number;
  coverTimer: number;
  peekTimer: number;
  coverSide: 1 | -1;
  strafeTimer: number;
  strafeDir: number;
  stuckTimer: number;
  avoidAngle: number;
  avoidTimer: number;
  verticalVel: number;
  /** Cooldown before another hop / step-up jump. */
  jumpCooldown: number;
  plantOrDefuseTimer: number;
  lastKeypadDigit: number;
  visionRange: number;
  fieldOfView: number;
  /** Continuous LOS time on current target before bots may fire (fairness). */
  acquireTimer: number;
  /** Seconds left to hold a flank / reposition goal. */
  flankTimer: number;
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
const _steerDir = new THREE.Vector3();
const _resolvedHoriz = { x: 0, z: 0 };
const STEER_TEST_ANGLES = [0.5, -0.5, 1.0, -1.0, 1.55, -1.55, 2.15, -2.15, 2.65, -2.65];

export function dampAngleShortest(
  current: number,
  target: number,
  lambda: number,
  dt: number
): number {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * (1 - Math.exp(-lambda * dt));
}

/**
 * Rotas táticas CS a partir da Base de Spawn de cada time até os Bomb Sites A, B e Meio.
 */
export function getMapRoutes(mode: DrillMode): TacticalMapRoutes {
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

  if (mode === 'DUST2_BOMB_5V5') {
    return {
      vgA: [v(-4, 4.8, 16), v(18, 4.8, 12), v(33.5, 4.8, -16), v(34, 4.8, -42), v(28.8, 7.2, -60.4)],
      vgB: [v(-18, 6.0, 10), v(-38, 5.6, -16), v(-41, 4.8, -42), v(-40, 4.8, -67.2)],
      vgMid: [v(-11.5, 4.8, 6), v(-11, 2.8, -22), v(2, 4.8, -36.5), v(16, 6.0, -48), v(28.8, 7.2, -60.4)],
      btA: [v(6, 2.4, -54), v(22, 6.0, -56), v(28.5, 7.2, -58.5), v(34.5, 4.8, -36), v(28.8, 7.2, -60.4)],
      btB: [v(-16, 3.2, -56), v(-30, 4.8, -58), v(-39.5, 4.8, -65), v(-40.5, 4.8, -42), v(-40, 4.8, -67.2)],
      btMid: [v(-8, 2.4, -46), v(-11, 2.8, -36), v(2, 4.8, -36.5), v(22, 6.0, -52), v(-30, 4.8, -58)],
      siteA: v(28.8, 7.2, -60.4),
      siteB: v(-40.0, 4.8, -67.2),
    };
  }

  if (mode === 'ASSAULT_BOMB_5V5') {
    return {
      vgA: [v(-26.5, 0, 29), v(-26.5, 0, 19), v(-22.9, 0, 11.6)],
      vgB: [v(-18, 0, 31), v(-10, 0, 21), v(-8.8, 0, 12.5), v(-2.3, 0, 6.9)],
      vgMid: [v(-8, 0, 34), v(12, 0, 32), v(18, 0, 16), v(8, 0, 6.9), v(-2.3, 0, 6.9)],
      btA: [v(-11, 0, 6.5), v(-18, 0, 9.5), v(-22.9, 0, 11.6), v(-25, 0, 19), v(-22.9, 0, 11.6)],
      btB: [v(-2.3, 0, 6.9), v(-8.8, 0, 12.5), v(-9.5, 0, 20), v(-2.3, 0, 6.9)],
      btMid: [v(8, 0, 6.2), v(17.8, 0, 10), v(17.8, 0, 22), v(-9, 0, 21), v(-22.9, 0, 11.6)],
      siteA: v(-22.9, 0, 11.6),
      siteB: v(-2.3, 0, 6.9),
    };
  }

  return {
    vgA: [v(0, 0, 24), v(12, 0, 16), v(21, 0, 4), v(26, 0, -7.5)],
    vgB: [v(-1, 0, 24), v(-14, 0, 15), v(-20, 0, 2), v(-21.5, 0, -6.5)],
    vgMid: [v(0, 0, 24), v(-0.5, 0, 11), v(0, 0, -4), v(16, 0, -8), v(26, 0, -7.5)],
    btA: [v(12, 0, -21), v(23, 0, -16), v(26, 0, -7.5), v(21, 0, 5), v(26, 0, -7.5)],
    btB: [v(-12, 0, -21), v(-20, 0, -15), v(-21.5, 0, -6.5), v(-19, 0, 6), v(-21.5, 0, -6.5)],
    btMid: [v(0, 0, -18), v(-0.5, 0, -5), v(0, 0, 10), v(16, 0, 8), v(26, 0, -7.5)],
    siteA: v(26, 0, -7.5),
    siteB: v(-21.5, 0, -6.5),
  };
}

/**
 * Guia o bot até o Bomb Site plantado (A ou B) usando o próximo waypoint de corredor
 * quando ainda estiver distante, evitando bater em paredes no caminho.
 */
export function getWaypointTowardPlantedSite(
  botPos: THREE.Vector3,
  plantedSite: 'A' | 'B',
  mode: DrillMode,
  isAlly: boolean
): THREE.Vector3 {
  const routes = getMapRoutes(mode);
  const sitePos = plantedSite === 'A' ? routes.siteA : routes.siteB;
  const distToSite = Math.hypot(botPos.x - sitePos.x, botPos.z - sitePos.z);
  if (distToSite <= 11.5) return sitePos;

  const lane =
    plantedSite === 'A'
      ? isAlly
        ? routes.vgA
        : routes.btA
      : isAlly
        ? routes.vgB
        : routes.btB;

  let bestWp = sitePos;
  let bestScore = Infinity;
  for (let i = 0; i < lane.length; i++) {
    const wp = lane[i];
    const wpDistToSite = Math.hypot(wp.x - sitePos.x, wp.z - sitePos.z);
    if (wpDistToSite >= distToSite - 2.0) continue;
    const botDistToWp = Math.hypot(botPos.x - wp.x, botPos.z - wp.z);
    const score = botDistToWp + wpDistToSite * 0.45;
    if (score < bestScore) {
      bestScore = score;
      bestWp = wp;
    }
  }
  return bestWp;
}

export function isTargetInFieldOfView(
  botPos: THREE.Vector3,
  botYaw: number,
  targetPos: THREE.Vector3,
  fovDegrees = 135
): boolean {
  const dx = targetPos.x - botPos.x;
  const dz = targetPos.z - botPos.z;
  const distSq = dx * dx + dz * dz;
  if (distSq < 72.25 || fovDegrees >= 350) return true;
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

  // Dust2/Assault: until triangle collider is ready, refuse long "wallbang" sightlines.
  if (activeGlbCollider && !activeGlbCollider.ready) {
    return dist < 5.5;
  }

  if (activeGlbCollider && activeGlbCollider.ready) {
    const hitDist = activeGlbCollider.raycastDistance(from, _losDir, Math.max(0.2, dist - 0.35));
    if (hitDist !== null) return false;
  }

  if (!colliders || colliders.length === 0) {
    // No box colliders and no GLB hit → only trust short open-air LOS (Yard props missing).
    if (!activeGlbCollider) return dist < 8.0;
    return true;
  }

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

function tryStepDirection(
  prevX: number,
  prevZ: number,
  yBottom: number,
  dirX: number,
  dirZ: number,
  step: number,
  botRadius: number,
  colliders?: ColliderBox[],
  activeGlbCollider?: Dust2TriangleCollider | null
): { x: number; z: number; movedDist: number } {
  const candX = prevX + dirX * step;
  const candZ = prevZ + dirZ * step;
  let outX = prevX;
  let outZ = prevZ;

  if (activeGlbCollider && activeGlbCollider.ready) {
    activeGlbCollider.resolveHorizontal(candX, candZ, yBottom, 1.72, botRadius, _resolvedHoriz);
    outX = _resolvedHoriz.x;
    outZ = _resolvedHoriz.z;
  } else {
    if (!isBotCollidingHorizontallyWithBoxes(candX, prevZ, yBottom, botRadius, colliders)) outX = candX;
    if (!isBotCollidingHorizontallyWithBoxes(outX, candZ, yBottom, botRadius, colliders)) outZ = candZ;
  }

  return { x: outX, z: outZ, movedDist: Math.hypot(outX - prevX, outZ - prevZ) };
}

export function moveBotWithPhysics(
  bot: YardBotEntity,
  nav: BotNavData,
  moveTarget: THREE.Vector3,
  moveSpeed: number,
  dt: number,
  colliders?: ColliderBox[],
  activeGlbCollider?: Dust2TriangleCollider | null,
  lockLookAtTarget?: THREE.Vector3 | null
): void {
  const bPos = bot.root.position;
  const botRadius = 0.34;
  if (nav.jumpCooldown == null) nav.jumpCooldown = 0;
  nav.jumpCooldown = Math.max(0, nav.jumpCooldown - dt);

  if (nav.avoidTimer > 0) nav.avoidTimer = Math.max(0, nav.avoidTimer - dt);

  let horizDist = 0;
  if (moveSpeed > 0.05) {
    _navDir.subVectors(moveTarget, bPos);
    _navDir.y = 0;
    const dist = _navDir.length();
    horizDist = dist;
    if (dist > 0.1) {
      _navDir.normalize();

      let moveDirX = _navDir.x;
      let moveDirZ = _navDir.z;
      if (nav.avoidTimer > 0 && Math.abs(nav.avoidAngle) > 0.01) {
        const cosA = Math.cos(nav.avoidAngle);
        const sinA = Math.sin(nav.avoidAngle);
        moveDirX = _navDir.x * cosA - _navDir.z * sinA;
        moveDirZ = _navDir.x * sinA + _navDir.z * cosA;
      }

      const step = Math.min(dist, moveSpeed * dt);
      const prevX = bPos.x;
      const prevZ = bPos.z;

      let attempt = tryStepDirection(prevX, prevZ, bPos.y, moveDirX, moveDirZ, step, botRadius, colliders, activeGlbCollider);

      if (attempt.movedDist < step * 0.6) {
        for (let i = 0; i < STEER_TEST_ANGLES.length; i++) {
          const ang = STEER_TEST_ANGLES[i] * (nav.strafeDir >= 0 ? 1 : -1);
          const cosA = Math.cos(ang);
          const sinA = Math.sin(ang);
          _steerDir.set(_navDir.x * cosA - _navDir.z * sinA, 0, _navDir.x * sinA + _navDir.z * cosA);
          const alt = tryStepDirection(prevX, prevZ, bPos.y, _steerDir.x, _steerDir.z, step, botRadius, colliders, activeGlbCollider);
          if (alt.movedDist > attempt.movedDist * 1.25 && alt.movedDist > step * 0.4) {
            attempt = alt;
            moveDirX = _steerDir.x;
            moveDirZ = _steerDir.z;
            nav.avoidAngle = ang;
            nav.avoidTimer = 0.55;
            break;
          }
        }
      }

      bPos.x = attempt.x;
      bPos.z = attempt.z;

      if (attempt.movedDist < step * 0.3) {
        nav.stuckTimer += dt;
        if (nav.stuckTimer > 0.32) {
          nav.stuckTimer = 0;
          nav.strafeDir *= -1;
          nav.avoidAngle = nav.strafeDir * 1.45;
          nav.avoidTimer = 0.75;
          if (!lockLookAtTarget && nav.waypoints.length > 0) {
            nav.wpIndex = (nav.wpIndex + 1) % nav.waypoints.length;
          }
        }
      } else {
        nav.stuckTimer = Math.max(0, nav.stuckTimer - dt * 2.5);
      }

      if (!lockLookAtTarget) {
        const lookAngle = Math.atan2(moveDirX, moveDirZ);
        bot.root.rotation.y = dampAngleShortest(bot.root.rotation.y, lookAngle, 10.5, dt);
      }
    }
  }

  if (lockLookAtTarget) {
    const enemyAngle = Math.atan2(lockLookAtTarget.x - bPos.x, lockLookAtTarget.z - bPos.z);
    bot.root.rotation.y = dampAngleShortest(bot.root.rotation.y, enemyAngle, 14.0, dt);
  }

  const floorY =
    activeGlbCollider && activeGlbCollider.ready
      ? activeGlbCollider.getGroundHeight(bPos.x, bPos.y + 0.35, bPos.z)
      : 0;

  const grounded =
    bPos.y <= floorY + 0.14 && Math.abs(nav.verticalVel) < 0.35;
  // Step-up toward higher waypoint / hop when stuck on a lip.
  if (grounded && nav.jumpCooldown <= 0 && moveSpeed > 0.05) {
    const heightDelta = moveTarget.y - floorY;
    const wantStepUp = heightDelta > 0.55 && horizDist < 3.2 && horizDist > 0.25;
    const wantStuckHop = nav.stuckTimer > 0.22 && heightDelta > -0.2;
    if (wantStepUp || wantStuckHop) {
      nav.verticalVel = wantStepUp ? 6.4 : 5.2;
      nav.jumpCooldown = 0.9;
      bot.root.userData.botJumpPulse = true;
    }
  }

  if (bPos.y <= floorY + 0.52 && bPos.y >= floorY - 0.6 && nav.verticalVel <= 0.05) {
    bPos.y = THREE.MathUtils.damp(bPos.y, floorY, 18, dt);
    nav.verticalVel = 0;
  } else if (nav.verticalVel > 0.05 || bPos.y > floorY + 0.02) {
    nav.verticalVel = Math.max(-18.0, nav.verticalVel - 15.5 * dt);
    bPos.y = Math.max(floorY, bPos.y + nav.verticalVel * dt);
    if (bPos.y <= floorY + 0.02 && nav.verticalVel <= 0) {
      bPos.y = floorY;
      nav.verticalVel = 0;
    }
  } else {
    bPos.y = floorY;
    nav.verticalVel = 0;
  }
}
