import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Dust2TriangleCollider } from './dust2Collider';
import { TacticalLevelData, TacticalTargetEntity } from './levelBuilder';
import { WeaponId } from '../types/game';
import { YardBotEntity } from './yardPropsBuilder';

/**
 * Exact metric coordinates for Counter-Strike de_dust2_-_cs_map.glb
 * (Normalized with rotation.x = Math.PI, scale = 0.025, position.y = 4.80)
 */
export const DUST2_T_SPAWN = new THREE.Vector3(-16.25, 8.0, 18.75);
export const DUST2_T_SPAWN_YAW = -Math.PI / 2; // Facing East toward Long A / Mid Ramp
export const DUST2_CT_SPAWN = new THREE.Vector3(-6.25, 1.6, -56.25);
export const DUST2_BOMB_SITE_A = new THREE.Vector3(28.8, 7.2, -60.4);
export const DUST2_BOMB_SITE_B = new THREE.Vector3(-40.0, 4.8, -67.2);

export function getDust2CalloutForPos(x: number, y: number, z: number): string {
  if (z > 12.0 && x < 2.0) return 'BASE T (TR SPAWN · SUL)';
  if (x > 16.0 && z > -12.0) return 'FORA DO FUNDO (OUTSIDE LONG)';
  if (x > 26.0 && z <= -12.0 && z > -48.0) {
    return y < 2.2 ? 'FOSSO DO FUNDO (LONG PIT)' : 'FUNDO A (LONG A STREET)';
  }
  if (x > 16.0 && z <= -48.0) return 'BOMBA A (PLATAFORMA ALTA)';
  if (x >= -6.0 && x <= 16.0 && z <= -25.0 && z > -52.0 && y > 3.5) {
    return 'VARANDA / SHORT A (CATWALK)';
  }
  if (x >= -10.0 && x <= 14.0 && z <= -48.0 && y < 3.2) {
    return 'BASE CT (CT SPAWN · UNDERPASS)';
  }
  if (x >= -19.0 && x <= -2.0 && z > -46.0 && z <= 12.0) {
    return z < -30.0 ? 'PORTAS DO MEIO (MID DOORS)' : 'CORREDOR DO MEIO (MID ALLEY)';
  }
  if (x < -16.0 && z > -48.0 && z <= -10.0) {
    return y < 3.5 ? 'TÚNEL BAIXO (LOWER B TUNNELS)' : 'TÚNEL ESCURO (UPPER B TUNNELS)';
  }
  if (x < -22.0 && z <= -48.0) return 'BOMBA B (PÁTIO FECHADO)';
  return 'SETOR TÁTICO DE_DUST2';
}

export interface Dust2LevelBundle extends TacticalLevelData {
  collider: Dust2TriangleCollider;
  mapGeometryGroup: THREE.Group | null;
  isLoaded: boolean;
}

/**
 * Creates only the lightweight Dust2 container shell, lights, bomb beacons, and 5v5 bot rigs.
 * Does NOT download `/models/maps/de_dust2.glb` at boot time to keep Lobby RAM usage minimal.
 */
export function buildDust2Level(isSoftwareGl: boolean): Dust2LevelBundle {
  const levelGroup = new THREE.Group();
  levelGroup.name = 'Dust2LevelRoot';

  const shootableMeshes: THREE.Mesh[] = [];
  const targets: TacticalTargetEntity[] = [];
  const collider = new Dust2TriangleCollider();

  // High-fidelity desert sunlight for crisp contrast and warm Middle-Eastern stone rendering
  const sunFill = new THREE.HemisphereLight(0xfff7e6, 0x6e5944, 0.75);
  levelGroup.add(sunFill);

  const desertSun = new THREE.DirectionalLight(0xffeed8, 1.35);
  desertSun.position.set(45, 65, -30);
  desertSun.target.position.set(0, 4.8, -25);
  levelGroup.add(desertSun);
  levelGroup.add(desertSun.target);

  // Add 3D Bomb Site A & B Tactical Beacons
  addDust2BombSiteBeacon(levelGroup, DUST2_BOMB_SITE_A, 'A', 0xdc2626);
  addDust2BombSiteBeacon(levelGroup, DUST2_BOMB_SITE_B, 'B', 0x0284c7);

  // Spawn 5v5 Bots at verified Dust2 coordinates & elevations
  spawnDust2Squads(levelGroup, targets, shootableMeshes, isSoftwareGl);

  return {
    levelGroup,
    colliders: [],
    targets,
    shootableMeshes,
    wallStandPositions: [
      new THREE.Vector3(-16.25, 8.0, 18.75),
      new THREE.Vector3(-6.25, 1.6, -56.25),
    ],
    collider,
    mapGeometryGroup: null,
    isLoaded: false,
  };
}

