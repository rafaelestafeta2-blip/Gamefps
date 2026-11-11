import * as THREE from 'three';
import { SquadOperatorStats, WeaponId } from '../types/game';
import { BotAnimState } from './botCharacterClips';
import {
  cloneVanguardCharacterAvatar,
  preloadProRifleBotCharacter,
} from './botCharacterSystem';
import { createBotThirdPersonWeaponMesh } from './botWeaponProps';

interface PodiumOperatorSlot {
  slotGroup: THREE.Group;
  modelRoot: THREE.Object3D | null;
  mixer: THREE.AnimationMixer | null;
  rHandBone: THREE.Object3D | null;
  lHandBone: THREE.Object3D | null;
  weaponProp: THREE.Group | null;
  weaponId: WeaponId;
  poseState: BotAnimState;
  isCrouched: boolean;
}

// Coordenadas da formação em V estilo Call of Duty Winner's Circle (Centro = #1 MVP)
const PODIUM_SLOTS: Array<{
  x: number;
  y: number;
  z: number;
  yaw: number;
  pose: BotAnimState;
  crouch: boolean;
}> = [
  { x: 0.0, y: 0.18, z: 0.52, yaw: 0.0, pose: 'RIFLE_AIM', crouch: false }, // #1 MVP (Centro Frente)
  { x: -1.12, y: 0.1, z: -0.05, yaw: 0.18, pose: 'RIFLE_IDLE', crouch: false }, // #2 Esquerda Interna
  { x: 1.12, y: 0.1, z: -0.05, yaw: -0.18, pose: 'RIFLE_AIM', crouch: false }, // #3 Direita Interna
  { x: -2.18, y: 0.04, z: -0.52, yaw: 0.28, pose: 'RIFLE_CROUCH', crouch: true }, // #4 Flanco Esquerdo (Joelho no chão)
  { x: 2.18, y: 0.04, z: -0.52, yaw: -0.28, pose: 'RIFLE_IDLE', crouch: false }, // #5 Flanco Direito
];

const _rHandWorld = new THREE.Vector3();
const _lHandWorld = new THREE.Vector3();
const _rHandLocal = new THREE.Vector3();
const _lHandLocal = new THREE.Vector3();
const _handDir = new THREE.Vector3();
const _lookTargetWorld = new THREE.Vector3();
const _camTarget = new THREE.Vector3();

/**
 * Palco 3D estilo Call of Duty "Winner's Circle" para o Fim da Partida:
 * Renderiza os 5 operadores do Esquadrão VANGUARD em formação tática com suas
 * armas 3D reais (.glb) e animações de pose enquanto o placar de estatísticas é exibido.
 */
export class PostMatchShowcase3D {
  private scene: THREE.Scene;
  private isSoftwareGl: boolean;
  private stageRoot: THREE.Group;
  private slots: PodiumOperatorSlot[] = [];
  private active = false;
  private elapsed = 0;
  private avatarsPopulated = false;

  constructor(scene: THREE.Scene, isSoftwareGl: boolean) {
    this.scene = scene;
    this.isSoftwareGl = isSoftwareGl;
    this.stageRoot = new THREE.Group();
    this.stageRoot.name = 'PostMatchWinnersCircle3D';
    // Posicionado acima da arena para nunca colidir com paredes dos mapas
    this.stageRoot.position.set(0, 52, 0);
    this.stageRoot.visible = false;
    this.scene.add(this.stageRoot);

    this.buildTacticalPodiumStage();
    void preloadProRifleBotCharacter();
  }

