import * as THREE from 'three';
import { GLTFLoader, GLTFParser } from 'three/addons/loaders/GLTFLoader.js';

const M4_FPS_PACK_LOCAL_URL = '/models/m4_fps_pack.glb';
const M4_FPS_PACK_GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/d7b8cb9d6d09ac5bfaa3aa11fd0cd8057dd3c862/m4_fps_animations_pack.glb';

class SpecularGlossinessHandPlugin {
  public name = 'KHR_materials_pbrSpecularGlossiness';
  private parser: GLTFParser;

  constructor(parser: GLTFParser) {
    this.parser = parser;
  }

  public getMaterialType(): typeof THREE.MeshStandardMaterial {
    return THREE.MeshStandardMaterial;
  }

  public extendParams(
    materialParams: Record<string, unknown>,
    materialDef: {
      extensions?: Record<
        string,
        {
          diffuseFactor?: number[];
          diffuseTexture?: { index: number };
          glossinessFactor?: number;
        }
      >;
    }
  ): Promise<unknown[]> {
    const ext = materialDef.extensions?.[this.name];
    if (!ext) return Promise.resolve([]);
    const pending: Promise<unknown>[] = [];

    if (Array.isArray(ext.diffuseFactor)) {
      const [r, g, b, a] = ext.diffuseFactor;
      materialParams.color = new THREE.Color(r, g, b);
      materialParams.opacity = a ?? 1.0;
    }
    if (ext.diffuseTexture !== undefined) {
      pending.push(
        this.parser.assignTexture(
          materialParams,
          'map',
          ext.diffuseTexture,
          THREE.SRGBColorSpace
        )
      );
    }
    materialParams.metalness = 0.08;
    materialParams.roughness =
      ext.glossinessFactor !== undefined
        ? Math.max(0.25, 1.0 - ext.glossinessFactor * 0.65)
        : 0.65;
    return Promise.all(pending);
  }
}

/**
 * Slices `granada_frag.glb` (`granade_read_the_description.glb`) so ONLY the
 * single upright center grenade (vertices 0..1872, indices 0..6425) is rendered,
 * removing the 2 extra tilted showcase grenades baked into the same mesh.
 */
export function isolateSingleFragGrenadeInGlb(rawScene: THREE.Group): void {
  rawScene.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const geo = mesh.geometry;
    if (!geo) return;

    const posAttr = geo.getAttribute('position');
    const indexAttr = geo.getIndex();
    if (!posAttr || !indexAttr) return;

    if (posAttr.count >= 5000 && indexAttr.count >= 18000) {
      const singleVertCount = 1873;
      const singleIndexCount = 6426;

      const newGeo = new THREE.BufferGeometry();
      for (const name of Object.keys(geo.attributes)) {
        const attr = geo.getAttribute(name) as THREE.BufferAttribute;
        const itemSize = attr.itemSize;
        const slicedArray = attr.array.slice(0, singleVertCount * itemSize);
        newGeo.setAttribute(
          name,
          new THREE.BufferAttribute(slicedArray, itemSize, attr.normalized)
        );
      }

      const slicedIndices = indexAttr.array.slice(0, singleIndexCount);
      newGeo.setIndex(new THREE.BufferAttribute(slicedIndices, 1));
      newGeo.computeBoundingBox();
      newGeo.computeBoundingSphere();
      mesh.geometry = newGeo;
    }
  });
}

const _qIdentity = new THREE.Quaternion(0, 0, 0, 1);
const _qCurl1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.88, 0, 0));
const _qCurl2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.12, 0, 0));
const _qCurl3 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.75, 0, 0));
const _qThumbCurl = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(0.32, 0.42, -0.25)
);
const _qOffset = new THREE.Quaternion();
const _eulerTemp = new THREE.Euler();

/**
 * First-Person Rigged Hands from the M4 Weapon Pack (`m4_fps_pack.glb`)
 * adapted to grip the 3D Grenade cleanly in the Right Hand palm (with the Left Arm
 * tucked out of view until pin-pull so the two arms never cross), pull the safety pin
 * with the Left Hand from the left side, wind back the right arm, and open the fingers on release.
 */
export class GrenadeFirstPersonHandRig {
  public readonly root = new THREE.Group();
  public readonly grenadeSocket = new THREE.Group();

