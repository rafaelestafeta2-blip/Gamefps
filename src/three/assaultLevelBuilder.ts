import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WeaponId } from '../types/game';
import {
  openAssaultDoorsAndVents,
  optimizeAssaultBakedMaterial,
} from './assaultMapModifiers';
import { Dust2TriangleCollider, LadderZone } from './dust2Collider';
import { Dust2LevelBundle } from './dust2LevelBuilder';
import { TacticalTargetEntity } from './levelBuilder';
import { YardBotEntity } from './yardPropsBuilder';

const ASSAULT_LOCAL_URL = '/models/maps/cs_assault.glb';
const ASSAULT_REMOTE_FALLBACK_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/5ac523ea15e25fb19a05b1c1396f3daa0f71da64/Mapas/cs_assault_with_real_light.glb';

export const ASSAULT_ATTACKER_SPAWN = new THREE.Vector3(-26.7, 0.0, 36.7);
export const ASSAULT_SPAWN_YAW = 0;
export const ASSAULT_DEFENDER_SPAWN = new THREE.Vector3(-2.3, 0.0, 6.9);
export const ASSAULT_BOMB_SITE_A = new THREE.Vector3(-22.9, 0.0, 11.6);
export const ASSAULT_BOMB_SITE_B = new THREE.Vector3(-2.3, 0.0, 6.9);

/**
 * Calibrated 3D climbable ladders in Counter-Strike cs_assault.glb.
 * Every `maxY` matches the exact walkable platform/roof elevation so climbing
 * stops cleanly at the platform and never launches the player through a ceiling or roof.
 */
export const ASSAULT_LADDER_ZONES: LadderZone[] = [
  { id: 'front_roof_ladder', minX: -18.55, maxX: -16.85, minY: 0.0, maxY: 9.42, minZ: 16.1, maxZ: 17.85 },
  { id: 'backdoor_roof_ladder', minX: 17.25, maxX: 18.95, minY: 0.0, maxY: 10.92, minZ: 10.45, maxZ: 12.25 },
  { id: 'sniper_tower_ladder', minX: 16.75, maxX: 18.45, minY: 0.0, maxY: 12.82, minZ: 44.1, maxZ: 45.8 },
  { id: 'bridge_north_ladder', minX: -57.7, maxX: -56.0, minY: 0.0, maxY: 5.18, minZ: 46.7, maxZ: 48.1 },
  { id: 'bridge_south_ladder', minX: -57.7, maxX: -56.0, minY: 0.0, maxY: 5.18, minZ: 49.8, maxZ: 51.2 },
  { id: 'west_van_ladder_1', minX: -31.2, maxX: -29.6, minY: 0.0, maxY: 3.15, minZ: -0.4, maxZ: 0.95 },
  { id: 'west_van_ladder_2', minX: -31.4, maxX: -29.7, minY: 0.0, maxY: 3.22, minZ: 8.3, maxZ: 10.1 },
  { id: 'ct_car_ladder_1', minX: 6.6, maxX: 8.8, minY: 0.0, maxY: 2.65, minZ: 44.9, maxZ: 49.3 },
  { id: 'ct_car_ladder_2', minX: 10.8, maxX: 12.4, minY: 0.0, maxY: 3.62, minZ: 46.5, maxZ: 47.9 },
  { id: 'interior_catwalk_ladder', minX: -9.2, maxX: -7.5, minY: 0.0, maxY: 6.42, minZ: 12.1, maxZ: 13.8 },
  { id: 'interior_east_ladder', minX: 10.4, maxX: 12.1, minY: 0.0, maxY: 7.62, minZ: 13.1, maxZ: 15.8 },
  { id: 'vent_roof_south_ladder', minX: -0.85, maxX: 0.85, minY: 10.7, maxY: 12.35, minZ: -0.75, maxZ: 1.35 },
  { id: 'vent_roof_mid_ladder', minX: -1.15, maxX: 0.75, minY: 10.7, maxY: 12.35, minZ: -7.1, maxZ: -5.35 },
  { id: 'vent_interior_hostage_ladder', minX: -0.85, maxX: 0.85, minY: 3.0, maxY: 10.92, minZ: -14.45, maxZ: -12.95 },
];

