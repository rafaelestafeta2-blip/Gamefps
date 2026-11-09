import React, { useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { GameSettings } from '../graphics/graphicsSettings';
import { mobileHardware } from '../mobile/nativeHardware';
import {
  getNextRank,
  getRankForXp,
  loadSavedPlayerXp,
} from '../progression/ranks';
import { DrillMode, WeaponId } from '../types/game';
import { GraphicsSettingsPanel } from './GraphicsSettingsPanel';
import { MainMenuRanksModal } from './MainMenuRanksModal';
import { MenuBackground } from './MenuBackground';
import { WarfaceRankIcon } from './WarfaceRankIcon';
import { WeaponInspectionModal } from './WeaponInspectionModal';

interface MainMenuProps {
  onStartTraining: () => void;
  onStartDrill: (mode: DrillMode) => void;
  activeWeapon: WeaponId;
  onSelectStartingWeapon: (weaponId: WeaponId) => void;
  gameSettings?: GameSettings;
  onUpdateGameSettings?: (settings: GameSettings) => void;
  onResetGameSettings?: () => void;
}

const WEAPON_DISPLAY_NAMES: Record<
  WeaponId,
  { name: string; caliber: string; category: string }
> = {
  P50_PISTOL: { name: 'MARK 23 TÁTICA', caliber: '.45 ACP', category: 'Pistola Pesada' },
  M4_CARBINE: { name: 'M4A1 SOPMOD', caliber: '5.56x45mm', category: 'Fuzil de Assalto' },
  SMG_45: { name: 'SMG .45 SUB', caliber: '.45 ACP', category: 'Submetralhadora' },
  AK47_RIFLE: { name: 'AK-47 COMANDO', caliber: '7.62x39mm', category: 'Fuzil de Assalto' },
  CARBINE_AR: { name: 'CARABINA TÁTICA', caliber: '5.56x45mm', category: 'Carabina de Precisão' },
  L49_LMG: { name: 'LMG PESADA 100R', caliber: '5.56x45mm', category: 'Metralhadora Leve' },
  SNIPER_TACTICAL: { name: 'SNIPER TÁTICA S&B', caliber: '.308 Win', category: 'Fuzil Sniper' },
  SNIPER_BOLT: { name: 'SNIPER BOLT-ACTION', caliber: '.338 Lapua', category: 'Fuzil de Precisão' },
  KNIFE_TACTICAL: { name: 'FACA TÁTICA COMBATE', caliber: 'Aço Carbono', category: 'Lâmina Corpo a Corpo' },
};

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartTraining,
  onStartDrill,
  activeWeapon,
  onSelectStartingWeapon,
  gameSettings,
  onUpdateGameSettings,
  onResetGameSettings,
}) => {
  const [activeTab, setActiveTab] = useState<
    'PLAY' | 'WEAPON' | 'RANKS' | 'BATTLE_PASS' | 'SETTINGS'
  >('PLAY');
  const [showNewsModal, setShowNewsModal] = useState(false);

  // Live Warface Progression State
  const playerXp = loadSavedPlayerXp();
  const currentRank = getRankForXp(playerXp);
  const nextRank = getNextRank(currentRank.level);
  const xpCurrentLevelBase = currentRank.requiredXp;
  const xpForNextLevel = nextRank ? nextRank.requiredXp : currentRank.requiredXp + 5000;
  const xpLevelProgress = Math.max(
    0,
    Math.min(
      100,
      ((playerXp - xpCurrentLevelBase) / (xpForNextLevel - xpCurrentLevelBase)) * 100
    )
  );

  const handleHover = () => {
    soundEngine.playMenuHover();
  };

  const handleLaunchTraining = async () => {
    soundEngine.playMenuSelect();
    soundEngine.stopMenuMusic();
    await mobileHardware.enterFullscreenLandscape();
    onStartTraining();
  };

  const handleLaunchDrill = async (mode: DrillMode) => {
    soundEngine.playMenuSelect();
    soundEngine.stopMenuMusic();
    await mobileHardware.enterFullscreenLandscape();
    onStartDrill(mode);
  };

  const activeWeaponMeta = WEAPON_DISPLAY_NAMES[activeWeapon];

  return (
    <div
      onClick={() => {
        void mobileHardware.enterFullscreenLandscape();
      }}
      className="fixed inset-0 z-40 bg-[#06080c] select-none text-white flex flex-col justify-between overflow-hidden font-sans"
    >
      {/* 1. BACKGROUND */}
      <MenuBackground />

      {/* 2. TOP NAVIGATION BAR */}
      <header className="relative z-20 w-full h-11 sm:h-12 px-3 sm:px-6 bg-[#0a0d13]/92 border-b border-white/15 flex items-center justify-between gap-2 shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-5 min-w-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.playMenuSelect();
              setActiveTab('PLAY');
            }}
            className="flex items-center gap-1.5 cursor-pointer shrink-0 pr-2 border-r border-white/15"
          >
            <span className="w-2 h-4 bg-amber-500 rounded-xs shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            <span className="text-sm sm:text-base font-display font-black tracking-widest uppercase text-white">
              KINETIC
            </span>
          </button>

          <nav className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
            {[
              { id: 'PLAY', label: 'JOGAR' },
              { id: 'WEAPON', label: 'ARSENAL 3D' },
              { id: 'RANKS', label: 'PATENTES' },
              { id: 'BATTLE_PASS', label: 'PASSE' },
              { id: 'SETTINGS', label: 'OPÇÕES' },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onMouseEnter={handleHover}
                  onClick={(e) => {
                    e.stopPropagation();
                    soundEngine.playMenuSelect();
                    setActiveTab(tab.id as typeof activeTab);
                  }}
                  className={`relative px-2.5 sm:px-3 py-1.5 font-display font-bold text-[11px] sm:text-xs tracking-wider uppercase whitespace-nowrap transition-colors cursor-pointer rounded-lg ${
                    isSelected
                      ? 'text-amber-300 bg-amber-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <span>{tab.label}</span>
                  {isSelected && (
                    <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Rank Pill */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.playMenuSelect();
              setActiveTab('RANKS');
            }}
            title="Ver Tabela Completa de 70 Patentes Warface"
            className="flex items-center gap-2 bg-black/75 hover:bg-black/90 border border-amber-500/40 hover:border-amber-400 rounded-xl px-2.5 py-1 cursor-pointer transition-all shadow-md max-w-[185px] sm:max-w-[230px]"
          >
            <WarfaceRankIcon level={currentRank.level} className="w-6 h-6" />
            <div className="flex flex-col text-left min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-mono font-black tracking-wide text-amber-300 truncate">
                  NÍV. {currentRank.level} · {currentRank.title}
                </span>
                <span className="text-[8px] font-mono text-slate-400 shrink-0">
                  {Math.round(xpLevelProgress)}%
                </span>
              </div>
              <div className="w-full bg-slate-800/80 h-1 rounded-full overflow-hidden mt-0.5">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-300 shadow-[0_0_6px_rgba(245,158,11,0.8)]"
                  style={{ width: `${xpLevelProgress}%` }}
                />
              </div>
            </div>
          </button>
        </div>
      </header>

      {/* 3. CENTER DYNAMIC CONTENT */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-3 sm:p-5 pointer-events-none overflow-hidden">
        {/* PLAY TAB */}
        {activeTab === 'PLAY' && (
          <div className="flex flex-col gap-2.5 max-w-sm w-full pointer-events-auto">
            {/* ACTIVE WEAPON CARD */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playMenuSelect();
                setActiveTab('WEAPON');
              }}
              className="group relative w-full bg-black/75 hover:bg-black/90 border border-white/20 hover:border-amber-400/80 rounded-xl p-2.5 flex items-center justify-between gap-3 text-left transition-all duration-150 cursor-pointer shadow-lg backdrop-blur-md"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-amber-400">
                  ARMA SELECIONADA
                </span>
                <span className="text-xs sm:text-sm font-display font-black text-white group-hover:text-amber-200 transition-colors truncate">
                  {activeWeaponMeta.name}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {activeWeaponMeta.category} · {activeWeaponMeta.caliber}
                </span>
              </div>
              <span className="px-2 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors shrink-0">
                TROCAR &gt;
              </span>
            </button>

            {/* ESTANDE LIVRE */}
            <button
              type="button"
              onMouseEnter={handleHover}
              onClick={handleLaunchTraining}
              className="group relative w-full h-11 bg-gradient-to-r from-amber-500/20 via-black/65 to-black/40 hover:from-amber-500/35 border-l-4 border-l-amber-400 border-y border-r border-white/15 rounded-r-xl flex items-center justify-between px-3.5 text-left transition-all duration-150 cursor-pointer shadow-md backdrop-blur-sm"
            >
              <div>
                <div className="text-xs sm:text-sm font-display font-black tracking-wider uppercase text-amber-300 group-hover:text-white transition-colors">
                  ESTANDE DE TIRO (LIVRE)
                </div>
                <div className="text-[9px] font-mono text-slate-400">
                  Treino balístico, alvos móveis e armas liberadas
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform">
                ▶
              </span>
            </button>

            {/* KILLHOUSE */}
            <button
              type="button"
              onMouseEnter={handleHover}
              onClick={() => handleLaunchDrill('KILLHOUSE_BLITZ')}
              className="group relative w-full h-11 bg-gradient-to-r from-white/10 via-black/65 to-black/40 hover:from-white/20 border-l-4 border-l-sky-400 border-y border-r border-white/15 rounded-r-xl flex items-center justify-between px-3.5 text-left transition-all duration-150 cursor-pointer shadow-md backdrop-blur-sm"
            >
              <div>
                <div className="text-xs sm:text-sm font-display font-black tracking-wider uppercase text-slate-100 group-hover:text-white transition-colors">
                  INCURSÃO KILLHOUSE
                </div>
                <div className="text-[9px] font-mono text-slate-400">
                  Percurso CQB cronometrado de alta precisão
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-sky-400 group-hover:translate-x-0.5 transition-transform">
                ▶
              </span>
            </button>

            {/* COMBATE IA */}
            <button
              type="button"
              onMouseEnter={handleHover}
              onClick={() => handleLaunchDrill('TACTICAL_WAVE')}
              className="group relative w-full h-11 bg-gradient-to-r from-red-500/20 via-black/65 to-black/40 hover:from-red-500/35 border-l-4 border-l-red-500 border-y border-r border-white/15 rounded-r-xl flex items-center justify-between px-3.5 text-left transition-all duration-150 cursor-pointer shadow-md backdrop-blur-sm"
            >
              <div>
                <div className="text-xs sm:text-sm font-display font-black tracking-wider uppercase text-red-400 group-hover:text-red-200 transition-colors">
                  COMBATE CONTRA IA
                </div>
                <div className="text-[9px] font-mono text-slate-400">
                  Incursão hostil com patrulhas armadas
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-red-400 group-hover:translate-x-0.5 transition-transform">
                ▶
              </span>
            </button>
          </div>
        )}

        {/* WEAPON INSPECTION MODAL */}
        {activeTab === 'WEAPON' && (
          <WeaponInspectionModal
            activeWeapon={activeWeapon}
            playerXp={playerXp}
            onSelectWeapon={(wId) => onSelectStartingWeapon(wId)}
            onClose={() => setActiveTab('PLAY')}
            onStartTraining={handleLaunchTraining}
          />
        )}

        {/* RANKS MODAL */}
        {activeTab === 'RANKS' && (
          <MainMenuRanksModal
            currentRank={currentRank}
            playerXp={playerXp}
            onClose={() => setActiveTab('PLAY')}
          />
        )}

        {/* PREMIUM OPTIONS MODAL */}
        {activeTab === 'SETTINGS' && gameSettings && onUpdateGameSettings && (
          <GraphicsSettingsPanel
            settings={gameSettings}
            onUpdateSettings={onUpdateGameSettings}
            onResetDefaults={() => onResetGameSettings && onResetGameSettings()}
            onClose={() => setActiveTab('PLAY')}
          />
        )}

        {/* BATTLE PASS */}
        {activeTab === 'BATTLE_PASS' && (
          <div className="max-w-md w-full bg-[#0c0e14]/95 border border-white/20 rounded-xl p-4 sm:p-5 shadow-2xl backdrop-blur-md pointer-events-auto">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <h3 className="font-display font-black text-base text-amber-400 uppercase tracking-wider">
                PASSE DE BATALHA · TEMPORADA WARFACE
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('PLAY')}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-[10px] font-mono rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                FECHAR ✕
              </button>
            </div>
            <p className="font-mono text-xs text-slate-300 leading-relaxed">
              Acumule pontos de XP no estande de tiro e nas incursões táticas
              para subir sua patente militar de <b>Trainee (Nív. 1)</b> até{' '}
              <b>Warface Supremo (Nív. 70)</b> e liberar todo o arsenal.
            </p>
          </div>
        )}
      </main>

      {/* 4. NEWS TAB */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          soundEngine.playMenuSelect();
          setShowNewsModal((prev) => !prev);
        }}
        className="absolute top-1/2 -translate-y-1/2 right-0 z-30 bg-[#12161f]/90 hover:bg-[#1c222f] border-l border-y border-amber-500/50 rounded-l-lg px-1.5 py-3 flex flex-col items-center gap-1.5 cursor-pointer shadow-lg transition-colors group"
      >
        <div className="w-3 h-3 border border-amber-400 rounded-xs flex items-center justify-center text-[8px] text-amber-400 font-bold">
          ★
        </div>
        <span
          className="font-black text-[9px] tracking-[0.2em] text-slate-200 group-hover:text-amber-300 uppercase"
          style={{ writingMode: 'vertical-lr' }}
        >
          NEWS
        </span>
      </div>

      {showNewsModal && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-1/2 -translate-y-1/2 right-10 z-40 max-w-xs bg-[#0c0e14]/98 border border-amber-500/40 rounded-xl p-4 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/15">
            <span className="font-black text-xs text-amber-400 tracking-wider">
              ATUALIZAÇÃO TÁTICA
            </span>
            <button
              type="button"
              onClick={() => setShowNewsModal(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
          <p className="font-mono text-[11px] text-slate-300 leading-relaxed">
            • <b>Opções de Hardware</b>: Ajuste resolução, sombras dinâmicas, texturas, áudio e limite de FPS.
            <br />• <b>Insígnias Vetoriais SVG</b>: 70 patentes Warface nítidas.
          </p>
        </div>
      )}

      {/* 5. FOOTER */}
      <footer className="relative z-20 w-full px-4 sm:px-8 py-1.5 flex items-center justify-between pointer-events-none text-[9px] font-mono text-slate-400/80">
        <span>MOTOR 3D MOBILE OTIMIZADO · {gameSettings?.fpsLimit ? `${gameSettings.fpsLimit} FPS` : '60 FPS'}</span>
        <span>SISTEMA DE PATENTES WARFACE ATIVO · V0.0.6</span>
      </footer>
    </div>
  );
};
