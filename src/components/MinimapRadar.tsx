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

      const size = 96;
      const center = size / 2;
      const scale = 1.8;
      const maxRange = center - 5;

      ctx.clearRect(0, 0, size, size);

      // Dark tactical background circle
      ctx.beginPath();
      ctx.arc(center, center, center - 2, 0, Math.PI * 2);
      ctx.fillStyle = '#06090e';
      ctx.fill();

      // Outer border
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#334155';
      ctx.stroke();

      // Inner distance rings
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(center, center, (center - 3) * 0.65, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(center, center, (center - 3) * 0.35, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshair lines
      ctx.strokeStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(center, 5);
      ctx.lineTo(center, size - 5);
      ctx.moveTo(5, center);
      ctx.lineTo(size - 5, center);
      ctx.stroke();

      // Cardinal direction letters
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#06b6d4';
      ctx.fillText('N', center, 10);
      ctx.fillStyle = '#64748b';
      ctx.fillText('E', size - 8, center);
      ctx.fillText('S', center, size - 8);
      ctx.fillText('W', 8, center);

      // Wall Armory marker (-3.2, 0.0)
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
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.fillRect(center + armX - 3, center + armZ - 3, 6, 6);
      ctx.strokeRect(center + armX - 3, center + armZ - 3, 6, 6);

      // Target pings
      if (targets && targets.length > 0) {
        for (let i = 0; i < targets.length; i++) {
          const t = targets[i];
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

          const isKillhouse = t.sector === 'KILLHOUSE';
          ctx.beginPath();
          ctx.arc(center + tx, center + tz, t.isDown ? 2 : 3, 0, Math.PI * 2);
          ctx.fillStyle = t.isDown ? '#475569' : isKillhouse ? '#ef4444' : '#eab308';
          ctx.fill();
          if (!t.isDown) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // Center Player Icon with orientation cone
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(-playerYaw);

      // Vision cone
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-14, -22);
      ctx.arc(0, 0, 26, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5);
      ctx.closePath();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.fill();

      // Player Arrow
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 5);
      ctx.lineTo(0, 2);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.restore();
    }, [playerX, playerZ, playerYaw, targets]);

    return (
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#06090e] border-2 border-slate-700/80 shadow-xl overflow-hidden shrink-0 pointer-events-auto">
        <canvas
          ref={canvasRef}
          width={96}
          height={96}
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
