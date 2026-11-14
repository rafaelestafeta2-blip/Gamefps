import * as THREE from 'three';
import { playC4KeypadDigitSound, playRealBombPlantedVoice } from '../audio/characterAndBombAudio';
import { soundEngine } from '../audio/soundEngine';
import { playBulletSnapAndWhizz, playSpatialBotGunshot } from '../audio/spatialCombatAudio';
import { triggerTacticalRadioCallout } from '../audio/tacticalImmersionAudio';
import { DrillMode, WeaponId } from '../types/game';
import { BallisticsFXPool } from './ballisticsPool';
import {
  isBotReloading,
  triggerBotFireAnimation,
  triggerBotGrenadeAnimation,
  triggerBotHitAnimation,
} from './botCharacterSystem';
import {
  BotNavData,
  botNeedsRepath,
  checkBotLineOfSight,
  clearBotNeedsRepath,
  getMapRoutes,
  getWaypointTowardPlantedSite,
  isTargetInFieldOfView,
  moveBotWithPhysics,
  pickApproachWaypoint,
  setLastKnownPos,
  SquadFlankRole,
} from './botNavigationRoutes';
import { Dust2TriangleCollider } from './dust2Collider';
import { TacticalGrenadeSystem } from './grenadeSystem';
import { ColliderBox, TacticalTargetEntity } from './levelBuilder';
import { YardBombSystem } from './yardBombSystem';
import { YardBotEntity } from './yardPropsBuilder';

export type { BotNavData };

const _navDir = new THREE.Vector3();
const _botHead = new THREE.Vector3();
const _targetEye = new THREE.Vector3();
const _combatMoveGoal = new THREE.Vector3();
const _escortGoal = new THREE.Vector3();
const _guardGoal = new THREE.Vector3();
const _throwDir = new THREE.Vector3();
const _flankScratch = new THREE.Vector3();

let globalBotGrenadeCooldown = 14.0;

/** Shared squad flank plan keyed by team + enemy lock id. */
interface SquadFlankPlan {
  roles: Map<string, SquadFlankRole>;
  refreshAt: number;
  enemyKey: string;
}

const squadFlankPlans = new Map<string, SquadFlankPlan>();

function ensureNavExtras(nav: BotNavData): void {
  if (nav.acquireTimer == null) nav.acquireTimer = 0;
  if (nav.flankTimer == null) nav.flankTimer = 0;
  if (nav.jumpCooldown == null) nav.jumpCooldown = 0;
  if (nav.progressFailTimer == null) nav.progressFailTimer = 0;
  if (nav.unstickPhase == null) nav.unstickPhase = 0;
  if (nav.unstickTimer == null) nav.unstickTimer = 0;
  if (nav.heardAlertTimer == null) nav.heardAlertTimer = 0;
  if (!nav.pathNodeIds) nav.pathNodeIds = [];
  if (nav.pathIndex == null) nav.pathIndex = 0;
  if (nav.pathGoalKey == null) nav.pathGoalKey = '';
  if (nav.pathRefreshTimer == null) nav.pathRefreshTimer = 0;
  if (!nav.squadRole) nav.squadRole = 'HOLD';
  if (nav.peekPrefireDelay == null) nav.peekPrefireDelay = 0.18;
  if (nav.peekPrefireTimer == null) nav.peekPrefireTimer = 0;
  if (nav.isJigglePeek == null) nav.isJigglePeek = false;
}

/**
 * Assign HOLD / LEFT / RIGHT / PRESS so teammates don't all take the same side.
 */
function assignSquadFlankRoles(
  bots: YardBotEntity[],
  teamIsAlly: boolean,
  enemyKey: string,
  nowSec: number
): void {
  const planKey = `${teamIsAlly ? 'VG' : 'BT'}:${enemyKey}`;
  let plan = squadFlankPlans.get(planKey);
  if (plan && plan.enemyKey === enemyKey && plan.refreshAt > nowSec) {
    for (let i = 0; i < bots.length; i++) {
      const bot = bots[i];
      if (bot.isDown || bot.type !== 'COMBAT_BOT') continue;
      if (Boolean(bot.isAlly) !== teamIsAlly) continue;
      const nav = bot.root.userData?.navData as BotNavData | undefined;
      if (!nav) continue;
      const role = plan.roles.get(bot.id);
      if (role) nav.squadRole = role;
    }
    return;
  }

  const members: YardBotEntity[] = [];
  for (let i = 0; i < bots.length; i++) {
    const bot = bots[i];
    if (bot.isDown || bot.type !== 'COMBAT_BOT') continue;
    if (Boolean(bot.isAlly) !== teamIsAlly) continue;
    const nav = bot.root.userData?.navData as BotNavData | undefined;
    if (!nav) continue;
    if (
      nav.tacticalState === 'COMBAT' ||
      nav.tacticalState === 'COVER' ||
      nav.tacticalState === 'PEEK' ||
      nav.tacticalState === 'INVESTIGATE' ||
      nav.chaseTimer > 0
    ) {
      members.push(bot);
    }
  }
  members.sort((a, b) => a.id.localeCompare(b.id));

  const roles = new Map<string, SquadFlankRole>();
  const cycle: SquadFlankRole[] = ['HOLD', 'LEFT', 'RIGHT', 'PRESS', 'LEFT'];
  for (let i = 0; i < members.length; i++) {
    const role = cycle[i % cycle.length];
    roles.set(members[i].id, role);
    const nav = members[i].root.userData.navData as BotNavData;
    nav.squadRole = role;
    if (role === 'LEFT') {
      nav.strafeDir = -1;
      nav.coverSide = -1;
    } else if (role === 'RIGHT') {
      nav.strafeDir = 1;
      nav.coverSide = 1;
    }
  }
  plan = { roles, refreshAt: nowSec + 3.2, enemyKey };
  squadFlankPlans.set(planKey, plan);
}

