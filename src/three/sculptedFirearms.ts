import * as THREE from 'three';
import { WeaponId } from '../types/game';

export interface SculptedWeaponBuildResult {
  group: THREE.Group;
  pumpGroup?: THREE.Group;
}

interface SharedPbrMats {
  gunmetal: THREE.MeshStandardMaterial;
  parkerized: THREE.MeshStandardMaterial;
  polymer: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  redShell: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  opticGlass: THREE.MeshPhysicalMaterial;
  fiberOrange: THREE.MeshBasicMaterial;
}

let cachedMats: SharedPbrMats | null = null;

function getSharedMats(): SharedPbrMats {
  if (cachedMats) return cachedMats;
  cachedMats = {
    gunmetal: new THREE.MeshStandardMaterial({
      color: 0x262c36,
      roughness: 0.34,
      metalness: 0.84,
    }),
    parkerized: new THREE.MeshStandardMaterial({
      color: 0x38414e,
      roughness: 0.42,
      metalness: 0.78,
    }),
    polymer: new THREE.MeshStandardMaterial({
      color: 0x171b22,
      roughness: 0.74,
      metalness: 0.08,
    }),
    rubber: new THREE.MeshStandardMaterial({
      color: 0x0e1116,
      roughness: 0.88,
      metalness: 0.04,
    }),
    chrome: new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.16,
      metalness: 0.94,
    }),
    redShell: new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.48,
      metalness: 0.14,
    }),
    brass: new THREE.MeshStandardMaterial({
      color: 0xd4a44a,
      roughness: 0.24,
      metalness: 0.92,
    }),
    opticGlass: new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      roughness: 0.1,
      metalness: 0.2,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.72,
    }),
    fiberOrange: new THREE.MeshBasicMaterial({ color: 0xf97316 }),
  };
  return cachedMats;
}

