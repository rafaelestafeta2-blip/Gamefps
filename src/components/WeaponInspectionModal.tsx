import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { soundEngine } from '../audio/soundEngine';
import {
  getRankForXp,
  getRequiredXpForWeapon,
  isWeaponUnlockedAtXp,
} from '../progression/ranks';
import {
  AK47_RIFLE_GITHUB_RAW_URL,
  AK47_RIFLE_LOCAL_URL,
  AK12_RIFLE_GITHUB_RAW_URL,
  AK12_RIFLE_LOCAL_URL,
  CARBINE_AR_GITHUB_RAW_URL,
  CARBINE_AR_LOCAL_URL,
  L49_LMG_GITHUB_RAW_URL,
  L49_LMG_LOCAL_URL,
  M4_FPS_PACK_GITHUB_RAW_URL,
  M4_FPS_PACK_LOCAL_URL,
  MARK_23_GITHUB_RAW_URL,
  MARK_23_LOCAL_URL,
  SMG_45_GITHUB_RAW_URL,
  SMG_45_LOCAL_URL,
  SNIPER_BOLT_GITHUB_RAW_URL,
  SNIPER_BOLT_LOCAL_URL,
  SNIPER_TACTICAL_GITHUB_RAW_URL,
  SNIPER_TACTICAL_LOCAL_URL,
  KNIFE_GITHUB_RAW_URL,
  KNIFE_LOCAL_URL,
} from '../three/weaponBuilder';
import { createBotThirdPersonWeaponMesh } from '../three/botWeaponProps';
import {
  createSecondaryWebGLRenderer,
  disposeSecondaryWebGLRenderer,
} from '../three/webglContextGuard';
import { WeaponId } from '../types/game';
import { WarfaceRankIcon } from './WarfaceRankIcon';

interface WeaponInspectionModalProps {
  activeWeapon: WeaponId;
  playerXp: number;
  onSelectWeapon: (weaponId: WeaponId) => void;
  onClose: () => void;
  onStartTraining: () => void;
}

type WeaponCategory = 'ALL' | 'ASSALTO' | 'ESCOPETA' | 'SMG' | 'SNIPER' | 'LMG' | 'PISTOLA';

interface WeaponSpec {
  id: WeaponId;
  name: string;
  caliber: string;
  categoryTag: string;
  category: WeaponCategory;
  description: string;
  firepower: number; // 0..100
  accuracy: number; // 0..100
  mobility: number; // 0..100
  range: string;
  fireRate: string;
  magSize: number;
  reserve: number;
  localUrl: string;
  githubUrl: string;
  readyClipName?: string;
  readyPoseTime: number;
  targetSpan: number;
}

