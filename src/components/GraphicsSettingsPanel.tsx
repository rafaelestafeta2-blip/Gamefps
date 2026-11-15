import React, { useState } from 'react';
import {
  ControlSettings,
  getDefaultControlSettings,
  loadControlSettings,
  saveControlSettings,
} from '../controls/hudLayoutSettings';
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
import { ControlsSettingsTab } from './ControlsSettingsTab';
import { HudLayoutEditorModal } from './HudLayoutEditorModal';
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
  controlSettings?: ControlSettings;
  onUpdateControlSettings?: (next: ControlSettings) => void;
  onRecalibrateGyro?: () => void;
}

export const GraphicsSettingsPanel: React.FC<GraphicsSettingsPanelProps> = ({
  settings,
  onUpdateSettings,
  onResetDefaults,
  onClose,
  controlSettings: externalControlSettings,
  onUpdateControlSettings,
  onRecalibrateGyro,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabType>('GRAPHICS');
  const [localControlSettings, setLocalControlSettings] = useState<ControlSettings>(
    () => loadControlSettings()
  );
  const [showHudEditor, setShowHudEditor] = useState(false);

  const activeControls = externalControlSettings ?? localControlSettings;

  const handleControlChange = (next: ControlSettings) => {
    setLocalControlSettings(next);
    saveControlSettings(next);
    onUpdateControlSettings?.(next);
  };

  const update = (patch: Partial<GameSettings>) =>
    onUpdateSettings({ ...settings, ...patch });

  const handlePresetSelect = (preset: Exclude<PresetLevel, 'CUSTOM'>) =>
    onUpdateSettings(applyPreset(preset, settings));

  const handleResetAll = () => {
    onResetDefaults();
    handleControlChange(getDefaultControlSettings());
  };

  return (
    <>
      {showHudEditor && (
        <HudLayoutEditorModal
          controlSettings={activeControls}
          onSaveControlSettings={handleControlChange}
          onClose={() => setShowHudEditor(false)}
        />
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[680px] max-h-full flex flex-col bg-[#0a0d14]/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-[0_16px_50px_rgba(0,0,0,0.85)] overflow-hidden font-sans text-slate-200 select-none pointer-events-auto"
      >
        {/* Compact Integrated Header & Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 border-b border-white/10 bg-[#0d111a]/90 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-3.5 rounded-xs bg-amber-500" />
            <h2 className="text-xs sm:text-sm font-display font-bold tracking-wider text-white uppercase">
              Opções
            </h2>
            <span className="text-[10px] font-mono text-amber-400/90">
              · Perfil {settings.preset}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-black/50 p-0.5 rounded-lg border border-white/10 overflow-x-auto no-scrollbar">
            {(['GRAPHICS', 'CONTROLS', 'PERFORMANCE', 'AUDIO'] as SettingsTabType[]).map(
              (tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 py-1 text-[10px] font-display font-bold tracking-wider uppercase rounded-md transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 text-[10px] font-mono font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-md transition-colors cursor-pointer"
          >
            FECHAR ✕
          </button>
        </div>

        {/* Compact Content Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {activeTab === 'GRAPHICS' && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-7 bg-white/[0.02] border border-white/10 rounded-lg p-2">
                  <label className="text-[10px] font-mono uppercase font-semibold text-amber-400 tracking-wider block mb-1">
                    Predefinição de Qualidade (Preset)
                  </label>
                  <div className="grid grid-cols-6 gap-1">
                    {(['AUTO', 'LOW', 'MEDIUM', 'HIGH', 'ULTRA'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePresetSelect(p)}
                        className={`py-1 text-[10px] font-mono font-bold rounded border transition-all cursor-pointer truncate px-1 ${
                          settings.preset === p
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-900/90 text-slate-400 border-white/10 hover:text-slate-200'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <span
                      aria-label="Indicador de perfil personalizado"
                      className={`py-1 text-[10px] font-mono font-bold rounded border text-center select-none cursor-default truncate px-1 ${
                        settings.preset === 'CUSTOM'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400/70'
                          : 'bg-slate-950/60 text-slate-600 border-white/5'
                      }`}
                    >
                      CUSTOM
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-5 bg-white/[0.02] border border-white/10 rounded-lg p-2">
                  <label className="text-[10px] font-mono uppercase font-semibold text-slate-300 tracking-wider block mb-1">
                    Distância de Renderização
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {(['NEAR', 'MEDIUM', 'FAR', 'ULTRA'] as ViewDistance[]).map((vd) => (
                      <button
                        key={vd}
                        type="button"
                        onClick={() => update({ viewDistance: vd, preset: 'CUSTOM' })}
                        className={`py-1 text-[9px] font-mono font-bold rounded border cursor-pointer truncate px-0.5 ${
                          settings.viewDistance === vd
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                            : 'bg-slate-900/90 text-slate-400 border-white/10 hover:text-slate-200'
                        }`}
                      >
                        {DIST_LABELS[vd]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-lg p-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-mono uppercase font-semibold text-slate-300">
                    Resolução Interna (DPI)
                  </label>
                  <span className="text-[10px] font-mono text-amber-400 font-bold">
                    {RES_DISPLAY[settings.resolution]}
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {(['AUTO_ECO', 'AUTO_BALANCED', 'AUTO_MAX', 'SCALE_50', 'SCALE_65', 'SCALE_80', 'SCALE_100'] as ResolutionScaleMode[]).map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => update({ resolution: res, preset: 'CUSTOM' })}
                      className={`py-1 text-[10px] font-mono font-bold rounded border cursor-pointer truncate px-1 ${
                        settings.resolution === res
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                          : 'bg-slate-900/90 text-slate-400 border-white/10 hover:text-slate-200'
                      }`}
                    >
                      {RES_SHORT_LABEL[res]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-white/[0.02] border border-white/10 rounded-lg p-2">
                  <label className="text-[10px] font-mono uppercase font-semibold text-slate-300 block mb-1">
                    Sombras Dinâmicas
                  </label>
                  <div className="grid grid-cols-5 gap-1">
                    {(['OFF', 'LOW', 'MEDIUM', 'HIGH', 'ULTRA'] as ShadowQuality[]).map((sq) => (
                      <button
                        key={sq}
                        type="button"
                        onClick={() => update({ shadows: sq, preset: 'CUSTOM' })}
                        className={`py-1 text-[10px] font-mono font-bold rounded border cursor-pointer ${
                          settings.shadows === sq
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                            : 'bg-slate-900/90 text-slate-400 border-white/10 hover:text-slate-200'
                        }`}
                      >
                        {sq === 'OFF' ? 'DESL' : sq === 'MEDIUM' ? 'MED' : sq}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/10 rounded-lg p-2">
                  <label className="text-[10px] font-mono uppercase font-semibold text-slate-300 block mb-1">
                    Qualidade de Texturas
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {(['LOW', 'MEDIUM', 'HIGH', 'ULTRA'] as TextureQuality[]).map((tq) => (
                      <button
                        key={tq}
                        type="button"
                        onClick={() => update({ textures: tq, preset: 'CUSTOM' })}
                        className={`py-1 text-[10px] font-mono font-bold rounded border cursor-pointer ${
                          settings.textures === tq
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                            : 'bg-slate-900/90 text-slate-400 border-white/10 hover:text-slate-200'
                        }`}
                      >
                        {tq === 'MEDIUM' ? 'MED' : tq}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <SettingsToggle label="Neblina Volumétrica / Fog" description="Atmosfera e profundidade tática" value={settings.fog} onChange={(v) => update({ fog: v, preset: 'CUSTOM' })} />
                <SettingsToggle label="Reflexos PBR Ambiente" description="Reflexos metálicos nas armas 3D" value={settings.pbrReflections} onChange={(v) => update({ pbrReflections: v, preset: 'CUSTOM' })} />
                <SettingsToggle label="Luz Dinâmica do Disparo" description="Iluminação do flash nos arredores" value={settings.muzzleLight} onChange={(v) => update({ muzzleLight: v, preset: 'CUSTOM' })} />
                <SettingsToggle label="ACES Filmic Tonemapping" description="Curva de contraste cinematográfica" value={settings.acesToneMapping} onChange={(v) => update({ acesToneMapping: v, preset: 'CUSTOM' })} />
                <SettingsToggle label="Pós-processo Tático" description="Sharpen + bloom leve + vinheta de dano (GPU)" value={settings.tacticalPostFx} onChange={(v) => update({ tacticalPostFx: v, preset: 'CUSTOM' })} />
              </div>
            </div>
          )}

          {activeTab === 'CONTROLS' && (
            <ControlsSettingsTab
              controlSettings={activeControls}
              onUpdateControlSettings={handleControlChange}
              onOpenHudEditor={() => setShowHudEditor(true)}
              onRecalibrateGyro={onRecalibrateGyro}
            />
          )}

          {activeTab === 'PERFORMANCE' && (
            <div className="space-y-2.5">
              <div className="bg-white/[0.02] border border-white/10 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-mono uppercase font-semibold text-amber-400 tracking-wider">
                    Limite de Taxa de Quadros (FPS)
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">
                    60 FPS recomendado · 30 FPS poupa bateria
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {([30, 60, 120, 0] as FpsLimit[]).map((limit) => (
                    <button
                      key={limit}
                      type="button"
                      onClick={() => update({ fpsLimit: limit, preset: 'CUSTOM' })}
                      className={`py-1.5 text-xs font-mono font-bold rounded border cursor-pointer ${
                        settings.fpsLimit === limit
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-900/90 text-slate-400 border-white/10 hover:text-slate-200'
                      }`}
                    >
                      {limit === 0 ? 'ILIMITADO' : `${limit} FPS`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <SettingsToggle label="Contador de FPS em Tempo Real" description="Exibe FPS, ms e DPI no topo da tela" value={settings.showFpsCounter} onChange={(v) => update({ showFpsCounter: v })} />
                <SettingsToggle label="Modo Economia de Bateria" description="Trava 30 FPS, sombras LOW e sem luz de tiro" value={settings.batterySaver} onChange={(v) => update({ batterySaver: v })} />
              </div>
            </div>
          )}

          {activeTab === 'AUDIO' && (
            <div className="space-y-2.5">
              <div className="bg-white/[0.02] border border-white/10 rounded-lg p-2">
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                  <label className="text-[10px] font-mono uppercase font-semibold text-amber-400 tracking-wider">
                    Qualidade do Motor de Áudio
                  </label>
                  <span className="text-[9px] font-mono text-amber-400/80">
                    * Entra em vigor após reiniciar o jogo
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['LOW', 'MEDIUM', 'HIGH'] as AudioQuality[]).map((aq) => (
                    <button
                      key={aq}
                      type="button"
                      onClick={() => update({ audioQuality: aq })}
                      className={`py-1 text-[10px] font-mono font-bold rounded border cursor-pointer ${
                        settings.audioQuality === aq
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                          : 'bg-slate-900/90 text-slate-400 border-white/10 hover:text-slate-200'
                      }`}
                    >
                      {AUDIO_LABELS[aq]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <SettingsSlider label="Geral (Master)" value={settings.volumeMaster} onChange={(v) => update({ volumeMaster: v })} />
                <SettingsSlider label="Música do Menu" value={settings.volumeMusic} onChange={(v) => update({ volumeMusic: v })} />
                <SettingsSlider label="Efeitos (Tiros)" value={settings.volumeEffects} onChange={(v) => update({ volumeEffects: v })} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <SettingsToggle label="Limitador de Picos (Anti-Clipping)" description="Evita distorção em disparos simultâneos" value={settings.peakLimiter} onChange={(v) => update({ peakLimiter: v })} />
                <SettingsToggle label="Vibração Tátil (Haptics)" description="Vibra em tiros, impactos e recargas" value={settings.vibration} onChange={(v) => update({ vibration: v })} />
              </div>
            </div>
          )}
        </div>

        {/* Compact Footer */}
        <div className="flex items-center justify-between px-3.5 py-2 border-t border-white/10 bg-[#0d111a]/90 shrink-0">
          <button
            type="button"
            onClick={handleResetAll}
            className="px-2.5 py-1 text-[10px] font-mono font-semibold text-red-300 hover:text-red-200 bg-red-950/40 hover:bg-red-900/50 border border-red-800/40 rounded-md transition-colors cursor-pointer"
          >
            RESTAURAR PADRÃO
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1 text-[11px] font-display font-bold tracking-wider uppercase text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md transition-all cursor-pointer"
          >
            SALVAR &amp; APLICAR
          </button>
        </div>
      </div>
    </>
  );
};
