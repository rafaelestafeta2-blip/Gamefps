import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  playRealHitmarkerSound,
  playRealPlayerHitGrunt,
  preloadCharacterAndBombAudio,
  stopMatchEndFanfare,
  updatePlayerSprintPantingAudio,
} from '../audio/characterAndBombAudio';
import { soundEngine } from '../audio/soundEngine';
import {
  playBulletSnapAndWhizz,
  playSpatialBotGunshot,
  updateSpatialBotFootstepsAndHeartbeat,
} from '../audio/spatialCombatAudio';
import {
  detectSurfaceMaterialFromMesh,
  playMaterialImpact3D,
  playShellCasingDrop3D,
  triggerShellshockTinnitus,
  triggerTacticalRadioCallout,
} from '../audio/tacticalImmersionAudio';
import { mobileHardware } from '../mobile/nativeHardware';
import {
  BallisticShotTelemetry,
  DrillMode,
  FireMode,
  GameScreenState,
  GrenadeType,
  GyroMode,
  HudState,
  KillfeedEntry,
  OpticType,
  QualityPreset,
  WeaponId,
} from '../types/game';
import {
  addPlayerCash,
  getNextRank,
  getRankForXp,
  loadSavedPlayerXp,
  savePlayerXp,
} from '../progression/ranks';
import { canGrantMatchProgressionRewards } from '../progression/matchProgressionGate';
import { getClassCombatModifiers } from '../progression/loadoutSystem';
import { BallisticsFXPool } from './ballisticsPool';
import { TacticalGrenadeSystem } from './grenadeSystem';
import {
  buildPreProductionLevel,
  ColliderBox,
  TacticalLevelData,
  TacticalTargetEntity,
} from './levelBuilder';
import { createProceduralTextures, ProceduralTextures } from './textures';
import {
  buildTacticalWeaponRig,
  getOpticAdsTransform,
  TacticalWeaponRig,
} from './weaponBuilder';
import { AssetPreloader } from './preloader';
import { buildYardLevel } from './yardLevelBuilder';
import { YardBombSystem } from './yardBombSystem';
import { YARD_ATTACKER_SPAWN } from './yardMapData';
import { YardBotEntity } from './yardPropsBuilder';
import {
  ASSAULT_ATTACKER_SPAWN,
  ASSAULT_SPAWN_YAW,
  buildAssaultLevel,
  loadAssaultMapGeometry,
} from './assaultLevelBuilder';
import {
  INDUSTRIA_ATTACKER_SPAWN,
  INDUSTRIA_SPAWN_YAW,
  buildIndustriaLevel,
  loadIndustriaMapGeometry,
} from './industriaLevelBuilder';
import {
  buildDust2Level,
  Dust2LevelBundle,
  DUST2_T_SPAWN,
  DUST2_T_SPAWN_YAW,
  loadDust2MapGeometry,
} from './dust2LevelBuilder';
import {
  cleanupMatchArenaAssets,
  prepareMatchArena,
} from './matchAssetManager';
import {
  triggerBotFireAnimation,
  triggerBotHitAnimation,
  updateAllBotCharacters,
} from './botCharacterSystem';
import { PlayerDeathThirdPersonController } from './playerDeathThirdPerson';
import { PostMatchShowcase3D } from './postMatchShowcase3D';
import {
  buildStanderTiroLevel,
  loadStanderTiroMapGeometry,
  STANDER_TIRO_SPAWN,
  STANDER_TIRO_SPAWN_YAW,
  StanderTiroBundle,
} from './standerTiroBuilder';
import { TacticalSkySystem } from './skySystem';
import {
  getActiveOnlineRoom,
  getLocalOnlinePlayerState,
  isOnlineMatchActive,
  leaveActiveRoom,
  publishBombStateChange,
  publishCombatHit,
  subscribeOnlineClassSupport,
  subscribeOnlineHitEvents,
} from '../multiplayer/onlineRoomService';
import {
  applyOnlineTeamSpawnToLocalPlayer,
  enforceUnusedBotVisibility,
  hideAllBotsForOnlineMatch,
  syncOnlineMatchFrame,
} from './onlineMatchSync';
import {
  createDrsRuntimeState,
  DrsRuntimeState,
  updateDynamicResolutionGovernor,
} from './dynamicResolutionGovernor';
import { emitHudIfChanged, HudRadarCacheEntry } from './hudBridge';
import { clearSharedMaterialCache } from './scenePerfOptimizer';
import { disposeAllSecondaryWebGLRenderers } from './webglContextGuard';
import { CombatRayHit, raycastCombatShot } from './combatRaycast';
import { attemptFireWeapon as runAttemptFireWeapon, executeSingleShot as runExecuteSingleShot } from './weaponFireSystem';
import { handleTargetHit as runHandleTargetHit } from './weaponHitSystem';
import { getWeaponFeel } from '../data/weaponFeel';
import {
  configureTacticalPostFx,
  createTacticalPostFx,
  disposeTacticalPostFx,
  renderWithTacticalPostFx,
  TacticalPostFxState,
} from '../graphics/tacticalPostFx';
import { applyAimAssistToLookDelta } from './aimAssist';
import { applyLookDelta, type LookInputState } from './engineLookInput';
import {
  configureIntermittentShadows,
  createShadowBudgetState,
  followKeyLightShadowFrustum,
  requestShadowRefresh,
  ShadowBudgetState,
  tickShadowBudget,
} from './shadowUpdateBudget';

// Pre-allocated math helpers outside the frame loop (Zero GC)
import {
  _resolvedHoriz,
  _forward,
  _right,
  _up,
  _moveVec,
  _rayOrigin,
  _rayDir,
  _worldPos,
  _worldPos2,
  _hitNormal,
  _targetToPlayer,
  _hipPosPistol,
  _hipPosRifle,
} from './engineMathTemps';
import { updateReloadStateMachine as runReloadStateMachine } from './reloadStateMachine';
import { updatePlayerMovementAndCollision as runPlayerMovement } from './playerMovementSystem';
import { checkHorizontalCollision as runHorizontalCollision } from './playerCollisionSystem';
import { updateWeaponKinematicsAndOptics as runWeaponKinematics } from './weaponKinematicsSystem';
import { updateTargetsAndCombatAI as runTargetsCombatAI } from './targetsCombatAiSystem';
import { createMantleState, MantleState } from './playerMantleSystem';
import {
  applyIncomingClassSupportToLocal,
  applyPlayerCombatDamage,
  createClassSupportRuntime,
  isLocalPlayerPendingRevive,
  markAllyDownForRevive,
  markLocalPlayerDownForRevive,
  resetClassSupportForRound,
  setClassSupportHeld,
  updateClassSupport,
  useClassSupport,
  ClassSupportRuntime,
} from './classSupportSystem';
import { PlayerGestureThirdPerson } from './playerGestureThirdPerson';
import {
  ClassKitPropSystem,
  preloadClassKitProps,
} from './classKitPropSystem';
import { C4PlantViewmodel, preloadC4BombProp } from './c4BombProp';
import { preloadMixamoAnimPack } from './mixamoAnimPackLoader';

export class TacticalFPSEngine {
  private container: HTMLElement;
  private onHudUpdate: (state: HudState) => void;
  private unsubOnlineHits: (() => void) | null = null;
  private unsubOnlineClassSupport: (() => void) | null = null;
  /** Warface local-player revive window (bomb modes). */
  private playerReviveUntilSec = 0;
  private playerReviveExpired = false;
  private playerCorpsePos: THREE.Vector3 | null = null;
  private _allyReviveCharge = 0;

  public readonly isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private pitchObject: THREE.Object3D;
  private yawObject: THREE.Object3D;

  private textures: ProceduralTextures;
  private weaponRig: TacticalWeaponRig;
  private standerTiroLevelData: StanderTiroBundle;
  private facilityLevelData: TacticalLevelData;
  private yardLevelData: TacticalLevelData;
  private dust2LevelData: Dust2LevelBundle;
  private assaultLevelData: Dust2LevelBundle;
  private industriaLevelData: Dust2LevelBundle;
  private yardBombSystem: YardBombSystem;
  private colliders: ColliderBox[] = [];
  private targets: TacticalTargetEntity[] = [];
  private targetMap = new Map<string, TacticalTargetEntity>();
  private shootableMeshes: THREE.Mesh[] = [];
  private wallStandPositions: THREE.Vector3[] = [];
  private fxPool: BallisticsFXPool;
  private grenadeSystem: TacticalGrenadeSystem;
  private raycaster = new THREE.Raycaster();
  private laserDotMesh: THREE.Mesh;
  private keyLight!: THREE.DirectionalLight;
  private skySystem: TacticalSkySystem;

  // Loop, Timing & Dynamic Resolution Governor (DRS)
  private frameId = 0;
  private isLoopRunning = false;
  private rankUpTimeoutId: number | null = null;
  private disposed = false;
  private lastTime = performance.now();
  private elapsedTime = 0;
  private hitstopTimer = 0;
  private hudSyncTimer = 0;
  private drsState: DrsRuntimeState = createDrsRuntimeState(1.0);
  /** Mirrored for applyGraphicsToEngine / legacy field access. */
  private get currentRenderScale(): number {
    return this.drsState.currentRenderScale;
  }
  private set currentRenderScale(value: number) {
    this.drsState.currentRenderScale = value;
  }
  private hudFingerprint = { value: '' };
  private hudForceEmit = { value: true };
  private aimRaycastTimer = 0;
  private aimRaycastInitialized = false;
  private cachedAimHits: THREE.Intersection[] = [];
  private isWindowFocused = true;
  private shadowBudget: ShadowBudgetState = createShadowBudgetState();
  private readonly combatRayHit: CombatRayHit = {
    distance: 0,
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    object: null,
    isEnvironment: false,
  };

  // Input State (Separated Held vs Edge-Triggered + Mobile Touch Analog State)
  private keysHeld = new Set<string>();
  private mouseButtonsHeld = new Set<number>();
  private jumpBufferTimer = 0;
  private coyoteTimer = 0;
  private lastRKeyPressTime = 0;
  private touchMoveX = 0; // -1 (Left) to +1 (Right)
  private touchMoveY = 0; // -1 (Backward) to +1 (Forward)
  private touchSprinting = false;
  private touchFireHeld = false;
  private touchHoldBreath = false;
  private touchLeanToggle: -1 | 0 | 1 = 0;
  private canvasTouchLookId: number | null = null;
  private canvasTouchLastX = 0;
  private canvasTouchLastY = 0;

  // Player Physics & Kinematics
  private playerPos = new THREE.Vector3(-6.8, 0, 3.2);
  private playerVel = new THREE.Vector3();
  private isGrounded = true;
  private yaw = 0;
  private pitch = 0;
  private currentEyeHeight = 1.68;
  private slideTimer = 0;
  private slideDir = new THREE.Vector3();
  private leanTarget: -1 | 0 | 1 = 0;
  private leanCurrent = 0;
  private walkBobPhase = 0;
  private walkBobAmp = 0;
  private sprintPoseAlpha = 0;
  private sprintExhausted = false;
  private landingDip = 0;
  private landingDipVel = 0;
  /** FOV punch from jump/land/slide exit — decays in movement loop. */
  private cameraFovPunch = 0;
  /** Base camera roll before head-bob polish in kinematics. */
  private cameraBaseRoll = 0;
  /** True when slide forced crouch toggle on entry (auto-clear on exit). */
  private slideForcedCrouch = false;
  /** Code-only mantle / vault state (no dedicated mantle GLB). */
  private mantle: MantleState = createMantleState();
  /** Set by movement when horizontal resolve blocks intended forward motion. */
  private mantleWallBlocked = false;
  /** Warface class support kits (ammo / heal+revive / armor). */
  private classSupport: ClassSupportRuntime = createClassSupportRuntime();
  /** Mixamo 3P gestures (mantle hang, CPR, kit use) from Animaçao pack. */
  private playerGesture!: PlayerGestureThirdPerson;
  /** 1P class kit props (ammo crate / medkit / armor plate) held while using support. */
  private classKitProps!: ClassKitPropSystem;
  /** 1P C4 held while planting in bomb modes. */
  private c4PlantView!: C4PlantViewmodel;

  // Weapon & Recoil Spring Kinematics
  private swayPos = new THREE.Vector2();
  private swayVel = new THREE.Vector2();
  private recoilKickZ = 0;
  private recoilPitch = 0;
  private recoilYaw = 0;
  private cameraShake = 0;
  /** Per-weapon recovery multiplier for recoil damp (from weaponFeel). */
  private weaponFeelRecovery = 1;
  private postFx: TacticalPostFxState = createTacticalPostFx();
  private boltCycleOffset = 0;
  private muzzleFlashTimer = 0;
  private fireCooldown = 0;
  private burstRemaining = 0;
  private triggerPulledThisPress = false;
  private sniperChamberTimer = 0;
  private sniperChamberDuration = 1.25;
  private sniperReturnToScopeAfterBolt = false;

  // Premium Cinematic Player Death Camera State (3rd-Person Mixamo Avatar)
  private isPlayerDying = false;
  private deathAnimElapsed = 0;
  private deathSequenceDuration = 2.85;
  private deathOnFinish: (() => void) | null = null;
  private playerDeathTp!: PlayerDeathThirdPersonController;
  private postMatchShowcase!: PostMatchShowcase3D;

  // Reload State Machine
  private reloadTimer = 0;
  private reloadDuration = 1.9;
  private isSpeedReload = false;
  private needsBoltReleaseStage = false;
  private stageSoundFlags = {
    magOut: false,
    magIn: false,
    boltSlap: false,
  };
  private magCheckTimer = 0;

  private primaryWeapon: WeaponId = 'M4_CARBINE';
  private secondaryWeapon: WeaponId = 'P50_PISTOL';
  private cachedRadarTargets: HudRadarCacheEntry[] = [];

