import * as THREE from 'three';
import { soundEngine } from '../audio/soundEngine';
import { buildPreProductionLevel } from './levelBuilder';
import { createProceduralTextures, ProceduralTextures } from './textures';
import { buildTacticalWeaponRig, TacticalWeaponRig } from './weaponBuilder';

export interface PreloadProgressCallback {
  (progressPercent: number, statusLabel: string): void;
}

export interface PreloadResult {
  textures: ProceduralTextures;
  weaponRig: TacticalWeaponRig;
  levelData: ReturnType<typeof buildPreProductionLevel>;
}

export class AssetPreloader {
  public static async executePreloadSequence(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    isSoftwareGl: boolean,
    onProgress: PreloadProgressCallback
  ): Promise<PreloadResult> {
    // -----------------------------------------------------------------------
    // STEP 1: GARBAGE COLLECTION & VRAM/RAM DISPOSAL (0% - 15%)
    // -----------------------------------------------------------------------
    onProgress(5, 'LIMPANDO RECURSOS E MEMÓRIA RAM DO MENU...');
    await delay(100);

    // Dispose old geometries, textures, and materials in scene
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => mat.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      }
    });

    onProgress(15, 'GERANDO TEXTURAS TÁTICAS PBR E BUMP MAPS...');
    await delay(120);

    // -----------------------------------------------------------------------
    // STEP 2: THREE.LOADINGMANAGER & TEXTURE PRELOADING (15% - 50%)
    // -----------------------------------------------------------------------
    const loadingManager = new THREE.LoadingManager();
    loadingManager.onProgress = (_itemUrl, itemsLoaded, itemsTotal) => {
      const pct = Math.min(50, Math.round(15 + (itemsLoaded / itemsTotal) * 35));
      onProgress(pct, `CARREGANDO MODELOS E TEXTURAS 3D (${itemsLoaded}/${itemsTotal})...`);
    };

    const textures = createProceduralTextures(renderer);
    onProgress(35, 'MONTANDO ESTRUTURAS DO ESTANDE E PAREDE DE ARMAS...');
    await delay(100);

    // -----------------------------------------------------------------------
    // STEP 3: PRE-ASSEMBLING WEAPON RIGS & MAP COLLIDERS (50% - 75%)
    // -----------------------------------------------------------------------
    onProgress(50, 'PRÉ-CONSTRUINDO ARSENAL M4A1, AK47, MARK 23 & SNIPERS...');
    const weaponRig = buildTacticalWeaponRig(textures, isSoftwareGl);
    await delay(120);

    onProgress(65, 'CONSTRUINDO MUNDO BALÍSTICO, GONGO AR500 E KILLHOUSE...');
    const levelData = buildPreProductionLevel(textures, isSoftwareGl);
    await delay(120);

    // -----------------------------------------------------------------------
    // STEP 4: PRE-DECODING AUDIO BUFFERS (75% - 90%)
    // -----------------------------------------------------------------------
    onProgress(78, 'DESCOMPACTANDO ÁUDIOS TÁTICOS E SONS DE DISPARO...');
    soundEngine.init();
    await delay(150);

    // -----------------------------------------------------------------------
    // STEP 5: WEBGL SHADER WARMUP & COMPILATION (90% - 100%)
    // -----------------------------------------------------------------------
    onProgress(90, 'COMPILANDO SHADERS WEBGL E MAPA DE SOMBRAS NA GPU...');
    
    // Add temporary rig and level to scene for renderer.compile()
    scene.add(weaponRig.root);
    scene.add(levelData.levelGroup);

    if (!isSoftwareGl) {
      try {
        renderer.compile(scene, camera);
      } catch {
        // Fallback for software renderer
      }
    }

    onProgress(100, 'CARREGAMENTO 100% CONCLUÍDO! PRONTO PARA COMBATE.');
    await delay(150);

    return {
      textures,
      weaponRig,
      levelData,
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
