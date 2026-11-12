import { OpticType, WeaponId } from '../types/game';
import { RANKS_PART_1 } from './ranksDataPart1';
import { RANKS_PART_2 } from './ranksDataPart2';

export interface RankDefinition {
  level: number;
  title: string;
  badge: string;
  badgeColor: string;
  category:
    | 'INICIANTE'
    | 'SOLDADO'
    | 'SARGENTO'
    | 'OFICIAL'
    | 'COMANDANTE'
    | 'SF_ELITE'
    | 'SUPREMO';
  requiredXp: number;
  unlockRewardLabel: string;
  unlockedWeapons: WeaponId[];
  unlockedOptics: OpticType[];
  unlockedAttachments: Array<'suppressor' | 'laser' | 'canted'>;
}

export const WARFACE_RANKS: RankDefinition[] = [
  ...RANKS_PART_1,
  ...RANKS_PART_2,
];

const LOCAL_STORAGE_XP_KEY = 'kinetic_fps_warface_xp_v2';
const LOCAL_STORAGE_CASH_KEY = 'kinetic_fps_warface_cash_v2';
export const INITIAL_PLAYER_CASH = 3000;

let cloudProgressionHook: ((xp: number, cash: number) => void) | null = null;

export function registerCloudProgressionHook(
  hook: (xp: number, cash: number) => void
): void {
  cloudProgressionHook = hook;
}

export function resetLocalProgression(): void {
  savePlayerXpDirect(0);
  savePlayerCashDirect(INITIAL_PLAYER_CASH);
  if (cloudProgressionHook) {
    cloudProgressionHook(0, INITIAL_PLAYER_CASH);
  }
}

export function loadSavedPlayerXp(): number {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_XP_KEY);
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  } catch {
    return 0;
  }
}

export function savePlayerXpDirect(xp: number): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_XP_KEY, Math.max(0, xp).toString());
  } catch {
    // Ignore quota errors
  }
}

export function savePlayerXp(xp: number): void {
  const clamped = Math.max(0, xp);
  savePlayerXpDirect(clamped);
  if (cloudProgressionHook) {
    cloudProgressionHook(clamped, loadSavedPlayerCash());
  }
}

export function loadSavedPlayerCash(): number {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CASH_KEY);
    if (!raw) {
      savePlayerCashDirect(INITIAL_PLAYER_CASH);
      return INITIAL_PLAYER_CASH;
    }
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? INITIAL_PLAYER_CASH : Math.max(0, parsed);
  } catch {
    return INITIAL_PLAYER_CASH;
  }
}

export function savePlayerCashDirect(cash: number): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_CASH_KEY, Math.max(0, cash).toString());
  } catch {
    // Ignore quota errors
  }
}

export function addPlayerCash(delta: number): number {
  const next = Math.max(0, loadSavedPlayerCash() + Math.round(delta));
  savePlayerCashDirect(next);
  if (cloudProgressionHook) {
    cloudProgressionHook(loadSavedPlayerXp(), next);
  }
  return next;
}

export function getRankForXp(xp: number): RankDefinition {
  let currentRank = WARFACE_RANKS[0];
  for (const rank of WARFACE_RANKS) {
    if (xp >= rank.requiredXp) {
      currentRank = rank;
    } else {
      break;
    }
  }
  return currentRank;
}

export function getNextRank(currentLevel: number): RankDefinition | null {
  const idx = WARFACE_RANKS.findIndex((r) => r.level === currentLevel);
  if (idx !== -1 && idx < WARFACE_RANKS.length - 1) {
    return WARFACE_RANKS[idx + 1];
  }
  return null;
}

export function getRequiredXpForWeapon(weaponId: WeaponId): {
  requiredLevel: number;
  rankTitle: string;
} {
  if (weaponId === 'KNIFE_TACTICAL') {
    return { requiredLevel: 1, rankTitle: 'Trainee' };
  }
  for (const rank of WARFACE_RANKS) {
    if (rank.unlockedWeapons.includes(weaponId)) {
      return { requiredLevel: rank.level, rankTitle: rank.title };
    }
  }
  return { requiredLevel: 1, rankTitle: 'Trainee' };
}

export function getRequiredXpForOptic(optic: OpticType): {
  requiredLevel: number;
  rankTitle: string;
} {
  for (const rank of WARFACE_RANKS) {
    if (rank.unlockedOptics.includes(optic)) {
      return { requiredLevel: rank.level, rankTitle: rank.title };
    }
  }
  return { requiredLevel: 1, rankTitle: 'Trainee' };
}

export function getRequiredXpForAttachment(
  attachment: 'suppressor' | 'laser' | 'canted'
): {
  requiredLevel: number;
  rankTitle: string;
} {
  for (const rank of WARFACE_RANKS) {
    if (rank.unlockedAttachments.includes(attachment)) {
      return { requiredLevel: rank.level, rankTitle: rank.title };
    }
  }
  return { requiredLevel: 1, rankTitle: 'Trainee' };
}

export function isWeaponUnlockedAtXp(weaponId: WeaponId, xp: number): boolean {
  if (weaponId === 'KNIFE_TACTICAL') return true;
  const currentRank = getRankForXp(xp);
  return currentRank.unlockedWeapons.includes(weaponId);
}

export function isOpticUnlockedAtXp(optic: OpticType, xp: number): boolean {
  const currentRank = getRankForXp(xp);
  return currentRank.unlockedOptics.includes(optic);
}

export function isAttachmentUnlockedAtXp(
  attachment: 'suppressor' | 'laser' | 'canted',
  xp: number
): boolean {
  const currentRank = getRankForXp(xp);
  return currentRank.unlockedAttachments.includes(attachment);
}