function extrudeSymmetrical(
  shape: THREE.Shape,
  widthX: number,
  bevelSize = 0.0028,
  bevelThickness = 0.0032
): THREE.ExtrudeGeometry {
  const innerDepth = Math.max(0.002, widthX - bevelThickness * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    steps: 1,
    depth: innerDepth,
    bevelEnabled: true,
    bevelThickness,
    bevelSize,
    bevelSegments: 3,
    curveSegments: 14,
  });
  // Extrude outputs along +Z; map shape (X->Z_gun, Y->Y_gun) then center X around 0
  geo.rotateY(Math.PI / 2);
  geo.translate(-widthX * 0.5, 0, 0);
  // Adjust after rotateY: +shapeX -> -Z in Three rotateY(+PI/2); flip so +shapeX -> +Z
  geo.rotateY(Math.PI);
  // Re-center X exactly
  geo.computeBoundingBox();
  if (geo.boundingBox) {
    const cx = (geo.boundingBox.min.x + geo.boundingBox.max.x) * 0.5;
    geo.translate(-cx, 0, 0);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Helper to orient extruded shape points naturally in 2D:
 * input coords `(zForward, yUp)` -> after `extrudeSymmetrical` maps directly to `(0, yUp, zForward)`!
 */
function shapeFromProfile(pts: Array<[number, number]>): THREE.Shape {
  const s = new THREE.Shape();
  // Note: because extrudeSymmetrical applies rotateY(3*PI/2), shape.x maps to +Z.
  s.moveTo(-pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    s.lineTo(-pts[i][0], pts[i][1]);
  }
  s.closePath();
  return s;
}

function addPicatinnyRail(
  parent: THREE.Group,
  zStart: number,
  zEnd: number,
  yBase: number,
  mat: THREE.Material
): void {
  const len = Math.abs(zEnd - zStart);
  const spineShape = new THREE.Shape();
  spineShape.moveTo(0, 0);
  spineShape.lineTo(0.011, 0);
  spineShape.lineTo(0.0085, 0.006);
  spineShape.lineTo(-0.0085, 0.006);
  spineShape.lineTo(-0.011, 0);
  spineShape.closePath();
  const railGeo = new THREE.ExtrudeGeometry(spineShape, {
    depth: len,
    bevelEnabled: false,
  });
  railGeo.translate(0, yBase, Math.min(zStart, zEnd));
  const spine = new THREE.Mesh(railGeo, mat);
  parent.add(spine);

  const slotGeo = new THREE.CylinderGeometry(0.0018, 0.0018, 0.022, 6);
  slotGeo.rotateZ(Math.PI / 2);
  const count = Math.max(3, Math.floor(len / 0.014));
  const inst = new THREE.InstancedMesh(slotGeo, mat, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const z = Math.min(zStart, zEnd) + (i + 0.5) * (len / count);
    dummy.position.set(0, yBase + 0.0065, z);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.computeBoundingSphere();
  parent.add(inst);
}

function addSteppedBarrelLathe(
  parent: THREE.Group,
  pointsRz: Array<[number, number]>,
  yPos: number,
  mat: THREE.Material,
  segments = 24
): THREE.Mesh {
  // Lathe revolves around Y; rotateX(PI/2) puts lathe +Y -> +Z
  const vecs = pointsRz.map(([r, z]) => new THREE.Vector2(r, z));
  const geo = new THREE.LatheGeometry(vecs, segments);
  geo.rotateX(Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = yPos;
  parent.add(mesh);
  return mesh;
}

function addTacticalReflexSight(
  parent: THREE.Group,
  yBase: number,
  zCenter: number,
  mats: SharedPbrMats
): void {
  const sight = new THREE.Group();
  sight.position.set(0, yBase, zCenter);

  // Riser mount profile
  const riserShape = shapeFromProfile([
    [-0.032, 0],
    [0.032, 0],
    [0.026, 0.012],
    [-0.026, 0.012],
  ]);
  sight.add(new THREE.Mesh(extrudeSymmetrical(riserShape, 0.026, 0.0015, 0.002), mats.gunmetal));

  // Hood arch
  const hoodGeo = new THREE.TorusGeometry(0.0155, 0.0032, 10, 24, Math.PI * 1.15);
  hoodGeo.rotateZ(-Math.PI * 0.075);
  const hood = new THREE.Mesh(hoodGeo, mats.parkerized);
  hood.position.set(0, 0.022, 0.006);
  sight.add(hood);

  // Coated lens
  const lensGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.002, 20);
  lensGeo.rotateX(Math.PI / 2);
  const lens = new THREE.Mesh(lensGeo, mats.opticGlass);
  lens.position.set(0, 0.024, 0.008);
  sight.add(lens);

  parent.add(sight);
}

function addSideSaddleShells(
  parent: THREE.Group,
  zStart: number,
  yCenter: number,
  xSide: number,
  count: number,
  mats: SharedPbrMats
): void {
  const plateShape = shapeFromProfile([
    [zStart - 0.018, yCenter - 0.016],
    [zStart + (count - 1) * 0.025 + 0.018, yCenter - 0.016],
    [zStart + (count - 1) * 0.025 + 0.014, yCenter + 0.016],
    [zStart - 0.014, yCenter + 0.016],
  ]);
  const plate = new THREE.Mesh(
    extrudeSymmetrical(plateShape, 0.006, 0.0015, 0.0015),
    mats.polymer
  );
  plate.position.x = xSide + 0.003;
  parent.add(plate);

  for (let i = 0; i < count; i++) {
    const z = zStart + i * 0.025;
    const shell = new THREE.Group();
    shell.position.set(xSide - 0.004, yCenter, z);

    const hull = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0085, 0.0085, 0.044, 14),
      mats.redShell
    );
    hull.position.y = 0.005;
    shell.add(hull);

    const brassRim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0092, 0.0088, 0.013, 14),
      mats.brass
    );
    brassRim.position.y = -0.02;
    shell.add(brassRim);

    const flange = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.0025, 14),
      mats.brass
    );
    flange.position.y = -0.027;
    shell.add(flange);

    parent.add(shell);
  }
}

/**
 * M870 Breacher 12-Gauge Tactical Pump Shotgun (Medics)
 * Origin calibrated at Pistol Grip = (0,0,0), Barrel forward along +Z.
 */
