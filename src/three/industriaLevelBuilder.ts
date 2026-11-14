import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WeaponId } from '../types/game';
import { Dust2TriangleCollider } from './dust2Collider';
import { Dust2LevelBundle } from './dust2LevelBuilder';
import { TacticalTargetEntity } from './levelBuilder';
import { YardBotEntity } from './yardPropsBuilder';

/** Optimized V6 Industrial Map (Map_v1) — 2K JPEG + Draco. */
const INDUSTRIA_LOCAL_URL = '/models/maps/industria_2k.glb';
const DRACO_DECODER_PATH =
  'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';

/**
 * Unity Map_v1 parent offset + floor lift so asphalt/road planes sit near y≈0.
 * Source AABB y≈[-13.18, 8.42]; lift brings walkable floors to ~0.3–2.3m.
 */
export const INDUSTRIA_FLOOR_Y_LIFT = 13.18;

/** Vanguard attackers — south road apron, facing north into the yard. */
export const INDUSTRIA_ATTACKER_SPAWN = new THREE.Vector3(12.0, 1.85, -40.0);
export const INDUSTRIA_SPAWN_YAW = 0;
/** Blackthorn defenders — north hangar apron. */
export const INDUSTRIA_DEFENDER_SPAWN = new THREE.Vector3(-5.0, 2.0, 48.0);
/** Bomb A — container cluster mid-yard. */
export const INDUSTRIA_BOMB_SITE_A = new THREE.Vector3(-12.0, 3.3, 0.0);
/** Bomb B — central hangar court. */
export const INDUSTRIA_BOMB_SITE_B = new THREE.Vector3(33.6, 2.2, 28.0);

export function getIndustriaCalloutForPos(
  x: number,
  y: number,
  z: number
): string {
  if (z < -45) return 'APRON SUL (SOUTH ROAD)';
  if (z > 45) return 'HANGARES NORTE (NORTH HANGARS)';
  if (x < -25) return 'SETOR OESTE / TANQUES (WEST TANKS)';
  if (x > 70) return 'SETOR LESTE / PÁTIO (EAST YARD)';
  if (x >= -20 && x <= 5 && z >= -10 && z <= 15) {
    return 'BOMBA A (CONTÊINERES)';
  }
  if (x >= 20 && x <= 50 && z >= 15 && z <= 40) {
    return 'BOMBA B (PÁTIO DOS HANGARES)';
  }
  if (y > 5.5) return 'TELHADO / ESTRUTURA ALTA (ROOFTOP)';
  return 'PÁTIO INDUSTRIAL (INDUSTRIA)';
}

export function buildIndustriaLevel(
  isSoftwareGl: boolean
): Dust2LevelBundle {
  const levelGroup = new THREE.Group();
  levelGroup.name = 'IndustriaLevelRoot';

  const shootableMeshes: THREE.Mesh[] = [];
  const targets: TacticalTargetEntity[] = [];
  const collider = new Dust2TriangleCollider();

  const hemi = new THREE.HemisphereLight(0xdbeafe, 0x4b5563, 0.85);
  levelGroup.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff1e0, 1.15);
  sun.position.set(40, 55, -25);
  sun.target.position.set(20, 2, 0);
  sun.castShadow = false;
  levelGroup.add(sun);
  levelGroup.add(sun.target);

  addIndustriaBombSiteBeacon(levelGroup, INDUSTRIA_BOMB_SITE_A, 'A', 0xdc2626);
  addIndustriaBombSiteBeacon(levelGroup, INDUSTRIA_BOMB_SITE_B, 'B', 0x0284c7);
  spawnIndustriaSquads(levelGroup, targets, shootableMeshes, isSoftwareGl);

  return {
    levelGroup,
    colliders: [],
    targets,
    shootableMeshes,
    wallStandPositions: [
      INDUSTRIA_ATTACKER_SPAWN.clone(),
      INDUSTRIA_DEFENDER_SPAWN.clone(),
    ],
    collider,
    mapGeometryGroup: null,
    isLoaded: false,
  };
}

