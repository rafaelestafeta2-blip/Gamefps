/**
 * Shared GLTFLoader with Meshopt (+ optional Draco).
 * Props optimized with glTF-Transform meshopt (C4, class kits) fail silently
 * on a bare GLTFLoader — always use this factory for those assets.
 */

import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const DRACO_DECODER_PATH =
  'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';

let meshoptReady: Promise<void> | null = null;

/** Ensure Meshopt WASM/JS is ready before parsing meshopt GLBs. */
export function ensureMeshoptDecoder(): Promise<void> {
  if (meshoptReady) return meshoptReady;
  const ready = (MeshoptDecoder as { ready?: Promise<void> }).ready;
  meshoptReady = ready ? ready.then(() => undefined) : Promise.resolve();
  return meshoptReady;
}

export function createGameGltfLoader(
  loadingManager?: THREE.LoadingManager,
  opts?: { draco?: boolean }
): GLTFLoader {
  const loader = new GLTFLoader(loadingManager);
  loader.setMeshoptDecoder(MeshoptDecoder);
  if (opts?.draco) {
    const draco = new DRACOLoader(loadingManager);
    draco.setDecoderPath(DRACO_DECODER_PATH);
    loader.setDRACOLoader(draco);
  }
  return loader;
}