  private buildTacticalPodiumStage(): void {
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0b111d,
      roughness: 0.38,
      metalness: 0.65,
    });
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0x152238,
      roughness: 0.32,
      metalness: 0.78,
    });
    const accentCyanMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const accentGoldMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const backdropMat = new THREE.MeshStandardMaterial({
      color: 0x060a12,
      roughness: 0.85,
      metalness: 0.2,
    });

    // Plataforma principal escura e parede de fundo para contraste de silhueta 3D
    const mainBase = new THREE.Mesh(
      new THREE.CylinderGeometry(5.6, 6.0, 0.24, 32),
      floorMat
    );
    mainBase.position.y = -0.12;
    mainBase.receiveShadow = true;
    this.stageRoot.add(mainBase);

    const backdropWall = new THREE.Mesh(
      new THREE.BoxGeometry(14.0, 7.5, 0.3),
      backdropMat
    );
    backdropWall.position.set(0, 3.2, -2.6);
    this.stageRoot.add(backdropWall);

    // Pilares táticos iluminados ao fundo
    for (let i = -2; i <= 2; i++) {
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 6.2, 0.42),
        pedMat
      );
      pillar.position.set(i * 2.1, 2.8, -2.25);
      this.stageRoot.add(pillar);

      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 5.2, 0.45),
        i === 0 ? accentGoldMat : accentCyanMat
      );
      strip.position.set(i * 2.1, 2.8, -2.24);
      this.stageRoot.add(strip);
    }

    // Pedestais individuais para cada um dos 5 operadores
    for (let i = 0; i < PODIUM_SLOTS.length; i++) {
      const cfg = PODIUM_SLOTS[i];
      const isMvp = i === 0;
      const pedHeight = cfg.y;
      const pedRadius = isMvp ? 0.74 : 0.62;

      const ped = new THREE.Mesh(
        new THREE.CylinderGeometry(pedRadius, pedRadius * 1.08, pedHeight, 24),
        pedMat
      );
      ped.position.set(cfg.x, pedHeight * 0.5, cfg.z);
      this.stageRoot.add(ped);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(pedRadius * 0.88, pedRadius * 1.02, 24),
        isMvp ? accentGoldMat : accentCyanMat
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(cfg.x, pedHeight + 0.008, cfg.z);
      this.stageRoot.add(ring);

      const slotGroup = new THREE.Group();
      slotGroup.position.set(cfg.x, pedHeight, cfg.z);
      slotGroup.rotation.set(0, cfg.yaw, 0);
      this.stageRoot.add(slotGroup);

      this.slots.push({
        slotGroup,
        modelRoot: null,
        mixer: null,
        rHandBone: null,
        lHandBone: null,
        weaponProp: null,
        weaponId: 'M4_CARBINE',
        poseState: cfg.pose,
        isCrouched: cfg.crouch,
      });
    }

    // Iluminação de estúdio 3 pontos dedicada ao Winner's Circle
    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.6);
    keyLight.position.set(2.5, 5.5, 5.0);
    this.stageRoot.add(keyLight);

    const rimLight = new THREE.PointLight(0x38bdf8, 6.5, 14);
    rimLight.position.set(0, 3.6, -1.8);
    this.stageRoot.add(rimLight);

    const goldMvpLight = new THREE.PointLight(0xf59e0b, 3.5, 7);
    goldMvpLight.position.set(0, 2.4, 1.9);
    this.stageRoot.add(goldMvpLight);
  }

  private populateAvatarsIfNeeded(sortedSquad: SquadOperatorStats[]): void {
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const op = sortedSquad[i];
      const desiredWep: WeaponId = op?.weaponId || 'M4_CARBINE';

      if (!slot.modelRoot) {
        const cloned = cloneVanguardCharacterAvatar(this.isSoftwareGl);
        if (!cloned) {
          void preloadProRifleBotCharacter();
          return;
        }
        slot.modelRoot = cloned.modelRoot;
        slot.slotGroup.add(slot.modelRoot);

        slot.modelRoot.traverse((child) => {
          if (child.name === 'mixamorigRightHand') slot.rHandBone = child;
          else if (child.name === 'mixamorigLeftHand') slot.lHandBone = child;
        });

        slot.mixer = new THREE.AnimationMixer(slot.modelRoot);
        const clip = cloned.clips[slot.poseState] || cloned.clips.RIFLE_IDLE;
        if (clip) {
          const action = slot.mixer.clipAction(clip);
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.time = i * 0.47; // Desfase natural entre os 5 soldados
          action.setEffectiveTimeScale(0.85);
          action.play();
        }
      }

      if (!slot.weaponProp || slot.weaponId !== desiredWep) {
        if (slot.weaponProp) {
          slot.slotGroup.remove(slot.weaponProp);
        }
        slot.weaponId = desiredWep;
        slot.weaponProp = createBotThirdPersonWeaponMesh(
          desiredWep,
          this.isSoftwareGl
        );
        slot.slotGroup.add(slot.weaponProp);
      }
    }
    this.avatarsPopulated = true;
  }

  private syncSlotWeapons(): void {
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (!slot.weaponProp) continue;

      if (slot.rHandBone && slot.lHandBone) {
        slot.rHandBone.getWorldPosition(_rHandWorld);
        slot.lHandBone.getWorldPosition(_lHandWorld);
        _rHandLocal.copy(_rHandWorld);
        _lHandLocal.copy(_lHandWorld);
        slot.slotGroup.worldToLocal(_rHandLocal);
        slot.slotGroup.worldToLocal(_lHandLocal);

        _handDir.subVectors(_lHandLocal, _rHandLocal);
        if (_handDir.lengthSq() > 0.002) {
          _handDir.normalize();
          slot.weaponProp.position.copy(_rHandLocal).addScaledVector(_handDir, 0.14);
          slot.weaponProp.position.y += 0.025;

          _lookTargetWorld
            .copy(_lHandWorld)
            .addScaledVector(_lHandWorld.clone().sub(_rHandWorld), 2.0);
          slot.weaponProp.lookAt(_lookTargetWorld);
          continue;
        }
      }

      slot.weaponProp.position.set(-0.08, slot.isCrouched ? 0.78 : 1.26, 0.18);
      slot.weaponProp.rotation.set(0.02, 0.04, 0);
    }
  }

  public startShowcase(
    squadStats: SquadOperatorStats[],
    weaponRigRoot: THREE.Object3D
  ): void {
    this.active = true;
    this.elapsed = 0;
    this.avatarsPopulated = false;
    this.stageRoot.visible = true;
    weaponRigRoot.visible = false;

    const sorted = [...squadStats].sort((a, b) => b.score - a.score || b.kills - a.kills);
    this.populateAvatarsIfNeeded(sorted);

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  public update(
    dt: number,
    squadStats: SquadOperatorStats[],
    yawObject: THREE.Object3D,
    pitchObject: THREE.Object3D,
    camera: THREE.PerspectiveCamera,
    weaponRigRoot: THREE.Object3D
  ): void {
    if (!this.active) return;

    this.elapsed += dt;
    weaponRigRoot.visible = false;

    if (!this.avatarsPopulated) {
      const sorted = [...squadStats].sort((a, b) => b.score - a.kills);
      this.populateAvatarsIfNeeded(sorted);
    }

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (slot.mixer) {
        slot.mixer.update(dt);
      }
    }
    this.stageRoot.updateMatrixWorld(true);
    this.syncSlotWeapons();

    // Movimento cinematográfico suave da câmera diante dos 5 personagens em pose
    const basePos = this.stageRoot.position;
    const swayX = Math.sin(this.elapsed * 0.42) * 0.42;
    const zoomZ = 3.95 - Math.min(0.35, this.elapsed * 0.08);
    const camY = basePos.y + 1.36 + Math.sin(this.elapsed * 0.65) * 0.04;

    yawObject.position.set(basePos.x + swayX, camY, basePos.z + zoomZ);
    _camTarget.set(basePos.x + swayX * 0.25, basePos.y + 1.12, basePos.z - 0.1);

    const dx = _camTarget.x - yawObject.position.x;
    const dy = _camTarget.y - yawObject.position.y;
    const dz = _camTarget.z - yawObject.position.z;
    const horizDist = Math.hypot(dx, dz) || 0.001;

    yawObject.rotation.y = Math.atan2(-dx, -dz);
    pitchObject.rotation.x = Math.atan2(dy, horizDist);
    camera.rotation.z = 0;
    if (Math.abs(camera.fov - 54) > 0.5) {
      camera.fov = THREE.MathUtils.damp(camera.fov, 54, 8, dt);
      camera.updateProjectionMatrix();
    }
  }

  public isActive(): boolean {
    return this.active;
  }

  public stop(camera: THREE.PerspectiveCamera, weaponRigRoot: THREE.Object3D): void {
    if (!this.active && !this.stageRoot.visible) return;
    this.active = false;
    this.stageRoot.visible = false;
    camera.fov = 72;
    camera.updateProjectionMatrix();
    camera.rotation.z = 0;
    weaponRigRoot.visible = true;
  }
}
