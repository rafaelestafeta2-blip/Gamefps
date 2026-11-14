import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OpticType, ReloadPhase, WeaponId } from '../types/game';
import { ProceduralTextures } from './textures';
import { WeaponAttachmentSystem } from './attachmentSystem';
import { createSculptedFirstPersonWeaponGroup } from './sculptedFirearms';

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
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/764ad262156d6371a9fdf172f30267aa431d5b78/Acessorio/Armas/fps_animated_carbine%20(1).glb';
export const M4_FPS_PACK_LOCAL_URL =
  '/models/weapons/fps_animated_carbine_m4.glb';

/**
 * Normalizes the 10,000x unbaked vertex coordinates on `Object_130` (M4A4 body)
 * and `Object_132` (M4A4 magazine) in `animated_fps_m4a4.glb` into bind-world
 * meters aligned with `Base_078` and `Mag_079`.
 */
export function normalizeAnimatedM4A4Model(modelScene: THREE.Object3D): void {
  const pBaseX = -0.07181;
  const pBaseY = 1.46559;
  const pBaseZ = 0.54038;
  const rawPivotX = 705.24015;
  const rawPivotY = -14655.95;
  const rawPivotZ = -5403.81;
  const yaw = Math.atan2(0.03083, 0.17067);
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);

  const seenBuffers = new Set<THREE.BufferAttribute | THREE.InterleavedBufferAttribute>();
  modelScene.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    if (mesh.name !== 'Object_130' && mesh.name !== 'Object_132') return;
    const pos = mesh.geometry?.attributes?.position;
    if (!pos || seenBuffers.has(pos)) return;
    seenBuffers.add(pos);

    const norm = mesh.geometry.attributes.normal;
    let modified = false;
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(pos.getY(i)) < 100) continue;
      const dx = -(pos.getX(i) - rawPivotX) * 0.0001;
      const dy = -(pos.getY(i) - rawPivotY) * 0.0001;
      const dz = -(pos.getZ(i) - rawPivotZ) * 0.0001;
      const rx = dx * cosY + dz * sinY;
      const ry = dy;
      const rz = -dx * sinY + dz * cosY;
      pos.setXYZ(i, pBaseX + rx, pBaseY + ry, pBaseZ + rz);

      if (norm) {
        const ndx = -norm.getX(i);
        const ndy = -norm.getY(i);
        const ndz = -norm.getZ(i);
        const nrx = ndx * cosY + ndz * sinY;
        const nry = ndy;
        const nrz = -ndx * sinY + ndz * cosY;
        const len = Math.hypot(nrx, nry, nrz) || 1;
        norm.setXYZ(i, nrx / len, nry / len, nrz / len);
      }
      modified = true;
    }
    if (modified) {
      pos.needsUpdate = true;
      if (norm) norm.needsUpdate = true;
      // Remove untransformed tangent buffer so Three.js computes accurate derivative tangents for normalMap
      if (mesh.geometry.attributes.tangent) {
        mesh.geometry.deleteAttribute('tangent');
      }
      mesh.geometry.computeBoundingBox();
      mesh.geometry.computeBoundingSphere();
    }
  });
}

export const CARBINE_AR_GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/b0fe43592a9e7ce99b6ea83c9eed5cbb63379323/fps_animated_carbine.glb';
export const CARBINE_AR_LOCAL_URL = '/models/fps_animated_carbine.glb';

export const AK47_RIFLE_GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/b0fe43592a9e7ce99b6ea83c9eed5cbb63379323/fps_character_animation_pack_ak-47.glb';
export const AK47_RIFLE_LOCAL_URL = '/models/fps_ak47.glb';

export const AK12_RIFLE_GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/25e11484b79c388dbcdb49cfa174cc7504beed05/Acessorio/Armas/ak-12animated.glb';
export const AK12_RIFLE_LOCAL_URL = '/models/weapons/ak-12animated.glb';

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

