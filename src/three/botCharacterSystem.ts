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
  crouchStance: boolean;
}

let templateScene: THREE.Group | null = null;
let sharedClips: BotClipMap | null = null;
let allyMatMap: Map<string, THREE.MeshStandardMaterial> | null = null;
let enemyMatMap: Map<string, THREE.MeshStandardMaterial> | null = null;
let loadPromise: Promise<void> | null = null;

// Shared lightweight geometries & materials for 3rd-person bot rifles (zero per-bot allocation)
let sharedRifleBarrelGeo: THREE.BoxGeometry | null = null;
let sharedRifleReceiverGeo: THREE.BoxGeometry | null = null;
let sharedRifleMagGeo: THREE.BoxGeometry | null = null;
let sharedRifleStockGeo: THREE.BoxGeometry | null = null;
let sharedGunMetalMat: THREE.MeshStandardMaterial | null = null;
let sharedWoodAccentMat: THREE.MeshStandardMaterial | null = null;
let sharedAllyBadgeMat: THREE.MeshBasicMaterial | null = null;
let sharedEnemyBadgeMat: THREE.MeshBasicMaterial | null = null;

function ensureSharedWeaponProps(): void {
  if (sharedRifleReceiverGeo) return;
  sharedRifleReceiverGeo = new THREE.BoxGeometry(0.055, 0.085, 0.34);
  sharedRifleBarrelGeo = new THREE.BoxGeometry(0.026, 0.026, 0.36);
  sharedRifleMagGeo = new THREE.BoxGeometry(0.04, 0.15, 0.065);
  sharedRifleStockGeo = new THREE.BoxGeometry(0.048, 0.095, 0.22);
  sharedGunMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e2430,
    roughness: 0.4,
    metalness: 0.78,
  });
  sharedWoodAccentMat = new THREE.MeshStandardMaterial({
    color: 0x6b4423,
    roughness: 0.65,
    metalness: 0.15,
  });
  sharedAllyBadgeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  sharedEnemyBadgeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
}

function createBotThirdPersonWeaponMesh(
  weaponId: WeaponId | undefined,
  isAlly: boolean
): THREE.Group {
  ensureSharedWeaponProps();
  const group = new THREE.Group();
  group.name = 'BotWorldWeapon';

  const isAk = weaponId === 'AK47_RIFLE';
  const isSniper =
    weaponId === 'SNIPER_BOLT' || weaponId === 'SNIPER_TACTICAL';

  const receiver = new THREE.Mesh(sharedRifleReceiverGeo!, sharedGunMetalMat!);
  receiver.position.set(0, 0, 0.14);
  group.add(receiver);

  const barrel = new THREE.Mesh(sharedRifleBarrelGeo!, sharedGunMetalMat!);
  barrel.position.set(0, 0.015, isSniper ? 0.44 : 0.38);
  if (isSniper) barrel.scale.set(1, 1, 1.35);
  group.add(barrel);

  const mag = new THREE.Mesh(
    sharedRifleMagGeo!,
    isAk ? sharedWoodAccentMat! : sharedGunMetalMat!
  );
  mag.position.set(0, -0.09, 0.18);
  mag.rotation.x = isAk ? 0.24 : 0.08;
  group.add(mag);

  const stock = new THREE.Mesh(
    sharedRifleStockGeo!,
    isAk ? sharedWoodAccentMat! : sharedGunMetalMat!
  );
  stock.position.set(0, -0.015, -0.08);
  group.add(stock);

  // Subtle tactical laser/IFF rail indicator on weapon side
  const iffStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.062, 0.018, 0.12),
    isAlly ? sharedAllyBadgeMat! : sharedEnemyBadgeMat!
  );
  iffStrip.position.set(0, 0.035, 0.22);
  group.add(iffStrip);

  return group;
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

    // Prepare shared team materials (Vanguard Ally vs Blackthorn Enemy) reusing GPU textures
    allyMatMap = new Map();
    enemyMatMap = new Map();

    root.traverse((child) => {
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
        allyMat.color.setHex(0xb8d4f8); // Cool Vanguard slate-blue tactical tint
        allyMat.roughness = 0.62;
        allyMat.metalness = 0.18;
        allyMatMap!.set(std.name, allyMat);

        const enemyMat = std.clone();
        enemyMat.color.setHex(0xd6a49e); // Warm Blackthorn mercenary crimson-ash tint
        enemyMat.roughness = 0.58;
        enemyMat.metalness = 0.22;
        enemyMatMap!.set(std.name, enemyMat);
      });
    });

    // Build and optimize all 8 Pro Rifle Pack clips from the loaded Mixamo skeleton
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
 * to a `YardBotEntity` while keeping invisible bounding hitboxes for 0.01ms raycasting.
 */
