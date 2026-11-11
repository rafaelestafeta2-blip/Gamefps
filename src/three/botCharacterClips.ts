import * as THREE from 'three';
import { YardBotEntity } from './yardPropsBuilder';

export type BotAnimState =
  | 'RIFLE_IDLE'
  | 'RIFLE_WALK'
  | 'RIFLE_WALK_LEFT'
  | 'RIFLE_WALK_RIGHT'
  | 'RIFLE_WALK_BACK'
  | 'RIFLE_RUN'
  | 'RIFLE_RUN_LEFT'
  | 'RIFLE_RUN_RIGHT'
  | 'RIFLE_AIM'
  | 'RIFLE_FIRE'
  | 'RIFLE_THROW'
  | 'RIFLE_CROUCH'
  | 'RIFLE_CROUCH_WALK'
  | 'RIFLE_HIT'
  | 'RIFLE_DEATH'
  | 'RIFLE_DEATH_HEADSHOT'
  | 'RIFLE_DEATH_BACK'
  | 'RIFLE_DEATH_BACK_HEADSHOT'
  | 'RIFLE_DEATH_RIGHT'
  | 'RIFLE_DEATH_CROUCH';

export type BotClipMap = Record<BotAnimState, THREE.AnimationClip>;

export interface BotAnimController {
  modelRoot: THREE.Object3D;
  weaponProp: THREE.Group;
  rHandBone: THREE.Object3D | null;
  lHandBone: THREE.Object3D | null;
  mixer: THREE.AnimationMixer;
  actions: Record<BotAnimState, THREE.AnimationAction>;
  currentState: BotAnimState;
  prevX: number;
  prevZ: number;
  smoothedSpeed: number;
  hitReactTimer: number;
  fireAnimTimer: number;
  throwAnimTimer: number;
  deathElapsed: number;
  lodAccumDt: number;
  tacticalTimer: number;
  crouchStance: boolean;
}

const _rHandWorld = new THREE.Vector3();
const _lHandWorld = new THREE.Vector3();
const _rHandLocal = new THREE.Vector3();
const _lHandLocal = new THREE.Vector3();
const _handDir = new THREE.Vector3();
const _lookTargetWorld = new THREE.Vector3();

function normalizeMixamoClip(clip: THREE.AnimationClip): THREE.AnimationClip {
  const cloned = clip.clone();
  for (let i = 0; i < cloned.tracks.length; i++) {
    const t = cloned.tracks[i];
    if (t.name.includes(':')) {
      t.name = t.name.replace(':', '');
    }
  }
  return cloned;
}

function buildDerivedImpulseClip(
  baseAimClip: THREE.AnimationClip,
  clipName: string,
  duration: number,
  pitchKickRad: number,
  isGrenadeThrow = false
): THREE.AnimationClip {
  const numSamples = 9;
  const times = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    times[i] = (i / (numSamples - 1)) * duration;
  }

  const tracks: THREE.KeyframeTrack[] = [];
  const qBase = new THREE.Quaternion();
  const qKick = new THREE.Quaternion();
  const eulerKick = new THREE.Euler();

  for (let i = 0; i < baseAimClip.tracks.length; i++) {
    const srcTrack = baseAimClip.tracks[i];
    const [boneName, prop] = srcTrack.name.split('.');

    if (prop === 'position' && boneName === 'mixamorigHips') {
      const vals = new Float32Array(numSamples * 3);
      const bx = srcTrack.values[0];
      const by = srcTrack.values[1];
      const bz = srcTrack.values[2];
      for (let s = 0; s < numSamples; s++) {
        const pulse = Math.sin((s / (numSamples - 1)) * Math.PI);
        vals[s * 3 + 0] = bx;
        vals[s * 3 + 1] = by - pulse * Math.abs(pitchKickRad) * 4.0;
        vals[s * 3 + 2] = bz - pulse * Math.abs(pitchKickRad) * 14.0;
      }
      tracks.push(new THREE.VectorKeyframeTrack(srcTrack.name, times, vals));
      continue;
    }

    if (prop === 'quaternion') {
      const vals = new Float32Array(numSamples * 4);
      qBase.set(
        srcTrack.values[0],
        srcTrack.values[1],
        srcTrack.values[2],
        srcTrack.values[3]
      );

      for (let s = 0; s < numSamples; s++) {
        const p = s / (numSamples - 1);
        const pulse = Math.sin(p * Math.PI);

        if (isGrenadeThrow) {
          const throwArc = Math.sin(p * Math.PI * 2);
          if (boneName === 'mixamorigRightArm') {
            eulerKick.set(-pulse * 1.15, throwArc * 0.45, -pulse * 0.35, 'XYZ');
            qKick.setFromEuler(eulerKick);
          } else if (boneName === 'mixamorigRightForeArm') {
            eulerKick.set(-throwArc * 0.85, 0, 0, 'XYZ');
            qKick.setFromEuler(eulerKick);
          } else if (boneName === 'mixamorigSpine1' || boneName === 'mixamorigSpine2') {
            eulerKick.set(throwArc * 0.18, -throwArc * 0.24, 0, 'XYZ');
            qKick.setFromEuler(eulerKick);
          } else {
            qKick.identity();
          }
          const qOut = qBase.clone().multiply(qKick);
          vals[s * 4 + 0] = qOut.x;
          vals[s * 4 + 1] = qOut.y;
          vals[s * 4 + 2] = qOut.z;
          vals[s * 4 + 3] = qOut.w;
        } else {
          const isSpineOrArm =
            boneName === 'mixamorigSpine1' ||
            boneName === 'mixamorigSpine2' ||
            boneName === 'mixamorigRightShoulder' ||
            boneName === 'mixamorigLeftShoulder';
          if (isSpineOrArm) {
            eulerKick.set(-pulse * pitchKickRad, 0, 0, 'XYZ');
            qKick.setFromEuler(eulerKick);
            const qOut = qBase.clone().multiply(qKick);
            vals[s * 4 + 0] = qOut.x;
            vals[s * 4 + 1] = qOut.y;
            vals[s * 4 + 2] = qOut.z;
            vals[s * 4 + 3] = qOut.w;
          } else {
            vals[s * 4 + 0] = qBase.x;
            vals[s * 4 + 1] = qBase.y;
            vals[s * 4 + 2] = qBase.z;
            vals[s * 4 + 3] = qBase.w;
          }
        }
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(srcTrack.name, times, vals));
    }
  }

  return new THREE.AnimationClip(clipName, duration, tracks);
}

