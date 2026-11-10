import React, { useState } from 'react';
import { DrillMode, WeaponId } from '../types/game';

interface MainMenuPlayPanelProps {
  activeWeapon: WeaponId;
  weaponName: string;
  weaponCategory: string;
  weaponCaliber: string;
  onOpenWeaponSelect: () => void;
  onStartTraining: () => void;
  onStartDrill: (mode: DrillMode) => void;
  onStartMatchmaking: (targetMode: DrillMode) => void;
  onHover: () => void;
}

const WeaponSilhouetteIcon: React.FC<{ weaponId: WeaponId }> = ({ weaponId }) => {
  if (weaponId === 'P50_PISTOL') {
    return (
      <svg viewBox="0 0 64 28" className="w-9 h-4 text-slate-300 shrink-0" fill="currentColor">
        <path d="M12 6h36l3 3v5H31l-3 3v8h-9l2-11h-7l-2-3V6zm22 8h4v2h-4v-2z" />
      </svg>
    );
  }
  if (weaponId === 'KNIFE_TACTICAL') {
    return (
      <svg viewBox="0 0 64 24" className="w-9 h-4 text-slate-300 shrink-0" fill="currentColor">
        <path d="M6 11h16v-3h3v8h-3v-2H6v-3zm19-2h26l8 3-10 3H25V9z" />
      </svg>
    );
  }
  if (weaponId === 'SNIPER_BOLT' || weaponId === 'SNIPER_TACTICAL') {
    return (
      <svg viewBox="0 0 88 28" className="w-12 h-4 text-slate-300 shrink-0" fill="currentColor">
        <path d="M3 12h16l3-2h18V7h-4V5h18v2h-4v3h18v1h17v2H68v2H48l-2 6h-5l1-6H30l-4 7h-5l2-6H16l-10 4H3v-8z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 88 30" className="w-12 h-4 text-slate-300 shrink-0" fill="currentColor">
      <path d="M4 11h14l2 1h8V9h5V6h9v3h4v2h19v1h9v-2h2v3h8v2h-8v1h-2v-1h-9v2H47l2 9-5 1-3-10h-7l-3 7h-4l2-7h-7l-2 4H6l-2-2v-7zm31-3h5v1h-5V8z" />
    </svg>
  );
};

const Play5v5Icon: React.FC = () => (
  <div className="relative flex items-center justify-center w-8 h-8 shrink-0 rounded-lg bg-amber-500/25 border border-amber-400">
    <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-300" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  </div>
);

const ShootingRangeIcon: React.FC = () => (
  <svg viewBox="0 0 56 44" className="w-7 h-6 shrink-0" fill="none">
    <rect x="4" y="6" width="44" height="28" rx="2" stroke="#cbd5e1" strokeWidth="1.8" fill="rgba(15,23,42,0.55)" />
    <line x1="4" y1="11" x2="48" y2="11" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="3 2" />
    <line x1="4" y1="29" x2="48" y2="29" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="3 2" />
    <path d="M11 19h7l2 1h6v-2h5v2h10v1.8H31l1 4.5h-3l-1-4.5h-5l-1.5 3.5h-2.5l1-3.5H11V19z" fill="#e2e8f0" />
  </svg>
);

const KillhouseTimerGaugeIcon: React.FC = () => (
  <svg viewBox="0 0 36 36" className="w-5 h-5 text-slate-200 shrink-0" fill="none">
    <path d="M15 4h6M18 4v3M25 7l2.5-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="18" cy="19" r="11" stroke="currentColor" strokeWidth="2" fill="rgba(15,23,42,0.5)" />
    <path d="M18 13v6l4 2.5" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AiBrainIcon: React.FC = () => (
  <div className="relative flex items-center justify-center w-7 h-6 shrink-0">
    <svg viewBox="0 0 44 40" className="w-6 h-5 relative z-10" fill="none">
      <path
        d="M14 28c-4.2 0-7.5-3.1-7.5-7 0-2.6 1.5-4.9 3.7-6.1C10.8 11 14.3 8 18.6 8c2.2 0 4.2.8 5.7 2.1C25.7 9.1 27.5 8.5 29.5 8.5c4.4 0 8 3.4 8 7.6 0 .6-.1 1.2-.2 1.8 2.1 1.2 3.5 3.4 3.5 5.9 0 3.8-3.2 6.8-7.2 6.8H14z"
        fill="#cbd5e1"
      />
      <text x="23" y="22.5" textAnchor="middle" fill="#1e1b2e" fontSize="10.5" fontWeight="900" fontFamily="monospace">
        AI
      </text>
    </svg>
  </div>
);

const DoubleChevronIcon: React.FC<{ colorClass: string }> = ({ colorClass }) => (
  <svg
    viewBox="0 0 24 24"
    className={`w-4 h-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 ${colorClass}`}
    fill="none"
  >
    <path d="M6 6l6 6-6 6M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const MainMenuPlayPanel: React.FC<MainMenuPlayPanelProps> = ({
  activeWeapon,
  weaponName,
  weaponCategory,
  weaponCaliber,
  onOpenWeaponSelect,
  onStartTraining,
  onStartDrill,
  onStartMatchmaking,
  onHover,
}) => {
  const [preferredArena, setPreferredArena] =
    useState<DrillMode>('DUST2_BOMB_5V5');

  const handleStartMatchmaking = () => {
    onStartMatchmaking(preferredArena);
  };

  return (
    <>
      <div className="flex flex-col gap-1.5 w-full max-w-[245px] sm:max-w-[270px] pointer-events-auto">
        {/* 1. ARMA SELECIONADA CARD */}
        <div
          onClick={onOpenWeaponSelect}
          onMouseEnter={onHover}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onOpenWeaponSelect();
          }}
          className="group relative w-full bg-[#131720]/88 hover:bg-[#181d28]/95 border border-white/15 hover:border-amber-400/60 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 text-left transition-all duration-150 cursor-pointer shadow-lg backdrop-blur-md"
        >
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[8px] font-mono font-bold tracking-wider uppercase text-amber-400">
              ARMA SELECIONADA
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <WeaponSilhouetteIcon weaponId={activeWeapon} />
              <span className="text-xs font-display font-black text-white group-hover:text-amber-200 transition-colors truncate tracking-wide">
                {weaponName}
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-400 truncate">
              {weaponCategory} · {weaponCaliber}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenWeaponSelect();
            }}
            className="px-2 py-1 rounded-md bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 hover:from-amber-300 hover:via-amber-400 hover:to-amber-500 text-slate-950 font-display font-black text-[9px] tracking-wider border border-white/40 shadow-xs transition-all shrink-0 cursor-pointer"
          >
            TROCAR &gt;
          </button>
        </div>

        {/* 2. BOTÃO JOGAR · BUSCAR PARTIDA ESTILO WARFACE (ENTRA DIRETO NO STANDER DE TIRO ENQUANTO BUSCA EM SEGUNDO PLANO) */}
        <div className="rounded-xl bg-gradient-to-r from-amber-500/30 via-amber-600/25 to-[#2a1e12]/90 border-2 border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.35)] backdrop-blur-md overflow-hidden">
          <button
            type="button"
            onMouseEnter={onHover}
            onClick={handleStartMatchmaking}
            className="group relative w-full px-3 py-2 flex items-center justify-between gap-2 text-left transition-all duration-150 cursor-pointer hover:bg-amber-500/15"
          >
            <div className="flex items-center gap-2.5 min-w-0 relative z-10">
              <Play5v5Icon />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-display font-black tracking-wider uppercase text-amber-300 group-hover:text-white transition-colors truncate drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]">
                    BUSCAR PARTIDA
                  </span>
                  <span className="px-1.5 py-[1px] text-[8px] font-mono font-black rounded bg-amber-400 text-slate-950 tracking-wider">
                    5 VS 5
                  </span>
                </div>
                <div className="text-[9px] font-mono text-slate-200 truncate">
                  Aqueça no Stander de Tiro na fila
                </div>
              </div>
            </div>

            <div className="relative z-10 flex items-center">
              <DoubleChevronIcon colorClass="text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.95)]" />
            </div>
          </button>

          {/* Seletor rápido de Arena 5v5 */}
          <div className="px-2.5 py-1 bg-black/45 border-t border-amber-400/25 flex items-center justify-between gap-1">
            <span className="text-[8px] font-mono uppercase tracking-wider text-slate-400">
              MAPA:
            </span>
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'DUST2_BOMB_5V5', label: 'DE_DUST2' },
                  { id: 'ASSAULT_BOMB_5V5', label: 'CS_ASSAULT' },
                ] as const
              ).map((arena) => {
                const isSelected = preferredArena === arena.id;
                return (
                  <button
                    key={arena.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreferredArena(arena.id);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-white/5 text-slate-300 hover:bg-white/15'
                    }`}
                  >
                    {arena.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. ESTANDE DE TIRO (LIVRE) */}
        <button
          type="button"
          onMouseEnter={onHover}
          onClick={onStartTraining}
          className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#3a2a14]/90 via-[#2b2218]/85 to-[#3d3327]/80 hover:from-[#4b3618]/95 hover:to-[#4a3d2d]/90 border border-amber-400/50 hover:border-amber-300 px-2.5 py-1.5 flex items-center justify-between gap-2 text-left transition-all duration-150 cursor-pointer shadow-md backdrop-blur-md"
        >
          <div className="flex items-center gap-2 min-w-0 relative z-10">
            <ShootingRangeIcon />
            <div className="min-w-0">
              <div className="text-xs font-display font-black tracking-wide uppercase text-amber-400 group-hover:text-amber-300 transition-colors truncate">
                ESTANDE DE TIRO (LIVRE)
              </div>
              <div className="text-[9px] text-slate-200/90 truncate">
                Treino balístico e armas liberadas
              </div>
            </div>
          </div>
          <DoubleChevronIcon colorClass="text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
        </button>

        {/* 4. INCURSÃO KILLHOUSE */}
        <button
          type="button"
          onMouseEnter={onHover}
          onClick={() => onStartDrill('KILLHOUSE_BLITZ')}
          className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#112a38]/90 via-[#162733]/85 to-[#22323c]/80 hover:from-[#163648]/95 hover:to-[#283c48]/90 border border-cyan-400/45 hover:border-cyan-300 px-2.5 py-1.5 flex items-center justify-between gap-2 text-left transition-all duration-150 cursor-pointer shadow-md backdrop-blur-md"
        >
          <div className="min-w-0 flex-1 relative z-10">
            <div className="text-xs font-display font-black tracking-wide uppercase text-white group-hover:text-cyan-200 transition-colors truncate">
              INCURSÃO KILLHOUSE
            </div>
            <div className="text-[9px] text-slate-200/90 truncate">
              Percurso CQB cronometrado
            </div>
          </div>
          <div className="relative z-10 flex items-center gap-1.5 shrink-0">
            <KillhouseTimerGaugeIcon />
            <DoubleChevronIcon colorClass="text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.85)]" />
          </div>
        </button>

        {/* 5. COMBATE CONTRA IA */}
        <button
          type="button"
          onMouseEnter={onHover}
          onClick={() => onStartDrill('TACTICAL_WAVE')}
          className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#3d161b]/90 via-[#2e161a]/85 to-[#3b2024]/80 hover:from-[#4f1b22]/95 hover:to-[#48262b]/90 border border-red-400/45 hover:border-red-300 px-2.5 py-1.5 flex items-center justify-between gap-2 text-left transition-all duration-150 cursor-pointer shadow-md backdrop-blur-md"
        >
          <div className="min-w-0 flex-1 relative z-10">
            <div className="text-xs font-display font-black tracking-wide uppercase text-[#ff6b6b] group-hover:text-red-300 transition-colors truncate">
              COMBATE CONTRA IA
            </div>
            <div className="text-[9px] text-slate-200/90 truncate">
              Incursão hostil com patrulhas
            </div>
          </div>
          <div className="relative z-10 flex items-center gap-1.5 shrink-0">
            <AiBrainIcon />
            <DoubleChevronIcon colorClass="text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.85)]" />
          </div>
        </button>
      </div>
    </>
  );
};
