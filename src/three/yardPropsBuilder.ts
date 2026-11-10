import * as THREE from 'three';
import { ColliderBox, TacticalTargetEntity } from './levelBuilder';
import { YardTextureSet } from './yardMapData';

import { WeaponId } from '../types/game';

export interface YardBotEntity extends TacticalTargetEntity {
  isAlly?: boolean;
  callsign?: string;
  team?: 'VANGUARD' | 'BLACKTHORN';
  weaponId?: WeaponId;
}

export function addYardPowerLinesAndPoles(
  levelGroup: THREE.Group,
  colliders: ColliderBox[],
  isSoftwareGl: boolean
): void {
  const matWoodPole = new THREE.MeshStandardMaterial({ color: 0x6e5d4b, roughness: 0.88 });
  const matCrossArm = new THREE.MeshStandardMaterial({ color: 0x4b3f32, roughness: 0.85 });
  const wireMat = new THREE.LineBasicMaterial({ color: 0x18181b });

  const poleCoords = [
    [-2.1, 26.8], // Main foreground utility pole from the screenshot!
    [-3.2, 8.5],
    [13.5, 6.0],
    [-16.5, -6.0],
    [18.0, -14.0],
    [0.5, -24.0],
  ];

  poleCoords.forEach(([px, pz]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 7.6, 10), matWoodPole);
    pole.position.set(px, 3.8, pz);
    pole.castShadow = !isSoftwareGl;
    levelGroup.add(pole);

    const crossArm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.1), matCrossArm);
    crossArm.position.set(px, 7.1, pz);
    levelGroup.add(crossArm);

    colliders.push({
      minX: px - 0.18, maxX: px + 0.18,
      minY: 0, maxY: 7.5,
      minZ: pz - 0.18, maxZ: pz + 0.18,
    });
  });

  // Connect sagging catenary power cables between poles and roofs (matching screenshot!)
  const addSaggingWire = (start: THREE.Vector3, end: THREE.Vector3, sag = 0.65) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const p = new THREE.Vector3().lerpVectors(start, end, t);
      p.y -= Math.sin(t * Math.PI) * sag;
      pts.push(p);
    }
    levelGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
  };

  addSaggingWire(new THREE.Vector3(-2.1, 7.1, 26.8), new THREE.Vector3(4.5, 4.8, 36.5), 0.7);
  addSaggingWire(new THREE.Vector3(-2.1, 7.1, 26.8), new THREE.Vector3(2.8, 4.5, 29.2), 0.5);
  addSaggingWire(new THREE.Vector3(-2.1, 7.1, 26.8), new THREE.Vector3(-6.2, 5.6, 23.0), 0.45);
  addSaggingWire(new THREE.Vector3(-2.1, 7.1, 26.8), new THREE.Vector3(-3.2, 7.1, 8.5), 0.85);
  addSaggingWire(new THREE.Vector3(-3.2, 7.1, 8.5), new THREE.Vector3(13.5, 7.1, 6.0), 0.8);
  addSaggingWire(new THREE.Vector3(-3.2, 7.1, 8.5), new THREE.Vector3(-16.5, 7.1, -6.0), 0.8);
  addSaggingWire(new THREE.Vector3(13.5, 7.1, 6.0), new THREE.Vector3(18.0, 7.1, -14.0), 0.85);
}

