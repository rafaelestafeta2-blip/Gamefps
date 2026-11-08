import React from 'react';
import { WeaponId } from '../types/game';

let lastPointerDownTriggerTime = 0;

/**
 * Multi-touch & desktop click binder:
 * - Fires immediately on `pointerdown` (0ms latency on mobile even while another finger holds the joystick).
 * - Deduplicates the synthesized `click` event on finger/mouse release so React re-renders never double-toggle.
 * - Still responds to standard `click` events (keyboard activation, accessibility, or synthetic clicks).
 */
export const bindTap = (action: () => void) => ({
  onPointerDown: (e: React.PointerEvent) => {
    e.stopPropagation();
    lastPointerDownTriggerTime = performance.now();
    action();
  },
  onClick: (e: React.MouseEvent) => {
    e.stopPropagation();
    if (performance.now() - lastPointerDownTriggerTime < 420) return;
    action();
  },
});

export const WeaponSilhouette: React.FC<{
  weaponId: WeaponId;
  className?: string;
}> = ({ weaponId, className = 'w-16 h-6' }) => {
  if (weaponId === 'KNIFE_TACTICAL') {
    return (
      <svg viewBox="0 0 64 28" fill="none" className={className}>
        {/* Knife Blade, Point & Fuller */}
        <path
          d="M26 12L56 12.5C59 13.5 61 14.8 61 15C59 16.5 50 17.5 40 17.5H26V12Z"
          fill="currentColor"
        />
        {/* Finger Guard */}
        <rect x="23.5" y="8" width="3" height="13.5" rx="1" fill="currentColor" />
        {/* Textured Handle Grip */}
        <rect x="8" y="11" width="15" height="7.5" rx="2" fill="currentColor" />
        {/* Tactical Skull Crusher Pommel */}
        <path d="M5 13L8 11.5V18L5 16.5L3.5 14.8L5 13Z" fill="currentColor" />
      </svg>
    );
  }
  if (weaponId === 'P50_PISTOL') {
    return (
      <svg viewBox="0 0 64 28" fill="none" className={className}>
        <path
          d="M14 7H46L48 11H30L26 23H17L20 12H14V7Z"
          fill="currentColor"
        />
        <rect
          x="28"
          y="11"
          width="6"
          height="4"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    );
  }
  if (weaponId === 'SNIPER_BOLT' || weaponId === 'SNIPER_TACTICAL') {
    return (
      <svg viewBox="0 0 88 28" fill="none" className={className}>
        <path
          d="M4 13L18 11V17L4 19V13ZM18 11H58V14H84V12.5H87V15.5H58V17H38L35 23H29L31 17H22L19 22H15L18 11Z"
          fill="currentColor"
        />
        <rect x="28" y="6" width="22" height="3.5" rx="1" fill="currentColor" />
        <line
          x1="33"
          y1="9.5"
          x2="33"
          y2="11"
          stroke="currentColor"
          strokeWidth="2"
        />
        <line
          x1="45"
          y1="9.5"
          x2="45"
          y2="11"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 84 28" fill="none" className={className}>
      <path
        d="M6 11L18 10V16L6 18V11ZM18 10H56V12H76V11H80V14.5H56V16H42L39 24H33L35 16H25L22 22H17L20 16H18V10Z"
        fill="currentColor"
      />
      <rect x="30" y="6.5" width="12" height="3" rx="1" fill="currentColor" />
    </svg>
  );
};

export const FireModeIcon: React.FC<{ mode: 'AUTO' | 'BURST' | 'SEMI' }> = ({
  mode,
}) => {
  if (mode === 'AUTO') {
    return (
      <svg width="16" height="14" viewBox="0 0 24 24" fill="none">
        <rect x="5" y="6" width="2.5" height="12" rx="1" fill="currentColor" />
        <rect x="10.5" y="4" width="2.5" height="14" rx="1" fill="currentColor" />
        <rect x="16" y="6" width="2.5" height="12" rx="1" fill="currentColor" />
      </svg>
    );
  }
  if (mode === 'BURST') {
    return (
      <svg width="16" height="14" viewBox="0 0 24 24" fill="none">
        <rect x="7" y="5" width="2.5" height="13" rx="1" fill="currentColor" />
        <rect x="13.5" y="5" width="2.5" height="13" rx="1" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="16" height="14" viewBox="0 0 24 24" fill="none">
      <rect x="10.5" y="5" width="3" height="14" rx="1" fill="currentColor" />
    </svg>
  );
};

export const FragGrenadeIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <ellipse
      cx="12"
      cy="14"
      rx="5.5"
      ry="6.5"
      fill="currentColor"
      fillOpacity="0.25"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path d="M9.5 7.5H14.5V5H9.5V7.5Z" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M14.5 6H18L19 12"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="8" cy="5.5" r="1.8" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const SmokeGrenadeIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <rect
      x="8"
      y="8"
      width="8"
      height="12"
      rx="1.5"
      fill="currentColor"
      fillOpacity="0.25"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <line x1="8" y1="12.5" x2="16" y2="12.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M10 8V5.5H14V8" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M7 4.5C8.5 2.5 11 2.5 12 4C13.5 2.5 16 2.5 17.5 4.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

export const InspectEyeIcon: React.FC = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path
      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </svg>
);
