import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, Unsubscribe } from 'firebase/firestore';
import { evaluateUnlockedAchievements } from '../progression/achievementsData';
import { getRankForXp, registerCloudProgressionHook } from '../progression/ranks';
import { WeaponId } from '../types/game';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebaseClient';
import {
  CloudSyncState,
  compressAvatarFileToDataUrl,
  computeUnlockedWeaponsForXp,
  loadLocalProfileFallback,
  mergeLocalAndCloudProfiles,
  persistLocalProfile,
  PlayerCloudProfile,
} from './playerProfileModel';

export type { CloudSyncState, PlayerCloudProfile };
export { compressAvatarFileToDataUrl };

let state: CloudSyncState = {
  profile: loadLocalProfileFallback(),
  authReady: false,
  isGoogleLinked: false,
  isSyncing: false,
  lastSyncedAt: null,
  syncError: null,
};

type SyncListener = (next: CloudSyncState) => void;
const listeners = new Set<SyncListener>();
let firestoreUnsub: Unsubscribe | null = null;
let saveTimeoutId: number | null = null;

function emitState(): void {
  const snapshot: CloudSyncState = {
    ...state,
    profile: { ...state.profile },
  };
  listeners.forEach((fn) => fn(snapshot));
}

export async function pushProfileToFirestoreNow(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const path = `players/${user.uid}`;
  state.isSyncing = true;
  emitState();

  const payload: PlayerCloudProfile = {
    ...state.profile,
    uid: user.uid,
    email: (user.email || state.profile.email || '').slice(0, 150),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'players', user.uid), payload);
    state.lastSyncedAt = payload.updatedAt;
    state.syncError = null;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    state.syncError = 'Falha ao sincronizar com a nuvem.';
  } finally {
    state.isSyncing = false;
    emitState();
  }
}

function scheduleCloudPush(): void {
  if (!auth.currentUser) return;
  if (saveTimeoutId !== null) {
    window.clearTimeout(saveTimeoutId);
  }
  saveTimeoutId = window.setTimeout(() => {
    saveTimeoutId = null;
    void pushProfileToFirestoreNow();
  }, 600);
}

onAuthStateChanged(auth, async (user) => {
  if (firestoreUnsub) {
    firestoreUnsub();
    firestoreUnsub = null;
  }

  if (!user) {
    state.authReady = true;
    state.isGoogleLinked = false;
    emitState();
    return;
  }

  state.isGoogleLinked = true;
  state.isSyncing = true;
  emitState();

  const playerRef = doc(db, 'players', user.uid);
  try {
    const snap = await getDoc(playerRef);
    const cloudData = snap.exists()
      ? (snap.data() as Partial<PlayerCloudProfile>)
      : null;
    const merged = mergeLocalAndCloudProfiles(state.profile, cloudData, user);
    state.profile = merged;
    persistLocalProfile(merged);
    await setDoc(playerRef, merged);
    state.lastSyncedAt = merged.updatedAt;
    state.syncError = null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `players/${user.uid}`);
  } finally {
    state.authReady = true;
    state.isSyncing = false;
    emitState();
  }

  firestoreUnsub = onSnapshot(
    playerRef,
    (docSnap) => {
      if (!docSnap.exists() || !auth.currentUser) return;
      const remote = docSnap.data() as Partial<PlayerCloudProfile>;
      const merged = mergeLocalAndCloudProfiles(
        state.profile,
        remote,
        auth.currentUser
      );
      state.profile = merged;
      state.lastSyncedAt = merged.updatedAt;
      persistLocalProfile(merged);
      emitState();
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `players/${user.uid}`);
    }
  );
});

export function getCloudSyncState(): CloudSyncState {
  return state;
}

export function getPlayerCallsign(): string {
  return state.profile.callsign || 'VOCÊ';
}

export function subscribePlayerProfile(listener: SyncListener): () => void {
  listeners.add(listener);
  listener({ ...state, profile: { ...state.profile } });
  return () => {
    listeners.delete(listener);
  };
}

