import React from 'react';
import { soundEngine } from '../audio/soundEngine';
import { CloudSyncState } from '../firebase/playerCloudSync';
import { RankDefinition } from '../progression/ranks';
import { WarfaceRankIcon } from './WarfaceRankIcon';

export type MainMenuTab =
  | 'PLAY'
  | 'WEAPON'
  | 'RANKS'
  | 'BATTLE_PASS'
  | 'SETTINGS';

interface MainMenuTopNavProps {
  activeTab: MainMenuTab;
  onSelectTab: (tab: MainMenuTab) => void;
  onHover: () => void;
  playerCashBalance: number;
  currentRank: RankDefinition;
  xpLevelProgress: number;
  syncState: CloudSyncState;
  onOpenProfile: () => void;
}

export const MainMenuTopNav: React.FC<MainMenuTopNavProps> = ({
  activeTab,
  onSelectTab,
  onHover,
  playerCashBalance,
  currentRank,
  xpLevelProgress,
  syncState,
  onOpenProfile,
}) => {
  return (
    <header className="relative z-20 w-full h-11 px-2.5 sm:px-5 bg-[#0a0d13]/90 border-b border-white/10 flex items-center justify-between gap-2 shrink-0 backdrop-blur-md">
      {/* Esquerda: Quadrado com a Foto de Perfil do Jogador (Substitui o texto Kinetic) */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            soundEngine.playMenuSelect();
            onOpenProfile();
          }}
          title="Abrir Dossiê do Operador, Foto de Perfil e Conquistas"
          className="flex items-center gap-2 bg-white/[0.05] hover:bg-amber-500/15 border border-amber-400/40 hover:border-amber-300 rounded-xl p-1 pr-2.5 cursor-pointer transition-all shadow-md group"
        >
          {/* Quadrado da Foto de Perfil */}
          <div className="relative w-8 h-8 rounded-lg overflow-hidden border-1.5 border-amber-400 bg-slate-900 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
            {syncState.profile.avatarDataUrl ? (
              <img
                src={syncState.profile.avatarDataUrl}
                alt={syncState.profile.callsign}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="font-display font-black text-xs text-amber-300">
                {syncState.profile.callsign.slice(0, 2)}
              </span>
            )}
            {/* Status Online / Sincronizado */}
            <span
              className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-black ${
                syncState.isGoogleLinked ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400'
              }`}
            />
          </div>

          {/* Nome do Jogador e Status */}
          <div className="flex flex-col text-left leading-tight">
            <div className="flex items-center gap-1">
              <span className="font-display font-black text-[11px] sm:text-xs text-white uppercase tracking-wider max-w-[90px] sm:max-w-[120px] truncate group-hover:text-amber-300 transition-colors">
                {syncState.profile.callsign}
              </span>
              {syncState.profile.callsignLocked && (
                <span className="text-[9px]" title="ID Único Registrado">🔒</span>
              )}
            </div>
            <span className="font-mono text-[8px] text-emerald-300 uppercase">
              {syncState.isGoogleLinked ? '☁️ CONECTADO' : 'PERFIL'}
            </span>
          </div>
        </button>

        {/* Linha Divisória Tática */}
        <div className="hidden sm:block w-[1px] h-5 bg-white/15" />

        {/* Abas Centrais de Navegação */}
        <nav className="flex items-center gap-0.5 sm:gap-1 shrink-0 overflow-x-auto no-scrollbar">
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
                onMouseEnter={onHover}
                onClick={(e) => {
                  e.stopPropagation();
                  soundEngine.playMenuSelect();
                  soundEngine.playMenuMusic();
                  onSelectTab(tab.id as MainMenuTab);
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

      {/* Direita: Saldo de Dinheiro Tático + Patente Warface */}
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

        {/* Patente Militar */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            soundEngine.playMenuSelect();
            onSelectTab('RANKS');
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
  );
};
