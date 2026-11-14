/**
 * Loads Mixamo FBX clips from Gamesfps Animaçao pack
 * (commit 2bb315ac …/Animaçao) and maps them onto BotAnimState keys.
 */

import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { BotAnimState, BotClipMap } from './botCharacterClips';

const BASE = '/models/animations';

/** Canonical overlay keys we extract from FBX files. */
export type AnimPackKey =
  | BotAnimState
  | 'MANTLE'
  | 'CPR'
  | 'KNEEL_DOWN'
  | 'KNEEL_INSPECT'
  | 'RIFLE_JUMP'
  | 'RIFLE_RELOAD_3P'
  | 'PISTOL_IDLE'
  | 'PISTOL_WALK'
  | 'PISTOL_RUN'
  | 'PISTOL_WALK_BACK'
  | 'PISTOL_RUN_BACK'
  | 'PISTOL_STRAFE_L'
  | 'PISTOL_STRAFE_R'
  | 'PISTOL_CROUCH'
  | 'PISTOL_STAND_TO_KNEEL'
  | 'PISTOL_KNEEL_TO_STAND'
  | 'KIT_PICKUP'
  | 'KIT_HOLD'
  | 'KIT_PUT_DOWN';

type FileSpec = { url: string; key: AnimPackKey };

const BASIC_SHOOTER: FileSpec[] = [
  { url: `${BASE}/basic_shooter/toss_grenade.fbx`, key: 'RIFLE_THROW' },
  { url: `${BASE}/basic_shooter/hit_reaction.fbx`, key: 'RIFLE_HIT' },
  { url: `${BASE}/basic_shooter/firing_rifle.fbx`, key: 'RIFLE_FIRE' },
  { url: `${BASE}/basic_shooter/rifle_run.fbx`, key: 'RIFLE_RUN' },
  { url: `${BASE}/basic_shooter/walking.fbx`, key: 'RIFLE_WALK' },
  { url: `${BASE}/basic_shooter/walking_backwards.fbx`, key: 'RIFLE_WALK_BACK' },
  { url: `${BASE}/basic_shooter/run_backwards.fbx`, key: 'RIFLE_WALK_BACK' }, // prefer run-back if walk already set — handled below
  { url: `${BASE}/basic_shooter/strafe_left.fbx`, key: 'RIFLE_WALK_LEFT' },
  { url: `${BASE}/basic_shooter/strafe_right.fbx`, key: 'RIFLE_WALK_RIGHT' },
  { url: `${BASE}/basic_shooter/strafe.fbx`, key: 'RIFLE_RUN_LEFT' },
  { url: `${BASE}/basic_shooter/strafe_2.fbx`, key: 'RIFLE_RUN_RIGHT' },
  { url: `${BASE}/basic_shooter/rifle_aiming_idle.fbx`, key: 'RIFLE_AIM' },
  { url: `${BASE}/basic_shooter/rifle_jump.fbx`, key: 'RIFLE_JUMP' },
  { url: `${BASE}/basic_shooter/reloading.fbx`, key: 'RIFLE_RELOAD_3P' },
];

const PISTOL: FileSpec[] = [
  { url: `${BASE}/pistol_loco/pistol_idle.fbx`, key: 'PISTOL_IDLE' },
  { url: `${BASE}/pistol_loco/pistol_walk.fbx`, key: 'PISTOL_WALK' },
  { url: `${BASE}/pistol_loco/pistol_run.fbx`, key: 'PISTOL_RUN' },
  { url: `${BASE}/pistol_loco/pistol_walk_backward.fbx`, key: 'PISTOL_WALK_BACK' },
  { url: `${BASE}/pistol_loco/pistol_run_backward.fbx`, key: 'PISTOL_RUN_BACK' },
  { url: `${BASE}/pistol_loco/pistol_strafe.fbx`, key: 'PISTOL_STRAFE_L' },
  { url: `${BASE}/pistol_loco/pistol_strafe_2.fbx`, key: 'PISTOL_STRAFE_R' },
  { url: `${BASE}/pistol_loco/pistol_kneeling_idle.fbx`, key: 'PISTOL_CROUCH' },
  { url: `${BASE}/pistol_loco/pistol_stand_to_kneel.fbx`, key: 'PISTOL_STAND_TO_KNEEL' },
  { url: `${BASE}/pistol_loco/pistol_kneel_to_stand.fbx`, key: 'PISTOL_KNEEL_TO_STAND' },
];

const SINGLES: FileSpec[] = [
  { url: `${BASE}/singles/braced_hang_to_crouch.fbx`, key: 'MANTLE' },
  { url: `${BASE}/singles/administering_cpr.fbx`, key: 'CPR' },
  { url: `${BASE}/singles/kneeling_down.fbx`, key: 'KNEEL_DOWN' },
  { url: `${BASE}/singles/kneeling_inspecting.fbx`, key: 'KNEEL_INSPECT' },
];

