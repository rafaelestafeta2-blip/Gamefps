import React from 'react';
import { soundEngine } from '../audio/soundEngine';
import { CloudSyncState } from '../firebase/playerCloudSync';
import { RankDefinition } from '../progression/ranks';

export type MainMenuTab =
  | 'PLAY'
  | 'INVENTORY'
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
  onOpenFriends?: () => void;
  onToggleNews?: () => void;
  newsBadgeCount?: number;
  socialBadgeCount?: number;
}

export const MainMenuTopNav: React.FC<MainMenuTopNavProps> = ({
  onSelectTab,
  onHover,
  playerCashBalance,
  currentRank,
  xpLevelProgress,
  syncState,
  onOpenProfile,
  onOpenFriends,
  onToggleNews,
  newsBadgeCount = 3,
  socialBadgeCount = 0,
}) => {
  const diamondCount = Math.max(
    120,
    Math.round((syncState.profile.playerXp || 1000) * 0.25 + (syncState.profile.totalKills || 0) * 15)
  );

  return (
    <header className="relative z-30 w-full h-9 lg:h-12 px-2 sm:px-4 bg-gradient-to-b from-[#0b0d13]/96 via-[#07090e]/95 to-[#05060a]/92 border-b border-red-500/45 flex items-center justify-between gap-2 shrink-0 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
      {/* Esquerda: Moldura Chamfered do Avatar + Callsign + Lv + Barra XP Vermelha */}
      <button
        type="button"
        onMouseEnter={onHover}
        onClick={(e) => {
          e.stopPropagation();
          soundEngine.playMenuSelect();
          onOpenProfile();
        }}
        title="Abrir Perfil do Operador e Conquistas"
        className="flex items-center gap-1.5 lg:gap-2 bg-gradient-to-r from-[#1a0a0d]/95 via-[#13161f]/95 to-transparent hover:from-[#290e13] border border-red-500/55 hover:border-red-400 rounded-md pr-2.5 lg:pr-3 pl-0.5 py-0.5 cursor-pointer transition-all shrink-0 group shadow-[0_0_16px_rgba(220,38,38,0.22)]"
      >
        <div className="relative w-7 h-7 lg:w-9 lg:h-9 rounded-sm overflow-hidden border border-red-400 bg-slate-950 flex items-center justify-center shrink-0">
          {syncState.profile.avatarDataUrl ? (
            <img
              src={syncState.profile.avatarDataUrl}
              alt={syncState.profile.callsign}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="font-display font-black text-xs text-red-400">
              {syncState.profile.callsign.slice(0, 2)}
            </span>
          )}
        </div>

        <div className="flex flex-col text-left leading-none min-w-[90px] sm:min-w-[128px]">
          <div className="flex items-center gap-1">
            <span className="font-display font-black text-[11px] sm:text-xs text-white uppercase tracking-wide max-w-[82px] sm:max-w-[116px] truncate group-hover:text-red-300 transition-colors">
              {syncState.profile.callsign}
            </span>
            <span className="text-[10px] text-amber-400" title="Operador VIP">♛</span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-1">
            <span className="font-mono font-bold text-[9px] text-slate-200 tabular-nums">
              Lv. {currentRank.level}
            </span>
            <span className="font-mono font-bold text-[9px] text-red-300 tabular-nums">
              {xpLevelProgress.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden mt-0.5 border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-red-600 via-red-500 to-amber-400 shadow-[0_0_8px_rgba(239,68,68,0.9)] transition-all duration-300"
              style={{ width: `${Math.max(8, xpLevelProgress)}%` }}
            />
          </div>
        </div>
      </button>

      {/* Centro: Moedas, Diamantes e Energia Tática (idêntico à barra superior da foto) */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar">
        {/* Créditos / Ouro */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            soundEngine.playMenuSelect();
            onSelectTab('BATTLE_PASS');
          }}
          title="Créditos Táticos · Ver Passe e Recompensas"
          className="flex items-center gap-1.5 bg-[#0f131b]/95 hover:bg-[#171d29] border border-white/15 hover:border-amber-400/60 rounded-sm pl-1.5 pr-1 py-0.5 cursor-pointer transition-all shrink-0"
        >
          <span className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 border border-amber-200 flex items-center justify-center text-[9px] font-black text-slate-950 shadow-[0_0_8px_rgba(251,191,36,0.5)]">
            $
          </span>
          <span className="font-mono font-bold text-[10px] sm:text-xs text-white tabular-nums px-0.5">
            {playerCashBalance.toLocaleString('pt-BR')}
          </span>
          <span className="w-4 h-4 rounded-xs bg-white/10 hover:bg-amber-400/25 flex items-center justify-center text-[11px] font-bold text-slate-200">
            +
          </span>
        </button>

        {/* Pontos Elite / Arsenal */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            soundEngine.playMenuSelect();
            onSelectTab('WEAPON');
          }}
          title="Tokens Arsenal · Abrir Arsenal"
          className="hidden sm:flex items-center gap-1.5 bg-[#0f131b]/95 hover:bg-[#171d29] border border-white/15 hover:border-sky-400/60 rounded-sm pl-1.5 pr-1 py-0.5 cursor-pointer transition-all shrink-0"
        >
          <span className="w-4 h-4 rounded-xs bg-gradient-to-br from-sky-300 to-blue-600 rotate-45 scale-75 border border-sky-100 shadow-[0_0_8px_rgba(56,189,248,0.55)]" />
          <span className="font-mono font-bold text-[10px] sm:text-xs text-white tabular-nums px-0.5">
            {diamondCount.toLocaleString('pt-BR')}
          </span>
          <span className="w-4 h-4 rounded-xs bg-white/10 hover:bg-sky-400/25 flex items-center justify-center text-[11px] font-bold text-slate-200">
            +
          </span>
        </button>

        {/* Energia / Incursões */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            soundEngine.playMenuSelect();
            onSelectTab('RANKS');
          }}
          title="Energia Tática · Ver Patentes"
          className="hidden md:flex items-center gap-1.5 bg-[#0f131b]/95 hover:bg-[#171d29] border border-white/15 hover:border-amber-400/60 rounded-sm pl-1.5 pr-1 py-0.5 cursor-pointer transition-all shrink-0"
        >
          <span className="text-amber-400 text-xs drop-shadow-[0_0_6px_rgba(251,191,36,0.75)]">
            ⚡
          </span>
          <span className="font-mono font-bold text-[10px] sm:text-xs text-white tabular-nums px-0.5">
            120/120
          </span>
          <span className="w-4 h-4 rounded-xs bg-white/10 hover:bg-amber-400/25 flex items-center justify-center text-[11px] font-bold text-slate-200">
            +
          </span>
        </button>
      </div>

      {/* Direita: Ícones Sociais, Correio/Notícias, Configurações e Sinal Firebase */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {onOpenFriends && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.playMenuSelect();
              onOpenFriends();
            }}
            title="Amigos & Convites"
            className="relative w-8 h-8 rounded-md bg-white/[0.04] hover:bg-white/10 border border-white/10 hover:border-red-400/50 flex items-center justify-center text-slate-200 hover:text-white cursor-pointer transition-all"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
            {socialBadgeCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white font-mono font-black text-[8px] flex items-center justify-center">
                {socialBadgeCount}
              </span>
            )}
          </button>
        )}

        {onToggleNews && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.playMenuSelect();
              onToggleNews();
            }}
            title="Correio & Atualizações Táticas"
            className="relative w-8 h-8 rounded-md bg-white/[0.04] hover:bg-white/10 border border-white/10 hover:border-red-400/50 flex items-center justify-center text-slate-200 hover:text-white cursor-pointer transition-all"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 7l9 6 9-6" />
            </svg>
            {newsBadgeCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1 min-w-[14px] h-[14px] rounded-full bg-red-600 text-white font-mono font-black text-[8px] flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.85)]">
                {newsBadgeCount}
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            soundEngine.playMenuSelect();
            onSelectTab('SETTINGS');
          }}
          title="Configurações Gráficas, Áudio e HUD"
          className="w-8 h-8 rounded-md bg-white/[0.04] hover:bg-white/10 border border-white/10 hover:border-red-400/50 flex items-center justify-center text-slate-200 hover:text-white cursor-pointer transition-all"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96a7.02 7.02 0 00-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 00-.59.22L2.74 8.87a.47.47 0 00.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 00-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
          </svg>
        </button>

        <div
          title={syncState.isGoogleLinked ? 'Firebase Cloud Sync Conectado' : 'Modo Local / Pronto para Nuvem'}
          className="w-7 h-7 flex items-center justify-center text-emerald-400"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
            <path d="M5 12.55a11 11 0 0114.08 0M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
          </svg>
        </div>
      </div>
    </header>
  );
};
