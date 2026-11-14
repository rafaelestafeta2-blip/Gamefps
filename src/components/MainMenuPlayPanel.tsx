import React, { useState } from 'react';
import { getCompetitiveRankProgression } from '../progression/competitiveRanks';
import { DrillMode, WeaponId } from '../types/game';
import { LeftSidebarButtonId, MainMenuLeftSidebar } from './MainMenuLeftSidebar';
import {
  MainMenuPlayModeId,
  MainMenuRightWidgets,
  PLAY_MODE_OPTIONS,
} from './MainMenuRightWidgets';
import { WarfaceClassId } from './WarfaceClassIcons';

interface MainMenuPlayPanelProps {
  activeWeapon: WeaponId;
  selectedClass: WarfaceClassId;
  weaponName: string;
  weaponCategory: string;
  weaponCaliber: string;
  playerMmr?: number;
  onOpenInventory: () => void;
  onOpenWeaponSelect: () => void;
  onStartTraining: () => void;
  onStartDrill: (mode: DrillMode) => void;
  onStartMatchmaking: (targetMode: DrillMode) => void;
  onOpenRankedScreen: (targetMode: DrillMode) => void;
  onOpenOnlineLobby: (targetMode: DrillMode) => void;
  onOpenRanksTab: () => void;
  onOpenBattlePassTab: () => void;
  onOpenEventsModal: () => void;
  onHover: () => void;
}

export const MainMenuPlayPanel: React.FC<MainMenuPlayPanelProps> = ({
  selectedClass,
  weaponName,
  playerMmr = 2450,
  onOpenInventory,
  onOpenWeaponSelect,
  onStartTraining,
  onStartDrill,
  onStartMatchmaking,
  onOpenRankedScreen,
  onOpenOnlineLobby,
  onOpenRanksTab,
  onOpenBattlePassTab,
  onOpenEventsModal,
  onHover,
}) => {
  const [selectedPlayMode, setSelectedPlayMode] =
    useState<MainMenuPlayModeId>('CASUAL_DUST2');
  const [activeSidebarId, setActiveSidebarId] =
    useState<LeftSidebarButtonId>('INICIO');

  const displayMmr = playerMmr > 0 ? playerMmr : 2450;
  const { current, next, progressPct } = getCompetitiveRankProgression(displayMmr);

  const handleSelectSidebar = (id: LeftSidebarButtonId) => {
    setActiveSidebarId(id);
    switch (id) {
      case 'INICIO':
        break;
      case 'RANKED':
        onOpenRankedScreen('DUST2_BOMB_5V5');
        break;
      case 'INVENTARIO':
        onOpenInventory();
        break;
      case 'ARSENAL':
        onOpenWeaponSelect();
        break;
      case 'PATENTES':
        onOpenRanksTab();
        break;
      case 'PASSE':
        onOpenBattlePassTab();
        break;
      case 'EVENTOS':
        onOpenEventsModal();
        break;
    }
  };

  const handleLaunchSelectedMode = () => {
    const modeObj =
      PLAY_MODE_OPTIONS.find((m) => m.id === selectedPlayMode) ||
      PLAY_MODE_OPTIONS[0];
    switch (selectedPlayMode) {
      case 'CASUAL_DUST2':
      case 'CASUAL_ASSAULT':
      case 'CASUAL_INDUSTRIA':
        onStartMatchmaking(modeObj.arena || 'DUST2_BOMB_5V5');
        break;
      case 'RANKED':
        onOpenRankedScreen(modeObj.arena || 'DUST2_BOMB_5V5');
        break;
      case 'PRIVATE_ROOM':
        onOpenOnlineLobby(modeObj.arena || 'DUST2_BOMB_5V5');
        break;
      case 'RANGE':
        onStartTraining();
        break;
      case 'KILLHOUSE':
        onStartDrill('KILLHOUSE_BLITZ');
        break;
      case 'VS_AI':
        onStartDrill('TACTICAL_WAVE');
        break;
    }
  };

  return (
    <div className="w-full h-full min-h-0 flex items-stretch justify-between gap-2 pointer-events-none">
      {/* LATERAL ESQUERDA ENXUTA */}
      <MainMenuLeftSidebar
        activeId={activeSidebarId}
        onSelectButton={handleSelectSidebar}
        onHover={onHover}
      />

      {/* CENTRO 100% LIVRE: MOSTRA O SOLDADO 3D E A BANDEIRA 3D BLACKTHORN */}
      <div className="flex-1 min-w-0 pointer-events-none" />

      {/* LATERAL DIREITA LIMPA */}
      <MainMenuRightWidgets
        currentRank={current}
        nextRank={next}
        playerMmr={displayMmr}
        progressPct={progressPct}
        selectedPlayMode={selectedPlayMode}
        onCyclePlayMode={setSelectedPlayMode}
        onLaunchSelectedMode={handleLaunchSelectedMode}
        onOpenRankedScreen={() => onOpenRankedScreen('DUST2_BOMB_5V5')}
        onOpenRanksModal={onOpenRanksTab}
        onOpenInventory={onOpenInventory}
        selectedClass={selectedClass}
        weaponName={weaponName}
        onHover={onHover}
      />
    </div>
  );
};
