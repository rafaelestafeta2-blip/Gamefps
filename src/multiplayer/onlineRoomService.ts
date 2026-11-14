import { collection, deleteField, doc, getDoc, getDocs, limit, onSnapshot, query, setDoc, Unsubscribe, updateDoc, where } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase/firebaseClient';
import { getCloudSyncState } from '../firebase/playerCloudSync';
import { registerMatchProgressionGate } from '../progression/matchProgressionGate';
import { DrillMode, WeaponId } from '../types/game';
import { applyIncomingPlayerState } from './combatNetcode';
import {
  buildClassSupportEvent,
  ClassSupportNetKind,
  ClassSupportPacket,
  sendClassSupportWs,
} from './classSupportNetcode';
import {
  persistRoomMatchMeta,
  publishRoomCombatHit,
  publishRoomLoadProgress,
  publishRoomPlayerTransform,
  resetCombatNetcodeThrottle,
} from './onlineTelemetryPublisher';
import { getTeamSpawnForArena, MatchQueueType, OnlineHitEvent, OnlinePlayerState, OnlineRoomState, OnlineTeam } from './onlineTypes';

type RoomSubscriber = (room: OnlineRoomState | null) => void;
type HitSubscriber = (hit: OnlineHitEvent) => void;
type ClassSupportSubscriber = (evt: ClassSupportPacket) => void;

const roomSubscribers = new Set<RoomSubscriber>();
const hitSubscribers = new Set<HitSubscriber>();
const classSupportSubscribers = new Set<ClassSupportSubscriber>();
const processedHitIds = new Set<string>();
const processedClassSupportIds = new Set<string>();

let activeRoom: OnlineRoomState | null = null;
let roomUnsub: Unsubscribe | null = null;
let wsClient: WebSocket | null = null;

function emitRoomState(): void {
  const snapshot = activeRoom ? { ...activeRoom, players: { ...activeRoom.players } } : null;
  roomSubscribers.forEach((fn) => fn(snapshot));
}

function rememberHitEventId(eventId: string): void {
  if (!eventId) return;
  processedHitIds.add(eventId);
  if (processedHitIds.size > 250) {
    const first = processedHitIds.values().next().value;
    if (first) processedHitIds.delete(first);
  }
}

