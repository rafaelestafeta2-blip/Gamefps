import * as THREE from 'three';
import { soundEngine } from '../audio/soundEngine';
import { DrillMode } from '../types/game';
import { BallisticsFXPool } from './ballisticsPool';
import { triggerBotFireAnimation } from './botCharacterSystem';
import {
  BotNavData,
  checkBotLineOfSight,
  getMapRoutes,
  isTargetInFieldOfView,
  moveBotWithPhysics,
} from './botNavigationRoutes';
import { Dust2TriangleCollider } from './dust2Collider';
import { TacticalGrenadeSystem } from './grenadeSystem';
import { ColliderBox } from './levelBuilder';
import { YardBombSystem } from './yardBombSystem';
import { YardBotEntity } from './yardPropsBuilder';

export type { BotNavData };

const _navDir = new THREE.Vector3();
const _botHead = new THREE.Vector3();
const _targetEye = new THREE.Vector3();
const _strafeTarget = new THREE.Vector3();
const _throwDir = new THREE.Vector3();

let globalBotGrenadeCooldown = 14.0;

function getOrInitBotNav(
  bot: YardBotEntity,
  mode: DrillMode,
  index: number
): BotNavData {
  const existing = bot.root.userData?.navData as BotNavData | undefined;
  if (existing && existing.waypoints && existing.waypoints.length > 0) {
    return existing;
  }

  const routes = getMapRoutes(mode);
  const laneChoice = index % 3;
  const waypoints = bot.isAlly
    ? laneChoice === 0
      ? routes.vgA
      : laneChoice === 1
        ? routes.vgB
        : routes.vgMid
    : laneChoice === 0
      ? routes.btA
      : laneChoice === 1
        ? routes.btB
        : routes.btMid;

  const navData: BotNavData = {
    waypoints: waypoints.map((p) => p.clone()),
    wpIndex: 0,
    tacticalState: 'PATROL',
    lastKnownPos: null,
    investigateTimer: 0,
    fireCooldown: 0.7 + Math.random() * 1.0,
    grenadeCooldown: 14.0 + Math.random() * 12.0,
    // Apenas 1 granada por rodada para operadores específicos (sem spam caótico)
    grenadesLeft: index % 3 === 0 ? 1 : 0,
    strafeTimer: 0,
    strafeDir: Math.random() > 0.5 ? 1 : -1,
    stuckTimer: 0,
    verticalVel: 0,
    plantOrDefuseTimer: 0,
    visionRange: 30.0,
    fieldOfView: 90.0,
  };

  bot.root.userData = bot.root.userData || {};
  bot.root.userData.navData = navData;
  return navData;
}

/**
 * Sistema ProBotAI com Física Real, Colisão de Paredes, Gravidade e Uso Tático de Granadas.
 */
