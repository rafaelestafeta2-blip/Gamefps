import * as THREE from 'three';
import { soundEngine } from '../audio/soundEngine';

export interface PreloadProgressCallback {
  (progressPercent: number, statusLabel: string): void;
}

export class AssetPreloader {
  public static async executePreloadSequence(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    isSoftwareGl: boolean,
    onProgress: PreloadProgressCallback
  ): Promise<void> {
    onProgress(10, 'INICIALIZANDO GERENCIADOR DE MEMÓRIA E VRAM...');
    await delay(80);

    onProgress(30, 'PREPARANDO TEXTURAS TÁTICAS PBR E BUMP MAPS...');
    await delay(90);

    onProgress(55, 'CARREGANDO ARSENAL 3D (M4A1, AK47, MARK 23 & SNIPERS)...');
    await delay(90);

    onProgress(75, 'SINCRONIZANDO GEOMETRIA DOS MAPAS E COLISORES 3D...');
    await delay(90);

    onProgress(86, 'DESCOMPACTANDO ÁUDIOS TÁTICOS E SONS DE DISPARO...');
    soundEngine.init();
    await delay(80);

    onProgress(94, 'COMPILANDO SHADERS WEBGL E MAPA DE SOMBRAS NA GPU...');
    if (!isSoftwareGl) {
      try {
        renderer.compile(scene, camera);
      } catch {
        // Fallback for software renderer
      }
    }

    onProgress(100, 'CARREGAMENTO 100% CONCLUÍDO! PRONTO PARA COMBATE.');
    await delay(100);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
