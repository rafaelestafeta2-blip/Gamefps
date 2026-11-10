import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WeaponId } from '../types/game';
import {
  ColliderBox,
  TacticalLevelData,
  TacticalTargetEntity,
} from './levelBuilder';
import { populateStanderTiroTargetsAndArmory } from './paperTargetBuilder';
import { buildStanderObstacleHall } from './standerObstacleHallBuilder';
import { applyDarkTacticalMaterialsToStanderGlb } from './standerRangeTextures';

const STANDER_TIRO_LOCAL_URL = '/models/maps/stander_tiro.glb';
const STANDER_TIRO_FALLBACK_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/8ba3c98c7d38867616940c3f9bc3ac39e73988e6/Mapas/ImageToStl.com_Stander_tiro.glb';
const DRACO_DECODER_PATH =
  'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

export const STANDER_TIRO_SPAWN = new THREE.Vector3(-6.2, 0, 2.8);
export const STANDER_TIRO_SPAWN_YAW = 0;

export interface StanderTiroBundle extends TacticalLevelData {
  glbRoot: THREE.Group;
  isLoaded: boolean;
}

/**
 * Widens the existing doorway cutout in `Range_44` at Z = -1.37m from X = [-8.03, -7.08]
 * to X = [-8.75, -7.08] so the player can walk/sprint smoothly into the Obstacle Hall.
 */
function widenStanderGlbSideDoorway(mesh: THREE.Mesh): void {
  const geom = mesh.geometry;
  const posAttr = geom?.attributes?.position as THREE.BufferAttribute | undefined;
  if (!posAttr) return;

  mesh.updateWorldMatrix(true, false);
  const worldMat = mesh.matrixWorld;
  const invWorldMat = worldMat.clone().invert();
  const v = new THREE.Vector3();

  let modified = false;
  for (let i = 0; i < posAttr.count; i++) {
    v.fromBufferAttribute(posAttr, i).applyMatrix4(worldMat);
    if (
      v.z < -1.1 &&
      v.z > -1.65 &&
      v.y < 2.22 &&
      v.x >= -8.72 &&
      v.x <= -7.85
    ) {
      v.x = -8.75;
      v.applyMatrix4(invWorldMat);
      posAttr.setXYZ(i, v.x, v.y, v.z);
      modified = true;
    }
  }

  if (modified) {
    posAttr.needsUpdate = true;
    geom.computeVertexNormals();
  }
}

/**
 * Builds the Stander de Tiro (`ImageToStl.com_Stander_tiro.glb`) level bundle,
 * optimized for 60 FPS mobile performance (zero PointLight shader loops, shared geometry).
 */
export function buildStanderTiroLevel(isSoftwareGl: boolean): StanderTiroBundle {
  const levelGroup = new THREE.Group();
  levelGroup.name = 'StanderTiroLevel';

  const glbRoot = new THREE.Group();
  glbRoot.name = 'StanderTiroGLBRoot';
  levelGroup.add(glbRoot);

  const colliders: ColliderBox[] = [];
  const targets: TacticalTargetEntity[] = [];
  const shootableMeshes: THREE.Mesh[] = [];
  const wallStandPositions: THREE.Vector3[] = [
    new THREE.Vector3(-6.2, 0, 6.4),
    new THREE.Vector3(-11.4, 0, 3.0),
  ];

  const addCollider = (
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    minZ: number,
    maxZ: number
  ) => {
    colliders.push({ minX, maxX, minY, maxY, minZ, maxZ });
  };

  // 1. Room Perimeter Walls & Firing Line Counter Colliders
  addCollider(-12.2, -8.75, 0, 3.2, -1.65, -1.22);
  addCollider(-7.0, 26.2, 0, 3.2, -1.65, -1.22);

  addCollider(-12.2, 26.2, 0, 3.2, 6.68, 7.1);
  addCollider(-12.2, -11.72, 0, 3.2, -1.6, 7.0);
  addCollider(25.5, 26.2, 0, 3.2, -1.6, 7.0);

  // Firing Line Counter across the 5 Shooting Booths (X = -4.52 to -4.18)
  addCollider(-4.52, -4.18, 0, 2.6, -1.35, 6.8);

  // 6 Thin Booth Dividers
  const boothDividerZs = [-0.97, 0.53, 2.02, 3.52, 5.02, 6.54];
  boothDividerZs.forEach((zPos) => {
    addCollider(-5.08, -4.2, 0, 2.4, zPos - 0.05, zPos + 0.05);
  });

  // Prep Room Tables & Glass Partition
  addCollider(-8.88, -7.9, 0, 0.85, 1.48, 3.94);
  addCollider(-8.88, -7.9, 0, 0.85, 4.15, 6.6);
  addCollider(-9.08, -8.92, 0, 2.3, 1.32, 4.12);
  addCollider(-10.1, -9.1, 0, 0.85, 1.42, 3.9);

  // Invisible raycast floor & backstop
  const floorRayMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 10),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  floorRayMesh.rotation.x = -Math.PI / 2;
  floorRayMesh.position.set(7.0, 0.01, 2.75);
  floorRayMesh.userData.isEnvironment = true;
  levelGroup.add(floorRayMesh);
  shootableMeshes.push(floorRayMesh);

  // 2. Iluminação Tática Premium com Contraste Realista (Sem saturação branca e com profundidade de sombras)
  const rangeHemiFill = new THREE.HemisphereLight(0x334155, 0x0f172a, 0.75);
  rangeHemiFill.position.set(0, 3.5, 0);
  levelGroup.add(rangeHemiFill);

  // Foco linear quente (3500K) sobre as bancadas e baias de tiro
  const overheadLight = new THREE.DirectionalLight(0xffedd5, 1.15);
  overheadLight.position.set(-6, 3.8, 3.0);
  overheadLight.castShadow = false;
  levelGroup.add(overheadLight);

  // Iluminação direcionada suave ao longo das raias até os alvos
  const downrangeLight = new THREE.DirectionalLight(0x94a3b8, 0.7);
  downrangeLight.position.set(12, 3.8, 3.0);
  downrangeLight.castShadow = false;
  levelGroup.add(downrangeLight);

  // 3. Populate Hanging Paper Bullseye Targets (Static + Moving) & Quick Armory Rack
  populateStanderTiroTargetsAndArmory(
    levelGroup,
    targets,
    shootableMeshes,
    isSoftwareGl
  );

  // 4. Build Connected Obstacle Course Hall (Jump, Crouch, Slide) via Left Doorway
  buildStanderObstacleHall(
    levelGroup,
    colliders,
    targets,
    shootableMeshes,
    isSoftwareGl
  );

  return {
    levelGroup,
    glbRoot,
    colliders,
    targets,
    shootableMeshes,
    wallStandPositions,
    isLoaded: false,
  };
}

