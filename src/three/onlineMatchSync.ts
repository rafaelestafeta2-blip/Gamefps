import * as THREE from 'three';
import { DrillMode, WeaponId } from '../types/game';
import { YardBotEntity } from './yardPropsBuilder';
import { triggerBotFireAnimation } from './botCharacterSystem';
import { YardBombSystem } from './yardBombSystem';
import { playSpatialBotGunshot } from '../audio/spatialCombatAudio';
import {
  getActiveOnlineRoom,
  getLocalOnlinePlayerState,
  publishLocalPlayerTransform,
} from '../multiplayer/onlineRoomService';
import { getTeamSpawnForArena, OnlinePlayerState } from '../multiplayer/onlineTypes';

export interface OnlineMatchSyncContext {
  dt: number;
  targets: YardBotEntity[];
  shootableMeshes: THREE.Object3D[];
  playerPos: THREE.Vector3;
  yaw: number;
  pitch: number;
  activeWeapon: WeaponId;
  health: number;
  isPlayerDead: boolean;
  isCrouching: boolean;
  isFiring: boolean;
  yardBombSystem: YardBombSystem;
  isBombMode: boolean;
  getGroundHeight: (x: number, y: number, z: number) => number;
}

const lastRemoteShotSeenMap: Record<string, number> = {};

function lerpAngleRadians(current: number, target: number, alpha: number): number {
  let diff = target - current;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return current + diff * Math.min(1, Math.max(0, alpha));
}

function syncShootableHitboxes(
  bot: YardBotEntity,
  shootableMeshes: THREE.Object3D[],
  shouldBeShootable: boolean
): void {
  const hitboxes = [bot.headMesh, bot.torsoMesh, bot.armorMesh].filter(Boolean) as THREE.Object3D[];
  for (const mesh of hitboxes) {
    mesh.userData.targetId = bot.id;
    const idx = shootableMeshes.indexOf(mesh);
    if (shouldBeShootable && idx === -1) {
      shootableMeshes.push(mesh);
    } else if (!shouldBeShootable && idx !== -1) {
      shootableMeshes.splice(idx, 1);
    }
  }
}

export function applyOnlineTeamSpawnToLocalPlayer(
  mode: DrillMode,
  playerPos: THREE.Vector3,
  getGroundHeight: (x: number, y: number, z: number) => number
): { yaw: number } | null {
  const room = getActiveOnlineRoom();
  const localPlayer = getLocalOnlinePlayerState();
  if (!room || !localPlayer) return null;

  const teamMembers = Object.values(room.players)
    .filter((p) => p.team === localPlayer.team)
    .sort((a, b) => a.uid.localeCompare(b.uid));
  const slotIndex = Math.max(
    0,
    teamMembers.findIndex((p) => p.uid === localPlayer.uid)
  );

  const spawn = getTeamSpawnForArena(mode, localPlayer.team, slotIndex);
  const groundY = getGroundHeight(spawn.x, spawn.y, spawn.z);
  playerPos.set(spawn.x, groundY, spawn.z);
  return { yaw: spawn.yaw };
}

export function hideAllBotsForOnlineMatch(
  targets: YardBotEntity[],
  shootableMeshes: THREE.Object3D[]
): void {
  for (const bot of targets) {
    bot.isDown = true;
    bot.health = 0;
    bot.root.visible = false;
    bot.root.position.set(0, -999, 0);
    delete bot.root.userData.remotePlayerUid;
    syncShootableHitboxes(bot, shootableMeshes, false);
  }
}

export function enforceUnusedBotVisibility(targets: YardBotEntity[]): void {
  for (const bot of targets) {
    if (!bot.root.userData?.remotePlayerUid) {
      bot.root.visible = false;
      bot.isDown = true;
      bot.root.position.set(0, -999, 0);
    }
  }
}

