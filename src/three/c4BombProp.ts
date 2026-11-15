/**
 * Real C4 GLB (Gamesfps Animaçao/Picup/c4_explosive.glb) for planted bomb
 * and plant-in-hand viewmodel. Replaces the procedural box placeholder.
 */

import * as THREE from 'three';
import {
  createGameGltfLoader,
  ensureMeshoptDecoder,
} from './gltfLoaderFactory';

const C4_URL = '/models/props/c4_explosive.glb';
/** Target longest-axis size in meters for world / 1P. */
const WORLD_SIZE = 0.42;
const HOLD_SIZE = 0.32;

let loadPromise: Promise<THREE.Group | null> | null = null;
let template: THREE.Group | null = null;

function normalizeRoot(root: THREE.Object3D, targetSize: number): THREE.Group {
  const wrap = new THREE.Group();
  wrap.name = 'C4BombProp';
  wrap.add(root);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  root.scale.multiplyScalar(targetSize / maxDim);
  root.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(root);
  const center = new THREE.Vector3();
  box2.getCenter(center);
  root.position.sub(center);
  wrap.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.visible = true;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (!mat) continue;
      const std = mat as THREE.MeshStandardMaterial;
      if (std.map) {
        std.map.colorSpace = THREE.SRGBColorSpace;
        std.map.anisotropy = Math.min(8, std.map.anisotropy || 4);
        std.map.needsUpdate = true;
      }
      if (std.emissiveMap) {
        std.emissiveMap.colorSpace = THREE.SRGBColorSpace;
        std.emissiveIntensity = Math.max(std.emissiveIntensity || 0, 0.35);
      }
      std.side = THREE.FrontSide;
      std.depthWrite = true;
      std.transparent = false;
      std.opacity = 1;
      std.needsUpdate = true;
    }
  });
  return wrap;
}

function makeFallbackPack(size: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'C4Fallback';
  const pack = new THREE.Mesh(
    new THREE.BoxGeometry(size * 0.85, size * 0.28, size * 0.55),
    new THREE.MeshStandardMaterial({
      color: 0x3f4d34,
      roughness: 0.65,
      metalness: 0.25,
    })
  );
  const keypad = new THREE.Mesh(
    new THREE.BoxGeometry(size * 0.35, size * 0.08, size * 0.24),
    new THREE.MeshBasicMaterial({ color: 0x111827 })
  );
  keypad.position.set(size * 0.12, size * 0.16, 0);
  g.add(pack, keypad);
  return g;
}

export function preloadC4BombProp(
  loadingManager?: THREE.LoadingManager
): Promise<THREE.Group | null> {
  if (template) return Promise.resolve(template);
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    await ensureMeshoptDecoder();
    return await new Promise<THREE.Group | null>((resolve) => {
      const loader = createGameGltfLoader(loadingManager);
      loader.load(
        C4_URL,
        (gltf) => {
          template = normalizeRoot(gltf.scene, WORLD_SIZE);
          resolve(template);
        },
        undefined,
        (err) => {
          console.warn('C4 GLB load failed (meshopt/webp?) — using fallback pack:', err);
          resolve(null);
        }
      );
    });
  })();
  return loadPromise;
}

function cloneTemplate(size = WORLD_SIZE): THREE.Group | null {
  if (!template) return null;
  const clone = template.clone(true);
  if (Math.abs(size - WORLD_SIZE) > 0.001) {
    clone.scale.multiplyScalar(size / WORLD_SIZE);
  }
  return clone;
}

export interface PlantedC4Visual {
  group: THREE.Group;
  ledMesh: THREE.Mesh;
  /** Swap placeholder for real GLB when ready. */
  ensureLoaded: () => Promise<void>;
}

/**
 * World planted C4: starts as olive box placeholder, upgrades to GLB async.
 */
export function createPlantedC4Visual(): PlantedC4Visual {
  const group = new THREE.Group();
  group.name = 'PlantedC4';

  const placeholder = makeFallbackPack(WORLD_SIZE);
  placeholder.name = 'C4Placeholder';
  group.add(placeholder);

  const ledMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  ledMesh.position.set(-0.08, 0.08, 0.02);
  ledMesh.name = 'C4Led';
  group.add(ledMesh);

  let upgraded = false;
  const ensureLoaded = async () => {
    if (upgraded) return;
    await preloadC4BombProp();
    const model = cloneTemplate(WORLD_SIZE);
    if (!model) return;
    upgraded = true;
    group.remove(placeholder);
    placeholder.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.isMesh) {
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat) => mat?.dispose?.());
      }
    });
    // Sit flat on site: pack thickness on Y after normalize.
    model.rotation.x = -Math.PI * 0.5;
    model.position.y = 0.08;
    model.visible = true;
    group.add(model);
    ledMesh.position.set(0.06, 0.12, 0.02);
  };
  void ensureLoaded();

  return { group, ledMesh, ensureLoaded };
}

/**
 * 1P plant-in-hand: camera child shown while bombStatus === PLANTING.
 */
export class C4PlantViewmodel {
  private camera: THREE.Camera;
  private root = new THREE.Group();
  private visual: THREE.Object3D | null = null;
  private holding = false;
  private bobT = 0;
  private loadToken = 0;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.root.name = 'C4PlantViewmodel';
    this.root.visible = false;
    this.camera.add(this.root);
    void this.ensureVisual();
  }

  private async ensureVisual(): Promise<void> {
    if (this.visual) return;
    const token = ++this.loadToken;
    await preloadC4BombProp();
    if (token !== this.loadToken || this.visual) return;
    const model = cloneTemplate(HOLD_SIZE);
    if (!model) {
      this.visual = makeFallbackPack(HOLD_SIZE);
    } else {
      model.rotation.set(-0.35, 0.9, 0.18);
      this.visual = model;
    }
    this.visual.visible = true;
    this.root.add(this.visual);
  }

  public isHolding(): boolean {
    return this.holding;
  }

  public setPlanting(active: boolean): void {
    if (active === this.holding) return;
    this.holding = active;
    this.root.visible = active;
    this.bobT = 0;
    if (active) {
      this.root.position.set(0.18, -0.26, -0.38);
      this.root.rotation.set(-0.5, 0.4, 0.22);
      void this.ensureVisual().then(() => {
        if (this.holding) this.root.visible = true;
      });
    }
  }

  public update(dt: number): void {
    if (!this.holding) return;
    if (!this.visual) void this.ensureVisual();
    this.bobT += dt;
    const j = Math.sin(this.bobT * 14) * 0.006 + Math.sin(this.bobT * 9.2) * 0.004;
    this.root.position.y = -0.26 + j;
    this.root.rotation.z = 0.22 + Math.sin(this.bobT * 11) * 0.04;
  }
}
