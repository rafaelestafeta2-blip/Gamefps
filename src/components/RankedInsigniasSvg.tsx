import React from 'react';
import {
  COMPETITIVE_RANKS,
  CompetitiveRankTier,
  CompetitiveRankTierId,
  getCompetitiveRankProgression,
  RANK_TIER_PALETTES,
} from '../progression/competitiveRanks';

export {
  COMPETITIVE_RANKS,
  getCompetitiveRankProgression,
  type CompetitiveRankTier,
  type CompetitiveRankTierId,
};

export const CompetitiveRankBadgeSvg: React.FC<{
  tier: CompetitiveRankTierId;
  className?: string;
}> = ({ tier, className = 'w-14 h-14' }) => {
  const p = RANK_TIER_PALETTES[tier];
  const uid = `rk_${tier}`;
  const hasWings =
    tier === 'GOLD' ||
    tier === 'PLATINUM' ||
    tier === 'DIAMOND' ||
    tier === 'ELITE' ||
    tier === 'MASTER' ||
    tier === 'LEGEND';
  const hasSwords = tier === 'ELITE' || tier === 'MASTER' || tier === 'LEGEND';
  const hasCrown = tier === 'MASTER' || tier === 'LEGEND';

  return (
    <svg viewBox="0 0 120 126" className={`select-none shrink-0 ${className}`} fill="none">
      <defs>
        <radialGradient id={`${uid}_glow`} cx="50%" cy="50%" r="54%">
          <stop offset="0%" stopColor={p.glow1} stopOpacity="0.68" />
          <stop offset="58%" stopColor={p.glow2} stopOpacity="0.28" />
          <stop offset="100%" stopColor={p.glow2} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}_metal`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={p.metal1} />
          <stop offset="48%" stopColor={p.metal2} />
          <stop offset="100%" stopColor={p.metal3} />
        </linearGradient>
        <linearGradient id={`${uid}_core`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={p.core1} />
          <stop offset="55%" stopColor={p.core2} />
          <stop offset="100%" stopColor={p.core3} />
        </linearGradient>
        <linearGradient id={`${uid}_gem`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={p.gem1} />
          <stop offset="100%" stopColor={p.gem2} />
        </linearGradient>
      </defs>

      <circle cx="60" cy="64" r="54" fill={`url(#${uid}_glow)`} />

      {hasWings && (
        <g>
          <path
            d="M6 34 L36 48 L30 84 L12 68 Z M114 34 L84 48 L90 84 L108 68 Z"
            fill={`url(#${uid}_core)`}
            stroke={p.stroke}
            strokeWidth="1.6"
          />
          <path
            d="M12 46 L36 56 L32 76 L16 64 Z M108 46 L84 56 L88 76 L104 64 Z"
            fill={`url(#${uid}_metal)`}
            stroke={p.metal1}
            strokeWidth="1"
          />
        </g>
      )}

      {hasSwords && (
        <g>
          <path
            d="M18 22 L102 106 M102 22 L18 106"
            stroke={p.metal1}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M18 22 L102 106 M102 22 L18 106"
            stroke={p.core1}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      )}

      <path
        d="M60 16 L96 32 L88 80 L60 112 L32 80 L24 32 Z"
        fill={`url(#${uid}_core)`}
        stroke={`url(#${uid}_metal)`}
        strokeWidth="4.5"
      />
      <path
        d="M60 23 L88 36 L82 76 L60 102 L38 76 L32 36 Z"
        fill="#090f1d"
        fillOpacity="0.62"
        stroke={p.stroke}
        strokeWidth="1.5"
      />

      {tier === 'ELITE' ? (
        <g>
          <path
            d="M35 42 L85 92 M85 42 L35 92"
            stroke={`url(#${uid}_metal)`}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M60 10 C48 10 43 20 43 32 L47 46 L60 52 L73 46 L77 32 C77 20 72 10 60 10 Z"
            fill={`url(#${uid}_metal)`}
            stroke="#0f172a"
            strokeWidth="2"
          />
          <path
            d="M48 29 L58 33 L58 43 L50 38 Z M72 29 L62 33 L62 43 L70 38 Z"
            fill="#020617"
          />
          <rect x="59" y="14" width="2" height="34" fill="#38bdf8" />
        </g>
      ) : tier === 'DIAMOND' ? (
        <g>
          <polygon
            points="60,26 84,48 60,94 36,48"
            fill={`url(#${uid}_gem)`}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <polygon points="46,36 74,36 84,48 36,48" fill="#e0e7ff" />
          <polygon points="60,48 84,48 60,94" fill="#4338ca" fillOpacity="0.75" />
        </g>
      ) : tier === 'PLATINUM' ? (
        <g>
          <polygon
            points="60,28 82,60 60,92 38,60"
            fill={`url(#${uid}_gem)`}
            stroke="#ecfeff"
            strokeWidth="1.4"
          />
          <path
            d="M60 32 L66 53 L86 60 L66 67 L60 88 L54 67 L34 60 L54 53 Z"
            fill="#ffffff"
          />
          <circle cx="60" cy="60" r="5" fill="#0891b2" />
        </g>
      ) : (
        <g>
          <polygon
            points="60,30 76,58 60,88 44,58"
            fill={`url(#${uid}_gem)`}
            stroke={p.metal1}
            strokeWidth="1.5"
          />
          <polygon points="60,37 69,58 60,79 51,58" fill={p.core2} />
          <path
            d="M42 74 L60 62 L78 74"
            stroke={p.metal1}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}

      {hasCrown && (
        <g>
          <path
            d="M42 22 L48 10 L60 18 L72 10 L78 22 L73 28 L47 28 Z"
            fill={`url(#${uid}_metal)`}
            stroke="#ffffff"
            strokeWidth="1.4"
          />
          <circle cx="60" cy="13" r="2.6" fill="#fef08a" />
          {tier === 'LEGEND' && (
            <polygon
              points="60,44 64,53 74,54 66,61 68,71 60,66 52,71 54,61 46,54 56,53"
              fill="#fef08a"
              stroke="#7c2d12"
              strokeWidth="1"
            />
          )}
        </g>
      )}
    </svg>
  );
};

export const EliteOneBadgeSvg: React.FC<{ className?: string }> = ({
  className = 'w-16 h-16',
}) => <CompetitiveRankBadgeSvg tier="ELITE" className={className} />;

export const MasterRankBadgeSvg: React.FC<{ className?: string }> = ({
  className = 'w-14 h-14',
}) => <CompetitiveRankBadgeSvg tier="MASTER" className={className} />;

export const DiamondRankBadgeSvg: React.FC<{ className?: string }> = ({
  className = 'w-14 h-14',
}) => <CompetitiveRankBadgeSvg tier="DIAMOND" className={className} />;

export const PlatinumRankBadgeSvg: React.FC<{ className?: string }> = ({
  className = 'w-14 h-14',
}) => <CompetitiveRankBadgeSvg tier="PLATINUM" className={className} />;

export const SeasonalWeaponSkinSvg: React.FC<{ className?: string }> = ({
  className = 'w-24 h-11',
}) => (
  <svg viewBox="0 0 180 68" className={className} fill="none">
    <defs>
      <linearGradient id="goldSkin" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="50%" stopColor="#fef08a" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
    </defs>
    <g transform="rotate(12 90 34)">
      <path d="M12 26 L38 26 L38 38 L16 42 L10 36 Z" fill="#1e293b" stroke="#64748b" strokeWidth="1.2" />
      <rect x="38" y="23" width="54" height="14" rx="2" fill="url(#goldSkin)" stroke="#fef08a" strokeWidth="1" />
      <rect x="44" y="26" width="26" height="5" fill="#0f172a" />
      <rect x="48" y="16" width="28" height="6" rx="1.5" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.2" />
      <path d="M66 37 L78 37 L84 57 L71 59 Z" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.2" />
      <path d="M44 37 L53 37 L49 51 L40 50 Z" fill="#1e293b" />
      <rect x="92" y="24" width="42" height="9" rx="1" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
      <rect x="134" y="26.5" width="34" height="4" fill="#475569" />
      <rect x="152" y="25" width="18" height="7" rx="1.5" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
    </g>
  </svg>
);

export const SeasonalOperatorSuitSvg: React.FC<{ className?: string }> = ({
  className = 'w-16 h-11',
}) => (
  <svg viewBox="0 0 100 88" className={className} fill="none">
    <defs>
      <linearGradient id="suitBlue" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="50%" stopColor="#1d4ed8" />
        <stop offset="100%" stopColor="#172554" />
      </linearGradient>
    </defs>
    <path
      d="M28 18 L40 12 L60 12 L72 18 L86 36 L78 68 L68 66 L66 38 L34 38 L32 66 L22 68 L14 36 Z"
      fill="url(#suitBlue)"
      stroke="#60a5fa"
      strokeWidth="1.5"
    />
    <path d="M38 12 L50 22 L62 12 L58 8 L42 8 Z" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.2" />
    <path d="M33 20 L67 20 L65 76 L35 76 Z" fill="#1e293b" stroke="#475569" strokeWidth="2" />
    <path d="M35 20 L65 62" stroke="#94a3b8" strokeWidth="3.5" />
    <rect x="37" y="46" width="8" height="16" rx="1" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
    <rect x="46" y="46" width="8" height="16" rx="1" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
    <rect x="55" y="46" width="8" height="16" rx="1" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
  </svg>
);

export const RadarWavePulseIcon: React.FC<{ active?: boolean }> = ({
  active = true,
}) => (
  <div className="relative flex items-center justify-center w-10 h-8 shrink-0">
    <svg viewBox="0 0 64 48" className="w-10 h-8" fill="none">
      <circle cx="32" cy="24" r="4.5" fill="#fb923c" className={active ? 'animate-pulse' : ''} />
      <path d="M23 15 C18 20 18 28 23 33 M41 15 C46 20 46 28 41 33" stroke="#fb923c" strokeWidth="3" strokeLinecap="round" />
      <path d="M17 10 C10 18 10 30 17 38 M47 10 C54 18 54 30 47 38" stroke="#f97316" strokeWidth="2.6" strokeLinecap="round" strokeOpacity="0.85" />
      <path d="M11 5 C2 16 2 32 11 43 M53 5 C62 16 62 32 53 43" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.6" />
    </svg>
  </div>
);
