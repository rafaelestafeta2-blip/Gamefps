import React, { useState } from 'react';
import {
  GameSettings,
  PresetLevel,
  ResolutionScaleMode,
  ShadowQuality,
  TextureQuality,
  ViewDistance,
  FpsLimit,
  AudioQuality,
  applyPreset,
} from '../graphics/graphicsSettings';
import {
  AUDIO_LABELS,
  DIST_LABELS,
  RES_DISPLAY,
  RES_SHORT_LABEL,
  SettingsSlider,
  SettingsTabType,
  SettingsToggle,
  TAB_LABELS,
} from './SettingsControls';

interface GraphicsSettingsPanelProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onResetDefaults: () => void;
  onClose: () => void;
}

export const GraphicsSettingsPanel: React.FC<GraphicsSettingsPanelProps> = ({
  settings,
  onUpdateSettings,
  onResetDefaults,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabType>('GRAPHICS');

  const update = (patch: Partial<GameSettings>) => {
    onUpdateSettings({ ...settings, ...patch });
  };

  const handlePresetSelect = (preset: Exclude<PresetLevel, 'CUSTOM'>) => {
    onUpdateSettings(applyPreset(preset, settings));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 [@media(max-height:400px)]:p-1 select-none pointer-events-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] [@media(max-height:400px)]:max-h-[96vh] flex flex-col bg-zinc-950 border border-amber-500/40 rounded-xl shadow-[0_0_40px_rgba(245,158,11,0.15)] overflow-hidden font-mono text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 [@media(max-height:400px)]:px-3 [@media(max-height:400px)]:py-1.5 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
            <h2 className="text-base sm:text-lg [@media(max-height:400px)]:text-xs font-black tracking-wider text-amber-400 uppercase">
              Configurações de Hardware &amp; Gráficos
            </h2>
            <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              Perfil: {settings.preset}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 [@media(max-height:400px)]:py-0.5 text-xs [@media(max-height:400px)]:text-[10px] font-bold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors cursor-pointer"
          >
            VOLTAR [X]
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 border-b border-zinc-800 bg-zinc-950/80">
          {(['GRAPHICS', 'PERFORMANCE', 'AUDIO'] as SettingsTabType[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-2.5 [@media(max-height:400px)]:py-1.5 text-xs sm:text-sm [@media(max-height:400px)]:text-[11px] font-black tracking-wider transition-all border-b-2 cursor-pointer ${
                  isActive
                    ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 [@media(max-height:400px)]:p-2.5 space-y-4 [@media(max-height:400px)]:space-y-2.5">
          {activeTab === 'GRAPHICS' && (
            <div className="space-y-4 [@media(max-height:400px)]:space-y-2.5">
              {/* Preset Selector */}
              <div>
                <label className="text-xs [@media(max-height:400px)]:text-[10px] uppercase font-bold text-amber-500/80 tracking-wider block mb-1.5">
                  Predefinição de Qualidade (Preset)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {(['AUTO', 'LOW', 'MEDIUM', 'HIGH', 'ULTRA'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePresetSelect(p)}
                      className={`py-1.5 [@media(max-height:400px)]:py-1 text-xs [@media(max-height:400px)]:text-[10px] font-bold rounded border transition-all cursor-pointer ${
                        settings.preset === p
                          ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      {p === 'AUTO' ? 'AUTO (DETECT)' : p}
                    </button>
                  ))}
                  {/* Indicador CUSTOM (apenas indicador, não clicável) */}
                  <span
                    aria-label="Indicador de perfil personalizado"
                    className={`py-1.5 [@media(max-height:400px)]:py-1 text-xs [@media(max-height:400px)]:text-[10px] font-bold rounded border text-center select-none cursor-default ${
                      settings.preset === 'CUSTOM'
                        ? 'bg-amber-500/25 text-amber-300 border-amber-400'
                        : 'bg-zinc-950 text-zinc-600 border-zinc-800/60'
                    }`}
                  >
                    CUSTOM
                  </span>
                </div>
              </div>

              {/* Resolution Scaling (todas as 7 opções) */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs [@media(max-height:400px)]:text-[10px] uppercase font-bold text-zinc-300">
                    Resolução Interna (DPI)
                  </label>
                  <span className="text-xs [@media(max-height:400px)]:text-[10px] text-amber-400 font-bold">
                    {RES_DISPLAY[settings.resolution]}
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {(['AUTO_ECO', 'AUTO_BALANCED', 'AUTO_MAX', 'SCALE_50', 'SCALE_65', 'SCALE_80', 'SCALE_100'] as ResolutionScaleMode[]).map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => update({ resolution: res, preset: 'CUSTOM' })}
                      className={`py-1.5 [@media(max-height:400px)]:py-1 text-[11px] [@media(max-height:400px)]:text-[10px] font-bold rounded border cursor-pointer ${
                        settings.resolution === res
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                      }`}
                    >
                      {RES_SHORT_LABEL[res]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shadows (com ULTRA) & Textures */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs [@media(max-height:400px)]:text-[10px] uppercase font-bold text-zinc-300 block mb-1.5">
                    Sombras Dinâmicas
                  </label>
                  <div className="grid grid-cols-5 gap-1">
                    {(['OFF', 'LOW', 'MEDIUM', 'HIGH', 'ULTRA'] as ShadowQuality[]).map((sq) => (
                      <button
                        key={sq}
                        type="button"
                        onClick={() => update({ shadows: sq, preset: 'CUSTOM' })}
                        className={`py-1.5 [@media(max-height:400px)]:py-1 text-[11px] [@media(max-height:400px)]:text-[10px] font-bold rounded border cursor-pointer ${
                          settings.shadows === sq
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                        {sq === 'OFF' ? 'DESL' : sq === 'MEDIUM' ? 'MED' : sq}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs [@media(max-height:400px)]:text-[10px] uppercase font-bold text-zinc-300 block mb-1.5">
                    Qualidade de Texturas
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['LOW', 'MEDIUM', 'HIGH', 'ULTRA'] as TextureQuality[]).map((tq) => (
                      <button
                        key={tq}
                        type="button"
                        onClick={() => update({ textures: tq, preset: 'CUSTOM' })}
                        className={`py-1.5 [@media(max-height:400px)]:py-1 text-xs [@media(max-height:400px)]:text-[10px] font-bold rounded border cursor-pointer ${
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

              {/* View Distance (80/130/180/260m) */}
              <div>
                <label className="text-xs [@media(max-height:400px)]:text-[10px] uppercase font-bold text-zinc-300 block mb-1.5">
                  Distância de Renderização
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['NEAR', 'MEDIUM', 'FAR', 'ULTRA'] as ViewDistance[]).map((vd) => (
                    <button
                      key={vd}
                      type="button"
                      onClick={() => update({ viewDistance: vd, preset: 'CUSTOM' })}
                      className={`py-1.5 [@media(max-height:400px)]:py-1 text-xs [@media(max-height:400px)]:text-[10px] font-bold rounded border cursor-pointer ${
                        settings.viewDistance === vd
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                      }`}
                    >
                      {DIST_LABELS[vd]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-zinc-900">
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
            <div className="space-y-4 [@media(max-height:400px)]:space-y-2.5">
              {/* FPS Limit */}
              <div>
                <label className="text-xs [@media(max-height:400px)]:text-[10px] uppercase font-bold text-amber-500/80 tracking-wider block mb-1.5">
                  Limite de Taxa de Quadros (FPS)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {([30, 60, 120, 0] as FpsLimit[]).map((limit) => (
                    <button
                      key={limit}
                      type="button"
                      onClick={() => update({ fpsLimit: limit, preset: 'CUSTOM' })}
                      className={`py-2 [@media(max-height:400px)]:py-1 text-xs [@media(max-height:400px)]:text-[10px] font-bold rounded border cursor-pointer ${
                        settings.fpsLimit === limit
                          ? 'bg-amber-500 text-black border-amber-400'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                      }`}
                    >
                      {limit === 0 ? 'ILIMITADO' : `${limit} FPS`}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] [@media(max-height:400px)]:text-[9px] text-zinc-500 mt-1.5">
                  * 60 FPS recomendado para a maioria dos aparelhos. 30 FPS economiza bateria e térmicos.
                </p>
              </div>

              {/* Performance Toggles */}
              <div className="space-y-2.5 pt-2 border-t border-zinc-900">
                <SettingsToggle
                  label="Exibir Contador de FPS em Tempo Real"
                  description="Mostra taxa de quadros e tempo de frame no topo da tela"
                  value={settings.showFpsCounter}
                  onChange={(v) => update({ showFpsCounter: v })}
                />
                <SettingsToggle
                  label="Modo Economia de Bateria (Mobile Safe)"
                  description="Trava em 30 FPS, limita sombras em LOW e desliga luz do cano"
                  value={settings.batterySaver}
                  onChange={(v) => update({ batterySaver: v })}
                />
              </div>
            </div>
          )}

          {activeTab === 'AUDIO' && (
            <div className="space-y-4 [@media(max-height:400px)]:space-y-2.5">
              {/* Audio Quality */}
              <div>
                <label className="text-xs [@media(max-height:400px)]:text-[10px] uppercase font-bold text-amber-500/80 tracking-wider block mb-1.5">
                  Qualidade do Motor de Áudio
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH'] as AudioQuality[]).map((aq) => (
                    <button
                      key={aq}
                      type="button"
                      onClick={() => update({ audioQuality: aq })}
                      className={`py-1.5 [@media(max-height:400px)]:py-1 text-xs [@media(max-height:400px)]:text-[10px] font-bold rounded border cursor-pointer ${
                        settings.audioQuality === aq
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                      }`}
                    >
                      {AUDIO_LABELS[aq]}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] [@media(max-height:400px)]:text-[9px] text-amber-400/80 mt-1.5">
                  * A qualidade do motor de áudio só entra em vigor após reiniciar o jogo.
                </p>
              </div>

              {/* Volume Sliders */}
              <div className="space-y-3 [@media(max-height:400px)]:space-y-1.5 pt-1">
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
              <div className="space-y-2.5 pt-2 border-t border-zinc-900">
                <SettingsToggle
                  label="Limitador de Picos de Volume (Anti-Clipping)"
                  description="Protege contra estouros de áudio em disparos simultâneos"
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
        <div className="flex items-center justify-between px-5 py-2.5 [@media(max-height:400px)]:px-3 [@media(max-height:400px)]:py-1.5 border-t border-zinc-800/80 bg-zinc-900/60">
          <button
            type="button"
            onClick={onResetDefaults}
            className="px-3 py-1.5 [@media(max-height:400px)]:py-1 text-xs [@media(max-height:400px)]:text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/50 border border-red-800/50 rounded transition-colors cursor-pointer"
          >
            RESTAURAR PADRÃO
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-1.5 [@media(max-height:400px)]:py-1 text-xs [@media(max-height:400px)]:text-[10px] font-black tracking-wider text-black bg-amber-500 hover:bg-amber-400 rounded transition-all shadow-md shadow-amber-500/20 cursor-pointer"
          >
            SALVAR &amp; APLICAR
          </button>
        </div>
      </div>
    </div>
  );
};
