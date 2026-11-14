/**
 * webglContextGuard.ts
 * Limits concurrent secondary WebGLRenderer instances (menus / inspection)
 * so mobile GPUs don't OOM while the main FPS engine stays alive.
 *
 * Showcase operators (RankedOperator3DCanvas) are PINNED so inventory/menu
 * thumbnails never evict them (that was the "operator vanishes on open" bug).
 */

import * as THREE from 'three';

type SecondaryMeta = {
  renderer: THREE.WebGLRenderer;
  pinned: boolean;
  createdAt: number;
};

const secondaryRenderers: SecondaryMeta[] = [];

/** Soft cap for non-engine preview canvases. */
export const MAX_SECONDARY_WEBGL_CONTEXTS = 3;

export interface GuardedRendererOptions extends THREE.WebGLRendererParameters {
  /** Called when an older secondary renderer is force-disposed to free a slot. */
  onEvicted?: () => void;
  /**
   * Pinned canvases (menu/inventory operator showcase) are never auto-evicted.
   * Thumbnails / one-shot studios should stay unpinned.
   */
  pinned?: boolean;
}

/**
 * Creates a secondary WebGLRenderer, evicting the oldest unpinned if over budget.
 * Main FPS engine should NOT use this — it owns the primary context.
 */
export function createSecondaryWebGLRenderer(
  options: GuardedRendererOptions = {}
): THREE.WebGLRenderer {
  const pinned = Boolean(options.pinned);

  while (secondaryRenderers.length >= MAX_SECONDARY_WEBGL_CONTEXTS) {
    const evictIdx = secondaryRenderers.findIndex((m) => !m.pinned);
    if (evictIdx < 0) {
      // All pinned — allow one extra rather than killing the operator showcase.
      break;
    }
    const victim = secondaryRenderers[evictIdx];
    disposeSecondaryWebGLRenderer(victim.renderer);
    options.onEvicted?.();
  }

  const { onEvicted: _ignored, pinned: _pin, ...rendererParams } = options;
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: 'low-power',
    alpha: true,
    ...rendererParams,
  });
  secondaryRenderers.push({
    renderer,
    pinned,
    createdAt: performance.now(),
  });
  return renderer;
}

export function disposeSecondaryWebGLRenderer(
  renderer: THREE.WebGLRenderer | null | undefined
): void {
  if (!renderer) return;
  const idx = secondaryRenderers.findIndex((m) => m.renderer === renderer);
  if (idx >= 0) secondaryRenderers.splice(idx, 1);
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
  return secondaryRenderers.length;
}

export function disposeAllSecondaryWebGLRenderers(): void {
  const all = secondaryRenderers.map((m) => m.renderer);
  for (const r of all) disposeSecondaryWebGLRenderer(r);
}
