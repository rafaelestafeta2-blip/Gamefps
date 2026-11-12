import { collection, deleteField, doc, getDoc, getDocs, limit, onSnapshot, query, setDoc, Unsubscribe, updateDoc, where } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase/firebaseClient';
import { getCloudSyncState } from '../firebase/playerCloudSync';
import { DrillMode, WeaponId } from '../types/game';
import { publishRoomCombatHit, publishRoomLoadProgress, publishRoomPlayerTransform } from './onlineTelemetryPublisher';
import { getTeamSpawnForArena, MatchQueueType, OnlineHitEvent, OnlinePlayerState, OnlineRoomState, OnlineTeam } from './onlineTypes';

type RoomSubscriber = (room: OnlineRoomState | null) => void;
type HitSubscriber = (hit: OnlineHitEvent) => void;

const roomSubscribers = new Set<RoomSubscriber>();
const hitSubscribers = new Set<HitSubscriber>();
const processedHitIds = new Set<string>();

let activeRoom: OnlineRoomState | null = null;
let roomUnsub: Unsubscribe | null = null;
let wsClient: WebSocket | null = null;

function emitRoomState(): void {
  const snapshot = activeRoom ? { ...activeRoom, players: { ...activeRoom.players } } : null;
  roomSubscribers.forEach((fn) => fn(snapshot));
}

function dispatchHitOnce(hit: OnlineHitEvent): void {
  if (!hit || !hit.eventId || processedHitIds.has(hit.eventId)) return;
  processedHitIds.add(hit.eventId);
  if (processedHitIds.size > 250) {
    const first = processedHitIds.values().next().value;
    if (first) processedHitIds.delete(first);
  }
  hitSubscribers.forEach((fn) => fn(hit));
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function createInitialLocalPlayerState(arenaMode: DrillMode, team: OnlineTeam, slotIndex = 0): OnlinePlayerState {
  const sync = getCloudSyncState();
  const uid = auth.currentUser?.uid || sync.profile.uid || 'local-op';
  const spawn = getTeamSpawnForArena(arenaMode, team, slotIndex);
  const mmr = Number(sync.profile.mmr) > 0 ? Number(sync.profile.mmr) : 1000;
  return {
    uid, callsign: sync.profile.callsign || 'OPERADOR', team,
    rankLevel: sync.profile.rankLevel || 1, mmr,
    avatarDataUrl: (sync.profile.avatarDataUrl || '').slice(0, 8000),
    weaponId: sync.profile.activeWeapon || 'M4_CARBINE',
    x: spawn.x, y: spawn.y, z: spawn.z, yaw: spawn.yaw, pitch: 0,
    health: 100, armor: 100, isDown: false, isCrouching: false, isFiring: false,
    kills: 0, deaths: 0, assists: 0, headshots: 0, loadProgress: 0, isLoaded: false,
    lastShotAtMs: 0, updatedAtMs: Date.now(),
  };
}

function connectWebSocketForRoom(room: OnlineRoomState, player: OnlinePlayerState): void {
  if (typeof window === 'undefined') return;
  try {
    if (wsClient) {
      wsClient.close();
      wsClient = null;
    }
    const envWsUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_WS_SERVER_URL;
    let targetWsUrl = '';
    if (envWsUrl && envWsUrl.startsWith('ws')) {
      targetWsUrl = envWsUrl;
    } else {
      const host = window.location.host;
      if (!host) return;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      targetWsUrl = `${proto}//${host}/ws`;
    }
    const ws = new WebSocket(targetWsUrl);
    wsClient = ws;
    ws.onopen = async () => {
      const idToken = await auth.currentUser?.getIdToken().catch(() => null);
      const queueType: MatchQueueType = room.queueType === 'RANKED' ? 'RANKED' : 'CASUAL';
      if (!room.isPrivate) {
        ws.send(JSON.stringify({
          type: 'JOIN_QUEUE', uid: player.uid, idToken, queueType,
          arenaMode: room.arenaMode, mmr: player.mmr || 1000, player,
        }));
      }
      ws.send(JSON.stringify({
        type: 'JOIN_ROOM', roomId: room.roomId, uid: player.uid, idToken,
        queueType, arenaMode: room.arenaMode, isPrivate: room.isPrivate,
        mmr: player.mmr || 1000, player,
      }));
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as {
          type?: string; player?: OnlinePlayerState; hit?: OnlineHitEvent; serverConfirmed?: boolean;
        };
        if (!activeRoom) return;
        if (msg.type === 'PLAYER_STATE' && msg.player?.uid) {
          activeRoom.players[msg.player.uid] = msg.player;
          emitRoomState();
        } else if (msg.type === 'COMBAT_HIT' && msg.hit) {
          dispatchHitOnce(msg.hit);
        } else if (msg.type === 'SERVER_MATCH_READY' && msg.serverConfirmed) {
          void startMatchInActiveRoom(true);
        }
      } catch {}
    };
  } catch {}
}

