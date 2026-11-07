import React, { useEffect, useRef } from 'react';

interface MinimapRadarProps {
  playerX: number;
  playerZ: number;
  playerYaw: number;
  targets?: Array<{
    id: string;
    sector: 'RANGE' | 'KILLHOUSE';
    x: number;
    z: number;
    isDown: boolean;
  }>;
}

export const MinimapRadar: React.FC<MinimapRadarProps> = React.memo(
  ({ playerX, playerZ, playerYaw, targets }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = 104;
      const center = size / 2;
      const scale = 2.0;
      const maxRange = center - 6;

      ctx.clearRect(0, 0, size, size);

      // Dark square tactical terrain background (COD Mobile style)
      ctx.fillStyle = '#141c24';
      ctx.fillRect(0, 0, size, size);

      // Save context to rotate world relative to player or keep north-up tactical blocks
      ctx.save();
      ctx.translate(center, center);

      // Subtle tactical grid lines
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

      // Draw simplified map structures (Firing Range & Killhouse walls) relative to player
      const drawStructure = (wx: number, wz: number, w: number, d: number, color: string) => {
        const rx = (wx - playerX) * scale;
        const rz = (wz - playerZ) * scale;
        ctx.fillStyle = color;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1;
        ctx.fillRect(rx - (w * scale) / 2, rz - (d * scale) / 2, w * scale, d * scale);
        ctx.strokeRect(rx - (w * scale) / 2, rz - (d * scale) / 2, w * scale, d * scale);
      };

      // Range booth & Killhouse blocks for realistic COD minimap feel
      drawStructure(-6, 0, 8, 18, '#25313d');
      drawStructure(8, -10, 12, 16, '#2c3a47');
      drawStructure(0, -18, 22, 6, '#1f2933');

      // Wall Armory crate icon (-3.2, 0.0)
      const armRelX = (-3.2 - playerX) * scale;
      const armRelZ = (0.0 - playerZ) * scale;
      const armDist = Math.hypot(armRelX, armRelZ);
      let armX = armRelX;
      let armZ = armRelZ;
      if (armDist > maxRange) {
        const ang = Math.atan2(armRelZ, armRelX);
        armX = Math.cos(ang) * maxRange;
        armZ = Math.sin(ang) * maxRange;
      }
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(armX - 2.5, armZ - 2.5, 5, 5);

      // Target pings (Red enemy dots like COD Mobile)
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
          ctx.fillStyle = '#ef4444';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // Rotate for player vision cone & yellow teardrop marker (exact COD Mobile style)
      ctx.rotate(-playerYaw);

      // Bright white/amber FOV cone
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-18, -32);
      ctx.arc(0, 0, 36, -Math.PI / 2 - 0.52, -Math.PI / 2 + 0.52);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fill();

      // Yellow/Gold Player Teardrop Pointer with white border
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
    }, [playerX, playerZ, playerYaw, targets]);

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
    prev.targets === next.targets
);
