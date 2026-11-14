import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { WarfaceClassId } from '../components/WarfaceClassIcons';
import { WeaponId } from '../types/game';
import { BotAnimController, BotAnimState, BotClipMap, buildProRiflePackClips, selectDirectionalDeathState, syncBotWeaponWithMixamoHands, transitionBotAnim } from './botCharacterClips';
import { createBotThirdPersonWeaponMesh } from './botWeaponProps';
import { TacticalTargetEntity } from './levelBuilder';
import { YardBotEntity } from './yardPropsBuilder';

const PRO_RIFLE_LOCAL_URL = '/models/characters/pro_rifle_pack.glb';
const PRO_RIFLE_FALLBACK_URL = 'https://github.com/rafaelestafeta2-blip/Gamesfps/releases/download/V1/Pro.Rifle.Pack.glb';
const SNIPER_OPERATOR_LOCAL_URL = '/models/characters/sniper_operator.glb';
const VANGUARD_RIFLEMAN_LOCAL_URL = '/models/characters/vanguard_rifleman.glb';
const VANGUARD_ENGINEER_LOCAL_URL = '/models/characters/vanguard_engineer.glb';
const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

export type CharacterAvatarKind = 'VANGUARD_FUZILEIRO' | 'VANGUARD_ENGENHEIRO' | 'SNIPER' | 'DEFAULT';

let templateScene: THREE.Group | null = null;
let sharedClips: BotClipMap | null = null;
let allyMatMap: Map<string, THREE.MeshStandardMaterial> | null = null;
let enemyMatMap: Map<string, THREE.MeshStandardMaterial> | null = null;

let sniperTemplateScene: THREE.Group | null = null;
let sniperClips: BotClipMap | null = null;
let sniperShowcaseMatMap: Map<string, THREE.MeshStandardMaterial> | null = null;
let sniperAllyMatMap: Map<string, THREE.MeshStandardMaterial> | null = null;
let sniperEnemyMatMap: Map<string, THREE.MeshStandardMaterial> | null = null;

let vanguardRiflemanTemplateScene: THREE.Group | null = null;
let vanguardRiflemanClips: BotClipMap | null = null;
let vanguardRiflemanShowcaseMatMap: Map<string, THREE.MeshStandardMaterial> | null = null;
let vanguardRiflemanAllyMatMap: Map<string, THREE.MeshStandardMaterial> | null = null;
let vanguardRiflemanEnemyMatMap: Map<string, THREE.MeshStandardMaterial> | null = null;

let vanguardEngineerTemplateScene: THREE.Group | null = null;
let vanguardEngineerClips: BotClipMap | null = null;
let vanguardEngineerShowcaseMatMap: Map<string, THREE.MeshStandardMaterial> | null = null;
let vanguardEngineerAllyMatMap: Map<string, THREE.MeshStandardMaterial> | null = null;
let vanguardEngineerEnemyMatMap: Map<string, THREE.MeshStandardMaterial> | null = null;

let loadPromise: Promise<void> | null = null;
let sharedInvisibleHitMat: THREE.MeshBasicMaterial | null = null;

export function isSniperWeaponId(weaponId?: WeaponId | null): boolean {
  return weaponId === 'SNIPER_BOLT' || weaponId === 'SNIPER_TACTICAL';
}

export function isEngineerWeaponId(weaponId?: WeaponId | null): boolean {
  return weaponId === 'SMG_45' || weaponId === 'SMG_MP5';
}

export function isRiflemanWeaponId(weaponId?: WeaponId | null): boolean {
  return (
    weaponId === 'M4_CARBINE' ||
    weaponId === 'CARBINE_AR' ||
    weaponId === 'AK47_RIFLE' ||
    weaponId === 'AK12_RIFLE' ||
    weaponId === 'L49_LMG'
  );
}

