/**
 * Warface class support props in-hand:
 * FUZILEIRO → ammo crate, MEDICO → medkit, ENGENHEIRO → armor plate.
 * 1P: camera-mounted hold pose phased to Picup Mixamo timings
 * (pick up → hold → put down / apply).
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { ClassSupportKind } from './classSupportSystem';
import {
  getKitUseTimings,
  preloadMixamoAnimPack,
} from './mixamoAnimPackLoader';

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

type KitPhase = 'PICKUP' | 'HOLD' | 'PUT_DOWN';

/**
 * First-person kit hold: child of camera, temporarily replaces gun visibility.
 * Motion phases follow Picup Mixamo clip timings (procedural 1P — no arms rig).
 */
export class ClassKitPropSystem {
  private camera: THREE.Camera;
  private viewmodelGroup = new THREE.Group();
  private activeVisual: THREE.Object3D | null = null;
  private holdTimer = 0;
  private holding = false;
  private currentKind: ClassKitHoldKind | null = null;
  private phase: KitPhase = 'HOLD';
  private pickupDur = 0.7;
  private holdDur = 0.7;
  private putDur = 0.8;
  private basePos = new THREE.Vector3(0.18, -0.22, -0.42);
  private baseRot = new THREE.Euler(-0.35, 0.55, 0.15);

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.viewmodelGroup.name = 'ClassKitViewmodel';
    this.viewmodelGroup.visible = false;
    this.camera.add(this.viewmodelGroup);
    void preloadClassKitProps();
    void preloadMixamoAnimPack();
  }

  public isHolding(): boolean {
    return this.holding;
  }

  public getHeldKind(): ClassKitHoldKind | null {
    return this.currentKind;
  }

  private applyKindPose(kind: ClassKitHoldKind, clone: THREE.Object3D): void {
    this.basePos.set(0.18, -0.22, -0.42);
    this.baseRot.set(-0.35, 0.55, 0.15);
    if (kind === 'AMMO') {
      this.basePos.set(0.12, -0.28, -0.48);
      this.baseRot.set(-0.2, 0.4, 0.05);
      clone.scale.setScalar(1.15);
    } else if (kind === 'ARMOR') {
      this.baseRot.set(-0.55, 0.35, 0.4);
      clone.scale.setScalar(1.05);
    }
  }

  /**
   * Show kit in 1P hands: pick up → hold → put down / apply.
   * Duration overridden by Picup Mixamo timings when pack is loaded.
   */
  public presentKit(kind: ClassSupportKind, _durationSec = 1.4): void {
    if (kind !== 'AMMO' && kind !== 'HEAL' && kind !== 'ARMOR') return;
    void Promise.all([preloadClassKitProps(), preloadMixamoAnimPack()]).then(
      () => {
        if (this.activeVisual) {
          this.viewmodelGroup.remove(this.activeVisual);
          this.activeVisual = null;
        }
        const clone = cloneKit(kind);
        if (!clone) return;
        this.activeVisual = clone;
        this.viewmodelGroup.add(clone);
        this.applyKindPose(kind, clone);

        const t = getKitUseTimings();
        this.pickupDur = t.pickup;
        this.holdDur = t.hold;
        this.putDur = t.putDown;

        this.phase = 'PICKUP';
        this.holdTimer = 0;
        this.currentKind = kind;
        this.holding = true;
        this.viewmodelGroup.visible = true;
        // Start below frame (rising into hold).
        this.viewmodelGroup.position.set(
          this.basePos.x,
          this.basePos.y - 0.28,
          this.basePos.z + 0.08
        );
        this.viewmodelGroup.rotation.set(
          this.baseRot.x + 0.45,
          this.baseRot.y,
          this.baseRot.z
        );
      }
    );
  }

  public hide(): void {
    this.holding = false;
    this.currentKind = null;
    this.holdTimer = 0;
    this.phase = 'HOLD';
    this.viewmodelGroup.visible = false;
    if (this.activeVisual) {
      this.viewmodelGroup.remove(this.activeVisual);
      this.activeVisual = null;
    }
  }

  public update(dt: number): void {
    if (!this.holding) return;
    this.holdTimer += dt;

    const yHold = this.basePos.y;
    if (this.phase === 'PICKUP') {
      const a = Math.min(1, this.holdTimer / this.pickupDur);
      const e = 1 - Math.pow(1 - a, 3);
      this.viewmodelGroup.position.set(
        this.basePos.x,
        THREE.MathUtils.lerp(yHold - 0.28, yHold, e),
        THREE.MathUtils.lerp(this.basePos.z + 0.08, this.basePos.z, e)
      );
      this.viewmodelGroup.rotation.set(
        THREE.MathUtils.lerp(this.baseRot.x + 0.45, this.baseRot.x, e),
        this.baseRot.y,
        this.baseRot.z
      );
      if (this.holdTimer >= this.pickupDur) {
        this.phase = 'HOLD';
        this.holdTimer = 0;
      }
      return;
    }

    if (this.phase === 'HOLD') {
      const bob = Math.sin(this.holdTimer * 6) * 0.008;
      this.viewmodelGroup.position.set(
        this.basePos.x,
        yHold + bob,
        this.basePos.z
      );
      this.viewmodelGroup.rotation.set(
        this.baseRot.x,
        this.baseRot.y,
        this.baseRot.z
      );
      if (this.holdTimer >= this.holdDur) {
        this.phase = 'PUT_DOWN';
        this.holdTimer = 0;
      }
      return;
    }

    // PUT_DOWN / apply — push forward-down then fade out of view.
    const a = Math.min(1, this.holdTimer / this.putDur);
    const e = a * a;
    this.viewmodelGroup.position.set(
      this.basePos.x + e * 0.06,
      yHold - e * 0.22,
      this.basePos.z - e * 0.12
    );
    this.viewmodelGroup.rotation.set(
      this.baseRot.x - e * 0.55,
      this.baseRot.y - e * 0.2,
      this.baseRot.z
    );
    if (this.activeVisual) {
      this.activeVisual.scale.setScalar(
        THREE.MathUtils.lerp(1, 0.75, e) *
          (this.currentKind === 'AMMO' ? 1.15 : this.currentKind === 'ARMOR' ? 1.05 : 1)
      );
    }
    if (this.holdTimer >= this.putDur) {
      this.hide();
    }
  }

  /** Clone for attaching to a Mixamo right-hand bone (3P gesture). */
  public createWorldProp(kind: ClassKitHoldKind): THREE.Group | null {
    const clone = cloneKit(kind);
    if (!clone) return null;
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