function attachRoomSnapshotListener(roomId: string): void {
  if (roomUnsub) {
    roomUnsub();
    roomUnsub = null;
  }
  const roomRef = doc(db, 'rooms', roomId);
  roomUnsub = onSnapshot(
    roomRef,
    (snap) => {
      if (!snap.exists()) {
        activeRoom = null;
        emitRoomState();
        return;
      }
      const data = snap.data() as OnlineRoomState;
      activeRoom = data;
      if (data.lastHitEvent) dispatchHitOnce(data.lastHitEvent);
      emitRoomState();
    },
    (err) => handleFirestoreError(err, OperationType.GET, `rooms/${roomId}`)
  );
}

function pickBalancedTeam(players: Record<string, OnlinePlayerState>): OnlineTeam {
  let vgCount = 0;
  let btCount = 0;
  Object.values(players).forEach((p) => (p.team === 'VANGUARD' ? vgCount++ : btCount++));
  return vgCount <= btCount ? 'VANGUARD' : 'BLACKTHORN';
}

export async function createMultiplayerRoom(
  arenaMode: DrillMode,
  isPrivate: boolean,
  queueType: MatchQueueType = 'CASUAL'
): Promise<OnlineRoomState | null> {
  const user = auth.currentUser;
  if (!user) return null;
  await leaveActiveRoom();

  const roomId = generateRoomCode();
  const localPlayer = createInitialLocalPlayerState(arenaMode, 'VANGUARD', 0);
  const newRoom: OnlineRoomState = {
    roomId, hostUid: user.uid, arenaMode, isPrivate, queueType,
    averageMmr: localPlayer.mmr || 1000, status: 'WAITING',
    currentRound: 1, vanguardScore: 0, blackthornScore: 0,
    bombStatus: 'CARRIED', plantedSite: 'NONE',
    players: { [user.uid]: localPlayer },
    updatedAtMs: Date.now(), createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'rooms', roomId), newRoom);
    activeRoom = newRoom;
    attachRoomSnapshotListener(roomId);
    connectWebSocketForRoom(newRoom, localPlayer);
    emitRoomState();
    return newRoom;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `rooms/${roomId}`);
    return null;
  }
}

export async function joinRoomByCode(rawCode: string): Promise<{ ok: boolean; error?: string; room?: OnlineRoomState }> {
  const user = auth.currentUser;
  if (!user) return { ok: false, error: 'Faça login com sua Conta Google primeiro.' };
  const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length < 4) return { ok: false, error: 'Digite um código válido (6 caracteres).' };

  await leaveActiveRoom();
  const roomRef = doc(db, 'rooms', code);
  try {
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return { ok: false, error: `Sala "${code}" não encontrada.` };
    const data = snap.data() as OnlineRoomState;
    const existingPlayers = data.players || {};
    const playerCount = Object.keys(existingPlayers).length;
    if (playerCount >= 10 && !existingPlayers[user.uid]) {
      return { ok: false, error: 'Esta sala 5v5 já está cheia (10/10 jogadores).' };
    }

    const assignedTeam = existingPlayers[user.uid]?.team || pickBalancedTeam(existingPlayers);
    const localPlayer = createInitialLocalPlayerState(data.arenaMode, assignedTeam, playerCount);
    const allPlayers = { ...existingPlayers, [user.uid]: localPlayer };
    const avgMmr = Math.round(
      Object.values(allPlayers).reduce((acc, p) => acc + (Number(p.mmr) || 1000), 0) /
        Math.max(1, Object.keys(allPlayers).length)
    );

    await updateDoc(roomRef, { [`players.${user.uid}`]: localPlayer, averageMmr: avgMmr, updatedAtMs: Date.now() });
    activeRoom = { ...data, averageMmr: avgMmr, players: allPlayers };
    attachRoomSnapshotListener(code);
    connectWebSocketForRoom(activeRoom, localPlayer);
    emitRoomState();
    return { ok: true, room: activeRoom };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `rooms/${code}`);
    return { ok: false, error: 'Erro ao entrar na sala online.' };
  }
}

export async function quickMatchOrCreateRoom(
  arenaMode: DrillMode,
  queueType: MatchQueueType = 'CASUAL'
): Promise<OnlineRoomState | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const localMmr = Number(getCloudSyncState().profile.mmr) || 1000;

  try {
    const q = query(collection(db, 'rooms'), where('isPrivate', '==', false), limit(15));
    const snap = await getDocs(q);
    const nowMs = Date.now();
    for (const docSnap of snap.docs) {
      const r = docSnap.data() as OnlineRoomState;
      const roomQueue: MatchQueueType = r.queueType === 'RANKED' ? 'RANKED' : 'CASUAL';
      const count = Object.keys(r.players || {}).length;
      const isFresh = nowMs - (r.updatedAtMs || 0) < 1000 * 60 * 15;
      const roomAvgMmr = Number(r.averageMmr) || 1000;
      const mmrOk = queueType === 'CASUAL' || Math.abs(localMmr - roomAvgMmr) <= 250;

      if (r.arenaMode === arenaMode && roomQueue === queueType && r.status !== 'FINISHED' && count > 0 && count < 10 && isFresh && mmrOk) {
        const joined = await joinRoomByCode(r.roomId);
        if (joined.ok && joined.room) return joined.room;
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'rooms');
  }
  return createMultiplayerRoom(arenaMode, false, queueType);
}

