/**
 * Lightweight fullscreen post overlay (sharpen + controlled bloom glow + damage pulse).
 * Drawn AFTER the main scene via an orthographic quad — no EffectComposer dependency.
 * Gated by quality: skip on LOW / battery saver / software GL.
 *
 * Color pipeline notes (Three r187):
 * - Scene → RT keeps LinearSRGB (ACES already applied in material shaders when enabled).
 * - The blit ShaderMaterial MUST NOT re-tonemap (`toneMapped: false`) and MUST run
 *   `colorspace_fragment` so linear display-referred values become sRGB on the canvas.
 * - Missing that encode was crushing midtones/shadows (looked “too dark” with the toggle on).
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
uniform float uBloom;
uniform float uDamage;
uniform float uExposure;
uniform float uLift;
uniform vec2 uTexel;
varying vec2 vUv;

void main() {
  vec4 tex = texture2D(tDiffuse, vUv);
  vec3 c = tex.rgb;

  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));

  // Unsharp-style sharpen with shadow protection (avoid crushing blacks).
  if (uSharpen > 0.001) {
    vec3 n = texture2D(tDiffuse, vUv + vec2(0.0, uTexel.y)).rgb;
    vec3 s = texture2D(tDiffuse, vUv - vec2(0.0, uTexel.y)).rgb;
    vec3 e = texture2D(tDiffuse, vUv + vec2(uTexel.x, 0.0)).rgb;
    vec3 w = texture2D(tDiffuse, vUv - vec2(uTexel.x, 0.0)).rgb;
    vec3 blur = (n + s + e + w) * 0.25;
    vec3 detail = c - blur;
    float shadowProtect = smoothstep(0.03, 0.22, lum);
    // Soft-knee: less amplification on already-bright pixels (keeps sky from blowing).
    float highlightProtect = 1.0 - smoothstep(0.78, 0.98, lum);
    c += detail * uSharpen * shadowProtect * highlightProtect;
  }

  // Soft bloom from bright pixels only (narrower/higher knee = less milky walls).
  if (uBloom > 0.001) {
    float bloomMask = max(0.0, lum - 0.88) * uBloom;
    c += c * bloomMask * 0.45;
  }

  // Exposure on full image; lift ONLY shadows (flat +lift was washing midtones white).
  c *= uExposure;
  float shadowLift = (1.0 - smoothstep(0.0, 0.42, lum));
  c += vec3(uLift) * shadowLift;

  // Mild midtone contrast regain (matches Dust2 grit without crushing blacks).
  c = (c - 0.5) * 1.08 + 0.5;

  // Damage vignette (edge darken + red) — only when actually damaged.
  if (uDamage > 0.001) {
    vec2 d = vUv - 0.5;
    float vig = smoothstep(0.35, 1.05, length(d) * 1.35);
    c = mix(c, c * vec3(0.7, 0.22, 0.18), vig * uDamage * 0.85);
  }

  c = max(c, vec3(0.0));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}
`;

export interface TacticalPostFxState {
  enabled: boolean;
  sharpen: number;
  bloom: number;
  exposure: number;
  lift: number;
  rt: THREE.WebGLRenderTarget | null;
  scene: THREE.Scene | null;
  camera: THREE.OrthographicCamera | null;
  material: THREE.ShaderMaterial | null;
  quad: THREE.Mesh | null;
}

export function createTacticalPostFx(): TacticalPostFxState {
  return {
    enabled: false,
    sharpen: 0.24,
    bloom: 0.1,
    exposure: 0.98,
    lift: 0.008,
    rt: null,
    scene: null,
    camera: null,
    material: null,
    quad: null,
  };
}

export function configureTacticalPostFx(
  state: TacticalPostFxState,
  renderer: THREE.WebGLRenderer,
  opts: {
    enabled: boolean;
    sharpen: number;
    bloom: number;
    exposure?: number;
    lift?: number;
  }
): void {
  state.enabled = opts.enabled;
  state.sharpen = opts.sharpen;
  state.bloom = opts.bloom;
  if (typeof opts.exposure === 'number') state.exposure = opts.exposure;
  if (typeof opts.lift === 'number') state.lift = opts.lift;
  if (!opts.enabled) return;

  const size = new THREE.Vector2();
  renderer.getSize(size);
  const pixelRatio = renderer.getPixelRatio();
  const w = Math.max(2, Math.floor(size.x * pixelRatio));
  const h = Math.max(2, Math.floor(size.y * pixelRatio));

  if (!state.rt) {
    state.rt = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
      colorSpace: THREE.LinearSRGBColorSpace,
    });
    state.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: state.rt.texture },
        uSharpen: { value: state.sharpen },
        uBloom: { value: state.bloom },
        uDamage: { value: 0 },
        uExposure: { value: state.exposure },
        uLift: { value: state.lift },
        uTexel: { value: new THREE.Vector2(1 / w, 1 / h) },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      // Scene already ACES-mapped into the RT; never stack a second filmic curve.
      toneMapped: false,
    });
    state.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), state.material);
    state.scene = new THREE.Scene();
    state.scene.add(state.quad);
    state.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  } else {
    state.rt.setSize(w, h);
    if (state.material) {
      state.material.uniforms.uTexel.value.set(1 / w, 1 / h);
      state.material.uniforms.uExposure.value = state.exposure;
      state.material.uniforms.uLift.value = state.lift;
    }
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

  renderer.setRenderTarget(state.rt);
  renderer.clear();
  renderer.render(scene, camera);

  state.material.uniforms.tDiffuse.value = state.rt.texture;
  state.material.uniforms.uSharpen.value = state.sharpen;
  state.material.uniforms.uBloom.value = state.bloom;
  state.material.uniforms.uExposure.value = state.exposure;
  state.material.uniforms.uLift.value = state.lift;
  state.material.uniforms.uDamage.value = Math.min(1, damageFlashAlpha * 1.05);

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
