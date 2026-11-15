import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WeaponId } from '../types/game';
import {
  createSculptedThirdPersonWeaponMesh,
  isSculptedWeaponId,
} from './sculptedFirearms';
import { normalizeAnimatedM4A4Model } from './weaponBuilder';

interface RealGlbWeaponSpec {
  id: WeaponId;
  url: string;
  githubFallbackUrl?: string;
  clipName?: string;
  clipTime?: number;
  rawLocal?: boolean;
  filter: (meshName: string, nodeName: string, matNames: string[]) => boolean;
  offset: [number, number, number];
  scale: number;
  rotX: number;
  rotY: number;
}

const glbWeaponTemplates = new Map<WeaponId, THREE.Group>();
const glbLevelPreviewTemplates = new Map<WeaponId, THREE.Group>();
const glbWeaponPromises = new Map<WeaponId, Promise<THREE.Group | null>>();
const pendingWeaponMounts: Array<{ group: THREE.Group; weaponId: WeaponId }> = [];
let preloadAllPromise: Promise<void> | null = null;

const _rGripWorld = new THREE.Vector3();
const _rThumbWorld = new THREE.Vector3();
const _lIdxWorld = new THREE.Vector3();
const _lMidWorld = new THREE.Vector3();
const _lThumbWorld = new THREE.Vector3();
const _lCradleWorld = new THREE.Vector3();
const _rGripLocal = new THREE.Vector3();
const _lCradleLocal = new THREE.Vector3();
const _handDir = new THREE.Vector3();
const _lookTargetWorld = new THREE.Vector3();

interface HandFingerCache {
  rMiddle1: THREE.Object3D;
  rThumb2: THREE.Object3D;
  lIndex2: THREE.Object3D;
  lMiddle2: THREE.Object3D;
  lThumb2: THREE.Object3D;
}

const HIDDEN_ARM_MATS = new Set([
  'arms',
  'arms_0',
  'hand_d',
  'glove_d',
  'm_gloves_black',
  'm_shirt_blackcamo2',
  'textura',
  'v_hands_gloves_sf2.tga',
  'v_hands_sleeves_sf2.tga',
  'v_hands_watch_sf2_d.tga.001',
  'dmc5_soldier_gear_mat',
  'dmc5_soldier_hands_mat',
  'dmc5_soldier_shirt_mat',
  'scopereticle',
]);

const HIDDEN_EXTRA_NODES = new Set([
  'object_7',
  'object_8',
  'object_25',
  'object_26',
  'object_51',
  'object_80',
  'object_84',
  'object_102',
  'object_122',
  'object_124',
  'object_126',
  'object_128',
  'mag2_j_051',
  'mag2',
  'mag2_m4_d_0',
  'mag.001',
  'mag.001_0',
  'mag001_0',
  'bullets',
  'bullets_0',
  'requests_studio_hands',
  'requests_studio_hands_0',
  'requests_studio_hands_1',
  'watch',
  'watch_0',
  'ch22_body',
  'ch22_body_textura_0',
  'armmesh_arms_0',
  'arms_arms_0',
  'hand_mesh_hand_d_0',
  'hand_mesh_glove_d_0',
  'skm_comando_m_gloves_black_0',
  'skm_comando_m_shirt_blackcamo2_0',
  'scoperender_sniper_0',
  'reticle_scopereticle_0',
]);

function isExcludedMesh(
  meshName: string,
  nodeName: string,
  matNames: string[]
): boolean {
  const mLow = meshName.toLowerCase();
  const nLow = nodeName.toLowerCase();
  if (HIDDEN_EXTRA_NODES.has(mLow) || HIDDEN_EXTRA_NODES.has(nLow)) return true;
  if (
    mLow.includes('arm') ||
    mLow.includes('hand') ||
    mLow.includes('glove') ||
    mLow.includes('watch') ||
    mLow.includes('shirt') ||
    mLow.includes('ch22')
  ) {
    return true;
  }
  for (const mn of matNames) {
    const low = mn.toLowerCase();
    if (
      HIDDEN_ARM_MATS.has(low) ||
      low.includes('glove') ||
      low.includes('shirt') ||
      low.includes('hand') ||
      low === 'arms'
    ) {
      return true;
    }
  }
  return false;
}

