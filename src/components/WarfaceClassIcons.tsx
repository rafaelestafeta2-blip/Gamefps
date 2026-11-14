import React from 'react';

export type WarfaceClassId =
  | 'FUZILEIRO'
  | 'MEDICO'
  | 'ENGENHEIRO'
  | 'FRANCO_ATIRADOR';

export const WARFACE_CLASS_META: Record<
  WarfaceClassId,
  { label: string; shortLabel: string; accentHex: string; roleDesc: string; assetPath: string }
> = {
  FUZILEIRO: {
    label: 'FUZILEIRO',
    shortLabel: 'ASSAULT',
    accentHex: '#f59e0b',
    roleDesc: 'Linha de Frente & Supressão',
    assetPath: '/assets/aistudio/images__1__5d936377.png',
  },
  MEDICO: {
    label: 'MÉDICO',
    shortLabel: 'MEDIC',
    accentHex: '#10b981',
    roleDesc: 'Suporte & Reanimação Tática',
    assetPath: '/assets/aistudio/warface-class-icons-medic-png-icon_6e7870ce.jpg',
  },
  ENGENHEIRO: {
    label: 'ENGENHEIRO',
    shortLabel: 'ENGINEER',
    accentHex: '#38bdf8',
    roleDesc: 'Especialista em Explosivos C4',
    assetPath: '/assets/aistudio/images_509bc030.png',
  },
  FRANCO_ATIRADOR: {
    label: 'FRANCO-ATIRADOR',
    shortLabel: 'RECON / SNIPER',
    accentHex: '#f43f5e',
    roleDesc: 'Precisão a Longa Distância',
    assetPath: '/assets/aistudio/warface-class-icons-sniper-png-icon_589d4325.jpg',
  },
};

/**
 * 1. FUZILEIRO (Rifleman / Assault):
 * Moldura octogonal quadrada com os 4 cantos chanfrados a 45º + 3 cartuchos de munição de fuzil em paralelo.
 */
const RiflemanVectorIcon: React.FC<{ color?: string; className?: string }> = ({
  color = '#f59e0b',
  className = 'w-6 h-6',
}) => {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none">
      {/* Moldura Octogonal Chanfrada Exata */}
      <path
        d="M 28 14 L 72 14 L 86 28 L 86 72 L 72 86 L 28 86 L 14 72 L 14 28 Z"
        stroke={color}
        strokeWidth="6.5"
        strokeLinejoin="miter"
      />
      {/* 3 Balas de Fuzil Perfiladas Lado a Lado */}
      {[36.5, 50.0, 63.5].map((cx, i) => (
        <path
          key={i}
          d={`
            M ${cx - 4.5} 44
            C ${cx - 4.5} 36.5 ${cx - 1.8} 30.5 ${cx} 29.5
            C ${cx + 1.8} 30.5 ${cx + 4.5} 36.5 ${cx + 4.5} 44
            L ${cx + 4.5} 67
            L ${cx + 3.2} 67
            L ${cx + 3.2} 68.5
            L ${cx + 4.5} 68.5
            L ${cx + 4.5} 71
            L ${cx - 4.5} 71
            L ${cx - 4.5} 68.5
            L ${cx - 3.2} 68.5
            L ${cx - 3.2} 67
            L ${cx - 4.5} 67
            Z
          `}
          fill={color}
        />
      ))}
    </svg>
  );
};

/**
 * 2. MÉDICO (Medic):
 * Moldura circular perfeita + Estrela da Vida (6 braços cortados) com a Vara de Esculápio (haste e serpente enrolada).
 */
const MedicVectorIcon: React.FC<{ color?: string; className?: string }> = ({
  color = '#10b981',
  className = 'w-6 h-6',
}) => {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none">
      {/* Moldura Circular Perfeita */}
      <circle cx="50" cy="50" r="37" stroke={color} strokeWidth="6.5" />

      {/* Estrela da Vida (Star of Life) com 6 braços */}
      <g fill={color}>
        {/* Braço Vertical */}
        <rect x="43.5" y="23" width="13" height="54" rx="1" />
        {/* Braço Diagonal +60 graus */}
        <rect
          x="43.5"
          y="23"
          width="13"
          height="54"
          rx="1"
          transform="rotate(60 50 50)"
        />
        {/* Braço Diagonal -60 graus */}
        <rect
          x="43.5"
          y="23"
          width="13"
          height="54"
          rx="1"
          transform="rotate(-60 50 50)"
        />
      </g>

      {/* Bastão de Esculápio (Vara vertical) */}
      <rect x="48.5" y="27" width="3" height="46" rx="1.5" fill="#ffffff" />

      {/* Serpente Enrolada em Espiral sobre o Bastão */}
      <path
        d="M 50 28 C 45 30 46 36 50 37 C 54 38 54 44 50 45 C 46 46 46 52 50 53 C 54 54 54 60 50 61 C 47 62 48 68 50 71"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Cabeça da serpente no topo */}
      <circle cx="49" cy="28" r="2" fill="#ffffff" />
    </svg>
  );
};

