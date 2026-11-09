import React from 'react';

export const SettingsToggle: React.FC<{
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, description, value, onChange }) => (
  <div
    onClick={() => onChange(!value)}
    className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors"
  >
    <div className="pr-4">
      <div className="text-xs font-bold text-zinc-200">{label}</div>
      <div className="text-[10px] text-zinc-500 leading-tight mt-0.5">{description}</div>
    </div>
    <div
      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
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
      <label className="text-xs uppercase font-bold text-zinc-300">{label}</label>
      <span className="text-xs text-amber-400 font-bold">{value}%</span>
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
