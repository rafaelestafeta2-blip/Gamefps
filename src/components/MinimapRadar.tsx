import React, { useEffect, useRef } from 'react';
import { ASSAULT_BOMB_SITE_A, ASSAULT_BOMB_SITE_B } from '../three/assaultLevelBuilder';
import { DUST2_BOMB_SITE_A, DUST2_BOMB_SITE_B } from '../three/dust2LevelBuilder';
import {
  INDUSTRIA_BOMB_SITE_A,
  INDUSTRIA_BOMB_SITE_B,
} from '../three/industriaLevelBuilder';
import {
  HANGAR_BOMB_SITE_A,
  HANGAR_BOMB_SITE_B,
} from '../three/hangarLevelBuilder';
import {
  EASTERN_CITY_BOMB_SITE_A,
  EASTERN_CITY_BOMB_SITE_B,
} from '../three/easternCityLevelBuilder';
import {
  MIRAGE_ANUBIS_BOMB_SITE_A,
  MIRAGE_ANUBIS_BOMB_SITE_B,
} from '../three/mirageAnubisLevelBuilder';
import { YARD_BOMB_SITE_A, YARD_BOMB_SITE_B } from '../three/yardMapData';
import { DrillMode } from '../types/game';

interface MinimapRadarProps {
  playerX: number;
  playerZ: number;
  playerYaw: number;
  drillMode?: DrillMode;
  targets?: Array<{
    id: string;
    sector: 'RANGE' | 'KILLHOUSE';
    x: number;
    z: number;
    isDown: boolean;
    isAlly?: boolean;
  }>;
}

const YARD_RADAR_SRC = '/assets/aistudio/Yard_Map_Radar_7754e5f9.webp';

