import React from 'react';
import {
  AudioQuality,
  ResolutionScaleMode,
  ViewDistance,
} from '../graphics/graphicsSettings';

export type SettingsTabType = 'GRAPHICS' | 'PERFORMANCE' | 'AUDIO';

export const RES_DISPLAY: Record<ResolutionScaleMode, string> = {
  AUTO_ECO: 'Auto Econômica',
  AUTO_BALANCED: 'Auto Equilibrada',
  AUTO_MAX: 'Auto Qualidade',
  SCALE_50: '50%',
  SCALE_65: '65%',
  SCALE_80: '80%',
  SCALE_100: '100% (Nativo)',
};

export const RES_SHORT_LABEL: Record<ResolutionScaleMode, string> = {
  AUTO_ECO: 'Auto Eco',
  AUTO_BALANCED: 'Auto Equil.',
  AUTO_MAX: 'Auto Máx',
  SCALE_50: '50%',
  SCALE_65: '65%',
  SCALE_80: '80%',
  SCALE_100: '100%',
};

export const DIST_LABELS: Record<ViewDistance, string> = {
  NEAR: 'Curta (80m)',
  MEDIUM: 'Média (130m)',
  FAR: 'Longa (180m)',
  ULTRA: 'Máxima (260m)',
};

export const AUDIO_LABELS: Record<AudioQuality, string> = {
  LOW: 'Econômica (22kHz)',
  MEDIUM: 'Equilibrada (32kHz)',
  HIGH: 'Ultra Fidelidade',
};

export const TAB_LABELS: Record<SettingsTabType, string> = {
  GRAPHICS: 'VISUAL / GRÁFICOS',
  PERFORMANCE: 'DESEMPENHO / FPS',
  AUDIO: 'ÁUDIO & SENSORES',
};

export const SettingsToggle: React.FC<{
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, description, value, onChange }) => (
  <div
    onClick={() => onChange(!value)}
    className="flex items-center justify-between p-2.5 [@media(max-height:400px)]:p-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors"
  >
    <div className="pr-3">
      <div className="text-xs [@media(max-height:400px)]:text-[11px] font-bold text-zinc-200">
        {label}
      </div>
      <div className="text-[10px] [@media(max-height:400px)]:text-[9px] text-zinc-500 leading-tight mt-0.5">
        {description}
      </div>
    </div>
    <div
      className={`w-10 h-5 flex items-center rounded-full p-0.5 shrink-0 transition-colors ${
        value ? 'bg-amber-500' : 'bg-zinc-800'
      }`}
    >
      <div
        className={`bg-zinc-950 w-4 h-4 rounded-full shadow-md transform transition-transform ${
          value ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </div>
  </div>
);

export const SettingsSlider: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
}> = ({ label, value, onChange }) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <label className="text-xs [@media(max-height:400px)]:text-[11px] uppercase font-bold text-zinc-300">
        {label}
      </label>
      <span className="text-xs [@media(max-height:400px)]:text-[11px] text-amber-400 font-bold">
        {value}%
      </span>
    </div>
    <input
      type="range"
      min={0}
      max={100}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
    />
  </div>
);
