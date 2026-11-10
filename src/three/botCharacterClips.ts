import * as THREE from 'three';

export type BotAnimState =
  | 'RIFLE_IDLE'
  | 'RIFLE_WALK'
  | 'RIFLE_RUN'
  | 'RIFLE_AIM'
  | 'RIFLE_FIRE'
  | 'RIFLE_CROUCH'
  | 'RIFLE_HIT'
  | 'RIFLE_DEATH';

export type BotClipMap = Record<BotAnimState, THREE.AnimationClip>;

interface BoneBindData {
  bone: THREE.Object3D;
  bindPos: THREE.Vector3;
  bindQuat: THREE.Quaternion;
}

const _p0 = new THREE.Vector3();
const _p1 = new THREE.Vector3();
const _curDir = new THREE.Vector3();
const _targetDir = new THREE.Vector3();
const _qWorld = new THREE.Quaternion();
const _parentWorldQ = new THREE.Quaternion();
const _boneWorldQ = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _dq = new THREE.Quaternion();

function aimBoneSegmentWorld(
  root: THREE.Object3D,
  bone: THREE.Object3D | undefined,
  childBone: THREE.Object3D | undefined,
  wx: number,
  wy: number,
  wz: number
): void {
  if (!bone || !childBone || !bone.parent) return;
  root.updateMatrixWorld(true);
  bone.getWorldPosition(_p0);
  childBone.getWorldPosition(_p1);
  _curDir.subVectors(_p1, _p0).normalize();
  _targetDir.set(wx, wy, wz).normalize();
  if (_curDir.lengthSq() < 0.0001 || _targetDir.lengthSq() < 0.0001) return;

  _qWorld.setFromUnitVectors(_curDir, _targetDir);
  bone.parent.getWorldQuaternion(_parentWorldQ);
  bone.getWorldQuaternion(_boneWorldQ);
  _qWorld.multiply(_boneWorldQ);
  bone.quaternion.copy(_parentWorldQ.invert().multiply(_qWorld));
  root.updateMatrixWorld(true);
}

function setBoneDeltaEuler(
  bindMap: Map<string, BoneBindData>,
  name: string,
  rx: number,
  ry: number,
  rz: number
): void {
  const entry = bindMap.get(name);
  if (!entry) return;
  _euler.set(rx, ry, rz, 'XYZ');
  _dq.setFromEuler(_euler);
  entry.bone.quaternion.copy(entry.bindQuat).multiply(_dq);
}

const FINGER_BONES = [
  'mixamorigRightHandIndex1', 'mixamorigRightHandIndex2',
  'mixamorigRightHandMiddle1', 'mixamorigRightHandMiddle2',
  'mixamorigRightHandRing1', 'mixamorigRightHandRing2',
  'mixamorigRightHandPinky1', 'mixamorigRightHandPinky2',
  'mixamorigLeftHandIndex1', 'mixamorigLeftHandIndex2',
  'mixamorigLeftHandMiddle1', 'mixamorigLeftHandMiddle2',
  'mixamorigLeftHandRing1', 'mixamorigLeftHandRing2',
  'mixamorigLeftHandPinky1', 'mixamorigLeftHandPinky2',
];

const TRACKED_BONE_NAMES = [
  'mixamorigHips', 'mixamorigSpine', 'mixamorigSpine1', 'mixamorigSpine2',
  'mixamorigNeck', 'mixamorigHead', 'mixamorigLeftShoulder', 'mixamorigLeftArm',
  'mixamorigLeftForeArm', 'mixamorigLeftHand', 'mixamorigRightShoulder',
  'mixamorigRightArm', 'mixamorigRightForeArm', 'mixamorigRightHand',
  'mixamorigLeftUpLeg', 'mixamorigLeftLeg', 'mixamorigLeftFoot',
  'mixamorigRightUpLeg', 'mixamorigRightLeg', 'mixamorigRightFoot',
  'mixamorigRightHandIndex1', 'mixamorigRightHandMiddle1',
  'mixamorigLeftHandIndex1', 'mixamorigLeftHandMiddle1',
];

