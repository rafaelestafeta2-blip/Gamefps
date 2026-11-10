import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Dust2TriangleCollider, LadderZone } from './dust2Collider';
import { Dust2LevelBundle } from './dust2LevelBuilder';
import { TacticalTargetEntity } from './levelBuilder';
import { WeaponId } from '../types/game';
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
 * All 13 climbable 3D ladders in Counter-Strike cs_assault_with_real_light.glb:
 * - Warehouse Roof Ladders (Front Courtyard & East Backdoor Alley)
 * - Rooftop & Interior Air Vent Ladders (Entradas de Ar)
 * - Interior Warehouse Catwalk & Upper Hostage Ladders
 * - Outer Street Sniper Tower, Highway Bridge, SWAT Van & CT Car Ladders
 */
export const ASSAULT_LADDER_ZONES: LadderZone[] = [
  { id: 'front_roof_ladder', minX: -18.55, maxX: -16.85, minY: 0.0, maxY: 9.85, minZ: 16.1, maxZ: 17.85 },
  { id: 'backdoor_roof_ladder', minX: 17.25, maxX: 18.95, minY: 0.0, maxY: 10.35, minZ: 10.45, maxZ: 12.25 },
  { id: 'sniper_tower_ladder', minX: 16.75, maxX: 18.45, minY: 0.0, maxY: 13.3, minZ: 44.1, maxZ: 45.8 },
  { id: 'bridge_north_ladder', minX: -57.7, maxX: -56.0, minY: 0.0, maxY: 5.5, minZ: 46.7, maxZ: 48.1 },
  { id: 'bridge_south_ladder', minX: -57.7, maxX: -56.0, minY: 0.0, maxY: 5.5, minZ: 49.8, maxZ: 51.2 },
  { id: 'west_van_ladder_1', minX: -31.2, maxX: -29.6, minY: 0.0, maxY: 3.5, minZ: -0.4, maxZ: 0.95 },
  { id: 'west_van_ladder_2', minX: -31.4, maxX: -29.7, minY: 0.0, maxY: 3.9, minZ: 8.3, maxZ: 10.1 },
  { id: 'ct_car_ladder_1', minX: 6.6, maxX: 8.8, minY: 0.0, maxY: 3.1, minZ: 44.9, maxZ: 49.3 },
  { id: 'ct_car_ladder_2', minX: 10.8, maxX: 12.4, minY: 0.0, maxY: 4.4, minZ: 46.5, maxZ: 47.9 },
  { id: 'interior_catwalk_ladder', minX: -9.2, maxX: -7.5, minY: 0.0, maxY: 6.75, minZ: 12.1, maxZ: 13.8 },
  { id: 'interior_east_ladder', minX: 10.4, maxX: 12.1, minY: 0.0, maxY: 8.55, minZ: 13.1, maxZ: 15.8 },
  { id: 'vent_roof_south_ladder', minX: -0.85, maxX: 0.85, minY: 10.7, maxY: 13.15, minZ: -0.75, maxZ: 1.35 },
  { id: 'vent_roof_mid_ladder', minX: -1.15, maxX: 0.75, minY: 10.7, maxY: 13.45, minZ: -7.1, maxZ: -5.35 },
  { id: 'vent_interior_hostage_ladder', minX: -0.85, maxX: 0.85, minY: 3.0, maxY: 11.35, minZ: -14.45, maxZ: -12.95 },
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

/**
 * Removes closed door slabs (Backdoor "porta dos fundos", Interior Hostage Doors, West Gate)
 * and opens the vertical Air Vent shaft between Upper Hostage Room (Y=3.2m) and Vent Duct (Y=10.9m),
 * while placing a visually swung-open 3D door leaf at the Backdoor and 3D ladder rungs in the vent shaft.
 */
function openAssaultDoorsAndVents(mapTransformGroup: THREE.Group): void {
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();

  mapTransformGroup.updateMatrixWorld(true);

  mapTransformGroup.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.geometry) return;
    const geom = child.geometry as THREE.BufferGeometry;
    const posAttr = geom.attributes.position;
    const indexAttr = geom.index;
    if (!posAttr || !indexAttr) return;

    const matWorld = child.matrixWorld;
    const triCount = Math.floor(indexAttr.count / 3);
    const keptIndices: number[] = [];
    let removedCount = 0;

    for (let i = 0; i < triCount; i++) {
      const i0 = indexAttr.getX(i * 3);
      const i1 = indexAttr.getX(i * 3 + 1);
      const i2 = indexAttr.getX(i * 3 + 2);

      v0.fromBufferAttribute(posAttr, i0).applyMatrix4(matWorld);
      v1.fromBufferAttribute(posAttr, i1).applyMatrix4(matWorld);
      v2.fromBufferAttribute(posAttr, i2).applyMatrix4(matWorld);

      const minX = Math.min(v0.x, v1.x, v2.x);
      const maxX = Math.max(v0.x, v1.x, v2.x);
      const minY = Math.min(v0.y, v1.y, v2.y);
      const maxY = Math.max(v0.y, v1.y, v2.y);
      const minZ = Math.min(v0.z, v1.z, v2.z);
      const maxZ = Math.max(v0.z, v1.z, v2.z);

      // 1. Backdoor ("porta dos fundos") at East Warehouse Wall: X in [17.24, 17.56], Y in [0, 2.42], Z in [-0.68, 0.98]
      const isBackdoorSlab =
        minX >= 17.24 && maxX <= 17.56 && minY >= -0.05 && maxY <= 2.42 && minZ >= -0.68 && maxZ <= 0.98;

      // 2. Interior Lower & Upper Hostage Room Doors (Mesh[8])
      const isLowerHostageDoor =
        minX >= 11.15 && maxX <= 12.85 && minY >= 0.75 && maxY <= 3.25 && minZ >= -13.55 && maxZ <= -13.35;
      const isUpperHostageDoor =
        minX >= 10.35 && maxX <= 11.25 && minY >= 3.15 && maxY <= 6.45 && minZ >= -14.32 && maxZ <= -13.38;
      const isMidControlDoor =
        minX >= 7.15 && maxX <= 9.65 && minY >= 0.75 && maxY <= 3.25 && minZ >= -6.32 && maxZ <= -4.98 && maxZ - minZ < 0.25;

      // 3. Interior Hostage Room to Air Vent Shaft Blocker (allows climbing from Y=3.20 up to Y=10.90 Air Vent)
      const isVentShaftBlocker =
        minX >= -0.85 &&
        maxX <= 0.85 &&
        minY >= 3.18 &&
        maxY <= 8.45 &&
        minZ >= -14.32 &&
        maxZ <= -13.38 &&
        (maxY - minY > 0.2 || maxZ - minZ > 0.2);

      // 4. West Courtyard Gate next to SWAT Van / Car (opens passage to West Back Street X < -30.5)
      const isWestCarGate =
        minX >= -30.9 && maxX <= -30.35 && minY >= 0.0 && maxY <= 3.25 && minZ >= 4.45 && maxZ <= 8.85;

      if (
        isBackdoorSlab ||
        isLowerHostageDoor ||
        isUpperHostageDoor ||
        isMidControlDoor ||
        isVentShaftBlocker ||
        isWestCarGate
      ) {
        removedCount++;
        continue;
      }

      keptIndices.push(i0, i1, i2);
    }

    if (removedCount > 0) {
      geom.setIndex(keptIndices);
      geom.computeBoundingBox();
      geom.computeBoundingSphere();
    }
  });

  // Add visually swung-open Backdoor leaf & Interior Vent Shaft ladder rungs (in world space wrapper)
  const propsGroup = new THREE.Group();
  propsGroup.name = 'AssaultOpenDoorsAndLadders';
  // Invert parent transform (scale 0.025, rotX -PI/2, posY -40.488) by attaching directly to levelGroup in loadAssaultMapGeometry
  mapTransformGroup.userData.openPropsBuilder = (levelGroup: THREE.Group) => {
    const doorMat = new THREE.MeshBasicMaterial({ color: 0x475569 });
    const openDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.52, 2.36, 0.08), doorMat);
    openDoorMesh.position.set(16.45, 1.18, -0.62);
    openDoorMesh.rotation.y = 0.12;
    openDoorMesh.userData.ignoreCollider = true;
    levelGroup.add(openDoorMesh);

    // Add visible 3D ladder rails & rungs from Upper Hostage Room (Y=3.20) to Air Vent (Y=10.90) at X=0, Z=-13.50
    const rungMat = new THREE.MeshBasicMaterial({ color: 0x64748b });
    for (let y = 3.5; y <= 8.5; y += 0.4) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.04, 0.04), rungMat);
      rung.position.set(0.0, y, -13.5);
      rung.userData.ignoreCollider = true;
      levelGroup.add(rung);
    }
  };
}

