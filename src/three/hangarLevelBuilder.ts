import * as THREE from 'three';
import { WeaponId } from '../types/game';
import { createGameGltfLoader, disposeGameGltfLoader, ensureMeshoptDecoder } from './gltfLoaderFactory';
import { Dust2TriangleCollider } from './dust2Collider';
import { Dust2LevelBundle, runExclusiveGlbLoad } from './dust2LevelBuilder';
import { TacticalTargetEntity } from './levelBuilder';
import { YardBotEntity } from './yardPropsBuilder';

/** Hangar — ETC1S GPU textures + Meshopt geometry. */
const HANGAR_LOCAL_URL = '/models/maps/hangar_2k.glb';

/**
 * angar.fbx floor sits near y≈0 (AABB y≈[-0.6, 27]). Small lift clears floor thickness.
 */
export const HANGAR_FLOOR_Y_LIFT = 0.6;

/** Vanguard attackers — south hangar entrance (inset for floor snap). */
/** Attacker spawn — Y = measured walkable floor at (0,-14) after FLOOR_Y_LIFT. */
export const HANGAR_ATTACKER_SPAWN = new THREE.Vector3(0.0, 0.6, -14.0);
/** Camera local -Z. π looks +Z into the hangar, not out the south gate. */
export const HANGAR_SPAWN_YAW = Math.PI;
/** Blackthorn defenders — north interior near office/room. */
export const HANGAR_DEFENDER_SPAWN = new THREE.Vector3(0.0, 0.2, 10.0);
/** Bomb A — container stack side. */
export const HANGAR_BOMB_SITE_A = new THREE.Vector3(-12.0, 0.15, 0.0);
/** Bomb B — opposite bay / truck side. */
export const HANGAR_BOMB_SITE_B = new THREE.Vector3(14.0, 0.15, 4.0);

export function getHangarCalloutForPos(
  x: number,
  y: number,
  z: number
): string {
  if (z < -14) return 'PORTÃO SUL (SOUTH GATE)';
  if (z > 10) return 'FUNDOS / SALA (BACK ROOM)';
  if (x < -8) return 'BAÍA OESTE / CONTÊINERES (WEST BAY)';
  if (x > 10) return 'BAÍA LESTE / CAMINHÃO (EAST BAY)';
  if (x >= -16 && x <= -6 && z >= -6 && z <= 6) {
    return 'BOMBA A (CONTÊINERES)';
  }
  if (x >= 8 && x <= 20 && z >= -2 && z <= 10) {
    return 'BOMBA B (PÁTIO LESTE)';
  }
  if (y > 8) return 'ESTRUTURA / TELHADO (ROOF STEEL)';
  return 'HANGAR INDUSTRIAL (ANGAR)';
}

/**
 * `ray` is a light-shaft card. Drawn as opaque it becomes black shards
 * across the bay and hides the containers behind it.
 */
function turnHangarLightShaft(mesh: THREE.Mesh): void {
  const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const next = list.map((m) => {
    const src = m as THREE.MeshStandardMaterial;
    const basic = new THREE.MeshBasicMaterial({
      map: src.map ?? null,
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: true,
    });
    if (basic.map) {
      basic.map.colorSpace = THREE.SRGBColorSpace;
      basic.map.needsUpdate = true;
    }
    src.map = null;
    src.dispose();
    return basic;
  });
  mesh.material = Array.isArray(mesh.material) ? next : next[0];
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.userData.ignoreCollider = true;
  mesh.userData.isEnvironment = true;
}

/**
 * Floor and roof albedos in the source file are solid black, so the bay
 * reads as an empty void. Drop that map and keep the normal.
 */
