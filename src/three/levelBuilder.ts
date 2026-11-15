import * as THREE from 'three';
import { WeaponId } from '../types/game';
import { ProceduralTextures } from './textures';

export interface ColliderBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface TacticalTargetEntity {
  id: string;
  type: 'SILHOUETTE' | 'STEEL_GONG' | 'MOVING_RAIL' | 'COMBAT_BOT';
  sector: 'RANGE' | 'KILLHOUSE';
  root: THREE.Group;
  pivotGroup: THREE.Group; // Rotates on X when knocked down or hit
  headMesh: THREE.Mesh;
  torsoMesh: THREE.Mesh;
  armorMesh?: THREE.Mesh;
  visorMesh?: THREE.Mesh;
  laserLine?: THREE.Line;
  basePosition: THREE.Vector3;
  patrolOffset: number;
  patrolSpeed: number;
  patrolAxis: 'X' | 'Z' | 'NONE';
  patrolRange: number;
  maxHealth: number;
  health: number;
  armorHealth: number;
  isDown: boolean;
  downTimer: number;
  hitTiltAngle: number;
  hitTiltVelocity: number;
  /** Sticky flag for directional death anim selection (set on lethal hit). */
  lastDeathWasHeadshot?: boolean;
  /** Warface medic revive: epoch-sec deadline; 0 = none. */
  reviveUntilSec?: number;
  /** True after revive window expired — corpse hidden permanently this round. */
  reviveExpired?: boolean;
  // Combat AI telegraph state
  canShootBack: boolean;
  windupTimer: number;
  cooldownTimer: number;
  isTelegraphing: boolean;
}

export interface TacticalLevelData {
  levelGroup: THREE.Group;
  colliders: ColliderBox[];
  targets: TacticalTargetEntity[];
  shootableMeshes: THREE.Mesh[];
  wallStandPositions: THREE.Vector3[];
}