export async function switchLocalPlayerTeam(): Promise<void> {
  const user = auth.currentUser;
  if (!user || !activeRoom) return;
  const me = activeRoom.players[user.uid];
  if (!me) return;
  const nextTeam: OnlineTeam = me.team === 'VANGUARD' ? 'BLACKTHORN' : 'VANGUARD';
  const spawn = getTeamSpawnForArena(activeRoom.arenaMode, nextTeam, 0);
  const updated: OnlinePlayerState = { ...me, team: nextTeam, x: spawn.x, y: spawn.y, z: spawn.z, yaw: spawn.yaw, updatedAtMs: Date.now() };
  activeRoom.players[user.uid] = updated;
  emitRoomState();
  try {
    await updateDoc(doc(db, 'rooms', activeRoom.roomId), { [`players.${user.uid}`]: updated, updatedAtMs: Date.now() });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `rooms/${activeRoom.roomId}`);
  }
}

export async function startMatchInActiveRoom(serverConfirmed = false): Promise<boolean> {
  if (!activeRoom) return false;
  const playerCount = Object.keys(activeRoom.players || {}).length;
  if (activeRoom.queueType === 'RANKED' && !serverConfirmed && playerCount < 10) {
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
      wsClient.send(JSON.stringify({ type: 'MATCH_START', roomId: activeRoom.roomId, queueType: 'RANKED' }));
    }
    return false;
  }
  const resetPlayers: Record<string, OnlinePlayerState> = {};
  Object.values(activeRoom.players).forEach((p) => {
    resetPlayers[p.uid] = { ...p, loadProgress: 0, isLoaded: false, updatedAtMs: Date.now() };
  });
  activeRoom.players = resetPlayers;
  try {
    await updateDoc(doc(db, 'rooms', activeRoom.roomId), { status: 'PLAYING', players: resetPlayers, updatedAtMs: Date.now() });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `rooms/${activeRoom.roomId}`);
    return false;
  }
}

export function publishLocalLoadProgress(progressPct: number, isLoaded: boolean): void {
  publishRoomLoadProgress(activeRoom, wsClient, emitRoomState, progressPct, isLoaded);
}

export function publishLocalPlayerTransform(params: {
  x: number; y: number; z: number; yaw: number; pitch: number;
  weaponId: WeaponId; health: number; isDown: boolean; isCrouching: boolean; isFiring: boolean;
}): void {
  publishRoomPlayerTransform(activeRoom, wsClient, params);
}

export function publishCombatHit(targetUid: string, damage: number, isHeadshot: boolean, weaponId: WeaponId): void {
  publishRoomCombatHit(activeRoom, wsClient, targetUid, damage, isHeadshot, weaponId);
}

export function publishBombStateChange(bombStatus: 'CARRIED' | 'PLANTED' | 'DEFUSED' | 'DETONATED', plantedSite: 'NONE' | 'A' | 'B'): void {
  if (!activeRoom) return;
  void updateDoc(doc(db, 'rooms', activeRoom.roomId), { bombStatus, plantedSite, updatedAtMs: Date.now() }).catch(() => {});
}

export async function leaveActiveRoom(): Promise<void> {
  if (roomUnsub) {
    roomUnsub();
    roomUnsub = null;
  }
  if (wsClient) {
    try {
      wsClient.send(JSON.stringify({ type: 'LEAVE_ROOM' }));
      wsClient.close();
    } catch {}
    wsClient = null;
  }
  const user = auth.currentUser;
  const prevRoom = activeRoom;
  activeRoom = null;
  emitRoomState();

  if (user && prevRoom) {
    try {
      await updateDoc(doc(db, 'rooms', prevRoom.roomId), { [`players.${user.uid}`]: deleteField(), updatedAtMs: Date.now() });
    } catch {}
  }
}

export function getActiveOnlineRoom(): OnlineRoomState | null {
  return activeRoom;
}

export function getLocalOnlinePlayerState(): OnlinePlayerState | null {
  const uid = auth.currentUser?.uid;
  if (!uid || !activeRoom) return null;
  return activeRoom.players[uid] || null;
}

export function isOnlineMatchActive(): boolean {
  return activeRoom !== null;
}

export function subscribeOnlineRoom(fn: RoomSubscriber): () => void {
  roomSubscribers.add(fn);
  fn(activeRoom);
  return () => roomSubscribers.delete(fn);
}

export function subscribeOnlineHitEvents(fn: HitSubscriber): () => void {
  hitSubscribers.add(fn);
  return () => hitSubscribers.delete(fn);
}
