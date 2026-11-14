/**
 * Per-weapon gunfeel tables: spray pattern, kick, camera punch, recovery.
 * Indices cycle while holding full-auto; semi weapons use index 0 + random jitter.
 */

import { WeaponId } from '../types/game';

export interface WeaponFeelDef {
  /** Vertical camera punch per shot (radians contribution into recoilPitch). */
  kickPitch: number;
  /** Horizontal bias amplitude. */
  kickYaw: number;
  /** Viewmodel Z kick. */
  kickZ: number;
  /** Camera shake impulse. */
  shake: number;
  /** Recovery / damp multiplier (higher = snappier return). */
  recovery: number;
  /** Flinch scale when player is hit while holding this weapon stance (unused for bots). */
  flinchScale: number;
  /** Ordered spray offsets (yaw, pitch) in radians-ish units before mult. */
  sprayPattern: Array<[number, number]>;
  /** Haptic pulse ms for unsuppressed shot. */
  hapticMs: number;
}

const AR_SPRAY: Array<[number, number]> = [
  [0.0, 0.012],
  [0.002, 0.014],
  [-0.003, 0.015],
  [0.004, 0.016],
  [-0.005, 0.017],
  [0.006, 0.015],
  [-0.004, 0.014],
  [0.003, 0.013],
  [-0.002, 0.012],
  [0.001, 0.011],
];

const SMG_SPRAY: Array<[number, number]> = [
  [0.0, 0.008],
  [0.003, 0.009],
  [-0.004, 0.01],
  [0.005, 0.011],
  [-0.003, 0.01],
  [0.002, 0.009],
  [-0.001, 0.008],
  [0.004, 0.009],
];

const LMG_SPRAY: Array<[number, number]> = [
  [0.0, 0.016],
  [0.004, 0.018],
  [-0.005, 0.02],
  [0.007, 0.021],
  [-0.008, 0.022],
  [0.006, 0.02],
  [-0.004, 0.018],
  [0.003, 0.017],
  [-0.002, 0.016],
  [0.001, 0.015],
  [0.005, 0.016],
  [-0.006, 0.017],
];

const FEEL: Record<WeaponId, WeaponFeelDef> = {
  P50_PISTOL: {
    kickPitch: 0.014,
    kickYaw: 0.003,
    kickZ: 0.028,
    shake: 0.005,
    recovery: 1.35,
    flinchScale: 1.1,
    sprayPattern: [[0, 0.01], [0.002, 0.011], [-0.002, 0.01]],
    hapticMs: 14,
  },
  SMG_45: {
    kickPitch: 0.009,
    kickYaw: 0.004,
    kickZ: 0.022,
    shake: 0.0035,
    recovery: 1.2,
    flinchScale: 0.95,
    sprayPattern: SMG_SPRAY,
    hapticMs: 12,
  },
  SMG_MP5: {
    kickPitch: 0.008,
    kickYaw: 0.0035,
    kickZ: 0.02,
    shake: 0.003,
    recovery: 1.25,
    flinchScale: 0.9,
    sprayPattern: SMG_SPRAY,
    hapticMs: 11,
  },
  SHOTGUN_12: {
    kickPitch: 0.028,
    kickYaw: 0.008,
    kickZ: 0.055,
    shake: 0.01,
    recovery: 0.85,
    flinchScale: 1.2,
    sprayPattern: [[0, 0.02]],
    hapticMs: 28,
  },
  SHOTGUN_SPAS: {
    kickPitch: 0.03,
    kickYaw: 0.009,
    kickZ: 0.058,
    shake: 0.011,
    recovery: 0.8,
    flinchScale: 1.25,
    sprayPattern: [[0, 0.022]],
    hapticMs: 30,
  },
  M4_CARBINE: {
    kickPitch: 0.011,
    kickYaw: 0.004,
    kickZ: 0.03,
    shake: 0.004,
    recovery: 1.1,
    flinchScale: 1.0,
    sprayPattern: AR_SPRAY,
    hapticMs: 17,
  },
  CARBINE_AR: {
    kickPitch: 0.0105,
    kickYaw: 0.0038,
    kickZ: 0.029,
    shake: 0.0038,
    recovery: 1.12,
    flinchScale: 1.0,
    sprayPattern: AR_SPRAY,
    hapticMs: 16,
  },
  AK47_RIFLE: {
    kickPitch: 0.014,
    kickYaw: 0.006,
    kickZ: 0.036,
    shake: 0.0055,
    recovery: 0.95,
    flinchScale: 1.05,
    sprayPattern: AR_SPRAY.map(([y, p]) => [y * 1.25, p * 1.15] as [number, number]),
    hapticMs: 20,
  },
  AK12_RIFLE: {
    kickPitch: 0.012,
    kickYaw: 0.005,
    kickZ: 0.032,
    shake: 0.0045,
    recovery: 1.05,
    flinchScale: 1.0,
    sprayPattern: AR_SPRAY,
    hapticMs: 18,
  },
  L49_LMG: {
    kickPitch: 0.015,
    kickYaw: 0.007,
    kickZ: 0.04,
    shake: 0.006,
    recovery: 0.75,
    flinchScale: 1.15,
    sprayPattern: LMG_SPRAY,
    hapticMs: 22,
  },
  SNIPER_BOLT: {
    kickPitch: 0.034,
    kickYaw: 0.01,
    kickZ: 0.062,
    shake: 0.012,
    recovery: 0.7,
    flinchScale: 1.3,
    sprayPattern: [[0, 0.025]],
    hapticMs: 36,
  },
  SNIPER_TACTICAL: {
    kickPitch: 0.03,
    kickYaw: 0.008,
    kickZ: 0.055,
    shake: 0.01,
    recovery: 0.78,
    flinchScale: 1.25,
    sprayPattern: [[0, 0.022]],
    hapticMs: 32,
  },
  KNIFE_TACTICAL: {
    kickPitch: 0.004,
    kickYaw: 0.001,
    kickZ: 0.01,
    shake: 0.002,
    recovery: 1.5,
    flinchScale: 0.8,
    sprayPattern: [[0, 0]],
    hapticMs: 10,
  },
};

export function getWeaponFeel(weaponId: WeaponId): WeaponFeelDef {
  return FEEL[weaponId] || FEEL.M4_CARBINE;
}

export function getSprayOffset(
  weaponId: WeaponId,
  shotIndex: number
): { yaw: number; pitch: number } {
  const feel = getWeaponFeel(weaponId);
  const pattern = feel.sprayPattern;
  if (!pattern.length) return { yaw: 0, pitch: feel.kickPitch };
  const [yaw, pitch] = pattern[shotIndex % pattern.length];
  return { yaw, pitch };
}
