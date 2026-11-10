import React from 'react';
import { GrenadeType, HudState, WeaponId } from '../types/game';
import {
  bindTap,
  FireModeIcon,
  FragGrenadeIcon,
  InspectEyeIcon,
  SmokeGrenadeIcon,
  WeaponSilhouette,
} from './hudTapUtils';

interface HudBottomWeaponDockProps {
  hud: HudState;
  onSelectWeapon: (weaponId: WeaponId) => void;
  onToggleWeaponSlot: () => void;
  onInspectWeapon: () => void;
  onCycleFireMode: () => void;
  onResupply: () => void;
  onThrowGrenade: (type: GrenadeType) => void;
}

const SHORT_WEAPON_TAG: Record<WeaponId, string> = {
  M4_CARBINE: 'M4A1',
  SMG_45: 'SMG .45',
  AK47_RIFLE: 'AK-47',
  CARBINE_AR: 'CARBINE',
  L49_LMG: 'LMG 100',
  SNIPER_TACTICAL: 'SNIPER S&B',
  SNIPER_BOLT: 'SNIPER .338',
  P50_PISTOL: 'MARK 23',
  KNIFE_TACTICAL: 'FACA',
};

const PRIMARY_CYCLE_ORDER: WeaponId[] = [
  'M4_CARBINE',
  'SMG_45',
  'AK47_RIFLE',
  'CARBINE_AR',
  'L49_LMG',
  'SNIPER_TACTICAL',
  'SNIPER_BOLT',
];

