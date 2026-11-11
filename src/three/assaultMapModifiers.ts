import * as THREE from 'three';

/**
 * Otimiza os materiais de lightmap baked (`part1..part10` em `cs_assault.glb`):
 * 1. Desativa mipmaps, anisotropia e neblina esbranquiçada (`fog: false`) para preservar
 *    o contraste urbano rico e profundo das texturas originais.
 * 2. Aplica uma curva tonal natural e equilibrada no shader sem lavar os tons escuros.
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
    basicMat.fog = false;
  } else {
    basicMat = new THREE.MeshBasicMaterial({
      name: m?.name || 'assault_baked_light',
      map: tex,
      color: srcMat?.color ? srcMat.color.clone() : new THREE.Color(0xffffff),
      side: THREE.DoubleSide,
      fog: false,
      transparent: Boolean(srcMat?.transparent),
      opacity: srcMat?.opacity ?? 1.0,
      alphaTest: srcMat?.alphaTest ?? 0,
    });
    m?.dispose();
  }

  basicMat.customProgramCacheKey = () => 'assault_premium_tone_v2';
  basicMat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#ifdef USE_MAP
        vec4 sampledDiffuseColor = texture2D( map, vMapUv );
        vec3 naturalRgb = pow(max(sampledDiffuseColor.rgb, vec3(0.0)), vec3(0.86)) * 1.08 + vec3(0.012);
        diffuseColor.rgb *= min(naturalRgb, vec3(1.06));
      #endif`
    );
  };
  basicMat.needsUpdate = true;

  return basicMat;
}

/**
 * Encolhe (inset) ligeiramente as bordas de cada ilha UV conectada no atlas 1024x1024
 * em ~1.6px (`0.0016`) em direção ao centro da ilha, impedindo que a filtragem bilinear
 * amostre a calha preta (`#000000`) que causa listras pretas no chão e nas calçadas.
 */
function insetAssaultUvIslands(
  geom: THREE.BufferGeometry,
  keptIndices: number[]
): void {
  const uvAttr = geom.attributes.uv as THREE.BufferAttribute | undefined;
  if (!uvAttr || keptIndices.length === 0) return;

  const vertCount = uvAttr.count;
  const parent = new Int32Array(vertCount);
  for (let i = 0; i < vertCount; i++) parent[i] = i;

  const find = (x: number): number => {
    let root = x;
    while (parent[root] !== root) root = parent[root];
    let curr = x;
    while (curr !== root) {
      const nxt = parent[curr];
      parent[curr] = root;
      curr = nxt;
    }
    return root;
  };

  for (let i = 0; i < keptIndices.length; i += 3) {
    const a = find(keptIndices[i]);
    const b = find(keptIndices[i + 1]);
    const c = find(keptIndices[i + 2]);
    if (a !== b) parent[b] = a;
    if (a !== c) parent[c] = a;
  }

  const bounds = new Map<
    number,
    { minU: number; maxU: number; minV: number; maxV: number }
  >();

  for (let v = 0; v < vertCount; v++) {
    const r = find(v);
    const u = uvAttr.getX(v);
    const w = uvAttr.getY(v);
    let b = bounds.get(r);
    if (!b) {
      b = { minU: u, maxU: u, minV: w, maxV: w };
      bounds.set(r, b);
    } else {
      if (u < b.minU) b.minU = u;
      if (u > b.maxU) b.maxU = u;
      if (w < b.minV) b.minV = w;
      if (w > b.maxV) b.maxV = w;
    }
  }

  const margin = 0.0016; // ~1.6px inset num atlas 1024x1024
  for (let v = 0; v < vertCount; v++) {
    const b = bounds.get(find(v));
    if (!b) continue;
    const spanU = b.maxU - b.minU;
    const spanV = b.maxV - b.minV;
    let u = uvAttr.getX(v);
    let w = uvAttr.getY(v);

    if (spanU > margin * 2.5) {
      const midU = 0.5 * (b.minU + b.maxU);
      const scaleU = (spanU - margin * 2) / spanU;
      u = midU + (u - midU) * scaleU;
    }
    if (spanV > margin * 2.5) {
      const midV = 0.5 * (b.minV + b.maxV);
      const scaleV = (spanV - margin * 2) / spanV;
      w = midV + (w - midV) * scaleV;
    }
    uvAttr.setXY(v, u, w);
  }

  uvAttr.needsUpdate = true;
}

/**
 * Remove as portas fechadas, desbloqueia o duto vertical de ventilação,
 * remove as fitas verticais de 2.5cm no asfalto e faces inferiores de calçadas/pisos
 * que causavam Z-fighting, e aplica inset nas ilhas UV para eliminar listras pretas no chão.
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

      // 0a. Faces inferiores de brushes no chão/calçadas (y <= 0.45m) que causam Z-fighting
      const isGroundUndersideZFight =
        triNormal.y < -0.85 && minY >= -0.08 && maxY <= 0.45;

      // 0b. Fitas verticais de 2.5cm de altura no meio da rua (y em [0.00, 0.068]) que criam listras pretas
      const isFloorMicroSeamRibbon =
        minY >= -0.05 && maxY <= 0.068 && Math.abs(triNormal.y) < 0.5;

      // 1. Porta dos fundos (Backdoor) na parede leste do galpão
      const isBackdoorSlab =
        minX >= 17.24 &&
        maxX <= 17.56 &&
        minY >= -0.05 &&
        maxY <= 2.42 &&
        minZ >= -0.68 &&
        maxZ <= 0.98;

      // 2. Portas internas das salas de reféns (inferior e superior)
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

      // 3. Bloqueio vertical entre a Sala de Reféns e o Duto de Ventilação
      const isVentShaftBlocker =
        minX >= -0.85 &&
        maxX <= 0.85 &&
        minY >= 3.18 &&
        maxY <= 8.45 &&
        minZ >= -14.32 &&
        maxZ <= -13.38 &&
        (maxY - minY > 0.2 || maxZ - minZ > 0.2);

      // 4. Portão oeste ao lado do furgão da SWAT
      const isWestCarGate =
        minX >= -30.9 &&
        maxX <= -30.35 &&
        minY >= 0.0 &&
        maxY <= 3.25 &&
        minZ >= 4.45 &&
        maxZ <= 8.85;

      if (
        isGroundUndersideZFight ||
        isFloorMicroSeamRibbon ||
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

    insetAssaultUvIslands(geom, keptIndices);

    if (removedCount > 0) {
      geom.setIndex(keptIndices);
      geom.computeBoundingBox();
      geom.computeBoundingSphere();
    }
  });

  // Folha da porta dos fundos aberta e degraus da escada do duto
  const doorMat = new THREE.MeshBasicMaterial({ color: 0x475569, fog: false });
  const openDoorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.52, 2.36, 0.08),
    doorMat
  );
  openDoorMesh.position.set(16.45, 1.18, -0.62);
  openDoorMesh.rotation.y = 0.12;
  openDoorMesh.userData.ignoreCollider = true;
  levelGroup.add(openDoorMesh);

  const rungGeo = new THREE.BoxGeometry(0.64, 0.04, 0.04);
  const rungMat = new THREE.MeshBasicMaterial({ color: 0x64748b, fog: false });
  for (let y = 3.5; y <= 8.5; y += 0.4) {
    const rung = new THREE.Mesh(rungGeo, rungMat);
    rung.position.set(0.0, y, -13.5);
    rung.userData.ignoreCollider = true;
    levelGroup.add(rung);
  }
}