function createWallSignTexture(
  title: string,
  subtitle: string,
  accentHex: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0b0f17';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 120);

  ctx.fillStyle = accentHex;
  ctx.font = 'bold 30px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(title, 256, 54);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(subtitle, 256, 94);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildPreProductionLevel(
  textures: ProceduralTextures,
  isSoftwareGl: boolean
): TacticalLevelData {
  const levelGroup = new THREE.Group();
  const colliders: ColliderBox[] = [];
  const targets: TacticalTargetEntity[] = [];
  const shootableMeshes: THREE.Mesh[] = [];
  const wallStandPositions: THREE.Vector3[] = [];

  // Shared PBR Materials
  const floorTex = textures.floorGrid.clone();
  floorTex.repeat.set(60, 60);
  floorTex.needsUpdate = true;

  const matFloor = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.78,
    metalness: 0.08,
  });

  const matWallBase = new THREE.MeshStandardMaterial({
    map: textures.wallGrid,
    roughness: 0.68,
    metalness: 0.12,
  });

  const matHazardCover = new THREE.MeshStandardMaterial({
    map: textures.hazardBlock,
    roughness: 0.52,
    metalness: 0.18,
  });

  const matPlywood = new THREE.MeshStandardMaterial({
    map: textures.plywoodGrid,
    roughness: 0.84,
    metalness: 0.05,
  });

  const matDarkSteel = new THREE.MeshStandardMaterial({
    color: 0x1e2530,
    roughness: 0.35,
    metalness: 0.85,
  });

  const matTargetSilhouette = new THREE.MeshStandardMaterial({
    map: textures.silhouetteTarget,
    roughness: 0.6,
    metalness: 0.15,
  });

  const matAr500Steel = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.28,
    metalness: 0.88,
  });

  // -------------------------------------------------------------------------
  // 1. EXPANSIVE GROUNDED FLOOR & LANE STRIPES (NO COPLANAR Z-FIGHTING)
  // -------------------------------------------------------------------------
  const mainFloor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), matFloor);
  mainFloor.rotation.x = -Math.PI / 2;
  mainFloor.receiveShadow = !isSoftwareGl;
  levelGroup.add(mainFloor);

  // Helper to add solid architecture block + AABB collider + shootable surface
  const addArchitectureBlock = (
    x: number,
    yBottom: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: THREE.MeshStandardMaterial,
    castShadow = true
  ) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    let mat = material;
    if (material.map) {
      mat = material.clone();
      const tex = material.map.clone();
      tex.repeat.set(
        Math.max(1, Math.round(Math.max(w, d))),
        Math.max(1, Math.round(h))
      );
      tex.needsUpdate = true;
      mat.map = tex;
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, yBottom + h / 2, z);
    mesh.castShadow = !isSoftwareGl && castShadow;
    mesh.receiveShadow = !isSoftwareGl;
    mesh.userData.isEnvironment = true;
    levelGroup.add(mesh);
    shootableMeshes.push(mesh);

    colliders.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minY: yBottom,
      maxY: yBottom + h,
      minZ: z - d / 2,
      maxZ: z + d / 2,
    });
    return mesh;
  };

  // -------------------------------------------------------------------------
  // 2. OUTER FACILITY PERIMETER BERMS & OVERHEAD STRUCTURAL BEAMS
  // -------------------------------------------------------------------------
  addArchitectureBlock(0, 0, -64, 68, 6.5, 1.5, matWallBase); // North Backstop Berm
  addArchitectureBlock(0, 0, 18, 68, 5.5, 1.5, matWallBase); // South Rear Wall
  addArchitectureBlock(-24, 0, -23, 1.5, 5.5, 84, matWallBase); // West Perimeter Wall
  addArchitectureBlock(30, 0, -23, 1.5, 5.5, 84, matWallBase); // East Perimeter Wall

  // Overhead Pre-Production Steel Roof Baffles
  for (let z = 6; z >= -54; z -= 12) {
    const truss = new THREE.Mesh(
      new THREE.BoxGeometry(54, 0.45, 0.65),
      matDarkSteel
    );
    truss.position.set(3, 6.2, z);
    truss.castShadow = !isSoftwareGl;
    levelGroup.add(truss);
  }

  // -------------------------------------------------------------------------
  // 3. SECTOR A: BALLISTIC CALIBRATION RANGE (X: -18 to +2, Z: +6 to -60)
  // -------------------------------------------------------------------------
  const firingLineMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const firingLineStripe = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 0.22),
    firingLineMat
  );
  firingLineStripe.rotation.x = -Math.PI / 2;
  firingLineStripe.position.set(-7, 0.015, -1.5);
  levelGroup.add(firingLineStripe);

  // Shooting Booths & Tactical Bench at Firing Line
  addArchitectureBlock(-12.5, 0, 0, 0.35, 2.4, 3.2, matPlywood);
  addArchitectureBlock(-2.0, 0, 0, 0.35, 2.4, 3.2, matPlywood);
  addArchitectureBlock(-10.2, 0, -1.2, 2.2, 0.95, 0.9, matHazardCover);

  // Range Distance Floor Markers (15m, 25m, 40m, 55m)
  const distances = [15, 25, 40, 55];
  distances.forEach((dist) => {
    const markerBar = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 0.12),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.4,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    markerBar.rotation.x = -Math.PI / 2;
    markerBar.position.set(-7, 0.014, -dist);
    levelGroup.add(markerBar);
  });

  // -------------------------------------------------------------------------
  // 3.1 TACTICAL DRILL OBSTACLES: JUMP HURDLE & SLIDE-UNDER CLEARANCE
  // -------------------------------------------------------------------------
  // Obstacle A: Low Vault/Jump Barrier Hurdle (0.88m height, requires Jump to cross)
  // Located at X: -7.0, Z: -6.0
  addArchitectureBlock(-7.0, 0, -6.0, 4.2, 0.88, 0.38, matHazardCover);
  // Hurdle side steel support posts
  addArchitectureBlock(-9.25, 0, -6.0, 0.32, 1.15, 0.42, matDarkSteel);
  addArchitectureBlock(-4.75, 0, -6.0, 0.32, 1.15, 0.42, matDarkSteel);

  // Obstacle B: Slide-Under Overhead Clearance Barrier (requires Slide or Crouch to pass)
  // Located at X: -7.0, Z: -11.0. Bottom of beam is at 1.12m above ground (1.12m - 2.62m).
  // Standing player (1.70m) collides; sliding player (0.86m) or crouching (1.08m) slides underneath!
  addArchitectureBlock(-7.0, 1.12, -11.0, 4.2, 1.5, 0.4, matHazardCover);
  // Side support pillars leaving clear 4.2m passageway in between
  addArchitectureBlock(-9.25, 0, -11.0, 0.35, 2.7, 0.45, matDarkSteel);
  addArchitectureBlock(-4.75, 0, -11.0, 0.35, 2.7, 0.45, matDarkSteel);

  // Divider Wall between Calibration Range (West) and CQB Killhouse (East)
  addArchitectureBlock(2.5, 0, -10, 0.6, 4.0, 16, matWallBase);
  addArchitectureBlock(2.5, 0, -38, 0.6, 4.0, 26, matWallBase);

  // -------------------------------------------------------------------------
  // 4. SECTOR B: CQB TACTICAL KILLHOUSE (X: +3 to +28, Z: +10 to -52)
  // -------------------------------------------------------------------------
  addArchitectureBlock(8.0, 0, -3.5, 6.5, 3.5, 0.5, matPlywood);
  addArchitectureBlock(16.5, 0, -3.5, 5.5, 3.5, 0.5, matPlywood);
  addArchitectureBlock(12.5, 2.4, -3.5, 2.6, 1.1, 0.5, matPlywood);

  // Waist-high 1.0m Orange Tactical Cover Blocks
  addArchitectureBlock(7.2, 0, 2.2, 2.2, 1.05, 1.0, matHazardCover);
  addArchitectureBlock(14.5, 0, -9.5, 2.8, 1.1, 1.0, matHazardCover);
  addArchitectureBlock(8.5, 0, -16.5, 2.4, 1.1, 1.0, matHazardCover);

  // Interior Killhouse Partition Room 2
  addArchitectureBlock(11.0, 0, -21.0, 9.0, 3.5, 0.5, matPlywood);
  addArchitectureBlock(21.5, 0, -21.0, 6.5, 3.5, 0.5, matPlywood);
  addArchitectureBlock(18.0, 0, -13.0, 0.5, 3.5, 8.5, matPlywood);

  // Deep Killhouse Room 3 & Concrete Pillars
  addArchitectureBlock(9.0, 0, -33.0, 1.2, 4.0, 1.2, matWallBase);
  addArchitectureBlock(17.5, 0, -33.0, 1.2, 4.0, 1.2, matWallBase);
  addArchitectureBlock(13.2, 0, -39.5, 3.2, 1.1, 1.2, matHazardCover);
  addArchitectureBlock(22.0, 0, -35.0, 2.5, 1.8, 1.2, matHazardCover);

  // =========================================================================
  // 5. 3D WALL WEAPON STANDS / ARMORY RACKS ("ESTANDE DE ARMAS NA PAREDE")
  //    Mounts all 8 custom 3D weapons on the wall in a 2x4 tactical rack!
  // =========================================================================
  const headerSignTex = createWallSignTexture(
    'ESTANDE DE ARMAS (8 ARMAS)',
    'ATIRE OU MIRE E PRESSIONE [F] PARA EQUIPAR',
    '#f59e0b'
  );

  const wallSlotDefs: Array<{
    weaponId: WeaponId;
    title: string;
    subtitle: string;
    accentHex: string;
    frameColor: number;
    col: number;
    row: number;
  }> = [
    {
      weaponId: 'P50_PISTOL',
      title: '[1] MARK 23',
      subtitle: '.45 ACP · 12 TIROS',
      accentHex: '#10b981',
      frameColor: 0x10b981,
      col: 0,
      row: 0,
    },
    {
      weaponId: 'SMG_45',
      title: '[2] SMG .45',
      subtitle: '.45 ACP · 32 TIROS',
      accentHex: '#22d3ee',
      frameColor: 0x22d3ee,
      col: 1,
      row: 0,
    },
    {
      weaponId: 'M4_CARBINE',
      title: '[3] M4A1 SOPMOD',
      subtitle: '5.56MM · 30 TIROS',
      accentHex: '#38bdf8',
      frameColor: 0x38bdf8,
      col: 0,
      row: 1,
    },
    {
      weaponId: 'CARBINE_AR',
      title: '[4] CARABINA',
      subtitle: '5.56MM · 30 TIROS',
      accentHex: '#60a5fa',
      frameColor: 0x60a5fa,
      col: 1,
      row: 1,
    },
    {
      weaponId: 'AK47_RIFLE',
      title: '[5] AK-47 COMANDO',
      subtitle: '7.62MM · 30 TIROS',
      accentHex: '#f97316',
      frameColor: 0xf97316,
      col: 0,
      row: 2,
    },
    {
      weaponId: 'L49_LMG',
      title: '[6] LMG PESADA',
      subtitle: '5.56MM · 100 TIROS',
      accentHex: '#f59e0b',
      frameColor: 0xf59e0b,
      col: 1,
      row: 2,
    },
    {
      weaponId: 'SNIPER_BOLT',
      title: '[7] SNIPER BOLT',
      subtitle: '.338 LAPUA · 5 TIROS',
      accentHex: '#a855f7',
      frameColor: 0xa855f7,
      col: 0,
      row: 3,
    },
    {
      weaponId: 'SNIPER_TACTICAL',
      title: '[8] SNIPER TÁTICA',
      subtitle: '.308 WIN · 10 TIROS',
      accentHex: '#ec4899',
      frameColor: 0xec4899,
      col: 1,
      row: 3,
    },
  ];

  const slotTexMap = new Map<WeaponId, THREE.CanvasTexture>();
  wallSlotDefs.forEach((def) => {
    slotTexMap.set(
      def.weaponId,
      createWallSignTexture(def.title, def.subtitle, def.accentHex)
    );
  });

  const buildRackWeaponDisplay = (
    weaponId: WeaponId,
    matMetal: THREE.Material,
    matAccent: THREE.Material
  ): THREE.Group => {
    const g = new THREE.Group();
    switch (weaponId) {
      case 'P50_PISTOL': {
        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.028), matMetal);
        slide.position.set(0, 0.025, 0);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.026), matAccent);
        grip.position.set(-0.06, -0.05, 0);
        grip.rotation.z = -0.22;
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.04, 8), matMetal);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(0.12, 0.02, 0);
        g.add(slide, grip, barrel);
        break;
      }
      case 'SMG_45':
      case 'SMG_MP5': {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.065, 0.032), matMetal);
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.16, 0.022), matAccent);
        mag.position.set(0.04, -0.09, 0);
        if (weaponId === 'SMG_MP5') mag.rotation.z = 0.22;
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.11, 0.024), matMetal);
        grip.position.set(-0.09, -0.06, 0);
        grip.rotation.z = -0.25;
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.14, 8), matMetal);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(0.2, 0.015, 0);
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.016), matMetal);
        stock.position.set(-0.2, -0.01, 0);
        g.add(body, mag, grip, barrel, stock);
        break;
      }
      case 'SHOTGUN_12':
      case 'SHOTGUN_SPAS': {
        const rec = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.036), matMetal);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.013, 0.42, 10), matMetal);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(0.3, 0.016, 0);
        const pump = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.042, 0.038), matAccent);
        pump.position.set(0.23, -0.014, 0);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.11, 0.026), matAccent);
        grip.position.set(-0.11, -0.06, 0);
        grip.rotation.z = -0.34;
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.075, 0.032), matMetal);
        stock.position.set(-0.22, -0.02, 0);
        g.add(rec, barrel, pump, grip, stock);
        break;
      }
      case 'M4_CARBINE': {
        const rec = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.075, 0.034), matMetal);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.055, 0.034), matMetal);
        rail.position.set(0.18, 0.01, 0);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 8), matMetal);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(0.35, 0.015, 0);
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.17, 0.024), matAccent);
        mag.position.set(0.03, -0.09, 0);
        mag.rotation.z = 0.14;
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.024), matMetal);
        grip.position.set(-0.09, -0.07, 0);
        grip.rotation.z = -0.26;
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.026), matAccent);
        stock.position.set(-0.19, -0.01, 0);
        const holo = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.028), matMetal);
        holo.position.set(0.02, 0.065, 0);
        g.add(rec, rail, barrel, mag, grip, stock, holo);
        break;
      }
      case 'CARBINE_AR': {
        const rec = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.07, 0.032), matMetal);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.032), matMetal);
        rail.position.set(0.19, 0.01, 0);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 8), matMetal);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(0.36, 0.015, 0);
        const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.15, 8), matMetal);
        scope.rotation.z = Math.PI / 2;
        scope.position.set(0.03, 0.065, 0);
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.16, 0.022), matAccent);
        mag.position.set(0.05, -0.09, 0);
        mag.rotation.z = 0.12;
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.11, 0.024), matMetal);
        grip.position.set(-0.08, -0.06, 0);
        grip.rotation.z = -0.24;
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.08, 0.024), matAccent);
        stock.position.set(-0.2, -0.01, 0);
        g.add(rec, rail, barrel, scope, mag, grip, stock);
        break;
      }
      case 'AK47_RIFLE':
      case 'AK12_RIFLE': {
        const rec = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.075, 0.032), matMetal);
        const woodHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.055, 0.034), matAccent);
        woodHandguard.position.set(0.18, 0.01, 0);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 8), matMetal);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(0.35, 0.015, 0);
        const bananaMag = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.19, 0.024), matAccent);
        bananaMag.position.set(0.05, -0.09, 0);
        bananaMag.rotation.z = 0.35;
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.024), matAccent);
        grip.position.set(-0.09, -0.065, 0);
        grip.rotation.z = -0.28;
        const woodStock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.085, 0.028), matAccent);
        woodStock.position.set(-0.22, -0.02, 0);
        g.add(rec, woodHandguard, barrel, bananaMag, grip, woodStock);
        break;
      }
      case 'L49_LMG': {
        const rec = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.044), matMetal);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.28, 8), matMetal);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(0.32, 0.02, 0);
        const ammoBox = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.13, 0.07), matAccent);
        ammoBox.position.set(0.02, -0.09, 0);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.026), matMetal);
        grip.position.set(-0.11, -0.07, 0);
        grip.rotation.z = -0.24;
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.034), matMetal);
        stock.position.set(-0.25, -0.01, 0);
        g.add(rec, barrel, ammoBox, grip, stock);
        break;
      }
      case 'SNIPER_BOLT': {
        const rec = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.065, 0.034), matAccent);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.36, 8), matMetal);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(0.37, 0.015, 0);
        const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.22, 8), matMetal);
        scope.rotation.z = Math.PI / 2;
        scope.position.set(0.06, 0.07, 0);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.024), matAccent);
        grip.position.set(-0.12, -0.065, 0);
        grip.rotation.z = -0.3;
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.028), matAccent);
        stock.position.set(-0.28, -0.01, 0);
        const boltHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.05, 6), matMetal);
        boltHandle.position.set(-0.04, 0.03, 0.028);
        boltHandle.rotation.x = Math.PI / 2;
        g.add(rec, barrel, scope, grip, stock, boltHandle);
        break;
      }
      case 'SNIPER_TACTICAL': {
        const rec = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.07, 0.036), matMetal);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.24, 8), matMetal);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(0.3, 0.015, 0);
        const suppressor = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.16, 8), matAccent);
        suppressor.rotation.z = Math.PI / 2;
        suppressor.position.set(0.48, 0.015, 0);
        const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 8), matMetal);
        scope.rotation.z = Math.PI / 2;
        scope.position.set(0.05, 0.07, 0);
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.14, 0.024), matMetal);
        mag.position.set(0.04, -0.08, 0);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.024), matMetal);
        grip.position.set(-0.11, -0.065, 0);
        grip.rotation.z = -0.26;
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.09, 0.028), matMetal);
        stock.position.set(-0.25, -0.01, 0);
        g.add(rec, barrel, suppressor, scope, mag, grip, stock);
        break;
      }
      case 'KNIFE_TACTICAL': {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.01), matMetal);
        blade.position.set(0.08, 0, 0);
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.016), matMetal);
        guard.position.set(-0.03, 0, 0);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.032, 0.02), matAccent);
        grip.position.set(-0.1, 0, 0);
        g.add(blade, guard, grip);
        break;
      }
    }
    return g;
  };

  const createWallWeaponStand = (x: number, z: number, rotY: number) => {
    const standRoot = new THREE.Group();
    standRoot.position.set(x, 0, z);
    standRoot.rotation.y = rotY;
    levelGroup.add(standRoot);
    wallStandPositions.push(new THREE.Vector3(x, 1.35, z));

    // Shared tactical gear materials
    const matPegboard = new THREE.MeshStandardMaterial({
      color: 0x141820,
      roughness: 0.65,
      metalness: 0.55,
    });
    const matHelmetOlive = new THREE.MeshStandardMaterial({
      color: 0x3d4432,
      roughness: 0.82,
      metalness: 0.12,
    });
    const matPelicanOlive = new THREE.MeshStandardMaterial({
      color: 0x2d3424,
      roughness: 0.72,
      metalness: 0.22,
    });
    const matPelicanBlack = new THREE.MeshStandardMaterial({
      color: 0x101318,
      roughness: 0.68,
      metalness: 0.28,
    });
    const matCounterSteel = new THREE.MeshStandardMaterial({
      color: 0x161a22,
      roughness: 0.42,
      metalness: 0.85,
    });
    const matGrenadeBody = new THREE.MeshStandardMaterial({
      color: 0x333b26,
      roughness: 0.5,
      metalness: 0.6,
    });
    const matFlashbangBody = new THREE.MeshStandardMaterial({
      color: 0x222822,
      roughness: 0.35,
      metalness: 0.75,
    });
    const matGoldBrass = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.2,
      metalness: 0.95,
    });

    // 1. MAIN PEGBOARD WALL (3.8m wide x 3.0m high)
    const wallBacking = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 3.0, 0.14),
      matPegboard
    );
    wallBacking.position.set(0, 1.5, -0.07);
    wallBacking.castShadow = !isSoftwareGl;
    wallBacking.receiveShadow = !isSoftwareGl;
    standRoot.add(wallBacking);

    // 2. CORNER RETURN WALL (Right side shelf wall, forming the L-vault from the photo)
    const cornerWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 3.0, 2.2),
      matPegboard
    );
    cornerWall.position.set(1.9, 1.5, 1.0);
    cornerWall.castShadow = !isSoftwareGl;
    cornerWall.receiveShadow = !isSoftwareGl;
    standRoot.add(cornerWall);

    // 3. DUAL CEILING LED LIGHT FIXTURES (Running horizontally as in the reference image)
    const ledTubeGeo = new THREE.BoxGeometry(3.6, 0.08, 0.14);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const ledFixture1 = new THREE.Mesh(ledTubeGeo, ledMat);
    ledFixture1.position.set(0, 2.92, 0.35);
    const ledFixture2 = new THREE.Mesh(ledTubeGeo, ledMat);
    ledFixture2.position.set(0, 2.92, 1.2);
    standRoot.add(ledFixture1, ledFixture2);

    // Crisp white overhead studio illumination
    const ceilingArmoryLight = new THREE.PointLight(0xfff5eb, 2.4, 7.5, 1.8);
    ceilingArmoryLight.position.set(0, 2.8, 0.8);
    standRoot.add(ceilingArmoryLight);

    // 4. HEADER STENCIL SIGN PLATE [ IHK & ARMORED · ARSENAL TÁTICO ]
    const headerSign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 0.32),
      new THREE.MeshBasicMaterial({ map: headerSignTex })
    );
    headerSign.position.set(0, 2.65, 0.02);
    standRoot.add(headerSign);

    // 5. LOWER WORKBENCH COUNTER & FLOOR STORAGE
    // Main lower steel counter
    const counterMain = new THREE.Mesh(
      new THREE.BoxGeometry(3.7, 0.08, 0.75),
      matCounterSteel
    );
    counterMain.position.set(0, 0.74, 0.38);
    counterMain.receiveShadow = !isSoftwareGl;
    standRoot.add(counterMain);

    // Corner return counter
    const counterSide = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.08, 1.8),
      matCounterSteel
    );
    counterSide.position.set(1.5, 0.74, 1.25);
    counterSide.receiveShadow = !isSoftwareGl;
    standRoot.add(counterSide);

    // Counter support cabinets / drawer units (beneath counter)
    const drawerLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.7, 0.65),
      matDarkSteel
    );
    drawerLeft.position.set(-1.4, 0.35, 0.35);
    const drawerRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.7, 0.65),
      matDarkSteel
    );
    drawerRight.position.set(1.45, 0.35, 1.25);
    standRoot.add(drawerLeft, drawerRight);

    // Heavy Pelican hard cases and ammo tins underneath
    const pelicanFloor1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.28, 0.44),
      matPelicanOlive
    );
    pelicanFloor1.position.set(-0.4, 0.14, 0.38);
    const pelicanFloor2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.26, 0.4),
      matPelicanBlack
    );
    pelicanFloor2.position.set(0.35, 0.13, 0.42);
    pelicanFloor2.rotation.y = 0.12;

    const ammoCan1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.22, 0.16),
      matGrenadeBody
    );
    ammoCan1.position.set(-0.85, 0.11, 0.45);
    ammoCan1.rotation.y = -0.18;

    const duffelBag = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.55, 10),
      matHelmetOlive
    );
    duffelBag.rotation.z = Math.PI / 2;
    duffelBag.position.set(0.9, 0.16, 0.4);
    standRoot.add(pelicanFloor1, pelicanFloor2, ammoCan1, duffelBag);

    // On top of the counter: open case, ammo boxes & grenades
    const openCase = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.1, 0.36),
      matPelicanBlack
    );
    openCase.position.set(-1.0, 0.83, 0.38);
    const caseLid = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.34, 0.04),
      matPelicanBlack
    );
    caseLid.position.set(-1.0, 0.98, 0.2);
    caseLid.rotation.x = -0.35;
    standRoot.add(openCase, caseLid);

    // Stacks of grenades on counter
    for (let gi = 0; gi < 3; gi++) {
      const grenade = new THREE.Mesh(
        new THREE.SphereGeometry(0.042, 10, 8),
        matGrenadeBody
      );
      grenade.position.set(-0.55 + gi * 0.11, 0.82, 0.35);
      standRoot.add(grenade);
    }

    // 6. CORNER FLOATING SHELVES (Tactical Helmets, Flashbangs, Ammo Tins)
    const shelfGeo = new THREE.BoxGeometry(0.38, 0.04, 1.6);
    [1.3, 1.8, 2.3].forEach((shelfY, sIdx) => {
      const shelf = new THREE.Mesh(shelfGeo, matCounterSteel);
      shelf.position.set(1.68, shelfY, 1.15);
      standRoot.add(shelf);

      if (sIdx === 2) {
        // Top shelf: Tactical Ballistic Helmets with NVG Shrouds (matching reference photo!)
        [-0.4, 0.35].forEach((hZ) => {
          const helmetRoot = new THREE.Group();
          helmetRoot.position.set(1.68, shelfY + 0.15, 1.15 + hZ);
          helmetRoot.rotation.y = -Math.PI / 2;

          const dome = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.65),
            matHelmetOlive
          );
          const rim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.22), matHelmetOlive);
          rim.position.y = -0.06;

          // NVG Mount & Dual Goggles
          const nvgShrouds = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.03), matDarkSteel);
          nvgShrouds.position.set(0, 0.02, 0.13);
          const nvgGoggles = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025, 0.025, 0.08, 8),
            matDarkSteel
          );
          nvgGoggles.rotation.x = Math.PI / 2;
          nvgGoggles.position.set(0, 0.01, 0.18);

          // Headset ear cups
          const earL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.05), matDarkSteel);
          earL.position.set(0.12, -0.05, 0);
          const earR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.05), matDarkSteel);
          earR.position.set(-0.12, -0.05, 0);

          helmetRoot.add(dome, rim, nvgShrouds, nvgGoggles, earL, earR);
          standRoot.add(helmetRoot);
        });
      } else if (sIdx === 1) {
        // Middle shelf: Line of Tactical Flashbang & Smoke Canisters
        for (let fi = -0.55; fi <= 0.55; fi += 0.22) {
          const canister = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.13, 10),
            matFlashbangBody
          );
          canister.position.set(1.68, shelfY + 0.08, 1.15 + fi);
          const yellowBand = new THREE.Mesh(
            new THREE.CylinderGeometry(0.031, 0.031, 0.025, 10),
            matGoldBrass
          );
          yellowBand.position.set(1.68, shelfY + 0.12, 1.15 + fi);
          standRoot.add(canister, yellowBand);
        }
      } else {
        // Lower shelf: Ammo Crates & Magazine Organizers
        const ammoBox1 = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.15, 0.38),
          matPelicanOlive
        );
        ammoBox1.position.set(1.68, shelfY + 0.1, 0.8);
        const magTray = new THREE.Mesh(
          new THREE.BoxGeometry(0.26, 0.08, 0.45),
          matPelicanBlack
        );
        magTray.position.set(1.68, shelfY + 0.06, 1.45);
        standRoot.add(ammoBox1, magTray);
      }
    });

    // 7. HORIZONTAL WEAPON RACKS (Holding all 8 weapons cleanly in 4 tiers)
    wallSlotDefs.forEach((def) => {
      const slotX = def.col === 0 ? -0.88 : 0.72;
      const slotY = 2.24 - def.row * 0.44;

      const slotGroup = new THREE.Group();
      slotGroup.position.set(slotX, slotY, 0.035);
      standRoot.add(slotGroup);

      // Interactive pick-up hit target
      const frameMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.45, 0.36, 0.04),
        new THREE.MeshBasicMaterial({
          color: def.frameColor,
          transparent: true,
          opacity: 0.12,
        })
      );
      frameMesh.userData.wallWeaponId = def.weaponId;
      slotGroup.add(frameMesh);
      shootableMeshes.push(frameMesh);

      // Weapon Name & Stencil Label Plate
      const labelMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.64, 0.2),
        new THREE.MeshBasicMaterial({ map: slotTexMap.get(def.weaponId)! })
      );
      labelMesh.position.set(-0.35, 0, 0.025);
      labelMesh.userData.wallWeaponId = def.weaponId;
      slotGroup.add(labelMesh);
      shootableMeshes.push(labelMesh);

      // Heavy Rubberized Tactical Steel Pegs
      const pegGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8);
      pegGeo.rotateX(Math.PI / 2);
      const pegLeft = new THREE.Mesh(pegGeo, matAr500Steel);
      pegLeft.position.set(0.12, -0.05, 0.08);
      const pegRight = new THREE.Mesh(pegGeo, matAr500Steel);
      pegRight.position.set(0.48, -0.05, 0.08);
      slotGroup.add(pegLeft, pegRight);

      // Clean, detailed 3D weapon resting horizontally on the pegs
      const rackGun = buildRackWeaponDisplay(def.weaponId, matDarkSteel, matAr500Steel);
      rackGun.position.set(0.3, -0.02, 0.1);
      rackGun.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          c.userData.wallWeaponId = def.weaponId;
          shootableMeshes.push(c as THREE.Mesh);
        }
      });
      slotGroup.add(rackGun);
    });
  };

  // Stand 1: Right at Player Spawn in the Ballistic Range
  createWallWeaponStand(-3.65, 1.35, -0.52);

  // Stand 2: At CQB Killhouse Entry
  createWallWeaponStand(9.35, 3.2, 0.48);

  // -------------------------------------------------------------------------
  // 6. COMPOSITE MULTI-PART BALLISTIC TARGETS & AUTONOMOUS COMBAT BOTS
  // -------------------------------------------------------------------------
  const createTargetEntity = (opts: {
    id: string;
    type: 'SILHOUETTE' | 'STEEL_GONG' | 'MOVING_RAIL' | 'COMBAT_BOT';
    sector: 'RANGE' | 'KILLHOUSE';
    x: number;
    z: number;
    patrolAxis?: 'X' | 'Z' | 'NONE';
    patrolRange?: number;
    patrolSpeed?: number;
    hasArmor?: boolean;
    canShootBack?: boolean;
  }): TacticalTargetEntity => {
    const root = new THREE.Group();
    root.position.set(opts.x, 0, opts.z);

    const basePlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.08, 0.85),
      matDarkSteel
    );
    basePlate.position.y = 0.04;
    basePlate.receiveShadow = !isSoftwareGl;
    root.add(basePlate);

    const servoHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.24, 0.22, 16),
      matDarkSteel
    );
    servoHousing.position.y = 0.16;
    root.add(servoHousing);

    const pivotGroup = new THREE.Group();
    pivotGroup.position.set(0, 0.22, 0);
    root.add(pivotGroup);

    const uprightStrut = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.85, 0.08),
      matDarkSteel
    );
    uprightStrut.position.set(0, 0.42, 0);
    pivotGroup.add(uprightStrut);

    let torsoMesh: THREE.Mesh;
    let headMesh: THREE.Mesh;
    let armorMesh: THREE.Mesh | undefined;
    let visorMesh: THREE.Mesh | undefined;
    let laserLine: THREE.Line | undefined;

    if (opts.type === 'STEEL_GONG') {
      const crossbar = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.07, 0.07),
        matDarkSteel
      );
      crossbar.position.set(0, 1.55, 0);
      pivotGroup.add(crossbar);

      torsoMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.04, 24),
        matAr500Steel
      );
      torsoMesh.rotation.x = Math.PI / 2;
      torsoMesh.position.set(0, 1.18, 0.04);

      headMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.045, 20),
        new THREE.MeshStandardMaterial({
          color: 0xef4444,
          roughness: 0.25,
          metalness: 0.9,
        })
      );
      headMesh.rotation.x = Math.PI / 2;
      headMesh.position.set(0, 1.18, 0.065);
      pivotGroup.add(torsoMesh, headMesh);
    } else {
      torsoMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.78, 0.12),
        matTargetSilhouette
      );
      torsoMesh.position.set(0, 1.08, 0);
      torsoMesh.castShadow = !isSoftwareGl;
      pivotGroup.add(torsoMesh);

      const shoulderL = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.28, 0.16),
        matDarkSteel
      );
      shoulderL.position.set(-0.34, 1.24, 0);
      const shoulderR = shoulderL.clone();
      shoulderR.position.x = 0.34;
      pivotGroup.add(shoulderL, shoulderR);

      headMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.3, 0.18),
        new THREE.MeshStandardMaterial({
          color: 0xdc2626,
          roughness: 0.4,
          metalness: 0.35,
        })
      );
      headMesh.position.set(0, 1.66, 0);
      headMesh.castShadow = !isSoftwareGl;
      pivotGroup.add(headMesh);

      visorMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.06, 0.04),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      );
      visorMesh.position.set(0, 1.68, 0.085);
      pivotGroup.add(visorMesh);

      if (opts.hasArmor) {
        armorMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.46, 0.48, 0.06),
          new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            metalness: 0.85,
            roughness: 0.25,
          })
        );
        armorMesh.position.set(0, 1.12, 0.075);
        armorMesh.userData.targetId = opts.id;
        armorMesh.userData.hitZone = 'ARMOR';
        pivotGroup.add(armorMesh);
        shootableMeshes.push(armorMesh);
      }

      if (opts.canShootBack) {
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 1.68, 0.1),
          new THREE.Vector3(0, 1.4, 12),
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
    }

    torsoMesh.userData.targetId = opts.id;
    torsoMesh.userData.hitZone =
      opts.type === 'STEEL_GONG' ? 'STEEL_GONG' : 'TORSO_A';
    headMesh.userData.targetId = opts.id;
    headMesh.userData.hitZone = 'HEAD';

    shootableMeshes.push(torsoMesh, headMesh);
    levelGroup.add(root);

    const entity: TacticalTargetEntity = {
      id: opts.id,
      type: opts.type,
      sector: opts.sector,
      root,
      pivotGroup,
      headMesh,
      torsoMesh,
      armorMesh,
      visorMesh,
      laserLine,
      basePosition: new THREE.Vector3(opts.x, 0, opts.z),
      patrolOffset: Math.random() * Math.PI * 2,
      patrolSpeed: opts.patrolSpeed ?? 0,
      patrolAxis: opts.patrolAxis ?? 'NONE',
      patrolRange: opts.patrolRange ?? 0,
      maxHealth: opts.type === 'STEEL_GONG' ? 99999 : 100,
      health: opts.type === 'STEEL_GONG' ? 99999 : 100,
      armorHealth: opts.hasArmor ? 60 : 0,
      isDown: false,
      downTimer: 0,
      hitTiltAngle: 0,
      hitTiltVelocity: 0,
      canShootBack: Boolean(opts.canShootBack),
      windupTimer: 0,
      cooldownTimer: 1.5 + Math.random() * 2.0,
      isTelegraphing: false,
    };

    targets.push(entity);
    return entity;
  };

  // Populate Sector A: Ballistic Calibration Range Targets
  createTargetEntity({
    id: 'range_15m_left',
    type: 'SILHOUETTE',
    sector: 'RANGE',
    x: -10.2,
    z: -15,
  });
  createTargetEntity({
    id: 'range_15m_gong',
    type: 'STEEL_GONG',
    sector: 'RANGE',
    x: -4.2,
    z: -15,
  });
  createTargetEntity({
    id: 'range_25m_center',
    type: 'SILHOUETTE',
    sector: 'RANGE',
    x: -7.2,
    z: -25,
    hasArmor: true,
  });
  createTargetEntity({
    id: 'range_32m_mover',
    type: 'MOVING_RAIL',
    sector: 'RANGE',
    x: -7.5,
    z: -33,
    patrolAxis: 'X',
    patrolRange: 4.5,
    patrolSpeed: 1.55,
  });
  createTargetEntity({
    id: 'range_45m_sniper',
    type: 'SILHOUETTE',
    sector: 'RANGE',
    x: -9.8,
    z: -45,
  });
  createTargetEntity({
    id: 'range_55m_gong',
    type: 'STEEL_GONG',
    sector: 'RANGE',
    x: -5.0,
    z: -55,
  });

  // Populate Sector B: CQB Tactical Killhouse Combat Bots
  createTargetEntity({
    id: 'kh_entry_guard',
    type: 'COMBAT_BOT',
    sector: 'KILLHOUSE',
    x: 11.2,
    z: -8.5,
    canShootBack: true,
  });
  createTargetEntity({
    id: 'kh_corner_ambush',
    type: 'COMBAT_BOT',
    sector: 'KILLHOUSE',
    x: 6.2,
    z: -14.2,
    hasArmor: true,
    canShootBack: true,
  });
  createTargetEntity({
    id: 'kh_flank_patrol',
    type: 'COMBAT_BOT',
    sector: 'KILLHOUSE',
    x: 14.8,
    z: -17.5,
    patrolAxis: 'X',
    patrolRange: 2.2,
    patrolSpeed: 1.2,
    canShootBack: true,
  });
  createTargetEntity({
    id: 'kh_room2_breach',
    type: 'COMBAT_BOT',
    sector: 'KILLHOUSE',
    x: 16.5,
    z: -26.5,
    hasArmor: true,
    canShootBack: true,
  });
  createTargetEntity({
    id: 'kh_room2_left',
    type: 'COMBAT_BOT',
    sector: 'KILLHOUSE',
    x: 7.5,
    z: -28.0,
    canShootBack: true,
  });
  createTargetEntity({
    id: 'kh_deep_commander',
    type: 'COMBAT_BOT',
    sector: 'KILLHOUSE',
    x: 13.5,
    z: -43.5,
    hasArmor: true,
    patrolAxis: 'X',
    patrolRange: 3.0,
    patrolSpeed: 1.35,
    canShootBack: true,
  });

  return {
    levelGroup,
    colliders,
    targets,
    shootableMeshes,
    wallStandPositions,
  };
}
