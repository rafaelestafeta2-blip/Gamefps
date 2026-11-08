export type GameScreenState =
  | 'INTRO'
  | 'LOADING'
  | 'MAIN_MENU'
  | 'TITLE'
  | 'PLAYING'
  | 'PAUSED'
  | 'VICTORY'
  | 'GAME_OVER';

export type WeaponId =
  | 'P50_PISTOL'
  | 'SMG_45'
  | 'M4_CARBINE'
  | 'CARBINE_AR'
  | 'AK47_RIFLE'
  | 'L49_LMG'
  | 'SNIPER_BOLT'
  | 'SNIPER_TACTICAL';
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

export type DrillMode = 'FREE_RANGE' | 'KILLHOUSE_BLITZ' | 'TACTICAL_WAVE';
export type QualityPreset = 'COMPETITIVE_120' | 'BALANCED_60' | 'ULTRA_PBR';
export type GyroMode = 'OFF' | 'ADS_ONLY' | 'ALWAYS';

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
  laserActive: boolean;
  reloadPhase: ReloadPhase;
  reloadProgress: number; // 0..1
  reloadTypeLabel: string;
  magCheckVisible: boolean;
  wallTuckAmount: number; // 0..1 when close to wall

  // Player Stance, Position & Radar Telemetry
  health: number;
  maxHealth: number;
  stamina: number; // 0..100 for breath hold & sprint
  isHoldingBreath: boolean;
  isAds: boolean;
  adsAlpha: number; // 0..1 smooth interpolation
  stance: 'STAND' | 'CROUCH' | 'PRONE' | 'SPRINT' | 'SLIDE';
  leanDirection: -1 | 0 | 1; // -1 Left (Q), 0 Center, 1 Right (E)
  playerPos: { x: number; z: number };
  playerYaw: number;
  radarTargets: Array<{
    id: string;
    sector: 'RANGE' | 'KILLHOUSE';
    x: number;
    z: number;
    isDown: boolean;
  }>;

  // Combat & Drill Telemetry
  drillMode: DrillMode;
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
  hapticsEnabled: boolean;
  isFullscreen: boolean;
  graphicQuality: 'HIGH' | 'LOW';
  fpsLimit: number;
}
