/**
 * scenePerfOptimizer.ts
 * Mobile-safe scene hardening: freeze static matrices, share simple materials,
 * and trim unnecessary shadow casters — without changing visuals meaningfully.
 */

import * as THREE from 'three';

const SHARED_COLOR_MATERIALS = new Map<string, THREE.MeshStandardMaterial>();

function materialCacheKey(mat: THREE.MeshStandardMaterial): string | null {
  // Only share plain color materials (no maps) — safe for procedural props.
  if (
    mat.map ||
    mat.normalMap ||
    mat.roughnessMap ||
    mat.metalnessMap ||
    mat.aoMap ||
    mat.emissiveMap ||
    mat.alphaMap ||
    mat.transparent ||
    mat.opacity < 0.999
  ) {
    return null;
  }
  const color = mat.color?.getHex?.() ?? 0;
  const rough = Math.round((mat.roughness ?? 1) * 100);
  const metal = Math.round((mat.metalness ?? 0) * 100);
  const side = mat.side ?? THREE.FrontSide;
  return `${color}|${rough}|${metal}|${side}`;
}

function getSharedStandardMaterial(
  source: THREE.MeshStandardMaterial
): THREE.MeshStandardMaterial {
  const key = materialCacheKey(source);
  if (!key) return source;
  let shared = SHARED_COLOR_MATERIALS.get(key);
  if (!shared) {
    shared = source.clone();
    SHARED_COLOR_MATERIALS.set(key, shared);
  }
  return shared;
}

export interface SceneOptimizeOptions {
  /** Disable castShadow on meshes smaller than this world-space diagonal. */
  minShadowCasterSize?: number;
  /** When true, also collapse plain materials into a shared cache. */
  sharePlainMaterials?: boolean;
  /** Freeze matrixAutoUpdate on marked-static or leaf meshes under a static root. */
  freezeStaticMatrices?: boolean;
}

/**
 * Marks a group as static environment so children can freeze transforms.
 */
export function markGroupStatic(root: THREE.Object3D): void {
  root.userData.isStaticEnvironment = true;
  root.traverse((obj) => {
    obj.userData.isStaticEnvironment = true;
  });
}

/**
 * One-shot pass after level build / GLB load.
 * Safe to call multiple times (idempotent via userData.perfOptimized).
 */
export function optimizeSceneGraph(
  root: THREE.Object3D,
  options: SceneOptimizeOptions = {}
): { meshesTouched: number; materialsShared: number; shadowsDisabled: number } {
  const minShadow = options.minShadowCasterSize ?? 0.35;
  const shareMats = options.sharePlainMaterials !== false;
  const freeze = options.freezeStaticMatrices !== false;

  let meshesTouched = 0;
  let materialsShared = 0;
  let shadowsDisabled = 0;

  const box = new THREE.Box3();
  const size = new THREE.Vector3();

  root.traverse((obj) => {
    if (obj.userData.perfOptimized) return;

    if (freeze && (obj.userData.isStaticEnvironment || root.userData.isStaticEnvironment)) {
      // Skinned / animated nodes must keep matrix updates.
      const isSkinned = (obj as THREE.SkinnedMesh).isSkinnedMesh;
      if (!isSkinned && !obj.userData.keepMatrixAutoUpdate) {
        obj.updateMatrix();
        obj.matrixAutoUpdate = false;
      }
    }

    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) {
      obj.userData.perfOptimized = true;
      return;
    }

    meshesTouched += 1;

    if (shareMats) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      let changed = false;
      const next = materials.map((m) => {
        if (!m || !(m as THREE.MeshStandardMaterial).isMeshStandardMaterial) return m;
        const std = m as THREE.MeshStandardMaterial;
        const shared = getSharedStandardMaterial(std);
        if (shared !== std) {
          materialsShared += 1;
          changed = true;
          // Dispose orphan plain material if it was unique to this mesh.
          if (!std.userData?.keepAlive) {
            // Don't dispose textures (none on plain mats); free GPU program slot.
            std.dispose();
          }
        }
        return shared;
      });
      if (changed) {
        mesh.material = Array.isArray(mesh.material) ? next : next[0];
      }
    }

    if (mesh.castShadow) {
      box.setFromObject(mesh);
      box.getSize(size);
      const diag = size.length();
      if (diag > 0 && diag < minShadow) {
        mesh.castShadow = false;
        shadowsDisabled += 1;
      }
    }

    mesh.userData.perfOptimized = true;
  });

  return { meshesTouched, materialsShared, shadowsDisabled };
}

/**
 * Builds an InstancedMesh from identical geometry/material placements.
 * Returns null if count < 2 (caller should keep individual meshes).
 */
export function buildInstancedFromTransforms(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  transforms: Array<{
    position: THREE.Vector3;
    rotation?: THREE.Euler;
    scale?: THREE.Vector3;
  }>,
  castShadow = false
): THREE.InstancedMesh | null {
  if (transforms.length < 2) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = false;
  mesh.matrixAutoUpdate = false;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < transforms.length; i++) {
    const t = transforms[i];
    dummy.position.copy(t.position);
    if (t.rotation) dummy.rotation.copy(t.rotation);
    else dummy.rotation.set(0, 0, 0);
    if (t.scale) dummy.scale.copy(t.scale);
    else dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.userData.isStaticEnvironment = true;
  mesh.userData.perfOptimized = true;
  return mesh;
}

export function clearSharedMaterialCache(): void {
  SHARED_COLOR_MATERIALS.forEach((m) => m.dispose());
  SHARED_COLOR_MATERIALS.clear();
}