export function resolveCharacterAvatarKind(
  weaponId?: WeaponId | null,
  classId?: WarfaceClassId | null,
  isAlly = true
): CharacterAvatarKind {
  if (classId === 'FRANCO_ATIRADOR') return 'SNIPER';
  if (classId === 'FUZILEIRO') return 'VANGUARD_FUZILEIRO';
  if (classId === 'ENGENHEIRO') return 'VANGUARD_ENGENHEIRO';
  if (classId === 'MEDICO') return 'DEFAULT';
  if (isSniperWeaponId(weaponId)) return 'SNIPER';
  if (isAlly && isEngineerWeaponId(weaponId)) return 'VANGUARD_ENGENHEIRO';
  if (isAlly && isRiflemanWeaponId(weaponId)) return 'VANGUARD_FUZILEIRO';
  return 'DEFAULT';
}

function ensureSharedHitMat(): void {
  if (!sharedInvisibleHitMat) sharedInvisibleHitMat = new THREE.MeshBasicMaterial({ visible: false });
}

export function preloadProRifleBotCharacter(loadingManager?: THREE.LoadingManager): Promise<void> {
  if (
    templateScene &&
    sharedClips &&
    sniperTemplateScene &&
    sniperClips &&
    vanguardRiflemanTemplateScene &&
    vanguardRiflemanClips &&
    vanguardEngineerTemplateScene &&
    vanguardEngineerClips
  ) {
    return Promise.resolve();
  }
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

    const loadRifleman = async () => {
      let loaded: { scene: THREE.Group; animations: THREE.AnimationClip[] };
      try {
        loaded = await loadUrl(PRO_RIFLE_LOCAL_URL);
      } catch {
        loaded = await loadUrl(PRO_RIFLE_FALLBACK_URL);
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
    };

    const loadCustomOperatorModel = async (
      url: string,
      allyTintHex: number,
      label: string
    ) => {
      try {
        const loaded = await loadUrl(url);
        const root = loaded.scene;
        root.updateMatrixWorld(true);
        const showcaseMap = new Map<string, THREE.MeshStandardMaterial>();
        const aMap = new Map<string, THREE.MeshStandardMaterial>();
        const eMap = new Map<string, THREE.MeshStandardMaterial>();

        root.traverse((child) => {
          if (child.name && child.name.startsWith('mixamorig')) child.name = child.name.replace(':', '');
          if (!(child as THREE.Mesh).isMesh) return;
          const mesh = child as THREE.Mesh;
          mesh.frustumCulled = false;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

          mats.forEach((m) => {
            const std = m as THREE.MeshStandardMaterial;
            if (!std || showcaseMap.has(std.name)) return;
            if (std.map) {
              std.map.anisotropy = 8;
              std.map.colorSpace = THREE.SRGBColorSpace;
              std.map.needsUpdate = true;
            }
            if (std.normalMap) {
              std.normalMap.anisotropy = 8;
              std.normalMap.needsUpdate = true;
            }
            if (std.roughnessMap) {
              std.roughnessMap.anisotropy = 8;
              std.roughnessMap.needsUpdate = true;
            }
            if (std.metalnessMap) {
              std.metalnessMap.anisotropy = 8;
              std.metalnessMap.needsUpdate = true;
            }

            const showcaseMat = std.clone();
            showcaseMat.color.setHex(0xffffff);
            showcaseMat.envMapIntensity = 0.72;
            showcaseMat.needsUpdate = true;
            showcaseMap.set(std.name, showcaseMat);

            const allyMat = std.clone();
            allyMat.color.setHex(allyTintHex);
            allyMat.envMapIntensity = 0.72;
            allyMat.needsUpdate = true;
            aMap.set(std.name, allyMat);

            const enemyMat = std.clone();
            enemyMat.color.setHex(0xffffff);
            enemyMat.envMapIntensity = 0.72;
            enemyMat.needsUpdate = true;
            eMap.set(std.name, enemyMat);
          });
        });

        const clips = buildProRiflePackClips(root, loaded.animations);
        return { root, clips, showcaseMap, aMap, eMap };
      } catch (err) {
        console.warn(`${label} fallback:`, err);
        return null;
      }
    };

    try {
      const [, sniperRes, fuzileiroRes, engineerRes] = await Promise.all([
        loadRifleman(),
        loadCustomOperatorModel(SNIPER_OPERATOR_LOCAL_URL, 0xdce8f8, 'SniperOperatorCharacter'),
        loadCustomOperatorModel(VANGUARD_RIFLEMAN_LOCAL_URL, 0xffffff, 'VanguardRiflemanCharacter'),
        loadCustomOperatorModel(VANGUARD_ENGINEER_LOCAL_URL, 0xffffff, 'VanguardEngineerCharacter'),
      ]);
      if (sniperRes) {
        sniperTemplateScene = sniperRes.root;
        sniperClips = sniperRes.clips;
        sniperShowcaseMatMap = sniperRes.showcaseMap;
        sniperAllyMatMap = sniperRes.aMap;
        sniperEnemyMatMap = sniperRes.eMap;
      }
      if (fuzileiroRes) {
        vanguardRiflemanTemplateScene = fuzileiroRes.root;
        vanguardRiflemanClips = fuzileiroRes.clips;
        vanguardRiflemanShowcaseMatMap = fuzileiroRes.showcaseMap;
        vanguardRiflemanAllyMatMap = fuzileiroRes.aMap;
        vanguardRiflemanEnemyMatMap = fuzileiroRes.eMap;
      }
      if (engineerRes) {
        vanguardEngineerTemplateScene = engineerRes.root;
        vanguardEngineerClips = engineerRes.clips;
        vanguardEngineerShowcaseMatMap = engineerRes.showcaseMap;
        vanguardEngineerAllyMatMap = engineerRes.aMap;
        vanguardEngineerEnemyMatMap = engineerRes.eMap;
      }
    } finally {
      dracoLoader.dispose();
    }
  })().catch((err) => console.warn('ProRifleBotCharacter fallback:', err));

  return Promise.resolve(loadPromise);
}

