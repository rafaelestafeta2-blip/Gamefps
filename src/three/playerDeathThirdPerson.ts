import * as THREE from 'three';
import { HudState, WeaponId } from '../types/game';
import {
  BotAnimState,
  BotClipMap,
  selectDirectionalDeathState,
} from './botCharacterClips';
import {
  cloneVanguardCharacterAvatar,
  preloadProRifleBotCharacter,
} from './botCharacterSystem';
import { checkBotLineOfSight } from './botNavigationRoutes';
import { createBotThirdPersonWeaponMesh } from './botWeaponProps';
import { Dust2TriangleCollider } from './dust2Collider';
import { TacticalGrenadeSystem } from './grenadeSystem';
import { ColliderBox } from './levelBuilder';
import { YardBotEntity } from './yardPropsBuilder';

const _focusPos = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _rayDir = new THREE.Vector3();

/**
 * Controlador de Morte em 3ª Pessoa do Jogador + Modo Espectador Tático (5v5):
 * Exibe o corpo completo do operador VANGUARD executando a animação real de Motion Capture
 * do Mixamo (`Pro.Rifle.Pack.zip`) caindo no chão e, após a queda, permite acompanhar
 * os aliados VANGUARD vivos em 3ª pessoa até o fim da rodada.
 */
export class PlayerDeathThirdPersonController {
  private scene: THREE.Scene;
  private isSoftwareGl: boolean;
  private rootGroup: THREE.Group;
  private modelRoot: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private actions: Partial<Record<BotAnimState, THREE.AnimationAction>> = {};
  private weaponProp: THREE.Group | null = null;
  private currentWeaponId: WeaponId | null = null;
  private active = false;
  private spectating = false;
  private spectateIndex = 0;
  private spectatedBot: YardBotEntity | null = null;
  private spectateYaw = 0;
  private deathCycle = 0;
  private orbitStartYaw = 0;

  constructor(scene: THREE.Scene, isSoftwareGl: boolean) {
    this.scene = scene;
    this.isSoftwareGl = isSoftwareGl;
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'PlayerDeathThirdPersonAvatar';
    this.rootGroup.visible = false;
    this.scene.add(this.rootGroup);
    void preloadProRifleBotCharacter();
  }

  private ensureAvatarReady(): boolean {
    if (this.modelRoot && this.mixer) return true;
    const cloned = cloneVanguardCharacterAvatar(this.isSoftwareGl);
    if (!cloned) {
      void preloadProRifleBotCharacter();
      return false;
    }

    this.modelRoot = cloned.modelRoot;
    this.rootGroup.add(this.modelRoot);

    this.mixer = new THREE.AnimationMixer(this.modelRoot);
    const deathStates: BotAnimState[] = [
      'RIFLE_DEATH',
      'RIFLE_DEATH_HEADSHOT',
      'RIFLE_DEATH_BACK',
      'RIFLE_DEATH_BACK_HEADSHOT',
      'RIFLE_DEATH_RIGHT',
      'RIFLE_DEATH_CROUCH',
    ];
    const clips: BotClipMap = cloned.clips;
    for (let i = 0; i < deathStates.length; i++) {
      const stateKey = deathStates[i];
      const clip = clips[stateKey];
      if (!clip) continue;
      const action = this.mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      this.actions[stateKey] = action;
    }

    return true;
  }

  private updateWeaponProp(weaponId: WeaponId): void {
    if (this.currentWeaponId === weaponId && this.weaponProp) return;
    if (this.weaponProp) {
      this.rootGroup.remove(this.weaponProp);
    }
    this.weaponProp = createBotThirdPersonWeaponMesh(weaponId, this.isSoftwareGl);
    this.currentWeaponId = weaponId;
    this.rootGroup.add(this.weaponProp);
  }

