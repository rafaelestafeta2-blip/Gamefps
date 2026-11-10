import * as THREE from 'three';
import { WeaponId } from '../types/game';

interface WeaponPlaqueMeta {
  id: WeaponId;
  label: string;
  cal: string;
}

export const ARMORY_WEAPONS: WeaponPlaqueMeta[] = [
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

let sharedPlaqueGeo: THREE.BoxGeometry | null = null;
let sharedBackingGeo: THREE.BoxGeometry | null = null;
let sharedPegGeo: THREE.CylinderGeometry | null = null;

let sharedGunMetalMat: THREE.MeshLambertMaterial | null = null;
let sharedWoodMat: THREE.MeshLambertMaterial | null = null;
let sharedDarkSteelMat: THREE.MeshLambertMaterial | null = null;
let sharedScopeGlassMat: THREE.MeshBasicMaterial | null = null;
let sharedPegMat: THREE.MeshBasicMaterial | null = null;
let sharedBackingMat: THREE.MeshLambertMaterial | null = null;

function ensureSharedRackResources(): void {
  if (sharedPlaqueGeo) return;
  sharedPlaqueGeo = new THREE.BoxGeometry(0.66, 0.1, 0.02);
  sharedBackingGeo = new THREE.BoxGeometry(0.70, 0.32, 0.015);
  sharedPegGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.08, 8);

  sharedGunMetalMat = new THREE.MeshLambertMaterial({ color: 0x242a35 });
  sharedWoodMat = new THREE.MeshLambertMaterial({ color: 0x783e1c });
  sharedDarkSteelMat = new THREE.MeshLambertMaterial({ color: 0x141820 });
  sharedScopeGlassMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  sharedPegMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  sharedBackingMat = new THREE.MeshLambertMaterial({ color: 0x1c222e });
}

export function createWeaponPlaqueLabelTexture(
  label: string,
  caliber: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 64);

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, 250, 58);

  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, 128, 28);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(caliber, 128, 50);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Constrói modelo 3D realista da arma para exposição na parede de armamentos.
 */