function buildSculptedShotgun12(): SculptedWeaponBuildResult {
  const mats = getSharedMats();
  const root = new THREE.Group();

  // Contoured Receiver (with sloped front ejection bevel & tang)
  const receiverShape = shapeFromProfile([
    [-0.015, 0.018],
    [0.045, 0.024],
    [0.235, 0.024],
    [0.248, 0.046],
    [0.242, 0.088],
    [0.032, 0.088],
    [-0.018, 0.068],
  ]);
  root.add(new THREE.Mesh(extrudeSymmetrical(receiverShape, 0.044, 0.004, 0.0045), mats.gunmetal));

  // Ergonomic Tactical Pistol Grip (Mesa Tactical style)
  const gripShape = shapeFromProfile([
    [-0.022, -0.068],
    [0.014, -0.064],
    [0.026, -0.018],
    [0.03, 0.024],
    [-0.004, 0.026],
    [-0.028, -0.014],
    [-0.032, -0.046],
  ]);
  root.add(new THREE.Mesh(extrudeSymmetrical(gripShape, 0.034, 0.0045, 0.0045), mats.polymer));

  // Trigger guard & curved trigger
  const guardCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.022, 0.028),
    new THREE.Vector3(0, -0.006, 0.042),
    new THREE.Vector3(0, -0.008, 0.072),
    new THREE.Vector3(0, 0.022, 0.082),
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(guardCurve, 18, 0.0036, 8, false), mats.polymer));
  const triggerGeo = new THREE.CylinderGeometry(0.0022, 0.0022, 0.02, 8);
  triggerGeo.rotateZ(0.2);
  const trigger = new THREE.Mesh(triggerGeo, mats.chrome);
  trigger.position.set(0, 0.012, 0.056);
  trigger.rotation.x = 0.25;
  root.add(trigger);

  // Tapered Tactical Stock + Ribbed Rubber Buttpad
  const stockShape = shapeFromProfile([
    [-0.25, -0.018],
    [-0.23, 0.078],
    [-0.012, 0.068],
    [-0.012, 0.022],
    [-0.145, 0.008],
    [-0.25, -0.018],
  ]);
  root.add(new THREE.Mesh(extrudeSymmetrical(stockShape, 0.038, 0.005, 0.005), mats.polymer));
  const buttPadShape = shapeFromProfile([
    [-0.268, -0.022],
    [-0.248, -0.02],
    [-0.23, 0.079],
    [-0.252, 0.081],
  ]);
  root.add(new THREE.Mesh(extrudeSymmetrical(buttPadShape, 0.041, 0.004, 0.004), mats.rubber));

  // Chrome bolt carrier inside ejection port
  const boltShape = shapeFromProfile([
    [0.105, 0.048],
    [0.185, 0.048],
    [0.185, 0.068],
    [0.105, 0.068],
  ]);
  const bolt = new THREE.Mesh(
    extrudeSymmetrical(boltShape, 0.012, 0.002, 0.002),
    mats.chrome
  );
  bolt.position.x = 0.019;
  root.add(bolt);

  // Heavy Lathe Stepped 12GA Barrel + Tactical Breacher Choke
  addSteppedBarrelLathe(
    root,
    [
      [0.0155, 0.235],
      [0.0155, 0.28],
      [0.0135, 0.3],
      [0.0132, 0.65],
      [0.016, 0.656],
      [0.016, 0.685],
      [0.0175, 0.692],
      [0.0175, 0.72],
      [0.011, 0.722],
      [0.0, 0.722],
    ],
    0.068,
    mats.parkerized
  );

  // Under-barrel Tubular Magazine + End Cap + Clamp
  addSteppedBarrelLathe(
    root,
    [
      [0.0122, 0.238],
      [0.0122, 0.635],
      [0.014, 0.642],
      [0.014, 0.668],
      [0.011, 0.672],
      [0.0, 0.672],
    ],
    0.039,
    mats.gunmetal
  );
  const clampShape = shapeFromProfile([
    [0.59, 0.025],
    [0.612, 0.025],
    [0.612, 0.084],
    [0.59, 0.084],
  ]);
  root.add(new THREE.Mesh(extrudeSymmetrical(clampShape, 0.032, 0.002, 0.0025), mats.parkerized));

  // Ribbed Lathe Pump Forend (Contoured ergonomic corn-cob grip)
  const pumpGroup = new THREE.Group();
  pumpGroup.position.set(0, 0.038, 0.42);
  const pumpPts: Array<[number, number]> = [[0.013, -0.092], [0.022, -0.088]];
  const grooves = 7;
  for (let i = 0; i < grooves; i++) {
    const zA = -0.075 + i * 0.021;
    pumpPts.push([0.0235, zA], [0.0195, zA + 0.008], [0.0235, zA + 0.016]);
  }
  pumpPts.push([0.0225, 0.082], [0.013, 0.088]);
  addSteppedBarrelLathe(pumpGroup, pumpPts, 0, mats.polymer, 20);
  root.add(pumpGroup);

  // Top Picatinny Rail + Ghost-Ring Rear Sight + Fiber Optic Front Post
  addPicatinnyRail(root, 0.045, 0.23, 0.088, mats.parkerized);
  const ghostRing = new THREE.Mesh(new THREE.TorusGeometry(0.0085, 0.0022, 10, 20), mats.parkerized);
  ghostRing.position.set(0, 0.104, 0.055);
  root.add(ghostRing);

  const frontRamp = shapeFromProfile([
    [0.65, 0.08],
    [0.682, 0.08],
    [0.676, 0.098],
    [0.664, 0.098],
  ]);
  root.add(new THREE.Mesh(extrudeSymmetrical(frontRamp, 0.008, 0.001, 0.001), mats.parkerized));
  const fiber = new THREE.Mesh(new THREE.SphereGeometry(0.0025, 8, 8), mats.fiberOrange);
  fiber.position.set(0, 0.098, 0.672);
  root.add(fiber);

  // 4x Side-Saddle Brass/Red 12ga Shells
  addSideSaddleShells(root, 0.09, 0.056, -0.026, 4, mats);

  return { group: root, pumpGroup };
}

