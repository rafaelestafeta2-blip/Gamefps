import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { WeaponId } from '../types/game';
import {
  BotAnimState,
  BotClipMap,
  buildProRiflePackClips,
} from './botCharacterClips';
import { TacticalTargetEntity } from './levelBuilder';
import { YardBotEntity } from './yardPropsBuilder';

const PRO_RIFLE_LOCAL_URL = '/models/characters/pro_rifle_pack.glb';
const PRO_RIFLE_FALLBACK_URL =
  'https://github.com/rafaelestafeta2-blip/Gamesfps/releases/download/V1/Pro.Rifle.Pack.glb';
const DRACO_DECODER_PATH =
  'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

interface BotAnimController {
  modelRoot: THREE.Object3D;
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

let templateScene: THREE.Group | null = null;
let sharedClips: BotClipMap | null = null;
let allyMatMap: Map<string, THREE.MeshStandardMaterial> | null = null;
let enemyMatMap: Map<string, THREE.MeshStandardMaterial> | null = null;
let loadPromise: Promise<void> | null = null;

import { createBotThirdPersonWeaponMesh } from './botWeaponProps';

let sharedInvisibleHitMat: THREE.MeshBasicMaterial | null = null;

function ensureSharedHitMat(): void {
  if (!sharedInvisibleHitMat) {
    sharedInvisibleHitMat = new THREE.MeshBasicMaterial({ visible: false });
  }
}

/**
 * Preloads `/models/characters/pro_rifle_pack.glb` (with GitHub release fallback),
 * builds the 8 Pro Rifle Pack `THREE.AnimationClip`s, and prepares shared team materials.
 */
export function preloadProRifleBotCharacter(
  loadingManager?: THREE.LoadingManager
): Promise<void> {
  if (templateScene && sharedClips) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const dracoLoader = new DRACOLoader(loadingManager);
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
    dracoLoader.setDecoderConfig({ type: 'js' });

    const loader = new GLTFLoader(loadingManager);
    loader.setDRACOLoader(dracoLoader);

    const loadUrl = (url: string) =>
      new Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>(
        (resolve, reject) => {
          loader.load(
            url,
            (gltf) =>
              resolve({
                scene: gltf.scene,
                animations: gltf.animations || [],
              }),
            undefined,
            (err) => reject(err)
          );
        }
      );

    let loaded: { scene: THREE.Group; animations: THREE.AnimationClip[] };
    try {
      loaded = await loadUrl(PRO_RIFLE_LOCAL_URL);
    } catch {
      loaded = await loadUrl(PRO_RIFLE_FALLBACK_URL);
    } finally {
      dracoLoader.dispose();
    }

    const root = loaded.scene;
    root.updateMatrixWorld(true);

    allyMatMap = new Map();
    enemyMatMap = new Map();

    root.traverse((child) => {
      if (child.name && child.name.startsWith('mixamorig')) {
        child.name = child.name.replace(':', '');
      }
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      mesh.frustumCulled = false;
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

      mats.forEach((m) => {
        const std = m as THREE.MeshStandardMaterial;
        if (!std || allyMatMap!.has(std.name)) return;

        if (std.map) {
          std.map.anisotropy = 4;
          std.map.colorSpace = THREE.SRGBColorSpace;
        }

        const allyMat = std.clone();
        allyMat.color.setHex(0xb8d4f8);
        allyMat.roughness = 0.62;
        allyMat.metalness = 0.18;
        allyMatMap!.set(std.name, allyMat);

        const enemyMat = std.clone();
        enemyMat.color.setHex(0xd6a49e);
        enemyMat.roughness = 0.58;
        enemyMat.metalness = 0.22;
        enemyMatMap!.set(std.name, enemyMat);
      });
    });

    sharedClips = buildProRiflePackClips(root, loaded.animations);
    templateScene = root;
  })().catch((err) => {
    console.warn('Pro.Rifle.Pack.glb load warning:', err);
    loadPromise = null;
  });

  return loadPromise;
}

/**
 * Attaches a cloned `Pro.Rifle.Pack.glb` (`Ch35`) skeletal character and `THREE.AnimationMixer`
 * to a `YardBotEntity` while keeping invisible bounding hitboxes for fast raycasting.
 */