export function syncOnlineMatchFrame(ctx: OnlineMatchSyncContext): void {
  const room = getActiveOnlineRoom();
  const localPlayer = getLocalOnlinePlayerState();
  if (!room || !localPlayer) return;

  // 1. Publish local player transform over WebSocket (throttled in combatNetcode)
  publishLocalPlayerTransform({
    x: ctx.playerPos.x,
    y: ctx.playerPos.y,
    z: ctx.playerPos.z,
    yaw: ctx.yaw,
    pitch: ctx.pitch,
    weaponId: ctx.activeWeapon,
    health: Math.max(0, Math.round(ctx.health)),
    isDown: ctx.isPlayerDead || ctx.health <= 0,
    isCrouching: ctx.isCrouching,
    isFiring: ctx.isFiring,
  });

  // 2. Collect real remote players (strictly human players, ZERO AI bots)
  const remotePlayers: OnlinePlayerState[] = Object.values(room.players)
    .filter((p) => p.uid !== localPlayer.uid)
    .sort((a, b) => a.uid.localeCompare(b.uid));

  let alliesAlive = ctx.isPlayerDead ? 0 : 1;
  let enemiesAlive = 0;

  // 3. Bind each remote player to a pre-allocated 3D World Model slot
  for (let i = 0; i < ctx.targets.length; i++) {
    const bot = ctx.targets[i];
    const remote = remotePlayers[i];

    if (!remote) {
      bot.isDown = true;
      bot.health = 0;
      bot.root.visible = false;
      bot.root.position.set(0, -999, 0);
      delete bot.root.userData.remotePlayerUid;
      syncShootableHitboxes(bot, ctx.shootableMeshes, false);
      continue;
    }

    const isSameTeam = remote.team === localPlayer.team;
    if (!remote.isDown && remote.health > 0) {
      if (isSameTeam) alliesAlive++;
      else enemiesAlive++;
    }

    bot.root.userData.remotePlayerUid = remote.uid;
    bot.callsign = remote.callsign;
    bot.weaponId = remote.weaponId || 'M4_CARBINE';
    bot.isAlly = isSameTeam;
    bot.health = remote.health;
    bot.maxHealth = 100;
    bot.isDown = remote.isDown || remote.health <= 0;
    bot.isTelegraphing = true;

    // Only enemy real players can be shot by local raycasts
    syncShootableHitboxes(bot, ctx.shootableMeshes, !isSameTeam && !bot.isDown);

    if (bot.isDown) {
      continue;
    }

    bot.root.visible = true;

    const targetGroundY = ctx.getGroundHeight(remote.x, remote.y, remote.z);
    const dx = remote.x - bot.root.position.x;
    const dz = remote.z - bot.root.position.z;
    const planarDistSq = dx * dx + dz * dz;

    if (planarDistSq > 64 || bot.root.position.y < -100) {
      bot.root.position.set(remote.x, targetGroundY, remote.z);
    } else {
      const interpAlpha = Math.min(1, ctx.dt * 14);
      bot.root.position.x += dx * interpAlpha;
      bot.root.position.z += dz * interpAlpha;
      bot.root.position.y += (targetGroundY - bot.root.position.y) * interpAlpha;
    }

    const targetModelYaw = remote.yaw + Math.PI;
    bot.root.rotation.y = lerpAngleRadians(bot.root.rotation.y, targetModelYaw, ctx.dt * 15);
    bot.root.rotation.x = 0;
    bot.root.rotation.z = 0;

    if (bot.root.userData?.botAnimCtrl) {
      bot.root.userData.botAnimCtrl.crouchStance = remote.isCrouching;
    }

    // Trigger remote gunshot animation & spatial 3D audio
    const prevShotAt = lastRemoteShotSeenMap[remote.uid] || 0;
    if (remote.lastShotAtMs > prevShotAt) {
      lastRemoteShotSeenMap[remote.uid] = remote.lastShotAtMs;
      triggerBotFireAnimation(bot);
      playSpatialBotGunshot(
        bot.root.position,
        ctx.playerPos,
        ctx.yaw,
        remote.weaponId || 'M4_CARBINE',
        false
      );
    }
  }

  // 4. Sync 5v5 HUD scoreboard and bomb state with real online players
  if (ctx.isBombMode) {
    ctx.yardBombSystem.info.alliesAlive = alliesAlive;
    ctx.yardBombSystem.info.enemiesAlive = enemiesAlive;
    ctx.yardBombSystem.info.vanguardScore = room.vanguardScore;
    ctx.yardBombSystem.info.blackthornScore = room.blackthornScore;
    ctx.yardBombSystem.info.currentRound = room.currentRound || 1;

    if (room.bombStatus === 'PLANTED' && room.plantedSite !== 'NONE') {
      ctx.yardBombSystem.info.bombStatus = 'PLANTED';
      ctx.yardBombSystem.info.plantedSite = room.plantedSite;
    } else if (room.bombStatus === 'DEFUSED') {
      ctx.yardBombSystem.info.bombStatus = 'DEFUSED';
    } else if (room.bombStatus === 'DETONATED') {
      ctx.yardBombSystem.info.bombStatus = 'DETONATED';
    }

    ctx.yardBombSystem.info.squadStats = Object.values(room.players).map((p) => ({
      callsign: p.callsign,
      roleTitle: p.team === 'VANGUARD' ? 'OPERADOR VANGUARD' : 'OPERADOR BLACKTHORN',
      weaponId: p.weaponId || 'M4_CARBINE',
      kills: p.kills || 0,
      deaths: p.deaths || 0,
      assists: p.assists || 0,
      headshots: p.headshots || 0,
      score: (p.kills || 0) * 100 + (p.headshots || 0) * 50,
      isPlayer: p.uid === localPlayer.uid,
    }));
  }
}