/**
 * Franchi SPAS-12 Combat Shotgun (Medics)
 * Signature perforated heatshield, heavy slab receiver, folding steel stock strut & hook.
 */
function buildSculptedShotgunSpas(): SculptedWeaponBuildResult {
  const mats = getSharedMats();
  const root = new THREE.Group();

  // Iconic angular SPAS-12 Receiver
  const receiverShape = shapeFromProfile([
    [-0.016, 0.018],
    [0.042, 0.022],
    [0.245, 0.022],
    [0.258, 0.048],
    [0.248, 0.094],
    [0.02, 0.094],
    [-0.02, 0.068],
  ]);
  root.add(new THREE.Mesh(extrudeSymmetrical(receiverShape, 0.048, 0.004, 0.0045), mats.parkerized));

  // Ergonomic Pistol Grip & Guard
  const gripShape = shapeFromProfile([
    [-0.025, -0.066],
    [0.012, -0.062],
    [0.024, -0.018],
    [0.028, 0.024],
    [-0.004, 0.024],
    [-0.03, -0.016],
  ]);
  root.add(new THREE.Mesh(extrudeSymmetrical(gripShape, 0.036, 0.0045, 0.0045), mats.polymer));
  const guardCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.02, 0.026),
    new THREE.Vector3(0, -0.007, 0.042),
    new THREE.Vector3(0, -0.008, 0.072),
    new THREE.Vector3(0, 0.022, 0.084),
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(guardCurve, 18, 0.0038, 8, false), mats.polymer));

  // Iconic SPAS-12 Top/Rear Folding Tubular Steel Stock + Shoulder Hook
  const stockMountShape = shapeFromProfile([
    [-0.042, 0.034],
    [-0.012, 0.032],
    [-0.012, 0.078],
    [-0.042, 0.074],
  ]);
  root.add(new THREE.Mesh(extrudeSymmetrical(stockMountShape, 0.04, 0.003, 0.003), mats.gunmetal));

  [-0.016, 0.016].forEach((sx) => {
    const strut = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx, 0.068, -0.032),
      new THREE.Vector3(sx, 0.062, -0.14),
      new THREE.Vector3(sx, 0.042, -0.255),
    ]);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(strut, 14, 0.0052, 8, false), mats.parkerized));
  });
  const buttPlateShape = shapeFromProfile([
    [-0.27, -0.015],
    [-0.252, -0.012],
    [-0.246, 0.076],
    [-0.265, 0.074],
  ]);
  root.add(new THREE.Mesh(extrudeSymmetrical(buttPlateShape, 0.038, 0.003, 0.0035), mats.rubber));

  // Signature Perforated SPAS-12 Barrel Heatshield (Full ventilated upper shroud)
  const shroudShape = shapeFromProfile([
    [0.248, 0.056],
    [0.64, 0.056],
    [0.652, 0.09],
    [0.248, 0.09],
  ]);
  root.add(new THREE.Mesh(extrudeSymmetrical(shroudShape, 0.042, 0.0035, 0.0035), mats.gunmetal));

  // Recessed dark cooling holes along heatshield flanks
  for (let i = 0; i < 8; i++) {
    const hole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0068, 0.0068, 0.045, 10),
      mats.rubber
    );
    hole.rotation.z = Math.PI / 2;
    hole.position.set(0, 0.075, 0.28 + i * 0.046);
    root.add(hole);
  }

  // Heavy 12GA Barrel + Magazine Tube
  addSteppedBarrelLathe(
    root,
    [
      [0.0145, 0.24],
      [0.0142, 0.68],
      [0.0165, 0.69],
      [0.0165, 0.735],
      [0.011, 0.736],
      [0.0, 0.736],
    ],
    0.068,
    mats.chrome
  );
  addSteppedBarrelLathe(
    root,
    [
      [0.013, 0.24],
      [0.013, 0.65],
      [0.015, 0.656],
      [0.015, 0.69],
      [0.0, 0.692],
    ],
    0.038,
    mats.gunmetal
  );

  // SPAS-12 Contoured Ribbed Combat Forend
  const forendShape = shapeFromProfile([
    [0.265, 0.014],
    [0.52, 0.016],
    [0.535, 0.054],
    [0.265, 0.054],
  ]);
  root.add(new THREE.Mesh(extrudeSymmetrical(forendShape, 0.046, 0.0045, 0.0045), mats.polymer));
  for (let i = 0; i < 6; i++) {
    const slot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0028, 0.0028, 0.048, 8),
      mats.rubber
    );
    slot.rotation.z = Math.PI / 2;
    slot.position.set(0, 0.032, 0.3 + i * 0.036);
    root.add(slot);
  }

  // Top Tactical Reflex Sight + Front Fiber Blade
  addPicatinnyRail(root, 0.045, 0.225, 0.094, mats.gunmetal);
  addTacticalReflexSight(root, 0.1, 0.135, mats);
  const frontPost = shapeFromProfile([
    [0.648, 0.088],
    [0.675, 0.088],
    [0.669, 0.106],
    [0.658, 0.106],
  ]);
  root.add(new THREE.Mesh(extrudeSymmetrical(frontPost, 0.008, 0.001, 0.001), mats.parkerized));
  const fiber = new THREE.Mesh(new THREE.SphereGeometry(0.0025, 8, 8), mats.fiberOrange);
  fiber.position.set(0, 0.106, 0.665);
  root.add(fiber);

  // 4x 12ga Side-Saddle Shells
  addSideSaddleShells(root, 0.095, 0.058, -0.028, 4, mats);

  return { group: root };
}

