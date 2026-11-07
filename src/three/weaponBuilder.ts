import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OpticType, ReloadPhase, WeaponId } from '../types/game';
import { ProceduralTextures } from './textures';

// Direct GitHub Raw URLs & bundled local mirrors for all 8 animated 3D FPS weapons and Arms Rig
export const MARK_23_GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/9cb9f466f8eebe34fde3e3149b0c0141455e0405/mark_23__animated_free.glb';
export const MARK_23_LOCAL_URL = '/models/mark_23_animated.glb';

export const P50_PISTOL_GITHUB_RAW_URL = MARK_23_GITHUB_RAW_URL;
export const P50_PISTOL_LOCAL_URL = MARK_23_LOCAL_URL;

export const SMG_45_GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/2a1d928d36a1c6caa00e3d37806eb76366e194f5/fps_animated_smg.glb';
export const SMG_45_LOCAL_URL = '/models/fps_animated_smg.glb';

export const M4_FPS_PACK_GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/7d6bce91991948aba943e1a2d31032cf4dfc9899/m4_-_fps_weapon_animations_pack_v.1.glb';
export const M4_FPS_PACK_LOCAL_URL = '/models/m4_fps_pack.glb';

export const CARBINE_AR_GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/b0fe43592a9e7ce99b6ea83c9eed5cbb63379323/fps_animated_carbine.glb';
export const CARBINE_AR_LOCAL_URL = '/models/fps_animated_carbine.glb';

export const AK47_RIFLE_GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/b0fe43592a9e7ce99b6ea83c9eed5cbb63379323/fps_character_animation_pack_ak-47.glb';
export const AK47_RIFLE_LOCAL_URL = '/models/fps_ak47.glb';

export const L49_LMG_GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/dd881049230b5ee85f944448a09d25db91f0eb37/lmg_animated.glb';
export const L49_LMG_LOCAL_URL = '/models/lmg_animated.glb';

export const SNIPER_BOLT_GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/b0fe43592a9e7ce99b6ea83c9eed5cbb63379323/sniper_animated.glb';
export const SNIPER_BOLT_LOCAL_URL = '/models/sniper_animated.glb';

export const SNIPER_TACTICAL_GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/b0fe43592a9e7ce99b6ea83c9eed5cbb63379323/sniper_fps_animation.glb';
export const SNIPER_TACTICAL_LOCAL_URL = '/models/sniper_fps_animation.glb';

export const ARMS_RIG_GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/03ecdb098c01e77ffdab4d819cc7f5aa43eafda0/arms_rig.glb';
export const ARMS_RIG_LOCAL_URL = '/models/arms_rig.glb';

export interface TacticalWeaponRig {
  root: THREE.Group;
  gunGroup: THREE.Group;
  boltCarrier: THREE.Mesh;
  chargingHandle: THREE.Group;
  boltCatch: THREE.Mesh;
  fireSelector: THREE.Group;
  triggerMesh: THREE.Mesh;
  magazineGroup: THREE.Group;
  topCartridges: THREE.Mesh[];
  suppressorGroup: THREE.Group;
  flashHiderGroup: THREE.Group;
  holoSightGroup: THREE.Group;
  holoReticleMesh: THREE.Mesh;
  lpvoScopeGroup: THREE.Group;
  lpvoReticleMesh: THREE.Mesh;
  lpvoThrowLever: THREE.Mesh;
  ironSightsGroup: THREE.Group;
  cantedSightGroup: THREE.Group;
  cantedReticleMesh: THREE.Mesh;
  peqLaserBeam: THREE.Mesh;
  leftHandGroup: THREE.Group;
  rightHandGroup: THREE.Group;
  rightTriggerFinger: THREE.Group;
  setActiveWeapon: (weaponId: WeaponId) => void;
  setTriggerPull: (pullAlpha: number) => void;
  triggerFireAnimation: (isAds?: boolean) => void;
  triggerReloadAnimation: (durationSec: number) => void;
  triggerBoltAnimation: () => void;
  triggerInspectAnimation: () => void;
  triggerEquipAnimation: () => void;
  triggerHolsterAnimation: () => void;
  updateGlbAnimations: (
    dt: number,
    isMoving?: boolean,
    isAds?: boolean,
    reloadPhase?: ReloadPhase,
    reloadProgress?: number
  ) => void;
  muzzleFlashGroup: THREE.Group;
  muzzleLight: THREE.PointLight;
  ejectionPortWorldPos: THREE.Object3D;
  muzzleWorldPos: THREE.Object3D;
  laserOriginWorldPos: THREE.Object3D;
}

const _ikShoulderWorld = new THREE.Vector3();
const _ikTargetWorld = new THREE.Vector3();
const _ikDiff = new THREE.Vector3();
const _ikDir = new THREE.Vector3();
const _ikPoleVec = new THREE.Vector3();
const _ikOrthoPole = new THREE.Vector3();
const _ikUpperDir = new THREE.Vector3();
const _ikElbowWorld = new THREE.Vector3();
const _ikParentQuat = new THREE.Quaternion();
const _ikCurEndWorld = new THREE.Vector3();
const _ikCurDir = new THREE.Vector3();
const _ikDesDir = new THREE.Vector3();
const _ikDeltaWorldQuat = new THREE.Quaternion();
const _ikCurWorldQuat = new THREE.Quaternion();
const _ikNewWorldQuat = new THREE.Quaternion();
const _ikTargetHandQuat = new THREE.Quaternion();
const _ikHandParentQuat = new THREE.Quaternion();

const ARMS_RIG_CANONICAL_JOINTS = [
  'root',
  'shoulder.R',
  'upper_arm.R',
  'forearm.R',
  'hand.R',
  'palm.01.R',
  'f_index.01.R',
  'f_index.02.R',
  'f_index.03.R',
  'thumb.01.R',
  'thumb.02.R',
  'thumb.03.R',
  'palm.02.R',
  'f_middle.01.R',
  'f_middle.02.R',
  'f_middle.03.R',
  'palm.03.R',
  'f_ring.01.R',
  'f_ring.02.R',
  'f_ring.03.R',
  'palm.04.R',
  'f_pinky.01.R',
  'f_pinky.02.R',
  'f_pinky.03.R',
  'shoulder.L',
  'upper_arm.L',
  'forearm.L',
  'hand.L',
  'palm.01.L',
  'f_index.01.L',
  'f_index.02.L',
  'f_index.03.L',
  'thumb.01.L',
  'thumb.02.L',
  'thumb.03.L',
  'palm.02.L',
  'f_middle.01.L',
  'f_middle.02.L',
  'f_middle.03.L',
  'palm.03.L',
  'f_ring.01.L',
  'f_ring.02.L',
  'f_ring.03.L',
  'palm.04.L',
  'f_pinky.01.L',
  'f_pinky.02.L',
  'f_pinky.03.L',
  'hand_ik.R',
  'elbow_ik.R',
  'hand_ik.L',
  'elbow_ik.L',
  'Hold_Point',
] as const;

interface FirstPersonArmsRigController {
  container: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Record<string, THREE.AnimationAction>;
  bones: Record<string, THREE.Object3D>;
  qOpen: Record<string, THREE.Quaternion>;
  qGrip: Record<string, THREE.Quaternion>;
  playClip: (clipName: string, loop?: boolean, timeScale?: number) => void;
  solveAndPose: (
    dt: number,
    rightTargetObj: THREE.Object3D,
    leftTargetObj: THREE.Object3D,
    rightPoleDir: THREE.Vector3,
    leftPoleDir: THREE.Vector3,
    rightGripAlpha: number,
    leftGripAlpha: number,
    triggerPullAlpha: number,
    leftThumbAlpha: number
  ) => void;
}

/**
 * Preserves the embedded 512x512 `arms_01` texture (`origMat.map`) and `TEXCOORD_0` UVs from `arms_rig.glb`
 * while adding subtle micro-grain bump mapping (`textures.gloveBump`) and balanced PBR roughness.
 */
function enhanceArmsRigMaterial(
  mesh: THREE.SkinnedMesh,
  textures: ProceduralTextures
) {
  const applyToMat = (mat: THREE.Material) => {
    const stdMat = mat as THREE.MeshStandardMaterial;
    if (stdMat.map) {
      stdMat.map.colorSpace = THREE.SRGBColorSpace;
      stdMat.map.needsUpdate = true;
    }
    stdMat.color.setHex(0xffffff);
    stdMat.vertexColors = false;
    stdMat.roughness = 0.62;
    stdMat.metalness = 0.05;
    stdMat.bumpMap = textures.gloveBump;
    stdMat.bumpScale = 0.0018;
    stdMat.needsUpdate = true;
  };

  if (Array.isArray(mesh.material)) {
    mesh.material.forEach(applyToMat);
  } else if (mesh.material) {
    applyToMat(mesh.material);
  }
}

