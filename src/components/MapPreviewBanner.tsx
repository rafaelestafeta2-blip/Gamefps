import React, { useEffect, useRef } from 'react';
import { MainMenuPlayModeId } from './MainMenuRightWidgets';

interface MapPreviewBannerProps {
  modeId: MainMenuPlayModeId;
  className?: string;
}

const REFERENCE_MENU_IMG_SRC =
  '/assets/aistudio/file_00000000d0d881f495740d2844f1a6a1_70b43b8b.png';

let cachedRefImg: HTMLImageElement | null = null;
let refImgListeners: Array<(img: HTMLImageElement) => void> = [];

function loadReferenceMenuImage(cb: (img: HTMLImageElement) => void) {
  if (cachedRefImg && cachedRefImg.complete && cachedRefImg.naturalWidth > 0) {
    cb(cachedRefImg);
    return;
  }
  refImgListeners.push(cb);
  if (!cachedRefImg) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      cachedRefImg = img;
      const list = refImgListeners.slice();
      refImgListeners = [];
      for (const fn of list) fn(img);
    };
    img.src = REFERENCE_MENU_IMG_SRC;
  }
}

function drawDust2FallbackScene(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Céu árido ensolarado com nuvens quentes de DE_DUST2
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.65);
  sky.addColorStop(0, '#9fb6c8');
  sky.addColorStop(0.55, '#dfd3c3');
  sky.addColorStop(1, '#e7c9a9');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Chão de areia e pedra do Bomb A / Long Doors
  const ground = ctx.createLinearGradient(0, h * 0.62, 0, h);
  ground.addColorStop(0, '#c69c72');
  ground.addColorStop(0.5, '#a67b54');
  ground.addColorStop(1, '#6f4e34');
  ctx.fillStyle = ground;
  ctx.fillRect(0, h * 0.62, w, h * 0.38);

  // Cúpula distante ao centro
  ctx.fillStyle = '#d8c3a8';
  ctx.beginPath();
  ctx.arc(w * 0.56, h * 0.48, h * 0.16, Math.PI, 0);
  ctx.fill();

  // Prédios de arenito à esquerda (Bomb A / Varanda)
  ctx.fillStyle = '#b98f67';
  ctx.fillRect(0, h * 0.22, w * 0.24, h * 0.54);
  ctx.fillStyle = '#9c734f';
  ctx.fillRect(w * 0.21, h * 0.32, w * 0.22, h * 0.42);

  // Prédio forte de arenito à direita (Long / Pit)
  ctx.fillStyle = '#c4966c';
  ctx.fillRect(w * 0.68, h * 0.16, w * 0.32, h * 0.62);
  ctx.fillStyle = '#8b6240';
  ctx.fillRect(w * 0.63, h * 0.38, w * 0.08, h * 0.38);

  // Janelas escuras e arcos árabes
  ctx.fillStyle = '#2d1e14';
  const windows = [
    [0.06, 0.34, 0.03, 0.12],
    [0.14, 0.34, 0.03, 0.12],
    [0.27, 0.44, 0.035, 0.14],
    [0.35, 0.44, 0.035, 0.14],
    [0.75, 0.28, 0.035, 0.13],
    [0.84, 0.28, 0.035, 0.13],
    [0.78, 0.52, 0.045, 0.2],
  ];
  for (const [wx, wy, ww, wh] of windows) {
    ctx.fillRect(w * wx, h * wy, w * ww, h * wh);
  }

  // Palmeira icônica do centro de Dust2
  const px = w * 0.48;
  const py = h * 0.72;
  ctx.strokeStyle = '#5c3d28';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.quadraticCurveTo(px - 4, h * 0.45, px - 2, h * 0.28);
  ctx.stroke();

  ctx.strokeStyle = '#2f4f28';
  ctx.lineWidth = 2.2;
  const fronds = [
    [-26, -6],
    [-22, 6],
    [-14, -14],
    [18, -12],
    [26, -3],
    [22, 8],
  ];
  for (const [fx, fy] of fronds) {
    ctx.beginPath();
    ctx.moveTo(px - 2, h * 0.28);
    ctx.quadraticCurveTo(px + fx * 0.5, h * 0.22 + fy * 0.3, px + fx, h * 0.28 + fy);
    ctx.stroke();
  }
}

