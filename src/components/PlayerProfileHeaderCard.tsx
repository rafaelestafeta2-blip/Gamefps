import React from 'react';
import { PlayerCloudProfile } from '../firebase/playerProfileModel';
import { WarfaceRankIcon } from './WarfaceRankIcon';

interface PlayerProfileHeaderCardProps {
  profile: PlayerCloudProfile;
  activeTab: 'PROFILE_CARD' | 'CUSTOMIZE';
  onTabChange: (tab: 'PROFILE_CARD' | 'CUSTOMIZE') => void;
  onOpenEditPhotoOrName: () => void;
}

export const PlayerProfileHeaderCard: React.FC<PlayerProfileHeaderCardProps> = ({
  profile,
  activeTab,
  onTabChange,
  onOpenEditPhotoOrName,
}) => {
  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-[#0b0e14]/90 border border-white/10 rounded-xl p-3 sm:p-4 backdrop-blur-md shrink-0">
      {/* 1. Esquerda: Cartão de Identificação do Operador */}
      <div className="md:col-span-5 flex flex-col justify-between space-y-2">
        <div className="flex items-center gap-3">
          {/* Avatar com moldura militar */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 border-amber-500/80 bg-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.3)] shrink-0 flex items-center justify-center">
            {profile.avatarDataUrl ? (
              <img
                src={profile.avatarDataUrl}
                alt={profile.callsign}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <WarfaceRankIcon level={profile.rankLevel} className="w-10 h-10" />
            )}
            <span className="absolute bottom-0 right-0 px-1 py-0.2 bg-black/80 font-mono text-[8px] text-amber-300 font-bold border-t border-l border-amber-500/50">
              LV.{profile.rankLevel}
            </span>
          </div>

          {/* Nome e Nível */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-black text-lg sm:text-xl text-white tracking-wider truncate">
                {profile.callsign}
              </h3>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 font-mono text-[9px] font-bold text-amber-300 uppercase shrink-0">
                MVP
              </span>
            </div>
            <div className="text-xs font-mono text-slate-300 flex items-center gap-2 mt-0.5">
              <span>Nível {profile.rankLevel}</span>
              <span className="text-slate-500">·</span>
              <span className="text-amber-400/90 truncate">{profile.rankTitle}</span>
            </div>
            <div className="text-[10px] font-mono text-emerald-400 font-bold mt-0.5">
              ${profile.playerCash.toLocaleString('pt-BR')} K-MONEY
            </div>
          </div>
        </div>

        {/* Abas [PERFIL CARD] / [CUSTOMIZADO] */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onTabChange('PROFILE_CARD')}
            className={`px-3 py-1 rounded-md font-mono text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'PROFILE_CARD'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'
            }`}
          >
            PERFIL CARD
          </button>
          <button
            type="button"
            onClick={() => {
              onTabChange('CUSTOMIZE');
              onOpenEditPhotoOrName();
            }}
            className={`px-3 py-1 rounded-md font-mono text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'CUSTOMIZE'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'
            }`}
          >
            CUSTOMIZADO
          </button>
        </div>
      </div>

      {/* 2. Centro: Grande Brasão Dourado de MVP com 3 Estrelas */}
      <div className="md:col-span-3 flex flex-col items-center justify-center py-1">
        <div className="relative flex flex-col items-center justify-center p-3 rounded-xl bg-gradient-to-b from-amber-500/15 via-yellow-600/10 to-transparent border border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
          {/* Estrelas Douradas */}
          <div className="flex items-center gap-1 text-amber-300 text-xs mb-0.5 drop-shadow-[0_0_6px_#f59e0b]">
            <span>★</span>
            <span className="text-sm">★</span>
            <span>★</span>
          </div>
          {/* Emblema MVP */}
          <div className="font-display font-black text-2xl sm:text-3xl tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-300 to-amber-600 drop-shadow-[0_2px_12px_rgba(245,158,11,0.6)]">
            MVP
          </div>
          <div className="font-mono text-[8px] tracking-[0.2em] text-amber-400/90 font-bold uppercase mt-0.5">
            SQUAD VANGUARD
          </div>
        </div>
      </div>

      {/* 3. Direita: Operador Tático Militar com Botão de Customização */}
      <div className="md:col-span-4 flex items-center justify-end gap-3">
        <div className="hidden sm:flex flex-col text-right">
          <span className="font-display font-bold text-xs text-white uppercase tracking-wider">
            OPERADOR KINETIC
          </span>
          <span className="font-mono text-[9px] text-slate-400">
            LOADOUT {profile.activeWeapon}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenEditPhotoOrName}
          className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-amber-500/20 border border-white/20 hover:border-amber-400/60 font-mono text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
        >
          <span>⚙</span>
          <span>CUSTOMIZAÇÃO</span>
        </button>
      </div>
    </div>
  );
};