/**
 * Loads and configures the complete 2-arm skeletal rig (`arms_rig.glb`)
 * with its 18 embedded animations, Two-Bone Analytic IK solver (`upper_arm -> forearm -> hand`),
 * and exact artist-authored finger pose interpolation (`rest` <-> `guard_idle` / `knife_idle`)
 * with dedicated trigger finger (`f_index.01..03.R`) placement and squeeze.
 */
function setupFirstPersonArmsRig(
  gltfScene: THREE.Group,
  animations: THREE.AnimationClip[],
  container: THREE.Group,
  textures: ProceduralTextures
): FirstPersonArmsRigController {
  const bones: Record<string, THREE.Object3D> = {};
  const qOpen: Record<string, THREE.Quaternion> = {};
  const qGrip: Record<string, THREE.Quaternion> = {};
  const actions: Record<string, THREE.AnimationAction> = {};

  const registerBoneAlias = (key: string, obj: THREE.Object3D) => {
    if (!key) return;
    bones[key] = obj;
    const sanitized = key.replace(/\./g, '');
    bones[sanitized] = obj;
  };

  gltfScene.traverse((obj) => {
    obj.frustumCulled = false;
    if (obj.name) {
      registerBoneAlias(obj.name, obj);
    }
    if (obj.userData && typeof obj.userData.name === 'string') {
      registerBoneAlias(obj.userData.name, obj);
    }
    if ((obj as THREE.SkinnedMesh).isSkinnedMesh) {
      const skMesh = obj as THREE.SkinnedMesh;
      skMesh.frustumCulled = false;
      skMesh.castShadow = false;
      skMesh.receiveShadow = true;
      enhanceArmsRigMaterial(skMesh, textures);
      if (skMesh.skeleton && skMesh.skeleton.bones) {
        skMesh.skeleton.bones.forEach((b, idx) => {
          const canonicalName = ARMS_RIG_CANONICAL_JOINTS[idx];
          if (canonicalName && b) {
            registerBoneAlias(canonicalName, b);
          }
          if (b && b.name) {
            registerBoneAlias(b.name, b);
          }
        });
      }
    } else if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
    }
  });

  container.add(gltfScene);
  container.updateMatrixWorld(true);

  const mixer = new THREE.AnimationMixer(gltfScene);
  animations.forEach((clip) => {
    const act = mixer.clipAction(clip);
    actions[clip.name] = act;
  });

  const stopAllActions = () => {
    Object.values(actions).forEach((act) => {
      act.stop();
      act.weight = 0;
    });
  };

  // Sample exact artist-authored open-hand quaternions from 'rest' clip
  if (actions['rest']) {
    stopAllActions();
    actions['rest'].weight = 1.0;
    actions['rest'].play();
    mixer.setTime(0);
    container.updateMatrixWorld(true);
    Object.keys(bones).forEach((name) => {
      qOpen[name] = bones[name].quaternion.clone();
    });
  } else {
    Object.keys(bones).forEach((name) => {
      qOpen[name] = bones[name].quaternion.clone();
    });
  }

  // Sample exact artist-authored closed-grip quaternions from 'guard_idle' / 'knife_idle'
  const gripClipName = actions['guard_idle']
    ? 'guard_idle'
    : actions['knife_idle']
      ? 'knife_idle'
      : null;
  if (gripClipName && actions[gripClipName]) {
    stopAllActions();
    actions[gripClipName].weight = 1.0;
    actions[gripClipName].play();
    mixer.setTime(0);
    container.updateMatrixWorld(true);
    Object.keys(bones).forEach((name) => {
      qGrip[name] = bones[name].quaternion.clone();
    });
  } else {
    Object.keys(bones).forEach((name) => {
      qGrip[name] = bones[name].quaternion.clone();
    });
  }

  // Start default 'guard_idle' animation on the rig
  stopAllActions();
  if (actions['guard_idle']) {
    actions['guard_idle'].setLoop(THREE.LoopRepeat, Infinity);
    actions['guard_idle'].weight = 1.0;
    actions['guard_idle'].play();
  }

  const playClip = (clipName: string, loop = false, timeScale = 1.0) => {
    const act = actions[clipName];
    if (!act) return;
    Object.entries(actions).forEach(([name, a]) => {
      if (name !== clipName && name !== 'guard_idle') {
        a.stop();
      }
    });
    act.setLoop(
      loop ? THREE.LoopRepeat : THREE.LoopOnce,
      loop ? Infinity : 1
    );
    act.clampWhenFinished = !loop;
    act.timeScale = timeScale;
    act.weight = 1.0;
    act.reset();
    act.play();
  };

  // Analytic Swing-Preserving Two-Bone IK Solver (preserves twist roll of ArmsMesh)
  const alignBoneWorldY = (
    bone: THREE.Object3D,
    endChild: THREE.Object3D,
    desiredTargetWorld: THREE.Vector3
  ) => {
    bone.parent!.updateMatrixWorld(true);
    bone.updateMatrixWorld(true);
    endChild.updateMatrixWorld(true);

    const bPos = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
    _ikCurEndWorld.setFromMatrixPosition(endChild.matrixWorld);
    _ikCurDir.subVectors(_ikCurEndWorld, bPos).normalize();
    _ikDesDir.subVectors(desiredTargetWorld, bPos).normalize();

    _ikDeltaWorldQuat.setFromUnitVectors(_ikCurDir, _ikDesDir);
    bone.getWorldQuaternion(_ikCurWorldQuat);
    _ikNewWorldQuat.multiplyQuaternions(_ikDeltaWorldQuat, _ikCurWorldQuat);

    bone.parent!.getWorldQuaternion(_ikParentQuat);
    bone.quaternion.copy(_ikParentQuat.invert().multiply(_ikNewWorldQuat));
    bone.updateMatrixWorld(true);
  };

  const solveTwoBoneArmIK = (
    upperArmKey: string,
    forearmKey: string,
    handKey: string,
    targetObj: THREE.Object3D,
    poleDirWorld: THREE.Vector3
  ) => {
    const upperArm = bones[upperArmKey];
    const forearm = bones[forearmKey];
    const hand = bones[handKey];
    if (!upperArm || !forearm || !hand) return;

    // Reset to canonical artist-authored arm roll each frame before solving swing IK so twist never accumulates
    if (qGrip[upperArmKey]) {
      upperArm.quaternion.copy(qGrip[upperArmKey]);
    }
    if (qGrip[forearmKey]) {
      forearm.quaternion.copy(qGrip[forearmKey]);
    }

    const scale = container.scale.x || 0.76;
    const L1 = 0.32224 * scale;
    const L2 = 0.23732 * scale;

    upperArm.parent!.updateMatrixWorld(true);
    upperArm.updateMatrixWorld(true);
    _ikShoulderWorld.setFromMatrixPosition(upperArm.matrixWorld);

    targetObj.updateMatrixWorld(true);
    _ikTargetWorld.setFromMatrixPosition(targetObj.matrixWorld);

    _ikDiff.subVectors(_ikTargetWorld, _ikShoulderWorld);
    const dist = Math.min(
      Math.max(_ikDiff.length(), Math.abs(L1 - L2) + 0.005),
      L1 + L2 - 0.002
    );
    _ikDir.copy(_ikDiff).normalize();

    const cosA = THREE.MathUtils.clamp(
      (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist),
      -1,
      1
    );
    const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));

    // Transform downward-outward elbow pole direction using gunGroup/parent world rotation so elbows stay below screen bottom
    if (container.parent) {
      container.parent.getWorldQuaternion(_ikParentQuat);
      _ikPoleVec.copy(poleDirWorld).applyQuaternion(_ikParentQuat);
    } else {
      _ikPoleVec.copy(poleDirWorld);
    }

    _ikOrthoPole
      .copy(_ikPoleVec)
      .addScaledVector(_ikDir, -_ikPoleVec.dot(_ikDir));
    if (_ikOrthoPole.lengthSq() < 1e-6) {
      _ikOrthoPole.set(0, -1, 0);
    } else {
      _ikOrthoPole.normalize();
    }

    _ikUpperDir
      .copy(_ikDir)
      .multiplyScalar(cosA)
      .addScaledVector(_ikOrthoPole, sinA)
      .normalize();
    _ikElbowWorld
      .copy(_ikShoulderWorld)
      .addScaledVector(_ikUpperDir, L1);

    alignBoneWorldY(upperArm, forearm, _ikElbowWorld);
    alignBoneWorldY(forearm, hand, _ikTargetWorld);

    // Match hand world orientation directly to targetObj
    targetObj.getWorldQuaternion(_ikTargetHandQuat);
    hand.parent!.getWorldQuaternion(_ikHandParentQuat);
    hand.quaternion.copy(
      _ikHandParentQuat.invert().multiply(_ikTargetHandQuat)
    );
    hand.updateMatrixWorld(true);
  };

  const setBonePoseSlerp = (name: string, alpha: number) => {
    const b = bones[name];
    const qo = qOpen[name];
    const qg = qGrip[name];
    if (b && qo && qg) {
      b.quaternion.slerpQuaternions(
        qo,
        qg,
        THREE.MathUtils.clamp(alpha, 0, 1.25)
      );
    }
  };

  const setFingerChainSlerp = (
    prefix: string,
    sideSuffix: 'L' | 'R',
    c1: number,
    c2: number,
    c3: number
  ) => {
    setBonePoseSlerp(`${prefix}.01.${sideSuffix}`, c1);
    setBonePoseSlerp(`${prefix}.02.${sideSuffix}`, c2);
    setBonePoseSlerp(`${prefix}.03.${sideSuffix}`, c3);
  };

  const solveAndPose = (
    dt: number,
    rightTargetObj: THREE.Object3D,
    leftTargetObj: THREE.Object3D,
    rightPoleDir: THREE.Vector3,
    leftPoleDir: THREE.Vector3,
    rightGripAlpha: number,
    leftGripAlpha: number,
    triggerPullAlpha: number,
    leftThumbAlpha: number
  ) => {
    mixer.update(dt);

    // Keep root and shoulders anchored cleanly so the IK chain originates from low tactical shoulder sockets below screen
    const rootBone = bones['root'];
    if (rootBone && qGrip['root']) {
      rootBone.quaternion.copy(qGrip['root']);
    }
    const shoulderR = bones['shoulder.R'];
    const shoulderL = bones['shoulder.L'];
    if (shoulderR && qGrip['shoulder.R']) {
      shoulderR.quaternion.copy(qGrip['shoulder.R']);
    }
    if (shoulderL && qGrip['shoulder.L']) {
      shoulderL.quaternion.copy(qGrip['shoulder.L']);
    }

    container.updateMatrixWorld(true);

    solveTwoBoneArmIK(
      'upper_arm.R',
      'forearm.R',
      'hand.R',
      rightTargetObj,
      rightPoleDir
    );

    solveTwoBoneArmIK(
      'upper_arm.L',
      'forearm.L',
      'hand.L',
      leftTargetObj,
      leftPoleDir
    );

    // Pose Right Hand:
    // - palm.01..04.R & middle/ring/pinky wrap tightly around the pistol grip
    // - f_index.01..03.R reaches forward onto the weapon's trigger shoe and squeezes back when firing!
    // - thumb.01..03.R locks under the rear slide beavertail just like CS2 Desert Eagle
    const rg = THREE.MathUtils.clamp(rightGripAlpha, 0, 1.15);
    const trig = THREE.MathUtils.clamp(triggerPullAlpha, 0, 1);

    setBonePoseSlerp('palm.01.R', 0.85 * rg);
    setBonePoseSlerp('palm.02.R', 1.0 * rg);
    setBonePoseSlerp('palm.03.R', 1.0 * rg);
    setBonePoseSlerp('palm.04.R', 1.0 * rg);

    // Trigger Finger (Dedo no Gatilho):
    setFingerChainSlerp(
      'f_index',
      'R',
      0.24 * rg + trig * 0.42,
      0.55 * rg + trig * 0.38,
      0.55 * rg + trig * 0.38
    );
    setFingerChainSlerp('f_middle', 'R', 1.0 * rg, 1.0 * rg, 1.0 * rg);
    setFingerChainSlerp('f_ring', 'R', 1.0 * rg, 1.0 * rg, 1.0 * rg);
    setFingerChainSlerp('f_pinky', 'R', 1.0 * rg, 1.0 * rg, 1.0 * rg);
    setFingerChainSlerp('thumb', 'R', 0.68 * rg, 0.72 * rg, 0.7 * rg);

    // Pose Left Support Hand:
    const lg = THREE.MathUtils.clamp(leftGripAlpha, 0, 1.15);
    const lt = THREE.MathUtils.clamp(leftThumbAlpha, 0, 1.15);

    setBonePoseSlerp('palm.01.L', 0.95 * lg);
    setBonePoseSlerp('palm.02.L', 0.95 * lg);
    setBonePoseSlerp('palm.03.L', 0.95 * lg);
    setBonePoseSlerp('palm.04.L', 0.95 * lg);

    setFingerChainSlerp('f_index', 'L', 0.92 * lg, 0.95 * lg, 0.92 * lg);
    setFingerChainSlerp('f_middle', 'L', 0.96 * lg, 0.98 * lg, 0.95 * lg);
    setFingerChainSlerp('f_ring', 'L', 0.98 * lg, 1.0 * lg, 0.98 * lg);
    setFingerChainSlerp('f_pinky', 'L', 1.0 * lg, 1.0 * lg, 1.0 * lg);
    setFingerChainSlerp(
      'thumb',
      'L',
      0.65 * lg * lt,
      0.72 * lg * lt,
      0.68 * lg * lt
    );

    container.updateMatrixWorld(true);
  };

  return {
    container,
    mixer,
    actions,
    bones,
    qOpen,
    qGrip,
    playClip,
    solveAndPose,
  };
}

