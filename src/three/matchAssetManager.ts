import * as THREE from 'three';
import { soundEngine } from '../audio/soundEngine';
import { DrillMode } from '../types/game';
import {
  disposeAssaultMapGeometry,
  loadAssaultMapGeometry,
} from './assaultLevelBuilder';
import {
  attachProRifleCharacterToBot,
  preloadProRifleBotCharacter,
} from './botCharacterSystem';
import {
  disposeDust2MapGeometry,
  Dust2LevelBundle,
  loadDust2MapGeometry,
} from './dust2LevelBuilder';
import { TacticalGrenadeSystem } from './grenadeSystem';
import {
  disposeIndustriaMapGeometry,
  loadIndustriaMapGeometry,
} from './industriaLevelBuilder';
import {
  disposeHangarMapGeometry,
  loadHangarMapGeometry,
} from './hangarLevelBuilder';
import {
  disposeEasternCityMapGeometry,
  loadEasternCityMapGeometry,
} from './easternCityLevelBuilder';
import { TacticalLevelData } from './levelBuilder';
import {
  markGroupStatic,
  optimizeSceneGraph,
  protectAnimatedSubtrees,
} from './scenePerfOptimizer';
import { TacticalSkySystem } from './skySystem';
import {
  loadStanderTiroMapGeometry,
  StanderTiroBundle,
} from './standerTiroBuilder';
import { YardBotEntity } from './yardPropsBuilder';

export interface MatchArenaPrepareParams {
  mode: DrillMode;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  isSoftwareGl: boolean;
  standerTiroLevelData: TacticalLevelData;
  facilityLevelData: TacticalLevelData;
  yardLevelData: TacticalLevelData;
  dust2LevelData: Dust2LevelBundle;
  assaultLevelData: Dust2LevelBundle;
  industriaLevelData: Dust2LevelBundle;
  hangarLevelData: Dust2LevelBundle;
  easternCityLevelData: Dust2LevelBundle;
  skySystem: TacticalSkySystem;
  grenadeSystem: TacticalGrenadeSystem;
  onProgress: (pct: number, statusLabel: string) => void;
}

/**
 * Gerenciador real de carregamento da partida (Loading 2 - Vanguard vs. Blackthorn):
 * 1. Instancia `THREE.LoadingManager` real + `GLTFLoader` + `DRACOLoader`
 * 2. Baixa e descomprime `/models/maps/de_dust2.glb` ou `/models/maps/cs_assault.glb` sob demanda (0% -> 60%)
 * 3. Constrói `THREE.Box3` e malha espacial de colisão por triângulos (60% -> 72%)
 * 4. Configura o shader atmosférico `Sky` e envia texturas PBR para a VRAM via `initTexture` (72% -> 88%)
 * 5. Compila todos os shaders WebGL (`renderer.compileAsync` / `compile`) e pré-aquece granadas (88% -> 100%)
 */