export function getAssaultCalloutForPos(x: number, y: number, z: number): string {
  if (y >= 10.5 && x >= -1.2 && x <= 1.2 && z >= -14.5 && z <= 1.5) {
    return 'DUTO DE VENTILAÇÃO (AIR VENTS)';
  }
  if (y >= 8.2 && x >= -18.5 && x <= 18.5 && z >= -17.0 && z <= 16.5) {
    return 'TELHADO DO GALPÃO (WAREHOUSE ROOF)';
  }
  if (z > 30.0 && y > 2.2) return 'VIADUTO SUPERIOR (HIGHWAY BRIDGE)';
  if (z > 28.0) return 'RUA TRASEIRA / CARRO CT (BACK STREET)';
  if (x < -30.0) return 'SETOR OESTE / FURGÃO SWAT (WEST STREET)';
  if (x >= -30.0 && x < -14.0 && z >= 0.0 && z <= 28.0) {
    return 'BOMBA A (PÁTIO DOS CONTÊINERES)';
  }
  if (x > 16.5 && z >= -4.0 && z <= 28.0) return 'PORTA DOS FUNDOS / BECO LESTE (BACKDOOR)';
  if (x >= -17.5 && x <= 17.5 && z <= 15.5) {
    return y > 2.2
      ? 'SALA DE REFÉNS / PASSARELA SUPERIOR (UPPER CATWALK)'
      : 'BOMBA B (INTERIOR DO GALPÃO ASSAULT)';
  }
  return 'SETOR TÁTICO CS_ASSAULT';
}

export function buildAssaultLevel(isSoftwareGl: boolean): Dust2LevelBundle {
  const levelGroup = new THREE.Group();
  levelGroup.name = 'AssaultLevelRoot';

  const shootableMeshes: THREE.Mesh[] = [];
  const targets: TacticalTargetEntity[] = [];
  const collider = new Dust2TriangleCollider();

  addAssaultBombSiteBeacon(levelGroup, ASSAULT_BOMB_SITE_A, 'A', 0xdc2626);
  addAssaultBombSiteBeacon(levelGroup, ASSAULT_BOMB_SITE_B, 'B', 0x0284c7);
  spawnAssaultSquads(levelGroup, targets, shootableMeshes, isSoftwareGl);

  return {
    levelGroup,
    colliders: [],
    targets,
    shootableMeshes,
    wallStandPositions: [
      new THREE.Vector3(-26.7, 0.0, 36.7),
      new THREE.Vector3(-2.3, 0.0, 6.9),
    ],
    collider,
    mapGeometryGroup: null,
    isLoaded: false,
  };
}