export function buildTacticalWeaponRig(
  textures: ProceduralTextures,
  isSoftwareGl: boolean
): TacticalWeaponRig {
  const root = new THREE.Group();
  const gunGroup = new THREE.Group();
  root.add(gunGroup);

  // Dynamic motion anchor that mirrors the active weapon's ANIM_WeaponMotion position + rotation
  // Parenting hand IK targets & attachments to weaponMotionAnchor guarantees 100% lockstep motion!
  const weaponMotionAnchor = new THREE.Group();
  gunGroup.add(weaponMotionAnchor);

  let activeWeapon: WeaponId = 'P50_PISTOL';
  let animElapsed = 0;

  // Shared Materials
  const matAnodizedUpper = new THREE.MeshPhysicalMaterial({
    color: 0x1a1e24,
    metalness: 0.88,
    roughness: 0.28,
    roughnessMap: textures.brushedMetalRoughness,
    anisotropy: isSoftwareGl ? 0 : 0.65,
    clearcoat: 0.15,
  });

  const matParkerizedSteel = new THREE.MeshStandardMaterial({
    color: 0x2c323b,
    metalness: 0.94,
    roughness: 0.22,
    roughnessMap: textures.brushedMetalRoughness,
  });

  const matBoltChrome = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.96,
    roughness: 0.16,
  });

  const matFdePolymer = new THREE.MeshStandardMaterial({
    color: 0x8c7355,
    metalness: 0.08,
    roughness: 0.78,
  });

  const matBlackPolymer = new THREE.MeshStandardMaterial({
    color: 0x14171c,
    metalness: 0.06,
    roughness: 0.82,
  });

  const matBrass = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.95,
    roughness: 0.18,
  });

  const matCopperJacket = new THREE.MeshStandardMaterial({
    color: 0xb87333,
    metalness: 0.92,
    roughness: 0.24,
  });

  const matLensGlass = new THREE.MeshPhysicalMaterial({
    color: 0x99f6e4,
    metalness: 0.1,
    roughness: 0.05,
    transmission: isSoftwareGl ? 0 : 0.88,
    transparent: true,
    opacity: isSoftwareGl ? 0.22 : 1.0,
    ior: 1.52,
    depthWrite: false,
  });

  // -------------------------------------------------------------------------
  // 1. PROCEDURAL M4 SOPMOD CARBINE BODY ('M4_CARBINE')
  // -------------------------------------------------------------------------
  const m4BodyGroup = new THREE.Group();
  m4BodyGroup.visible = false;
  weaponMotionAnchor.add(m4BodyGroup);

  const upperReceiver = new THREE.Mesh(
    new THREE.BoxGeometry(0.044, 0.052, 0.24),
    matAnodizedUpper
  );
  upperReceiver.position.set(0, 0.01, 0.02);
  m4BodyGroup.add(upperReceiver);

  const lowerReceiver = new THREE.Mesh(
    new THREE.BoxGeometry(0.042, 0.058, 0.19),
    matAnodizedUpper
  );
  lowerReceiver.position.set(0, -0.035, 0.035);
  m4BodyGroup.add(lowerReceiver);

  const handguard = new THREE.Mesh(
    new THREE.BoxGeometry(0.046, 0.054, 0.32),
    matFdePolymer
  );
  handguard.position.set(0, 0.01, -0.25);
  m4BodyGroup.add(handguard);

  const m4Barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.009, 0.01, 0.42, 14),
    matParkerizedSteel
  );
  m4Barrel.rotation.x = Math.PI / 2;
  m4Barrel.position.set(0, 0.01, -0.34);
  m4BodyGroup.add(m4Barrel);

  const m4PistolGrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.032, 0.095, 0.048),
    matFdePolymer
  );
  m4PistolGrip.position.set(0, -0.088, 0.092);
  m4PistolGrip.rotation.x = 0.28;
  m4BodyGroup.add(m4PistolGrip);

  const m4Stock = new THREE.Mesh(
    new THREE.BoxGeometry(0.042, 0.095, 0.18),
    matBlackPolymer
  );
  m4Stock.position.set(0, -0.015, 0.22);
  m4BodyGroup.add(m4Stock);

  const boltCarrier = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.02, 0.082),
    matBoltChrome
  );
  boltCarrier.position.set(0.018, 0.014, 0.005);
  m4BodyGroup.add(boltCarrier);

  const chargingHandle = new THREE.Group();
  chargingHandle.position.set(0, 0.028, 0.14);
  m4BodyGroup.add(chargingHandle);

  const boltCatch = new THREE.Mesh(
    new THREE.BoxGeometry(0.008, 0.026, 0.016),
    matParkerizedSteel
  );
  boltCatch.position.set(-0.024, -0.012, 0.005);
  m4BodyGroup.add(boltCatch);

  const fireSelector = new THREE.Group();
  fireSelector.position.set(0, -0.032, 0.088);
  m4BodyGroup.add(fireSelector);

  const triggerMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.007, 0.024, 0.008),
    matParkerizedSteel
  );
  triggerMesh.position.set(0, -0.056, 0.052);
  triggerMesh.rotation.x = 0.22;
  m4BodyGroup.add(triggerMesh);

  const magazineGroup = new THREE.Group();
  magazineGroup.position.set(0, -0.125, -0.014);
  const magBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.028, 0.165, 0.068),
    matFdePolymer
  );
  magazineGroup.add(magBody);

  const topCartridges: THREE.Mesh[] = [];
  for (let c = 0; c < 2; c++) {
    const cartGroup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0046, 0.0048, 0.044, 10),
      matBrass
    );
    cartGroup.rotation.x = Math.PI / 2;
    cartGroup.position.set(
      c === 0 ? 0.004 : -0.004,
      0.085 - c * 0.006,
      -0.004
    );
    const bulletTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.0044, 0.018, 10),
      matCopperJacket
    );
    bulletTip.position.set(0, 0.028, 0);
    cartGroup.add(bulletTip);
    magazineGroup.add(cartGroup);
    topCartridges.push(cartGroup);
  }
  m4BodyGroup.add(magazineGroup);

  const flashHiderGroup = new THREE.Group();
  flashHiderGroup.position.set(0, 0.01, -0.51);
  m4BodyGroup.add(flashHiderGroup);

  // -------------------------------------------------------------------------
  // 2. WORLD ORIGIN MARKERS, SUPPRESSOR, LASER & MUZZLE FLASH (INSIDE MOTION ANCHOR)
  // -------------------------------------------------------------------------
  const ejectionPortWorldPos = new THREE.Object3D();
  ejectionPortWorldPos.position.set(0.025, 0.028, -0.04);
  weaponMotionAnchor.add(ejectionPortWorldPos);

  const suppressorGroup = new THREE.Group();
  suppressorGroup.position.set(0, 0.022, -0.28);
  const supTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.019, 0.019, 0.155, 20),
    matFdePolymer
  );
  supTube.rotation.x = Math.PI / 2;
  const supCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.021, 0.021, 0.024, 20),
    matParkerizedSteel
  );
  supCollar.rotation.x = Math.PI / 2;
  supCollar.position.set(0, 0, 0.065);
  suppressorGroup.add(supTube, supCollar);
  suppressorGroup.visible = false;
  weaponMotionAnchor.add(suppressorGroup);

  const muzzleWorldPos = new THREE.Object3D();
  muzzleWorldPos.position.set(0, 0.022, -0.24);
  weaponMotionAnchor.add(muzzleWorldPos);

  const muzzleFlashGroup = new THREE.Group();
  muzzleFlashGroup.position.set(0, 0.022, -0.23);
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffb703,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 3; i++) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), flashMat);
    plane.rotation.z = (i * Math.PI) / 3;
    muzzleFlashGroup.add(plane);
  }
  const flashCore = new THREE.Mesh(
    new THREE.ConeGeometry(0.032, 0.16, 8),
    flashMat
  );
  flashCore.rotation.x = -Math.PI / 2;
  flashCore.position.z = -0.06;
  muzzleFlashGroup.add(flashCore);
  muzzleFlashGroup.visible = false;
  weaponMotionAnchor.add(muzzleFlashGroup);

  const muzzleLight = new THREE.PointLight(0xffaa33, 0, 9, 2);
  muzzleLight.position.set(0, 0.03, -0.26);
  weaponMotionAnchor.add(muzzleLight);

  const laserOriginWorldPos = new THREE.Object3D();
  laserOriginWorldPos.position.set(0.0, -0.015, -0.18);
  weaponMotionAnchor.add(laserOriginWorldPos);

  const beamGeo = new THREE.CylinderGeometry(0.0012, 0.0012, 1.0, 6);
  beamGeo.translate(0, -0.5, 0);
  beamGeo.rotateX(Math.PI / 2);
  const peqLaserBeam = new THREE.Mesh(
    beamGeo,
    new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  peqLaserBeam.position.copy(laserOriginWorldPos.position);
  weaponMotionAnchor.add(peqLaserBeam);

  // -------------------------------------------------------------------------
  // 3. MODULAR OPTICS SUITE (LOCKED TO WEAPON MOTION ANCHOR)
  // -------------------------------------------------------------------------
  const opticsContainer = new THREE.Group();
  weaponMotionAnchor.add(opticsContainer);

  const holoSightGroup = new THREE.Group();
  holoSightGroup.position.set(0, 0.042, 0.04);

  const holoBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.036, 0.012, 0.068),
    matAnodizedUpper
  );
  holoBase.position.set(0, 0.006, 0);
  holoSightGroup.add(holoBase);

  const hoodPillarLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.005, 0.036, 0.048),
    matFdePolymer
  );
  hoodPillarLeft.position.set(-0.018, 0.03, 0);
  const hoodPillarRight = hoodPillarLeft.clone();
  hoodPillarRight.position.x = 0.018;
  const hoodTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.041, 0.005, 0.048),
    matFdePolymer
  );
  hoodTop.position.set(0, 0.049, 0);
  holoSightGroup.add(hoodPillarLeft, hoodPillarRight, hoodTop);

  const holoGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.031, 0.03),
    matLensGlass
  );
  holoGlass.position.set(0, 0.03, 0);
  holoGlass.renderOrder = 10;
  holoSightGroup.add(holoGlass);

  const holoReticleMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.028, 0.028),
    new THREE.MeshBasicMaterial({
      map: textures.holoReticle,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  holoReticleMesh.position.set(0, 0.03, -0.002);
  holoReticleMesh.renderOrder = 12;
  holoSightGroup.add(holoReticleMesh);
  holoSightGroup.visible = false;
  opticsContainer.add(holoSightGroup);

  const lpvoScopeGroup = new THREE.Group();
  lpvoScopeGroup.position.set(0, 0.042, 0.05);

  const mountBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.016, 0.12),
    matFdePolymer
  );
  mountBase.position.set(0, 0.008, -0.01);
  lpvoScopeGroup.add(mountBase);

  const ocularRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.02, 0.004, 12, 32),
    matAnodizedUpper
  );
  ocularRing.position.set(0, 0.036, 0.068);
  const objectiveRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.019, 0.0038, 12, 32),
    matAnodizedUpper
  );
  objectiveRing.position.set(0, 0.036, -0.115);
  lpvoScopeGroup.add(ocularRing, objectiveRing);

  for (let a = 0; a < 8; a++) {
    const angle = (a * Math.PI) / 4;
    const strut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0035, 0.0035, 0.18, 8),
      matFdePolymer
    );
    strut.rotation.x = Math.PI / 2;
    strut.position.set(
      Math.cos(angle) * 0.019,
      0.036 + Math.sin(angle) * 0.019,
      -0.022
    );
    lpvoScopeGroup.add(strut);
  }

  const lpvoThrowLever = new THREE.Mesh(
    new THREE.BoxGeometry(0.006, 0.026, 0.008),
    matParkerizedSteel
  );
  lpvoThrowLever.position.set(-0.024, 0.048, 0.048);
  lpvoThrowLever.rotation.z = 0.6;
  lpvoScopeGroup.add(lpvoThrowLever);

  const lpvoLens = new THREE.Mesh(
    new THREE.CircleGeometry(0.018, 24),
    matLensGlass
  );
  lpvoLens.position.set(0, 0.036, 0.065);
  lpvoLens.renderOrder = 10;
  lpvoScopeGroup.add(lpvoLens);

  const lpvoReticleMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.038, 0.038),
    new THREE.MeshBasicMaterial({
      map: textures.lpvoReticle,
      transparent: true,
      depthWrite: false,
    })
  );
  lpvoReticleMesh.position.set(0, 0.036, 0.066);
  lpvoReticleMesh.renderOrder = 12;
  lpvoScopeGroup.add(lpvoReticleMesh);
  lpvoScopeGroup.visible = false;
  opticsContainer.add(lpvoScopeGroup);

  const ironSightsGroup = new THREE.Group();
  ironSightsGroup.visible = true;
  opticsContainer.add(ironSightsGroup);

  const cantedSightGroup = new THREE.Group();
  cantedSightGroup.position.set(0.018, 0.036, -0.05);
  cantedSightGroup.rotation.z = -Math.PI / 4;
  cantedSightGroup.visible = false;

  const cantedMount = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, 0.02, 0.034),
    matAnodizedUpper
  );
  cantedMount.position.set(0, 0.01, 0);
  cantedSightGroup.add(cantedMount);

  const cantedReticleMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.018, 0.018),
    new THREE.MeshBasicMaterial({
      map: textures.cantedDotReticle,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  cantedReticleMesh.position.set(0, 0.028, 0);
  cantedReticleMesh.renderOrder = 12;
  cantedSightGroup.add(cantedReticleMesh);
  opticsContainer.add(cantedSightGroup);

  const gltfLoader = new GLTFLoader();
  // Support KHR_materials_pbrSpecularGlossiness if loading directly from GitHub Raw fallback
  gltfLoader.register((parser) => ({
    name: 'KHR_materials_pbrSpecularGlossiness',
    extendMaterialParams: async (
      materialIndex: number,
      materialParams: Record<string, unknown>
    ) => {
      const matDef = parser.json.materials?.[materialIndex];
      const sg = matDef?.extensions?.KHR_materials_pbrSpecularGlossiness;
      if (!sg) return;
      materialParams.color = new THREE.Color(1, 1, 1);
      materialParams.roughness = matDef.name === 'M4_D' ? 0.36 : 0.58;
      materialParams.metalness = matDef.name === 'M4_D' ? 0.72 : 0.06;
      if (sg.diffuseTexture) {
        await parser.assignTexture(
          materialParams,
          'map',
          sg.diffuseTexture,
          THREE.SRGBColorSpace
        );
      }
    },
  }));

  // =========================================================================
  // 4. UNIFIED 8-WEAPON ANIMATED GLB PACK SYSTEM (BUILT-IN HANDS & ANIMATIONS)
  // =========================================================================
  /**
   * Slices a time window `[startSec, endSec]` from a combined AnimationClip
   * using each track's native Three.js interpolant so start/end poses are exact.
   */
  const sliceAnimationSubclip = (
    sourceClip: THREE.AnimationClip,
    subName: string,
    startSec: number,
    endSec: number
  ): THREE.AnimationClip => {
    const duration = Math.max(0.05, endSec - startSec);
    const subTracks: THREE.KeyframeTrack[] = [];

    for (let i = 0; i < sourceClip.tracks.length; i++) {
      const track = sourceClip.tracks[i];
      const itemSize = track.getValueSize();
      const interp = (
        track as unknown as {
          createInterpolant: () => { evaluate: (t: number) => ArrayLike<number> };
        }
      ).createInterpolant();

      const times: number[] = [0];
      const values: number[] = [];

      const startSample = interp.evaluate(startSec);
      for (let k = 0; k < itemSize; k++) values.push(startSample[k]);

      const srcTimes = track.times;
      const srcValues = track.values;
      for (let j = 0; j < srcTimes.length; j++) {
        const t = srcTimes[j];
        if (t > startSec + 0.002 && t < endSec - 0.002) {
          times.push(t - startSec);
          const baseIdx = j * itemSize;
          for (let k = 0; k < itemSize; k++) {
            values.push(srcValues[baseIdx + k]);
          }
        }
      }

      times.push(duration);
      const endSample = interp.evaluate(endSec);
      for (let k = 0; k < itemSize; k++) values.push(endSample[k]);

      const TrackCtor = track.constructor as new (
        name: string,
        times: number[],
        values: number[]
      ) => THREE.KeyframeTrack;
      subTracks.push(new TrackCtor(track.name, times, values));
    }

    return new THREE.AnimationClip(subName, duration, subTracks);
  };

  interface AnimatedWeaponPackEntry {
    weaponId: WeaponId;
    localUrl: string;
    githubUrl: string;
    mountGroup: THREE.Group;
    loaded: boolean;
    mixer: THREE.AnimationMixer | null;
    actions: Record<string, THREE.AnimationAction>;
    mainBoneNode: THREE.Object3D | null;
    mainBoneRestPos: THREE.Vector3 | null;
    mainBoneScale: number;
    invertZ: boolean;
  }

  const createAnimatedWeaponEntry = (opts: {
    weaponId: WeaponId;
    localUrl: string;
    githubUrl: string;
    scale: number;
    rotY: number;
    pos: [number, number, number];
    mainBoneName?: string;
    mainBoneScale?: number;
    hideNodeNames?: string[];
    subclipWindows?: Record<string, [number, number]>;
    clipAliases?: Record<string, string>;
  }): AnimatedWeaponPackEntry => {
    const mountGroup = new THREE.Group();
    mountGroup.scale.setScalar(opts.scale);
    mountGroup.rotation.y = opts.rotY;
    mountGroup.position.set(opts.pos[0], opts.pos[1], opts.pos[2]);
    mountGroup.visible = activeWeapon === opts.weaponId;
    gunGroup.add(mountGroup);

    const entry: AnimatedWeaponPackEntry = {
      weaponId: opts.weaponId,
      localUrl: opts.localUrl,
      githubUrl: opts.githubUrl,
      mountGroup,
      loaded: false,
      mixer: null,
      actions: {},
      mainBoneNode: null,
      mainBoneRestPos: null,
      mainBoneScale: opts.mainBoneScale ?? 0.01,
      invertZ: Math.abs(opts.rotY - Math.PI) < 0.2,
    };

    const onLoaded = (gltf: {
      scene: THREE.Group;
      animations: THREE.AnimationClip[];
    }) => {
      const modelScene = gltf.scene;
      modelScene.traverse((child) => {
        child.frustumCulled = false;
        if (opts.mainBoneName && child.name === opts.mainBoneName) {
          entry.mainBoneNode = child;
          entry.mainBoneRestPos = child.position.clone();
        }
        if (opts.hideNodeNames && opts.hideNodeNames.includes(child.name)) {
          child.visible = false;
        }
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.frustumCulled = false;
          m.castShadow = false;
          m.receiveShadow = true;
          const fixMat = (mat: THREE.Material) => {
            const std = mat as THREE.MeshStandardMaterial;
            if (std.map) {
              std.map.colorSpace = THREE.SRGBColorSpace;
              std.map.needsUpdate = true;
            }
            if (std.color) {
              std.color.setHex(0xffffff);
            }
            std.needsUpdate = true;
          };
          if (Array.isArray(m.material)) {
            m.material.forEach(fixMat);
          } else if (m.material) {
            fixMat(m.material);
          }
        }
      });

      mountGroup.add(modelScene);
      entry.loaded = true;

      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(modelScene);
        entry.mixer = mixer;

        if (opts.subclipWindows) {
          const baseClip = gltf.animations[0];
          Object.entries(opts.subclipWindows).forEach(([actionName, [t0, t1]]) => {
            const sub = sliceAnimationSubclip(baseClip, actionName, t0, t1);
            const act = mixer.clipAction(sub);
            act.setLoop(THREE.LoopOnce, 1);
            act.clampWhenFinished = true;
            entry.actions[actionName] = act;
          });
        } else {
          gltf.animations.forEach((clip) => {
            let minT = Infinity;
            for (let i = 0; i < clip.tracks.length; i++) {
              const tArr = clip.tracks[i].times;
              if (tArr.length > 0 && tArr[0] < minT) {
                minT = tArr[0];
              }
            }
            if (minT > 0.005 && Number.isFinite(minT)) {
              for (let i = 0; i < clip.tracks.length; i++) {
                const tArr = clip.tracks[i].times;
                for (let j = 0; j < tArr.length; j++) {
                  tArr[j] = Math.max(0, tArr[j] - minT);
                }
              }
              clip.resetDuration();
            }

            const act = mixer.clipAction(clip);
            act.setLoop(THREE.LoopOnce, 1);
            act.clampWhenFinished = true;
            entry.actions[clip.name] = act;
          });

          if (opts.clipAliases) {
            Object.entries(opts.clipAliases).forEach(([canonical, rawName]) => {
              if (entry.actions[rawName]) {
                entry.actions[canonical] = entry.actions[rawName];
              }
            });
          }
        }
      }

      if (activeWeapon === opts.weaponId) {
        mountGroup.visible = true;
        m4BodyGroup.visible = false;
        armsRigContainer.visible = false;
        playWeaponPackAction(entry, 'Draw', undefined, 1.15);
      }
    };

    gltfLoader.load(opts.localUrl, onLoaded, undefined, () => {
      gltfLoader.load(opts.githubUrl, onLoaded);
    });

    return entry;
  };

  const playWeaponPackAction = (
    entry: AnimatedWeaponPackEntry | undefined,
    actionName: 'Draw' | 'Fire' | 'Reload' | 'Reload_Empty' | 'Holster',
    durationOverrideSec?: number,
    timeScaleOverride = 1.0
  ) => {
    if (!entry || !entry.mixer) return;
    const action =
      entry.actions[actionName] ||
      (actionName === 'Reload_Empty' ? entry.actions['Reload'] : undefined) ||
      (actionName === 'Holster' ? entry.actions['Draw'] : undefined) ||
      entry.actions['Draw'];
    if (!action) return;

    Object.entries(entry.actions).forEach(([, act]) => {
      if (act !== action) {
        act.stop();
        act.weight = 0;
      }
    });

    const clipDur = Math.max(0.08, action.getClip().duration || 0.5);
    if (durationOverrideSec && durationOverrideSec > 0.08) {
      action.timeScale = clipDur / durationOverrideSec;
    } else {
      action.timeScale = timeScaleOverride;
    }

    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.weight = 1.0;
    action.reset();
    action.play();
  };

  const weaponPacks: Record<WeaponId, AnimatedWeaponPackEntry> = {
    // [1] Mark 23 (.45 ACP) — Default Starting Pistol
    P50_PISTOL: createAnimatedWeaponEntry({
      weaponId: 'P50_PISTOL',
      localUrl: MARK_23_LOCAL_URL,
      githubUrl: MARK_23_GITHUB_RAW_URL,
      scale: 0.01,
      rotY: Math.PI,
      pos: [-0.10768, -1.472, -0.02],
      mainBoneName: 'main_j_050',
      mainBoneScale: 0.01,
      clipAliases: {
        Draw: 'Draw',
        Fire: 'Shoot',
        Reload: 'Reload',
        Reload_Empty: 'Reload',
        Holster: 'Hide',
      },
    }),

    // [2] SMG .45 ACP (`fps_animated_smg.glb`)
    SMG_45: createAnimatedWeaponEntry({
      weaponId: 'SMG_45',
      localUrl: SMG_45_LOCAL_URL,
      githubUrl: SMG_45_GITHUB_RAW_URL,
      scale: 0.01,
      rotY: Math.PI,
      pos: [-0.012, -0.092, 0.055],
      mainBoneName: 'smg45',
      mainBoneScale: 0.01,
      subclipWindows: {
        Fire: [0.0, 0.24],
        Reload_Empty: [0.3, 2.7],
        Reload: [2.73, 4.3],
        Draw: [4.37, 5.87],
        Holster: [7.2, 7.8],
      },
    }),

    // [3] M4A1 FPS Pack (`m4_fps_pack.glb`)
    M4_CARBINE: createAnimatedWeaponEntry({
      weaponId: 'M4_CARBINE',
      localUrl: M4_FPS_PACK_LOCAL_URL,
      githubUrl: M4_FPS_PACK_GITHUB_RAW_URL,
      scale: 1.0,
      rotY: Math.PI,
      pos: [-0.05683, -1.482, 0.12],
      mainBoneName: 'Main_j_049',
      mainBoneScale: 0.01,
      hideNodeNames: ['Mag2_j_051', 'Mag2', 'Mag2_M4_D_0'],
      clipAliases: {
        Draw: 'Draw',
        Fire: 'Fire',
        Reload: 'Reload',
        Reload_Empty: 'Reload_Empty',
        Holster: 'Holster',
      },
    }),

    // [4] Tactical Carbine Scope (`fps_animated_carbine.glb`)
    CARBINE_AR: createAnimatedWeaponEntry({
      weaponId: 'CARBINE_AR',
      localUrl: CARBINE_AR_LOCAL_URL,
      githubUrl: CARBINE_AR_GITHUB_RAW_URL,
      scale: 0.01,
      rotY: Math.PI,
      pos: [-0.012, -0.088, 0.05],
      mainBoneName: 'carbine',
      mainBoneScale: 0.01,
      subclipWindows: {
        Fire: [0.0, 0.26],
        Reload_Empty: [0.33, 2.27],
        Reload: [2.33, 4.47],
        Draw: [4.53, 5.9],
        Holster: [6.87, 7.4],
      },
    }),

    // [5] AK-47 Comando (`fps_ak47.glb`)
    AK47_RIFLE: createAnimatedWeaponEntry({
      weaponId: 'AK47_RIFLE',
      localUrl: AK47_RIFLE_LOCAL_URL,
      githubUrl: AK47_RIFLE_GITHUB_RAW_URL,
      scale: 1.0,
      rotY: Math.PI,
      pos: [-0.127, -1.485, 0.16],
      mainBoneName: 'SKEL_AK_47_Rifle',
      mainBoneScale: 0.01,
      hideNodeNames: ['Object_26', 'SKM_Comando_M_Shirt_BlackCamo2_0'],
      clipAliases: {
        Draw: 'RIG_UE5_Comando_AK_Equip',
        Fire: 'RIG_UE5_Comando_AK_Fire',
        Reload: 'RIG_UE5_Comando_AK_Reload',
        Reload_Empty: 'RIG_UE5_Comando_AK_Reload',
        Holster: 'RIG_UE5_Comando_AK_Equip',
      },
    }),

    // [6] LMG Animated (`lmg_animated.glb`)
    L49_LMG: createAnimatedWeaponEntry({
      weaponId: 'L49_LMG',
      localUrl: L49_LMG_LOCAL_URL,
      githubUrl: L49_LMG_GITHUB_RAW_URL,
      scale: 0.01,
      rotY: Math.PI,
      pos: [-0.018, -0.095, 0.04],
      mainBoneName: 'LMG',
      mainBoneScale: 0.01,
      subclipWindows: {
        Fire: [0.0, 0.34],
        Reload: [0.4, 5.47],
        Reload_Empty: [5.53, 10.6],
        Draw: [10.67, 12.57],
        Holster: [14.23, 15.0],
      },
    }),

    // [7] Sniper Bolt-Action (`sniper_animated.glb`)
    SNIPER_BOLT: createAnimatedWeaponEntry({
      weaponId: 'SNIPER_BOLT',
      localUrl: SNIPER_BOLT_LOCAL_URL,
      githubUrl: SNIPER_BOLT_GITHUB_RAW_URL,
      scale: 0.01,
      rotY: Math.PI,
      pos: [-0.012, -0.092, 0.065],
      mainBoneName: 'sniper',
      mainBoneScale: 0.01,
      subclipWindows: {
        Fire: [0.0, 1.95],
        Reload: [2.07, 3.85],
        Reload_Empty: [2.07, 3.85],
        Draw: [3.9, 4.75],
        Holster: [5.57, 6.5],
      },
    }),

    // [8] Sniper Tactical (`sniper_fps_animation.glb`)
    SNIPER_TACTICAL: createAnimatedWeaponEntry({
      weaponId: 'SNIPER_TACTICAL',
      localUrl: SNIPER_TACTICAL_LOCAL_URL,
      githubUrl: SNIPER_TACTICAL_GITHUB_RAW_URL,
      scale: 0.35,
      rotY: 0,
      pos: [-0.022, -0.088, 0.07],
      mainBoneName: 'BODY_043',
      mainBoneScale: 0.35,
      hideNodeNames: ['Object_51', 'Ch22_Body', 'Ch22_Body_TEXTURA_0'],
      subclipWindows: {
        Draw: [5.8, 8.2],
        Reload: [10.8, 14.0],
        Fire: [16.8, 18.0],
        Reload_Empty: [20.8, 26.2],
        Holster: [5.8, 6.8],
      },
    }),
  };

  // =========================================================================
  // 5. UNIFIED 2-ARM SKELETAL RIG (`arms_rig.glb`) FALLBACK WITH IK
  // =========================================================================
  const leftHandGroup = new THREE.Group();
  weaponMotionAnchor.add(leftHandGroup);

  const rightHandGroup = new THREE.Group();
  weaponMotionAnchor.add(rightHandGroup);

  const rightTriggerFinger = new THREE.Group();
  rightHandGroup.add(rightTriggerFinger);

  const armsRigContainer = new THREE.Group();
  armsRigContainer.scale.setScalar(0.84);
  armsRigContainer.rotation.y = Math.PI;
  armsRigContainer.position.set(0, -1.68, 0.22);
  armsRigContainer.visible = false;
  gunGroup.add(armsRigContainer);

  let armsRigCtrl: FirstPersonArmsRigController | null = null;
  let currentTriggerPullAlpha = 0;

  const rightPoleDir = new THREE.Vector3(0.28, -1.0, 0.25);
  const leftPoleDir = new THREE.Vector3(-0.28, -1.0, 0.25);

  const leftBasePos = new THREE.Vector3();
  const leftBaseEuler = new THREE.Euler();
  const rightBasePos = new THREE.Vector3();
  const rightBaseEuler = new THREE.Euler();

  const configureWeaponAnchors = (weaponId: WeaponId) => {
    if (weaponId === 'P50_PISTOL') {
      rightBasePos.set(0.02, -0.047, 0.108);
      rightBaseEuler.set(-1.72, -0.1, 0.12);
      leftBasePos.set(-0.024, -0.059, 0.084);
      leftBaseEuler.set(-1.68, 0.16, -0.14);

      opticsContainer.position.set(0, 0.011, 0.0);
      opticsContainer.scale.setScalar(0.75);
      suppressorGroup.position.set(0, 0.021, -0.25);
      muzzleWorldPos.position.set(0, 0.021, -0.22);
      muzzleFlashGroup.position.set(0, 0.021, -0.21);
      laserOriginWorldPos.position.set(0, -0.013, -0.19);
      peqLaserBeam.position.copy(laserOriginWorldPos.position);
      ejectionPortWorldPos.position.set(0.022, 0.027, -0.02);
    } else if (weaponId === 'SMG_45') {
      opticsContainer.position.set(0, 0.024, -0.04);
      opticsContainer.scale.setScalar(0.82);
      suppressorGroup.position.set(0, 0.01, -0.38);
      muzzleWorldPos.position.set(0, 0.01, -0.35);
      muzzleFlashGroup.position.set(0, 0.01, -0.34);
      laserOriginWorldPos.position.set(0.018, 0.005, -0.26);
      peqLaserBeam.position.copy(laserOriginWorldPos.position);
      ejectionPortWorldPos.position.set(0.022, 0.018, -0.04);
    } else if (weaponId === 'AK47_RIFLE') {
      rightBasePos.set(0.022, -0.054, 0.086);
      rightBaseEuler.set(-1.62, -0.08, 0.1);
      leftBasePos.set(-0.025, -0.042, -0.18);
      leftBaseEuler.set(-1.42, 0.22, -0.26);

      opticsContainer.position.set(0, 0.008, 0.01);
      opticsContainer.scale.setScalar(0.92);
      suppressorGroup.position.set(0, -0.002, -0.54);
      muzzleWorldPos.position.set(0, -0.002, -0.52);
      muzzleFlashGroup.position.set(0, -0.002, -0.51);
      laserOriginWorldPos.position.set(0.026, 0.002, -0.32);
      peqLaserBeam.position.copy(laserOriginWorldPos.position);
      ejectionPortWorldPos.position.set(0.024, 0.006, 0.01);
    } else if (weaponId === 'SNIPER_TACTICAL') {
      rightBasePos.set(0.024, -0.052, 0.084);
      rightBaseEuler.set(-1.62, -0.08, 0.1);
      leftBasePos.set(-0.024, -0.045, -0.22);
      leftBaseEuler.set(-1.42, 0.22, -0.24);

      opticsContainer.position.set(0, 0.025, -0.04);
      opticsContainer.scale.setScalar(0.95);
      suppressorGroup.position.set(0, 0.01, -0.78);
      muzzleWorldPos.position.set(0, 0.01, -0.74);
      muzzleFlashGroup.position.set(0, 0.01, -0.72);
      laserOriginWorldPos.position.set(0.026, 0.008, -0.45);
      peqLaserBeam.position.copy(laserOriginWorldPos.position);
      ejectionPortWorldPos.position.set(0.026, 0.018, -0.04);
    } else if (weaponId === 'SNIPER_BOLT') {
      opticsContainer.position.set(0, 0.025, -0.04);
      opticsContainer.scale.setScalar(0.95);
      suppressorGroup.position.set(0, 0.01, -0.78);
      muzzleWorldPos.position.set(0, 0.01, -0.74);
      muzzleFlashGroup.position.set(0, 0.01, -0.72);
      laserOriginWorldPos.position.set(0.026, 0.008, -0.45);
      peqLaserBeam.position.copy(laserOriginWorldPos.position);
      ejectionPortWorldPos.position.set(0.026, 0.018, -0.04);
    } else if (weaponId === 'L49_LMG') {
      opticsContainer.position.set(0, 0.008, -0.04);
      opticsContainer.scale.setScalar(0.88);
      suppressorGroup.position.set(0, 0.009, -0.57);
      muzzleWorldPos.position.set(0, 0.009, -0.62);
      muzzleFlashGroup.position.set(0, 0.009, -0.57);
      laserOriginWorldPos.position.set(0.032, 0.012, -0.36);
      peqLaserBeam.position.copy(laserOriginWorldPos.position);
      ejectionPortWorldPos.position.set(0.028, 0.005, -0.02);
    } else {
      // M4_CARBINE, CARBINE_AR
      opticsContainer.position.set(0, 0.008, 0.01);
      opticsContainer.scale.setScalar(0.92);
      suppressorGroup.position.set(0, -0.002, -0.54);
      muzzleWorldPos.position.set(0, -0.002, -0.52);
      muzzleFlashGroup.position.set(0, -0.002, -0.51);
      laserOriginWorldPos.position.set(0.026, 0.002, -0.32);
      peqLaserBeam.position.copy(laserOriginWorldPos.position);
      ejectionPortWorldPos.position.set(0.024, 0.006, 0.01);
    }

    leftHandGroup.position.copy(leftBasePos);
    leftHandGroup.rotation.copy(leftBaseEuler);
    rightHandGroup.position.copy(rightBasePos);
    rightHandGroup.rotation.copy(rightBaseEuler);
  };

  configureWeaponAnchors('P50_PISTOL');

  const onArmsRigLoaded = (gltf: {
    scene: THREE.Group;
    animations: THREE.AnimationClip[];
  }) => {
    armsRigCtrl = setupFirstPersonArmsRig(
      gltf.scene,
      gltf.animations || [],
      armsRigContainer,
      textures
    );
  };

  gltfLoader.load(
    ARMS_RIG_LOCAL_URL,
    onArmsRigLoaded,
    undefined,
    () => {
      gltfLoader.load(ARMS_RIG_GITHUB_RAW_URL, onArmsRigLoaded);
    }
  );

  // =========================================================================
  // 6. WEAPON SWITCHING & ANIMATION DISPATCHERS FOR ALL 8 WEAPONS
  // =========================================================================
  const setActiveWeapon = (weaponId: WeaponId) => {
    activeWeapon = weaponId;

    (Object.keys(weaponPacks) as WeaponId[]).forEach((id) => {
      weaponPacks[id].mountGroup.visible = id === weaponId;
    });

    const activeEntry = weaponPacks[weaponId];
    m4BodyGroup.visible = weaponId === 'M4_CARBINE' && !activeEntry.loaded;

    // AK-47 and Sniper Tactical use universal rigged FPS arms (arms_rig.glb)
    const usesUniversalArms =
      !activeEntry.loaded ||
      weaponId === 'AK47_RIFLE' ||
      weaponId === 'SNIPER_TACTICAL';
    armsRigContainer.visible = usesUniversalArms;

    weaponMotionAnchor.position.set(0, 0, 0);
    weaponMotionAnchor.quaternion.identity();
    configureWeaponAnchors(weaponId);

    playWeaponPackAction(activeEntry, 'Draw', undefined, 1.15);
  };

  const triggerFireAnimation = (_isAds = false) => {
    const activeEntry = weaponPacks[activeWeapon];
    const speed =
      activeWeapon === 'SNIPER_BOLT'
        ? 1.35
        : activeWeapon === 'SNIPER_TACTICAL'
          ? 1.25
          : 1.3;
    playWeaponPackAction(activeEntry, 'Fire', undefined, speed);
  };

  const triggerReloadAnimation = (durationSec: number) => {
    const activeEntry = weaponPacks[activeWeapon];
    const clipKey = durationSec >= 2.15 ? 'Reload_Empty' : 'Reload';
    playWeaponPackAction(activeEntry, clipKey, durationSec);
  };

  const triggerBoltAnimation = () => {
    const activeEntry = weaponPacks[activeWeapon];
    playWeaponPackAction(activeEntry, 'Draw', 0.75);
  };

  const triggerInspectAnimation = () => {
    const activeEntry = weaponPacks[activeWeapon];
    playWeaponPackAction(activeEntry, 'Draw', 1.35);
  };

  const triggerEquipAnimation = () => {
    const activeEntry = weaponPacks[activeWeapon];
    playWeaponPackAction(activeEntry, 'Draw', 0.9);
  };

  const triggerHolsterAnimation = () => {
    const activeEntry = weaponPacks[activeWeapon];
    playWeaponPackAction(activeEntry, 'Holster', 0.5);
  };

  const setTriggerPull = (pullAlpha: number) => {
    currentTriggerPullAlpha = THREE.MathUtils.clamp(pullAlpha, 0, 1);
  };

  // =========================================================================
  // 7. PER-FRAME WEAPON PACK ANIMATION SYNCHRONIZATION
  // =========================================================================
  const updateGlbAnimations = (
    dt: number,
    _isMoving = false,
    _isAds = false,
    _reloadPhase: ReloadPhase = 'IDLE',
    _reloadProgress = 0
  ) => {
    animElapsed += dt;

    const activeEntry = weaponPacks[activeWeapon];
    if (activeEntry && activeEntry.loaded && activeEntry.mixer) {
      activeEntry.mixer.update(dt);

      if (activeEntry.mainBoneNode && activeEntry.mainBoneRestPos) {
        const b = activeEntry.mainBoneNode;
        const r = activeEntry.mainBoneRestPos;
        const s = activeEntry.mainBoneScale;
        const sign = activeEntry.invertZ ? -1 : 1;
        const targetX = THREE.MathUtils.clamp(sign * (b.position.x - r.x) * s, -0.04, 0.04);
        const targetY = THREE.MathUtils.clamp((b.position.y - r.y) * s, -0.04, 0.04);
        const targetZ = THREE.MathUtils.clamp(sign * (b.position.z - r.z) * s, -0.04, 0.04);
        weaponMotionAnchor.position.x = THREE.MathUtils.damp(
          weaponMotionAnchor.position.x,
          targetX,
          24,
          dt
        );
        weaponMotionAnchor.position.y = THREE.MathUtils.damp(
          weaponMotionAnchor.position.y,
          targetY,
          24,
          dt
        );
        weaponMotionAnchor.position.z = THREE.MathUtils.damp(
          weaponMotionAnchor.position.z,
          targetZ,
          24,
          dt
        );
      } else {
        weaponMotionAnchor.position.set(0, 0, 0);
        weaponMotionAnchor.quaternion.identity();
      }
    } else {
      weaponMotionAnchor.position.set(0, 0, 0);
      weaponMotionAnchor.quaternion.identity();
    }

    root.updateMatrixWorld(true);

    if (armsRigCtrl && armsRigContainer.visible) {
      armsRigCtrl.solveAndPose(
        dt,
        rightHandGroup,
        leftHandGroup,
        rightPoleDir,
        leftPoleDir,
        0.98,
        0.96,
        currentTriggerPullAlpha,
        1.0
      );
    }
  };

  return {
    root,
    gunGroup,
    boltCarrier,
    chargingHandle,
    boltCatch,
    fireSelector,
    triggerMesh,
    magazineGroup,
    topCartridges,
    suppressorGroup,
    flashHiderGroup,
    holoSightGroup,
    holoReticleMesh,
    lpvoScopeGroup,
    lpvoReticleMesh,
    lpvoThrowLever,
    ironSightsGroup,
    cantedSightGroup,
    cantedReticleMesh,
    peqLaserBeam,
    leftHandGroup,
    rightHandGroup,
    rightTriggerFinger,
    setActiveWeapon,
    setTriggerPull,
    triggerFireAnimation,
    triggerReloadAnimation,
    triggerBoltAnimation,
    triggerInspectAnimation,
    triggerEquipAnimation,
    triggerHolsterAnimation,
    updateGlbAnimations,
    muzzleFlashGroup,
    muzzleLight,
    ejectionPortWorldPos,
    muzzleWorldPos,
    laserOriginWorldPos,
  };
}

