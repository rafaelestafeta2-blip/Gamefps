import * as THREE from 'three';
import { WeaponId } from '../types/game';

let sharedRifleBarrelGeo: THREE.BoxGeometry | null = null;
let sharedRifleReceiverGeo: THREE.BoxGeometry | null = null;
let sharedRifleMagGeo: THREE.BoxGeometry | null = null;
let sharedRifleStockGeo: THREE.BoxGeometry | null = null;
let sharedIffGeo: THREE.BoxGeometry | null = null;
let sharedGunMetalMat: THREE.MeshStandardMaterial | null = null;
let sharedWoodAccentMat: THREE.MeshStandardMaterial | null = null;
let sharedAllyBadgeMat: THREE.MeshBasicMaterial | null = null;
let sharedEnemyBadgeMat: THREE.MeshBasicMaterial | null = null;

export function ensureSharedWeaponProps(): void {
  if (sharedRifleReceiverGeo) return;
  sharedRifleReceiverGeo = new THREE.BoxGeometry(0.055, 0.085, 0.34);
  sharedRifleBarrelGeo = new THREE.BoxGeometry(0.026, 0.026, 0.36);
  sharedRifleMagGeo = new THREE.BoxGeometry(0.04, 0.15, 0.065);
  sharedRifleStockGeo = new THREE.BoxGeometry(0.048, 0.095, 0.22);
  sharedIffGeo = new THREE.BoxGeometry(0.062, 0.018, 0.12);
  sharedGunMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e2430,
    roughness: 0.4,
    metalness: 0.78,
  });
  sharedWoodAccentMat = new THREE.MeshStandardMaterial({
    color: 0x6b4423,
    roughness: 0.65,
    metalness: 0.15,
  });
  sharedAllyBadgeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  sharedEnemyBadgeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
}

export function createBotThirdPersonWeaponMesh(
  weaponId: WeaponId | undefined,
  isAlly: boolean
): THREE.Group {
  ensureSharedWeaponProps();
  const group = new THREE.Group();
  group.name = 'BotWorldWeapon';

  const isAk = weaponId === 'AK47_RIFLE';
  const isSniper =
    weaponId === 'SNIPER_BOLT' || weaponId === 'SNIPER_TACTICAL';

  const receiver = new THREE.Mesh(sharedRifleReceiverGeo!, sharedGunMetalMat!);
  receiver.position.set(0, 0, 0.14);
  group.add(receiver);

  const barrel = new THREE.Mesh(sharedRifleBarrelGeo!, sharedGunMetalMat!);
  barrel.position.set(0, 0.015, isSniper ? 0.44 : 0.38);
  if (isSniper) barrel.scale.set(1, 1, 1.35);
  group.add(barrel);

  const mag = new THREE.Mesh(
    sharedRifleMagGeo!,
    isAk ? sharedWoodAccentMat! : sharedGunMetalMat!
  );
  mag.position.set(0, -0.09, 0.18);
  mag.rotation.x = isAk ? 0.24 : 0.08;
  group.add(mag);

  const stock = new THREE.Mesh(
    sharedRifleStockGeo!,
    isAk ? sharedWoodAccentMat! : sharedGunMetalMat!
  );
  stock.position.set(0, -0.015, -0.08);
  group.add(stock);

  const iffStrip = new THREE.Mesh(
    sharedIffGeo!,
    isAlly ? sharedAllyBadgeMat! : sharedEnemyBadgeMat!
  );
  iffStrip.position.set(0, 0.035, 0.22);
  group.add(iffStrip);

  return group;
}