function restoreHangarMaterial(
  std: THREE.MeshStandardMaterial,
  isSoftwareGl: boolean
): void {
  if (!std) return;
  const matName = (std.name || '').toLowerCase();
  if (matName === 'floor' || matName === 'room_ceiling') {
    if (std.map) {
      std.map.dispose();
      std.map = null;
    }
    std.color.setHex(matName === 'floor' ? 0xc8c1b6 : 0x8e969e);
  } else if (std.map) {
    std.map.colorSpace = THREE.SRGBColorSpace;
    std.map.anisotropy = isSoftwareGl ? 1 : 8;
    std.map.needsUpdate = true;
  }
  if (std.normalMap) {
    std.normalMap.anisotropy = isSoftwareGl ? 1 : 8;
    std.normalMap.needsUpdate = true;
  }
  std.roughness = Math.max(0.5, std.roughness ?? 0.72);
  std.metalness = Math.min(0.35, std.metalness ?? 0.08);
  std.envMapIntensity = matName === 'floor' || matName === 'room_ceiling' ? 0.3 : 0.9;
  // Unity planes often wind downward. FrontSide then hides the floor from above.
  std.side = THREE.DoubleSide;
}

export function buildHangarLevel(
  isSoftwareGl: boolean
): Dust2LevelBundle {
  const levelGroup = new THREE.Group();
  levelGroup.name = 'HangarLevelRoot';

  const shootableMeshes: THREE.Mesh[] = [];
  const targets: TacticalTargetEntity[] = [];
  const collider = new Dust2TriangleCollider();

  // Concrete bounce, not a navy void. The scene sun still supplies the direction.
  const hemi = new THREE.HemisphereLight(0xfff6ea, 0x8a8176, 0.9);
  levelGroup.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff1e0, 1.2);
  sun.position.set(6, 28, -24);
  sun.target.position.set(0, 3, 8);
  sun.castShadow = false;
  levelGroup.add(sun);
  levelGroup.add(sun.target);

  addHangarBombSiteBeacon(levelGroup, HANGAR_BOMB_SITE_A, 'A', 0xdc2626);
  addHangarBombSiteBeacon(levelGroup, HANGAR_BOMB_SITE_B, 'B', 0x0284c7);
  spawnHangarSquads(levelGroup, targets, shootableMeshes, isSoftwareGl);

  return {
    levelGroup,
    colliders: [],
    targets,
    shootableMeshes,
    wallStandPositions: [
      HANGAR_ATTACKER_SPAWN.clone(),
      HANGAR_DEFENDER_SPAWN.clone(),
    ],
    collider,
    mapGeometryGroup: null,
    isLoaded: false,
  };
}

export async function loadHangarMapGeometry(
  bundle: Dust2LevelBundle,
  isSoftwareGl: boolean,
  loadingManager: THREE.LoadingManager,
  onByteProgress?: (ratio0to1: number) => void
): Promise<void> {
  await runExclusiveGlbLoad(bundle, async () => {
  disposeHangarMapGeometry(bundle);

  await ensureMeshoptDecoder();
  const gltfLoader = createGameGltfLoader(loadingManager);

  try {
    const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
      gltfLoader.load(
        HANGAR_LOCAL_URL,
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
    modelRoot.name = 'HangarGLB';

    const mapTransformGroup = new THREE.Group();
    mapTransformGroup.name = 'HangarNormalizedGeometry';
    // Meter-scale hangar; lift floor thickness to playable y≈0.
    mapTransformGroup.position.set(0, HANGAR_FLOOR_Y_LIFT, 0);
    mapTransformGroup.add(modelRoot);

    mapTransformGroup.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = false;
      child.receiveShadow = !isSoftwareGl;
      child.frustumCulled = false;
      child.userData.isEnvironment = true;

      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];
      if (
        mats.some(
          (m) =>
            child.name.toLowerCase() === 'ray' ||
            (m?.name || '').toLowerCase() === 'ray'
        )
      ) {
        turnHangarLightShaft(child);
        return;
      }
      mats.forEach((m) => {
        restoreHangarMaterial(m as THREE.MeshStandardMaterial, isSoftwareGl);
      });
    });

    bundle.levelGroup.add(mapTransformGroup);
    bundle.levelGroup.updateMatrixWorld(true);
    bundle.mapGeometryGroup = mapTransformGroup;

    bundle.collider.buildFromGroup(mapTransformGroup, []);

    for (let i = 0; i < bundle.targets.length; i++) {
      const bot = bundle.targets[i];
      const p = bundle.collider.findPlayableSpawn(
        bot.basePosition.x,
        bot.basePosition.z,
        bot.basePosition.y
      );
      bot.basePosition.set(p.x, p.y, p.z);
      bot.root.position.set(p.x, p.y, p.z);
    }

    bundle.isLoaded = true;
    onByteProgress?.(1.0);
  } finally {
    disposeGameGltfLoader(gltfLoader);
  }
  }, onByteProgress);
}

