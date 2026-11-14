/**
 * webglContextGuard.ts
 * Limits concurrent secondary WebGLRenderer instances (menus / inspection)
 * so mobile GPUs don't OOM while the main FPS engine stays alive.
 */

import * as THREE from 'three';

const secondaryRenderers = new Set<THREE.WebGLRenderer>();

/** Soft cap for non-engine preview canvases. */
export const MAX_SECONDARY_WEBGL_CONTEXTS = 2;

export interface GuardedRendererOptions extends THREE.WebGLRendererParameters {
  /** Called when an older secondary renderer is force-disposed to free a slot. */
  onEvicted?: () => void;
}

/**
 * Creates a secondary WebGLRenderer, evicting the oldest if over budget.
 * Main FPS engine should NOT use this — it owns the primary context.
 */
export function createSecondaryWebGLRenderer(
  options: GuardedRendererOptions = {}
): THREE.WebGLRenderer {
  while (secondaryRenderers.size >= MAX_SECONDARY_WEBGL_CONTEXTS) {
    const oldest = secondaryRenderers.values().next().value;
    if (!oldest) break;
    disposeSecondaryWebGLRenderer(oldest);
    options.onEvicted?.();
  }

  const { onEvicted: _ignored, ...rendererParams } = options;
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: 'low-power',
    alpha: true,
    ...rendererParams,
  });
  secondaryRenderers.add(renderer);
  return renderer;
}

export function disposeSecondaryWebGLRenderer(
  renderer: THREE.WebGLRenderer | null | undefined
): void {
  if (!renderer) return;
  secondaryRenderers.delete(renderer);
  try {
    renderer.dispose();
    const lose = renderer.getContext()?.getExtension?.('WEBGL_lose_context');
    lose?.loseContext();
  } catch {
    // ignore
  }
  if (renderer.domElement?.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement);
  }
}

export function getSecondaryWebGLCount(): number {
  return secondaryRenderers.size;
}

export function disposeAllSecondaryWebGLRenderers(): void {
  const all = Array.from(secondaryRenderers);
  for (const r of all) disposeSecondaryWebGLRenderer(r);
}