export function attachProRifleCharacterToBot(
  bot: YardBotEntity,
  isSoftwareGl: boolean
): void {
  if (!templateScene || !sharedClips || !allyMatMap || !enemyMatMap) return;
  if (bot.root.userData?.botAnimCtrl) return;

  // 1. Convert primitive placeholder boxes into invisible ultra-fast raycast hitboxes
  bot.pivotGroup.children.forEach((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (
      mesh === bot.headMesh ||
      mesh === bot.torsoMesh ||
      mesh === bot.armorMesh
    ) {
      // Keep in scene with visible=true and material.visible=false so Three.js Raycaster hits them!
      mesh.material = new THREE.MeshBasicMaterial({ visible: false });
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    } else {
      // Hide primitive legs and visor boxes
      mesh.visible = false;
    }
  });

  // Align head & torso hitboxes to exact Ch35 skeletal proportions (height 1.79m)
  bot.headMesh.position.set(0, 1.62, 0.04);
  bot.headMesh.scale.set(1.15, 1.15, 1.15);
  bot.torsoMesh.position.set(0, 1.12, 0.02);
  bot.torsoMesh.scale.set(1.08, 1.18, 1.25);

  // 2. Clone the SkinnedMesh hierarchy using SkeletonUtils.clone
  const clonedRoot = SkeletonUtils.clone(templateScene) as THREE.Group;
  clonedRoot.name = `ProRifleModel_${bot.id}`;
  clonedRoot.position.set(0, -bot.pivotGroup.position.y, 0);

  const isAlly = Boolean(bot.isAlly);
  const teamMatLookup = isAlly ? allyMatMap : enemyMatMap;

  clonedRoot.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    mesh.castShadow = !isSoftwareGl;
    mesh.receiveShadow = !isSoftwareGl;
    mesh.frustumCulled = false;

    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map(
        (m) => teamMatLookup.get(m.name) || m
      );
    } else if (mesh.material) {
      mesh.material = teamMatLookup.get(mesh.material.name) || mesh.material;
    }
  });

  // 3. Mount 3D Third-Person Rifle & Tactical IFF Chemlight on Spine2 (chest/hands)
  const spine2Bone = clonedRoot.getObjectByName('mixamorig:Spine2');
  if (spine2Bone) {
    const weaponProp = createBotThirdPersonWeaponMesh(bot.weaponId, isAlly);
    // Spine2 is inside Node0 (scale 0.01), so scale weapon by 100 to match centimeters
    weaponProp.scale.setScalar(100);
    weaponProp.position.set(-3.5, 4.0, 26.0);
    weaponProp.rotation.set(0.08, 0.06, 0);
    spine2Bone.add(weaponProp);
  }

  bot.pivotGroup.add(clonedRoot);

  // 4. Initialize THREE.AnimationMixer and all 8 Pro Rifle Pack AnimationActions
  const mixer = new THREE.AnimationMixer(clonedRoot);
  const actions = {
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

  const crouchStance = bot.patrolAxis === 'NONE' && !isAlly;
  const initialState: BotAnimState = crouchStance
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
    crouchStance,
  };

  bot.root.userData = bot.root.userData || {};
  bot.root.userData.botAnimCtrl = ctrl;
  bot.root.userData.hasSkeletalCharacter = true;
}