const WEAPON_GLB_SPECS: RealGlbWeaponSpec[] = [
  {
    id: 'AK47_RIFLE',
    url: '/models/fps_ak47.glb',
    filter: (m, n, mats) => !isExcludedMesh(m, n, mats),
    offset: [0.129, -1.385, -0.21],
    scale: 1.02,
    rotX: 0.24,
    rotY: 0,
  },
  {
    id: 'AK12_RIFLE',
    url: '/models/weapons/ak-12animated.glb',
    filter: (m, n, mats) => {
      if (isExcludedMesh(m, n, mats)) return false;
      const mLow = m.toLowerCase();
      if (mLow.includes('lense')) return false;
      return true;
    },
    offset: [0.354, -3.794, -0.476],
    scale: 0.45,
    rotX: 0.2,
    rotY: 0,
  },
  {
    id: 'M4_CARBINE',
    // Keep 3P/bot mount on proven pack — do not swap to spare M4A4 (breaks coverage).
    url: '/models/m4_fps_pack.glb',
    filter: (m, n, mats) => !isExcludedMesh(m, n, mats),
    offset: [0.025, -1.365, -0.04],
    scale: 0.9,
    rotX: 0.22,
    rotY: 0,
  },
  {
    id: 'CARBINE_AR',
    url: '/models/fps_animated_carbine.glb',
    clipName: 'allanims',
    clipTime: 0,
    filter: (m, n, mats) => !isExcludedMesh(m, n, mats),
    offset: [0.004, -0.11, -0.02],
    scale: 0.43,
    rotX: 0.2,
    rotY: 0,
  },
  {
    id: 'SMG_45',
    url: '/models/fps_animated_smg.glb',
    clipName: 'allanims',
    clipTime: 0,
    filter: (m, n, mats) => !isExcludedMesh(m, n, mats),
    offset: [0, -4.0, -9.5],
    scale: 0.0095,
    rotX: 0.19,
    rotY: 0,
  },
  {
    id: 'SNIPER_BOLT',
    url: '/models/sniper_animated.glb',
    clipName: 'allanims',
    clipTime: 0,
    filter: (m, n, mats) => !isExcludedMesh(m, n, mats),
    offset: [0.05, 1.5, 14.0],
    scale: 0.0072,
    rotX: 0.18,
    rotY: 0,
  },
  {
    id: 'SNIPER_TACTICAL',
    url: '/models/sniper_fps_animation.glb',
    filter: (m, n, mats) => !isExcludedMesh(m, n, mats),
    offset: [-0.21, 0.08, 0.35],
    scale: 0.44,
    rotX: 0.24,
    rotY: Math.PI,
  },
  {
    id: 'L49_LMG',
    url: '/models/lmg_animated.glb',
    clipName: 'allanims',
    clipTime: 0,
    filter: (m, n, mats) => !isExcludedMesh(m, n, mats),
    offset: [0, 0.01, 0.02],
    scale: 0.72,
    rotX: 0.19,
    rotY: 0,
  },
  {
    id: 'P50_PISTOL',
    url: '/models/mark_23_animated.glb',
    rawLocal: true,
    filter: (m, n, mats) =>
      !isExcludedMesh(m, n, mats) &&
      (m.includes('Mark23') ||
        n.includes('Object_9') ||
        n.includes('Object_10') ||
        n.includes('Object_11')),
    offset: [10.7, -142.5, 2.5],
    scale: 0.012,
    rotX: 0.18,
    rotY: 0,
  },
  {
    id: 'KNIFE_TACTICAL',
    url: '/models/knife_animated.glb',
    clipName: 'anims',
    clipTime: 0,
    filter: (m, n, mats) => !isExcludedMesh(m, n, mats),
    offset: [8.0, -8.0, -18.5],
    scale: 0.011,
    rotX: 0,
    rotY: Math.PI / 2,
  },
];

/**
 * Inventory/thumbnail-only extras. Never written to glbWeaponTemplates (1P/3P mounts).
 * Uses spare on-disk packs to improve inventory coverage without touching live M4 viewmodel.
 */
const INVENTORY_PREVIEW_OVERRIDE_SPECS: RealGlbWeaponSpec[] = [
  {
    id: 'M4_CARBINE',
    url: '/models/weapons/animated_fps_m4a4.glb',
    clipName: 'Armature|Take',
    clipTime: 0.05,
    filter: (m, n, mats) => !isExcludedMesh(m, n, mats),
    // Approximate studio framing after normalizeAnimatedM4A4Model (bind-world meters).
    offset: [0.02, -1.05, -0.08],
    scale: 0.95,
    rotX: 0.22,
    rotY: 0,
  },
];

