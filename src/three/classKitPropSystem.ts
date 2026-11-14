/**
 * Warface class support props in-hand:
 * FUZILEIRO → ammo crate, MEDICO → medkit, ENGENHEIRO → armor plate.
 * 1P: camera-mounted hold pose (grenade-style). 3P: optional attach to gesture body.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { ClassSupportKind } from './classSupportSystem';

const KIT_URLS: Record<'AMMO' | 'HEAL' | 'ARMOR', string> = {
  AMMO: '/models/props/class_kits/ammo_crate.glb',
  HEAL: '/models/props/class_kits/medkit.glb',
  ARMOR: '/models/props/class_kits/armor_plate.glb',
};

/** Target world size (meters) for 1P hold vs world/gesture prop. */
const HOLD_SIZE: Record<'AMMO' | 'HEAL' | 'ARMOR', number> = {
  AMMO: 0.28,
  HEAL: 0.22,
  ARMOR: 0.26,
};

function normalizeKitRoot(
  root: THREE.Object3D,
  kind: 'AMMO' | 'HEAL' | 'ARMOR'
): THREE.Group {
  const wrap = new THREE.Group();
  wrap.name = `ClassKit_${kind}`;
  wrap.add(root);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const scale = HOLD_SIZE[kind] / maxDim;
  root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(root);
  const center = new THREE.Vector3();
  box2.getCenter(center);
  root.position.sub(center);
  wrap.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (!mat) continue;
      const std = mat as THREE.MeshStandardMaterial;
      if (std.map) std.map.anisotropy = Math.min(8, std.map.anisotropy || 4);
      std.needsUpdate = true;
    }
  });
  return wrap;
}

let loadPromise: Promise<void> | null = null;
const templates = new Map<'AMMO' | 'HEAL' | 'ARMOR', THREE.Group>();

export function preloadClassKitProps(
  loadingManager?: THREE.LoadingManager
): Promise<void> {
  if (templates.size === 3) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const loader = new GLTFLoader(loadingManager);
    const kinds = Object.keys(KIT_URLS) as Array<'AMMO' | 'HEAL' | 'ARMOR'>;
    await Promise.all(
      kinds.map(
        (kind) =>
          new Promise<void>((resolve) => {
            loader.load(
              KIT_URLS[kind],
              (gltf) => {
                templates.set(kind, normalizeKitRoot(gltf.scene, kind));
                resolve();
              },
              undefined,
              () => resolve()
            );
          })
      )
    );
  })();
  return loadPromise;
}

function cloneKit(kind: 'AMMO' | 'HEAL' | 'ARMOR'): THREE.Group | null {
  const t = templates.get(kind);
  if (!t) return null;
  return t.clone(true);
}

export type ClassKitHoldKind = 'AMMO' | 'HEAL' | 'ARMOR';

/**
 * First-person kit hold: child of camera, temporarily replaces gun visibility.
 */
export class ClassKitPropSystem {
  private camera: THREE.Camera;
  private viewmodelGroup = new THREE.Group();
  private activeVisual: THREE.Object3D | null = null;
  private holdTimer = 0;
  private holdDuration = 1.35;
  private holding = false;
  private currentKind: ClassKitHoldKind | null = null;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.viewmodelGroup.name = 'ClassKitViewmodel';
    this.viewmodelGroup.visible = false;
    this.camera.add(this.viewmodelGroup);
    void preloadClassKitProps();
  }

  public isHolding(): boolean {
    return this.holding;
  }

  public getHeldKind(): ClassKitHoldKind | null {
    return this.currentKind;
  }

  /**
   * Show kit in 1P hands for a short use beat.
   * Pose mimics a right-hand offer / place (procedural — no Mixamo 1P arms).
   */
  public presentKit(kind: ClassSupportKind, durationSec = 1.4): void {
    if (kind !== 'AMMO' && kind !== 'HEAL' && kind !== 'ARMOR') return;
    void preloadClassKitProps().then(() => {
      if (this.activeVisual) {
        this.viewmodelGroup.remove(this.activeVisual);
        this.activeVisual = null;
      }
      const clone = cloneKit(kind);
      if (!clone) return;
      this.activeVisual = clone;
      this.viewmodelGroup.add(clone);
      // Camera-local: lower-right, slightly forward — “holding out” the kit.
      this.viewmodelGroup.position.set(0.18, -0.22, -0.42);
      this.viewmodelGroup.rotation.set(-0.35, 0.55, 0.15);
      if (kind === 'AMMO') {
        this.viewmodelGroup.position.set(0.12, -0.28, -0.48);
        this.viewmodelGroup.rotation.set(-0.2, 0.4, 0.05);
        clone.scale.setScalar(1.15);
      } else if (kind === 'ARMOR') {
        this.viewmodelGroup.rotation.set(-0.55, 0.35, 0.4);
        clone.scale.setScalar(1.05);
      }
      this.viewmodelGroup.visible = true;
      this.holding = true;
      this.currentKind = kind;
      this.holdTimer = 0;
      this.holdDuration = Math.max(0.6, durationSec);
    });
  }

  public hide(): void {
    this.holding = false;
    this.currentKind = null;
    this.holdTimer = 0;
    this.viewmodelGroup.visible = false;
    if (this.activeVisual) {
      this.viewmodelGroup.remove(this.activeVisual);
      this.activeVisual = null;
    }
  }

  public update(dt: number): void {
    if (!this.holding) return;
    this.holdTimer += dt;
    // Subtle idle bob while presenting.
    const t = this.holdTimer;
    this.viewmodelGroup.position.y =
      (this.currentKind === 'AMMO' ? -0.28 : -0.22) + Math.sin(t * 6) * 0.008;
    if (this.holdTimer >= this.holdDuration) {
      this.hide();
    }
  }

  /** Clone for attaching to a Mixamo right-hand bone (3P gesture). */
  public createWorldProp(kind: ClassKitHoldKind): THREE.Group | null {
    const clone = cloneKit(kind);
    if (!clone) return null;
    // Mixamo hand space is ~cm; scale up from meter-normalized hold size.
    clone.scale.setScalar(kind === 'AMMO' ? 55 : 48);
    clone.position.set(4, -2, 0);
    clone.rotation.set(0, Math.PI * 0.5, Math.PI * 0.15);
    return clone;
  }
}

export function createClassKitHandProp(
  kind: ClassKitHoldKind
): THREE.Group | null {
  const clone = cloneKit(kind);
  if (!clone) return null;
  clone.scale.setScalar(kind === 'AMMO' ? 55 : 48);
  clone.position.set(4, -2, 0);
  clone.rotation.set(0, Math.PI * 0.5, Math.PI * 0.15);
  return clone;
}
