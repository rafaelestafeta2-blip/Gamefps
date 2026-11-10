import * as THREE from 'three';
import { WeaponId } from '../types/game';
import { TacticalTargetEntity } from './levelBuilder';

let cachedBullseyeTex: THREE.CanvasTexture | null = null;
let cachedSilhouetteTex: THREE.CanvasTexture | null = null;

/**
 * Generates a high-contrast 512x768 CanvasTexture for the hanging paper bullseye target sheets
 * ("folhas de acertar o tiro / tiro ao alvo") with concentric numbered scoring rings (10, 9, 8, 7)
 * and head/chest bullseye zones.
 */
export function createPaperTargetSheetTexture(
  variant: 'BULLSEYE_PRO' | 'SILHOUETTE_RINGS'
): THREE.CanvasTexture {
  if (variant === 'BULLSEYE_PRO' && cachedBullseyeTex) return cachedBullseyeTex;
  if (variant === 'SILHOUETTE_RINGS' && cachedSilhouetteTex) return cachedSilhouetteTex;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;

  // 1. Heavy off-white ballistic paper background
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

  // Top header bar
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(24, 24, 464, 42);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    variant === 'BULLSEYE_PRO'
      ? 'STANDER PRO B-27 · QUALIFICAÇÃO 25M'
      : 'WARFACE TACTICAL SILHOUETTE · 10-RING',
    256,
    51
  );

  // 2. Tactical Humanoid Silhouette (Head + Shoulders + Torso)
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

  // 3. Chest Concentric Bullseye Rings (6, 7, 8, 9, 10, X)
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

  // 4. Cranial Headshot Bullseye Target (Y = 168)
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

  // 5. Bottom Score Footer Box
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
  tex.anisotropy = 4;
  if (variant === 'BULLSEYE_PRO') cachedBullseyeTex = tex;
  else cachedSilhouetteTex = tex;
  return tex;
}

