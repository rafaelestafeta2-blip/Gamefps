import React, { useState } from 'react';
import {
  GameSettings,
  QualityPreset,
  ResolutionScaleMode,
  ShadowQuality,
  TextureQuality,
  ViewDistance,
  FpsLimit,
  AudioQuality,
  applyPreset,
} from '../graphics/graphicsSettings';
import { SettingsSlider, SettingsToggle } from './SettingsControls';

interface GraphicsSettingsPanelProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onResetDefaults: () => void;
  onClose: () => void;
}

type TabType = 'GRAPHICS' | 'PERFORMANCE' | 'AUDIO';

export const GraphicsSettingsPanel: React.FC<GraphicsSettingsPanelProps> = ({
  settings,
  onUpdateSettings,
  onResetDefaults,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('GRAPHICS');

  const update = (patch: Partial<GameSettings>) => {
    onUpdateSettings({ ...settings, ...patch });
  };

  const handlePresetSelect = (preset: QualityPreset) => {
    if (preset === 'CUSTOM') {
      update({ preset: 'CUSTOM' });
    } else {
      const applied = applyPreset(preset);
      onUpdateSettings(applied);
    }
  };

  const resDisplay = {
    AUTO_ECO: 'Auto Econômica (65%)',
    AUTO_BALANCED: 'Auto Balanceada (80%)',
    AUTO_MAX: 'Auto Nativa (100%)',
    SCALE_50: '50% (Eco Máx)',
    SCALE_65: '65% (Desempenho)',
    SCALE_80: '80% (Equilibrado)',
    SCALE_100: '100% (Nativo)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 select-none">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-zinc-950 border border-amber-500/40 rounded-xl shadow-[0_0_40px_rgba(245,158,11,0.15)] overflow-hidden font-mono text-zinc-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 animate-pulse" />
            <h2 className="text-lg font-black tracking-wider text-amber-400 uppercase">
              Configurações de Hardware & Gráficos
            </h2>
            <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              Perfil: {settings.preset}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors"
          >
            VOLTAR [X]
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 border-b border-zinc-800 bg-zinc-950/80">
          {(['GRAPHICS', 'PERFORMANCE', 'AUDIO'] as TabType[]).map((tab) => {
            const labels: Record<TabType, string> = {
              GRAPHICS: 'VISUAL / GRÁFICOS',
              PERFORMANCE: 'DESEMPENHO / FPS',
              AUDIO: 'ÁUDIO & SENSORES',
            };
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-xs sm:text-sm font-black tracking-wider transition-all border-b-2 ${
                  isActive
                    ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {activeTab === 'GRAPHICS' && (
            <div className="space-y-5">
              {/* Preset Selector */}
              <div>
                <label className="text-xs uppercase font-bold text-amber-500/80 tracking-wider block mb-2">
                  Predefinição de Qualidade (Preset)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {(['AUTO', 'LOW', 'MEDIUM', 'HIGH', 'ULTRA', 'CUSTOM'] as QualityPreset[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePresetSelect(p)}
                      className={`py-2 text-xs font-bold rounded border transition-all ${
                        settings.preset === p
                          ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      {p === 'AUTO' ? 'AUTO (DETECT)' : p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution Scaling */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs uppercase font-bold text-zinc-300">Resolução Interna (DPI)</label>
                  <span className="text-xs text-amber-400 font-bold">{resDisplay[settings.resolution] || settings.resolution}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['AUTO_BALANCED', 'SCALE_65', 'SCALE_80', 'SCALE_100'] as ResolutionScaleMode[]).map((res) => (
                    <button
                      key={res}
                      onClick={() => update({ resolution: res, preset: 'CUSTOM' })}
                      className={`py-2 text-xs font-bold rounded border ${
                        settings.resolution === res
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                      }`}
                    >
                      {res === 'SCALE_100' ? '100% (Nativo)' : res === 'SCALE_80' ? '80%' : res === 'SCALE_65' ? '65%' : 'Auto'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shadows & Textures */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase font-bold text-zinc-300 block mb-2">Sombras Dinâmicas</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['OFF', 'LOW', 'MEDIUM', 'HIGH'] as ShadowQuality[]).map((sq) => (
                      <button
                        key={sq}
                        onClick={() => update({ shadows: sq, preset: 'CUSTOM' })}
                        className={`py-1.5 text-xs font-bold rounded border ${
                          settings.shadows === sq
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                        {sq === 'OFF' ? 'DESL' : sq}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase font-bold text-zinc-300 block mb-2">Qualidade de Texturas</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['LOW', 'MEDIUM', 'HIGH', 'ULTRA'] as TextureQuality[]).map((tq) => (
                      <button
                        key={tq}
                        onClick={() => update({ textures: tq, preset: 'CUSTOM' })}
                        className={`py-1.5 text-xs font-bold rounded border ${
                          settings.textures === tq
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                        {tq}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* View Distance */}
              <div>
                <label className="text-xs uppercase font-bold text-zinc-300 block mb-2">Distância de Renderização</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['NEAR', 'MEDIUM', 'FAR', 'ULTRA'] as ViewDistance[]).map((vd) => {
                    const distLabels = { NEAR: 'Curta (120m)', MEDIUM: 'Média (220m)', FAR: 'Longa (350m)', ULTRA: 'Máx (500m)' };
                    return (
                      <button
                        key={vd}
                        onClick={() => update({ viewDistance: vd, preset: 'CUSTOM' })}
                        className={`py-2 text-xs font-bold rounded border ${
                          settings.viewDistance === vd
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                        {distLabels[vd]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visual Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-900">
                <SettingsToggle
                  label="Neblina Volumétrica / Fog"
                  description="Ativa neblina atmosférica para profundidade tática"
                  value={settings.fog}
                  onChange={(v) => update({ fog: v, preset: 'CUSTOM' })}
                />
                <SettingsToggle
                  label="Reflexos PBR Ambiente"
                  description="Mapa de reflexos nas armas e superfícies metálicas"
                  value={settings.pbrReflections}
                  onChange={(v) => update({ pbrReflections: v, preset: 'CUSTOM' })}
                />
                <SettingsToggle
                  label="Luz Dinâmica do Disparo"
                  description="Projeta luz do flash de disparo nos arredores"
                  value={settings.muzzleLight}
                  onChange={(v) => update({ muzzleLight: v, preset: 'CUSTOM' })}
                />
                <SettingsToggle
                  label="ACES Filmic Tonemapping"
                  description="Correção de curva de cores cinematográfica"
                  value={settings.acesToneMapping}
                  onChange={(v) => update({ acesToneMapping: v, preset: 'CUSTOM' })}
                />
              </div>
            </div>
          )}

          {activeTab === 'PERFORMANCE' && (
            <div className="space-y-5">
              {/* FPS Limit */}
              <div>
                <label className="text-xs uppercase font-bold text-amber-500/80 tracking-wider block mb-2">
                  Limite de Taxa de Quadros (FPS)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {([30, 60, 120, 0] as FpsLimit[]).map((limit) => (
                    <button
                      key={limit}
                      onClick={() => update({ fpsLimit: limit })}
                      className={`py-2.5 text-xs font-bold rounded border ${
                        settings.fpsLimit === limit
                          ? 'bg-amber-500 text-black border-amber-400'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                      }`}
                    >
                      {limit === 0 ? 'ILIMITADO' : `${limit} FPS`}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-zinc-500 mt-2">
                  * 60 FPS recomendado para a maioria dos aparelhos. 30 FPS economiza bateria e térmicos.
                </p>
              </div>

              {/* Performance Toggles */}
              <div className="space-y-3 pt-2 border-t border-zinc-900">
                <SettingsToggle
                  label="Exibir Contador de FPS em Tempo Real"
                  description="Mostra taxa de quadros e tempo de frame no topo da tela"
                  value={settings.showFpsCounter}
                  onChange={(v) => update({ showFpsCounter: v })}
                />
                <SettingsToggle
                  label="Modo Economia de Bateria (Mobile Safe)"
                  description="Trava renderização estável e reduz processamento em segundo plano"
                  value={settings.batterySaver}
                  onChange={(v) => update({ batterySaver: v })}
                />
              </div>
            </div>
          )}

          {activeTab === 'AUDIO' && (
            <div className="space-y-5">
              {/* Audio Quality */}
              <div>
                <label className="text-xs uppercase font-bold text-amber-500/80 tracking-wider block mb-2">
                  Qualidade do Motor de Áudio
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH'] as AudioQuality[]).map((aq) => {
                    const aqLabels = { LOW: 'Econômica (Baixa Latência)', MEDIUM: 'Equilibrada', HIGH: 'Ultra Fidelidade' };
                    return (
                      <button
                        key={aq}
                        onClick={() => update({ audioQuality: aq })}
                        className={`py-2 text-xs font-bold rounded border ${
                          settings.audioQuality === aq
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                        {aqLabels[aq]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Volume Sliders */}
              <div className="space-y-4 pt-2">
                <SettingsSlider
                  label="Volume Geral (Master)"
                  value={settings.volumeMaster}
                  onChange={(v) => update({ volumeMaster: v })}
                />
                <SettingsSlider
                  label="Volume da Trilha Sonora / Música"
                  value={settings.volumeMusic}
                  onChange={(v) => update({ volumeMusic: v })}
                />
                <SettingsSlider
                  label="Volume de Efeitos Sonoros (Tiros / Passos)"
                  value={settings.volumeEffects}
                  onChange={(v) => update({ volumeEffects: v })}
                />
              </div>

              {/* Audio & Haptic Toggles */}
              <div className="space-y-3 pt-2 border-t border-zinc-900">
                <SettingsToggle
                  label="Limitador de Picos de Volume (Anti-Clipping)"
                  description="Protege contra estouros de áudio quando múltiplos tiros ocorrem simultaneamente"
                  value={settings.peakLimiter}
                  onChange={(v) => update({ peakLimiter: v })}
                />
                <SettingsToggle
                  label="Vibração Tátil (Feedback Háptico)"
                  description="Vibra o celular em disparos, impactos e recargas táticas"
                  value={settings.vibration}
                  onChange={(v) => update({ vibration: v })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800/80 bg-zinc-900/60">
          <button
            onClick={onResetDefaults}
            className="px-3 py-1.5 text-xs font-bold text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/50 border border-red-800/50 rounded transition-colors"
          >
            RESTAURAR PADRÃO
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 text-xs font-black tracking-wider text-black bg-amber-500 hover:bg-amber-400 rounded transition-all shadow-md shadow-amber-500/20"
          >
            SALVAR & APLICAR
          </button>
        </div>
      </div>
    </div>
  );
};
