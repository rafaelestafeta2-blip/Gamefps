import React from 'react';
import {
  AudioQuality,
  ResolutionScaleMode,
  ViewDistance,
} from '../graphics/graphicsSettings';

export type SettingsTabType = 'GRAPHICS' | 'CONTROLS' | 'PERFORMANCE' | 'AUDIO';

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
  GRAPHICS: 'GRÁFICOS',
  CONTROLS: 'CONTROLES & HUD',
  PERFORMANCE: 'DESEMPENHO',
  AUDIO: 'ÁUDIO',
};

export const SettingsToggle: React.FC<{
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, description, value, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
      value
        ? 'bg-amber-500/[0.07] border-amber-500/35 hover:border-amber-400/60'
        : 'bg-white/[0.02] border-white/10 hover:border-white/20'
    }`}
  >
    <div className="min-w-0 flex-1">
      <div className="text-[11px] font-semibold text-slate-100 truncate leading-tight">
        {label}
      </div>
      <div className="text-[9px] text-slate-400 truncate leading-tight mt-0.5">
        {description}
      </div>
    </div>
    <div
      className={`w-8 h-4 flex items-center rounded-full p-0.5 shrink-0 transition-colors ${
        value ? 'bg-amber-500' : 'bg-slate-800 border border-white/15'
      }`}
    >
      <div
        className={`bg-slate-950 w-3 h-3 rounded-full shadow-sm transform transition-transform ${
          value ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </div>
  </button>
);

export const SettingsSlider: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
}> = ({ label, value, onChange }) => (
  <div className="bg-white/[0.02] border border-white/10 rounded-lg px-2.5 py-1.5">
    <div className="flex justify-between items-center mb-1">
      <label className="text-[10px] uppercase font-semibold text-slate-300 tracking-wide truncate pr-2">
        {label}
      </label>
      <span className="text-[10px] font-mono text-amber-400 font-bold tabular-nums shrink-0">
        {value}%
      </span>
    </div>
    <input
      type="range"
      min={0}
      max={100}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
    />
  </div>
);
