import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { WeaponId } from '../types/game';
import { BotAnimController, BotAnimState, BotClipMap, buildProRiflePackClips, selectDirectionalDeathState, syncBotWeaponWithMixamoHands, transitionBotAnim } from './botCharacterClips';
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
      if (child.name && child.name.startsWith('mixamorig')) child.name = child.name.replace(':', '');
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
        enemyMat.color.setHex(0xf2b6a0);
        enemyMat.roughness = 0.65;
        enemyMat.metalness = 0.16;
        enemyMatMap!.set(std.name, enemyMat);
      });
    });

    sharedClips = buildProRiflePackClips(root, loaded.animations);
    templateScene = root;
  })().catch((err) => console.warn('ProRifleBotCharacter fallback:', err));

  return Promise.resolve(loadPromise);
}

export function cloneVanguardCharacterAvatar(isSoftwareGl: boolean): { modelRoot: THREE.Object3D; clips: BotClipMap } | null {
  if (!templateScene || !sharedClips || !allyMatMap) return null;
  const cloned = SkeletonUtils.clone(templateScene);
  cloned.scale.setScalar(1.0);
  cloned.position.set(0, 0, 0);
  cloned.rotation.set(0, 0, 0);

  cloned.traverse((child) => {
    if (child.name && child.name.startsWith('mixamorig')) child.name = child.name.replace(':', '');
    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh;
      m.castShadow = !isSoftwareGl;
      m.receiveShadow = false;
      m.frustumCulled = false;
      const std = m.material as THREE.MeshStandardMaterial;
      if (std && allyMatMap!.has(std.name)) m.material = allyMatMap!.get(std.name)!;
    }
  });

  return { modelRoot: cloned, clips: sharedClips };
}

export function attachProRifleCharacterToBot(bot: YardBotEntity, isSoftwareGl: boolean): void {
  if (!templateScene || !sharedClips || !allyMatMap || !enemyMatMap) return;
  if (bot.root.userData?.hasSkeletalCharacter) return;

  ensureSharedHitMat();

  const hitPartIds = new Set<number>([bot.headMesh.id, bot.torsoMesh.id]);
  if (bot.armorMesh) hitPartIds.add(bot.armorMesh.id);

  const toRemove: THREE.Object3D[] = [];
  for (let i = 0; i < bot.pivotGroup.children.length; i++) {
    const child = bot.pivotGroup.children[i];
    if (hitPartIds.has(child.id)) {
      const mesh = child as THREE.Mesh;
      mesh.material = sharedInvisibleHitMat!;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    } else {
      toRemove.push(child);
    }
  }
  for (let i = 0; i < toRemove.length; i++) bot.pivotGroup.remove(toRemove[i]);

  bot.headMesh.scale.set(1.22, 1.25, 1.22);
  bot.headMesh.position.set(0, 1.56, 0.02);
  bot.torsoMesh.scale.set(1.25, 1.45, 1.28);
  bot.torsoMesh.position.set(0, 1.02, 0);
  if (bot.armorMesh) {
    bot.armorMesh.scale.set(1.28, 1.35, 1.3);
    bot.armorMesh.position.set(0, 1.04, 0.01);
  }

  const cloned = SkeletonUtils.clone(templateScene);
  cloned.scale.setScalar(1.0);
  cloned.position.set(0, 0, 0);
  cloned.rotation.set(0, 0, 0);

  const matPalette = bot.isAlly ? allyMatMap : enemyMatMap;
  let rHandBone: THREE.Object3D | null = null;
  let lHandBone: THREE.Object3D | null = null;

  cloned.traverse((child) => {
    if (child.name && child.name.startsWith('mixamorig')) child.name = child.name.replace(':', '');
    if (child.name === 'mixamorigRightHand') rHandBone = child;
    else if (child.name === 'mixamorigLeftHand') lHandBone = child;

    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh;
      m.castShadow = !isSoftwareGl;
      m.receiveShadow = false;
      m.frustumCulled = false;
      const std = m.material as THREE.MeshStandardMaterial;
      if (std && matPalette.has(std.name)) m.material = matPalette.get(std.name)!;
    }
  });

  bot.pivotGroup.add(cloned);

  const weaponChoices: WeaponId[] = ['AK47_RIFLE', 'M4_CARBINE', 'SNIPER_TACTICAL', 'SNIPER_BOLT', 'P50_PISTOL'];
  const chosenWeapon =
    bot.weaponId || weaponChoices[Math.abs(Math.round((bot.patrolOffset || 1) * 10)) % weaponChoices.length];
  bot.weaponId = chosenWeapon;

  const weaponProp = createBotThirdPersonWeaponMesh(chosenWeapon, isSoftwareGl);
  weaponProp.position.set(-0.08, 1.26, 0.18);
  bot.pivotGroup.add(weaponProp);

  const mixer = new THREE.AnimationMixer(cloned);
  const actions = {} as Record<BotAnimState, THREE.AnimationAction>;
  (Object.keys(sharedClips) as BotAnimState[]).forEach((stateKey) => {
    const action = mixer.clipAction(sharedClips![stateKey]);
    if (
      stateKey === 'RIFLE_FIRE' ||
      stateKey === 'RIFLE_THROW' ||
      stateKey === 'RIFLE_HIT' ||
      stateKey.startsWith('RIFLE_DEATH')
    ) {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
    }
    actions[stateKey] = action;
  });

  const crouchStance = Boolean(bot.root.userData?.crouchStance);
  const initialState: BotAnimState = crouchStance ? 'RIFLE_CROUCH' : 'RIFLE_IDLE';
  actions[initialState].reset().play();

  const ctrl: BotAnimController = {
    modelRoot: cloned,
    weaponProp,
    rHandBone,
    lHandBone,
    mixer,
    actions,
    currentState: initialState,
    prevX: bot.root.position.x,
    prevZ: bot.root.position.z,
    smoothedSpeed: 0,
    hitReactTimer: 0,
    fireAnimTimer: 0,
    throwAnimTimer: 0,
    deathElapsed: 0,
    lodAccumDt: 0,
    tacticalTimer: (bot.patrolOffset || 0) * 1.5,
    crouchStance,
  };

  bot.root.userData = bot.root.userData || {};
  bot.root.userData.botAnimCtrl = ctrl;
  bot.root.userData.hasSkeletalCharacter = true;
}