  // Public HUD state mirror (All players start with M4_CARBINE as primary and P50_PISTOL as secondary)
  public state: HudState = {
    screen: 'INTRO',
    pointerLocked: false,
    activeWeapon: 'M4_CARBINE',
    primaryWeapon: 'M4_CARBINE',
    secondaryWeapon: 'P50_PISTOL',
    nearWallStand: false,
    focusedWallWeapon: null,
    chambered: 1,
    currentMagRounds: 30,
    magCapacity: 30,
    magazines: [30, 30, 30, 30],
    fragGrenades: 3,
    smokeGrenades: 3,
    equippedGrenade: null,
    isThrowingGrenade: false,
    boltLockedBack: false,
    fireMode: 'AUTO',
    optic: 'iron',
    lpvoZoom: 2.0,
    cantedActive: false,
    suppressorAttached: false,
    muzzleDevice: 'NONE',
    weaponCharm: 'NONE',
    laserActive: false,
    reloadPhase: 'IDLE',
    reloadProgress: 0,
    reloadTypeLabel: '',
    magCheckVisible: false,
    wallTuckAmount: 0,

    health: 100,
    maxHealth: 100,
    armor: 15,
    maxArmor: 15,
    playerClass: 'FUZILEIRO',
    supportKind: 'AMMO',
    supportCharges: 2,
    supportMaxCharges: 2,
    supportCooldownSec: 0,
    supportPrompt: '',
    kitChannelProgress: 0,
    reviveChargeProgress: 0,
    reviveMarkers: [],
    allyNeedMarkers: [],
    stamina: 100,
    isHoldingBreath: false,
    isAds: false,
    adsAlpha: 0,
    stance: 'STAND',
    leanDirection: 0,
    playerPos: { x: -6.8, z: 3.2 },
    playerYaw: 0,
    radarTargets: [],

    drillMode: 'FREE_RANGE',
    score: 0,
    hits: 0,
    shotsFired: 0,
    headshots: 0,
    targetsRemaining: 6,
    totalTargetsInDrill: 6,
    courseTimerSec: 0,
    bestCourseTimeSec: null,
    lastHitZone: null,
    lastShotTelemetry: null,
    shotHistory: [],
    hitMarkerAlpha: 0,
    hitMarkerIsCrit: false,
    damageFlashAlpha: 0,
    killfeed: [],

    // Warface Rank Progression System
    playerXp: 0,
    rankLevel: 1,
    rankTitle: 'Recruta I',
    rankBadge: '★',
    rankBadgeColor: '#94a3b8',
    nextRankXp: 250,
    lastXpGained: 0,
    rankUpNotification: null,

    muted: false,
    dockCollapsed: true,
    touchControlsVisible: true,
    isCrouchingToggled: false,
    isProneToggled: false,
    qualityPreset: 'BALANCED_60',
    dynamicResolutionEnabled: true,
    liveFps: 60,
    renderScalePercent: 100,
    gyroMode: 'OFF',
    gyroSensitivity: 1.0,
    lookSensitivity: 1.0,
    adsSensitivity: 1.0,
    aimAssistStrength: 0.45,
    hapticsEnabled: true,
    isFullscreen: false,
    graphicQuality: 'HIGH',
    fpsLimit: 60,
  };

  constructor(container: HTMLElement, onHudUpdate: (state: HudState) => void) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;

    // Load saved Warface Rank Progression XP
    const savedXp = loadSavedPlayerXp();
    const rankInfo = getRankForXp(savedXp);
    const nextRank = getNextRank(rankInfo.level);

    this.state.playerXp = savedXp;
    this.state.rankLevel = rankInfo.level;
    this.state.rankTitle = rankInfo.title;
    this.state.rankBadge = rankInfo.badge;
    this.state.rankBadgeColor = rankInfo.badgeColor;
    this.state.nextRankXp = nextRank ? nextRank.requiredXp : rankInfo.requiredXp;

    // 1. Mandatory Software-WebGL Guard
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.currentRenderScale = this.isSoftwareGl
      ? 1.0
      : Math.min(window.devicePixelRatio || 1, 1.35);
    this.renderer.setPixelRatio(this.currentRenderScale);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    // PCF (not Soft) — Soft is significantly heavier on mobile GPUs.
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    configureIntermittentShadows(this.renderer);
    container.appendChild(this.renderer.domElement);