export function cloneVanguardCharacterAvatar(
  isSoftwareGl: boolean,
  weaponId?: WeaponId | null,
  classId?: WarfaceClassId | null
): {
  modelRoot: THREE.Object3D;
  clips: BotClipMap;
  isSniper: boolean;
  avatarKind: CharacterAvatarKind;
} | null {
  const desiredKind = resolveCharacterAvatarKind(weaponId, classId, true);

  if (
    desiredKind === 'SNIPER' &&
    sniperTemplateScene &&
    sniperClips &&
    sniperShowcaseMatMap
  ) {
    const cloned = SkeletonUtils.clone(sniperTemplateScene);
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
        if (std && sniperShowcaseMatMap!.has(std.name)) m.material = sniperShowcaseMatMap!.get(std.name)!;
      }
    });

    return { modelRoot: cloned, clips: sniperClips, isSniper: true, avatarKind: 'SNIPER' };
  }

  if (
    desiredKind === 'VANGUARD_FUZILEIRO' &&
    vanguardRiflemanTemplateScene &&
    vanguardRiflemanClips &&
    vanguardRiflemanShowcaseMatMap
  ) {
    const cloned = SkeletonUtils.clone(vanguardRiflemanTemplateScene);
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
        if (std && vanguardRiflemanShowcaseMatMap!.has(std.name)) {
          m.material = vanguardRiflemanShowcaseMatMap!.get(std.name)!;
        }
      }
    });

    return {
      modelRoot: cloned,
      clips: vanguardRiflemanClips,
      isSniper: false,
      avatarKind: 'VANGUARD_FUZILEIRO',
    };
  }

  if (
    desiredKind === 'VANGUARD_ENGENHEIRO' &&
    vanguardEngineerTemplateScene &&
    vanguardEngineerClips &&
    vanguardEngineerShowcaseMatMap
  ) {
    const cloned = SkeletonUtils.clone(vanguardEngineerTemplateScene);
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
        if (std && vanguardEngineerShowcaseMatMap!.has(std.name)) {
          m.material = vanguardEngineerShowcaseMatMap!.get(std.name)!;
        }
      }
    });

    return {
      modelRoot: cloned,
      clips: vanguardEngineerClips,
      isSniper: false,
      avatarKind: 'VANGUARD_ENGENHEIRO',
    };
  }

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

  return { modelRoot: cloned, clips: sharedClips, isSniper: false, avatarKind: 'DEFAULT' };
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

  const weaponChoices: WeaponId[] = ['AK47_RIFLE', 'M4_CARBINE', 'SNIPER_TACTICAL', 'SNIPER_BOLT', 'P50_PISTOL'];
  const chosenWeapon =
    bot.weaponId || weaponChoices[Math.abs(Math.round((bot.patrolOffset || 1) * 10)) % weaponChoices.length];
  bot.weaponId = chosenWeapon;

  const isMedicAlly = bot.isAlly && bot.callsign === 'LIFELINE-04';
  const useSniper =
    isSniperWeaponId(chosenWeapon) &&
    !!sniperTemplateScene &&
    !!sniperClips &&
    !!sniperAllyMatMap &&
    !!sniperEnemyMatMap;
  const useVanguardEngineer =
    !useSniper &&
    Boolean(bot.isAlly) &&
    !isMedicAlly &&
    isEngineerWeaponId(chosenWeapon) &&
    !!vanguardEngineerTemplateScene &&
    !!vanguardEngineerClips &&
    !!vanguardEngineerAllyMatMap &&
    !!vanguardEngineerEnemyMatMap;
  const useVanguardFuzileiro =
    !useSniper &&
    !useVanguardEngineer &&
    Boolean(bot.isAlly) &&
    !isMedicAlly &&
    isRiflemanWeaponId(chosenWeapon) &&
    !!vanguardRiflemanTemplateScene &&
    !!vanguardRiflemanClips &&
    !!vanguardRiflemanAllyMatMap &&
    !!vanguardRiflemanEnemyMatMap;

  const activeTemplate = useSniper
    ? sniperTemplateScene!
    : useVanguardEngineer
      ? vanguardEngineerTemplateScene!
      : useVanguardFuzileiro
        ? vanguardRiflemanTemplateScene!
        : templateScene;
  const activeClips = useSniper
    ? sniperClips!
    : useVanguardEngineer
      ? vanguardEngineerClips!
      : useVanguardFuzileiro
        ? vanguardRiflemanClips!
        : sharedClips;
  const matPalette = useSniper
    ? (bot.isAlly ? sniperAllyMatMap! : sniperEnemyMatMap!)
    : useVanguardEngineer
      ? (bot.isAlly ? vanguardEngineerAllyMatMap! : vanguardEngineerEnemyMatMap!)
      : useVanguardFuzileiro
        ? (bot.isAlly ? vanguardRiflemanAllyMatMap! : vanguardRiflemanEnemyMatMap!)
        : (bot.isAlly ? allyMatMap : enemyMatMap);

  const cloned = SkeletonUtils.clone(activeTemplate);
  cloned.scale.setScalar(1.0);
  cloned.position.set(0, 0, 0);
  cloned.rotation.set(0, 0, 0);

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

  const weaponProp = createBotThirdPersonWeaponMesh(chosenWeapon, isSoftwareGl);
  weaponProp.position.set(-0.08, 1.26, 0.18);
  bot.pivotGroup.add(weaponProp);

  const mixer = new THREE.AnimationMixer(cloned);
  const actions = {} as Record<BotAnimState, THREE.AnimationAction>;
  (Object.keys(activeClips) as BotAnimState[]).forEach((stateKey) => {
    const action = mixer.clipAction(activeClips[stateKey]);
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

  // Ensure Mixamo skeleton is never left with matrixAutoUpdate=false (T-pose lock).
  cloned.traverse((child) => {
    child.userData.keepMatrixAutoUpdate = true;
    child.userData.isStaticEnvironment = false;
    child.matrixAutoUpdate = true;
  });
  bot.root.matrixAutoUpdate = true;
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
    // LOD: near = every frame, far = ~30Hz. Always update at least occasionally so
    // newly attached Mixamo characters leave bind pose (T-pose) immediately.
    if (distSq < 1600) {
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
