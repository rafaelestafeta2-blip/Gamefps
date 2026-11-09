import React, { useEffect, useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { ControlSettings } from '../controls/hudLayoutSettings';
import { GameSettings } from '../graphics/graphicsSettings';
import { mobileHardware } from '../mobile/nativeHardware';
import {
  getNextRank,
  getRankForXp,
  loadSavedPlayerCash,
  loadSavedPlayerXp,
} from '../progression/ranks';
import { DrillMode, WeaponId } from '../types/game';
import { GraphicsSettingsPanel } from './GraphicsSettingsPanel';
import { MainMenuPlayPanel } from './MainMenuPlayPanel';
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
  controlSettings?: ControlSettings;
  onUpdateControlSettings?: (next: ControlSettings) => void;
  onRecalibrateGyro?: () => void;
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
  controlSettings,
  onUpdateControlSettings,
  onRecalibrateGyro,
}) => {
  const [activeTab, setActiveTab] = useState<
    'PLAY' | 'WEAPON' | 'RANKS' | 'BATTLE_PASS' | 'SETTINGS'
  >('PLAY');
  const [showNewsModal, setShowNewsModal] = useState(false);

  // Inicia a música tema ao entrar no Menu Principal e para ao sair para a partida
  useEffect(() => {
    soundEngine.playMenuMusic();
    return () => {
      soundEngine.stopMenuMusic();
    };
  }, []);

  // Live Warface Progression & Tactical Cash Balance
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
  const playerCashBalance = 15000 + playerXp * 2 + loadSavedPlayerCash();

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
        soundEngine.playMenuMusic();
        void mobileHardware.enterFullscreenLandscape();
      }}
      className="fixed inset-0 z-40 bg-[#06080c] select-none text-white flex flex-col justify-between overflow-hidden font-sans"
    >
      {/* 1. BACKGROUND (Soldado + Fumaça Volumétrica + Fagulhas) */}
      <MenuBackground />

      {/* 2. TOP NAVIGATION BAR (Minimalista com Saldo de Dinheiro + Patente Compacta) */}
      <header className="relative z-20 w-full h-10 sm:h-11 px-3 sm:px-5 bg-[#0a0d13]/90 border-b border-white/10 flex items-center justify-between gap-2 shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.playMenuSelect();
              soundEngine.playMenuMusic();
              setActiveTab('PLAY');
            }}
            className="flex items-center gap-1.5 cursor-pointer shrink-0 pr-2.5 border-r border-white/15"
          >
            <span className="w-2 h-4 bg-amber-500 rounded-xs shadow-[0_0_10px_rgba(245,158,11,0.95)]" />
            <span className="text-sm sm:text-base font-display font-black tracking-[0.12em] uppercase text-white">
              KINETIC
            </span>
          </button>

          <nav className="flex items-center gap-0.5 sm:gap-1 shrink-0">
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
                    soundEngine.playMenuMusic();
                    setActiveTab(tab.id as typeof activeTab);
                  }}
                  className={`relative px-2 sm:px-3 py-1 font-display font-bold text-[10px] sm:text-xs tracking-wider uppercase whitespace-nowrap transition-all cursor-pointer rounded-lg ${
                    isSelected
                      ? 'text-amber-400 bg-amber-500/15'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                  }`}
                >
                  <span>{tab.label}</span>
                  {isSelected && (
                    <div className="absolute -bottom-[1px] left-2 right-2 h-[2px] rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,1)]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Minimalist Cash Balance + Compact Rank Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Saldo de Dinheiro Tático */}
          <div
            title="Saldo de Créditos Táticos"
            className="flex items-center gap-1.5 bg-white/[0.04] border border-emerald-500/30 rounded-full px-2.5 py-0.5"
          >
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center text-[9px] font-mono font-black text-emerald-400">
              $
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono font-bold text-emerald-300 tabular-nums whitespace-nowrap">
              {playerCashBalance.toLocaleString('pt-BR')}
            </span>
          </div>

          {/* Barra de Patente Minimalista */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.playMenuSelect();
              setActiveTab('RANKS');
            }}
            title={`Patente: Nív. ${currentRank.level} · ${currentRank.title} (${Math.round(xpLevelProgress)}%)`}
            className="flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-amber-500/35 hover:border-amber-400 rounded-full pl-1.5 pr-2.5 py-0.5 cursor-pointer transition-all"
          >
            <WarfaceRankIcon level={currentRank.level} className="w-5 h-5 shrink-0" />
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold text-amber-300 whitespace-nowrap tabular-nums">
                  NÍV. {currentRank.level}
                </span>
                <span className="text-[8px] font-mono text-slate-400 tabular-nums">
                  {Math.round(xpLevelProgress)}%
                </span>
              </div>
              <div className="w-12 sm:w-14 bg-slate-800 h-1 rounded-full overflow-hidden mt-0.5">
                <div
                  className="bg-gradient-to-r from-amber-500 to-yellow-300 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(6, xpLevelProgress)}%` }}
                />
              </div>
            </div>
          </button>
        </div>
      </header>

      {/* 3. DYNAMIC CONTENT (Alinhado à esquerda na aba JOGAR sem cobrir o Soldado no centro) */}
      <main
        className={`relative z-10 flex-1 flex items-center px-3 sm:px-6 py-2 pointer-events-none overflow-hidden ${
          activeTab === 'PLAY' ? 'justify-start' : 'justify-center'
        }`}
      >
        {activeTab === 'PLAY' && (
          <MainMenuPlayPanel
            activeWeapon={activeWeapon}
            weaponName={activeWeaponMeta.name}
            weaponCategory={activeWeaponMeta.category}
            weaponCaliber={activeWeaponMeta.caliber}
            onOpenWeaponSelect={() => {
              soundEngine.playMenuSelect();
              setActiveTab('WEAPON');
            }}
            onStartTraining={handleLaunchTraining}
            onStartDrill={handleLaunchDrill}
            onHover={handleHover}
          />
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
            controlSettings={controlSettings}
            onUpdateControlSettings={onUpdateControlSettings}
            onRecalibrateGyro={onRecalibrateGyro}
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
        className="absolute top-1/2 -translate-y-1/2 right-0 z-30 bg-[#12161f]/90 hover:bg-[#1c222f] border-l border-y border-white/20 hover:border-amber-500/60 rounded-l-xl px-1.5 py-3 flex flex-col items-center gap-1.5 cursor-pointer shadow-xl transition-colors group"
      >
        <div className="w-3 h-3 border border-amber-400 rounded-xs flex items-center justify-center text-[8px] text-amber-400 font-bold">
          ★
        </div>
        <span
          className="font-display font-bold text-[9px] tracking-[0.2em] text-slate-200 group-hover:text-amber-300 uppercase"
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
      <footer className="relative z-20 w-full px-4 sm:px-6 py-1.5 flex items-center justify-between pointer-events-none text-[9px] font-mono tracking-wider text-slate-400/90 uppercase">
        <span>
          MOTOR 3D MOBILE OTIMIZADO ·{' '}
          {gameSettings?.fpsLimit ? `${gameSettings.fpsLimit} FPS` : '60 FPS'}
        </span>
        <span>SISTEMA DE PATENTES ATIVO · V0.0.7</span>
      </footer>
    </div>
  );
};
