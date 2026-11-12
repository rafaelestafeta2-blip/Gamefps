import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WeaponId } from '../types/game';

let sharedRifleBarrelGeo: THREE.BoxGeometry | null = null;
let sharedRifleReceiverGeo: THREE.BoxGeometry | null = null;
let sharedRifleGripGeo: THREE.BoxGeometry | null = null;
let sharedRifleMagGeo: THREE.BoxGeometry | null = null;
let sharedRifleStockGeo: THREE.BoxGeometry | null = null;
let sharedGunMetalMat: THREE.MeshStandardMaterial | null = null;
let sharedWoodAccentMat: THREE.MeshStandardMaterial | null = null;

const glbWeaponTemplates = new Map<WeaponId, THREE.Group>();
const pendingWeaponMounts: Array<{ group: THREE.Group; weaponId: WeaponId }> = [];
let preloadStarted = false;

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

export function ensureSharedWeaponProps(): void {
  if (sharedRifleReceiverGeo) return;
  sharedRifleReceiverGeo = new THREE.BoxGeometry(0.046, 0.068, 0.32);
  sharedRifleBarrelGeo = new THREE.BoxGeometry(0.022, 0.022, 0.36);
  sharedRifleGripGeo = new THREE.BoxGeometry(0.034, 0.095, 0.046);
  sharedRifleMagGeo = new THREE.BoxGeometry(0.036, 0.14, 0.06);
  sharedRifleStockGeo = new THREE.BoxGeometry(0.042, 0.088, 0.2);
  sharedGunMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e2430,
    roughness: 0.38,
    metalness: 0.78,
  });
  sharedWoodAccentMat = new THREE.MeshStandardMaterial({
    color: 0x6b4423,
    roughness: 0.65,
    metalness: 0.15,
  });
}

function buildStaticMeshFromGlb(
  root: THREE.Object3D,
  includePredicate: (meshName: string, nodeName: string) => boolean,
  offset: [number, number, number],
  scale: number,
  rotX = 0,
  rotY = 0
): THREE.Group {
  const template = new THREE.Group();

  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const srcMesh = child as THREE.Mesh;
    const mName = srcMesh.name || '';
    const nName = srcMesh.parent?.name || '';
    if (!includePredicate(mName, nName)) return;

    const geom = srcMesh.geometry.clone();
    geom.deleteAttribute('skinIndex');
    geom.deleteAttribute('skinWeight');

    // Mag1_M4_D_0 possui escala de nó local diferente de Main_M4_D_0 no m4_fps_pack.glb
    if (mName.includes('Mag1_M4')) {
      geom.scale(4.25, 4.14, 4.14);
    }

    geom.translate(offset[0], offset[1], offset[2]);
    geom.scale(scale, scale, scale);
    if (rotY !== 0) {
      geom.rotateY(rotY);
    }
    if (rotX !== 0) {
      geom.rotateX(rotX);
    }
    geom.computeBoundingSphere();

    const mats = Array.isArray(srcMesh.material)
      ? srcMesh.material
      : [srcMesh.material];
    mats.forEach((m) => {
      const std = m as THREE.MeshStandardMaterial;
      if (std && std.map) {
        std.map.colorSpace = THREE.SRGBColorSpace;
      }
    });

    const staticMesh = new THREE.Mesh(geom, srcMesh.material);
    staticMesh.castShadow = false;
    staticMesh.receiveShadow = false;
    staticMesh.frustumCulled = false;
    template.add(staticMesh);
  });

  return template;
}

function populateMountWithRealGlb(mount: THREE.Group, weaponId: WeaponId): boolean {
  const key: WeaponId =
    weaponId === 'SNIPER_BOLT' ? 'SNIPER_TACTICAL' : weaponId;
  const tpl = glbWeaponTemplates.get(key) || glbWeaponTemplates.get('AK47_RIFLE');
  if (!tpl || tpl.children.length === 0) return false;

  while (mount.children.length > 0) {
    mount.remove(mount.children[0]);
  }
  const instance = tpl.clone();
  mount.add(instance);
  return true;
}