export async function loadIndustriaMapGeometry(
  bundle: Dust2LevelBundle,
  isSoftwareGl: boolean,
  loadingManager: THREE.LoadingManager,
  onByteProgress?: (ratio0to1: number) => void
): Promise<void> {
  if (bundle.isLoaded && bundle.mapGeometryGroup && bundle.collider.ready) {
    onByteProgress?.(1.0);
    return;
  }

  disposeIndustriaMapGeometry(bundle);

  const dracoLoader = new DRACOLoader(loadingManager);
  dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
  dracoLoader.preload();

  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.setDRACOLoader(dracoLoader);

  try {
    const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
      gltfLoader.load(
        INDUSTRIA_LOCAL_URL,
        (loaded) => resolve(loaded),
        (evt) => {
          if (evt.lengthComputable && evt.total > 0) {
            onByteProgress?.(Math.min(1, evt.loaded / evt.total));
          }
        },
        (err) => reject(err)
      );
    });

    const modelRoot = gltf.scene;
    modelRoot.name = 'IndustriaGLB';

    const mapTransformGroup = new THREE.Group();
    mapTransformGroup.name = 'IndustriaNormalizedGeometry';
    // Meter-scale Unity export; lift floors to playable y≈0.
    mapTransformGroup.position.set(0, INDUSTRIA_FLOOR_Y_LIFT, 0);
    mapTransformGroup.add(modelRoot);

    mapTransformGroup.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = false;
      child.receiveShadow = !isSoftwareGl;
      child.frustumCulled = true;
      child.userData.isEnvironment = true;

      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];
      mats.forEach((m) => {
        const std = m as THREE.MeshStandardMaterial;
        if (!std) return;
        if (std.map) {
          std.map.colorSpace = THREE.SRGBColorSpace;
          std.map.anisotropy = isSoftwareGl ? 1 : 4;
          std.map.needsUpdate = true;
        }
        std.roughness = Math.max(0.55, std.roughness ?? 0.72);
        std.metalness = Math.min(0.35, std.metalness ?? 0.08);
        std.envMapIntensity = 0.75;
        std.side = THREE.FrontSide;
        // Lattice fence bits need double-sided.
        if ((child.name || '').toLowerCase().includes('lattice')) {
          std.side = THREE.DoubleSide;
        }
      });
    });

    bundle.levelGroup.add(mapTransformGroup);
    bundle.levelGroup.updateMatrixWorld(true);
    bundle.mapGeometryGroup = mapTransformGroup;

    bundle.collider.buildFromGroup(mapTransformGroup, []);

    for (let i = 0; i < bundle.targets.length; i++) {
      const bot = bundle.targets[i];
      const exactY = bundle.collider.getGroundHeight(
        bot.basePosition.x,
        bot.basePosition.y,
        bot.basePosition.z
      );
      bot.basePosition.y = exactY;
      bot.root.position.y = exactY;
    }

    bundle.isLoaded = true;
    onByteProgress?.(1.0);
  } finally {
    dracoLoader.dispose();
  }
}

export function disposeIndustriaMapGeometry(bundle: Dust2LevelBundle): void {
  if (bundle.mapGeometryGroup) {
    bundle.mapGeometryGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        const mats = Array.isArray(child.material)
          ? child.material
          : child.material
            ? [child.material]
            : [];
        mats.forEach((m) => {
          const basic = m as THREE.MeshBasicMaterial;
          if (basic.map) basic.map.dispose();
          m.dispose();
        });
      }
    });
    bundle.levelGroup.remove(bundle.mapGeometryGroup);
    bundle.mapGeometryGroup = null;
  }

  for (let i = bundle.shootableMeshes.length - 1; i >= 0; i--) {
    if (bundle.shootableMeshes[i].userData?.isEnvironment) {
      bundle.shootableMeshes.splice(i, 1);
    }
  }

  bundle.collider.clear();
  bundle.isLoaded = false;
}