export async function prepareMatchArena(
  params: MatchArenaPrepareParams
): Promise<void> {
  const {
    mode,
    renderer,
    scene,
    camera,
    isSoftwareGl,
    standerTiroLevelData,
    facilityLevelData,
    yardLevelData,
    dust2LevelData,
    assaultLevelData,
    industriaLevelData,
    hangarLevelData,
    easternCityLevelData,
    skySystem,
    grenadeSystem,
    onProgress,
  } = params;

  const isDust2 = mode === 'DUST2_BOMB_5V5';
  const isAssault = mode === 'ASSAULT_BOMB_5V5';
  const isIndustria = mode === 'INDUSTRIA_BOMB_5V5';
  const isHangar = mode === 'HANGAR_BOMB_5V5';
  const isEasternCity = mode === 'EASTERN_CITY_BOMB_5V5';
  const isYard = mode === 'YARD_BOMB_5V5';
  const isFreeRange = mode === 'FREE_RANGE';

  onProgress(4, 'INICIALIZANDO THREE.LOADINGMANAGER & DRACOLOADER...');

  standerTiroLevelData.levelGroup.visible = isFreeRange;
  facilityLevelData.levelGroup.visible =
    !isDust2 && !isAssault && !isIndustria && !isHangar && !isEasternCity && !isYard && !isFreeRange;
  yardLevelData.levelGroup.visible = isYard;
  dust2LevelData.levelGroup.visible = isDust2;
  assaultLevelData.levelGroup.visible = isAssault;
  industriaLevelData.levelGroup.visible = isIndustria;
  hangarLevelData.levelGroup.visible = isHangar;
  easternCityLevelData.levelGroup.visible = isEasternCity;

  const loadingManager = new THREE.LoadingManager();
  let lastReportedPct = 4;
  const reportProgress = (pct: number, label: string) => {
    const clamped = Math.min(100, Math.max(lastReportedPct, Math.round(pct)));
    lastReportedPct = clamped;
    onProgress(clamped, label);
  };

  loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
    if (itemsTotal > 0) {
      const ratio = itemsLoaded / itemsTotal;
      const mappedPct = 6 + ratio * 52;
      const shortName =
        url.split('/').pop() ||
        (isEasternCity
          ? 'eastern_city_2k.glb'
          : isHangar
          ? 'hangar_2k.glb'
          : isIndustria
            ? 'industria_2k.glb'
            : isAssault
              ? 'cs_assault.glb'
              : 'de_dust2.glb');
      reportProgress(
        mappedPct,
        `BAIXANDO & DESCOMPRIMINDO ${shortName.toUpperCase()} (${itemsLoaded}/${itemsTotal})...`
      );
    }
  };

  // Etapa 1: Download real do .GLB externo + descompressão DRACO + geração de Box3 e Colisores
  if (isDust2) {
    reportProgress(8, 'BAIXANDO ARENA 3D DE_DUST2.GLB VIA GLTFLOADER + DRACO...');
    await loadDust2MapGeometry(
      dust2LevelData,
      isSoftwareGl,
      loadingManager,
      (byteRatio) => {
        const mappedPct = 8 + byteRatio * 52;
        reportProgress(
          mappedPct,
          `TRANSFERINDO MALHA 3D DE_DUST2.GLB (${Math.round(byteRatio * 100)}%)...`
        );
      }
    );

    reportProgress(
      70,
      `COLISORES BOX3 (${dust2LevelData.collider.boundingBoxes.length}) E ${dust2LevelData.collider.triangleCount} TRIÂNGULOS PRONTOS!`
    );
  } else if (isAssault) {
    reportProgress(8, 'BAIXANDO ARENA 3D CS_ASSAULT.GLB VIA GLTFLOADER + DRACO...');
    await loadAssaultMapGeometry(
      assaultLevelData,
      isSoftwareGl,
      loadingManager,
      (byteRatio) => {
        const mappedPct = 8 + byteRatio * 52;
        reportProgress(
          mappedPct,
          `TRANSFERINDO MALHA 3D CS_ASSAULT.GLB (${Math.round(byteRatio * 100)}%)...`
        );
      }
    );

    reportProgress(
      70,
      `COLISORES BOX3 (${assaultLevelData.collider.boundingBoxes.length}) E ${assaultLevelData.collider.triangleCount} TRIÂNGULOS PRONTOS!`
    );
  } else if (isIndustria) {
    reportProgress(8, 'BAIXANDO ARENA 3D INDUSTRIA_2K.GLB VIA GLTFLOADER + DRACO...');
    await loadIndustriaMapGeometry(
      industriaLevelData,
      isSoftwareGl,
      loadingManager,
      (byteRatio) => {
        const mappedPct = 8 + byteRatio * 52;
        reportProgress(
          mappedPct,
          `TRANSFERINDO MALHA 3D INDUSTRIA_2K.GLB (${Math.round(byteRatio * 100)}%)...`
        );
      }
    );

    reportProgress(
      70,
      `COLISORES BOX3 (${industriaLevelData.collider.boundingBoxes.length}) E ${industriaLevelData.collider.triangleCount} TRIÂNGULOS PRONTOS!`
    );
  
  } else if (isHangar) {
    reportProgress(8, 'BAIXANDO ARENA 3D HANGAR_2K.GLB VIA GLTFLOADER + DRACO...');
    await loadHangarMapGeometry(
      hangarLevelData,
      isSoftwareGl,
      loadingManager,
      (byteRatio) => {
        const mappedPct = 8 + byteRatio * 52;
        reportProgress(
          mappedPct,
          `TRANSFERINDO MALHA 3D HANGAR_2K.GLB (${Math.round(byteRatio * 100)}%)...`
        );
      }
    );

    reportProgress(
      70,
      `COLISORES BOX3 (${hangarLevelData.collider.boundingBoxes.length}) E ${hangarLevelData.collider.triangleCount} TRIÂNGULOS PRONTOS!`
    );
  } else if (isEasternCity) {
    reportProgress(8, 'BAIXANDO ARENA 3D EASTERN_CITY_2K.GLB VIA GLTFLOADER + DRACO...');
    await loadEasternCityMapGeometry(
      easternCityLevelData,
      isSoftwareGl,
      loadingManager,
      (byteRatio) => {
        const mappedPct = 8 + byteRatio * 52;
        reportProgress(
          mappedPct,
          `TRANSFERINDO MALHA 3D EASTERN_CITY_2K.GLB (${Math.round(byteRatio * 100)}%)...`
        );
      }
    );

    reportProgress(
      70,
      `COLISORES BOX3 (${easternCityLevelData.collider.boundingBoxes.length}) E ${easternCityLevelData.collider.triangleCount} TRIÂNGULOS PRONTOS!`
    );
} else if (isFreeRange) {
    reportProgress(12, 'BAIXANDO ARENA 3D SHOOTING_RANGE_2K.GLB VIA GLTFLOADER + DRACO...');
    await loadStanderTiroMapGeometry(
      standerTiroLevelData as StanderTiroBundle,
      isSoftwareGl,
      loadingManager
    );
    reportProgress(68, 'ESTANDE DE TIRO 3D E ALVOS BALÍSTICOS PRONTOS!');
  } else {
    reportProgress(55, 'ATIVANDO GEOMETRIA E CAIXAS DE COLISÃO BOX3 DA ARENA...');
  }

  // Etapa 1B: Carregamento do modelo 3D dos Bots (Pro.Rifle.Pack.glb) + 8 Clipes de Animação Mixamo
  if (!isFreeRange) {
    reportProgress(
      72,
      'CARREGANDO OPERADORES 3D (PRO.RIFLE.PACK.GLB) E ANIMAÇÕES MIXAMO...'
    );
    await preloadProRifleBotCharacter(loadingManager);
    const activeTargets = isDust2
      ? dust2LevelData.targets
      : isAssault
        ? assaultLevelData.targets
        : isIndustria
          ? industriaLevelData.targets
          : isHangar
            ? hangarLevelData.targets
            : isEasternCity
              ? easternCityLevelData.targets
            : isYard
            ? yardLevelData.targets
            : facilityLevelData.targets;
    for (let i = 0; i < activeTargets.length; i++) {
      if (activeTargets[i].type === 'COMBAT_BOT') {
        attachProRifleCharacterToBot(
          activeTargets[i] as YardBotEntity,
          isSoftwareGl
        );
      }
    }
  }

  // Etapa 2: Setup do Sky Shader físico + Upload real das texturas PBR para a VRAM (initTexture)
  reportProgress(74, 'CONFIGURANDO SKY SHADER ATMOSFÉRICO E ILUMINAÇÃO SOLAR...');
  skySystem.configureForMode(mode, scene.fog !== null);

  const activeGroup = isDust2
    ? dust2LevelData.levelGroup
    : isAssault
      ? assaultLevelData.levelGroup
      : isIndustria
        ? industriaLevelData.levelGroup
        : isHangar
          ? hangarLevelData.levelGroup
          : isEasternCity
            ? easternCityLevelData.levelGroup
          : isYard
          ? yardLevelData.levelGroup
          : isFreeRange
            ? standerTiroLevelData.levelGroup
            : facilityLevelData.levelGroup;

  // Mobile GPU pass: freeze static matrices, share plain materials, trim tiny shadow casters.
  // Critical: protect Mixamo bones BEFORE freezing — otherwise bots lock in T-pose.
  const mapOnlyGroup =
    (isDust2 && dust2LevelData.mapGeometryGroup) ||
    (isAssault && assaultLevelData.mapGeometryGroup) ||
    (isIndustria && industriaLevelData.mapGeometryGroup) ||
    (isHangar && hangarLevelData.mapGeometryGroup) ||
    (isEasternCity && easternCityLevelData.mapGeometryGroup) ||
    null;

  if (mapOnlyGroup) {
    markGroupStatic(mapOnlyGroup);
    optimizeSceneGraph(mapOnlyGroup, {
      sharePlainMaterials: true,
      freezeStaticMatrices: true,
      minShadowCasterSize: isSoftwareGl ? 99 : 0.4,
    });
  } else {
    markGroupStatic(activeGroup);
    protectAnimatedSubtrees(activeGroup);
    optimizeSceneGraph(activeGroup, {
      sharePlainMaterials: true,
      freezeStaticMatrices: true,
      minShadowCasterSize: isSoftwareGl ? 99 : 0.4,
    });
  }

  if (!isSoftwareGl) {
    const texturesToUpload: THREE.Texture[] = [];
    activeGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const mats = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        mats.forEach((m) => {
          const std = m as THREE.MeshStandardMaterial;
          if (std?.map) texturesToUpload.push(std.map);
          if (std?.normalMap) texturesToUpload.push(std.normalMap);
          if (std?.roughnessMap) texturesToUpload.push(std.roughnessMap);
        });
      }
    });

    const totalTex = Math.max(1, texturesToUpload.length);
    for (let i = 0; i < texturesToUpload.length; i++) {
      renderer.initTexture(texturesToUpload[i]);
      if (i % 4 === 0 || i === texturesToUpload.length - 1) {
        const texRatio = (i + 1) / totalTex;
        reportProgress(
          74 + texRatio * 14,
          `ENVIANDO TEXTURAS PBR PARA A GPU VRAM (${i + 1}/${texturesToUpload.length})...`
        );
      }
    }
  }

  // Etapa 3: Pré-decodificação de áudio tático + Compilação WebGL (renderer.compile)
  reportProgress(90, 'PRÉ-DECODIFICANDO ÁUDIOS TÁTICOS E COMPILANDO SHADERS GPU...');
  await soundEngine.prewarmGrenadeAudio();

  if (!isSoftwareGl) {
    try {
      if (
        'compileAsync' in renderer &&
        typeof renderer.compileAsync === 'function'
      ) {
        await renderer.compileAsync(scene, camera);
      } else {
        renderer.compile(scene, camera);
      }
    } catch {
      renderer.compile(scene, camera);
    }

    reportProgress(
      96,
      'AQUECENDO PIPELINE DE SOMBRAS, VIEWMODEL E GRANADAS NA GPU...'
    );
    grenadeSystem.prewarmShadersAndTextures(renderer, isSoftwareGl);
    renderer.render(scene, camera);
  }

  reportProgress(
    100,
    'ARENA 100% COMPILADA — LIBERANDO CÂMERA E CONTROLES DE COMBATE!'
  );
}

