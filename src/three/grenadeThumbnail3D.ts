/**
 * Offline studio thumbnails for inventory grenade slots (FRAG / SMOKE).
 * Uses the same GLBs as gameplay (`granada_frag.glb`, `m18_smoke_grenade.glb`).
 */

import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GrenadeType } from '../types/game';
import { isolateSingleFragGrenadeInGlb } from './grenadeViewmodelRig';
import {
  createSecondaryWebGLRenderer,
  disposeSecondaryWebGLRenderer,
} from './webglContextGuard';

const THUMB_W = 360;
const THUMB_H = 280;

const FRAG_URL = '/models/granada_frag.glb';
const SMOKE_URL = '/models/m18_smoke_grenade.glb';
const SMOKE_FALLBACK_URL = '/models/s13_smoke_grenade.glb';

const thumbnailCache = new Map<GrenadeType, string>();
const inFlightCache = new Map<GrenadeType, Promise<string | null>>();
let renderQueue: Promise<unknown> = Promise.resolve();

interface SharedStudioRig {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  pivot: THREE.Group;
}

let sharedRig: SharedStudioRig | null = null;
const gltfLoader = new GLTFLoader();

function getSharedStudioRig(): SharedStudioRig | null {
  if (sharedRig) return sharedRig;
  if (typeof document === 'undefined') return null;

  try {
    const renderer = createSecondaryWebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'low-power',
    });
    renderer.setSize(THUMB_W, THUMB_H, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
    scene.environment = envTex;
    pmrem.dispose();

    scene.add(new THREE.HemisphereLight(0xf8fafc, 0x1e293b, 1.15));
    const key = new THREE.DirectionalLight(0xfff7ed, 2.4);
    key.position.set(1.6, 2.4, 2.8);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7dd3fc, 1.35);
    rim.position.set(-2.0, 1.4, -1.8);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xfb923c, 0.55);
    fill.position.set(0.4, -0.6, 2.2);
    scene.add(fill);

    const pivot = new THREE.Group();
    scene.add(pivot);
    const camera = new THREE.PerspectiveCamera(28, THUMB_W / THUMB_H, 0.02, 20);
    sharedRig = { renderer, scene, camera, pivot };
    return sharedRig;
  } catch {
    return null;
  }
}

function prepareGrenadeMaterials(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    mesh.frustumCulled = false;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const std = mat as THREE.MeshStandardMaterial;
      if (!std?.isMeshStandardMaterial) continue;
      if (std.map) {
        std.map.colorSpace = THREE.SRGBColorSpace;
        std.map.anisotropy = 8;
        std.map.needsUpdate = true;
      }
      if (std.normalMap) {
        std.normalMap.anisotropy = 8;
        std.normalMap.needsUpdate = true;
      }
      std.envMapIntensity = Math.max(std.envMapIntensity || 0, 1.05);
      std.needsUpdate = true;
    }
  });
}

function hideExtraSmokeCopies(root: THREE.Object3D): void {
  root.traverse((child) => {
    const n = child.name.toLowerCase();
    if (n.includes('.001') || n.includes('.002') || n.endsWith('_001') || n.endsWith('_002')) {
      child.visible = false;
    }
  });
}

function normalizeGrenadeRoot(root: THREE.Object3D, targetHeight = 0.95): THREE.Group {
  const wrap = new THREE.Group();
  wrap.add(root);
  wrap.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(wrap);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  root.position.sub(center);
  const h = Math.max(size.y, 0.01);
  const s = targetHeight / h;
  wrap.scale.setScalar(s);
  wrap.updateMatrixWorld(true);
  return wrap;
}

async function loadGrenadeModel(type: GrenadeType): Promise<THREE.Group | null> {
  const url = type === 'FRAG' ? FRAG_URL : SMOKE_URL;
  try {
    const gltf = await gltfLoader.loadAsync(url);
    const scene = gltf.scene;
    if (type === 'FRAG') {
      isolateSingleFragGrenadeInGlb(scene);
    } else {
      hideExtraSmokeCopies(scene);
    }
    prepareGrenadeMaterials(scene);
    return normalizeGrenadeRoot(scene);
  } catch {
    if (type === 'SMOKE') {
      try {
        const gltf = await gltfLoader.loadAsync(SMOKE_FALLBACK_URL);
        prepareGrenadeMaterials(gltf.scene);
        return normalizeGrenadeRoot(gltf.scene);
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function renderGrenadeThumbnailInternal(
  type: GrenadeType
): Promise<string | null> {
  const existing = thumbnailCache.get(type);
  if (existing) return existing;

  const model = await loadGrenadeModel(type);
  if (!model) return null;

  return new Promise<string | null>((resolve) => {
    renderQueue = renderQueue.then(() => {
      const rig = getSharedStudioRig();
      if (!rig) {
        resolve(null);
        return;
      }

      const { renderer, camera, pivot } = rig;
      while (pivot.children.length > 0) pivot.remove(pivot.children[0]);

      const orient = new THREE.Group();
      orient.add(model);
      orient.rotation.order = 'YXZ';
      orient.rotation.y = Math.PI * 0.28;
      orient.rotation.x = 0.12;
      pivot.add(orient);
      pivot.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(pivot);
      if (box.isEmpty()) {
        pivot.remove(orient);
        resolve(null);
        return;
      }
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);
      orient.position.sub(center);
      pivot.updateMatrixWorld(true);

      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const distY = Math.max(size.y * 0.5, 0.08) / (Math.tan(vFov * 0.5) * 0.72);
      const distX =
        Math.max(size.x * 0.5, 0.06) /
        (Math.tan(vFov * 0.5) * camera.aspect * 0.8);
      camera.position.set(0, size.y * 0.04, Math.max(distX, distY) + size.z * 0.35);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      renderer.render(rig.scene, camera);
      const dataUrl = renderer.domElement.toDataURL('image/png');
      pivot.remove(orient);
      thumbnailCache.set(type, dataUrl);
      resolve(dataUrl);
    });
  });
}

export function getCachedGrenadeThumbnail3D(type: GrenadeType): string | null {
  return thumbnailCache.get(type) || null;
}

export function requestGrenadeThumbnail3D(
  type: GrenadeType
): Promise<string | null> {
  const cached = thumbnailCache.get(type);
  if (cached) return Promise.resolve(cached);
  const inFlight = inFlightCache.get(type);
  if (inFlight) return inFlight;
  const promise = renderGrenadeThumbnailInternal(type).finally(() => {
    inFlightCache.delete(type);
  });
  inFlightCache.set(type, promise);
  return promise;
}

export function useGrenadeThumbnail3D(type: GrenadeType): string | null {
  const [url, setUrl] = useState<string | null>(() =>
    getCachedGrenadeThumbnail3D(type)
  );
  useEffect(() => {
    const cached = getCachedGrenadeThumbnail3D(type);
    setUrl(cached);
    if (cached) return;
    let cancelled = false;
    void requestGrenadeThumbnail3D(type).then((res) => {
      if (!cancelled && res) setUrl(res);
    });
    return () => {
      cancelled = true;
    };
  }, [type]);
  return url;
}

export function preloadGrenadeThumbnails3D(): void {
  void requestGrenadeThumbnail3D('FRAG');
  void requestGrenadeThumbnail3D('SMOKE');
}

/** Dispose shared studio when leaving menus (optional). */
export function disposeGrenadeThumbnailStudio(): void {
  if (!sharedRig) return;
  disposeSecondaryWebGLRenderer(sharedRig.renderer);
  sharedRig = null;
}
