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
  MAP_TEST_INDUSTRIA: '/models/maps/industria_2k.glb',
  MAP_TEST_HANGAR: '/models/maps/hangar_2k.glb',
  MAP_TEST_EASTERN: '/models/maps/eastern_city_2k.glb',
  MAP_TEST_MIRAGE: '/models/maps/mirage_anubis_2k.glb',
};

/** Local decoders shipped in the APK. Maps use Meshopt + KTX2; Draco stays for weapons. */
const DECODER_WARM_FILES = [
  '/draco/draco_wasm_wrapper.js',
  '/draco/draco_decoder.wasm',
  '/basis/basis_transcoder.js',
  '/basis/basis_transcoder.wasm',
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

const PREFETCH_FILE_TIMEOUT_MS = 10000;

function loadArrayBuffer(url: string, onProgress?: (ratio0to1: number) => void): Promise<void> {
  if (THREE.Cache.get(url)) {
    onProgress?.(1);
    return Promise.resolve();
  }
  const existing = inflight.get(url);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      inflight.delete(url);
      reject(new Error(`Prefetch timeout: ${url}`));
    }, PREFETCH_FILE_TIMEOUT_MS);

    const loader = new THREE.FileLoader();
    loader.setResponseType('arraybuffer');
    loader.load(
      url,
      () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
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
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        inflight.delete(url);
        reject(err);
      }
    );
  });
  inflight.set(url, promise);
  return promise;
}

/** Warm local Meshopt companions (Draco + Basis) so the first map does not hitch. */
export function prefetchDracoDecoder(): Promise<void> {
  enableMapAssetCache();
  if (dracoWarm) return dracoWarm;
  dracoWarm = Promise.all(
    DECODER_WARM_FILES.map((url) =>
      loadArrayBuffer(url).catch(() => {
        /* prepare retries from the same local path */
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
  onProgress?.(0.02, 'AQUECENDO DECODER DO MAPA...');
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