export function updateSmartBotNavigation(
  bots: YardBotEntity[],
  mode: DrillMode,
  playerPos: THREE.Vector3,
  dt: number,
  yardBomb: YardBombSystem,
  fxPool: BallisticsFXPool,
  grenadeSystem: TacticalGrenadeSystem,
  onDealDamageToPlayer: (
    dmg: number,
    isHeadshot: boolean,
    bot: YardBotEntity
  ) => void,
  colliders?: ColliderBox[],
  activeGlbCollider?: Dust2TriangleCollider | null
): void {
  const routes = getMapRoutes(mode);
  const isC4Planted = yardBomb.info.bombStatus === 'PLANTED';
  const plantedSitePos =
    yardBomb.info.plantedSite === 'A' ? routes.siteA : routes.siteB;

  globalBotGrenadeCooldown = Math.max(0, globalBotGrenadeCooldown - dt);

  for (let i = 0; i < bots.length; i++) {
    const bot = bots[i];
    if (bot.isDown || bot.type !== 'COMBAT_BOT') continue;

    const nav = getOrInitBotNav(bot, mode, i);
    nav.fireCooldown = Math.max(0, nav.fireCooldown - dt);
    nav.grenadeCooldown = Math.max(0, nav.grenadeCooldown - dt);

    const bPos = bot.root.position;
    _botHead.set(bPos.x, bPos.y + 1.45, bPos.z);

    let targetEnemyPos: THREE.Vector3 | null = null;
    let isTargetPlayer = false;

    // 1. Percepção Tática com FOV de 90° e Linha de Visão Real contra Paredes e Fumaça
    if (!bot.isAlly) {
      const distToPlayer = bPos.distanceTo(playerPos);
      if (
        distToPlayer <= nav.visionRange &&
        isTargetInFieldOfView(bPos, bot.root.rotation.y, playerPos, nav.fieldOfView)
      ) {
        _targetEye.set(playerPos.x, playerPos.y + 1.35, playerPos.z);
        if (
          checkBotLineOfSight(
            _botHead,
            _targetEye,
            grenadeSystem,
            colliders,
            activeGlbCollider
          )
        ) {
          targetEnemyPos = playerPos;
          isTargetPlayer = true;
          nav.lastKnownPos = playerPos.clone();
        }
      }
    } else {
      let nearestDist = nav.visionRange;
      for (let j = 0; j < bots.length; j++) {
        const other = bots[j];
        if (!other.isDown && !other.isAlly) {
          const oPos = other.root.position;
          const d = bPos.distanceTo(oPos);
          if (
            d < nearestDist &&
            isTargetInFieldOfView(bPos, bot.root.rotation.y, oPos, nav.fieldOfView)
          ) {
            _targetEye.set(oPos.x, oPos.y + 1.4, oPos.z);
            if (
              checkBotLineOfSight(
                _botHead,
                _targetEye,
                grenadeSystem,
                colliders,
                activeGlbCollider
              )
            ) {
              nearestDist = d;
              targetEnemyPos = oPos;
              nav.lastKnownPos = oPos.clone();
            }
          }
        }
      }
    }

    // 2. Máquina de Estados Tática (FSM)
    if (isC4Planted && !bot.isAlly) {
      if (bPos.distanceTo(plantedSitePos) <= 2.4) {
        nav.tacticalState = 'DEFUSING';
        bot.isTelegraphing = false;
        nav.plantOrDefuseTimer += dt;
        if (nav.plantOrDefuseTimer >= 4.8) {
          nav.plantOrDefuseTimer = 0;
          yardBomb.info.bombStatus = 'DEFUSED';
          soundEngine.playMechanicalSwitch(1.6);
          yardBomb.finishCurrentRound(
            'BLACKTHORN',
            'BOMBA C4 DESARMADA PELA BLACKTHORN!',
            () => {}
          );
        }
      } else {
        nav.tacticalState = 'RUSH_PLANTED';
        bot.isTelegraphing = false;
      }
    } else if (targetEnemyPos) {
      nav.tacticalState = 'COMBAT';
      bot.isTelegraphing = true;
    } else if (nav.tacticalState === 'COMBAT') {
      nav.tacticalState = 'INVESTIGATE';
      nav.investigateTimer = 0;
      bot.isTelegraphing = false;
    } else if (nav.tacticalState === 'INVESTIGATE') {
      bot.isTelegraphing = false;
      nav.investigateTimer += dt;
      if (
        !nav.lastKnownPos ||
        Math.hypot(bPos.x - nav.lastKnownPos.x, bPos.z - nav.lastKnownPos.z) < 2.0 ||
        nav.investigateTimer > 6.0
      ) {
        nav.tacticalState = 'PATROL';
        nav.lastKnownPos = null;
      }
    } else if (!isC4Planted && bot.isAlly) {
      const distSiteA = Math.hypot(bPos.x - routes.siteA.x, bPos.z - routes.siteA.z);
      const distSiteB = Math.hypot(bPos.x - routes.siteB.x, bPos.z - routes.siteB.z);
      if (
        (distSiteA <= 3.2 || distSiteB <= 3.2) &&
        yardBomb.info.bombStatus === 'CARRIED'
      ) {
        nav.tacticalState = 'PLANTING';
        bot.isTelegraphing = false;
        nav.plantOrDefuseTimer += dt;
        if (nav.plantOrDefuseTimer >= 3.2) {
          nav.plantOrDefuseTimer = 0;
          yardBomb.info.bombStatus = 'PLANTED';
          yardBomb.info.plantedSite = distSiteA <= distSiteB ? 'A' : 'B';
          soundEngine.playMechanicalSwitch(1.5);
        }
      } else {
        nav.tacticalState = 'PATROL';
        bot.isTelegraphing = false;
      }
    } else {
      nav.tacticalState = 'PATROL';
      bot.isTelegraphing = false;
    }

    // 3. Seleção de Alvo de Movimento e Velocidade
    let moveTarget: THREE.Vector3;
    let moveSpeed = 2.4;

    if (nav.tacticalState === 'RUSH_PLANTED') {
      moveTarget = plantedSitePos;
      moveSpeed = 3.4;
    } else if (nav.tacticalState === 'DEFUSING' || nav.tacticalState === 'PLANTING') {
      moveTarget = bPos;
      moveSpeed = 0;
    } else if (nav.tacticalState === 'COMBAT' && targetEnemyPos) {
      if (bPos.distanceTo(targetEnemyPos) > 6.5) {
        moveTarget = targetEnemyPos;
        moveSpeed = 3.2;
      } else {
        nav.strafeTimer += dt;
        if (nav.strafeTimer > 2.0) {
          nav.strafeDir *= -1;
          nav.strafeTimer = 0;
        }
        _navDir.subVectors(targetEnemyPos, bPos).normalize();
        _strafeTarget.set(
          bPos.x - _navDir.z * nav.strafeDir * 2.2,
          bPos.y,
          bPos.z + _navDir.x * nav.strafeDir * 2.2
        );
        moveTarget = _strafeTarget;
        moveSpeed = 1.65;
      }
    } else if (nav.tacticalState === 'INVESTIGATE' && nav.lastKnownPos) {
      moveTarget = nav.lastKnownPos;
      moveSpeed = 2.9;
    } else if (nav.waypoints.length > 0) {
      const curWp = nav.waypoints[nav.wpIndex];
      if (Math.hypot(bPos.x - curWp.x, bPos.z - curWp.z) < 1.8) {
        nav.wpIndex = (nav.wpIndex + 1) % nav.waypoints.length;
      }
      moveTarget = nav.waypoints[nav.wpIndex];
      moveSpeed = 2.4;
    } else {
      moveTarget = bPos;
      moveSpeed = 0;
    }

    // 4. Física Real: Colisão de Paredes + Gravidade no Piso
    moveBotWithPhysics(
      bot,
      nav,
      moveTarget,
      moveSpeed,
      dt,
      colliders,
      activeGlbCollider
    );

    if (nav.tacticalState === 'COMBAT' && targetEnemyPos) {
      const enemyAngle = Math.atan2(
        targetEnemyPos.x - bPos.x,
        targetEnemyPos.z - bPos.z
      );
      bot.root.rotation.y = THREE.MathUtils.damp(
        bot.root.rotation.y,
        enemyAngle,
        10,
        dt
      );
    }

    // 5. Disparo Tático e Lançamento Controlado de Granada (Máx 1 por bot elegível + Cooldown Global)
    if (nav.tacticalState === 'COMBAT' && targetEnemyPos && nav.fireCooldown <= 0) {
      nav.fireCooldown = 0.6 + Math.random() * 0.75;
      triggerBotFireAnimation(bot);

      const weapon = bot.weaponId || 'AK47_RIFLE';
      soundEngine.playGunshot(false, false, weapon);

      _botHead.set(bPos.x, bPos.y + 1.45, bPos.z);
      _targetEye.set(targetEnemyPos.x, targetEnemyPos.y + 1.35, targetEnemyPos.z);
      fxPool.spawnTracer(_botHead, _targetEye, bot.isAlly ? 0x38bdf8 : 0xef4444);

      if (isTargetPlayer) {
        const isHeadshot = Math.random() < 0.25;
        const dmg = isHeadshot ? 30 : 12;
        onDealDamageToPlayer(dmg, isHeadshot, bot);
      }

      const distToEnemy = bPos.distanceTo(targetEnemyPos);
      if (
        nav.grenadesLeft > 0 &&
        nav.grenadeCooldown <= 0 &&
        globalBotGrenadeCooldown <= 0 &&
        distToEnemy >= 9.0 &&
        distToEnemy <= 24.0 &&
        Math.random() < 0.18
      ) {
        nav.grenadesLeft -= 1;
        nav.grenadeCooldown = 35.0;
        globalBotGrenadeCooldown = 25.0;

        const isSmoke = Math.random() < 0.45;
        if (isSmoke) {
          soundEngine.playSmokeGrenadeVoice();
        } else {
          soundEngine.playFragGrenadeVoice();
        }
        soundEngine.playGrenadeThrow();

        _throwDir
          .subVectors(targetEnemyPos, _botHead)
          .normalize()
          .multiplyScalar(13.5);
        _throwDir.y += 4.8;
        grenadeSystem.spawnBotGrenade(_botHead, _throwDir, isSmoke ? 'SMOKE' : 'FRAG');
      }
    }
  }
}
