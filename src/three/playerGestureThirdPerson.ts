/**
 * Short-lived Mixamo 3P gesture body for local player actions that only
 * exist as full-body clips (mantle hang, CPR, kit use). Hidden from 1P feel when
 * camera is tight; primarily sells the motion in world space / spectate.
 */

import * as THREE from 'three';
import {
  cloneVanguardCharacterAvatar,
  preloadProRifleBotCharacter,
} from './botCharacterSystem';
import {
  getAnimPackClip,
  getCprClip,
  getMantleClip,
} from './mixamoAnimPackLoader';
import {
  createClassKitHandProp,
  type ClassKitHoldKind,
} from './classKitPropSystem';

export class PlayerGestureThirdPerson {
  private scene: THREE.Scene;
  private root = new THREE.Group();
  private model: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private active = false;
  private elapsed = 0;
  private duration = 1.2;
  private isSoftwareGl: boolean;
  private handProp: THREE.Object3D | null = null;
  private rHandBone: THREE.Object3D | null = null;

  constructor(scene: THREE.Scene, isSoftwareGl: boolean) {
    this.scene = scene;
    this.isSoftwareGl = isSoftwareGl;
    this.root.name = 'PlayerGestureThirdPerson';
    this.root.visible = false;
    this.scene.add(this.root);
    void preloadProRifleBotCharacter();
  }

  private ensureModel(): boolean {
    if (this.model && this.mixer) return true;
    const cloned = cloneVanguardCharacterAvatar(this.isSoftwareGl, undefined, null);
    if (!cloned) {
      void preloadProRifleBotCharacter();
      return false;
    }
    if (this.model) this.root.remove(this.model);
    this.model = cloned.modelRoot;
    this.root.add(this.model);
    this.mixer = new THREE.AnimationMixer(this.model);
    this.rHandBone = null;
    this.model.traverse((child) => {
      if (child.name === 'mixamorigRightHand') this.rHandBone = child;
    });
    return true;
  }

  private clearHandProp(): void {
    if (this.handProp?.parent) this.handProp.parent.remove(this.handProp);
    this.handProp = null;
  }

  private attachKitToHand(kind: ClassKitHoldKind): void {
    this.clearHandProp();
    if (!this.rHandBone) return;
    const prop = createClassKitHandProp(kind);
    if (!prop) return;
    this.rHandBone.add(prop);
    this.handProp = prop;
  }

  public playMantle(
    pos: THREE.Vector3,
    yaw: number,
    durationSec: number
  ): void {
    const clip = getMantleClip();
    if (!clip) return;
    if (!this.ensureModel() || !this.mixer) return;
    this.mixer.stopAllAction();
    const action = this.mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.reset().play();
    this.root.position.copy(pos);
    this.root.rotation.set(0, yaw + Math.PI, 0);
    this.root.visible = true;
    this.active = true;
    this.elapsed = 0;
    this.duration = Math.max(0.35, Math.min(durationSec, clip.duration || durationSec));
  }

  public playCpr(pos: THREE.Vector3, yaw: number): void {
    const clip = getCprClip();
    if (!clip) return;
    if (!this.ensureModel() || !this.mixer) return;
    this.clearHandProp();
    // Medic revive = defibrillator / CPR — no medkit prop (heal uses kit separately).
    this.mixer.stopAllAction();
    const action = this.mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.reset().play();
    this.root.position.copy(pos);
    this.root.rotation.set(0, yaw + Math.PI, 0);
    this.root.visible = true;
    this.active = true;
    this.elapsed = 0;
    this.duration = Math.min(2.6, clip.duration || 2.4);
  }

  /**
   * Best-effort kit use gesture from the imported Animaçao pack.
   * Uses kneeling_inspecting (only near-fit); attach class kit to right hand.
   * Prefer dedicated Mixamo hold/use clips when Rafael adds them (see report).
   */
  public playKitUse(
    kind: ClassKitHoldKind,
    pos: THREE.Vector3,
    yaw: number,
    durationSec = 1.35
  ): void {
    // Prefer kneeling_inspecting; fall back to rifle aiming idle if missing.
    const clip =
      getAnimPackClip('KNEEL_INSPECT') ||
      getAnimPackClip('RIFLE_AIM') ||
      getCprClip();
    if (!clip) return;
    if (!this.ensureModel() || !this.mixer) return;
    this.mixer.stopAllAction();
    const action = this.mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.reset().fadeIn(0.12).play();
    this.attachKitToHand(kind);
    this.root.position.copy(pos);
    this.root.position.y = Math.max(0, pos.y);
    this.root.rotation.set(0, yaw + Math.PI, 0);
    this.root.visible = true;
    this.active = true;
    this.elapsed = 0;
    this.duration = Math.max(0.7, Math.min(durationSec, clip.duration || durationSec));
  }

  public update(dt: number): void {
    if (!this.active) return;
    this.elapsed += dt;
    this.mixer?.update(dt);
    if (this.elapsed >= this.duration) {
      this.stop();
    }
  }

  public stop(): void {
    this.active = false;
    this.root.visible = false;
    this.mixer?.stopAllAction();
    this.clearHandProp();
  }

  public isActive(): boolean {
    return this.active;
  }
}
