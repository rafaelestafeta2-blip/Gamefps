import React from 'react';
import { HudState } from '../types/game';

/**
 * Warface-style ally need edge icons — only what your class can fix:
 * MEDICO → low HP, FUZILEIRO → low ammo, ENGENHEIRO → low armor.
 * Not for self / enemies / sniper class.
 */
export const AllyNeedIndicators: React.FC<{ hud: HudState }> = ({ hud }) => {
  if (!hud.allyNeedMarkers?.length) return null;
  if (hud.yardBomb?.isSpectating || hud.health <= 0) return null;
  if (hud.playerClass === 'FRANCO_ATIRADOR') return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-24 overflow-hidden">
      {hud.allyNeedMarkers.map((m) => {
        let ang = m.bearingRad;
        while (ang > Math.PI) ang -= Math.PI * 2;
        while (ang < -Math.PI) ang += Math.PI * 2;

        const edgePad = 0.14;
        const ux = Math.sin(ang);
        const uy = -Math.cos(ang);
        // Slightly inside revive ring so both can coexist.
        const sx = 50 + ux * (46 - edgePad * 100);
        const sy = 50 + uy * (38 - edgePad * 100);

        const tone =
          m.need === 'HP'
            ? m.inRange
              ? 'bg-emerald-500/90 border-emerald-100 text-slate-950'
              : 'bg-black/70 border-emerald-400/75 text-emerald-300'
            : m.need === 'AMMO'
              ? m.inRange
                ? 'bg-amber-500/90 border-amber-100 text-slate-950'
                : 'bg-black/70 border-amber-400/75 text-amber-300'
              : m.inRange
                ? 'bg-sky-500/90 border-sky-100 text-slate-950'
                : 'bg-black/70 border-sky-400/75 text-sky-300';

        const label =
          m.need === 'HP' ? 'HP' : m.need === 'AMMO' ? 'MUN' : 'VES';

        return (
          <div
            key={`${m.id}-${m.need}`}
            className="absolute"
            style={{
              left: `${sx}%`,
              top: `${sy}%`,
              transform: 'translate(-50%, -50%)',
              opacity: 0.55 + m.severity * 0.45,
            }}
          >
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`w-6 h-6 rounded-sm border flex items-center justify-center shadow-md ${tone}`}
                title={`${m.callsign} · ${label} · ${m.distanceM.toFixed(0)}m`}
              >
                {m.need === 'HP' ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11 3h2v8h8v2h-8v8h-2v-8H3v-2h8V3z" />
                  </svg>
                ) : m.need === 'AMMO' ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 3h6v3H9V3zm1 5h4l1 13H9L10 8z" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 7h16v3H4V7zm2 5h12v9H6v-9zm3 2v5h6v-5H9z" />
                  </svg>
                )}
              </div>
              <div className="px-1 py-0.5 rounded bg-black/70 border border-white/10 text-[7px] font-mono font-bold tracking-tight text-white/85 whitespace-nowrap">
                {label}
                {m.inRange ? ' · [U]' : ` · ${m.distanceM.toFixed(0)}m`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