function createWeaponPlaqueLabelTexture(
  label: string,
  caliber: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 88);
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, 128, 44);
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(caliber, 128, 72);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
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
  isSoftwareGl: boolean
): TacticalTargetEntity {
  const variant = def.variant ?? 'BULLSEYE_PRO';
  const matPaper = new THREE.MeshStandardMaterial({
    map: createPaperTargetSheetTexture(variant),
    roughness: 0.78,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const matClampSteel = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.35,
    metalness: 0.82,
  });
  const matLed = new THREE.MeshBasicMaterial({
    color: def.patrolAxis === 'NONE' ? 0xf59e0b : 0x38bdf8,
  });
  const invisibleHitMat = new THREE.MeshBasicMaterial({ visible: false });

  const root = new THREE.Group();
  root.position.set(def.x, 0, def.z);
  root.rotation.y = -Math.PI / 2;
  parentGroup.add(root);

  const carriage = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.1, 0.18),
    matClampSteel
  );
  carriage.position.set(0, 2.42, 0);
  root.add(carriage);

  const statusLed = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.03, 0.04),
    matLed
  );
  statusLed.position.set(0, 2.36, 0.08);
  root.add(statusLed);

  const pivotGroup = new THREE.Group();
  pivotGroup.position.set(0, 2.02, 0);
  root.add(pivotGroup);

  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.38, 6),
    matClampSteel
  );
  rod.position.set(0, 0.19, 0);
  pivotGroup.add(rod);

  const clampBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.055, 0.04),
    matClampSteel
  );
  clampBar.position.set(0, 0, 0);
  pivotGroup.add(clampBar);

  const sheetMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.64, 0.94),
    matPaper
  );
  sheetMesh.position.set(0, -0.47, 0);
  sheetMesh.castShadow = !isSoftwareGl;
  sheetMesh.receiveShadow = !isSoftwareGl;
  pivotGroup.add(sheetMesh);

  const headHit = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.24, 0.12),
    invisibleHitMat
  );
  headHit.position.set(0, -0.21, 0);
  headHit.userData = { targetId: def.id, hitZone: 'HEAD' };
  pivotGroup.add(headHit);
  shootableMeshes.push(headHit);

  const torsoHit = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.66, 0.12),
    invisibleHitMat
  );
  torsoHit.position.set(0, -0.61, 0);
  torsoHit.userData = { targetId: def.id, hitZone: 'TORSO_A' };
  pivotGroup.add(torsoHit);
  shootableMeshes.push(torsoHit);

  sheetMesh.userData = { targetId: def.id, hitZone: 'TORSO_A' };
  shootableMeshes.push(sheetMesh);

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
  const paperTargetDefs: PaperTargetDef[] = [
    { id: 'paper_lane1_static', x: 2.6, z: -0.22, variant: 'BULLSEYE_PRO', patrolAxis: 'NONE', patrolRange: 0, patrolSpeed: 0, patrolOffset: 0 },
    { id: 'paper_lane2_static', x: 6.4, z: 1.26, variant: 'SILHOUETTE_RINGS', patrolAxis: 'NONE', patrolRange: 0, patrolSpeed: 0, patrolOffset: 0 },
    { id: 'paper_lane3_static', x: 1.8, z: 2.8, variant: 'BULLSEYE_PRO', patrolAxis: 'NONE', patrolRange: 0, patrolSpeed: 0, patrolOffset: 0 },
    { id: 'paper_lane4_static', x: 10.6, z: 4.27, variant: 'SILHOUETTE_RINGS', patrolAxis: 'NONE', patrolRange: 0, patrolSpeed: 0, patrolOffset: 0 },
    { id: 'paper_lane5_static', x: 15.2, z: 5.78, variant: 'BULLSEYE_PRO', patrolAxis: 'NONE', patrolRange: 0, patrolSpeed: 0, patrolOffset: 0 },
    { id: 'paper_mover_near_z', x: 4.5, z: 2.8, variant: 'BULLSEYE_PRO', patrolAxis: 'Z', patrolRange: 2.1, patrolSpeed: 1.55, patrolOffset: 0.0 },
    { id: 'paper_mover_mid1_z', x: 8.5, z: 2.8, variant: 'SILHOUETTE_RINGS', patrolAxis: 'Z', patrolRange: 2.45, patrolSpeed: 1.85, patrolOffset: 1.7 },
    { id: 'paper_mover_mid2_z', x: 12.8, z: 2.8, variant: 'BULLSEYE_PRO', patrolAxis: 'Z', patrolRange: 2.45, patrolSpeed: 1.35, patrolOffset: 3.1 },
    { id: 'paper_mover_far_z', x: 18.4, z: 2.8, variant: 'SILHOUETTE_RINGS', patrolAxis: 'Z', patrolRange: 2.5, patrolSpeed: 2.1, patrolOffset: 0.9 },
    { id: 'paper_mover_rail_x1', x: 9.2, z: 0.52, variant: 'BULLSEYE_PRO', patrolAxis: 'X', patrolRange: 2.6, patrolSpeed: 1.25, patrolOffset: 0.4 },
    { id: 'paper_mover_rail_x2', x: 16.5, z: 4.95, variant: 'SILHOUETTE_RINGS', patrolAxis: 'X', patrolRange: 3.1, patrolSpeed: 1.4, patrolOffset: 2.2 },
  ];

  paperTargetDefs.forEach((def) => {
    targets.push(
      createHangingPaperTarget(def, levelGroup, shootableMeshes, isSoftwareGl)
    );
  });

  // Two Long-Range AR500 Reactive Steel Gongs at 28m (X = 23.6m)
  const gongMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.28,
    metalness: 0.85,
  });
  [1.26, 4.27].forEach((zPos, idx) => {
    const id = `stander_gong_${idx}`;
    const root = new THREE.Group();
    root.position.set(23.6, 0, zPos);
    root.rotation.y = -Math.PI / 2;
    levelGroup.add(root);

    const pivotGroup = new THREE.Group();
    pivotGroup.position.set(0, 2.1, 0);
    root.add(pivotGroup);

    const gongDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.04, 16),
      gongMat
    );
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
      basePosition: new THREE.Vector3(23.6, 0, zPos),
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

  // Quick-Select Tactical Weapon Board next to Booth #5 (X = -6.4, Z = 6.64)
  const weaponRackMeta: Array<{ id: WeaponId; label: string; cal: string }> = [
    { id: 'M4_CARBINE', label: 'M4A1 SOPMOD', cal: '5.56x45MM' },
    { id: 'AK47_RIFLE', label: 'AK-47 COMANDO', cal: '7.62x39MM' },
    { id: 'SMG_45', label: 'SMG .45 SUB', cal: '.45 ACP' },
    { id: 'CARBINE_AR', label: 'CARABINA AR', cal: '5.56x45MM' },
    { id: 'L49_LMG', label: 'LMG PESADA', cal: '100 TIROS' },
    { id: 'SNIPER_TACTICAL', label: 'SNIPER S&B', cal: '.308 WIN' },
    { id: 'SNIPER_BOLT', label: 'SNIPER BOLT', cal: '.338 LAPUA' },
    { id: 'P50_PISTOL', label: 'MARK 23 .45', cal: 'PISTOLA' },
    { id: 'KNIFE_TACTICAL', label: 'FACA TÁTICA', cal: 'COMBATE' },
  ];
  weaponRackMeta.forEach((w, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const slotMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.64, 0.26, 0.05),
      new THREE.MeshBasicMaterial({
        map: createWeaponPlaqueLabelTexture(w.label, w.cal),
      })
    );
    slotMesh.position.set(-7.1 + col * 0.72, 1.85 - row * 0.34, 6.64);
    slotMesh.userData.wallWeaponId = w.id;
    levelGroup.add(slotMesh);
    shootableMeshes.push(slotMesh);
  });
}