function addIndustriaBombSiteBeacon(
  levelGroup: THREE.Group,
  pos: THREE.Vector3,
  siteLabel: 'A' | 'B',
  colorHex: number
): void {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.1, 2.45, 24),
    new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.78,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(pos.x, pos.y + 0.05, pos.z);
  ring.userData.ignoreCollider = true;
  levelGroup.add(ring);

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = siteLabel === 'A' ? '#dc2626' : '#0284c7';
  ctx.beginPath();
  ctx.arc(64, 64, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 66px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(siteLabel, 64, 68);

  const badgeTex = new THREE.CanvasTexture(canvas);
  badgeTex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 1.3),
    new THREE.MeshBasicMaterial({
      map: badgeTex,
      transparent: true,
      side: THREE.DoubleSide,
    })
  );
  sign.position.set(pos.x, pos.y + 2.35, pos.z);
  sign.userData.ignoreCollider = true;
  levelGroup.add(sign);
}

function spawnIndustriaSquads(
  levelGroup: THREE.Group,
  targets: TacticalTargetEntity[],
  shootableMeshes: THREE.Mesh[],
  isSoftwareGl: boolean
): void {
  const spawnBot = (opts: {
    id: string;
    x: number;
    y: number;
    z: number;
    isAlly: boolean;
    callsign: string;
    weaponId: WeaponId;
    patrolAxis?: 'X' | 'Z' | 'NONE';
    patrolRange?: number;
    patrolSpeed?: number;
    hasArmor?: boolean;
  }) => {
    const root = new THREE.Group();
    root.position.set(opts.x, opts.y, opts.z);
    const pivotGroup = new THREE.Group();
    root.add(pivotGroup);

    const matSuit = new THREE.MeshStandardMaterial({
      color: opts.isAlly ? 0x1e3a5f : 0x5c2828,
      roughness: 0.72,
      metalness: 0.18,
    });
    const matHead = new THREE.MeshStandardMaterial({
      color: opts.isAlly ? 0x0f172a : 0x2a1212,
      roughness: 0.55,
      metalness: 0.25,
    });

    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.68, 0.2), matSuit);
    legs.position.set(0, 0.34, 0);
    pivotGroup.add(legs);

    const torsoMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.76, 0.24),
      matSuit
    );
    torsoMesh.position.set(0, 1.06, 0);
    torsoMesh.castShadow = !isSoftwareGl;
    pivotGroup.add(torsoMesh);

    const headMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.3, 0.24),
      matHead
    );
    headMesh.position.set(0, 1.64, 0);
    headMesh.castShadow = !isSoftwareGl;
    pivotGroup.add(headMesh);

    const visorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.06, 0.04),
      new THREE.MeshBasicMaterial({
        color: opts.isAlly ? 0x38bdf8 : 0xf59e0b,
      })
    );
    visorMesh.position.set(0, 1.66, 0.12);
    pivotGroup.add(visorMesh);

    let armorMesh: THREE.Mesh | undefined;
    if (opts.hasArmor) {
      armorMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.48, 0.06),
        new THREE.MeshStandardMaterial({
          color: opts.isAlly ? 0x38bdf8 : 0xf59e0b,
          metalness: 0.75,
          roughness: 0.3,
        })
      );
      armorMesh.position.set(0, 1.1, 0.14);
      if (!opts.isAlly) {
        armorMesh.userData.targetId = opts.id;
        armorMesh.userData.hitZone = 'ARMOR';
        shootableMeshes.push(armorMesh);
      }
      pivotGroup.add(armorMesh);
    }

    let laserLine: THREE.Line | undefined;
    if (!opts.isAlly) {
      torsoMesh.userData.targetId = opts.id;
      torsoMesh.userData.hitZone = 'TORSO_A';
      headMesh.userData.targetId = opts.id;
      headMesh.userData.hitZone = 'HEAD';
      shootableMeshes.push(torsoMesh, headMesh);

      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 1.64, 0.12),
        new THREE.Vector3(0, 1.4, 14),
      ]);
      laserLine = new THREE.Line(
        lineGeo,
        new THREE.LineBasicMaterial({
          color: 0xef4444,
          transparent: true,
          opacity: 0.75,
        })
      );
      laserLine.visible = false;
      pivotGroup.add(laserLine);
    }

    levelGroup.add(root);
    targets.push({
      id: opts.id,
      type: 'COMBAT_BOT',
      sector: 'KILLHOUSE',
      root,
      pivotGroup,
      headMesh,
      torsoMesh,
      armorMesh,
      visorMesh,
      laserLine,
      basePosition: new THREE.Vector3(opts.x, opts.y, opts.z),
      patrolOffset: Math.random() * Math.PI * 2,
      patrolSpeed: opts.patrolSpeed ?? 1.0,
      patrolAxis: opts.patrolAxis ?? 'X',
      patrolRange: opts.patrolRange ?? 2.2,
      maxHealth: 100,
      health: 100,
      armorHealth: opts.hasArmor ? 60 : 0,
      isDown: false,
      downTimer: 0,
      hitTiltAngle: 0,
      hitTiltVelocity: 0,
      canShootBack: !opts.isAlly,
      windupTimer: 0,
      cooldownTimer: 1.4 + Math.random() * 1.5,
      isTelegraphing: false,
      isAlly: opts.isAlly,
      callsign: opts.callsign,
      team: opts.isAlly ? 'VANGUARD' : 'BLACKTHORN',
      weaponId: opts.weaponId,
    } as YardBotEntity);
  };

  // Blackthorn — defend hangar court / site B
  spawnBot({
    id: 'ind_bt_siteB',
    callsign: 'KRAKEN-BT',
    weaponId: 'AK47_RIFLE',
    x: 30.0,
    y: 2.2,
    z: 26.0,
    isAlly: false,
    patrolAxis: 'X',
    patrolRange: 3.0,
    hasArmor: true,
  });
  spawnBot({
    id: 'ind_bt_hangar',
    callsign: 'WRAITH-BT',
    weaponId: 'SNIPER_BOLT',
    x: -4.0,
    y: 2.0,
    z: 50.0,
    isAlly: false,
    patrolAxis: 'Z',
    patrolRange: 2.5,
    hasArmor: true,
  });
  spawnBot({
    id: 'ind_bt_siteA',
    callsign: 'HAVOC-BT',
    weaponId: 'AK47_RIFLE',
    x: -10.0,
    y: 3.3,
    z: 2.0,
    isAlly: false,
    patrolAxis: 'X',
    patrolRange: 2.8,
    hasArmor: true,
  });
  spawnBot({
    id: 'ind_bt_mid',
    callsign: 'SERAPH-BT',
    weaponId: 'M4_CARBINE',
    x: 20.0,
    y: 2.0,
    z: 5.0,
    isAlly: false,
    patrolAxis: 'Z',
    patrolRange: 3.2,
    hasArmor: true,
  });
  spawnBot({
    id: 'ind_bt_east',
    callsign: 'VOLT-BT',
    weaponId: 'P50_PISTOL',
    x: 55.0,
    y: 2.0,
    z: -20.0,
    isAlly: false,
    patrolAxis: 'X',
    patrolRange: 2.6,
    hasArmor: true,
  });

  // Vanguard allies — south apron with player
  spawnBot({
    id: 'ind_vg_1',
    callsign: 'RECON-02',
    weaponId: 'SNIPER_BOLT',
    x: 9.0,
    y: 1.85,
    z: -38.0,
    isAlly: true,
    patrolAxis: 'X',
    patrolRange: 2.2,
    hasArmor: true,
  });
  spawnBot({
    id: 'ind_vg_2',
    callsign: 'STRIKER-03',
    weaponId: 'AK47_RIFLE',
    x: 15.0,
    y: 1.85,
    z: -38.0,
    isAlly: true,
    patrolAxis: 'Z',
    patrolRange: 2.8,
    hasArmor: true,
  });
  spawnBot({
    id: 'ind_vg_3',
    callsign: 'LIFELINE-04',
    weaponId: 'M4_CARBINE',
    x: 10.0,
    y: 1.85,
    z: -42.0,
    isAlly: true,
    patrolAxis: 'X',
    patrolRange: 2.5,
  });
  spawnBot({
    id: 'ind_vg_4',
    callsign: 'WARDEN-05',
    weaponId: 'SMG_MP5',
    x: 14.5,
    y: 1.85,
    z: -42.0,
    isAlly: true,
    patrolAxis: 'Z',
    patrolRange: 2.8,
  });
}
