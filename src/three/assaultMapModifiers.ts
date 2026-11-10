import * as THREE from 'three';

/**
 * Optimizes a baked GoldSrc lightmap material (`part1..part10` in `cs_assault.glb`):
 * 1. Disables mipmap & anisotropic bleeding across 0.5px lightmap atlas gutters
 *    (eliminating dark grid stripes on the floor and walls).
 * 2. Applies a lightweight gamma shadow-lift curve in the fragment shader so overly dark
 *    indoor warehouse corners, hostage rooms, under-bridge areas, and air vents are clearly visible.
 */
export function optimizeAssaultBakedMaterial(
  m: THREE.Material
): THREE.MeshBasicMaterial {
  const srcMat = m as THREE.MeshBasicMaterial & THREE.MeshStandardMaterial;
  const tex = srcMat?.map || null;

  if (tex) {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 1;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.userData = { ...(tex.userData || {}), lockAnisotropy: true };
    tex.needsUpdate = true;
  }

  let basicMat: THREE.MeshBasicMaterial;
  if (m instanceof THREE.MeshBasicMaterial) {
    basicMat = m;
    basicMat.side = THREE.DoubleSide;
  } else {
    basicMat = new THREE.MeshBasicMaterial({
      name: m?.name || 'assault_baked_light',
      map: tex,
      color: srcMat?.color ? srcMat.color.clone() : new THREE.Color(0xffffff),
      side: THREE.DoubleSide,
      transparent: Boolean(srcMat?.transparent),
      opacity: srcMat?.opacity ?? 1.0,
      alphaTest: srcMat?.alphaTest ?? 0,
    });
    m?.dispose();
  }

  basicMat.customProgramCacheKey = () => 'assault_shadow_lift_v1';
  basicMat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#ifdef USE_MAP
        vec4 sampledDiffuseColor = texture2D( map, vMapUv );
        vec3 liftedRgb = pow(max(sampledDiffuseColor.rgb, vec3(0.0)), vec3(0.64)) * 1.24 + vec3(0.078);
        diffuseColor.rgb *= min(liftedRgb, vec3(1.16));
      #endif`
    );
  };
  basicMat.needsUpdate = true;

  return basicMat;
}

/**
 * Removes closed door slabs (Backdoor "porta dos fundos", Interior Hostage Doors, West Gate),
 * opens the vertical Air Vent shaft between Upper Hostage Room (Y=3.2m) and Vent Duct (Y=10.9m),
 * and strips downward-facing ground brush undersides (`y <= 0.065`) so they never Z-fight
 * and cause dark stripes on the street/warehouse floor.
 */