function buildBakedStaticGroup(
  scene: THREE.Object3D,
  animations: THREE.AnimationClip[] | undefined,
  spec: RealGlbWeaponSpec,
  overrideRotX?: number
): THREE.Group {
  if (spec.clipName && animations && animations.length > 0) {
    const mixer = new THREE.AnimationMixer(scene);
    const clip =
      animations.find((c) => c.name === spec.clipName) || animations[0];
    if (clip) {
      let minT = Infinity;
      for (let i = 0; i < clip.tracks.length; i++) {
        const arr = clip.tracks[i].times;
        if (arr.length > 0 && arr[0] < minT) minT = arr[0];
      }
      const t =
        (spec.clipTime ?? 0) > 0
          ? (spec.clipTime ?? 0)
          : Number.isFinite(minT) && minT > 0.005
            ? minT + 0.01
            : 0.01;
      const action = mixer.clipAction(clip);
      action.weight = 1.0;
      action.play();
      mixer.setTime(t);
    }
  }

  scene.updateMatrixWorld(true);

  const template = new THREE.Group();
  const v = new THREE.Vector3();
  const nVec = new THREE.Vector3();
  const offsetVec = new THREE.Vector3(
    spec.offset[0],
    spec.offset[1],
    spec.offset[2]
  );
  const useRotX = overrideRotX !== undefined ? overrideRotX : spec.rotX;
  const rotMat = new THREE.Matrix4()
    .makeRotationX(useRotX)
    .multiply(new THREE.Matrix4().makeRotationY(spec.rotY));
  const rotQuat = new THREE.Quaternion().setFromRotationMatrix(rotMat);
  const worldNormalMat = new THREE.Matrix3();

  scene.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const srcMesh = child as THREE.Mesh;
    const mName = srcMesh.name || '';
    const nName = srcMesh.parent?.name || '';
    const matsArr = Array.isArray(srcMesh.material)
      ? srcMesh.material
      : srcMesh.material
        ? [srcMesh.material]
        : [];
    const matNames = matsArr.map((m) => m?.name || '');

    if (!spec.filter(mName, nName, matNames)) return;

    const geom = srcMesh.geometry.clone();
    const posAttr = geom.getAttribute('position');
    if (!posAttr) return;
    const normAttr = geom.getAttribute('normal');
    const skinned = (srcMesh as THREE.SkinnedMesh).isSkinnedMesh
      ? (srcMesh as THREE.SkinnedMesh)
      : null;

    if (!spec.rawLocal) {
      worldNormalMat.getNormalMatrix(srcMesh.matrixWorld);
    }

    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i);
      if (!spec.rawLocal) {
        if (skinned && skinned.skeleton) {
          skinned.applyBoneTransform(i, v);
        }
        v.applyMatrix4(srcMesh.matrixWorld);
      }
      v.add(offsetVec);
      v.multiplyScalar(spec.scale);
      v.applyMatrix4(rotMat);
      posAttr.setXYZ(i, v.x, v.y, v.z);

      if (normAttr) {
        nVec.fromBufferAttribute(normAttr, i);
        if (!spec.rawLocal) {
          nVec.applyMatrix3(worldNormalMat);
        }
        nVec.applyQuaternion(rotQuat).normalize();
        normAttr.setXYZ(i, nVec.x, nVec.y, nVec.z);
      }
    }

    posAttr.needsUpdate = true;
    if (normAttr) normAttr.needsUpdate = true;
    geom.deleteAttribute('skinIndex');
    geom.deleteAttribute('skinWeight');
    geom.deleteAttribute('tangent');
    geom.computeBoundingBox();
    geom.computeBoundingSphere();

    const sanitizedMats = matsArr.map((mat) => {
      const cloned = mat.clone() as THREE.MeshStandardMaterial;
      if (cloned.map) {
        cloned.map.colorSpace = THREE.SRGBColorSpace;
        cloned.map.needsUpdate = true;
        if (cloned.color) {
          cloned.color.setHex(0xffffff);
        }
      }
      if (
        (cloned.name || '').toLowerCase().includes('lens') &&
        !cloned.map
      ) {
        cloned.transparent = true;
        cloned.opacity = 0.72;
        cloned.roughness = 0.12;
        cloned.metalness = 0.25;
      }
      cloned.needsUpdate = true;
      return cloned;
    });

    const finalMaterial =
      sanitizedMats.length === 1 ? sanitizedMats[0] : sanitizedMats;

    const staticMesh = new THREE.Mesh(geom, finalMaterial);
    staticMesh.castShadow = false;
    staticMesh.receiveShadow = false;
    staticMesh.frustumCulled = false;
    template.add(staticMesh);
  });

  return template;
}