/**
 * Constrói as 8 animações táticas estilo CS/Warface para o modelo esquelético Pro Rifle Pack.
 * Otimizado com cinemática natural de corrida e passada tática realista.
 */
export function buildProRiflePackClips(
  templateRoot: THREE.Object3D,
  _rawGltfClips: THREE.AnimationClip[]
): BotClipMap {
  const bindMap = new Map<string, BoneBindData>();
  templateRoot.traverse((obj) => {
    if (obj.name && obj.name.startsWith('mixamorig')) {
      const cleanName = obj.name.replace(':', '');
      obj.name = cleanName;
      bindMap.set(cleanName, {
        bone: obj,
        bindPos: obj.position.clone(),
        bindQuat: obj.quaternion.clone(),
      });
    }
  });

  const resetToBindPose = () => {
    bindMap.forEach((b) => {
      b.bone.position.copy(b.bindPos);
      b.bone.quaternion.copy(b.bindQuat);
    });
    templateRoot.updateMatrixWorld(true);
  };

  const applyRifleFingerGrip = () => {
    for (let i = 0; i < FINGER_BONES.length; i++) {
      setBoneDeltaEuler(bindMap, FINGER_BONES[i], 0.55, 0, 0);
    }
  };

  const rArm = bindMap.get('mixamorigRightArm')?.bone;
  const rFore = bindMap.get('mixamorigRightForeArm')?.bone;
  const rHand = bindMap.get('mixamorigRightHand')?.bone;
  const lArm = bindMap.get('mixamorigLeftArm')?.bone;
  const lFore = bindMap.get('mixamorigLeftForeArm')?.bone;
  const lHand = bindMap.get('mixamorigLeftHand')?.bone;
  const hips = bindMap.get('mixamorigHips');

  const aimArmsReady = (raiseY: number, swayX: number, recoilZ = 0) => {
    aimBoneSegmentWorld(templateRoot, rArm, rFore, 0.04, -0.21 + raiseY * 0.25, 0.11 - recoilZ);
    aimBoneSegmentWorld(templateRoot, rFore, rHand, 0.14 + swayX * 0.25, 0.1 + raiseY * 0.35, 0.22 - recoilZ);
    aimBoneSegmentWorld(templateRoot, lArm, lFore, -0.08, -0.19 + raiseY * 0.25, 0.19 - recoilZ);
    aimBoneSegmentWorld(templateRoot, lFore, lHand, -0.18 + swayX * 0.3, 0.12 + raiseY * 0.38, 0.25 - recoilZ);
  };

  const bakeClip = (
    clipName: string,
    duration: number,
    numSamples: number,
    poseAtPhase: (phase01: number) => void
  ): THREE.AnimationClip => {
    const times = new Float32Array(numSamples);
    const hipsPosValues = new Float32Array(numSamples * 3);
    const quatBuffers = new Map<string, Float32Array>();

    TRACKED_BONE_NAMES.forEach((bname) => {
      if (bindMap.has(bname)) {
        quatBuffers.set(bname, new Float32Array(numSamples * 4));
      }
    });

    for (let s = 0; s < numSamples; s++) {
      const u = numSamples > 1 ? s / (numSamples - 1) : 0;
      times[s] = u * duration;
      resetToBindPose();
      applyRifleFingerGrip();
      poseAtPhase(u);
      templateRoot.updateMatrixWorld(true);

      if (hips) {
        hipsPosValues[s * 3 + 0] = hips.bone.position.x;
        hipsPosValues[s * 3 + 1] = hips.bone.position.y;
        hipsPosValues[s * 3 + 2] = hips.bone.position.z;
      }

      quatBuffers.forEach((arr, bname) => {
        const q = bindMap.get(bname)!.bone.quaternion;
        arr[s * 4 + 0] = q.x;
        arr[s * 4 + 1] = q.y;
        arr[s * 4 + 2] = q.z;
        arr[s * 4 + 3] = q.w;
      });
    }

    const tracks: THREE.KeyframeTrack[] = [];
    if (hips) {
      tracks.push(new THREE.VectorKeyframeTrack('mixamorigHips.position', times, hipsPosValues));
    }
    quatBuffers.forEach((arr, bname) => {
      tracks.push(new THREE.QuaternionKeyframeTrack(`${bname}.quaternion`, times, arr));
    });

    const clip = new THREE.AnimationClip(clipName, duration, tracks);
    clip.optimize();
    return clip;
  };

  // 1. RIFLE_IDLE: Postura tática pronta, respiração sutil e varredura de setor
  const idleClip = bakeClip('Rifle_Idle', 2.2, 17, (u) => {
    const a = u * Math.PI * 2;
    const breath = Math.sin(a);
    const scan = Math.sin(a * 0.5);
    if (hips) hips.bone.position.y = hips.bindPos.y - 1.2 + breath * 0.5;
    setBoneDeltaEuler(bindMap, 'mixamorigSpine', 0.08, scan * 0.04, 0);
    setBoneDeltaEuler(bindMap, 'mixamorigSpine2', 0.06 + breath * 0.015, scan * 0.05, 0);
    setBoneDeltaEuler(bindMap, 'mixamorigNeck', -0.04, scan * 0.06, 0);
    setBoneDeltaEuler(bindMap, 'mixamorigLeftUpLeg', 0.08, 0, -0.02);
    setBoneDeltaEuler(bindMap, 'mixamorigLeftLeg', 0.12, 0, 0);
    setBoneDeltaEuler(bindMap, 'mixamorigRightUpLeg', -0.05, 0, 0.02);
    setBoneDeltaEuler(bindMap, 'mixamorigRightLeg', 0.1, 0, 0);
    aimArmsReady(0.02 + breath * 0.015, scan * 0.03);
  });

  // 2. RIFLE_WALK: Passada tática equilibrada de patrulha CQB
  const walkClip = bakeClip('Rifle_Walk', 0.95, 17, (u) => {
    const a = u * Math.PI * 2;
    const s = Math.sin(a);
    const c = Math.cos(a);
    if (hips) {
      hips.bone.position.y = hips.bindPos.y - 1.8 + Math.abs(s) * 1.2;
      hips.bone.position.x = hips.bindPos.x + c * 0.8;
    }
    setBoneDeltaEuler(bindMap, 'mixamorigSpine', 0.1, -s * 0.05, c * 0.02);
    setBoneDeltaEuler(bindMap, 'mixamorigSpine2', 0.06, -s * 0.04, 0);
    setBoneDeltaEuler(bindMap, 'mixamorigHead', -0.08, s * 0.06, 0);

    const lSwing = s * 0.42;
    const rSwing = -s * 0.42;
    const lKnee = Math.max(0, -s) * 0.48;
    const rKnee = Math.max(0, s) * 0.48;

    setBoneDeltaEuler(bindMap, 'mixamorigLeftUpLeg', lSwing + 0.06, 0, -0.02);
    setBoneDeltaEuler(bindMap, 'mixamorigLeftLeg', lKnee, 0, 0);
    setBoneDeltaEuler(bindMap, 'mixamorigLeftFoot', -lSwing * 0.28, 0, 0);
    setBoneDeltaEuler(bindMap, 'mixamorigRightUpLeg', rSwing + 0.06, 0, 0.02);
    setBoneDeltaEuler(bindMap, 'mixamorigRightLeg', rKnee, 0, 0);
    setBoneDeltaEuler(bindMap, 'mixamorigRightFoot', -rSwing * 0.28, 0, 0);
    aimArmsReady(0.03 + Math.abs(s) * 0.02, -s * 0.05);
  });

  // 3. RIFLE_RUN: Corrida de assalto tático militar (passada fluida e natural)
  const runClip = bakeClip('Rifle_Run', 0.74, 17, (u) => {
    const a = u * Math.PI * 2;
    const s = Math.sin(a);
    const c = Math.cos(a);
    if (hips) {
      hips.bone.position.y = hips.bindPos.y - 2.8 + Math.abs(s) * 2.0;
      hips.bone.position.x = hips.bindPos.x + c * 1.1;
    }
    // Inclinação tática para frente do tronco
    setBoneDeltaEuler(bindMap, 'mixamorigSpine', 0.16, -s * 0.08, c * 0.03);
    setBoneDeltaEuler(bindMap, 'mixamorigSpine2', 0.1, -s * 0.06, 0);
    setBoneDeltaEuler(bindMap, 'mixamorigHead', -0.14, s * 0.08, 0);

    const lSwing = s * 0.52;
    const rSwing = -s * 0.52;
    // Flexão natural do joelho na perna traseira em elevação
    const lKnee = Math.max(0, -s) * 0.65;
    const rKnee = Math.max(0, s) * 0.65;

    setBoneDeltaEuler(bindMap, 'mixamorigLeftUpLeg', lSwing + 0.1, 0, -0.02);
    setBoneDeltaEuler(bindMap, 'mixamorigLeftLeg', lKnee, 0, 0);
    setBoneDeltaEuler(bindMap, 'mixamorigRightUpLeg', rSwing + 0.1, 0, 0.02);
    setBoneDeltaEuler(bindMap, 'mixamorigRightLeg', rKnee, 0, 0);
    aimArmsReady(-0.02 + Math.abs(s) * 0.03, -s * 0.08);
  });

  // 4. RIFLE_AIM: Mirada firme com coronha colada no ombro
  const aimClip = bakeClip('Rifle_Aim', 1.4, 13, (u) => {
    const breath = Math.sin(u * Math.PI * 2) * 0.3;
    if (hips) hips.bone.position.y = hips.bindPos.y - 2.2 + breath * 0.35;
    setBoneDeltaEuler(bindMap, 'mixamorigSpine', 0.12, 0.1, 0);
    setBoneDeltaEuler(bindMap, 'mixamorigSpine2', 0.08, 0.06, 0.03);
    setBoneDeltaEuler(bindMap, 'mixamorigNeck', -0.06, -0.12, 0.05);
    setBoneDeltaEuler(bindMap, 'mixamorigLeftUpLeg', 0.16, 0, -0.03);
    setBoneDeltaEuler(bindMap, 'mixamorigLeftLeg', 0.18, 0, 0);
    setBoneDeltaEuler(bindMap, 'mixamorigRightUpLeg', -0.08, 0, 0.03);
    setBoneDeltaEuler(bindMap, 'mixamorigRightLeg', 0.14, 0, 0);
    aimArmsReady(0.14, 0.02);
  });

  // 5. RIFLE_FIRE: Recuo rápido de disparo nas mãos e ombros
  const fireClip = bakeClip('Rifle_Fire', 0.22, 9, (u) => {
    const kick = Math.sin(u * Math.PI);
    if (hips) {
      hips.bone.position.y = hips.bindPos.y - 2.4;
      hips.bone.position.z = hips.bindPos.z - kick * 1.2;
    }
    setBoneDeltaEuler(bindMap, 'mixamorigSpine', 0.12 - kick * 0.08, 0.1, 0);
    setBoneDeltaEuler(bindMap, 'mixamorigSpine2', 0.08 - kick * 0.09, 0.06, 0.03);
    setBoneDeltaEuler(bindMap, 'mixamorigHead', -0.04 - kick * 0.06, -0.1, 0.04);
    setBoneDeltaEuler(bindMap, 'mixamorigLeftUpLeg', 0.16, 0, -0.03);
    setBoneDeltaEuler(bindMap, 'mixamorigLeftLeg', 0.18, 0, 0);
    setBoneDeltaEuler(bindMap, 'mixamorigRightUpLeg', -0.08, 0, 0.03);
    setBoneDeltaEuler(bindMap, 'mixamorigRightLeg', 0.14, 0, 0);
    aimArmsReady(0.16 + kick * 0.05, 0.02, kick * 0.04);
  });

  // 6. RIFLE_CROUCH: Postura agachada tática de proteção / desarme
  const crouchClip = bakeClip('Rifle_Crouch_Idle', 1.6, 13, (u) => {
    const breath = Math.sin(u * Math.PI * 2);
    if (hips) hips.bone.position.y = hips.bindPos.y - 28.0 + breath * 0.4;
    setBoneDeltaEuler(bindMap, 'mixamorigSpine', 0.24, 0.08, 0);
    setBoneDeltaEuler(bindMap, 'mixamorigSpine2', 0.14, 0.05, 0);
    setBoneDeltaEuler(bindMap, 'mixamorigHead', -0.26, -0.08, 0);
    setBoneDeltaEuler(bindMap, 'mixamorigLeftUpLeg', 0.85, 0, -0.05);
    setBoneDeltaEuler(bindMap, 'mixamorigLeftLeg', 0.95, 0, 0);
    setBoneDeltaEuler(bindMap, 'mixamorigRightUpLeg', 0.62, 0, 0.05);
    setBoneDeltaEuler(bindMap, 'mixamorigRightLeg', 0.98, 0, 0);
    aimArmsReady(0.12, 0.02);
  });

  // 7. RIFLE_HIT: Reação balística de impacto com recuo de ombro
  const hitClip = bakeClip('Rifle_Hit_React', 0.32, 9, (u) => {
    const jolt = Math.sin(u * Math.PI);
    if (hips) {
      hips.bone.position.y = hips.bindPos.y - 2.0 - jolt * 2.2;
      hips.bone.position.z = hips.bindPos.z - jolt * 3.5;
    }
    setBoneDeltaEuler(bindMap, 'mixamorigSpine', 0.08 - jolt * 0.28, jolt * 0.18, -jolt * 0.1);
    setBoneDeltaEuler(bindMap, 'mixamorigSpine2', 0.06 - jolt * 0.24, jolt * 0.15, 0);
    setBoneDeltaEuler(bindMap, 'mixamorigHead', -jolt * 0.32, -jolt * 0.2, jolt * 0.12);
    setBoneDeltaEuler(bindMap, 'mixamorigLeftUpLeg', 0.14 + jolt * 0.12, 0, -0.03);
    setBoneDeltaEuler(bindMap, 'mixamorigLeftLeg', 0.16 + jolt * 0.15, 0, 0);
    setBoneDeltaEuler(bindMap, 'mixamorigRightUpLeg', -0.06, 0, 0.03);
    setBoneDeltaEuler(bindMap, 'mixamorigRightLeg', 0.12 + jolt * 0.12, 0, 0);
    aimArmsReady(0.06 + jolt * 0.1, -jolt * 0.12, jolt * 0.06);
  });

  // 8. RIFLE_DEATH: Queda corporal ao solo ao ser neutralizado
  const deathClip = bakeClip('Rifle_Death', 0.8, 15, (u) => {
    const ease = 1 - Math.pow(1 - u, 2.4);
    const kneeBuckle = Math.sin(Math.min(1, u * 1.6) * Math.PI);
    if (hips) {
      hips.bone.position.y = hips.bindPos.y * (1 - ease * 0.88);
      hips.bone.position.z = hips.bindPos.z - ease * 34.0;
    }
    setBoneDeltaEuler(bindMap, 'mixamorigHips', -ease * 1.35, ease * 0.15, ease * 0.1);
    setBoneDeltaEuler(bindMap, 'mixamorigSpine', -ease * 0.2, 0, 0);
    setBoneDeltaEuler(bindMap, 'mixamorigHead', -ease * 0.3, ease * 0.35, 0);
    setBoneDeltaEuler(bindMap, 'mixamorigLeftUpLeg', kneeBuckle * 0.55 + ease * 0.12, 0, -ease * 0.15);
    setBoneDeltaEuler(bindMap, 'mixamorigLeftLeg', kneeBuckle * 0.75 + ease * 0.2, 0, 0);
    setBoneDeltaEuler(bindMap, 'mixamorigRightUpLeg', kneeBuckle * 0.45 + ease * 0.06, 0, ease * 0.18);
    setBoneDeltaEuler(bindMap, 'mixamorigRightLeg', kneeBuckle * 0.65 + ease * 0.25, 0, 0);
    aimArmsReady(0.04 - ease * 0.3, ease * 0.2);
  });

  resetToBindPose();

  return {
    RIFLE_IDLE: idleClip,
    RIFLE_WALK: walkClip,
    RIFLE_RUN: runClip,
    RIFLE_AIM: aimClip,
    RIFLE_FIRE: fireClip,
    RIFLE_CROUCH: crouchClip,
    RIFLE_HIT: hitClip,
    RIFLE_DEATH: deathClip,
  };
}