const WEAPON_SPECS: Record<WeaponId, WeaponSpec> = {
  M4_CARBINE: {
    id: 'M4_CARBINE',
    name: 'M4A1 SOPMOD',
    caliber: '5.56x45mm NATO',
    categoryTag: 'Fuzil de Assalto',
    category: 'ASSALTO',
    description:
      'O padrão ouro em fuzis de assalto táticos. Versátil, equilibrado e com excelente controle de recuo.',
    firepower: 85,
    accuracy: 84,
    mobility: 78,
    range: '75m',
    fireRate: '800 RPM',
    magSize: 30,
    reserve: 120,
    localUrl: M4_FPS_PACK_LOCAL_URL,
    githubUrl: M4_FPS_PACK_GITHUB_RAW_URL,
    readyClipName: 'allanims',
    readyPoseTime: 0,
    targetSpan: 0.78,
  },
  AK47_RIFLE: {
    id: 'AK47_RIFLE',
    name: 'AK-47 COMANDO',
    caliber: '7.62x39mm Soviet',
    categoryTag: 'Fuzil de Assalto',
    category: 'ASSALTO',
    description:
      'Poder de fogo bruto em calibre 7.62mm. Causa dano devastador por impacto com alta penetração.',
    firepower: 96,
    accuracy: 72,
    mobility: 70,
    range: '90m',
    fireRate: '600 RPM',
    magSize: 30,
    reserve: 120,
    localUrl: AK47_RIFLE_LOCAL_URL,
    githubUrl: AK47_RIFLE_GITHUB_RAW_URL,
    readyClipName: 'RIG_UE5_Comando_AK_Idle',
    readyPoseTime: 0,
    targetSpan: 0.8,
  },
  AK12_RIFLE: {
    id: 'AK12_RIFLE',
    name: 'AK-12 SPETSNAZ',
    caliber: '5.45x39mm Russian',
    categoryTag: 'Fuzil de Assalto',
    category: 'ASSALTO',
    description:
      'Fuzil de assalto moderno russo de 5ª geração com trilhos Picatinny integrados, mira óptica tática e recuo controlado.',
    firepower: 93,
    accuracy: 86,
    mobility: 76,
    range: '85m',
    fireRate: '700 RPM',
    magSize: 30,
    reserve: 120,
    localUrl: AK12_RIFLE_LOCAL_URL,
    githubUrl: AK12_RIFLE_GITHUB_RAW_URL,
    readyClipName: 'Idle',
    readyPoseTime: 0,
    targetSpan: 0.8,
  },
  CARBINE_AR: {
    id: 'CARBINE_AR',
    name: 'CARABINA TÁTICA',
    caliber: '5.56x45mm NATO',
    categoryTag: 'Fuzil de Assalto',
    category: 'ASSALTO',
    description:
      'Variante de cano longo focada em engajamentos de média distância com alta precisão balística.',
    firepower: 88,
    accuracy: 89,
    mobility: 75,
    range: '85m',
    fireRate: '750 RPM',
    magSize: 30,
    reserve: 120,
    localUrl: CARBINE_AR_LOCAL_URL,
    githubUrl: CARBINE_AR_GITHUB_RAW_URL,
    readyClipName: 'allanims',
    readyPoseTime: 0,
    targetSpan: 0.78,
  },
  SMG_45: {
    id: 'SMG_45',
    name: 'SMG .45 SUB',
    caliber: '.45 ACP Sub',
    categoryTag: 'Submetralhadora',
    category: 'SMG',
    description:
      'Submetralhadora compacta de tiro rápido (900 RPM). Ideal para incursões CQB e combate dinâmico.',
    firepower: 75,
    accuracy: 78,
    mobility: 92,
    range: '35m',
    fireRate: '900 RPM',
    magSize: 32,
    reserve: 128,
    localUrl: SMG_45_LOCAL_URL,
    githubUrl: SMG_45_GITHUB_RAW_URL,
    readyClipName: 'allanims',
    readyPoseTime: 0,
    targetSpan: 0.68,
  },
  SMG_MP5: {
    id: 'SMG_MP5',
    name: 'MP5A3 TÁTICA',
    caliber: '9x19mm Parabellum',
    categoryTag: 'Submetralhadora',
    category: 'SMG',
    description:
      'Submetralhadora clássica de forças especiais com controle excepcional de rajada e carregador curvo 9mm.',
    firepower: 72,
    accuracy: 85,
    mobility: 94,
    range: '40m',
    fireRate: '830 RPM',
    magSize: 30,
    reserve: 120,
    localUrl: '',
    githubUrl: '',
    readyPoseTime: 0,
    targetSpan: 0.7,
  },
  SHOTGUN_12: {
    id: 'SHOTGUN_12',
    name: 'M870 BREACHER 12GA',
    caliber: 'Calibre 12 Buckshot',
    categoryTag: 'Escopeta Pump 12GA',
    category: 'ESCOPETA',
    description:
      'Escopeta tática Pump-Action de curto alcance. Dispara 8 bagos de chumbo 00-Buckshot letais em combate próximo.',
    firepower: 100,
    accuracy: 62,
    mobility: 82,
    range: '14m',
    fireRate: 'Pump 88 RPM',
    magSize: 6,
    reserve: 24,
    localUrl: '',
    githubUrl: '',
    readyPoseTime: 0,
    targetSpan: 0.78,
  },
  SHOTGUN_SPAS: {
    id: 'SHOTGUN_SPAS',
    name: 'SPAS-12 TÁTICA 12GA',
    caliber: 'Calibre 12 Magnum',
    categoryTag: 'Escopeta Semiautomática',
    category: 'ESCOPETA',
    description:
      'Escopeta de combate semiautomática com tubo de 8 cartuchos e altíssima cadência em corredores CQB.',
    firepower: 96,
    accuracy: 64,
    mobility: 78,
    range: '15m',
    fireRate: 'Semi 188 RPM',
    magSize: 8,
    reserve: 32,
    localUrl: '',
    githubUrl: '',
    readyPoseTime: 0,
    targetSpan: 0.8,
  },
  SNIPER_TACTICAL: {
    id: 'SNIPER_TACTICAL',
    name: 'SNIPER TÁTICA S&B',
    caliber: '.308 Winchester',
    categoryTag: 'Fuzil Sniper',
    category: 'SNIPER',
    description:
      'Fuzil semiautomático de longo alcance equipado com luneta LPVO para neutralização rápida.',
    firepower: 98,
    accuracy: 96,
    mobility: 58,
    range: '130m',
    fireRate: 'Semi-Auto',
    magSize: 10,
    reserve: 40,
    localUrl: SNIPER_TACTICAL_LOCAL_URL,
    githubUrl: SNIPER_TACTICAL_GITHUB_RAW_URL,
    readyClipName: 'Scene',
    readyPoseTime: 8.15,
    targetSpan: 0.84,
  },
  SNIPER_BOLT: {
    id: 'SNIPER_BOLT',
    name: 'SNIPER BOLT-ACTION',
    caliber: '.338 Lapua Magnum',
    categoryTag: 'Fuzil de Precisão',
    category: 'SNIPER',
    description:
      'Poder letal absoluto a 150m+. Cada disparo exige ciclagens manuais precisas do ferrolho tático.',
    firepower: 100,
    accuracy: 99,
    mobility: 50,
    range: '150m+',
    fireRate: 'Ferrolho',
    magSize: 5,
    reserve: 25,
    localUrl: SNIPER_BOLT_LOCAL_URL,
    githubUrl: SNIPER_BOLT_GITHUB_RAW_URL,
    readyClipName: 'allanims',
    readyPoseTime: 0,
    targetSpan: 0.86,
  },
  L49_LMG: {
    id: 'L49_LMG',
    name: 'LMG PESADA 100R',
    caliber: '5.56x45mm NATO',
    categoryTag: 'Metralhadora Leve',
    category: 'LMG',
    description:
      'Pente tambor de 100 munições para supressão contínua de fogo em ondas inimigas.',
    firepower: 82,
    accuracy: 70,
    mobility: 55,
    range: '95m',
    fireRate: '850 RPM',
    magSize: 100,
    reserve: 300,
    localUrl: L49_LMG_LOCAL_URL,
    githubUrl: L49_LMG_GITHUB_RAW_URL,
    readyClipName: 'allanims',
    readyPoseTime: 0,
    targetSpan: 0.8,
  },
  P50_PISTOL: {
    id: 'P50_PISTOL',
    name: 'MARK 23 TÁTICA',
    caliber: '.45 ACP Heavy',
    categoryTag: 'Pistola Pesada',
    category: 'PISTOLA',
    description:
      'Pistola tática de alta precisão com excelente poder de parada em curtas distâncias.',
    firepower: 65,
    accuracy: 88,
    mobility: 95,
    range: '25m',
    fireRate: 'Semi-Auto',
    magSize: 12,
    reserve: 48,
    localUrl: MARK_23_LOCAL_URL,
    githubUrl: MARK_23_GITHUB_RAW_URL,
    readyClipName: 'Shoot',
    readyPoseTime: 0,
    targetSpan: 0.52,
  },
  KNIFE_TACTICAL: {
    id: 'KNIFE_TACTICAL',
    name: 'FACA TÁTICA COMBATE',
    caliber: 'Aço Carbono Militar 8Cr13MoV',
    categoryTag: 'Lâmina Corpo a Corpo',
    category: 'PISTOLA',
    description:
      'Lâmina tática militar com empunhadura ergonômica e quebra-vidro no pomo. Ataque corpo a corpo silencioso com letalidade extrema a curta distância.',
    firepower: 100,
    accuracy: 100,
    mobility: 100,
    range: '2.4m',
    fireRate: 'Manual',
    magSize: 1,
    reserve: 0,
    localUrl: KNIFE_LOCAL_URL,
    githubUrl: KNIFE_GITHUB_RAW_URL,
    readyClipName: 'anims',
    readyPoseTime: 0,
    targetSpan: 0.42,
  },
};

