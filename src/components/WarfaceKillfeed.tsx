import React from 'react';
import { KillfeedEntry, WeaponId } from '../types/game';

interface WarfaceKillfeedProps {
  entries: KillfeedEntry[];
}

/**
 * Ícones vetoriais fiéis em silhueta branca para cada arma do Warface
 */
const KillfeedWeaponIcon: React.FC<{
  weaponId: WeaponId | 'GRENADE' | 'KNIFE_TACTICAL';
  className?: string;
}> = ({ weaponId, className = 'h-3.5 w-auto' }) => {
  if (weaponId === 'GRENADE') {
    // Granada M67 fragmentação
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <circle cx="12" cy="14" r="7" fill="#ffffff" fillOpacity="0.85" />
        <rect x="10.5" y="4" width="3" height="3" rx="0.5" fill="#ffffff" />
        <path d="M12 4V2M10 2h4M8 6h3" />
      </svg>
    );
  }

  if (weaponId === 'KNIFE_TACTICAL') {
    // Faca tática militar
    return (
      <svg
        viewBox="0 0 28 12"
        fill="#ffffff"
        className={className}
      >
        <path d="M2 5h7v2H2zm8-1h2v4h-2zm3 0l11-2c1.5 2 1.5 4 0 6l-11-2v-2z" />
      </svg>
    );
  }

  if (weaponId === 'P50_PISTOL') {
    // Pistola Pesada .50
    return (
      <svg
        viewBox="0 0 32 18"
        fill="#ffffff"
        className={className}
      >
        <path d="M4 2h20v6h-4v2h-2v6h-5l-2-6H4V2z" />
        <rect x="23" y="4" width="4" height="2" />
      </svg>
    );
  }

  if (weaponId === 'SNIPER_BOLT' || weaponId === 'SNIPER_TACTICAL') {
    // Sniper com mira telescópica longa
    return (
      <svg
        viewBox="0 0 54 16"
        fill="#ffffff"
        className={className}
      >
        {/* Cano e receptor */}
        <rect x="2" y="7" width="48" height="2" />
        {/* Luneta */}
        <rect x="16" y="2" width="16" height="3" rx="0.5" />
        <rect x="19" y="5" width="2" height="2" />
        <rect x="27" y="5" width="2" height="2" />
        {/* Corpo e coronha */}
        <path d="M2 9l6 5h8l3-4h14v-2H2z" />
      </svg>
    );
  }

  if (weaponId === 'AK47_RIFLE') {
    // AK-47 / AK-103 icônica com carregador banana curvo
    return (
      <svg
        viewBox="0 0 48 16"
        fill="#ffffff"
        className={className}
      >
        {/* Cano e miras */}
        <rect x="30" y="6" width="16" height="2" />
        <rect x="42" y="4" width="2" height="2" />
        <rect x="30" y="5" width="2" height="1" />
        {/* Receptor e gas block */}
        <rect x="18" y="5" width="14" height="4" />
        {/* Coronha de madeira/polímero */}
        <path d="M2 8l10-2v5l-8 3H2V8z" />
        {/* Carregador curvo banana mag */}
        <path d="M22 9c1 3 3 5 5 6l2-1c-2-2-3-4-4-5h-3z" />
        {/* Empunhadura pistola */}
        <path d="M14 9l-2 5h3l2-5h-3z" />
      </svg>
    );
  }

  // M4A1 / Carabina / L49 LMG Padrão
  return (
    <svg
      viewBox="0 0 46 16"
      fill="#ffffff"
      className={className}
    >
      <rect x="26" y="6" width="18" height="2" />
      <rect x="40" y="4" width="2" height="2" />
      <rect x="14" y="3" width="14" height="2" />
      <rect x="14" y="5" width="16" height="4" />
      <path d="M2 7l10-1v4l-6 3H2V7z" />
      <rect x="22" y="9" width="3" height="6" />
      <path d="M13 9l-2 5h3l2-5h-3z" />
    </svg>
  );
};

/**
 * Ícone clássico de Headshot do Warface (Caveira com mira vermelha/branca)
 */
const WarfaceHeadshotIcon: React.FC<{ className?: string }> = ({
  className = 'w-3.5 h-3.5',
}) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    className={`${className} shrink-0`}
  >
    {/* Crânio tático */}
    <circle cx="10" cy="8" r="5" fill="#ef4444" />
    <rect x="8" y="11" width="4" height="3" rx="1" fill="#ef4444" />
    {/* Órbitas oculares */}
    <circle cx="8" cy="7.5" r="1.2" fill="#0f172a" />
    <circle cx="12" cy="7.5" r="1.2" fill="#0f172a" />
    {/* Retículo de mira de precisão */}
    <circle
      cx="10"
      cy="8"
      r="7.5"
      stroke="#ffffff"
      strokeWidth="1.2"
      strokeDasharray="2.5 1.5"
    />
    <line x1="10" y1="0.5" x2="10" y2="4" stroke="#ffffff" strokeWidth="1.4" />
    <line x1="10" y1="12" x2="10" y2="15.5" stroke="#ffffff" strokeWidth="1.4" />
    <line x1="2.5" y1="8" x2="6" y2="8" stroke="#ffffff" strokeWidth="1.4" />
    <line x1="14" y1="8" x2="17.5" y2="8" stroke="#ffffff" strokeWidth="1.4" />
  </svg>
);

export const WarfaceKillfeed: React.FC<WarfaceKillfeedProps> = ({ entries }) => {
  if (!entries || entries.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-[152px] sm:top-[162px] right-2 sm:right-3.5 z-35 pointer-events-none flex flex-col items-end gap-1 font-mono select-none"
    >
      {entries.slice(-5).map((entry) => {
        const isKillerBlue = entry.killerTeam === 'VANGUARD';
        const isVictimBlue = entry.victimTeam === 'VANGUARD';

        return (
          <div
            key={entry.id}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/75 backdrop-blur-xs border transition-all duration-300 animate-in fade-in slide-in-from-right-4 shadow-md ${
              entry.killerName === 'VOCÊ'
                ? 'border-sky-400/70 shadow-[0_0_12px_rgba(56,189,248,0.35)]'
                : 'border-white/15'
            }`}
          >
            {/* Nome do Atirador (Azul para Vanguard, Vermelho para Blackthorn) */}
            <span
              className={`text-[11px] sm:text-xs font-display font-black tracking-wide truncate max-w-[110px] ${
                isKillerBlue
                  ? 'text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.5)]'
                  : 'text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]'
              }`}
            >
              {entry.killerName}
            </span>

            {/* Silhueta da Arma Usada */}
            <div className="flex items-center px-1 py-0.5 bg-white/10 rounded">
              <KillfeedWeaponIcon
                weaponId={entry.weaponId}
                className="h-3 sm:h-3.5 w-auto text-white"
              />
            </div>

            {/* Ícone de Tiro na Cabeça (Se foi Headshot) */}
            {entry.isHeadshot && <WarfaceHeadshotIcon className="w-3.5 h-3.5" />}

            {/* Nome da Vítima (Vermelho se inimigo, Azul se aliado) */}
            <span
              className={`text-[11px] sm:text-xs font-display font-black tracking-wide truncate max-w-[110px] ${
                isVictimBlue
                  ? 'text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.5)]'
                  : 'text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]'
              }`}
            >
              {entry.victimName}
            </span>
          </div>
        );
      })}
    </div>
  );
};