export const HudBottomWeaponDock: React.FC<HudBottomWeaponDockProps> = ({
  hud,
  onSelectWeapon,
  onToggleWeaponSlot,
  onInspectWeapon,
  onCycleFireMode,
  onResupply,
  onThrowGrenade,
}) => {
  const reserveAmmo = hud.magazines.reduce((acc, r) => acc + r, 0);
  const currentTotalLoaded = hud.currentMagRounds + hud.chambered;
  const isKnifeActive = hud.activeWeapon === 'KNIFE_TACTICAL';
  const isSecondaryActive = hud.activeWeapon === 'P50_PISTOL';
  const isPrimaryActive = !isSecondaryActive && !isKnifeActive;

  const handlePrimarySlotTap = () => {
    if (hud.equippedGrenade !== null) {
      onSelectWeapon(hud.primaryWeapon);
      return;
    }
    if (!isPrimaryActive) {
      onSelectWeapon(hud.primaryWeapon);
    } else {
      const idx = PRIMARY_CYCLE_ORDER.indexOf(hud.primaryWeapon);
      const nextWeapon =
        PRIMARY_CYCLE_ORDER[(idx + 1) % PRIMARY_CYCLE_ORDER.length];
      onSelectWeapon(nextWeapon);
    }
  };

  const handleSecondarySlotTap = () => {
    if (hud.equippedGrenade !== null) {
      onSelectWeapon('P50_PISTOL');
      return;
    }
    if (isSecondaryActive) {
      onSelectWeapon(hud.primaryWeapon);
    } else {
      onSelectWeapon('P50_PISTOL');
    }
  };

  const handleKnifeSlotTap = () => {
    if (hud.equippedGrenade !== null) {
      onSelectWeapon('KNIFE_TACTICAL');
      return;
    }
    if (isKnifeActive) {
      onSelectWeapon(hud.primaryWeapon);
    } else {
      onSelectWeapon('KNIFE_TACTICAL');
    }
  };

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed bottom-1.5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-40 pointer-events-auto select-none font-mono"
      style={{ touchAction: 'manipulation' }}
    >
      {/* Weapon & Tactical Grenade Slots Row */}
      <div className="flex items-end gap-1">
        {/* Left Utility Box 1: Fire Mode Toggle Icon (Single / Burst / Auto) */}
        <button
          type="button"
          {...bindTap(onCycleFireMode)}
          aria-label="Alternar modo de disparo"
          title={`Modo de Disparo: ${hud.fireMode} [B]`}
          className="w-10 h-11 bg-black/75 hover:bg-black/90 border border-white/35 text-white/95 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform cursor-pointer"
        >
          <FireModeIcon mode={hud.fireMode} />
          <span className="text-[8px] font-bold text-amber-300 leading-none">
            {hud.fireMode}
          </span>
        </button>

        {/* Left Utility Box 2: Inspect Weapon Icon */}
        <button
          type="button"
          {...bindTap(onInspectWeapon)}
          aria-label="Inspecionar arma"
          title="Inspecionar Arma 3D [F]"
          className="w-10 h-11 bg-black/75 hover:bg-black/90 border border-white/35 text-white/95 flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
        >
          <InspectEyeIcon />
        </button>

        {/* SLOT 1: PRIMARY RIFLE / SNIPER / SMG / LMG */}
        <button
          type="button"
          {...bindTap(handlePrimarySlotTap)}
          aria-label="Arma principal"
          title="Toque para equipar ou trocar de Arma Principal [1]"
          className={`relative w-26 sm:w-30 h-11 px-2 flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
            isPrimaryActive && hud.equippedGrenade === null
              ? 'bg-gradient-to-t from-amber-500/35 to-black/85 border-2 border-amber-400 text-white shadow-[0_0_14px_rgba(250,204,21,0.3)]'
              : 'bg-black/75 border border-white/30 text-white/70 hover:text-white'
          }`}
        >
          <span className="absolute top-0.5 left-1.5 text-[8px] font-bold tracking-tight text-amber-300 leading-none uppercase">
            {SHORT_WEAPON_TAG[hud.primaryWeapon]}
          </span>
          <WeaponSilhouette
            weaponId={hud.primaryWeapon}
            className="w-15 h-5 mt-0.5"
          />
          {isPrimaryActive && (
            <span className="absolute bottom-0.5 right-1.5 font-mono tabular-nums text-[10px] font-bold text-white leading-none">
              {currentTotalLoaded}/{reserveAmmo}
            </span>
          )}
        </button>

        {/* SLOT 2: SECONDARY PISTOL */}
        <button
          type="button"
          {...bindTap(handleSecondarySlotTap)}
          aria-label="Pistola secundária"
          title="Toque para equipar Pistola Secundária ou voltar à Principal [2]"
          className={`relative w-22 sm:w-25 h-11 px-2 flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
            isSecondaryActive && hud.equippedGrenade === null
              ? 'bg-gradient-to-t from-amber-500/35 to-black/85 border-2 border-amber-400 text-white shadow-[0_0_14px_rgba(250,204,21,0.3)]'
              : 'bg-black/75 border border-white/30 text-white/70 hover:text-white'
          }`}
        >
          <span className="absolute top-0.5 left-1.5 text-[8px] font-bold tracking-tight text-amber-300 leading-none uppercase">
            MARK 23
          </span>
          <WeaponSilhouette
            weaponId="P50_PISTOL"
            className="w-11 h-5 mt-0.5"
          />
          {isSecondaryActive && (
            <span className="absolute bottom-0.5 right-1.5 font-mono tabular-nums text-[10px] font-bold text-white leading-none">
              {currentTotalLoaded}/{reserveAmmo}
            </span>
          )}
        </button>

        {/* SLOT MELEE: COMBAT TACTICAL KNIFE [3] */}
        <button
          type="button"
          {...bindTap(handleKnifeSlotTap)}
          aria-label="Faca de combate"
          title="Toque para equipar Faca de Combate [3]"
          className={`relative w-15 sm:w-18 h-11 px-1 flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
            isKnifeActive && hud.equippedGrenade === null
              ? 'bg-gradient-to-t from-red-500/40 to-black/85 border-2 border-red-400 text-white shadow-[0_0_14px_rgba(239,68,68,0.4)]'
              : 'bg-black/75 border border-white/30 text-white/70 hover:text-white'
          }`}
        >
          <span className="absolute top-0.5 left-1.5 text-[8px] font-bold tracking-tight text-red-300 leading-none uppercase">
            FACA
          </span>
          <WeaponSilhouette
            weaponId="KNIFE_TACTICAL"
            className="w-12 h-5 mt-0.5"
          />
        </button>

        {/* SLOT 3: FRAG GRENADE [G] */}
        <button
          type="button"
          {...bindTap(() => onThrowGrenade('FRAG'))}
          aria-label="Granada de Fragmentação"
          title="Toque para segurar ou arremessar a Granada Frag [G]"
          className={`relative w-12 h-11 flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer ${
            hud.equippedGrenade === 'FRAG'
              ? 'bg-gradient-to-t from-orange-500/50 to-black/85 border-2 border-orange-400 text-orange-200 shadow-[0_0_14px_rgba(249,115,22,0.6)] scale-105'
              : hud.fragGrenades > 0
                ? 'bg-black/75 hover:bg-black/90 border border-orange-400/75 text-orange-300'
                : 'bg-black/50 border border-white/15 text-white/35'
          }`}
        >
          <FragGrenadeIcon />
          <span className="text-[8px] font-bold leading-none mt-0.5">
            {hud.equippedGrenade === 'FRAG' ? 'JOGAR' : `x${hud.fragGrenades}`}
          </span>
        </button>

        {/* SLOT 4: SMOKE GRENADE [J] */}
        <button
          type="button"
          {...bindTap(() => onThrowGrenade('SMOKE'))}
          aria-label="Granada de Fumaça"
          title="Toque para segurar ou arremessar a Granada de Fumaça [J]"
          className={`relative w-12 h-11 flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer ${
            hud.equippedGrenade === 'SMOKE'
              ? 'bg-gradient-to-t from-sky-500/50 to-black/85 border-2 border-sky-400 text-sky-200 shadow-[0_0_14px_rgba(56,189,248,0.6)] scale-105'
              : hud.smokeGrenades > 0
                ? 'bg-black/75 hover:bg-black/90 border border-sky-400/75 text-sky-300'
                : 'bg-black/50 border border-white/15 text-white/35'
          }`}
        >
          <SmokeGrenadeIcon />
          <span className="text-[8px] font-bold leading-none mt-0.5">
            {hud.equippedGrenade === 'SMOKE'
              ? 'JOGAR'
              : `x${hud.smokeGrenades}`}
          </span>
        </button>

        {/* Right Utility Box: Resupply Ammo & Grenades Crate Icon */}
        <button
          type="button"
          {...bindTap(onResupply)}
          aria-label="Reabastecer munição e granadas"
          title="Reabastecer Munição e Granadas [U]"
          className="w-10 h-11 bg-black/75 hover:bg-black/90 border border-white/35 text-amber-300 flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5V19M5 12H19"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Bottom Military Vitality (HP) & Reload Progress Bar */}
      <div className="w-72 sm:w-84 h-5 bg-black/85 border border-white/20 px-2 flex items-center gap-2 shadow-lg rounded-sm">
        <div className="flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className={hud.health < 35 ? 'text-red-500 animate-pulse' : hud.health < 65 ? 'text-amber-400' : 'text-emerald-400'}>
            <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z" />
          </svg>
          <span className={`text-[10px] font-mono font-black tabular-nums tracking-tighter ${hud.health < 35 ? 'text-red-400 animate-pulse' : hud.health < 65 ? 'text-amber-300' : 'text-emerald-300'}`}>
            {Math.round(hud.health)}
          </span>
        </div>
        <div className="flex-1 h-2 bg-white/10 rounded-xs overflow-hidden relative border border-white/10">
          <div
            className={`h-full transition-all duration-200 ${
              hud.health < 35
                ? 'bg-gradient-to-r from-red-600 to-rose-500 animate-pulse'
                : hud.health < 65
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400'
            }`}
            style={{ width: `${Math.max(0, Math.min(100, hud.health))}%` }}
          />
          {/* Subtle tactical tick mark at 50% */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-black/40 pointer-events-none" />
        </div>
        {hud.reloadPhase !== 'IDLE' && (
          <div className="w-16 h-2 bg-amber-500/20 border border-amber-500/30 rounded-xs overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-75"
              style={{ width: `${Math.round(hud.reloadProgress * 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