export function buildProRiflePackClips(
  _templateRoot: THREE.Object3D,
  rawGltfClips: THREE.AnimationClip[]
): BotClipMap {
  const byName = new Map<string, THREE.AnimationClip>();
  for (let i = 0; i < rawGltfClips.length; i++) {
    const c = normalizeMixamoClip(rawGltfClips[i]);
    byName.set(c.name, c);
  }

  const idle = byName.get('RIFLE_IDLE') || byName.get('RIFLE_AIM') || rawGltfClips[0];
  const aim = byName.get('RIFLE_AIM') || idle;
  const walk = byName.get('RIFLE_WALK') || idle;
  const walkLeft = byName.get('RIFLE_WALK_LEFT') || walk;
  const walkRight = byName.get('RIFLE_WALK_RIGHT') || walk;
  const walkBack = byName.get('RIFLE_WALK_BACK') || walk;
  const run = byName.get('RIFLE_RUN') || byName.get('RIFLE_SPRINT') || walk;
  const runLeft = byName.get('RIFLE_RUN_LEFT') || run;
  const runRight = byName.get('RIFLE_RUN_RIGHT') || run;
  const crouch = byName.get('RIFLE_CROUCH') || aim;
  const crouchWalk = byName.get('RIFLE_CROUCH_WALK') || crouch;
  const death = byName.get('RIFLE_DEATH') || idle;
  const deathHeadshot = byName.get('RIFLE_DEATH_HEADSHOT') || death;
  const deathBack = byName.get('RIFLE_DEATH_BACK') || death;
  const deathBackHeadshot = byName.get('RIFLE_DEATH_BACK_HEADSHOT') || deathBack;
  const deathRight = byName.get('RIFLE_DEATH_RIGHT') || death;
  const deathCrouch = byName.get('RIFLE_DEATH_CROUCH') || deathHeadshot;

  const fire = buildDerivedImpulseClip(aim, 'RIFLE_FIRE', 0.2, 0.08, false);
  const hit = buildDerivedImpulseClip(aim, 'RIFLE_HIT', 0.28, 0.16, false);
  const throwClip = buildDerivedImpulseClip(aim, 'RIFLE_THROW', 0.58, 0.1, true);

  return {
    RIFLE_IDLE: idle,
    RIFLE_AIM: aim,
    RIFLE_WALK: walk,
    RIFLE_WALK_LEFT: walkLeft,
    RIFLE_WALK_RIGHT: walkRight,
    RIFLE_WALK_BACK: walkBack,
    RIFLE_RUN: run,
    RIFLE_RUN_LEFT: runLeft,
    RIFLE_RUN_RIGHT: runRight,
    RIFLE_CROUCH: crouch,
    RIFLE_CROUCH_WALK: crouchWalk,
    RIFLE_FIRE: fire,
    RIFLE_THROW: throwClip,
    RIFLE_HIT: hit,
    RIFLE_DEATH: death,
    RIFLE_DEATH_HEADSHOT: deathHeadshot,
    RIFLE_DEATH_BACK: deathBack,
    RIFLE_DEATH_BACK_HEADSHOT: deathBackHeadshot,
    RIFLE_DEATH_RIGHT: deathRight,
    RIFLE_DEATH_CROUCH: deathCrouch,
  };
}

