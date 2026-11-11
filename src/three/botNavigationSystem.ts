import * as THREE from 'three';
import { playRealBombPlantedVoice } from '../audio/characterAndBombAudio';
import { soundEngine } from '../audio/soundEngine';
import { playBulletSnapAndWhizz, playSpatialBotGunshot } from '../audio/spatialCombatAudio';
import { triggerTacticalRadioCallout } from '../audio/tacticalImmersionAudio';
import { DrillMode, WeaponId } from '../types/game';
import { BallisticsFXPool } from './ballisticsPool';
import { triggerBotFireAnimation, triggerBotGrenadeAnimation, triggerBotHitAnimation } from './botCharacterSystem';
import { BotNavData, checkBotLineOfSight, getMapRoutes, isTargetInFieldOfView, moveBotWithPhysics } from './botNavigationRoutes';
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
const _throwDir = new THREE.Vector3();

let globalBotGrenadeCooldown = 14.0;

function getOrInitBotNav(bot: YardBotEntity, mode: DrillMode, index: number): BotNavData {
  const existing = bot.root.userData?.navData as BotNavData | undefined;
  if (existing && existing.waypoints && existing.waypoints.length > 0) return existing;

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
    strafeTimer: 0, strafeDir: Math.random() > 0.5 ? 1 : -1, stuckTimer: 0,
    avoidAngle: 0, avoidTimer: 0, verticalVel: 0, plantOrDefuseTimer: 0,
    visionRange: 44.0, fieldOfView: 145.0,
  };
  bot.root.userData = bot.root.userData || {};
  bot.root.userData.navData = navData;
  return navData;
}