function populateMountWithRealGlb(
  mount: THREE.Group,
  weaponId: WeaponId
): boolean {
  const tpl = glbWeaponTemplates.get(weaponId);
  if (!tpl || tpl.children.length === 0) return false;

  while (mount.children.length > 0) {
    mount.remove(mount.children[0]);
  }
  const instance = tpl.clone();
  mount.add(instance);
  return true;
}

function createGlbLoader(): GLTFLoader {
  const loader = new GLTFLoader();
  loader.register((parser) => ({
    name: 'KHR_materials_pbrSpecularGlossiness',
    extendMaterialParams: async (
      materialIndex: number,
      materialParams: Record<string, unknown>
    ) => {
      const matDef = parser.json.materials?.[materialIndex];
      const sg = matDef?.extensions?.KHR_materials_pbrSpecularGlossiness;
      if (!sg) return;
      materialParams.color = new THREE.Color(1, 1, 1);
      materialParams.roughness = 0.42;
      materialParams.metalness = 0.68;
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
  return loader;
}

export function ensureSharedWeaponProps(): void {
  // No legacy blocky geometries needed; all non-GLB weapons use sculpted PBR geometry.
}

export function preloadRealBotWeaponGlbs(): Promise<void> {
  if (preloadAllPromise) return preloadAllPromise;

  const loader = createGlbLoader();
  const perSpecPromises: Array<Promise<void>> = [];

  for (const spec of WEAPON_GLB_SPECS) {
    const p = new Promise<THREE.Group | null>((resolve) => {
      loader.load(
        spec.url,
        (gltf) => {
          const previewTpl = buildBakedStaticGroup(
            gltf.scene,
            gltf.animations,
            spec,
            0
          );
          if (previewTpl.children.length > 0) {
            const tpl = new THREE.Group();
            if (spec.rotX !== 0) {
              const tilted = previewTpl.clone();
              tilted.rotation.x = spec.rotX;
              tpl.add(tilted);
            } else {
              tpl.add(previewTpl.clone());
            }
            glbLevelPreviewTemplates.set(spec.id, previewTpl);
            glbWeaponTemplates.set(spec.id, tpl);
            for (let i = pendingWeaponMounts.length - 1; i >= 0; i--) {
              const item = pendingWeaponMounts[i];
              if (item.weaponId === spec.id) {
                if (populateMountWithRealGlb(item.group, item.weaponId)) {
                  pendingWeaponMounts.splice(i, 1);
                }
              }
            }
            resolve(tpl);
          } else {
            resolve(null);
          }
        },
        undefined,
        () => resolve(null)
      );
    });
    glbWeaponPromises.set(spec.id, p);
    perSpecPromises.push(p.then(() => undefined));
  }

  // Spare GLBs → inventory preview only (never bot mounts / 1P).
  for (const spec of INVENTORY_PREVIEW_OVERRIDE_SPECS) {
    const p = new Promise<void>((resolve) => {
      loader.load(
        spec.url,
        (gltf) => {
          try {
            if (spec.url.includes('animated_fps_m4a4')) {
              normalizeAnimatedM4A4Model(gltf.scene);
            }
            const previewTpl = buildBakedStaticGroup(
              gltf.scene,
              gltf.animations,
              spec,
              0
            );
            // Only replace inventory preview when bake produced usable meshes.
            if (previewTpl.children.length >= 2) {
              glbLevelPreviewTemplates.set(spec.id, previewTpl);
            }
          } catch {
            // Keep existing gameplay preview template on failure.
          }
          resolve();
        },
        undefined,
        () => resolve()
      );
    });
    perSpecPromises.push(p);
  }

  preloadAllPromise = Promise.all(perSpecPromises).then(() => undefined);
  return preloadAllPromise;
}

/**
 * Returns a fresh horizontally-leveled 3D model instance of ANY WeaponId
 * (real GLB or sculpted PBR firearm) suitable for thumbnail/showcase rendering.
 */
export async function buildLevel3DWeaponPreviewGroup(
  weaponId: WeaponId
): Promise<THREE.Group | null> {
  if (isSculptedWeaponId(weaponId)) {
    return createSculptedThirdPersonWeaponMesh(weaponId, true).group;
  }
  await preloadRealBotWeaponGlbs();
  const p = glbWeaponPromises.get(weaponId);
  if (p) await p;
  const tpl = glbLevelPreviewTemplates.get(weaponId);
  if (!tpl || tpl.children.length === 0) return null;
  return tpl.clone();
}

export function createBotThirdPersonWeaponMesh(
  weaponId: WeaponId | undefined,
  _isAlly: boolean
): THREE.Group {
  preloadRealBotWeaponGlbs();

  const chosen: WeaponId = weaponId || 'AK47_RIFLE';
  const group = new THREE.Group();
  group.name = 'BotWorldWeapon';

  if (isSculptedWeaponId(chosen)) {
    const sculpted = createSculptedThirdPersonWeaponMesh(chosen, false);
    group.add(sculpted.group);
    return group;
  }

  if (populateMountWithRealGlb(group, chosen)) {
    return group;
  }

  // Enquanto o .glb termina o carregamento assíncrono (~20-60ms locais), registra para substituição imediata sem exibir cubos provisórios.
  pendingWeaponMounts.push({ group, weaponId: chosen });
  return group;
}

function getOrResolveFingerBones(
  rHandBone: THREE.Object3D,
  lHandBone: THREE.Object3D
): HandFingerCache {
  const existing = rHandBone.userData?.fingerGripCache as
    | HandFingerCache
    | undefined;
  if (existing) return existing;

  const rMiddle1 =
    rHandBone.getObjectByName('mixamorigRightHandMiddle1') || rHandBone;
  const rThumb2 =
    rHandBone.getObjectByName('mixamorigRightHandThumb2') || rMiddle1;
  const lIndex2 =
    lHandBone.getObjectByName('mixamorigLeftHandIndex2') ||
    lHandBone.getObjectByName('mixamorigLeftHandIndex1') ||
    lHandBone;
  const lMiddle2 =
    lHandBone.getObjectByName('mixamorigLeftHandMiddle2') ||
    lHandBone.getObjectByName('mixamorigLeftHandMiddle1') ||
    lHandBone;
  const lThumb2 =
    lHandBone.getObjectByName('mixamorigLeftHandThumb2') || lMiddle2;

  const cache: HandFingerCache = {
    rMiddle1,
    rThumb2,
    lIndex2,
    lMiddle2,
    lThumb2,
  };
  rHandBone.userData = rHandBone.userData || {};
  rHandBone.userData.fingerGripCache = cache;
  return cache;
}

/**
 * Alinha o modelo 3D da arma diretamente entre a cavidade da palma/dedos da mão direita
 * (Pistol Grip) e a cavidade dos dedos/polegar da mão esquerda (Guarda-Mão frontal).
 */
export function alignWeaponPropToMixamoHands(
  weaponProp: THREE.Object3D,
  parentGroup: THREE.Object3D,
  rHandBone: THREE.Object3D | null,
  lHandBone: THREE.Object3D | null,
  kickBack = 0,
  fallbackY = 1.2
): void {
  if (rHandBone && lHandBone) {
    const fingers = getOrResolveFingerBones(rHandBone, lHandBone);

    fingers.rMiddle1.getWorldPosition(_rGripWorld);
    fingers.rThumb2.getWorldPosition(_rThumbWorld);
    _rGripWorld.lerp(_rThumbWorld, 0.35);

    fingers.lIndex2.getWorldPosition(_lIdxWorld);
    fingers.lMiddle2.getWorldPosition(_lMidWorld);
    fingers.lThumb2.getWorldPosition(_lThumbWorld);
    _lCradleWorld
      .copy(_lIdxWorld)
      .add(_lMidWorld)
      .add(_lThumbWorld)
      .multiplyScalar(1 / 3);

    _rGripLocal.copy(_rGripWorld);
    _lCradleLocal.copy(_lCradleWorld);
    parentGroup.worldToLocal(_rGripLocal);
    parentGroup.worldToLocal(_lCradleLocal);

    _handDir.subVectors(_lCradleLocal, _rGripLocal);
    if (_handDir.lengthSq() > 0.001) {
      _handDir.normalize();
      weaponProp.position.copy(_rGripLocal);
      if (kickBack !== 0) {
        weaponProp.position.addScaledVector(_handDir, -kickBack);
      }

      _lookTargetWorld
        .copy(_lCradleWorld)
        .addScaledVector(_lCradleWorld.clone().sub(_rGripWorld), 2.0);
      weaponProp.lookAt(_lookTargetWorld);
      return;
    }
  }

  weaponProp.position.set(-0.18, fallbackY, 0.14);
  weaponProp.rotation.set(0.02, 0.04, 0);
}
