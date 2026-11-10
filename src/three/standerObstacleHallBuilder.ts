import * as THREE from 'three';
import {
  ColliderBox,
  TacticalTargetEntity,
} from './levelBuilder';
import { createHangingPaperTarget } from './paperTargetBuilder';
import { getStanderDarkRangeTextures } from './standerRangeTextures';

let sharedUnitBoxGeo: THREE.BoxGeometry | null = null;

/**
 * Creates a crisp 3D tactical instruction sign banner using CanvasTexture.
 */
function createInstructionSign(
  title: string,
  subtitle: string,
  accentColor: string,
  widthMeters = 2.2,
  heightMeters = 0.56
): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#090d14';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 120);

  ctx.fillStyle = accentColor;
  ctx.fillRect(12, 14, 10, 100);

  ctx.font = '900 36px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 36, 46);

  ctx.font = '700 22px monospace';
  ctx.fillStyle = accentColor;
  ctx.fillText(subtitle, 36, 92);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  return new THREE.Mesh(
    new THREE.PlaneGeometry(widthMeters, heightMeters),
    new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.DoubleSide,
    })
  );
}

/**
 * Builds the connected "Salão Tático de Obstáculos (Pular, Agachar, Deslizar)"
 * accessed through the open doorway at X = [-8.75, -7.00], Z = -1.37m.
 * Optimized with shared unit BoxGeometry, Lambert materials, and zero PointLights.
 */
