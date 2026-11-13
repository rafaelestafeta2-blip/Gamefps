import React from 'react';
import { PlayerCloudProfile } from '../firebase/playerProfileModel';
import { getRequiredXpForWeapon } from '../progression/ranks';
import { WeaponId } from '../types/game';
import { WeaponPreview3D } from './WeaponVisualCard';

interface PlayerProfileUnlockedWeaponsGridProps {
  profile: PlayerCloudProfile;
}

interface WeaponProfileDisplayItem {
  id: WeaponId;
  name: string;
  stars: number;
  masteryCur: number;
  masteryMax: number;
}

const WEAPON_ITEMS: WeaponProfileDisplayItem[] = [
  { id: 'M4_CARBINE', name: 'M4A1 SOPMOD', stars: 5, masteryCur: 8, masteryMax: 10 },
  { id: 'AK12_RIFLE', name: 'AK-12 SPETSNAZ', stars: 5, masteryCur: 10, masteryMax: 10 },
  { id: 'AK47_RIFLE', name: 'AK-47 KALASHNIKOV', stars: 5, masteryCur: 10, masteryMax: 10 },
  { id: 'CARBINE_AR', name: 'CARABINA TÁTICA', stars: 4, masteryCur: 7, masteryMax: 10 },
  { id: 'SHOTGUN_12', name: 'M870 BREACHER 12GA', stars: 5, masteryCur: 7, masteryMax: 10 },
  { id: 'SHOTGUN_SPAS', name: 'SPAS-12 TÁTICA', stars: 5, masteryCur: 6, masteryMax: 10 },
  { id: 'SMG_45', name: 'SMG .45 TACTICAL', stars: 4, masteryCur: 6, masteryMax: 10 },
  { id: 'SMG_MP5', name: 'MP5A3 TÁTICA', stars: 4, masteryCur: 7, masteryMax: 10 },
  { id: 'SNIPER_TACTICAL', name: 'SNIPER S&B .308', stars: 5, masteryCur: 8, masteryMax: 10 },
  { id: 'SNIPER_BOLT', name: 'HEAVY BOLT .338', stars: 5, masteryCur: 9, masteryMax: 10 },
  { id: 'L49_LMG', name: 'LMG 100R SAW', stars: 4, masteryCur: 5, masteryMax: 10 },
  { id: 'P50_PISTOL', name: 'MARK 23 .45 ACP', stars: 5, masteryCur: 10, masteryMax: 10 },
];

export const PlayerProfileUnlockedWeaponsGrid: React.FC<PlayerProfileUnlockedWeaponsGridProps> = ({
  profile,
}) => {
  return (
    <div className="flex flex-col justify-between bg-[#0b0e14]/90 border border-white/10 rounded-xl p-3.5 sm:p-4 backdrop-blur-md h-full">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <h4 className="font-display font-black text-xs sm:text-sm tracking-wider uppercase text-white">
          ARMAS DESBLOQUEADAS
        </h4>
        <span className="font-mono text-[9px] text-amber-400 font-bold tabular-nums">
          {profile.unlockedWeapons.length} / {WEAPON_ITEMS.length} NO ARSENAL
        </span>
      </div>

      {/* Grid 2 colunas de Armas no Estilo AAA da Imagem */}
      <div className="grid grid-cols-2 gap-2 my-2 overflow-y-auto max-h-[220px] sm:max-h-[240px] pr-1">
        {WEAPON_ITEMS.map((item) => {
          const isUnlocked = profile.unlockedWeapons.includes(item.id);
          const req = getRequiredXpForWeapon(item.id);

          return (
            <div
              key={item.id}
              className={`relative rounded-lg p-2 border flex flex-col justify-between transition-all ${
                isUnlocked
                  ? 'bg-white/[0.04] border-white/10 hover:border-amber-400/40'
                  : 'bg-black/50 border-white/5 opacity-70'
              }`}
            >
              {/* Estrelas de Maestria */}
              <div className="flex items-center justify-between">
                <div className="flex items-center text-[8px] text-amber-400 drop-shadow-[0_0_4px_#f59e0b]">
                  {Array.from({ length: item.stars }).map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                </div>
                {!isUnlocked && (
                  <span className="font-mono text-[7.5px] px-1 py-0.2 rounded bg-red-500/20 text-red-300 border border-red-400/30">
                    LV.{req.requiredLevel}
                  </span>
                )}
              </div>

              {/* Renderização 3D Real da Arma */}
              <div className="w-full h-9 flex items-center justify-center my-0.5">
                <WeaponPreview3D weaponId={item.id} locked={!isUnlocked} alt={item.name} className="w-full h-8 max-w-[100px]" />
              </div>

              {/* Nome e Maestria */}
              <div>
                <div className="flex items-center justify-between font-mono text-[8.5px]">
                  <span className="font-display font-bold text-white truncate max-w-[80px]">
                    {item.name}
                  </span>
                  <span className="text-amber-300 font-bold">
                    {isUnlocked ? `${item.masteryCur}/${item.masteryMax}` : '🔒'}
                  </span>
                </div>

                {/* Barra de Progresso Dourada */}
                <div className="w-full h-1 rounded-full bg-black/60 border border-white/10 mt-1 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-300"
                    style={{
                      width: isUnlocked
                        ? `${(item.masteryCur / item.masteryMax) * 100}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/10 pt-2 text-center font-mono text-[8px] text-slate-400">
        JOGUE PARTIDAS OFICIAIS PARA AUMENTAR A MAESTRIA DE CADA FUZIL
      </div>
    </div>
  );
};
