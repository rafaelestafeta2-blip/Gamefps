/**
 * combatNetcode.ts
 * Hot-path networking for live FPS combat.
 * Transforms and hits go over WebSocket only; Firestore is reserved for lobby/meta.
 */

import { WeaponId } from '../types/game';
import { OnlineHitEvent, OnlinePlayerState, OnlineRoomState } from './onlineTypes';

/** Target transform send rate during combat (~20 Hz). */
export const COMBAT_TRANSFORM_INTERVAL_MS = 50;

/** Compact binary-friendly JSON payload for PLAYER_STATE. */
export interface CombatTransformPacket {
  type: 'PLAYER_STATE';
  roomId: string;
  uid: string;
  player: OnlinePlayerState;
}

export interface CombatHitPacket {
  type: 'COMBAT_HIT';
  roomId: string;
  hit: OnlineHitEvent;
}

let lastTransformSendMs = 0;
let lastSentSnapshot: string | null = null;

export function resetCombatNetcodeThrottle(): void {
  lastTransformSendMs = 0;
  lastSentSnapshot = null;
}

/**
 * Builds an updated local player state and returns whether it should be sent now.
 * Throttles to COMBAT_TRANSFORM_INTERVAL_MS unless firing/down state flips.
 */
export function prepareCombatTransformSend(
  me: OnlinePlayerState,
  params: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    weaponId: WeaponId;
    health: number;
    isDown: boolean;
    isCrouching: boolean;
    isFiring: boolean;
  },
  nowMs = Date.now()
): { updated: OnlinePlayerState; shouldSend: boolean } {
  const updated: OnlinePlayerState = {
    ...me,
    x: Number(params.x.toFixed(2)),
    y: Number(params.y.toFixed(2)),
    z: Number(params.z.toFixed(2)),
    yaw: Number(params.yaw.toFixed(3)),
    pitch: Number(params.pitch.toFixed(3)),
    weaponId: params.weaponId,
    health: Math.max(0, Math.round(params.health)),
    isDown: params.isDown,
    isCrouching: params.isCrouching,
    isFiring: params.isFiring,
    lastShotAtMs: params.isFiring ? nowMs : me.lastShotAtMs,
    updatedAtMs: nowMs,
  };

  const vitalChange =
    params.isFiring ||
    params.isDown !== me.isDown ||
    params.health !== me.health ||
    params.weaponId !== me.weaponId;

  if (!vitalChange && nowMs - lastTransformSendMs < COMBAT_TRANSFORM_INTERVAL_MS) {
    return { updated, shouldSend: false };
  }

  const fingerprint = `${updated.x}|${updated.y}|${updated.z}|${updated.yaw}|${updated.pitch}|${updated.weaponId}|${updated.health}|${updated.isDown ? 1 : 0}|${updated.isCrouching ? 1 : 0}|${updated.isFiring ? 1 : 0}`;
  if (!vitalChange && fingerprint === lastSentSnapshot) {
    return { updated, shouldSend: false };
  }

  lastTransformSendMs = nowMs;
  lastSentSnapshot = fingerprint;
  return { updated, shouldSend: true };
}

export function sendCombatTransformWs(
  wsClient: WebSocket | null,
  room: OnlineRoomState,
  uid: string,
  player: OnlinePlayerState
): boolean {
  if (!wsClient || wsClient.readyState !== WebSocket.OPEN) return false;
  const packet: CombatTransformPacket = {
    type: 'PLAYER_STATE',
    roomId: room.roomId,
    uid,
    player,
  };
  wsClient.send(JSON.stringify(packet));
  return true;
}

export function buildCombatHitEvent(
  attacker: OnlinePlayerState,
  victim: OnlinePlayerState,
  targetUid: string,
  damage: number,
  isHeadshot: boolean,
  weaponId: WeaponId
): { hit: OnlineHitEvent; nextVictimHp: number; lethal: boolean } {
  const nextVictimHp = Math.max(0, victim.health - damage);
  const lethal = nextVictimHp <= 0;
  const hit: OnlineHitEvent = {
    eventId: `${attacker.uid}_${targetUid}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    attackerUid: attacker.uid,
    attackerCallsign: attacker.callsign,
    attackerTeam: attacker.team,
    targetUid,
    targetCallsign: victim.callsign,
    targetTeam: victim.team,
    weaponId,
    damage,
    isHeadshot,
    lethal,
    ts: Date.now(),
  };
  return { hit, nextVictimHp, lethal };
}

export function sendCombatHitWs(
  wsClient: WebSocket | null,
  roomId: string,
  hit: OnlineHitEvent
): boolean {
  if (!wsClient || wsClient.readyState !== WebSocket.OPEN) return false;
  const packet: CombatHitPacket = { type: 'COMBAT_HIT', roomId, hit };
  wsClient.send(JSON.stringify(packet));
  return true;
}

/**
 * Apply a confirmed hit onto the in-memory room (authoritative for this client session).
 * Keeps scoreboard coherent without waiting for Firestore.
 */
export function applyCombatHitToRoomState(
  room: OnlineRoomState,
  hit: OnlineHitEvent,
  nextVictimHp: number,
  lethal: boolean
): void {
  const victim = room.players[hit.targetUid];
  const attacker = room.players[hit.attackerUid];
  if (victim) {
    victim.health = nextVictimHp;
    victim.isDown = lethal;
    victim.updatedAtMs = hit.ts;
    if (lethal) victim.deaths = (victim.deaths || 0) + 1;
  }
  if (attacker && lethal) {
    attacker.kills = (attacker.kills || 0) + 1;
    if (hit.isHeadshot) attacker.headshots = (attacker.headshots || 0) + 1;
    attacker.updatedAtMs = hit.ts;
  }
  room.lastHitEvent = hit;
  room.updatedAtMs = hit.ts;
}