/**
 * 3. ENGENHEIRO (Engineer):
 * Moldura em diamante (losango a 45º) com cantos chanfrados + Engrenagem industrial mecânica de 8 dentes com furo central.
 */
const EngineerVectorIcon: React.FC<{ color?: string; className?: string }> = ({
  color = '#38bdf8',
  className = 'w-6 h-6',
}) => {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none">
      {/* Moldura em Diamante Chanfrado (Octógono Inclinado) */}
      <path
        d="M 44 14 L 56 14 L 86 44 L 86 56 L 56 86 L 44 86 L 14 56 L 14 44 Z"
        stroke={color}
        strokeWidth="6.5"
        strokeLinejoin="miter"
      />

      {/* Engrenagem Mecânica de 8 Dentes */}
      <g transform="translate(50, 50)" fill={color}>
        {/* Corpo Circular Principal */}
        <circle cx="0" cy="0" r="17.5" />
        {/* 8 Dentes Trapezoidais Perfeitos (a cada 45 graus) */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <path
            key={angle}
            d="M -4.2 -17 L -3.2 -24 L 3.2 -24 L 4.2 -17 Z"
            transform={`rotate(${angle})`}
          />
        ))}
        {/* Furo Central Circular Concêntrico */}
        <circle cx="0" cy="0" r="6.8" fill="#08101a" />
      </g>
    </svg>
  );
};

/**
 * 4. FRANCO-ATIRADOR (Sniper / Recon):
 * Moldura triangular truncada (topo e cantos cortados) + Retícula de mira telescópica com anéis concêntricos e cruz de mira.
 */
const SniperVectorIcon: React.FC<{ color?: string; className?: string }> = ({
  color = '#f43f5e',
  className = 'w-6 h-6',
}) => {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none">
      {/* Moldura Triangular Truncada (Com topo e cantos inferiores cortados) */}
      <path
        d="M 43 16 L 57 16 L 86 76 L 81 84 L 19 84 L 14 76 Z"
        stroke={color}
        strokeWidth="6.5"
        strokeLinejoin="miter"
      />

      {/* Retícula de Mira Telescópica Central */}
      <g transform="translate(50, 58)">
        {/* Anel Externo */}
        <circle cx="0" cy="0" r="18.5" stroke={color} strokeWidth="4.2" />
        {/* Anel Intermediário */}
        <circle cx="0" cy="0" r="11.2" stroke={color} strokeWidth="3.6" />
        {/* Ponto / Anel Central */}
        <circle cx="0" cy="0" r="4.6" stroke={color} strokeWidth="3.2" />

        {/* Cruz de Mira Dividindo os Anéis em 4 Quadrantes */}
        <g stroke={color} strokeWidth="3.2" strokeLinecap="square">
          {/* Vertical Superior */}
          <line x1="0" y1="-19" x2="0" y2="-11" />
          {/* Vertical Inferior */}
          <line x1="0" y1="11" x2="0" y2="19" />
          {/* Horizontal Esquerda */}
          <line x1="-19" y1="0" x2="-11" y2="0" />
          {/* Horizontal Direita */}
          <line x1="11" y1="0" x2="19" y2="0" />
        </g>
      </g>
    </svg>
  );
};

/**
 * Componente principal WarfaceClassIcon:
 * Renderiza o ícone oficial idêntico ao Warface, com vetor SVG de alta fidelidade
 * e suporte à cor temática da classe ou cor customizada.
 */
