/**
 * Lightweight fullscreen post overlay (sharpen + controlled bloom glow + damage pulse).
 * Drawn AFTER the main scene via an orthographic quad — no EffectComposer dependency.
 * Gated by quality: skip on LOW / battery saver / software GL.
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
uniform vec2 uTexel;
varying vec2 vUv;

void main() {
  vec4 c = texture2D(tDiffuse, vUv);
  // Unsharp-style sharpen
  if (uSharpen > 0.001) {
    vec4 n = texture2D(tDiffuse, vUv + vec2(0.0, uTexel.y));
    vec4 s = texture2D(tDiffuse, vUv - vec2(0.0, uTexel.y));
    vec4 e = texture2D(tDiffuse, vUv + vec2(uTexel.x, 0.0));
    vec4 w = texture2D(tDiffuse, vUv - vec2(uTexel.x, 0.0));
    vec4 blur = (n + s + e + w) * 0.25;
    c.rgb += (c.rgb - blur.rgb) * uSharpen;
  }
  // Soft bloom from bright pixels only
  if (uBloom > 0.001) {
    float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    float bloomMask = max(0.0, lum - 0.72) * uBloom;
    c.rgb += c.rgb * bloomMask;
  }
  // Damage vignette (edge darken + red)
  if (uDamage > 0.001) {
    vec2 d = vUv - 0.5;
    float vig = smoothstep(0.2, 0.95, length(d) * 1.45);
    c.rgb = mix(c.rgb, c.rgb * vec3(0.55, 0.12, 0.12), vig * uDamage);
  }
  gl_FragColor = vec4(clamp(c.rgb, 0.0, 1.0), 1.0);
}
`;

export interface TacticalPostFxState {
  enabled: boolean;
  sharpen: number;
  bloom: number;
  rt: THREE.WebGLRenderTarget | null;
  scene: THREE.Scene | null;
  camera: THREE.OrthographicCamera | null;
  material: THREE.ShaderMaterial | null;
  quad: THREE.Mesh | null;
}

export function createTacticalPostFx(): TacticalPostFxState {
  return {
    enabled: false,
    sharpen: 0.35,
    bloom: 0.22,
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
  opts: { enabled: boolean; sharpen: number; bloom: number }
): void {
  state.enabled = opts.enabled;
  state.sharpen = opts.sharpen;
  state.bloom = opts.bloom;
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
      depthBuffer: true,
      stencilBuffer: false,
    });
    state.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: state.rt.texture },
        uSharpen: { value: state.sharpen },
        uBloom: { value: state.bloom },
        uDamage: { value: 0 },
        uTexel: { value: new THREE.Vector2(1 / w, 1 / h) },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
    });
    state.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), state.material);
    state.scene = new THREE.Scene();
    state.scene.add(state.quad);
    state.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  } else {
    state.rt.setSize(w, h);
    if (state.material) {
      state.material.uniforms.uTexel.value.set(1 / w, 1 / h);
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
  state.material.uniforms.uDamage.value = Math.min(1, damageFlashAlpha * 1.1);

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
