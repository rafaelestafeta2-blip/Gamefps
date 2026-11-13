// Texturas procedurais PBR para os Estandartes 3D das Facções do jogo (BLACKTHORN & VANGUARD) + Cenário Warzone

export type FactionBannerTeam = 'BLACKTHORN' | 'VANGUARD';

export function createFactionBannerTexture(team: FactionBannerTeam = 'BLACKTHORN'): HTMLCanvasElement {
  const w = 1024;
  const h = 640;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const isVanguard = team === 'VANGUARD';

  // 1. Base de tecido militar pesado (Azul Real/Ciano para VANGUARD, Carmesim/Preto para BLACKTHORN)
  const baseGrad = ctx.createLinearGradient(0, 0, w, h);
  if (isVanguard) {
    baseGrad.addColorStop(0.0, '#041226');
    baseGrad.addColorStop(0.22, '#0a3366');
    baseGrad.addColorStop(0.52, '#0f5299');
    baseGrad.addColorStop(0.80, '#0a3569');
    baseGrad.addColorStop(1.0, '#030c1a');
  } else {
    baseGrad.addColorStop(0.0, '#300306');
    baseGrad.addColorStop(0.22, '#7d080f');
    baseGrad.addColorStop(0.52, '#b00c15');
    baseGrad.addColorStop(0.80, '#7a070d');
    baseGrad.addColorStop(1.0, '#220204');
  }
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, w, h);

  const centerGlow = ctx.createRadialGradient(w * 0.49, h * 0.5, 30, w * 0.49, h * 0.5, w * 0.52);
  if (isVanguard) {
    centerGlow.addColorStop(0.0, 'rgba(56, 189, 248, 0.52)');
    centerGlow.addColorStop(0.55, 'rgba(14, 116, 204, 0.24)');
    centerGlow.addColorStop(1.0, 'rgba(2, 6, 16, 0.76)');
  } else {
    centerGlow.addColorStop(0.0, 'rgba(235, 28, 38, 0.52)');
    centerGlow.addColorStop(0.55, 'rgba(135, 10, 18, 0.22)');
    centerGlow.addColorStop(1.0, 'rgba(8, 2, 3, 0.72)');
  }
  ctx.fillStyle = centerGlow;
  ctx.fillRect(0, 0, w, h);

  // 2. Trama real de tecido Ripstop militar
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 6) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 6) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  for (let i = 0; i < 34; i++) {
    const bx = (i * 137) % w;
    const by = (i * 89) % h;
    const br = 40 + ((i * 31) % 85);
    const soot = ctx.createRadialGradient(bx, by, 4, bx, by, br);
    soot.addColorStop(0, 'rgba(3, 6, 12, 0.34)');
    soot.addColorStop(1, 'rgba(3, 6, 12, 0)');
    ctx.fillStyle = soot;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Moldura tática sutil no tecido
  ctx.strokeStyle = isVanguard ? 'rgba(56, 189, 248, 0.28)' : 'rgba(255, 65, 70, 0.22)';
  ctx.lineWidth = 4;
  ctx.strokeRect(54, 48, w - 138, h - 96);

  // 4. EMBLEMA OFICIAL DO TIME NO JOGO (posicionado na metade direita para aparecer ao lado do Soldado 3D)
  ctx.save();
  ctx.translate(isVanguard ? w * 0.54 : w * 0.64, h * 0.51);
  const s = 5.4;
  ctx.scale(s, s);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 5;

  const halo = ctx.createRadialGradient(0, -4, 2, 0, 0, 40);
  halo.addColorStop(0, isVanguard ? 'rgba(56, 189, 248, 0.42)' : 'rgba(255, 50, 60, 0.35)');
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, Math.PI * 2);
  ctx.fill();

  if (isVanguard) {
    // EMBLEMA OFICIAL VANGUARD (Escudo Azul Metálico + Asas Laterais + V Central)
    const vgGrad = ctx.createLinearGradient(-22, -32, 22, 32);
    vgGrad.addColorStop(0.0, '#e0f2fe');
    vgGrad.addColorStop(0.45, '#38bdf8');
    vgGrad.addColorStop(1.0, '#0284c7');

    // Asas táticas de suporte atrás do escudo
    ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
    for (const dir of [-1, 1]) {
      ctx.save();
      ctx.scale(dir, 1);
      ctx.beginPath();
      ctx.moveTo(19, -18); ctx.lineTo(44, -27); ctx.lineTo(39, -15); ctx.lineTo(22, -8);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(21, -4); ctx.lineTo(40, -10); ctx.lineTo(35, 1); ctx.lineTo(20, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Escudo externo VANGUARD
    ctx.fillStyle = '#07182c';
    ctx.strokeStyle = vgGrad;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(0, -31);
    ctx.lineTo(25, -21);
    ctx.lineTo(25, -1);
    ctx.bezierCurveTo(25, 15, 14, 25, 0, 31);
    ctx.bezierCurveTo(-14, 25, -25, 15, -25, -1);
    ctx.lineTo(-25, -21);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Borda interna luminosa
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(18.5, -16.5);
    ctx.lineTo(18.5, -1.5);
    ctx.bezierCurveTo(18.5, 10.5, 10.5, 18.5, 0, 23.5);
    ctx.bezierCurveTo(-10.5, 18.5, -18.5, 10.5, -18.5, -1.5);
    ctx.lineTo(-18.5, -16.5);
    ctx.closePath();
    ctx.stroke();

    // V central emblemático VANGUARD
    ctx.fillStyle = vgGrad;
    ctx.beginPath();
    ctx.moveTo(-13, -13);
    ctx.lineTo(0, 17);
    ctx.lineTo(13, -13);
    ctx.lineTo(6.5, -13);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(-6.5, -13);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(224, 242, 254, 0.9)';
    ctx.font = '900 4.6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VANGUARD', 0, 41);
  } else {
    // EMBLEMA OFICIAL BLACKTHORN (Lança Carmesim + Asas Angulares + Núcleo)
    const spearGrad = ctx.createLinearGradient(-16, -26, 16, 26);
    spearGrad.addColorStop(0.0, '#fecdd3');
    spearGrad.addColorStop(0.35, '#ff2e38');
    spearGrad.addColorStop(0.75, '#dc1420');
    spearGrad.addColorStop(1.0, '#7f060c');

    ctx.fillStyle = spearGrad;
    ctx.beginPath();
    ctx.moveTo(0, -34); ctx.lineTo(7.5, -9); ctx.lineTo(0, 34); ctx.lineTo(-7.5, -9);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ff3842';
    ctx.beginPath();
    ctx.moveTo(-26, -4); ctx.lineTo(0, -14); ctx.lineTo(26, -4);
    ctx.lineTo(13, 1); ctx.lineTo(0, -6); ctx.lineTo(-13, 1);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.moveTo(-21, 7); ctx.lineTo(0, 0); ctx.lineTo(21, 7);
    ctx.lineTo(11, 10.5); ctx.lineTo(0, 5.5); ctx.lineTo(-11, 10.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-13, 16); ctx.lineTo(0, 10.5); ctx.lineTo(13, 16); ctx.lineTo(0, 14);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, -8.5, 3.6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff1f2';
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 220, 220, 0.86)';
    ctx.font = '900 4.6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BLACKTHORN', 0, 41.5);
  }
  ctx.restore();

  // 5. Bainha reforçada presa ao mastro na borda esquerda
  const hoistGrad = ctx.createLinearGradient(0, 0, 34, 0);
  hoistGrad.addColorStop(0, '#070709');
  hoistGrad.addColorStop(0.7, '#1c1917');
  hoistGrad.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = hoistGrad;
  ctx.fillRect(0, 0, 30, h);

  return canvas;
}

export function createFactionBannerAlphaMap(): HTMLCanvasElement {
  const w = 1024;
  const h = 640;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w * 0.96, h * 0.02);
  const rightTeeth: Array<[number, number]> = [
    [0.99, 0.08], [0.92, 0.13], [0.99, 0.19], [0.93, 0.25],
    [0.98, 0.31], [0.89, 0.37], [0.97, 0.43], [0.91, 0.49],
    [0.98, 0.56], [0.88, 0.62], [0.96, 0.69], [0.86, 0.75],
    [0.94, 0.82], [0.84, 0.88], [0.90, 0.95], [0.76, 0.99],
  ];
  for (const [rx, ry] of rightTeeth) {
    ctx.lineTo(w * rx, h * ry);
  }
  ctx.bezierCurveTo(w * 0.52, h * 0.97, w * 0.25, h * 0.93, 0, h * 0.90);
  ctx.closePath();
  ctx.fill();

  return canvas;
}

export {
  createWarzoneBackdropCanvas,
  drawAnimatedWarzoneSkyLayer,
} from './WarzoneSkyRenderer';


