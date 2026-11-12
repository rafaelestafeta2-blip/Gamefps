import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseClient';
import { WeaponId } from '../types/game';
import { OnlineHitEvent, OnlinePlayerState, OnlineRoomState } from './onlineTypes';

let lastFirestoreTransformPushMs = 0;

export function publishRoomLoadProgress(
  activeRoom: OnlineRoomState | null,
  wsClient: WebSocket | null,
  emitRoomState: () => void,
  progressPct: number,
  isLoaded: boolean
): void {
  const user = auth.currentUser;
  if (!user || !activeRoom) return;
  const me = activeRoom.players[user.uid];
  if (!me) return;
  const clamped = Math.min(100, Math.max(0, Math.round(progressPct)));
  if (me.loadProgress === clamped && me.isLoaded === isLoaded) return;
  const updated: OnlinePlayerState = {
    ...me,
    loadProgress: clamped,
    isLoaded,
    updatedAtMs: Date.now(),
  };
  activeRoom.players[user.uid] = updated;
  emitRoomState();
  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    wsClient.send(
      JSON.stringify({
        type: 'PLAYER_STATE',
        roomId: activeRoom.roomId,
        uid: user.uid,
        player: updated,
      })
    );
  }
  void updateDoc(doc(db, 'rooms', activeRoom.roomId), {
    [`players.${user.uid}`]: updated,
    updatedAtMs: Date.now(),
  }).catch(() => {});
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
  }
): void {
  const user = auth.currentUser;
  if (!user || !activeRoom) return;
  const me = activeRoom.players[user.uid];
  if (!me) return;

  const nowMs = Date.now();
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
  activeRoom.players[user.uid] = updated;

  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    wsClient.send(
      JSON.stringify({
        type: 'PLAYER_STATE',
        roomId: activeRoom.roomId,
        uid: user.uid,
        player: updated,
      })
    );
  }
  if (
    nowMs - lastFirestoreTransformPushMs >= 110 ||
    params.isFiring ||
    params.isDown !== me.isDown
  ) {
    lastFirestoreTransformPushMs = nowMs;
    void updateDoc(doc(db, 'rooms', activeRoom.roomId), {
      [`players.${user.uid}`]: updated,
      updatedAtMs: nowMs,
    }).catch(() => {});
  }
}

export function publishRoomCombatHit(
  activeRoom: OnlineRoomState | null,
  wsClient: WebSocket | null,
  targetUid: string,
  damage: number,
  isHeadshot: boolean,
  weaponId: WeaponId
): void {
  const user = auth.currentUser;
  if (!user || !activeRoom) return;
  const attacker = activeRoom.players[user.uid];
  const victim = activeRoom.players[targetUid];
  if (!attacker || !victim || victim.isDown) return;

  const nextVictimHp = Math.max(0, victim.health - damage);
  const lethal = nextVictimHp <= 0;
  const hitEvent: OnlineHitEvent = {
    eventId: `${user.uid}_${targetUid}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    attackerUid: user.uid,
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

  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    wsClient.send(
      JSON.stringify({ type: 'COMBAT_HIT', roomId: activeRoom.roomId, hit: hitEvent })
    );
  }

  const updates: Record<string, unknown> = {
    lastHitEvent: hitEvent,
    [`players.${targetUid}.health`]: nextVictimHp,
    [`players.${targetUid}.isDown`]: lethal,
    updatedAtMs: Date.now(),
  };
  if (lethal) {
    updates[`players.${user.uid}.kills`] = (attacker.kills || 0) + 1;
    if (isHeadshot) updates[`players.${user.uid}.headshots`] = (attacker.headshots || 0) + 1;
    updates[`players.${targetUid}.deaths`] = (victim.deaths || 0) + 1;
  }
  void updateDoc(doc(db, 'rooms', activeRoom.roomId), updates).catch(() => {});
}