function transitionBotAnim(
  ctrl: BotAnimController,
  nextState: BotAnimState,
  fadeSec = 0.18
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

/**
 * Triggers the `RIFLE_FIRE` recoil animation on a bot when it shoots.
 */
export function triggerBotFireAnimation(bot: TacticalTargetEntity): void {
  const ctrl = bot.root.userData?.botAnimCtrl as BotAnimController | undefined;
  if (!ctrl || bot.isDown) return;
  ctrl.fireAnimTimer = 0.26;
  transitionBotAnim(ctrl, 'RIFLE_FIRE', 0.06);
}

/**
 * Triggers the `RIFLE_HIT` ballistic flinch animation on a bot when damaged.
 */
export function triggerBotHitAnimation(bot: TacticalTargetEntity): void {
  const ctrl = bot.root.userData?.botAnimCtrl as BotAnimController | undefined;
  if (!ctrl || bot.isDown) return;
  ctrl.hitReactTimer = 0.32;
  transitionBotAnim(ctrl, 'RIFLE_HIT', 0.05);
}

/**
 * Updates all combat bots' `THREE.AnimationMixer` state machines at 60 FPS
 * with distance-based LOD throttling for mobile performance.
 */
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

    // 1. Handle Death State (Play RIFLE_DEATH once and pause mixer after completion)
    if (t.isDown) {
      t.pivotGroup.rotation.x = 0; // Keep pivot upright so skeletal death animation plays on ground
      if (ctrl.currentState !== 'RIFLE_DEATH') {
        ctrl.deathElapsed = 0;
        transitionBotAnim(ctrl, 'RIFLE_DEATH', 0.12);
      }
      if (ctrl.deathElapsed < 0.95) {
        ctrl.deathElapsed += dt;
        ctrl.mixer.update(dt);
      }
      continue;
    }

    // Reset if respawned in a new round
    if (ctrl.currentState === 'RIFLE_DEATH') {
      ctrl.deathElapsed = 0;
      transitionBotAnim(
        ctrl,
        ctrl.crouchStance ? 'RIFLE_CROUCH' : 'RIFLE_IDLE',
        0.15
      );
    }

    //Keep pivotGroup upright for skeletal bots (wobble handled by RIFLE_HIT animation)
    t.pivotGroup.rotation.x = 0;

    // 2. Compute horizontal speed & patrol facing direction
    const dx = t.root.position.x - ctrl.prevX;
    const dz = t.root.position.z - ctrl.prevZ;
    ctrl.prevX = t.root.position.x;
    ctrl.prevZ = t.root.position.z;
    const speed = dt > 0.0001 ? Math.hypot(dx, dz) / dt : 0;

    if (!t.isTelegraphing && speed > 0.12) {
      const moveYaw = Math.atan2(dx, dz);
      // Smoothly face movement direction when patrolling
      let diff = moveYaw - t.root.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      t.root.rotation.y += diff * Math.min(1, dt * 8);
    }

    // 3. Evaluate Animation State Machine Priority: HIT > FIRE > AIM > RUN > WALK > CROUCH/IDLE
    if (ctrl.hitReactTimer > 0) {
      ctrl.hitReactTimer -= dt;
    } else if (ctrl.fireAnimTimer > 0) {
      ctrl.fireAnimTimer -= dt;
    } else if (t.isTelegraphing) {
      transitionBotAnim(ctrl, 'RIFLE_AIM', 0.15);
    } else if (speed > 2.2) {
      transitionBotAnim(ctrl, 'RIFLE_RUN', 0.18);
    } else if (speed > 0.15) {
      transitionBotAnim(ctrl, 'RIFLE_WALK', 0.2);
    } else {
      transitionBotAnim(
        ctrl,
        ctrl.crouchStance ? 'RIFLE_CROUCH' : 'RIFLE_IDLE',
        0.22
      );
    }

    // 4. Distance-based AnimationMixer LOD (60Hz near player, 30Hz beyond 28m)
    const distSq = t.root.position.distanceToSquared(playerPos);
    if (distSq < 784) {
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
