import React, { useState } from 'react';
import {
  DrillMode,
  GyroMode,
  HudState,
  QualityPreset,
} from '../types/game';

interface GameShellModalsProps {
  hud: HudState;
  onStartGame: (mode?: DrillMode) => void;
  onResumeGame: () => void;
  onRestartDrill: () => void;
  onReturnToTitle: () => void;
  onSelectDrillMode: (mode: DrillMode) => void;
  onSetQualityPreset: (preset: QualityPreset) => void;
  onToggleDrs: () => void;
  onSetGyroMode: (mode: GyroMode) => void;
  onSetGyroSensitivity: (sens: number) => void;
  onRecalibrateGyro: () => void;
  onToggleHaptics: () => void;
  onToggleFullscreen: () => void;
}

export const GameShellModals: React.FC<GameShellModalsProps> = ({
  hud,
  onStartGame,
  onResumeGame,
  onRestartDrill,
  onReturnToTitle,
  onSelectDrillMode,
  onSetQualityPreset,
  onToggleDrs,
  onSetGyroMode,
  onSetGyroSensitivity,
  onRecalibrateGyro,
  onToggleHaptics,
  onToggleFullscreen,
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
            MOTOR MOBILE ANTI-TRAVAMENTO (GPU + SENSORES NATIVOS)
          </div>
          <div className="text-[11px] text-slate-400">
            Escala Dinâmica de Resolução (DRS), Giroscópio e Haptics Nativo
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

      {/* GPU Quality Presets */}
      <div>
        <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-1.5">
          <span>PRESET GRÁFICO DA GPU</span>
          <button
            type="button"
            onClick={onToggleDrs}
            className={`px-2 py-0.5 rounded text-[11px] border cursor-pointer ${
              hud.dynamicResolutionEnabled
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-800 border-white/10 text-slate-400'
            }`}
          >
            Escala Dinâmica (DRS): {hud.dynamicResolutionEnabled ? 'ATIVA' : 'FIXA'}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onSetQualityPreset('COMPETITIVE_120')}
            className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
              hud.qualityPreset === 'COMPETITIVE_120'
                ? 'bg-emerald-500/20 border-emerald-500 text-slate-100'
                : 'bg-[#090c12] border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="font-mono font-bold text-xs text-emerald-400">
              Competitivo 120 FPS
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Zero sombras pesadas, latência mínima para celulares intermediários.
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSetQualityPreset('BALANCED_60')}
            className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
              hud.qualityPreset === 'BALANCED_60'
                ? 'bg-amber-500/20 border-amber-500 text-slate-100'
                : 'bg-[#090c12] border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="font-mono font-bold text-xs text-amber-400">
              Equilibrado 60 FPS
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              PBR tático + sombras otimizadas + DRS automático 65%–100%.
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSetQualityPreset('ULTRA_PBR')}
            className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
              hud.qualityPreset === 'ULTRA_PBR'
                ? 'bg-cyan-500/20 border-cyan-400 text-slate-100'
                : 'bg-[#090c12] border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="font-mono font-bold text-xs text-cyan-300">
              Ultra PBR Nativo
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Nitidez máxima 2.0x DPR e sombras suaves para GPUs topo de linha.
            </div>
          </button>
        </div>
      </div>

      {/* Gyroscope & Haptics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="bg-[#090c12] border border-white/10 rounded-lg p-2.5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-1.5">
            <span>MIRA POR GIROSCÓPIO</span>
            {hud.gyroMode !== 'OFF' && (
              <button
                type="button"
                onClick={onRecalibrateGyro}
                className="text-[10px] text-amber-400 hover:underline cursor-pointer"
              >
                Recalibrar Centro
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1 mb-2">
            {(
              [
                ['OFF', 'Desligado'],
                ['ADS_ONLY', 'Só na Mira'],
                ['ALWAYS', 'Sempre'],
              ] as [GyroMode, string][]
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => onSetGyroMode(mode)}
                className={`py-1 px-1.5 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                  hud.gyroMode === mode
                    ? 'bg-amber-500 text-slate-950 font-semibold border-amber-400'
                    : 'bg-slate-900 text-slate-400 border-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span>Sensibilidade: {hud.gyroSensitivity.toFixed(1)}x</span>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={hud.gyroSensitivity}
              onChange={(e) => onSetGyroSensitivity( parseFloat(e.target.value) )}
              className="flex-1 accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="bg-[#090c12] border border-white/10 rounded-lg p-2.5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono text-slate-300 mb-1">
              FEEDBACK TÁTIL &amp; APK ANDROID
            </div>
            <div className="text-[11px] text-slate-400 mb-2">
              Vibração física sincronizada com disparos 5.56mm, encaixe do PMAG,
              ferrolho e impactos.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleHaptics}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer ${
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
              className="py-1.5 px-3 rounded-lg text-xs font-mono font-semibold bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/30 transition-colors cursor-pointer whitespace-nowrap"
            >
              Gerar APK Nativo
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderApkInstructionsModal = () => {
    if (!showApkModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 pointer-events-auto">
        <div className="bg-[#0d121a] border border-amber-500/40 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <div className="text-xs font-mono font-semibold text-amber-400">
                COMPILAÇÃO AUTOMÁTICA DE APK NATIVO (CAPACITOR + GRADLE)
              </div>
              <h3 className="font-display text-lg font-bold text-slate-100">
                Pipeline GitHub Actions Pronto no Projeto
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowApkModal(false)}
              className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-mono cursor-pointer"
            >
              FECHAR
            </button>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            O projeto já contém o empacotador nativo{' '}
            <code className="text-amber-300 font-mono">capacitor.config.json</code>{' '}
            e o workflow automatizado{' '}
            <code className="text-amber-300 font-mono">
              .github/workflows/build-android-apk.yml
            </code>{' '}
            configurado com WebGL acelerado por hardware (
            <code className="text-emerald-300 font-mono">
              android:hardwareAccelerated=&quot;true&quot;
            </code>
            ), orientação horizontal travada (
            <code className="text-emerald-300 font-mono">sensorLandscape</code>)
            e permissão de vibração tátil.
          </p>

          <div className="bg-[#070a0f] border border-white/10 rounded-xl p-3.5 font-mono text-xs text-slate-300 space-y-2">
            <div className="text-amber-400 font-semibold">
              COMO GERAR E BAIXAR O APK NO GITHUB:
            </div>
            <div>
              1. Exporte/suba este repositório para o seu GitHub (branch{' '}
              <span className="text-cyan-300">main</span>).
            </div>
            <div>
              2. No GitHub, abra a aba <span className="text-cyan-300">Actions</span>{' '}
              &rarr; workflow{' '}
              <span className="text-amber-300">
                Build Native Android APK (KINETIC FPS)
              </span>
              .
            </div>
            <div>
              3. O GitHub Actions compila o jogo com JDK 21 + Android SDK +
              Gradle e gera o arquivo instalável{' '}
              <span className="text-emerald-400 font-semibold">
                KINETIC-Tactical-FPS-Android-APK (app-debug.apk)
              </span>{' '}
              em ~3 minutos na seção <strong>Artifacts</strong>.
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowApkModal(false)}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs rounded-xl cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (hud.screen === 'TITLE') {
    return (
      <div className="fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-7 md:p-10 pointer-events-none bg-gradient-to-r from-[#090b0e]/95 via-[#090b0e]/75 to-transparent overflow-y-auto">
        {renderApkInstructionsModal()}

        {/* Top Minimal Pre-Production Header Tag (Unboxed Text) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="text-amber-400 font-semibold">KINETIC MOBILE</span>
            <span aria-hidden="true">·</span>
            <span>GPU High-FPS + DRS</span>
            <span aria-hidden="true">·</span>
            <span>Giroscópio &amp; Haptics</span>
          </div>

          <button
            type="button"
            onClick={() => setShowApkModal(true)}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-xs font-mono hover:bg-cyan-500/25 transition-colors cursor-pointer"
          >
            APK Nativo Android (GitHub Actions)
          </button>
        </div>

        {/* Center-Left Bespoke Inline SVG Title Lockup + Primary CTA */}
        <div className="max-w-2xl my-auto py-3 pointer-events-auto space-y-4">
          <svg
            viewBox="0 0 520 112"
            className="w-full max-w-[380px] h-auto"
            role="img"
            aria-label="KINETIC Tactical FPS & Ballistics Sandbox"
          >
            <path
              d="M4 24 V6 H22 M516 24 V6 H498 M4 88 V106 H22 M516 88 V106 H498"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
            />
            <circle
              cx="52"
              cy="56"
              r="26"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="18 6"
            />
            <circle cx="52" cy="56" r="4" fill="#ef4444" />
            <line
              x1="18"
              y1="56"
              x2="36"
              y2="56"
              stroke="#f8fafc"
              strokeWidth="2"
            />
            <line
              x1="68"
              y1="56"
              x2="86"
              y2="56"
              stroke="#f8fafc"
              strokeWidth="2"
            />
            <line
              x1="52"
              y1="22"
              x2="52"
              y2="40"
              stroke="#f8fafc"
              strokeWidth="2"
            />
            <line
              x1="52"
              y1="72"
              x2="52"
              y2="90"
              stroke="#f8fafc"
              strokeWidth="2"
            />
            <text
              x="104"
              y="66"
              fill="#f8fafc"
              fontFamily="'Chakra Petch', sans-serif"
              fontWeight="700"
              fontSize="56"
              letterSpacing="4"
            >
              KINETIC
            </text>
            <text
              x="106"
              y="92"
              fill="#94a3b8"
              fontFamily="'IBM Plex Mono', monospace"
              fontWeight="500"
              fontSize="13"
              letterSpacing="2.5"
            >
              NATIVE MOBILE TACTICAL COMBAT ENGINE
            </text>
          </svg>

          {/* Interactive Scenario Mode Selector */}
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

          {/* Mobile GPU + Gyro + Haptics Configuration Panel */}
          {renderHardwareSettingsPanel()}

          {/* Primary Start CTA */}
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

        {/* Single Flat Control-Hint Line at Bottom */}
        <div className="text-xs font-mono text-slate-300 bg-[#0b0e14]/90 border border-white/10 rounded-xl px-4 py-2 self-start">
          Joystick Esq Mover/Correr · Arrastar Tela Dir ou Giroscópio Mirar ·
          Botão ATIRAR / MIRA ADS · RECARGA / DROP RÁPIDA
        </div>
      </div>
    );
  }

  // PAUSED / VICTORY / GAME_OVER Modal
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#090b0e]/88 p-4 sm:p-6 overflow-y-auto">
      {renderApkInstructionsModal()}

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

        {/* Hardware & GPU Settings inside Pause Modal */}
        {renderHardwareSettingsPanel()}

        {/* Action Buttons */}
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
