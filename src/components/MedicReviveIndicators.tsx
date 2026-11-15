import React from 'react';
import { HudState } from '../types/game';

/**
 * Small discrete medic revive markers — screen-edge chevrons + timer.
 * Only rendered for MEDICO with active reviveMarkers.
 */
export const MedicReviveIndicators: React.FC<{ hud: HudState }> = ({ hud }) => {
  if (hud.playerClass !== 'MEDICO' || !hud.reviveMarkers?.length) return null;
  if (hud.yardBomb?.isSpectating || hud.health <= 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-25 overflow-hidden">
      {hud.reviveMarkers.map((m) => {
        // Map bearing to screen: clamp to edge ring (Warface-style offscreen arrow).
        let ang = m.bearingRad;
        while (ang > Math.PI) ang -= Math.PI * 2;
        while (ang < -Math.PI) ang += Math.PI * 2;

        const edgePad = 0.12;
        // Project onto an ellipse near screen edges when off-center.
        const ux = Math.sin(ang);
        const uy = -Math.cos(ang);
        const sx = 50 + ux * (50 - edgePad * 100);
        const sy = 50 + uy * (42 - edgePad * 100);
        const urgent = m.remainingSec < 10;

        return (
          <div
            key={m.id}
            className="absolute"
            style={{
              left: `${sx}%`,
              top: `${sy}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className={`flex flex-col items-center gap-0.5 ${
                m.inRange ? 'opacity-100' : 'opacity-80'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-sm border flex items-center justify-center shadow-md ${
                  m.inRange
                    ? 'bg-emerald-500/90 border-emerald-200 text-slate-950'
                    : urgent
                      ? 'bg-rose-600/85 border-rose-300 text-white'
                      : 'bg-black/70 border-emerald-400/70 text-emerald-300'
                }`}
                style={{ transform: `rotate(${ang}rad)` }}
                title={`${m.callsign} · ${m.distanceM.toFixed(0)}m`}
              >
                {/* Cross / defib glyph (stays upright relative to icon box rotation via counter — keep simple) */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11 3h2v8h8v2h-8v8h-2v-8H3v-2h8V3z" />
                </svg>
              </div>
              <div
                className="px-1 py-0.5 rounded bg-black/75 border border-white/15 text-[8px] font-mono font-bold tracking-tight text-white/90 whitespace-nowrap"
                style={{ transform: 'none' }}
              >
                {m.callsign.split('-')[0]} · {Math.ceil(m.remainingSec)}s
                {m.inRange ? ' · [U]' : ` · ${m.distanceM.toFixed(0)}m`}
              </div>
            </div>
          </div>
        );
      })}

      {hud.reviveChargeProgress > 0.02 && (
        <div className="absolute bottom-[22%] left-1/2 -translate-x-1/2 w-44">
          <div className="text-[9px] font-display font-black tracking-wider text-emerald-300 text-center mb-1 uppercase">
            Desfibrilador
          </div>
          <div className="h-2 bg-black/80 border border-emerald-400/50 overflow-hidden rounded-sm">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-300 transition-[width] duration-75"
              style={{ width: `${Math.round(hud.reviveChargeProgress * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
