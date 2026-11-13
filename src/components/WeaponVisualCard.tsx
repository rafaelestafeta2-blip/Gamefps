import React from 'react';
import { getRequiredXpForWeapon } from '../progression/ranks';
import { useWeaponThumbnail3D } from '../three/weaponThumbnail3D';
import { WeaponId } from '../types/game';

interface WeaponVisualCardProps {
  weaponId: WeaponId;
  unlocked: boolean;
  isEquipped: boolean;
}

export const WEAPON_REAL_META: Record<
  WeaponId,
  { name: string; caliber: string; category: string; unlockLevel: number }
> = {
  KNIFE_TACTICAL: {
    name: 'KARAMBIT TÁTICA',
    caliber: 'Aço Carbono',
    category: 'Corpo a Corpo',
    unlockLevel: 1,
  },
  P50_PISTOL: {
    name: 'MARK 23 TÁTICA',
    caliber: '.45 ACP',
    category: 'Pistola Pesada',
    unlockLevel: 1,
  },
  M4_CARBINE: {
    name: 'M4A1 SOPMOD',
    caliber: '5.56x45mm NATO',
    category: 'Fuzil de Assalto',
    unlockLevel: 1,
  },
  SMG_45: {
    name: 'VECTOR .45 SUB',
    caliber: '.45 ACP',
    category: 'Submetralhadora',
    unlockLevel: 1,
  },
  SMG_MP5: {
    name: 'MP5A3 TÁTICA',
    caliber: '9x19mm Parabellum',
    category: 'Submetralhadora',
    unlockLevel: 4,
  },
  SHOTGUN_12: {
    name: 'M870 BREACHER 12GA',
    caliber: 'Calibre 12 Buckshot',
    category: 'Escopeta Pump 12GA',
    unlockLevel: 1,
  },
  SHOTGUN_SPAS: {
    name: 'SPAS-12 TÁTICA',
    caliber: 'Calibre 12 Magnum',
    category: 'Escopeta Semiautomática',
    unlockLevel: 6,
  },
  AK47_RIFLE: {
    name: 'AK-47 COMANDO',
    caliber: '7.62x39mm',
    category: 'Fuzil de Assalto',
    unlockLevel: 6,
  },
  AK12_RIFLE: {
    name: 'AK-12 SPETSNAZ',
    caliber: '5.45x39mm',
    category: 'Fuzil de Assalto',
    unlockLevel: 1,
  },
  CARBINE_AR: {
    name: 'HK416 CQB',
    caliber: '5.56x45mm NATO',
    category: 'Carabina Tática',
    unlockLevel: 10,
  },
  L49_LMG: {
    name: 'L49 SAW 100R',
    caliber: '5.56x45mm NATO',
    category: 'Metralhadora Leve',
    unlockLevel: 14,
  },
  SNIPER_TACTICAL: {
    name: 'M110 SASS S&B',
    caliber: '.308 Winchester',
    category: 'Sniper Tática',
    unlockLevel: 18,
  },
  SNIPER_BOLT: {
    name: 'AWP BOLT-ACTION',
    caliber: '.338 Lapua Mag',
    category: 'Sniper Pesada',
    unlockLevel: 25,
  },
};