function createWall3DWeaponModel(weaponId: WeaponId): THREE.Group {
  ensureSharedRackResources();
  const gun = new THREE.Group();
  gun.name = `WallWeapon_${weaponId}`;

  const metal = sharedGunMetalMat!;
  const dark = sharedDarkSteelMat!;
  const wood = sharedWoodMat!;

  const addPart = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    rx = 0,
    ry = 0,
    rz = 0
  ) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rx || ry || rz) m.rotation.set(rx, ry, rz);
    m.userData.wallWeaponId = weaponId;
    gun.add(m);
    return m;
  };

  switch (weaponId) {
    case 'AK47_RIFLE': {
      // Corpo AK-47 com madeira clássica e carregador curvo
      addPart(0.24, 0.05, 0.035, 0, 0, 0, metal); // Receptor
      addPart(0.26, 0.02, 0.02, 0.23, 0.008, 0, metal); // Cano
      addPart(0.12, 0.028, 0.028, 0.16, 0.008, 0, wood); // Guarda-mão madeira
      addPart(0.16, 0.055, 0.028, -0.19, -0.015, 0, wood, 0, 0, -0.08); // Coronha madeira
      addPart(0.04, 0.065, 0.022, -0.06, -0.05, 0, wood, 0, 0, 0.35); // Punho
      addPart(0.05, 0.13, 0.022, 0.05, -0.07, 0, metal, 0, 0, 0.28); // Carregador curvo
      addPart(0.02, 0.035, 0.015, 0.35, 0.025, 0, metal); // Alça de mira
      break;
    }
    case 'M4_CARBINE':
    case 'CARBINE_AR': {
      const isCarbine = weaponId === 'CARBINE_AR';
      addPart(0.22, 0.052, 0.035, 0, 0, 0, metal); // Receptor Superior/Inferior
      addPart(0.24, 0.022, 0.022, 0.22, 0.005, 0, dark); // Cano com muzzle
      addPart(0.15, 0.04, 0.036, 0.15, 0.005, 0, dark); // Guarda-mão Picatinny
      addPart(0.16, 0.06, 0.03, -0.18, -0.01, 0, dark); // Coronha retrátil Crane
      addPart(0.038, 0.065, 0.022, -0.05, -0.05, 0, dark, 0, 0, 0.28); // Grip tático
      addPart(0.04, 0.11, 0.022, 0.04, -0.065, 0, dark, 0, 0, 0.12); // Carregador STANAG
      if (isCarbine) {
        addPart(0.09, 0.035, 0.028, 0.01, 0.04, 0, dark); // Mira holográfica EOTech
      } else {
        addPart(0.14, 0.042, 0.028, 0.01, 0.04, 0, dark); // Carry Handle A2
      }
      break;
    }
    case 'SMG_45': {
      addPart(0.19, 0.048, 0.032, 0, 0, 0, dark); // Caixa de culatra
      addPart(0.12, 0.02, 0.02, 0.15, 0.004, 0, dark); // Cano compacto
      addPart(0.14, 0.035, 0.015, -0.15, -0.01, 0, dark); // Coronha rebatível de arame
      addPart(0.035, 0.06, 0.02, -0.04, -0.048, 0, dark, 0, 0, 0.28); // Empunhadura
      addPart(0.03, 0.14, 0.02, 0.02, -0.08, 0, dark, 0, 0, 0.05); // Carregador reto .45
      addPart(0.05, 0.03, 0.022, 0.01, 0.035, 0, dark); // Mini red dot
      break;
    }
    case 'L49_LMG': {
      addPart(0.28, 0.07, 0.045, 0, 0.01, 0, dark); // Caixa da culatra reforçada
      addPart(0.28, 0.03, 0.03, 0.26, 0.01, 0, metal); // Cano pesado perfurado
      addPart(0.18, 0.065, 0.035, -0.21, -0.015, 0, dark); // Coronha pesada
      addPart(0.04, 0.07, 0.025, -0.06, -0.055, 0, dark, 0, 0, 0.25); // Punho
      addPart(0.11, 0.11, 0.055, 0.04, -0.07, 0, dark); // Tambor/Caixa 100 munições
      addPart(0.12, 0.025, 0.018, 0.08, 0.065, 0, metal); // Alça de transporte
      break;
    }
    case 'SNIPER_BOLT':
    case 'SNIPER_TACTICAL': {
      const isTac = weaponId === 'SNIPER_TACTICAL';
      addPart(0.32, 0.05, 0.032, 0, 0, 0, dark); // Ação/Receptor
      addPart(0.38, 0.022, 0.022, 0.34, 0.008, 0, metal); // Cano longo precisão
      addPart(0.06, 0.032, 0.03, 0.52, 0.008, 0, dark); // Freio de boca Muzzle Brake
      addPart(0.22, 0.07, 0.028, -0.24, -0.015, 0, dark); // Coronha ajustável
      addPart(0.038, 0.06, 0.022, -0.06, -0.05, 0, dark, 0, 0, 0.3); // Punho
      addPart(0.045, 0.075, 0.022, 0.06, -0.05, 0, dark); // Carregador 5/10 rounds
      // Luneta Telescópica de Alta Precisão (Scope)
      addPart(0.22, 0.032, 0.026, 0.02, 0.048, 0, dark); // Tubo da luneta
      addPart(0.035, 0.044, 0.036, 0.12, 0.048, 0, dark); // Objetiva frontal
      addPart(0.03, 0.038, 0.032, -0.08, 0.048, 0, dark); // Ocular
      // Lente azulada
      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.014, 0.005, 12),
        sharedScopeGlassMat!
      );
      lens.rotation.z = Math.PI / 2;
      lens.position.set(0.138, 0.048, 0);
      lens.userData.wallWeaponId = weaponId;
      gun.add(lens);

      if (isTac) {
        addPart(0.02, 0.09, 0.015, 0.38, -0.04, 0, dark); // Bipé retraído
      }
      break;
    }
    case 'P50_PISTOL': {
      addPart(0.15, 0.04, 0.028, 0.02, 0.02, 0, metal); // Ferrolho/Slide Mark 23
      addPart(0.09, 0.035, 0.026, 0.01, 0.005, 0, dark); // Armação/Frame
      addPart(0.035, 0.095, 0.024, -0.03, -0.04, 0, dark, 0, 0, 0.24); // Empunhadura pistola
      addPart(0.03, 0.02, 0.012, 0.01, -0.015, 0, dark); // Guarda-mato
      break;
    }
    case 'KNIFE_TACTICAL': {
      // Lâmina serrilhada de combate
      addPart(0.18, 0.035, 0.006, 0.08, 0.005, 0, metal);
      addPart(0.015, 0.05, 0.02, -0.01, 0.005, 0, dark); // Guarda cruzada
      addPart(0.11, 0.03, 0.022, -0.07, 0.005, 0, dark); // Cabo tático texturizado
      addPart(0.02, 0.034, 0.024, -0.13, 0.005, 0, metal); // Pomo traseiro
      break;
    }
  }

  return gun;
}

