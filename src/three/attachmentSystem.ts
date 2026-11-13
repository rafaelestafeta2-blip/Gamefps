import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { WeaponId } from '../types/game';

export type MuzzleType =
  | 'NONE'
  | 'SL01_LONG'
  | 'SC01_SHORT'
  | 'FH01_FLASH_HIDER'
  | 'MB01_BRAKE'
  | 'MC01_COMPENSATOR';

export type CharmType =
  | 'NONE'
  | 'HONEY_CUB'
  | 'MICRO_TERMINAL'
  | 'STARDROP_TEAL';

export interface WeaponMuzzleTransform {
  position: THREE.Vector3;
  scale: number;
  rotation: THREE.Euler;
}

export interface WeaponCharmTransform {
  position: THREE.Vector3;
  scale: number;
  rotation: THREE.Euler;
}

/**
 * Exact muzzle attachment offsets calibrated per weapon so devices
 * snap precisely to the barrel threads/crown without clipping.
 */
export const WEAPON_MUZZLE_OFFSETS: Record<WeaponId, WeaponMuzzleTransform> = {
  P50_PISTOL: {
    position: new THREE.Vector3(0, 0.021, -0.225),
    scale: 0.95,
    rotation: new THREE.Euler(0, -Math.PI / 2, 0),
  },
  SMG_45: {
    position: new THREE.Vector3(0, 0.01, -0.355),
    scale: 1.0,
    rotation: new THREE.Euler(0, -Math.PI / 2, 0),
  },
  SMG_MP5: {
    position: new THREE.Vector3(0, 0.014, -0.385),
    scale: 0.96,
    rotation: new THREE.Euler(0, -Math.PI / 2, 0),
  },
  SHOTGUN_12: {
    position: new THREE.Vector3(0, 0.012, -0.56),
    scale: 1.15,
    rotation: new THREE.Euler(0, -Math.PI / 2, 0),
  },
  SHOTGUN_SPAS: {
    position: new THREE.Vector3(0, 0.012, -0.54),
    scale: 1.18,
    rotation: new THREE.Euler(0, -Math.PI / 2, 0),
  },
  M4_CARBINE: {
    position: new THREE.Vector3(-0.015, -0.044, -0.704),
    scale: 1.08,
    rotation: new THREE.Euler(0, -Math.PI / 2, 0),
  },
  CARBINE_AR: {
    position: new THREE.Vector3(0, -0.002, -0.525),
    scale: 1.05,
    rotation: new THREE.Euler(0, -Math.PI / 2, 0),
  },
  AK47_RIFLE: {
    position: new THREE.Vector3(-0.012, 0.038, -0.365),
    scale: 1.08,
    rotation: new THREE.Euler(0, -Math.PI / 2, 0),
  },
  AK12_RIFLE: {
    position: new THREE.Vector3(0, 0.01, -0.464),
    scale: 1.06,
    rotation: new THREE.Euler(0, -Math.PI / 2, 0),
  },
  L49_LMG: {
    position: new THREE.Vector3(0, 0.009, -0.625),
    scale: 1.15,
    rotation: new THREE.Euler(0, -Math.PI / 2, 0),
  },
  SNIPER_BOLT: {
    position: new THREE.Vector3(0, 0.01, -0.745),
    scale: 1.12,
    rotation: new THREE.Euler(0, -Math.PI / 2, 0),
  },
  SNIPER_TACTICAL: {
    position: new THREE.Vector3(0, 0.01, -0.745),
    scale: 1.12,
    rotation: new THREE.Euler(0, -Math.PI / 2, 0),
  },
  KNIFE_TACTICAL: {
    position: new THREE.Vector3(0, 0, 0),
    scale: 1.0,
    rotation: new THREE.Euler(0, 0, 0),
  },
};

/**
 * Weapon charm attachment positions (Left side picatinny rail / sling ring)
 */
export const WEAPON_CHARM_OFFSETS: Record<WeaponId, WeaponCharmTransform> = {
  P50_PISTOL: {
    position: new THREE.Vector3(-0.026, -0.032, 0.02),
    scale: 1.4,
    rotation: new THREE.Euler(0, 0, 0),
  },
  SMG_45: {
    position: new THREE.Vector3(-0.028, 0.018, -0.08),
    scale: 1.6,
    rotation: new THREE.Euler(0, 0, 0),
  },
  SMG_MP5: {
    position: new THREE.Vector3(-0.026, 0.012, -0.04),
    scale: 1.55,
    rotation: new THREE.Euler(0, 0, 0),
  },
  SHOTGUN_12: {
    position: new THREE.Vector3(-0.028, 0.004, 0.02),
    scale: 1.65,
    rotation: new THREE.Euler(0, 0, 0),
  },
  SHOTGUN_SPAS: {
    position: new THREE.Vector3(-0.03, 0.006, 0.02),
    scale: 1.65,
    rotation: new THREE.Euler(0, 0, 0),
  },
  M4_CARBINE: {
    position: new THREE.Vector3(-0.046, -0.03, -0.02),
    scale: 1.85,
    rotation: new THREE.Euler(0, 0, 0),
  },
  CARBINE_AR: {
    position: new THREE.Vector3(-0.032, 0.012, -0.06),
    scale: 1.8,
    rotation: new THREE.Euler(0, 0, 0),
  },
  AK47_RIFLE: {
    position: new THREE.Vector3(-0.038, 0.034, 0.04),
    scale: 1.8,
    rotation: new THREE.Euler(0, 0, 0),
  },
  AK12_RIFLE: {
    position: new THREE.Vector3(-0.034, 0.022, -0.02),
    scale: 1.8,
    rotation: new THREE.Euler(0, 0, 0),
  },
  L49_LMG: {
    position: new THREE.Vector3(-0.038, 0.012, -0.12),
    scale: 1.8,
    rotation: new THREE.Euler(0, 0, 0),
  },
  SNIPER_BOLT: {
    position: new THREE.Vector3(-0.032, 0.018, -0.1),
    scale: 1.8,
    rotation: new THREE.Euler(0, 0, 0),
  },
  SNIPER_TACTICAL: {
    position: new THREE.Vector3(-0.032, 0.018, -0.1),
    scale: 1.8,
    rotation: new THREE.Euler(0, 0, 0),
  },
  KNIFE_TACTICAL: {
    position: new THREE.Vector3(-0.018, 0.01, 0.02),
    scale: 1.2,
    rotation: new THREE.Euler(0, 0, 0),
  },
};