/**
 * Loads `/models/maps/de_dust2.glb` on demand during Match Loading (`Loading 2`)
 * using a real `THREE.LoadingManager` + `GLTFLoader` + `DRACOLoader`, builds
 * `Box3` & triangle spatial colliders, and snaps all 5v5 bots to the floor.
 */
export async function loadDust2MapGeometry(
  bundle: Dust2LevelBundle,
  isSoftwareGl: boolean,
  loadingManager: THREE.LoadingManager,
  onByteProgress?: (ratio0to1: number) => void
): Promise<void> {
  if (bundle.isLoaded && bundle.mapGeometryGroup && bundle.collider.ready) {
    onByteProgress?.(1.0);
    return;
  }

  // Clean any partial state before loading
  disposeDust2MapGeometry(bundle);

  const dracoLoader = new DRACOLoader(loadingManager);
  dracoLoader.setDecoderPath(
    'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'
  );
  dracoLoader.preload();

  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.setDRACOLoader(dracoLoader);

  try {
    const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
      gltfLoader.load(
        '/models/maps/de_dust2.glb',
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

    // Reset baked Sketchfab translation ([0, 1008, 1232]) & non-metric scale (0.01333)
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

    // Apply exact metric CS scale (1 Hammer unit = 0.025m) and upright +Y orientation
    const mapTransformGroup = new THREE.Group();
    mapTransformGroup.name = 'Dust2NormalizedGeometry';
    mapTransformGroup.rotation.set(Math.PI, 0, 0);
    mapTransformGroup.scale.setScalar(0.025);
    mapTransformGroup.position.set(0, 4.8, 0);
    mapTransformGroup.add(modelRoot);

    mapTransformGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mats = Array.isArray(child.material)
          ? child.material
          : [child.material];
        const matName = mats[0]?.name || '';

        // Hide Source-engine black doorway void blocker quads (material_18 & material_3)
        if (matName === 'material_18' || matName === 'material_3') {
          child.visible = false;
          return;
        }

        child.castShadow = !isSoftwareGl;
        child.receiveShadow = !isSoftwareGl;
        child.userData.isEnvironment = true;

        mats.forEach((m) => {
          const std = m as THREE.MeshStandardMaterial;
          if (std && std.map) {
            std.map.colorSpace = THREE.SRGBColorSpace;
            std.map.anisotropy = isSoftwareGl ? 1 : 16;
            std.map.minFilter = THREE.LinearMipmapLinearFilter;
            std.map.magFilter = THREE.LinearFilter;
            std.map.generateMipmaps = true;
            std.map.needsUpdate = true;
          }
          if (std) {
            std.roughness = 0.74;
            std.metalness = 0.04;
            std.envMapIntensity = 0.8;
            std.side = THREE.DoubleSide;
            if (std.name === 'material_15' || std.name === 'material_25') {
              std.polygonOffset = true;
              std.polygonOffsetFactor = -1;
              std.polygonOffsetUnits = -1;
            }
          }
        });

        bundle.shootableMeshes.push(child);
      }
    });

    bundle.levelGroup.add(mapTransformGroup);
    bundle.levelGroup.updateMatrixWorld(true);
    bundle.mapGeometryGroup = mapTransformGroup;

    // Build Box3 bounds + 2D spatial hash triangle collider
    bundle.collider.buildFromGroup(mapTransformGroup);

    // Snap all 5v5 bots to exact floor triangle elevation
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

