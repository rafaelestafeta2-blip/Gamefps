export type GameScreenState =
  | 'INTRO'
  | 'VIDEO_INTRO'
  | 'LOADING'
  | 'AUTH_LOGIN'
  | 'MAIN_MENU'
  | 'TITLE'
  | 'PLAYING'
  | 'PAUSED'
  | 'VICTORY'
  | 'GAME_OVER';

export type WeaponId =
  | 'P50_PISTOL'
  | 'SMG_45'
  | 'SMG_MP5'
  | 'SHOTGUN_12'
  | 'SHOTGUN_SPAS'
  | 'M4_CARBINE'
  | 'CARBINE_AR'
  | 'AK47_RIFLE'
  | 'AK12_RIFLE'
  | 'L49_LMG'
  | 'SNIPER_BOLT'
  | 'SNIPER_TACTICAL'
  | 'KNIFE_TACTICAL';
export type OpticType = 'holo' | 'lpvo' | 'iron';
export type FireMode = 'SEMI' | 'BURST' | 'AUTO';
export type GrenadeType = 'FRAG' | 'SMOKE';
export type ReloadPhase =
  | 'IDLE'
  | 'MAG_OUT'
  | 'MAG_IN'
  | 'BOLT_SLAP'
  | 'CHARGING_PULL'
  | 'MAG_CHECK';

export type DrillMode =
  | 'FREE_RANGE'
  | 'KILLHOUSE_BLITZ'
  | 'TACTICAL_WAVE'
  | 'YARD_BOMB_5V5'
  | 'DUST2_BOMB_5V5'
  | 'ASSAULT_BOMB_5V5'
  | 'INDUSTRIA_BOMB_5V5'
  | 'HANGAR_BOMB_5V5'
  | 'EASTERN_CITY_BOMB_5V5';
export type QualityPreset = 'COMPETITIVE_120' | 'BALANCED_60' | 'ULTRA_PBR';
export type GyroMode = 'OFF' | 'ADS_ONLY' | 'ALWAYS';

export interface KillfeedEntry {
  id: string;
  killerName: string;
  killerTeam: 'VANGUARD' | 'BLACKTHORN';
  victimName: string;
  victimTeam: 'VANGUARD' | 'BLACKTHORN';
  weaponId: WeaponId | 'GRENADE' | 'KNIFE_TACTICAL';
  isHeadshot: boolean;
  timestamp: number;
}

export interface SquadOperatorStats {
  callsign: string;
  roleTitle: string;
  weaponId: WeaponId;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  score: number;
  isPlayer: boolean;
}

export interface YardBombHudInfo {
  bombStatus: 'CARRIED' | 'PLANTING' | 'PLANTED' | 'DETONATED' | 'DEFUSED';
  plantedSite: 'A' | 'B' | null;
  nearSite: 'A' | 'B' | null;
  plantProgress: number; // 0..1
  roundTimerSec: number;
  c4TimerSec: number;
  alliesAlive: number; // 0..5 (includes player)
  enemiesAlive: number; // 0..5
  calloutLabel: string;
  currentRound: number; // 1..6
  maxRounds: number; // 6
  vanguardScore: number;
  blackthornScore: number;
  roundState: 'EQUIP' | 'PLAYING' | 'ROUND_OVER' | 'MATCH_OVER';
  roundWinner: 'VANGUARD' | 'BLACKTHORN' | null;
  roundWinReason: string;
  roundTransitionSec: number;
  /** Pre-round equip countdown (Warface-style ~7s). */
  equipTimerSec: number;
  matchWinner: 'VANGUARD' | 'BLACKTHORN' | null;
  lastRoundXp: number;
  lastRoundCash: number;
  totalMatchXp: number;
  totalMatchCash: number;
  /** Snapshot at match start for post-match XP theater. */
  matchStartXp?: number;
  matchStartRank?: number;
  matchStartCash?: number;
  matchStartUnlockedWeapons?: WeaponId[];
  isSpectating?: boolean;
  spectatedCallsign?: string;
  spectatedWeapon?: WeaponId;
  spectatedHealth?: number;
  squadStats?: SquadOperatorStats[];
}

export interface BallisticShotTelemetry {
  id: number;
  distanceMeters: number;
  zone: 'HEAD' | 'TORSO_A' | 'TORSO_C' | 'ARMOR' | 'STEEL_GONG';
  damage: number;
  velocityMs: number;
  reactionMs: number;
  timestamp: number;
}

