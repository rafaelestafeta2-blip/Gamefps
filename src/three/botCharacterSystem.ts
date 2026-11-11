import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { WeaponId } from '../types/game';
import { BotAnimController, BotAnimState, BotClipMap, buildProRiflePackClips, syncBotWeaponWithMixamoHands } from './botCharacterClips';
import { createBotThirdPersonWeaponMesh } from './botWeaponProps';
import { TacticalTargetEntity } from './levelBuilder';
import { YardBotEntity } from './yardPropsBuilder';

const PRO_RIFLE_LOCAL_URL = '/models/characters/pro_rifle_pack.glb';
const PRO_RIFLE_FALLBACK_URL = 'https://github.com/rafaelestafeta2-blip/Gamesfps/releases/download/V1/Pro.Rifle.Pack.glb';
const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

let templateScene: THREE.Group | null = null;
let sharedClips: BotClipMap | null = null;
let allyMatMap: Map<string, THREE.MeshStandardMaterial> | null = null;
let enemyMatMap: Map<string, THREE.MeshStandardMaterial> | null = null;
let loadPromise: Promise<void> | null = null;
let sharedInvisibleHitMat: THREE.MeshBasicMaterial | null = null;

function ensureSharedHitMat(): void {
  if (!sharedInvisibleHitMat) sharedInvisibleHitMat = new THREE.MeshBasicMaterial({ visible: false });
}

export function preloadProRifleBotCharacter(loadingManager?: THREE.LoadingManager): Promise<void> {
  if (templateScene && sharedClips) return Promise.resolve();
  if (loadPromise) return Promise.resolve(loadPromise);

  loadPromise = (async () => {
    const dracoLoader = new DRACOLoader(loadingManager);
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
    dracoLoader.setDecoderConfig({ type: 'js' });
    const loader = new GLTFLoader(loadingManager);
    loader.setDRACOLoader(dracoLoader);

    const loadUrl = (url: string) =>
      new Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>((resolve, reject) => {
        loader.load(url, (gltf) => resolve({ scene: gltf.scene, animations: gltf.animations || [] }), undefined, reject);
      });

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
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

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

  bot.headMesh.position.set(0, 1.56, 0.04);
  bot.headMesh.scale.set(1.15, 1.15, 1.15);
  bot.torsoMesh.position.set(0, 1.1, 0.02);
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
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;

    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((m) => teamMatLookup.get(m.name) || m);
    } else if (mesh.material) {
      mesh.material = teamMatLookup.get(mesh.material.name) || mesh.material;
    }
  });

  const rHandBone = clonedRoot.getObjectByName('mixamorigRightHand') || null;
  const lHandBone = clonedRoot.getObjectByName('mixamorigLeftHand') || null;

  const weaponProp = createBotThirdPersonWeaponMesh(bot.weaponId as WeaponId, isAlly);
  weaponProp.position.set(-0.08, 1.28, 0.16);
  weaponProp.rotation.set(0.02, 0.04, 0);
  bot.pivotGroup.add(weaponProp);
  bot.pivotGroup.add(clonedRoot);

  const mixer = new THREE.AnimationMixer(clonedRoot);
  const actions: Record<BotAnimState, THREE.AnimationAction> = {
    RIFLE_IDLE: mixer.clipAction(sharedClips.RIFLE_IDLE),
    RIFLE_WALK: mixer.clipAction(sharedClips.RIFLE_WALK),
    RIFLE_RUN: mixer.clipAction(sharedClips.RIFLE_RUN),
    RIFLE_AIM: mixer.clipAction(sharedClips.RIFLE_AIM),
    RIFLE_FIRE: mixer.clipAction(sharedClips.RIFLE_FIRE),
    RIFLE_CROUCH: mixer.clipAction(sharedClips.RIFLE_CROUCH),
    RIFLE_CROUCH_WALK: mixer.clipAction(sharedClips.RIFLE_CROUCH_WALK),
    RIFLE_HIT: mixer.clipAction(sharedClips.RIFLE_HIT),
    RIFLE_DEATH: mixer.clipAction(sharedClips.RIFLE_DEATH),
    RIFLE_DEATH_HEADSHOT: mixer.clipAction(sharedClips.RIFLE_DEATH_HEADSHOT),
  };

  actions.RIFLE_DEATH.setLoop(THREE.LoopOnce, 1);
  actions.RIFLE_DEATH.clampWhenFinished = true;
  actions.RIFLE_DEATH_HEADSHOT.setLoop(THREE.LoopOnce, 1);
  actions.RIFLE_DEATH_HEADSHOT.clampWhenFinished = true;

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
    weaponProp,
    rHandBone,
    lHandBone,
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
  if (prevAction) prevAction.crossFadeTo(nextAction, fadeSec, false);
  nextAction.play();
  ctrl.currentState = nextState;
}