// Exact material and mesh/node names corresponding to hands, arms, gloves, shirts, and spare reload mags across all 8 GLBs
const HIDDEN_ARM_MATERIAL_NAMES = new Set([
  'arms',
  'arms_0',
  'hand_d',
  'glove_d',
  'm_gloves_black',
  'm_shirt_blackcamo2',
  'textura',
  'v_hands_gloves_sf2.tga',
  'v_hands_sleeves_sf2.tga',
  'v_hands_watch_sf2_d.tga.001',
  'dmc5_soldier_gear_mat',
  'dmc5_soldier_hands_mat',
  'dmc5_soldier_shirt_mat',
]);

const HIDDEN_ARM_NODE_NAMES = new Set([
  'object_25',
  'object_26',
  'object_51',
  'object_80',
  'object_84',
  'object_102',
  'object_122',
  'object_124',
  'object_126',
  'object_128',
  'mag2_j_051',
  'mag2',
  'mag2_m4_d_0',
  'mag.001',
  'mag.001_0',
  'bullets',
  'bullets_0',
  'requests_studio_hands',
  'requests_studio_hands_0',
  'requests_studio_hands_1',
  'watch',
  'watch_0',
  'ch22_body',
  'ch22_body_textura_0',
  'armmesh_arms_0',
  'arms_arms_0',
  'hand_mesh_hand_d_0',
  'hand_mesh_glove_d_0',
  'skm_comando_m_gloves_black_0',
  'skm_comando_m_shirt_blackcamo2_0',
]);