export async function loadAssaultMapGeometry(
  bundle: Dust2LevelBundle,
  isSoftwareGl: boolean,
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

    // Keep native KHR_materials_unlit (MeshBasicMaterial) with baked radiosity lightmaps for 60 FPS mobile performance
    mapTransformGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.userData.isEnvironment = true;

        const oldMats = Array.isArray(child.material) ? child.material : [child.material];
        const optimizedMats = oldMats.map((m) => {
          const srcMat = m as THREE.MeshBasicMaterial & THREE.MeshStandardMaterial;
          const tex = srcMat?.map || null;
          if (tex) {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = isSoftwareGl ? 1 : 4;
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.generateMipmaps = true;
            tex.needsUpdate = true;
          }

          if (m instanceof THREE.MeshBasicMaterial) {
            m.side = THREE.DoubleSide;
            return m;
          }

          const basicMat = new THREE.MeshBasicMaterial({
            name: m?.name || 'assault_baked_light',
            map: tex,
            color: srcMat?.color ? srcMat.color.clone() : new THREE.Color(0xffffff),
            side: THREE.DoubleSide,
            transparent: Boolean(srcMat?.transparent),
            opacity: srcMat?.opacity ?? 1.0,
            alphaTest: srcMat?.alphaTest ?? 0,
          });
          m?.dispose();
          return basicMat;
        });

        child.material = optimizedMats.length === 1 ? optimizedMats[0] : optimizedMats;
        bundle.shootableMeshes.push(child);
      }
    });

    bundle.levelGroup.add(mapTransformGroup);
    bundle.levelGroup.updateMatrixWorld(true);
    bundle.mapGeometryGroup = mapTransformGroup;

    // Open closed doors (Backdoor, Hostage Doors, West Gate) & Air Vent shaft before building collider
    openAssaultDoorsAndVents(mapTransformGroup);
    if (typeof mapTransformGroup.userData.openPropsBuilder === 'function') {
      mapTransformGroup.userData.openPropsBuilder(bundle.levelGroup);
    }

    // Build spatial hash collider with all 14 climbable CS_ASSAULT ladders registered
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

    const suitColor = opts.isAlly ? 0x1e3a5f : 0x5c2828;
    const headColor = opts.isAlly ? 0x0f172a : 0x2a1212;
    const matSuit = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.72, metalness: 0.18 });
    const matHead = new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.55, metalness: 0.25 });

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

    const visorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.06, 0.04),
      new THREE.MeshBasicMaterial({ color: opts.isAlly ? 0x38bdf8 : 0xf59e0b })
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
        new THREE.LineBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.75 })
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

  spawnBot({ id: 'assault_bt_siteA', callsign: 'KRAKEN-BT', weaponId: 'AK47_RIFLE', x: -21.1, y: 0.0, z: 6.0, isAlly: false, patrolAxis: 'X', patrolRange: 2.5, hasArmor: true });
  spawnBot({ id: 'assault_bt_dock', callsign: 'WRAITH-BT', weaponId: 'SNIPER_BOLT', x: -8.7, y: 0.0, z: 22.0, isAlly: false, patrolAxis: 'X', patrolRange: 2.8, hasArmor: true });
  spawnBot({ id: 'assault_bt_siteB', callsign: 'HAVOC-BT', weaponId: 'AK47_RIFLE', x: 3.5, y: 0.0, z: 6.9, isAlly: false, patrolAxis: 'Z', patrolRange: 2.6, hasArmor: true });
  spawnBot({ id: 'assault_bt_catwalk', callsign: 'SERAPH-BT', weaponId: 'M4_CARBINE', x: -9.7, y: 3.2, z: -6.9, isAlly: false, patrolAxis: 'X', patrolRange: 2.0, hasArmor: true });
  spawnBot({ id: 'assault_bt_east', callsign: 'VOLT-BT', weaponId: 'P50_PISTOL', x: 17.8, y: 0.0, z: 5.5, isAlly: false, patrolAxis: 'Z', patrolRange: 2.8, hasArmor: true });

  spawnBot({ id: 'assault_vg_1', callsign: 'RECON-02', weaponId: 'SNIPER_BOLT', x: -40.3, y: 3.73, z: 36.7, isAlly: true, patrolAxis: 'X', patrolRange: 2.2, hasArmor: true });
  spawnBot({ id: 'assault_vg_2', callsign: 'STRIKER-03', weaponId: 'AK47_RIFLE', x: -36.0, y: 0.0, z: 13.3, isAlly: true, patrolAxis: 'Z', patrolRange: 3.2, hasArmor: true });
  spawnBot({ id: 'assault_vg_3', callsign: 'LIFELINE-04', weaponId: 'M4_CARBINE', x: -14.3, y: 0.0, z: 23.9, isAlly: true, patrolAxis: 'X', patrolRange: 2.8 });
  spawnBot({ id: 'assault_vg_4', callsign: 'WARDEN-05', weaponId: 'M4_CARBINE', x: 8.5, y: 0.0, z: 42.0, isAlly: true, patrolAxis: 'Z', patrolRange: 3.0 });
}
