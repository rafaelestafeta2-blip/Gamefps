import * as THREE from 'three';
import {
  ColliderBox,
  TacticalLevelData,
  TacticalTargetEntity,
} from './levelBuilder';
import { ProceduralTextures } from './textures';
import {
  createYardTextures,
  YARD_BOMB_SITE_A,
  YARD_BOMB_SITE_B,
} from './yardMapData';
import {
  addBombSiteMarker,
  addGreenShopRooftopDetails,
  addMilitaryCargoTruck,
  addYardPowerLinesAndPoles,
  spawnYard5v5Bots,
} from './yardPropsBuilder';

export function buildYardLevel(
  _baseTextures: ProceduralTextures,
  isSoftwareGl: boolean
): TacticalLevelData {
  const levelGroup = new THREE.Group();
  const colliders: ColliderBox[] = [];
  const targets: TacticalTargetEntity[] = [];
  const shootableMeshes: THREE.Mesh[] = [];
  const wallStandPositions: THREE.Vector3[] = [];

  const yardTex = createYardTextures();
  yardTex.sandyGround.repeat.set(48, 48);

  const matSand = new THREE.MeshStandardMaterial({
    map: yardTex.sandyGround,
    roughness: 0.92,
    metalness: 0.02,
  });
  const matAdobe = new THREE.MeshStandardMaterial({
    map: yardTex.adobeBrick,
    roughness: 0.86,
    metalness: 0.04,
  });
  const matGreenShop = new THREE.MeshStandardMaterial({
    map: yardTex.greenStucco,
    roughness: 0.82,
    metalness: 0.05,
  });
  const matCrate = new THREE.MeshStandardMaterial({
    map: yardTex.woodenCrate,
    roughness: 0.78,
    metalness: 0.12,
  });
  const matTealGate = new THREE.MeshStandardMaterial({
    map: yardTex.tealGate,
    roughness: 0.5,
    metalness: 0.65,
  });
  const matWoodDark = new THREE.MeshStandardMaterial({
    color: 0x5c4734,
    roughness: 0.85,
  });
  const matIronRail = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.45,
    metalness: 0.8,
  });

  // 1. GROUND TERRAIN & DISTANT AFGHAN MOUNTAIN HORIZON
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), matSand);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = !isSoftwareGl;
  levelGroup.add(ground);

  // Distant mountain ridge silhouettes around the horizon (matching screenshot sky)
  const matMountain = new THREE.MeshBasicMaterial({ color: 0x8b8578 });
  [
    [0, -68, 140, 18, 4],
    [0, 68, 140, 14, 4],
    [-68, 0, 4, 16, 140],
    [68, 0, 4, 16, 140],
  ].forEach(([mx, mz, mw, mh, md]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(mw, mh, md), matMountain);
    m.position.set(mx, mh / 2 - 1, mz);
    levelGroup.add(m);
  });

  const addBlock = (
    x: number,
    yBottom: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: THREE.MeshStandardMaterial,
    hasCollider = true
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, yBottom + h / 2, z);
    mesh.castShadow = !isSoftwareGl;
    mesh.receiveShadow = !isSoftwareGl;
    mesh.userData.isEnvironment = true;
    levelGroup.add(mesh);
    shootableMeshes.push(mesh);

    if (hasCollider) {
      colliders.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minY: yBottom,
        maxY: yBottom + h,
        minZ: z - d / 2,
        maxZ: z + d / 2,
      });
    }
    return mesh;
  };

  // Helper to build a Crouch-Only Wall Breach (lintel above Y=1.14m so player must crouch/slide!)
  const addCrouchWallBreach = (
    x: number,
    z: number,
    w: number,
    d: number,
    signNormalAxis: 'X' | 'Z'
  ) => {
    addBlock(x, 1.14, z, w, 2.46, d, matAdobe, true);
    const signGeo = new THREE.PlaneGeometry(1.8, 0.45);
    const signMat = new THREE.MeshBasicMaterial({
      map: yardTex.crouchHintSign,
      side: THREE.DoubleSide,
    });
    const s1 = new THREE.Mesh(signGeo, signMat);
    const s2 = new THREE.Mesh(signGeo, signMat);
    if (signNormalAxis === 'X') {
      s1.rotation.y = Math.PI / 2;
      s2.rotation.y = -Math.PI / 2;
      s1.position.set(x + w / 2 + 0.03, 1.55, z);
      s2.position.set(x - w / 2 - 0.03, 1.55, z);
    } else {
      s1.position.set(x, 1.55, z + d / 2 + 0.03);
      s2.rotation.y = Math.PI;
      s2.position.set(x, 1.55, z - d / 2 - 0.03);
    }
    levelGroup.add(s1, s2);
  };

  // 2. OUTER MAP PERIMETER (Matches Yard_Map_Radar_7754e5f9.webp silhouette)
  addBlock(0, 0, 44.5, 68, 5.2, 1.2, matAdobe);
  addBlock(0, 0, -42.5, 68, 5.5, 1.2, matAdobe);
  addBlock(-33.5, 0, 0, 1.2, 5.2, 88, matAdobe);
  addBlock(15.5, 0, 25.0, 1.2, 5.2, 38, matAdobe);
  addBlock(15.5, 0, -30.0, 1.2, 5.2, 24, matAdobe);
  addBlock(38.5, 0, -6.0, 1.2, 5.2, 26, matAdobe);
  addBlock(27.0, 0, 6.5, 23, 5.2, 1.2, matAdobe);
  addBlock(27.0, 0, -18.5, 23, 5.2, 1.2, matAdobe);

  // 3. SOUTH SPAWN STREET (EXACT MATCH TO SCREENSHOT!)
  // 3A. Left Building: MAYWAND HOTEL (2-story adobe building with walkable balcony!)
  addBlock(-6.4, 0, 33.2, 0.5, 5.4, 2.6, matAdobe);
  addBlock(-6.4, 2.2, 30.5, 0.5, 3.2, 2.8, matAdobe);
  addBlock(-6.4, 0, 22.5, 0.5, 2.8, 13.2, matAdobe);
  addBlock(-6.4, 2.8, 21.0, 0.5, 2.6, 10.2, matAdobe);
  addBlock(-11.0, 0, 34.2, 9.2, 5.4, 0.5, matAdobe);
  addBlock(-11.0, 0, 16.0, 9.2, 5.4, 0.5, matAdobe);
  addBlock(-15.4, 0, 25.0, 0.5, 5.4, 18.5, matAdobe);

  // Hotel 2nd-Floor Floor Slab & Exterior Walkable Balcony (Y = 2.75m)
  addBlock(-9.6, 2.6, 25.0, 6.0, 0.2, 17.5, matWoodDark);
  addBlock(-5.1, 2.6, 25.0, 2.2, 0.2, 18.2, matWoodDark);
  addBlock(-4.05, 2.8, 25.0, 0.12, 0.82, 18.0, matIronRail);
  for (let s = 0; s < 7; s++) {
    addBlock(-13.5, 0, 31.5 - s * 0.95, 2.4, (s + 1) * 0.39, 0.95, matWoodDark);
  }
  // Exterior Crate Climb onto South end of Hotel Balcony
  addBlock(-5.2, 0, 36.2, 1.35, 0.85, 1.35, matCrate);
  addBlock(-3.8, 0, 37.2, 1.35, 0.85, 1.35, matCrate);
  addBlock(-5.1, 0, 34.8, 1.3, 1.65, 1.3, matCrate);
  addBlock(-5.1, 0, 33.6, 1.2, 2.35, 1.1, matCrate);

  const hotelSignMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 0.72),
    new THREE.MeshBasicMaterial({ map: yardTex.hotelSign })
  );
  hotelSignMesh.rotation.y = Math.PI / 2;
  hotelSignMesh.position.set(-6.12, 2.15, 26.8);
  levelGroup.add(hotelSignMesh);

  const matGreenWin = new THREE.MeshStandardMaterial({ color: 0x2d4f3e, roughness: 0.5 });
  [24.8, 19.2].forEach((wz) => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 1.1), matGreenWin);
    win.position.set(-6.14, 1.45, wz);
    levelGroup.add(win);
  });

  // 3B. Right Building: GREEN STUCCO SHOP (X: 2.5 to 12.5, Z: 19.5 to 29.5)
  addBlock(3.1, 0, 29.5, 1.2, 2.75, 0.45, matGreenShop);
  addBlock(4.5, 2.1, 29.5, 1.6, 0.65, 0.45, matGreenShop);
  addBlock(8.9, 0, 29.5, 7.2, 2.75, 0.45, matGreenShop);
  addBlock(2.5, 0, 26.5, 0.45, 2.75, 6.0, matGreenShop);
  addBlock(2.5, 2.1, 22.5, 0.45, 0.65, 1.8, matGreenShop);
  addBlock(2.5, 0, 20.5, 0.45, 2.75, 2.2, matGreenShop);
  addBlock(7.5, 0, 19.5, 10.0, 2.75, 0.45, matGreenShop);
  addBlock(12.5, 0, 24.5, 0.45, 2.75, 10.0, matGreenShop);
  addBlock(7.5, 2.55, 24.5, 10.2, 0.2, 10.2, matAdobe); // Walkable Flat Roof (Y = 2.75m)

  const shopSignMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 0.65),
    new THREE.MeshBasicMaterial({ map: yardTex.shopSign })
  );
  shopSignMesh.position.set(6.8, 2.28, 29.75);
  levelGroup.add(shopSignMesh);

  const redWin = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 1.1, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x88292f, roughness: 0.55 })
  );
  redWin.position.set(9.4, 1.45, 29.74);
  levelGroup.add(redWin);

  addGreenShopRooftopDetails(levelGroup, isSoftwareGl);

  // 3C. Foreground Right Mud-Brick Wall & Stacked Wooden Crates (Climb to Green Shop Roof!)
  addBlock(3.5, 0, 34.5, 0.65, 1.55, 9.5, matAdobe);
  addBlock(1.95, 0, 33.8, 1.35, 0.85, 1.35, matCrate);
  addBlock(1.95, 0.85, 32.5, 1.3, 0.85, 1.3, matCrate);
  addBlock(3.2, 1.55, 30.4, 1.35, 0.68, 1.35, matCrate);

  // 3D. Overhead Wooden Plank Bridge connecting Green Shop Roof to Hotel Balcony
  addBlock(-0.75, 2.6, 19.8, 6.6, 0.15, 1.25, matWoodDark);

  // 3E. Teal/Blue Corrugated Metal Gates at end of Spawn Street
  addBlock(-3.2, 0, 15.2, 2.2, 2.6, 0.22, matTealGate);
  addBlock(1.5, 0, 15.2, 2.2, 2.6, 0.22, matTealGate);
  addBlock(3.5, 0, 15.2, 2.0, 2.8, 0.45, matAdobe);

  // 4. CENTRAL COMPOUND, MID STREET & 3 CROUCH PASSAGES
  addBlock(-4.2, 0, 8.5, 1.2, 1.9, 3.6, matAdobe);
  addBlock(1.8, 0, 8.5, 1.2, 1.9, 4.2, matAdobe);

  addBlock(1.0, 0, 3.0, 16.5, 3.8, 0.6, matAdobe);
  addBlock(1.0, 0, -13.0, 16.5, 3.8, 0.6, matAdobe);
  addBlock(9.2, 0, -5.0, 0.6, 3.8, 16.0, matAdobe);
  addBlock(-7.2, 0, 1.2, 0.6, 3.8, 3.6, matAdobe);
  addCrouchWallBreach(-7.2, -2.0, 0.6, 2.8, 'X'); // Crouch Breach #1
  addBlock(-7.2, 0, -8.2, 0.6, 3.8, 9.6, matAdobe);

  addBlock(6.2, 0, 4.0, 1.3, 0.85, 1.3, matCrate);
  addBlock(7.5, 0, 4.0, 1.3, 1.65, 1.3, matCrate);
  addBlock(4.5, 0, 1.2, 7.5, 2.4, 3.2, matAdobe);

  // 5. EAST COURTYARD — BOMB SITE A (PÁTIO DO CAMINHÃO)
  addBlock(15.5, 0, -16.0, 0.6, 3.6, 5.0, matAdobe);
  addBlock(15.5, 0, -7.0, 0.6, 3.6, 5.8, matAdobe);
  addBlock(15.5, 0, 0.4, 0.6, 3.6, 3.2, matAdobe);
  addCrouchWallBreach(15.5, 3.6, 0.6, 3.0, 'X'); // Crouch Breach #2

  addBombSiteMarker(levelGroup, colliders, shootableMeshes, 'A', YARD_BOMB_SITE_A, yardTex, isSoftwareGl);
  addMilitaryCargoTruck(levelGroup, colliders, shootableMeshes, 30.5, -11.0, isSoftwareGl);

  addBlock(34.5, 0, 2.8, 6.5, 2.5, 5.5, matAdobe);
  addBlock(30.2, 0, 4.2, 1.3, 0.85, 1.3, matCrate);
  addBlock(30.2, 0, 2.8, 1.3, 1.68, 1.3, matCrate);

  // 6. WEST COMPOUND — BOMB SITE B (VILA OESTE)
  addBlock(-16.5, 0, 8.5, 0.6, 3.6, 9.5, matAdobe);
  addCrouchWallBreach(-16.5, 2.2, 0.6, 3.0, 'X'); // Crouch Breach #3
  addBlock(-16.5, 0, -4.5, 0.6, 3.6, 6.5, matAdobe);
  addBlock(-24.5, 0, 4.5, 9.0, 3.6, 0.6, matAdobe);

  addBombSiteMarker(levelGroup, colliders, shootableMeshes, 'B', YARD_BOMB_SITE_B, yardTex, isSoftwareGl);

  addBlock(-29.5, 0, -9.0, 5.5, 2.5, 11.0, matAdobe);
  addBlock(-29.5, 0, -2.8, 1.4, 0.85, 1.4, matCrate);
  addBlock(-28.0, 0, -2.8, 1.4, 1.68, 1.4, matCrate);

  // 7. NORTH WAREHOUSE SECTOR (DEFENDER SPAWN - WARFACE)
  addBlock(-1.5, 0, -21.5, 14.0, 4.2, 5.5, matAdobe);
  addBlock(1.5, 0, -31.0, 15.0, 4.5, 6.0, matGreenShop);
  addBlock(-18.5, 0, -26.5, 7.0, 3.8, 8.0, matAdobe);

  addYardPowerLinesAndPoles(levelGroup, colliders, isSoftwareGl);
  spawnYard5v5Bots(levelGroup, targets, shootableMeshes, isSoftwareGl);

  return {
    levelGroup,
    colliders,
    targets,
    shootableMeshes,
    wallStandPositions,
  };
}