export function triggerBotFireAnimation(bot: TacticalTargetEntity): void {
  const ctrl = bot.root.userData?.botAnimCtrl as BotAnimController | undefined;
  if (!ctrl || bot.isDown) return;
  ctrl.fireAnimTimer = 0.18;
  if (ctrl.currentState === 'RIFLE_IDLE' || ctrl.currentState === 'RIFLE_AIM') {
    transitionBotAnim(ctrl, 'RIFLE_FIRE', 0.04);
  }
}

export function triggerBotGrenadeAnimation(bot: TacticalTargetEntity): void {
  const ctrl = bot.root.userData?.botAnimCtrl as BotAnimController | undefined;
  if (!ctrl || bot.isDown) return;
  ctrl.throwAnimTimer = 0.56;
  transitionBotAnim(ctrl, 'RIFLE_THROW', 0.06);
}

export function triggerBotHitAnimation(bot: TacticalTargetEntity): void {
  const ctrl = bot.root.userData?.botAnimCtrl as BotAnimController | undefined;
  if (!ctrl || bot.isDown) return;
  ctrl.hitReactTimer = 0.22;
  if (ctrl.currentState === 'RIFLE_IDLE' || ctrl.currentState === 'RIFLE_AIM') {
    transitionBotAnim(ctrl, 'RIFLE_HIT', 0.04);
  }
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
      if (!ctrl.currentState.startsWith('RIFLE_DEATH')) {
        ctrl.deathElapsed = 0;
        const wasCrouched = ctrl.currentState === 'RIFLE_CROUCH' || ctrl.currentState === 'RIFLE_CROUCH_WALK';
        const isHeadshot = Math.abs(t.hitTiltVelocity) > 12;
        transitionBotAnim(
          ctrl,
          selectDirectionalDeathState(t.root.position, t.root.rotation.y, playerPos, isHeadshot, wasCrouched),
          0.08
        );
      }

      ctrl.deathElapsed += dt;
      if (ctrl.deathElapsed < 2.8) ctrl.mixer.update(dt);

      const dropEase = 1 - Math.pow(1 - Math.min(1, ctrl.deathElapsed / 0.45), 2.2);
      ctrl.weaponProp.position.set(
        THREE.MathUtils.lerp(-0.08, 0.28, dropEase),
        THREE.MathUtils.lerp(1.15, 0.04, dropEase),
        THREE.MathUtils.lerp(0.18, 0.22, dropEase)
      );
      ctrl.weaponProp.rotation.set(0, THREE.MathUtils.lerp(0.04, 0.42, dropEase), THREE.MathUtils.lerp(0, Math.PI / 2, dropEase));

      if (ctrl.deathElapsed > 2.4) {
        t.pivotGroup.position.y = -Math.min(1, (ctrl.deathElapsed - 2.4) / 0.5) * 0.45;
        if (ctrl.deathElapsed >= 2.9) t.root.visible = false;
      }
      continue;
    }

    if (!t.root.visible) t.root.visible = true;
    t.pivotGroup.position.y = 0;
    if (ctrl.currentState.startsWith('RIFLE_DEATH')) {
      ctrl.deathElapsed = 0;
      transitionBotAnim(ctrl, ctrl.crouchStance ? 'RIFLE_CROUCH' : 'RIFLE_IDLE', 0.15);
    }
    t.pivotGroup.rotation.x = 0;

    const dx = t.root.position.x - ctrl.prevX;
    const dz = t.root.position.z - ctrl.prevZ;
    ctrl.prevX = t.root.position.x;
    ctrl.prevZ = t.root.position.z;
    const rawSpeed = dt > 0.0001 ? Math.hypot(dx, dz) / dt : 0;
    ctrl.smoothedSpeed = THREE.MathUtils.damp(ctrl.smoothedSpeed, rawSpeed, 11, dt);
    const speed = ctrl.smoothedSpeed;

    if (!t.isTelegraphing && rawSpeed > 0.12) {
      let diff = Math.atan2(dx, dz) - t.root.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      t.root.rotation.y += diff * Math.min(1, dt * 10);
    }

    const wantTacticalCrouch =
      speed <= 0.18 && (ctrl.crouchStance || (t.isTelegraphing && Math.sin(ctrl.tacticalTimer * 1.4) > 0.45));

    if (ctrl.throwAnimTimer > 0) {
      ctrl.throwAnimTimer -= dt;
    } else if (ctrl.hitReactTimer > 0) {
      ctrl.hitReactTimer -= dt;
    } else if (ctrl.fireAnimTimer > 0 && speed <= 0.18) {
      ctrl.fireAnimTimer -= dt;
    } else if (t.isTelegraphing && speed <= 0.22) {
      transitionBotAnim(ctrl, wantTacticalCrouch ? 'RIFLE_CROUCH' : 'RIFLE_AIM', 0.2);
    } else if (t.isTelegraphing && speed > 0.22) {
      if (ctrl.fireAnimTimer > 0) ctrl.fireAnimTimer = Math.max(0, ctrl.fireAnimTimer - dt);
      const sinY = Math.sin(t.root.rotation.y);
      const cosY = Math.cos(t.root.rotation.y);
      const stepDist = Math.hypot(dx, dz) || 1;
      const fwdDot = (dx * sinY + dz * cosY) / stepDist;
      const sideDot = (dx * cosY - dz * sinY) / stepDist;
      if (Math.abs(sideDot) > Math.abs(fwdDot) * 1.2) {
        const leftState = speed > 1.7 ? 'RIFLE_RUN_LEFT' : 'RIFLE_WALK_LEFT';
        const rightState = speed > 1.7 ? 'RIFLE_RUN_RIGHT' : 'RIFLE_WALK_RIGHT';
        transitionBotAnim(ctrl, sideDot > 0 ? leftState : rightState, 0.2);
      } else {
        transitionBotAnim(ctrl, fwdDot >= -0.25 ? 'RIFLE_RUN' : 'RIFLE_WALK_BACK', 0.2);
      }
    } else if (speed > 1.35) {
      if (ctrl.fireAnimTimer > 0) ctrl.fireAnimTimer = Math.max(0, ctrl.fireAnimTimer - dt);
      transitionBotAnim(ctrl, 'RIFLE_RUN', 0.2);
    } else if (speed > 0.12) {
      if (ctrl.fireAnimTimer > 0) ctrl.fireAnimTimer = Math.max(0, ctrl.fireAnimTimer - dt);
      transitionBotAnim(ctrl, 'RIFLE_WALK', 0.2);
    } else {
      transitionBotAnim(ctrl, wantTacticalCrouch ? 'RIFLE_CROUCH' : 'RIFLE_IDLE', 0.22);
    }

    const activeAction = ctrl.actions[ctrl.currentState];
    if (activeAction) {
      if (ctrl.currentState.startsWith('RIFLE_RUN')) {
        activeAction.setEffectiveTimeScale(THREE.MathUtils.clamp(speed / 3.1, 0.92, 1.28));
      } else if (ctrl.currentState.startsWith('RIFLE_WALK')) {
        activeAction.setEffectiveTimeScale(THREE.MathUtils.clamp(speed / 1.5, 0.88, 1.22));
      }
    }

    const isCrouchedNow = ctrl.currentState === 'RIFLE_CROUCH' || ctrl.currentState === 'RIFLE_CROUCH_WALK';
    t.headMesh.position.y = isCrouchedNow ? 1.05 : 1.56;
    t.torsoMesh.position.y = isCrouchedNow ? 0.72 : 1.1;
    if (t.armorMesh) t.armorMesh.position.y = isCrouchedNow ? 0.72 : 1.08;

    const distSq = t.root.position.distanceToSquared(playerPos);
    if (distSq < 1200) {
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
