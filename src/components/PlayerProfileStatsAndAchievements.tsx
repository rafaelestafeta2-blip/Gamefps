import React from 'react';
import { PlayerCloudProfile } from '../firebase/playerCloudSync';
import {
  AchievementEvalInput,
  TACTICAL_ACHIEVEMENTS,
} from '../progression/achievementsData';
import { WeaponId } from '../types/game';
import { WeaponVisualCard } from './WeaponVisualCard';

const WEAPON_SHORT_LABELS: Record<WeaponId, string> = {
  P50_PISTOL: 'MARK 23 .45',
  M4_CARBINE: 'M4A1 SOPMOD',
  SMG_45: 'SMG .45 SUB',
  SMG_MP5: 'MP5A3 9MM',
  SHOTGUN_12: 'M870 12GA',
  SHOTGUN_SPAS: 'SPAS-12 12GA',
  AK47_RIFLE: 'AK-47 COMANDO',
  AK12_RIFLE: 'AK-12 SPETSNAZ',
  CARBINE_AR: 'CARABINA HK416',
  L49_LMG: 'LMG PESADA 100R',
  SNIPER_TACTICAL: 'SNIPER M110',
  SNIPER_BOLT: 'AWP .338 LAPUA',
  KNIFE_TACTICAL: 'KARAMBIT TÁTICA',
};

const ALL_WEAPON_IDS: WeaponId[] = [
  'M4_CARBINE',
  'AK12_RIFLE',
  'SHOTGUN_12',
  'SHOTGUN_SPAS',
  'SMG_45',
  'SMG_MP5',
  'P50_PISTOL',
  'AK47_RIFLE',
  'CARBINE_AR',
  'L49_LMG',
  'SNIPER_TACTICAL',
  'SNIPER_BOLT',
  'KNIFE_TACTICAL',
];

export const PlayerProfileStatsTab: React.FC<{
  profile: PlayerCloudProfile;
  totalCash: number;
}> = ({ profile, totalCash }) => {
  const kdRatio =
    profile.totalDeaths > 0
      ? (profile.totalKills / profile.totalDeaths).toFixed(2)
      : profile.totalKills.toFixed(2);
  const hsPercent =
    profile.totalKills > 0
      ? Math.round((profile.totalHeadshots / profile.totalKills) * 100)
      : 0;
  const winRate =
    profile.matchesPlayed > 0
      ? Math.round((profile.matchesWon / profile.matchesPlayed) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: 'KILLS TOTAIS', value: profile.totalKills, color: 'text-amber-300' },
          { label: 'TAXA K/D', value: kdRatio, color: 'text-emerald-300' },
          { label: 'HEADSHOTS', value: `${profile.totalHeadshots} (${hsPercent}%)`, color: 'text-red-300' },
          { label: 'ASSISTÊNCIAS', value: profile.totalAssists, color: 'text-sky-300' },
          { label: 'PARTIDAS 5V5', value: profile.matchesPlayed, color: 'text-white' },
          { label: 'VITÓRIAS 5V5', value: `${profile.matchesWon} (${winRate}%)`, color: 'text-emerald-300' },
          { label: 'C4 PLANTADAS', value: profile.bombsPlanted, color: 'text-amber-400' },
          { label: 'SALDO TOTAL', value: `$${totalCash.toLocaleString('pt-BR')}`, color: 'text-emerald-400' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white/[0.03] border border-white/10 rounded-xl p-3 text-center"
          >
            <div className={`font-display font-black text-base sm:text-lg ${stat.color}`}>
              {stat.value}
            </div>
            <div className="font-mono text-[9px] text-slate-400 uppercase mt-0.5">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-sm text-amber-300 uppercase tracking-wider">
              COLEÇÃO DE ARMAS DO ARSENAL ({profile.unlockedWeapons.length} / {ALL_WEAPON_IDS.length} LIBERADAS)
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            EQUIPADA: <strong className="text-amber-300">{WEAPON_SHORT_LABELS[profile.activeWeapon]}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ALL_WEAPON_IDS.map((wId) => {
            const unlocked = profile.unlockedWeapons.includes(wId);
            const isEquipped = profile.activeWeapon === wId;
            return (
              <WeaponVisualCard
                key={wId}
                weaponId={wId}
                unlocked={unlocked}
                isEquipped={isEquipped}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const PlayerProfileAchievementsTab: React.FC<{
  profile: PlayerCloudProfile;
  evalInput: AchievementEvalInput;
}> = ({ profile, evalInput }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
    {TACTICAL_ACHIEVEMENTS.map((ach) => {
      const currentVal = ach.getValue(evalInput);
      const unlocked =
        profile.unlockedAchievements.includes(ach.id) ||
        currentVal >= ach.targetValue;
      const pct = Math.max(
        0,
        Math.min(100, Math.round((currentVal / ach.targetValue) * 100))
      );

      return (
        <div
          key={ach.id}
          className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
            unlocked
              ? 'bg-amber-500/[0.08] border-amber-400/50'
              : 'bg-white/[0.02] border-white/10 opacity-75'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border ${
              unlocked
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-slate-800/80 border-white/10 text-slate-500'
            }`}
          >
            {ach.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="font-display font-black text-xs text-white uppercase truncate">
                {ach.title}
              </span>
              <span
                className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                  unlocked
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                    : 'bg-white/5 text-slate-400'
                }`}
              >
                {unlocked ? 'CONQUISTADA ✓' : `${pct}%`}
              </span>
            </div>
            <p className="font-mono text-[10px] text-slate-300 mt-0.5">
              {ach.description}
            </p>
            <div className="mt-2">
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    unlocked
                      ? 'bg-gradient-to-r from-amber-400 to-emerald-400'
                      : 'bg-amber-500/60'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between font-mono text-[9px] text-slate-400 mt-0.5">
                <span>{ach.tier}</span>
                <span>
                  {Math.min(currentVal, ach.targetValue).toLocaleString('pt-BR')} /{' '}
                  {ach.targetValue.toLocaleString('pt-BR')} {ach.unitLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    })}
  </div>
);