export function triggerBotFireAnimation(bot: TacticalTargetEntity): void {
  const ctrl = bot.root.userData?.botAnimCtrl as BotAnimController | undefined;
  if (!ctrl || bot.isDown) return;
  ctrl.fireAnimTimer = 0.2;
  transitionBotAnim(ctrl, 'RIFLE_FIRE', 0.04);
}

export function triggerBotHitAnimation(bot: TacticalTargetEntity): void {
  const ctrl = bot.root.userData?.botAnimCtrl as BotAnimController | undefined;
  if (!ctrl || bot.isDown) return;
  ctrl.hitReactTimer = 0.25;
  transitionBotAnim(ctrl, 'RIFLE_HIT', 0.04);
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
      const isDeathState =
        ctrl.currentState === 'RIFLE_DEATH' ||
        ctrl.currentState === 'RIFLE_DEATH_HEADSHOT';
      if (!isDeathState) {
        ctrl.deathElapsed = 0;
        const deathState: BotAnimState =
          Math.abs(t.hitTiltVelocity) > 12
            ? 'RIFLE_DEATH_HEADSHOT'
            : 'RIFLE_DEATH';
        transitionBotAnim(ctrl, deathState, 0.08);
      }

      ctrl.deathElapsed += dt;
      if (ctrl.deathElapsed < 2.8) {
        ctrl.mixer.update(dt);
      }

      const dropProgress = Math.min(1, ctrl.deathElapsed / 0.45);
      const dropEase = 1 - Math.pow(1 - dropProgress, 2.2);
      ctrl.weaponProp.position.set(
        THREE.MathUtils.lerp(-0.08, 0.28, dropEase),
        THREE.MathUtils.lerp(1.15, 0.04, dropEase),
        THREE.MathUtils.lerp(0.18, 0.22, dropEase)
      );
      ctrl.weaponProp.rotation.set(
        0,
        THREE.MathUtils.lerp(0.04, 0.42, dropEase),
        THREE.MathUtils.lerp(0, Math.PI / 2, dropEase)
      );

      if (ctrl.deathElapsed > 2.4) {
        const vanishAlpha = Math.min(1, (ctrl.deathElapsed - 2.4) / 0.5);
        t.pivotGroup.position.y = -vanishAlpha * 0.45;
        if (ctrl.deathElapsed >= 2.9) {
          t.root.visible = false;
        }
      }
      continue;
    }

    if (!t.root.visible) t.root.visible = true;
    t.pivotGroup.position.y = 0;

    if (
      ctrl.currentState === 'RIFLE_DEATH' ||
      ctrl.currentState === 'RIFLE_DEATH_HEADSHOT'
    ) {
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

    const wantTacticalCrouch =
      ctrl.crouchStance ||
      (t.isTelegraphing && Math.sin(ctrl.tacticalTimer * 1.8) > 0.25) ||
      (speed <= 0.12 && Math.sin(ctrl.tacticalTimer * 0.9) > 0.45);

    if (ctrl.hitReactTimer > 0) {
      ctrl.hitReactTimer -= dt;
    } else if (ctrl.fireAnimTimer > 0) {
      ctrl.fireAnimTimer -= dt;
    } else if (t.isTelegraphing && speed <= 0.25) {
      transitionBotAnim(ctrl, wantTacticalCrouch ? 'RIFLE_CROUCH' : 'RIFLE_AIM', 0.14);
    } else if (speed > 2.4) {
      transitionBotAnim(ctrl, 'RIFLE_RUN', 0.15);
    } else if (speed > 0.08) {
      transitionBotAnim(
        ctrl,
        wantTacticalCrouch ? 'RIFLE_CROUCH_WALK' : 'RIFLE_WALK',
        0.16
      );
    } else {
      transitionBotAnim(ctrl, wantTacticalCrouch ? 'RIFLE_CROUCH' : 'RIFLE_IDLE', 0.18);
    }

    const isCrouchedNow =
      ctrl.currentState === 'RIFLE_CROUCH' ||
      ctrl.currentState === 'RIFLE_CROUCH_WALK';
    t.headMesh.position.y = isCrouchedNow ? 1.05 : 1.56;
    t.torsoMesh.position.y = isCrouchedNow ? 0.72 : 1.1;
    if (t.armorMesh) t.armorMesh.position.y = isCrouchedNow ? 0.72 : 1.08;

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

    syncBotWeaponWithMixamoHands(t, ctrl, isCrouchedNow);
  }
}