export const WarfaceClassIcon: React.FC<{
  classId: WarfaceClassId;
  className?: string;
  color?: string;
  useBitmapAsset?: boolean;
}> = ({ classId, className = 'w-6 h-6', color, useBitmapAsset = false }) => {
  const meta = WARFACE_CLASS_META[classId];
  const activeColor = color || meta.accentHex;

  if (useBitmapAsset) {
    return (
      <img
        src={meta.assetPath}
        alt={meta.label}
        className={`${className} object-contain rounded-xs drop-shadow-md`}
        referrerPolicy="no-referrer"
      />
    );
  }

  switch (classId) {
    case 'FUZILEIRO':
      return <RiflemanVectorIcon color={activeColor} className={className} />;
    case 'MEDICO':
      return <MedicVectorIcon color={activeColor} className={className} />;
    case 'ENGENHEIRO':
      return <EngineerVectorIcon color={activeColor} className={className} />;
    case 'FRANCO_ATIRADOR':
      return <SniperVectorIcon color={activeColor} className={className} />;
  }
};

export const VanguardTeamEmblem: React.FC<{ className?: string }> = ({
  className = 'w-9 h-9',
}) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    <defs>
      <linearGradient id="vg-shield" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#e0f2fe" />
        <stop offset="50%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
    </defs>
    <path
      d="M24 3 L42 10 V24 C42 35 34 42 24 45 C14 42 6 35 6 24 V10 L24 3 Z"
      fill="#081a2c"
      stroke="url(#vg-shield)"
      strokeWidth="2.8"
    />
    <path
      d="M24 8 L37 13 V23.5 C37 31.5 31 37 24 39.8 C17 37 11 31.5 11 23.5 V13 L24 8 Z"
      stroke="#7dd3fc"
      strokeOpacity="0.45"
      strokeWidth="1.2"
    />
    <polygon points="15,15 24,35 33,15 28.5,15 24,26 19.5,15" fill="url(#vg-shield)" />
  </svg>
);

export const BlackthornTeamEmblem: React.FC<{ className?: string }> = ({
  className = 'w-9 h-9',
}) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    <defs>
      <linearGradient id="bt-spear" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fecdd3" />
        <stop offset="50%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#991b1b" />
      </linearGradient>
    </defs>
    <polygon points="24,2 29,18 24,46 19,18" fill="url(#bt-spear)" />
    <path d="M11 20 L24 14 L37 20 L29 23 L24 19 L19 23 Z" fill="#f87171" />
    <path d="M14 27 L24 23 L34 27 L24 26 Z" fill="#fecaca" />
    <circle cx="24" cy="18" r="2.5" fill="#fff1f2" />
  </svg>
);

export const OperatorTacticalAvatar: React.FC<{
  team: 'VANGUARD' | 'BLACKTHORN';
  classId: WarfaceClassId;
  photoUrl?: string;
}> = ({ team, classId, photoUrl }) => {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover"
      />
    );
  }

  const isVanguard = team === 'VANGUARD';
  const visorColor = isVanguard
    ? classId === 'MEDICO'
      ? '#34d399'
      : '#38bdf8'
    : classId === 'ENGENHEIRO'
      ? '#4ade80'
      : '#ef4444';

  return (
    <svg viewBox="0 0 88 54" className="w-full h-full object-cover" fill="none">
      <defs>
        <linearGradient
          id={`bg-${team}-${classId}`}
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop offset="0%" stopColor={isVanguard ? '#0f2942' : '#311018'} />
          <stop offset="100%" stopColor="#070a10" />
        </linearGradient>
      </defs>
      <rect width="88" height="54" fill={`url(#bg-${team}-${classId})`} />
      <path
        d="M8 54 C11 39 23 34 40 34 C57 34 69 39 72 54 Z"
        fill={isVanguard ? '#1e293b' : '#27171c'}
        stroke={isVanguard ? '#475569' : '#7f1d1d'}
        strokeWidth="1.4"
      />
      <path
        d="M27 22 C27 12 33 7 40 7 C47 7 53 12 53 22 C53 29 48 35 40 35 C32 35 27 29 27 22 Z"
        fill={isVanguard ? '#0f172a' : '#18181b'}
        stroke={isVanguard ? '#64748b' : '#991b1b'}
        strokeWidth="1.5"
      />
      <rect
        x="31"
        y="17"
        width="18"
        height="5.5"
        rx="2.5"
        fill={visorColor}
      />
      <path
        d={
          isVanguard
            ? 'M45 43 L82 36 L82 40 L48 48 Z'
            : 'M6 36 L43 43 L40 48 L6 40 Z'
        }
        fill="#090d14"
        stroke={visorColor}
        strokeOpacity="0.55"
        strokeWidth="1"
      />
    </svg>
  );
};