  private m4HandsMount = new THREE.Group();
  private fallbackHandGroup = new THREE.Group();
  private m4Loaded = false;

  private bones = new Map<string, THREE.Bone>();
  private restQuats = new Map<string, THREE.Quaternion>();
  private restPositions = new Map<string, THREE.Vector3>();

  constructor() {
    this.root.add(this.m4HandsMount);
    this.root.add(this.fallbackHandGroup);

    this.grenadeSocket.position.set(0.085, -0.075, -0.255);
    this.fallbackHandGroup.add(this.grenadeSocket);

    this.loadRiggedM4Hands();
  }

  private loadRiggedM4Hands(): void {
    const loader = new GLTFLoader();
    loader.register((parser) => new SpecularGlossinessHandPlugin(parser));

    const onLoaded = (gltf: { scene: THREE.Group }) => {
      const model = gltf.scene;
      const gunNodeNames = new Set([
        'Main_j_049',
        'Mag1_j_050',
        'Mag2_j_051',
        'Bolt_j_052',
        'BoltCatch_j_053',
        'Trigger_j_054',
        'Main',
      ]);

      model.traverse((child) => {
        if (gunNodeNames.has(child.name)) {
          child.visible = false;
        }
        if ((child as THREE.Bone).isBone) {
          const bone = child as THREE.Bone;
          this.bones.set(bone.name, bone);
          this.restQuats.set(bone.name, bone.quaternion.clone());
          this.restPositions.set(bone.name, bone.position.clone());
        }
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.frustumCulled = false;
          mesh.castShadow = false;
          mesh.receiveShadow = true;
          const matName = (mesh.material as THREE.Material)?.name || '';
          if (
            matName.includes('M4_D') ||
            matName.includes('Bullet') ||
            mesh.name.includes('M4_D')
          ) {
            mesh.visible = false;
          }
        }
      });

      this.m4HandsMount.add(model);

      // Attach grenadeSocket directly into the M4 skeleton's `RightHand_05` palm bone (cm space)
      const rightHandBone = this.bones.get('RightHand_05');
      if (rightHandBone) {
        rightHandBone.add(this.grenadeSocket);
        this.grenadeSocket.position.set(1.2, 11.2, 3.3);
        this.grenadeSocket.scale.setScalar(100);
        this.grenadeSocket.rotation.set(0, 0, -Math.PI / 2);
      }

      this.fallbackHandGroup.visible = false;
      this.m4Loaded = true;
      this.setRightHandGripCurl(1.0);
    };

