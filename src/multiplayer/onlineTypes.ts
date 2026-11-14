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
  const offsetX = ((slotIndex % 5) - 2) * 1.15;
  const offsetZ = (slotIndex % 2) * 1.1;

  if (mode === 'DUST2_BOMB_5V5') {
    if (team === 'VANGUARD') {
      // TR Spawn (South) at y = 8.0m facing East (-PI/2)
      return { x: -16.25 + offsetX, y: 8.0, z: 18.75 + offsetZ, yaw: -Math.PI / 2 };
    }
    // CT Spawn (North Underpass) at y = 1.6m facing South (0)
    return { x: -6.25 + offsetX, y: 1.6, z: -56.25 + offsetZ, yaw: 0 };
  }

  if (mode === 'ASSAULT_BOMB_5V5') {
    if (team === 'VANGUARD') {
      // Attacker Street Spawn at y = 0.5m facing North (0)
      return { x: -26.7 + offsetX, y: 0.5, z: 36.7 + offsetZ, yaw: 0 };
    }
    // Defender Warehouse Interior Spawn at y = 0.5m facing South (PI)
    return { x: -2.3 + offsetX, y: 0.5, z: 6.9 - offsetZ, yaw: Math.PI };
  }

  if (mode === 'INDUSTRIA_BOMB_5V5') {
    if (team === 'VANGUARD') {
      return { x: 12.0 + offsetX, y: 1.85, z: -40.0 + offsetZ, yaw: 0 };
    }
    return { x: -5.0 + offsetX, y: 2.0, z: 48.0 - offsetZ, yaw: Math.PI };
  }

  if (mode === 'HANGAR_BOMB_5V5') {
    if (team === 'VANGUARD') {
      return { x: 0.0 + offsetX, y: 0.15, z: -18.0 + offsetZ, yaw: 0 };
    }
    return { x: 0.0 + offsetX, y: 0.15, z: 12.0 - offsetZ, yaw: Math.PI };
  }

  if (mode === 'EASTERN_CITY_BOMB_5V5') {
    if (team === 'VANGUARD') {
      return { x: 0.0 + offsetX, y: 0.2, z: -48.0 + offsetZ, yaw: 0 };
    }
    return { x: -6.0 + offsetX, y: 0.2, z: 48.0 - offsetZ, yaw: Math.PI };
  }

  if (mode === 'MIRAGE_ANUBIS_BOMB_5V5') {
    if (team === 'VANGUARD') {
      return { x: -33.0 + offsetX, y: 0.2, z: -72.0 + offsetZ, yaw: 0 };
    }
    return { x: -20.0 + offsetX, y: 0.2, z: 12.0 - offsetZ, yaw: Math.PI };
  }

  // YARD_BOMB_5V5 default
  if (team === 'VANGUARD') {
    return { x: 0 + offsetX, y: 0, z: 34.5 + offsetZ, yaw: 0 };
  }
  return { x: 0 + offsetX, y: 0, z: -25.5 - offsetZ, yaw: Math.PI };
}