function isArmOrExtraMesh(obj: THREE.Object3D): boolean {
  const nodeName = (obj.name || '').toLowerCase();
  if (HIDDEN_ARM_NODE_NAMES.has(nodeName)) return true;

  const mesh = obj as THREE.Mesh;
  if (mesh.isMesh) {
    const geomName = (mesh.geometry?.name || '').toLowerCase();
    if (HIDDEN_ARM_NODE_NAMES.has(geomName)) return true;

    const mats = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : [];
    for (const mat of mats) {
      if (!mat) continue;
      const matName = (mat.name || '').toLowerCase();
      if (
        HIDDEN_ARM_MATERIAL_NAMES.has(matName) ||
        matName.includes('glove') ||
        matName.includes('shirt') ||
        matName.includes('hand') ||
        matName === 'arms'
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Computes the exact world-space bounding box of ONLY visible weapon meshes,
 * accounting for SkinnedMesh bone transformations.
 */
function computeVisibleWeaponBounds(rootObj: THREE.Object3D): THREE.Box3 {
  rootObj.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const v = new THREE.Vector3();

  rootObj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    if (isArmOrExtraMesh(mesh)) {
      mesh.visible = false;
      return;
    }

    const posAttr = mesh.geometry?.getAttribute('position');
    if (!posAttr) return;

    const count = posAttr.count;
    // Sample vertices (step by max 1..3 for instant calculation on mobile CPUs)
    const step = count > 3000 ? 3 : 1;
    for (let i = 0; i < count; i += step) {
      mesh.getVertexPosition(i, v);
      v.applyMatrix4(mesh.matrixWorld);
      if (
        Number.isFinite(v.x) &&
        Number.isFinite(v.y) &&
        Number.isFinite(v.z)
      ) {
        box.expandByPoint(v);
      }
    }
  });

  return box;
}

const WeaponIconSilhouette: React.FC<{
  weaponId: WeaponId;
  className?: string;
}> = ({ weaponId, className = 'w-16 h-8' }) => {
  if (weaponId === 'P50_PISTOL') {
    return (
      <svg viewBox="0 0 64 28" fill="none" className={className}>
        <path
          d="M14 7H46L48 11H30L26 23H17L20 12H14V7Z"
          fill="currentColor"
        />
        <rect
          x="28"
          y="11"
          width="6"
          height="4"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    );
  }
  if (weaponId === 'SNIPER_BOLT' || weaponId === 'SNIPER_TACTICAL') {
    return (
      <svg viewBox="0 0 88 28" fill="none" className={className}>
        <path
          d="M4 13L18 11V17L4 19V13ZM18 11H58V14H84V12.5H87V15.5H58V17H38L35 23H29L31 17H22L19 22H15L18 11Z"
          fill="currentColor"
        />
        <rect
          x="28"
          y="6"
          width="22"
          height="3.5"
          rx="1"
          fill="currentColor"
        />
        <line
          x1="33"
          y1="9.5"
          x2="33"
          y2="11"
          stroke="currentColor"
          strokeWidth="2"
        />
        <line
          x1="45"
          y1="9.5"
          x2="45"
          y2="11"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 84 28" fill="none" className={className}>
      <path
        d="M6 11L18 10V16L6 18V11ZM18 10H56V12H76V11H80V14.5H56V16H42L39 24H33L35 16H25L22 22H17L20 16H18V10Z"
        fill="currentColor"
      />
      <rect x="30" y="6.5" width="12" height="3" rx="1" fill="currentColor" />
    </svg>
  );
};

export const WeaponInspectionModal: React.FC<WeaponInspectionModalProps> = ({
  activeWeapon,
  playerXp,
  onSelectWeapon,
  onClose,
  onStartTraining,
}) => {
  const [selectedId, setSelectedId] = useState<WeaponId>(activeWeapon);
  const [activeCategory, setActiveCategory] = useState<WeaponCategory>('ALL');
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(true);

  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const turntablePivotRef = useRef<THREE.Group | null>(null);
  const loaderRef = useRef<GLTFLoader | null>(null);

  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  // Start at a side profile angle (Math.PI * 0.5) so the entire weapon profile is framed horizontally
  const targetRotYRef = useRef(Math.PI * 0.42);
  const currentRotYRef = useRef(Math.PI * 0.42);
  const targetRotXRef = useRef(0.06);
  const currentRotXRef = useRef(0.06);
  const zoomScaleRef = useRef(1.0);

  const currentRank = getRankForXp(playerXp);
  const spec = WEAPON_SPECS[selectedId];
  const isUnlocked = isWeaponUnlockedAtXp(selectedId, playerXp);
  const reqRank = getRequiredXpForWeapon(selectedId);
  const isEquipped = activeWeapon === selectedId;

  // Filter weapon list by category
  const weaponList = (Object.keys(WEAPON_SPECS) as WeaponId[]).filter((id) => {
    if (activeCategory === 'ALL') return true;
    return WEAPON_SPECS[id].category === activeCategory;
  });

  // 1. Initialize persistent WebGL studio inside the dedicated right/center showcase stage
  useEffect(() => {
    const container = stageContainerRef.current;
    if (!container) return;

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);

    const renderer = createSecondaryWebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // High-contrast Gunsmith Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 3.2);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    rimLight.position.set(-4, 3, -3);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xf59e0b, 1.1);
    fillLight.position.set(0, -3, 3);
    scene.add(fillLight);

    const camera = new THREE.PerspectiveCamera(32, width / height, 0.05, 25);
    camera.position.set(0, 0.02, 1.12);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const turntablePivot = new THREE.Group();
    turntablePivot.position.set(0, 0.02, 0);
    scene.add(turntablePivot);
    turntablePivotRef.current = turntablePivot;

    // Configure GLTFLoader with KHR_materials_pbrSpecularGlossiness support
    const gltfLoader = new GLTFLoader();
    gltfLoader.register((parser) => ({
      name: 'KHR_materials_pbrSpecularGlossiness',
      extendMaterialParams: async (
        materialIndex: number,
        materialParams: Record<string, unknown>
      ) => {
        const matDef = parser.json.materials?.[materialIndex];
        const sg = matDef?.extensions?.KHR_materials_pbrSpecularGlossiness;
        if (!sg) return;
        materialParams.color = new THREE.Color(1, 1, 1);
        materialParams.roughness = matDef.name === 'M4_D' ? 0.34 : 0.55;
        materialParams.metalness = matDef.name === 'M4_D' ? 0.75 : 0.08;
        if (sg.diffuseTexture) {
          await parser.assignTexture(
            materialParams,
            'map',
            sg.diffuseTexture,
            THREE.SRGBColorSpace
          );
        }
      },
    }));
    loaderRef.current = gltfLoader;

    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);

      if (!isDraggingRef.current) {
        targetRotYRef.current += dt * 0.38;
      }

      currentRotYRef.current = THREE.MathUtils.damp(
        currentRotYRef.current,
        targetRotYRef.current,
        14,
        dt
      );
      currentRotXRef.current = THREE.MathUtils.damp(
        currentRotXRef.current,
        targetRotXRef.current,
        14,
        dt
      );

      if (turntablePivotRef.current) {
        turntablePivotRef.current.rotation.set(
          currentRotXRef.current,
          currentRotYRef.current,
          0
        );
        turntablePivotRef.current.scale.setScalar(zoomScaleRef.current);
      }

      renderer.render(scene, camera);
    };

    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!stageContainerRef.current || !rendererRef.current || !cameraRef.current)
        return;
      const w = Math.max(1, stageContainerRef.current.clientWidth);
      const h = Math.max(1, stageContainerRef.current.clientHeight);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      rendererRef.current = null;
      disposeSecondaryWebGLRenderer(renderer);
    };
  }, []);

  // 2. Load, strip hands/arms, evaluate ready pose, and auto-center the selected weapon
  useEffect(() => {
    const loader = loaderRef.current;
    const turntablePivot = turntablePivotRef.current;
    if (!loader || !turntablePivot) return;

    let cancelled = false;
    setIsLoadingModel(true);

    // Clear previous weapon from turntable
    while (turntablePivot.children.length > 0) {
      const prev = turntablePivot.children[0];
      turntablePivot.remove(prev);
    }

    const wSpec = WEAPON_SPECS[selectedId];

    const onModelLoaded = (gltf: {
      scene: THREE.Group;
      animations: THREE.AnimationClip[];
    }) => {
      if (cancelled) return;

      const modelScene = gltf.scene;

      // 1) Strip all hand, arm, glove, shirt, and spare reload magazine meshes
      modelScene.traverse((child) => {
        child.frustumCulled = false;
        if (isArmOrExtraMesh(child)) {
          child.visible = false;
          return;
        }
        const m = child as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = false;
          m.receiveShadow = true;
          const fixMat = (mat: THREE.Material) => {
            const std = mat as THREE.MeshStandardMaterial;
            if (std.map) {
              std.map.colorSpace = THREE.SRGBColorSpace;
              std.map.needsUpdate = true;
            }
            if (std.color) {
              std.color.setHex(0xffffff);
            }
            if (
              selectedId === 'M4_CARBINE' &&
              ((std.name || '').toLowerCase() === 'lens' ||
                m.name.toLowerCase().includes('lens_lens'))
            ) {
              std.transparent = true;
              std.opacity = 1.0;
              std.depthWrite = false;
              m.renderOrder = 12;
            }
            std.needsUpdate = true;
          };
          if (Array.isArray(m.material)) {
            m.material.forEach(fixMat);
          } else if (m.material) {
            fixMat(m.material);
          }
        }
      });

      // 2) Evaluate the ready/assembled animation pose so magazine, bolt, and scope sit in place
      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(modelScene);
        const targetClip =
          (wSpec.readyClipName &&
            gltf.animations.find((c) => c.name === wSpec.readyClipName)) ||
          gltf.animations[0];

        if (targetClip) {
          // Shift tracks if clip has leading time offset
          let minT = Infinity;
          for (let i = 0; i < targetClip.tracks.length; i++) {
            const tArr = targetClip.tracks[i].times;
            if (tArr.length > 0 && tArr[0] < minT) {
              minT = tArr[0];
            }
          }
          const evalTime =
            wSpec.readyPoseTime > 0
              ? wSpec.readyPoseTime
              : Number.isFinite(minT) && minT > 0.005
                ? minT + 0.01
                : 0.01;

          const action = mixer.clipAction(targetClip);
          action.weight = 1.0;
          action.play();
          mixer.setTime(evalTime);
        }
      }

      // Ensure all hand/arm meshes remain hidden after animation evaluation
      modelScene.traverse((child) => {
        if (isArmOrExtraMesh(child)) {
          child.visible = false;
        }
      });

      // 3) Compute exact world-space bounding box of ONLY visible weapon parts
      const centeringGroup = new THREE.Group();
      centeringGroup.add(modelScene);
      modelScene.updateMatrixWorld(true);

      const box = computeVisibleWeaponBounds(modelScene);
      if (!box.isEmpty()) {
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);

        const maxDim = Math.max(size.x, size.y, size.z, 0.001);
        const normScale = wSpec.targetSpan / maxDim;

        // Translate modelScene so its geometric center sits at (0,0,0) of centeringGroup
        modelScene.position.set(
          -center.x * normScale,
          -center.y * normScale,
          -center.z * normScale
        );
        modelScene.scale.setScalar(normScale);
      }

      // Set side-profile angle so weapon points cleanly across the viewing stage
      targetRotYRef.current = Math.PI * 0.45;
      currentRotYRef.current = Math.PI * 0.45;
      targetRotXRef.current = 0.05;
      currentRotXRef.current = 0.05;
      zoomScaleRef.current = 1.0;

      turntablePivot.add(centeringGroup);
      setIsLoadingModel(false);
    };

    if (!wSpec.localUrl) {
      const procModel = createBotThirdPersonWeaponMesh(selectedId, true);
      procModel.rotation.x = -0.16;
      const centeringGroup = new THREE.Group();
      centeringGroup.add(procModel);
      procModel.updateMatrixWorld(true);
      const box = computeVisibleWeaponBounds(procModel);
      if (!box.isEmpty()) {
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z, 0.001);
        const normScale = wSpec.targetSpan / maxDim;
        procModel.position.set(
          -center.x * normScale,
          -center.y * normScale,
          -center.z * normScale
        );
        procModel.scale.setScalar(normScale);
      }
      targetRotYRef.current = Math.PI * 0.45;
      currentRotYRef.current = Math.PI * 0.45;
      targetRotXRef.current = 0.05;
      currentRotXRef.current = 0.05;
      zoomScaleRef.current = 1.0;
      turntablePivot.add(centeringGroup);
      setIsLoadingModel(false);
      return () => {
        cancelled = true;
      };
    }

    loader.load(wSpec.localUrl, onModelLoaded, undefined, () => {
      loader.load(wSpec.githubUrl, onModelLoaded, undefined, () => {
        if (!cancelled) setIsLoadingModel(false);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // Touch and Mouse 360° Drag Inspection Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    lastXRef.current = e.clientX;
    lastYRef.current = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastXRef.current;
    const dy = e.clientY - lastYRef.current;
    lastXRef.current = e.clientX;
    lastYRef.current = e.clientY;
    targetRotYRef.current += dx * 0.01;
    targetRotXRef.current = THREE.MathUtils.clamp(
      targetRotXRef.current + dy * 0.006,
      -0.45,
      0.45
    );
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleZoomStep = (delta: number) => {
    soundEngine.playMenuSelect();
    zoomScaleRef.current = THREE.MathUtils.clamp(
      zoomScaleRef.current + delta,
      0.75,
      1.65
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#07090d] select-none text-white font-sans flex flex-col justify-between overflow-hidden pointer-events-auto">
      {/* =================================================================== */}
      {/* 1. TOP NAV HEADER BAR                                              */}
      {/* =================================================================== */}
      <header className="relative z-30 w-full px-3 sm:px-6 py-2 bg-[#0b0e14]/95 border-b border-white/15 flex items-center justify-between gap-2 shrink-0">
        {/* Left: Back to Lobby Button */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playMenuSelect();
            onClose();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[11px] font-mono font-bold text-slate-200 hover:text-white transition-colors cursor-pointer shrink-0"
        >
          <span>←</span>
          <span>VOLTAR AO LOBBY</span>
        </button>

        {/* Center Category Filter Tabs */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: 'TODAS' },
            { id: 'ASSALTO', label: 'ASSALTO' },
            { id: 'ESCOPETA', label: '12GA' },
            { id: 'SMG', label: 'SMG' },
            { id: 'SNIPER', label: 'SNIPER' },
            { id: 'LMG', label: 'LMG' },
            { id: 'PISTOLA', label: 'PISTOLA' },
          ].map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  soundEngine.playMenuSelect();
                  setActiveCategory(cat.id as WeaponCategory);
                }}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-mono font-bold tracking-wider transition-colors cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-black shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                    : 'bg-black/50 text-slate-400 hover:text-slate-200 border border-white/10'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Right: Player Warface Rank Badge */}
        <div className="hidden sm:flex items-center gap-2 bg-black/60 border border-amber-500/40 rounded-xl px-2.5 py-1 shrink-0">
          <WarfaceRankIcon level={currentRank.level} className="w-5 h-5" />
          <span className="text-[10px] font-mono font-bold text-amber-300">
            NÍV. {currentRank.level} · {currentRank.title.toUpperCase()}
          </span>
        </div>
      </header>

      {/* =================================================================== */}
      {/* 2. SPLIT WORKSPACE: LEFT SPECS PANEL + RIGHT 3D VIEWING STAGE       */}
      {/* =================================================================== */}
      <div className="relative flex-1 w-full flex flex-row items-stretch overflow-hidden min-h-0">
        {/* LEFT COLUMN: Dedicated Tactical Info & Specs Panel (Never overlaps 3D weapon!) */}
        <aside className="relative z-20 w-64 sm:w-76 md:w-84 shrink-0 px-4 py-3 bg-[#090c12]/90 border-r border-white/10 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="text-[10px] font-mono font-bold text-amber-400 tracking-widest uppercase">
              {spec.categoryTag} · {spec.caliber}
            </div>
            <h1 className="font-display font-black text-xl sm:text-2xl text-white tracking-wider mt-0.5 leading-tight">
              {spec.name}
            </h1>
            <p className="font-mono text-[10px] text-slate-300 mt-1 leading-snug opacity-90 line-clamp-2">
              {spec.description}
            </p>
          </div>

          {/* Tactical Stats Box */}
          <div className="bg-black/60 border border-white/15 rounded-xl p-2.5 my-1.5">
            <div className="text-[9px] font-mono font-bold text-amber-400 tracking-wider uppercase mb-1.5">
              ESPECIFICAÇÕES TÁTICAS
            </div>
            <div className="space-y-1.5 font-mono text-xs">
              {[
                { label: 'DANO', val: spec.firepower, color: 'bg-amber-500' },
                { label: 'PRECISÃO', val: spec.accuracy, color: 'bg-emerald-500' },
                { label: 'MOBILIDADE', val: spec.mobility, color: 'bg-sky-500' },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-2">
                  <span className="w-20 text-[9px] text-slate-400 shrink-0">
                    {stat.label}
                  </span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                    <div
                      className={`h-full ${stat.color}`}
                      style={{ width: `${stat.val}%` }}
                    />
                  </div>
                  <span className="w-7 text-right text-[10px] font-bold text-white">
                    {stat.val}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-[10px] text-slate-300 pt-1.5 mt-1 border-t border-white/10">
                <span>
                  ALCANCE: <b className="text-white">{spec.range}</b>
                </span>
                <span>
                  CADÊNCIA: <b className="text-white">{spec.fireRate}</b>
                </span>
                <span>
                  PENTE: <b className="text-amber-300">{spec.magSize}R</b>
                </span>
              </div>
            </div>
          </div>

          {/* Unlock status banner if locked */}
          {!isUnlocked && (
            <div className="text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1">
              🔒 Requer Nível {reqRank.requiredLevel} ({reqRank.rankTitle})
            </div>
          )}
        </aside>

        {/* RIGHT STAGE: Dedicated, Unobstructed 3D Weapon Showcase Viewport */}
        <div
          className="relative flex-1 h-full overflow-hidden cursor-grab active:cursor-grabbing bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.45)_0%,rgba(7,9,13,0.98)_75%)]"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Subtle Studio Showcase Frame & Reticle Backdrop */}
          <div className="absolute inset-4 border border-white/10 rounded-2xl pointer-events-none flex items-center justify-center">
            <div className="w-44 h-44 sm:w-56 sm:h-56 rounded-full border border-amber-500/15 bg-amber-500/[0.02]" />
          </div>

          {/* Dedicated 3D WebGL Canvas */}
          <div ref={stageContainerRef} className="absolute inset-0 w-full h-full z-10" />

          {/* Loading Indicator */}
          {isLoadingModel && (
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <div className="px-3 py-1.5 rounded-lg bg-black/80 border border-amber-500/40 font-mono text-xs text-amber-300">
                CARREGANDO MODELO 3D...
              </div>
            </div>
          )}

          {/* Top Bar inside Stage: 360° Hint + Zoom Controls */}
          <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
            <div className="bg-black/70 border border-amber-500/30 rounded-lg px-2.5 py-1 text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
              ESTÚDIO DE INSPEÇÃO 3D · SOMENTE ARMA
            </div>

            <div className="flex items-center gap-1.5 pointer-events-auto">
              <button
                type="button"
                onClick={() => handleZoomStep(-0.15)}
                className="px-2.5 py-1 rounded-lg bg-black/75 hover:bg-white/15 border border-white/20 font-mono text-xs font-bold text-white cursor-pointer"
                title="Diminuir Zoom"
              >
                − ZOOM
              </button>
              <button
                type="button"
                onClick={() => handleZoomStep(0.15)}
                className="px-2.5 py-1 rounded-lg bg-black/75 hover:bg-white/15 border border-white/20 font-mono text-xs font-bold text-amber-300 cursor-pointer"
                title="Aumentar Zoom"
              >
                + ZOOM
              </button>
              <div className="hidden md:flex bg-black/65 border border-white/15 rounded-lg px-2.5 py-1 items-center gap-1.5 font-mono text-[10px] text-slate-300">
                <span>ARRASTE PARA GIRAR 360°</span>
              </div>
            </div>
          </div>

          {/* Bottom Bar inside Stage: Action Buttons tucked cleanly at bottom-right */}
          <div className="absolute bottom-3 right-4 z-20 pointer-events-auto flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                soundEngine.playMenuSelect();
                onSelectWeapon(selectedId);
              }}
              className={`px-5 py-2 rounded-xl font-display font-black text-xs sm:text-sm uppercase tracking-widest transition-all cursor-pointer ${
                isEquipped
                  ? 'bg-emerald-600 text-white shadow-[0_0_16px_rgba(16,185,129,0.45)]'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_16px_rgba(245,158,11,0.45)] active:scale-95'
              }`}
            >
              {isEquipped ? 'EQUIPADA ✓' : 'EQUIPAR ARMA'}
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playMenuSelect();
                onSelectWeapon(selectedId);
                onClose();
                onStartTraining();
              }}
              className="px-4 py-2 rounded-xl font-display font-black text-xs sm:text-sm uppercase tracking-widest bg-black/80 hover:bg-white/20 border border-white/30 text-white transition-all cursor-pointer active:scale-95 shadow-lg"
            >
              TESTAR NO ESTANDE
            </button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. BOTTOM HORIZONTAL WEAPON SELECTOR CAROUSEL                       */}
      {/* =================================================================== */}
      <footer className="relative z-30 w-full px-3 sm:px-6 py-2 bg-[#0a0d12]/95 border-t border-white/15 shrink-0 overflow-x-auto">
        <div className="flex items-center gap-2.5 min-w-max">
          {weaponList.map((wId) => {
            const wSpec = WEAPON_SPECS[wId];
            const isSelected = selectedId === wId;
            const isEq = activeWeapon === wId;
            const unlocked = isWeaponUnlockedAtXp(wId, playerXp);
            const req = getRequiredXpForWeapon(wId);

            return (
              <button
                key={wId}
                type="button"
                onClick={() => {
                  soundEngine.playMenuSelect();
                  setSelectedId(wId);
                }}
                className={`relative w-42 sm:w-46 h-16 rounded-xl border p-2 flex flex-col justify-between transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-gradient-to-t from-amber-500/25 to-black/80 border-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                    : unlocked
                      ? 'bg-black/60 border-white/20 hover:border-white/40 hover:bg-white/10'
                      : 'bg-black/80 border-slate-800 opacity-75'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-amber-400 font-bold truncate">
                    {wSpec.caliber}
                  </span>
                  {isEq ? (
                    <span className="text-[8px] font-mono font-black bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded">
                      EQUIPADA
                    </span>
                  ) : !unlocked ? (
                    <span className="text-[8px] font-mono font-bold text-amber-400">
                      🔒 NÍV {req.requiredLevel}
                    </span>
                  ) : null}
                </div>

                {/* Center SVG Silhouette & Name */}
                <div className="flex items-center gap-2">
                  <WeaponIconSilhouette
                    weaponId={wId}
                    className="w-11 h-5 text-white/90 shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-display font-black text-xs text-white truncate leading-tight">
                      {wSpec.name}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 truncate">
                      {wSpec.categoryTag}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
};