export interface HudState {
  screen: GameScreenState;
  pointerLocked: boolean;
  // Weapon & Ammo State
  activeWeapon: WeaponId;
  primaryWeapon: WeaponId;
  secondaryWeapon: WeaponId;
  nearWallStand: boolean;
  focusedWallWeapon: WeaponId | null;
  chambered: number; // 0 or 1
  currentMagRounds: number; // 0..30
  magCapacity: number; // 12, 30, or 100
  magazines: number[]; // e.g., [12, 12, 12, 12] in chest rig
  fragGrenades: number; // Frag grenades count
  smokeGrenades: number; // Smoke grenades count
  equippedGrenade: GrenadeType | null; // Currently held grenade in player's hand
  isThrowingGrenade: boolean;
  boltLockedBack: boolean;
  fireMode: FireMode;
  optic: OpticType;
  lpvoZoom: number; // 1.0 to 4.0
  cantedActive: boolean;
  suppressorAttached: boolean;
  muzzleDevice:
    | 'NONE'
    | 'SL01_LONG'
    | 'SC01_SHORT'
    | 'FH01_FLASH_HIDER'
    | 'MB01_BRAKE'
    | 'MC01_COMPENSATOR';
  weaponCharm: 'NONE' | 'HONEY_CUB' | 'MICRO_TERMINAL' | 'STARDROP_TEAL';
  laserActive: boolean;
  reloadPhase: ReloadPhase;
  reloadProgress: number; // 0..1
  reloadTypeLabel: string;
  magCheckVisible: boolean;
  wallTuckAmount: number; // 0..1 when close to wall

  // Player Stance, Position & Radar Telemetry
  health: number;
  maxHealth: number;
  /** Separate vest pool (engineer repairs; soaks damage before HP). */
  armor: number;
  maxArmor: number;
  /** Active Warface class for HUD support kit. */
  playerClass: 'FUZILEIRO' | 'MEDICO' | 'ENGENHEIRO' | 'FRANCO_ATIRADOR';
  supportKind: 'AMMO' | 'HEAL' | 'ARMOR' | 'NONE';
  supportCharges: number;
  supportMaxCharges: number;
  supportCooldownSec: number;
  supportPrompt: string;
  /** 0..1 progress while channeling ammo/heal/armor kit (~15s). */
  kitChannelProgress: number;
  reviveChargeProgress: number;
  reviveMarkers: Array<{
    id: string;
    callsign: string;
    bearingRad: number;
    distanceM: number;
    remainingSec: number;
    inRange: boolean;
  }>;
  /** Class-filtered ally need edge icons (HP / ammo / armor). */
  allyNeedMarkers: Array<{
    id: string;
    callsign: string;
    need: 'HP' | 'AMMO' | 'ARMOR';
    bearingRad: number;
    distanceM: number;
    severity: number;
    inRange: boolean;
  }>;
  stamina: number; // 0..100 for breath hold & sprint
  isHoldingBreath: boolean;
  isAds: boolean;
  adsAlpha: number; // 0..1 smooth interpolation
  stance: 'STAND' | 'CROUCH' | 'PRONE' | 'SPRINT' | 'SLIDE';
  leanDirection: -1 | 0 | 1; // -1 Left (Q), 0 Center, 1 Right (E)
  playerPos: { x: number; y?: number; z: number };
  playerYaw: number;
  radarTargets: Array<{
    id: string;
    sector: 'RANGE' | 'KILLHOUSE';
    x: number;
    z: number;
    isDown: boolean;
    isAlly?: boolean;
  }>;

  // Combat & Drill Telemetry
  drillMode: DrillMode;
  yardBomb?: YardBombHudInfo;
  score: number;
  hits: number;
  shotsFired: number;
  headshots: number;
  targetsRemaining: number;
  totalTargetsInDrill: number;
  courseTimerSec: number;
  bestCourseTimeSec: number | null;
  lastHitZone: 'HEAD' | 'TORSO' | 'ARMOR' | 'KILL' | null;
  lastShotTelemetry: BallisticShotTelemetry | null;
  shotHistory: BallisticShotTelemetry[];
  hitMarkerAlpha: number;
  hitMarkerIsCrit: boolean;
  damageFlashAlpha: number;
  killfeed: KillfeedEntry[];

  // Warface Rank Progression System
  playerXp: number;
  rankLevel: number;
  rankTitle: string;
  rankBadge: string;
  rankBadgeColor: string;
  nextRankXp: number;
  lastXpGained: number;
  rankUpNotification: string | null;

  // Audio, UI & Mobile Hardware Features
  muted: boolean;
  dockCollapsed: boolean;
  touchControlsVisible: boolean;
  isCrouchingToggled: boolean;
  isProneToggled: boolean;
  qualityPreset: QualityPreset;
  dynamicResolutionEnabled: boolean;
  liveFps: number;
  renderScalePercent: number;
  gyroMode: GyroMode;
  gyroSensitivity: number;
  lookSensitivity: number;
  adsSensitivity: number;
  aimAssistStrength: number;
  hapticsEnabled: boolean;
  isFullscreen: boolean;
  graphicQuality: 'HIGH' | 'LOW';
  fpsLimit: number;
}