  public startDeathSequence(
    playerPos: THREE.Vector3,
    playerYaw: number,
    stance: HudState['stance'],
    activeWeapon: WeaponId,
    isHeadshot: boolean,
    weaponRigRoot: THREE.Object3D,
    killerPos?: THREE.Vector3 | null
  ): void {
    this.active = true;
    this.spectating = false;
    this.spectatedBot = null;
    this.orbitStartYaw = playerYaw;
    weaponRigRoot.visible = false;

    const avatarFacingYaw = playerYaw + Math.PI;
    this.rootGroup.position.set(playerPos.x, playerPos.y, playerPos.z);
    this.rootGroup.rotation.set(0, avatarFacingYaw, 0);
    this.rootGroup.visible = true;

    this.updateWeaponProp(activeWeapon);
    if (this.weaponProp) {
      this.weaponProp.position.set(-0.08, 1.15, 0.18);
      this.weaponProp.rotation.set(0, 0.04, 0);
      this.weaponProp.visible = true;
    }

    if (!this.ensureAvatarReady() || !this.mixer) return;

    this.mixer.stopAllAction();

    const isCrouched =
      stance === 'CROUCH' || stance === 'PRONE' || stance === 'SLIDE';
    const chosenState = killerPos
      ? selectDirectionalDeathState(
          playerPos,
          avatarFacingYaw,
          killerPos,
          isHeadshot,
          isCrouched
        )
      : isCrouched
        ? 'RIFLE_DEATH_CROUCH'
        : isHeadshot
          ? 'RIFLE_DEATH_HEADSHOT'
          : (['RIFLE_DEATH', 'RIFLE_DEATH_BACK', 'RIFLE_DEATH_RIGHT'] as BotAnimState[])[
              this.deathCycle++ % 3
            ];

    const action = this.actions[chosenState] || this.actions.RIFLE_DEATH;
    if (action) {
      action.reset();
      action.setEffectiveTimeScale(1);
      action.setEffectiveWeight(1);
      action.play();
      this.mixer.update(0.001);
    }
  }

  public startSpectating(bots: YardBotEntity[]): YardBotEntity | null {
    const aliveAllies = bots.filter((b) => b.isAlly && !b.isDown);
    if (aliveAllies.length === 0) {
      this.spectating = false;
      this.spectatedBot = null;
      return null;
    }
    this.active = true;
    this.spectating = true;
    this.spectateIndex = this.spectateIndex % aliveAllies.length;
    this.spectatedBot = aliveAllies[this.spectateIndex];
    this.spectateYaw = this.spectatedBot.root.rotation.y + Math.PI;
    return this.spectatedBot;
  }

  public cycleSpectateTarget(
    bots: YardBotEntity[],
    dir: -1 | 1
  ): YardBotEntity | null {
    const aliveAllies = bots.filter((b) => b.isAlly && !b.isDown);
    if (aliveAllies.length === 0) {
      this.spectatedBot = null;
      return null;
    }
    this.spectating = true;
    this.active = true;
    this.spectateIndex =
      (this.spectateIndex + dir + aliveAllies.length) % aliveAllies.length;
    this.spectatedBot = aliveAllies[this.spectateIndex];
    this.spectateYaw = this.spectatedBot.root.rotation.y + Math.PI;
    return this.spectatedBot;
  }

  public getSpectatedBot(bots: YardBotEntity[]): YardBotEntity | null {
    if (!this.spectating) return null;
    if (this.spectatedBot && !this.spectatedBot.isDown) {
      return this.spectatedBot;
    }
    return this.startSpectating(bots);
  }

  public isSpectating(): boolean {
    return this.spectating;
  }

