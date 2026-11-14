/**
 * Short-lived Mixamo 3P gesture body for local player actions that only
 * exist as full-body clips (mantle hang, CPR). Hidden from 1P feel when
 * camera is tight; primarily sells the motion in world space / spectate.
 */

import * as THREE from 'three';
import {
  cloneVanguardCharacterAvatar,
  preloadProRifleBotCharacter,
} from './botCharacterSystem';
import { getCprClip, getMantleClip } from './mixamoAnimPackLoader';

export class PlayerGestureThirdPerson {
  private scene: THREE.Scene;
  private root = new THREE.Group();
  private model: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private active = false;
  private elapsed = 0;
  private duration = 1.2;
  private isSoftwareGl: boolean;

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
    return true;
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
  }

  public isActive(): boolean {
    return this.active;
  }
}