export function disposeHangarMapGeometry(bundle: Dust2LevelBundle): void {
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

function addHangarBombSiteBeacon(
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

function spawnHangarSquads(
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

  // Blackthorn — defend interior / bomb sites
  spawnBot({
    id: 'hng_bt_siteB',
    callsign: 'KRAKEN-BT',
    weaponId: 'AK47_RIFLE',
    x: 12.0,
    y: 0.15,
    z: 6.0,
    isAlly: false,
    patrolAxis: 'X',
    patrolRange: 3.0,
    hasArmor: true,
  });
  spawnBot({
    id: 'hng_bt_back',
    callsign: 'WRAITH-BT',
    weaponId: 'SNIPER_BOLT',
    x: -2.0,
    y: 0.15,
    z: 12.0,
    isAlly: false,
    patrolAxis: 'Z',
    patrolRange: 2.5,
    hasArmor: true,
  });
  spawnBot({
    id: 'hng_bt_siteA',
    callsign: 'HAVOC-BT',
    weaponId: 'AK47_RIFLE',
    x: -10.0,
    y: 0.15,
    z: 2.0,
    isAlly: false,
    patrolAxis: 'X',
    patrolRange: 2.8,
    hasArmor: true,
  });
  spawnBot({
    id: 'hng_bt_mid',
    callsign: 'SERAPH-BT',
    weaponId: 'M4_CARBINE',
    x: 4.0,
    y: 0.15,
    z: 2.0,
    isAlly: false,
    patrolAxis: 'Z',
    patrolRange: 3.2,
    hasArmor: true,
  });
  spawnBot({
    id: 'hng_bt_crane',
    callsign: 'VOLT-BT',
    weaponId: 'P50_PISTOL',
    x: 8.0,
    y: 0.15,
    z: -6.0,
    isAlly: false,
    patrolAxis: 'X',
    patrolRange: 2.6,
    hasArmor: true,
  });

  // Vanguard allies — south gate with player
  spawnBot({
    id: 'hng_vg_1',
    callsign: 'RECON-02',
    weaponId: 'SNIPER_BOLT',
    x: -2.5,
    y: 0.6,
    z: -8.0,
    isAlly: true,
    patrolAxis: 'X',
    patrolRange: 2.2,
    hasArmor: true,
  });
  spawnBot({
    id: 'hng_vg_2',
    callsign: 'STRIKER-03',
    weaponId: 'AK47_RIFLE',
    x: 2.5,
    y: 0.6,
    z: -8.0,
    isAlly: true,
    patrolAxis: 'Z',
    patrolRange: 2.8,
    hasArmor: true,
  });
  spawnBot({
    id: 'hng_vg_3',
    callsign: 'LIFELINE-04',
    weaponId: 'M4_CARBINE',
    x: -2.0,
    y: 0.6,
    z: -6.0,
    isAlly: true,
    patrolAxis: 'X',
    patrolRange: 2.5,
  });
  spawnBot({
    id: 'hng_vg_4',
    callsign: 'WARDEN-05',
    weaponId: 'SMG_MP5',
    x: 2.0,
    y: 0.6,
    z: -6.0,
    isAlly: true,
    patrolAxis: 'Z',
    patrolRange: 2.8,
  });
}
