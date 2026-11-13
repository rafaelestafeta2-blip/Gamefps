import { User } from 'firebase/auth';
import { evaluateUnlockedAchievements } from '../progression/achievementsData';
import {
  getRankForXp,
  loadSavedPlayerCash,
  loadSavedPlayerXp,
  savePlayerCashDirect,
  savePlayerXpDirect,
} from '../progression/ranks';
import { WeaponId } from '../types/game';

export interface PlayerCloudProfile {
  uid: string;
  callsign: string;
  callsignLocked?: boolean;
  email: string;
  avatarDataUrl: string;
  playerXp: number;
  rankLevel: number;
  rankTitle: string;
  playerCash: number;
  activeWeapon: WeaponId;
  unlockedWeapons: WeaponId[];
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  totalHeadshots: number;
  matchesPlayed: number;
  matchesWon: number;
  bombsPlanted: number;
  unlockedAchievements: string[];
  economyVersion?: number;
  mmr?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CloudSyncState {
  profile: PlayerCloudProfile;
  authReady: boolean;
  isGoogleLinked: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
}

const LOCAL_PROFILE_STORAGE_KEY = 'kinetic_fps_cloud_profile_v1';

const ALL_WEAPONS: WeaponId[] = [
  'P50_PISTOL',
  'SMG_45',
  'SMG_MP5',
  'SHOTGUN_12',
  'SHOTGUN_SPAS',
  'M4_CARBINE',
  'CARBINE_AR',
  'AK47_RIFLE',
  'AK12_RIFLE',
  'L49_LMG',
  'SNIPER_BOLT',
  'SNIPER_TACTICAL',
  'KNIFE_TACTICAL',
];

export function computeUnlockedWeaponsForXp(
  xp: number,
  extraUnlocked: WeaponId[] = []
): WeaponId[] {
  const rank = getRankForXp(xp);
  const set = new Set<WeaponId>([
    'M4_CARBINE',
    'AK12_RIFLE',
    'SHOTGUN_12',
    'SMG_45',
    'SNIPER_TACTICAL',
    'P50_PISTOL',
    'KNIFE_TACTICAL',
    ...rank.unlockedWeapons,
    ...extraUnlocked,
  ]);
  return ALL_WEAPONS.filter((w) => set.has(w));
}

export const CURRENT_ECONOMY_VERSION = 2;
export const INITIAL_PLAYER_CASH = 3000;

export function loadLocalProfileFallback(): PlayerCloudProfile {
  const nowIso = new Date().toISOString();

  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlayerCloudProfile> & { economyVersion?: number };
      const isOutdatedEconomy = parsed.economyVersion !== CURRENT_ECONOMY_VERSION;

      // Zera o banco e reconfigura para 3 mil K-Money e 0 XP se a versão da economia for antiga
      const mergedXp = isOutdatedEconomy ? 0 : Math.max(0, Number(parsed.playerXp) || 0);
      const mergedCash = isOutdatedEconomy ? INITIAL_PLAYER_CASH : Math.max(0, Number(parsed.playerCash) || INITIAL_PLAYER_CASH);
      const mergedRank = getRankForXp(mergedXp);
      const unlockedWeapons = computeUnlockedWeaponsForXp(
        mergedXp,
        isOutdatedEconomy ? [] : (parsed.unlockedWeapons as WeaponId[]) || []
      );
      const callsign = (parsed.callsign || 'OPERADOR-01').trim().slice(0, 32);
      const avatarDataUrl = parsed.avatarDataUrl || '';
      const totalKills = isOutdatedEconomy ? 0 : Math.max(0, Number(parsed.totalKills) || 0);
      const totalDeaths = isOutdatedEconomy ? 0 : Math.max(0, Number(parsed.totalDeaths) || 0);
      const totalAssists = isOutdatedEconomy ? 0 : Math.max(0, Number(parsed.totalAssists) || 0);
      const totalHeadshots = isOutdatedEconomy ? 0 : Math.max(0, Number(parsed.totalHeadshots) || 0);
      const matchesPlayed = isOutdatedEconomy ? 0 : Math.max(0, Number(parsed.matchesPlayed) || 0);
      const matchesWon = isOutdatedEconomy ? 0 : Math.max(0, Number(parsed.matchesWon) || 0);
      const bombsPlanted = isOutdatedEconomy ? 0 : Math.max(0, Number(parsed.bombsPlanted) || 0);

      const unlockedAchievements = isOutdatedEconomy
        ? []
        : evaluateUnlockedAchievements(
            {
              playerXp: mergedXp,
              rankLevel: mergedRank.level,
              playerCash: mergedCash,
              unlockedWeapons,
              totalKills,
              totalDeaths,
              totalAssists,
              totalHeadshots,
              matchesPlayed,
              matchesWon,
              bombsPlanted,
              hasCustomAvatarOrCallsign:
                callsign !== 'OPERADOR-01' || avatarDataUrl.length > 0,
              isGoogleLinked: Boolean(parsed.uid && parsed.uid !== 'local-guest'),
            },
            parsed.unlockedAchievements || []
          );

      return {
        uid: parsed.uid || 'local-guest',
        callsign,
        callsignLocked: Boolean(parsed.callsignLocked),
        email: parsed.email || '',
        avatarDataUrl,
        playerXp: mergedXp,
        rankLevel: mergedRank.level,
        rankTitle: mergedRank.title,
        playerCash: mergedCash,
        activeWeapon: (parsed.activeWeapon as WeaponId) || 'M4_CARBINE',
        unlockedWeapons,
        totalKills,
        totalDeaths,
        totalAssists,
        totalHeadshots,
        matchesPlayed,
        matchesWon,
        bombsPlanted,
        unlockedAchievements,
        economyVersion: CURRENT_ECONOMY_VERSION,
        mmr: isOutdatedEconomy || !parsed.mmr || parsed.mmr === 1000 ? 2450 : Math.max(100, Number(parsed.mmr)),
        createdAt: parsed.createdAt || nowIso,
        updatedAt: nowIso,
      };
    }
  } catch {
    // Fallback to clean profile
  }

  const defaultRank = getRankForXp(0);
  return {
    uid: 'local-guest',
    callsign: 'OPERADOR-01',
    callsignLocked: false,
    email: '',
    avatarDataUrl: '',
    playerXp: 0,
    rankLevel: defaultRank.level,
    rankTitle: defaultRank.title,
    playerCash: INITIAL_PLAYER_CASH,
    activeWeapon: 'M4_CARBINE',
    unlockedWeapons: computeUnlockedWeaponsForXp(0),
    totalKills: 0,
    totalDeaths: 0,
    totalAssists: 0,
    totalHeadshots: 0,
    matchesPlayed: 0,
    matchesWon: 0,
    bombsPlanted: 0,
    unlockedAchievements: [],
    economyVersion: CURRENT_ECONOMY_VERSION,
    mmr: 2450,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function persistLocalProfile(profile: PlayerCloudProfile): void {
  savePlayerXpDirect(profile.playerXp);
  savePlayerCashDirect(profile.playerCash);
  try {
    localStorage.setItem(LOCAL_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors
  }
}

export function mergeLocalAndCloudProfiles(
  local: PlayerCloudProfile,
  cloud: (Partial<PlayerCloudProfile> & { economyVersion?: number }) | null,
  firebaseUser: User
): PlayerCloudProfile {
  const nowIso = new Date().toISOString();
  const isCloudOutdated = cloud && cloud.economyVersion !== CURRENT_ECONOMY_VERSION;

  const mergedXp = isCloudOutdated
    ? 0
    : Math.max(local.playerXp, loadSavedPlayerXp(), Number(cloud?.playerXp) || 0);
  const mergedCash = isCloudOutdated
    ? INITIAL_PLAYER_CASH
    : Math.max(local.playerCash, loadSavedPlayerCash(), Number(cloud?.playerCash) || INITIAL_PLAYER_CASH);
  const rank = getRankForXp(mergedXp);

  const defaultGoogleName = (
    firebaseUser.displayName ||
    firebaseUser.email?.split('@')[0] ||
    'OPERADOR-01'
  )
    .toUpperCase()
    .slice(0, 24);

  const callsign = (
    cloud?.callsign ||
    (local.callsign !== 'OPERADOR-01' ? local.callsign : defaultGoogleName)
  )
    .trim()
    .slice(0, 32);

  const avatarDataUrl = (
    cloud?.avatarDataUrl ||
    local.avatarDataUrl ||
    firebaseUser.photoURL ||
    ''
  ).slice(0, 58000);

  const unlockedWeapons = computeUnlockedWeaponsForXp(mergedXp, [
    ...(local.unlockedWeapons || []),
    ...((cloud?.unlockedWeapons as WeaponId[]) || []),
  ]);

  const totalKills = Math.max(local.totalKills, Number(cloud?.totalKills) || 0);
  const totalDeaths = Math.max(local.totalDeaths, Number(cloud?.totalDeaths) || 0);
  const totalAssists = Math.max(local.totalAssists, Number(cloud?.totalAssists) || 0);
  const totalHeadshots = Math.max(
    local.totalHeadshots,
    Number(cloud?.totalHeadshots) || 0
  );
  const matchesPlayed = Math.max(
    local.matchesPlayed,
    Number(cloud?.matchesPlayed) || 0
  );
  const matchesWon = Math.max(local.matchesWon, Number(cloud?.matchesWon) || 0);
  const bombsPlanted = Math.max(
    local.bombsPlanted,
    Number(cloud?.bombsPlanted) || 0
  );

  const unlockedAchievements = evaluateUnlockedAchievements(
    {
      playerXp: mergedXp,
      rankLevel: rank.level,
      playerCash: mergedCash,
      unlockedWeapons,
      totalKills,
      totalDeaths,
      totalAssists,
      totalHeadshots,
      matchesPlayed,
      matchesWon,
      bombsPlanted,
      hasCustomAvatarOrCallsign:
        callsign !== 'OPERADOR-01' || avatarDataUrl.length > 0,
      isGoogleLinked: true,
    },
    [
      ...(local.unlockedAchievements || []),
      ...(cloud?.unlockedAchievements || []),
    ]
  );

  return {
    uid: firebaseUser.uid,
    callsign: callsign || 'OPERADOR-01',
    callsignLocked: Boolean(cloud?.callsignLocked || local.callsignLocked),
    email: (firebaseUser.email || cloud?.email || '').slice(0, 150),
    avatarDataUrl,
    playerXp: mergedXp,
    rankLevel: rank.level,
    rankTitle: rank.title,
    playerCash: mergedCash,
    activeWeapon:
      (cloud?.activeWeapon as WeaponId) || local.activeWeapon || 'M4_CARBINE',
    unlockedWeapons,
    totalKills,
    totalDeaths,
    totalAssists,
    totalHeadshots,
    matchesPlayed,
    matchesWon,
    bombsPlanted,
    unlockedAchievements,
    economyVersion: CURRENT_ECONOMY_VERSION,
    mmr: isCloudOutdated
      ? 2450
      : Number(cloud?.mmr) > 0 && Number(cloud?.mmr) !== 1000
      ? Number(cloud?.mmr)
      : Number(local.mmr) > 0 && Number(local.mmr) !== 1000
      ? Number(local.mmr)
      : 2450,
    createdAt: cloud?.createdAt || local.createdAt || nowIso,
    updatedAt: nowIso,
  };
}

export function compressAvatarFileToDataUrl(
  file: File,
  targetSize = 160
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler arquivo de imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagem inválida.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas indisponível.'));
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
