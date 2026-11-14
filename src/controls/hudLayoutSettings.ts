import { GyroMode } from '../types/game';

export type HudButtonId =
  | 'joystick'
  | 'fire'
  | 'leftFire'
  | 'ads'
  | 'jump'
  | 'crouch'
  | 'reload'
  | 'contextual';

export interface HudElementPlacement {
  xPercent: number; // 4..96 (% da largura da tela)
  yPercent: number; // 6..94 (% da altura da tela)
  scale: number; // 0.6..1.8 (60% a 180%)
  opacity: number; // 0.2..1.0 (20% a 100%)
}

export type CustomHudLayout = Record<HudButtonId, HudElementPlacement>;

export type HudLayoutPresetId = 'TWO_THUMBS' | 'THREE_FINGER_CLAW' | 'FOUR_FINGER_CLAW';

export interface ControlSettings {
  lookSensitivity: number; // 0.2..3.0
  adsSensitivity: number; // 0.2..3.0
  gyroMode: GyroMode;
  gyroSensitivity: number; // 0.2..3.0
  /** Soft rotational aim assist 0..1 (never expands hitboxes). */
  aimAssistStrength: number;
  leftFireButtonEnabled: boolean;
  layoutPreset: HudLayoutPresetId | 'CUSTOM';
  hudLayout: CustomHudLayout;
}

export const HUD_BUTTON_LABELS: Record<HudButtonId, string> = {
  joystick: 'Analógico (Movimento)',
  fire: 'Botão de Tiro Principal',
  leftFire: '2º Botão de Tiro (Esq.)',
  ads: 'Mira (ADS / Luneta)',
  jump: 'Pular',
  crouch: 'Agachar / Deitar (Prone)',
  reload: 'Recarregar Arma',
  contextual: 'Fôlego / Zoom / Ferrolho',
};

export const CONTROL_SETTINGS_STORAGE_KEY = 'kinetic_fps_control_settings_v1';

export function getPresetHudLayout(preset: HudLayoutPresetId): CustomHudLayout {
  if (preset === 'THREE_FINGER_CLAW') {
    return {
      joystick: { xPercent: 14, yPercent: 74, scale: 1.0, opacity: 0.9 },
      fire: { xPercent: 14, yPercent: 24, scale: 1.15, opacity: 0.95 },
      leftFire: { xPercent: 80, yPercent: 68, scale: 0.95, opacity: 0.85 },
      ads: { xPercent: 88, yPercent: 48, scale: 1.05, opacity: 0.95 },
      jump: { xPercent: 93, yPercent: 66, scale: 1.0, opacity: 0.9 },
      crouch: { xPercent: 93, yPercent: 86, scale: 1.0, opacity: 0.9 },
      reload: { xPercent: 82, yPercent: 86, scale: 1.0, opacity: 0.9 },
      contextual: { xPercent: 74, yPercent: 48, scale: 1.0, opacity: 0.9 },
    };
  }

  if (preset === 'FOUR_FINGER_CLAW') {
    return {
      joystick: { xPercent: 14, yPercent: 74, scale: 1.0, opacity: 0.85 },
      fire: { xPercent: 13, yPercent: 22, scale: 1.2, opacity: 0.95 },
      leftFire: { xPercent: 82, yPercent: 72, scale: 0.95, opacity: 0.85 },
      ads: { xPercent: 87, yPercent: 22, scale: 1.15, opacity: 0.95 },
      jump: { xPercent: 93, yPercent: 44, scale: 1.05, opacity: 0.9 },
      crouch: { xPercent: 77, yPercent: 22, scale: 1.05, opacity: 0.9 },
      reload: { xPercent: 83, yPercent: 86, scale: 1.0, opacity: 0.9 },
      contextual: { xPercent: 68, yPercent: 44, scale: 1.0, opacity: 0.9 },
    };
  }

  // Default TWO_THUMBS (2 Dedos Padrão)
  return {
    joystick: { xPercent: 13, yPercent: 74, scale: 1.0, opacity: 0.9 },
    fire: { xPercent: 78, yPercent: 68, scale: 1.05, opacity: 0.95 },
    leftFire: { xPercent: 22, yPercent: 34, scale: 0.95, opacity: 0.85 },
    ads: { xPercent: 86, yPercent: 46, scale: 1.0, opacity: 0.95 },
    jump: { xPercent: 94, yPercent: 64, scale: 1.0, opacity: 0.9 },
    crouch: { xPercent: 94, yPercent: 86, scale: 1.0, opacity: 0.9 },
    reload: { xPercent: 86, yPercent: 86, scale: 1.0, opacity: 0.9 },
    contextual: { xPercent: 74, yPercent: 46, scale: 1.0, opacity: 0.9 },
  };
}

