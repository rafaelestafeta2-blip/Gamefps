import * as THREE from 'three';
import { soundEngine } from '../audio/soundEngine';
import { DrillMode } from '../types/game';
import { BallisticsFXPool } from './ballisticsPool';
import { triggerBotFireAnimation } from './botCharacterSystem';
import { TacticalGrenadeSystem } from './grenadeSystem';
import { ColliderBox } from './levelBuilder';
import { YardBombSystem } from './yardBombSystem';
import { YardBotEntity } from './yardPropsBuilder';

export interface BotNavData {
  waypoints: THREE.Vector3[];
  wpIndex: number;
  tacticalState: 'PATROL' | 'INVESTIGATE' | 'COMBAT' | 'RUSH_PLANTED' | 'PLANTING' | 'DEFUSING';
  lastKnownPos: THREE.Vector3 | null;
  investigateTimer: number;
  fireCooldown: number;
  grenadeCooldown: number;
  strafeTimer: number;
  strafeDir: number;
  plantOrDefuseTimer: number;
  visionRange: number;
  fieldOfView: number;
}

const _navDir = new THREE.Vector3();
const _botHead = new THREE.Vector3();
const _targetEye = new THREE.Vector3();

// Rotas táticas de waypoints para os mapas 5v5 (Dust2, Assault, Yard)
function getMapRoutes(mode: DrillMode) {
  if (mode === 'DUST2_BOMB_5V5') {
    return {
      vgA: [new THREE.Vector3(12, 0.4, 38), new THREE.Vector3(22, 0.4, 20), new THREE.Vector3(24, 0.4, 2), new THREE.Vector3(22, 0.4, -14)],
      vgB: [new THREE.Vector3(-8, 0.4, 36), new THREE.Vector3(-18, 0.4, 18), new THREE.Vector3(-24, 0.4, 0), new THREE.Vector3(-26, 0.4, -12)],
      vgMid: [new THREE.Vector3(2, 0.4, 32), new THREE.Vector3(0, 0.4, 12), new THREE.Vector3(6, 0.4, -4), new THREE.Vector3(20, 0.4, -12)],
      btA: [new THREE.Vector3(20, 0.4, -20), new THREE.Vector3(22, 0.4, -14), new THREE.Vector3(25, 0.4, -8), new THREE.Vector3(22, 0.4, -14)],
      btB: [new THREE.Vector3(-22, 0.4, -22), new THREE.Vector3(-26, 0.4, -12), new THREE.Vector3(-22, 0.4, -6), new THREE.Vector3(-26, 0.4, -12)],
      btMid: [new THREE.Vector3(0, 0.4, -18), new THREE.Vector3(2, 0.4, -6), new THREE.Vector3(-4, 0.4, 4), new THREE.Vector3(0, 0.4, -12)],
      siteA: new THREE.Vector3(22, 0.4, -14),
      siteB: new THREE.Vector3(-26, 0.4, -12),
    };
  }

  if (mode === 'ASSAULT_BOMB_5V5') {
    return {
      vgA: [new THREE.Vector3(-6, 0, 32), new THREE.Vector3(-14, 0, 16), new THREE.Vector3(-18, 0, 0), new THREE.Vector3(-12, 0, -8)],
      vgB: [new THREE.Vector3(8, 0, 32), new THREE.Vector3(16, 0, 18), new THREE.Vector3(18, 0, 2), new THREE.Vector3(10, 0, -6)],
      vgMid: [new THREE.Vector3(0, 0, 28), new THREE.Vector3(2, 0, 12), new THREE.Vector3(-2, 0, 0), new THREE.Vector3(0, 0, -10)],
      btA: [new THREE.Vector3(-14, 0, -14), new THREE.Vector3(-12, 0, -8), new THREE.Vector3(-16, 0, -4), new THREE.Vector3(-12, 0, -8)],
      btB: [new THREE.Vector3(12, 0, -14), new THREE.Vector3(10, 0, -6), new THREE.Vector3(14, 0, -2), new THREE.Vector3(10, 0, -6)],
      btMid: [new THREE.Vector3(0, 0, -16), new THREE.Vector3(-2, 0, -6), new THREE.Vector3(4, 0, 2), new THREE.Vector3(0, 0, -8)],
      siteA: new THREE.Vector3(-12, 0, -8),
      siteB: new THREE.Vector3(10, 0, -6),
    };
  }

  // YARD_BOMB_5V5
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

/**
 * Verificação de campo de visão (FOV cone de 90 graus) e percepção de passos próximos.
 */
function isTargetInFieldOfView(botPos: THREE.Vector3, botYaw: number, targetPos: THREE.Vector3, fovDegrees = 90): boolean {
  const dx = targetPos.x - botPos.x;
  const dz = targetPos.z - botPos.z;
  const distSq = dx * dx + dz * dz;

  // Passo/presença tática próxima (< 4.8m) é detectada independentemente da orientação
  if (distSq < 23.04) return true;

  const dist = Math.sqrt(distSq);
  if (dist < 0.001) return true;

  const fwdX = Math.sin(botYaw);
  const fwdZ = Math.cos(botYaw);
  const dot = (fwdX * dx + fwdZ * dz) / dist;
  const minDot = Math.cos(THREE.MathUtils.degToRad(fovDegrees * 0.5));
  return dot >= minDot;
}

/**
 * Verificação de linha de visão (Raycast contra caixas de colisão de paredes do mapa).
 */
function checkLineOfSight(from: THREE.Vector3, to: THREE.Vector3, colliders?: ColliderBox[]): boolean {
  if (!colliders || colliders.length === 0) return true;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  if (Math.hypot(dx, dy, dz) < 0.001) return true;

  const invX = 1 / (dx || 0.000001);
  const invY = 1 / (dy || 0.000001);
  const invZ = 1 / (dz || 0.000001);

  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (c.maxY - c.minY < 0.8) continue; // Pula pisos finos

    const t1 = (c.minX - from.x) * invX;
    const t2 = (c.maxX - from.x) * invX;
    const t3 = (c.minY - from.y) * invY;
    const t4 = (c.maxY - from.y) * invY;
    const t5 = (c.minZ - from.z) * invZ;
    const t6 = (c.maxZ - from.z) * invZ;

    const tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
    const tmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));

    if (tmax >= tmin && tmin >= 0 && tmin <= 1) {
      return false; // Linha de visão bloqueada por parede
    }
  }
  return true;
}

