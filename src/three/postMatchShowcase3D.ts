import * as THREE from 'three';
import { WarfaceClassId } from '../components/WarfaceClassIcons';
import { getPlayerInventoryState } from '../progression/loadoutSystem';
import { SquadOperatorStats, WeaponId } from '../types/game';
import { BotAnimState } from './botCharacterClips';
import {
  CharacterAvatarKind,
  cloneVanguardCharacterAvatar,
  preloadProRifleBotCharacter,
  resolveCharacterAvatarKind,
} from './botCharacterSystem';
import {
  alignWeaponPropToMixamoHands,
  createBotThirdPersonWeaponMesh,
} from './botWeaponProps';

interface PodiumOperatorSlot {
  slotGroup: THREE.Group;
  modelRoot: THREE.Object3D | null;
  mixer: THREE.AnimationMixer | null;
  rHandBone: THREE.Object3D | null;
  lHandBone: THREE.Object3D | null;
  weaponProp: THREE.Group | null;
  weaponId: WeaponId;
  poseState: BotAnimState;
  avatarKind?: CharacterAvatarKind;
}

// Coordenadas da formação Winner's Circle (alinhadas aos 5 cards inferiores da esquerda para a direita)
// Índices em PODIUM_SLOTS correspondem a sortedSquad[0..4]:
// [0]=#1 MVP (Centro), [1]=#2 (Esq Interna), [2]=#3 (Dir Interna), [3]=#4 (Flanco Esq), [4]=#5 (Flanco Dir)
const PODIUM_SLOTS: Array<{
  x: number;
  y: number;
  z: number;
  yaw: number;
  pose: BotAnimState;
}> = [
  { x: 0.0, y: 0.22, z: 0.36, yaw: 0.0, pose: 'RIFLE_IDLE' },     // #1 MVP (Centro em destaque)
  { x: -1.04, y: 0.18, z: 0.06, yaw: 0.14, pose: 'RIFLE_AIM' },   // #2 Esquerda Interna
  { x: 1.04, y: 0.18, z: 0.06, yaw: -0.14, pose: 'RIFLE_AIM' },   // #3 Direita Interna
  { x: -2.08, y: 0.15, z: -0.22, yaw: 0.24, pose: 'RIFLE_IDLE' }, // #4 Flanco Esquerdo
  { x: 2.08, y: 0.15, z: -0.22, yaw: -0.24, pose: 'RIFLE_AIM' },  // #5 Flanco Direito
];

const _camTarget = new THREE.Vector3();