export class WeaponAttachmentSystem {
  public muzzleAnchor: THREE.Group;
  public charmAnchor: THREE.Group;

  private muzzleModels: Map<MuzzleType, THREE.Group> = new Map();
  private charmModels: Map<CharmType, THREE.Group> = new Map();

  private currentMuzzle: MuzzleType = 'NONE';
  private currentCharm: CharmType = 'NONE';
  private currentWeapon: WeaponId = 'M4_CARBINE';

  constructor(weaponMotionAnchor: THREE.Group) {
    this.muzzleAnchor = new THREE.Group();
    this.charmAnchor = new THREE.Group();
    weaponMotionAnchor.add(this.muzzleAnchor);
    weaponMotionAnchor.add(this.charmAnchor);

    this.loadModels();
  }

  private loadModels(): void {
    const gltfLoader = new GLTFLoader();

    const muzzleDefs: Array<{ type: MuzzleType; url: string }> = [
      { type: 'SL01_LONG', url: '/models/accessories/SL01_Slim_Long_Suppressor.glb' },
      { type: 'SC01_SHORT', url: '/models/accessories/SC01_Short_Suppressor.glb' },
      { type: 'FH01_FLASH_HIDER', url: '/models/accessories/FH01_Petal_Flash_Hider.glb' },
      { type: 'MB01_BRAKE', url: '/models/accessories/MB01_Cut_Muzzle_Brake.glb' },
      { type: 'MC01_COMPENSATOR', url: '/models/accessories/MC01_Compact_Compensator.glb' },
    ];

    muzzleDefs.forEach(({ type, url }) => {
      gltfLoader.load(url, (gltf) => {
        const root = gltf.scene;
        root.visible = false;
        this.muzzleAnchor.add(root);
        this.muzzleModels.set(type, root);
        this.syncMuzzleVisibility();
      });
    });

    const charmDefs: Array<{ type: CharmType; url: string }> = [
      { type: 'HONEY_CUB', url: '/models/accessories/Charm_Honey_Cub.glb' },
      { type: 'MICRO_TERMINAL', url: '/models/accessories/Charm_Micro_Terminal.glb' },
      { type: 'STARDROP_TEAL', url: '/models/accessories/Charm_Stardrop_Smoke_Teal.glb' },
    ];

    charmDefs.forEach(({ type, url }) => {
      gltfLoader.load(url, (gltf) => {
        const root = gltf.scene;
        root.visible = false;
        this.charmAnchor.add(root);
        this.charmModels.set(type, root);
        this.syncCharmVisibility();
      });
    });
  }

  public updateWeaponAlignment(weaponId: WeaponId): void {
    this.currentWeapon = weaponId;
    const mTrans = WEAPON_MUZZLE_OFFSETS[weaponId];
    if (mTrans) {
      this.muzzleAnchor.position.copy(mTrans.position);
      this.muzzleAnchor.rotation.copy(mTrans.rotation);
      this.muzzleAnchor.scale.setScalar(mTrans.scale);
    }

    const cTrans = WEAPON_CHARM_OFFSETS[weaponId];
    if (cTrans) {
      this.charmAnchor.position.copy(cTrans.position);
      this.charmAnchor.rotation.copy(cTrans.rotation);
      this.charmAnchor.scale.setScalar(cTrans.scale);
    }

    this.syncMuzzleVisibility();
    this.syncCharmVisibility();
  }

  public setMuzzle(type: MuzzleType): void {
    this.currentMuzzle = type;
    this.syncMuzzleVisibility();
  }

  public setCharm(type: CharmType): void {
    this.currentCharm = type;
    this.syncCharmVisibility();
  }

  public getMuzzle(): MuzzleType {
    return this.currentMuzzle;
  }

  public getCharm(): CharmType {
    return this.currentCharm;
  }

  private syncMuzzleVisibility(): void {
    const isKnife = this.currentWeapon === 'KNIFE_TACTICAL';
    this.muzzleModels.forEach((model, type) => {
      model.visible = !isKnife && type === this.currentMuzzle;
    });
  }

  private syncCharmVisibility(): void {
    this.charmModels.forEach((model, type) => {
      model.visible = type === this.currentCharm;
    });
  }
}
