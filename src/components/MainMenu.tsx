import React, { useEffect, useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { ControlSettings } from '../controls/hudLayoutSettings';
import {
  CloudSyncState,
  getCloudSyncState,
  subscribePlayerProfile,
  syncProgressionFromLocal,
} from '../firebase/playerCloudSync';
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
import { MainMenuTopNav } from './MainMenuTopNav';
import { MenuBackground } from './MenuBackground';
import { PlayerProfileModal } from './PlayerProfileModal';
import { WeaponInspectionModal } from './WeaponInspectionModal';

interface MainMenuProps {
  onStartTraining: () => void;
  onStartDrill: (mode: DrillMode) => void;
  onStartMatchmaking: (targetMode: DrillMode) => void;
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
  onStartMatchmaking,
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
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [syncState, setSyncState] = useState<CloudSyncState>(() =>
    getCloudSyncState()
  );

  // Inicia a música tema ao entrar no Menu Principal e sincroniza perfil Firebase
  useEffect(() => {
    soundEngine.playMenuMusic();
    const unsub = subscribePlayerProfile((next) => setSyncState(next));
    return () => {
      unsub();
      soundEngine.stopMenuMusic();
    };
  }, []);

  // Live Warface Progression & Tactical Cash Balance (sincronizado com Firebase)
  const playerXp = Math.max(loadSavedPlayerXp(), syncState.profile.playerXp);
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
  const savedCash = Math.max(loadSavedPlayerCash(), syncState.profile.playerCash);
  const playerCashBalance = 15000 + playerXp * 2 + savedCash;

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

  const handleLaunchMatchmaking = async (targetMode: DrillMode) => {
    soundEngine.playMenuSelect();
    soundEngine.stopMenuMusic();
    await mobileHardware.enterFullscreenLandscape();
    onStartMatchmaking(targetMode);
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

      {/* 2. TOP NAVIGATION BAR (Modularizado com Saldo + Patente + Foto de Perfil Firebase) */}
      <MainMenuTopNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onHover={handleHover}
        playerCashBalance={playerCashBalance}
        currentRank={currentRank}
        xpLevelProgress={xpLevelProgress}
        syncState={syncState}
        onOpenProfile={() => setShowProfileModal(true)}
      />

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
            onStartMatchmaking={handleLaunchMatchmaking}
            onHover={handleHover}
          />
        )}

        {/* WEAPON INSPECTION MODAL */}
        {activeTab === 'WEAPON' && (
          <WeaponInspectionModal
            activeWeapon={activeWeapon}
            playerXp={playerXp}
            onSelectWeapon={(wId) => {
              onSelectStartingWeapon(wId);
              syncProgressionFromLocal(playerXp, savedCash, wId);
            }}
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

      {showProfileModal && (
        <PlayerProfileModal
          syncState={syncState}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* 5. FOOTER */}
      <footer className="relative z-20 w-full px-4 sm:px-6 py-1.5 flex items-center justify-between pointer-events-none text-[9px] font-mono tracking-wider text-slate-400/90 uppercase">
        <span>
          MOTOR 3D MOBILE OTIMIZADO ·{' '}
          {gameSettings?.fpsLimit ? `${gameSettings.fpsLimit} FPS` : '60 FPS'}
        </span>
        <span>FIREBASE CLOUD SYNC · V0.0.8</span>
      </footer>
    </div>
  );
};