function getOrInitBotNav(bot: YardBotEntity, mode: DrillMode, index: number): BotNavData {
  if (bot.root.userData?.navData) {
    return bot.root.userData.navData as BotNavData;
  }

  const routes = getMapRoutes(mode);
  let waypoints: THREE.Vector3[];

  if (bot.isAlly) {
    const laneChoice = index % 3;
    waypoints = laneChoice === 0 ? routes.vgA : laneChoice === 1 ? routes.vgB : routes.vgMid;
  } else {
    const laneChoice = index % 3;
    waypoints = laneChoice === 0 ? routes.btA : laneChoice === 1 ? routes.btB : routes.btMid;
  }

  const navData: BotNavData = {
    waypoints: waypoints.map((p) => p.clone()),
    wpIndex: 0,
    tacticalState: 'PATROL',
    lastKnownPos: null,
    investigateTimer: 0,
    fireCooldown: 0.7 + Math.random() * 1.0,
    grenadeCooldown: 5.0 + Math.random() * 8.0,
    strafeTimer: 0,
    strafeDir: Math.random() > 0.5 ? 1 : -1,
    plantOrDefuseTimer: 0,
    visionRange: 30.0,
    fieldOfView: 90.0,
  };

  bot.root.userData = bot.root.userData || {};
  bot.root.userData.navData = navData;
  return navData;
}

/**
 * Sistema ProBotAI:
 * - FSM: PATROL -> INVESTIGATE -> COMBAT -> RUSH_PLANTED / DEFUSING / PLANTING
 * - Percepção: visionRange (30m), FOV (90°), detecção por passos próximos e linha de visão (LoS)
 * - Combate: > 6.0m avança em corrida tática; <= 6.0m strafe lateral evasivo a cada 2.0s enquanto dispara
 * - Investigação: perseguição até a última posição conhecida ao perder linha de visão
 */
