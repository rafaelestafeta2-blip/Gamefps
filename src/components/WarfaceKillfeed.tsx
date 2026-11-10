import React, { useEffect, useState } from 'react';
import { KillfeedEntry, WeaponId } from '../types/game';

interface WarfaceKillfeedProps {
  entries: KillfeedEntry[];
}

export const KILLFEED_DURATION_MS = 4500;

/**
 * Silhuetas brancas horizontais idênticas ao Killfeed do Warface (AK-103, M4A1, Sniper, Pistola, Faca e Granada)
 */
const KillfeedWeaponIcon: React.FC<{
  weaponId: WeaponId | 'GRENADE' | 'KNIFE_TACTICAL';
  className?: string;
}> = ({ weaponId, className = 'h-3.5 w-auto' }) => {
  if (weaponId === 'GRENADE') {
    return (
      <svg
        viewBox="0 0 24 20"
        fill="#ffffff"
        className={`${className} drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]`}
      >
        <circle cx="12" cy="12" r="6" />
        <rect x="10.2" y="3.5" width="3.6" height="2.8" rx="0.5" />
        <path
          d="M10 3.5h6l2 3.5"
          stroke="#ffffff"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
    );
  }

  if (weaponId === 'KNIFE_TACTICAL') {
    return (
      <svg
        viewBox="0 0 36 12"
        fill="#ffffff"
        className={`${className} drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]`}
      >
        <path d="M2 5h8v2.4H2zm9-1.5h2v5.4h-2zm2.5 0.5h15l5.5 2.2-4.5 2.3H13.5V4z" />
      </svg>
    );
  }

  if (weaponId === 'P50_PISTOL') {
    return (
      <svg
        viewBox="0 0 34 18"
        fill="#ffffff"
        className={`${className} drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]`}
      >
        <path d="M4 3h21v4.8h-5.5l-1.5 2.2h-3.5l-2.4 6.2H7.2l1.8-6.2H4V3z" />
        <rect x="25" y="4.2" width="3.5" height="2" />
      </svg>
    );
  }

  if (weaponId === 'SNIPER_BOLT' || weaponId === 'SNIPER_TACTICAL') {
    return (
      <svg
        viewBox="0 0 62 16"
        fill="#ffffff"
        className={`${className} drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]`}
      >
        {/* Cano longo + freio de boca */}
        <rect x="26" y="6.8" width="32" height="1.8" />
        <rect x="57" y="6.1" width="3.5" height="3.2" />
        {/* Luneta telescópica */}
        <path d="M18 2.2h17l2 1.2v1.2l-2 1.2H18l-1.5-0.8V3z" />
        <rect x="21" y="5.5" width="2" height="1.6" />
        <rect x="30" y="5.5" width="2" height="1.6" />
        {/* Corpo, coronha e carregador */}
        <path d="M2 7.5l10-0.8h22v3.2H19l-2.5 4.2h-3l1.2-4.2-4.2 2.8H2V7.5z" />
        <rect x="24" y="10.5" width="4.5" height="3.5" />
      </svg>
    );
  }

  if (weaponId === 'AK47_RIFLE') {
    // Silhueta fiel da AK-103 / AK-47 da imagem de referência (cano, tubo de gás, alça de mira, coronha e carregador curvo banana)
    return (
      <svg
        viewBox="0 0 58 16"
        fill="#ffffff"
        className={`${className} drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]`}
      >
        {/* Coronha fixa inclinada */}
        <path d="M2 7.2L13.5 6v3.6L4.5 12.8H2V7.2z" />
        {/* Receptor principal + tampa do ferrolho */}
        <path d="M13.5 5.4h17.5l1.2 1v3.4H13.5V5.4z" />
        {/* Guarda-mão + tubo de gás */}
        <rect x="31" y="5.6" width="9.5" height="3.2" rx="0.4" />
        {/* Cano + bloco de gás + massa de mira frontal AK */}
        <rect x="40.5" y="6.8" width="14" height="1.5" />
        <path d="M40.5 5.6h3l1.2 1.2h-4.2V5.6z" />
        <path d="M51.5 4.2h2.2v2.8h-2.2V4.2z" />
        <rect x="54" y="6.4" width="3" height="2.2" />
        {/* Empunhadura pistola */}
        <path d="M15.5 9.6h3.2l-1.8 4.8h-2.8l1.4-4.8z" />
        {/* Carregador curvo icônico da AK */}
        <path d="M24.5 9.6h4.2c0.8 2.5 2.4 4.5 4.6 5.6l-2.6 1.1c-2.6-1.4-4.6-3.6-6.2-6.7z" />
      </svg>
    );
  }

  // M4A1 / Carabina / SMG / LMG com mira acoplada (idêntica à segunda linha da imagem)
  return (
    <svg
      viewBox="0 0 56 16"
      fill="#ffffff"
      className={`${className} drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]`}
    >
      {/* Coronha tática retrátil */}
      <path d="M2 6.4h10.5v3.4L5 12.2H2V6.4z" />
      {/* Óptica / Red Dot no trilho superior */}
      <path d="M18.5 2.8h6.5l1 2.4h-8.5l1-2.4z" />
      {/* Receptor e guarda-mão RIS */}
      <rect x="12.5" y="5.2" width="25" height="4" rx="0.5" />
      {/* Cano e quebra-chamas */}
      <rect x="37.5" y="6.6" width="15" height="1.6" />
      <path d="M46 4.4h2v2.2h-2V4.4z" />
      <rect x="52" y="6.2" width="3" height="2.4" />
      {/* Empunhadura */}
      <path d="M14.5 9.2h3l-1.6 4.8h-2.8l1.4-4.8z" />
      {/* Carregador STANAG */}
      <path d="M23.5 9.2h4l1.6 5.8h-3.8l-1.8-5.8z" />
    </svg>
  );
};