export function addGreenShopRooftopDetails(
  levelGroup: THREE.Group,
  isSoftwareGl: boolean
): void {
  const roofY = 2.75;
  const matWoodFence = new THREE.MeshStandardMaterial({ color: 0x7c6a56, roughness: 0.9 });
  const matBlueBarrel = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.45, metalness: 0.15 });

  // 1. Blue Water Barrel on top-left corner of Green Shop roof (exact match to photo!)
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.78, 14), matBlueBarrel);
  barrel.position.set(3.5, roofY + 0.39, 28.6);
  barrel.castShadow = !isSoftwareGl;
  levelGroup.add(barrel);

  const barrelLid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.04, 14),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 })
  );
  barrelLid.position.set(3.5, roofY + 0.79, 28.6);
  levelGroup.add(barrelLid);

  // 2. Wooden Fence Backdrop behind clothesline
  for (let x = 3.2; x <= 8.8; x += 0.38) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.55, 0.06), matWoodFence);
    slat.position.set(x, roofY + 0.78, 27.6);
    levelGroup.add(slat);
  }

  // 3. Hanging Colorful Laundry on Clothesline (red, white, blue, pink garments!)
  const clothesColors = [0xdc2626, 0xf1f5f9, 0x93c5fd, 0xf472b6, 0xe2e8f0, 0xcbd5e1];
  clothesColors.forEach((col, idx) => {
    const cloth = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.72, 0.04),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.85 })
    );
    cloth.position.set(3.8 + idx * 0.76, roofY + 1.02, 28.2);
    cloth.rotation.y = (idx % 2 === 0 ? 1 : -1) * 0.06;
    cloth.castShadow = !isSoftwareGl;
    levelGroup.add(cloth);
  });

  // 4. Leaning bundle of wooden poles against the right brick wall (behind foreground crates!)
  const poleBundleGroup = new THREE.Group();
  poleBundleGroup.position.set(3.15, 0, 31.8);
  poleBundleGroup.rotation.set(-0.14, 0, -0.26);
  for (let i = 0; i < 6; i++) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 3.6, 7), matWoodFence);
    stick.position.set((i % 3) * 0.09, 1.75, Math.floor(i / 3) * 0.09);
    poleBundleGroup.add(stick);
  }
  levelGroup.add(poleBundleGroup);
}

export function addMilitaryCargoTruck(
  levelGroup: THREE.Group,
  colliders: ColliderBox[],
  shootableMeshes: THREE.Mesh[],
  x: number,
  z: number,
  isSoftwareGl: boolean
): void {
  const matTruckOlive = new THREE.MeshStandardMaterial({ color: 0x3f4d34, roughness: 0.7, metalness: 0.25 });
  const matTruckCanvas = new THREE.MeshStandardMaterial({ color: 0x786f59, roughness: 0.88 });
  const matTire = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });

  // Flatbed (climbable Y = 1.15m)
  const bed = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.15, 2.5), matTruckOlive);
  bed.position.set(x, 0.575, z);
  bed.castShadow = !isSoftwareGl;
  bed.receiveShadow = !isSoftwareGl;
  bed.userData.isEnvironment = true;
  levelGroup.add(bed);
  shootableMeshes.push(bed);
  colliders.push({
    minX: x - 2.8, maxX: x + 2.8,
    minY: 0, maxY: 1.15,
    minZ: z - 1.25, maxZ: z + 1.25,
  });

  // Truck Cab (East end of truck, climbable Y = 2.25m)
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.1, 2.4), matTruckCanvas);
  cab.position.set(x + 1.7, 1.7, z);
  cab.castShadow = !isSoftwareGl;
  cab.userData.isEnvironment = true;
  levelGroup.add(cab);
  shootableMeshes.push(cab);
  colliders.push({
    minX: x + 0.65, maxX: x + 2.75,
    minY: 1.15, maxY: 2.25,
    minZ: z - 1.2, maxZ: z + 1.2,
  });

  [-2.0, 0.0, 2.0].forEach((wx) => {
    [-1.3, 1.3].forEach((wz) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.28, 12), matTire);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x + wx, 0.45, z + wz);
      levelGroup.add(wheel);
    });
  });
}

export function addBombSiteMarker(
  levelGroup: THREE.Group,
  colliders: ColliderBox[],
  shootableMeshes: THREE.Mesh[],
  site: 'A' | 'B',
  pos: THREE.Vector3,
  yardTex: YardTextureSet,
  isSoftwareGl: boolean
): void {
  const colorHex = site === 'A' ? 0xef4444 : 0x38bdf8;
  const signTex = site === 'A' ? yardTex.bombSiteASign : yardTex.bombSiteBSign;

  const zoneRing = new THREE.Mesh(
    new THREE.RingGeometry(2.1, 2.35, 32),
    new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide })
  );
  zoneRing.rotation.x = -Math.PI / 2;
  zoneRing.position.set(pos.x, 0.02, pos.z);
  levelGroup.add(zoneRing);

  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.95, 1.3),
    new THREE.MeshStandardMaterial({ map: yardTex.woodenCrate, roughness: 0.78 })
  );
  crate.position.set(pos.x, 0.475, pos.z);
  crate.castShadow = !isSoftwareGl;
  crate.userData.isEnvironment = true;
  levelGroup.add(crate);
  shootableMeshes.push(crate);
  colliders.push({
    minX: pos.x - 0.65, maxX: pos.x + 0.65,
    minY: 0, maxY: 0.95,
    minZ: pos.z - 0.65, maxZ: pos.z + 0.65,
  });

  const signBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.95, 0.95),
    new THREE.MeshBasicMaterial({ map: signTex })
  );
  signBox.position.set(pos.x, 2.85, pos.z);
  levelGroup.add(signBox);
}