export function buildStanderObstacleHall(
  levelGroup: THREE.Group,
  colliders: ColliderBox[],
  targets: TacticalTargetEntity[],
  shootableMeshes: THREE.Mesh[],
  isSoftwareGl: boolean
): void {
  const hallGroup = new THREE.Group();
  hallGroup.name = 'StanderObstacleHall';
  levelGroup.add(hallGroup);

  if (!sharedUnitBoxGeo) {
    sharedUnitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  }

  const textures = getStanderDarkRangeTextures();

  const wallMat = new THREE.MeshLambertMaterial({
    map: textures.acousticWallMap,
    color: 0xe2e8f0,
  });

  const floorMat = new THREE.MeshLambertMaterial({
    map: textures.rubberFloorMap,
    color: 0xdbe4f0,
  });

  const ceilMat = new THREE.MeshLambertMaterial({
    map: textures.darkCeilingMap,
    color: 0x94a3b8,
  });

  const darkSteelMat = new THREE.MeshLambertMaterial({
    color: 0x1e293b,
  });

  const hazardMat = new THREE.MeshLambertMaterial({
    map: textures.hazardStripeMap,
  });

  const cyanNeonMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const amberNeonMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  const emeraldNeonMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });

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

  const addEnvBox = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    withCollider = true
  ) => {
    const mesh = new THREE.Mesh(sharedUnitBoxGeo!, mat);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    hallGroup.add(mesh);
    if (withCollider) {
      mesh.userData.isEnvironment = true;
      shootableMeshes.push(mesh);
      addCollider(
        x - w * 0.5,
        x + w * 0.5,
        y - h * 0.5,
        y + h * 0.5,
        z - d * 0.5,
        z + d * 0.5
      );
    }
    return mesh;
  };

  // 1. PORTAL DA PORTA (X = -8.75 a -7.00, Z = -1.37)
  addEnvBox(0.14, 2.35, 0.36, -8.78, 1.175, -1.37, darkSteelMat, false);
  addEnvBox(0.14, 2.35, 0.36, -6.98, 1.175, -1.37, darkSteelMat, false);
  addEnvBox(1.96, 0.22, 0.38, -7.88, 2.36, -1.37, hazardMat, false);
  addEnvBox(0.04, 2.25, 0.04, -8.69, 1.125, -1.17, emeraldNeonMat, false);
  addEnvBox(0.04, 2.25, 0.04, -7.07, 1.125, -1.17, emeraldNeonMat, false);

  const doorSignInsideRange = createInstructionSign(
    'SALÃO DE OBSTÁCULOS',
    '▼ ENTRE PELA PORTA: PULAR · AGACHAR · DESLIZAR',
    '#34d399',
    2.1,
    0.5
  );
  doorSignInsideRange.position.set(-7.88, 2.52, -1.12);
  hallGroup.add(doorSignInsideRange);

  // 2. ESTRUTURA DO SALÃO DE OBSTÁCULOS
  const hallCenterX = 3.0;
  const hallCenterZ = -7.5;
  const hallWidthX = 29.0;
  const hallDepthZ = 12.26;
  const hallHeightY = 3.6;

  const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(hallWidthX, hallDepthZ),
    floorMat
  );
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(hallCenterX, 0.005, hallCenterZ);
  floorMesh.userData.isEnvironment = true;
  hallGroup.add(floorMesh);
  shootableMeshes.push(floorMesh);

  const ceilMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(hallWidthX, hallDepthZ),
    ceilMat
  );
  ceilMesh.rotation.x = Math.PI / 2;
  ceilMesh.position.set(hallCenterX, hallHeightY, hallCenterZ);
  hallGroup.add(ceilMesh);

  addEnvBox(hallWidthX, hallHeightY, 0.35, hallCenterX, hallHeightY * 0.5, -13.6, wallMat, true);
  addEnvBox(0.35, hallHeightY, hallDepthZ, -11.5, hallHeightY * 0.5, hallCenterZ, wallMat, true);
  addEnvBox(0.35, hallHeightY, hallDepthZ, 17.5, hallHeightY * 0.5, hallCenterZ, wallMat, true);
  addEnvBox(2.75, hallHeightY, 0.24, -10.125, hallHeightY * 0.5, -1.45, wallMat, false);
  addEnvBox(24.5, hallHeightY, 0.24, 5.25, hallHeightY * 0.5, -1.45, wallMat, false);

  [-5.8, -9.4].forEach((divZ) => {
    addEnvBox(17.6, 0.18, 0.14, 4.6, 0.09, divZ, darkSteelMat, false);
    addEnvBox(17.6, 0.02, 0.06, 4.6, 0.19, divZ, cyanNeonMat, false);
  });

  const lightXs = [-6.5, 1.5, 9.5, 15.0];
  const lightZs = [-4.0, -7.6, -11.2];
  lightXs.forEach((lx) => {
    lightZs.forEach((lz) => {
      addEnvBox(1.5, 0.06, 0.28, lx, hallHeightY - 0.05, lz, cyanNeonMat, false);
    });
  });

  // 3. PISTA 01 (Z = -4.0m): CIRCUITO DE PULAR
  const signJump = createInstructionSign(
    'PISTA 01 · PULAR',
    '[ESPAÇO] OU BOTÃO PULAR PARA TRANSPOR BARREIRAS',
    '#34d399'
  );
  signJump.rotation.y = Math.PI / 2;
  signJump.position.set(-4.2, 2.55, -4.0);
  hallGroup.add(signJump);

  addEnvBox(0.28, 0.64, 2.4, -2.5, 0.32, -4.0, hazardMat, true);
  addEnvBox(0.32, 0.05, 2.42, -2.5, 0.65, -4.0, emeraldNeonMat, false);

  addEnvBox(0.28, 0.76, 2.4, 1.5, 0.38, -4.0, hazardMat, true);
  addEnvBox(0.32, 0.05, 2.42, 1.5, 0.77, -4.0, emeraldNeonMat, false);

  addEnvBox(1.5, 0.55, 2.0, 5.6, 0.275, -4.0, darkSteelMat, true);
  addEnvBox(1.52, 0.06, 2.02, 5.6, 0.53, -4.0, hazardMat, false);

  addEnvBox(1.8, 1.02, 2.0, 8.2, 0.51, -4.0, darkSteelMat, true);
  addEnvBox(1.82, 0.06, 2.02, 8.2, 1.0, -4.0, hazardMat, false);

  // 4. PISTA 02 (Z = -7.6m): CIRCUITO DE AGACHAR
  const signCrouch = createInstructionSign(
    'PISTA 02 · AGACHAR',
    'PRESSIONE [C] PARA PASSAR SOB OS PORTAIS BAIXOS',
    '#38bdf8'
  );
  signCrouch.rotation.y = Math.PI / 2;
  signCrouch.position.set(-4.2, 2.55, -7.6);
  hallGroup.add(signCrouch);

  addEnvBox(0.36, 1.22, 2.5, -2.5, 1.79, -7.6, hazardMat, true);
  addEnvBox(0.18, 2.4, 0.18, -2.5, 1.2, -6.3, darkSteelMat, false);
  addEnvBox(0.18, 2.4, 0.18, -2.5, 1.2, -8.9, darkSteelMat, false);
  addEnvBox(0.4, 0.04, 2.46, -2.5, 1.19, -7.6, cyanNeonMat, false);

  addEnvBox(3.4, 1.15, 2.5, 2.9, 1.755, -7.6, darkSteelMat, true);
  addEnvBox(3.44, 0.14, 2.54, 2.9, 1.25, -7.6, hazardMat, false);
  addEnvBox(3.4, 0.04, 0.06, 2.9, 0.03, -6.45, cyanNeonMat, false);
  addEnvBox(3.4, 0.04, 0.06, 2.9, 0.03, -8.75, cyanNeonMat, false);

  addEnvBox(0.36, 1.22, 2.5, 7.8, 1.79, -7.6, hazardMat, true);
  addEnvBox(0.4, 0.04, 2.46, 7.8, 1.19, -7.6, cyanNeonMat, false);

  // 5. PISTA 03 (Z = -11.2m): CIRCUITO DE DESLIZAR
  const signSlide = createInstructionSign(
    'PISTA 03 · DESLIZAR',
    'CORRA [SHIFT+W] + [C] PARA DESLIZAR SOB O LASER',
    '#f59e0b'
  );
  signSlide.rotation.y = Math.PI / 2;
  signSlide.position.set(-4.2, 2.55, -11.2);
  hallGroup.add(signSlide);

  [-3.6, -1.2, 1.4, 4.0, 6.6].forEach((cx) => {
    addEnvBox(0.65, 0.01, 0.9, cx, 0.012, -11.2, amberNeonMat, false);
  });

  addEnvBox(0.32, 1.25, 2.5, -2.0, 1.775, -11.2, hazardMat, true);
  addEnvBox(0.08, 0.04, 2.46, -2.0, 1.02, -11.2, amberNeonMat, false);
  addEnvBox(0.18, 2.4, 0.18, -2.0, 1.2, -9.9, darkSteelMat, false);
  addEnvBox(0.18, 2.4, 0.18, -2.0, 1.2, -12.5, darkSteelMat, false);

  addEnvBox(0.32, 1.25, 2.5, 2.8, 1.775, -11.2, hazardMat, true);
  addEnvBox(0.08, 0.04, 2.46, 2.8, 1.02, -11.2, amberNeonMat, false);
  addEnvBox(0.18, 2.4, 0.18, 2.8, 1.2, -9.9, darkSteelMat, false);
  addEnvBox(0.18, 2.4, 0.18, 2.8, 1.2, -12.5, darkSteelMat, false);

  addEnvBox(0.32, 1.25, 2.5, 6.8, 1.775, -11.2, hazardMat, true);
  addEnvBox(0.08, 0.04, 2.46, 6.8, 1.02, -11.2, amberNeonMat, false);
  addEnvBox(0.28, 0.64, 2.4, 9.6, 0.32, -11.2, hazardMat, true);

  // 6. ALVOS DE PAPEL NO FINAL DE CADA PISTA DE OBSTÁCULOS
  const hallTargetDefs = [
    {
      id: 'hall_paper_jump_lane',
      x: 15.0,
      z: -4.0,
      patrolAxis: 'Z' as const,
      patrolRange: 0.85,
      patrolSpeed: 1.35,
    },
    {
      id: 'hall_paper_crouch_lane',
      x: 15.0,
      z: -7.6,
      patrolAxis: 'NONE' as const,
      patrolRange: 0,
      patrolSpeed: 0,
    },
    {
      id: 'hall_paper_slide_lane',
      x: 15.0,
      z: -11.2,
      patrolAxis: 'Z' as const,
      patrolRange: 0.95,
      patrolSpeed: 1.65,
    },
  ];

  hallTargetDefs.forEach((def) => {
    targets.push(
      createHangingPaperTarget(def, hallGroup, shootableMeshes, isSoftwareGl)
    );
  });
}
