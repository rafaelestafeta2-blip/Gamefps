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

/**
 * Rotates `bone` in local space so the vector from `bone` to `childBone`
 * points along `worldDir` in character root space.
 */
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

/**
 * Verifies all animations in `Pro.Rifle.Pack.glb` and builds the complete, optimized
 * 8-clip Pro Rifle Pack animation library (`RIFLE_IDLE`, `RIFLE_WALK`, `RIFLE_RUN`,
 * `RIFLE_AIM`, `RIFLE_FIRE`, `RIFLE_CROUCH`, `RIFLE_HIT`, `RIFLE_DEATH`) for the
 * 65-bone `mixamorig:*` skeleton (`Ch35`).
 */
export function buildProRiflePackClips(
  templateRoot: THREE.Object3D,
  rawGltfClips: THREE.AnimationClip[]
): BotClipMap {
  const bindMap = new Map<string, BoneBindData>();
  templateRoot.traverse((obj) => {
    if (obj.name && obj.name.startsWith('mixamorig:')) {
      bindMap.set(obj.name, {
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

  // Curl fingers into a natural rifle pistol-grip / foregrip hold
  const applyRifleFingerGrip = () => {
    const fingerBones = [
      'mixamorig:RightHandIndex1',
      'mixamorig:RightHandIndex2',
      'mixamorig:RightHandMiddle1',
      'mixamorig:RightHandMiddle2',
      'mixamorig:RightHandRing1',
      'mixamorig:RightHandRing2',
      'mixamorig:RightHandPinky1',
      'mixamorig:RightHandPinky2',
      'mixamorig:LeftHandIndex1',
      'mixamorig:LeftHandIndex2',
      'mixamorig:LeftHandMiddle1',
      'mixamorig:LeftHandMiddle2',
      'mixamorig:LeftHandRing1',
      'mixamorig:LeftHandRing2',
      'mixamorig:LeftHandPinky1',
      'mixamorig:LeftHandPinky2',
    ];
    fingerBones.forEach((fname) => {
      setBoneDeltaEuler(bindMap, fname, 0.55, 0, 0);
    });
  };

  const trackedBoneNames = [
    'mixamorig:Hips',
    'mixamorig:Spine',
    'mixamorig:Spine1',
    'mixamorig:Spine2',
    'mixamorig:Neck',
    'mixamorig:Head',
    'mixamorig:LeftArm',
    'mixamorig:LeftForeArm',
    'mixamorig:LeftHand',
    'mixamorig:RightArm',
    'mixamorig:RightForeArm',
    'mixamorig:RightHand',
    'mixamorig:LeftUpLeg',
    'mixamorig:LeftLeg',
    'mixamorig:LeftFoot',
    'mixamorig:RightUpLeg',
    'mixamorig:RightLeg',
    'mixamorig:RightFoot',
    'mixamorig:RightHandIndex1',
    'mixamorig:RightHandMiddle1',
    'mixamorig:LeftHandIndex1',
    'mixamorig:LeftHandMiddle1',
  ];

  const bakeClip = (
    clipName: string,
    duration: number,
    numSamples: number,
    poseAtPhase: (phase01: number) => void
  ): THREE.AnimationClip => {
    const times = new Float32Array(numSamples);
    const hipsPosValues = new Float32Array(numSamples * 3);
    const quatBuffers = new Map<string, Float32Array>();

    trackedBoneNames.forEach((bname) => {
      if (bindMap.has(bname)) {
        quatBuffers.set(bname, new Float32Array(numSamples * 4));
      }
    });

    const hipsEntry = bindMap.get('mixamorig:Hips');

    for (let s = 0; s < numSamples; s++) {
      const u = numSamples > 1 ? s / (numSamples - 1) : 0;
      times[s] = u * duration;
      resetToBindPose();
      applyRifleFingerGrip();
      poseAtPhase(u);
      templateRoot.updateMatrixWorld(true);

      if (hipsEntry) {
        hipsPosValues[s * 3 + 0] = hipsEntry.bone.position.x;
        hipsPosValues[s * 3 + 1] = hipsEntry.bone.position.y;
        hipsPosValues[s * 3 + 2] = hipsEntry.bone.position.z;
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
    if (hipsEntry) {
      tracks.push(
        new THREE.VectorKeyframeTrack(
          'mixamorig:Hips.position',
          times,
          hipsPosValues
        )
      );
    }
    quatBuffers.forEach((arr, bname) => {
      tracks.push(
        new THREE.QuaternionKeyframeTrack(`${bname}.quaternion`, times, arr)
      );
    });

    const clip = new THREE.AnimationClip(clipName, duration, tracks);
    clip.optimize();
    return clip;
  };

  const rArm = bindMap.get('mixamorig:RightArm')?.bone;
  const rFore = bindMap.get('mixamorig:RightForeArm')?.bone;
  const rHand = bindMap.get('mixamorig:RightHand')?.bone;
  const lArm = bindMap.get('mixamorig:LeftArm')?.bone;
  const lFore = bindMap.get('mixamorig:LeftForeArm')?.bone;
  const lHand = bindMap.get('mixamorig:LeftHand')?.bone;
  const hips = bindMap.get('mixamorig:Hips');

  const aimArmsReady = (
    raiseY: number,
    swayX: number,
    recoilZ = 0
  ) => {
    aimBoneSegmentWorld(templateRoot, rArm, rFore, 0.04, -0.21 + raiseY * 0.25, 0.11 - recoilZ);
    aimBoneSegmentWorld(
      templateRoot,
      rFore,
      rHand,
      0.14 + swayX * 0.25,
      0.10 + raiseY * 0.35,
      0.22 - recoilZ
    );
    aimBoneSegmentWorld(templateRoot, lArm, lFore, -0.08, -0.19 + raiseY * 0.25, 0.19 - recoilZ);
    aimBoneSegmentWorld(
      templateRoot,
      lFore,
      lHand,
      -0.18 + swayX * 0.3,
      0.12 + raiseY * 0.38,
      0.25 - recoilZ
    );
  };

  // 1. RIFLE_IDLE: Tactical combat breathing, subtle weight shift & sector scan
  const idleClip = bakeClip('Rifle_Idle', 2.4, 17, (u) => {
    const a = u * Math.PI * 2;
    const breath = Math.sin(a);
    const scan = Math.sin(a * 0.5);
    if (hips) {
      hips.bone.position.y = hips.bindPos.y - 1.5 + breath * 0.65;
    }
    setBoneDeltaEuler(bindMap, 'mixamorig:Spine', 0.08, scan * 0.05, 0);
    setBoneDeltaEuler(bindMap, 'mixamorig:Spine2', 0.06 + breath * 0.018, scan * 0.06, 0);
    setBoneDeltaEuler(bindMap, 'mixamorig:Neck', -0.04, scan * 0.08, 0);
    setBoneDeltaEuler(bindMap, 'mixamorig:LeftUpLeg', 0.10, 0, -0.03);
    setBoneDeltaEuler(bindMap, 'mixamorig:LeftLeg', -0.16, 0, 0);
    setBoneDeltaEuler(bindMap, 'mixamorig:RightUpLeg', -0.06, 0, 0.03);
    setBoneDeltaEuler(bindMap, 'mixamorig:RightLeg', -0.14, 0, 0);
    aimArmsReady(0.02 + breath * 0.015, scan * 0.04);
  });

  // 2. RIFLE_WALK: Tactical CQB patrol stride with stabilized upper body rifle ready
  const walkClip = bakeClip('Rifle_Walk', 1.05, 17, (u) => {
    const a = u * Math.PI * 2;
    const s = Math.sin(a);
    const c = Math.cos(a);
    if (hips) {
      hips.bone.position.y = hips.bindPos.y - 2.6 + Math.abs(s) * 1.9;
      hips.bone.position.x = hips.bindPos.x + c * 1.1;
    }
    setBoneDeltaEuler(bindMap, 'mixamorig:Spine', 0.12, -s * 0.07, c * 0.025);
    setBoneDeltaEuler(bindMap, 'mixamorig:Spine2', 0.08, -s * 0.05, 0);
    setBoneDeltaEuler(bindMap, 'mixamorig:Head', -0.10, s * 0.08, 0);

    const lSwing = s * 0.44;
    const rSwing = -s * 0.44;
    const lKnee = -0.16 - Math.max(0, -c) * 0.56;
    const rKnee = -0.16 - Math.max(0, c) * 0.56;

    setBoneDeltaEuler(bindMap, 'mixamorig:LeftUpLeg', lSwing + 0.08, 0, -0.02);
    setBoneDeltaEuler(bindMap, 'mixamorig:LeftLeg', lKnee, 0, 0);
    setBoneDeltaEuler(bindMap, 'mixamorig:LeftFoot', -lSwing * 0.35, 0, 0);

    setBoneDeltaEuler(bindMap, 'mixamorig:RightUpLeg', rSwing + 0.08, 0, 0.02);
    setBoneDeltaEuler(bindMap, 'mixamorig:RightLeg', rKnee, 0, 0);
    setBoneDeltaEuler(bindMap, 'mixamorig:RightFoot', -rSwing * 0.35, 0, 0);

    aimArmsReady(0.04 + Math.abs(s) * 0.02, -s * 0.06);
  });

  // 3. RIFLE_RUN: Fast assault sprint with aggressive forward lean and high knee drive
  const runClip = bakeClip('Rifle_Run', 0.72, 17, (u) => {
    const a = u * Math.PI * 2;
    const s = Math.sin(a);
    const c = Math.cos(a);
    if (hips) {
      hips.bone.position.y = hips.bindPos.y - 4.2 + Math.abs(s) * 3.4;
      hips.bone.position.x = hips.bindPos.x + c * 1.6;
    }
    setBoneDeltaEuler(bindMap, 'mixamorig:Spine', 0.22, -s * 0.12, c * 0.04);
    setBoneDeltaEuler(bindMap, 'mixamorig:Spine2', 0.14, -s * 0.10, 0);
    setBoneDeltaEuler(bindMap, 'mixamorig:Head', -0.22, s * 0.14, 0);

    const lSwing = s * 0.68;
    const rSwing = -s * 0.68;
    const lKnee = -0.22 - Math.max(0, -c) * 0.85;
    const rKnee = -0.22 - Math.max(0, c) * 0.85;

    setBoneDeltaEuler(bindMap, 'mixamorig:LeftUpLeg', lSwing + 0.12, 0, -0.02);
    setBoneDeltaEuler(bindMap, 'mixamorig:LeftLeg', lKnee, 0, 0);
    setBoneDeltaEuler(bindMap, 'mixamorig:RightUpLeg', rSwing + 0.12, 0, 0.02);
    setBoneDeltaEuler(bindMap, 'mixamorig:RightLeg', rKnee, 0, 0);

    aimArmsReady(-0.04 + Math.abs(s) * 0.04, -s * 0.12);
  });

  // 4. RIFLE_AIM: High-ready ADS cheek weld aiming directly at target
  const aimClip = bakeClip('Rifle_Aim', 1.4, 13, (u) => {
    const a = u * Math.PI * 2;
    const breath = Math.sin(a) * 0.35;
    if (hips) {
      hips.bone.position.y = hips.bindPos.y - 3.2 + breath * 0.4;
    }
    setBoneDeltaEuler(bindMap, 'mixamorig:Spine', 0.14, 0.12, 0);
    setBoneDeltaEuler(bindMap, 'mixamorig:Spine2', 0.10, 0.08, 0.04);
    setBoneDeltaEuler(bindMap, 'mixamorig:Neck', -0.08, -0.14, 0.06);
    setBoneDeltaEuler(bindMap, 'mixamorig:LeftUpLeg', 0.22, 0, -0.04);
    setBoneDeltaEuler(bindMap, 'mixamorig:LeftLeg', -0.32, 0, 0);
    setBoneDeltaEuler(bindMap, 'mixamorig:RightUpLeg', -0.12, 0, 0.04);
    setBoneDeltaEuler(bindMap, 'mixamorig:RightLeg', -0.24, 0, 0);
    aimArmsReady(0.16, 0.02);
  });

  // 5. RIFLE_FIRE: Sharp automatic rifle recoil kick on shoulders, spine & hands
  const fireClip = bakeClip('Rifle_Fire', 0.28, 9, (u) => {
    const kick = Math.sin(u * Math.PI);
    if (hips) {
      hips.bone.position.y = hips.bindPos.y - 3.4;
      hips.bone.position.z = hips.bindPos.z - kick * 1.4;
    }
    setBoneDeltaEuler(bindMap, 'mixamorig:Spine', 0.14 - kick * 0.09, 0.12, 0);
    setBoneDeltaEuler(bindMap, 'mixamorig:Spine2', 0.10 - kick * 0.11, 0.08, 0.04);
    setBoneDeltaEuler(bindMap, 'mixamorig:Head', -0.06 - kick * 0.07, -0.12, 0.05);
    setBoneDeltaEuler(bindMap, 'mixamorig:LeftUpLeg', 0.22, 0, -0.04);
    setBoneDeltaEuler(bindMap, 'mixamorig:LeftLeg', -0.32, 0, 0);
    setBoneDeltaEuler(bindMap, 'mixamorig:RightUpLeg', -0.12, 0, 0.04);
    setBoneDeltaEuler(bindMap, 'mixamorig:RightLeg', -0.24, 0, 0);
    aimArmsReady(0.18 + kick * 0.06, 0.02, kick * 0.045);
  });

  // 6. RIFLE_CROUCH: Deep tactical knee bend crouched overwatch posture
  const crouchClip = bakeClip('Rifle_Crouch_Idle', 1.8, 13, (u) => {
    const breath = Math.sin(u * Math.PI * 2);
    if (hips) {
      hips.bone.position.y = hips.bindPos.y - 34.0 + breath * 0.5;
    }
    setBoneDeltaEuler(bindMap, 'mixamorig:Spine', 0.28, 0.10, 0);
    setBoneDeltaEuler(bindMap, 'mixamorig:Spine2', 0.16, 0.06, 0);
    setBoneDeltaEuler(bindMap, 'mixamorig:Head', -0.32, -0.10, 0);
    setBoneDeltaEuler(bindMap, 'mixamorig:LeftUpLeg', 1.05, 0, -0.06);
    setBoneDeltaEuler(bindMap, 'mixamorig:LeftLeg', -1.45, 0, 0);
    setBoneDeltaEuler(bindMap, 'mixamorig:RightUpLeg', 0.72, 0, 0.06);
    setBoneDeltaEuler(bindMap, 'mixamorig:RightLeg', -1.55, 0, 0);
    aimArmsReady(0.14, 0.02);
  });

  // 7. RIFLE_HIT: Ballistic impact flinch / torso stagger
  const hitClip = bakeClip('Rifle_Hit_React', 0.36, 9, (u) => {
    const jolt = Math.sin(u * Math.PI);
    if (hips) {
      hips.bone.position.y = hips.bindPos.y - 2.5 - jolt * 3.0;
      hips.bone.position.z = hips.bindPos.z - jolt * 4.5;
    }
    setBoneDeltaEuler(bindMap, 'mixamorig:Spine', 0.08 - jolt * 0.32, jolt * 0.22, -jolt * 0.12);
    setBoneDeltaEuler(bindMap, 'mixamorig:Spine2', 0.06 - jolt * 0.28, jolt * 0.18, 0);
    setBoneDeltaEuler(bindMap, 'mixamorig:Head', -jolt * 0.38, -jolt * 0.25, jolt * 0.15);
    setBoneDeltaEuler(bindMap, 'mixamorig:LeftUpLeg', 0.16 + jolt * 0.15, 0, -0.04);
    setBoneDeltaEuler(bindMap, 'mixamorig:LeftLeg', -0.25 - jolt * 0.25, 0, 0);
    setBoneDeltaEuler(bindMap, 'mixamorig:RightUpLeg', -0.08, 0, 0.04);
    setBoneDeltaEuler(bindMap, 'mixamorig:RightLeg', -0.20 - jolt * 0.20, 0, 0);
    aimArmsReady(0.08 + jolt * 0.12, -jolt * 0.15, jolt * 0.08);
  });

  // 8. RIFLE_DEATH: Full kinematic collapse onto the floor (clamped on last frame)
  const deathClip = bakeClip('Rifle_Death', 0.82, 15, (u) => {
    const ease = 1 - Math.pow(1 - u, 2.4);
    const kneeBuckle = Math.sin(Math.min(1, u * 1.6) * Math.PI);
    if (hips) {
      hips.bone.position.y = hips.bindPos.y * (1 - ease * 0.88);
      hips.bone.position.z = hips.bindPos.z - ease * 38.0;
    }
    setBoneDeltaEuler(bindMap, 'mixamorig:Hips', -ease * 1.42, ease * 0.18, ease * 0.12);
    setBoneDeltaEuler(bindMap, 'mixamorig:Spine', -ease * 0.22, 0, 0);
    setBoneDeltaEuler(bindMap, 'mixamorig:Head', -ease * 0.35, ease * 0.42, 0);
    setBoneDeltaEuler(bindMap, 'mixamorig:LeftUpLeg', kneeBuckle * 0.65 + ease * 0.15, 0, -ease * 0.18);
    setBoneDeltaEuler(bindMap, 'mixamorig:LeftLeg', -kneeBuckle * 0.95 - ease * 0.25, 0, 0);
    setBoneDeltaEuler(bindMap, 'mixamorig:RightUpLeg', kneeBuckle * 0.50 + ease * 0.08, 0, ease * 0.22);
    setBoneDeltaEuler(bindMap, 'mixamorig:RightLeg', -kneeBuckle * 0.85 - ease * 0.35, 0, 0);
    aimArmsReady(0.05 - ease * 0.35, ease * 0.25);
  });

  resetToBindPose();

  // Preserve any multi-frame clip from rawGltfClips if present, otherwise use our baked Pro Rifle Pack clips
  const findMultiFrameRaw = (keyword: string) =>
    rawGltfClips.find(
      (c) =>
        c.duration > 0.15 &&
        c.name.toLowerCase().includes(keyword.toLowerCase())
    );

  return {
    RIFLE_IDLE: findMultiFrameRaw('idle') ?? idleClip,
    RIFLE_WALK: findMultiFrameRaw('walk') ?? walkClip,
    RIFLE_RUN: findMultiFrameRaw('run') ?? runClip,
    RIFLE_AIM: findMultiFrameRaw('aim') ?? aimClip,
    RIFLE_FIRE: findMultiFrameRaw('fire') ?? fireClip,
    RIFLE_CROUCH: findMultiFrameRaw('crouch') ?? crouchClip,
    RIFLE_HIT: findMultiFrameRaw('hit') ?? hitClip,
    RIFLE_DEATH: findMultiFrameRaw('death') ?? deathClip,
  };
}