/**
 * H&K MP5A3 Tactical 9mm Submachine Gun (Engineers)
 * Fluted cocking tube, curved 30rd 9mm magazine, Navy trigger housing, rotary drum + A3 collapsible stock.
 */
function buildSculptedSmgMp5(): SculptedWeaponBuildResult {
  const mats = getSharedMats();
  const root = new THREE.Group();

  // Upper Tubular Stamped Steel Receiver + Fluted Cocking Tube
  addSteppedBarrelLathe(
    root,
    [
      [0.0195, -0.032],
      [0.0195, 0.21],
      [0.0155, 0.22],
      [0.0145, 0.43],
      [0.017, 0.435],
      [0.0145, 0.44],
      [0.0, 0.44],
    ],
    0.056,
    mats.gunmetal
  );

  // Polymer Navy Lower Trigger Group + Ergonomic Pistol Grip
  const lowerShape = shapeFromProfile([
    [-0.022, 0.022],
    [0.145, 0.024],
    [0.158, 0.048],
    [-0.028, 0.048],
  ]);
  root.add(new THREE.Mesh(extrudeSymmetrical(lowerShape, 0.036, 0.0035, 0.0035), mats.polymer));

  const gripShape = shapeFromProfile([
    [-0.024, -0.068],
    [0.012, -0.064],
    [0.024, -0.016],
    [0.026, 0.024],
    [-0.006, 0.024],
    [-0.028, -0.018],
  ]);
  root.add(new THREE.Mesh(extrudeSymmetrical(gripShape, 0.032, 0.0045, 0.0045), mats.polymer));

  const guardCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.022, 0.024),
    new THREE.Vector3(0, -0.005, 0.038),
    new THREE.Vector3(0, -0.006, 0.065),
    new THREE.Vector3(0, 0.024, 0.074),
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(guardCurve, 16, 0.0034, 8, false), mats.polymer));

  // Wide Tropical Handguard (Contoured trapezoidal cross-section extruded along Z)
  const hgShape = shapeFromProfile([
    [0.195, 0.018],
    [0.375, 0.022],
    [0.39, 0.058],
    [0.195, 0.058],
  ]);
  root.add(new THREE.Mesh(extrudeSymmetrical(hgShape, 0.042, 0.006, 0.006), mats.polymer));

  // Stepped 9mm Barrel + 3-Lug Muzzle Flash Hider
  addSteppedBarrelLathe(
    root,
    [
      [0.01, 0.21],
      [0.01, 0.45],
      [0.0125, 0.455],
      [0.0125, 0.495],
      [0.009, 0.498],
      [0.0, 0.498],
    ],
    0.04,
    mats.parkerized
  );

  // Angled Charging Handle on left side of cocking tube
  const cockingCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.012, 0.062, 0.365),
    new THREE.Vector3(0.028, 0.072, 0.352),
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(cockingCurve, 8, 0.0045, 8, false), mats.parkerized));

  // Iconic Curved 30-Round 9mm MP5 Banana Magazine (True Extruded Arc!)
  const magCurvePts: Array<[number, number]> = [
    [0.142, 0.026],
    [0.145, -0.03],
    [0.158, -0.095],
    [0.184, -0.155],
    [0.214, -0.145],
    [0.19, -0.088],
    [0.178, -0.026],
    [0.176, 0.026],
  ];
  const magShape = shapeFromProfile(magCurvePts);
  root.add(new THREE.Mesh(extrudeSymmetrical(magShape, 0.024, 0.0025, 0.0025), mats.parkerized));

  // Twin-Rail Collapsible MP5A3 Steel Stock
  const capShape = shapeFromProfile([
    [-0.06, 0.018],
    [-0.025, 0.018],
    [-0.025, 0.078],
    [-0.06, 0.076],
  ]);
  root.add(new THREE.Mesh(extrudeSymmetrical(capShape, 0.04, 0.004, 0.004), mats.polymer));
  [-0.018, 0.018].forEach((sx) => {
    const rail = new THREE.CylinderGeometry(0.0038, 0.0038, 0.165, 10);
    rail.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(rail, mats.chrome);
    m.position.set(sx, 0.048, -0.135);
    root.add(m);
  });
  const padShape = shapeFromProfile([
    [-0.225, -0.012],
    [-0.205, -0.01],
    [-0.202, 0.076],
    [-0.222, 0.074],
  ]);
  root.add(new THREE.Mesh(extrudeSymmetrical(padShape, 0.036, 0.004, 0.004), mats.rubber));

  // Top Low-Profile Rail + Rotary Rear Sight Drum + Hooded Front Sight
  addPicatinnyRail(root, 0.015, 0.14, 0.074, mats.parkerized);
  addTacticalReflexSight(root, 0.08, 0.085, mats);
  const rearDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.016, 14), mats.parkerized);
  rearDrum.position.set(0, 0.082, 0.005);
  root.add(rearDrum);

  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.01, 0.0022, 10, 20), mats.parkerized);
  hood.position.set(0, 0.082, 0.422);
  root.add(hood);
  const frontPin = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 8, 8), mats.fiberOrange);
  frontPin.position.set(0, 0.081, 0.422);
  root.add(frontPin);

  return { group: root };
}