export function getOpticAdsTransform(
  optic: OpticType,
  cantedActive: boolean,
  activeWeapon: WeaponId = 'P50_PISTOL'
): { pos: THREE.Vector3; rotZ: number } {
  if (cantedActive) {
    return {
      pos: new THREE.Vector3(-0.048, -0.051, -0.22),
      rotZ: Math.PI / 4,
    };
  }
  if (activeWeapon === 'P50_PISTOL') {
    if (optic === 'iron') {
      return {
        pos: new THREE.Vector3(0, -0.066, -0.22),
        rotZ: 0,
      };
    }
    if (optic === 'lpvo') {
      return {
        pos: new THREE.Vector3(0, -0.085, -0.2),
        rotZ: 0,
      };
    }
    return {
      pos: new THREE.Vector3(0, -0.08, -0.21),
      rotZ: 0,
    };
  }
  if (activeWeapon === 'SMG_45') {
    return {
      pos: new THREE.Vector3(-0.012, -0.046, -0.22),
      rotZ: 0,
    };
  }
  if (activeWeapon === 'CARBINE_AR') {
    return {
      pos: new THREE.Vector3(-0.012, -0.048, -0.22),
      rotZ: 0,
    };
  }
  if (activeWeapon === 'AK47_RIFLE') {
    return {
      pos: new THREE.Vector3(0.012, -0.052, -0.23),
      rotZ: 0,
    };
  }
  if (activeWeapon === 'L49_LMG') {
    return {
      pos: new THREE.Vector3(-0.015, -0.048, -0.22),
      rotZ: 0,
    };
  }
  if (activeWeapon === 'SNIPER_BOLT' || activeWeapon === 'SNIPER_TACTICAL') {
    return {
      pos: new THREE.Vector3(0, -0.046, -0.2),
      rotZ: 0,
    };
  }
  if (optic === 'lpvo') {
    return {
      pos: new THREE.Vector3(0, -0.082, -0.22),
      rotZ: 0,
    };
  }
  if (optic === 'iron') {
    return {
      pos: new THREE.Vector3(0, -0.052, -0.24),
      rotZ: 0,
    };
  }
  return {
    pos: new THREE.Vector3(0, -0.078, -0.24),
    rotZ: 0,
  };
}
