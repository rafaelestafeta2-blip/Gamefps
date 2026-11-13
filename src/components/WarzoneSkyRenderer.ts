import { FactionBannerTeam } from './FactionFlagTexture';

function drawDetailedHelicopter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  tilt: number,
  timeSec: number,
  withSpotlight: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(scale, Math.abs(scale));

  if (withSpotlight) {
    const beamSwing = Math.sin(timeSec * 1.4 + x * 0.01) * 0.14;
    ctx.save();
    ctx.translate(18, 6);
    ctx.rotate(beamSwing);
    const beamGrad = ctx.createLinearGradient(0, 0, 90, 210);
    beamGrad.addColorStop(0, 'rgba(254, 202, 202, 0.20)');
    beamGrad.addColorStop(0.45, 'rgba(239, 68, 68, 0.07)');
    beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(52, 215);
    ctx.lineTo(128, 195);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = 'rgba(10, 12, 18, 0.92)';
  ctx.beginPath();
  ctx.moveTo(30, 2);
  ctx.bezierCurveTo(26, -9, 8, -11, -14, -9);
  ctx.lineTo(-58, -12);
  ctx.lineTo(-68, -24);
  ctx.lineTo(-61, -24);
  ctx.lineTo(-51, -7);
  ctx.lineTo(-16, 5);
  ctx.bezierCurveTo(6, 9, 25, 8, 30, 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(248, 113, 113, 0.24)';
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.lineTo(11, -6);
  ctx.lineTo(9, 1);
  ctx.closePath();
  ctx.fill();

  const rotorSpan = 62 * (0.45 + 0.55 * Math.abs(Math.sin(timeSec * 38 + x)));
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-rotorSpan, -14);
  ctx.lineTo(rotorSpan, -13);
  ctx.stroke();

  const blinkOn = Math.sin(timeSec * 7.5 + x * 0.05) > 0.35;
  if (blinkOn) {
    ctx.fillStyle = 'rgba(239, 68, 68, 0.95)';
    ctx.beginPath();
    ctx.arc(-64, -24, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawAnimatedWarzoneSkyLayer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  team: FactionBannerTeam = 'BLACKTHORN'
): void {
  const isVanguard = team === 'VANGUARD';
  const heliScale = Math.max(0.54, Math.min(1.0, width / 1400));

  // Névoa carmesim/azul pulsante suave no nível do chão molhado
  const pulse = 0.85 + 0.15 * Math.sin(timeSec * 1.6);
  const groundFog = ctx.createRadialGradient(
    width * 0.48,
    height * 0.82,
    10,
    width * 0.48,
    height * 0.82,
    width * 0.38
  );
  if (isVanguard) {
    groundFog.addColorStop(0, `rgba(14, 165, 233, ${(0.18 * pulse).toFixed(2)})`);
    groundFog.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else {
    groundFog.addColorStop(0, `rgba(220, 38, 38, ${(0.22 * pulse).toFixed(2)})`);
    groundFog.addColorStop(0.55, `rgba(153, 27, 27, ${(0.11 * pulse).toFixed(2)})`);
    groundFog.addColorStop(1, 'rgba(0, 0, 0, 0)');
  }
  ctx.fillStyle = groundFog;
  ctx.fillRect(0, height * 0.45, width, height * 0.55);

  const spanW = width + 320;
  const h1X = ((timeSec * 28 + width * 0.24) % spanW) - 160;
  const h1Y = height * 0.22 + Math.sin(timeSec * 1.3) * 5;
  drawDetailedHelicopter(ctx, h1X, h1Y, heliScale * 0.82, 0.06, timeSec, true);

  const h2X = width + 160 - ((timeSec * 20 + width * 0.62) % spanW);
  const h2Y = height * 0.31 + Math.cos(timeSec * 1.1) * 4;
  drawDetailedHelicopter(ctx, h2X, h2Y, -heliScale * 0.62, -0.05, timeSec + 1.7, false);
}

function drawTacticalMilitaryCrate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  isVanguard: boolean
) {
  // Corpo principal metálico escuro da caixa militar
  const bodyGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  bodyGrad.addColorStop(0, '#14171f');
  bodyGrad.addColorStop(0.55, '#0b0d13');
  bodyGrad.addColorStop(1, '#1c0b0e');
  ctx.fillStyle = bodyGrad;
  ctx.fillRect(x, y, w, h);

  // Tampa superior chanfrada da caixa
  ctx.fillStyle = '#1e232e';
  ctx.fillRect(x - 2, y, w + 4, Math.max(6, h * 0.16));

  // Brilho especular na borda superior e rim-light vermelho/azul na direita
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.25)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - 2, y + 1);
  ctx.lineTo(x + w + 2, y + 1);
  ctx.stroke();

  ctx.strokeStyle = isVanguard
    ? 'rgba(56, 189, 248, 0.5)'
    : 'rgba(239, 68, 68, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  // Nervuras verticais e fechos metálicos táticos
  const ribs = 4;
  for (let i = 1; i < ribs; i++) {
    const rx = x + (w * i) / ribs;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(rx - 2, y + h * 0.18, 4, h * 0.76);
    // Fecho prateado na tampa
    ctx.fillStyle = 'rgba(203, 213, 225, 0.45)';
    ctx.fillRect(rx - 2.5, y + h * 0.12, 5, 6);
  }
}

