import * as THREE from 'three';
import { YardBotEntity } from './yardPropsBuilder';

export type BotAnimState =
  | 'RIFLE_IDLE'
  | 'RIFLE_WALK'
  | 'RIFLE_RUN'
  | 'RIFLE_AIM'
  | 'RIFLE_FIRE'
  | 'RIFLE_CROUCH'
  | 'RIFLE_CROUCH_WALK'
  | 'RIFLE_HIT'
  | 'RIFLE_DEATH'
  | 'RIFLE_DEATH_HEADSHOT';

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
  hitReactTimer: number;
  fireAnimTimer: number;
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

/**
 * Normaliza os nomes das tracks de um AnimationClip do Mixamo (removendo ':' caso exista)
 * para garantir vínculo 100% exato com os ossos do esqueleto clonado.
 */
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

/**
 * Gera uma variação curta de disparo (`RIFLE_FIRE`) ou impacto (`RIFLE_HIT`)
 * a partir da pose real de mira (`RIFLE_AIM`) do Mixamo Pro Rifle Pack.
 */
function buildDerivedImpulseClip(
  baseAimClip: THREE.AnimationClip,
  clipName: string,
  duration: number,
  pitchKickRad: number
): THREE.AnimationClip {
  const numSamples = 7;
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

      const isSpineOrArm =
        boneName === 'mixamorigSpine1' ||
        boneName === 'mixamorigSpine2' ||
        boneName === 'mixamorigRightShoulder' ||
        boneName === 'mixamorigLeftShoulder';

      for (let s = 0; s < numSamples; s++) {
        const pulse = Math.sin((s / (numSamples - 1)) * Math.PI);
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
      tracks.push(new THREE.QuaternionKeyframeTrack(srcTrack.name, times, vals));
    }
  }

  return new THREE.AnimationClip(clipName, duration, tracks);
}

/**
 * Extrai e prepara os clipes reais de Motion Capture do Mixamo (`Pro.Rifle.Pack.zip`)
 * embutidos em `/models/characters/pro_rifle_pack.glb`.
 */
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
  const run = byName.get('RIFLE_RUN') || byName.get('RIFLE_SPRINT') || walk;
  const crouch = byName.get('RIFLE_CROUCH') || aim;
  const crouchWalk = byName.get('RIFLE_CROUCH_WALK') || crouch;
  const death = byName.get('RIFLE_DEATH') || idle;
  const deathHeadshot = byName.get('RIFLE_DEATH_HEADSHOT') || death;

  const fire = buildDerivedImpulseClip(aim, 'RIFLE_FIRE', 0.2, 0.08);
  const hit = buildDerivedImpulseClip(aim, 'RIFLE_HIT', 0.28, 0.16);

  return {
    RIFLE_IDLE: idle,
    RIFLE_AIM: aim,
    RIFLE_WALK: walk,
    RIFLE_RUN: run,
    RIFLE_CROUCH: crouch,
    RIFLE_CROUCH_WALK: crouchWalk,
    RIFLE_FIRE: fire,
    RIFLE_HIT: hit,
    RIFLE_DEATH: death,
    RIFLE_DEATH_HEADSHOT: deathHeadshot,
  };
}

/**
 * Sincroniza a posição e orientação do fuzil 3D exatamente entre a mão direita (empunhadura)
 * e a mão esquerda (guarda-mão) das animações originais do Mixamo Pro Rifle Pack.
 */
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
