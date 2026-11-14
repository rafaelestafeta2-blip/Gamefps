/**
 * Online telemetry publisher.
 * Combat hot-path = WebSocket only. Firestore is used for lobby load progress
 * and deferred scoreboard/meta persistence (lethal / round boundary), never for
 * per-frame transforms.
 */

import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseClient';
import { WeaponId } from '../types/game';
import {
  applyCombatHitToRoomState,
  buildCombatHitEvent,
  prepareCombatTransformSend,
  resetCombatNetcodeThrottle,
  sendCombatHitWs,
  sendCombatTransformWs,
} from './combatNetcode';
import { OnlineHitEvent, OnlinePlayerState, OnlineRoomState } from './onlineTypes';

export { resetCombatNetcodeThrottle };

/** Debounce Firestore scoreboard writes after lethal hits. */
let pendingMetaTimer: ReturnType<typeof setTimeout> | null = null;
let pendingMetaRoomId: string | null = null;

function scheduleScoreboardMetaPersist(room: OnlineRoomState): void {
  pendingMetaRoomId = room.roomId;
  if (pendingMetaTimer) return;
  pendingMetaTimer = setTimeout(() => {
    pendingMetaTimer = null;
    const roomId = pendingMetaRoomId;
    pendingMetaRoomId = null;
    if (!roomId || !auth.currentUser) return;
    // Persist compact scoreboard only (not transforms).
    const scoreboard: Record<string, Partial<OnlinePlayerState>> = {};
    Object.values(room.players).forEach((p) => {
      scoreboard[p.uid] = {
        kills: p.kills || 0,
        deaths: p.deaths || 0,
        assists: p.assists || 0,
        headshots: p.headshots || 0,
        health: p.health,
        isDown: p.isDown,
      };
    });
    const patch: Record<string, unknown> = { updatedAtMs: Date.now() };
    Object.entries(scoreboard).forEach(([uid, stats]) => {
      patch[`players.${uid}.kills`] = stats.kills;
      patch[`players.${uid}.deaths`] = stats.deaths;
      patch[`players.${uid}.assists`] = stats.assists;
      patch[`players.${uid}.headshots`] = stats.headshots;
      patch[`players.${uid}.health`] = stats.health;
      patch[`players.${uid}.isDown`] = stats.isDown;
    });
    void updateDoc(doc(db, 'rooms', roomId), patch).catch(() => {});
  }, 750);
}

function resolveLocalUid(
  activeRoom: OnlineRoomState,
  explicitUid?: string | null
): string | null {
  if (explicitUid && activeRoom.players[explicitUid]) return explicitUid;
  const authUid = auth.currentUser?.uid;
  if (authUid && activeRoom.players[authUid]) return authUid;
  // Guest / fallback: first local-looking entry if only one, else null
  const ids = Object.keys(activeRoom.players);
  if (ids.length === 1) return ids[0];
  return authUid || null;
}

export function publishRoomLoadProgress(
  activeRoom: OnlineRoomState | null,
  wsClient: WebSocket | null,
  emitRoomState: () => void,
  progressPct: number,
  isLoaded: boolean,
  localUid?: string | null
): void {
  if (!activeRoom) return;
  const uid = resolveLocalUid(activeRoom, localUid);
  if (!uid) return;
  const me = activeRoom.players[uid];
  if (!me) return;
  const clamped = Math.min(100, Math.max(0, Math.round(progressPct)));
  if (me.loadProgress === clamped && me.isLoaded === isLoaded) return;
  const updated: OnlinePlayerState = {
    ...me,
    loadProgress: clamped,
    isLoaded,
    updatedAtMs: Date.now(),
  };
  activeRoom.players[uid] = updated;
  emitRoomState();
  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    wsClient.send(
      JSON.stringify({
        type: 'PLAYER_STATE',
        roomId: activeRoom.roomId,
        uid,
        player: updated,
      })
    );
  }
  // Lobby-only Firestore: useful when peers join mid-load without WS yet.
  if (auth.currentUser) {
    void updateDoc(doc(db, 'rooms', activeRoom.roomId), {
      [`players.${uid}`]: updated,
      updatedAtMs: Date.now(),
    }).catch(() => {});
  }
}

export function publishRoomPlayerTransform(
  activeRoom: OnlineRoomState | null,
  wsClient: WebSocket | null,
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
  localUid?: string | null
): void {
  if (!activeRoom) return;
  const uid = resolveLocalUid(activeRoom, localUid);
  if (!uid) return;
  const me = activeRoom.players[uid];
  if (!me) return;

  const { updated, shouldSend } = prepareCombatTransformSend(me, params);
  activeRoom.players[uid] = updated;

  if (!shouldSend) return;

  // Combat transforms: WebSocket only — never Firestore.
  sendCombatTransformWs(wsClient, activeRoom, uid, updated);
}

export function publishRoomCombatHit(
  activeRoom: OnlineRoomState | null,
  wsClient: WebSocket | null,
  targetUid: string,
  damage: number,
  isHeadshot: boolean,
  weaponId: WeaponId,
  localUid?: string | null
): OnlineHitEvent | null {
  if (!activeRoom) return null;
  const uid = resolveLocalUid(activeRoom, localUid);
  if (!uid) return null;
  const attacker = activeRoom.players[uid];
  const victim = activeRoom.players[targetUid];
  if (!attacker || !victim || victim.isDown) return null;

  const { hit, nextVictimHp, lethal } = buildCombatHitEvent(
    attacker,
    victim,
    targetUid,
    damage,
    isHeadshot,
    weaponId
  );

  applyCombatHitToRoomState(activeRoom, hit, nextVictimHp, lethal);

  const sent = sendCombatHitWs(wsClient, activeRoom.roomId, hit);

  // Fallback only if WS is down: single Firestore hit write so peers can still sync.
  if (!sent && auth.currentUser) {
    const updates: Record<string, unknown> = {
      lastHitEvent: hit,
      [`players.${targetUid}.health`]: nextVictimHp,
      [`players.${targetUid}.isDown`]: lethal,
      updatedAtMs: Date.now(),
    };
    if (lethal) {
      updates[`players.${uid}.kills`] = attacker.kills || 0;
      if (isHeadshot) updates[`players.${uid}.headshots`] = attacker.headshots || 0;
      updates[`players.${targetUid}.deaths`] = victim.deaths || 0;
    }
    void updateDoc(doc(db, 'rooms', activeRoom.roomId), updates).catch(() => {});
    return hit;
  }

  // WS path: defer scoreboard meta so Firestore is not on the hit hot path.
  if (lethal) {
    scheduleScoreboardMetaPersist(activeRoom);
  }
  return hit;
}

/** Explicit meta persist for round/match boundaries (call from bomb/round systems). */
export function persistRoomMatchMeta(activeRoom: OnlineRoomState | null): void {
  if (!activeRoom || !auth.currentUser) return;
  void updateDoc(doc(db, 'rooms', activeRoom.roomId), {
    currentRound: activeRoom.currentRound,
    vanguardScore: activeRoom.vanguardScore,
    blackthornScore: activeRoom.blackthornScore,
    bombStatus: activeRoom.bombStatus,
    plantedSite: activeRoom.plantedSite,
    status: activeRoom.status,
    updatedAtMs: Date.now(),
  }).catch(() => {});
}

export type { OnlineHitEvent };
