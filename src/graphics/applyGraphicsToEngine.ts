/**
 * applyGraphicsToEngine.ts
 * Aplica opções gráficas no motor sem alterar a API pública de fpsEngine.ts.
 * Acessa membros internos via cast seguro.
 */

import * as THREE from 'three';
import { GameSettings, ShadowQuality } from './graphicsSettings';

// Interface parcial para acessar membros internos de TacticalFPSEngine
interface InternalEngineAccess {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  keyLight: THREE.DirectionalLight;
  weaponRig: {
    muzzleLight: THREE.PointLight;
  };
  currentRenderScale: number;
  state: {
    fpsLimit: number;
    dynamicResolutionEnabled: boolean;
    renderScalePercent: number;
  };
}

// Armazena referências originais de normal/bump maps para restauração
const originalMaps = new WeakMap<
  THREE.Material,
  {
    normalMap: THREE.Texture | null;
    bumpMap: THREE.Texture | null;
  }
>();

let lastShadowQuality: ShadowQuality | null = null;
let lastAcesToneMapping: boolean | null = null;
let lastTexturesQuality: string | null = null;
let cachedEnvironmentTex: THREE.Texture | null = null;

export function applyGraphicsToEngine(
  rawEngine: unknown,
  settings: GameSettings
): void {
  if (!rawEngine) return;
  const engine = rawEngine as unknown as InternalEngineAccess;
  const renderer = engine.renderer;
  const scene = engine.scene;
  const camera = engine.camera;
  const keyLight = engine.keyLight;
  const weaponRig = engine.weaponRig;

  if (!renderer || !scene || !camera) return;

  // 1. Limite de FPS e Resolução Dinâmica (DRS)
  // REGRA CRÍTICA: Se fpsLimit for 30 FPS, desliga DRS e fixa escala pois o governador assume alvo 60 FPS
  engine.state.fpsLimit = settings.fpsLimit;

  const maxDpr = Math.min(window.devicePixelRatio || 1, 2.0);
  let resolvedScale = 1.0;
  let enableDrs = true;

  if (settings.fpsLimit === 30 || settings.batterySaver) {
    enableDrs = false;
    switch (settings.resolution) {
      case 'SCALE_50':
        resolvedScale = maxDpr * 0.5;
        break;
      case 'SCALE_65':
        resolvedScale = maxDpr * 0.65;
        break;
      case 'SCALE_80':
        resolvedScale = maxDpr * 0.8;
        break;
      case 'SCALE_100':
        resolvedScale = maxDpr * 1.0;
        break;
      case 'AUTO_ECO':
        resolvedScale = Math.min(maxDpr, 0.75);
        break;
      case 'AUTO_BALANCED':
      case 'AUTO_MAX':
      default:
        resolvedScale = Math.min(maxDpr, 1.0);
        break;
    }
  } else {
    // 60 ou 120 FPS
    if (settings.resolution.startsWith('SCALE_')) {
      enableDrs = false;
      const pct = parseInt(settings.resolution.replace('SCALE_', ''), 10) || 100;
      resolvedScale = maxDpr * (pct / 100);
    } else {
      enableDrs = true;
      if (settings.resolution === 'AUTO_ECO') {
        resolvedScale = Math.min(maxDpr, 0.85);
      } else if (settings.resolution === 'AUTO_MAX') {
        resolvedScale = maxDpr;
      } else {
        // AUTO_BALANCED
        resolvedScale = Math.min(maxDpr, 1.35);
      }
    }
  }

  engine.state.dynamicResolutionEnabled = enableDrs;
  engine.currentRenderScale = resolvedScale;
  renderer.setPixelRatio(resolvedScale);
  engine.state.renderScalePercent = Math.round((resolvedScale / maxDpr) * 100);

  // 2. Tonalidade ACES Filmic vs Linear
  if (lastAcesToneMapping !== settings.acesToneMapping) {
    lastAcesToneMapping = settings.acesToneMapping;
    renderer.toneMapping = settings.acesToneMapping
      ? THREE.ACESFilmicToneMapping
      : THREE.LinearToneMapping;
    renderer.toneMappingExposure = settings.acesToneMapping ? 1.12 : 1.0;
  }

  // 3. Sombras (PCFShadowMap, mapSize e reconstrução de shadow map ao alterar)
  const shadowsActive = settings.shadows !== 'OFF';
  renderer.shadowMap.enabled = shadowsActive;

  if (shadowsActive && keyLight) {
    keyLight.castShadow = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    let targetMapSize = 1024;
    switch (settings.shadows) {
      case 'LOW':
        targetMapSize = 512;
        break;
      case 'MEDIUM':
        targetMapSize = 1024;
        break;
      case 'HIGH':
        targetMapSize = 2048;
        break;
      case 'ULTRA':
        targetMapSize = 4096;
        break;
    }

    if (
      lastShadowQuality !== settings.shadows ||
      keyLight.shadow.mapSize.width !== targetMapSize
    ) {
      keyLight.shadow.mapSize.width = targetMapSize;
      keyLight.shadow.mapSize.height = targetMapSize;
      // Forçar recriação completa do Shadow Map no Three.js
      if (keyLight.shadow.map) {
        keyLight.shadow.map.dispose();
        keyLight.shadow.map = null;
      }
      lastShadowQuality = settings.shadows;
    }
  } else if (keyLight) {
    keyLight.castShadow = false;
    lastShadowQuality = 'OFF';
  }

  // 4. Distância de visão (camera.far)
  let targetFar = 160;
  switch (settings.viewDistance) {
    case 'NEAR':
      targetFar = 80;
      break;
    case 'MEDIUM':
      targetFar = 130;
      break;
    case 'FAR':
      targetFar = 180;
      break;
    case 'ULTRA':
      targetFar = 260;
      break;
  }
  if (Math.abs(camera.far - targetFar) > 1) {
    camera.far = targetFar;
    camera.updateProjectionMatrix();
  }

  // 5. Neblina (Fog)
  if (!settings.fog) {
    scene.fog = null;
  } else if (!scene.fog) {
    scene.fog = new THREE.FogExp2(0x0d121a, 0.014);
  }

  // 6. Reflexos PBR (Environment map)
  if (scene.environment) {
    cachedEnvironmentTex = scene.environment;
  }
  if (settings.pbrReflections) {
    if (!scene.environment && cachedEnvironmentTex) {
      scene.environment = cachedEnvironmentTex;
    }
  } else {
    scene.environment = null;
  }

  // 7. Luz de clarão do cano (Muzzle Light)
  if (weaponRig && weaponRig.muzzleLight) {
    weaponRig.muzzleLight.visible = settings.muzzleLight;
  }

  // 8. Texturas, Anisotropia e Normal/Bump Maps
  if (lastTexturesQuality !== settings.textures) {
    lastTexturesQuality = settings.textures;
    let maxAnisotropy = 1;
    switch (settings.textures) {
      case 'LOW':
        maxAnisotropy = 1;
        break;
      case 'MEDIUM':
        maxAnisotropy = 2;
        break;
      case 'HIGH':
        maxAnisotropy = 4;
        break;
      case 'ULTRA':
        maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        break;
    }

    const isLow = settings.textures === 'LOW';

    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];

        materials.forEach((mat) => {
          if (!mat) return;
          const stdMat = mat as THREE.MeshStandardMaterial;

          // Atualizar anisotropia de texturas
          if (stdMat.map) {
            stdMat.map.anisotropy = maxAnisotropy;
            stdMat.map.needsUpdate = true;
          }

          if (isLow) {
            // Salvar para poder restaurar
            if (!originalMaps.has(mat)) {
              originalMaps.set(mat, {
                normalMap: stdMat.normalMap || null,
                bumpMap: stdMat.bumpMap || null,
              });
            }
            if (stdMat.normalMap || stdMat.bumpMap) {
              stdMat.normalMap = null;
              stdMat.bumpMap = null;
              stdMat.needsUpdate = true;
            }
          } else {
            // Restaurar normal/bump map
            const saved = originalMaps.get(mat);
            if (saved) {
              let needUp = false;
              if (saved.normalMap && stdMat.normalMap !== saved.normalMap) {
                stdMat.normalMap = saved.normalMap;
                needUp = true;
              }
              if (saved.bumpMap && stdMat.bumpMap !== saved.bumpMap) {
                stdMat.bumpMap = saved.bumpMap;
                needUp = true;
              }
              if (needUp) stdMat.needsUpdate = true;
            }
          }
        });
      }
    });
  }
}