function getOrInitBotNav(bot: YardBotEntity, mode: DrillMode, index: number): BotNavData {
  const existing = bot.root.userData?.navData as BotNavData | undefined;
  if (existing && existing.waypoints && existing.waypoints.length > 0) {
    ensureNavExtras(existing);
    return existing;
  }

  const routes = getMapRoutes(mode);
  const laneChoice = index % 3;
  const waypoints = bot.isAlly
    ? laneChoice === 0 ? routes.vgA : laneChoice === 1 ? routes.vgB : routes.vgMid
    : laneChoice === 0 ? routes.btA : laneChoice === 1 ? routes.btB : routes.btMid;

  const navData: BotNavData = {
    waypoints: waypoints.map((p) => p.clone()), wpIndex: 0, patrolDir: 1, tacticalState: 'PATROL',
    lockedTargetId: null, chaseTimer: 0, lastKnownPos: null, investigateTimer: 0,
    fireCooldown: 0.35 + Math.random() * 0.45, burstShotsLeft: 0, burstShotTimer: 0,
    grenadeCooldown: 14.0 + Math.random() * 12.0, grenadesLeft: index % 3 === 0 ? 1 : 0,
    coverTimer: 0, peekTimer: 0, coverSide: Math.random() > 0.5 ? 1 : -1,
    strafeTimer: 0, strafeDir: Math.random() > 0.5 ? 1 : -1, stuckTimer: 0,
    progressFailTimer: 0, unstickPhase: 0, unstickTimer: 0,
    avoidAngle: 0, avoidTimer: 0, verticalVel: 0, jumpCooldown: 0, plantOrDefuseTimer: 0, lastKeypadDigit: -1,
    visionRange: 40.0, fieldOfView: 130.0,
    acquireTimer: 0, flankTimer: 0, heardAlertTimer: 0,
    pathNodeIds: [], pathIndex: 0, pathGoalKey: '', pathRefreshTimer: 0,
    squadRole: laneChoice === 0 ? 'LEFT' : laneChoice === 1 ? 'RIGHT' : 'HOLD',
    peekPrefireDelay: 0.14 + Math.random() * 0.16,
    peekPrefireTimer: 0,
    isJigglePeek: false,
  };
  bot.root.userData = bot.root.userData || {};
  bot.root.userData.navData = navData;
  return navData;
}

/**
 * Gunfire / damage hearing — sets frozen LKP, does NOT grant LOS or live tracking.
 * Direct hit → stronger chase; sound-only → investigate toward shot origin.
 */
export function alertBotsToPlayerCombat(
  targets: TacticalTargetEntity[],
  playerPos: THREE.Vector3,
  hitBot?: TacticalTargetEntity | null,
  opts?: { hearingRadius?: number; isFootstep?: boolean }
): void {
  const hearR = opts?.hearingRadius ?? (opts?.isFootstep ? 14 : 28);
  for (let i = 0; i < targets.length; i++) {
    const bot = targets[i] as YardBotEntity;
    if (bot.isDown || bot.type !== 'COMBAT_BOT' || bot.isAlly) continue;
    const isDirectHit = Boolean(hitBot && bot.id === hitBot.id);
    const dist = bot.root.position.distanceTo(playerPos);
    if (!isDirectHit && dist > hearR) continue;
    const nav = bot.root.userData?.navData as BotNavData | undefined;
    if (!nav) continue;
    // Don't override an active visual lock with a weaker hear.
    if (nav.tacticalState === 'COMBAT' || nav.tacticalState === 'PEEK' || nav.tacticalState === 'COVER') {
      if (nav.chaseTimer > 4 && !isDirectHit) continue;
    }
    nav.lockedTargetId = 'PLAYER';
    setLastKnownPos(nav, playerPos);
    if (isDirectHit) {
      nav.chaseTimer = Math.max(nav.chaseTimer, 22);
      nav.heardAlertTimer = 0;
      nav.tacticalState = 'COMBAT';
      bot.isTelegraphing = true;
    } else {
      nav.chaseTimer = Math.max(nav.chaseTimer, opts?.isFootstep ? 8 : 14);
      nav.heardAlertTimer = opts?.isFootstep ? 2.5 : 5.0;
      nav.tacticalState = 'INVESTIGATE';
      bot.isTelegraphing = true;
      nav.acquireTimer = 0;
    }
  }
}

/** Footstep hearing — sprint is loud; walk alerts only at close range. Never grants LOS. */
export function alertBotsToPlayerFootsteps(
  targets: TacticalTargetEntity[],
  playerPos: THREE.Vector3,
  isSprinting: boolean,
  isMoving = true
): void {
  if (!isMoving) return;
  alertBotsToPlayerCombat(targets, playerPos, null, {
    hearingRadius: isSprinting ? 14 : 7.5,
    isFootstep: true,
  });
}