/** Gamesfps Animaçao/Picup — class kit pick / hold / put-down. */
const PICUP: FileSpec[] = [
  { url: `${BASE}/picup/picking_up_object.fbx`, key: 'KIT_PICKUP' },
  { url: `${BASE}/picup/standing_torch_hold.fbx`, key: 'KIT_HOLD' },
  { url: `${BASE}/picup/putting_down.fbx`, key: 'KIT_PUT_DOWN' },
];

function normalizeMixamoClip(clip: THREE.AnimationClip, forceName: string): THREE.AnimationClip {
  const cloned = clip.clone();
  cloned.name = forceName;
  for (let i = 0; i < cloned.tracks.length; i++) {
    const t = cloned.tracks[i];
    if (t.name.includes(':')) t.name = t.name.replace(/:/g, '');
    // Mixamo FBX sometimes prefixes with armature name
    if (t.name.startsWith('mixamorig')) continue;
    const idx = t.name.indexOf('mixamorig');
    if (idx > 0) t.name = t.name.slice(idx);
  }
  return cloned;
}

function extractClip(fbx: THREE.Group, key: AnimPackKey): THREE.AnimationClip | null {
  const anims = (fbx as THREE.Group & { animations?: THREE.AnimationClip[] }).animations;
  if (!anims || anims.length === 0) return null;
  // Prefer longest clip (main motion)
  let best = anims[0];
  for (let i = 1; i < anims.length; i++) {
    if ((anims[i].duration || 0) > (best.duration || 0)) best = anims[i];
  }
  return normalizeMixamoClip(best, key);
}

let packPromise: Promise<Map<AnimPackKey, THREE.AnimationClip>> | null = null;
let packCache: Map<AnimPackKey, THREE.AnimationClip> | null = null;

export function getAnimPackClip(key: AnimPackKey): THREE.AnimationClip | null {
  return packCache?.get(key) ?? null;
}