export async function loadAssaultMapGeometry(
  bundle: Dust2LevelBundle,
  _isSoftwareGl: boolean,
  loadingManager: THREE.LoadingManager,
  onByteProgress?: (ratio0to1: number) => void
): Promise<void> {
  if (bundle.isLoaded && bundle.mapGeometryGroup && bundle.collider.ready) {
    onByteProgress?.(1.0);
    return;
  }

  disposeAssaultMapGeometry(bundle);

  const dracoLoader = new DRACOLoader(loadingManager);
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  dracoLoader.preload();

  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.setDRACOLoader(dracoLoader);

  const loadWithFallback = (url: string): Promise<{ scene: THREE.Group }> =>
    new Promise((resolve, reject) => {
      gltfLoader.load(
        url,
        (loaded) => resolve(loaded),
        (evt) => {
          if (evt.lengthComputable && evt.total > 0) {
            onByteProgress?.(Math.min(1, evt.loaded / evt.total));
          }
        },
        (err) => reject(err)
      );
    });

  try {
    let gltf: { scene: THREE.Group };
    try {
      gltf = await loadWithFallback(ASSAULT_LOCAL_URL);
    } catch {
      gltf = await loadWithFallback(ASSAULT_REMOTE_FALLBACK_URL);
    }

    const modelRoot = gltf.scene;
    modelRoot.position.set(0, 0, 0);
    modelRoot.rotation.set(0, 0, 0);
    modelRoot.scale.set(1, 1, 1);

    modelRoot.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) {
        node.position.set(0, 0, 0);
        node.rotation.set(0, 0, 0);
        node.scale.set(1, 1, 1);
        node.updateMatrix();
      }
    });

    const mapTransformGroup = new THREE.Group();
    mapTransformGroup.name = 'AssaultNormalizedGeometry';
    mapTransformGroup.rotation.set(-Math.PI / 2, 0, 0);
    mapTransformGroup.scale.setScalar(0.025);
    mapTransformGroup.position.set(0, -40.488, 0);
    mapTransformGroup.add(modelRoot);

    mapTransformGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.userData.isEnvironment = true;

        const oldMats = Array.isArray(child.material)
          ? child.material
          : [child.material];
        const optimizedMats = oldMats.map(optimizeAssaultBakedMaterial);

        child.material =
          optimizedMats.length === 1 ? optimizedMats[0] : optimizedMats;
        bundle.shootableMeshes.push(child);
      }
    });

    bundle.levelGroup.add(mapTransformGroup);
    bundle.levelGroup.updateMatrixWorld(true);
    bundle.mapGeometryGroup = mapTransformGroup;

    openAssaultDoorsAndVents(mapTransformGroup, bundle.levelGroup);

    bundle.collider.buildFromGroup(mapTransformGroup, ASSAULT_LADDER_ZONES);

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