export function getDefaultControlSettings(): ControlSettings {
  return {
    lookSensitivity: 1.0,
    adsSensitivity: 1.0,
    gyroMode: 'OFF',
    gyroSensitivity: 1.0,
    aimAssistStrength: 0.45,
    leftFireButtonEnabled: true,
    layoutPreset: 'TWO_THUMBS',
    hudLayout: getPresetHudLayout('TWO_THUMBS'),
  };
}

function clampPlacement(
  raw: Partial<HudElementPlacement> | undefined,
  fallback: HudElementPlacement
): HudElementPlacement {
  if (!raw || typeof raw !== 'object') return { ...fallback };
  return {
    xPercent:
      typeof raw.xPercent === 'number'
        ? Math.max(4, Math.min(96, raw.xPercent))
        : fallback.xPercent,
    yPercent:
      typeof raw.yPercent === 'number'
        ? Math.max(6, Math.min(94, raw.yPercent))
        : fallback.yPercent,
    scale:
      typeof raw.scale === 'number'
        ? Math.max(0.6, Math.min(1.8, raw.scale))
        : fallback.scale,
    opacity:
      typeof raw.opacity === 'number'
        ? Math.max(0.2, Math.min(1.0, raw.opacity))
        : fallback.opacity,
  };
}

export function loadControlSettings(): ControlSettings {
  const def = getDefaultControlSettings();
  if (typeof window === 'undefined') return def;
  try {
    const rawStr = localStorage.getItem(CONTROL_SETTINGS_STORAGE_KEY);
    if (!rawStr) return def;
    const raw = JSON.parse(rawStr) as Partial<ControlSettings>;
    const baseLayout = getPresetHudLayout('TWO_THUMBS');
    const rawLayout = (raw.hudLayout || {}) as Partial<CustomHudLayout>;

    const hudLayout: CustomHudLayout = {
      joystick: clampPlacement(rawLayout.joystick, baseLayout.joystick),
      fire: clampPlacement(rawLayout.fire, baseLayout.fire),
      leftFire: clampPlacement(rawLayout.leftFire, baseLayout.leftFire),
      ads: clampPlacement(rawLayout.ads, baseLayout.ads),
      jump: clampPlacement(rawLayout.jump, baseLayout.jump),
      crouch: clampPlacement(rawLayout.crouch, baseLayout.crouch),
      reload: clampPlacement(rawLayout.reload, baseLayout.reload),
      contextual: clampPlacement(rawLayout.contextual, baseLayout.contextual),
    };

    const validGyro: GyroMode[] = ['OFF', 'ADS_ONLY', 'ALWAYS'];

    return {
      lookSensitivity:
        typeof raw.lookSensitivity === 'number'
          ? Math.max(0.2, Math.min(3.0, raw.lookSensitivity))
          : def.lookSensitivity,
      adsSensitivity:
        typeof raw.adsSensitivity === 'number'
          ? Math.max(0.2, Math.min(3.0, raw.adsSensitivity))
          : def.adsSensitivity,
      gyroMode: validGyro.includes(raw.gyroMode as GyroMode)
        ? (raw.gyroMode as GyroMode)
        : def.gyroMode,
      gyroSensitivity:
        typeof raw.gyroSensitivity === 'number'
          ? Math.max(0.2, Math.min(3.0, raw.gyroSensitivity))
          : def.gyroSensitivity,
      aimAssistStrength:
        typeof raw.aimAssistStrength === 'number'
          ? Math.max(0, Math.min(1, raw.aimAssistStrength))
          : def.aimAssistStrength,
      leftFireButtonEnabled:
        typeof raw.leftFireButtonEnabled === 'boolean'
          ? raw.leftFireButtonEnabled
          : def.leftFireButtonEnabled,
      layoutPreset: raw.layoutPreset || def.layoutPreset,
      hudLayout,
    };
  } catch {
    return def;
  }
}

export function saveControlSettings(settings: ControlSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONTROL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore quota errors
  }
}