export const MinimapRadar: React.FC<MinimapRadarProps> = React.memo(
  ({ playerX, playerZ, playerYaw, drillMode, targets }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const radarImgRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
      const img = new Image();
      img.src = YARD_RADAR_SRC;
      img.onload = () => {
        radarImgRef.current = img;
      };
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = 104;
      const center = size / 2;
      const isYard = drillMode === 'YARD_BOMB_5V5';
      const isDust2 = drillMode === 'DUST2_BOMB_5V5';
      const isAssault = drillMode === 'ASSAULT_BOMB_5V5';
      const isIndustria = drillMode === 'INDUSTRIA_BOMB_5V5';
      const isHangar = drillMode === 'HANGAR_BOMB_5V5';
      const isEasternCity = drillMode === 'EASTERN_CITY_BOMB_5V5';
      const isMirageAnubis = drillMode === 'MIRAGE_ANUBIS_BOMB_5V5';
      const isBombMode = isYard || isDust2 || isAssault || isIndustria || isHangar || isEasternCity || isMirageAnubis;
      const scale = isDust2 || isAssault || isIndustria || isHangar || isEasternCity || isMirageAnubis ? 0.85 : isYard ? 1.35 : 2.0;
      const maxRange = center - 6;

      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = isDust2 ? '#18140e' : '#0e141c';
      ctx.fillRect(0, 0, size, size);

      ctx.save();
      ctx.translate(center, center);

      const drawSectorRect = (wx: number, wz: number, w: number, d: number, fill: string, stroke = 'rgba(255,255,255,0.22)') => {
        const rx = (wx - playerX) * scale;
        const rz = (wz - playerZ) * scale;
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.fillRect(rx - (w * scale) / 2, rz - (d * scale) / 2, w * scale, d * scale);
        ctx.strokeRect(rx - (w * scale) / 2, rz - (d * scale) / 2, w * scale, d * scale);
      };

      if (isYard && radarImgRef.current) {
        const worldW = 78 * scale;
        const worldH = 92 * scale;
        const imgCenterX = (2 - playerX) * scale;
        const imgCenterZ = (1 - playerZ) * scale;
        ctx.drawImage(
          radarImgRef.current,
          imgCenterX - worldW / 2,
          imgCenterZ - worldH / 2,
          worldW,
          worldH
        );
      } else if (isDust2) {
        // Authentic Counter-Strike de_dust2 radar sectors in world coordinates
        drawSectorRect(-18, 19, 56, 12, '#2d261c'); // T Spawn
        drawSectorRect(22, 8, 28, 16, '#292218'); // Outside Long
        drawSectorRect(35, -28, 14, 52, '#332a1e'); // Long A Street
        drawSectorRect(28, -60, 22, 20, '#3d3020', 'rgba(248,113,113,0.45)'); // Site A
        drawSectorRect(2, -38, 16, 26, '#2f271d'); // Short A / Catwalk
        drawSectorRect(-11, -14, 12, 54, '#262017'); // Mid Alley & Doors
        drawSectorRect(-4, -56, 26, 16, '#1f242d'); // CT Spawn Underpass
        drawSectorRect(-38, -26, 22, 26, '#231d16'); // Upper B Tunnels
        drawSectorRect(-22, -36, 16, 12, '#1c1812'); // Lower B Tunnels
        drawSectorRect(-40, -64, 24, 24, '#2c251c', 'rgba(56,189,248,0.45)'); // Site B
      } else if (isAssault) {
        // Authentic Counter-Strike cs_assault radar sectors in world coordinates
        drawSectorRect(-16, 40, 56, 24, '#1b2634'); // Outer CT Street & Courtyard
        drawSectorRect(-40, 36, 18, 16, '#273649'); // Highway Overpass Bridge
        drawSectorRect(-26, 12, 28, 22, '#233040', 'rgba(248,113,113,0.45)'); // Loading Dock & Site A
        drawSectorRect(-3, 2, 24, 26, '#2d3b4e', 'rgba(56,189,248,0.45)'); // Main Assault Warehouse & Site B
        drawSectorRect(-9, -7, 16, 10, '#36465c'); // Upper Warehouse Catwalk / Hostage Room
        drawSectorRect(14, 18, 14, 28, '#1e2938'); // East Backdoor Alley
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        for (let g = -40; g <= 40; g += 20) {
          ctx.beginPath();
          ctx.moveTo(g, -center);
          ctx.lineTo(g, center);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-center, g);
          ctx.lineTo(center, g);
          ctx.stroke();
        }
        drawSectorRect(-6, 0, 8, 18, '#25313d');
        drawSectorRect(8, -10, 12, 16, '#2c3a47');
        drawSectorRect(0, -18, 22, 6, '#1f2933');
      }

      // Draw Bomb Site A and B pins on minimap for Yard, Dust2, and Assault
      if (isBombMode) {
        const siteA = isDust2
          ? DUST2_BOMB_SITE_A
          : isAssault
            ? ASSAULT_BOMB_SITE_A
            : isIndustria
              ? INDUSTRIA_BOMB_SITE_A
              : isHangar
                ? HANGAR_BOMB_SITE_A
                : isEasternCity
                  ? EASTERN_CITY_BOMB_SITE_A
                : isMirageAnubis
                  ? MIRAGE_ANUBIS_BOMB_SITE_A
                : YARD_BOMB_SITE_A;
        const siteB = isDust2
          ? DUST2_BOMB_SITE_B
          : isAssault
            ? ASSAULT_BOMB_SITE_B
            : isIndustria
              ? INDUSTRIA_BOMB_SITE_B
              : isHangar
                ? HANGAR_BOMB_SITE_B
                : isEasternCity
                  ? EASTERN_CITY_BOMB_SITE_B
                : isMirageAnubis
                  ? MIRAGE_ANUBIS_BOMB_SITE_B
                : YARD_BOMB_SITE_B;
        const drawSitePin = (sx: number, sz: number, label: string, color: string) => {
          let rx = (sx - playerX) * scale;
          let rz = (sz - playerZ) * scale;
          const dist = Math.hypot(rx, rz);
          if (dist > maxRange) {
            const ang = Math.atan2(rz, rx);
            rx = Math.cos(ang) * maxRange;
            rz = Math.sin(ang) * maxRange;
          }
          ctx.fillStyle = color;
          ctx.fillRect(rx - 5, rz - 5, 10, 10);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, rx, rz + 0.5);
        };
        drawSitePin(siteA.x, siteA.z, 'A', '#dc2626');
        drawSitePin(siteB.x, siteB.z, 'B', '#0284c7');
      }

      // Target & Ally pings
      if (targets && targets.length > 0) {
        for (let i = 0; i < targets.length; i++) {
          const t = targets[i];
          if (t.isDown) continue;
          const relX = (t.x - playerX) * scale;
          const relZ = (t.z - playerZ) * scale;
          const dist = Math.hypot(relX, relZ);
          let tx = relX;
          let tz = relZ;
          if (dist > maxRange) {
            const ang = Math.atan2(relZ, relX);
            tx = Math.cos(ang) * maxRange;
            tz = Math.sin(ang) * maxRange;
          }

          ctx.beginPath();
          ctx.arc(tx, tz, 3.2, 0, Math.PI * 2);
          ctx.fillStyle = t.isAlly ? '#38bdf8' : '#ef4444';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // Rotate for player vision cone & yellow teardrop marker
      ctx.rotate(-playerYaw);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-18, -32);
      ctx.arc(0, 0, 36, -Math.PI / 2 - 0.52, -Math.PI / 2 + 0.52);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.bezierCurveTo(6, -1, 6, 6, 0, 6);
      ctx.bezierCurveTo(-6, 6, -6, -1, 0, -8);
      ctx.closePath();
      ctx.fillStyle = '#facc15';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
    }, [playerX, playerZ, playerYaw, drillMode, targets]);

    return (
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-[#141c24]/90 border border-white/30 shadow-lg overflow-hidden shrink-0 pointer-events-none">
        <canvas
          ref={canvasRef}
          width={104}
          height={104}
          className="w-full h-full block"
        />
      </div>
    );
  },
  (prev, next) =>
    prev.playerX === next.playerX &&
    prev.playerZ === next.playerZ &&
    prev.playerYaw === next.playerYaw &&
    prev.drillMode === next.drillMode &&
    prev.targets === next.targets
);
