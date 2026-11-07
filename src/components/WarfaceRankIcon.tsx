import React from 'react';

interface WarfaceRankIconProps {
  level: number;
  className?: string;
}

/**
 * Pure vector SVG military rank insignia for all 70 Warface levels.
 * Guarantees crisp rendering with transparency on all Android WebViews
 * with zero missing-glyph boxes and zero memory overhead.
 */
export const WarfaceRankIcon: React.FC<WarfaceRankIconProps> = ({
  level,
  className = 'w-6 h-6',
}) => {
  const lvl = Math.max(1, Math.min(70, level));

  // Determine palette by tier
  let primary = '#10b981'; // Emerald (1-2)
  let secondary = '#064e3b';
  let rim = '#34d399';

  if (lvl >= 3 && lvl <= 6) {
    primary = '#38bdf8';
    secondary = '#0c4a6e';
    rim = '#bae6fd';
  } else if (lvl >= 7 && lvl <= 15) {
    primary = '#f59e0b';
    secondary = '#451a03';
    rim = '#fde68a';
  } else if (lvl >= 16 && lvl <= 30) {
    primary = '#eab308';
    secondary = '#1e293b';
    rim = '#fef08a';
  } else if (lvl >= 31 && lvl <= 45) {
    primary = '#fbbf24';
    secondary = '#172554';
    rim = '#fef3c7';
  } else if (lvl >= 46 && lvl <= 58) {
    primary = '#f59e0b';
    secondary = '#3b0764';
    rim = '#fde68a';
  } else if (lvl >= 59 && lvl <= 69) {
    primary = '#fbbf24';
    secondary = '#1d4ed8';
    rim = '#93c5fd';
  } else if (lvl === 70) {
    primary = '#facc15';
    secondary = '#7f1d1d';
    rim = '#fef9c3';
  }

  // Sub-rank count (1..4) within each progression block
  const stripeCount = ((lvl - 1) % 4) + 1;

  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label={`Patente Nível ${lvl}`}
    >
      {/* Outer Hexagonal Military Shield */}
      <path
        d="M18 2L31 7.5V19.5C31 26.8 25.4 31.9 18 34C10.6 31.9 5 26.8 5 19.5V7.5L18 2Z"
        fill={secondary}
        stroke={rim}
        strokeWidth="1.8"
      />
      {/* Inner Bevel Frame */}
      <path
        d="M18 4.8L28.2 9.2V19.2C28.2 24.9 23.8 29.1 18 31C12.2 29.1 7.8 24.9 7.8 19.2V9.2L18 4.8Z"
        fill="#090d16"
        fillOpacity="0.65"
        stroke={primary}
        strokeWidth="0.9"
        strokeOpacity="0.6"
      />

      {/* TIER 1: Levels 1-6 (Horizontal Cadet Bars) */}
      {lvl <= 6 && (
        <g stroke={primary} strokeWidth="2.2" strokeLinecap="round">
          {stripeCount >= 1 && <line x1="12" y1="22" x2="24" y2="22" />}
          {stripeCount >= 2 && <line x1="12" y1="17.5" x2="24" y2="17.5" />}
          {stripeCount >= 3 && <line x1="12" y1="13" x2="24" y2="13" />}
          {stripeCount >= 4 && <circle cx="18" cy="9" r="1.6" fill={rim} stroke="none" />}
        </g>
      )}

      {/* TIER 2: Levels 7-15 (Soldier & Specialist Chevrons) */}
      {lvl >= 7 && lvl <= 15 && (
        <g>
          <path
            d="M11 22L18 17L25 22"
            stroke={primary}
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {stripeCount >= 2 && (
            <path
              d="M11 17.5L18 12.5L25 17.5"
              stroke={primary}
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {stripeCount >= 3 && (
            <path
              d="M11 13L18 8L25 13"
              stroke={rim}
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {lvl >= 11 && (
            <polygon
              points="18,21.5 19.3,24.2 22.2,24.6 20.1,26.6 20.6,29.4 18,28 15.4,29.4 15.9,26.6 13.8,24.6 16.7,24.2"
              fill={rim}
            />
          )}
        </g>
      )}

      {/* TIER 3: Levels 16-30 (Sergeant Chevrons + Diamond Lozenge) */}
      {lvl >= 16 && lvl <= 30 && (
        <g>
          <path
            d="M10.5 16L18 10.5L25.5 16"
            stroke={primary}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10.5 12L18 6.5L25.5 12"
            stroke={rim}
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Central Diamond Lozenge */}
          <polygon
            points="18,16.5 22,21 18,25.5 14,21"
            fill={primary}
            stroke={rim}
            strokeWidth="1"
          />
          {lvl >= 23 && (
            <path
              d="M11.5 26.5Q18 30 24.5 26.5"
              stroke={rim}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          )}
        </g>
      )}

      {/* TIER 4: Levels 31-45 (Officer Stars & Shield Bars) */}
      {lvl >= 31 && lvl <= 45 && (
        <g>
          {/* Laurel Base */}
          <path
            d="M11 23C11 26.5 14 28.5 18 28.5C22 28.5 25 26.5 25 23"
            stroke={primary}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Central Officer Star */}
          <polygon
            points="18,8.5 19.9,13 24.8,13.4 21,16.6 22.2,21.4 18,18.8 13.8,21.4 15,16.6 11.2,13.4 16.1,13"
            fill={primary}
            stroke={rim}
            strokeWidth="0.8"
          />
          {lvl >= 38 && (
            <>
              <circle cx="12" cy="11" r="1.6" fill={rim} />
              <circle cx="24" cy="11" r="1.6" fill={rim} />
            </>
          )}
        </g>
      )}

      {/* TIER 5: Levels 46-58 (Commander Wings & Crown) */}
      {lvl >= 46 && lvl <= 58 && (
        <g>
          {/* Tactical Eagle Wings */}
          <path
            d="M8.5 16L14.5 19.5L18 16.5L21.5 19.5L27.5 16L25 23.5L18 26.5L11 23.5L8.5 16Z"
            fill={primary}
            stroke={rim}
            strokeWidth="1"
          />
          {/* Commander Crown / Star */}
          <polygon
            points="18,7.5 19.6,11.2 23.5,11.5 20.5,14 21.4,17.8 18,15.7 14.6,17.8 15.5,14 12.5,11.5 16.4,11.2"
            fill={rim}
          />
        </g>
      )}

      {/* TIER 6: Levels 59-69 (Special Forces Crossed Sabers & Star) */}
      {lvl >= 59 && lvl <= 69 && (
        <g>
          <line
            x1="10"
            y1="25"
            x2="26"
            y2="10"
            stroke={rim}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <line
            x1="26"
            y1="25"
            x2="10"
            y2="10"
            stroke={rim}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <polygon
            points="18,9.5 20,14 24.8,14.4 21.1,17.5 22.3,22.2 18,19.6 13.7,22.2 14.9,17.5 11.2,14.4 16,14"
            fill={primary}
            stroke="#ffffff"
            strokeWidth="0.9"
          />
        </g>
      )}

      {/* TIER 7: Level 70 (Warface Supreme Golden Crest) */}
      {lvl === 70 && (
        <g>
          <path
            d="M8 14L13 18L18 11L23 18L28 14L25.5 24.5H10.5L8 14Z"
            fill={primary}
            stroke="#ffffff"
            strokeWidth="1.2"
          />
          <circle cx="18" cy="20" r="2.6" fill="#7f1d1d" />
          <circle cx="18" cy="8" r="1.8" fill="#ffffff" />
        </g>
      )}
    </svg>
  );
};