export function disposeAssaultMapGeometry(bundle: Dust2LevelBundle): void {
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

function addAssaultBombSiteBeacon(
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

function spawnAssaultSquads(
  levelGroup: THREE.Group,
  targets: TacticalTargetEntity[],
  shootableMeshes: THREE.Mesh[],
  isSoftwareGl: boolean
): void {
  const spawnBot = (opts: {
    id: string; x: number; y: number; z: number; isAlly: boolean;
    callsign: string; weaponId: WeaponId; patrolAxis?: 'X' | 'Z' | 'NONE';
    patrolRange?: number; patrolSpeed?: number; hasArmor?: boolean;
  }) => {
    const root = new THREE.Group();
    root.position.set(opts.x, opts.y, opts.z);
    const pivotGroup = new THREE.Group();
    root.add(pivotGroup);

    const matSuit = new THREE.MeshStandardMaterial({ color: opts.isAlly ? 0x1e3a5f : 0x5c2828, roughness: 0.72, metalness: 0.18 });
    const matHead = new THREE.MeshStandardMaterial({ color: opts.isAlly ? 0x0f172a : 0x2a1212, roughness: 0.55, metalness: 0.25 });

    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.68, 0.2), matSuit);
    legs.position.set(0, 0.34, 0);
    pivotGroup.add(legs);

    const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.76, 0.24), matSuit);
    torsoMesh.position.set(0, 1.06, 0);
    torsoMesh.castShadow = !isSoftwareGl;
    pivotGroup.add(torsoMesh);

    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.24), matHead);
    headMesh.position.set(0, 1.64, 0);
    headMesh.castShadow = !isSoftwareGl;
    pivotGroup.add(headMesh);

    const visorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.04), new THREE.MeshBasicMaterial({ color: opts.isAlly ? 0x38bdf8 : 0xf59e0b }));
    visorMesh.position.set(0, 1.66, 0.12);
    pivotGroup.add(visorMesh);

    let armorMesh: THREE.Mesh | undefined;
    if (opts.hasArmor) {
      armorMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.48, 0.06),
        new THREE.MeshStandardMaterial({ color: opts.isAlly ? 0x38bdf8 : 0xf59e0b, metalness: 0.75, roughness: 0.3 })
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

      const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1.64, 0.12), new THREE.Vector3(0, 1.4, 14)]);
      laserLine = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.75 }));
      laserLine.visible = false;
      pivotGroup.add(laserLine);
    }

    levelGroup.add(root);
    targets.push({
      id: opts.id, type: 'COMBAT_BOT', sector: 'KILLHOUSE', root, pivotGroup, headMesh, torsoMesh, armorMesh, visorMesh, laserLine,
      basePosition: new THREE.Vector3(opts.x, opts.y, opts.z), patrolOffset: Math.random() * Math.PI * 2,
      patrolSpeed: opts.patrolSpeed ?? 1.0, patrolAxis: opts.patrolAxis ?? 'X', patrolRange: opts.patrolRange ?? 2.2,
      maxHealth: 100, health: 100, armorHealth: opts.hasArmor ? 60 : 0, isDown: false, downTimer: 0,
      hitTiltAngle: 0, hitTiltVelocity: 0, canShootBack: !opts.isAlly, windupTimer: 0,
      cooldownTimer: 1.4 + Math.random() * 1.5, isTelegraphing: false,
      isAlly: opts.isAlly, callsign: opts.callsign, team: opts.isAlly ? 'VANGUARD' : 'BLACKTHORN', weaponId: opts.weaponId,
    } as YardBotEntity);
  };

  // 5 Defensores Blackthorn — Nascem juntos na Base Interna do Galpão e se espalham para defender Bombs A e B
  spawnBot({ id: 'assault_bt_siteA', callsign: 'KRAKEN-BT', weaponId: 'AK47_RIFLE', x: -5.5, y: 0.0, z: 6.5, isAlly: false, patrolAxis: 'X', patrolRange: 2.5, hasArmor: true });
  spawnBot({ id: 'assault_bt_dock', callsign: 'WRAITH-BT', weaponId: 'SNIPER_BOLT', x: 1.2, y: 0.0, z: 6.5, isAlly: false, patrolAxis: 'X', patrolRange: 2.8, hasArmor: true });
  spawnBot({ id: 'assault_bt_siteB', callsign: 'HAVOC-BT', weaponId: 'AK47_RIFLE', x: -2.3, y: 0.0, z: 4.2, isAlly: false, patrolAxis: 'Z', patrolRange: 2.6, hasArmor: true });
  spawnBot({ id: 'assault_bt_catwalk', callsign: 'SERAPH-BT', weaponId: 'M4_CARBINE', x: -6.2, y: 0.0, z: 4.2, isAlly: false, patrolAxis: 'X', patrolRange: 2.0, hasArmor: true });
  spawnBot({ id: 'assault_bt_east', callsign: 'VOLT-BT', weaponId: 'P50_PISTOL', x: 2.2, y: 0.0, z: 4.2, isAlly: false, patrolAxis: 'Z', patrolRange: 2.8, hasArmor: true });

  // 4 Aliados Vanguard — Nascem juntos ao lado do jogador na Rua de Spawn igual CS
  spawnBot({ id: 'assault_vg_1', callsign: 'RECON-02', weaponId: 'SNIPER_BOLT', x: -24.2, y: 0.0, z: 36.2, isAlly: true, patrolAxis: 'X', patrolRange: 2.2, hasArmor: true });
  spawnBot({ id: 'assault_vg_2', callsign: 'STRIKER-03', weaponId: 'AK47_RIFLE', x: -29.2, y: 0.0, z: 36.2, isAlly: true, patrolAxis: 'Z', patrolRange: 3.2, hasArmor: true });
  spawnBot({ id: 'assault_vg_3', callsign: 'LIFELINE-04', weaponId: 'M4_CARBINE', x: -25.0, y: 0.0, z: 39.0, isAlly: true, patrolAxis: 'X', patrolRange: 2.8 });
  spawnBot({ id: 'assault_vg_4', callsign: 'WARDEN-05', weaponId: 'SMG_MP5', x: -28.4, y: 0.0, z: 39.0, isAlly: true, patrolAxis: 'Z', patrolRange: 3.0 });
}

