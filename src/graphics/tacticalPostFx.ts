/**
 * Fullscreen pass: edge sharpen + damage vignette.
 * Drawn AFTER the main scene via an orthographic quad — no EffectComposer.
 *
 * The previous pass also raised contrast in linear light, darkened with
 * exposure 0.98, and boosted bright pixels in place ("bloom"). That crushed
 * shadows and haloed the compressed map textures, so the toggle looked worse
 * than the raw frame. This pass keeps the scene colors and only tightens edges.
 *
 * Color: the scene is stored linear in the render target (ACES already ran in
 * the materials). This blit is toneMapped:false and runs colorspace_fragment
 * so the canvas gets one sRGB encode.
 */

import * as THREE from 'three';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision mediump float;
uniform sampler2D tDiffuse;
uniform float uSharpen;
uniform float uDamage;
uniform vec2 uTexel;
varying vec2 vUv;

void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb;

  // Neighborhood-clamped unsharp. The min/max of the 3x3 stops halos on
  // block-compressed textures, which a plain unsharp was ringing.
  if (uSharpen > 0.001) {
    vec2 t = uTexel;
    vec3 n  = texture2D(tDiffuse, vUv + vec2(0.0, t.y)).rgb;
    vec3 s  = texture2D(tDiffuse, vUv - vec2(0.0, t.y)).rgb;
    vec3 e  = texture2D(tDiffuse, vUv + vec2(t.x, 0.0)).rgb;
    vec3 w  = texture2D(tDiffuse, vUv - vec2(t.x, 0.0)).rgb;
    vec3 ne = texture2D(tDiffuse, vUv + t).rgb;
    vec3 nw = texture2D(tDiffuse, vUv + vec2(-t.x, t.y)).rgb;
    vec3 se = texture2D(tDiffuse, vUv + vec2(t.x, -t.y)).rgb;
    vec3 sw = texture2D(tDiffuse, vUv - t).rgb;

    vec3 blur = (n + s + e + w) * 0.25;
    vec3 detail = c - blur;

    vec3 mn = min(c, min(min(n, s), min(e, w)));
    mn = min(mn, min(min(ne, nw), min(se, sw)));
    vec3 mx = max(c, max(max(n, s), max(e, w)));
    mx = max(mx, max(max(ne, nw), max(se, sw)));

    vec3 sharpened = clamp(c + detail * uSharpen, mn, mx);

    float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float protect = smoothstep(0.015, 0.12, lum) * (1.0 - smoothstep(0.9, 1.0, lum));
    c = mix(c, sharpened, protect);
  }

  // Damage vignette only while the player is actually hit.
  if (uDamage > 0.001) {
    vec2 d = vUv - 0.5;
    float vig = smoothstep(0.42, 1.15, length(d) * 1.35);
    c = mix(c, c * vec3(0.65, 0.18, 0.14), vig * uDamage);
  }

  gl_FragColor = vec4(max(c, vec3(0.0)), 1.0);
  #include <colorspace_fragment>
}
`;

export interface TacticalPostFxState {
  enabled: boolean;
  sharpen: number;
  rt: THREE.WebGLRenderTarget | null;
  scene: THREE.Scene | null;
  camera: THREE.OrthographicCamera | null;
  material: THREE.ShaderMaterial | null;
  quad: THREE.Mesh | null;
}

const _drawSize = new THREE.Vector2();

export function createTacticalPostFx(): TacticalPostFxState {
  return {
    enabled: false,
    sharpen: 0.55,
    rt: null,
    scene: null,
    camera: null,
    material: null,
    quad: null,
  };
}

function targetSize(renderer: THREE.WebGLRenderer): { w: number; h: number } {
  renderer.getDrawingBufferSize(_drawSize);
  return {
    w: Math.max(2, Math.floor(_drawSize.x)),
    h: Math.max(2, Math.floor(_drawSize.y)),
  };
}

function syncTargetSize(state: TacticalPostFxState, renderer: THREE.WebGLRenderer): void {
  if (!state.rt || !state.material) return;
  const { w, h } = targetSize(renderer);
  if (state.rt.width === w && state.rt.height === h) return;
  state.rt.setSize(w, h);
  state.material.uniforms.uTexel.value.set(1 / w, 1 / h);
}

export function configureTacticalPostFx(
  state: TacticalPostFxState,
  renderer: THREE.WebGLRenderer,
  opts: {
    enabled: boolean;
    sharpen: number;
  }
): void {
  state.enabled = opts.enabled;
  state.sharpen = opts.sharpen;
  if (!opts.enabled) return;

  const { w, h } = targetSize(renderer);
  const samples =
    renderer.capabilities.isWebGL2
      ? Math.min(4, renderer.capabilities.maxSamples || 0)
      : 0;

  if (!state.rt) {
    state.rt = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
      samples,
      colorSpace: THREE.LinearSRGBColorSpace,
    });
    state.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: state.rt.texture },
        uSharpen: { value: state.sharpen },
        uDamage: { value: 0 },
        uTexel: { value: new THREE.Vector2(1 / w, 1 / h) },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    state.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), state.material);
    state.scene = new THREE.Scene();
    state.scene.add(state.quad);
    state.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  } else {
    syncTargetSize(state, renderer);
  }
}

export function renderWithTacticalPostFx(
  state: TacticalPostFxState,
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  damageFlashAlpha: number
): void {
  if (!state.enabled || !state.rt || !state.scene || !state.camera || !state.material) {
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
    return;
  }

  syncTargetSize(state, renderer);

  renderer.setRenderTarget(state.rt);
  renderer.clear();
  renderer.render(scene, camera);

  state.material.uniforms.tDiffuse.value = state.rt.texture;
  state.material.uniforms.uSharpen.value = state.sharpen;
  state.material.uniforms.uDamage.value = Math.min(1, damageFlashAlpha);

  renderer.setRenderTarget(null);
  renderer.render(state.scene, state.camera);
}

export function disposeTacticalPostFx(state: TacticalPostFxState): void {
  state.enabled = false;
  state.rt?.dispose();
  state.material?.dispose();
  state.quad?.geometry.dispose();
  state.rt = null;
  state.material = null;
  state.quad = null;
  state.scene = null;
  state.camera = null;
}