  public update(
    dt: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    yawObject: THREE.Object3D,
    pitchObject: THREE.Object3D,
    camera: THREE.PerspectiveCamera,
    weaponRigRoot: THREE.Object3D,
    grenadeSystem: TacticalGrenadeSystem,
    colliders?: ColliderBox[],
    activeGlbCollider?: Dust2TriangleCollider | null,
    bots?: YardBotEntity[]
  ): void {
    if (!this.active) return;

    weaponRigRoot.visible = false;

    if (!this.modelRoot) {
      if (this.ensureAvatarReady() && this.mixer) {
        const fallback = this.actions.RIFLE_DEATH;
        fallback?.reset().play();
      }
    }

    if (this.mixer && elapsed < 2.9) {
      this.mixer.update(dt);
    }

    if (this.weaponProp && elapsed < 1.2) {
      const dropProgress = Math.min(1, elapsed / 0.45);
      const dropEase = 1 - Math.pow(1 - dropProgress, 2.2);
      this.weaponProp.position.set(
        THREE.MathUtils.lerp(-0.08, 0.32, dropEase),
        THREE.MathUtils.lerp(1.15, 0.04, dropEase),
        THREE.MathUtils.lerp(0.18, 0.24, dropEase)
      );
      this.weaponProp.rotation.set(
        0,
        THREE.MathUtils.lerp(0.04, 0.48, dropEase),
        THREE.MathUtils.lerp(0, Math.PI / 2, dropEase)
      );
    }

    // MODO ESPECTADOR: acompanha aliado VANGUARD vivo em 3ª pessoa tática (Over-The-Shoulder)
    const specTarget = bots ? this.getSpectatedBot(bots) : null;
    if (this.spectating && specTarget) {
      const bPos = specTarget.root.position;
      const targetBackYaw = specTarget.root.rotation.y + Math.PI;
      // Interpolação suave de ângulo para evitar giros bruscos da câmera
      let angleDiff = targetBackYaw - this.spectateYaw;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.spectateYaw += angleDiff * Math.min(1, dt * 6.5);

      const camDist = 2.55;
      const camHeight = 1.85;
      const shoulderOffset = 0.38;

      _focusPos.set(
        bPos.x + Math.cos(this.spectateYaw) * shoulderOffset,
        bPos.y + 1.42,
        bPos.z - Math.sin(this.spectateYaw) * shoulderOffset
      );

      _desiredCamPos.set(
        _focusPos.x + Math.sin(this.spectateYaw) * camDist,
        bPos.y + camHeight,
        _focusPos.z + Math.cos(this.spectateYaw) * camDist
      );

      this.resolveCameraCollision(
        _focusPos,
        _desiredCamPos,
        grenadeSystem,
        colliders,
        activeGlbCollider
      );

      yawObject.position.lerp(_desiredCamPos, Math.min(1, dt * 14));
      playerPos.copy(bPos);

      const dx = _focusPos.x - yawObject.position.x;
      const dy = _focusPos.y - yawObject.position.y;
      const dz = _focusPos.z - yawObject.position.z;
      const horizDist = Math.hypot(dx, dz) || 0.001;

      yawObject.rotation.y = Math.atan2(-dx, -dz);
      pitchObject.rotation.x = Math.atan2(dy, horizDist);
      camera.rotation.z = 0;
      return;
    }

    // Câmera Cinematográfica em 3ª Pessoa focando no personagem caindo no chão
    const zoomT = Math.min(1, elapsed / 0.65);
    const zoomEase = 1 - Math.pow(1 - zoomT, 3);

    const orbitAngle = this.orbitStartYaw + 0.35 + elapsed * 0.38;
    const desiredDist = THREE.MathUtils.lerp(0.35, 2.85, zoomEase);
    const desiredHeight = THREE.MathUtils.lerp(1.52, 1.88, zoomEase);

    _focusPos.set(
      this.rootGroup.position.x,
      this.rootGroup.position.y +
        THREE.MathUtils.lerp(1.15, 0.42, Math.min(1, elapsed / 1.35)),
      this.rootGroup.position.z
    );

    _desiredCamPos.set(
      this.rootGroup.position.x + Math.sin(orbitAngle) * desiredDist,
      this.rootGroup.position.y + desiredHeight,
      this.rootGroup.position.z + Math.cos(orbitAngle) * desiredDist
    );

    this.resolveCameraCollision(
      _focusPos,
      _desiredCamPos,
      grenadeSystem,
      colliders,
      activeGlbCollider
    );

    yawObject.position.copy(_desiredCamPos);

    const dx = _focusPos.x - _desiredCamPos.x;
    const dy = _focusPos.y - _desiredCamPos.y;
    const dz = _focusPos.z - _desiredCamPos.z;
    const horizDist = Math.hypot(dx, dz) || 0.001;

    yawObject.rotation.y = Math.atan2(-dx, -dz);
    pitchObject.rotation.x = Math.atan2(dy, horizDist);
    camera.rotation.z = THREE.MathUtils.lerp(0.12, 0.0, zoomEase);
  }

  private resolveCameraCollision(
    focus: THREE.Vector3,
    desired: THREE.Vector3,
    grenadeSystem: TacticalGrenadeSystem,
    colliders?: ColliderBox[],
    activeGlbCollider?: Dust2TriangleCollider | null
  ): void {
    _rayDir.subVectors(desired, focus);
    const fullDist = _rayDir.length();
    if (fullDist > 0.05) {
      _rayDir.multiplyScalar(1 / fullDist);
      let safeDist = fullDist;

      if (activeGlbCollider && activeGlbCollider.ready) {
        const hitDist = activeGlbCollider.raycastDistance(focus, _rayDir, fullDist);
        if (hitDist !== null && hitDist < safeDist) {
          safeDist = Math.max(0.45, hitDist - 0.28);
        }
      } else if (
        !checkBotLineOfSight(focus, desired, grenadeSystem, colliders, null)
      ) {
        safeDist = Math.min(safeDist, 1.15);
      }

      desired.copy(focus).addScaledVector(_rayDir, safeDist);
    }
  }

  public isActive(): boolean {
    return this.active;
  }

  public stop(
    camera: THREE.PerspectiveCamera,
    weaponRigRoot: THREE.Object3D
  ): void {
    this.active = false;
    this.spectating = false;
    this.spectatedBot = null;
    this.rootGroup.visible = false;
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
    camera.rotation.z = 0;
    weaponRigRoot.position.y = 0;
    weaponRigRoot.rotation.x = 0;
    weaponRigRoot.visible = true;
  }
}
