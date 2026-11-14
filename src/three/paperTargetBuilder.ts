import * as THREE from 'three';
import { TacticalTargetEntity } from './levelBuilder';
import { buildStanderArmoryWallRack } from './standerArmoryRack';

let cachedBullseyeTex: THREE.CanvasTexture | null = null;
let cachedSilhouetteTex: THREE.CanvasTexture | null = null;

let sharedCarriageGeo: THREE.BoxGeometry | null = null;
let sharedLedGeo: THREE.BoxGeometry | null = null;
let sharedRodGeo: THREE.CylinderGeometry | null = null;
let sharedClampGeo: THREE.BoxGeometry | null = null;
let sharedSheetGeo: THREE.PlaneGeometry | null = null;
let sharedHeadHitGeo: THREE.BoxGeometry | null = null;
let sharedTorsoHitGeo: THREE.BoxGeometry | null = null;
let sharedGongGeo: THREE.CylinderGeometry | null = null;

let sharedMatBullseye: THREE.MeshLambertMaterial | null = null;
let sharedMatSilhouette: THREE.MeshLambertMaterial | null = null;
let sharedMatClampSteel: THREE.MeshLambertMaterial | null = null;
let sharedMatLedStatic: THREE.MeshBasicMaterial | null = null;
let sharedMatLedMoving: THREE.MeshBasicMaterial | null = null;
let sharedInvisibleHitMat: THREE.MeshBasicMaterial | null = null;
let sharedGongMat: THREE.MeshLambertMaterial | null = null;

function ensureSharedPaperTargetResources(): void {
  if (sharedCarriageGeo) return;
  sharedCarriageGeo = new THREE.BoxGeometry(0.28, 0.1, 0.18);
  sharedLedGeo = new THREE.BoxGeometry(0.16, 0.03, 0.04);
  sharedRodGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.38, 6);
  sharedClampGeo = new THREE.BoxGeometry(0.68, 0.055, 0.04);
  sharedSheetGeo = new THREE.PlaneGeometry(0.64, 0.94);
  sharedHeadHitGeo = new THREE.BoxGeometry(0.26, 0.24, 0.12);
  sharedTorsoHitGeo = new THREE.BoxGeometry(0.64, 0.66, 0.12);
  sharedGongGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.04, 16);

  sharedMatBullseye = new THREE.MeshLambertMaterial({
    map: createPaperTargetSheetTexture('BULLSEYE_PRO'),
    side: THREE.DoubleSide,
  });
  sharedMatSilhouette = new THREE.MeshLambertMaterial({
    map: createPaperTargetSheetTexture('SILHOUETTE_RINGS'),
    side: THREE.DoubleSide,
  });
  sharedMatClampSteel = new THREE.MeshLambertMaterial({ color: 0x1e293b });
  sharedMatLedStatic = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  sharedMatLedMoving = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  sharedInvisibleHitMat = new THREE.MeshBasicMaterial({ visible: false });
  sharedGongMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b });
}

/**
 * Generates a high-contrast 512x768 CanvasTexture for the hanging paper bullseye target sheets.
 */
export function createPaperTargetSheetTexture(
  variant: 'BULLSEYE_PRO' | 'SILHOUETTE_RINGS'
): THREE.CanvasTexture {
  if (variant === 'BULLSEYE_PRO' && cachedBullseyeTex) return cachedBullseyeTex;
  if (variant === 'SILHOUETTE_RINGS' && cachedSilhouetteTex)
    return cachedSilhouetteTex;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, 512, 768);

  ctx.strokeStyle = '#d6d1c4';
  ctx.lineWidth = 2;
  for (let y = 16; y < 752; y += 24) {
    ctx.beginPath();
    ctx.moveTo(16, y);
    ctx.lineTo(496, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, 484, 740);
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, 464, 720);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(24, 24, 464, 42);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    variant === 'BULLSEYE_PRO'
      ? 'STANDER PRO B-27 · QUALIFICAÇÃO 25M'
      : 'KINETIC TACTICAL SILHOUETTE · 10-RING',
    256,
    51
  );

  ctx.fillStyle = variant === 'BULLSEYE_PRO' ? '#18181b' : '#0f172a';
  ctx.beginPath();
  ctx.arc(256, 168, 62, Math.PI, 0, false);
  ctx.lineTo(318, 225);
  ctx.lineTo(304, 250);
  ctx.lineTo(432, 286);
  ctx.lineTo(452, 360);
  ctx.lineTo(436, 668);
  ctx.lineTo(76, 668);
  ctx.lineTo(60, 360);
  ctx.lineTo(80, 286);
  ctx.lineTo(208, 250);
  ctx.lineTo(194, 225);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();

  const cx = 256;
  const cy = 458;
  const rings = [
    { r: 168, stroke: '#94a3b8', fill: null, num: '6' },
    { r: 134, stroke: '#cbd5e1', fill: null, num: '7' },
    { r: 100, stroke: '#f8fafc', fill: '#1e293b', num: '8' },
    { r: 68, stroke: '#f8fafc', fill: '#334155', num: '9' },
    { r: 38, stroke: '#fef08a', fill: '#ef4444', num: '10' },
  ];

  rings.forEach((ring) => {
    ctx.beginPath();
    ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
    if (ring.fill) {
      ctx.fillStyle = ring.fill;
      ctx.fill();
    }
    ctx.strokeStyle = ring.stroke;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (ring.num !== '10') {
      ctx.fillText(ring.num, cx, cy - ring.r + 15);
      ctx.fillText(ring.num, cx, cy + ring.r - 15);
      ctx.fillText(ring.num, cx - ring.r + 15, cy);
      ctx.fillText(ring.num, cx + ring.r - 15, cy);
    }
  });

  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 18, cy);
  ctx.lineTo(cx + 18, cy);
  ctx.moveTo(cx, cy - 18);
  ctx.lineTo(cx, cy + 18);
  ctx.stroke();

  const hx = 256;
  const hy = 168;
  ctx.beginPath();
  ctx.arc(hx, hy, 42, 0, Math.PI * 2);
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(hx, hy, 24, 0, Math.PI * 2);
  ctx.fillStyle = '#ef4444';
  ctx.fill();
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(hx, hy, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#fef08a';
  ctx.fill();

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(28, 682, 456, 58);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 682, 456, 58);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('ZONA A (HEAD): 110 DMG', 42, 712);
  ctx.textAlign = 'right';
  ctx.fillText('CENTRO 10X: PRECISÃO MÁXIMA', 470, 712);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (variant === 'BULLSEYE_PRO') cachedBullseyeTex = tex;
  else cachedSilhouetteTex = tex;
  return tex;
}