export function preloadMixamoAnimPack(
  loadingManager?: THREE.LoadingManager
): Promise<Map<AnimPackKey, THREE.AnimationClip>> {
  if (packCache) return Promise.resolve(packCache);
  if (packPromise) return packPromise;

  packPromise = (async () => {
    const loader = new FBXLoader(loadingManager);
    const out = new Map<AnimPackKey, THREE.AnimationClip>();
    const all = [...BASIC_SHOOTER, ...PISTOL, ...SINGLES, ...PICUP];

    // Load with concurrency limit to avoid mobile stall
    const CONCURRENCY = 4;
    let i = 0;
    async function worker() {
      while (i < all.length) {
        const idx = i++;
        const spec = all[idx];
        try {
          const fbx = await new Promise<THREE.Group>((resolve, reject) => {
            loader.load(spec.url, resolve, undefined, reject);
          });
          const clip = extractClip(fbx, spec.key);
          if (clip) {
            // Prefer first assignment; run_backwards overwrites walk_back if loaded later
            if (spec.url.includes('run_backwards')) {
              out.set('RIFLE_WALK_BACK', clip);
              // Also stash as sprint-back feel via RUN if needed later
            } else if (!out.has(spec.key) || spec.key === 'RIFLE_WALK_BACK') {
              out.set(spec.key, clip);
            } else {
              out.set(spec.key, clip);
            }
          }
          // Dispose mesh payload — we only need the clip
          fbx.traverse((c) => {
            const m = c as THREE.Mesh;
            if (m.isMesh) {
              m.geometry?.dispose();
              const mats = Array.isArray(m.material) ? m.material : [m.material];
              mats.forEach((mat) => mat?.dispose?.());
            }
          });
        } catch {
          // Missing/corrupt FBX — keep existing GLB clip
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

    // Map kneeling_down onto rifle crouch if pack has it
    const kneel = out.get('KNEEL_DOWN');
    if (kneel && !out.has('RIFLE_CROUCH' as AnimPackKey)) {
      const crouchClip = kneel.clone();
      crouchClip.name = 'RIFLE_CROUCH';
      out.set('RIFLE_CROUCH' as AnimPackKey, crouchClip);
    }

    packCache = out;
    return out;
  })();

  return packPromise;
}

/**
 * Overlay Animaçao pack clips onto a BotClipMap (in place / returns new map).
 * Prefers pack clips for throw/hit/fire/loco when present.
 */
export function applyAnimPackOverlayToBotClips(base: BotClipMap): BotClipMap {
  if (!packCache || packCache.size === 0) return base;
  const next = { ...base };
  const overlayKeys: BotAnimState[] = [
    'RIFLE_THROW',
    'RIFLE_HIT',
    'RIFLE_FIRE',
    'RIFLE_RUN',
    'RIFLE_WALK',
    'RIFLE_WALK_BACK',
    'RIFLE_WALK_LEFT',
    'RIFLE_WALK_RIGHT',
    'RIFLE_RUN_LEFT',
    'RIFLE_RUN_RIGHT',
    'RIFLE_AIM',
    'RIFLE_CROUCH',
    'RIFLE_SPRINT',
    'RIFLE_JUMP',
    'RIFLE_RELOAD_3P',
  ];
  for (const k of overlayKeys) {
    const c = packCache.get(k);
    if (c) next[k] = c;
  }
  // AnimPackKey uses same names for jump/reload extras.
  const jumpClip = packCache.get('RIFLE_JUMP');
  if (jumpClip) next.RIFLE_JUMP = jumpClip;
  const reloadClip = packCache.get('RIFLE_RELOAD_3P');
  if (reloadClip) next.RIFLE_RELOAD_3P = reloadClip;
  // Sprint: reuse rifle_run if no dedicated sprint in pack
  if (packCache.get('RIFLE_RUN')) {
    next.RIFLE_SPRINT = packCache.get('RIFLE_RUN')!;
  }
  // Crouch walk: reuse walk at slower timescale (clip itself)
  if (packCache.get('RIFLE_WALK') && !packCache.get('RIFLE_CROUCH_WALK' as AnimPackKey)) {
    next.RIFLE_CROUCH_WALK = packCache.get('KNEEL_DOWN') || packCache.get('RIFLE_WALK')!;
  }
  return next;
}

/** Build a BotClipMap variant that uses pistol locomotion for pistol-armed bots. */
export function applyPistolLocoToBotClips(base: BotClipMap): BotClipMap {
  if (!packCache) return base;
  const next = { ...base };
  const idle = packCache.get('PISTOL_IDLE');
  const walk = packCache.get('PISTOL_WALK');
  const run = packCache.get('PISTOL_RUN');
  const walkBack = packCache.get('PISTOL_WALK_BACK');
  const runBack = packCache.get('PISTOL_RUN_BACK');
  const strafeL = packCache.get('PISTOL_STRAFE_L');
  const strafeR = packCache.get('PISTOL_STRAFE_R');
  const crouch = packCache.get('PISTOL_CROUCH');
  if (idle) {
    next.RIFLE_IDLE = idle;
    next.RIFLE_AIM = idle;
  }
  if (walk) next.RIFLE_WALK = walk;
  if (run) {
    next.RIFLE_RUN = run;
    next.RIFLE_SPRINT = run;
  }
  if (walkBack) next.RIFLE_WALK_BACK = walkBack;
  if (runBack) next.RIFLE_WALK_BACK = runBack;
  if (strafeL) {
    next.RIFLE_WALK_LEFT = strafeL;
    next.RIFLE_RUN_LEFT = strafeL;
  }
  if (strafeR) {
    next.RIFLE_WALK_RIGHT = strafeR;
    next.RIFLE_RUN_RIGHT = strafeR;
  }
  if (crouch) {
    next.RIFLE_CROUCH = crouch;
    next.RIFLE_CROUCH_WALK = walk || crouch;
  }
  return next;
}

export function getMantleClip(): THREE.AnimationClip | null {
  return packCache?.get('MANTLE') ?? null;
}

export function getCprClip(): THREE.AnimationClip | null {
  return packCache?.get('CPR') ?? null;
}

export function getKitPickupClip(): THREE.AnimationClip | null {
  return packCache?.get('KIT_PICKUP') ?? null;
}

export function getKitHoldClip(): THREE.AnimationClip | null {
  return packCache?.get('KIT_HOLD') ?? null;
}

export function getKitPutDownClip(): THREE.AnimationClip | null {
  return packCache?.get('KIT_PUT_DOWN') ?? null;
}

/** Warface-style class kit channel duration (self or ally apply). */
export const KIT_CHANNEL_TOTAL_SEC = 15;

/**
 * Gameplay timings for kit channel: pick up → loop hold (~13s) → put down / apply.
 * Hold is stretched so total ≈ {@link KIT_CHANNEL_TOTAL_SEC}.
 */
export function getKitUseTimings(): {
  pickup: number;
  hold: number;
  putDown: number;
  total: number;
} {
  const pickupRaw = getKitPickupClip()?.duration ?? 0.75;
  const putRaw = getKitPutDownClip()?.duration ?? 0.9;
  const pickup = THREE.MathUtils.clamp(pickupRaw, 0.45, 0.95);
  const putDown = THREE.MathUtils.clamp(putRaw, 0.5, 1.1);
  const hold = Math.max(0.8, KIT_CHANNEL_TOTAL_SEC - pickup - putDown);
  return { pickup, hold, putDown, total: pickup + hold + putDown };
}

export function getAnimPackStatus(): {
  loaded: boolean;
  count: number;
  keys: string[];
} {
  return {
    loaded: Boolean(packCache),
    count: packCache?.size ?? 0,
    keys: packCache ? [...packCache.keys()] : [],
  };
}
