import React, { useEffect, useRef } from 'react';
import { WeaponId } from '../types/game';
import { FactionFlagCanvas } from './FactionFlagCanvas';
import {
  createWarzoneBackdropCanvas,
  drawAnimatedWarzoneSkyLayer,
} from './FactionFlagTexture';
import { RankedOperator3DCanvas } from './RankedOperator3DCanvas';
import { WarfaceClassId } from './WarfaceClassIcons';

interface MenuBackgroundProps {
  showHero?: boolean;
  activeWeapon?: WeaponId;
  selectedClass?: WarfaceClassId;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
  isEmber: boolean;
  isBokeh: boolean;
}

const REFERENCE_BG_SRC =
  '/assets/aistudio/file_00000000d0d881f495740d2844f1a6a1_70b43b8b.png';

export const MenuBackground: React.FC<MenuBackgroundProps> = ({
  showHero = true,
  activeWeapon = 'M4_CARBINE',
  selectedClass,
}) => {
  const backdropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const skyAnimCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = particlesCanvasRef.current;
    const skyCanvas = skyAnimCanvasRef.current;
    const backdropCanvas = backdropCanvasRef.current;
    if (!canvas || !skyCanvas || !backdropCanvas) return;
    const ctx = canvas.getContext('2d');
    const sctx = skyCanvas.getContext('2d');
    const bctx = backdropCanvas.getContext('2d');
    if (!ctx || !sctx || !bctx) return;

    let animId = 0;
    let refImage: HTMLImageElement | null = null;
    let width = (canvas.width =
      skyCanvas.width =
      backdropCanvas.width =
        Math.max(1, window.innerWidth));
    let height = (canvas.height =
      skyCanvas.height =
      backdropCanvas.height =
        Math.max(1, window.innerHeight));

    const compositeReferenceWarzoneSlices = (img: HTMLImageElement) => {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      if (iw <= 0 || ih <= 0) return;

      // 1. Faixa esquerda da imagem de referência (caixas militares empilhadas + mastro + fumaça vermelha)
      bctx.save();
      bctx.globalAlpha = 0.94;
      bctx.drawImage(
        img,
        iw * 0.246,
        ih * 0.108,
        iw * 0.162,
        ih * 0.885,
        width * 0.22,
        height * 0.105,
        width * 0.20,
        height * 0.895
      );

      // 2. Faixa direita da imagem de referência (nuvens de tempestade + cidade em ruínas + fumaça)
      bctx.drawImage(
        img,
        iw * 0.575,
        ih * 0.108,
        iw * 0.122,
        ih * 0.885,
        width * 0.56,
        height * 0.105,
        width * 0.16,
        height * 0.895
      );

      // 3. Faixa inferior de escombros e asfalto molhado com reflexos vermelhos
      bctx.drawImage(
        img,
        iw * 0.01,
        ih * 0.84,
        iw * 0.40,
        ih * 0.16,
        0,
        height * 0.84,
        width * 0.44,
        height * 0.16
      );
      bctx.restore();

      // Suaviza a transição central onde fica o Soldado 3D (.glb) e a Bandeira 3D
      const centerBlend = bctx.createLinearGradient(
        width * 0.37,
        0,
        width * 0.61,
        0
      );
      centerBlend.addColorStop(0, 'rgba(20, 4, 6, 0)');
      centerBlend.addColorStop(0.28, 'rgba(32, 6, 9, 0.72)');
      centerBlend.addColorStop(0.72, 'rgba(28, 5, 8, 0.72)');
      centerBlend.addColorStop(1, 'rgba(20, 4, 6, 0)');
      bctx.fillStyle = centerBlend;
      bctx.fillRect(width * 0.37, height * 0.1, width * 0.24, height * 0.76);
    };

    const drawStaticBackdrop = () => {
      if (width <= 0 || height <= 0) return;
      const baked = createWarzoneBackdropCanvas(width, height, 'BLACKTHORN');
      if (baked.width <= 0 || baked.height <= 0) return;
      bctx.clearRect(0, 0, width, height);
      bctx.drawImage(baked, 0, 0);
      if (refImage && refImage.complete && refImage.naturalWidth > 0) {
        compositeReferenceWarzoneSlices(refImage);
      }
    };
    drawStaticBackdrop();

    const imgLoader = new Image();
    imgLoader.crossOrigin = 'anonymous';
    imgLoader.onload = () => {
      refImage = imgLoader;
      drawStaticBackdrop();
    };
    imgLoader.src = REFERENCE_BG_SRC;

    const handleResize = () => {
      if (!canvas || !skyCanvas || !backdropCanvas) return;
      if (window.innerWidth <= 0 || window.innerHeight <= 0) return;
      width =
        canvas.width =
        skyCanvas.width =
        backdropCanvas.width =
          window.innerWidth;
      height =
        canvas.height =
        skyCanvas.height =
        backdropCanvas.height =
          window.innerHeight;
      drawStaticBackdrop();
    };
    window.addEventListener('resize', handleResize);

    const PARTICLE_COUNT = 38;
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const isBokeh = i < 7;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.42) * 0.42,
        vy: -0.28 - Math.random() * 0.52,
        radius: isBokeh ? 1.8 + Math.random() * 1.8 : 0.8 + Math.random() * 1.3,
        alpha: isBokeh ? 0.28 + Math.random() * 0.32 : 0.28 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
        isEmber: Math.random() > 0.2,
        isBokeh,
      });
    }

    const startTime = performance.now();

    const renderLoop = (now: number) => {
      if (document.hidden) return;
      animId = requestAnimationFrame(renderLoop);
      const timeSec = (now - startTime) * 0.001;

      sctx.clearRect(0, 0, width, height);
      drawAnimatedWarzoneSkyLayer(sctx, width, height, timeSec, 'BLACKTHORN');

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
        if (p.isEmber) {
          ctx.fillStyle = p.isBokeh
            ? `rgba(239, 68, 68, ${(a * 0.78).toFixed(2)})`
            : `rgba(251, 113, 133, ${a.toFixed(2)})`;
        } else {
          ctx.fillStyle = `rgba(148, 163, 184, ${(a * 0.42).toFixed(2)})`;
        }
        ctx.fill();
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animId);
      } else {
        animId = requestAnimationFrame(renderLoop);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    if (!document.hidden) {
      animId = requestAnimationFrame(renderLoop);
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 isolate overflow-hidden bg-[#040508]">
      {/* CAMADA 0: Cenário Warzone c/ Caixas Militares Empilhadas, Fumaça Carmesim e Chão Molhado */}
      <canvas
        ref={backdropCanvasRef}
        className="absolute inset-0 z-0 w-full h-full pointer-events-none"
      />

      {/* CAMADA 1: Névoa Volumétrica Pulsante + Helicópteros */}
      <canvas
        ref={skyAnimCanvasRef}
        className="absolute inset-0 z-[5] w-full h-full pointer-events-none"
      />

      {/* CAMADA 2 & 3: Bandeira 3D BLACKTHORN + Operador 3D (.glb) centralizado como na foto */}
      {showHero && (
        <>
          <FactionFlagCanvas team="BLACKTHORN" layoutMode="HERO_CENTER" />
          <div className="absolute inset-x-0 top-9 bottom-0 z-20 flex items-center justify-center pointer-events-none">
            <div className="w-[360px] sm:w-[470px] h-full pointer-events-auto">
              <RankedOperator3DCanvas
                activeWeapon={activeWeapon}
                operatorClass={selectedClass}
                team="BLACKTHORN"
              />
            </div>
          </div>
        </>
      )}

      {/* CAMADA 4: Fagulhas vermelhas e cinzas flutuando */}
      <canvas
        ref={particlesCanvasRef}
        className="absolute inset-0 z-30 w-full h-full pointer-events-none mix-blend-screen"
      />

      {/* CAMADA 5: Vinheta cinematográfica suave nas bordas */}
      <div
        className="absolute inset-0 z-30 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(4,5,8,0.68) 0%, rgba(4,5,8,0.02) 24%, rgba(4,5,8,0.02) 76%, rgba(4,5,8,0.68) 100%)',
        }}
      />
    </div>
  );
};