export function createWarzoneBackdropCanvas(
  rawWidth: number,
  rawHeight: number,
  team: FactionBannerTeam = 'BLACKTHORN'
): HTMLCanvasElement {
  const width = Math.max(1, Math.floor(rawWidth || 0));
  const height = Math.max(1, Math.floor(rawHeight || 0));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const isVanguard = team === 'VANGUARD';

  // 1. Céu tempestuoso escuro igual à imagem anexada
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
  skyGrad.addColorStop(0.0, '#040508');
  skyGrad.addColorStop(0.28, '#0c0f16');
  skyGrad.addColorStop(0.58, isVanguard ? '#0c1c36' : '#26090d');
  skyGrad.addColorStop(0.83, isVanguard ? '#0e294d' : '#450a0f');
  skyGrad.addColorStop(0.86, '#080507');
  skyGrad.addColorStop(1.0, '#030305');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Nuvens de tempestade prateadas/cinzas no topo direito (como na foto)
  const cloudCenters = [
    [0.62, 0.16, 0.18, 'rgba(203, 213, 225, 0.18)'],
    [0.54, 0.22, 0.15, 'rgba(148, 163, 184, 0.14)'],
    [0.36, 0.18, 0.16, 'rgba(148, 163, 184, 0.11)'],
  ] as const;
  for (const [cx, cy, cr, col] of cloudCenters) {
    const cg = ctx.createRadialGradient(
      width * cx,
      height * cy,
      4,
      width * cx,
      height * cy,
      width * cr
    );
    cg.addColorStop(0, col);
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, width, height * 0.5);
  }

  // 3. Fumaça volumétrica vermelha carmesim intensa atrás do soldado e das caixas
  const smokeGlows = [
    [0.46, 0.68, 0.36, isVanguard ? 'rgba(14,165,233,0.42)' : 'rgba(220,38,38,0.52)'],
    [0.28, 0.78, 0.24, isVanguard ? 'rgba(56,189,248,0.35)' : 'rgba(239,68,68,0.46)'],
    [0.66, 0.74, 0.25, isVanguard ? 'rgba(2,132,199,0.32)' : 'rgba(185,28,28,0.42)'],
  ] as const;
  for (const [gx, gy, gr, col] of smokeGlows) {
    const g = ctx.createRadialGradient(
      width * gx,
      height * gy,
      8,
      width * gx,
      height * gy,
      width * gr
    );
    g.addColorStop(0, col);
    g.addColorStop(0.55, isVanguard ? 'rgba(15,23,42,0.2)' : 'rgba(127,29,29,0.22)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  // 4. Prédios industriais destruídos ao fundo (esquerda e direita)
  const buildings = [
    [0.21, 0.36, 0.065, 0.48],
    [0.57, 0.54, 0.055, 0.31],
    [0.62, 0.48, 0.065, 0.37],
    [0.68, 0.52, 0.055, 0.33],
  ];
  for (const [bx, by, bw, bh] of buildings) {
    const x = width * bx;
    const y = height * by;
    const w = width * bw;
    const h = height * bh;
    ctx.fillStyle = '#090b10';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = isVanguard ? 'rgba(56,189,248,0.25)' : 'rgba(239,68,68,0.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  }

  // 5. Pilha de caixas militares pretas táticas à esquerda do soldado (idêntico à foto)
  const crateSpecs = [
    [0.31, 0.51, 0.065, 0.095],
    [0.25, 0.59, 0.075, 0.105],
    [0.32, 0.60, 0.082, 0.11],
    [0.24, 0.69, 0.115, 0.11],
    [0.34, 0.71, 0.095, 0.095],
    [0.29, 0.78, 0.125, 0.085],
  ];
  for (const [cx, cy, cw, ch] of crateSpecs) {
    drawTacticalMilitaryCrate(
      ctx,
      width * cx,
      height * cy,
      width * cw,
      height * ch,
      isVanguard
    );
  }

  // 6. Chão de asfalto molhado escuro com reflexos vermelhos brilhantes (y: 84%..100%)
  const floorY = height * 0.845;
  const floorH = height - floorY;
  const floorGrad = ctx.createLinearGradient(0, floorY, 0, height);
  floorGrad.addColorStop(0, '#120507');
  floorGrad.addColorStop(0.35, '#080406');
  floorGrad.addColorStop(1, '#020204');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, floorY, width, floorH);

  // Reflexos horizontais de poças d'água iluminadas em vermelho/laranja no asfalto
  for (let i = 0; i < 38; i++) {
    const ry = floorY + (i / 38) * floorH;
    const spread = 0.22 + (i / 38) * 0.35;
    const rx = width * (0.48 - spread * 0.5 + Math.sin(i * 1.7) * 0.06);
    const rw = width * spread * (0.6 + 0.4 * Math.cos(i * 2.3));
    const alpha = (1 - i / 42) * 0.55;
    ctx.fillStyle = isVanguard
      ? `rgba(56, 189, 248, ${alpha.toFixed(2)})`
      : i % 3 === 0
      ? `rgba(251, 146, 60, ${alpha.toFixed(2)})`
      : `rgba(239, 68, 68, ${alpha.toFixed(2)})`;
    ctx.fillRect(rx, ry, rw, 2.2);
  }

  return canvas;
}
