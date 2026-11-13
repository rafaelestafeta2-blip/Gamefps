import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { WeaponId } from '../types/game';
import { buildLevel3DWeaponPreviewGroup } from './botWeaponProps';

const THUMB_W = 480;
const THUMB_H = 200;

const thumbnailCache = new Map<WeaponId, string>();
const inFlightCache = new Map<WeaponId, Promise<string | null>>();
let renderQueue: Promise<unknown> = Promise.resolve();

interface SharedStudioRig {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  pivot: THREE.Group;
  envTex: THREE.Texture;
}

let sharedRig: SharedStudioRig | null = null;

function getSharedStudioRig(): SharedStudioRig | null {
  if (sharedRig) return sharedRig;
  if (typeof document === 'undefined') return null;

  try {
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(THUMB_W, THUMB_H, false);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.38;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 1.35);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff5e8, 2.8);
    keyLight.position.set(1.4, 2.2, 3.2);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.9);
    rimLight.position.set(-2.2, 1.6, -2.5);
    scene.add(rimLight);

    const orangeAccent = new THREE.DirectionalLight(0xfb923c, 1.0);
    orangeAccent.position.set(2.5, -0.8, 1.6);
    scene.add(orangeAccent);

    const pivot = new THREE.Group();
    scene.add(pivot);

    const camera = new THREE.PerspectiveCamera(26, THUMB_W / THUMB_H, 0.02, 20);
    sharedRig = { renderer, scene, camera, pivot, envTex };
    return sharedRig;
  } catch {
    return null;
  }
}

async function renderWeaponThumbnailInternal(
  weaponId: WeaponId
): Promise<string | null> {
  const existing = thumbnailCache.get(weaponId);
  if (existing) return existing;

  const model = await buildLevel3DWeaponPreviewGroup(weaponId);
  if (!model) return null;

  return new Promise<string | null>((resolve) => {
    renderQueue = renderQueue.then(() => {
      const rig = getSharedStudioRig();
      if (!rig) {
        resolve(null);
        return;
      }

      const { renderer, scene, camera, pivot } = rig;
      while (pivot.children.length > 0) {
        pivot.remove(pivot.children[0]);
      }

      // Orienta a arma em perfil 3/4 lateral clássico (cano apontando para a direita)
      const orientGroup = new THREE.Group();
      orientGroup.add(model);
      orientGroup.rotation.order = 'YXZ';
      orientGroup.rotation.y = Math.PI * 0.44;
      orientGroup.rotation.x = 0.04;
      orientGroup.rotation.z = -0.02;
      pivot.add(orientGroup);
      pivot.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(pivot);
      if (box.isEmpty()) {
        pivot.remove(orientGroup);
        resolve(null);
        return;
      }

      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);
      orientGroup.position.sub(center);
      pivot.updateMatrixWorld(true);

      const vFovRad = THREE.MathUtils.degToRad(camera.fov);
      const halfH = Math.max(size.y * 0.5, 0.05);
      const halfW = Math.max(size.x * 0.5, 0.08);
      const distY = halfH / (Math.tan(vFovRad * 0.5) * 0.78);
      const distX =
        halfW / (Math.tan(vFovRad * 0.5) * camera.aspect * 0.86);
      const camDist = Math.max(distX, distY) + size.z * 0.5;

      camera.position.set(0, 0.015 * size.y, camDist);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      renderer.render(scene, camera);
      const dataUrl = renderer.domElement.toDataURL('image/png');
      pivot.remove(orientGroup);

      thumbnailCache.set(weaponId, dataUrl);
      resolve(dataUrl);
    });
  });
}

export function getCachedWeaponThumbnail3D(weaponId: WeaponId): string | null {
  return thumbnailCache.get(weaponId) || null;
}

export function requestWeaponThumbnail3D(
  weaponId: WeaponId
): Promise<string | null> {
  const cached = thumbnailCache.get(weaponId);
  if (cached) return Promise.resolve(cached);

  const inFlight = inFlightCache.get(weaponId);
  if (inFlight) return inFlight;

  const promise = renderWeaponThumbnailInternal(weaponId).finally(() => {
    inFlightCache.delete(weaponId);
  });
  inFlightCache.set(weaponId, promise);
  return promise;
}

export function useWeaponThumbnail3D(weaponId: WeaponId): string | null {
  const [url, setUrl] = useState<string | null>(() =>
    getCachedWeaponThumbnail3D(weaponId)
  );

  useEffect(() => {
    const cached = getCachedWeaponThumbnail3D(weaponId);
    setUrl(cached);
    if (cached) return;

    let cancelled = false;
    void requestWeaponThumbnail3D(weaponId).then((res) => {
      if (!cancelled && res) {
        setUrl(res);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [weaponId]);

  return url;
}

export function preloadAllWeaponThumbnails3D(ids: WeaponId[]): void {
  for (const id of ids) {
    void requestWeaponThumbnail3D(id);
  }
}