export function preloadRealBotWeaponGlbs(): void {
  if (preloadStarted) return;
  preloadStarted = true;

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

  // Coordenadas calibradas para que (0,0,0) seja o centro exato do Pistol Grip (mão direita)
  // e (0,0,+0.29) passe exatamente pelo centro do Guarda-Mão frontal (mão esquerda).
  const specs: Array<{
    id: WeaponId;
    url: string;
    filter: (mName: string, nName: string) => boolean;
    offset: [number, number, number];
    scale: number;
    rotX: number;
    rotY?: number;
  }> = [
    {
      id: 'AK47_RIFLE',
      url: '/models/fps_ak47.glb',
      filter: (m, n) =>
        m.includes('AK-47') ||
        m.includes('CARGADOR') ||
        n.includes('Object_14') ||
        n.includes('Object_15') ||
        n.includes('Object_17') ||
        n.includes('Object_18'),
      offset: [12.9, -138.5, -21.0],
      scale: 0.011,
      rotX: 0.28,
      rotY: 0,
    },
    {
      id: 'M4_CARBINE',
      url: '/models/m4_fps_pack.glb',
      filter: (m, n) =>
        m.includes('Main_M4') ||
        m.includes('Mag1_M4') ||
        m.includes('Trigger_M4') ||
        m.includes('BoltCatch_M4') ||
        m.includes('Safety_M4') ||
        n.includes('Main_M4'),
      offset: [5.65, -136.5, -4.5],
      scale: 0.011,
      rotX: 0.29,
      rotY: 0,
    },
    {
      id: 'SNIPER_TACTICAL',
      url: '/models/sniper_fps_animation.glb',
      filter: (m, n) =>
        m.includes('BODY_sniper') ||
        m.includes('SCOPE_sniper') ||
        n.includes('Object_64') ||
        n.includes('Object_66'),
      offset: [-0.01, 0.015, -0.04],
      scale: 1.05,
      rotX: 0.19,
      rotY: Math.PI,
    },
    {
      id: 'P50_PISTOL',
      url: '/models/mark_23_animated.glb',
      filter: (m, n) =>
        m.includes('Mark23') ||
        n.includes('Object_9') ||
        n.includes('Object_10') ||
        n.includes('Object_11'),
      offset: [10.7, -142.5, 2.5],
      scale: 0.012,
      rotX: 0.18,
      rotY: 0,
    },
  ];

  specs.forEach((spec) => {
    loader.load(
      spec.url,
      (gltf) => {
        const tpl = buildStaticMeshFromGlb(
          gltf.scene,
          spec.filter,
          spec.offset,
          spec.scale,
          spec.rotX,
          spec.rotY ?? 0
        );
        if (tpl.children.length > 0) {
          glbWeaponTemplates.set(spec.id, tpl);
          if (spec.id === 'SNIPER_TACTICAL') {
            glbWeaponTemplates.set('SNIPER_BOLT', tpl);
          }
          for (let i = pendingWeaponMounts.length - 1; i >= 0; i--) {
            const item = pendingWeaponMounts[i];
            if (
              item.weaponId === spec.id ||
              (spec.id === 'SNIPER_TACTICAL' && item.weaponId === 'SNIPER_BOLT')
            ) {
              if (populateMountWithRealGlb(item.group, item.weaponId)) {
                pendingWeaponMounts.splice(i, 1);
              }
            }
          }
        }
      },
      undefined,
      () => {}
    );
  });
}

export function createBotThirdPersonWeaponMesh(
  weaponId: WeaponId | undefined,
  _isAlly: boolean
): THREE.Group {
  ensureSharedWeaponProps();
  preloadRealBotWeaponGlbs();

  const chosen: WeaponId = weaponId || 'AK47_RIFLE';
  const group = new THREE.Group();
  group.name = 'BotWorldWeapon';

  if (populateMountWithRealGlb(group, chosen)) {
    return group;
  }

  // Fallback imediato (alinhado com origem 0,0,0 no Pistol Grip e +0.29m no Guarda-Mão)
  const isAk = chosen === 'AK47_RIFLE';
  const isSniper = chosen === 'SNIPER_BOLT' || chosen === 'SNIPER_TACTICAL';

  const grip = new THREE.Mesh(sharedRifleGripGeo!, sharedGunMetalMat!);
  grip.position.set(0, 0, 0);
  grip.rotation.x = -0.22;
  group.add(grip);

  const receiver = new THREE.Mesh(sharedRifleReceiverGeo!, sharedGunMetalMat!);
  receiver.position.set(0, 0.045, 0.14);
  receiver.rotation.x = 0.16;
  group.add(receiver);

  const barrel = new THREE.Mesh(sharedRifleBarrelGeo!, sharedGunMetalMat!);
  barrel.position.set(0, 0.015, isSniper ? 0.42 : 0.36);
  barrel.rotation.x = 0.16;
  if (isSniper) barrel.scale.set(1, 1, 1.35);
  group.add(barrel);

  const mag = new THREE.Mesh(
    sharedRifleMagGeo!,
    isAk ? sharedWoodAccentMat! : sharedGunMetalMat!
  );
  mag.position.set(0, -0.055, 0.16);
  mag.rotation.x = isAk ? 0.38 : 0.22;
  group.add(mag);

  const stock = new THREE.Mesh(
    sharedRifleStockGeo!,
    isAk ? sharedWoodAccentMat! : sharedGunMetalMat!
  );
  stock.position.set(0, 0.075, -0.12);
  stock.rotation.x = 0.16;
  group.add(stock);

  pendingWeaponMounts.push({ group, weaponId: chosen });
  return group;
}

function getOrResolveFingerBones(
  rHandBone: THREE.Object3D,
  lHandBone: THREE.Object3D
): HandFingerCache {
  const existing = rHandBone.userData?.fingerGripCache as HandFingerCache | undefined;
  if (existing) return existing;

  const rMiddle1 = rHandBone.getObjectByName('mixamorigRightHandMiddle1') || rHandBone;
  const rThumb2 = rHandBone.getObjectByName('mixamorigRightHandThumb2') || rMiddle1;
  const lIndex2 =
    lHandBone.getObjectByName('mixamorigLeftHandIndex2') ||
    lHandBone.getObjectByName('mixamorigLeftHandIndex1') ||
    lHandBone;
  const lMiddle2 =
    lHandBone.getObjectByName('mixamorigLeftHandMiddle2') ||
    lHandBone.getObjectByName('mixamorigLeftHandMiddle1') ||
    lHandBone;
  const lThumb2 = lHandBone.getObjectByName('mixamorigLeftHandThumb2') || lMiddle2;

  const cache: HandFingerCache = { rMiddle1, rThumb2, lIndex2, lMiddle2, lThumb2 };
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