export const WeaponIllustration2D: React.FC<{
  weaponId: WeaponId;
  className?: string;
  locked?: boolean;
}> = ({ weaponId, className = 'w-full h-12', locked = false }) => {
  const color = locked ? '#475569' : '#e2e8f0';

  if (weaponId === 'KNIFE_TACTICAL') {
    return (
      <svg viewBox="0 0 100 36" fill="none" className={className}>
        <path
          d="M32 14 C48 13, 76 14, 88 17 C92 18, 93 19, 93 20 C87 23, 68 25, 52 24 C40 23, 32 20, 32 14 Z"
          fill={locked ? '#334155' : '#94a3b8'}
          stroke={color}
          strokeWidth="1.2"
        />
        <path d="M46 16 C60 16, 74 17, 82 18.5" stroke={locked ? '#475569' : '#cbd5e1'} strokeWidth="0.8" />
        <rect x="28" y="11" width="4" height="15" rx="1" fill={locked ? '#1e293b' : '#f59e0b'} />
        <path d="M12 14 L28 14 L28 22 L14 22 C11 20, 10 16, 12 14 Z" fill={locked ? '#0f172a' : '#1e293b'} stroke={color} strokeWidth="1" />
        <circle cx="8" cy="18" r="4.5" fill="none" stroke={color} strokeWidth="2" />
      </svg>
    );
  }

  if (weaponId === 'P50_PISTOL') {
    return (
      <svg viewBox="0 0 100 40" fill="none" className={className}>
        <rect x="22" y="10" width="56" height="11" rx="1.5" fill={locked ? '#334155' : '#475569'} stroke={color} strokeWidth="1.4" />
        <rect x="76" y="13" width="6" height="4.5" fill={locked ? '#1e293b' : '#334155'} />
        <rect x="24" y="11" width="10" height="2" fill={locked ? '#1e293b' : '#1e293b'} />
        <rect x="52" y="12" width="11" height="5" fill={locked ? '#1e293b' : '#1e293b'} />
        <path d="M34 21 L48 21 L42 37 L30 37 L34 21 Z" fill={locked ? '#1e293b' : '#1e293b'} stroke={color} strokeWidth="1.2" />
        <path d="M44 21 C48 24, 46 29, 42 30" stroke={color} strokeWidth="1.2" fill="none" />
      </svg>
    );
  }

  if (weaponId === 'AK47_RIFLE' || weaponId === 'AK12_RIFLE') {
    return (
      <svg viewBox="0 0 120 40" fill="none" className={className}>
        <path d="M8 18 L26 16 L28 26 L8 28 Z" fill={locked ? '#334155' : '#78350f'} stroke={color} strokeWidth="1.2" />
        <rect x="26" y="16" width="38" height="11" fill={locked ? '#1e293b' : '#334155'} stroke={color} strokeWidth="1.2" />
        <rect x="64" y="17" width="28" height="7" rx="1" fill={locked ? '#334155' : '#92400e'} stroke={color} strokeWidth="1" />
        <rect x="92" y="18" width="22" height="4" fill={locked ? '#1e293b' : '#475569'} stroke={color} strokeWidth="1" />
        <path d="M42 27 C46 33, 44 38, 36 40 L32 39 C38 36, 40 32, 38 27 Z" fill={locked ? '#1e293b' : '#b45309'} stroke={color} strokeWidth="1" />
        <path d="M34 27 L38 37 L32 37 L30 27 Z" fill={locked ? '#0f172a' : '#1e293b'} />
      </svg>
    );
  }

  if (weaponId === 'SNIPER_BOLT' || weaponId === 'SNIPER_TACTICAL') {
    return (
      <svg viewBox="0 0 130 40" fill="none" className={className}>
        <rect x="42" y="5" width="34" height="6.5" rx="1.5" fill={locked ? '#1e293b' : '#0284c7'} stroke={color} strokeWidth="1" />
        <line x1="48" y1="11.5" x2="48" y2="15" stroke={color} strokeWidth="1.6" />
        <line x1="68" y1="11.5" x2="68" y2="15" stroke={color} strokeWidth="1.6" />
        <path d="M8 17 L30 15 L32 26 L12 28 Z" fill={locked ? '#334155' : '#334155'} stroke={color} strokeWidth="1.2" />
        <rect x="30" y="15" width="46" height="10" fill={locked ? '#1e293b' : '#475569'} stroke={color} strokeWidth="1.2" />
        <rect x="76" y="17" width="48" height="4.5" fill={locked ? '#334155' : '#64748b'} stroke={color} strokeWidth="1" />
        <rect x="122" y="15.5" width="6" height="7.5" rx="1" fill={locked ? '#1e293b' : '#f59e0b'} />
        <rect x="46" y="25" width="10" height="9" fill={locked ? '#1e293b' : '#1e293b'} stroke={color} strokeWidth="1" />
        <path d="M36 25 L40 36 L34 36 L32 25 Z" fill={locked ? '#0f172a' : '#1e293b'} stroke={color} strokeWidth="1" />
      </svg>
    );
  }

  if (weaponId === 'SHOTGUN_12' || weaponId === 'SHOTGUN_SPAS') {
    const isSpas = weaponId === 'SHOTGUN_SPAS';
    return (
      <svg viewBox="0 0 130 40" fill="none" className={className}>
        {/* Coronha & Punho */}
        <path
          d="M8 21 L26 17 L30 24 L24 34 L17 34 L21 25 L8 29 Z"
          fill={locked ? '#1e293b' : '#262b34'}
          stroke={color}
          strokeWidth="1.2"
        />
        {/* Receptor + 4 cartuchos vermelhos 12GA na lateral */}
        <rect
          x="26"
          y="15"
          width="32"
          height="10"
          rx="1"
          fill={locked ? '#1e293b' : '#334155'}
          stroke={color}
          strokeWidth="1.2"
        />
        {[34, 39, 44, 49].map((sx) => (
          <g key={sx}>
            <rect
              x={sx}
              y="17"
              width="3.2"
              height="6"
              rx="0.5"
              fill={locked ? '#334155' : '#dc2626'}
            />
            <rect
              x={sx}
              y="21.5"
              width="3.2"
              height="1.8"
              fill={locked ? '#475569' : '#f59e0b'}
            />
          </g>
        ))}
        {/* Cano longo 12GA + heatshield se SPAS-12 */}
        <rect
          x="58"
          y="15.5"
          width="62"
          height="4.2"
          fill={locked ? '#334155' : '#64748b'}
          stroke={color}
          strokeWidth="1"
        />
        {isSpas && (
          <rect
            x="58"
            y="14.5"
            width="48"
            height="5.5"
            fill={locked ? '#1e293b' : '#475569'}
            stroke={color}
            strokeWidth="0.9"
          />
        )}
        {/* Tubo carregador inferior + Guarda-mão Pump */}
        <rect
          x="58"
          y="20.5"
          width="52"
          height="3.5"
          fill={locked ? '#1e293b' : '#475569'}
          stroke={color}
          strokeWidth="0.9"
        />
        <rect
          x="64"
          y="20"
          width="26"
          height="6"
          rx="1.2"
          fill={locked ? '#0f172a' : '#1e293b'}
          stroke={color}
          strokeWidth="1.1"
        />
        {/* Alça Ghost Ring + Massa fibra ótica laranja */}
        <rect x="28" y="12.5" width="5" height="2.5" fill={color} />
        <rect x="115" y="13" width="3" height="2.5" fill={locked ? '#475569' : '#f97316'} />
      </svg>
    );
  }

  if (weaponId === 'SMG_MP5') {
    return (
      <svg viewBox="0 0 120 40" fill="none" className={className}>
        {/* Coronha retrátil A3 */}
        <rect x="10" y="17" width="18" height="3.5" fill={color} />
        <rect x="8" y="14" width="5" height="14" rx="1" fill={locked ? '#1e293b' : '#262b34'} stroke={color} strokeWidth="1.1" />
        {/* Receptor MP5 */}
        <rect x="28" y="14" width="38" height="10" rx="1.5" fill={locked ? '#1e293b' : '#334155'} stroke={color} strokeWidth="1.2" />
        {/* Handguard tropical + cano */}
        <rect x="66" y="16" width="24" height="8" rx="1.5" fill={locked ? '#1e293b' : '#1e293b'} stroke={color} strokeWidth="1.1" />
        <rect x="90" y="16.5" width="16" height="4" fill={locked ? '#334155' : '#64748b'} stroke={color} strokeWidth="1" />
        {/* Punho + Carregador curvo 9mm característico */}
        <path d="M35 24 L39 36 L32 36 L29 24 Z" fill={locked ? '#0f172a' : '#1e293b'} stroke={color} strokeWidth="1" />
        <path d="M51 24 C53 31, 56 35, 61 38 L55 39 C51 35, 48 30, 46 24 Z" fill={locked ? '#0f172a' : '#475569'} stroke={color} strokeWidth="1" />
        {/* Mira tambor H&K */}
        <circle cx="33" cy="12" r="2.2" fill={color} />
        <circle cx="88" cy="14" r="2.2" stroke={color} strokeWidth="1.2" />
      </svg>
    );
  }

  if (weaponId === 'L49_LMG') {
    return (
      <svg viewBox="0 0 125 40" fill="none" className={className}>
        <path d="M8 18 L26 16 L28 27 L8 28 Z" fill={locked ? '#334155' : '#334155'} stroke={color} strokeWidth="1.2" />
        <rect x="26" y="15" width="44" height="13" fill={locked ? '#1e293b' : '#3f4d34'} stroke={color} strokeWidth="1.2" />
        <rect x="70" y="17" width="36" height="7" fill={locked ? '#334155' : '#475569'} stroke={color} strokeWidth="1" />
        <rect x="106" y="18" width="14" height="5" fill={locked ? '#1e293b' : '#1e293b'} stroke={color} strokeWidth="1" />
        <ellipse cx="48" cy="33" rx="9" ry="6" fill={locked ? '#0f172a' : '#334155'} stroke={color} strokeWidth="1.2" />
        <path d="M38 12 L46 8 L58 8 L64 12" stroke={color} strokeWidth="1.5" fill="none" />
      </svg>
    );
  }

  // Padrão: M4A1 SOPMOD / HK416 / VECTOR SMG
  return (
    <svg viewBox="0 0 120 40" fill="none" className={className}>
      <path d="M10 18 L28 16 L30 26 L12 28 Z" fill={locked ? '#1e293b' : '#334155'} stroke={color} strokeWidth="1.2" />
      <rect x="28" y="16" width="42" height="10" fill={locked ? '#1e293b' : '#475569'} stroke={color} strokeWidth="1.2" />
      <rect x="70" y="17" width="36" height="6" fill={locked ? '#334155' : '#64748b'} stroke={color} strokeWidth="1" />
      <rect x="104" y="16.5" width="8" height="7" rx="0.5" fill={locked ? '#1e293b' : '#f59e0b'} />
      <path d="M48 26 L52 38 L44 38 L42 26 Z" fill={locked ? '#0f172a' : '#1e293b'} stroke={color} strokeWidth="1" />
      <path d="M36 26 L40 37 L34 37 L32 26 Z" fill={locked ? '#0f172a' : '#1e293b'} stroke={color} strokeWidth="1" />
      <rect x="44" y="11" width="16" height="4.5" rx="1" fill={locked ? '#1e293b' : '#0284c7'} stroke={color} strokeWidth="0.8" />
    </svg>
  );
};