export function attachProRifleCharacterToBot(
  bot: YardBotEntity,
  _isSoftwareGl: boolean
): void {
  if (!templateScene || !sharedClips || !allyMatMap || !enemyMatMap) return;
  if (bot.root.userData?.botAnimCtrl) return;

  ensureSharedHitMat();

  bot.pivotGroup.children.forEach((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh === bot.headMesh || mesh === bot.torsoMesh || mesh === bot.armorMesh) {
      mesh.material = sharedInvisibleHitMat!;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    } else {
      mesh.visible = false;
    }
  });

  bot.headMesh.position.set(0, 1.62, 0.04);
  bot.headMesh.scale.set(1.15, 1.15, 1.15);
  bot.torsoMesh.position.set(0, 1.12, 0.02);
  bot.torsoMesh.scale.set(1.08, 1.18, 1.25);

  const clonedRoot = SkeletonUtils.clone(templateScene) as THREE.Group;
  clonedRoot.name = `ProRifleModel_${bot.id}`;
  clonedRoot.position.set(0, -bot.pivotGroup.position.y, 0);

  const isAlly = Boolean(bot.isAlly);
  const teamMatLookup = isAlly ? allyMatMap : enemyMatMap;

  clonedRoot.traverse((child) => {
    if (child.name && child.name.startsWith('mixamorig')) {
      child.name = child.name.replace(':', '');
    }
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    // Disable expensive per-vertex skinned shadow map passes for 60 FPS mobile stability
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;

    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map(
        (m) => teamMatLookup.get(m.name) || m
      );
    } else if (mesh.material) {
      mesh.material = teamMatLookup.get(mesh.material.name) || mesh.material;
    }
  });

  const spine2Bone =
    clonedRoot.getObjectByName('mixamorigSpine2') ||
    clonedRoot.getObjectByName('mixamorig:Spine2');
  if (spine2Bone) {
    const weaponProp = createBotThirdPersonWeaponMesh(bot.weaponId, isAlly);
    weaponProp.scale.setScalar(100);
    weaponProp.position.set(-1.5, 9.5, 23.5);
    weaponProp.rotation.set(0.08, 0.04, 0);
    spine2Bone.add(weaponProp);
  }

  bot.pivotGroup.add(clonedRoot);

  const mixer = new THREE.AnimationMixer(clonedRoot);
  const actions: Record<BotAnimState, THREE.AnimationAction> = {
    RIFLE_IDLE: mixer.clipAction(sharedClips.RIFLE_IDLE),
    RIFLE_WALK: mixer.clipAction(sharedClips.RIFLE_WALK),
    RIFLE_RUN: mixer.clipAction(sharedClips.RIFLE_RUN),
    RIFLE_AIM: mixer.clipAction(sharedClips.RIFLE_AIM),
    RIFLE_FIRE: mixer.clipAction(sharedClips.RIFLE_FIRE),
    RIFLE_CROUCH: mixer.clipAction(sharedClips.RIFLE_CROUCH),
    RIFLE_HIT: mixer.clipAction(sharedClips.RIFLE_HIT),
    RIFLE_DEATH: mixer.clipAction(sharedClips.RIFLE_DEATH),
  };

  actions.RIFLE_DEATH.setLoop(THREE.LoopOnce, 1);
  actions.RIFLE_DEATH.clampWhenFinished = true;

  const crouchStance =
    bot.patrolAxis === 'NONE' ||
    bot.weaponId === 'SNIPER_BOLT' ||
    bot.weaponId === 'SNIPER_TACTICAL';
  const initialState: BotAnimState =
    bot.patrolAxis !== 'NONE'
      ? 'RIFLE_WALK'
      : crouchStance
        ? 'RIFLE_CROUCH'
        : 'RIFLE_IDLE';
  actions[initialState].play();
  actions[initialState].time = (bot.patrolOffset || 0) * 0.4;
  mixer.update(0.016);

  const ctrl: BotAnimController = {
    modelRoot: clonedRoot,
    mixer,
    actions,
    currentState: initialState,
    prevX: bot.root.position.x,
    prevZ: bot.root.position.z,
    hitReactTimer: 0,
    fireAnimTimer: 0,
    deathElapsed: 0,
    lodAccumDt: 0,
    tacticalTimer: (bot.patrolOffset || 0) * 1.5,
    crouchStance,
  };

  bot.root.userData = bot.root.userData || {};
  bot.root.userData.botAnimCtrl = ctrl;
  bot.root.userData.hasSkeletalCharacter = true;
}

function transitionBotAnim(
  ctrl: BotAnimController,
  nextState: BotAnimState,
  fadeSec = 0.16
): void {
  if (ctrl.currentState === nextState) return;
  const prevAction = ctrl.actions[ctrl.currentState];
  const nextAction = ctrl.actions[nextState];
  if (!nextAction) return;

  nextAction.reset();
  nextAction.setEffectiveTimeScale(1);
  nextAction.setEffectiveWeight(1);
  if (prevAction) {
    prevAction.crossFadeTo(nextAction, fadeSec, false);
  }
  nextAction.play();
  ctrl.currentState = nextState;
}