export function updateSmartBotNavigation(
  bots: YardBotEntity[],
  mode: DrillMode,
  playerPos: THREE.Vector3,
  dt: number,
  yardBomb: YardBombSystem,
  fxPool: BallisticsFXPool,
  grenadeSystem: TacticalGrenadeSystem,
  onDealDamageToPlayer: (dmg: number, isHeadshot: boolean, bot: YardBotEntity) => void,
  colliders?: ColliderBox[]
): void {
  const routes = getMapRoutes(mode);
  const isC4Planted = yardBomb.info.bombStatus === 'PLANTED';
  const plantedSitePos = yardBomb.info.plantedSite === 'A' ? routes.siteA : routes.siteB;

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

    // 1. Percepção Tática com FOV de 90° e Linha de Visão Real (LoS)
    if (!bot.isAlly) {
      const distToPlayer = bPos.distanceTo(playerPos);
      if (distToPlayer <= nav.visionRange) {
        if (isTargetInFieldOfView(bPos, bot.root.rotation.y, playerPos, nav.fieldOfView)) {
          _targetEye.set(playerPos.x, playerPos.y + 1.35, playerPos.z);
          if (checkLineOfSight(_botHead, _targetEye, colliders)) {
            targetEnemyPos = playerPos;
            isTargetPlayer = true;
            nav.lastKnownPos = playerPos.clone();
          }
        }
      }
    } else {
      let nearestDist = nav.visionRange;
      for (let j = 0; j < bots.length; j++) {
        const other = bots[j];
        if (!other.isDown && !other.isAlly) {
          const oPos = other.root.position;
          const d = bPos.distanceTo(oPos);
          if (d < nearestDist && isTargetInFieldOfView(bPos, bot.root.rotation.y, oPos, nav.fieldOfView)) {
            _targetEye.set(oPos.x, oPos.y + 1.4, oPos.z);
            if (checkLineOfSight(_botHead, _targetEye, colliders)) {
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
      const distToC4 = bPos.distanceTo(plantedSitePos);
      if (distToC4 <= 2.2) {
        nav.tacticalState = 'DEFUSING';
        bot.isTelegraphing = false;
        nav.plantOrDefuseTimer += dt;
        if (nav.plantOrDefuseTimer >= 4.8) {
          nav.plantOrDefuseTimer = 0;
          yardBomb.info.bombStatus = 'DEFUSED';
          soundEngine.playMechanicalSwitch(1.6);
          yardBomb.finishCurrentRound('BLACKTHORN', 'BOMBA C4 DESARMADA PELA BLACKTHORN!', () => {});
        }
      } else {
        nav.tacticalState = 'RUSH_PLANTED';
        bot.isTelegraphing = false;
      }
    } else if (targetEnemyPos) {
      nav.tacticalState = 'COMBAT';
      bot.isTelegraphing = true;
    } else if (nav.tacticalState === 'COMBAT') {
      // Perdeu o alvo de vista -> transiciona para INVESTIGATE na última posição conhecida
      nav.tacticalState = 'INVESTIGATE';
      nav.investigateTimer = 0;
      bot.isTelegraphing = false;
    } else if (nav.tacticalState === 'INVESTIGATE') {
      bot.isTelegraphing = false;
      nav.investigateTimer += dt;
      if (!nav.lastKnownPos || bPos.distanceTo(nav.lastKnownPos) < 2.0 || nav.investigateTimer > 6.0) {
        // Investigação concluída sem avistar o inimigo -> retorna à patrulha
        nav.tacticalState = 'PATROL';
        nav.lastKnownPos = null;
      }
    } else if (!isC4Planted && bot.isAlly) {
      const distSiteA = bPos.distanceTo(routes.siteA);
      const distSiteB = bPos.distanceTo(routes.siteB);
      if ((distSiteA <= 3.2 || distSiteB <= 3.2) && yardBomb.info.bombStatus === 'CARRIED') {
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

    // 3. Execução de Movimentação e Comportamento Tático
    let moveTarget: THREE.Vector3;
    let moveSpeed = 2.4; // Velocidade base de caminhada (RIFLE_WALK)

    if (nav.tacticalState === 'RUSH_PLANTED') {
      moveTarget = plantedSitePos;
      moveSpeed = 3.4; // Sprint de urgência (RIFLE_RUN)
    } else if (nav.tacticalState === 'DEFUSING' || nav.tacticalState === 'PLANTING') {
      moveTarget = bPos;
      moveSpeed = 0;
    } else if (nav.tacticalState === 'COMBAT' && targetEnemyPos) {
      const distToEnemy = bPos.distanceTo(targetEnemyPos);
      if (distToEnemy > 6.0) {
        // Se estiver longe (> 6m), avança em corrida na direção do inimigo
        moveTarget = targetEnemyPos;
        moveSpeed = 3.4; // Ativa RIFLE_RUN
      } else {
        // Se estiver a <= 6m, realiza strafe lateral evasivo a cada 2.0s enquanto atira
        nav.strafeTimer += dt;
        if (nav.strafeTimer > 2.0) {
          strafeDirectionInvert(nav);
        }
        _navDir.subVectors(targetEnemyPos, bPos).normalize();
        const perpX = -_navDir.z * nav.strafeDir * 2.2;
        const perpZ = _navDir.x * nav.strafeDir * 2.2;
        moveTarget = new THREE.Vector3(bPos.x + perpX, bPos.y, bPos.z + perpZ);
        moveSpeed = 1.6;
      }
    } else if (nav.tacticalState === 'INVESTIGATE' && nav.lastKnownPos) {
      // Corre para averiguar o último ponto onde o inimigo foi visto
      moveTarget = nav.lastKnownPos;
      moveSpeed = 3.0; // Ativa RIFLE_RUN durante investigação
    } else {
      // Patrulha normal pelo percurso do mapa
      if (nav.waypoints.length > 0) {
        const curWp = nav.waypoints[nav.wpIndex];
        if (Math.hypot(bPos.x - curWp.x, bPos.z - curWp.z) < 1.6) {
          nav.wpIndex = (nav.wpIndex + 1) % nav.waypoints.length;
        }
        moveTarget = nav.waypoints[nav.wpIndex];
        moveSpeed = 2.4;
      } else {
        moveTarget = bPos;
        moveSpeed = 0;
      }
    }

    // 4. Atualização de Posição e Rotação Suave do Bot
    if (moveSpeed > 0.05) {
      _navDir.subVectors(moveTarget, bPos);
      _navDir.y = 0;
      const dist = _navDir.length();
      if (dist > 0.1) {
        _navDir.normalize();
        const step = Math.min(dist, moveSpeed * dt);
        bot.root.position.x += _navDir.x * step;
        bot.root.position.z += _navDir.z * step;

        const lookAngle = Math.atan2(_navDir.x, _navDir.z);
        bot.root.rotation.y = THREE.MathUtils.damp(bot.root.rotation.y, lookAngle, 8.5, dt);
      }
    }

    // Mira voltada diretamente para o inimigo quando em combate
    if (nav.tacticalState === 'COMBAT' && targetEnemyPos) {
      const enemyAngle = Math.atan2(targetEnemyPos.x - bPos.x, targetEnemyPos.z - bPos.z);
      bot.root.rotation.y = THREE.MathUtils.damp(bot.root.rotation.y, enemyAngle, 10, dt);
    }

    // 5. Disparo Tático com Som Real da Arma e Muzzle Flash
    if (nav.tacticalState === 'COMBAT' && targetEnemyPos && nav.fireCooldown <= 0) {
      nav.fireCooldown = 0.55 + Math.random() * 0.75;
      triggerBotFireAnimation(bot);

      const weapon = bot.weaponId || 'AK47_RIFLE';
      soundEngine.playGunshot(false, false, weapon);

      _botHead.set(bPos.x, bPos.y + 1.45, bPos.z);
      _targetEye.set(targetEnemyPos.x, targetEnemyPos.y + 1.35, targetEnemyPos.z);
      fxPool.spawnTracer(_botHead, _targetEye, bot.isAlly ? 0x38bdf8 : 0xef4444);

      if (isTargetPlayer) {
        const isHeadshot = Math.random() < 0.28;
        const dmg = isHeadshot ? 34 : 14;
        onDealDamageToPlayer(dmg, isHeadshot, bot);
      }

      // Lançamento Tático de Granadas
      if (nav.grenadeCooldown <= 0 && Math.random() < 0.35) {
        nav.grenadeCooldown = 16.0 + Math.random() * 12.0;
        const isSmoke = Math.random() < 0.45;
        if (isSmoke) {
          soundEngine.playSmokeGrenadeVoice();
        } else {
          soundEngine.playFragGrenadeVoice();
        }
        soundEngine.playGrenadeThrow();

        const throwDir = new THREE.Vector3().subVectors(targetEnemyPos, _botHead).normalize();
        const throwImpulse = throwDir.multiplyScalar(14).add(new THREE.Vector3(0, 5.5, 0));
        grenadeSystem.spawnBotGrenade(_botHead, throwImpulse, isSmoke ? 'SMOKE' : 'FRAG');
      }
    }
  }
}

// Inversão de strafe lateral a cada ciclo de evasão
function strafeDirectionInvert(nav: BotNavData): void {
  nav.strafeDir *= -1;
  nav.strafeTimer = 0;
}
