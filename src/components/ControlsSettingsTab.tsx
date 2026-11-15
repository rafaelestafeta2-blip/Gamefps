import React from 'react';
import {
  ControlSettings,
  HudLayoutPresetId,
  getPresetHudLayout,
} from '../controls/hudLayoutSettings';
import { GyroMode } from '../types/game';

interface ControlsSettingsTabProps {
  controlSettings: ControlSettings;
  onUpdateControlSettings: (next: ControlSettings) => void;
  onOpenHudEditor: () => void;
  onRecalibrateGyro?: () => void;
}

const SENS_PRESETS: [string, number, number][] = [
  ['Baixa', 0.6, 0.7],
  ['Padrão', 1.0, 1.0],
  ['Alta', 1.5, 1.2],
  ['Pró', 2.2, 1.5],
];

const GYRO_MODES: [GyroMode, string][] = [
  ['OFF', 'Desligado'],
  ['ADS_ONLY', 'Só na Mira (ADS)'],
  ['ALWAYS', 'Sempre'],
];

export const ControlsSettingsTab: React.FC<ControlsSettingsTabProps> = ({
  controlSettings,
  onUpdateControlSettings,
  onOpenHudEditor,
  onRecalibrateGyro,
}) => {
  const patch = (partial: Partial<ControlSettings>) => {
    onUpdateControlSettings({
      ...controlSettings,
      ...partial,
    });
  };

  const handleSelectLayoutPreset = (preset: HudLayoutPresetId) => {
    patch({
      layoutPreset: preset,
      hudLayout: getPresetHudLayout(preset),
    });
  };

  return (
    <div className="space-y-2.5">
      {/* 1. HUD Layout Customizer Banner (CoD Mobile / PUBG Style) */}
      <div className="bg-gradient-to-r from-amber-500/15 via-white/[0.03] to-white/[0.02] border border-amber-500/40 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-display font-black uppercase tracking-wider text-amber-400">
              Layout Personalizado dos Botões (HUD)
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/50 border border-white/10 text-slate-300">
              {controlSettings.layoutPreset === 'TWO_THUMBS'
                ? '2 Dedos'
                : controlSettings.layoutPreset === 'THREE_FINGER_CLAW'
                  ? '3 Dedos Claw'
                  : controlSettings.layoutPreset === 'FOUR_FINGER_CLAW'
                    ? '4 Dedos Pro'
                    : 'Personalizado'}
            </span>
          </div>
          <p className="text-[10px] text-slate-300 mt-0.5">
            Arraste os botões livremente na tela e ajuste o tamanho e a transparência (estilo CoD / PUBG).
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenHudEditor}
          className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-black text-[11px] tracking-wider uppercase shadow-md transition-all cursor-pointer shrink-0"
        >
          Editar Botões da UI ➔
        </button>
      </div>

      {/* Quick Layout Presets + 2nd Fire Button Toggle */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        <div className="sm:col-span-7 bg-white/[0.02] border border-white/10 rounded-lg p-2">
          <label className="text-[10px] font-mono uppercase font-semibold text-slate-300 block mb-1">
            Predefinições de Pegada (Layout HUD)
          </label>
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                ['TWO_THUMBS', '2 Dedos Padrão'],
                ['THREE_FINGER_CLAW', '3 Dedos Claw'],
                ['FOUR_FINGER_CLAW', '4 Dedos Pro'],
              ] as [HudLayoutPresetId, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => handleSelectLayoutPreset(id)}
                className={`py-1 text-[10px] font-mono font-bold rounded border cursor-pointer truncate px-1 ${
                  controlSettings.layoutPreset === id
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                    : 'bg-slate-900/90 text-slate-400 border-white/10 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-5 bg-white/[0.02] border border-white/10 rounded-lg p-2 flex flex-col justify-between">
          <label className="text-[10px] font-mono uppercase font-semibold text-slate-300 block mb-1">
            2º Botão de Tiro (Indicador Esq.)
          </label>
          <button
            type="button"
            onClick={() =>
              patch({ leftFireButtonEnabled: !controlSettings.leftFireButtonEnabled })
            }
            className={`w-full py-1 text-[10px] font-mono font-bold rounded border cursor-pointer transition-colors ${
              controlSettings.leftFireButtonEnabled
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900/90 border-white/10 text-slate-400'
            }`}
          >
            {controlSettings.leftFireButtonEnabled ? 'ATIVADO NA TELA' : 'DESATIVADO'}
          </button>
        </div>
      </div>

      {/* 2. Touch Camera & ADS Sensitivity */}
      <div className="bg-white/[0.02] border border-white/10 rounded-lg p-2 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-mono uppercase font-semibold text-amber-400 tracking-wider">
            Sensibilidade de Toque (Câmera &amp; Mira)
          </span>
          <div className="flex items-center gap-1">
            {SENS_PRESETS.map(([label, lookVal, adsVal]) => {
              const isSelected =
                Math.abs(controlSettings.lookSensitivity - lookVal) < 0.08 &&
                Math.abs(controlSettings.adsSensitivity - adsVal) < 0.08;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    patch({ lookSensitivity: lookVal, adsSensitivity: adsVal })
                  }
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                      : 'bg-slate-900 text-slate-300 border-white/10 hover:border-amber-400/50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-200 mb-1">
              <span>Câmera / Giro Livre</span>
              <span className="text-amber-400 font-bold tabular-nums">
                {Math.round(controlSettings.lookSensitivity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.05"
              value={controlSettings.lookSensitivity}
              onChange={(e) =>
                patch({ lookSensitivity: parseFloat(e.target.value) })
              }
              className="w-full h-1.5 accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-200 mb-1">
              <span>Mira Aberta (ADS / Luneta)</span>
              <span className="text-amber-400 font-bold tabular-nums">
                {Math.round(controlSettings.adsSensitivity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.05"
              value={controlSettings.adsSensitivity}
              onChange={(e) =>
                patch({ adsSensitivity: parseFloat(e.target.value) })
              }
              className="w-full h-1.5 accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 3. Gyroscope Controls */}
      <div className="bg-white/[0.02] border border-white/10 rounded-lg p-2 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-mono uppercase font-semibold text-slate-300 tracking-wider">
            Giroscópio (Mira por Inclinação)
          </span>
          <div className="flex items-center gap-1">
            {GYRO_MODES.map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => patch({ gyroMode: mode })}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border transition-colors cursor-pointer ${
                  controlSettings.gyroMode === mode
                    ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold'
                    : 'bg-slate-900 border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[160px] bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-200 mb-1">
              <span>Sensibilidade do Giroscópio</span>
              <span className="text-amber-400 font-bold tabular-nums">
                {Math.round(controlSettings.gyroSensitivity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.05"
              value={controlSettings.gyroSensitivity}
              onChange={(e) =>
                patch({ gyroSensitivity: parseFloat(e.target.value) })
              }
              className="w-full h-1.5 accent-amber-500 cursor-pointer"
            />
          </div>

          {onRecalibrateGyro && (
            <button
              type="button"
              onClick={onRecalibrateGyro}
              className="px-3 py-2 rounded-lg text-[10px] font-mono font-semibold bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              Recalibrar Centro
            </button>
          )}
        </div>
      </div>

      {/* 4. Aim Assist */}
      <div className="bg-white/[0.02] border border-white/10 rounded-lg p-2 space-y-2">
        <div className="flex-1 min-w-[160px] bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-200 mb-1">
            <span>Aim Assist (toque / giro)</span>
            <span className="text-amber-400 font-bold tabular-nums">
              {Math.round((controlSettings.aimAssistStrength ?? 0) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={controlSettings.aimAssistStrength ?? 0}
            onChange={(e) =>
              patch({ aimAssistStrength: parseFloat(e.target.value) })
            }
            className="w-full h-1.5 accent-amber-500 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