/**
 * Loads `/models/maps/stander_tiro.glb` (with GitHub raw fallback), hides the 13,860-vertex
 * static ceiling rails (`targ1_46`), applies shared fast tactical materials, and tags weapon plaques.
 */
export async function loadStanderTiroMapGeometry(
  bundle: StanderTiroBundle,
  _isSoftwareGl: boolean,
  loadingManager?: THREE.LoadingManager
): Promise<void> {
  if (bundle.isLoaded) return;

  const dracoLoader = new DRACOLoader(loadingManager);
  dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
  dracoLoader.setDecoderConfig({ type: 'js' });

  const loader = new GLTFLoader(loadingManager);
  loader.setDRACOLoader(dracoLoader);

  const loadFromUrl = (url: string) =>
    new Promise<THREE.Group>((resolve, reject) => {
      loader.load(
        url,
        (gltf) => resolve(gltf.scene),
        undefined,
        (err) => reject(err)
      );
    });

  let gltfScene: THREE.Group;
  try {
    gltfScene = await loadFromUrl(STANDER_TIRO_LOCAL_URL);
  } catch {
    gltfScene = await loadFromUrl(STANDER_TIRO_FALLBACK_URL);
  } finally {
    dracoLoader.dispose();
  }

  gltfScene.scale.setScalar(100);
  gltfScene.rotation.y = Math.PI;
  gltfScene.position.set(4.9, -0.19, -0.26);
  gltfScene.updateMatrixWorld(true);

  applyDarkTacticalMaterialsToStanderGlb(gltfScene);

  const wallPlaqueWeapons: Record<string, WeaponId> = {
    WeaponImage01_4__1__2: 'AK47_RIFLE',
    WeaponImage01_3__1__7: 'SNIPER_BOLT',
    WeaponImage01_2_4: 'M4_CARBINE',
    WeaponImage01_1_36: 'CARBINE_AR',
    WeaponImage01_3_50: 'SNIPER_TACTICAL',
    WeaponImage01_5_8: 'SMG_45',
    WeaponImage01_5__1__38: 'L49_LMG',
    WeaponImage01_7_28: 'P50_PISTOL',
    WeaponImage01_6_37: 'KNIFE_TACTICAL',
    WeaponImage01_7__1__32: 'P50_PISTOL',
    WeaponImage01_6__1__6: 'KNIFE_TACTICAL',
  };

  gltfScene.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    // Hide interior doors (`Door02*`) and the heavy 13,860-vertex static target rail mesh (`targ1_46`)
    if (mesh.name.startsWith('Door02') || mesh.name.startsWith('targ1')) {
      mesh.visible = false;
      return;
    }

    if (mesh.name === 'Range_44') {
      widenStanderGlbSideDoorway(mesh);
    }

    const mappedWeapon = wallPlaqueWeapons[mesh.name];
    if (mappedWeapon) {
      mesh.userData.wallWeaponId = mappedWeapon;
      bundle.shootableMeshes.push(mesh);
    } else if (
      mesh.name.startsWith('Range') ||
      mesh.name.startsWith('StandPlace') ||
      mesh.name.startsWith('Borders')
    ) {
      mesh.userData.isEnvironment = true;
      bundle.shootableMeshes.push(mesh);
    }
  });

  bundle.glbRoot.add(gltfScene);
  bundle.isLoaded = true;
}