export const KNIFE_GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/cfac55452b306860453fb3785c4c485a322faa8a/knife_animated%20(1).glb';
export const KNIFE_LOCAL_URL = '/models/knife_animated.glb';

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
  armsRigContainer: THREE.Group;
  attachmentSystem: WeaponAttachmentSystem;
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
  // 1B. SCULPTED PBR WEAPONS FOR SHOTGUN_12, SHOTGUN_SPAS & SMG_MP5
  // -------------------------------------------------------------------------
  let shotgun12PumpGroup: THREE.Group | null = null;
  const buildShotgun12Group = (): THREE.Group => {
    const built = createSculptedFirstPersonWeaponGroup('SHOTGUN_12');
    if (built.pumpGroup) {
      built.pumpGroup.userData.baseZ = built.pumpGroup.position.z;
      built.pumpGroup.userData.pullSign = -1;
      shotgun12PumpGroup = built.pumpGroup;
    }
    return built.group;
  };

  const buildShotgunSpasGroup = (): THREE.Group => {
    return createSculptedFirstPersonWeaponGroup('SHOTGUN_SPAS').group;
  };

  const buildSmgMp5Group = (): THREE.Group => {
    return createSculptedFirstPersonWeaponGroup('SMG_MP5').group;
  };

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

  const starFlashMat = new THREE.MeshBasicMaterial({
    map: textures.muzzleFlashStar,
    color: 0xffffff,
    transparent: true,
    opacity: 0.98,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const outerStarMat = new THREE.MeshBasicMaterial({
    map: textures.muzzleFlashStar,
    color: 0xffaa00,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const jetFlameMat = new THREE.MeshBasicMaterial({
    map: textures.muzzleFlashJet,
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  // 1. Primary & Secondary Front Starburst Coronas (No square edges)
  const frontStarPrimary = new THREE.Mesh(
    new THREE.PlaneGeometry(0.19, 0.19),
    starFlashMat
  );
  frontStarPrimary.renderOrder = 18;
  muzzleFlashGroup.add(frontStarPrimary);

  const frontStarSecondary = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.26),
    outerStarMat
  );
  frontStarSecondary.rotation.z = Math.PI / 6;
  frontStarSecondary.position.z = -0.012;
  frontStarSecondary.renderOrder = 17;
  muzzleFlashGroup.add(frontStarSecondary);

  // 2. Axial Cross-Intersecting Supersonic Flame Plumes Shooting Forward (-Z)
  const jetPlaneGeo = new THREE.PlaneGeometry(0.24, 0.11);
  jetPlaneGeo.translate(0.11, 0, 0);
  jetPlaneGeo.rotateY(Math.PI / 2);

  for (let i = 0; i < 3; i++) {
    const axialJet = new THREE.Mesh(jetPlaneGeo, jetFlameMat);
    axialJet.rotation.z = (i * Math.PI) / 3;
    axialJet.renderOrder = 18;
    muzzleFlashGroup.add(axialJet);
  }

  // 3. Side Compensator Port Gas Vents (Left/Right/Top angled supersonic jets)
  const portJetGeo = new THREE.PlaneGeometry(0.13, 0.065);
  portJetGeo.translate(0.06, 0, 0);
  const portAngles = [0, Math.PI, Math.PI / 2];
  for (let p = 0; p < portAngles.length; p++) {
    const portJet = new THREE.Mesh(portJetGeo, jetFlameMat);
    portJet.rotation.z = portAngles[p];
    portJet.rotation.y = -0.35;
    portJet.position.z = -0.008;
    portJet.renderOrder = 18;
    muzzleFlashGroup.add(portJet);
  }

  // 4. Incandescent White-Hot Plasma Core Sphere at Barrel Crown
  const plasmaCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 10, 10),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.96,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  plasmaCore.scale.set(1, 1, 2.2);
  plasmaCore.position.z = -0.025;
  plasmaCore.renderOrder = 19;
  muzzleFlashGroup.add(plasmaCore);

  muzzleFlashGroup.visible = false;
  weaponMotionAnchor.add(muzzleFlashGroup);

  const muzzleLight = new THREE.PointLight(0xffb733, 0, 12, 1.8);
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
  peqLaserBeam.visible = false;
  weaponMotionAnchor.add(peqLaserBeam);

  const attachmentSystem = new WeaponAttachmentSystem(weaponMotionAnchor);

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

  const buildFirefieldLpvoAssembly = (scaleFactor = 1.0) => {
    const scopeGroup = new THREE.Group();
    scopeGroup.scale.setScalar(scaleFactor);

    const matScopeHousing = new THREE.MeshStandardMaterial({
      color: 0x161920,
      metalness: 0.42,
      roughness: 0.44,
      side: THREE.FrontSide,
    });
    const matScopeBezel = new THREE.MeshStandardMaterial({
      color: 0x0e1015,
      metalness: 0.35,
      roughness: 0.52,
      side: THREE.DoubleSide,
    });
    const matScopeMount = new THREE.MeshStandardMaterial({
      color: 0x1c2028,
      metalness: 0.3,
      roughness: 0.62,
    });

    // 1. Wide Ribbed Picatinny Mount Base (visible right below the scope ring in ADS)
    const lowerBridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.012, 0.112),
      matScopeMount
    );
    lowerBridge.position.set(0, 0.006, -0.018);
    scopeGroup.add(lowerBridge);

    const baseWings = new THREE.Mesh(
      new THREE.BoxGeometry(0.056, 0.014, 0.042),
      matScopeMount
    );
    baseWings.position.set(0, 0.011, 0.022);
    scopeGroup.add(baseWings);

    // Sculpted vertical grip ribs on left & right mount shoulders (matches reference photo)
    const ribGeo = new THREE.BoxGeometry(0.0022, 0.015, 0.016);
    [-0.025, -0.021, -0.017, 0.017, 0.021, 0.025].forEach((rx) => {
      const rib = new THREE.Mesh(ribGeo, matScopeHousing);
      rib.position.set(rx, 0.012, 0.034);
      scopeGroup.add(rib);
    });

    // Central clamp block + silver hex screw directly underneath scope ring
    const centerClamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.015, 0.038),
      matScopeHousing
    );
    centerClamp.position.set(0, 0.013, 0.024);
    scopeGroup.add(centerClamp);

    const clampScrew = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0022, 0.0022, 0.004, 12),
      matBoltChrome
    );
    clampScrew.rotation.x = Math.PI / 2;
    clampScrew.position.set(0, 0.013, 0.043);
    scopeGroup.add(clampScrew);

    // Support ring saddles holding the optical tube (open-ended so interior lens stays unobstructed)
    const rearSaddle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0205, 0.0205, 0.022, 24, 1, true),
      matScopeHousing
    );
    rearSaddle.rotation.x = Math.PI / 2;
    rearSaddle.position.set(0, 0.038, 0.012);
    scopeGroup.add(rearSaddle);

    const frontSaddle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0205, 0.0205, 0.02, 24, 1, true),
      matScopeHousing
    );
    frontSaddle.rotation.x = Math.PI / 2;
    frontSaddle.position.set(0, 0.038, -0.056);
    scopeGroup.add(frontSaddle);

    // Side windage & illumination turret knobs visible below ocular ring
    const leftWindage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0075, 0.0075, 0.014, 16),
      matScopeHousing
    );
    leftWindage.rotation.z = Math.PI / 2;
    leftWindage.position.set(-0.023, 0.034, -0.018);
    scopeGroup.add(leftWindage);

    const rightTurret = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0072, 0.0072, 0.013, 16),
      matScopeHousing
    );
    rightTurret.rotation.z = Math.PI / 2;
    rightTurret.position.set(0.022, 0.034, -0.018);
    scopeGroup.add(rightTurret);

    // 2. Forward Exterior Scope Housing (FrontSide only so ADS camera sees cleanly without dark inner tunnel)
    const mainTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0188, 0.0188, 0.112, 32, 1, true),
      matScopeHousing
    );
    mainTube.rotation.x = Math.PI / 2;
    mainTube.position.set(0, 0.038, -0.014);
    scopeGroup.add(mainTube);

    const objBell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0224, 0.0188, 0.044, 32, 1, true),
      matScopeHousing
    );
    objBell.rotation.x = Math.PI / 2;
    objBell.position.set(0, 0.038, -0.092);
    scopeGroup.add(objBell);

    const objLip = new THREE.Mesh(
      new THREE.RingGeometry(0.0195, 0.0224, 32),
      matScopeHousing
    );
    objLip.rotation.y = Math.PI;
    objLip.position.set(0, 0.038, -0.114);
    scopeGroup.add(objLip);

    // 3. Scalloped Rear Ocular Ring & Throw Lever (occupies ~47% screen center in ADS)
    const ocularOuterSleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0216, 0.0196, 0.028, 36, 1, true),
      matScopeHousing
    );
    ocularOuterSleeve.rotation.x = Math.PI / 2;
    ocularOuterSleeve.position.set(0, 0.038, 0.054);
    scopeGroup.add(ocularOuterSleeve);

    // Short 1.6cm beveled inner ocular hood
    const ocularInnerHood = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0192, 0.0176, 0.016, 40, 1, true),
      matScopeBezel
    );
    ocularInnerHood.rotation.x = Math.PI / 2;
    ocularInnerHood.position.set(0, 0.038, 0.06);
    scopeGroup.add(ocularInnerHood);

    // Rear crisp scalloped bezel face
    const ocularBackBezel = new THREE.Mesh(
      new THREE.RingGeometry(0.0174, 0.0217, 48),
      matScopeBezel
    );
    ocularBackBezel.position.set(0, 0.038, 0.068);
    scopeGroup.add(ocularBackBezel);

    // 18 scalloped grip flutes around ocular ring circumference
    const fluteGeo = new THREE.CylinderGeometry(0.0019, 0.0019, 0.024, 8);
    fluteGeo.rotateX(Math.PI / 2);
    for (let f = 0; f < 18; f++) {
      const ang = (f * Math.PI * 2) / 18;
      const flute = new THREE.Mesh(fluteGeo, matScopeBezel);
      flute.position.set(
        Math.cos(ang) * 0.0213,
        0.038 + Math.sin(ang) * 0.0213,
        0.056
      );
      scopeGroup.add(flute);
    }

    // Magnification Throw Lever sticking out at ~2 o'clock on the right side
    const throwLever = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0018, 0.0026, 0.009, 10),
      matScopeBezel
    );
    throwLever.position.set(0.0242, 0.0445, 0.056);
    throwLever.rotation.z = -1.25;
    scopeGroup.add(throwLever);

    // 4. Coated Optical Glass & Centered Firefield Mil-Dot Reticle
    const glassLens = new THREE.Mesh(
      new THREE.CircleGeometry(0.0175, 40),
      new THREE.MeshPhysicalMaterial({
        color: 0xdbeafe,
        metalness: 0.08,
        roughness: 0.05,
        transparent: true,
        opacity: 0.07,
        depthWrite: false,
      })
    );
    glassLens.position.set(0, 0.038, 0.0655);
    glassLens.renderOrder = 10;
    scopeGroup.add(glassLens);

    const reticleMesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.0176, 48),
      new THREE.MeshBasicMaterial({
        map: textures.lpvoReticle,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    reticleMesh.position.set(0, 0.038, 0.0665);
    reticleMesh.renderOrder = 14;
    scopeGroup.add(reticleMesh);

    return { scopeGroup, throwLever, reticleMesh };
  };

  const lpvoBuilt = buildFirefieldLpvoAssembly(1.0);
  const lpvoScopeGroup = lpvoBuilt.scopeGroup;
  lpvoScopeGroup.position.set(0, 0.008, 0.025);
  const lpvoThrowLever = lpvoBuilt.throwLever;
  const lpvoReticleMesh = lpvoBuilt.reticleMesh;
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
    builtInOpticNodes: THREE.Object3D[];
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
      builtInOpticNodes: [],
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
        if (
          opts.weaponId === 'M4_CARBINE' &&
          (child.name === 'scope' ||
            child.name === 'scope_carbine_0' ||
            child.name === 'lens' ||
            child.name === 'lens_lens_0')
        ) {
          entry.builtInOpticNodes.push(child);
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
            const matName = (std.name || '').toLowerCase();
            if (
              opts.weaponId === 'M4_CARBINE' &&
              (matName === 'lens' || m.name.toLowerCase().includes('lens_lens'))
            ) {
              std.transparent = true;
              std.opacity = 1.0;
              std.depthWrite = false;
              m.renderOrder = 12;
            } else if (
              opts.weaponId === 'AK12_RIFLE' &&
              (matName.includes('lense') || m.name.toLowerCase().includes('lense'))
            ) {
              std.map = null;
              std.transparent = true;
              std.opacity = 0.06;
              std.roughness = 0.04;
              std.metalness = 0.12;
              if (std.color) std.color.setHex(0xdbeafe);
              std.depthWrite = false;
              m.renderOrder = 10;
            } else if (
              matName.includes('lense') ||
              matName.includes('lens') ||
              m.name.toLowerCase().includes('lense')
            ) {
              std.transparent = true;
              std.opacity = 0.14;
              std.roughness = 0.05;
              std.metalness = 0.1;
              if (std.color) std.color.setHex(0x88ccff);
              std.depthWrite = false;
            }
            std.needsUpdate = true;
          };
          if (Array.isArray(m.material)) {
            m.material.forEach(fixMat);
          } else if (m.material) {
            fixMat(m.material);
          }

          // Place crisp centered reticle directly inside AK-12's own original scope lens (no extra scope housing)
          if (
            opts.weaponId === 'AK12_RIFLE' &&
            m.name.toLowerCase().includes('rail') &&
            !m.userData.ak12ReticleMounted
          ) {
            m.userData.ak12ReticleMounted = true;
            const skMesh = m as THREE.SkinnedMesh;
            if (skMesh.isSkinnedMesh && skMesh.skeleton) {
              const bone = skMesh.skeleton.bones[66];
              if (bone) {
                mountGroup.add(modelScene);
                gunGroup.updateMatrixWorld(true);
                bone.updateMatrixWorld(true);

                // Exact rear ocular lens plane of AK-12's native aim_0 / lense_0 in gunGroup space
                const desiredGunMat = gunGroup.matrixWorld
                  .clone()
                  .multiply(new THREE.Matrix4().makeTranslation(-0.0004, 0.052, 0.0835));
                const invBone = bone.matrixWorld.clone().invert();
                const localMat = new THREE.Matrix4().multiplyMatrices(invBone, desiredGunMat);
                const akReticle = new THREE.Mesh(
                  new THREE.CircleGeometry(0.0112, 48),
                  new THREE.MeshBasicMaterial({
                    map: textures.lpvoReticle,
                    transparent: true,
                    depthWrite: false,
                    side: THREE.DoubleSide,
                  })
                );
                akReticle.renderOrder = 14;
                localMat.decompose(akReticle.position, akReticle.quaternion, akReticle.scale);
                bone.add(akReticle);
              }
            }
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

  const createProceduralWeaponEntry = (
    weaponId: WeaponId,
    buildMeshFn: () => THREE.Group
  ): AnimatedWeaponPackEntry => {
    const mountGroup = new THREE.Group();
    const body = buildMeshFn();
    mountGroup.add(body);
    mountGroup.visible = activeWeapon === weaponId;
    weaponMotionAnchor.add(mountGroup);
    return {
      weaponId,
      localUrl: '',
      githubUrl: '',
      mountGroup,
      loaded: true,
      mixer: null,
      actions: {},
      mainBoneNode: null,
      mainBoneRestPos: null,
      mainBoneScale: 1,
      invertZ: false,
      builtInOpticNodes: [],
    };
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

    // [2B] MP5A3 Tactical 9mm (Engineer SMG)
    SMG_MP5: createProceduralWeaponEntry('SMG_MP5', buildSmgMp5Group),

    // [2C] M870 Breacher 12-Gauge Pump Shotgun (Medic Primary)
    SHOTGUN_12: createProceduralWeaponEntry('SHOTGUN_12', buildShotgun12Group),

    // [2D] SPAS-12 Combat 12-Gauge Shotgun (Medic Semi-Auto)
    SHOTGUN_SPAS: createProceduralWeaponEntry('SHOTGUN_SPAS', buildShotgunSpasGroup),

    // [3] M4A1 Tactical Carbine (`fps_animated_carbine_m4.glb` — 2K PBR textures & clean rig)
    M4_CARBINE: createAnimatedWeaponEntry({
      weaponId: 'M4_CARBINE',
      localUrl: M4_FPS_PACK_LOCAL_URL,
      githubUrl: M4_FPS_PACK_GITHUB_RAW_URL,
      scale: 0.58,
      rotY: Math.PI,
      pos: [-0.015, -0.228, 0.105],
      mainBoneName: 'carbine',
      mainBoneScale: 0.012,
      subclipWindows: {
        Fire: [0.0, 0.26],
        Reload_Empty: [0.33, 2.27],
        Reload: [2.33, 4.47],
        Draw: [4.53, 5.9],
        Holster: [6.87, 7.4],
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

    // [5] AK-47 Comando (`fps_ak47.glb`) — Camera positioned close (Z = 0.485) and higher above the receiver (Y = -1.525)
    AK47_RIFLE: createAnimatedWeaponEntry({
      weaponId: 'AK47_RIFLE',
      localUrl: AK47_RIFLE_LOCAL_URL,
      githubUrl: AK47_RIFLE_GITHUB_RAW_URL,
      scale: 1.0,
      rotY: Math.PI,
      pos: [-0.142, -1.525, 0.485],
      mainBoneName: 'SKEL_AK_47_Rifle',
      mainBoneScale: 0.01,
      clipAliases: {
        Draw: 'RIG_UE5_Comando_AK_Equip',
        Fire: 'RIG_UE5_Comando_AK_Fire',
        Reload: 'RIG_UE5_Comando_AK_Reload',
        Reload_Empty: 'RIG_UE5_Comando_AK_Reload',
        Holster: 'RIG_UE5_Comando_AK_Equip',
      },
    }),

    // [5B] AK-12 Spetsnaz (`ak-12animated.glb`) — Animated FPS AK-12 with tactical hands, watch & optical sight
    AK12_RIFLE: createAnimatedWeaponEntry({
      weaponId: 'AK12_RIFLE',
      localUrl: AK12_RIFLE_LOCAL_URL,
      githubUrl: AK12_RIFLE_GITHUB_RAW_URL,
      scale: 0.4,
      rotY: Math.PI,
      pos: [-0.1414, -1.6094, 0.326],
      mainBoneName: 'Rifle_metarig',
      mainBoneScale: 0.01,
      hideNodeNames: [
        'mag.001',
        'mag.001_0',
        'bullets',
        'bullets_0',
      ],
      clipAliases: {
        Draw: 'Equip',
        Fire: 'Shoot',
        Reload: 'Reload',
        Reload_Empty: 'Reload',
        Holster: 'Equip',
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
        Fire: [16.0, 18.25],
        Reload_Empty: [20.8, 26.2],
        Holster: [5.8, 6.8],
      },
    }),

    // [9] Combat Tactical Knife (`knife_animated.glb`) — Built-in animated hands & slash/draw
    KNIFE_TACTICAL: createAnimatedWeaponEntry({
      weaponId: 'KNIFE_TACTICAL',
      localUrl: KNIFE_LOCAL_URL,
      githubUrl: KNIFE_GITHUB_RAW_URL,
      scale: 0.01,
      rotY: Math.PI,
      pos: [-0.012, -0.092, 0.055],
      mainBoneName: 'knife',
      mainBoneScale: 0.01,
      subclipWindows: {
        Idle: [0.0, 1.33],
        Fire: [1.33, 2.0],
        Reload: [2.67, 4.13],
        Reload_Empty: [2.67, 4.13],
        Draw: [4.2, 4.83],
        Holster: [4.2, 4.53],
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
    } else if (weaponId === 'SMG_MP5') {
      rightBasePos.set(0.022, -0.052, 0.075);
      rightBaseEuler.set(-1.62, -0.08, 0.1);
      leftBasePos.set(-0.024, -0.026, -0.21);
      leftBaseEuler.set(-1.42, 0.22, -0.24);

      opticsContainer.position.set(0, 0.036, -0.01);
      opticsContainer.scale.setScalar(0.78);
      suppressorGroup.position.set(0, 0.014, -0.41);
      muzzleWorldPos.position.set(0, 0.014, -0.385);
      muzzleFlashGroup.position.set(0, 0.014, -0.38);
      laserOriginWorldPos.position.set(0.02, 0.004, -0.23);
      peqLaserBeam.position.copy(laserOriginWorldPos.position);
      ejectionPortWorldPos.position.set(0.022, 0.014, -0.03);
    } else if (weaponId === 'SHOTGUN_12' || weaponId === 'SHOTGUN_SPAS') {
      rightBasePos.set(0.022, -0.056, 0.115);
      rightBaseEuler.set(-1.62, -0.08, 0.1);
      leftBasePos.set(-0.026, -0.032, -0.24);
      leftBaseEuler.set(-1.42, 0.22, -0.24);

      opticsContainer.position.set(0, 0.039, 0.01);
      opticsContainer.scale.setScalar(0.84);
      suppressorGroup.position.set(0, 0.012, -0.60);
      muzzleWorldPos.position.set(0, 0.012, -0.57);
      muzzleFlashGroup.position.set(0, 0.012, -0.55);
      laserOriginWorldPos.position.set(0.024, -0.014, -0.42);
      peqLaserBeam.position.copy(laserOriginWorldPos.position);
      ejectionPortWorldPos.position.set(0.026, 0.01, -0.01);
    } else if (weaponId === 'AK47_RIFLE') {
      rightBasePos.set(0.022, -0.054, 0.086);
      rightBaseEuler.set(-1.62, -0.08, 0.1);
      leftBasePos.set(-0.025, -0.042, -0.18);
      leftBaseEuler.set(-1.42, 0.22, -0.26);

      opticsContainer.position.set(-0.012, 0.042, 0.15);
      opticsContainer.scale.setScalar(0.92);
      suppressorGroup.position.set(-0.012, 0.038, -0.38);
      muzzleWorldPos.position.set(-0.012, 0.038, -0.36);
      muzzleFlashGroup.position.set(-0.012, 0.038, -0.35);
      laserOriginWorldPos.position.set(0.014, 0.035, -0.18);
      peqLaserBeam.position.copy(laserOriginWorldPos.position);
      ejectionPortWorldPos.position.set(0.018, 0.04, 0.16);
    } else if (weaponId === 'AK12_RIFLE') {
      opticsContainer.position.set(0, 0.024, 0.04);
      opticsContainer.scale.setScalar(0.88);
      suppressorGroup.position.set(0, 0.01, -0.48);
      muzzleWorldPos.position.set(0, 0.01, -0.464);
      muzzleFlashGroup.position.set(0, 0.01, -0.455);
      laserOriginWorldPos.position.set(0.022, 0.01, -0.24);
      peqLaserBeam.position.copy(laserOriginWorldPos.position);
      ejectionPortWorldPos.position.set(0.022, 0.012, 0.056);
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
    } else if (weaponId === 'M4_CARBINE') {
      opticsContainer.position.set(-0.015, -0.001, 0.025);
      opticsContainer.scale.setScalar(0.95);
      suppressorGroup.position.set(-0.015, -0.044, -0.75);
      muzzleWorldPos.position.set(-0.015, -0.044, -0.699);
      muzzleFlashGroup.position.set(-0.015, -0.044, -0.694);
      laserOriginWorldPos.position.set(0.014, -0.042, -0.34);
      peqLaserBeam.position.copy(laserOriginWorldPos.position);
      ejectionPortWorldPos.position.set(0.025, -0.044, -0.06);
    } else {
      // CARBINE_AR
      opticsContainer.position.set(0, 0.018, -0.02);
      opticsContainer.scale.setScalar(0.9);
      suppressorGroup.position.set(0, -0.002, -0.54);
      muzzleWorldPos.position.set(0, -0.002, -0.52);
      muzzleFlashGroup.position.set(0, -0.002, -0.51);
      laserOriginWorldPos.position.set(0.026, 0.002, -0.32);
      peqLaserBeam.position.copy(laserOriginWorldPos.position);
      ejectionPortWorldPos.position.set(0.024, 0.006, 0.01);
    }

    opticsContainer.visible =
      weaponId !== 'AK12_RIFLE' && weaponId !== 'KNIFE_TACTICAL';
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

    // Only Sniper Tactical (or unloaded fallback) uses universal rigged FPS arms (arms_rig.glb);
    // AK-47 uses its own native rigged hands & sleeves baked into fps_ak47.glb
    const usesUniversalArms =
      !activeEntry.loaded ||
      weaponId === 'SNIPER_TACTICAL' ||
      weaponId === 'SHOTGUN_12' ||
      weaponId === 'SHOTGUN_SPAS' ||
      weaponId === 'SMG_MP5';
    armsRigContainer.visible = usesUniversalArms;

    weaponMotionAnchor.position.set(0, 0, 0);
    weaponMotionAnchor.quaternion.identity();
    configureWeaponAnchors(weaponId);
    attachmentSystem.updateWeaponAlignment(weaponId);

    playWeaponPackAction(activeEntry, 'Draw', undefined, 1.15);
  };

  let sniperBoltHandTimer = 0;
  let shotgunPumpTimer = 0;

  const triggerFireAnimation = (isAds = false) => {
    const activeEntry = weaponPacks[activeWeapon];
    const speed =
      activeWeapon === 'SNIPER_BOLT'
        ? 1.45
        : activeWeapon === 'SNIPER_TACTICAL'
          ? 1.85
          : 1.3;
    if (activeWeapon === 'SNIPER_TACTICAL') {
      sniperBoltHandTimer = 1.08;
    }
    if (activeWeapon === 'SHOTGUN_12') {
      shotgunPumpTimer = 0.56;
    }
    // Prefer Aim_Fire clip on AK-47 when ADS (clip already in pack).
    if (
      activeWeapon === 'AK47_RIFLE' &&
      isAds &&
      activeEntry?.actions['RIG_UE5_Comando_AK_Aim_Fire']
    ) {
      activeEntry.actions['Fire'] = activeEntry.actions['RIG_UE5_Comando_AK_Aim_Fire'];
    } else if (
      activeWeapon === 'AK47_RIFLE' &&
      activeEntry?.actions['RIG_UE5_Comando_AK_Fire']
    ) {
      activeEntry.actions['Fire'] = activeEntry.actions['RIG_UE5_Comando_AK_Fire'];
    }
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
    isMoving = false,
    isAds = false,
    reloadPhase: ReloadPhase = 'IDLE',
    _reloadProgress = 0
  ) => {
    animElapsed += dt;

    const activeEntry = weaponPacks[activeWeapon];
    if (
      activeWeapon === 'M4_CARBINE' &&
      activeEntry &&
      activeEntry.builtInOpticNodes.length > 0
    ) {
      const showBuiltIn = !holoSightGroup.visible && !lpvoScopeGroup.visible;
      for (let i = 0; i < activeEntry.builtInOpticNodes.length; i++) {
        activeEntry.builtInOpticNodes[i].visible = showBuiltIn;
      }
    }
    if (activeEntry && activeEntry.loaded && activeEntry.mixer) {
      // AK-47 pack includes Walk / Run / Idle_Aim — play looping locomotion when idle of oneshots.
      if (activeWeapon === 'AK47_RIFLE' && reloadPhase === 'IDLE') {
        const busy =
          activeEntry.actions['Fire']?.isRunning() ||
          activeEntry.actions['Reload']?.isRunning() ||
          activeEntry.actions['Draw']?.isRunning();
        if (!busy) {
          const walk = activeEntry.actions['RIG_UE5_Comando_AK_Walk'];
          const walkAim = activeEntry.actions['RIG_UE5_Comando_AK_Walk_Aim'];
          const run = activeEntry.actions['RIG_UE5_Comando_AK__Run'];
          const idle = activeEntry.actions['RIG_UE5_Comando_AK_Idle'];
          const idleAim = activeEntry.actions['RIG_UE5_Comando_AK_Idle_Aim'];
          let loco: THREE.AnimationAction | undefined;
          if (isMoving && isAds) loco = walkAim || walk;
          else if (isMoving) loco = run || walk;
          else if (isAds) loco = idleAim || idle;
          else loco = idle;
          if (loco) {
            Object.entries(activeEntry.actions).forEach(([, act]) => {
              if (act !== loco && act.isRunning() && act.loop !== THREE.LoopRepeat) {
                // oneshots own the mixer — leave them
              } else if (act !== loco && act.loop === THREE.LoopRepeat) {
                act.weight = 0;
                act.stop();
              }
            });
            if (!loco.isRunning() || loco.loop !== THREE.LoopRepeat) {
              loco.setLoop(THREE.LoopRepeat, Infinity);
              loco.clampWhenFinished = false;
              loco.weight = 1;
              loco.reset();
              loco.play();
            } else {
              loco.weight = 1;
            }
            loco.timeScale = isMoving ? (isAds ? 0.95 : 1.15) : 1.0;
          }
        }
      }

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

    if (shotgun12PumpGroup) {
      const baseZ: number = shotgun12PumpGroup.userData?.baseZ ?? -0.25;
      const pullSign: number = shotgun12PumpGroup.userData?.pullSign ?? 1;
      if (activeWeapon === 'SHOTGUN_12' && shotgunPumpTimer > 0) {
        shotgunPumpTimer = Math.max(0, shotgunPumpTimer - dt);
        const p = 1 - shotgunPumpTimer / 0.56;
        // Crisp backward-then-forward 12ga pump rack stroke
        const stroke =
          p < 0.25
            ? 0
            : p < 0.58
              ? (p - 0.25) / 0.33
              : p < 0.88
                ? 1 - (p - 0.58) / 0.3
                : 0;
        const pumpBackZ = stroke * 0.085;
        shotgun12PumpGroup.position.z = baseZ + pullSign * pumpBackZ;
        leftHandGroup.position.set(
          leftBasePos.x,
          leftBasePos.y,
          leftBasePos.z + pumpBackZ
        );
      } else {
        shotgun12PumpGroup.position.z = baseZ;
        leftHandGroup.position.copy(leftBasePos);
      }
    }

    if (armsRigCtrl && armsRigContainer.visible) {
      if (activeWeapon === 'SNIPER_TACTICAL' && sniperBoltHandTimer > 0) {
        sniperBoltHandTimer = Math.max(0, sniperBoltHandTimer - dt);
        const p = 1 - sniperBoltHandTimer / 1.08;
        // Animate Right Hand reaching up to bolt handle, pulling back, pushing forward, and returning to grip
        let dy = 0;
        let dz = 0;
        let dx = 0;
        if (p > 0.12 && p < 0.88) {
          const bp = (p - 0.12) / 0.76;
          if (bp < 0.28) {
            const a = bp / 0.28;
            dy = 0.068 * a;
            dz = -0.055 * a;
            dx = 0.018 * a;
          } else if (bp < 0.58) {
            const a = (bp - 0.28) / 0.3;
            dy = 0.068 + 0.012 * Math.sin(a * Math.PI);
            dz = -0.055 + 0.095 * a;
            dx = 0.018 + 0.012 * a;
          } else if (bp < 0.82) {
            const a = (bp - 0.58) / 0.24;
            dy = 0.068 * (1 - a * 0.25);
            dz = 0.04 - 0.095 * a;
            dx = 0.03 * (1 - a * 0.4);
          } else {
            const a = (bp - 0.82) / 0.18;
            dy = 0.051 * (1 - a);
            dz = -0.055 * (1 - a);
            dx = 0.018 * (1 - a);
          }
        }
        rightHandGroup.position.set(
          rightBasePos.x + dx,
          rightBasePos.y + dy,
          rightBasePos.z + dz
        );
      } else {
        rightHandGroup.position.copy(rightBasePos);
      }

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
    armsRigContainer,
    attachmentSystem,
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
  if (activeWeapon === 'AK12_RIFLE') {
    // Realistic Eye Relief on AK-12's native scope: centered at (-0.0004, 0.0520), rear bezel ~12.8cm -> ~48% screen
    return {
      pos: new THREE.Vector3(0.0004, -0.052, -0.22),
      rotZ: 0,
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
        pos: new THREE.Vector3(0, -0.0455, -0.154),
        rotZ: 0,
      };
    }
    return {
      pos: new THREE.Vector3(0, -0.05, -0.21),
      rotZ: 0,
    };
  }
  if (activeWeapon === 'SMG_45') {
    if (optic === 'lpvo') {
      return {
        pos: new THREE.Vector3(0, -0.0617, -0.148),
        rotZ: 0,
      };
    }
    return {
      pos: new THREE.Vector3(-0.012, -0.054, -0.22),
      rotZ: 0,
    };
  }
  if (activeWeapon === 'SMG_MP5') {
    if (optic === 'lpvo') {
      return {
        pos: new THREE.Vector3(0, -0.066, -0.16),
        rotZ: 0,
      };
    }
    return {
      pos: new THREE.Vector3(0, -0.04, -0.22),
      rotZ: 0,
    };
  }
  if (activeWeapon === 'SHOTGUN_12' || activeWeapon === 'SHOTGUN_SPAS') {
    if (optic === 'lpvo') {
      return {
        pos: new THREE.Vector3(0, -0.068, -0.155),
        rotZ: 0,
      };
    }
    if (optic === 'holo') {
      return {
        pos: new THREE.Vector3(0, -0.072, -0.2),
        rotZ: 0,
      };
    }
    return {
      pos: new THREE.Vector3(0, -0.046, -0.215),
      rotZ: 0,
    };
  }
  if (activeWeapon === 'CARBINE_AR') {
    if (optic === 'lpvo') {
      return {
        pos: new THREE.Vector3(0, -0.0594, -0.165),
        rotZ: 0,
      };
    }
    return {
      pos: new THREE.Vector3(-0.012, -0.052, -0.22),
      rotZ: 0,
    };
  }
  if (activeWeapon === 'AK47_RIFLE') {
    if (optic === 'lpvo') {
      return {
        pos: new THREE.Vector3(0.012, -0.0843, -0.338),
        rotZ: 0,
      };
    }
    return {
      pos: new THREE.Vector3(0.012, 0.001, -0.34),
      rotZ: 0,
    };
  }
  if (activeWeapon === 'M4_CARBINE') {
    if (optic === 'lpvo') {
      return {
        pos: new THREE.Vector3(0.015, -0.0427, -0.23),
        rotZ: 0,
      };
    }
    if (optic === 'holo') {
      return {
        pos: new THREE.Vector3(0.015, -0.0674, -0.24),
        rotZ: 0,
      };
    }
    return {
      pos: new THREE.Vector3(0.015, -0.0382, -0.235),
      rotZ: 0,
    };
  }
  if (activeWeapon === 'L49_LMG') {
    if (optic === 'lpvo') {
      return {
        pos: new THREE.Vector3(0, -0.0485, -0.16),
        rotZ: 0,
      };
    }
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
  if (activeWeapon === 'KNIFE_TACTICAL') {
    return {
      pos: new THREE.Vector3(0, -0.02, -0.06),
      rotZ: 0,
    };
  }
  if (optic === 'lpvo') {
    return {
      pos: new THREE.Vector3(0, -0.056, -0.18),
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
    pos: new THREE.Vector3(0, -0.06, -0.22),
    rotZ: 0,
  };
}