/**
 * Limpa todas as geometrias, materiais, texturas PBR e listas de renderização do mapa da partida
 * quando o jogador sai da partida e volta para o Lobby, prevenindo vazamento de memória (Memory Leak).
 */
export function cleanupMatchArenaAssets(
  renderer: THREE.WebGLRenderer,
  standerTiroLevelData: TacticalLevelData,
  facilityLevelData: TacticalLevelData,
  yardLevelData: TacticalLevelData,
  dust2LevelData: Dust2LevelBundle,
  assaultLevelData: Dust2LevelBundle,
  industriaLevelData: Dust2LevelBundle,
  hangarLevelData: Dust2LevelBundle,
  easternCityLevelData: Dust2LevelBundle,
  grenadeSystem?: TacticalGrenadeSystem
): void {
  // 1. Oculta arenas de partida e reativa apenas o Stander de Tiro do Lobby
  dust2LevelData.levelGroup.visible = false;
  assaultLevelData.levelGroup.visible = false;
  industriaLevelData.levelGroup.visible = false;
  hangarLevelData.levelGroup.visible = false;
  easternCityLevelData.levelGroup.visible = false;
  yardLevelData.levelGroup.visible = false;
  facilityLevelData.levelGroup.visible = false;
  standerTiroLevelData.levelGroup.visible = true;

  // 2. Descarta geometrias BufferGeometry, materiais e texturas dos .glb pesados e limpa colisores
  disposeDust2MapGeometry(dust2LevelData);
  disposeAssaultMapGeometry(assaultLevelData);
  disposeIndustriaMapGeometry(industriaLevelData);
  disposeHangarMapGeometry(hangarLevelData);
  disposeEasternCityMapGeometry(easternCityLevelData);

  // 3. Limpa granadas ativas, fumaça e luzes temporárias
  grenadeSystem?.clearAll();

  // 4. Limpa renderLists internas do WebGLRenderer para liberar referências de memória na GPU
  renderer.renderLists.dispose();
}
