import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WeaponId } from '../types/game';

let sharedRifleBarrelGeo: THREE.BoxGeometry | null = null;
let sharedRifleReceiverGeo: THREE.BoxGeometry | null = null;
let sharedRifleMagGeo: THREE.BoxGeometry | null = null;
let sharedRifleStockGeo: THREE.BoxGeometry | null = null;
let sharedGunMetalMat: THREE.MeshStandardMaterial | null = null;
let sharedWoodAccentMat: THREE.MeshStandardMaterial | null = null;

const glbWeaponTemplates = new Map<WeaponId, THREE.Group>();
const pendingWeaponMounts: Array<{ group: THREE.Group; weaponId: WeaponId }> = [];
let preloadStarted = false;

export function ensureSharedWeaponProps(): void {
  if (sharedRifleReceiverGeo) return;
  sharedRifleReceiverGeo = new THREE.BoxGeometry(0.048, 0.075, 0.32);
  sharedRifleBarrelGeo = new THREE.BoxGeometry(0.022, 0.022, 0.36);
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
    geom.translate(offset[0], offset[1], offset[2]);
    geom.scale(scale, scale, scale);
    if (rotY !== 0) {
      geom.rotateY(rotY);
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

  const specs: Array<{
    id: WeaponId;
    url: string;
    filter: (mName: string, nName: string) => boolean;
    offset: [number, number, number];
    scale: number;
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
      offset: [12.9, -142.0, -14.0],
      scale: 0.011,
      rotY: 0,
    },
    {
      id: 'M4_CARBINE',
      url: '/models/m4_fps_pack.glb',
      filter: (m, n) =>
        m.includes('Main_M4') ||
        m.includes('Trigger_M4') ||
        m.includes('BoltCatch_M4') ||
        m.includes('Safety_M4') ||
        n.includes('Main_M4'),
      offset: [6.0, -143.0, -10.0],
      scale: 0.011,
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
      offset: [-0.01, -0.01, 0.14],
      scale: 1.05,
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
      offset: [10.7, -145.0, -2.0],
      scale: 0.012,
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

  // Fallback imediato enquanto o GLB carrega em background
  const isAk = chosen === 'AK47_RIFLE';
  const isSniper = chosen === 'SNIPER_BOLT' || chosen === 'SNIPER_TACTICAL';

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

  pendingWeaponMounts.push({ group, weaponId: chosen });
  return group;
}
