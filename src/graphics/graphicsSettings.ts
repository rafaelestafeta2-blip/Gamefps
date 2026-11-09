/**
 * graphicsSettings.ts
 * Sistema completo de configurações gráficas, desempenho e áudio para FPS mobile.
 * Detecta capacidades de hardware (GPU, CPU, RAM) com rebaixamento conservador.
 */

export type PresetLevel = 'AUTO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA' | 'CUSTOM';
export type ResolutionScaleMode =
  | 'AUTO_ECO'
  | 'AUTO_BALANCED'
  | 'AUTO_MAX'
  | 'SCALE_50'
  | 'SCALE_65'
  | 'SCALE_80'
  | 'SCALE_100';
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
  volumeMusic: number; // 0..100
  volumeEffects: number; // 0..100
  audioQuality: AudioQuality;
  peakLimiter: boolean;
}

export type PresetGraphicsFields = Pick<
  GameSettings,
  | 'resolution'
  | 'shadows'
  | 'textures'
  | 'viewDistance'
  | 'fog'
  | 'pbrReflections'
  | 'muzzleLight'
  | 'acesToneMapping'
  | 'fpsLimit'
>;

export const SETTINGS_STORAGE_KEY = 'kinetic_fps_game_settings_v1';

export function detectDeviceCapability(): DeviceCapability {
  let gpuVendor = 'Unknown';
  let gpuRenderer = 'Generic WebGL';
  let isSoftware = false;

  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ||
      canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        gpuVendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || gpuVendor;
        gpuRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || gpuRenderer;
      } else {
        gpuVendor = gl.getParameter(gl.VENDOR) || gpuVendor;
        gpuRenderer = gl.getParameter(gl.RENDERER) || gpuRenderer;
      }
      isSoftware = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(
        gpuRenderer
      );
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    // fallback
  }

  const cpuCores =
    typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  const memoryGb =
    typeof navigator !== 'undefined' &&
    (navigator as unknown as { deviceMemory?: number }).deviceMemory
      ? (navigator as unknown as { deviceMemory: number }).deviceMemory
      : 4;

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);

  // Baseline tier purely based on GPU architecture
  let tier: DeviceCapability['tier'] = 'MEDIUM';

  const adrenoMatch = gpuRenderer.match(/Adreno[^0-9]*(\d{3})/i);
  const maliMatch = gpuRenderer.match(/Mali-?([GT])(\d+)/i);

  if (isSoftware) {
    tier = 'LOW';
  } else if (
    /Apple GPU|Apple A1[5-9]|Apple M[1-4]|RTX|Radeon RX|GeForce/i.test(gpuRenderer)
  ) {
    tier = 'ULTRA';
  } else if (/Immortalis/i.test(gpuRenderer)) {
    tier = 'HIGH';
  } else if (adrenoMatch) {
    const adrenoModel = parseInt(adrenoMatch[1], 10);
    if (adrenoModel >= 730) {
      tier = 'HIGH';
    } else if (adrenoModel >= 600) {
      tier = 'MEDIUM';
    } else {
      tier = 'LOW';
    }
  } else if (maliMatch) {
    const maliSeries = maliMatch[1].toUpperCase();
    const maliModel = parseInt(maliMatch[2], 10);
    if (maliSeries === 'T') {
      tier = 'LOW';
    } else {
      // Série G
      if (maliModel >= 710) {
        tier = 'HIGH';
      } else if (
        [76, 77, 78, 68, 57, 610, 71, 72, 510].includes(maliModel) ||
        (maliModel >= 57 && maliModel < 100) ||
        (maliModel >= 510 && maliModel < 710)
      ) {
        tier = 'MEDIUM';
      } else {
        // G52, G51, G31 e inferiores
        tier = 'LOW';
      }
    }
  } else if (/Adreno|Mali|PowerVR|Intel HD/i.test(gpuRenderer)) {
    tier = 'LOW';
  }

  // CPU e RAM só rebaixam o nível, nunca elevam
  if (tier === 'ULTRA' && (cpuCores < 6 || memoryGb < 6)) {
    tier = 'HIGH';
  }
  if (tier === 'HIGH' && (cpuCores < 4 || memoryGb < 4)) {
    tier = 'MEDIUM';
  }
  if (tier === 'MEDIUM' && (cpuCores < 4 || memoryGb < 3)) {
    tier = 'LOW';
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

export function getPresetSettings(
  tier: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA'
): PresetGraphicsFields {
  switch (tier) {
    case 'LOW':
      return {
        resolution: 'SCALE_65',
        shadows: 'OFF',
        textures: 'LOW',
        viewDistance: 'NEAR',
        fog: false,
        pbrReflections: false,
        muzzleLight: false,
        acesToneMapping: false,
        fpsLimit: 30,
      };
    case 'MEDIUM':
      return {
        resolution: 'AUTO_BALANCED',
        shadows: 'MEDIUM',
        textures: 'MEDIUM',
        viewDistance: 'MEDIUM',
        fog: true,
        pbrReflections: true,
        muzzleLight: true,
        acesToneMapping: true,
        fpsLimit: 60,
      };
    case 'HIGH':
      return {
        resolution: 'AUTO_MAX',
        shadows: 'HIGH',
        textures: 'HIGH',
        viewDistance: 'FAR',
        fog: true,
        pbrReflections: true,
        muzzleLight: true,
        acesToneMapping: true,
        fpsLimit: 60,
      };
    case 'ULTRA':
      return {
        resolution: 'SCALE_100',
        shadows: 'ULTRA',
        textures: 'ULTRA',
        viewDistance: 'ULTRA',
        fog: true,
        pbrReflections: true,
        muzzleLight: true,
        acesToneMapping: true,
        fpsLimit: 120,
      };
  }
}

export function getDefaultGameSettings(): GameSettings {
  const cap = detectDeviceCapability();
  const base = getPresetSettings(cap.tier);
  return {
    ...base,
    preset: 'AUTO',
    showFpsCounter: false,
    batterySaver: false,
    vibration: true,
    volumeMaster: 100,
    volumeMusic: 80,
    volumeEffects: 100,
    audioQuality: 'HIGH',
    peakLimiter: true,
  };
}

export function validateSettings(s: unknown): GameSettings {
  const def = getDefaultGameSettings();
  if (!s || typeof s !== 'object') return def;

  const raw = s as Partial<GameSettings>;
  const validPresets: PresetLevel[] = [
    'AUTO',
    'LOW',
    'MEDIUM',
    'HIGH',
    'ULTRA',
    'CUSTOM',
  ];
  const validRes: ResolutionScaleMode[] = [
    'AUTO_ECO',
    'AUTO_BALANCED',
    'AUTO_MAX',
    'SCALE_50',
    'SCALE_65',
    'SCALE_80',
    'SCALE_100',
  ];
  const validShadows: ShadowQuality[] = ['OFF', 'LOW', 'MEDIUM', 'HIGH', 'ULTRA'];
  const validTextures: TextureQuality[] = ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'];
  const validDist: ViewDistance[] = ['NEAR', 'MEDIUM', 'FAR', 'ULTRA'];
  const validFps: FpsLimit[] = [30, 60, 120, 0];
  const validAudio: AudioQuality[] = ['LOW', 'MEDIUM', 'HIGH'];

  return {
    preset: validPresets.includes(raw.preset as PresetLevel)
      ? (raw.preset as PresetLevel)
      : def.preset,
    resolution: validRes.includes(raw.resolution as ResolutionScaleMode)
      ? (raw.resolution as ResolutionScaleMode)
      : def.resolution,
    shadows: validShadows.includes(raw.shadows as ShadowQuality)
      ? (raw.shadows as ShadowQuality)
      : def.shadows,
    textures: validTextures.includes(raw.textures as TextureQuality)
      ? (raw.textures as TextureQuality)
      : def.textures,
    viewDistance: validDist.includes(raw.viewDistance as ViewDistance)
      ? (raw.viewDistance as ViewDistance)
      : def.viewDistance,
    fog: typeof raw.fog === 'boolean' ? raw.fog : def.fog,
    pbrReflections:
      typeof raw.pbrReflections === 'boolean'
        ? raw.pbrReflections
        : def.pbrReflections,
    muzzleLight:
      typeof raw.muzzleLight === 'boolean' ? raw.muzzleLight : def.muzzleLight,
    acesToneMapping:
      typeof raw.acesToneMapping === 'boolean'
        ? raw.acesToneMapping
        : def.acesToneMapping,
    fpsLimit: validFps.includes(raw.fpsLimit as FpsLimit)
      ? (raw.fpsLimit as FpsLimit)
      : def.fpsLimit,
    showFpsCounter:
      typeof raw.showFpsCounter === 'boolean'
        ? raw.showFpsCounter
        : def.showFpsCounter,
    batterySaver:
      typeof raw.batterySaver === 'boolean' ? raw.batterySaver : def.batterySaver,
    vibration:
      typeof raw.vibration === 'boolean' ? raw.vibration : def.vibration,
    volumeMaster:
      typeof raw.volumeMaster === 'number'
        ? Math.max(0, Math.min(100, raw.volumeMaster))
        : def.volumeMaster,
    volumeMusic:
      typeof raw.volumeMusic === 'number'
        ? Math.max(0, Math.min(100, raw.volumeMusic))
        : def.volumeMusic,
    volumeEffects:
      typeof raw.volumeEffects === 'number'
        ? Math.max(0, Math.min(100, raw.volumeEffects))
        : def.volumeEffects,
    audioQuality: validAudio.includes(raw.audioQuality as AudioQuality)
      ? (raw.audioQuality as AudioQuality)
      : def.audioQuality,
    peakLimiter:
      typeof raw.peakLimiter === 'boolean' ? raw.peakLimiter : def.peakLimiter,
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

export function applyPreset(
  preset: PresetLevel,
  current: GameSettings
): GameSettings {
  if (preset === 'CUSTOM') {
    return { ...current, preset: 'CUSTOM' };
  }
  const resolvedTier =
    preset === 'AUTO' ? detectDeviceCapability().tier : preset;
  const graphicFields = getPresetSettings(resolvedTier);
  return {
    ...current,
    ...graphicFields,
    preset,
  };
}