/**
 * Constrói a parede completa de armamentos com suporte pegboard metálico,
 * placas de calibre e modelos 3D reais das armas expostas na parede.
 */
export function buildStanderArmoryWallRack(
  levelGroup: THREE.Group,
  shootableMeshes: THREE.Mesh[]
): void {
  ensureSharedRackResources();

  const rackGroup = new THREE.Group();
  rackGroup.name = 'StanderArmoryWallRack';
  levelGroup.add(rackGroup);

  ARMORY_WEAPONS.forEach((w, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);

    const posX = -7.1 + col * 0.72;
    const posY = 1.85 - row * 0.34;
    const posZ = 6.64;

    const slotGroup = new THREE.Group();
    slotGroup.position.set(posX, posY, posZ);
    rackGroup.add(slotGroup);

    // 1. Placa de fundo metálica de suporte
    const backingMesh = new THREE.Mesh(sharedBackingGeo!, sharedBackingMat!);
    backingMesh.position.set(0, 0, -0.01);
    backingMesh.userData.wallWeaponId = w.id;
    slotGroup.add(backingMesh);
    shootableMeshes.push(backingMesh);

    // 2. Placa com o nome e calibre da arma
    const labelTex = createWeaponPlaqueLabelTexture(w.label, w.cal);
    const plaqueMat = new THREE.MeshBasicMaterial({ map: labelTex });
    const plaqueMesh = new THREE.Mesh(sharedPlaqueGeo!, plaqueMat);
    plaqueMesh.position.set(0, -0.11, 0.005);
    plaqueMesh.userData.wallWeaponId = w.id;
    slotGroup.add(plaqueMesh);
    shootableMeshes.push(plaqueMesh);

    // 3. Pinos/Ganchos de suporte para a arma
    [-0.14, 0.14].forEach((px) => {
      const peg = new THREE.Mesh(sharedPegGeo!, sharedPegMat!);
      peg.rotation.x = Math.PI / 2;
      peg.position.set(px, 0.02, 0.025);
      slotGroup.add(peg);
    });

    // 4. Modelo 3D Real da Arma repousando sobre os pinos
    const gunModel = createWall3DWeaponModel(w.id);
    gunModel.position.set(0, 0.05, 0.04);
    slotGroup.add(gunModel);

    // Adiciona todas as partes da arma aos alvos clicáveis para seleção tática
    gunModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.userData.wallWeaponId = w.id;
        shootableMeshes.push(mesh);
      }
    });
  });
}