export function alertBotsToPlayerCombat(
  targets: TacticalTargetEntity[],
  playerPos: THREE.Vector3,
  hitBot?: TacticalTargetEntity | null
): void {
  for (let i = 0; i < targets.length; i++) {
    const bot = targets[i] as YardBotEntity;
    if (bot.isDown || bot.type !== 'COMBAT_BOT' || bot.isAlly) continue;
    const isDirectHit = hitBot && bot.id === hitBot.id;
    if (!isDirectHit && bot.root.position.distanceTo(playerPos) > 32.0) continue;
    const nav = bot.root.userData?.navData as BotNavData | undefined;
    if (!nav) continue;
    nav.lockedTargetId = 'PLAYER';
    nav.chaseTimer = 25.0;
    nav.lastKnownPos = playerPos.clone();
    nav.tacticalState = 'COMBAT';
    bot.isTelegraphing = true;
  }
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
    killerName: string,
    killerTeam: 'VANGUARD' | 'BLACKTHORN',
    victimName: string,
    victimTeam: 'VANGUARD' | 'BLACKTHORN',
    weaponId: WeaponId,
    isHeadshot: boolean
  ) => void
): void {
  const routes = getMapRoutes(mode);
  const isBombMode = mode === 'YARD_BOMB_5V5' || mode === 'DUST2_BOMB_5V5' || mode === 'ASSAULT_BOMB_5V5';
  const isC4Planted = isBombMode && yardBomb.info.bombStatus === 'PLANTED';
  const plantedSitePos = yardBomb.info.plantedSite === 'A' ? routes.siteA : routes.siteB;

  globalBotGrenadeCooldown = Math.max(0, globalBotGrenadeCooldown - dt);

  for (let i = 0; i < bots.length; i++) {
    const bot = bots[i];
    if (bot.isDown || bot.type !== 'COMBAT_BOT') continue;

    const nav = getOrInitBotNav(bot, mode, i);
    nav.fireCooldown = Math.max(0, nav.fireCooldown - dt);
    nav.grenadeCooldown = Math.max(0, nav.grenadeCooldown - dt);
    nav.chaseTimer = Math.max(0, nav.chaseTimer - dt);

    const bPos = bot.root.position;
    _botHead.set(bPos.x, bPos.y + 1.45, bPos.z);

    let visibleEnemyPos: THREE.Vector3 | null = null;
    let visibleEnemyBot: YardBotEntity | null = null;
    let isVisibleTargetPlayer = false;
    let nearestDist = nav.visionRange;

    const activeFov = nav.chaseTimer > 0 || nav.tacticalState === 'COMBAT' ? 360 : nav.fieldOfView;

    // 1. Percepção Visual Direta (Contra Jogador Vivo e Bots Adversários)
    if (!bot.isAlly && playerAlive) {
      const distToPlayer = bPos.distanceTo(playerPos);
      if (distToPlayer <= nearestDist && isTargetInFieldOfView(bPos, bot.root.rotation.y, playerPos, activeFov)) {
        _targetEye.set(playerPos.x, playerPos.y + 1.35, playerPos.z);
        if (checkBotLineOfSight(_botHead, _targetEye, grenadeSystem, colliders, activeGlbCollider)) {
          nearestDist = distToPlayer;
          visibleEnemyPos = playerPos;
          isVisibleTargetPlayer = true;
          nav.lockedTargetId = 'PLAYER';
          nav.chaseTimer = 24.0;
          nav.lastKnownPos = playerPos.clone();
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
          nav.lastKnownPos = oPos.clone();
        }
      }
    }

    // 1.5. Trava de Caçada Implacável (Persegue o inimigo até matar ou morrer!)
    let chasedTargetPos: THREE.Vector3 | null = visibleEnemyPos;
    if (!chasedTargetPos && nav.lockedTargetId && nav.chaseTimer > 0) {
      if (nav.lockedTargetId === 'PLAYER') {
        if (playerAlive) {
          if (!nav.lastKnownPos) nav.lastKnownPos = playerPos.clone();
          else nav.lastKnownPos.copy(playerPos);
          chasedTargetPos = nav.lastKnownPos;
        } else {
          nav.lockedTargetId = null;
          nav.chaseTimer = 0;
        }
      } else {
        const lockedBot = bots.find((b) => b.id === nav.lockedTargetId);
        if (lockedBot && !lockedBot.isDown) {
          if (!nav.lastKnownPos) nav.lastKnownPos = lockedBot.root.position.clone();
          else nav.lastKnownPos.copy(lockedBot.root.position);
          chasedTargetPos = nav.lastKnownPos;
        } else {
          nav.lockedTargetId = null;
          nav.chaseTimer = 0;
        }
      }
    }

    if (!isBombMode && !bot.isAlly && playerAlive && !chasedTargetPos) {
      nav.lockedTargetId = 'PLAYER';
      nav.chaseTimer = 30.0;
      if (!nav.lastKnownPos) nav.lastKnownPos = playerPos.clone();
      else nav.lastKnownPos.copy(playerPos);
      chasedTargetPos = nav.lastKnownPos;
    }

    // 2. Máquina de Estados Tática (FSM)
    let lockLookAtTarget: THREE.Vector3 | null = null;

    if (isC4Planted && !bot.isAlly) {
      if (bPos.distanceTo(plantedSitePos) <= 2.4 && !visibleEnemyPos) {
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
        bot.isTelegraphing = Boolean(chasedTargetPos);
        lockLookAtTarget = chasedTargetPos;
      }
    } else if (visibleEnemyPos) {
      if (nav.tacticalState !== 'COMBAT' && bot.isAlly) triggerTacticalRadioCallout('ENEMY_SPOTTED');
      nav.tacticalState = 'COMBAT';
      bot.isTelegraphing = true;
      lockLookAtTarget = visibleEnemyPos;
    } else if (chasedTargetPos) {
      nav.tacticalState = 'INVESTIGATE';
      bot.isTelegraphing = true;
      lockLookAtTarget = chasedTargetPos;
    } else if (isBombMode && !isC4Planted && bot.isAlly) {
      const distSiteA = Math.hypot(bPos.x - routes.siteA.x, bPos.z - routes.siteA.z);
      const distSiteB = Math.hypot(bPos.x - routes.siteB.x, bPos.z - routes.siteB.z);
      if ((distSiteA <= 3.2 || distSiteB <= 3.2) && yardBomb.info.bombStatus === 'CARRIED') {
        if (nav.tacticalState !== 'PLANTING') triggerTacticalRadioCallout('PLANTING_C4');
        nav.tacticalState = 'PLANTING';
        bot.isTelegraphing = false;
        nav.plantOrDefuseTimer += dt;
        if (nav.plantOrDefuseTimer >= 3.2) {
          nav.plantOrDefuseTimer = 0;
          yardBomb.info.bombStatus = 'PLANTED';
          yardBomb.info.plantedSite = distSiteA <= distSiteB ? 'A' : 'B';
          soundEngine.playMechanicalSwitch(1.5);
          playRealBombPlantedVoice();
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
    let moveSpeed = 3.85;

    if (nav.tacticalState === 'RUSH_PLANTED') {
      moveTarget = plantedSitePos;
      moveSpeed = 4.45;
    } else if (nav.tacticalState === 'DEFUSING' || nav.tacticalState === 'PLANTING') {
      moveTarget = bPos;
      moveSpeed = 0;
    } else if (nav.tacticalState === 'COMBAT' && visibleEnemyPos) {
      const distToEnemy = bPos.distanceTo(visibleEnemyPos);
      const isSniperBot = bot.weaponId === 'SNIPER_BOLT' || bot.weaponId === 'SNIPER_TACTICAL';
      const idealDist = isSniperBot ? 15.0 : 4.6;

      nav.strafeTimer += dt;
      if (nav.strafeTimer > 2.2) {
        nav.strafeDir *= -1;
        nav.strafeTimer = 0;
      }

      _navDir.subVectors(visibleEnemyPos, bPos);
      _navDir.y = 0;
      if (_navDir.lengthSq() > 0.001) _navDir.normalize();

      if (distToEnemy > idealDist) {
        const sideX = -_navDir.z * nav.strafeDir * 0.22;
        const sideZ = _navDir.x * nav.strafeDir * 0.22;
        _combatMoveGoal.set(visibleEnemyPos.x + sideX * 3.0, bPos.y, visibleEnemyPos.z + sideZ * 3.0);
        moveTarget = _combatMoveGoal;
        moveSpeed = distToEnemy > 10.0 ? 4.2 : 3.65;
      } else {
        _combatMoveGoal.set(
          bPos.x - _navDir.z * nav.strafeDir * 1.6 + _navDir.x * 0.6,
          bPos.y,
          bPos.z + _navDir.x * nav.strafeDir * 1.6 + _navDir.z * 0.6
        );
        moveTarget = _combatMoveGoal;
        moveSpeed = 2.15;
      }
    } else if (nav.tacticalState === 'INVESTIGATE' && chasedTargetPos) {
      moveTarget = chasedTargetPos;
      moveSpeed = 4.3;
    } else if (nav.waypoints.length > 0) {
      const curWp = nav.waypoints[nav.wpIndex];
      if (Math.hypot(bPos.x - curWp.x, bPos.z - curWp.z) < 2.2) {
        const minLoopIdx = bot.isAlly ? Math.min(2, nav.waypoints.length - 1) : 1;
        nav.wpIndex = nav.wpIndex + 1 >= nav.waypoints.length ? minLoopIdx : nav.wpIndex + 1;
      }
      moveTarget = nav.waypoints[nav.wpIndex];
      moveSpeed = 3.9;
    } else {
      moveTarget = bPos;
      moveSpeed = 0;
    }

    // 4. Física Real com Desvio de Paredes e Orientação Travada no Inimigo
    moveBotWithPhysics(bot, nav, moveTarget, moveSpeed, dt, colliders, activeGlbCollider, lockLookAtTarget);

    // 5. Rajadas Automáticas para Rifles vs Tiro Único Letal para Sniper
    const weapon = bot.weaponId || 'AK47_RIFLE';
    const isSniper = weapon === 'SNIPER_BOLT' || weapon === 'SNIPER_TACTICAL';

    if (nav.tacticalState === 'COMBAT' && visibleEnemyPos) {
      if (nav.burstShotsLeft <= 0 && nav.fireCooldown <= 0) {
        nav.burstShotsLeft = isSniper ? 1 : 3 + Math.floor(Math.random() * 3);
        nav.burstShotTimer = 0;
        nav.fireCooldown = isSniper ? 1.55 + Math.random() * 0.55 : 0.52 + Math.random() * 0.45;
      }

      if (nav.burstShotsLeft > 0) {
        nav.burstShotTimer -= dt;
        if (nav.burstShotTimer <= 0) {
          nav.burstShotsLeft -= 1;
          nav.burstShotTimer = isSniper ? 0.48 : 0.092 + Math.random() * 0.02;

          triggerBotFireAnimation(bot);
          _botHead.set(bPos.x, bPos.y + 1.45, bPos.z);
          _targetEye.set(
            visibleEnemyPos.x + (Math.random() - 0.5) * (isSniper ? 0.08 : 0.25),
            visibleEnemyPos.y + 1.32 + (Math.random() - 0.5) * 0.16,
            visibleEnemyPos.z + (Math.random() - 0.5) * (isSniper ? 0.08 : 0.25)
          );

          playSpatialBotGunshot(_botHead, playerPos, playerYaw, weapon, !isVisibleTargetPlayer);
          if (!bot.isAlly) playBulletSnapAndWhizz(_botHead, _targetEye, playerPos, playerYaw);
          fxPool.spawnTracer(_botHead, _targetEye, bot.isAlly ? 0x38bdf8 : 0xef4444);

          if (isVisibleTargetPlayer && playerAlive) {
            const hitChance = isSniper ? 0.62 : 0.38;
            if (Math.random() < hitChance) {
              const isHeadshot = Math.random() < 0.22;
              const dmg = isSniper ? (isHeadshot ? 85 : 52) : isHeadshot ? 22 : 10;
              onDealDamageToPlayer(dmg, isHeadshot, bot);
            }
          } else if (visibleEnemyBot && !visibleEnemyBot.isDown) {
            const hitChance = isSniper ? 0.58 : 0.36;
            if (Math.random() < hitChance) {
              const isHeadshot = Math.random() < 0.26;
              const dmg = isSniper ? (isHeadshot ? 110 : 75) : isHeadshot ? 42 : 22;
              visibleEnemyBot.health -= dmg;
              visibleEnemyBot.hitTiltVelocity = -12.0;
              triggerBotHitAnimation(visibleEnemyBot);
              const victimNav = visibleEnemyBot.root.userData?.navData as BotNavData | undefined;
              if (victimNav && !victimNav.lockedTargetId) {
                victimNav.lockedTargetId = bot.id;
                victimNav.chaseTimer = 20.0;
                victimNav.lastKnownPos = bPos.clone();
              }
              if (visibleEnemyBot.health <= 0) {
                visibleEnemyBot.isDown = true;
                visibleEnemyBot.downTimer = 9999;
                onRegisterKill?.(
                  bot.callsign || (bot.isAlly ? 'RECON-02' : 'KRAKEN-BT'),
                  bot.isAlly ? 'VANGUARD' : 'BLACKTHORN',
                  visibleEnemyBot.callsign || (visibleEnemyBot.isAlly ? 'RECON-02' : 'KRAKEN-BT'),
                  visibleEnemyBot.isAlly ? 'VANGUARD' : 'BLACKTHORN',
                  weapon,
                  isHeadshot
                );
              }
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
