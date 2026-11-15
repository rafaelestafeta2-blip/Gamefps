import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { playRealGrenadeBounce } from '../audio/characterAndBombAudio';
import { soundEngine } from '../audio/soundEngine';
import { mobileHardware } from '../mobile/nativeHardware';
import { GrenadeType } from '../types/game';
import {
  GrenadeFirstPersonHandRig,
  isolateSingleFragGrenadeInGlb,
} from './grenadeViewmodelRig';
import { ColliderBox } from './levelBuilder';

const FRAG_GLB_LOCAL_URL = '/models/granada_frag.glb';
const FRAG_GLB_GITHUB_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/cf32fb142ec4e96c6f4dfd7c2a07079868411bcc/Sound/Granada/granade_read_the_description.glb';

const M18_SMOKE_GLB_LOCAL_URL = '/models/m18_smoke_grenade.glb';
const M18_SMOKE_GLB_GITHUB_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/cf32fb142ec4e96c6f4dfd7c2a07079868411bcc/Sound/Granada/m18_smoke_grenade.glb';

const S13_SMOKE_GLB_LOCAL_URL = '/models/s13_smoke_grenade.glb';
const S13_SMOKE_GLB_GITHUB_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/cf32fb142ec4e96c6f4dfd7c2a07079868411bcc/Sound/Granada/s13_smoke_grenade.glb';

interface ActiveProjectile {
  type: GrenadeType;
  group: THREE.Group;
  vel: THREE.Vector3;
  angVel: THREE.Vector3;
  age: number;
  fuseTime: number;
  detonated: boolean;
  smokeCloudSpawned: boolean;
  removeAge: number;
  bounces: number;
}

interface ExplosionInstance {
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  fireballMesh: THREE.Mesh;
  shockwaveRing: THREE.Mesh;
  scorchDecal: THREE.Mesh;
  debris: Array<{
    mesh: THREE.Mesh;
    vel: THREE.Vector3;
  }>;
  age: number;
  maxAge: number;
  active: boolean;
}

interface SmokePuff {
  sprite: THREE.Sprite;
  mat: THREE.SpriteMaterial;
  offset: THREE.Vector3;
  driftVel: THREE.Vector3;
  baseScale: number;
  rotSpeed: number;
  delay: number;
}

interface SmokeCloudInstance {
  group: THREE.Group;
  puffs: SmokePuff[];
  center: THREE.Vector3;
  radius: number;
  age: number;
  maxAge: number;
  active: boolean;
}

const TRAJECTORY_STEPS = 34;

const _tempBox = new THREE.Box3();
const _tempSize = new THREE.Vector3();
const _tempCenter = new THREE.Vector3();
const _segDir = new THREE.Vector3();
const _toCloud = new THREE.Vector3();
const _closestPt = new THREE.Vector3();
const _simPos = new THREE.Vector3();
const _simVel = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const _camDir = new THREE.Vector3();
const _THROW_UPWARD_IMPULSE = new THREE.Vector3(0, 3.3, 0);