/**
 * Ícone idêntico de Tiro na Cabeça (Headshot) do Warface conforme a imagem de referência:
 * Silhueta branca de cabeça/crânio atravessada horizontalmente por um rastro de projétil
 * com explosão cinética de estilhaços à direita.
 */
const WarfaceHeadshotIcon: React.FC<{ className?: string }> = ({
  className = 'h-4 w-auto',
}) => (
  <svg
    viewBox="0 0 34 18"
    fill="none"
    className={`${className} shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.98)]`}
  >
    {/* Rastro horizontal do projétil entrando pela esquerda */}
    <path d="M0.5 8.8L8.5 8.2V9.6L0.5 8.8Z" fill="#ffffff" />
    <line
      x1="0"
      y1="8.9"
      x2="31"
      y2="8.9"
      stroke="#ffffff"
      strokeWidth="1.3"
    />

    {/* Silhueta branca da cabeça / crânio humano no centro */}
    <path
      d="M10.5 4.2C10.5 2.1 12.4 0.8 14.8 0.8C17.3 0.8 19.2 2.3 19.4 4.8C19.5 6.2 19.1 7.6 18.6 8.8L19.4 10.4L18.1 11.4L17.8 13.6L15.2 14.2L14.6 16.5H11.2L11.6 12.8C10.7 11.6 10.2 9.8 10.3 7.8C10.3 6.5 10.4 5.2 10.5 4.2Z"
      fill="#ffffff"
    />

    {/* Cavidade de impacto escuro dentro do crânio onde a bala atravessa */}
    <polygon points="13.5,7.6 19.2,6.4 19.5,10.8 13.5,9.6" fill="#090d14" />

    {/* Explosão / Estilhaços cinéticos saindo da direita da cabeça (idêntico ao print) */}
    <polygon points="18.2,6.8 27.5,3.2 22.8,7.9" fill="#ffffff" />
    <polygon points="18.8,8.5 32.5,7.4 25.4,9.8" fill="#ffffff" />
    <polygon points="18.2,9.8 29.2,12.8 22.2,11.2" fill="#ffffff" />
    <polygon points="17.5,11.0 24.5,15.5 19.8,12.6" fill="#ffffff" />
    <circle cx="27.8" cy="5.6" r="0.9" fill="#ffffff" />
    <circle cx="30.4" cy="10.5" r="0.8" fill="#ffffff" />
  </svg>
);

export const WarfaceKillfeed: React.FC<WarfaceKillfeedProps> = ({ entries }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!entries || entries.length === 0) return;
    setNow(Date.now());
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 200);
    return () => window.clearInterval(interval);
  }, [entries]);

  const activeEntries = (entries || [])
    .filter((entry) => now - entry.timestamp < KILLFEED_DURATION_MS)
    .slice(-5);

  if (activeEntries.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-[148px] sm:top-[158px] right-2.5 sm:right-4 z-35 pointer-events-none flex flex-col items-end gap-0.5 select-none"
    >
      {activeEntries.map((entry) => {
        const ageMs = now - entry.timestamp;
        const remainingMs = Math.max(0, KILLFEED_DURATION_MS - ageMs);
        const opacity =
          remainingMs < 650 ? Math.max(0, remainingMs / 650) : 1;

        const isKillerLocalPlayer =
          entry.killerName === 'VOCÊ' || entry.killerName === 'Killer 18Br';
        const isKillerVanguard = entry.killerTeam === 'VANGUARD';
        const isVictimVanguard = entry.victimTeam === 'VANGUARD';

        // Cores fiéis ao Warface: Jogador/Aliado em Branco/Azul-Ciano e Inimigo em Vermelho vivo
        const killerColorClass = isKillerLocalPlayer
          ? 'text-[#38bdf8]'
          : isKillerVanguard
            ? 'text-[#f8fafc]'
            : 'text-[#ef4444]';

        const victimColorClass = isVictimVanguard
          ? 'text-[#93c5fd]'
          : 'text-[#ef4444]';

        return (
          <div
            key={entry.id}
            style={{ opacity }}
            className="flex items-center justify-end gap-1.5 px-2 py-0.5 rounded-xs bg-gradient-to-l from-black/55 via-black/30 to-transparent transition-opacity duration-150"
          >
            {/* Nome de quem matou */}
            <span
              className={`text-[11px] sm:text-[12px] font-sans font-bold tracking-tight truncate max-w-[125px] drop-shadow-[0_1px_3px_rgba(0,0,0,0.98)] ${killerColorClass}`}
            >
              {entry.killerName}
            </span>

            {/* Silhueta branca da arma + Ícone de Tiro na Cabeça colado à direita da arma */}
            <div className="flex items-center gap-0.5">
              <KillfeedWeaponIcon
                weaponId={entry.weaponId}
                className="h-3 sm:h-3.5 w-auto"
              />
              {entry.isHeadshot && (
                <WarfaceHeadshotIcon className="h-3.5 sm:h-4 w-auto -ml-0.5" />
              )}
            </div>

            {/* Nome da vítima */}
            <span
              className={`text-[11px] sm:text-[12px] font-sans font-bold tracking-tight truncate max-w-[125px] drop-shadow-[0_1px_3px_rgba(0,0,0,0.98)] ${victimColorClass}`}
            >
              {entry.victimName}
            </span>
          </div>
        );
      })}
    </div>
  );
};
