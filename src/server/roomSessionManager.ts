import { WebSocket } from 'ws';
import {
  QueuedPlayerEntry,
  ServerQueueType,
  tryFindBalancedMatch,
} from './matchmakingEngine';

export interface WsClientMeta {
  ws: WebSocket;
  roomId: string | null;
  uid: string | null;
  callsign: string;
  queueType: ServerQueueType;
  arenaMode: string;
  mmr: number;
  enqueuedAtMs: number;
}

export interface ServerRoomMeta {
  roomId: string;
  queueType: ServerQueueType;
  arenaMode: string;
  isPrivate: boolean;
  createdAtMs: number;
  averageMmr: number;
  serverConfirmedStart: boolean;
  memberMmrs: Map<string, number>;
}

export const roomsMap = new Map<string, Set<WsClientMeta>>();
export const roomMetaMap = new Map<string, ServerRoomMeta>();
export const matchmakingQueue = new Map<string, WsClientMeta>();

export function recalculateRoomAverageMmr(meta: ServerRoomMeta): number {
  if (meta.memberMmrs.size === 0) return meta.averageMmr || 1000;
  let total = 0;
  meta.memberMmrs.forEach((mmr) => {
    total += mmr;
  });
  meta.averageMmr = Math.round(total / meta.memberMmrs.size);
  return meta.averageMmr;
}

export function broadcastToRoom(
  roomId: string,
  payload: Record<string, unknown>,
  excludeUid?: string | null
): void {
  const members = roomsMap.get(roomId);
  if (!members) return;
  const serialized = JSON.stringify(payload);
  members.forEach((client) => {
    if (excludeUid && client.uid === excludeUid) return;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(serialized);
    }
  });
}

export function removeClientFromQueue(client: WsClientMeta): void {
  if (client.uid) {
    matchmakingQueue.delete(client.uid);
  }
}

export function removeClientFromRoom(client: WsClientMeta): void {
  if (!client.roomId) return;
  const roomId = client.roomId;
  const set = roomsMap.get(roomId);
  const meta = roomMetaMap.get(roomId);

  if (meta && client.uid) {
    meta.memberMmrs.delete(client.uid);
    recalculateRoomAverageMmr(meta);
    if (meta.memberMmrs.size < 10) {
      meta.serverConfirmedStart = false;
    }
  }

  if (set) {
    set.delete(client);
    if (set.size === 0) {
      roomsMap.delete(roomId);
      roomMetaMap.delete(roomId);
    } else if (client.uid) {
      broadcastToRoom(
        roomId,
        {
          type: 'PLAYER_LEFT',
          roomId,
          uid: client.uid,
          averageMmr: meta?.averageMmr ?? 1000,
          ts: Date.now(),
        },
        client.uid
      );
    }
  }
  client.roomId = null;
}

export function evaluateAndConfirmRankedRoomIfFull(roomId: string): void {
  const members = roomsMap.get(roomId);
  const meta = roomMetaMap.get(roomId);
  if (!members || !meta || meta.isPrivate) return;
  if (members.size < 10 || meta.serverConfirmedStart) return;

  const entries: QueuedPlayerEntry[] = Array.from(members).map((c) => ({
    uid: c.uid || 'unknown',
    callsign: c.callsign || 'OPERADOR',
    arenaMode: meta.arenaMode,
    queueType: meta.queueType,
    mmr: c.mmr,
    enqueuedAtMs: c.enqueuedAtMs || meta.createdAtMs,
    roomId,
  }));

  const balanced = tryFindBalancedMatch(
    entries,
    meta.queueType,
    meta.arenaMode,
    roomId,
    Date.now()
  );

  if (!balanced) return;

  meta.serverConfirmedStart = true;
  meta.averageMmr = balanced.averageMmr;

  broadcastToRoom(roomId, {
    type: 'SERVER_MATCH_READY',
    roomId,
    queueType: meta.queueType,
    averageMmr: balanced.averageMmr,
    vanguardUids: balanced.vanguardUids,
    blackthornUids: balanced.blackthornUids,
    serverConfirmed: true,
    ts: Date.now(),
  });

  broadcastToRoom(roomId, {
    type: 'MATCH_START',
    roomId,
    queueType: meta.queueType,
    averageMmr: balanced.averageMmr,
    vanguardUids: balanced.vanguardUids,
    blackthornUids: balanced.blackthornUids,
    serverConfirmed: true,
    ts: Date.now(),
  });
}
