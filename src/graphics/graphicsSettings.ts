/**
 * graphicsSettings.ts
 * Sistema completo de configurações gráficas, desempenho e áudio para FPS mobile.
 * Detecta capacidades de hardware (GPU, CPU, RAM) com rebaixamento conservador.
 */

export type PresetLevel = 'AUTO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA' | 'CUSTOM';
export type QualityPreset = PresetLevel;
export type ResolutionScaleMode = 'AUTO_ECO' | 'AUTO_BALANCED' | 'AUTO_MAX' | 'SCALE_50' | 'SCALE_65' | 'SCALE_80' | 'SCALE_100';
export type ShadowQuality = 'OFF' | 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';
export type TextureQuality = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';
export type ViewDistance = 'NEAR' | 'MEDIUM' | 'FAR' | 'ULTRA';
export type FpsLimit = 30 | 60 | 120 | 0;
export type AudioQuality = 'LOW' | 'MEDIUM' | 'HIGH';

export interface DeviceCapability {
  gpuVendor: string;
  gpuRenderer: string;
  tier: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';
  cpuCores: number;
  memoryGb: number;
  isMobile: boolean;
}

export interface GameSettings {
  preset: PresetLevel;
  resolution: ResolutionScaleMode;
  shadows: ShadowQuality;
  textures: TextureQuality;
  viewDistance: ViewDistance;
  fog: boolean;
  pbrReflections: boolean;
  muzzleLight: boolean;
  acesToneMapping: boolean;
  fpsLimit: FpsLimit;
  showFpsCounter: boolean;
  batterySaver: boolean;
  vibration: boolean;
  volumeMaster: number; // 0..100
  volumeMusic: number;  // 0..100
  volumeEffects: number;// 0..100
  audioQuality: AudioQuality;
  peakLimiter: boolean;
}

export const SETTINGS_STORAGE_KEY = 'kinetic_fps_game_settings_v1';

export function detectDeviceCapability(): DeviceCapability {
  let gpuVendor = 'Unknown';
  let gpuRenderer = 'Generic WebGL';
  let isSoftware = false;

  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        gpuVendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || gpuVendor;
        gpuRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || gpuRenderer;
      }
      isSoftware = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpuRenderer);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    // fallback
  }

  const cpuCores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  const memoryGb = typeof navigator !== 'undefined' && (navigator as unknown as { deviceMemory?: number }).deviceMemory
    ? (navigator as unknown as { deviceMemory: number }).deviceMemory
    : 4;

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);

  // Baseline tier purely based on GPU architecture
  let tier: DeviceCapability['tier'] = 'MEDIUM';

  if (isSoftware) {
    tier = 'LOW';
  } else if (/Apple GPU|Apple A1[5-9]|Apple M[1-4]|RTX|Radeon RX|GeForce/i.test(gpuRenderer)) {
    tier = 'ULTRA';
  } else if (/Adreno \(TM\) 7[0-9]{2}|Adreno \(TM\) 8[0-9]{2}|Mali-G7[8-9]|Mali-G71[0-9]|Mali-G9[0-9]{2}|Immortalis/i.test(gpuRenderer)) {
    tier = 'HIGH';
  } else if (/Adreno \(TM\) 6[3-9][0-9]|Mali-G7[0-7]|Mali-G5[7-9]/i.test(gpuRenderer)) {
    tier = 'MEDIUM';
  } else if (/Adreno|Mali|PowerVR|Intel HD/i.test(gpuRenderer)) {
    tier = 'LOW';
  }

  // CPU and RAM ONLY downgrade the tier (Rule: CPU/RAM só rebaixam o nível)
  if (tier === 'ULTRA') {
    if (cpuCores < 6 || memoryGb < 6) tier = 'HIGH';
  }
  if (tier === 'HIGH') {
    if (cpuCores < 4 || memoryGb < 4) tier = 'MEDIUM';
  }
  if (tier === 'MEDIUM') {
    if (cpuCores < 4 || memoryGb < 3) tier = 'LOW';
  }

  return {
    gpuVendor,
    gpuRenderer,
    tier,
    cpuCores,
    memoryGb,
    isMobile,
  };
}

export function getPresetSettings(tier: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA'): GameSettings {
  switch (tier) {
    case 'LOW':
      return {
        preset: 'LOW',
        resolution: 'SCALE_65',
        shadows: 'OFF',
        textures: 'LOW',
        viewDistance: 'NEAR',
        fog: false,
        pbrReflections: false,
        muzzleLight: false,
        acesToneMapping: false,
        fpsLimit: 30,
        showFpsCounter: true,
        batterySaver: true,
        vibration: true,
        volumeMaster: 90,
        volumeMusic: 75,
        volumeEffects: 95,
        audioQuality: 'LOW',
        peakLimiter: true,
      };
    case 'MEDIUM':
      return {
        preset: 'MEDIUM',
        resolution: 'AUTO_BALANCED',
        shadows: 'MEDIUM',
        textures: 'MEDIUM',
        viewDistance: 'MEDIUM',
        fog: true,
        pbrReflections: true,
        muzzleLight: true,
        acesToneMapping: true,
        fpsLimit: 60,
        showFpsCounter: true,
        batterySaver: false,
        vibration: true,
        volumeMaster: 95,
        volumeMusic: 80,
        volumeEffects: 100,
        audioQuality: 'MEDIUM',
        peakLimiter: true,
      };
    case 'HIGH':
      return {
        preset: 'HIGH',
        resolution: 'AUTO_MAX',
        shadows: 'HIGH',
        textures: 'HIGH',
        viewDistance: 'FAR',
        fog: true,
        pbrReflections: true,
        muzzleLight: true,
        acesToneMapping: true,
        fpsLimit: 60,
        showFpsCounter: true,
        batterySaver: false,
        vibration: true,
        volumeMaster: 100,
        volumeMusic: 85,
        volumeEffects: 100,
        audioQuality: 'HIGH',
        peakLimiter: true,
      };
    case 'ULTRA':
      return {
        preset: 'ULTRA',
        resolution: 'SCALE_100',
        shadows: 'ULTRA',
        textures: 'ULTRA',
        viewDistance: 'ULTRA',
        fog: true,
        pbrReflections: true,
        muzzleLight: true,
        acesToneMapping: true,
        fpsLimit: 120,
        showFpsCounter: true,
        batterySaver: false,
        vibration: true,
        volumeMaster: 100,
        volumeMusic: 90,
        volumeEffects: 100,
        audioQuality: 'HIGH',
        peakLimiter: true,
      };
  }
}