export class TacticalGrenadeSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private loader = new GLTFLoader();

  // Cached 3D GLB Templates (Frag & Smoke canisters only — no exhaust tube)
  private fragTemplate: THREE.Group | null = null;
  private m18SmokeTemplate: THREE.Group | null = null;
  private s13SmokeTemplate: THREE.Group | null = null;

  // First-Person Viewmodel Rig (Articulated Hands + Grenade Socket -> Pin Pull -> Throw)
  public readonly viewmodelGroup = new THREE.Group();
  private handRig: GrenadeFirstPersonHandRig;
  private vmFragVisual = new THREE.Group();
  private vmSmokeVisual = new THREE.Group();
  private vmPinMesh: THREE.Object3D | null = null;
  private vmLeverMesh: THREE.Object3D | null = null;

  // State: Held in hand vs Pulling Pin & Throwing
  private heldGrenadeType: GrenadeType | null = null;
  private holdIdleTime = 0;
  private equipCooldownTimer = 0;
  private throwSequenceActive = false;
  private throwSequenceType: GrenadeType = 'FRAG';
  private throwSequenceTimer = 0;
  private projectileLaunchedInSequence = false;

  // 3D Ballistic Aiming Trajectory Arc, Marching Beads & Landing Target Indicator
  public readonly trajectoryGroup = new THREE.Group();
  private trajectoryLine: THREE.Line;
  private trajectoryMat: THREE.LineBasicMaterial;
  private trajectoryBeads: THREE.Mesh[] = [];
  private trajectoryBeadMat: THREE.MeshBasicMaterial;
  private landingRingGroup = new THREE.Group();
  private landingOuterRingMat: THREE.MeshBasicMaterial;
  private landingInnerDiscMat: THREE.MeshBasicMaterial;
  private lastTrajectoryUpdateMs = 0;
  private lastBoundVmType: GrenadeType | null = null;

  // Active World Projectiles, Explosions & Volumetric Smoke Clouds
  private projectiles: ActiveProjectile[] = [];
  private explosions: ExplosionInstance[] = [];
  private sharedExplosionLight!: THREE.PointLight;
  private smokeClouds: SmokeCloudInstance[] = [];
  private softSmokeTexture: THREE.CanvasTexture;

  private onFragDetonate: (blastCenter: THREE.Vector3, blastRadius: number) => void;
  private onGrenadeReleasedFromHand?: (type: GrenadeType) => void;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    onFragDetonate: (blastCenter: THREE.Vector3, blastRadius: number) => void,
    onGrenadeReleasedFromHand?: (type: GrenadeType) => void
  ) {
    this.scene = scene;
    this.camera = camera;
    this.onFragDetonate = onFragDetonate;
    this.onGrenadeReleasedFromHand = onGrenadeReleasedFromHand;

    this.softSmokeTexture = this.createSoftSmokeTexture();
    this.handRig = new GrenadeFirstPersonHandRig();
    this.viewmodelGroup.add(this.handRig.root);
    this.buildFallbackViewmodelVisuals();
    this.viewmodelGroup.visible = false;
    this.camera.add(this.viewmodelGroup);

    // Build 3D Trajectory Arc, Marching Beads & Landing Target Ring
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < TRAJECTORY_STEPS; i++) {
      pts.push(new THREE.Vector3());
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    this.trajectoryMat = new THREE.LineBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.9,
    });
    this.trajectoryLine = new THREE.Line(lineGeo, this.trajectoryMat);
    this.trajectoryLine.frustumCulled = false;
    this.trajectoryGroup.add(this.trajectoryLine);

    this.trajectoryBeadMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const beadGeo = new THREE.SphereGeometry(0.032, 8, 8);
    for (let b = 0; b < 12; b++) {
      const bead = new THREE.Mesh(beadGeo, this.trajectoryBeadMat);
      bead.frustumCulled = false;
      this.trajectoryBeads.push(bead);
      this.trajectoryGroup.add(bead);
    }

    const outerRingGeo = new THREE.RingGeometry(0.32, 0.46, 32);
    outerRingGeo.rotateX(-Math.PI / 2);
    this.landingOuterRingMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const outerRingMesh = new THREE.Mesh(outerRingGeo, this.landingOuterRingMat);
    this.landingRingGroup.add(outerRingMesh);

    const innerDiscGeo = new THREE.CircleGeometry(0.28, 24);
    innerDiscGeo.rotateX(-Math.PI / 2);
    this.landingInnerDiscMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const innerDiscMesh = new THREE.Mesh(innerDiscGeo, this.landingInnerDiscMat);
    this.landingRingGroup.add(innerDiscMesh);

    const beaconGeo = new THREE.CylinderGeometry(0.015, 0.045, 0.42, 12, 1, true);
    beaconGeo.translate(0, 0.21, 0);
    const beaconMesh = new THREE.Mesh(beaconGeo, this.landingInnerDiscMat);
    this.landingRingGroup.add(beaconMesh);

    this.trajectoryGroup.add(this.landingRingGroup);
    this.trajectoryGroup.visible = false;
    this.scene.add(this.trajectoryGroup);

    this.initExplosionsPool();
    this.initSmokeCloudsPool();
    this.preloadGrenadeGlbModels();
  }

  public getHeldGrenade(): GrenadeType | null {
    return this.heldGrenadeType;
  }

  public isThrowing(): boolean {
    return this.throwSequenceActive;
  }

  public isBusyOrHolding(): boolean {
    return this.heldGrenadeType !== null || this.throwSequenceActive;
  }

  private createSoftSmokeTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 128, 128);

    // Draw overlapping soft volumetric cloud lobes at 128x128 for reduced mobile GPU overdraw
    const lobes = [
      { x: 64, y: 64, r: 56, a: 0.95 },
      { x: 48, y: 54, r: 41, a: 0.75 },
      { x: 81, y: 57, r: 40, a: 0.75 },
      { x: 54, y: 78, r: 42, a: 0.72 },
      { x: 77, y: 76, r: 41, a: 0.72 },
      { x: 64, y: 44, r: 37, a: 0.65 },
    ];

    for (const lobe of lobes) {
      const grad = ctx.createRadialGradient(
        lobe.x,
        lobe.y,
        3,
        lobe.x,
        lobe.y,
        lobe.r
      );
      grad.addColorStop(0, `rgba(241, 245, 249, ${lobe.a})`);
      grad.addColorStop(0.42, `rgba(214, 222, 232, ${lobe.a * 0.82})`);
      grad.addColorStop(0.75, `rgba(165, 178, 194, ${lobe.a * 0.42})`);
      grad.addColorStop(1, 'rgba(100, 116, 139, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lobe.x, lobe.y, lobe.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private buildProceduralFragFallback(): THREE.Group {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x364532,
      roughness: 0.52,
      metalness: 0.35,
    });
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.32,
      metalness: 0.85,
    });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.044, 16, 14), bodyMat);
    body.scale.set(1, 1.22, 1);
    g.add(body);

    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.018, 0.028, 10),
      metalMat
    );
    neck.position.y = 0.058;
    g.add(neck);

    const lever = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.068, 0.025),
      metalMat
    );
    lever.name = 'Grenade_Lever';
    lever.position.set(0.022, 0.024, 0);
    g.add(lever);

    const pinRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.015, 0.0028, 8, 16),
      metalMat
    );
    pinRing.name = 'Grenade_Pin';
    pinRing.position.set(-0.022, 0.058, 0.012);
    g.add(pinRing);

    return g;
  }

  private buildProceduralSmokeFallback(): THREE.Group {
    const g = new THREE.Group();
    const canisterMat = new THREE.MeshStandardMaterial({
      color: 0x4b5563,
      roughness: 0.48,
      metalness: 0.45,
    });
    const bandMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.4,
      metalness: 0.2,
    });
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.3,
      metalness: 0.85,
    });

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.033, 0.033, 0.118, 16),
      canisterMat
    );
    g.add(body);

    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0336, 0.0336, 0.024, 16),
      bandMat
    );
    stripe.position.y = 0.015;
    g.add(stripe);

    const topCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.02, 0.024, 10),
      metalMat
    );
    topCap.position.y = 0.068;
    g.add(topCap);

    const lever = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.08, 0.024),
      metalMat
    );
    lever.name = 'Grenade_Lever';
    lever.position.set(0.024, 0.02, 0);
    g.add(lever);

    const pinRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.015, 0.0028, 8, 16),
      metalMat
    );
    pinRing.name = 'Grenade_Pin';
    pinRing.position.set(-0.02, 0.068, 0.012);
    g.add(pinRing);

    return g;
  }

  private buildFallbackViewmodelVisuals(): void {
    this.vmFragVisual.add(this.buildProceduralFragFallback());
    this.vmSmokeVisual.add(this.buildProceduralSmokeFallback());
    this.handRig.grenadeSocket.add(this.vmFragVisual);
    this.handRig.grenadeSocket.add(this.vmSmokeVisual);
  }

  private normalizeGlbModel(
    rawScene: THREE.Group,
    targetMaxDim: number,
    hideDuplicateM18Nodes = false
  ): THREE.Group {
    const wrapper = new THREE.Group();

    if (hideDuplicateM18Nodes) {
      rawScene.traverse((child) => {
        if (
          child.name.includes('.001') ||
          child.name.includes('.002') ||
          child.name.includes('_001') ||
          child.name.includes('_002')
        ) {
          child.visible = false;
        }
      });
    }

    rawScene.updateMatrixWorld(true);
    _tempBox.makeEmpty();
    rawScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && child.visible) {
        let p: THREE.Object3D | null = child;
        let vis = true;
        while (p) {
          if (!p.visible) {
            vis = false;
            break;
          }
          p = p.parent;
        }
        if (vis) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          if (!mesh.geometry.boundingBox) {
            mesh.geometry.computeBoundingBox();
          }
          if (mesh.geometry.boundingBox) {
            const b = mesh.geometry.boundingBox.clone();
            b.applyMatrix4(mesh.matrixWorld);
            _tempBox.union(b);
          }
        }
      }
    });

    if (!_tempBox.isEmpty()) {
      _tempBox.getSize(_tempSize);
      _tempBox.getCenter(_tempCenter);
      const maxDim = Math.max(_tempSize.x, _tempSize.y, _tempSize.z, 0.001);
      const scale = targetMaxDim / maxDim;

      const inner = new THREE.Group();
      inner.add(rawScene);
      rawScene.position.set(
        -_tempCenter.x,
        -_tempCenter.y,
        -_tempCenter.z
      );
      inner.scale.setScalar(scale);
      wrapper.add(inner);
    } else {
      wrapper.add(rawScene);
    }

    return wrapper;
  }

  private loadGlbWithFallback(
    localUrl: string,
    githubUrl: string,
    onLoaded: (scene: THREE.Group) => void
  ): void {
    this.loader.load(
      localUrl,
      (gltf) => onLoaded(gltf.scene),
      undefined,
      () => {
        this.loader.load(
          githubUrl,
          (gltf) => onLoaded(gltf.scene),
          undefined,
          () => {}
        );
      }
    );
  }

  private grenadeAssetsPromise: Promise<void> | null = null;

  private loadGlbPromise(
    localUrl: string,
    githubUrl: string
  ): Promise<THREE.Group | null> {
    return new Promise((resolve) => {
      let settled = false;
      const done = (scene: THREE.Group | null) => {
        if (settled) return;
        settled = true;
        resolve(scene);
      };
      this.loadGlbWithFallback(localUrl, githubUrl, (scene) => done(scene));
      // loadGlbWithFallback swallows final failure — timebox so match load can't hang.
      window.setTimeout(() => done(null), 12000);
    });
  }

  private preloadGrenadeGlbModels(): void {
    void this.ensureGrenadeAssetsReady();
  }

  /**
   * Awaitable warm of frag/smoke GLBs + viewmodel bind.
   * Call during match prepare so the first HUD grenade tap is instant.
   */
  public ensureGrenadeAssetsReady(): Promise<void> {
    if (this.fragTemplate && (this.s13SmokeTemplate || this.m18SmokeTemplate)) {
      this.bindViewmodelParts(this.vmFragVisual);
      this.bindViewmodelParts(this.vmSmokeVisual);
      this.lastBoundVmType = null;
      return Promise.resolve();
    }
    if (this.grenadeAssetsPromise) return this.grenadeAssetsPromise;

    this.grenadeAssetsPromise = (async () => {
      const [fragScene, s13Scene, m18Scene] = await Promise.all([
        this.loadGlbPromise(FRAG_GLB_LOCAL_URL, FRAG_GLB_GITHUB_URL),
        this.loadGlbPromise(S13_SMOKE_GLB_LOCAL_URL, S13_SMOKE_GLB_GITHUB_URL),
        this.loadGlbPromise(M18_SMOKE_GLB_LOCAL_URL, M18_SMOKE_GLB_GITHUB_URL),
      ]);

      if (fragScene && !this.fragTemplate) {
        isolateSingleFragGrenadeInGlb(fragScene);
        this.fragTemplate = this.normalizeGlbModel(fragScene, 0.112, false);
        this.vmFragVisual.clear();
        const vmClone = this.fragTemplate.clone(true);
        const pinRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.013, 0.0024, 8, 16),
          new THREE.MeshStandardMaterial({
            color: 0xe2e8f0,
            metalness: 0.92,
            roughness: 0.22,
          })
        );
        pinRing.name = 'Grenade_Pin';
        pinRing.position.set(-0.02, 0.044, 0.01);
        vmClone.add(pinRing);
        this.vmFragVisual.add(vmClone);
      }

      if (s13Scene && !this.s13SmokeTemplate) {
        this.s13SmokeTemplate = this.normalizeGlbModel(s13Scene, 0.132, false);
        this.vmSmokeVisual.clear();
        this.vmSmokeVisual.add(this.s13SmokeTemplate.clone(true));
      }

      if (m18Scene && !this.m18SmokeTemplate) {
        this.m18SmokeTemplate = this.normalizeGlbModel(m18Scene, 0.132, true);
        if (!this.s13SmokeTemplate) {
          this.vmSmokeVisual.clear();
          this.vmSmokeVisual.add(this.m18SmokeTemplate.clone(true));
        }
      }

      // Pre-bind both so first tap skips traverse hitch.
      if (this.vmFragVisual.children.length > 0) {
        this.bindViewmodelParts(this.vmFragVisual);
      }
      if (this.vmSmokeVisual.children.length > 0) {
        this.bindViewmodelParts(this.vmSmokeVisual);
      }
      this.lastBoundVmType = null;
    })();

    return this.grenadeAssetsPromise;
  }

  private bindViewmodelParts(activeVisual: THREE.Group): void {
    this.vmPinMesh = null;
    this.vmLeverMesh = null;
    activeVisual.traverse((child) => {
      const n = child.name.toLowerCase();
      if (n.includes('pin') || n.includes('9_low')) {
        if (!child.userData.restPos) {
          child.userData.restPos = child.position.clone();
        } else {
          child.position.copy(child.userData.restPos as THREE.Vector3);
        }
        this.vmPinMesh = child;
        child.visible = true;
      } else if (n.includes('lever') || n.includes('7_low')) {
        if (!child.userData.restRot) {
          child.userData.restRot = child.rotation.clone();
        } else {
          child.rotation.copy(child.userData.restRot as THREE.Euler);
        }
        this.vmLeverMesh = child;
      }
    });
  }

  private initExplosionsPool(): void {
    // Single shared PointLight that stays permanently visible in the scene (intensity 0 when inactive)
    // to prevent Three.js from recompiling lit material shaders on explosion start/end
    this.sharedExplosionLight = new THREE.PointLight(0xff7b00, 0, 18);
    this.sharedExplosionLight.visible = true;
    this.sharedExplosionLight.position.set(0, 0.8, 0);
    this.scene.add(this.sharedExplosionLight);

    const coreGeo = new THREE.SphereGeometry(0.55, 14, 12);
    const fireballGeo = new THREE.SphereGeometry(1.1, 16, 14);
    const ringGeo = new THREE.RingGeometry(0.4, 0.85, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const scorchGeo = new THREE.CircleGeometry(1.65, 18);
    scorchGeo.rotateX(-Math.PI / 2);
    const debrisGeo = new THREE.DodecahedronGeometry(0.055, 0);

    for (let i = 0; i < 4; i++) {
      const group = new THREE.Group();
      group.visible = false;
      this.scene.add(group);

      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xfffbeb,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      group.add(coreMesh);

      const fireballMat = new THREE.MeshBasicMaterial({
        color: 0xf97316,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      });
      const fireballMesh = new THREE.Mesh(fireballGeo, fireballMat);
      group.add(fireballMesh);

      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const shockwaveRing = new THREE.Mesh(ringGeo, ringMat);
      shockwaveRing.position.y = 0.06;
      group.add(shockwaveRing);

      const scorchMat = new THREE.MeshBasicMaterial({
        color: 0x090b0e,
        transparent: true,
        opacity: 0.75,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        depthWrite: false,
      });
      const scorchDecal = new THREE.Mesh(scorchGeo, scorchMat);
      scorchDecal.position.y = 0.015;
      group.add(scorchDecal);

      const debris: ExplosionInstance['debris'] = [];
      for (let d = 0; d < 18; d++) {
        const dMat = new THREE.MeshBasicMaterial({
          color: d % 2 === 0 ? 0xfbbf24 : 0xef4444,
        });
        const dMesh = new THREE.Mesh(debrisGeo, dMat);
        group.add(dMesh);
        debris.push({
          mesh: dMesh,
          vel: new THREE.Vector3(),
        });
      }

      this.explosions.push({
        group,
        coreMesh,
        fireballMesh,
        shockwaveRing,
        scorchDecal,
        debris,
        age: 0,
        maxAge: 2.2,
        active: false,
      });
    }
  }

  private initSmokeCloudsPool(): void {
    const PUFF_COUNT = 18;

    for (let i = 0; i < 3; i++) {
      const group = new THREE.Group();
      group.visible = false;
      this.scene.add(group);

      const puffs: SmokePuff[] = [];
      for (let p = 0; p < PUFF_COUNT; p++) {
        const shade =
          p % 4 === 0
            ? 0xf1f5f9
            : p % 3 === 0
              ? 0xe2e8f0
              : p % 2 === 0
                ? 0xcbd5e1
                : 0x94a3b8;
        const mat = new THREE.SpriteMaterial({
          map: this.softSmokeTexture,
          color: shade,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(mat);
        group.add(sprite);

        // 3 concentric volumetric rings with 18 puffs scaled up to preserve full visual radius
        let ringDist = 0;
        let height = 0.6;
        let baseScale = 5.0;
        if (p < 6) {
          ringDist = 0.2 + (p / 6) * 1.3;
          height = 0.85 + (p % 3) * 0.6;
          baseScale = 5.2 + (p % 3) * 1.1;
        } else if (p < 12) {
          ringDist = 1.4 + ((p - 6) / 6) * 2.1;
          height = 0.95 + (p % 3) * 0.65;
          baseScale = 5.6 + (p % 3) * 1.05;
        } else {
          ringDist = 2.8 + ((p - 12) / 6) * 1.9;
          height = 0.8 + (p % 3) * 0.65;
          baseScale = 5.0 + (p % 2) * 1.1;
        }

        const angle = (p * 2.39996) % (Math.PI * 2); // Golden angle distribution for zero gaps

        puffs.push({
          sprite,
          mat,
          offset: new THREE.Vector3(
            Math.cos(angle) * ringDist,
            height,
            Math.sin(angle) * ringDist
          ),
          driftVel: new THREE.Vector3(
            (Math.random() - 0.5) * 0.25,
            0.06 + Math.random() * 0.1,
            (Math.random() - 0.5) * 0.25
          ),
          baseScale,
          rotSpeed: (Math.random() - 0.5) * 0.32,
          delay: Math.min(0.9, (p / PUFF_COUNT) * 0.75),
        });
      }

      this.smokeClouds.push({
        group,
        puffs,
        center: new THREE.Vector3(),
        radius: 0,
        age: 0,
        maxAge: 25.0, // Full 25 seconds of smoke screen duration
        active: false,
      });
    }
  }

  /**
   * Pre-warms GPU shaders and textures for grenade viewmodels, trajectory arc,
   * explosion meshes, and smoke sprites by rendering a single hidden warm-up pass.
   */
  public prewarmShadersAndTextures(
    renderer: THREE.WebGLRenderer,
    isSoftwareGl: boolean
  ): void {
    if (isSoftwareGl) return;

    renderer.initTexture(this.softSmokeTexture);
    this.viewmodelGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const mats = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        for (let i = 0; i < mats.length; i++) {
          const std = mats[i] as THREE.MeshStandardMaterial;
          if (std?.map) renderer.initTexture(std.map);
          if (std?.normalMap) renderer.initTexture(std.normalMap);
          if (std?.roughnessMap) renderer.initTexture(std.roughnessMap);
          if (std?.metalnessMap) renderer.initTexture(std.metalnessMap);
          if (std?.emissiveMap) renderer.initTexture(std.emissiveMap);
        }
      }
    });

    const prevVmVis = this.viewmodelGroup.visible;
    const prevSocketVis = this.handRig.grenadeSocket.visible;
    const prevFragVis = this.vmFragVisual.visible;
    const prevSmokeVis = this.vmSmokeVisual.visible;
    const prevTrajVis = this.trajectoryGroup.visible;

    const exp0 = this.explosions[0];
    const cloud0 = this.smokeClouds[0];
    const prevExpVis = exp0 ? exp0.group.visible : false;
    const prevCloudVis = cloud0 ? cloud0.group.visible : false;

    this.viewmodelGroup.visible = true;
    this.handRig.grenadeSocket.visible = true;
    this.vmFragVisual.visible = true;
    this.vmSmokeVisual.visible = true;
    this.trajectoryGroup.visible = true;

    if (exp0) {
      exp0.group.visible = true;
      exp0.coreMesh.visible = true;
      exp0.fireballMesh.visible = true;
      exp0.shockwaveRing.visible = true;
      exp0.scorchDecal.visible = true;
    }
    if (cloud0) {
      cloud0.group.visible = true;
    }

    try {
      renderer.compile(this.scene, this.camera);
      renderer.render(this.scene, this.camera);
    } catch {
      // Ignore software/context fallback
    }

    this.viewmodelGroup.visible = prevVmVis;
    this.handRig.grenadeSocket.visible = prevSocketVis;
    this.vmFragVisual.visible = prevFragVis;
    this.vmSmokeVisual.visible = prevSmokeVis;
    this.trajectoryGroup.visible = prevTrajVis;
    if (exp0) exp0.group.visible = prevExpVis;
    if (cloud0) cloud0.group.visible = prevCloudVis;
  }

  // =========================================================================
  // STEP 1: EQUIP GRENADE IN HAND (HOLDING & AIMING TRAJECTORY)
  // =========================================================================
  public equipInHand(type: GrenadeType): void {
    if (this.throwSequenceActive) return;

    this.heldGrenadeType = type;
    this.holdIdleTime = 0;
    // Near-zero — old 80ms + HUD defer made the tap feel lagged before anything moved.
    this.equipCooldownTimer = 0.02;
    this.projectileLaunchedInSequence = false;
    this.viewmodelGroup.visible = true;
    this.handRig.grenadeSocket.visible = true;
    this.vmFragVisual.visible = type === 'FRAG';
    this.vmSmokeVisual.visible = type === 'SMOKE';

    const activeVisual =
      type === 'FRAG' ? this.vmFragVisual : this.vmSmokeVisual;
    // Cache pin/lever bind — full traverse on every tap was hitching mobile UI.
    if (this.lastBoundVmType !== type || !this.vmPinMesh || !this.vmLeverMesh) {
      this.bindViewmodelParts(activeVisual);
      this.lastBoundVmType = type;
    } else {
      if (this.vmPinMesh.userData.restPos) {
        this.vmPinMesh.position.copy(
          this.vmPinMesh.userData.restPos as THREE.Vector3
        );
      }
      this.vmPinMesh.visible = true;
      if (this.vmLeverMesh.userData.restRot) {
        this.vmLeverMesh.rotation.copy(
          this.vmLeverMesh.userData.restRot as THREE.Euler
        );
      }
    }
    this.handRig.updateHoldPose(0, 0);

    const indicatorColor = type === 'FRAG' ? 0xf97316 : 0x38bdf8;
    const beadColor = type === 'FRAG' ? 0xfef08a : 0xe0f2fe;
    this.trajectoryMat.color.setHex(indicatorColor);
    this.trajectoryBeadMat.color.setHex(beadColor);
    this.landingOuterRingMat.color.setHex(indicatorColor);
    this.landingInnerDiscMat.color.setHex(indicatorColor);
    this.trajectoryGroup.visible = true;
    this.lastTrajectoryUpdateMs = 0;

    soundEngine.playWeaponSwap();
  }

  public unequipFromHand(): void {
    if (this.throwSequenceActive) return;
    this.heldGrenadeType = null;
    this.projectileLaunchedInSequence = false;
    this.viewmodelGroup.visible = false;
    this.trajectoryGroup.visible = false;
  }

  // =========================================================================
  // STEP 2: PULL PIN & THROW THE EQUIPPED GRENADE (WHEN PLAYER CLICKS FIRE)
  // =========================================================================
  public triggerPinPullAndThrow(): boolean {
    if (
      this.throwSequenceActive ||
      !this.heldGrenadeType ||
      this.equipCooldownTimer > 0
    ) {
      return false;
    }

    const type = this.heldGrenadeType;
    this.throwSequenceActive = true;
    this.throwSequenceType = type;
    this.throwSequenceTimer = 0;
    this.projectileLaunchedInSequence = false;

    const activeVisual =
      type === 'FRAG' ? this.vmFragVisual : this.vmSmokeVisual;
    this.bindViewmodelParts(activeVisual);

    // 1. Play real pin-pull audio + tactile vibration
    soundEngine.playGrenadePinPull();
    mobileHardware.vibratePinPull();
    return true;
  }

  private getThrowOriginAndVelocity(
    outOrigin: THREE.Vector3,
    outVel: THREE.Vector3
  ): void {
    this.camera.getWorldPosition(_camPos);
    this.camera.getWorldDirection(_camDir);

    outOrigin.copy(_camPos).addScaledVector(_camDir, 0.52);
    outOrigin.y -= 0.08;

    outVel
      .copy(_camDir)
      .multiplyScalar(15.5)
      .add(_THROW_UPWARD_IMPULSE);
  }

  private updateTrajectoryPreview(
    colliders: ColliderBox[],
    getGroundHeight?: (x: number, y: number, z: number) => number
  ): void {
    if (!this.heldGrenadeType && !this.throwSequenceActive) {
      this.trajectoryGroup.visible = false;
      return;
    }
    if (this.projectileLaunchedInSequence) {
      this.trajectoryGroup.visible = false;
      return;
    }

    const nowMs = performance.now();
    if (
      this.trajectoryGroup.visible &&
      nowMs - this.lastTrajectoryUpdateMs < 33
    ) {
      return;
    }
    this.lastTrajectoryUpdateMs = nowMs;

    this.trajectoryGroup.visible = true;
    this.getThrowOriginAndVelocity(_simPos, _simVel);

    const posAttr = this.trajectoryLine.geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute;

    const stepDt = 0.048;
    const r = 0.08;
    let landedX = _simPos.x;
    let landedY = 0.02;
    let landedZ = _simPos.z;
    let stopped = false;

    for (let i = 0; i < TRAJECTORY_STEPS; i++) {
      posAttr.setXYZ(i, _simPos.x, _simPos.y, _simPos.z);

      if (stopped) continue;

      _simVel.y -= 14.5 * stepDt;
      const nextX = _simPos.x + _simVel.x * stepDt;
      const nextY = _simPos.y + _simVel.y * stepDt;
      const nextZ = _simPos.z + _simVel.z * stepDt;

      // Check collider wall bounce
      let hitX = false;
      let hitZ = false;
      for (let cIdx = 0; cIdx < colliders.length; cIdx++) {
        const c = colliders[cIdx];
        if (nextY + r <= c.minY || nextY - r >= c.maxY) continue;
        if (
          nextX + r > c.minX &&
          nextX - r < c.maxX &&
          _simPos.z + r > c.minZ &&
          _simPos.z - r < c.maxZ
        ) {
          hitX = true;
        }
        if (
          _simPos.x + r > c.minX &&
          _simPos.x - r < c.maxX &&
          nextZ + r > c.minZ &&
          nextZ - r < c.maxZ
        ) {
          hitZ = true;
        }
      }

      if (hitX) {
        _simVel.x *= -0.48;
      } else {
        _simPos.x = nextX;
      }

      if (hitZ) {
        _simVel.z *= -0.48;
      } else {
        _simPos.z = nextZ;
      }

      const floorY = getGroundHeight ? getGroundHeight(_simPos.x, nextY, _simPos.z) : 0;
      const groundThreshold = floorY + 0.065;

      if (nextY <= groundThreshold) {
        _simPos.y = groundThreshold;
        landedX = _simPos.x;
        landedY = floorY + 0.025;
        landedZ = _simPos.z;
        stopped = true;
      } else {
        _simPos.y = nextY;
        landedX = _simPos.x;
        landedY = Math.max(floorY + 0.025, _simPos.y);
        landedZ = _simPos.z;
      }
    }

    posAttr.needsUpdate = true;

    // Animate marching glowing beads along the trajectory arc
    const flowPhase = (performance.now() * 0.0022) % 1;
    const beadCount = this.trajectoryBeads.length;
    for (let b = 0; b < beadCount; b++) {
      const normT = ((b + flowPhase) / beadCount) * (TRAJECTORY_STEPS - 2);
      const idx0 = Math.floor(normT);
      const idx1 = Math.min(TRAJECTORY_STEPS - 1, idx0 + 1);
      const frac = normT - idx0;
      const bx = THREE.MathUtils.lerp(
        posAttr.getX(idx0),
        posAttr.getX(idx1),
        frac
      );
      const by = THREE.MathUtils.lerp(
        posAttr.getY(idx0),
        posAttr.getY(idx1),
        frac
      );
      const bz = THREE.MathUtils.lerp(
        posAttr.getZ(idx0),
        posAttr.getZ(idx1),
        frac
      );
      this.trajectoryBeads[b].position.set(bx, by, bz);
    }

    this.landingRingGroup.position.set(landedX, landedY, landedZ);
    const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.14;
    this.landingRingGroup.scale.set(pulse, 1, pulse);
  }

  private spawnWorldProjectile(type: GrenadeType): void {
    const projGroup = new THREE.Group();

    if (type === 'FRAG') {
      if (this.fragTemplate) {
        projGroup.add(this.fragTemplate.clone(true));
      } else {
        projGroup.add(this.buildProceduralFragFallback());
      }
    } else {
      const template = this.m18SmokeTemplate || this.s13SmokeTemplate;
      if (template) {
        projGroup.add(template.clone(true));
      } else {
        projGroup.add(this.buildProceduralSmokeFallback());
      }
    }

    const spawnPos = new THREE.Vector3();
    const vel = new THREE.Vector3();
    this.getThrowOriginAndVelocity(spawnPos, vel);

    projGroup.position.copy(spawnPos);
    this.scene.add(projGroup);

    const angVel = new THREE.Vector3(
      8.5 + Math.random() * 5,
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 6
    );

    // 2. Play real throw sound and character battle chatter voice for grenades!
    soundEngine.playGrenadeThrow();
    if (type === 'SMOKE') {
      soundEngine.playSmokeGrenadeVoice();
    } else if (type === 'FRAG') {
      soundEngine.playFragGrenadeVoice();
    }

    this.projectiles.push({
      type,
      group: projGroup,
      vel,
      angVel,
      age: 0,
      fuseTime: type === 'FRAG' ? 2.05 : 1.35,
      detonated: false,
      smokeCloudSpawned: false,
      removeAge: type === 'FRAG' ? 2.1 : 26.5,
      bounces: 0,
    });
  }

  public spawnBotGrenade(
    origin: THREE.Vector3,
    velocity: THREE.Vector3,
    type: GrenadeType
  ): void {
    const projGroup = new THREE.Group();
    if (type === 'FRAG') {
      if (this.fragTemplate) {
        projGroup.add(this.fragTemplate.clone(true));
      } else {
        projGroup.add(this.buildProceduralFragFallback());
      }
    } else {
      const template = this.m18SmokeTemplate || this.s13SmokeTemplate;
      if (template) {
        projGroup.add(template.clone(true));
      } else {
        projGroup.add(this.buildProceduralSmokeFallback());
      }
    }

    projGroup.position.copy(origin);
    this.scene.add(projGroup);

    const angVel = new THREE.Vector3(
      7.5 + Math.random() * 4,
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5
    );

    this.projectiles.push({
      type,
      group: projGroup,
      vel: velocity.clone(),
      angVel,
      age: 0,
      fuseTime: type === 'FRAG' ? 2.05 : 1.35,
      detonated: false,
      smokeCloudSpawned: false,
      removeAge: type === 'FRAG' ? 2.1 : 26.5,
      bounces: 0,
    });
  }

  private spawnExplosion(pos: THREE.Vector3): void {
    soundEngine.playGrenadeExplosion();

    let exp = this.explosions.find((e) => !e.active);
    if (!exp) {
      exp = this.explosions[0];
    }

    exp.active = true;
    exp.age = 0;
    exp.group.visible = true;
    exp.group.position.set(pos.x, Math.max(0.05, pos.y), pos.z);

    exp.coreMesh.visible = true;
    exp.coreMesh.scale.setScalar(0.3);
    (exp.coreMesh.material as THREE.MeshBasicMaterial).opacity = 1.0;

    exp.fireballMesh.visible = true;
    exp.fireballMesh.scale.setScalar(0.4);
    (exp.fireballMesh.material as THREE.MeshBasicMaterial).opacity = 0.95;

    exp.shockwaveRing.visible = true;
    exp.shockwaveRing.scale.setScalar(0.5);
    (exp.shockwaveRing.material as THREE.MeshBasicMaterial).opacity = 0.9;

    exp.scorchDecal.visible = pos.y < 0.45;
    (exp.scorchDecal.material as THREE.MeshBasicMaterial).opacity = 0.8;

    this.sharedExplosionLight.position.set(
      pos.x,
      Math.max(0.05, pos.y) + 0.8,
      pos.z
    );
    this.sharedExplosionLight.intensity = 18.0;

    for (let i = 0; i < exp.debris.length; i++) {
      const d = exp.debris[i];
      d.mesh.visible = true;
      d.mesh.position.set(0, 0.15, 0);
      const theta = Math.random() * Math.PI * 2;
      const speed = 6.5 + Math.random() * 9.5;
      d.vel.set(
        Math.cos(theta) * speed,
        4.0 + Math.random() * 7.5,
        Math.sin(theta) * speed
      );
    }

    this.onFragDetonate(pos, 9.0);
  }

  private spawnSmokeCloud(pos: THREE.Vector3): void {
    soundEngine.playSmokeGrenadeGas();

    let cloud = this.smokeClouds.find((c) => !c.active);
    if (!cloud) {
      cloud = this.smokeClouds[0];
    }

    cloud.active = true;
    cloud.age = 0;
    cloud.center.set(pos.x, Math.max(0.05, pos.y), pos.z);
    cloud.radius = 0.5;
    cloud.group.visible = true;
    cloud.group.position.copy(cloud.center);

    for (let i = 0; i < cloud.puffs.length; i++) {
      const p = cloud.puffs[i];
      p.sprite.position.set(
        p.offset.x * 0.15,
        0.2 + (i % 3) * 0.12,
        p.offset.z * 0.15
      );
      p.sprite.scale.setScalar(0.6);
      p.mat.opacity = 0.0;
    }
  }

  public isLineOfSightBlockedBySmoke(
    origin: THREE.Vector3,
    target: THREE.Vector3
  ): boolean {
    _segDir.subVectors(target, origin);
    const segLen = _segDir.length();
    if (segLen < 0.01) return false;
    _segDir.divideScalar(segLen);

    for (let i = 0; i < this.smokeClouds.length; i++) {
      const c = this.smokeClouds[i];
      if (!c.active || c.radius < 1.2) continue;

      _toCloud.subVectors(c.center, origin);
      const proj = THREE.MathUtils.clamp(_toCloud.dot(_segDir), 0, segLen);
      _closestPt.copy(origin).addScaledVector(_segDir, proj);
      const distSq = _closestPt.distanceToSquared(c.center);
      if (distSq <= c.radius * c.radius) {
        return true;
      }
    }
    return false;
  }

  public clearAll(): void {
    for (let i = 0; i < this.projectiles.length; i++) {
      this.scene.remove(this.projectiles[i].group);
    }
    this.projectiles = [];
    for (let i = 0; i < this.explosions.length; i++) {
      this.explosions[i].active = false;
      this.explosions[i].group.visible = false;
    }
    this.sharedExplosionLight.intensity = 0;
    for (let i = 0; i < this.smokeClouds.length; i++) {
      this.smokeClouds[i].active = false;
      this.smokeClouds[i].group.visible = false;
    }
    this.heldGrenadeType = null;
    this.throwSequenceActive = false;
    this.projectileLaunchedInSequence = false;
    this.equipCooldownTimer = 0;
    this.viewmodelGroup.visible = false;
    this.trajectoryGroup.visible = false;
  }

  public update(
    dt: number,
    colliders: ColliderBox[],
    walkBobAmp = 0,
    getGroundHeight?: (x: number, y: number, z: number) => number
  ): void {
    if (this.equipCooldownTimer > 0) {
      this.equipCooldownTimer = Math.max(0, this.equipCooldownTimer - dt);
    }

    // 1. Update Trajectory Arc Preview when holding a grenade
    this.updateTrajectoryPreview(colliders, getGroundHeight);

    // 2. Update First-Person Articulated Hand Pose OR Pin-Pull, Wind-Up & Throw Sequence
    if (this.throwSequenceActive) {
      this.throwSequenceTimer += dt;
      const t = this.throwSequenceTimer;

      const { shouldReleaseNow, finished } = this.handRig.updateThrowSequence(
        t,
        this.vmPinMesh,
        this.vmLeverMesh
      );

      if (shouldReleaseNow && !this.projectileLaunchedInSequence) {
        this.projectileLaunchedInSequence = true;
        this.spawnWorldProjectile(this.throwSequenceType);
        this.onGrenadeReleasedFromHand?.(this.throwSequenceType);
      }

      if (finished) {
        this.throwSequenceActive = false;
        this.heldGrenadeType = null;
        this.projectileLaunchedInSequence = false;
        this.viewmodelGroup.visible = false;
        this.trajectoryGroup.visible = false;
      }
    } else if (this.heldGrenadeType !== null) {
      // Holding grenade in articulated gloved hand ready to aim & throw
      this.holdIdleTime += dt;
      this.handRig.updateHoldPose(this.holdIdleTime, walkBobAmp);
    }

    // 3. Update World Grenade Projectiles (Ballistic Gravity + Bounces + Fuse)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.age += dt;

      if (!proj.detonated) {
        proj.vel.y -= 14.5 * dt;

        const nextX = proj.group.position.x + proj.vel.x * dt;
        const nextY = proj.group.position.y + proj.vel.y * dt;
        const nextZ = proj.group.position.z + proj.vel.z * dt;

        // Check horizontal wall/obstacle bounce
        let hitWallX = false;
        let hitWallZ = false;
        const r = 0.08;
        for (let cIdx = 0; cIdx < colliders.length; cIdx++) {
          const c = colliders[cIdx];
          if (nextY + r <= c.minY || nextY - r >= c.maxY) continue;
          if (
            nextX + r > c.minX &&
            nextX - r < c.maxX &&
            proj.group.position.z + r > c.minZ &&
            proj.group.position.z - r < c.maxZ
          ) {
            hitWallX = true;
          }
          if (
            proj.group.position.x + r > c.minX &&
            proj.group.position.x - r < c.maxX &&
            nextZ + r > c.minZ &&
            nextZ - r < c.maxZ
          ) {
            hitWallZ = true;
          }
        }

        if (hitWallX) {
          proj.vel.x *= -0.48;
          if (proj.bounces < 5) {
            if (!playRealGrenadeBounce(0.75)) {
              soundEngine.playGrenadeBounce(0.65);
            }
            proj.bounces++;
          }
        } else {
          proj.group.position.x = nextX;
        }

        if (hitWallZ) {
          proj.vel.z *= -0.48;
          if (proj.bounces < 5) {
            if (!playRealGrenadeBounce(0.75)) {
              soundEngine.playGrenadeBounce(0.65);
            }
            proj.bounces++;
          }
        } else {
          proj.group.position.z = nextZ;
        }

        // Floor bounce with 3D map ground elevation support
        const floorY = getGroundHeight ? getGroundHeight(nextX, nextY, nextZ) : 0;
        const groundThreshold = floorY + 0.065;

        if (nextY <= groundThreshold) {
          proj.group.position.y = groundThreshold;
          if (Math.abs(proj.vel.y) > 1.1) {
            proj.vel.y = Math.abs(proj.vel.y) * 0.36;
            proj.vel.x *= 0.68;
            proj.vel.z *= 0.68;
            proj.angVel.multiplyScalar(0.55);
            if (proj.bounces < 5) {
              const bounceInt = Math.min(1, Math.abs(proj.vel.y) / 4.0);
              if (!playRealGrenadeBounce(bounceInt)) {
                soundEngine.playGrenadeBounce(bounceInt);
              }
              proj.bounces++;
            }
          } else {
            proj.vel.y = 0;
            proj.vel.x *= Math.max(0, 1 - 6 * dt);
            proj.vel.z *= Math.max(0, 1 - 6 * dt);
            proj.angVel.multiplyScalar(Math.max(0, 1 - 8 * dt));
          }
        } else {
          proj.group.position.y = nextY;
        }

        proj.group.rotation.x += proj.angVel.x * dt;
        proj.group.rotation.y += proj.angVel.y * dt;
        proj.group.rotation.z += proj.angVel.z * dt;

        // Check fuse detonation
        if (proj.age >= proj.fuseTime) {
          proj.detonated = true;
          if (proj.type === 'FRAG') {
            proj.group.visible = false;
            this.spawnExplosion(proj.group.position);
          } else if (!proj.smokeCloudSpawned) {
            proj.smokeCloudSpawned = true;
            this.spawnSmokeCloud(proj.group.position);
          }
        }
      }

      if (proj.age >= proj.removeAge) {
        this.scene.remove(proj.group);
        this.projectiles.splice(i, 1);
      }
    }

    // 4. Update Active Frag Explosions & Shared PointLight Intensity
    let maxExplosionLightIntensity = 0;
    for (let i = 0; i < this.explosions.length; i++) {
      const exp = this.explosions[i];
      if (!exp.active) continue;

      exp.age += dt;
      if (exp.age >= exp.maxAge) {
        exp.active = false;
        exp.group.visible = false;
        continue;
      }

      if (exp.age < 0.22) {
        const p = exp.age / 0.22;
        exp.coreMesh.scale.setScalar(0.4 + p * 3.4);
        (exp.coreMesh.material as THREE.MeshBasicMaterial).opacity = 1 - p;
      } else {
        exp.coreMesh.visible = false;
      }

      if (exp.age < 0.55) {
        const p = exp.age / 0.55;
        exp.fireballMesh.scale.setScalar(0.5 + Math.pow(p, 0.6) * 3.2);
        (exp.fireballMesh.material as THREE.MeshBasicMaterial).opacity =
          0.95 * (1 - p);
      } else {
        exp.fireballMesh.visible = false;
      }

      if (exp.age < 0.42) {
        const p = exp.age / 0.42;
        exp.shockwaveRing.scale.setScalar(0.6 + p * 8.5);
        (exp.shockwaveRing.material as THREE.MeshBasicMaterial).opacity =
          0.85 * (1 - p);
      } else {
        exp.shockwaveRing.visible = false;
      }

      if (exp.age < 0.38) {
        maxExplosionLightIntensity = Math.max(
          maxExplosionLightIntensity,
          18.0 * (1 - exp.age / 0.38)
        );
      }

      if (exp.age > 1.4) {
        (exp.scorchDecal.material as THREE.MeshBasicMaterial).opacity =
          0.75 * (1 - (exp.age - 1.4) / (exp.maxAge - 1.4));
      }

      for (let d = 0; d < exp.debris.length; d++) {
        const deb = exp.debris[d];
        if (exp.age > 0.9) {
          deb.mesh.visible = false;
          continue;
        }
        deb.vel.y -= 18.0 * dt;
        deb.mesh.position.addScaledVector(deb.vel, dt);
        if (deb.mesh.position.y < 0.03) {
          deb.mesh.position.y = 0.03;
          deb.vel.y = Math.abs(deb.vel.y) * 0.3;
          deb.vel.x *= 0.6;
          deb.vel.z *= 0.6;
        }
      }
    }
    this.sharedExplosionLight.intensity = maxExplosionLightIntensity;

    // 5. Update Dense, Long-Lasting Volumetric Smoke Clouds (25s duration, 44 puffs, no floating suppressor tube)
    for (let i = 0; i < this.smokeClouds.length; i++) {
      const cloud = this.smokeClouds[i];
      if (!cloud.active) continue;

      cloud.age += dt;
      if (cloud.age >= cloud.maxAge) {
        cloud.active = false;
        cloud.group.visible = false;
        cloud.radius = 0;
        continue;
      }

      // Fast billowing expansion in 1.8s, stays 100% thick for ~19.2s, fades only in final 4.0s
      const expandAlpha = Math.min(1, cloud.age / 1.8);
      const fadeStartAge = cloud.maxAge - 4.0;
      const fadeOutAlpha =
        cloud.age > fadeStartAge
          ? Math.max(0, 1 - (cloud.age - fadeStartAge) / 4.0)
          : 1.0;

      cloud.radius = 5.4 * expandAlpha * fadeOutAlpha;

      for (let p = 0; p < cloud.puffs.length; p++) {
        const puff = cloud.puffs[p];
        const localAge = Math.max(0, cloud.age - puff.delay);
        const puffExpand = Math.min(1, localAge / 1.4);
        const easeExpand = 1 - Math.pow(1 - puffExpand, 2.5);

        puff.sprite.position.x =
          puff.offset.x * easeExpand +
          Math.sin(cloud.age * 0.65 + p * 0.7) * 0.32;
        puff.sprite.position.y =
          puff.offset.y * easeExpand +
          Math.min(1.4, localAge * puff.driftVel.y);
        puff.sprite.position.z =
          puff.offset.z * easeExpand +
          Math.cos(cloud.age * 0.58 + p * 0.7) * 0.32;

        const scale = puff.baseScale * (0.3 + easeExpand * 0.95);
        puff.sprite.scale.set(scale, scale, 1);
        puff.mat.rotation += puff.rotSpeed * dt;
        puff.mat.opacity = 0.92 * easeExpand * fadeOutAlpha;
      }
    }
  }
}
