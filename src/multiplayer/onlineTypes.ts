import { DrillMode, WeaponId } from '../types/game';

export type OnlineTeam = 'VANGUARD' | 'BLACKTHORN';
export type MatchQueueType = 'CASUAL' | 'RANKED';

export interface OnlinePlayerState {
  uid: string;
  callsign: string;
  team: OnlineTeam;
  rankLevel: number;
  mmr?: number;
  avatarDataUrl: string;
  weaponId: WeaponId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  health: number;
  armor: number;
  isDown: boolean;
  isCrouching: boolean;
  isFiring: boolean;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  loadProgress?: number;
  isLoaded?: boolean;
  lastShotAtMs: number;
  updatedAtMs: number;
}

export interface OnlineHitEvent {
  eventId: string;
  attackerUid: string;
  attackerCallsign: string;
  attackerTeam: OnlineTeam;
  targetUid: string;
  targetCallsign: string;
  targetTeam: OnlineTeam;
  weaponId: WeaponId;
  damage: number;
  isHeadshot: boolean;
   lethal: boolean;
  ts: number;
}

export interface OnlineRoomState {
  roomId: string;
  hostUid: string;
  arenaMode: DrillMode;
  isPrivate: boolean;
  queueType?: MatchQueueType;
  averageMmr?: number;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  currentRound: number;
  vanguardScore: number;
  blackthornScore: number;
  bombStatus: 'CARRIED' | 'PLANTED' | 'DEFUSED' | 'DETONATED';
  plantedSite: 'NONE' | 'A' | 'B';
  players: Record<string, OnlinePlayerState>;
  lastHitEvent?: OnlineHitEvent | null;
  updatedAtMs: number;
  createdAt: string;
}

export function getTeamSpawnForArena(
  mode: DrillMode,
  team: OnlineTeam,
  slotIndex = 0
): { x: number; y: number; z: number; yaw: number } {
  const offsetX = ((slotIndex % 5) - 2) * 1.45;
  const offsetZ = (slotIndex % 2) * 1.1;

  if (mode === 'DUST2_BOMB_5V5') {
    if (team === 'VANGUARD') {
      return { x: -12 + offsetX, y: 1.5, z: -27.5 + offsetZ, yaw: 0 };
    }
    return { x: 8.5 + offsetX, y: 1.5, z: 36.5 - offsetZ, yaw: Math.PI };
  }

  if (mode === 'ASSAULT_BOMB_5V5') {
    if (team === 'VANGUARD') {
      return { x: -18.5 + offsetX, y: 1.5, z: 24.0 + offsetZ, yaw: Math.PI };
    }
    return { x: 8.0 + offsetX, y: 1.5, z: -14.0 - offsetZ, yaw: 0 };
  }

  // YARD_BOMB_5V5 default
  if (team === 'VANGUARD') {
    return { x: 0 + offsetX, y: 0, z: 34.5 + offsetZ, yaw: 0 };
  }
  return { x: 0 + offsetX, y: 0, z: -25.5 - offsetZ, yaw: Math.PI };
}
