import React, { useState } from 'react';
import { DrillMode, HudState } from '../types/game';
import { ApkInstructionsModal } from './ApkInstructionsModal';

interface GameShellModalsProps {
  hud: HudState;
  onStartGame: (mode?: DrillMode) => void;
  onResumeGame: () => void;
  onRestartDrill: () => void;
  onReturnToTitle: () => void;
  onSelectDrillMode: (mode: DrillMode) => void;
  onSetLookSensitivity: (sens: number) => void;
  onSetAdsSensitivity: (sens: number) => void;
  onToggleHaptics: () => void;
  onToggleFullscreen: () => void;
  onSetFpsLimit: (fps: number) => void;
}

export const GameShellModals: React.FC<GameShellModalsProps> = ({
  hud,
  onStartGame,
  onResumeGame,
  onRestartDrill,
  onReturnToTitle,
  onSelectDrillMode,
  onSetLookSensitivity,
  onSetAdsSensitivity,
  onToggleHaptics,
  onToggleFullscreen,
  onSetFpsLimit,
}) => {
  const [showApkModal, setShowApkModal] = useState(false);

  if (
    hud.screen === 'PLAYING' ||
    hud.screen === 'INTRO' ||
    hud.screen === 'LOADING' ||
    hud.screen === 'MAIN_MENU'
  ) {
    return null;
  }

  const accuracy =
    hud.shotsFired > 0 ? Math.round((hud.hits / hud.shotsFired) * 100) : 100;

  const renderHardwareSettingsPanel = () => (
    <div className="bg-[#0b0f17]/95 border border-white/15 rounded-xl p-4 space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <div>
          <div className="text-xs font-mono font-semibold text-amber-400">
            SENSIBILIDADE DA MIRA, CÂMERA &amp; DESEMPENHO
          </div>
          <div className="text-[11px] text-slate-400">
            Ajuste a velocidade de rotação da câmera e da mira aberta (ADS)
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="px-3 py-1.5 text-xs font-mono font-semibold rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer"
        >
          {hud.isFullscreen
            ? 'Sair da Tela Cheia'
            : 'Ativar Tela Cheia Horizontal'}
        </button>
      </div>

      {/* Camera & Aim Sensitivity Controls */}
      <div className="bg-[#090c12] border border-amber-500/30 rounded-lg p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-mono font-bold text-slate-200">
            SENSIBILIDADE DA MIRA (TOQUE NA TELA)
          </span>
          <div className="flex items-center gap-1.5">
            {(
              [
                ['Baixa', 0.6, 0.7],
                ['Padrão', 1.0, 1.0],
                ['Alta', 1.5, 1.2],
                ['Pró', 2.2, 1.5],
              ] as [string, number, number][]
            ).map(([label, lookVal, adsVal]) => {
              const isSelected =
                Math.abs(hud.lookSensitivity - lookVal) < 0.08 &&
                Math.abs(hud.adsSensitivity - adsVal) < 0.08;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    onSetLookSensitivity(lookVal);
                    onSetAdsSensitivity(adsVal);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                      : 'bg-slate-900 text-slate-300 border-white/15 hover:border-amber-400/50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Free Look Camera Sensitivity */}
          <div className="bg-[#0d121b] border border-white/10 rounded-lg p-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-200 mb-1.5">
              <span>Câmera / Giro Livre</span>
              <span className="text-amber-400 font-bold tabular-nums">
                {Math.round(hud.lookSensitivity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.05"
              value={hud.lookSensitivity}
              onChange={(e) => onSetLookSensitivity(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* ADS Scope Sensitivity */}
          <div className="bg-[#0d121b] border border-white/10 rounded-lg p-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-200 mb-1.5">
              <span>Mira Aberta (ADS / Luneta)</span>
              <span className="text-amber-400 font-bold tabular-nums">
                {Math.round(hud.adsSensitivity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.05"
              value={hud.adsSensitivity}
              onChange={(e) => onSetAdsSensitivity(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* FPS Limit & Haptics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
        <div className="bg-[#090c12] border border-white/10 rounded-lg p-2.5">
          <div className="text-slate-300 font-bold mb-1.5">
            LIMITE DE FPS:
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[30, 60, 120, 0].map((fps) => (
              <button
                key={fps}
                type="button"
                onClick={() => onSetFpsLimit(fps)}
                className={`py-1.5 rounded-lg font-bold border text-[11px] transition-colors cursor-pointer ${
                  hud.fpsLimit === fps
                    ? 'bg-amber-500 text-slate-950 border-amber-300'
                    : 'bg-slate-900 border-white/15 text-slate-300 hover:text-white'
                }`}
              >
                {fps === 0 ? 'MAX' : `${fps}`}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#090c12] border border-white/10 rounded-lg p-2.5 flex flex-col justify-between gap-2">
          <div className="text-xs font-mono text-slate-300 font-bold">
            VIBRAÇÃO &amp; APK ANDROID:
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleHaptics}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                hud.hapticsEnabled
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-900 border-white/10 text-slate-400'
              }`}
            >
              Vibração: {hud.hapticsEnabled ? 'ATIVADA' : 'DESATIVADA'}
            </button>
            <button
              type="button"
              onClick={() => setShowApkModal(true)}
              className="py-1.5 px-2.5 rounded-lg text-xs font-mono font-semibold bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/30 transition-colors cursor-pointer whitespace-nowrap"
            >
              APK Nativo
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (hud.screen === 'TITLE') {
    return (
      <div className="fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-7 md:p-10 pointer-events-none bg-gradient-to-r from-[#090b0e]/95 via-[#090b0e]/75 to-transparent overflow-y-auto">
        <ApkInstructionsModal
          visible={showApkModal}
          onClose={() => setShowApkModal(false)}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="text-amber-400 font-semibold">KINETIC MOBILE</span>
            <span aria-hidden="true">·</span>
            <span>GPU High-FPS + DRS</span>
            <span aria-hidden="true">·</span>
            <span>Haptics</span>
          </div>

          <button
            type="button"
            onClick={() => setShowApkModal(true)}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-xs font-mono hover:bg-cyan-500/25 transition-colors cursor-pointer"
          >
            APK Nativo Android (GitHub Actions)
          </button>
        </div>

        <div className="max-w-2xl my-auto py-3 pointer-events-auto space-y-4">
          <div>
            <div className="text-xs font-mono text-slate-400 mb-1.5">
              SELECIONE O PROTOCOLO DE TREINAMENTO
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onSelectDrillMode('FREE_RANGE')}
                className={`text-left p-2.5 rounded-xl border transition-colors cursor-pointer ${
                  hud.drillMode === 'FREE_RANGE'
                    ? 'bg-amber-500/15 border-amber-500 text-slate-100'
                    : 'bg-[#0d1118]/90 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-display font-bold text-sm text-slate-100">
                  01. Estande Livre
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Raias de 15m a 55m, gongos AR500 e telemetria balística.
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectDrillMode('KILLHOUSE_BLITZ')}
                className={`text-left p-2.5 rounded-xl border transition-colors cursor-pointer ${
                  hud.drillMode === 'KILLHOUSE_BLITZ'
                    ? 'bg-amber-500/15 border-amber-500 text-slate-100'
                    : 'bg-[#0d1118]/90 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-display font-bold text-sm text-slate-100">
                  02. Incursão CQB
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Percurso cronometrado no Killhouse com alvos blindados.
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectDrillMode('TACTICAL_WAVE')}
                className={`text-left p-2.5 rounded-xl border transition-colors cursor-pointer ${
                  hud.drillMode === 'TACTICAL_WAVE'
                    ? 'bg-amber-500/15 border-amber-500 text-slate-100'
                    : 'bg-[#0d1118]/90 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-display font-bold text-sm text-slate-100">
                  03. Combate Hostil
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Unidades táticas patrulham, miram com laser e revidam.
                </div>
              </button>
            </div>
          </div>

          {renderHardwareSettingsPanel()}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onStartGame(hud.drillMode)}
              className="min-h-[48px] px-7 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-base tracking-wide rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Iniciar Combate Mobile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090b0e]/88 p-4 sm:p-6 overflow-y-auto pointer-events-auto">
      <ApkInstructionsModal
        visible={showApkModal}
        onClose={() => setShowApkModal(false)}
      />

      <div className="bg-[#0e131b] border border-white/15 rounded-2xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl space-y-4 my-auto">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-amber-400 mb-0.5">
              {hud.screen === 'PAUSED' && 'SIMULAÇÃO PAUSADA'}
              {hud.screen === 'VICTORY' && 'PERCURSO TÁTICO CONCLUÍDO'}
              {hud.screen === 'GAME_OVER' && 'OPERADOR NEUTRALIZADO'}
            </div>

            <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-100">
              {hud.screen === 'PAUSED' && 'Central Tática & GPU Mobile'}
              {hud.screen === 'VICTORY' && 'Killhouse Limpo com Sucesso'}
              {hud.screen === 'GAME_OVER' && 'Fim da Incursão Tática'}
            </h2>
          </div>

          <div className="text-right font-mono">
            <div className="text-xs text-emerald-400 font-semibold">
              {hud.liveFps} FPS
            </div>
            <div className="text-[11px] text-slate-400">
              Escala DRS: {hud.renderScalePercent}%
            </div>
          </div>
        </div>

        {/* Telemetry Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-white/10 font-mono tabular-nums">
          <div>
            <div className="text-[11px] text-slate-400">PONTUAÇÃO</div>
            <div className="text-lg font-bold text-amber-400">{hud.score}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">PRECISÃO</div>
            <div className="text-lg font-bold text-slate-100">{accuracy}%</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">HEADSHOTS</div>
            <div className="text-lg font-bold text-emerald-400">
              {hud.headshots}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">TEMPO</div>
            <div className="text-lg font-bold text-cyan-400">
              {hud.courseTimerSec.toFixed(1)}s
            </div>
          </div>
        </div>

        {renderHardwareSettingsPanel()}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {hud.screen === 'PAUSED' && (
            <button
              type="button"
              onClick={onResumeGame}
              className="min-h-[44px] px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Retomar Combate
            </button>
          )}
          <button
            type="button"
            onClick={onRestartDrill}
            className="min-h-[44px] px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-sm rounded-xl border border-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Reiniciar Percurso
          </button>
          <button
            type="button"
            onClick={onReturnToTitle}
            className="min-h-[44px] px-4 py-2.5 bg-transparent hover:bg-white/5 text-slate-300 font-medium text-sm rounded-xl border border-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Tela Inicial
          </button>
        </div>
      </div>
    </div>
  );
};
