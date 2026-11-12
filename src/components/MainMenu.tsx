import React, { useEffect, useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { ControlSettings } from '../controls/hudLayoutSettings';
import {
  CloudSyncState,
  getCloudSyncState,
  subscribePlayerProfile,
  syncProgressionFromLocal,
} from '../firebase/playerCloudSync';
import { subscribeSocialInbox } from '../firebase/friendsSocialService';
import { GameSettings } from '../graphics/graphicsSettings';
import { mobileHardware } from '../mobile/nativeHardware';
import {
  getNextRank,
  getRankForXp,
  loadSavedPlayerCash,
  loadSavedPlayerXp,
} from '../progression/ranks';
import { DrillMode, WeaponId } from '../types/game';
import { CompetitiveRankedScreen } from './CompetitiveRankedScreen';
import { FriendsSocialModal } from './FriendsSocialModal';
import { GraphicsSettingsPanel } from './GraphicsSettingsPanel';
import { MainMenuOverlays } from './MainMenuOverlays';
import { MainMenuPlayPanel } from './MainMenuPlayPanel';
import { MainMenuRanksModal } from './MainMenuRanksModal';
import { MainMenuTopNav } from './MainMenuTopNav';
import { MenuBackground } from './MenuBackground';
import { OnlineLobbyModal } from './OnlineLobbyModal';
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
  const [showEventsModal, setShowEventsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [socialBadgeCount, setSocialBadgeCount] = useState(0);
  const [showOnlineLobby, setShowOnlineLobby] = useState(false);
  const [showRankedScreen, setShowRankedScreen] = useState(false);
  const [onlineLobbyArena, setOnlineLobbyArena] = useState<DrillMode>('DUST2_BOMB_5V5');
  const [syncState, setSyncState] = useState<CloudSyncState>(() =>
    getCloudSyncState()
  );

  useEffect(() => {
    soundEngine.playMenuMusic();
    const unsub = subscribePlayerProfile((next) => setSyncState(next));
    const unsubSocial = subscribeSocialInbox((inbox) => {
      const reqCount = Object.keys(inbox.requests || {}).length;
      const invCount = Object.keys(inbox.invites || {}).length;
      setSocialBadgeCount(reqCount + invCount);
    });
    return () => {
      unsub();
      unsubSocial();
      soundEngine.stopMenuMusic();
    };
  }, []);

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
      className="fixed inset-0 z-40 h-[100dvh] max-h-[100dvh] bg-[#06080c] select-none text-white flex flex-col justify-between overflow-hidden font-sans"
    >
      {/* 1. BACKGROUND (Soldado 3D .glb centralizado + Bandeira 3D Blackthorn atrás) */}
      <MenuBackground
        showHero={activeTab === 'PLAY' && !showRankedScreen}
        activeWeapon={activeWeapon}
      />

      {/* 2. TOP HEADER BAR (Único local de Perfil, Amigos, Correio e Configurações) */}
      <MainMenuTopNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onHover={handleHover}
        playerCashBalance={savedCash}
        currentRank={currentRank}
        xpLevelProgress={xpLevelProgress}
        syncState={syncState}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenFriends={() => setShowFriendsModal(true)}
        onToggleNews={() => setShowNewsModal((prev) => !prev)}
        socialBadgeCount={socialBadgeCount}
      />

      {/* 3. CORPO PRINCIPAL LIMPO (Rail Esquerdo + Centro Livre sobre o Soldado 3D + Direita) */}
      <main
        className={`relative z-10 flex-1 min-h-0 flex items-center px-3 sm:px-6 py-2 pointer-events-none overflow-hidden ${
          activeTab === 'PLAY' ? 'justify-between' : 'justify-center'
        }`}
      >
        {activeTab === 'PLAY' && (
          <MainMenuPlayPanel
            activeWeapon={activeWeapon}
            weaponName={activeWeaponMeta.name}
            weaponCategory={activeWeaponMeta.category}
            weaponCaliber={activeWeaponMeta.caliber}
            playerMmr={syncState.profile.mmr || 2450}
            onOpenWeaponSelect={() => setActiveTab('WEAPON')}
            onStartTraining={handleLaunchTraining}
            onStartDrill={handleLaunchDrill}
            onStartMatchmaking={handleLaunchMatchmaking}
            onOpenRankedScreen={(targetMode) => {
              setOnlineLobbyArena(targetMode);
              setShowRankedScreen(true);
            }}
            onOpenOnlineLobby={(targetMode) => {
              setOnlineLobbyArena(targetMode);
              setShowOnlineLobby(true);
            }}
            onOpenRanksTab={() => setActiveTab('RANKS')}
            onOpenBattlePassTab={() => setActiveTab('BATTLE_PASS')}
            onOpenEventsModal={() => setShowEventsModal(true)}
            onHover={handleHover}
          />
        )}

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

        {activeTab === 'RANKS' && (
          <MainMenuRanksModal
            currentRank={currentRank}
            playerXp={playerXp}
            onClose={() => setActiveTab('PLAY')}
          />
        )}

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

        {activeTab === 'BATTLE_PASS' && (
          <div className="max-w-md w-full bg-[#0c0e14]/95 border border-red-500/40 rounded-xl p-4 sm:p-5 shadow-2xl backdrop-blur-md pointer-events-auto">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <h3 className="font-display font-black text-base text-amber-400 uppercase tracking-wider">
                PASSE DE BATALHA · MISSÕES TÁTICAS
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
              Acumule XP no Estande de Tiro, Killhouse e Ranked 5v5 para subir de{' '}
              <b>Trainee (Nív. 1)</b> até <b>Warface Supremo (Nív. 70)</b> e liberar todo o arsenal L49.
            </p>
          </div>
        )}
      </main>

      <MainMenuOverlays
        showEventsModal={showEventsModal}
        onCloseEvents={() => setShowEventsModal(false)}
        showNewsModal={showNewsModal}
        onCloseNews={() => setShowNewsModal(false)}
        onLaunchDrill={(mode) => void handleLaunchDrill(mode)}
        onLaunchTraining={() => void handleLaunchTraining()}
        onOpenPrivateLobby={() => {
          setOnlineLobbyArena('DUST2_BOMB_5V5');
          setShowOnlineLobby(true);
        }}
      />

      {showProfileModal && (
        <PlayerProfileModal
          syncState={syncState}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      <OnlineLobbyModal
        isOpen={showOnlineLobby}
        onClose={() => setShowOnlineLobby(false)}
        selectedMapMode={onlineLobbyArena}
        onSelectMapMode={(mode) => setOnlineLobbyArena(mode)}
        onLaunchOnlineArena={(mode) => {
          setShowOnlineLobby(false);
          void handleLaunchDrill(mode);
        }}
      />

      <FriendsSocialModal
        isOpen={showFriendsModal}
        onClose={() => setShowFriendsModal(false)}
        myCallsign={syncState.profile.callsign}
        onOpenOnlineLobbyWithRoom={(mode) => {
          setShowFriendsModal(false);
          setOnlineLobbyArena(mode);
          setShowOnlineLobby(true);
        }}
      />

      {showRankedScreen && (
        <CompetitiveRankedScreen
          playerMmr={syncState.profile.mmr || 2450}
          activeWeapon={activeWeapon}
          initialArena={onlineLobbyArena}
          onBackToMainMenu={() => setShowRankedScreen(false)}
          onRankedMatchReady={(mode) => {
            setShowRankedScreen(false);
            void handleLaunchDrill(mode);
          }}
        />
      )}
    </div>
  );
};