function dispatchHitOnce(hit: OnlineHitEvent): void {
  if (!hit || !hit.eventId || processedHitIds.has(hit.eventId)) return;
  rememberHitEventId(hit.eventId);
  hitSubscribers.forEach((fn) => fn(hit));
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

let sessionFallbackUid = '';
function getEffectiveLocalUid(): string {
  if (auth.currentUser?.uid) return auth.currentUser.uid;
  const syncUid = getCloudSyncState().profile.uid;
  if (syncUid && syncUid !== 'guest') return syncUid;
  if (!sessionFallbackUid) {
    try {
      sessionFallbackUid = localStorage.getItem('tactical_op_uid') || '';
      if (!sessionFallbackUid) {
        sessionFallbackUid = `op_${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem('tactical_op_uid', sessionFallbackUid);
      }
    } catch {
      sessionFallbackUid = `op_${Math.random().toString(36).slice(2, 10)}`;
    }
  }
  return sessionFallbackUid;
}

function createInitialLocalPlayerState(arenaMode: DrillMode, team: OnlineTeam, slotIndex = 0): OnlinePlayerState {
  const sync = getCloudSyncState();
  const uid = getEffectiveLocalUid();
  const spawn = getTeamSpawnForArena(arenaMode, team, slotIndex);
  const mmr = Number(sync.profile.mmr) > 0 ? Number(sync.profile.mmr) : 2450;
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
          arenaMode: room.arenaMode, mmr: player.mmr || 2450, player,
        }));
      }
      ws.send(JSON.stringify({
        type: 'JOIN_ROOM', roomId: room.roomId, uid: player.uid, idToken,
        queueType, arenaMode: room.arenaMode, isPrivate: room.isPrivate,
        mmr: player.mmr || 2450, player,
      }));
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as {
          type?: string;
          roomId?: string;
          arenaMode?: DrillMode;
          status?: 'WAITING' | 'PLAYING' | 'FINISHED';
          player?: OnlinePlayerState;
          players?: Record<string, OnlinePlayerState>;
          hit?: OnlineHitEvent;
          serverConfirmed?: boolean;
          bombStatus?: OnlineRoomState['bombStatus'];
          plantedSite?: OnlineRoomState['plantedSite'];
        };
        if (!activeRoom) return;
        if (msg.type === 'PLAYER_STATE') {
          const wire = msg as {
            type?: string;
            uid?: string;
            player?: OnlinePlayerState;
            t?: import('./combatNetcode').CompactTransformWire['t'];
          };
          const uid = wire.player?.uid || wire.uid;
          if (!uid) return;
          const expanded = applyIncomingPlayerState(activeRoom.players[uid], {
            player: wire.player,
            t: wire.t,
            uid,
          });
          if (!expanded) return;
          activeRoom.players[uid] = expanded;
          // Transform packets are high-frequency — skip React lobby subscribers
          // during PLAYING; combat loop reads activeRoom directly.
          if (activeRoom.status !== 'PLAYING') emitRoomState();
        } else if (msg.type === 'ROOM_SYNC_META' && msg.players) {
          activeRoom.players = { ...activeRoom.players, ...msg.players };
          if (msg.status) activeRoom.status = msg.status;
          emitRoomState();
        } else if (msg.type === 'COMBAT_HIT' && msg.hit) {
          const hit = msg.hit;
          // Skip room mutation + gameplay if we already applied this hit locally
          // (WebSocket echo back to the attacker).
          if (!processedHitIds.has(hit.eventId)) {
            const victim = activeRoom.players[hit.targetUid];
            if (victim && !victim.isDown) {
              const nextHp = Math.max(0, victim.health - hit.damage);
              victim.health = nextHp;
              victim.isDown = hit.lethal || nextHp <= 0;
              if (hit.lethal) {
                victim.deaths = (victim.deaths || 0) + 1;
                const atk = activeRoom.players[hit.attackerUid];
                if (atk) {
                  atk.kills = (atk.kills || 0) + 1;
                  if (hit.isHeadshot) atk.headshots = (atk.headshots || 0) + 1;
                }
              }
            }
            activeRoom.lastHitEvent = hit;
          }
          dispatchHitOnce(hit);
        } else if (msg.type === 'BOMB_EVENT') {
          if (msg.bombStatus) activeRoom.bombStatus = msg.bombStatus;
          if (msg.plantedSite) activeRoom.plantedSite = msg.plantedSite;
          activeRoom.updatedAtMs = Date.now();
        } else if (msg.type === 'CLASS_SUPPORT') {
          const evt = msg as unknown as ClassSupportPacket;
          if (!evt?.eventId || processedClassSupportIds.has(evt.eventId)) return;
          processedClassSupportIds.add(evt.eventId);
          if (processedClassSupportIds.size > 200) {
            const first = processedClassSupportIds.values().next().value;
            if (first) processedClassSupportIds.delete(first);
          }
          // Optimistic vitals only on APPLY (or revive). START/CANCEL are channel sync.
          const phase = evt.phase || 'APPLY';
          const target = activeRoom.players[evt.targetUid];
          if (phase === 'APPLY' || evt.kind === 'REVIVE') {
            if (target && evt.kind === 'REVIVE') {
              target.isDown = false;
              target.health = Math.max(target.health, Math.round(evt.amount || 55));
              target.updatedAtMs = evt.ts || Date.now();
            } else if (target && evt.kind === 'HEAL' && !target.isDown) {
              target.health = Math.min(
                100,
                target.health + Math.max(0, Math.round(evt.amount || 45))
              );
              target.updatedAtMs = evt.ts || Date.now();
            } else if (target && evt.kind === 'ARMOR' && !target.isDown) {
              target.armor = Math.min(
                100,
                (target.armor || 0) + Math.max(0, Math.round(evt.amount || 40))
              );
              target.updatedAtMs = evt.ts || Date.now();
            }
          }
          classSupportSubscribers.forEach((fn) => fn(evt));
        } else if (msg.type === 'SERVER_MATCH_READY' && msg.serverConfirmed) {
          if (msg.roomId) activeRoom.roomId = msg.roomId;
          if (msg.arenaMode) activeRoom.arenaMode = msg.arenaMode;
          if (msg.players) activeRoom.players = msg.players;
          activeRoom.status = 'PLAYING';
          resetCombatNetcodeThrottle();
          emitRoomState();
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
  if (!auth.currentUser) return;
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
  await leaveActiveRoom();
  const uid = getEffectiveLocalUid();
  const roomId = generateRoomCode();
  const localPlayer = createInitialLocalPlayerState(arenaMode, 'VANGUARD', 0);
  const newRoom: OnlineRoomState = {
    roomId, hostUid: uid, arenaMode, isPrivate, queueType,
    averageMmr: localPlayer.mmr || 2450, status: 'WAITING',
    currentRound: 1, vanguardScore: 0, blackthornScore: 0,
    bombStatus: 'CARRIED', plantedSite: 'NONE',
    players: { [uid]: localPlayer },
    updatedAtMs: Date.now(), createdAt: new Date().toISOString(),
  };

  activeRoom = newRoom;
  resetCombatNetcodeThrottle();
  connectWebSocketForRoom(newRoom, localPlayer);
  emitRoomState();

  if (auth.currentUser) {
    try {
      await setDoc(doc(db, 'rooms', roomId), newRoom);
      attachRoomSnapshotListener(roomId);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `rooms/${roomId}`);
    }
  }
  return newRoom;
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
  const localMmr = Number(getCloudSyncState().profile.mmr) || 2450;

  if (user) {
    try {
      const q = query(collection(db, 'rooms'), where('isPrivate', '==', false), limit(15));
      const snap = await getDocs(q);
      const nowMs = Date.now();
      for (const docSnap of snap.docs) {
        const r = docSnap.data() as OnlineRoomState;
        const roomQueue: MatchQueueType = r.queueType === 'RANKED' ? 'RANKED' : 'CASUAL';
        const count = Object.keys(r.players || {}).length;
        const isFresh = nowMs - (r.updatedAtMs || 0) < 1000 * 60 * 15;
        const roomAvgMmr = Number(r.averageMmr) || 2450;
        const mmrOk = queueType === 'CASUAL' || Math.abs(localMmr - roomAvgMmr) <= 300;

        if (r.arenaMode === arenaMode && roomQueue === queueType && r.status !== 'FINISHED' && count > 0 && count < 10 && isFresh && mmrOk) {
          const joined = await joinRoomByCode(r.roomId);
          if (joined.ok && joined.room) return joined.room;
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'rooms');
    }
  }
  return createMultiplayerRoom(arenaMode, false, queueType);
}

export async function switchLocalPlayerTeam(): Promise<void> {
  if (!activeRoom) return;
  const uid = getEffectiveLocalUid();
  const me = activeRoom.players[uid];
  if (!me) return;
  const nextTeam: OnlineTeam = me.team === 'VANGUARD' ? 'BLACKTHORN' : 'VANGUARD';
  const spawn = getTeamSpawnForArena(activeRoom.arenaMode, nextTeam, 0);
  const updated: OnlinePlayerState = { ...me, team: nextTeam, x: spawn.x, y: spawn.y, z: spawn.z, yaw: spawn.yaw, updatedAtMs: Date.now() };
  activeRoom.players[uid] = updated;
  emitRoomState();
  if (auth.currentUser) {
    try {
      await updateDoc(doc(db, 'rooms', activeRoom.roomId), { [`players.${uid}`]: updated, updatedAtMs: Date.now() });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${activeRoom.roomId}`);
    }
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
  activeRoom.status = 'PLAYING';
  resetCombatNetcodeThrottle();
  emitRoomState();
  if (auth.currentUser) {
    try {
      await updateDoc(doc(db, 'rooms', activeRoom.roomId), { status: 'PLAYING', players: resetPlayers, updatedAtMs: Date.now() });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${activeRoom.roomId}`);
    }
  }
  return true;
}

export function publishLocalLoadProgress(progressPct: number, isLoaded: boolean): void {
  publishRoomLoadProgress(
    activeRoom,
    wsClient,
    emitRoomState,
    progressPct,
    isLoaded,
    getEffectiveLocalUid()
  );
}

export function publishLocalPlayerTransform(params: {
  x: number; y: number; z: number; yaw: number; pitch: number;
  weaponId: WeaponId; health: number; isDown: boolean; isCrouching: boolean; isFiring: boolean;
}): void {
  publishRoomPlayerTransform(activeRoom, wsClient, params, getEffectiveLocalUid());
}

export function publishCombatHit(targetUid: string, damage: number, isHeadshot: boolean, weaponId: WeaponId): void {
  const hit = publishRoomCombatHit(
    activeRoom,
    wsClient,
    targetUid,
    damage,
    isHeadshot,
    weaponId,
    getEffectiveLocalUid()
  );
  // Prevent WS echo from double-applying damage/score on the attacker client.
  if (hit?.eventId) rememberHitEventId(hit.eventId);
}

export function publishBombStateChange(bombStatus: 'CARRIED' | 'PLANTED' | 'DEFUSED' | 'DETONATED', plantedSite: 'NONE' | 'A' | 'B'): void {
  if (!activeRoom) return;
  activeRoom.bombStatus = bombStatus;
  activeRoom.plantedSite = plantedSite;
  activeRoom.updatedAtMs = Date.now();
  // Prefer WS for bomb events; Firestore only for durable meta.
  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    wsClient.send(
      JSON.stringify({
        type: 'BOMB_EVENT',
        roomId: activeRoom.roomId,
        bombStatus,
        plantedSite,
        ts: Date.now(),
      })
    );
  }
  persistRoomMatchMeta(activeRoom);
}

export function publishClassSupportEvent(
  targetUid: string,
  kind: ClassSupportNetKind,
  amount?: number,
  phase: import('./classSupportNetcode').ClassSupportPhase = 'APPLY'
): void {
  if (!activeRoom) return;
  const fromUid = getEffectiveLocalUid();
  if (!fromUid) return;
  const packet = buildClassSupportEvent(
    activeRoom.roomId,
    fromUid,
    targetUid,
    kind,
    amount,
    phase
  );
  processedClassSupportIds.add(packet.eventId);
  // Apply optimistic vitals only when the channel completes (or revive).
  const applyNow = phase === 'APPLY' || kind === 'REVIVE';
  const target = activeRoom.players[targetUid];
  if (applyNow && target && kind === 'REVIVE') {
    target.isDown = false;
    target.health = Math.max(target.health, Math.round(amount || 55));
  } else if (applyNow && target && kind === 'HEAL') {
    target.health = Math.min(100, target.health + Math.max(0, Math.round(amount || 45)));
  } else if (applyNow && target && kind === 'ARMOR') {
    target.armor = Math.min(
      100,
      (target.armor || 0) + Math.max(0, Math.round(amount || 40))
    );
  }
  sendClassSupportWs(wsClient, packet);
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
  resetCombatNetcodeThrottle();
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
  const uid = getEffectiveLocalUid();
  if (!uid || !activeRoom) return null;
  return activeRoom.players[uid] || null;
}

export function isOnlineMatchActive(): boolean {
  return activeRoom !== null;
}

/** Other human players currently in the active online room (excludes local). */
export function countOtherHumanPlayersInRoom(): number {
  const local = getLocalOnlinePlayerState();
  if (!activeRoom || !local) return 0;
  let n = 0;
  for (const uid of Object.keys(activeRoom.players)) {
    if (uid && uid !== local.uid) n += 1;
  }
  return n;
}

/**
 * XP / cash / rank unlocks / combat profile telemetry may only come from
 * real online matches with at least one other human. Bot / offline / solo
 * practice modes grant none.
 */
export function canGrantMatchProgressionRewards(): boolean {
  return isOnlineMatchActive() && countOtherHumanPlayersInRoom() >= 1;
}

registerMatchProgressionGate(canGrantMatchProgressionRewards);

export function subscribeOnlineRoom(fn: RoomSubscriber): () => void {
  roomSubscribers.add(fn);
  fn(activeRoom);
  return () => roomSubscribers.delete(fn);
}

export function subscribeOnlineClassSupport(
  fn: ClassSupportSubscriber
): () => void {
  classSupportSubscribers.add(fn);
  return () => classSupportSubscribers.delete(fn);
}

export function subscribeOnlineHitEvents(fn: HitSubscriber): () => void {
  hitSubscribers.add(fn);
  return () => hitSubscribers.delete(fn);
}