export function spawnYard5v5Bots(
  levelGroup: THREE.Group,
  targets: TacticalTargetEntity[],
  shootableMeshes: THREE.Mesh[],
  isSoftwareGl: boolean
): void {
  const spawnBot = (opts: {
    id: string;
    x: number;
    y?: number;
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
    root.position.set(opts.x, opts.y ?? 0, opts.z);

    const pivotGroup = new THREE.Group();
    pivotGroup.position.set(0, 0.22, 0);
    root.add(pivotGroup);

    const matSuit = new THREE.MeshStandardMaterial({ color: opts.isAlly ? 0x1e3a5f : 0x27272a, roughness: 0.65 });
    const matHead = new THREE.MeshStandardMaterial({ color: opts.isAlly ? 0x0ea5e9 : 0xdc2626, roughness: 0.4 });

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

    if (!opts.isAlly) {
      torsoMesh.userData.targetId = opts.id;
      torsoMesh.userData.hitZone = 'TORSO_A';
      headMesh.userData.targetId = opts.id;
      headMesh.userData.hitZone = 'HEAD';
      shootableMeshes.push(torsoMesh, headMesh);
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
      basePosition: new THREE.Vector3(opts.x, opts.y ?? 0, opts.z),
      patrolOffset: Math.random() * Math.PI * 2,
      patrolSpeed: opts.patrolSpeed ?? 1.1,
      patrolAxis: opts.patrolAxis ?? 'X',
      patrolRange: opts.patrolRange ?? 2.5,
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

  // 5 Enemy Defenders (Blackthorn Mercenaries)
  spawnBot({ id: 'yard_def_mid', callsign: 'KRAKEN-BT', weaponId: 'AK47_RIFLE', x: -0.8, z: 6.2, isAlly: false, patrolAxis: 'X', patrolRange: 3.2, hasArmor: true });
  spawnBot({ id: 'yard_def_siteA_truck', callsign: 'WRAITH-BT', weaponId: 'SNIPER_BOLT', x: 26.5, z: -7.5, isAlly: false, patrolAxis: 'Z', patrolRange: 3.5, hasArmor: true });
  spawnBot({ id: 'yard_def_siteA_high', callsign: 'VOLT-BT', weaponId: 'P50_PISTOL', x: 33.5, y: 2.5, z: 2.2, isAlly: false, patrolAxis: 'X', patrolRange: 1.8 });
  spawnBot({ id: 'yard_def_siteB', callsign: 'SERAPH-BT', weaponId: 'M4_CARBINE', x: -21.5, z: -6.5, isAlly: false, patrolAxis: 'X', patrolRange: 3.0, hasArmor: true });
  spawnBot({ id: 'yard_def_north_sniper', callsign: 'HAVOC-BT', weaponId: 'AK47_RIFLE', x: 11.5, z: -15.5, isAlly: false, patrolAxis: 'X', patrolRange: 2.5, hasArmor: true });

  // 4 Allied Attackers (Vanguard Operations Squad)
  spawnBot({ id: 'yard_ally_1', callsign: 'RECON-02', weaponId: 'SNIPER_BOLT', x: -3.5, z: 32.0, isAlly: true, patrolAxis: 'Z', patrolRange: 5.5, patrolSpeed: 1.35, hasArmor: true });
  spawnBot({ id: 'yard_ally_2', callsign: 'STRIKER-03', weaponId: 'AK47_RIFLE', x: 1.2, z: 31.0, isAlly: true, patrolAxis: 'Z', patrolRange: 6.0, patrolSpeed: 1.25, hasArmor: true });
  spawnBot({ id: 'yard_ally_3', callsign: 'LIFELINE-04', weaponId: 'M4_CARBINE', x: -11.5, z: 12.0, isAlly: true, patrolAxis: 'Z', patrolRange: 4.5, patrolSpeed: 1.2 });
  spawnBot({ id: 'yard_ally_4', callsign: 'WARDEN-05', weaponId: 'M4_CARBINE', x: 12.0, z: 8.0, isAlly: true, patrolAxis: 'Z', patrolRange: 4.5, patrolSpeed: 1.2 });
}