    // 2. Scene, Studio IBL Environment (`RoomEnvironment`) & Horizon Fog
    this.scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x0d121a);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(0x0d121a, 0.014);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    pmremGenerator.dispose();

    // 3. Balanced 3-Point Warm/Cool Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.75);
    hemiLight.position.set(0, 30, 0);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.85);
    this.keyLight = keyLight;
    keyLight.position.set(22, 36, 18);
    keyLight.castShadow = !this.isSoftwareGl;
    if (!this.isSoftwareGl) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      const d = 42;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 110;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.55);
    rimLight.position.set(-25, 18, -35);
    this.scene.add(rimLight);

    this.skySystem = new TacticalSkySystem(this.scene, this.keyLight);

    // 4. First-Person Camera Hierarchy (Yaw -> Pitch -> Camera -> WeaponRig)
    this.camera = new THREE.PerspectiveCamera(
      72,
      container.clientWidth / container.clientHeight,
      0.03,
      160
    );
    this.pitchObject = new THREE.Object3D();
    this.pitchObject.add(this.camera);

    this.yawObject = new THREE.Object3D();
    this.yawObject.position.set(this.playerPos.x, this.currentEyeHeight, this.playerPos.z);
    this.yawObject.add(this.pitchObject);
    this.scene.add(this.yawObject);

    // 5. Procedural Textures, Weapon Rig, Level & Ballistics Pool
    this.textures = createProceduralTextures(this.renderer);
    this.weaponRig = buildTacticalWeaponRig(this.textures, this.isSoftwareGl);
    this.camera.add(this.weaponRig.root);
    this.playerDeathTp = new PlayerDeathThirdPersonController(
      this.scene,
      this.isSoftwareGl
    );
    this.playerGesture = new PlayerGestureThirdPerson(
      this.scene,
      this.isSoftwareGl
    );
    this.classKitProps = new ClassKitPropSystem(this.camera);
    this.c4PlantView = new C4PlantViewmodel(this.camera);
    void preloadMixamoAnimPack();
    void preloadClassKitProps();
    void preloadC4BombProp();
    this.postMatchShowcase = new PostMatchShowcase3D(
      this.scene,
      this.isSoftwareGl
    );

    const standerData = buildStanderTiroLevel(this.isSoftwareGl);
    this.standerTiroLevelData = standerData;
    this.scene.add(standerData.levelGroup);

    const levelData = buildPreProductionLevel(this.textures, this.isSoftwareGl);
    this.facilityLevelData = levelData;
    this.facilityLevelData.levelGroup.visible = false;
    this.scene.add(levelData.levelGroup);

    this.yardLevelData = buildYardLevel(
      this.textures,
      this.isSoftwareGl
    );
    this.yardLevelData.levelGroup.visible = false;
    this.scene.add(this.yardLevelData.levelGroup);

    this.dust2LevelData = buildDust2Level(this.isSoftwareGl);
    this.dust2LevelData.levelGroup.visible = false;
    this.scene.add(this.dust2LevelData.levelGroup);

    this.assaultLevelData = buildAssaultLevel(this.isSoftwareGl);
    this.assaultLevelData.levelGroup.visible = false;
    this.scene.add(this.assaultLevelData.levelGroup);

    this.industriaLevelData = buildIndustriaLevel(this.isSoftwareGl);
    this.industriaLevelData.levelGroup.visible = false;
    this.scene.add(this.industriaLevelData.levelGroup);

    this.yardBombSystem = new YardBombSystem(this.scene);

    this.colliders = standerData.colliders;
    this.targets = standerData.targets;
    this.targetMap.clear();
    for (let i = 0; i < this.targets.length; i++) {
      this.targetMap.set(this.targets[i].id, this.targets[i]);
    }
    this.shootableMeshes = standerData.shootableMeshes;
    this.wallStandPositions = standerData.wallStandPositions;

    // Start with built-in Iron Sights on the default P50 Heavy Pistol
    this.weaponRig.holoSightGroup.visible = false;
    this.weaponRig.lpvoScopeGroup.visible = false;
    this.weaponRig.ironSightsGroup.visible = true;

    this.fxPool = new BallisticsFXPool(this.scene);
    this.grenadeSystem = new TacticalGrenadeSystem(
      this.scene,
      this.camera,
      (blastCenter, blastRadius) =>
        this.handleFragGrenadeDetonation(blastCenter, blastRadius),
      (type) => {
        if (type === 'FRAG') {
          this.state.fragGrenades = Math.max(0, this.state.fragGrenades - 1);
        } else {
          this.state.smokeGrenades = Math.max(0, this.state.smokeGrenades - 1);
        }
        this.state.equippedGrenade = null;
        this.emitHud();
      }
    );

    // World-space green laser impact dot
    this.laserDotMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x10b981 })
    );
    this.laserDotMesh.visible = false;
    this.scene.add(this.laserDotMesh);

    // Pre-warm shaders on GPU
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    // Do NOT start requestAnimationFrame loop during INTRO / LOADING screens
  }

  public async preloadAssets(
    onProgress: (pct: number, statusLabel: string) => void
  ): Promise<void> {
    this.stopLoop();
    try {
      await loadStanderTiroMapGeometry(
        this.standerTiroLevelData,
        this.isSoftwareGl
      );
    } catch {
      // Continua se o carregamento inicial falhar
    }
    await AssetPreloader.executePreloadSequence(
      this.renderer,
      this.scene,
      this.camera,
      this.isSoftwareGl,
      onProgress
    );
    preloadCharacterAndBombAudio();
    this.grenadeSystem.prewarmShadersAndTextures(
      this.renderer,
      this.isSoftwareGl
    );
    if (!this.isSoftwareGl) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Loading 2 (Match/Arena - Vanguard vs. Blackthorn):
   * Pausa o loop de renderização para evitar frame drops, baixa o .glb via
   * THREE.LoadingManager + DRACOLoader, gera colisores Box3/triângulos,
   * envia texturas para a VRAM e compila todos os shaders antes de liberar a partida.
   */
  public async prepareMapForMatch(
    mode: DrillMode,
    onProgress: (pct: number, statusLabel: string) => void
  ): Promise<void> {
    this.stopLoop();
    await prepareMatchArena({
      mode,
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera,
      isSoftwareGl: this.isSoftwareGl,
      standerTiroLevelData: this.standerTiroLevelData,
      facilityLevelData: this.facilityLevelData,
      yardLevelData: this.yardLevelData,
      dust2LevelData: this.dust2LevelData,
      assaultLevelData: this.assaultLevelData,
      industriaLevelData: this.industriaLevelData,
      skySystem: this.skySystem,
      grenadeSystem: this.grenadeSystem,
      onProgress,
    });
  }

  /**
   * Limpa geometrias, materiais, texturas e colisores do mapa da partida da RAM/GPU
   * ao retornar para o Lobby, prevenindo vazamento de memória (Memory Leak) no celular.
   */
  public cleanupMatchAssets(): void {
    cleanupMatchArenaAssets(
      this.renderer,
      this.standerTiroLevelData,
      this.facilityLevelData,
      this.yardLevelData,
      this.dust2LevelData,
      this.assaultLevelData,
      this.industriaLevelData,
      this.grenadeSystem
    );
    this.colliders = this.standerTiroLevelData.colliders;
    this.targets = this.standerTiroLevelData.targets;
    this.targetMap.clear();
    for (let i = 0; i < this.targets.length; i++) {
      this.targetMap.set(this.targets[i].id, this.targets[i]);
    }
    this.shootableMeshes = this.standerTiroLevelData.shootableMeshes;
    this.wallStandPositions = this.standerTiroLevelData.wallStandPositions;
    this.cachedRadarTargets = [];

    this.unsubOnlineHits?.();
    this.unsubOnlineHits = subscribeOnlineHitEvents((hit) => {
      if (!isOnlineMatchActive()) return;
      const localOp = getLocalOnlinePlayerState();
      if (hit.lethal && hit.attackerUid !== localOp?.uid) {
        this.registerKill(
          hit.attackerCallsign,
          hit.attackerTeam,
          hit.targetCallsign,
          hit.targetTeam,
          hit.weaponId,
          hit.isHeadshot
        );
      }
      if (localOp && hit.targetUid === localOp.uid) {
        if (
          this.isPlayerDying ||
          this.playerDeathTp?.isActive() ||
          isLocalPlayerPendingRevive(this as any)
        )
          return;
        soundEngine.playImpact(hit.isHeadshot ? 'HEADSHOT' : 'TORSO');
        mobileHardware.vibrateDamage();
        playRealPlayerHitGrunt(hit.isHeadshot);
        applyPlayerCombatDamage(this as any, hit.damage, hit.isHeadshot);
        this.state.damageFlashAlpha = hit.isHeadshot ? 0.95 : 0.75;
        {
          const flinch = getWeaponFeel(this.state.activeWeapon).flinchScale;
          this.cameraShake = (hit.isHeadshot ? 0.024 : 0.012) * flinch;
          this.pitch = THREE.MathUtils.clamp(
            this.pitch - (hit.isHeadshot ? 0.018 : 0.01) * flinch,
            -Math.PI * 0.46,
            Math.PI * 0.46
          );
        }
        if (this.state.health <= 0) {
          const room = getActiveOnlineRoom();
          const atk = room?.players?.[hit.attackerUid];
          const killerPos =
            atk != null
              ? new THREE.Vector3(atk.x, atk.y, atk.z)
              : null;
          this.triggerPlayerDeathSequence(
            hit.isHeadshot,
            hit.attackerCallsign,
            hit.attackerTeam,
            hit.weaponId,
            () => {
              const bomb =
                this.state.drillMode === 'YARD_BOMB_5V5' ||
                this.state.drillMode === 'DUST2_BOMB_5V5' ||
                this.state.drillMode === 'ASSAULT_BOMB_5V5' ||
                this.state.drillMode === 'INDUSTRIA_BOMB_5V5';
              if (bomb) {
                const specBot = this.playerDeathTp.startSpectating(
                  this.targets as YardBotEntity[]
                );
                if (specBot && this.yardBombSystem.info.roundState === 'PLAYING') {
                  this.yardBombSystem.info.isSpectating = true;
                  this.yardBombSystem.info.spectatedCallsign =
                    specBot.callsign || 'VANGUARD-02';
                  this.yardBombSystem.info.spectatedWeapon =
                    specBot.weaponId || 'M4_CARBINE';
                  this.yardBombSystem.info.spectatedHealth = Math.max(
                    0,
                    specBot.health
                  );
                  this.state.damageFlashAlpha = 0;
                }
              }
              this.emitHud();
            },
            killerPos
          );
        }
        this.emitHud();
      }
    });

    this.unsubOnlineClassSupport?.();
    this.unsubOnlineClassSupport = subscribeOnlineClassSupport((evt) => {
      if (!isOnlineMatchActive()) return;
      const localOp = getLocalOnlinePlayerState();
      if (!localOp || evt.targetUid !== localOp.uid) return;
      if (evt.fromUid === localOp.uid) return;
      applyIncomingClassSupportToLocal(
        this as any,
        evt.kind,
        evt.amount,
        evt.phase || 'APPLY'
      );
    });
  }

  // =========================================================================
  // PUBLIC CONTROLS FOR UI OVERLAYS & KEYBOARD
  // =========================================================================
  public startGame(mode?: DrillMode): void {
    if (mode) {
      this.state.drillMode = mode;
    }
    // Free menu/inspection WebGL contexts so the match owns the GPU.
    disposeAllSecondaryWebGLRenderers();
    requestShadowRefresh(this.shadowBudget);
    this.resetScenario(this.state.drillMode);
    this.state.screen = 'PLAYING';
    this.hudForceEmit.value = true;
    this.startLoop();
    if (this.state.gyroMode !== 'OFF') {
      void this.enableGyroSensor();
    }
    this.requestPointerLock();
    this.emitHud(true);
  }

  public resumeGame(): void {
    this.state.screen = 'PLAYING';
    this.startLoop();
    this.requestPointerLock();
    this.emitHud();
  }

  public pauseGame(): void {
    if (this.state.screen === 'PLAYING') {
      this.state.screen = 'PAUSED';
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      this.emitHud();
    }
  }

  public returnToMainMenu(): void {
    stopMatchEndFanfare();
    if (isOnlineMatchActive()) {
      void leaveActiveRoom();
    }
    if (this.weaponRig?.root) {
      this.postMatchShowcase?.stop(this.camera, this.weaponRig.root);
      this.playerDeathTp?.stop(this.camera, this.weaponRig.root);
    }
    this.cleanupMatchAssets();
    this.state.screen = 'MAIN_MENU';
    this.startLoop();
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    this.emitHud();
  }

  public getCurrentGroundHeight(x: number, y: number, z: number): number {
    if (this.state.drillMode === 'DUST2_BOMB_5V5') {
      return this.dust2LevelData.collider.getGroundHeight(x, y, z);
    }
    if (this.state.drillMode === 'ASSAULT_BOMB_5V5') {
      return this.assaultLevelData.collider.getGroundHeight(x, y, z);
    }
    if (this.state.drillMode === 'INDUSTRIA_BOMB_5V5') {
      return this.industriaLevelData.collider.getGroundHeight(x, y, z);
    }
    let groundHeight = 0;
    const r = 0.15;
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) {
        if (y >= c.maxY - 0.46 && c.maxY > groundHeight && c.maxY <= 8.0) {
          groundHeight = c.maxY;
        }
      }
    }
    return groundHeight;
  }

  public setScreenState(screen: GameScreenState): void {
    this.state.screen = screen;
    this.hudForceEmit.value = true;
    if (screen === 'INTRO' || screen === 'LOADING' || screen === 'AUTH_LOGIN') {
      this.stopLoop();
    } else {
      this.startLoop();
    }
    if (screen !== 'PLAYING' && document.pointerLockElement) {
      document.exitPointerLock();
    }
    this.emitHud();
  }

  public setDrillMode(mode: DrillMode): void {
    this.state.drillMode = mode;
    this.resetScenario(mode);
    this.emitHud();
  }

  public triggerPlantBomb(): void {
    if (
      this.state.screen !== 'PLAYING' ||
      (this.state.drillMode !== 'YARD_BOMB_5V5' &&
        this.state.drillMode !== 'DUST2_BOMB_5V5' &&
        this.state.drillMode !== 'ASSAULT_BOMB_5V5' &&
        this.state.drillMode !== 'INDUSTRIA_BOMB_5V5')
    ) {
      return;
    }
    this.yardBombSystem?.triggerPlantBomb();
    if (isOnlineMatchActive() && this.yardBombSystem?.info.nearSite) {
      publishBombStateChange('PLANTED', this.yardBombSystem.info.nearSite);
    }
    this.state.yardBomb = { ...this.yardBombSystem.info };
    this.emitHud();
  }

  public cycleSpectator(dir: -1 | 1): void {
    if (!this.playerDeathTp?.isSpectating()) return;
    const specBot = this.playerDeathTp.cycleSpectateTarget(
      this.targets as YardBotEntity[],
      dir
    );
    if (specBot && this.yardBombSystem) {
      soundEngine.playMechanicalSwitch(1.15);
      this.yardBombSystem.info.isSpectating = true;
      this.yardBombSystem.info.spectatedCallsign = specBot.callsign || 'VANGUARD-02';
      this.yardBombSystem.info.spectatedWeapon = specBot.weaponId || 'M4_CARBINE';
      this.yardBombSystem.info.spectatedHealth = Math.max(0, specBot.health);
      this.state.yardBomb = { ...this.yardBombSystem.info };
      this.emitHud();
    }
  }

  public registerKill(
    killerName: string,
    killerTeam: 'VANGUARD' | 'BLACKTHORN',
    victimName: string,
    victimTeam: 'VANGUARD' | 'BLACKTHORN',
    weaponId: WeaponId | 'GRENADE' | 'KNIFE_TACTICAL',
    isHeadshot: boolean
  ): void {
    const now = Date.now();
    const entry: KillfeedEntry = {
      id: `kill_${now}_${Math.random().toString(36).substring(2, 7)}`,
      killerName,
      killerTeam,
      victimName,
      victimTeam,
      weaponId,
      isHeadshot,
      timestamp: now,
    };

    const fresh = this.state.killfeed.filter((e) => now - e.timestamp < 4500);
    this.state.killfeed = [...fresh.slice(-4), entry];

    if (
      this.state.drillMode === 'YARD_BOMB_5V5' ||
      this.state.drillMode === 'DUST2_BOMB_5V5' ||
      this.state.drillMode === 'ASSAULT_BOMB_5V5' ||
      this.state.drillMode === 'INDUSTRIA_BOMB_5V5'
    ) {
      this.yardBombSystem?.recordKillEvent(
        killerName,
        killerTeam,
        victimName,
        victimTeam,
        isHeadshot,
        this.primaryWeapon
      );
      this.state.yardBomb = { ...this.yardBombSystem.info };
    }

    this.emitHud();
  }

  public triggerPlayerDeathSequence(
    isHeadshot: boolean,
    killerCallsign: string,
    killerTeam: 'BLACKTHORN' | 'VANGUARD',
    killerWeapon: WeaponId,
    onFinish: () => void,
    killerPos?: THREE.Vector3 | null
  ): void {
    if (this.isPlayerDying) return;
    this.isPlayerDying = true;
    this.deathAnimElapsed = 0;
    this.deathSequenceDuration = 2.85;
    this.deathOnFinish = onFinish;
    this.cameraShake = isHeadshot ? 0.048 : 0.028;
    this.state.damageFlashAlpha = 1.0;
    this.grenadeSystem?.unequipFromHand();

    const isBombMode =
      this.state.drillMode === 'YARD_BOMB_5V5' ||
      this.state.drillMode === 'DUST2_BOMB_5V5' ||
      this.state.drillMode === 'ASSAULT_BOMB_5V5' ||
      this.state.drillMode === 'INDUSTRIA_BOMB_5V5';
    if (isBombMode) {
      markLocalPlayerDownForRevive(this as any);
    } else {
      this.playerReviveUntilSec = 0;
      this.playerReviveExpired = true;
      this.playerCorpsePos = null;
      this._allyReviveCharge = 0;
    }

    this.playerDeathTp.startDeathSequence(
      this.playerPos,
      this.yaw,
      this.state.stance,
      this.state.activeWeapon,
      isHeadshot,
      this.weaponRig.root,
      killerPos
    );

    if (isHeadshot) {
      soundEngine.playHeadshotDeath();
    } else {
      soundEngine.playImpact('TORSO');
    }

    this.registerKill(
      killerCallsign,
      killerTeam,
      'VOCÊ',
      'VANGUARD',
      killerWeapon,
      isHeadshot
    );

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  public addPlayerXp(amount: number): void {
    // Strict: XP / rank unlocks only from online matches with other humans.
    // FREE_RANGE, offline bomb vs AI, killhouse, and solo rooms grant 0.
    if (amount <= 0) return;
    if (this.state.drillMode === 'FREE_RANGE') return;
    if (!canGrantMatchProgressionRewards()) {
      this.state.lastXpGained = 0;
      return;
    }
    const oldLevel = this.state.rankLevel;
    this.state.playerXp += amount;
    this.state.lastXpGained = amount;
    savePlayerXp(this.state.playerXp);

    const rankInfo = getRankForXp(this.state.playerXp);
    this.state.rankLevel = rankInfo.level;
    this.state.rankTitle = rankInfo.title;
    this.state.rankBadge = rankInfo.badge;
    this.state.rankBadgeColor = rankInfo.badgeColor;

    const nextRank = getNextRank(rankInfo.level);
    this.state.nextRankXp = nextRank ? nextRank.requiredXp : rankInfo.requiredXp;

    // Registra a nova patente para exibir a tela dedicada de promoção no Menu Principal ao sair da partida
    if (rankInfo.level > oldLevel) {
      this.state.rankUpNotification = String(rankInfo.level);
    }
  }

  public acknowledgeRankUp(): void {
    if (this.state.rankUpNotification) {
      addPlayerCash(1500);
      this.state.rankUpNotification = null;
      this.emitHud();
    }
  }

  public syncProgressionFromCloud(xp: number, activeWeapon?: WeaponId): void {
    if (xp > this.state.playerXp) {
      this.state.playerXp = xp;
      const rankInfo = getRankForXp(xp);
      const nextRank = getNextRank(rankInfo.level);
      this.state.rankLevel = rankInfo.level;
      this.state.rankTitle = rankInfo.title;
      this.state.rankBadge = rankInfo.badge;
      this.state.rankBadgeColor = rankInfo.badgeColor;
      this.state.nextRankXp = nextRank ? nextRank.requiredXp : rankInfo.requiredXp;
    }
    if (activeWeapon && activeWeapon !== this.state.activeWeapon) {
      this.selectWeapon(activeWeapon);
    }
    this.emitHud();
  }

  public setOptic(optic: OpticType): void {
    this.state.optic = optic;
    this.state.cantedActive = false;
    this.weaponRig.cantedSightGroup.visible = false;
    this.weaponRig.holoSightGroup.visible = optic === 'holo';
    this.weaponRig.lpvoScopeGroup.visible = optic === 'lpvo';
    this.weaponRig.ironSightsGroup.visible = optic === 'iron';
    const labels: Record<OpticType, string> = {
      iron: 'MIRA DE FERRO PADRÃO ATIVADA',
      holo: 'MIRA HOLOGRÁFICA EOTECH ATIVADA',
      lpvo: 'LUNETA TÁTICA LPVO (1-4X) ATIVADA',
    };
    this.state.reloadTypeLabel = labels[optic];
    this.magCheckTimer = 1.6;
    soundEngine.playMechanicalSwitch(1.1);
    this.emitHud();
  }

  public toggleCantedSight(): void {
    this.state.cantedActive = !this.state.cantedActive;
    this.weaponRig.cantedSightGroup.visible = this.state.cantedActive;
    this.state.reloadTypeLabel = this.state.cantedActive
      ? 'MIRA INCLINADA 45° ATIVADA'
      : 'MIRA INCLINADA 45° DESATIVADA';
    this.magCheckTimer = 1.6;
    soundEngine.playMechanicalSwitch(1.25);
    this.emitHud();
  }

  public toggleSuppressor(): void {
    if (this.state.activeWeapon === 'KNIFE_TACTICAL') {
      soundEngine.playMechanicalSwitch(0.7);
      return;
    }

    const order: Array<typeof this.state.muzzleDevice> = [
      'NONE',
      'SL01_LONG',
      'SC01_SHORT',
      'FH01_FLASH_HIDER',
      'MB01_BRAKE',
      'MC01_COMPENSATOR',
    ];
    const currIdx = order.indexOf(this.state.muzzleDevice);
    const nextIdx = (currIdx + 1) % order.length;
    const nextMuzzle = order[nextIdx];

    this.state.muzzleDevice = nextMuzzle;
    this.weaponRig.attachmentSystem.setMuzzle(nextMuzzle);

    // Suppressor ballistic flags: SL01 and SC01 act as sound suppressors
    this.state.suppressorAttached =
      nextMuzzle === 'SL01_LONG' || nextMuzzle === 'SC01_SHORT';

    const labels: Record<typeof nextMuzzle, string> = {
      NONE: 'DISPOSITIVO DE BOCA REMOVIDO (CANO ORIGINAL)',
      SL01_LONG: 'SUPRESSOR SL01 SLIM LONGO ACOPLADO (.GLB REAL)',
      SC01_SHORT: 'SUPRESSOR SC01 CQB CURTO ACOPLADO (.GLB REAL)',
      FH01_FLASH_HIDER: 'QUEBRA-CHAMAS FH01 PETAL ACOPLADO (.GLB REAL)',
      MB01_BRAKE: 'FREIO DE BOCA MB01 CUT ACOPLADO (.GLB REAL)',
      MC01_COMPENSATOR: 'COMPENSADOR COMPACTO MC01 ACOPLADO (.GLB REAL)',
    };

    this.state.reloadTypeLabel = labels[nextMuzzle];
    this.magCheckTimer = 2.0;
    soundEngine.playMechanicalSwitch(0.85);
    this.emitHud();
  }

  public cycleWeaponCharm(): void {
    const order: Array<typeof this.state.weaponCharm> = [
      'NONE',
      'HONEY_CUB',
      'MICRO_TERMINAL',
      'STARDROP_TEAL',
    ];
    const currIdx = order.indexOf(this.state.weaponCharm);
    const nextIdx = (currIdx + 1) % order.length;
    const nextCharm = order[nextIdx];

    this.state.weaponCharm = nextCharm;
    this.weaponRig.attachmentSystem.setCharm(nextCharm);

    const labels: Record<typeof nextCharm, string> = {
      NONE: 'PINGENTE TÁTICO REMOVIDO',
      HONEY_CUB: 'PINGENTE 3D: URSINHO HONEY CUB ACOPLADO',
      MICRO_TERMINAL: 'PINGENTE 3D: MICRO TERMINAL CYBER ACOPLADO',
      STARDROP_TEAL: 'PINGENTE 3D: STARDROP SMOKE TEAL ACOPLADO',
    };

    this.state.reloadTypeLabel = labels[nextCharm];
    this.magCheckTimer = 2.0;
    soundEngine.playMechanicalSwitch(1.15);
    this.emitHud();
  }

  public toggleLaser(): void {
    this.state.laserActive = !this.state.laserActive;
    this.weaponRig.peqLaserBeam.visible = this.state.laserActive;
    this.laserDotMesh.visible = this.state.laserActive;
    this.state.reloadTypeLabel = this.state.laserActive
      ? 'LASER TÁTICO PEQ-15 ATIVADO'
      : 'LASER TÁTICO PEQ-15 DESATIVADO';
    this.magCheckTimer = 1.6;
    soundEngine.playMechanicalSwitch(1.35);
    this.emitHud();
  }

  public cycleFireMode(): void {
    const order: FireMode[] = ['SEMI', 'BURST', 'AUTO'];
    const idx = (order.indexOf(this.state.fireMode) + 1) % order.length;
    this.state.fireMode = order[idx];
    const modeNames: Record<FireMode, string> = {
      SEMI: 'MODO DE DISPARO: SEMIAUTOMÁTICO (TIRO ÚNICO)',
      BURST: 'MODO DE DISPARO: RAJADA CURTA (3 TIROS)',
      AUTO: 'MODO DE DISPARO: AUTOMÁTICO CONTÍNUO',
    };
    this.state.reloadTypeLabel = modeNames[this.state.fireMode];
    this.magCheckTimer = 1.5;
    soundEngine.playMechanicalSwitch(1.15);
    this.emitHud();
  }

  public toggleWeaponSlot(): void {
    if (this.state.equippedGrenade !== null) {
      this.grenadeSystem?.unequipFromHand();
      this.state.equippedGrenade = null;
      this.selectWeapon(this.state.activeWeapon);
      return;
    }
    if (
      this.state.activeWeapon === 'P50_PISTOL' ||
      this.state.activeWeapon === 'KNIFE_TACTICAL'
    ) {
      this.selectWeapon(this.primaryWeapon);
    } else {
      this.selectWeapon('P50_PISTOL');
    }
  }

  public selectWeapon(weaponId: WeaponId): void {
    this.grenadeSystem?.unequipFromHand();
    this.state.equippedGrenade = null;
    if (weaponId === 'P50_PISTOL') {
      this.secondaryWeapon = 'P50_PISTOL';
    } else if (weaponId !== 'KNIFE_TACTICAL') {
      this.primaryWeapon = weaponId;
    }
    this.state.primaryWeapon = this.primaryWeapon;
    this.state.secondaryWeapon = 'P50_PISTOL';
    this.state.activeWeapon = weaponId;
    this.weaponRig.setActiveWeapon(weaponId);
    this.state.reloadPhase = 'IDLE';
    this.state.reloadProgress = 0;
    this.state.boltLockedBack = false;
    this.state.chambered = 1;
    this.sniperChamberTimer = 0;
    this.sniperReturnToScopeAfterBolt = false;
    this.weaponRig.root.visible = true;

    switch (weaponId) {
      case 'P50_PISTOL':
        this.state.magCapacity = 12;
        this.state.currentMagRounds = 12;
        this.state.magazines = [12, 12, 12, 12];
        this.state.fireMode = 'SEMI';
        this.setOptic('iron');
        this.state.reloadTypeLabel = 'EQUIPADO: MARK 23 PISTOL (.45 ACP)';
        break;
      case 'SMG_45':
        this.state.magCapacity = 32;
        this.state.currentMagRounds = 32;
        this.state.magazines = [32, 32, 32, 32];
        this.state.fireMode = 'AUTO';
        this.setOptic('iron');
        this.state.reloadTypeLabel = 'EQUIPADO: SMG .45 TÁTICA (.45 ACP)';
        break;
      case 'SMG_MP5':
        this.state.magCapacity = 30;
        this.state.currentMagRounds = 30;
        this.state.magazines = [30, 30, 30, 30];
        this.state.fireMode = 'AUTO';
        this.setOptic('iron');
        this.state.reloadTypeLabel = 'EQUIPADO: MP5A3 TÁTICA (9x19MM)';
        break;
      case 'SHOTGUN_12':
        this.state.magCapacity = 6;
        this.state.currentMagRounds = 6;
        this.state.magazines = [6, 6, 6, 6];
        this.state.fireMode = 'SEMI';
        this.setOptic('iron');
        this.state.reloadTypeLabel = 'EQUIPADO: M870 BREACHER (CALIBRE 12GA)';
        break;
      case 'SHOTGUN_SPAS':
        this.state.magCapacity = 8;
        this.state.currentMagRounds = 8;
        this.state.magazines = [8, 8, 8, 8];
        this.state.fireMode = 'SEMI';
        this.setOptic('iron');
        this.state.reloadTypeLabel = 'EQUIPADO: SPAS-12 TÁTICA (CALIBRE 12GA)';
        break;
      case 'M4_CARBINE':
        this.state.magCapacity = 30;
        this.state.currentMagRounds = 30;
        this.state.magazines = [30, 30, 30, 30];
        this.state.fireMode = 'AUTO';
        this.setOptic('iron');
        this.state.reloadTypeLabel = 'EQUIPADO: M4A1 SOPMOD (5.56MM)';
        break;
      case 'CARBINE_AR':
        this.state.magCapacity = 30;
        this.state.currentMagRounds = 30;
        this.state.magazines = [30, 30, 30, 30];
        this.state.fireMode = 'AUTO';
        this.setOptic('iron');
        this.state.reloadTypeLabel = 'EQUIPADO: CARABINA TÁTICA (5.56MM)';
        break;
      case 'AK47_RIFLE':
        this.state.magCapacity = 30;
        this.state.currentMagRounds = 30;
        this.state.magazines = [30, 30, 30, 30];
        this.state.fireMode = 'AUTO';
        this.setOptic('iron');
        this.state.reloadTypeLabel = 'EQUIPADO: AK-47 COMANDO (7.62MM)';
        break;
      case 'AK12_RIFLE':
        this.state.magCapacity = 30;
        this.state.currentMagRounds = 30;
        this.state.magazines = [30, 30, 30, 30];
        this.state.fireMode = 'AUTO';
        this.setOptic('iron');
        this.state.reloadTypeLabel = 'EQUIPADO: AK-12 SPETSNAZ (5.45MM)';
        break;
      case 'L49_LMG':
        this.state.magCapacity = 100;
        this.state.currentMagRounds = 100;
        this.state.magazines = [100, 100, 100];
        this.state.fireMode = 'AUTO';
        this.setOptic('iron');
        this.state.reloadTypeLabel = 'EQUIPADO: LMG PESADA (5.56MM)';
        break;
      case 'SNIPER_BOLT':
        this.state.magCapacity = 5;
        this.state.currentMagRounds = 5;
        this.state.magazines = [5, 5, 5, 5];
        this.state.fireMode = 'SEMI';
        this.setOptic('iron');
        this.state.reloadTypeLabel = 'EQUIPADO: SNIPER BOLT-ACTION (.338 LAPUA)';
        break;
      case 'SNIPER_TACTICAL':
        this.state.magCapacity = 10;
        this.state.currentMagRounds = 10;
        this.state.magazines = [10, 10, 10, 10];
        this.state.fireMode = 'SEMI';
        this.setOptic('iron');
        this.state.reloadTypeLabel = 'EQUIPADO: SNIPER TÁTICA (.308 WIN)';
        break;
      case 'KNIFE_TACTICAL':
        this.state.magCapacity = 1;
        this.state.currentMagRounds = 1;
        this.state.magazines = [1];
        this.state.fireMode = 'SEMI';
        this.setOptic('iron');
        this.state.reloadTypeLabel = 'EQUIPADO: FACA TÁTICA COMBATE';
        break;
    }

    this.magCheckTimer = 1.8;
    soundEngine.playWeaponSwap();
    if (
      (weaponId === 'AK47_RIFLE' || weaponId === 'AK12_RIFLE') &&
      this.state.screen === 'PLAYING'
    ) {
      setTimeout(() => {
        if (
          this.state.screen === 'PLAYING' &&
          this.state.activeWeapon === weaponId
        ) {
          soundEngine.playAk47BoltRack();
        }
      }, 280);
    }
    this.emitHud();
  }

  public triggerWeaponInspect(): void {
    if (this.state.equippedGrenade !== null) {
      this.grenadeSystem?.unequipFromHand();
      this.state.equippedGrenade = null;
      this.weaponRig.root.visible = true;
    }
    if (
      this.state.reloadPhase !== 'IDLE' &&
      this.state.reloadPhase !== 'MAG_CHECK'
    ) {
      return;
    }
    this.state.reloadPhase = 'IDLE';
    this.weaponRig.triggerInspectAnimation();
    const names: Record<WeaponId, string> = {
      P50_PISTOL: 'INSPECIONANDO MARK 23 PISTOL (.45 ACP)',
      SMG_45: 'INSPECIONANDO SMG .45 TÁTICA (.45 ACP)',
      SMG_MP5: 'INSPECIONANDO MP5A3 TÁTICA (9x19MM)',
      SHOTGUN_12: 'INSPECIONANDO M870 BREACHER (CALIBRE 12GA)',
      SHOTGUN_SPAS: 'INSPECIONANDO SPAS-12 TÁTICA (CALIBRE 12GA)',
      M4_CARBINE: 'INSPECIONANDO M4A1 SOPMOD (5.56MM)',
      CARBINE_AR: 'INSPECIONANDO CARABINA TÁTICA (5.56MM)',
      AK47_RIFLE: 'INSPECIONANDO AK-47 COMANDO (7.62MM)',
      AK12_RIFLE: 'INSPECIONANDO AK-12 SPETSNAZ (5.45MM)',
      L49_LMG: 'INSPECIONANDO LMG PESADA (5.56MM)',
      SNIPER_BOLT: 'INSPECIONANDO SNIPER BOLT-ACTION (.338 LAPUA)',
      SNIPER_TACTICAL: 'INSPECIONANDO SNIPER TÁTICA (.308 WIN)',
      KNIFE_TACTICAL: 'INSPECIONANDO FACA TÁTICA DE COMBATE',
    };
    this.state.reloadTypeLabel = names[this.state.activeWeapon];
    this.magCheckTimer = 2.4;
    if (
      this.state.activeWeapon === 'AK47_RIFLE' ||
      this.state.activeWeapon === 'AK12_RIFLE'
    ) {
      soundEngine.playAk47BoltRack();
    } else {
      soundEngine.playMechanicalSwitch(0.95);
    }
    this.emitHud();
  }

  /** Class support kit (ammo crate / medkit+defib / armor). Key U / dock +. */
  public resupplyAmmo(): void {
    useClassSupport(this as any);
  }

  public setClassSupportHeld(held: boolean): void {
    setClassSupportHeld(this as any, held);
  }

  private lastGrenadeEquipTime = 0;

  public throwGrenade(type: GrenadeType): void {
    if (this.state.screen !== 'PLAYING') return;
    if (this.grenadeSystem.isThrowing()) return;

    // If this grenade type is ALREADY held in the player's hand, clicking it again triggers the pin-pull & throw!
    if (this.state.equippedGrenade === type) {
      this.useEquippedGrenade();
      return;
    }

    // Step 1: Equip the grenade in the player's hand & show the 3D landing trajectory arc!
    if (type === 'FRAG') {
      if (this.state.fragGrenades <= 0) {
        soundEngine.playMechanicalSwitch(0.75);
        this.state.reloadTypeLabel =
          'SEM GRANADAS DE FRAGMENTAÇÃO — REABASTEÇA NO BOTÃO [+]';
        this.magCheckTimer = 1.5;
        this.emitHud(true);
        return;
      }
      this.state.reloadTypeLabel = 'FRAG PRONTA — ATIRE PARA JOGAR';
    } else {
      if (this.state.smokeGrenades <= 0) {
        soundEngine.playMechanicalSwitch(0.75);
        this.state.reloadTypeLabel =
          'SEM GRANADAS DE FUMAÇA (SMOKE) — REABASTEÇA NO BOTÃO [+]';
        this.magCheckTimer = 1.5;
        this.emitHud(true);
        return;
      }
      this.state.reloadTypeLabel = 'SMOKE PRONTA — ATIRE PARA JOGAR';
    }

    // Instant feedback first (haptic + state), then light equip — avoid HUD/startTransition hitch.
    this.lastGrenadeEquipTime = performance.now();
    this.state.isAds = false;
    this.state.reloadPhase = 'IDLE';
    this.state.equippedGrenade = type;
    this.magCheckTimer = 1.6;
    mobileHardware.vibratePinPull();
    this.grenadeSystem.equipInHand(type);
    this.emitHud(true);
  }

  public useEquippedGrenade(): void {
    if (this.state.screen !== 'PLAYING') return;
    if (!this.state.equippedGrenade || this.grenadeSystem.isThrowing()) return;
    // Was 100ms — felt like lag on second tap / fire-to-throw.
    if (performance.now() - this.lastGrenadeEquipTime < 40) return;

    const type = this.state.equippedGrenade;
    if (this.grenadeSystem.triggerPinPullAndThrow()) {
      this.state.isThrowingGrenade = true;
      this.state.reloadTypeLabel =
        type === 'FRAG' ? 'ARREMESSANDO FRAG!' : 'LANÇANDO SMOKE!';
      this.magCheckTimer = 1.2;
      this.emitHud(true);
    }
  }

  private handleFragGrenadeDetonation(
    blastCenter: THREE.Vector3,
    blastRadius: number
  ): void {
    // Spawn extra metallic/fire spark burst at detonation point
    _hitNormal.set(0, 1, 0);
    this.fxPool.spawnImpactFX(blastCenter, _hitNormal, true, true);

    // Camera trauma shake, Shellshock Tinnitus & strong physical phone vibration on Frag explosion
    const playerDist = this.playerPos.distanceTo(blastCenter);
    const shakeFactor =
      playerDist < 28 ? Math.max(0.35, 1 - playerDist / 28) : 0.35;
    this.cameraShake = Math.max(this.cameraShake, 0.038 * shakeFactor);
    mobileHardware.vibrateExplosion(shakeFactor);
    triggerShellshockTinnitus(blastCenter, this.playerPos);

    let targetsHitCount = 0;
    let killsCount = 0;

    for (let i = 0; i < this.targets.length; i++) {
      const t = this.targets[i];
      if (t.isDown || (t as YardBotEntity).isAlly) continue;

      const dist = t.root.position.distanceTo(blastCenter);
      if (dist > blastRadius) continue;

      targetsHitCount++;
      this.state.hits += 1;

      if (t.type === 'STEEL_GONG') {
        soundEngine.playImpact('STEEL_GONG');
        t.hitTiltVelocity = -18.0;
        this.state.score += 100;
        continue;
      }

      // Radial fragmentation blast damage (up to 190 at center)
      const falloff = Math.max(0.25, 1 - dist / (blastRadius * 1.1));
      const blastDmg = Math.round(190 * falloff);

      if (t.armorHealth > 0) {
        t.armorHealth = 0;
        if (t.armorMesh) t.armorMesh.visible = false;
      }

      t.health -= blastDmg;
      t.hitTiltVelocity = -16.0;

      if (t.health <= 0) {
        killsCount++;
        t.isDown = true;
        t.lastDeathWasHeadshot = false;
        t.downTimer = this.state.drillMode === 'FREE_RANGE' ? 2.6 : 9999;
        t.isTelegraphing = false;
        if (t.laserLine) t.laserLine.visible = false;
        this.state.score += 150;
        this.state.lastHitZone = 'KILL';
        const bot = t as YardBotEntity;
        this.registerKill(
          'VOCÊ',
          'VANGUARD',
          bot.callsign || 'INIMIGO-BT',
          'BLACKTHORN',
          'GRENADE',
          false
        );
      } else {
        this.state.score += 55;
        this.state.lastHitZone = 'TORSO';
      }
    }

    if (targetsHitCount > 0) {
      this.state.hitMarkerAlpha = 1.0;
      this.state.hitMarkerIsCrit = killsCount > 0;
      playRealHitmarkerSound(killsCount > 0);
      this.state.reloadTypeLabel =
        killsCount > 0
          ? `EXPLOSÃO FRAG! ${killsCount} ALVO(S) ELIMINADO(S) (+${killsCount * 120} XP)`
          : `IMPACTO DE FRAGMENTAÇÃO EM ${targetsHitCount} ALVO(S)!`;
      this.magCheckTimer = 2.0;

      if (
        this.state.drillMode === 'KILLHOUSE_BLITZ' ||
        this.state.drillMode === 'TACTICAL_WAVE' ||
        this.state.drillMode === 'YARD_BOMB_5V5' ||
        this.state.drillMode === 'DUST2_BOMB_5V5' ||
        this.state.drillMode === 'ASSAULT_BOMB_5V5' ||
        this.state.drillMode === 'INDUSTRIA_BOMB_5V5'
      ) {
        const remaining = this.targets.filter(
          (t) =>
            t.sector === 'KILLHOUSE' &&
            !t.isDown &&
            !(t as YardBotEntity).isAlly
        ).length;
        this.state.targetsRemaining = remaining;

        if (
          remaining === 0 &&
          (this.state.drillMode === 'KILLHOUSE_BLITZ' ||
            this.state.drillMode === 'TACTICAL_WAVE')
        ) {
          if (
            this.state.bestCourseTimeSec === null ||
            this.state.courseTimerSec < this.state.bestCourseTimeSec
          ) {
            this.state.bestCourseTimeSec = Number(
              this.state.courseTimerSec.toFixed(2)
            );
          }
          this.addPlayerXp(350);
          this.state.screen = 'VICTORY';
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
        }
      }
    }

    this.emitHud();
  }

  public toggleMute(): void {
    this.state.muted = !this.state.muted;
    soundEngine.muted = this.state.muted;
    this.emitHud();
  }

  public toggleDockCollapsed(): void {
    this.state.dockCollapsed = !this.state.dockCollapsed;
    this.emitHud();
  }

  public toggleTouchControlsVisible(): void {
    this.state.touchControlsVisible = !this.state.touchControlsVisible;
    this.emitHud();
  }

  public setTouchMovement(moveX: number, moveY: number, sprinting: boolean): void {
    this.touchMoveX = THREE.MathUtils.clamp(moveX, -1, 1);
    this.touchMoveY = THREE.MathUtils.clamp(moveY, -1, 1);
    this.touchSprinting = sprinting;
  }

  public applyTouchLookDelta(dx: number, dy: number): void {
    const assistTargets = (this.targets || []).map((t) => ({
      position: t.root.position,
      isDown: t.isDown,
      isAlly: Boolean((t as { isAlly?: boolean }).isAlly),
    }));
    const assisted = applyAimAssistToLookDelta(
      dx,
      dy,
      this.camera,
      assistTargets,
      this.state.aimAssistStrength || 0,
      this.state.isAds
    );
    applyLookDelta(
      this.state,
      this as unknown as LookInputState,
      assisted.dx,
      assisted.dy
    );
  }

  public setAimAssistStrength(strength: number): void {
    this.state.aimAssistStrength = THREE.MathUtils.clamp(strength, 0, 1);
    this.emitHud();
  }

  public configurePostFx(opts: {
    enabled: boolean;
    sharpen?: number;
    bloom?: number;
    exposure?: number;
    lift?: number;
  }): void {
    configureTacticalPostFx(this.postFx, this.renderer, {
      enabled: opts.enabled,
      sharpen: opts.sharpen ?? 0.2,
      bloom: opts.bloom ?? 0.12,
      exposure: opts.exposure,
      lift: opts.lift,
    });
  }

  public setTouchFireHeld(held: boolean): void {
    if (this.state.screen !== 'PLAYING') {
      this.touchFireHeld = false;
      return;
    }
    const wasHeld = this.touchFireHeld;
    this.touchFireHeld = held;
    if (held && !wasHeld) {
      this.triggerPulledThisPress = false;
      this.attemptFireWeapon();
    } else if (!held) {
      this.triggerPulledThisPress = false;
    }
  }

  public toggleAds(): void {
    if (this.state.screen !== 'PLAYING') return;
    if (this.state.equippedGrenade !== null) {
      this.grenadeSystem?.unequipFromHand();
      this.state.equippedGrenade = null;
      this.weaponRig.root.visible = true;
    }
    if (this.sniperChamberTimer > 0) {
      this.sniperReturnToScopeAfterBolt = !this.sniperReturnToScopeAfterBolt;
      soundEngine.playMechanicalSwitch(1.05);
      this.emitHud();
      return;
    }
    this.state.isAds = !this.state.isAds;
    if (!this.state.isAds) {
      this.touchHoldBreath = false;
    }
    soundEngine.playMechanicalSwitch(1.05);
    this.emitHud();
  }

  public triggerJump(): void {
    if (this.state.screen !== 'PLAYING') return;
    this.state.isCrouchingToggled = false;
    this.state.isProneToggled = false;
    this.slideTimer = 0;
    this.jumpBufferTimer = 0.18;
    this.emitHud();
  }

  public triggerProne(): void {
    if (this.state.screen !== 'PLAYING') return;
    this.slideTimer = 0;
    this.state.isProneToggled = !this.state.isProneToggled;
    if (this.state.isProneToggled) {
      this.state.isCrouchingToggled = false;
    }
    soundEngine.playMechanicalSwitch(0.75);
    this.emitHud();
  }

  public toggleCrouchOrSlide(): void {
    if (this.state.screen !== 'PLAYING') return;
    const isMovingForwardFast =
      (this.touchSprinting ||
        (this.keysHeld.has('ShiftLeft') && this.keysHeld.has('KeyW')) ||
        this.touchMoveY > 0.75) &&
      this.isGrounded &&
      this.slideTimer <= 0;

    if (isMovingForwardFast && !this.state.isCrouchingToggled && !this.state.isProneToggled) {
      this.slideTimer = 0.72;
      this.camera.getWorldDirection(_forward);
      _forward.y = 0;
      _forward.normalize();
      this.slideDir.copy(_forward);
      this.slideForcedCrouch = !this.state.isCrouchingToggled;
      this.state.isCrouchingToggled = true;
      this.state.isProneToggled = false;
      this.cameraFovPunch = Math.min(this.cameraFovPunch + 3.2, 7);
      soundEngine.playPlayerSlide();
    } else if (this.state.isProneToggled) {
      // Stand up from Prone
      this.state.isProneToggled = false;
      this.state.isCrouchingToggled = false;
      soundEngine.playMechanicalSwitch(0.85);
    } else if (this.state.isCrouchingToggled) {
      // Drop to Prone from Crouch
      this.state.isCrouchingToggled = false;
      this.state.isProneToggled = true;
      soundEngine.playMechanicalSwitch(0.75);
    } else {
      // Crouch from Stand
      this.state.isCrouchingToggled = true;
      this.state.isProneToggled = false;
      soundEngine.playMechanicalSwitch(0.8);
    }
    this.emitHud();
  }

  public toggleLean(dir: -1 | 1): void {
    if (this.state.screen !== 'PLAYING') return;
    this.touchLeanToggle = this.touchLeanToggle === dir ? 0 : dir;
    soundEngine.playMechanicalSwitch(0.95);
    this.emitHud();
  }

  public setHoldBreath(held: boolean): void {
    this.touchHoldBreath = held;
  }

  public cycleLpvoZoom(): void {
    if (this.state.optic !== 'lpvo') {
      this.setOptic('lpvo');
    } else {
      this.state.lpvoZoom =
        this.state.lpvoZoom >= 3.5 ? 1.0 : this.state.lpvoZoom + 1.0;
      soundEngine.playMechanicalSwitch(1.2);
      this.emitHud();
    }
  }

  // =========================================================================
  // MOBILE GPU QUALITY PRESETS, DRS, GYROSCOPE, HAPTICS & FULLSCREEN
  // =========================================================================
  public setQualityPreset(preset: QualityPreset): void {
    this.state.qualityPreset = preset;
    if (preset === 'COMPETITIVE_120') {
      this.setGraphicQuality('LOW');
      this.setFpsLimit(120);
    } else if (preset === 'BALANCED_60') {
      this.setGraphicQuality('HIGH');
      this.setFpsLimit(60);
    } else {
      this.setGraphicQuality('HIGH');
      this.setFpsLimit(0);
    }
  }

  public setGraphicQuality(quality: 'HIGH' | 'LOW'): void {
    this.state.graphicQuality = quality;
    if (!this.isSoftwareGl) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
      if (quality === 'HIGH') {
        this.renderer.shadowMap.enabled = true;
        this.keyLight.castShadow = true;
        this.currentRenderScale = dpr;
        configureIntermittentShadows(this.renderer);
        requestShadowRefresh(this.shadowBudget);
      } else {
        this.renderer.shadowMap.enabled = false;
        this.keyLight.castShadow = false;
        this.currentRenderScale = 1.0;
      }
      this.renderer.setPixelRatio(this.currentRenderScale);
      this.renderer.shadowMap.needsUpdate = true;
      this.state.renderScalePercent = Math.round(
        (this.currentRenderScale / dpr) * 100
      );
    }
    soundEngine.playMechanicalSwitch(1.15);
    this.emitHud();
  }

  public setFpsLimit(fps: number): void {
    this.state.fpsLimit = Math.max(0, Math.min(120, fps));
    soundEngine.playMechanicalSwitch(1.05);
    this.emitHud();
  }

  public toggleDynamicResolution(): void {
    this.state.dynamicResolutionEnabled = !this.state.dynamicResolutionEnabled;
    soundEngine.playMechanicalSwitch(1.0);
    this.emitHud();
  }

  public async setGyroMode(mode: GyroMode): Promise<void> {
    this.state.gyroMode = mode;
    if (mode === 'OFF') {
      mobileHardware.disableGyroscope();
    } else {
      await this.enableGyroSensor();
    }
    soundEngine.playMechanicalSwitch(1.15);
    this.emitHud();
  }

  private async enableGyroSensor(): Promise<void> {
    await mobileHardware.enableGyroscope((dx, dy) => {
      if (this.state.screen !== 'PLAYING') return;
      if (this.state.gyroMode === 'OFF') return;
      if (this.state.gyroMode === 'ADS_ONLY' && !this.state.isAds) return;
      const sens = this.state.gyroSensitivity;
      this.applyTouchLookDelta(dx * sens, dy * sens);
    });
  }

  public setGyroSensitivity(sens: number): void {
    this.state.gyroSensitivity = THREE.MathUtils.clamp(sens, 0.2, 3.0);
    this.emitHud();
  }

  public setLookSensitivity(sens: number): void {
    this.state.lookSensitivity = THREE.MathUtils.clamp(sens, 0.2, 3.0);
    this.emitHud();
  }

  public setAdsSensitivity(sens: number): void {
    this.state.adsSensitivity = THREE.MathUtils.clamp(sens, 0.2, 3.0);
    this.emitHud();
  }

  public recalibrateGyro(): void {
    mobileHardware.recalibrateGyroCenter();
    soundEngine.playMechanicalSwitch(1.3);
  }

  public toggleHaptics(): void {
    this.state.hapticsEnabled = !this.state.hapticsEnabled;
    mobileHardware.hapticsEnabled = this.state.hapticsEnabled;
    if (this.state.hapticsEnabled) {
      mobileHardware.vibrateHitConfirm(false);
    }
    this.emitHud();
  }

  public async enterFullscreenLandscape(): Promise<void> {
    const active = await mobileHardware.enterFullscreenLandscape();
    this.state.isFullscreen = active;
    this.onResize();
    this.emitHud();
  }

  public async toggleFullscreenLandscape(): Promise<void> {
    const active = await mobileHardware.toggleFullscreenLandscape();
    this.state.isFullscreen = active;
    this.onResize();
    this.emitHud();
  }

  private updateDynamicResolutionGovernor(rawDt: number): void {
    updateDynamicResolutionGovernor(
      this.drsState,
      this.state,
      this.renderer,
      rawDt,
      { isSoftwareGl: this.isSoftwareGl }
    );
  }

  public resetScenario(mode: DrillMode, keepMatchScore = false): void {
    const loadoutMod = getClassCombatModifiers();
    this.state.drillMode = mode;
    resetClassSupportForRound(this as any);
    this.playerReviveUntilSec = 0;
    this.playerReviveExpired = false;
    this.playerCorpsePos = null;
    this._allyReviveCharge = 0;
    try {
      this.classKitProps?.hide?.();
    } catch {
      /* optional */
    }
    this.state.stamina = 100;
    this.isPlayerDying = false;
    this.deathAnimElapsed = 0;
    this.deathOnFinish = null;
    this.currentEyeHeight = 1.68;
    this.camera.rotation.z = 0;
    if (this.weaponRig?.root) {
      this.weaponRig.root.position.y = 0;
      this.weaponRig.root.rotation.x = 0;
      this.weaponRig.root.visible = true;
      this.playerDeathTp?.stop(this.camera, this.weaponRig.root);
      this.postMatchShowcase?.stop(this.camera, this.weaponRig.root);
    }
    this.sprintExhausted = false;
    this.sprintPoseAlpha = 0;
    if (!keepMatchScore) {
      stopMatchEndFanfare();
      this.state.score = 0;
      this.state.hits = 0;
      this.state.shotsFired = 0;
      this.state.headshots = 0;
      this.state.courseTimerSec = 0;
      this.state.killfeed = [];
    }
    this.state.damageFlashAlpha = 0;
    const startingWeapon = !keepMatchScore
      ? loadoutMod.primaryWeapon
      : this.primaryWeapon || loadoutMod.primaryWeapon || 'M4_CARBINE';
    this.selectWeapon(startingWeapon);
    this.state.fragGrenades = loadoutMod.fragCount;
    this.state.smokeGrenades = loadoutMod.smokeCount;
    this.state.equippedGrenade = null;
    this.state.isThrowingGrenade = false;
    this.grenadeSystem?.clearAll();
    this.state.boltLockedBack = false;
    this.state.reloadPhase = 'IDLE';

    // Activate bomb arenas, Stander de Tiro (FREE_RANGE), or Killhouse Facility
    const isYard = mode === 'YARD_BOMB_5V5';
    const isDust2 = mode === 'DUST2_BOMB_5V5';
    const isAssault = mode === 'ASSAULT_BOMB_5V5';
    const isIndustria = mode === 'INDUSTRIA_BOMB_5V5';
    const isFreeRange = mode === 'FREE_RANGE';
    const isBombMode = isYard || isDust2 || isAssault || isIndustria;

    if (isFreeRange && !this.standerTiroLevelData.isLoaded) {
      void loadStanderTiroMapGeometry(
        this.standerTiroLevelData,
        this.isSoftwareGl
      );
    }

    this.standerTiroLevelData.levelGroup.visible = isFreeRange;
    this.facilityLevelData.levelGroup.visible = !isBombMode && !isFreeRange;
    this.yardLevelData.levelGroup.visible = isYard;
    this.dust2LevelData.levelGroup.visible = isDust2;
    this.assaultLevelData.levelGroup.visible = isAssault;
    this.industriaLevelData.levelGroup.visible = isIndustria;

    const activeLevel = isDust2
      ? this.dust2LevelData
      : isAssault
        ? this.assaultLevelData
        : isIndustria
          ? this.industriaLevelData
          : isYard
            ? this.yardLevelData
            : isFreeRange
              ? this.standerTiroLevelData
              : this.facilityLevelData;
    this.colliders = activeLevel.colliders;
    this.targets = activeLevel.targets;
    this.targetMap.clear();
    for (let i = 0; i < this.targets.length; i++) {
      this.targetMap.set(this.targets[i].id, this.targets[i]);
    }
    this.shootableMeshes = activeLevel.shootableMeshes;
    this.wallStandPositions = activeLevel.wallStandPositions;
    this.cachedRadarTargets = [];
    this.aimRaycastInitialized = false;

    this.skySystem.configureForMode(mode, this.scene.fog !== null);

    // Position player according to drill sector
    if (isDust2) {
      if (!this.dust2LevelData.isLoaded) {
        void loadDust2MapGeometry(
          this.dust2LevelData,
          this.isSoftwareGl,
          new THREE.LoadingManager()
        ).then(() => {
          if (this.state.drillMode === 'DUST2_BOMB_5V5') {
            this.playerPos.y = this.dust2LevelData.collider.getGroundHeight(
              this.playerPos.x,
              this.playerPos.y,
              this.playerPos.z
            );
            this.playerVel.y = 0;
            this.isGrounded = true;
          }
        });
      }
      const startY = this.dust2LevelData.collider.ready
        ? this.dust2LevelData.collider.getGroundHeight(
            DUST2_T_SPAWN.x,
            DUST2_T_SPAWN.y,
            DUST2_T_SPAWN.z
          )
        : DUST2_T_SPAWN.y;
      this.playerPos.set(DUST2_T_SPAWN.x, startY, DUST2_T_SPAWN.z);
      this.yaw = DUST2_T_SPAWN_YAW;
      this.pitch = 0;
      this.yardBombSystem.resetRound('DUST2_BOMB_5V5', keepMatchScore);
      this.state.yardBomb = { ...this.yardBombSystem.info };
    } else if (isAssault) {
      if (!this.assaultLevelData.isLoaded) {
        void loadAssaultMapGeometry(
          this.assaultLevelData,
          this.isSoftwareGl,
          new THREE.LoadingManager()
        ).then(() => {
          if (this.state.drillMode === 'ASSAULT_BOMB_5V5') {
            this.playerPos.y = this.assaultLevelData.collider.getGroundHeight(
              this.playerPos.x,
              this.playerPos.y,
              this.playerPos.z
            );
            this.playerVel.y = 0;
            this.isGrounded = true;
          }
        });
      }
      const startY = this.assaultLevelData.collider.ready
        ? this.assaultLevelData.collider.getGroundHeight(
            ASSAULT_ATTACKER_SPAWN.x,
            ASSAULT_ATTACKER_SPAWN.y,
            ASSAULT_ATTACKER_SPAWN.z
          )
        : ASSAULT_ATTACKER_SPAWN.y;
      this.playerPos.set(
        ASSAULT_ATTACKER_SPAWN.x,
        startY,
        ASSAULT_ATTACKER_SPAWN.z
      );
      this.yaw = ASSAULT_SPAWN_YAW;
      this.pitch = 0;
      this.yardBombSystem.resetRound('ASSAULT_BOMB_5V5', keepMatchScore);
      this.state.yardBomb = { ...this.yardBombSystem.info };
    } else if (isIndustria) {
      if (!this.industriaLevelData.isLoaded) {
        void loadIndustriaMapGeometry(
          this.industriaLevelData,
          this.isSoftwareGl,
          new THREE.LoadingManager()
        ).then(() => {
          if (this.state.drillMode === 'INDUSTRIA_BOMB_5V5') {
            this.playerPos.y = this.industriaLevelData.collider.getGroundHeight(
              this.playerPos.x,
              this.playerPos.y,
              this.playerPos.z
            );
            this.playerVel.y = 0;
            this.isGrounded = true;
          }
        });
      }
      const startY = this.industriaLevelData.collider.ready
        ? this.industriaLevelData.collider.getGroundHeight(
            INDUSTRIA_ATTACKER_SPAWN.x,
            INDUSTRIA_ATTACKER_SPAWN.y,
            INDUSTRIA_ATTACKER_SPAWN.z
          )
        : INDUSTRIA_ATTACKER_SPAWN.y;
      this.playerPos.set(
        INDUSTRIA_ATTACKER_SPAWN.x,
        startY,
        INDUSTRIA_ATTACKER_SPAWN.z
      );
      this.yaw = INDUSTRIA_SPAWN_YAW;
      this.pitch = 0;
      this.yardBombSystem.resetRound('INDUSTRIA_BOMB_5V5', keepMatchScore);
      this.state.yardBomb = { ...this.yardBombSystem.info };
    } else if (isYard) {
      this.playerPos.set(
        YARD_ATTACKER_SPAWN.x,
        YARD_ATTACKER_SPAWN.y,
        YARD_ATTACKER_SPAWN.z
      );
      this.yaw = 0;
      this.pitch = 0;
      this.yardBombSystem.resetRound('YARD_BOMB_5V5', keepMatchScore);
      this.state.yardBomb = { ...this.yardBombSystem.info };
    } else if (mode === 'FREE_RANGE') {
      this.playerPos.copy(STANDER_TIRO_SPAWN);
      this.yaw = STANDER_TIRO_SPAWN_YAW;
      this.pitch = 0;
      this.state.yardBomb = undefined;
    } else {
      // Spawn at Killhouse Breach Entry
      this.playerPos.set(12.2, 0, 4.5);
      this.yaw = 0;
      this.pitch = 0;
      this.state.yardBomb = undefined;
    }
    this.playerVel.set(0, 0, 0);
    this.isGrounded = true;
    this.state.isCrouchingToggled = false;
    this.state.isProneToggled = false;

    // Reset all targets to their exact spawn positions & fresh AI navigation state
    let activeCount = 0;
    this.targets.forEach((t) => {
      t.isDown = false;
      t.lastDeathWasHeadshot = false;
      t.reviveUntilSec = 0;
      t.reviveExpired = false;
      t.downTimer = 0;
      t.health = t.maxHealth;
      t.armorHealth = t.armorMesh ? 60 : 0;
      if (t.armorMesh) t.armorMesh.visible = true;
      t.root.visible = true;
      t.root.position.copy(t.basePosition);
      if (t.root.userData) {
        t.root.userData.navData = undefined;
        t.root.userData.prevPos = undefined;
      }
      t.pivotGroup.position.y = 0;
      t.pivotGroup.rotation.x = 0;
      t.hitTiltAngle = 0;
      t.hitTiltVelocity = 0;
      t.windupTimer = 0;
      t.cooldownTimer = 1.5 + Math.random() * 2.0;
      t.isTelegraphing = false;
      if (t.laserLine) t.laserLine.visible = false;

      if (isBombMode) {
        if (!(t as YardBotEntity).isAlly) activeCount++;
      } else if (mode === 'KILLHOUSE_BLITZ' || mode === 'TACTICAL_WAVE') {
        if (t.sector === 'KILLHOUSE') activeCount++;
      } else {
        if (t.type !== 'STEEL_GONG') activeCount++;
      }
    });

    if (isBombMode && isOnlineMatchActive()) {
      const onlineSpawn = applyOnlineTeamSpawnToLocalPlayer(
        mode,
        this.playerPos,
        (x, y, z) => this.getCurrentGroundHeight(x, y, z)
      );
      if (onlineSpawn) {
        this.yaw = onlineSpawn.yaw;
      }
      hideAllBotsForOnlineMatch(
        this.targets as YardBotEntity[],
        this.shootableMeshes
      );
      activeCount = 0;
    }

    this.state.targetsRemaining = activeCount;
    this.state.totalTargetsInDrill = activeCount;
  }

  public requestPointerLock(): void {
    if (this.state.touchControlsVisible) return;
    try {
      this.renderer.domElement.requestPointerLock?.();
    } catch {
      // Ignore sandbox lock errors
    }
  }

  // =========================================================================
  // INPUT & EVENT HANDLERS
  // =========================================================================
  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    this.keysHeld.add(e.code);

    if (this.state.screen === 'TITLE') {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        this.startGame();
      }
      return;
    }

    if (e.code === 'Escape') {
      if (this.state.screen === 'PLAYING') {
        this.pauseGame();
      } else if (this.state.screen === 'PAUSED') {
        this.resumeGame();
      }
      return;
    }

    if (this.state.screen !== 'PLAYING') return;

    if (this.playerDeathTp?.isSpectating()) {
      if (e.code === 'KeyQ' || e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.cycleSpectator(-1);
      } else if (e.code === 'KeyE' || e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.cycleSpectator(1);
      }
      return;
    }

    if (this.isPlayerDying) return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        this.triggerJump();
        break;
      case 'KeyZ':
        if (this.state.isAds && this.state.optic === 'lpvo') {
          this.cycleLpvoZoom();
        } else {
          this.triggerProne();
        }
        break;
      case 'KeyC':
      case 'ControlLeft':
        this.toggleCrouchOrSlide();
        break;
      case 'KeyR': {
        const now = performance.now();
        const isDoubleTap = now - this.lastRKeyPressTime < 280;
        this.lastRKeyPressTime = now;
        this.triggerReload(isDoubleTap);
        break;
      }
      case 'KeyT':
        this.triggerMagCheck();
        break;
      case 'KeyG':
        if (this.state.boltLockedBack || this.state.chambered === 0) {
          this.triggerManualBoltRack();
        } else {
          this.throwGrenade('FRAG');
        }
        break;
      case 'KeyJ':
      case 'KeyN':
        this.throwGrenade('SMOKE');
        break;
      case 'KeyB':
        this.cycleFireMode();
        break;
      case 'KeyV':
        this.toggleCantedSight();
        break;
      case 'KeyX':
        this.toggleSuppressor();
        break;
      case 'KeyK':
        this.cycleWeaponCharm();
        break;
      case 'KeyL':
        this.toggleLaser();
        break;
      case 'KeyU':
        this.resupplyAmmo();
        this.setClassSupportHeld(true);
        break;
      case 'KeyM':
        this.toggleMute();
        break;
      case 'KeyH':
        this.toggleDockCollapsed();
        break;
      case 'KeyE':
        if (
          (this.state.drillMode === 'YARD_BOMB_5V5' ||
            this.state.drillMode === 'DUST2_BOMB_5V5' ||
            this.state.drillMode === 'ASSAULT_BOMB_5V5' ||
            this.state.drillMode === 'INDUSTRIA_BOMB_5V5') &&
          this.yardBombSystem.info.nearSite &&
          this.yardBombSystem.info.bombStatus === 'CARRIED'
        ) {
          this.triggerPlantBomb();
        }
        break;
      case 'KeyF':
        if (
          (this.state.drillMode === 'YARD_BOMB_5V5' ||
            this.state.drillMode === 'DUST2_BOMB_5V5' ||
            this.state.drillMode === 'ASSAULT_BOMB_5V5' ||
            this.state.drillMode === 'INDUSTRIA_BOMB_5V5') &&
          this.yardBombSystem.info.nearSite &&
          this.yardBombSystem.info.bombStatus === 'CARRIED'
        ) {
          this.triggerPlantBomb();
        } else if (this.state.focusedWallWeapon) {
          this.selectWeapon(this.state.focusedWallWeapon);
        } else {
          this.triggerWeaponInspect();
        }
        break;
      case 'Tab':
        e.preventDefault();
        this.toggleWeaponSlot();
        break;
      case 'Digit1':
        this.selectWeapon(this.primaryWeapon);
        break;
      case 'Digit2':
        this.selectWeapon('P50_PISTOL');
        break;
      case 'Digit3':
        this.selectWeapon('KNIFE_TACTICAL');
        break;
      case 'Digit4':
        this.selectWeapon('M4_CARBINE');
        break;
      case 'Digit5':
        this.selectWeapon('AK47_RIFLE');
        break;
      case 'Digit6':
        this.selectWeapon('L49_LMG');
        break;
      case 'Digit7':
        this.selectWeapon('SNIPER_BOLT');
        break;
      case 'Digit8':
        this.selectWeapon('SNIPER_TACTICAL');
        break;
      case 'Digit9': {
        const nextOptic: OpticType =
          this.state.optic === 'iron'
            ? 'holo'
            : this.state.optic === 'holo'
              ? 'lpvo'
              : 'iron';
        this.setOptic(nextOptic);
        break;
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keysHeld.delete(e.code);
    if (e.code === 'KeyU') {
      this.setClassSupportHeld(false);
    }
  };

  private onMouseDown = (e: MouseEvent) => {
    if (this.state.screen !== 'PLAYING' || this.isPlayerDying) return;

    // Ignore clicks on DOM UI controls (like the bottom dock)
    if (e.target !== this.renderer.domElement) return;

    if (!this.state.pointerLocked) {
      this.requestPointerLock();
    }

    this.mouseButtonsHeld.add(e.button);

    if (e.button === 0) {
      this.triggerPulledThisPress = false;
      this.attemptFireWeapon();
    } else if (e.button === 2) {
      this.state.isAds = true;
      soundEngine.playMechanicalSwitch(1.05);
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    this.mouseButtonsHeld.delete(e.button);
    if (e.button === 0) {
      this.triggerPulledThisPress = false;
    } else if (e.button === 2) {
      this.state.isAds = false;
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.state.screen !== 'PLAYING' || this.isPlayerDying) return;
    if (!this.state.pointerLocked && !this.mouseButtonsHeld.has(0) && !this.mouseButtonsHeld.has(2)) {
      return;
    }

    const userSens = this.state.isAds
      ? this.state.lookSensitivity * this.state.adsSensitivity
      : this.state.lookSensitivity;

    const zoomSensFactor =
      this.state.isAds && this.state.optic === 'lpvo' && !this.state.cantedActive
        ? 0.45 / Math.sqrt(this.state.lpvoZoom)
        : this.state.isAds
          ? 0.65
          : 1.0;

    const sens = 0.0021 * zoomSensFactor * userSens;
    const dx = e.movementX || 0;
    const dy = e.movementY || 0;

    this.yaw -= dx * sens;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - dy * sens,
      -Math.PI * 0.46,
      Math.PI * 0.46
    );

    // Feed mouse angular velocity into weapon inertia spring
    this.swayVel.x -= dx * 0.00055;
    this.swayVel.y += dy * 0.00055;
  };

  private onWheel = (e: WheelEvent) => {
    if (this.state.screen !== 'PLAYING') return;
    if (this.state.optic === 'lpvo' && !this.state.cantedActive) {
      const delta = e.deltaY < 0 ? 0.5 : -0.5;
      this.state.lpvoZoom = THREE.MathUtils.clamp(
        this.state.lpvoZoom + delta,
        1.0,
        4.0
      );
      soundEngine.playMechanicalSwitch(1.25);
      this.emitHud();
    }
  };

  private onPointerLockChange = () => {
    const locked = document.pointerLockElement === this.renderer.domElement;
    this.state.pointerLocked = locked;
    this.emitHud();
  };

  private onWindowBlur = () => {
    this.isWindowFocused = false;
    this.keysHeld.clear();
    this.mouseButtonsHeld.clear();
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    this.touchSprinting = false;
    this.touchFireHeld = false;
    this.touchHoldBreath = false;
    this.canvasTouchLookId = null;
    this.emitHud();
  };

  private onWindowFocus = () => {
    this.isWindowFocused = true;
    this.lastTime = performance.now();
  };

  private onVisibilityChange = () => {
    if (document.hidden) {
      this.isWindowFocused = false;
      this.onWindowBlur();
    } else {
      this.isWindowFocused = true;
      this.lastTime = performance.now();
    }
  };

  private onCanvasTouchStart = (e: TouchEvent) => {
    if (this.state.screen !== 'PLAYING') return;
    if (this.canvasTouchLookId !== null) return;
    const t = e.changedTouches[0];
    if (!t) return;
    this.canvasTouchLookId = t.identifier;
    this.canvasTouchLastX = t.clientX;
    this.canvasTouchLastY = t.clientY;
  };

  private onCanvasTouchMove = (e: TouchEvent) => {
    if (this.state.screen !== 'PLAYING' || this.canvasTouchLookId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === this.canvasTouchLookId) {
        const dx = t.clientX - this.canvasTouchLastX;
        const dy = t.clientY - this.canvasTouchLastY;
        this.canvasTouchLastX = t.clientX;
        this.canvasTouchLastY = t.clientY;
        this.applyTouchLookDelta(dx, dy);
        break;
      }
    }
  };

  private onCanvasTouchEnd = (e: TouchEvent) => {
    if (this.canvasTouchLookId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.canvasTouchLookId) {
        this.canvasTouchLookId = null;
        break;
      }
    }
  };

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private onResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('wheel', this.onWheel, { passive: true });
    window.addEventListener('blur', this.onWindowBlur);
    window.addEventListener('focus', this.onWindowFocus);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('resize', this.onResize);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    this.renderer.domElement.addEventListener('touchstart', this.onCanvasTouchStart, {
      passive: true,
    });
    this.renderer.domElement.addEventListener('touchmove', this.onCanvasTouchMove, {
      passive: true,
    });
    this.renderer.domElement.addEventListener('touchend', this.onCanvasTouchEnd, {
      passive: true,
    });
    this.renderer.domElement.addEventListener('touchcancel', this.onCanvasTouchEnd, {
      passive: true,
    });
  }

  // =========================================================================
  // ADVANCED RELOAD, MAG CHECK & BOLT MECHANICS
  // =========================================================================
  public triggerReload(isDoubleTapSpeedReload = false): void {
    if (this.state.equippedGrenade !== null) {
      this.grenadeSystem?.unequipFromHand();
      this.state.equippedGrenade = null;
      this.weaponRig.root.visible = true;
    }
    if (this.state.reloadPhase === 'MAG_CHECK') {
      this.state.reloadPhase = 'IDLE';
      this.state.magCheckVisible = false;
    }
    // If already in a reload, upgrade to speed reload if double-tapped early!
    if (this.state.reloadPhase !== 'IDLE') {
      if (isDoubleTapSpeedReload && !this.isSpeedReload && this.state.reloadPhase === 'MAG_OUT') {
        this.isSpeedReload = true;
        this.reloadDuration *= 0.68;
        this.state.reloadTypeLabel = 'RECARGA RÁPIDA (DROP)';
        // Drop current mag on floor
        this.weaponRig.magazineGroup.getWorldPosition(_worldPos);
        this.camera.getWorldDirection(_forward);
        this.fxPool.spawnDroppedMagazine(_worldPos, _forward);
        this.state.currentMagRounds = 0;
      }
      return;
    }

    if (this.state.activeWeapon === 'KNIFE_TACTICAL') {
      this.triggerWeaponInspect();
      return;
    }

    // Do not allow reload if current magazine is already 100% full and a round is chambered
    if (
      this.state.currentMagRounds === this.state.magCapacity &&
      this.state.chambered === 1
    ) {
      soundEngine.playMechanicalSwitch(0.85);
      this.state.reloadTypeLabel = 'CARREGADOR JÁ ESTÁ CHEIO';
      this.magCheckTimer = 1.4;
      this.emitHud();
      return;
    }

    // Check if we have any magazine with rounds in our chest rig
    let bestMagIdx = this.findFullestMagazineIndex();
    if (bestMagIdx === -1 || this.state.magazines[bestMagIdx] <= 0) {
      // Auto-replenish spare magazines so player can always reload during combat/movement
      const cap = this.state.magCapacity;
      this.state.magazines = [cap, cap, cap, cap];
      bestMagIdx = 0;
    }

    // Allow reload at any time (even if mag is full, performs a tactical magazine swap so reload animation always plays on demand)
    const dryReload = this.state.chambered === 0 || this.state.boltLockedBack;
    this.isSpeedReload = isDoubleTapSpeedReload || this.state.currentMagRounds === 0;
    this.needsBoltReleaseStage = dryReload;

    if (this.isSpeedReload) {
      this.reloadDuration = dryReload ? 1.65 : 1.25;
      this.state.reloadTypeLabel = dryReload
        ? 'RECARGA EMERGENCIAL + LIBERAÇÃO DO FERROLHO'
        : 'RECARGA RÁPIDA (DROP DE CARREGADOR)';
    } else {
      this.reloadDuration = dryReload ? 2.25 : 1.78;
      this.state.reloadTypeLabel = dryReload
        ? 'RECARGA SECA + MANEJO DE FERROLHO'
        : 'RECARGA TÁTICA (RETENÇÃO DE CARREGADOR)';
    }

    if (this.state.activeWeapon === 'P50_PISTOL') {
      this.reloadDuration = 2.25;
      soundEngine.playPistolFullReload();
    } else if (
      this.state.activeWeapon === 'M4_CARBINE' ||
      this.state.activeWeapon === 'CARBINE_AR'
    ) {
      this.reloadDuration = 2.75;
      soundEngine.playM4a1FullReload();
    } else if (
      this.state.activeWeapon === 'AK47_RIFLE' ||
      this.state.activeWeapon === 'AK12_RIFLE'
    ) {
      this.reloadDuration = dryReload ? 2.5 : 2.0;
      soundEngine.playAk47FullReload(dryReload);
    } else if (
      this.state.activeWeapon === 'SHOTGUN_12' ||
      this.state.activeWeapon === 'SHOTGUN_SPAS'
    ) {
      this.reloadDuration = dryReload ? 2.15 : 1.75;
      soundEngine.playMechanicalSwitch(0.75);
    } else if (
      this.state.activeWeapon === 'SNIPER_BOLT' ||
      this.state.activeWeapon === 'SNIPER_TACTICAL'
    ) {
      soundEngine.playBoltActionCycle();
    }

    this.reloadTimer = 0;
    this.sniperChamberTimer = 0;
    this.sniperReturnToScopeAfterBolt = false;
    this.state.isAds = false;
    this.state.reloadPhase = 'MAG_OUT';
    this.state.reloadProgress = 0;
    this.stageSoundFlags = { magOut: false, magIn: false, boltSlap: false };
    const reloadMult = Math.max(1, getClassCombatModifiers().reloadSpeedMult);
    this.reloadDuration = Math.max(0.45, this.reloadDuration / reloadMult);
    this.weaponRig.triggerReloadAnimation(this.reloadDuration);
    this.emitHud();
  }

  public triggerMagCheck(): void {
    if (this.state.reloadPhase !== 'IDLE') return;
    this.state.reloadPhase = 'MAG_CHECK';
    this.state.magCheckVisible = true;
    this.state.reloadTypeLabel = `INSPEÇÃO: ${this.state.currentMagRounds}/${this.state.magCapacity} NO CARREGADOR ${
      this.state.chambered ? '+ 1 NA CÂMARA' : '(CÂMARA VAZIA)'
    }`;
    this.magCheckTimer = 1.85;
    soundEngine.playMechanicalSwitch(0.9);
    this.emitHud();
  }

  public triggerManualBoltRack(): void {
    if (
      this.state.reloadPhase !== 'IDLE' &&
      this.state.reloadPhase !== 'MAG_CHECK'
    ) {
      return;
    }
    if (this.state.currentMagRounds <= 0 && this.state.chambered === 0) {
      this.triggerReload(false);
      return;
    }
    this.state.reloadPhase = 'CHARGING_PULL';
    this.reloadTimer = 0;
    this.reloadDuration = 0.65;
    this.state.reloadTypeLabel = this.state.boltLockedBack
      ? 'LIBERANDO FERROLHO [G]'
      : 'MANOBRANDO ALAVANCA DE MANEJO [G]';
    if (
      this.state.activeWeapon === 'AK47_RIFLE' ||
      this.state.activeWeapon === 'AK12_RIFLE'
    ) {
      soundEngine.playAk47BoltRack();
    } else if (
      this.state.activeWeapon === 'SNIPER_BOLT' ||
      this.state.activeWeapon === 'SNIPER_TACTICAL'
    ) {
      soundEngine.playBoltActionCycle();
    } else {
      soundEngine.playReloadStage('CHARGING_HANDLE');
    }
    this.weaponRig.triggerBoltAnimation();

    // If a live round was chambered, eject it!
    if (this.state.chambered === 1) {
      this.weaponRig.ejectionPortWorldPos.getWorldPosition(_worldPos);
      this.camera.getWorldDirection(_forward);
      _right.crossVectors(_forward, _up).normalize();
      this.fxPool.spawnBrassCasing(_worldPos, _right, _up);
      this.state.chambered = 0;
    }

    // Chamber a round from current magazine if available
    if (this.state.currentMagRounds > 0) {
      this.state.currentMagRounds -= 1;
      this.state.chambered = 1;
      this.state.boltLockedBack = false;
    } else {
      this.state.boltLockedBack = false;
    }
    this.emitHud();
  }

  private findFullestMagazineIndex(): number {
    let bestIdx = -1;
    let maxRounds = 0;
    for (let i = 0; i < this.state.magazines.length; i++) {
      if (this.state.magazines[i] > maxRounds) {
        maxRounds = this.state.magazines[i];
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  private completeMagazineSwap(): void {
    const bestIdx = this.findFullestMagazineIndex();
    if (bestIdx === -1) return;

    const incomingRounds = this.state.magazines[bestIdx];
    const outgoingRounds = this.state.currentMagRounds;

    if (this.isSpeedReload) {
      // Dropped on floor! Remove the used mag from chest rig or set to 0
      this.state.magazines.splice(bestIdx, 1);
    } else {
      // Tactical retention: stow partially spent mag back in chest rig slot
      if (outgoingRounds > 0) {
        this.state.magazines[bestIdx] = outgoingRounds;
      } else {
        this.state.magazines.splice(bestIdx, 1);
      }
    }

    this.state.currentMagRounds = incomingRounds;
  }

  // =========================================================================
  // BALLISTICS & WEAPON FIRING
  // =========================================================================
  private attemptFireWeapon(): void {
    runAttemptFireWeapon(this as any);
  }

  private executeSingleShot(): void {
    runExecuteSingleShot(this as any);
  }

  private handleTargetHit(
    targetId: string,
    hitZone: 'HEAD' | 'TORSO_A' | 'ARMOR' | 'STEEL_GONG',
    distanceMeters: number,
    hitPoint: THREE.Vector3,
    hitNormal: THREE.Vector3,
    isShotgunPellet = false
  ): void {
    runHandleTargetHit(
      this as any,
      targetId,
      hitZone,
      distanceMeters,
      hitPoint,
      hitNormal,
      isShotgunPellet
    );
  }

  private recordShotTelemetry(
    distanceMeters: number,
    zone: BallisticShotTelemetry['zone'],
    damage: number,
    velocityMs: number
  ): void {
    const entry: BallisticShotTelemetry = {
      id: this.state.shotsFired,
      distanceMeters: Number(distanceMeters.toFixed(1)),
      zone,
      damage,
      velocityMs,
      reactionMs: Math.round(185 + Math.random() * 90),
      timestamp: performance.now(),
    };
    this.state.lastShotTelemetry = entry;
    this.state.shotHistory = [entry, ...this.state.shotHistory.slice(0, 4)];
  }

  // =========================================================================
  // MAIN SIMULATION LOOP (60FPS + SOFTWARE WEBGL FENCE SYNC)
  private tick = () => {
    if (this.disposed || !this.isLoopRunning) return;

    const now = performance.now();
    const elapsed = (now - this.lastTime) / 1000;

    if (!this.isWindowFocused) {
      this.lastTime = now;
      this.frameId = requestAnimationFrame(this.tick);
      return;
    }

    if (
      this.state.fpsLimit > 0 &&
      elapsed < 1 / this.state.fpsLimit - 0.0015
    ) {
      this.frameId = requestAnimationFrame(this.tick);
      return;
    }

    this.lastTime = now;
    const rawDt = elapsed;

    // Clamp delta time to prevent physics tunneling on tab switch
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
    this.elapsedTime += dt;

    this.updateDynamicResolutionGovernor(rawDt);

    if (
      this.state.screen === 'TITLE' ||
      this.state.screen === 'MAIN_MENU'
    ) {
      this.updateTitleScreenShowroom(dt);
    } else if (this.state.screen === 'PLAYING') {
      if (this.hitstopTimer > 0) {
        this.hitstopTimer -= dt;
      } else {
        this.updatePlayingSimulation(dt);
      }
      if (this.keyLight?.castShadow && this.renderer.shadowMap.enabled) {
        followKeyLightShadowFrustum(this.keyLight, this.playerPos);
        tickShadowBudget(this.renderer, this.shadowBudget, this.playerPos, dt);
      }
    }

    if (this.postFx.enabled && this.state.screen === 'PLAYING') {
      renderWithTacticalPostFx(
        this.postFx,
        this.renderer,
        this.scene,
        this.camera,
        this.state.damageFlashAlpha || 0
      );
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    if (this.isLoopRunning && !this.disposed) {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public startLoop(): void {
    if (this.isLoopRunning || this.disposed) return;
    this.isLoopRunning = true;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
  }

  public stopLoop(): void {
    this.isLoopRunning = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }
  }

  // =========================================================================
  // TITLE SCREEN LIVE 3D SHOWROOM CAMERA & WEAPON PRESENTATION
  // =========================================================================
  private updateTitleScreenShowroom(dt: number): void {
    // Gentle atmospheric camera pan overlooking the firing line & 3D rifle centerpiece
    this.yaw = Math.sin(this.elapsedTime * 0.35) * 0.22 - 0.15;
    this.pitch = Math.cos(this.elapsedTime * 0.28) * 0.04 - 0.03;

    this.yawObject.position.set(-5.8, 1.68, 2.6);
    this.yawObject.rotation.y = this.yaw;
    this.pitchObject.rotation.x = this.pitch;

    // Position the 3D Tactical Weapon & Two-Handed Arms Rig in an angled hero pose
    this.weaponRig.root.position.set(
      0.055 + Math.sin(this.elapsedTime * 0.9) * 0.006,
      -0.035 + Math.cos(this.elapsedTime * 1.1) * 0.005,
      -0.35
    );
    this.weaponRig.root.rotation.set(
      0.08,
      0.32 + Math.sin(this.elapsedTime * 0.6) * 0.06,
      -0.12
    );
    this.weaponRig.updateGlbAnimations(dt, false, false, 'IDLE', 0);
  }

  // =========================================================================
  // ACTIVE FIRST-PERSON COMBAT & RANGE SIMULATION
  // =========================================================================
  private updatePlayingSimulation(dt: number): void {
    // 1. Course Timer & Decay Timers
    if (
      this.state.drillMode === 'KILLHOUSE_BLITZ' ||
      this.state.drillMode === 'TACTICAL_WAVE' ||
      this.state.drillMode === 'YARD_BOMB_5V5' ||
      this.state.drillMode === 'DUST2_BOMB_5V5' ||
      this.state.drillMode === 'ASSAULT_BOMB_5V5' ||
      this.state.drillMode === 'INDUSTRIA_BOMB_5V5'
    ) {
      this.state.courseTimerSec += dt;
    }

    if (
      this.state.drillMode === 'YARD_BOMB_5V5' ||
      this.state.drillMode === 'DUST2_BOMB_5V5' ||
      this.state.drillMode === 'ASSAULT_BOMB_5V5' ||
      this.state.drillMode === 'INDUSTRIA_BOMB_5V5'
    ) {
      const playerAlive =
        this.state.health > 0 &&
        !this.isPlayerDying &&
        !this.playerDeathTp?.isActive();

      this.yardBombSystem.update(
        dt,
        this.playerPos,
        this.targets,
        this.fxPool,
        (xp, cash) => {
          this.addPlayerXp(xp);
          if (canGrantMatchProgressionRewards() && cash > 0) {
            addPlayerCash(cash);
          }
          this.state.score += xp;
          this.emitHud();
        },
        () => {
          this.resetScenario(this.state.drillMode, true);
          this.emitHud();
        },
        () => {
          this.returnToMainMenu();
        },
        this.registerKill.bind(this),
        playerAlive,
        isLocalPlayerPendingRevive(this as any)
      );

      // Pre-round equip freeze: look OK, no combat / sprint / plant.
      if (this.yardBombSystem.info.roundState === 'EQUIP') {
        this.touchFireHeld = false;
        this.touchSprinting = false;
        this.burstRemaining = 0;
        this.fireCooldown = Math.max(this.fireCooldown, 0.05);
        this.playerVel.x = 0;
        this.playerVel.z = 0;
        this.state.isAds = false;
        this.state.yardBomb = { ...this.yardBombSystem.info };
        // Keep camera orientation live so players can look around while equipping.
        this.yawObject.position.set(
          this.playerPos.x,
          this.playerPos.y + this.currentEyeHeight,
          this.playerPos.z
        );
        this.yawObject.rotation.y = this.yaw;
        this.pitchObject.rotation.x = this.pitch;
        this.updateWeaponKinematicsAndOptics(dt);
        this.hudSyncTimer += dt;
        if (this.hudSyncTimer >= 0.09) {
          this.hudSyncTimer = 0;
          this.emitHud();
        }
        return;
      }

      if (this.playerDeathTp?.isSpectating()) {
        const specBot = this.playerDeathTp.getSpectatedBot(
          this.targets as YardBotEntity[]
        );
        if (specBot && this.yardBombSystem.info.roundState === 'PLAYING') {
          this.yardBombSystem.info.isSpectating = true;
          this.yardBombSystem.info.spectatedCallsign =
            specBot.callsign || 'VANGUARD-02';
          this.yardBombSystem.info.spectatedWeapon =
            specBot.weaponId || 'M4_CARBINE';
          this.yardBombSystem.info.spectatedHealth = Math.max(0, specBot.health);
        } else {
          this.yardBombSystem.info.isSpectating = false;
        }
      } else {
        this.yardBombSystem.info.isSpectating = false;
      }

      this.state.yardBomb = { ...this.yardBombSystem.info };

      if (this.yardBombSystem.info.roundState === 'MATCH_OVER') {
        if (!this.postMatchShowcase.isActive()) {
          this.isPlayerDying = false;
          this.playerDeathTp?.stop(this.camera, this.weaponRig.root);
          this.yardBombSystem.info.isSpectating = false;
          this.state.yardBomb = { ...this.yardBombSystem.info };
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
          this.postMatchShowcase.startShowcase(
            this.yardBombSystem.info.squadStats || [],
            this.weaponRig.root
          );
          this.emitHud();
        }
        this.postMatchShowcase.update(
          dt,
          this.yardBombSystem.info.squadStats || [],
          this.yawObject,
          this.pitchObject,
          this.camera,
          this.weaponRig.root
        );
        updatePlayerSprintPantingAudio(false, 0, false, dt);
        this.hudSyncTimer += dt;
        if (this.hudSyncTimer >= 0.09) {
          this.hudSyncTimer = 0;
          this.emitHud();
        }
        return;
      }
    }

    if (this.state.killfeed.length > 0) {
      const nowMs = Date.now();
      if (nowMs - this.state.killfeed[0].timestamp >= 4500) {
        this.state.killfeed = this.state.killfeed.filter(
          (e) => nowMs - e.timestamp < 4500
        );
        this.emitHud();
      }
    }

    if (this.state.hitMarkerAlpha > 0) {
      this.state.hitMarkerAlpha = Math.max(0, this.state.hitMarkerAlpha - dt * 3.8);
    }
    if (this.state.damageFlashAlpha > 0) {
      this.state.damageFlashAlpha = Math.max(0, this.state.damageFlashAlpha - dt * 2.5);
    }
    if (this.magCheckTimer > 0) {
      this.magCheckTimer -= dt;
      if (this.magCheckTimer <= 0) {
        this.state.magCheckVisible = false;
        if (this.state.reloadPhase === 'MAG_CHECK') {
          this.state.reloadPhase = 'IDLE';
        }
        if (this.state.reloadPhase === 'IDLE') {
          this.state.reloadTypeLabel = '';
        }
      }
    }

    // Sniper Bolt-Action Chambering Timer (Cycles fresh round into battery & returns to scope if player was scoped!)
    if (this.sniperChamberTimer > 0) {
      this.sniperChamberTimer -= dt;
      if (this.sniperChamberTimer <= 0) {
        this.sniperChamberTimer = 0;
        if (
          this.state.activeWeapon === 'SNIPER_BOLT' ||
          this.state.activeWeapon === 'SNIPER_TACTICAL'
        ) {
          if (this.state.currentMagRounds > 0) {
            this.state.currentMagRounds -= 1;
            this.state.chambered = 1;
            this.state.boltLockedBack = false;
            this.state.reloadTypeLabel = '';
            if (
              this.sniperReturnToScopeAfterBolt &&
              this.state.reloadPhase === 'IDLE' &&
              this.state.equippedGrenade === null
            ) {
              this.state.isAds = true;
              soundEngine.playMechanicalSwitch(1.08);
            }
          } else {
            this.state.chambered = 0;
            this.state.boltLockedBack = true;
            this.state.reloadTypeLabel = 'FERROLHO ABERTO — SEM MUNIÇÃO';
          }
          this.sniperReturnToScopeAfterBolt = false;
          this.emitHud();
        }
      }
    }

    // 2. Continuous Fire / Burst Fire Handling
    if (this.fireCooldown > 0) {
      this.fireCooldown -= dt;
    }
    if (this.fireCooldown <= 0) {
      if (this.burstRemaining > 0) {
        if (this.state.chambered === 0 && this.state.activeWeapon !== 'KNIFE_TACTICAL') {
          this.burstRemaining = 0;
          soundEngine.playDryFire();
          if (this.state.currentMagRounds <= 0) {
            this.triggerReload(false);
          } else {
            this.triggerManualBoltRack();
          }
        } else {
          this.executeSingleShot();
        }
      } else if (
        this.state.fireMode === 'AUTO' &&
        (this.mouseButtonsHeld.has(0) || this.touchFireHeld) &&
        this.state.reloadPhase === 'IDLE' &&
        !this.grenadeSystem.isBusyOrHolding()
      ) {
        if (this.state.chambered === 0 && this.state.activeWeapon !== 'KNIFE_TACTICAL') {
          soundEngine.playDryFire();
          if (this.state.currentMagRounds <= 0) {
            this.triggerReload(false);
          } else {
            this.triggerManualBoltRack();
          }
        } else {
          this.executeSingleShot();
        }
      }
    }

    // 3. Update Multi-Stage Reload State Machine & Hand Kinematics
    this.updateReloadStateMachine(dt);

    // 4. Player Movement, Stance (Stand/Crouch/Sprint/Slide) & Q/E Leaning
    this.updatePlayerMovementAndCollision(dt);

    // 5. Weapon ADS Alignment, Respiratory Breath Hold, Recoil & Wall-Tuck
    this.updateWeaponKinematicsAndOptics(dt);

    // 6. Reactive Targets & Killhouse Combat Bot AI
    this.updateTargetsAndCombatAI(dt);

    // 6b. Warface class support (ammo / heal+revive / armor) + medic markers
    updateClassSupport(this as any, dt);
    this.playerGesture?.update(dt);
    this.classKitProps?.update(dt);
    const planting =
      (this.state.drillMode === 'YARD_BOMB_5V5' ||
        this.state.drillMode === 'DUST2_BOMB_5V5' ||
        this.state.drillMode === 'ASSAULT_BOMB_5V5' ||
        this.state.drillMode === 'INDUSTRIA_BOMB_5V5') &&
      this.yardBombSystem?.info.bombStatus === 'PLANTING';
    this.c4PlantView?.setPlanting(Boolean(planting));
    this.c4PlantView?.update(dt);

    // 7. Update Pooled Brass Casings, Dropped Magazines, Sparks, Tracers & 3D Grenades
    this.fxPool.update(dt);
    this.grenadeSystem.update(
      dt,
      this.colliders,
      this.walkBobAmp,
      (x, y, z) => this.getCurrentGroundHeight(x, y, z)
    );
    this.skySystem.update(this.playerPos, dt);
    this.state.isThrowingGrenade = this.grenadeSystem.isThrowing();
    this.state.equippedGrenade = this.grenadeSystem.getHeldGrenade();

    // 8. Throttled HUD Sync (11Hz smooth telemetry without React main-thread saturation)
    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.09) {
      this.hudSyncTimer = 0;
      this.emitHud();
    }
  }

  private updateReloadStateMachine(dt: number): void {
    runReloadStateMachine(this as any, dt);
  }

  private updatePlayerMovementAndCollision(dt: number): void {
    runPlayerMovement(this as any, dt);
  }

  private checkHorizontalCollision(
    x: number,
    z: number,
    yBottom: number,
    r: number
  ): boolean {
    return runHorizontalCollision(this as any, x, z, yBottom, r);
  }

  private updateWeaponKinematicsAndOptics(dt: number): void {
    runWeaponKinematics(this as any, dt);
  }

  private updateTargetsAndCombatAI(dt: number): void {
    runTargetsCombatAI(this as any, dt);
  }

  private emitHud(force = false): void {
    if (force) this.hudForceEmit.value = true;
    emitHudIfChanged(
      {
        state: this.state,
        primaryWeapon: this.primaryWeapon,
        playerPos: this.playerPos,
        yaw: this.yaw,
        targets: this.targets as Array<{
          id: string;
          sector: 'RANGE' | 'KILLHOUSE';
          root: { position: { x: number; z: number } };
          isDown: boolean;
          isAlly?: boolean;
        }>,
        cachedRadarTargets: this.cachedRadarTargets,
        lastFingerprint: this.hudFingerprint,
        forceNext: this.hudForceEmit,
      },
      this.onHudUpdate
    );
  }

  public dispose(): void {
    this.disposed = true;
    disposeTacticalPostFx(this.postFx);
    this.unsubOnlineHits?.();
    this.unsubOnlineHits = null;
    this.unsubOnlineClassSupport?.();
    this.unsubOnlineClassSupport = null;
    cancelAnimationFrame(this.frameId);
    if (this.rankUpTimeoutId !== null) {
      window.clearTimeout(this.rankUpTimeoutId);
      this.rankUpTimeoutId = null;
    }

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('blur', this.onWindowBlur);
    window.removeEventListener('focus', this.onWindowFocus);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);

    this.renderer.domElement.removeEventListener(
      'touchstart',
      this.onCanvasTouchStart
    );
    this.renderer.domElement.removeEventListener(
      'touchmove',
      this.onCanvasTouchMove
    );
    this.renderer.domElement.removeEventListener(
      'touchend',
      this.onCanvasTouchEnd
    );
    this.renderer.domElement.removeEventListener(
      'touchcancel',
      this.onCanvasTouchEnd
    );

    (this.fxPool as unknown as { dispose?: () => void })?.dispose?.();
    (
      this.grenadeSystem as unknown as {
        dispose?: () => void;
        clearAll?: () => void;
      }
    )?.dispose?.();
    this.grenadeSystem?.clearAll?.();
    this.skySystem?.dispose();

    if (this.scene.environment) {
      this.scene.environment.dispose();
      this.scene.environment = null;
    }

    const disposeMaterialMaps = (m: THREE.Material) => {
      const std = m as THREE.MeshStandardMaterial;
      if (std.map) std.map.dispose();
      if (std.normalMap) std.normalMap.dispose();
      if (std.roughnessMap) std.roughnessMap.dispose();
      if (std.metalnessMap) std.metalnessMap.dispose();
      if (std.aoMap) std.aoMap.dispose();
      if (std.emissiveMap) std.emissiveMap.dispose();
      if (std.bumpMap) std.bumpMap.dispose();
      m.dispose();
    };

    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(disposeMaterialMaps);
        } else if (child.material) {
          disposeMaterialMaps(child.material);
        }
      }
    });

    clearSharedMaterialCache();

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