export function isSculptedWeaponId(weaponId: WeaponId): boolean {
  return (
    weaponId === 'SHOTGUN_12' ||
    weaponId === 'SHOTGUN_SPAS' ||
    weaponId === 'SMG_MP5'
  );
}

/**
 * Builds sculpted weapon with origin at Pistol Grip (0,0,0) and barrel forward (+Z)
 * tilted by third-person Mixamo hand cradle pitch.
 */
export function createSculptedThirdPersonWeaponMesh(
  weaponId: WeaponId,
  levelPitch = false
): SculptedWeaponBuildResult {
  let built: SculptedWeaponBuildResult;
  if (weaponId === 'SHOTGUN_12') built = buildSculptedShotgun12();
  else if (weaponId === 'SHOTGUN_SPAS') built = buildSculptedShotgunSpas();
  else built = buildSculptedSmgMp5();

  if (!levelPitch) {
    // Tilt forward barrel slightly to match Mixamo left hand foregrip offset
    const wrapper = new THREE.Group();
    built.group.rotation.x = 0.16;
    wrapper.add(built.group);
    return { group: wrapper, pumpGroup: built.pumpGroup };
  }
  return built;
}

/**
 * Builds sculpted weapon oriented for first-person viewmodel (barrel along -Z, centered at receiver).
 */
export function createSculptedFirstPersonWeaponGroup(
  weaponId: WeaponId
): SculptedWeaponBuildResult {
  const built = createSculptedThirdPersonWeaponMesh(weaponId, true);
  // Flip +Z forward -> -Z forward and shift receiver closer to FP origin (0,0,0)
  built.group.rotation.y = Math.PI;
  built.group.position.set(0, -0.052, 0.11);
  const fpRoot = new THREE.Group();
  fpRoot.add(built.group);
  return { group: fpRoot, pumpGroup: built.pumpGroup };
}