export async function signInWithGoogleAccount(): Promise<boolean> {
  try {
    state.syncError = null;
    state.isSyncing = true;
    emitState();
    await signInWithPopup(auth, googleProvider);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    state.syncError = msg.includes('popup-closed')
      ? 'Janela de login do Google foi fechada.'
      : 'Não foi possível concluir o login com Google.';
    state.isSyncing = false;
    emitState();
    return false;
  }
}

export async function signOutGoogleAccount(): Promise<void> {
  if (firestoreUnsub) {
    firestoreUnsub();
    firestoreUnsub = null;
  }
  await signOut(auth);
  state.isGoogleLinked = false;
  emitState();
}

export function syncProgressionFromLocal(
  xp: number,
  cash: number,
  activeWeapon?: WeaponId
): void {
  const nextXp = Math.max(state.profile.playerXp, xp);
  const nextCash = Math.max(state.profile.playerCash, cash);
  const rank = getRankForXp(nextXp);
  const unlockedWeapons = computeUnlockedWeaponsForXp(
    nextXp,
    state.profile.unlockedWeapons
  );
  const unlockedAchievements = evaluateUnlockedAchievements({
    playerXp: nextXp, rankLevel: rank.level, playerCash: nextCash, unlockedWeapons,
    totalKills: state.profile.totalKills, totalDeaths: state.profile.totalDeaths,
    totalAssists: state.profile.totalAssists, totalHeadshots: state.profile.totalHeadshots,
    matchesPlayed: state.profile.matchesPlayed, matchesWon: state.profile.matchesWon,
    bombsPlanted: state.profile.bombsPlanted,
    hasCustomAvatarOrCallsign: state.profile.callsign !== 'OPERADOR-01' || state.profile.avatarDataUrl.length > 0,
    isGoogleLinked: state.isGoogleLinked,
  }, state.profile.unlockedAchievements);

  state.profile = {
    ...state.profile,
    playerXp: nextXp, rankLevel: rank.level, rankTitle: rank.title, playerCash: nextCash,
    activeWeapon: activeWeapon || state.profile.activeWeapon, unlockedWeapons,
    unlockedAchievements, updatedAt: new Date().toISOString(),
  };
  persistLocalProfile(state.profile);
  emitState();
  scheduleCloudPush();
}

registerCloudProgressionHook((xp, cash) => {
  syncProgressionFromLocal(xp, cash);
});

export function recordCombatTelemetryDelta(delta: {
  kills?: number; deaths?: number; assists?: number; headshots?: number;
  matchesPlayed?: number; matchesWon?: number; bombsPlanted?: number; activeWeapon?: WeaponId;
}): void {
  const p = state.profile;
  const totalKills = p.totalKills + (delta.kills || 0);
  const totalDeaths = p.totalDeaths + (delta.deaths || 0);
  const totalAssists = p.totalAssists + (delta.assists || 0);
  const totalHeadshots = p.totalHeadshots + (delta.headshots || 0);
  const matchesPlayed = p.matchesPlayed + (delta.matchesPlayed || 0);
  const matchesWon = p.matchesWon + (delta.matchesWon || 0);
  const bombsPlanted = p.bombsPlanted + (delta.bombsPlanted || 0);
  const activeWeapon = delta.activeWeapon || p.activeWeapon;

  const unlockedAchievements = evaluateUnlockedAchievements({
    playerXp: p.playerXp, rankLevel: p.rankLevel, playerCash: p.playerCash,
    unlockedWeapons: p.unlockedWeapons, totalKills, totalDeaths, totalAssists,
    totalHeadshots, matchesPlayed, matchesWon, bombsPlanted,
    hasCustomAvatarOrCallsign: p.callsign !== 'OPERADOR-01' || p.avatarDataUrl.length > 0,
    isGoogleLinked: state.isGoogleLinked,
  }, p.unlockedAchievements);

  state.profile = {
    ...p,
    activeWeapon,
    totalKills,
    totalDeaths,
    totalAssists,
    totalHeadshots,
    matchesPlayed,
    matchesWon,
    bombsPlanted,
    unlockedAchievements,
    updatedAt: new Date().toISOString(),
  };
  persistLocalProfile(state.profile);
  emitState();
  scheduleCloudPush();
}