function drawAssaultWarehouseScene(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Céu urbano crepuscular industrial (CS_ASSAULT)
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#0f172a');
  sky.addColorStop(0.55, '#1e293b');
  sky.addColorStop(1, '#090d16');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Asfalto molhado do pátio externo
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, h * 0.68, w, h * 0.32);

  // Galpão industrial principal de aço azul-acinzentado com teto arqueado
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(w * 0.18, h * 0.72);
  ctx.lineTo(w * 0.18, h * 0.28);
  ctx.quadraticCurveTo(w * 0.48, h * 0.12, w * 0.78, h * 0.28);
  ctx.lineTo(w * 0.78, h * 0.72);
  ctx.closePath();
  ctx.fill();

  // Fachada de tijolos industriais à esquerda e direita
  ctx.fillStyle = '#5b2320';
  ctx.fillRect(0, h * 0.24, w * 0.2, h * 0.5);
  ctx.fillRect(w * 0.76, h * 0.3, w * 0.24, h * 0.44);

  // Portão de carga metálico e containers táticos
  ctx.fillStyle = '#334155';
  ctx.fillRect(w * 0.38, h * 0.38, w * 0.22, h * 0.34);
  ctx.fillStyle = '#991b1b';
  ctx.fillRect(w * 0.22, h * 0.48, w * 0.14, h * 0.24);
  ctx.fillStyle = '#0369a1';
  ctx.fillRect(w * 0.62, h * 0.5, w * 0.13, h * 0.22);

  // Claraboias iluminadas no galpão
  ctx.fillStyle = 'rgba(253, 224, 71, 0.75)';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(w * (0.25 + i * 0.095), h * 0.28, w * 0.055, h * 0.06);
  }
}

function drawShootingRangeScene(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#090d14');
  bg.addColorStop(0.5, '#161f2e');
  bg.addColorStop(1, '#0b0f17');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Piso de concreto balístico com linhas de distância
  ctx.fillStyle = '#1e2634';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w * 0.22, h * 0.54);
  ctx.lineTo(w * 0.78, h * 0.54);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Divisórias das baias de tiro e alvos silhueta
  ctx.fillStyle = '#0f141d';
  ctx.fillRect(0, 0, w * 0.16, h);
  ctx.fillRect(w * 0.84, 0, w * 0.16, h);

  const targets = [0.3, 0.44, 0.56, 0.7];
  for (const tx of targets) {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(w * tx - 6, h * 0.36, 12, 18);
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(w * tx, h * 0.43, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawKillhouseScene(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#17120e');
  bg.addColorStop(0.6, '#2b2118');
  bg.addColorStop(1, '#120d0a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Paredes modulares de compensado tático CQB
  const walls = [
    [0.06, 0.18, 0.22, 0.66, '#855834'],
    [0.31, 0.26, 0.18, 0.54, '#6e4729'],
    [0.54, 0.22, 0.2, 0.58, '#96653d'],
    [0.77, 0.16, 0.18, 0.68, '#784e2d'],
  ] as const;
  for (const [wx, wy, ww, wh, col] of walls) {
    ctx.fillStyle = col;
    ctx.fillRect(w * wx, h * wy, w * ww, h * wh);
    ctx.strokeStyle = '#3e2716';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(w * wx, h * wy, w * ww, h * wh);
  }
}

export const MapPreviewBanner: React.FC<MapPreviewBannerProps> = ({
  modeId,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = (canvas.width = 455);
    const h = (canvas.height = 92);

    const renderOverlayVignette = () => {
      const vig = ctx.createLinearGradient(0, 0, 0, h);
      vig.addColorStop(0, 'rgba(0, 0, 0, 0.28)');
      vig.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
      vig.addColorStop(1, 'rgba(0, 0, 0, 0.36)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    };

    const isDust2Mode =
      modeId === 'CASUAL_DUST2' || modeId === 'RANKED' || modeId === 'PRIVATE_ROOM';

    if (isDust2Mode) {
      drawDust2FallbackScene(ctx, w, h);
      renderOverlayVignette();

      loadReferenceMenuImage((img) => {
        if (!canvasRef.current) return;
        const c = canvasRef.current.getContext('2d');
        if (!c) return;
        // Recorte exato da foto do mapa Dust2 presente na imagem de referência (1672x941)
        const sx = Math.round(img.naturalWidth * 0.706);
        const sy = Math.round(img.naturalHeight * 0.698);
        const sw = Math.round(img.naturalWidth * 0.272);
        const sh = Math.round(img.naturalHeight * 0.098);
        c.clearRect(0, 0, w, h);
        c.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      });
      return;
    }

    if (modeId === 'CASUAL_ASSAULT' || modeId === 'CASUAL_INDUSTRIA' || modeId === 'CASUAL_HANGAR') {
      drawAssaultWarehouseScene(ctx, w, h);
    } else if (modeId === 'RANGE') {
      drawShootingRangeScene(ctx, w, h);
    } else {
      drawKillhouseScene(ctx, w, h);
    }
    renderOverlayVignette();
  }, [modeId]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-[42px] lg:h-[74px] block object-cover ${className}`}
    />
  );
};