/**
 * Palco 3D "Winner's Circle" para o Fim da Partida:
 * Enquadramento calibrado para posicionar os 5 soldados no centro da tela sobre
 * a plataforma tática chanfrada, deixando o topo livre para o título "WINNER'S CIRCLE"
 * e a base alinhada aos 5 cards de estatísticas dos operadores.
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
    this.stageRoot.position.set(0, 52, 0);
    this.stageRoot.visible = false;
    this.scene.add(this.stageRoot);

    this.buildTacticalPodiumStage();
    void preloadProRifleBotCharacter();
  }

  private createSunsetBackdropTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, '#111824');
    grad.addColorStop(0.38, '#2d3748');
    grad.addColorStop(0.68, '#7c5836');
    grad.addColorStop(0.84, '#d99b52');
    grad.addColorStop(1.0, '#2a241e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Brilho solar no horizonte central (estilo pôr do sol militar da referência)
    const sunGrad = ctx.createRadialGradient(240, 188, 6, 240, 188, 120);
    sunGrad.addColorStop(0.0, 'rgba(255, 244, 214, 0.95)');
    sunGrad.addColorStop(0.35, 'rgba(245, 158, 11, 0.45)');
    sunGrad.addColorStop(1.0, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, 512, 256);

    // Silhueta de montanhas no horizonte
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.moveTo(0, 256);
    ctx.lineTo(0, 198);
    ctx.lineTo(85, 176);
    ctx.lineTo(175, 194);
    ctx.lineTo(290, 182);
    ctx.lineTo(395, 165);
    ctx.lineTo(465, 184);
    ctx.lineTo(512, 172);
    ctx.lineTo(512, 256);
    ctx.closePath();
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private buildTacticalPodiumStage(): void {
    const stonePlatformMat = new THREE.MeshStandardMaterial({
      color: 0x3b3834,
      roughness: 0.72,
      metalness: 0.22,
    });
    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.55,
      metalness: 0.48,
    });
    const goldEmblemMat = new THREE.MeshStandardMaterial({
      color: 0xd99b26,
      roughness: 0.32,
      metalness: 0.82,
    });

    // Chão de deserto/asfalto escuro ao redor do palco
    const desertGround = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 18),
      new THREE.MeshStandardMaterial({ color: 0x26211c, roughness: 0.92 })
    );
    desertGround.rotation.x = -Math.PI / 2;
    desertGround.position.y = -0.18;
    this.stageRoot.add(desertGround);

    // Painel panorâmico de céu de pôr-do-sol cinematográfico ao fundo
    const skyBackdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 10.5),
      new THREE.MeshBasicMaterial({ map: this.createSunsetBackdropTexture() })
    );
    skyBackdrop.position.set(0, 3.85, -4.6);
    this.stageRoot.add(skyBackdrop);

    // Plataforma principal de pedra/concreto militar (igual ao palco da imagem de referência)
    const podiumBase = new THREE.Mesh(
      new THREE.BoxGeometry(5.65, 0.34, 2.65),
      stonePlatformMat
    );
    podiumBase.position.set(0, -0.02, 0.05);
    podiumBase.receiveShadow = true;
    this.stageRoot.add(podiumBase);

    const podiumBorder = new THREE.Mesh(
      new THREE.BoxGeometry(5.82, 0.14, 2.82),
      darkTrimMat
    );
    podiumBorder.position.set(0, -0.11, 0.05);
    this.stageRoot.add(podiumBorder);

    // 4 Blocos/Pilares baixos nos cantos da plataforma (idênticos aos cantos do palco da imagem)
    const cornerOffsets: Array<[number, number]> = [
      [-2.68, 1.22],
      [2.68, 1.22],
      [-2.68, -1.12],
      [2.68, -1.12],
    ];
    for (const [cx, cz] of cornerOffsets) {
      const bollard = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.48, 0.36),
        darkTrimMat
      );
      bollard.position.set(cx, 0.08, cz);
      this.stageRoot.add(bollard);
    }

    // Brasão octogonal dourado cravado no centro do piso da plataforma
    const centerCrest = new THREE.Mesh(
      new THREE.RingGeometry(0.68, 0.88, 6),
      goldEmblemMat
    );
    centerCrest.rotation.x = -Math.PI / 2;
    centerCrest.position.set(0, 0.155, 0.25);
    this.stageRoot.add(centerCrest);

    // Slots individuais para cada um dos 5 operadores
    for (let i = 0; i < PODIUM_SLOTS.length; i++) {
      const cfg = PODIUM_SLOTS[i];
      const slotGroup = new THREE.Group();
      slotGroup.position.set(cfg.x, cfg.y, cfg.z);
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
      });
    }

    // Iluminação cinematográfica Golden-Hour de 3 pontos
    const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.75);
    keyLight.position.set(2.2, 5.2, 4.8);
    this.stageRoot.add(keyLight);

    const warmSunsetRim = new THREE.PointLight(0xf59e0b, 7.5, 16);
    warmSunsetRim.position.set(-0.6, 2.8, -2.5);
    this.stageRoot.add(warmSunsetRim);

    const frontFillLight = new THREE.PointLight(0xe2e8f0, 3.2, 10);
    frontFillLight.position.set(0, 2.1, 3.2);
    this.stageRoot.add(frontFillLight);
  }

  private resolveClassForSquadOp(op?: SquadOperatorStats): WarfaceClassId | undefined {
    if (!op) return undefined;
    if (op.isPlayer) return getPlayerInventoryState().selectedClass;
    if (op.callsign === 'RECON-02') return 'FRANCO_ATIRADOR';
    if (op.callsign === 'LIFELINE-04') return 'MEDICO';
    if (op.callsign === 'WARDEN-05') return 'ENGENHEIRO';
    if (op.callsign === 'STRIKER-03') return 'FUZILEIRO';
    return undefined;
  }

  private populateAvatarsIfNeeded(sortedSquad: SquadOperatorStats[]): void {
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const op = sortedSquad[i];
      const desiredWep: WeaponId = op?.weaponId || 'M4_CARBINE';
      const opClass = this.resolveClassForSquadOp(op);
      const wantKind = resolveCharacterAvatarKind(desiredWep, opClass, true);

      if (slot.modelRoot && slot.avatarKind !== wantKind) {
        slot.mixer?.stopAllAction();
        slot.slotGroup.remove(slot.modelRoot);
        slot.modelRoot = null;
        slot.mixer = null;
        slot.rHandBone = null;
        slot.lHandBone = null;
      }

      if (!slot.modelRoot) {
        const cloned = cloneVanguardCharacterAvatar(this.isSoftwareGl, desiredWep, opClass);
        if (!cloned) {
          void preloadProRifleBotCharacter();
          return;
        }
        slot.modelRoot = cloned.modelRoot;
        slot.avatarKind = cloned.avatarKind;
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
          action.time = i * 0.55;
          action.setEffectiveTimeScale(0.75);
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
      alignWeaponPropToMixamoHands(
        slot.weaponProp,
        slot.slotGroup,
        slot.rHandBone,
        slot.lHandBone
      );
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
      const sorted = [...squadStats].sort((a, b) => b.score - a.score || b.kills - a.kills);
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

    // Enquadramento calibrado igual à referência:
    // Olha ligeiramente mais alto (y + 1.38) a uma distância de 4.65m para posicionar
    // os 5 personagens entre o título "WINNER'S CIRCLE" no topo e os 5 cards na base!
    const basePos = this.stageRoot.position;
    const swayX = Math.sin(this.elapsed * 0.35) * 0.22;
    const zoomZ = 4.68 - Math.min(0.22, this.elapsed * 0.05);
    const camY = basePos.y + 1.32 + Math.sin(this.elapsed * 0.5) * 0.025;

    yawObject.position.set(basePos.x + swayX, camY, basePos.z + zoomZ);
    _camTarget.set(basePos.x + swayX * 0.2, basePos.y + 1.38, basePos.z);

    const dx = _camTarget.x - yawObject.position.x;
    const dy = _camTarget.y - yawObject.position.y;
    const dz = _camTarget.z - yawObject.position.z;
    const horizDist = Math.hypot(dx, dz) || 0.001;

    yawObject.rotation.y = Math.atan2(-dx, -dz);
    pitchObject.rotation.x = Math.atan2(dy, horizDist);
    camera.rotation.z = 0;
    if (Math.abs(camera.fov - 50) > 0.5) {
      camera.fov = THREE.MathUtils.damp(camera.fov, 50, 8, dt);
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