export function updateSmartBotNavigation(
  bots: YardBotEntity[],
  mode: DrillMode,
  playerPos: THREE.Vector3,
  playerYaw: number,
  dt: number,
  yardBomb: YardBombSystem,
  fxPool: BallisticsFXPool,
  grenadeSystem: TacticalGrenadeSystem,
  onDealDamageToPlayer: (dmg: number, isHeadshot: boolean, bot: YardBotEntity) => void,
  colliders?: ColliderBox[],
  activeGlbCollider?: Dust2TriangleCollider | null,
  playerAlive = true,
  onRegisterKill?: (
    killerName: string, killerTeam: 'VANGUARD' | 'BLACKTHORN',
    victimName: string, victimTeam: 'VANGUARD' | 'BLACKTHORN',
    weaponId: WeaponId, isHeadshot: boolean
  ) => void
): void {
  const routes = getMapRoutes(mode);
  const isBombMode = mode === 'YARD_BOMB_5V5' || mode === 'DUST2_BOMB_5V5' || mode === 'ASSAULT_BOMB_5V5';
  const isC4Planted = isBombMode && yardBomb.info.bombStatus === 'PLANTED';
  const plantedSite: 'A' | 'B' = yardBomb.info.plantedSite === 'B' ? 'B' : 'A';
  const plantedSitePos = plantedSite === 'A' ? routes.siteA : routes.siteB;

  globalBotGrenadeCooldown = Math.max(0, globalBotGrenadeCooldown - dt);

  // Warm nav + squad roles once per frame (shared flank plan for each team).
  const nowSec = performance.now() * 0.001;
  for (let i = 0; i < bots.length; i++) {
    const bot = bots[i];
    if (bot.isDown || bot.type !== 'COMBAT_BOT') continue;
    getOrInitBotNav(bot, mode, i);
  }
  assignSquadFlankRoles(bots, false, 'PLAYER', nowSec);
  assignSquadFlankRoles(bots, true, 'ENEMY', nowSec);

  for (let i = 0; i < bots.length; i++) {
    const bot = bots[i];
    if (bot.isDown || bot.type !== 'COMBAT_BOT') continue;

    const nav = getOrInitBotNav(bot, mode, i);
    nav.fireCooldown = Math.max(0, nav.fireCooldown - dt);
    nav.grenadeCooldown = Math.max(0, nav.grenadeCooldown - dt);
    nav.chaseTimer = Math.max(0, nav.chaseTimer - dt);
    nav.heardAlertTimer = Math.max(0, (nav.heardAlertTimer || 0) - dt);
    nav.pathRefreshTimer = Math.max(0, (nav.pathRefreshTimer || 0) - dt);
    nav.peekPrefireTimer = Math.max(0, (nav.peekPrefireTimer || 0) - dt);

    const bPos = bot.root.position;
    _botHead.set(bPos.x, bPos.y + 1.45, bPos.z);

    let visibleEnemyPos: THREE.Vector3 | null = null;
    let visibleEnemyBot: YardBotEntity | null = null;
    let isVisibleTargetPlayer = false;
    let nearestDist = nav.visionRange;
    // Was 360 when alerted → aimbot feel / deaths from off-screen. Wider when chasing, not omniscient.
    const activeFov =
      nav.chaseTimer > 0 || nav.tacticalState === 'COMBAT' || nav.tacticalState === 'PEEK' || isC4Planted
        ? 200
        : nav.fieldOfView;

    if (!bot.isAlly && playerAlive) {
      const distToPlayer = bPos.distanceTo(playerPos);
      if (distToPlayer <= nearestDist && isTargetInFieldOfView(bPos, bot.root.rotation.y, playerPos, activeFov)) {
        _targetEye.set(playerPos.x, playerPos.y + 1.35, playerPos.z);
        if (checkBotLineOfSight(_botHead, _targetEye, grenadeSystem, colliders, activeGlbCollider)) {
          nearestDist = distToPlayer;
          visibleEnemyPos = playerPos;
          isVisibleTargetPlayer = true;
          nav.lockedTargetId = 'PLAYER';
          nav.chaseTimer = 18.0;
          nav.heardAlertTimer = 0;
          setLastKnownPos(nav, playerPos);
        }
      }
    }

    for (let j = 0; j < bots.length; j++) {
      const other = bots[j];
      if (other.isDown || Boolean(other.isAlly) === Boolean(bot.isAlly)) continue;
      const oPos = other.root.position;
      const d = bPos.distanceTo(oPos);
      if (d < nearestDist && isTargetInFieldOfView(bPos, bot.root.rotation.y, oPos, activeFov)) {
        _targetEye.set(oPos.x, oPos.y + 1.4, oPos.z);
        if (checkBotLineOfSight(_botHead, _targetEye, grenadeSystem, colliders, activeGlbCollider)) {
          nearestDist = d;
          visibleEnemyPos = oPos;
          visibleEnemyBot = other;
          isVisibleTargetPlayer = false;
          nav.lockedTargetId = other.id;
          nav.chaseTimer = 22.0;
          nav.heardAlertTimer = 0;
          setLastKnownPos(nav, oPos);
        }
      }
    }

    // Chase frozen LKP only — never live-track through walls (no wallhack).
    let chasedTargetPos: THREE.Vector3 | null = visibleEnemyPos;
    if (!chasedTargetPos && nav.chaseTimer > 0 && nav.lastKnownPos) {
      if (nav.lockedTargetId === 'PLAYER' && !playerAlive) {
        nav.lockedTargetId = null;
        nav.chaseTimer = 0;
      } else if (nav.lockedTargetId && nav.lockedTargetId !== 'PLAYER') {
        const lockedBot = bots.find((b) => b.id === nav.lockedTargetId);
        if (!lockedBot || lockedBot.isDown) {
          nav.lockedTargetId = null;
          // Keep investigating last spot briefly after target dies.
          nav.chaseTimer = Math.min(nav.chaseTimer, 4);
        }
      }
      if (nav.chaseTimer > 0 && nav.lastKnownPos) {
        chasedTargetPos = nav.lastKnownPos;
      }
    }

    // Offline wave modes: never live-track. Push only after see/hear set a frozen LKP.
    // (Gunfire + sprint footsteps feed LKP via alert helpers.)

    let lockLookAtTarget: THREE.Vector3 | null = null;
    const isEscortAlly = bot.isAlly && (bot.callsign === 'LIFELINE-04' || bot.callsign === 'STRIKER-03');

    if (isC4Planted) {
      if (!bot.isAlly) {
        const distToBomb = Math.hypot(bPos.x - plantedSitePos.x, bPos.z - plantedSitePos.z);
        if (distToBomb <= 2.6 && !visibleEnemyPos) {
          if (nav.tacticalState !== 'DEFUSING') triggerTacticalRadioCallout('DEFUSING_C4');
          nav.tacticalState = 'DEFUSING';
          bot.isTelegraphing = false;
          nav.plantOrDefuseTimer += dt;
          if (nav.plantOrDefuseTimer >= 4.8) {
            nav.plantOrDefuseTimer = 0;
            yardBomb.info.bombStatus = 'DEFUSED';
            soundEngine.playMechanicalSwitch(1.6);
            yardBomb.finishCurrentRound('BLACKTHORN', 'BOMBA C4 DESARMADA PELA BLACKTHORN!', () => {});
          }
        } else if (visibleEnemyPos) {
          nav.tacticalState = 'COMBAT';
          bot.isTelegraphing = true;
          lockLookAtTarget = visibleEnemyPos;
        } else {
          nav.tacticalState = 'RUSH_PLANTED';
          bot.isTelegraphing = false;
        }
      } else if (visibleEnemyPos) {
        nav.tacticalState = 'COMBAT';
        bot.isTelegraphing = true;
        lockLookAtTarget = visibleEnemyPos;
      } else {
        nav.tacticalState = 'DEFEND_PLANTED';
        bot.isTelegraphing = false;
      }
    } else if (visibleEnemyPos) {
      const inCoverCycle =
        nav.tacticalState === 'COVER' || nav.tacticalState === 'PEEK';
      if (!inCoverCycle && nav.tacticalState !== 'COMBAT' && bot.isAlly) {
        triggerTacticalRadioCallout('ENEMY_SPOTTED');
      }
      // First contact → often drop into cover instead of open strafe.
      if (!inCoverCycle && nav.tacticalState !== 'COMBAT') {
        if (Math.random() < 0.55) {
          nav.tacticalState = 'COVER';
          nav.coverTimer = 0.7 + Math.random() * 0.9;
          nav.coverSide = Math.random() > 0.5 ? 1 : -1;
        } else {
          nav.tacticalState = 'COMBAT';
        }
      } else if (!inCoverCycle) {
        nav.tacticalState = 'COMBAT';
      }
      bot.isTelegraphing = true;
      lockLookAtTarget = visibleEnemyPos;
      nav.acquireTimer = (nav.acquireTimer || 0) + dt;
    } else if (chasedTargetPos) {
      nav.tacticalState = 'INVESTIGATE';
      bot.isTelegraphing = true;
      lockLookAtTarget = chasedTargetPos;
      nav.acquireTimer = 0;
    } else if (isBombMode && bot.isAlly) {
      const distSiteA = Math.hypot(bPos.x - routes.siteA.x, bPos.z - routes.siteA.z);
      const distSiteB = Math.hypot(bPos.x - routes.siteB.x, bPos.z - routes.siteB.z);
      if ((distSiteA <= 3.2 || distSiteB <= 3.2) && yardBomb.info.bombStatus === 'CARRIED') {
        if (nav.tacticalState !== 'PLANTING') {
          triggerTacticalRadioCallout('PLANTING_C4');
          nav.lastKeypadDigit = -1;
        }
        nav.tacticalState = 'PLANTING';
        bot.isTelegraphing = false;
        nav.plantOrDefuseTimer += dt;
        const digitIdx = Math.min(7, Math.floor((nav.plantOrDefuseTimer / 3.2) * 8));
        if (digitIdx !== nav.lastKeypadDigit) {
          nav.lastKeypadDigit = digitIdx;
          if (bPos.distanceTo(playerPos) < 28) playC4KeypadDigitSound(digitIdx);
        }
        if (nav.plantOrDefuseTimer >= 3.2) {
          nav.plantOrDefuseTimer = 0;
          nav.lastKeypadDigit = -1;
          yardBomb.info.bombStatus = 'PLANTED';
          yardBomb.info.plantedSite = distSiteA <= distSiteB ? 'A' : 'B';
          soundEngine.playMechanicalSwitch(1.5);
          playRealBombPlantedVoice();
        }
      } else if (isEscortAlly && playerAlive && bPos.distanceTo(playerPos) <= 26.0) {
        nav.tacticalState = 'FOLLOW_PLAYER';
        bot.isTelegraphing = false;
      } else {
        nav.tacticalState = 'PATROL';
        bot.isTelegraphing = false;
      }
    } else {
      nav.tacticalState = 'PATROL';
      bot.isTelegraphing = false;
      nav.acquireTimer = 0;
    }

    if (!visibleEnemyPos) {
      nav.acquireTimer = 0;
    }

    // 3. Seleção de Alvo de Movimento e Velocidade
    let moveTarget: THREE.Vector3;
    let moveSpeed = 3.9;

    if (nav.tacticalState === 'RUSH_PLANTED') {
      moveTarget = getWaypointTowardPlantedSite(bPos, plantedSite, mode, false);
      moveSpeed = 4.65;
    } else if (nav.tacticalState === 'DEFEND_PLANTED') {
      const distToBomb = Math.hypot(bPos.x - plantedSitePos.x, bPos.z - plantedSitePos.z);
      if (distToBomb > 5.0) {
        moveTarget = getWaypointTowardPlantedSite(bPos, plantedSite, mode, true);
        moveSpeed = 4.4;
      } else {
        const angle = (i * Math.PI * 0.5) + Math.sin(performance.now() * 0.0005 + i) * 0.6;
        _guardGoal.set(plantedSitePos.x + Math.cos(angle) * 3.2, bPos.y, plantedSitePos.z + Math.sin(angle) * 3.2);
        moveTarget = _guardGoal;
        moveSpeed = distToBomb < 2.2 ? 2.4 : 1.45;
      }
    } else if (nav.tacticalState === 'FOLLOW_PLAYER' && playerAlive) {
      const sideSign = bot.callsign === 'LIFELINE-04' ? -1 : 1;
      const behindX = Math.sin(playerYaw) * 2.8 + Math.cos(playerYaw) * sideSign * 1.8;
      const behindZ = Math.cos(playerYaw) * 2.8 - Math.sin(playerYaw) * sideSign * 1.8;
      _escortGoal.set(playerPos.x + behindX, bPos.y, playerPos.z + behindZ);
      const distToEscort = Math.hypot(bPos.x - _escortGoal.x, bPos.z - _escortGoal.z);
      moveTarget = _escortGoal;
      moveSpeed = distToEscort > 6.0 ? 4.5 : distToEscort > 1.6 ? 3.85 : 0.0;
    } else if (nav.tacticalState === 'DEFUSING' || nav.tacticalState === 'PLANTING') {
      moveTarget = bPos;
      moveSpeed = 0;
    } else if (
      (nav.tacticalState === 'COMBAT' ||
        nav.tacticalState === 'COVER' ||
        nav.tacticalState === 'PEEK') &&
      visibleEnemyPos
    ) {
      const distToEnemy = bPos.distanceTo(visibleEnemyPos);
      const isSniperBot = bot.weaponId === 'SNIPER_BOLT' || bot.weaponId === 'SNIPER_TACTICAL';
      const idealDist = isSniperBot ? 15.0 : 4.6;

      // Cover → peek → squad flank cadence (roles assigned per team).
      if (nav.coverTimer == null) nav.coverTimer = 0;
      if (nav.peekTimer == null) nav.peekTimer = 0;
      if (nav.flankTimer == null) nav.flankTimer = 0;
      if (!nav.coverSide) nav.coverSide = Math.random() > 0.5 ? 1 : -1;
      const role = nav.squadRole || 'HOLD';
      const roleSide = role === 'LEFT' ? -1 : role === 'RIGHT' ? 1 : nav.strafeDir;

      if (nav.tacticalState === 'COMBAT' && distToEnemy < idealDist + 9) {
        const roll = Math.random();
        if (roll < 0.03) {
          nav.tacticalState = 'COVER';
          // Human hold: vary cover time; HOLD roles linger longer.
          nav.coverTimer =
            (role === 'HOLD' ? 1.05 : 0.7) + Math.random() * (role === 'HOLD' ? 1.35 : 1.0);
          nav.coverSide = roleSide >= 0 ? 1 : -1;
          nav.isJigglePeek = false;
          if (bot.root.userData?.botAnimCtrl) {
            bot.root.userData.botAnimCtrl.crouchStance = true;
          }
        } else if (roll < 0.05 && (role === 'LEFT' || role === 'RIGHT' || role === 'PRESS')) {
          // Squad-directed flank — not a random solo dart.
          nav.flankTimer = 1.35 + Math.random() * 1.25;
          nav.strafeDir = roleSide;
          nav.coverSide = roleSide >= 0 ? 1 : -1;
        }
      }
      if (
        nav.tacticalState === 'COMBAT' &&
        (nav.flankTimer || 0) <= 0 &&
        (role === 'LEFT' || role === 'RIGHT' || role === 'PRESS') &&
        Math.random() < 0.01
      ) {
        nav.flankTimer = 1.5 + Math.random() * 1.15;
        nav.strafeDir = roleSide;
      }
      if (nav.flankTimer > 0) nav.flankTimer -= dt;
      if (nav.tacticalState === 'COVER') {
        nav.coverTimer -= dt;
        if (nav.coverTimer <= 0) {
          nav.tacticalState = 'PEEK';
          // Human peek mix: jiggle (~28%) vs commit expose.
          nav.isJigglePeek = Math.random() < 0.28;
          nav.peekTimer = nav.isJigglePeek
            ? 0.22 + Math.random() * 0.2
            : 0.48 + Math.random() * 0.55;
          nav.peekPrefireDelay = 0.12 + Math.random() * 0.2;
          nav.peekPrefireTimer = nav.peekPrefireDelay;
          nav.acquireTimer = 0;
          if (bot.root.userData?.botAnimCtrl) {
            bot.root.userData.botAnimCtrl.crouchStance = false;
          }
        }
      } else if (nav.tacticalState === 'PEEK') {
        nav.peekTimer -= dt;
        if (nav.peekTimer <= 0) {
          // Jiggle peeks almost always snap back to cover.
          if (nav.isJigglePeek || Math.random() < 0.62) {
            nav.tacticalState = 'COVER';
            nav.coverTimer = 0.55 + Math.random() * 1.15;
            if (bot.root.userData?.botAnimCtrl) {
              bot.root.userData.botAnimCtrl.crouchStance = true;
            }
          } else {
            nav.tacticalState = 'COMBAT';
          }
          nav.isJigglePeek = false;
          nav.peekPrefireTimer = 0;
        }
      }

      nav.strafeTimer += dt;
      // HOLD / PRESS keep tighter strafe cadence; flankers hold assigned side longer.
      const strafeFlipAt = role === 'LEFT' || role === 'RIGHT' ? 2.4 : 1.6;
      if (nav.strafeTimer > strafeFlipAt) {
        if (role === 'LEFT' || role === 'RIGHT') {
          nav.strafeDir = roleSide;
        } else {
          nav.strafeDir *= -1;
        }
        nav.strafeTimer = 0;
      }

      _navDir.subVectors(visibleEnemyPos, bPos);
      _navDir.y = 0;
      if (_navDir.lengthSq() > 0.001) _navDir.normalize();

      if (nav.tacticalState === 'COVER') {
        const side = nav.coverSide || roleSide;
        _combatMoveGoal.set(
          bPos.x - _navDir.z * side * 2.8 - _navDir.x * 1.6,
          bPos.y,
          bPos.z + _navDir.x * side * 2.8 - _navDir.z * 1.6
        );
        moveTarget = _combatMoveGoal;
        moveSpeed = 2.05;
      } else if (nav.tacticalState === 'PEEK') {
        const side = nav.coverSide || roleSide;
        const peekOut = nav.isJigglePeek ? 0.32 : 0.55;
        _combatMoveGoal.set(
          bPos.x - _navDir.z * side * 0.4 + _navDir.x * peekOut,
          bPos.y,
          bPos.z + _navDir.x * side * 0.4 + _navDir.z * peekOut
        );
        moveTarget = _combatMoveGoal;
        moveSpeed = nav.isJigglePeek ? 2.35 : 2.7;
      } else if (
        nav.flankTimer > 0 ||
        ((role === 'LEFT' || role === 'RIGHT' || role === 'PRESS') &&
          distToEnemy > idealDist + 0.8)
      ) {
        const side = role === 'HOLD' ? nav.strafeDir : roleSide;
        const wide = role === 'PRESS' ? 3.2 : role === 'HOLD' ? 2.4 : 4.6;
        const ring = Math.max(idealDist, Math.min(distToEnemy, idealDist + 3.5));
        _flankScratch.set(
          visibleEnemyPos.x - _navDir.x * ring - _navDir.z * side * wide,
          bPos.y,
          visibleEnemyPos.z - _navDir.z * ring + _navDir.x * side * wide
        );
        // Route flank goals through A* so wide arcs don't jam door frames.
        moveTarget = pickApproachWaypoint(
          bPos,
          _flankScratch,
          mode,
          Boolean(bot.isAlly),
          5.5,
          botNeedsRepath(nav, bot),
          nav
        );
        moveSpeed = role === 'PRESS' ? 4.55 : 4.35;
      } else if (distToEnemy > idealDist + 1.2) {
        const sideX = -_navDir.z * roleSide * 0.12;
        const sideZ = _navDir.x * roleSide * 0.12;
        _combatMoveGoal.set(
          visibleEnemyPos.x - _navDir.x * idealDist + sideX * 2.0,
          bPos.y,
          visibleEnemyPos.z - _navDir.z * idealDist + sideZ * 2.0
        );
        moveTarget = _combatMoveGoal;
        moveSpeed = distToEnemy > 12.0 ? 4.55 : 3.95;
      } else if (distToEnemy < idealDist - 1.5) {
        _combatMoveGoal.set(
          bPos.x - _navDir.x * 2.2 - _navDir.z * roleSide * 1.2,
          bPos.y,
          bPos.z - _navDir.z * 2.2 + _navDir.x * roleSide * 1.2
        );
        moveTarget = _combatMoveGoal;
        moveSpeed = 2.6;
      } else {
        if (Math.random() < 0.018) {
          nav.tacticalState = 'COVER';
          nav.coverTimer = 0.7 + Math.random() * 0.9;
        }
        _combatMoveGoal.set(
          bPos.x - _navDir.z * roleSide * 0.9 - _navDir.x * 0.35,
          bPos.y,
          bPos.z + _navDir.x * roleSide * 0.9 - _navDir.z * 0.35
        );
        moveTarget = _combatMoveGoal;
        moveSpeed = 1.85;
      }
    } else if (
      (nav.tacticalState === 'INVESTIGATE' ||
        (!visibleEnemyPos && chasedTargetPos && nav.chaseTimer > 0)) &&
      chasedTargetPos
    ) {
      if (nav.tacticalState !== 'INVESTIGATE') {
        nav.tacticalState = 'INVESTIGATE';
      }
      const distLast = Math.hypot(bPos.x - chasedTargetPos.x, bPos.z - chasedTargetPos.z);
      if (distLast < 2.6) {
        const a = performance.now() * 0.0015 + i;
        _combatMoveGoal.set(
          chasedTargetPos.x + Math.cos(a) * 3.2,
          bPos.y,
          chasedTargetPos.z + Math.sin(a) * 3.2
        );
        moveTarget = _combatMoveGoal;
        moveSpeed = 2.85;
      } else {
        const needsRepath = botNeedsRepath(nav, bot);
        moveTarget = pickApproachWaypoint(
          bPos,
          chasedTargetPos,
          mode,
          Boolean(bot.isAlly),
          8.5,
          needsRepath || nav.unstickPhase >= 2,
          nav
        );
        if (needsRepath) clearBotNeedsRepath(nav, bot);
        moveSpeed = 4.55;
      }
    } else if (nav.waypoints.length > 0) {
      if (botNeedsRepath(nav, bot)) {
        // Soft repath via A* toward current lane end / next goal.
        const laneGoal = nav.waypoints[nav.waypoints.length - 1] || nav.waypoints[nav.wpIndex];
        moveTarget = pickApproachWaypoint(
          bPos,
          laneGoal,
          mode,
          Boolean(bot.isAlly),
          4.0,
          true,
          nav
        );
        nav.progressFailTimer = 0;
        clearBotNeedsRepath(nav, bot);
        moveSpeed = 4.2;
      } else {
        const curWp = nav.waypoints[nav.wpIndex];
        if (Math.hypot(bPos.x - curWp.x, bPos.z - curWp.z) < 2.2) {
          const minLoopIdx = Math.min(2, nav.waypoints.length - 1);
          nav.wpIndex = nav.wpIndex + 1 >= nav.waypoints.length ? minLoopIdx : nav.wpIndex + 1;
        }
        // Patrol also uses graph when far from the next lane node.
        const nextWp = nav.waypoints[nav.wpIndex];
        moveTarget = pickApproachWaypoint(
          bPos,
          nextWp,
          mode,
          Boolean(bot.isAlly),
          6.5,
          false,
          nav
        );
        moveSpeed = 4.05;
      }
    } else {
      moveTarget = bPos;
      moveSpeed = 0;
    }

    // Long closes: always prefer A* corridor path over combat beelines.
    if (
      visibleEnemyPos &&
      (nav.tacticalState === 'COMBAT' || nav.tacticalState === 'COVER') &&
      moveTarget === _combatMoveGoal
    ) {
      const distE = Math.hypot(bPos.x - visibleEnemyPos.x, bPos.z - visibleEnemyPos.z);
      if (distE > 8.5 && (nav.flankTimer || 0) <= 0) {
        moveTarget = pickApproachWaypoint(
          bPos,
          moveTarget,
          mode,
          Boolean(bot.isAlly),
          8.5,
          botNeedsRepath(nav, bot) || nav.unstickPhase >= 2,
          nav
        );
      }
    }

    moveBotWithPhysics(bot, nav, moveTarget, moveSpeed, dt, colliders, activeGlbCollider, lockLookAtTarget);

    const weapon = bot.weaponId || 'AK47_RIFLE';
    const isSniper = weapon === 'SNIPER_BOLT' || weapon === 'SNIPER_TACTICAL';

    // Human fire gates: LOS + acquire + peek swing-out delay; jiggle peeks don't commit.
    const peekReady =
      nav.tacticalState !== 'PEEK' ||
      (!nav.isJigglePeek && (nav.peekPrefireTimer || 0) <= 0);
    const acquireNeed = isVisibleTargetPlayer
      ? nav.tacticalState === 'PEEK'
        ? 0.16 + (nav.peekPrefireDelay || 0.12) * 0.35
        : 0.24
      : 0.08;
    const canFireAtVisible =
      (nav.tacticalState === 'COMBAT' || nav.tacticalState === 'PEEK') &&
      visibleEnemyPos &&
      peekReady &&
      (nav.acquireTimer || 0) >= acquireNeed;

    if (canFireAtVisible && visibleEnemyPos && !isBotReloading(bot)) {
      if (nav.burstShotsLeft <= 0 && nav.fireCooldown <= 0) {
        nav.burstShotsLeft = isSniper ? 1 : 2 + Math.floor(Math.random() * 3);
        nav.burstShotTimer = 0;
        nav.fireCooldown = isSniper ? 1.7 + Math.random() * 0.55 : 0.62 + Math.random() * 0.5;
      }

      if (nav.burstShotsLeft > 0) {
        nav.burstShotTimer -= dt;
        if (nav.burstShotTimer <= 0) {
          nav.burstShotsLeft -= 1;
          nav.burstShotTimer = isSniper ? 0.52 : 0.1 + Math.random() * 0.025;
          // Empty mag starts RIFLE_RELOAD_3P inside triggerBotFireAnimation.
          triggerBotFireAnimation(bot);
          if (isBotReloading(bot)) {
            nav.burstShotsLeft = 0;
            continue;
          }
          _botHead.set(bPos.x, bPos.y + 1.45, bPos.z);
          const spread = isSniper ? 0.12 : 0.32;
          _targetEye.set(
            visibleEnemyPos.x + (Math.random() - 0.5) * spread,
            visibleEnemyPos.y + 1.32 + (Math.random() - 0.5) * 0.18,
            visibleEnemyPos.z + (Math.random() - 0.5) * spread
          );

          // Re-validate LOS at fire time (prevents wallbang if target slipped behind cover).
          const stillClear = checkBotLineOfSight(
            _botHead,
            _targetEye,
            grenadeSystem,
            colliders,
            activeGlbCollider
          );
          if (!stillClear) {
            nav.burstShotsLeft = 0;
            nav.acquireTimer = 0;
            continue;
          }

          playSpatialBotGunshot(_botHead, playerPos, playerYaw, weapon, !isVisibleTargetPlayer);
          if (!bot.isAlly) playBulletSnapAndWhizz(_botHead, _targetEye, playerPos, playerYaw);
          fxPool.spawnTracer(_botHead, _targetEye, bot.isAlly ? 0x38bdf8 : 0xef4444);

          if (isVisibleTargetPlayer && playerAlive) {
            if (Math.random() < (isSniper ? 0.48 : 0.28)) {
              const isHeadshot = Math.random() < 0.16;
              onDealDamageToPlayer(
                isSniper ? (isHeadshot ? 72 : 42) : isHeadshot ? 18 : 9,
                isHeadshot,
                bot
              );
            }
          } else if (visibleEnemyBot && !visibleEnemyBot.isDown && Math.random() < (isSniper ? 0.52 : 0.32)) {
            const isHeadshot = Math.random() < 0.26;
            visibleEnemyBot.health -= isSniper ? (isHeadshot ? 110 : 75) : isHeadshot ? 42 : 22;
            visibleEnemyBot.hitTiltVelocity = -12.0;
            triggerBotHitAnimation(visibleEnemyBot);
            const victimNav = visibleEnemyBot.root.userData?.navData as BotNavData | undefined;
            if (victimNav && !victimNav.lockedTargetId) {
              victimNav.lockedTargetId = bot.id;
              victimNav.chaseTimer = 20.0;
              setLastKnownPos(victimNav, bPos);
              victimNav.tacticalState = 'INVESTIGATE';
            }
            if (visibleEnemyBot.health <= 0) {
              visibleEnemyBot.isDown = true;
              visibleEnemyBot.lastDeathWasHeadshot = isHeadshot;
              if (isHeadshot) visibleEnemyBot.hitTiltVelocity = -18.0;
              visibleEnemyBot.downTimer = 9999;
              if (visibleEnemyBot.isAlly) {
                const now = performance.now() / 1000;
                visibleEnemyBot.reviveUntilSec = now + 40;
                visibleEnemyBot.reviveExpired = false;
                visibleEnemyBot.root.visible = true;
              }
              onRegisterKill?.(bot.callsign || (bot.isAlly ? 'RECON-02' : 'KRAKEN-BT'), bot.isAlly ? 'VANGUARD' : 'BLACKTHORN', visibleEnemyBot.callsign || (visibleEnemyBot.isAlly ? 'RECON-02' : 'KRAKEN-BT'), visibleEnemyBot.isAlly ? 'VANGUARD' : 'BLACKTHORN', weapon, isHeadshot);
            }
          }
        }
      }
      const distToEnemy = bPos.distanceTo(visibleEnemyPos);
      if (nav.grenadesLeft > 0 && nav.grenadeCooldown <= 0 && globalBotGrenadeCooldown <= 0 && distToEnemy >= 9.0 && distToEnemy <= 24.0 && Math.random() < 0.14) {
        nav.grenadesLeft -= 1;
        nav.grenadeCooldown = 35.0;
        globalBotGrenadeCooldown = 25.0;
        const isSmoke = Math.random() < 0.45;
        if (isSmoke) soundEngine.playSmokeGrenadeVoice();
        else soundEngine.playFragGrenadeVoice();
        soundEngine.playGrenadeThrow();
        triggerBotGrenadeAnimation(bot);
        _throwDir.subVectors(visibleEnemyPos, _botHead).normalize().multiplyScalar(13.5);
        _throwDir.y += 4.8;
        grenadeSystem.spawnBotGrenade(_botHead, _throwDir, isSmoke ? 'SMOKE' : 'FRAG');
      }
    }
  }
}
