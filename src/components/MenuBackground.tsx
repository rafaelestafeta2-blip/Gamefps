import React, { useEffect, useRef } from 'react';

const codOperatorBg = '/assets/images/cod_operator_bg_1794057245328.jpg';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
  isGold: boolean;
  isBokeh: boolean;
}

interface SmokePuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  rotation: number;
  vRot: number;
  phase: number;
  tint: 'COOL' | 'WARM';
}

function createSmokeSprite(tint: 'COOL' | 'WARM'): HTMLCanvasElement {
  const size = 128;
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const octx = off.getContext('2d');
  if (!octx) return off;

  const half = size / 2;
  // Multi-lobe organic cloud puff baked once for 60 FPS mobile performance
  const lobes = [
    { ox: 0, oy: 0, r: half * 0.95, a: 0.42 },
    { ox: -14, oy: 8, r: half * 0.72, a: 0.32 },
    { ox: 16, oy: -6, r: half * 0.68, a: 0.3 },
    { ox: 6, oy: 14, r: half * 0.65, a: 0.28 },
  ];

  for (const lobe of lobes) {
    const cx = half + lobe.ox;
    const cy = half + lobe.oy;
    const grad = octx.createRadialGradient(cx, cy, 2, cx, cy, lobe.r);
    if (tint === 'WARM') {
      grad.addColorStop(0, `rgba(217, 149, 75, ${lobe.a})`);
      grad.addColorStop(0.45, `rgba(120, 95, 75, ${lobe.a * 0.55})`);
      grad.addColorStop(1, 'rgba(30, 25, 22, 0)');
    } else {
      grad.addColorStop(0, `rgba(148, 163, 184, ${lobe.a})`);
      grad.addColorStop(0.5, `rgba(71, 85, 105, ${lobe.a * 0.55})`);
      grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    }
    octx.fillStyle = grad;
    octx.beginPath();
    octx.arc(cx, cy, lobe.r, 0, Math.PI * 2);
    octx.fill();
  }

  return off;
}

export const MenuBackground: React.FC = () => {
  const particlesCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = particlesCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Pre-bake soft volumetric smoke sprites once (zero GC in animation loop)
    const coolSmokeSprite = createSmokeSprite('COOL');
    const warmSmokeSprite = createSmokeSprite('WARM');

    const SMOKE_COUNT = 18;
    const smokePuffs: SmokePuff[] = [];
    for (let i = 0; i < SMOKE_COUNT; i++) {
      smokePuffs.push({
        x: width * (0.25 + Math.random() * 0.65),
        y: height * (0.15 + Math.random() * 0.8),
        vx: (Math.random() - 0.35) * 0.28,
        vy: -0.08 - Math.random() * 0.16,
        size: Math.max(width, height) * (0.22 + Math.random() * 0.26),
        alpha: 0.16 + Math.random() * 0.22,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.0018,
        phase: Math.random() * Math.PI * 2,
        tint: i % 3 === 0 ? 'WARM' : 'COOL',
      });
    }

    const PARTICLE_COUNT = 48;
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const isBokeh = i < 8;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.45) * 0.4,
        vy: -0.25 - Math.random() * 0.55,
        radius: isBokeh ? 2.2 + Math.random() * 2.4 : 0.7 + Math.random() * 1.5,
        alpha: isBokeh ? 0.32 + Math.random() * 0.4 : 0.25 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        isGold: Math.random() > 0.28,
        isBokeh,
      });
    }

    const renderScene = () => {
      animId = requestAnimationFrame(renderScene);
      ctx.clearRect(0, 0, width, height);

      // 1. Render slow-drifting volumetric smoke plumes around & behind operator
      for (let i = 0; i < SMOKE_COUNT; i++) {
        const s = smokePuffs[i];
        s.x += s.vx;
        s.y += s.vy;
        s.rotation += s.vRot;
        s.phase += 0.012;

        if (s.y < -s.size * 0.4) {
          s.y = height + s.size * 0.3;
          s.x = width * (0.25 + Math.random() * 0.65);
        }
        if (s.x < width * 0.15 - s.size * 0.3) s.x = width * 0.9;
        if (s.x > width * 0.95 + s.size * 0.3) s.x = width * 0.25;

        const breath = 0.75 + 0.25 * Math.sin(s.phase);
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation);
        ctx.globalAlpha = s.alpha * breath;
        const sprite = s.tint === 'WARM' ? warmSmokeSprite : coolSmokeSprite;
        ctx.drawImage(sprite, -s.size / 2, -s.size / 2, s.size, s.size);
        ctx.restore();
      }

      // 2. Render floating embers and atmospheric dust
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.phase += 0.028;

        if (p.y < -12) {
          p.y = height + 12;
          p.x = Math.random() * width;
        }
        if (p.x < -12) p.x = width + 12;
        if (p.x > width + 12) p.x = -12;

        const flicker = 0.65 + 0.35 * Math.sin(p.phase);
        const a = p.alpha * flicker;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        if (p.isGold) {
          ctx.fillStyle = p.isBokeh
            ? `rgba(251, 146, 60, ${(a * 0.78).toFixed(2)})`
            : `rgba(245, 158, 11, ${a.toFixed(2)})`;
        } else {
          ctx.fillStyle = `rgba(148, 163, 184, ${(a * 0.5).toFixed(2)})`;
        }
        ctx.fill();
      }
    };

    renderScene();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#06080c]">
      {/* Subtle tactical diagonal carbon texture */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 6px)',
        }}
      />

      {/* Rim-light halo behind central operator */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_58%_at_58%_44%,rgba(245,158,11,0.18)_0%,rgba(56,189,248,0.07)_40%,transparent_74%)]" />

      {/* Central Tactical Soldier shifted slightly right of left menu cards */}
      <img
        src={codOperatorBg}
        alt="Operador Tático KINETIC"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover object-center translate-x-[5%] sm:translate-x-[6%] brightness-[1.48] contrast-[1.15] select-none"
      />

      {/* Volumetric Smoke & Ember Canvas (screen-blended around the soldier) */}
      <canvas
        ref={particlesCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen"
      />

      {/* Measured edge vignette preserving bright central soldier */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_58%_45%,transparent_30%,rgba(6,8,12,0.5)_70%,rgba(6,8,12,0.92)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#06080c]/85 via-transparent to-[#06080c]/35" />
    </div>
  );
};
