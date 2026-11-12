import React, { useEffect, useRef } from 'react';
import { WeaponId } from '../types/game';
import { FactionFlagCanvas } from './FactionFlagCanvas';
import { createWarzoneBackdropCanvas } from './FactionFlagTexture';
import { RankedOperator3DCanvas } from './RankedOperator3DCanvas';

interface MenuBackgroundProps {
  showHero?: boolean;
  activeWeapon?: WeaponId;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
  isCrimson: boolean;
  isBokeh: boolean;
}

export const MenuBackground: React.FC<MenuBackgroundProps> = ({
  showHero = true,
  activeWeapon = 'M4_CARBINE',
}) => {
  const backdropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = particlesCanvasRef.current;
    const backdropCanvas = backdropCanvasRef.current;
    if (!canvas || !backdropCanvas) return;
    const ctx = canvas.getContext('2d');
    const bctx = backdropCanvas.getContext('2d');
    if (!ctx || !bctx) return;

    let animId = 0;
    let width = (canvas.width = backdropCanvas.width = Math.max(1, window.innerWidth));
    let height = (canvas.height = backdropCanvas.height = Math.max(1, window.innerHeight));

    const drawStaticBackdrop = () => {
      if (width <= 0 || height <= 0) return;
      const baked = createWarzoneBackdropCanvas(width, height, 'BLACKTHORN');
      if (baked.width <= 0 || baked.height <= 0) return;
      bctx.clearRect(0, 0, width, height);
      bctx.drawImage(baked, 0, 0);
    };
    drawStaticBackdrop();

    const handleResize = () => {
      if (!canvas || !backdropCanvas) return;
      if (window.innerWidth <= 0 || window.innerHeight <= 0) return;
      width = canvas.width = backdropCanvas.width = window.innerWidth;
      height = canvas.height = backdropCanvas.height = window.innerHeight;
      drawStaticBackdrop();
    };
    window.addEventListener('resize', handleResize);

    const PARTICLE_COUNT = 34;
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const isBokeh = i < 7;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.42) * 0.42,
        vy: -0.28 - Math.random() * 0.52,
        radius: isBokeh ? 2.0 + Math.random() * 2.0 : 0.9 + Math.random() * 1.4,
        alpha: isBokeh ? 0.32 + Math.random() * 0.35 : 0.28 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        isCrimson: Math.random() > 0.2,
        isBokeh,
      });
    }

    const renderParticles = () => {
      if (document.hidden) return;
      animId = requestAnimationFrame(renderParticles);
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.phase += 0.03;

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
        if (p.isCrimson) {
          ctx.fillStyle = p.isBokeh
            ? `rgba(239, 68, 68, ${(a * 0.8).toFixed(2)})`
            : `rgba(249, 115, 22, ${a.toFixed(2)})`;
        } else {
          ctx.fillStyle = `rgba(148, 163, 184, ${(a * 0.4).toFixed(2)})`;
        }
        ctx.fill();
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animId);
      } else {
        animId = requestAnimationFrame(renderParticles);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    if (!document.hidden) renderParticles();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 isolate overflow-hidden bg-[#05060a]">
      {/* CAMADA 0: Cenário Warzone Carmesim */}
      <canvas
        ref={backdropCanvasRef}
        className="absolute inset-0 z-0 w-full h-full pointer-events-none"
      />

      {/* CAMADA 1 & 2: Bandeira 3D BLACKTHORN + Operador 3D (.glb) limpo e interativo no centro */}
      {showHero && (
        <>
          <FactionFlagCanvas team="BLACKTHORN" layoutMode="HERO_CENTER" />
          <div className="absolute inset-x-0 top-10 bottom-1 z-20 flex items-center justify-center pointer-events-none">
            <div className="w-[340px] sm:w-[440px] h-full pointer-events-auto">
              <RankedOperator3DCanvas activeWeapon={activeWeapon} team="BLACKTHORN" />
            </div>
          </div>
        </>
      )}

      {/* CAMADA 3: Brasas carmesim sutilmente sobre o cenário */}
      <canvas
        ref={particlesCanvasRef}
        className="absolute inset-0 z-30 w-full h-full pointer-events-none mix-blend-screen"
      />

      {/* CAMADA 4: Vinheta sutil apenas nas extremidades laterais */}
      <div
        className="absolute inset-0 z-30 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(5,6,10,0.72) 0%, rgba(5,6,10,0.02) 28%, rgba(5,6,10,0.02) 72%, rgba(5,6,10,0.72) 100%)',
        }}
      />
    </div>
  );
};