export function getDefaultGameSettings(): GameSettings {
  const cap = detectDeviceCapability();
  const base = getPresetSettings(cap.tier);
  return {
    ...base,
    preset: 'AUTO',
  };
}

export function validateSettings(s: unknown): GameSettings {
  const def = getDefaultGameSettings();
  if (!s || typeof s !== 'object') return def;

  const raw = s as Partial<GameSettings>;
  const validPresets: PresetLevel[] = ['AUTO', 'LOW', 'MEDIUM', 'HIGH', 'ULTRA', 'CUSTOM'];
  const validRes: ResolutionScaleMode[] = ['AUTO_ECO', 'AUTO_BALANCED', 'AUTO_MAX', 'SCALE_50', 'SCALE_65', 'SCALE_80', 'SCALE_100'];
  const validShadows: ShadowQuality[] = ['OFF', 'LOW', 'MEDIUM', 'HIGH', 'ULTRA'];
  const validTextures: TextureQuality[] = ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'];
  const validDist: ViewDistance[] = ['NEAR', 'MEDIUM', 'FAR', 'ULTRA'];
  const validFps: FpsLimit[] = [30, 60, 120, 0];
  const validAudio: AudioQuality[] = ['LOW', 'MEDIUM', 'HIGH'];

  return {
    preset: validPresets.includes(raw.preset as PresetLevel) ? (raw.preset as PresetLevel) : def.preset,
    resolution: validRes.includes(raw.resolution as ResolutionScaleMode) ? (raw.resolution as ResolutionScaleMode) : def.resolution,
    shadows: validShadows.includes(raw.shadows as ShadowQuality) ? (raw.shadows as ShadowQuality) : def.shadows,
    textures: validTextures.includes(raw.textures as TextureQuality) ? (raw.textures as TextureQuality) : def.textures,
    viewDistance: validDist.includes(raw.viewDistance as ViewDistance) ? (raw.viewDistance as ViewDistance) : def.viewDistance,
    fog: typeof raw.fog === 'boolean' ? raw.fog : def.fog,
    pbrReflections: typeof raw.pbrReflections === 'boolean' ? raw.pbrReflections : def.pbrReflections,
    muzzleLight: typeof raw.muzzleLight === 'boolean' ? raw.muzzleLight : def.muzzleLight,
    acesToneMapping: typeof raw.acesToneMapping === 'boolean' ? raw.acesToneMapping : def.acesToneMapping,
    fpsLimit: validFps.includes(raw.fpsLimit as FpsLimit) ? (raw.fpsLimit as FpsLimit) : def.fpsLimit,
    showFpsCounter: typeof raw.showFpsCounter === 'boolean' ? raw.showFpsCounter : def.showFpsCounter,
    batterySaver: typeof raw.batterySaver === 'boolean' ? raw.batterySaver : def.batterySaver,
    vibration: typeof raw.vibration === 'boolean' ? raw.vibration : def.vibration,
    volumeMaster: typeof raw.volumeMaster === 'number' ? Math.max(0, Math.min(100, raw.volumeMaster)) : def.volumeMaster,
    volumeMusic: typeof raw.volumeMusic === 'number' ? Math.max(0, Math.min(100, raw.volumeMusic)) : def.volumeMusic,
    volumeEffects: typeof raw.volumeEffects === 'number' ? Math.max(0, Math.min(100, raw.volumeEffects)) : def.volumeEffects,
    audioQuality: validAudio.includes(raw.audioQuality as AudioQuality) ? (raw.audioQuality as AudioQuality) : def.audioQuality,
    peakLimiter: typeof raw.peakLimiter === 'boolean' ? raw.peakLimiter : def.peakLimiter,
  };
}

export function loadGameSettings(): GameSettings {
  if (typeof window === 'undefined') return getDefaultGameSettings();
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return getDefaultGameSettings();
    const parsed = JSON.parse(raw);
    return validateSettings(parsed);
  } catch {
    return getDefaultGameSettings();
  }
}

export function saveGameSettings(settings: GameSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore quota errors
  }
}

export function getDefaultSettings(): GameSettings {
  return getDefaultGameSettings();
}

export function applyPreset(preset: PresetLevel): GameSettings {
  if (preset === 'AUTO') {
    return getDefaultGameSettings();
  }
  if (preset === 'CUSTOM') {
    const curr = loadGameSettings();
    return { ...curr, preset: 'CUSTOM' };
  }
  return { ...getPresetSettings(preset), preset };
}