export function syncBotWeaponWithMixamoHands(
  t: YardBotEntity,
  ctrl: BotAnimController,
  isCrouched: boolean
): void {
  if (ctrl.rHandBone && ctrl.lHandBone) {
    ctrl.rHandBone.getWorldPosition(_rHandWorld);
    ctrl.lHandBone.getWorldPosition(_lHandWorld);
    _rHandLocal.copy(_rHandWorld);
    _lHandLocal.copy(_lHandWorld);
    t.pivotGroup.worldToLocal(_rHandLocal);
    t.pivotGroup.worldToLocal(_lHandLocal);

    _handDir.subVectors(_lHandLocal, _rHandLocal);
    if (_handDir.lengthSq() > 0.002) {
      _handDir.normalize();
      const kickBack = ctrl.fireAnimTimer > 0 ? 0.03 : 0;
      ctrl.weaponProp.position
        .copy(_rHandLocal)
        .addScaledVector(_handDir, 0.14 - kickBack);
      ctrl.weaponProp.position.y += 0.025;

      _lookTargetWorld
        .copy(_lHandWorld)
        .addScaledVector(_lHandWorld.clone().sub(_rHandWorld), 2.0);
      ctrl.weaponProp.lookAt(_lookTargetWorld);
      return;
    }
  }

  ctrl.weaponProp.position.set(-0.08, isCrouched ? 0.78 : 1.26, 0.18);
  ctrl.weaponProp.rotation.set(0.02, 0.04, 0);
}

export function transitionBotAnim(
  ctrl: BotAnimController,
  nextState: BotAnimState,
  fadeSec = 0.22
): void {
  if (ctrl.currentState === nextState) return;
  const prevAction = ctrl.actions[ctrl.currentState];
  const nextAction = ctrl.actions[nextState];
  if (!nextAction) return;

  if (prevAction && prevAction !== nextAction) {
    prevAction.fadeOut(fadeSec);
  }

  const isOneShot =
    nextState === 'RIFLE_FIRE' ||
    nextState === 'RIFLE_THROW' ||
    nextState === 'RIFLE_HIT' ||
    nextState.startsWith('RIFLE_DEATH');

  if (isOneShot || !nextAction.isRunning()) {
    nextAction.reset();
  }
  nextAction.enabled = true;
  nextAction.setEffectiveTimeScale(1);
  nextAction.setEffectiveWeight(1);
  nextAction.fadeIn(fadeSec).play();
  ctrl.currentState = nextState;
}

/**
 * Seleciona entre as 6 animações reais de morte do Mixamo com base na direção
 * exata de onde veio o tiro (frente, costas, lateral/flanco, headshot ou agachado).
 */
export function selectDirectionalDeathState(
  victimPos: THREE.Vector3,
  victimFacingYaw: number,
  attackerPos: THREE.Vector3 | null | undefined,
  isHeadshot: boolean,
  isCrouched: boolean
): BotAnimState {
  if (isCrouched) {
    return 'RIFLE_DEATH_CROUCH';
  }
  if (!attackerPos) {
    return isHeadshot ? 'RIFLE_DEATH_HEADSHOT' : 'RIFLE_DEATH';
  }

  const dx = attackerPos.x - victimPos.x;
  const dz = attackerPos.z - victimPos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.001) {
    return isHeadshot ? 'RIFLE_DEATH_HEADSHOT' : 'RIFLE_DEATH';
  }

  const dirToAttackerX = dx / dist;
  const dirToAttackerZ = dz / dist;
  const fwdX = Math.sin(victimFacingYaw);
  const fwdZ = Math.cos(victimFacingYaw);

  // Produto escalar entre a frente do personagem e a direção de onde partiu o disparo
  const forwardDot = fwdX * dirToAttackerX + fwdZ * dirToAttackerZ;

  if (forwardDot > 0.35) {
    // Tiro veio pela frente
    return isHeadshot ? 'RIFLE_DEATH_HEADSHOT' : 'RIFLE_DEATH';
  }
  if (forwardDot < -0.35) {
    // Tiro veio pelas costas
    return isHeadshot ? 'RIFLE_DEATH_BACK_HEADSHOT' : 'RIFLE_DEATH_BACK';
  }
  // Tiro veio de lado / flanco
  return 'RIFLE_DEATH_RIGHT';
}
