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

    const PARTICLE_COUNT = 36;
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: -0.35 - Math.random() * 0.65,
        radius: 0.8 + Math.random() * 1.8,
        alpha: 0.25 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        isGold: Math.random() > 0.45,
      });
    }

    const renderParticles = () => {
      animId = requestAnimationFrame(renderParticles);
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.phase += 0.03;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const flicker = 0.65 + 0.35 * Math.sin(p.phase);
        const a = p.alpha * flicker;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.isGold
          ? `rgba(245, 158, 11, ${a.toFixed(2)})`
          : `rgba(148, 163, 184, ${(a * 0.55).toFixed(2)})`;
        ctx.fill();
      }
    };

    renderParticles();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <img
        src={codOperatorBg}
        alt="Operador Tático"
        className="w-full h-full object-cover object-center opacity-90"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/30 to-black/75" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/65" />
      <canvas
        ref={particlesCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </div>
  );
};