export function openAssaultDoorsAndVents(
  mapTransformGroup: THREE.Group,
  levelGroup: THREE.Group
): void {
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const triNormal = new THREE.Vector3();

  mapTransformGroup.updateMatrixWorld(true);

  mapTransformGroup.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.geometry) return;
    const geom = child.geometry as THREE.BufferGeometry;
    const posAttr = geom.attributes.position;
    const indexAttr = geom.index;
    if (!posAttr || !indexAttr) return;

    const matWorld = child.matrixWorld;
    const triCount = Math.floor(indexAttr.count / 3);
    const keptIndices: number[] = [];
    let removedCount = 0;

    for (let i = 0; i < triCount; i++) {
      const i0 = indexAttr.getX(i * 3);
      const i1 = indexAttr.getX(i * 3 + 1);
      const i2 = indexAttr.getX(i * 3 + 2);

      v0.fromBufferAttribute(posAttr, i0).applyMatrix4(matWorld);
      v1.fromBufferAttribute(posAttr, i1).applyMatrix4(matWorld);
      v2.fromBufferAttribute(posAttr, i2).applyMatrix4(matWorld);

      e1.subVectors(v1, v0);
      e2.subVectors(v2, v0);
      triNormal.crossVectors(e1, e2).normalize();

      const minX = Math.min(v0.x, v1.x, v2.x);
      const maxX = Math.max(v0.x, v1.x, v2.x);
      const minY = Math.min(v0.y, v1.y, v2.y);
      const maxY = Math.max(v0.y, v1.y, v2.y);
      const minZ = Math.min(v0.z, v1.z, v2.z);
      const maxZ = Math.max(v0.z, v1.z, v2.z);

      // 0. Downward-facing brush undersides at ground level (y <= 0.065m) that Z-fight with the floor
      const isGroundUndersideZFight =
        triNormal.y < -0.85 && minY >= -0.05 && maxY <= 0.065;

      // 1. Backdoor ("porta dos fundos") at East Warehouse Wall
      const isBackdoorSlab =
        minX >= 17.24 &&
        maxX <= 17.56 &&
        minY >= -0.05 &&
        maxY <= 2.42 &&
        minZ >= -0.68 &&
        maxZ <= 0.98;

      // 2. Interior Lower & Upper Hostage Room Doors
      const isLowerHostageDoor =
        minX >= 11.15 &&
        maxX <= 12.85 &&
        minY >= 0.75 &&
        maxY <= 3.25 &&
        minZ >= -13.55 &&
        maxZ <= -13.35;
      const isUpperHostageDoor =
        minX >= 10.35 &&
        maxX <= 11.25 &&
        minY >= 3.15 &&
        maxY <= 6.45 &&
        minZ >= -14.32 &&
        maxZ <= -13.38;
      const isMidControlDoor =
        minX >= 7.15 &&
        maxX <= 9.65 &&
        minY >= 0.75 &&
        maxY <= 3.25 &&
        minZ >= -6.32 &&
        maxZ <= -4.98 &&
        maxZ - minZ < 0.25;

      // 3. Interior Hostage Room to Air Vent Shaft Blocker
      const isVentShaftBlocker =
        minX >= -0.85 &&
        maxX <= 0.85 &&
        minY >= 3.18 &&
        maxY <= 8.45 &&
        minZ >= -14.32 &&
        maxZ <= -13.38 &&
        (maxY - minY > 0.2 || maxZ - minZ > 0.2);

      // 4. West Courtyard Gate next to SWAT Van
      const isWestCarGate =
        minX >= -30.9 &&
        maxX <= -30.35 &&
        minY >= 0.0 &&
        maxY <= 3.25 &&
        minZ >= 4.45 &&
        maxZ <= 8.85;

      if (
        isGroundUndersideZFight ||
        isBackdoorSlab ||
        isLowerHostageDoor ||
        isUpperHostageDoor ||
        isMidControlDoor ||
        isVentShaftBlocker ||
        isWestCarGate
      ) {
        removedCount++;
        continue;
      }

      keptIndices.push(i0, i1, i2);
    }

    if (removedCount > 0) {
      geom.setIndex(keptIndices);
      geom.computeBoundingBox();
      geom.computeBoundingSphere();
    }
  });

  // Add visually swung-open Backdoor leaf & Interior Vent Shaft ladder rungs
  const doorMat = new THREE.MeshBasicMaterial({ color: 0x475569 });
  const openDoorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.52, 2.36, 0.08),
    doorMat
  );
  openDoorMesh.position.set(16.45, 1.18, -0.62);
  openDoorMesh.rotation.y = 0.12;
  openDoorMesh.userData.ignoreCollider = true;
  levelGroup.add(openDoorMesh);

  const rungGeo = new THREE.BoxGeometry(0.64, 0.04, 0.04);
  const rungMat = new THREE.MeshBasicMaterial({ color: 0x64748b });
  for (let y = 3.5; y <= 8.5; y += 0.4) {
    const rung = new THREE.Mesh(rungGeo, rungMat);
    rung.position.set(0.0, y, -13.5);
    rung.userData.ignoreCollider = true;
    levelGroup.add(rung);
  }
}