export function disposeDust2MapGeometry(bundle: Dust2LevelBundle): void {
  if (bundle.mapGeometryGroup) {
    bundle.mapGeometryGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        const mats = Array.isArray(child.material) ? child.material : child.material ? [child.material] : [];
        mats.forEach((m) => {
          const std = m as THREE.MeshStandardMaterial;
          if (std.map) std.map.dispose();
          if (std.normalMap) std.normalMap.dispose();
          if (std.roughnessMap) std.roughnessMap.dispose();
          if (std.metalnessMap) std.metalnessMap.dispose();
          if (std.aoMap) std.aoMap.dispose();
          if (std.emissiveMap) std.emissiveMap.dispose();
          if (std.bumpMap) std.bumpMap.dispose();
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

function addDust2BombSiteBeacon(
  levelGroup: THREE.Group,
  pos: THREE.Vector3,
  siteLabel: 'A' | 'B',
  colorHex: number
): void {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.1, 2.45, 28),
    new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: 0.78 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(pos.x, pos.y + 0.05, pos.z);
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
    new THREE.MeshBasicMaterial({ map: badgeTex, transparent: true, side: THREE.DoubleSide })
  );
  sign.position.set(pos.x, pos.y + 2.35, pos.z);
  levelGroup.add(sign);
}

function spawnDust2Squads(
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

    const matSuit = new THREE.MeshStandardMaterial({ color: opts.isAlly ? 0x927248 : 0x1e3a5f, roughness: 0.72, metalness: 0.18 });
    const matHead = new THREE.MeshStandardMaterial({ color: opts.isAlly ? 0x451a03 : 0x0f172a, roughness: 0.55, metalness: 0.25 });

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

  // 5 Counter-Terrorist Defenders (Blackthorn — Nascem juntos no CT Spawn igual CS e se espalham pros Bombs A/B/Meio)
  spawnBot({ id: 'dust2_ct_siteA', callsign: 'KRAKEN-BT', weaponId: 'AK47_RIFLE', x: -4.0, y: 1.6, z: -55.5, isAlly: false, patrolAxis: 'X', patrolRange: 2.2, hasArmor: true });
  spawnBot({ id: 'dust2_ct_longA', callsign: 'WRAITH-BT', weaponId: 'SNIPER_BOLT', x: -8.5, y: 1.6, z: -55.5, isAlly: false, patrolAxis: 'Z', patrolRange: 3.5, hasArmor: true });
  spawnBot({ id: 'dust2_ct_shortA', callsign: 'VOLT-BT', weaponId: 'P50_PISTOL', x: -6.2, y: 1.6, z: -53.5, isAlly: false, patrolAxis: 'Z', patrolRange: 2.5, hasArmor: true });
  spawnBot({ id: 'dust2_ct_mid', callsign: 'SERAPH-BT', weaponId: 'M4_CARBINE', x: -3.8, y: 1.6, z: -58.0, isAlly: false, patrolAxis: 'X', patrolRange: 1.8, hasArmor: true });
  spawnBot({ id: 'dust2_ct_siteB', callsign: 'HAVOC-BT', weaponId: 'AK47_RIFLE', x: -8.6, y: 1.6, z: -58.0, isAlly: false, patrolAxis: 'X', patrolRange: 2.5, hasArmor: true });

  // 4 Allied Attackers (Vanguard — Nascem juntos ao lado do jogador no TR Spawn igual CS)
  spawnBot({ id: 'dust2_t_ally1', callsign: 'RECON-02', weaponId: 'SNIPER_BOLT', x: -13.5, y: 8.0, z: 18.5, isAlly: true, patrolAxis: 'X', patrolRange: 2.5, hasArmor: true });
  spawnBot({ id: 'dust2_t_ally2', callsign: 'STRIKER-03', weaponId: 'AK47_RIFLE', x: -18.8, y: 8.0, z: 18.5, isAlly: true, patrolAxis: 'Z', patrolRange: 3.5, hasArmor: true });
  spawnBot({ id: 'dust2_t_ally3', callsign: 'LIFELINE-04', weaponId: 'M4_CARBINE', x: -14.5, y: 8.0, z: 21.0, isAlly: true, patrolAxis: 'Z', patrolRange: 3.0 });
  spawnBot({ id: 'dust2_t_ally4', callsign: 'WARDEN-05', weaponId: 'M4_CARBINE', x: -18.0, y: 8.0, z: 21.0, isAlly: true, patrolAxis: 'Z', patrolRange: 2.5 });
}