export function triggerBotFireAnimation(bot: TacticalTargetEntity): void {
  const ctrl = bot.root.userData?.botAnimCtrl as BotAnimController | undefined;
  if (!ctrl || bot.isDown) return;
  ctrl.fireAnimTimer = 0.24;
  transitionBotAnim(ctrl, 'RIFLE_FIRE', 0.05);
}

export function triggerBotHitAnimation(bot: TacticalTargetEntity): void {
  const ctrl = bot.root.userData?.botAnimCtrl as BotAnimController | undefined;
  if (!ctrl || bot.isDown) return;
  ctrl.hitReactTimer = 0.3;
  transitionBotAnim(ctrl, 'RIFLE_HIT', 0.05);
}

export function updateAllBotCharacters(
  targets: TacticalTargetEntity[],
  playerPos: THREE.Vector3,
  dt: number,
  isSoftwareGl: boolean
): void {
  if (!templateScene) {
    void preloadProRifleBotCharacter();
    return;
  }

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i] as YardBotEntity;
    if (t.type !== 'COMBAT_BOT') continue;

    let ctrl = t.root.userData?.botAnimCtrl as BotAnimController | undefined;
    if (!ctrl) {
      attachProRifleCharacterToBot(t, isSoftwareGl);
      ctrl = t.root.userData?.botAnimCtrl as BotAnimController | undefined;
      if (!ctrl) continue;
    }

    ctrl.tacticalTimer += dt;

    if (t.isDown) {
      t.pivotGroup.rotation.x = 0;
      if (ctrl.currentState !== 'RIFLE_DEATH') {
        ctrl.deathElapsed = 0;
        transitionBotAnim(ctrl, 'RIFLE_DEATH', 0.1);
      }
      if (ctrl.deathElapsed < 0.92) {
        ctrl.deathElapsed += dt;
        ctrl.mixer.update(dt);
      }
      continue;
    }

    if (ctrl.currentState === 'RIFLE_DEATH') {
      ctrl.deathElapsed = 0;
      transitionBotAnim(ctrl, ctrl.crouchStance ? 'RIFLE_CROUCH' : 'RIFLE_IDLE', 0.15);
    }

    t.pivotGroup.rotation.x = 0;

    const dx = t.root.position.x - ctrl.prevX;
    const dz = t.root.position.z - ctrl.prevZ;
    ctrl.prevX = t.root.position.x;
    ctrl.prevZ = t.root.position.z;
    const speed = dt > 0.0001 ? Math.hypot(dx, dz) / dt : 0;

    if (!t.isTelegraphing && speed > 0.08) {
      const moveYaw = Math.atan2(dx, dz);
      let diff = moveYaw - t.root.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      t.root.rotation.y += diff * Math.min(1, dt * 9);
    }

    // CS-style tactical crouch-peek decision during combat engagement or angle-holding
    const wantTacticalCrouch =
      ctrl.crouchStance ||
      (t.isTelegraphing && Math.sin(ctrl.tacticalTimer * 1.8) > 0.2) ||
      (speed <= 0.12 && Math.sin(ctrl.tacticalTimer * 0.9) > 0.45);

    if (ctrl.hitReactTimer > 0) {
      ctrl.hitReactTimer -= dt;
    } else if (ctrl.fireAnimTimer > 0) {
      ctrl.fireAnimTimer -= dt;
    } else if (t.isTelegraphing) {
      transitionBotAnim(ctrl, wantTacticalCrouch ? 'RIFLE_CROUCH' : 'RIFLE_AIM', 0.14);
    } else if (speed > 2.0) {
      transitionBotAnim(ctrl, 'RIFLE_RUN', 0.16);
    } else if (speed > 0.08) {
      transitionBotAnim(ctrl, 'RIFLE_WALK', 0.18);
    } else {
      transitionBotAnim(ctrl, wantTacticalCrouch ? 'RIFLE_CROUCH' : 'RIFLE_IDLE', 0.2);
    }

    // Sync head & torso raycast hitboxes with crouched vs standing posture
    const isCrouchedNow = ctrl.currentState === 'RIFLE_CROUCH';
    t.headMesh.position.y = isCrouchedNow ? 1.28 : 1.62;
    t.torsoMesh.position.y = isCrouchedNow ? 0.82 : 1.12;
    if (t.armorMesh) {
      t.armorMesh.position.y = isCrouchedNow ? 0.82 : 1.1;
    }

    const distSq = t.root.position.distanceToSquared(playerPos);
    if (distSq < 900) {
      ctrl.mixer.update(dt);
    } else {
      ctrl.lodAccumDt += dt;
      if (ctrl.lodAccumDt >= 0.033) {
        ctrl.mixer.update(ctrl.lodAccumDt);
        ctrl.lodAccumDt = 0;
      }
    }
  }
}
