import React, { useEffect, useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import {
  GEAR_INVENTORY_CATALOG,
  WARFACE_CLASS_LOADOUT_META,
  WEAPON_INVENTORY_CATALOG,
  EquipmentSlotId,
  GearItemDefinition,
  PlayerInventoryState,
  equipClassSlotItem,
  getClassCombatModifiers,
  getPlayerInventoryState,
  isGearOwnedInInventory,
  isWeaponOwnedInInventory,
  purchaseGearWithCash,
  purchaseWeaponWithCash,
  setSelectedWarfaceClass,
  subscribePlayerInventory,
} from '../progression/loadoutSystem';
import {
  getRankForXp,
  getRequiredXpForWeapon,
} from '../progression/ranks';
import { WeaponId } from '../types/game';
import { RankedOperator3DCanvas } from './RankedOperator3DCanvas';
import { preloadAllWeaponThumbnails3D } from '../three/weaponThumbnail3D';
import {
  VanguardTeamEmblem,
  WARFACE_CLASS_META,
  WarfaceClassIcon,
  WarfaceClassId,
} from './WarfaceClassIcons';
import { WeaponPreview3D } from './WeaponVisualCard';

interface InventoryLoadoutModalProps {
  playerXp: number;
  playerCash: number;
  onSyncEquippedWeapon: (weaponId: WeaponId) => void;
  onOpenWeaponGunsmith: () => void;
  onClose: () => void;
}

type InventorySubTab = 'ARMAS' | 'ARMADURA' | 'BOOSTERS';
type ActiveSlotKey = EquipmentSlotId | 'specialGadget';

const ALL_CLASSES: WarfaceClassId[] = [
  'FUZILEIRO',
  'MEDICO',
  'ENGENHEIRO',
  'FRANCO_ATIRADOR',
];

const CLASS_TAB_SHORT: Record<WarfaceClassId, string> = {
  FUZILEIRO: 'FUZILEIRO',
  MEDICO: 'MÉDICO',
  ENGENHEIRO: 'ENGENHEIRO',
  FRANCO_ATIRADOR: 'SNIPER',
};

const GearIconSvg: React.FC<{
  kind: 'helmet' | 'vest' | 'gloves' | 'boots' | 'grenadePack' | 'special' | 'frag' | 'smoke';
  className?: string;
  accent?: string;
}> = ({ kind, className = 'w-10 h-10', accent = '#e2e8f0' }) => {
  if (kind === 'helmet') {
    return (
      <svg viewBox="0 0 64 40" fill="none" className={className}>
        <path
          d="M14 27 C14 13 22 6 33 6 C44 6 51 14 51 24 L47 30 L21 30 L14 27 Z"
          fill="#262c36"
          stroke={accent}
          strokeWidth="1.6"
        />
        <path d="M22 14 H44" stroke="#f97316" strokeWidth="1.5" strokeOpacity="0.8" />
        <rect x="44" y="13" width="6" height="5" rx="1" fill="#475569" stroke={accent} strokeWidth="1" />
      </svg>
    );
  }
  if (kind === 'vest') {
    return (
      <svg viewBox="0 0 64 40" fill="none" className={className}>
        <path
          d="M21 6 L27 6 L29 11 H35 L37 6 L43 6 L47 16 V34 H17 V16 L21 6 Z"
          fill="#262c36"
          stroke={accent}
          strokeWidth="1.6"
        />
        <rect x="23" y="16" width="18" height="13" fill="#171c24" stroke="#f97316" strokeWidth="1" strokeOpacity="0.7" />
        <line x1="23" y1="21" x2="41" y2="21" stroke={accent} strokeOpacity="0.45" strokeWidth="1" />
        <line x1="23" y1="25" x2="41" y2="25" stroke={accent} strokeOpacity="0.45" strokeWidth="1" />
      </svg>
    );
  }
  if (kind === 'gloves') {
    return (
      <svg viewBox="0 0 64 40" fill="none" className={className}>
        <path
          d="M18 16 L22 8 H26 V18 H28 V7 H32 V18 H34 V9 H38 V19 H41 V13 H45 V28 L39 34 H22 L18 27 Z"
          fill="#262c36"
          stroke={accent}
          strokeWidth="1.5"
        />
        <rect x="23" y="21" width="17" height="4" fill="#f97316" fillOpacity="0.7" />
      </svg>
    );
  }
  if (kind === 'boots') {
    return (
      <svg viewBox="0 0 64 40" fill="none" className={className}>
        <path
          d="M20 7 H33 V23 L47 26 V33 H19 V7 Z"
          fill="#262c36"
          stroke={accent}
          strokeWidth="1.6"
        />
        <rect x="18" y="30" width="30" height="4" fill="#11161f" stroke="#f97316" strokeWidth="1" strokeOpacity="0.65" />
      </svg>
    );
  }
  if (kind === 'frag') {
    return (
      <svg viewBox="0 0 40 40" fill="none" className={className}>
        <rect x="16" y="6" width="8" height="4" fill="#94a3b8" />
        <path d="M24 8 H29 L31 14" stroke="#f97316" strokeWidth="1.5" />
        <ellipse cx="20" cy="23" rx="9.5" ry="11" fill="#3f4a3c" stroke={accent} strokeWidth="1.5" />
        <line x1="12" y1="20" x2="28" y2="20" stroke="#1e293b" strokeWidth="1.2" />
        <line x1="12" y1="26" x2="28" y2="26" stroke="#1e293b" strokeWidth="1.2" />
        <line x1="20" y1="12" x2="20" y2="34" stroke="#1e293b" strokeWidth="1.2" />
      </svg>
    );
  }
  if (kind === 'smoke') {
    return (
      <svg viewBox="0 0 40 40" fill="none" className={className}>
        <rect x="16" y="5" width="8" height="4" fill="#94a3b8" />
        <rect x="13" y="9" width="14" height="25" rx="2" fill="#334155" stroke={accent} strokeWidth="1.5" />
        <rect x="13" y="16" width="14" height="5" fill="#38bdf8" fillOpacity="0.65" />
      </svg>
    );
  }
  if (kind === 'special') {
    return (
      <svg viewBox="0 0 64 40" fill="none" className={className}>
        <rect x="15" y="10" width="34" height="22" rx="2" fill="#2a1912" stroke="#f97316" strokeWidth="1.6" />
        <path d="M26 10 V7 H38 V10" stroke="#fb923c" strokeWidth="1.6" />
        <line x1="32" y1="15" x2="32" y2="27" stroke="#fbbf24" strokeWidth="2.5" />
        <line x1="26" y1="21" x2="38" y2="21" stroke="#fbbf24" strokeWidth="2.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 40" fill="none" className={className}>
      <ellipse cx="23" cy="22" rx="8" ry="10" fill="#3f4a3c" stroke={accent} strokeWidth="1.4" />
      <rect x="36" y="10" width="12" height="22" rx="1.5" fill="#334155" stroke="#38bdf8" strokeWidth="1.4" />
      <rect x="36" y="16" width="12" height="4" fill="#38bdf8" fillOpacity="0.6" />
    </svg>
  );
};

export const InventoryLoadoutModal: React.FC<InventoryLoadoutModalProps> = ({
  playerXp,
  playerCash,
  onSyncEquippedWeapon,
  onOpenWeaponGunsmith,
  onClose,
}) => {
  const [inventory, setInventory] = useState<PlayerInventoryState>(() =>
    getPlayerInventoryState()
  );
  const [subTab, setSubTab] = useState<InventorySubTab>('ARMAS');
  const [selectedSlot, setSelectedSlot] =
    useState<ActiveSlotKey>('primaryWeapon');
  const [inspectedWeaponId, setInspectedWeaponId] = useState<WeaponId>(
    () => getPlayerInventoryState().classLoadouts[getPlayerInventoryState().selectedClass].primaryWeapon
  );
  const [inspectedGearId, setInspectedGearId] = useState<string>('helm_vanguard_std');
  const [rotateSignal, setRotateSignal] = useState<{ nonce: number; delta: number }>({
    nonce: 0,
    delta: 0,
  });

  useEffect(() => {
    preloadAllWeaponThumbnails3D([
      ...(Object.keys(WEAPON_INVENTORY_CATALOG) as WeaponId[]),
    ]);
    return subscribePlayerInventory((next) => setInventory(next));
  }, []);

  const activeClass = inventory.selectedClass;
  const classMeta = WARFACE_CLASS_META[activeClass];
  const classCombat = WARFACE_CLASS_LOADOUT_META[activeClass];
  const classLoadout = inventory.classLoadouts[activeClass];
  const modifiers = getClassCombatModifiers(activeClass);
  const currentRank = getRankForXp(playerXp);

  // Mantém a arma inspecionada sempre válida dentro das restrições da classe atual
  useEffect(() => {
    if (selectedSlot === 'primaryWeapon') {
      if (!classCombat.allowedPrimaries.includes(inspectedWeaponId)) {
        setInspectedWeaponId(classLoadout.primaryWeapon);
      }
    } else if (selectedSlot === 'secondaryWeapon') {
      setInspectedWeaponId(classLoadout.secondaryWeapon);
    } else if (selectedSlot === 'meleeWeapon') {
      setInspectedWeaponId(classLoadout.meleeWeapon);
    }
  }, [activeClass, selectedSlot, classLoadout.primaryWeapon, classLoadout.secondaryWeapon, classLoadout.meleeWeapon, classCombat.allowedPrimaries, inspectedWeaponId]);

  const handleSelectClass = (classId: WarfaceClassId) => {
    soundEngine.playMenuSelect();
    const classPrimary = setSelectedWarfaceClass(classId);
    setInspectedWeaponId(classPrimary);
    onSyncEquippedWeapon(classPrimary);
  };

  const handleSwitchSubTab = (tab: InventorySubTab) => {
    soundEngine.playMenuSelect();
    setSubTab(tab);
    if (tab === 'ARMAS') {
      setSelectedSlot('primaryWeapon');
      setInspectedWeaponId(classLoadout.primaryWeapon);
    } else if (tab === 'ARMADURA') {
      setSelectedSlot('helmet');
      setInspectedGearId(classLoadout.helmet);
    } else if (tab === 'BOOSTERS') {
      setSelectedSlot('grenadePack');
      setInspectedGearId(classLoadout.grenadePack);
    }
  };

  const handleSelectSlot = (slot: ActiveSlotKey) => {
    soundEngine.playMenuSelect();
    setSelectedSlot(slot);
    if (slot === 'primaryWeapon') {
      setInspectedWeaponId(classLoadout.primaryWeapon);
    } else if (slot === 'secondaryWeapon') {
      setInspectedWeaponId(classLoadout.secondaryWeapon);
    } else if (slot === 'meleeWeapon') {
      setInspectedWeaponId(classLoadout.meleeWeapon);
    } else if (slot === 'helmet') {
      setInspectedGearId(classLoadout.helmet);
    } else if (slot === 'vest') {
      setInspectedGearId(classLoadout.vest);
    } else if (slot === 'gloves') {
      setInspectedGearId(classLoadout.gloves);
    } else if (slot === 'boots') {
      setInspectedGearId(classLoadout.boots);
    } else if (slot === 'grenadePack') {
      setInspectedGearId(classLoadout.grenadePack);
    }
  };

  const isWeaponSlot =
    selectedSlot === 'primaryWeapon' ||
    selectedSlot === 'secondaryWeapon' ||
    selectedSlot === 'meleeWeapon';

  const weaponOptionsForSlot: WeaponId[] =
    selectedSlot === 'primaryWeapon'
      ? classCombat.allowedPrimaries
      : selectedSlot === 'secondaryWeapon'
        ? ['P50_PISTOL']
        : selectedSlot === 'meleeWeapon'
          ? ['KNIFE_TACTICAL']
          : [];

  const gearOptionsForSlot: GearItemDefinition[] =
    isWeaponSlot || selectedSlot === 'specialGadget'
      ? []
      : GEAR_INVENTORY_CATALOG.filter((g) => g.slot === selectedSlot);

  const handleEquipOrBuyWeapon = (wId: WeaponId) => {
    setInspectedWeaponId(wId);
    const owned = isWeaponOwnedInInventory(wId, playerXp);
    if (!owned) {
      const ok = purchaseWeaponWithCash(wId);
      if (!ok) {
        soundEngine.playMenuHover();
        return;
      }
    }
    soundEngine.playMenuSelect();
    if (isWeaponSlot) {
      equipClassSlotItem(activeClass, selectedSlot as EquipmentSlotId, wId);
      if (selectedSlot === 'primaryWeapon') {
        onSyncEquippedWeapon(wId);
      }
    }
  };

  const handleEquipOrBuyGear = (gear: GearItemDefinition) => {
    setInspectedGearId(gear.id);
    const owned = isGearOwnedInInventory(gear.id, playerXp);
    if (!owned) {
      const ok = purchaseGearWithCash(gear.id);
      if (!ok) {
        soundEngine.playMenuHover();
        return;
      }
    }
    soundEngine.playMenuSelect();
    if (selectedSlot !== 'specialGadget') {
      equipClassSlotItem(activeClass, selectedSlot, gear.id);
    }
  };

  const currentEquippedForSlot =
    selectedSlot === 'primaryWeapon'
      ? classLoadout.primaryWeapon
      : selectedSlot === 'secondaryWeapon'
        ? classLoadout.secondaryWeapon
        : selectedSlot === 'meleeWeapon'
          ? classLoadout.meleeWeapon
          : selectedSlot === 'helmet'
            ? classLoadout.helmet
            : selectedSlot === 'vest'
              ? classLoadout.vest
              : selectedSlot === 'gloves'
                ? classLoadout.gloves
                : selectedSlot === 'boots'
                  ? classLoadout.boots
                  : classLoadout.grenadePack;

  const inspectedWeaponSpec =
    WEAPON_INVENTORY_CATALOG[inspectedWeaponId] ||
    WEAPON_INVENTORY_CATALOG[classLoadout.primaryWeapon];
  const inspectedWeaponOwned = isWeaponOwnedInInventory(
    inspectedWeaponSpec.id,
    playerXp
  );
  const inspectedWeaponReq = getRequiredXpForWeapon(inspectedWeaponSpec.id);
  const isInspectedWeaponEquipped =
    currentEquippedForSlot === inspectedWeaponSpec.id;

  const inspectedGearItem =
    GEAR_INVENTORY_CATALOG.find((g) => g.id === inspectedGearId) ||
    gearOptionsForSlot[0];
  const isInspectedGearOwned = inspectedGearItem
    ? isGearOwnedInInventory(inspectedGearItem.id, playerXp)
    : false;
  const isInspectedGearEquipped =
    inspectedGearItem && currentEquippedForSlot === inspectedGearItem.id;

  return (
    <div className="w-full h-full max-w-[1440px] min-h-0 flex bg-[#0a0d12]/96 border border-white/15 rounded-[2px] overflow-hidden shadow-2xl pointer-events-auto text-slate-100">
      {/* ================================================================= */}
      {/* ESQUERDA: PALCO 3D DO OPERADOR COM SETAS DE ROTAÇÃO (ESTILO WARFACE) */}
      {/* ================================================================= */}
      <div className="hidden md:flex md:w-[30%] lg:w-[29%] min-h-0 relative flex-col justify-between bg-[radial-gradient(ellipse_at_center,_#18202c_0%,_#0b0e14_65%,_#06080c_100%)] border-r border-white/12 overflow-hidden">
        {/* Identificação sutil da classe no topo esquerdo */}
        <div className="relative z-10 px-4 pt-3 flex items-center justify-between pointer-events-none">
          <div>
            <div className="font-display font-black text-base tracking-wider uppercase text-white">
              {classMeta.label}
            </div>
            <div className="font-mono text-[10px] text-[#fb923c] uppercase tracking-wide">
              {classCombat.characterModelLabel}
            </div>
          </div>
          <span className="font-mono text-[10px] text-slate-300 tabular-nums">
            {modifiers.totalMaxHealth} PV TÁTICO
          </span>
        </div>

        {/* Modelo 3D Interativo */}
        <div className="flex-1 min-h-0 relative">
          <RankedOperator3DCanvas
            activeWeapon={isWeaponSlot ? inspectedWeaponId : classLoadout.primaryWeapon}
            operatorClass={activeClass}
            team="VANGUARD"
            externalRotateSignal={rotateSignal}
          />
        </div>

        {/* Controles abaixo dos pés do personagem (Setas Curvas 360° + Ícone Classe & Vanguard) */}
        <div className="relative z-10 px-4 pb-3 pt-1 flex flex-col gap-2">
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              title="Girar Operador à Esquerda"
              onClick={() => {
                soundEngine.playMenuSelect();
                setRotateSignal((p) => ({
                  nonce: p.nonce + 1,
                  delta: -Math.PI / 3,
                }));
              }}
              className="w-10 h-10 flex items-center justify-center rounded-[2px] bg-[#141923]/80 hover:bg-[#ea580c]/25 border border-white/15 hover:border-[#f97316] text-slate-200 hover:text-white transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M9 14L4 9l5-5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 9h10.5a5.5 5.5 0 1 1 0 11H11" strokeLinecap="round" />
              </svg>
            </button>

            <div className="flex items-center gap-2.5 px-3 py-1 bg-[#11151d]/90 border border-white/10 rounded-[2px]">
              <WarfaceClassIcon
                classId={activeClass}
                className="w-6 h-6"
                color="#f97316"
              />
              <VanguardTeamEmblem className="w-6 h-6" />
            </div>

            <button
              type="button"
              title="Girar Operador à Direita"
              onClick={() => {
                soundEngine.playMenuSelect();
                setRotateSignal((p) => ({
                  nonce: p.nonce + 1,
                  delta: Math.PI / 3,
                }));
              }}
              className="w-10 h-10 flex items-center justify-center rounded-[2px] bg-[#141923]/80 hover:bg-[#ea580c]/25 border border-white/15 hover:border-[#f97316] text-slate-200 hover:text-white transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M15 14l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20 9H9.5a5.5 5.5 0 1 0 0 11H13" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="bg-[#0d1118]/90 border border-white/10 rounded-[2px] px-3 py-1.5 flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-400 truncate">
              PASSIVA:{' '}
              <strong className="text-slate-100">{classCombat.passiveTitle}</strong>
            </span>
            <span className="text-[#f97316] font-bold shrink-0 ml-2">
              {WEAPON_INVENTORY_CATALOG[classLoadout.primaryWeapon]?.name}
            </span>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* DIREITA: HEADER CLASSES + SUB-TABS + 3 COLUNAS ESTILO WARFACE      */}
      {/* ================================================================= */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-[#0d1016]">
        {/* ROW 1: SELETOR DAS 4 CLASSES CENTRALIZADO + CARTEIRA & SAIR */}
        <div className="shrink-0 bg-[#0b0e14] border-b border-white/12 px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2">
          {/* Classe Tabs (Idêntico ao topo do Warface) */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
            {ALL_CLASSES.map((cId) => {
              const isSelected = activeClass === cId;
              return (
                <button
                  key={cId}
                  type="button"
                  onClick={() => handleSelectClass(cId)}
                  className={`flex flex-col items-center justify-center px-3 sm:px-4 py-1.5 min-w-[74px] sm:min-w-[88px] border-b-2 transition-colors cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-[#171c25] border-[#f97316] text-white'
                      : 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-[#131720]'
                  }`}
                >
                  <WarfaceClassIcon
                    classId={cId}
                    className="w-5 h-5 mb-0.5"
                    color={isSelected ? '#f97316' : '#94a3b8'}
                  />
                  <span
                    className={`font-display font-bold text-[10px] sm:text-[11px] tracking-wider uppercase whitespace-nowrap ${
                      isSelected ? 'text-white' : 'text-slate-400'
                    }`}
                  >
                    {CLASS_TAB_SHORT[cId]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Créditos, Nível e Botão Sair */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-3 text-xs font-mono tabular-nums">
              <span className="text-slate-400">
                NÍV. <strong className="text-white">{currentRank.level}</strong>
              </span>
              <span className="text-[#fbbf24] font-bold">
                $ {playerCash.toLocaleString('pt-BR')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playMenuSelect();
                onClose();
              }}
              className="px-3 py-1.5 rounded-[2px] bg-[#1b202b] hover:bg-[#ea580c] border border-white/15 hover:border-[#f97316] text-xs font-display font-bold tracking-wider text-white uppercase whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              CONFIRMAR ✕
            </button>
          </div>
        </div>

        {/* ROW 2: SUB-NAVEGAÇÃO (ARMAS | ARMADURA | BOOSTERS / GRANADAS | INSPEÇÃO 3D) */}
        <div className="shrink-0 bg-[#11151d] border-b border-white/15 px-3 sm:px-5 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-5 sm:gap-8">
            {(
              [
                { id: 'ARMAS', label: 'ARMAS' },
                { id: 'ARMADURA', label: 'ARMADURA' },
                { id: 'BOOSTERS', label: 'GRANADAS / BOOSTERS' },
              ] as const
            ).map((tab) => {
              const active = subTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSwitchSubTab(tab.id)}
                  className={`py-2.5 text-xs sm:text-sm font-display font-bold tracking-widest uppercase border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'text-[#f97316] border-[#f97316]'
                      : 'text-slate-300 border-transparent hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                soundEngine.playMenuSelect();
                onOpenWeaponGunsmith();
              }}
              className="py-2.5 text-xs sm:text-sm font-display font-bold tracking-widest uppercase border-b-2 border-transparent text-slate-300 hover:text-[#fbbf24] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              INSPEÇÃO 3D
            </button>
          </div>

          <span className="hidden lg:inline font-mono text-[10px] text-slate-400 whitespace-nowrap">
            {classCombat.allowedWeaponRuleLabel}
          </span>
        </div>

        {/* ROW 3: CORPO EM 3 COLUNAS (SLOTS EQUIPADOS | LISTA DE ITENS | DETALHES E BARRAS LARANJAS) */}
        <div className="flex-1 min-h-0 grid grid-cols-12 overflow-hidden">
          {/* --------------------------------------------------------------- */}
          {/* COLUNA 1: SLOTS EQUIPADOS DO OPERADOR                           */}
          {/* --------------------------------------------------------------- */}
          <div className="col-span-4 min-h-0 overflow-y-auto border-r border-white/10 bg-[#0b0e13] p-2 sm:p-2.5 flex flex-col gap-1.5">
            {subTab === 'ARMAS' && (
              <>
                {/* PRIMÁRIA */}
                <button
                  type="button"
                  onClick={() => handleSelectSlot('primaryWeapon')}
                  className={`w-full rounded-[2px] border p-2 text-left transition-colors cursor-pointer ${
                    selectedSlot === 'primaryWeapon'
                      ? 'bg-[#181e28] border-[#f97316]'
                      : 'bg-[#12161f] border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono mb-1">
                    <span className="text-slate-400 font-bold uppercase">PRIMÁRIA</span>
                    <span className="text-[#fb923c] font-bold truncate">
                      {WEAPON_INVENTORY_CATALOG[classLoadout.primaryWeapon]?.name}
                    </span>
                  </div>
                  <div className="h-12 flex items-center justify-center px-1">
                    <WeaponPreview3D
                      weaponId={classLoadout.primaryWeapon}
                      className="w-full h-11"
                    />
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-[9px] text-slate-300 tabular-nums">
                      100%
                    </span>
                    <div className="flex-1 h-[2px] bg-white/15">
                      <div className="h-full w-full bg-slate-200" />
                    </div>
                  </div>
                </button>

                {/* PISTOLA */}
                <button
                  type="button"
                  onClick={() => handleSelectSlot('secondaryWeapon')}
                  className={`w-full rounded-[2px] border p-2 text-left transition-colors cursor-pointer ${
                    selectedSlot === 'secondaryWeapon'
                      ? 'bg-[#181e28] border-[#f97316]'
                      : 'bg-[#12161f] border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono mb-1">
                    <span className="text-slate-400 font-bold uppercase">PISTOLA</span>
                    <span className="text-white font-bold truncate">
                      {WEAPON_INVENTORY_CATALOG[classLoadout.secondaryWeapon]?.name}
                    </span>
                  </div>
                  <div className="h-10 flex items-center justify-center px-2">
                    <WeaponPreview3D
                      weaponId={classLoadout.secondaryWeapon}
                      className="w-full h-9 max-w-[125px]"
                    />
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-slate-400">∞</div>
                </button>

                {/* CORPO A CORPO */}
                <button
                  type="button"
                  onClick={() => handleSelectSlot('meleeWeapon')}
                  className={`w-full rounded-[2px] border p-2 text-left transition-colors cursor-pointer ${
                    selectedSlot === 'meleeWeapon'
                      ? 'bg-[#181e28] border-[#f97316]'
                      : 'bg-[#12161f] border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono mb-1">
                    <span className="text-slate-400 font-bold uppercase">CORPO A CORPO</span>
                    <span className="text-white font-bold truncate">
                      {WEAPON_INVENTORY_CATALOG[classLoadout.meleeWeapon]?.name}
                    </span>
                  </div>
                  <div className="h-10 flex items-center justify-center px-2">
                    <WeaponPreview3D
                      weaponId={classLoadout.meleeWeapon}
                      className="w-full h-9 max-w-[125px]"
                    />
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-[9px] text-slate-300 tabular-nums">
                      100%
                    </span>
                    <div className="flex-1 h-[2px] bg-white/15">
                      <div className="h-full w-full bg-slate-200" />
                    </div>
                  </div>
                </button>

                {/* ESPECIAL DA CLASSE */}
                <button
                  type="button"
                  onClick={() => handleSelectSlot('specialGadget')}
                  className={`w-full rounded-[2px] border p-2 text-left transition-colors cursor-pointer ${
                    selectedSlot === 'specialGadget'
                      ? 'bg-[#181e28] border-[#f97316]'
                      : 'bg-[#12161f] border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono mb-1">
                    <span className="text-slate-400 font-bold uppercase">ESPECIAL</span>
                    <span className="text-[#fb923c] font-bold truncate">
                      {classCombat.specialSlotTitle}
                    </span>
                  </div>
                  <div className="h-9 flex items-center justify-center">
                    <GearIconSvg kind="special" className="w-12 h-8" />
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-slate-400">∞</div>
                </button>

                {/* BOLSOS (GRANADAS) */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSwitchSubTab('BOOSTERS')}
                    className="rounded-[2px] border border-white/10 hover:border-[#f97316] bg-[#12161f] p-2 text-left cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                      <span>BOLSO 1</span>
                      <span className="tabular-nums text-white font-bold">
                        x{modifiers.fragCount}
                      </span>
                    </div>
                    <div className="h-8 flex items-center justify-center my-0.5">
                      <GearIconSvg kind="frag" className="w-7 h-7" />
                    </div>
                    <div className="font-mono text-[9px] text-slate-300 truncate">
                      FRAG M67
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchSubTab('BOOSTERS')}
                    className="rounded-[2px] border border-white/10 hover:border-[#f97316] bg-[#12161f] p-2 text-left cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                      <span>BOLSO 2</span>
                      <span className="tabular-nums text-white font-bold">
                        x{modifiers.smokeCount}
                      </span>
                    </div>
                    <div className="h-8 flex items-center justify-center my-0.5">
                      <GearIconSvg kind="smoke" className="w-7 h-7" />
                    </div>
                    <div className="font-mono text-[9px] text-slate-300 truncate">
                      FUMAÇA M18
                    </div>
                  </button>
                </div>
              </>
            )}

            {subTab === 'ARMADURA' && (
              <>
                {(
                  [
                    {
                      slot: 'helmet' as const,
                      label: 'CAPACETE',
                      kind: 'helmet' as const,
                      itemName: modifiers.helmetName,
                    },
                    {
                      slot: 'vest' as const,
                      label: 'COLETE',
                      kind: 'vest' as const,
                      itemName: modifiers.vestName,
                    },
                    {
                      slot: 'gloves' as const,
                      label: 'LUVAS',
                      kind: 'gloves' as const,
                      itemName: modifiers.glovesName,
                    },
                    {
                      slot: 'boots' as const,
                      label: 'BOTAS',
                      kind: 'boots' as const,
                      itemName: modifiers.bootsName,
                    },
                  ] as const
                ).map((armorSlot) => {
                  const active = selectedSlot === armorSlot.slot;
                  return (
                    <button
                      key={armorSlot.slot}
                      type="button"
                      onClick={() => handleSelectSlot(armorSlot.slot)}
                      className={`w-full rounded-[2px] border p-2 text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#181e28] border-[#f97316]'
                          : 'bg-[#12161f] border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px] font-mono mb-1">
                        <span className="text-slate-400 font-bold uppercase">
                          {armorSlot.label}
                        </span>
                        <span className="text-[#fb923c] font-bold truncate">
                          {armorSlot.itemName}
                        </span>
                      </div>
                      <div className="h-9 flex items-center justify-center">
                        <GearIconSvg kind={armorSlot.kind} className="w-12 h-8" />
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-[9px] text-slate-300 tabular-nums">
                          100%
                        </span>
                        <div className="flex-1 h-[2px] bg-white/15">
                          <div className="h-full w-full bg-slate-200" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </>
            )}

            {subTab === 'BOOSTERS' && (
              <>
                <button
                  type="button"
                  onClick={() => handleSelectSlot('grenadePack')}
                  className={`w-full rounded-[2px] border p-2.5 text-left transition-colors cursor-pointer ${
                    selectedSlot === 'grenadePack'
                      ? 'bg-[#181e28] border-[#f97316]'
                      : 'bg-[#12161f] border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                    <span className="text-slate-400 uppercase font-bold">
                      KIT GRANADAS
                    </span>
                    <span className="text-[#fb923c] font-bold tabular-nums">
                      {modifiers.fragCount}F / {modifiers.smokeCount}S
                    </span>
                  </div>
                  <div className="h-11 flex items-center justify-center">
                    <GearIconSvg kind="grenadePack" className="w-14 h-9" />
                  </div>
                  <div className="font-mono text-[10px] text-slate-300">
                    M67 Fragmentação + M18 Fumaça
                  </div>
                </button>

                <div className="rounded-[2px] border border-white/10 bg-[#12161f] p-2.5 space-y-1.5">
                  <div className="font-mono text-[10px] text-slate-400 uppercase">
                    BÔNUS PASSIVO DA CLASSE
                  </div>
                  <div className="font-display font-bold text-xs text-[#f97316]">
                    {classCombat.passiveTitle}
                  </div>
                  <p className="font-mono text-[10px] text-slate-300 leading-relaxed">
                    {classCombat.passiveDesc}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* --------------------------------------------------------------- */}
          {/* COLUNA 2: ARSENAL DA CLASSE (COM RESTRIÇÃO ESTRITA WARFACE)     */}
          {/* --------------------------------------------------------------- */}
          <div className="col-span-4 min-h-0 flex flex-col border-r border-white/10 bg-[#0d1118]">
            <div className="shrink-0 px-2.5 py-2 border-b border-white/10 bg-[#131822]">
              <div className="font-mono text-[9px] sm:text-[10px] text-[#fb923c] font-bold uppercase tracking-wide truncate">
                {selectedSlot === 'primaryWeapon'
                  ? classCombat.allowedWeaponRuleLabel
                  : selectedSlot === 'specialGadget'
                    ? 'EQUIPAMENTO DE CLASSE'
                    : 'ITENS DISPONÍVEIS NO INVENTÁRIO'}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
              {isWeaponSlot &&
                weaponOptionsForSlot.map((wId) => {
                  const spec = WEAPON_INVENTORY_CATALOG[wId];
                  const isEquipped = currentEquippedForSlot === wId;
                  const isInspected = inspectedWeaponId === wId;
                  const isOwned = isWeaponOwnedInInventory(wId, playerXp);
                  const req = getRequiredXpForWeapon(wId);

                  return (
                    <button
                      key={wId}
                      type="button"
                      onClick={() => {
                        if (isOwned) {
                          handleEquipOrBuyWeapon(wId);
                        } else {
                          soundEngine.playMenuSelect();
                          setInspectedWeaponId(wId);
                        }
                      }}
                      className={`w-full text-left rounded-[2px] border p-2 transition-colors cursor-pointer ${
                        isEquipped
                          ? 'bg-[#191f2a] border-[#f97316]'
                          : isInspected
                            ? 'bg-[#151a24] border-white/40'
                            : 'bg-[#10141c] border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`w-3.5 h-3.5 rounded-[1px] border flex items-center justify-center text-[9px] font-bold shrink-0 ${
                            isEquipped
                              ? 'border-[#f97316] bg-[#f97316]/20 text-[#f97316]'
                              : isOwned
                                ? 'border-white/30 bg-black/40 text-transparent'
                                : 'border-white/15 bg-black/50 text-slate-400'
                          }`}
                        >
                          {isEquipped ? '✓' : !isOwned ? '×' : ''}
                        </span>
                        <span
                          className={`font-display font-bold text-xs truncate ${
                            isEquipped
                              ? 'text-[#fb923c]'
                              : isOwned
                                ? 'text-white'
                                : 'text-slate-400'
                          }`}
                        >
                          {spec.name}
                        </span>
                      </div>

                      <div className="h-12 flex items-center justify-center px-1">
                        <WeaponPreview3D
                          weaponId={wId}
                          locked={!isOwned}
                          alt={spec.name}
                          className="w-full h-11"
                        />
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-2 text-[9px] font-mono">
                        {isOwned ? (
                          <>
                            <span className="text-slate-300 tabular-nums shrink-0">
                              100%
                            </span>
                            <div className="flex-1 h-[2px] bg-white/15">
                              <div className="h-full w-full bg-slate-200" />
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-[#fbbf24] font-bold tabular-nums">
                              $ {spec.cashPrice}
                            </span>
                            <span className="text-slate-400">
                              NÍV. {req.requiredLevel}
                            </span>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}

              {!isWeaponSlot && selectedSlot === 'specialGadget' && (
                <div className="rounded-[2px] border border-[#f97316] bg-[#191f2a] p-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="w-3.5 h-3.5 rounded-[1px] border border-[#f97316] bg-[#f97316]/20 text-[#f97316] flex items-center justify-center text-[9px] font-bold">
                      ✓
                    </span>
                    <span className="font-display font-bold text-xs text-[#fb923c]">
                      {classCombat.specialSlotTitle}
                    </span>
                  </div>
                  <div className="h-12 flex items-center justify-center">
                    <GearIconSvg kind="special" className="w-16 h-10" />
                  </div>
                  <p className="mt-1.5 font-mono text-[10px] text-slate-300 leading-snug">
                    {classCombat.specialSlotDesc}
                  </p>
                </div>
              )}

              {!isWeaponSlot &&
                selectedSlot !== 'specialGadget' &&
                gearOptionsForSlot.map((gear) => {
                  const isEquipped = currentEquippedForSlot === gear.id;
                  const isInspected = inspectedGearId === gear.id;
                  const isOwned = isGearOwnedInInventory(gear.id, playerXp);
                  const gearKind =
                    gear.slot === 'grenadePack' ? 'grenadePack' : gear.slot;

                  return (
                    <button
                      key={gear.id}
                      type="button"
                      onClick={() => {
                        if (isOwned) {
                          handleEquipOrBuyGear(gear);
                        } else {
                          soundEngine.playMenuSelect();
                          setInspectedGearId(gear.id);
                        }
                      }}
                      className={`w-full text-left rounded-[2px] border p-2 transition-colors cursor-pointer ${
                        isEquipped
                          ? 'bg-[#191f2a] border-[#f97316]'
                          : isInspected
                            ? 'bg-[#151a24] border-white/40'
                            : 'bg-[#10141c] border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`w-3.5 h-3.5 rounded-[1px] border flex items-center justify-center text-[9px] font-bold shrink-0 ${
                            isEquipped
                              ? 'border-[#f97316] bg-[#f97316]/20 text-[#f97316]'
                              : isOwned
                                ? 'border-white/30 bg-black/40 text-transparent'
                                : 'border-white/15 bg-black/50 text-slate-400'
                          }`}
                        >
                          {isEquipped ? '✓' : !isOwned ? '×' : ''}
                        </span>
                        <span
                          className={`font-display font-bold text-xs truncate ${
                            isEquipped
                              ? 'text-[#fb923c]'
                              : isOwned
                                ? 'text-white'
                                : 'text-slate-400'
                          }`}
                        >
                          {gear.name}
                        </span>
                      </div>

                      <div className="h-9 flex items-center justify-center">
                        <GearIconSvg
                          kind={gearKind}
                          className="w-12 h-8"
                          accent={isOwned ? '#e2e8f0' : '#64748b'}
                        />
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-2 text-[9px] font-mono">
                        <span className="text-emerald-300 truncate">
                          {gear.perkLabel}
                        </span>
                        {!isOwned ? (
                          <span className="text-[#fbbf24] font-bold tabular-nums shrink-0">
                            $ {gear.cashPrice}
                          </span>
                        ) : (
                          <span className="text-slate-400 tabular-nums shrink-0">
                            100%
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* COLUNA 3: DETALHES DO ITEM + 6 BARRAS DE STATUS LARANJAS        */}
          {/* --------------------------------------------------------------- */}
          <div className="col-span-4 min-h-0 flex flex-col justify-between bg-[#0a0d12] p-3 sm:p-4 overflow-y-auto">
            {isWeaponSlot ? (
              <div className="space-y-3">
                <div className="relative rounded-[2px] border border-white/12 bg-[radial-gradient(ellipse_at_center,_#18202c_0%,_#0b0e14_100%)] p-2.5 flex items-center justify-center h-24">
                  <WeaponPreview3D
                    weaponId={inspectedWeaponSpec.id}
                    locked={!inspectedWeaponOwned}
                    alt={inspectedWeaponSpec.name}
                    className="w-full h-20"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playMenuSelect();
                      onOpenWeaponGunsmith();
                    }}
                    className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-[2px] bg-[#141923]/90 hover:bg-[#ea580c] border border-white/15 text-[9px] font-mono font-bold text-slate-200 hover:text-white uppercase cursor-pointer transition-colors"
                  >
                    3D 360° ↗
                  </button>
                </div>

                <div>
                  <h3 className="font-display font-black text-base sm:text-lg text-[#f97316] uppercase tracking-wide leading-tight">
                    {inspectedWeaponSpec.name}
                  </h3>
                  <div className="mt-1 text-[11px] font-mono leading-snug">
                    <span className="text-[#fb923c] font-bold">
                      Slots de Acessórios:{' '}
                    </span>
                    <span className="text-slate-300">
                      {inspectedWeaponSpec.attachmentSlots}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] font-mono text-slate-400">
                    {inspectedWeaponSpec.category} · {inspectedWeaponSpec.caliber} ·{' '}
                    <span className="text-slate-200">
                      {inspectedWeaponSpec.exclusiveLabel}
                    </span>
                  </div>
                </div>

                <p className="text-xs font-sans text-slate-300 leading-relaxed border-t border-white/10 pt-2.5">
                  {inspectedWeaponSpec.description}
                </p>

                {/* 6 BARRAS HORIZONTAIS WARFACE (Dano, Alcance, Cadência, Mira, Hip, Carregador) */}
                <div className="space-y-2.5 pt-2 border-t border-white/10">
                  {[
                    {
                      label: 'Dano:',
                      value: String(inspectedWeaponSpec.damageStat),
                      pct: inspectedWeaponSpec.damagePct,
                    },
                    {
                      label: 'Alcance:',
                      value: inspectedWeaponSpec.rangeLabel,
                      pct: inspectedWeaponSpec.rangePct,
                    },
                    {
                      label: 'Cadência:',
                      value: `${inspectedWeaponSpec.rpmLabel} RPM`,
                      pct: inspectedWeaponSpec.rpmPct,
                    },
                    {
                      label: 'Precisão (Mira):',
                      value: `${inspectedWeaponSpec.aimAcc}%`,
                      pct: inspectedWeaponSpec.aimAcc,
                    },
                    {
                      label: 'Precisão (Hip):',
                      value: `${inspectedWeaponSpec.hipAcc}%`,
                      pct: inspectedWeaponSpec.hipAcc,
                    },
                    {
                      label: 'Carregador:',
                      value: inspectedWeaponSpec.clipLabel,
                      pct: inspectedWeaponSpec.clipPct,
                    },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                        <span className="text-slate-300">{stat.label}</span>
                        <span className="text-white font-bold tabular-nums">
                          {stat.value}
                        </span>
                      </div>
                      <div className="w-full h-[3px] bg-[#1e2531] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#ea580c] to-[#f97316]"
                          style={{ width: `${Math.min(100, Math.max(8, stat.pct))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : selectedSlot === 'specialGadget' ? (
              <div className="space-y-3">
                <div>
                  <h3 className="font-display font-black text-base sm:text-lg text-[#f97316] uppercase">
                    {classCombat.specialSlotTitle}
                  </h3>
                  <div className="text-[11px] font-mono text-slate-400">
                    Equipamento Exclusivo · {classMeta.label}
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed border-t border-white/10 pt-2.5">
                  {classCombat.specialSlotDesc}
                </p>
                <div className="border-t border-white/10 pt-2.5 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vida + Colete Total:</span>
                    <strong className="text-emerald-400 tabular-nums">
                      {modifiers.totalMaxHealth} PV
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Colete Balístico Base:</span>
                    <strong className="text-white tabular-nums">
                      +{modifiers.armorBonus} AP
                    </strong>
                  </div>
                </div>
              </div>
            ) : inspectedGearItem ? (
              <div className="space-y-3">
                <div>
                  <h3 className="font-display font-black text-base sm:text-lg text-[#f97316] uppercase">
                    {inspectedGearItem.name}
                  </h3>
                  <div className="text-[11px] font-mono text-emerald-300 font-bold mt-0.5">
                    {inspectedGearItem.perkLabel}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {inspectedGearItem.code} · {inspectedGearItem.rarity}
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed border-t border-white/10 pt-2.5">
                  {inspectedGearItem.description}
                </p>
                <div className="space-y-2 border-t border-white/10 pt-2.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vida + Colete Total:</span>
                    <strong className="text-emerald-400 tabular-nums">
                      {modifiers.totalMaxHealth} PV
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bônus Recarga:</span>
                    <strong className="text-white tabular-nums">
                      +{Math.round((modifiers.reloadSpeedMult - 1) * 100)}%
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bônus Sprint:</span>
                    <strong className="text-white tabular-nums">
                      +{Math.round((modifiers.sprintSpeedMult - 1) * 100)}%
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Proteção Cabeça:</span>
                    <strong className="text-white tabular-nums">
                      +{modifiers.headshotReductionPct}%
                    </strong>
                  </div>
                </div>
              </div>
            ) : null}

            {/* BOTÃO DE AÇÃO PRINCIPAL INFERIOR */}
            <div className="pt-3 mt-3 border-t border-white/10 space-y-1.5 shrink-0">
              {isWeaponSlot && (
                <>
                  {isInspectedWeaponEquipped ? (
                    <div className="w-full py-2 px-3 rounded-[2px] border border-[#f97316]/60 bg-[#f97316]/15 text-center font-mono font-bold text-xs text-[#fb923c] uppercase">
                      ✓ EQUIPADA EM {CLASS_TAB_SHORT[activeClass]}
                    </div>
                  ) : inspectedWeaponOwned ? (
                    <button
                      type="button"
                      onClick={() => handleEquipOrBuyWeapon(inspectedWeaponSpec.id)}
                      className="w-full py-2.5 px-4 rounded-[2px] bg-[#ea580c] hover:bg-[#f97316] text-white font-display font-black text-xs uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      EQUIPAR {inspectedWeaponSpec.name}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={playerCash < inspectedWeaponSpec.cashPrice}
                      onClick={() => handleEquipOrBuyWeapon(inspectedWeaponSpec.id)}
                      className={`w-full py-2.5 px-4 rounded-[2px] font-display font-black text-xs uppercase tracking-wider transition-colors ${
                        playerCash >= inspectedWeaponSpec.cashPrice
                          ? 'bg-[#ea580c] hover:bg-[#f97316] text-white cursor-pointer'
                          : 'bg-[#1a202c] border border-white/10 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {playerCash >= inspectedWeaponSpec.cashPrice
                        ? `COMPRAR POR $ ${inspectedWeaponSpec.cashPrice}`
                        : `DESBLOQUEIA NÍV. ${inspectedWeaponReq.requiredLevel} ($ ${inspectedWeaponSpec.cashPrice})`}
                    </button>
                  )}
                </>
              )}

              {!isWeaponSlot && selectedSlot !== 'specialGadget' && inspectedGearItem && (
                <>
                  {isInspectedGearEquipped ? (
                    <div className="w-full py-2 px-3 rounded-[2px] border border-[#f97316]/60 bg-[#f97316]/15 text-center font-mono font-bold text-xs text-[#fb923c] uppercase">
                      ✓ EQUIPADO EM {CLASS_TAB_SHORT[activeClass]}
                    </div>
                  ) : isInspectedGearOwned ? (
                    <button
                      type="button"
                      onClick={() => handleEquipOrBuyGear(inspectedGearItem)}
                      className="w-full py-2.5 px-4 rounded-[2px] bg-[#ea580c] hover:bg-[#f97316] text-white font-display font-black text-xs uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      EQUIPAR ITEM
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={playerCash < inspectedGearItem.cashPrice}
                      onClick={() => handleEquipOrBuyGear(inspectedGearItem)}
                      className={`w-full py-2.5 px-4 rounded-[2px] font-display font-black text-xs uppercase tracking-wider transition-colors ${
                        playerCash >= inspectedGearItem.cashPrice
                          ? 'bg-[#ea580c] hover:bg-[#f97316] text-white cursor-pointer'
                          : 'bg-[#1a202c] border border-white/10 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {playerCash >= inspectedGearItem.cashPrice
                        ? `COMPRAR POR $ ${inspectedGearItem.cashPrice}`
                        : `DESBLOQUEIA NÍV. ${inspectedGearItem.unlockLevel} ($ ${inspectedGearItem.cashPrice})`}
                    </button>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  soundEngine.playMenuSelect();
                  onClose();
                }}
                className="w-full py-2 px-3 rounded-[2px] bg-[#161b24] hover:bg-[#1e2532] border border-white/15 text-xs font-mono font-bold text-slate-200 uppercase cursor-pointer transition-colors"
              >
                PRONTO PARA PARTIDA ✓
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