export interface PaperTargetDef {
  id: string;
  x: number;
  z: number;
  variant?: 'BULLSEYE_PRO' | 'SILHOUETTE_RINGS';
  patrolAxis: 'NONE' | 'X' | 'Z';
  patrolRange: number;
  patrolSpeed: number;
  patrolOffset?: number;
}

export function createHangingPaperTarget(
  def: PaperTargetDef,
  parentGroup: THREE.Group,
  shootableMeshes: THREE.Mesh[],
  _isSoftwareGl: boolean
): TacticalTargetEntity {
  ensureSharedPaperTargetResources();
  const variant = def.variant ?? 'BULLSEYE_PRO';
  const matPaper =
    variant === 'BULLSEYE_PRO' ? sharedMatBullseye! : sharedMatSilhouette!;
  const matLed =
    def.patrolAxis === 'NONE' ? sharedMatLedStatic! : sharedMatLedMoving!;

  const root = new THREE.Group();
  root.position.set(def.x, 0, def.z);
  root.rotation.y = -Math.PI / 2;
  parentGroup.add(root);

  const carriage = new THREE.Mesh(sharedCarriageGeo!, sharedMatClampSteel!);
  carriage.position.set(0, 2.42, 0);
  root.add(carriage);

  const statusLed = new THREE.Mesh(sharedLedGeo!, matLed);
  statusLed.position.set(0, 2.36, 0.08);
  root.add(statusLed);

  const pivotGroup = new THREE.Group();
  pivotGroup.position.set(0, 2.02, 0);
  root.add(pivotGroup);

  const rod = new THREE.Mesh(sharedRodGeo!, sharedMatClampSteel!);
  rod.position.set(0, 0.19, 0);
  pivotGroup.add(rod);

  const clampBar = new THREE.Mesh(sharedClampGeo!, sharedMatClampSteel!);
  clampBar.position.set(0, 0, 0);
  pivotGroup.add(clampBar);

  const sheetMesh = new THREE.Mesh(sharedSheetGeo!, matPaper);
  sheetMesh.position.set(0, -0.47, 0);
  pivotGroup.add(sheetMesh);

  const headHit = new THREE.Mesh(sharedHeadHitGeo!, sharedInvisibleHitMat!);
  headHit.position.set(0, -0.21, 0);
  headHit.userData = { targetId: def.id, hitZone: 'HEAD' };
  pivotGroup.add(headHit);
  shootableMeshes.push(headHit);

  const torsoHit = new THREE.Mesh(sharedTorsoHitGeo!, sharedInvisibleHitMat!);
  torsoHit.position.set(0, -0.61, 0);
  torsoHit.userData = { targetId: def.id, hitZone: 'TORSO_A' };
  pivotGroup.add(torsoHit);
  shootableMeshes.push(torsoHit);

  return {
    id: def.id,
    type: def.patrolAxis === 'NONE' ? 'SILHOUETTE' : 'MOVING_RAIL',
    sector: 'RANGE',
    root,
    pivotGroup,
    headMesh: headHit,
    torsoMesh: torsoHit,
    basePosition: new THREE.Vector3(def.x, 0, def.z),
    patrolAxis: def.patrolAxis,
    patrolRange: def.patrolRange,
    patrolSpeed: def.patrolSpeed,
    patrolOffset: def.patrolOffset ?? 0,
    health: 100,
    maxHealth: 100,
    armorHealth: 0,
    isDown: false,
    downTimer: 0,
    hitTiltAngle: 0,
    hitTiltVelocity: 0,
    canShootBack: false,
    windupTimer: 0,
    cooldownTimer: 99,
    isTelegraphing: false,
  };
}

