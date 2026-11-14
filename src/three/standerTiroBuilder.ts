import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  ColliderBox,
  TacticalLevelData,
  TacticalTargetEntity,
} from './levelBuilder';
import { populateStanderTiroTargetsAndArmory } from './paperTargetBuilder';
import { buildStanderObstacleHall } from './standerObstacleHallBuilder';

/** Optimized V5 FAB shooting range (2K JPEG + Draco). */
const STANDER_TIRO_LOCAL_URL = '/models/maps/shooting_range_2k.glb';
const DRACO_DECODER_PATH =
  'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

/** Lift so floor planes (~y=-1.16) sit at world y=0. */
export const STANDER_FLOOR_Y_LIFT = 1.164;

/** Spawn in lane 3 booth, facing downrange (-Z). */
export const STANDER_TIRO_SPAWN = new THREE.Vector3(2.1, 0, -4.15);
export const STANDER_TIRO_SPAWN_YAW = 0;

export interface StanderTiroBundle extends TacticalLevelData {
  glbRoot: THREE.Group;
  isLoaded: boolean;
}

/**
 * Builds FREE_RANGE around the optimized `shooting_range_2k.glb` footprint:
 * X ≈ [-4.1, 12.3], Z ≈ [-37.7, 1.9] after floor lift.
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
    new THREE.Vector3(0.4, 0, -3.6),
    new THREE.Vector3(5.6, 0, -3.6),
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

  // Perimeter walls (left / right / back / downrange backstop).
  addCollider(-4.2, -3.85, 0, 4.2, -37.8, 1.95);
  addCollider(12.0, 12.35, 0, 4.2, -37.8, 1.95);
  addCollider(-4.2, 12.35, 0, 4.2, 1.72, 2.05);
  addCollider(-4.2, 12.35, 0, 4.2, -37.85, -36.65);

  // Side wall segment with exit doorway gap at z ≈ [-2.56, -1.33].
  addCollider(-4.2, -3.85, 0, 4.2, -37.8, -2.6);
  addCollider(-4.2, -3.85, 0, 4.2, -1.3, 1.95);
  // Door lintel
  addCollider(-4.2, -3.85, 2.35, 4.2, -2.6, -1.3);

  // Booth divider walls (7 lanes / 8 dividers).
  const boothXs = [
    -2.21, -0.46, 1.29, 3.04, 4.79, 6.54, 8.29, 9.99,
  ];
  boothXs.forEach((x) => {
    addCollider(x - 0.09, x + 0.09, 0, 2.2, -7.2, -4.7);
  });

  // Firing-line counter / shooting place front edge.
  addCollider(-3.1, 10.2, 0, 1.15, -4.85, -4.55);

  // Prep-room wooden table.
  addCollider(-3.3, 1.9, 0, 0.9, 0.3, 1.5);

  // Weapon display wall (thin).
  addCollider(2.1, 7.4, 0, 2.4, 1.68, 1.82);

  // Invisible raycast floor covering the range + booths.
  const floorRayMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 42),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  floorRayMesh.rotation.x = -Math.PI / 2;
  floorRayMesh.position.set(4.0, 0.01, -18.0);
  floorRayMesh.userData.isEnvironment = true;
  levelGroup.add(floorRayMesh);
  shootableMeshes.push(floorRayMesh);

  const rangeHemiFill = new THREE.HemisphereLight(0xf8fafc, 0x64748b, 1.05);
  rangeHemiFill.position.set(4, 3.5, -10);
  levelGroup.add(rangeHemiFill);

  const overheadLight = new THREE.DirectionalLight(0xfffbeb, 0.95);
  overheadLight.position.set(4, 6.5, -2);
  overheadLight.castShadow = false;
  levelGroup.add(overheadLight);

  const downrangeLight = new THREE.DirectionalLight(0xe2e8f0, 0.85);
  downrangeLight.position.set(4, 6.0, -28);
  downrangeLight.castShadow = false;
  levelGroup.add(downrangeLight);

  populateStanderTiroTargetsAndArmory(
    levelGroup,
    targets,
    shootableMeshes,
    isSoftwareGl
  );

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
 * Loads optimized `shooting_range_2k.glb` (Draco). Meter-scale; lift floor to y=0.
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
  } finally {
    dracoLoader.dispose();
  }

  gltfScene.scale.setScalar(1);
  gltfScene.rotation.set(0, 0, 0);
  gltfScene.position.set(0, STANDER_FLOOR_Y_LIFT, 0);
  gltfScene.updateMatrixWorld(true);

  gltfScene.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;

    const name = mesh.name || '';
    // Built-in paper/rail targets stay visual; gameplay uses paperTargetBuilder hits.
    if (
      name.includes('Floor') ||
      name.includes('Wall') ||
      name.includes('BulletTrap') ||
      name.includes('ShootingPlace') ||
      name.includes('Concrete')
    ) {
      mesh.userData.isEnvironment = true;
      bundle.shootableMeshes.push(mesh);
    }

    if (name.includes('WeaponWall')) {
      mesh.userData.wallWeaponId = 'M4_CARBINE';
      bundle.shootableMeshes.push(mesh);
    }
  });

  bundle.glbRoot.add(gltfScene);
  bundle.isLoaded = true;
}
