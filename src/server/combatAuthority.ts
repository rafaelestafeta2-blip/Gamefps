/**
 * Lightweight server-side combat validation for WebSocket relay.
 * Not a full simulation — rejects obvious cheats (self-hit, insane damage, spam)
 * and keeps a short pose buffer for future lag-comp checks.
 */

export interface ServerPoseSample {
  uid: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  ts: number;
}

export interface IncomingHitLike {
  eventId?: string;
  attackerUid?: string;
  targetUid?: string;
  damage?: number;
  isHeadshot?: boolean;
  lethal?: boolean;
  ts?: number;
  weaponId?: string;
}

const MAX_DAMAGE = 120;
const MIN_HIT_INTERVAL_MS = 45;
const POSE_HISTORY = 20;

const poseByRoom = new Map<string, Map<string, ServerPoseSample[]>>();
const lastHitByAttacker = new Map<string, number>();
const seenEventIds = new Set<string>();

export function recordServerPlayerPose(
  roomId: string,
  uid: string,
  x: number,
  y: number,
  z: number,
  yaw: number,
  ts = Date.now()
): void {
  if (!roomId || !uid) return;
  let room = poseByRoom.get(roomId);
  if (!room) {
    room = new Map();
    poseByRoom.set(roomId, room);
  }
  let ring = room.get(uid);
  if (!ring) {
    ring = [];
    room.set(uid, ring);
  }
  ring.push({ uid, x, y, z, yaw, ts });
  if (ring.length > POSE_HISTORY) ring.shift();
}

export function validateCombatHit(
  roomId: string,
  senderUid: string | null,
  hit: IncomingHitLike
): { ok: boolean; reason?: string; sanitized?: IncomingHitLike } {
  if (!hit || !hit.eventId || !hit.attackerUid || !hit.targetUid) {
    return { ok: false, reason: 'malformed' };
  }
  if (senderUid && hit.attackerUid !== senderUid) {
    return { ok: false, reason: 'attacker_mismatch' };
  }
  if (hit.attackerUid === hit.targetUid) {
    return { ok: false, reason: 'self_hit' };
  }
  if (seenEventIds.has(hit.eventId)) {
    return { ok: false, reason: 'duplicate' };
  }
  const now = Date.now();
  const last = lastHitByAttacker.get(hit.attackerUid) || 0;
  if (now - last < MIN_HIT_INTERVAL_MS) {
    return { ok: false, reason: 'rate_limit' };
  }

  let damage = Number(hit.damage);
  if (!Number.isFinite(damage) || damage <= 0) {
    return { ok: false, reason: 'bad_damage' };
  }
  damage = Math.min(MAX_DAMAGE, Math.max(1, Math.round(damage)));

  // Soft range check if we have poses for both players
  const room = poseByRoom.get(roomId);
  const atkRing = room?.get(hit.attackerUid);
  const vicRing = room?.get(hit.targetUid);
  if (atkRing?.length && vicRing?.length) {
    const a = atkRing[atkRing.length - 1];
    const v = vicRing[vicRing.length - 1];
    const dist = Math.hypot(a.x - v.x, a.y - v.y, a.z - v.z);
    if (dist > 220) {
      return { ok: false, reason: 'range' };
    }
  }

  seenEventIds.add(hit.eventId);
  if (seenEventIds.size > 800) {
    const first = seenEventIds.values().next().value;
    if (first) seenEventIds.delete(first);
  }
  lastHitByAttacker.set(hit.attackerUid, now);

  return {
    ok: true,
    sanitized: {
      ...hit,
      damage,
      ts: typeof hit.ts === 'number' ? hit.ts : now,
    },
  };
}

export function clearRoomCombatAuthority(roomId: string): void {
  poseByRoom.delete(roomId);
}