export interface CallsignClaimResult {
  success: boolean;
  error?: string;
  locked?: boolean;
}

export async function claimUniqueCallsign(
  requestedCallsign: string
): Promise<CallsignClaimResult> {
  const sanitized = requestedCallsign
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_\-]/g, '')
    .slice(0, 20);

  if (sanitized.length < 3) {
    return { success: false, error: 'O nome deve ter no mínimo 3 caracteres (apenas letras, números, hífen).' };
  }

  const p = state.profile;
  if (p.callsignLocked && p.callsign === sanitized) {
    return { success: true, locked: true };
  }

  if (p.callsignLocked && p.callsign !== sanitized) {
    return {
      success: false,
      error: `Seu Callsign único (${p.callsign}) já foi registrado permanentemente e não pode ser alterado.`,
    };
  }

  const lowerKey = sanitized.toLowerCase();
  const user = auth.currentUser;

  if (user) {
    try {
      const usernameRef = doc(db, 'usernames', lowerKey);
      const snap = await getDoc(usernameRef);
      if (snap.exists()) {
        const ownerUid = snap.data()?.uid;
        if (ownerUid !== user.uid) {
          return {
            success: false,
            error: `O Callsign "${sanitized}" já pertence a outro operador. Escolha outro nome exclusivo.`,
          };
        }
      } else {
        await setDoc(usernameRef, {
          callsign: sanitized,
          uid: user.uid,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `usernames/${lowerKey}`);
    }
  }

  state.profile = {
    ...p,
    callsign: sanitized,
    callsignLocked: true,
    updatedAt: new Date().toISOString(),
  };
  persistLocalProfile(state.profile);
  emitState();
  if (user) {
    await pushProfileToFirestoreNow();
  }
  return { success: true, locked: true };
}

export async function updatePlayerCallsignAndAvatar(
  newCallsign: string,
  newAvatarDataUrl?: string
): Promise<CallsignClaimResult> {
  const p = state.profile;
  const avatarDataUrl =
    newAvatarDataUrl !== undefined
      ? newAvatarDataUrl.slice(0, 58000)
      : p.avatarDataUrl;

  if (newAvatarDataUrl !== undefined) {
    state.profile = {
      ...state.profile,
      avatarDataUrl,
      updatedAt: new Date().toISOString(),
    };
    persistLocalProfile(state.profile);
    emitState();
  }

  if (newCallsign && newCallsign.trim() && newCallsign !== p.callsign) {
    const claimRes = await claimUniqueCallsign(newCallsign);
    if (!claimRes.success) {
      return claimRes;
    }
  } else if (newAvatarDataUrl !== undefined) {
    await pushProfileToFirestoreNow();
  }

  return { success: true, locked: Boolean(state.profile.callsignLocked) };
}

export async function resetPlayerAccountEntirely(): Promise<void> {
  const nowIso = new Date().toISOString();
  const defaultRank = getRankForXp(0);
  state.profile = {
    ...state.profile,
    playerXp: 0,
    playerCash: 3000,
    rankLevel: defaultRank.level,
    rankTitle: defaultRank.title,
    totalKills: 0,
    totalDeaths: 0,
    totalAssists: 0,
    totalHeadshots: 0,
    matchesPlayed: 0,
    matchesWon: 0,
    bombsPlanted: 0,
    unlockedAchievements: [],
    unlockedWeapons: computeUnlockedWeaponsForXp(0),
    economyVersion: 2,
    updatedAt: nowIso,
  };
  persistLocalProfile(state.profile);
  emitState();
  if (auth.currentUser) {
    await pushProfileToFirestoreNow();
  }
}