export function populateStanderTiroTargetsAndArmory(
  levelGroup: THREE.Group,
  targets: TacticalTargetEntity[],
  shootableMeshes: THREE.Mesh[],
  isSoftwareGl: boolean
): void {
  ensureSharedPaperTargetResources();

  // Lane centers from shooting_range_2k TargetRail Xs; downrange toward -Z.
  const paperTargetDefs: PaperTargetDef[] = [
    { id: 'paper_lane1_static', x: -1.36, z: -12.5, variant: 'BULLSEYE_PRO', patrolAxis: 'NONE', patrolRange: 0, patrolSpeed: 0, patrolOffset: 0 },
    { id: 'paper_lane2_static', x: 0.39, z: -16.0, variant: 'SILHOUETTE_RINGS', patrolAxis: 'NONE', patrolRange: 0, patrolSpeed: 0, patrolOffset: 0 },
    { id: 'paper_lane3_static', x: 2.14, z: -20.5, variant: 'BULLSEYE_PRO', patrolAxis: 'NONE', patrolRange: 0, patrolSpeed: 0, patrolOffset: 0 },
    { id: 'paper_lane4_static', x: 3.89, z: -24.0, variant: 'SILHOUETTE_RINGS', patrolAxis: 'NONE', patrolRange: 0, patrolSpeed: 0, patrolOffset: 0 },
    { id: 'paper_lane5_static', x: 5.64, z: -28.5, variant: 'BULLSEYE_PRO', patrolAxis: 'NONE', patrolRange: 0, patrolSpeed: 0, patrolOffset: 0 },
    { id: 'paper_mover_near_z', x: 2.14, z: -14.0, variant: 'BULLSEYE_PRO', patrolAxis: 'Z', patrolRange: 2.4, patrolSpeed: 1.55, patrolOffset: 0.0 },
    { id: 'paper_mover_mid1_z', x: 5.64, z: -22.0, variant: 'SILHOUETTE_RINGS', patrolAxis: 'Z', patrolRange: 2.8, patrolSpeed: 1.85, patrolOffset: 1.7 },
    { id: 'paper_mover_mid2_z', x: 7.39, z: -26.0, variant: 'BULLSEYE_PRO', patrolAxis: 'Z', patrolRange: 2.8, patrolSpeed: 1.35, patrolOffset: 3.1 },
    { id: 'paper_mover_far_z', x: 9.09, z: -32.0, variant: 'SILHOUETTE_RINGS', patrolAxis: 'Z', patrolRange: 2.5, patrolSpeed: 2.1, patrolOffset: 0.9 },
    { id: 'paper_mover_rail_x1', x: 3.89, z: -18.5, variant: 'BULLSEYE_PRO', patrolAxis: 'X', patrolRange: 2.6, patrolSpeed: 1.25, patrolOffset: 0.4 },
    { id: 'paper_mover_rail_x2', x: 7.39, z: -30.0, variant: 'SILHOUETTE_RINGS', patrolAxis: 'X', patrolRange: 2.4, patrolSpeed: 1.4, patrolOffset: 2.2 },
  ];

  paperTargetDefs.forEach((def) => {
    targets.push(
      createHangingPaperTarget(def, levelGroup, shootableMeshes, isSoftwareGl)
    );
  });

  [-1.36, 9.09].forEach((xPos, idx) => {
    const id = `stander_gong_${idx}`;
    const root = new THREE.Group();
    root.position.set(xPos, 0, -34.5);
    root.rotation.y = 0;
    levelGroup.add(root);

    const pivotGroup = new THREE.Group();
    pivotGroup.position.set(0, 2.1, 0);
    root.add(pivotGroup);

    const gongDisc = new THREE.Mesh(sharedGongGeo!, sharedGongMat!);
    gongDisc.rotation.x = Math.PI / 2;
    gongDisc.position.set(0, -0.65, 0);
    gongDisc.userData = { targetId: id, hitZone: 'STEEL_GONG' };
    pivotGroup.add(gongDisc);
    shootableMeshes.push(gongDisc);

    targets.push({
      id,
      type: 'STEEL_GONG',
      sector: 'RANGE',
      root,
      pivotGroup,
      headMesh: gongDisc,
      torsoMesh: gongDisc,
      basePosition: new THREE.Vector3(xPos, 0, -34.5),
      patrolAxis: 'NONE',
      patrolRange: 0,
      patrolSpeed: 0,
      patrolOffset: 0,
      health: 9999,
      maxHealth: 9999,
      armorHealth: 0,
      isDown: false,
      downTimer: 0,
      hitTiltAngle: 0,
      hitTiltVelocity: 0,
      canShootBack: false,
      windupTimer: 0,
      cooldownTimer: 99,
      isTelegraphing: false,
    });
  });

  // Parede Tática de Armamentos com Modelos 3D Reais das Armas e Suportes Metálicos
  buildStanderArmoryWallRack(levelGroup, shootableMeshes);
}
