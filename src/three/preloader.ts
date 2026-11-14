import * as THREE from 'three';
import { soundEngine } from '../audio/soundEngine';
import { preloadProRifleBotCharacter } from './botCharacterSystem';
import {
  enableMapAssetCache,
  prefetchDracoDecoder,
} from './mapAssetCatalog';

export interface PreloadProgressCallback {
  (progressPercent: number, statusLabel: string): void;
}

const BOOT_UI_IMAGES: string[] = [
  '/assets/images/tactical_loading_art_1794056561341.jpg',
  '/assets/aistudio/warface-class-icons-sniper-png-icon_589d4325.jpg',
  '/assets/aistudio/images__1__5d936377.png',
  '/assets/aistudio/warface-class-icons-medic-png-icon_6e7870ce.jpg',
  '/assets/aistudio/images_509bc030.png',
];

/**
 * Loading 1 (Boot/Lobby):
 * Gerencia o pré-carregamento real de assets leves do menu/lobby (ícones UI via THREE.LoadingManager,
 * áudios globais .mp3/.wav e compilação do contexto WebGL do showroom) sem carregar o mapa .glb pesado.
 */
export class AssetPreloader {
  public static async executePreloadSequence(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    isSoftwareGl: boolean,
    onProgress: PreloadProgressCallback
  ): Promise<void> {
    let highestPct = 5;
    const report = (pct: number, label: string) => {
      highestPct = Math.min(100, Math.max(highestPct, Math.round(pct)));
      onProgress(highestPct, label);
    };

    report(6, 'INICIALIZANDO CONTEXTO WEBGL2 E THREE.LOADINGMANAGER DO LOBBY...');
    enableMapAssetCache();
    void preloadProRifleBotCharacter();
    // Warm Draco early so Loading 2 map decode is fluid (Warface-style).
    void prefetchDracoDecoder();

    // 1. Carrega ícones de classes e artes de UI usando THREE.LoadingManager real (6% -> 40%)
    await new Promise<void>((resolve) => {
      const manager = new THREE.LoadingManager();
      const imageLoader = new THREE.ImageLoader(manager);

      manager.onProgress = (url, loaded, total) => {
        if (total > 0) {
          const ratio = loaded / total;
          const fileName = url.split('/').pop() || 'ui_asset';
          report(
            6 + ratio * 34,
            `CARREGANDO ASSETS DE UI & ÍCONES (${loaded}/${total}: ${fileName})...`
          );
        }
      };

      manager.onLoad = () => {
        resolve();
      };

      manager.onError = () => {
        // Continua mesmo se algum asset opcional falhar
      };

      if (BOOT_UI_IMAGES.length === 0) {
        resolve();
        return;
      }

      BOOT_UI_IMAGES.forEach((url) => {
        imageLoader.load(
          url,
          () => {},
          undefined,
          () => {}
        );
      });
    });

    // 2. Pré-carrega e decodifica áudios globais leves (.mp3/.wav de UI, headshot, armas) (40% -> 76%)
    await soundEngine.prewarmBootAudio((loaded, total, label) => {
      const ratio = total > 0 ? loaded / total : 1;
      report(40 + ratio * 36, `DECODIFICANDO ${label} (${loaded}/${total})...`);
    });

    // 3. Envia texturas do showroom/armamento inicial para a VRAM e compila shaders do Lobby (76% -> 100%)
    report(80, 'ENVIANDO TEXTURAS PBR DO ARSENAL PARA A GPU VRAM...');
    if (!isSoftwareGl) {
      scene.traverse((obj) => {
        if (!obj.visible) return;
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          const mats = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          mats.forEach((m) => {
            const std = m as THREE.MeshStandardMaterial;
            if (std?.map) renderer.initTexture(std.map);
            if (std?.normalMap) renderer.initTexture(std.normalMap);
            if (std?.roughnessMap) renderer.initTexture(std.roughnessMap);
          });
        }
      });

      report(92, 'COMPILANDO SHADERS DO SHOWROOM 3D E ARMAMENTO NA GPU...');
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
      renderer.render(scene, camera);
    }

    report(100, 'LOBBY PRONTO! RECURSOS GLOBAIS E ÁUDIOS CARREGADOS.');
  }
}