export const WeaponPreview3D: React.FC<{
  weaponId: WeaponId;
  className?: string;
  locked?: boolean;
  alt?: string;
}> = ({ weaponId, className = 'w-full h-12', locked = false, alt }) => {
  const thumbUrl = useWeaponThumbnail3D(weaponId);

  if (!thumbUrl) {
    return (
      <WeaponIllustration2D
        weaponId={weaponId}
        className={className}
        locked={locked}
      />
    );
  }

  return (
    <img
      src={thumbUrl}
      alt={alt || weaponId}
      referrerPolicy="no-referrer"
      draggable={false}
      className={`object-contain select-none transition-opacity duration-150 ${
        locked ? 'grayscale opacity-50' : 'drop-shadow-[0_3px_8px_rgba(0,0,0,0.7)]'
      } ${className}`}
    />
  );
};

export const WeaponVisualCard: React.FC<WeaponVisualCardProps> = ({
  weaponId,
  unlocked,
  isEquipped,
}) => {
  const meta = WEAPON_REAL_META[weaponId];
  const reqInfo = getRequiredXpForWeapon(weaponId);
  const unlockLevel = meta?.unlockLevel || reqInfo.requiredLevel || 1;

  return (
    <div
      className={`relative rounded-xl border p-2.5 sm:p-3 flex flex-col justify-between overflow-hidden transition-all ${
        unlocked
          ? isEquipped
            ? 'bg-gradient-to-br from-amber-500/20 via-[#101622] to-amber-950/30 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
            : 'bg-white/[0.04] hover:bg-white/[0.07] border-emerald-500/40'
          : 'bg-black/55 border-white/10 opacity-80'
      }`}
    >
      {/* Top Header do Card: Nome e Categoria */}
      <div className="flex items-start justify-between gap-1 mb-1">
        <div>
          <div className="flex items-center gap-1.5">
            <span
              className={`font-display font-black text-xs sm:text-sm uppercase tracking-wider ${
                unlocked ? (isEquipped ? 'text-amber-300' : 'text-white') : 'text-slate-400'
              }`}
            >
              {meta.name}
            </span>
          </div>
          <div className="font-mono text-[9px] text-slate-400">
            {meta.category} · {meta.caliber}
          </div>
        </div>

        {/* Badge de Status */}
        {unlocked ? (
          <span
            className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider ${
              isEquipped
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                : 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
            }`}
          >
            {isEquipped ? '★ EQUIPADA' : '✓ DESBLOQUEADA'}
          </span>
        ) : (
          <span className="px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 text-[8px] font-mono font-bold uppercase flex items-center gap-1">
            <span>🔒 NÍV. {unlockLevel}</span>
          </span>
        )}
      </div>

      {/* Renderização 3D Real da Arma (.GLB / PBR Sculpted) */}
      <div className="relative py-2 flex items-center justify-center min-h-[56px]">
        <WeaponPreview3D
          weaponId={weaponId}
          locked={!unlocked}
          alt={meta.name}
          className="w-full h-14"
        />
        {!unlocked && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] rounded-lg flex flex-col items-center justify-center gap-1 border border-dashed border-white/15">
            <span className="text-xl">🔒</span>
            <span className="font-mono text-[9px] font-bold text-amber-300 uppercase tracking-widest">
              LIBERA NO NÍVEL {unlockLevel}
            </span>
          </div>
        )}
      </div>

      {/* Rodapé do Card com Patente Requerida */}
      <div className="mt-1 pt-1.5 border-t border-white/10 flex items-center justify-between text-[9px] font-mono">
        <span className="text-slate-400">
          {unlocked ? 'PRONTA PARA COMBATE' : `PATENTE REQUERIDA:`}
        </span>
        <span className={unlocked ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
          {unlocked ? 'ATIVADA NO ARSENAL' : `NÍV. ${unlockLevel} (${reqInfo.rankTitle})`}
        </span>
      </div>
    </div>
  );
};
