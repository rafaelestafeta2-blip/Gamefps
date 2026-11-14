import * as THREE from 'three';
import { DrillMode } from '../types/game';

/** Map GLB URLs for bomb arenas — keep in sync with *LevelBuilder LOCAL_URL constants. */
export const MAP_GLB_BY_MODE: Partial<Record<DrillMode, string>> = {
  DUST2_BOMB_5V5: '/models/maps/de_dust2.glb',
  ASSAULT_BOMB_5V5: '/models/maps/cs_assault.glb',
  INDUSTRIA_BOMB_5V5: '/models/maps/industria_2k.glb',
  HANGAR_BOMB_5V5: '/models/maps/hangar_2k.glb',
  EASTERN_CITY_BOMB_5V5: '/models/maps/eastern_city_2k.glb',
  MIRAGE_ANUBIS_BOMB_5V5: '/models/maps/mirage_anubis_2k.glb',
  FREE_RANGE: '/models/maps/shooting_range_2k.glb',
};

const DRACO_DECODER_PATH =
  'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';

const DRACO_WARM_FILES = [
  `${DRACO_DECODER_PATH}draco_wasm_wrapper.js`,
  `${DRACO_DECODER_PATH}draco_decoder.wasm`,
  `${DRACO_DECODER_PATH}draco_decoder.js`,
];

const inflight = new Map<string, Promise<void>>();
let dracoWarm: Promise<void> | null = null;

/** Enable THREE HTTP cache so Loading 2 hits warm GLB bytes (Warface-style). */
export function enableMapAssetCache(): void {
  THREE.Cache.enabled = true;
}

export function getMapGlbUrlForMode(mode: DrillMode): string | null {
  return MAP_GLB_BY_MODE[mode] ?? null;
}

function loadArrayBuffer(url: string, onProgress?: (ratio0to1: number) => void): Promise<void> {
  if (THREE.Cache.get(url)) {
    onProgress?.(1);
    return Promise.resolve();
  }
  const existing = inflight.get(url);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const loader = new THREE.FileLoader();
    loader.setResponseType('arraybuffer');
    loader.load(
      url,
      () => {
        inflight.delete(url);
        onProgress?.(1);
        resolve();
      },
      (evt) => {
        if (evt.lengthComputable && evt.total > 0) {
          onProgress?.(Math.min(1, evt.loaded / evt.total));
        }
      },
      (err) => {
        inflight.delete(url);
        reject(err);
      }
    );
  });
  inflight.set(url, promise);
  return promise;
}

/** Warm Draco WASM/JS so first GLB decode doesn't hitch mid-loading bar. */
export function prefetchDracoDecoder(): Promise<void> {
  enableMapAssetCache();
  if (dracoWarm) return dracoWarm;
  dracoWarm = Promise.all(
    DRACO_WARM_FILES.map((url) =>
      loadArrayBuffer(url).catch(() => {
        /* optional CDN — GLTFLoader will retry */
      })
    )
  ).then(() => undefined);
  return dracoWarm;
}

/**
 * Prefetch map GLB (+ Draco) for the selected mode.
 * Safe to call from matchmaking / loading screen; prepareMatchArena then hits THREE.Cache.
 */
export async function prefetchMapAssetsForMode(
  mode: DrillMode,
  onProgress?: (ratio0to1: number, label: string) => void
): Promise<void> {
  enableMapAssetCache();
  onProgress?.(0.02, 'AQUECENDO DECODER DRACO...');
  await prefetchDracoDecoder();
  const url = getMapGlbUrlForMode(mode);
  if (!url) {
    onProgress?.(1, 'SEM GLB DE ARENA PARA ESTE MODO');
    return;
  }
  const short = url.split('/').pop() || url;
  onProgress?.(0.08, `PRÉ-CARREGANDO ${short.toUpperCase()}...`);
  try {
    await loadArrayBuffer(url, (r) => {
      onProgress?.(0.08 + r * 0.9, `PRÉ-CARREGANDO ${short.toUpperCase()} (${Math.round(r * 100)}%)...`);
    });
    onProgress?.(1, `${short.toUpperCase()} EM CACHE`);
  } catch (err) {
    console.warn('Map GLB prefetch failed (prepare will retry):', url, err);
    onProgress?.(1, 'PREFETCH FALHOU — PREPARE RETRY');
  }
}
