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
  getKitHoldClip,
  getKitPickupClip,
  getKitPutDownClip,
  getKitUseTimings,
  getMantleClip,
} from './mixamoAnimPackLoader';
import {
  createClassKitHandProp,
  type ClassKitHoldKind,
} from './classKitPropSystem';

type KitGesturePhase = 'PICKUP' | 'HOLD' | 'PUT_DOWN' | null;

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
  private kitPhase: KitGesturePhase = null;
  private kitPhaseElapsed = 0;
  private kitPickupDur = 0.7;
  private kitHoldDur = 0.7;
  private kitPutDur = 0.8;

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
    // Time-scale clip to match vault duration so hang→pull reads in-world.
    const rawDur = clip.duration || durationSec;
    action.timeScale = rawDur / Math.max(0.35, durationSec);
    action.reset().play();
    this.root.position.copy(pos);
    this.root.rotation.set(0, yaw + Math.PI, 0);
    this.root.visible = true;
    this.active = true;
    this.elapsed = 0;
    this.duration = Math.max(0.35, durationSec);
  }

  /** Keep gesture body under the local player during an active mantle. */
  public setWorldPose(pos: THREE.Vector3, yaw?: number): void {
    if (!this.active) return;
    this.root.position.copy(pos);
    if (typeof yaw === 'number') {
      this.root.rotation.set(0, yaw + Math.PI, 0);
    }
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

  private playClipOnce(
    clip: THREE.AnimationClip,
    loop = false,
    timeScale = 1
  ): void {
    if (!this.mixer) return;
    this.mixer.stopAllAction();
    const action = this.mixer.clipAction(clip);
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = !loop;
    action.timeScale = timeScale;
    action.reset().fadeIn(0.08).play();
  }

  /**
   * 3P kit use: Picup Mixamo sequence pick up → hold → put down,
   * with class kit prop attached to the right hand.
   * Prefer for spectate/remote; local 1P uses ClassKitPropSystem phases.
   */
  public playKitUse(
    kind: ClassKitHoldKind,
    pos: THREE.Vector3,
    yaw: number,
    _durationSec = 1.35
  ): void {
    const pickup = getKitPickupClip();
    const hold = getKitHoldClip();
    const putDown = getKitPutDownClip();
    const fallback =
      getAnimPackClip('KNEEL_INSPECT') ||
      getAnimPackClip('RIFLE_AIM') ||
      getCprClip();
    const first = pickup || hold || putDown || fallback;
    if (!first) return;
    if (!this.ensureModel() || !this.mixer) return;

    const t = getKitUseTimings();
    this.kitPickupDur = t.pickup;
    this.kitHoldDur = t.hold;
    this.kitPutDur = t.putDown;
    this.kitPhase = pickup ? 'PICKUP' : hold ? 'HOLD' : 'PUT_DOWN';
    this.kitPhaseElapsed = 0;

    this.attachKitToHand(kind);
    // Scale clip playback so Mixamo length matches gameplay clamp (timeScale = raw/target).
    const rawPickup = pickup?.duration || this.kitPickupDur;
    this.playClipOnce(
      first,
      false,
      pickup && rawPickup > 0.05 ? rawPickup / this.kitPickupDur : 1
    );

    this.root.position.copy(pos);
    this.root.position.y = Math.max(0, pos.y);
    this.root.rotation.set(0, yaw + Math.PI, 0);
    this.root.visible = true;
    this.active = true;
    this.elapsed = 0;
    this.duration = t.total + 0.05;
  }

  private advanceKitPhase(): void {
    if (!this.kitPhase || !this.mixer) return;
    if (this.kitPhase === 'PICKUP') {
      const hold = getKitHoldClip();
      const put = getKitPutDownClip();
      if (hold) {
        this.kitPhase = 'HOLD';
        this.kitPhaseElapsed = 0;
        const raw = hold.duration || this.kitHoldDur;
        this.playClipOnce(hold, true, raw / Math.max(0.35, this.kitHoldDur));
        return;
      }
      if (put) {
        this.kitPhase = 'PUT_DOWN';
        this.kitPhaseElapsed = 0;
        this.playClipOnce(put, false);
        return;
      }
      this.kitPhase = null;
      return;
    }
    if (this.kitPhase === 'HOLD') {
      const put = getKitPutDownClip();
      if (put) {
        this.kitPhase = 'PUT_DOWN';
        this.kitPhaseElapsed = 0;
        const raw = put.duration || this.kitPutDur;
        this.playClipOnce(put, false, raw / Math.max(0.45, this.kitPutDur));
        return;
      }
      this.kitPhase = null;
      return;
    }
    this.kitPhase = null;
  }

  public update(dt: number): void {
    if (!this.active) return;
    this.elapsed += dt;
    this.mixer?.update(dt);

    if (this.kitPhase) {
      this.kitPhaseElapsed += dt;
      const limit =
        this.kitPhase === 'PICKUP'
          ? this.kitPickupDur
          : this.kitPhase === 'HOLD'
            ? this.kitHoldDur
            : this.kitPutDur;
      if (this.kitPhaseElapsed >= limit) {
        if (this.kitPhase === 'PUT_DOWN') {
          this.stop();
          return;
        }
        this.advanceKitPhase();
      }
    }

    if (this.elapsed >= this.duration) {
      this.stop();
    }
  }

  public stop(): void {
    this.active = false;
    this.root.visible = false;
    this.mixer?.stopAllAction();
    this.clearHandProp();
    this.kitPhase = null;
  }

  public isActive(): boolean {
    return this.active;
  }
}