    loader.load(M4_FPS_PACK_LOCAL_URL, onLoaded, undefined, () => {
      loader.load(M4_FPS_PACK_GITHUB_RAW_URL, onLoaded, undefined, () => {});
    });
  }

  private setBoneEulerOffset(
    boneName: string,
    rx: number,
    ry: number,
    rz: number
  ): void {
    const bone = this.bones.get(boneName);
    const rest = this.restQuats.get(boneName);
    if (!bone || !rest) return;
    _eulerTemp.set(rx, ry, rz, 'XYZ');
    _qOffset.setFromEuler(_eulerTemp);
    bone.quaternion.copy(rest).multiply(_qOffset);
  }

  private hideLeftArmBelowViewport(): void {
    const leftArm = this.bones.get('LeftArm_026');
    if (leftArm) {
      leftArm.position.set(42, -55, -35);
      leftArm.scale.setScalar(0.0001);
    }
  }

  public setRightHandGripCurl(gripAlpha: number): void {
    if (!this.m4Loaded) return;
    const c = THREE.MathUtils.clamp(gripAlpha, 0, 1.15);

    const idx1 = this.bones.get('RightHandIndex1_010');
    const idx2 = this.bones.get('RightHandIndex2_011');
    const idx3 = this.bones.get('RightHandIndex3_012');
    const idx1Rest = this.restQuats.get('RightHandIndex1_010');
    if (idx1 && idx1Rest) {
      idx1.quaternion.copy(_qIdentity).slerp(_qCurl1, c);
      idx1.quaternion.slerp(idx1Rest, 0.25);
    }
    if (idx2) idx2.quaternion.copy(_qIdentity).slerp(_qCurl2, c);
    if (idx3) idx3.quaternion.copy(_qIdentity).slerp(_qCurl3, c);

    const gripFingerBones = [
      'RightHandMiddle1_014',
      'RightHandMiddle2_015',
      'RightHandMiddle3_016',
      'RightHandRing1_018',
      'RightHandRing2_019',
      'RightHandRing3_020',
      'RightHandPinky1_022',
      'RightHandPinky2_023',
      'RightHandPinky3_024',
    ];
    for (const name of gripFingerBones) {
      const bone = this.bones.get(name);
      const rest = this.restQuats.get(name);
      if (bone && rest) {
        bone.quaternion.copy(_qIdentity).slerp(rest, Math.min(1, c));
      }
    }

    const th1 = this.bones.get('RightHandThumb1_06');
    const th2 = this.bones.get('RightHandThumb2_07');
    const th1Rest = this.restQuats.get('RightHandThumb1_06');
    const th2Rest = this.restQuats.get('RightHandThumb2_07');
    if (th1 && th1Rest) {
      th1.quaternion.copy(_qIdentity).slerp(th1Rest, Math.min(1, c));
    }
    if (th2 && th2Rest) {
      th2.quaternion.copy(th2Rest).slerp(_qThumbCurl, Math.max(0, c - 0.5));
    }
  }

  /**
   * Idle/Aiming pose: ONLY the Right Hand holding the grenade is visible in the bottom-right view.
   * The M4 Left Arm (which in the M4 rifle bind pose stretches across the screen to hold an invisible barrel)
   * is tucked below the viewport so the arms never look crossed.
   */
  public updateHoldPose(idleTime: number, walkBobAmp: number): void {
    const breathX = Math.sin(idleTime * 1.8) * 0.0035;
    const breathY = Math.cos(idleTime * 3.6) * 0.003;
    const bobX = Math.cos(idleTime * 8.5) * 0.008 * walkBobAmp;
    const bobY = Math.abs(Math.sin(idleTime * 8.5)) * -0.009 * walkBobAmp;

    this.grenadeSocket.visible = true;
    this.setRightHandGripCurl(1.0);

    if (!this.m4Loaded) {
      this.grenadeSocket.position.set(
        0.085 + breathX + bobX,
        -0.075 + breathY + bobY,
        -0.255
      );
      return;
    }

    // Place M4 Right Hand & grenade at [X = +0.080m, Y = -0.088m, Z = -0.241m]
    this.m4HandsMount.position.set(
      0.085 + breathX + bobX,
      -1.425 + breathY + bobY,
      -0.315
    );
    this.m4HandsMount.rotation.set(
      0.08 + breathY * 1.6,
      Math.PI - 0.28 + breathX * 1.8,
      -0.05
    );

    this.setBoneEulerOffset('RightArm_03', 0, 0, 0);
    this.setBoneEulerOffset('RightForeArm_04', 0, 0, 0);
    this.setBoneEulerOffset('RightHand_05', 0.18, -0.25, 0.15);

    // Keep Left Arm completely out of view while holding/aiming so arms never cross
    this.hideLeftArmBelowViewport();
  }

  /**
   * 3-Stage Pin-Pull, Wind-Up, and Forward Throw Animation:
   * - Stage 1 (0.00s..0.30s): Left Hand reaches from the left side to top of grenade, hooks pin ring & pulls it left
   * - Stage 2 (0.30s..0.46s): Left Hand drops away; Right Arm winds back and upward
   * - Stage 3 (0.46s..0.72s): Right Arm whips forward and all 5 fingers open wide on release
   */
  public updateThrowSequence(
    t: number,
    pinMesh: THREE.Object3D | null,
    leverMesh: THREE.Object3D | null
  ): { shouldReleaseNow: boolean; finished: boolean } {
    if (t < 0.30) {
      const p = t / 0.30;
      const reachAlpha = Math.min(1, p / 0.42);
      const pullAlpha = p > 0.42 ? (p - 0.42) / 0.58 : 0;
      const easePull = 1 - Math.pow(1 - pullAlpha, 3);

      this.grenadeSocket.visible = true;
      this.setRightHandGripCurl(1.05);

      if (this.m4Loaded) {
        this.m4HandsMount.position.set(
          THREE.MathUtils.lerp(0.085, 0.045, reachAlpha),
          THREE.MathUtils.lerp(-1.425, -1.405, reachAlpha),
          THREE.MathUtils.lerp(-0.315, -0.325, reachAlpha)
        );
        this.m4HandsMount.rotation.set(
          0.1,
          Math.PI - 0.22,
          -0.04 + easePull * 0.1
        );
        this.setBoneEulerOffset(
          'RightHand_05',
          0.2,
          -0.2,
          0.16 + easePull * 0.12
        );

        // Bring Left Hand cleanly from bottom-left (never crossing in front of Right Hand) to pull pin left
        const leftArm = this.bones.get('LeftArm_026');
        const leftArmRestPos = this.restPositions.get('LeftArm_026');
        if (leftArm && leftArmRestPos) {
          leftArm.scale.setScalar(1.0);
          leftArm.position.set(
            THREE.MathUtils.lerp(36, 16, reachAlpha) + easePull * 14,
            THREE.MathUtils.lerp(-22, -4, reachAlpha) - easePull * 5,
            THREE.MathUtils.lerp(-8, 12, reachAlpha)
          );
        }
        this.setBoneEulerOffset(
          'LeftArm_026',
          0.15,
          -0.25 + easePull * 0.32,
          -0.2
        );
        this.setBoneEulerOffset(
          'LeftForeArm_027',
          0.22,
          -0.35 + easePull * 0.28,
          0.1
        );
        // Rotate LeftHand_028 palm-down/right so thumb & index pinch the safety pin ring from the left
        this.setBoneEulerOffset(
          'LeftHand_028',
          1.45,
          -0.35 - easePull * 0.25,
          -0.65
        );
      }

      if (pinMesh && pullAlpha > 0) {
        pinMesh.position.x = -0.022 - easePull * 0.11;
        pinMesh.position.y = 0.048 + easePull * 0.024;
      }

      return { shouldReleaseNow: false, finished: false };
    }

    if (t < 0.46) {
      const p = (t - 0.30) / 0.16;
      const ease = 1 - Math.pow(1 - p, 2);

      if (pinMesh) {
        pinMesh.visible = false;
      }

      if (this.m4Loaded) {
        this.hideLeftArmBelowViewport();

        // Cock Right Arm back and up to the right before throwing
        this.m4HandsMount.position.set(
          THREE.MathUtils.lerp(0.045, 0.145, ease),
          THREE.MathUtils.lerp(-1.405, -1.355, ease),
          THREE.MathUtils.lerp(-0.325, -0.255, ease)
        );
        this.m4HandsMount.rotation.set(
          THREE.MathUtils.lerp(0.1, 0.42, ease),
          THREE.MathUtils.lerp(Math.PI - 0.22, Math.PI - 0.45, ease),
          THREE.MathUtils.lerp(0.06, -0.22, ease)
        );
        this.setBoneEulerOffset(
          'RightHand_05',
          0.2 + ease * 0.35,
          -0.2 - ease * 0.12,
          0.24
        );
      }

      this.setRightHandGripCurl(1.0);
      return { shouldReleaseNow: false, finished: false };
    }

    if (t < 0.72) {
      const p = (t - 0.46) / 0.26;
      const ease = 1 - Math.pow(1 - p, 3);

      const openCurl = Math.max(0.05, 1.0 - Math.min(1, p * 2.8) * 0.95);
      this.setRightHandGripCurl(openCurl);

      if (leverMesh) {
        leverMesh.rotation.z = -p * 1.6;
      }

      if (this.m4Loaded) {
        this.hideLeftArmBelowViewport();

        this.m4HandsMount.position.set(
          THREE.MathUtils.lerp(0.145, -0.025, ease),
          THREE.MathUtils.lerp(-1.355, -1.495, ease),
          THREE.MathUtils.lerp(-0.255, -0.385, Math.sin(p * Math.PI * 0.78))
        );
        this.m4HandsMount.rotation.set(
          THREE.MathUtils.lerp(0.42, -0.58, ease),
          THREE.MathUtils.lerp(Math.PI - 0.45, Math.PI + 0.12, ease),
          THREE.MathUtils.lerp(-0.22, 0.18, ease)
        );
        this.setBoneEulerOffset(
          'RightHand_05',
          THREE.MathUtils.lerp(0.55, -0.48, ease),
          -0.25,
          0.15
        );
      }

      const shouldReleaseNow = p >= 0.12;
      if (shouldReleaseNow) {
        this.grenadeSocket.visible = false;
      }

      return { shouldReleaseNow, finished: false };
    }

    return { shouldReleaseNow: true, finished: true };
  }
}
