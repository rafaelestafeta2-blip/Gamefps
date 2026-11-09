import * as THREE from 'three';

export interface YardCalloutZone {
  name: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const YARD_CALLOUT_ZONES: YardCalloutZone[] = [
  { name: 'SPAWN ATACANTE (SUL · RUA DO HOTEL)', minX: -16, maxX: 16, minZ: 18, maxZ: 46 },
  { name: 'VARANDA DO HOTEL MAYWAND (ALTO)', minX: -17, maxX: -4, minZ: 15, maxZ: 35 },
  { name: 'TELHADO DA LOJA VERDE (VARAL)', minX: 2, maxX: 14, minZ: 18, maxZ: 31 },
  { name: 'PORTÕES AZUIS & MEIO (MID)', minX: -9, maxX: 11, minZ: 2, maxZ: 18 },
  { name: 'PASSAGEM BAIXA (AGACHE)', minX: -12, maxX: -5, minZ: -6, maxZ: 2 },
  { name: 'PONTO DE BOMBA A (PÁTIO DO CAMINHÃO)', minX: 14, maxX: 40, minZ: -20, maxZ: 8 },
  { name: 'PONTO DE BOMBA B (VILA OESTE)', minX: -34, maxX: -10, minZ: -22, maxZ: 12 },
  { name: 'BASE DEFENSORA (NORTE · GALPÕES)', minX: -26, maxX: 20, minZ: -44, maxZ: -16 },
];

export const YARD_BOMB_SITE_A = new THREE.Vector3(24.5, 0, -6.0);
export const YARD_BOMB_SITE_B = new THREE.Vector3(-21.0, 0, -8.5);
export const YARD_ATTACKER_SPAWN = new THREE.Vector3(-1.8, 0, 38.2);
export const YARD_DEFENDER_SPAWN = new THREE.Vector3(0.0, 0, -34.0);

export function getYardCalloutForPos(x: number, y: number, z: number): string {
  if (y > 1.8 && x < -3 && z > 14 && z < 35) {
    return 'VARANDA DO HOTEL MAYWAND (2º ANDAR)';
  }
  if (y > 1.8 && x >= 1 && x <= 14 && z > 18 && z < 32) {
    return 'TELHADO DA LOJA VERDE (LUGAR ALTO)';
  }
  if (y > 1.5 && x > 15) {
    return 'PLATAFORMA ELEVADA · BOMBA A';
  }
  if (y > 1.5 && x < -15) {
    return 'PASSARELA SUPERIOR · BOMBA B';
  }
  for (let i = 0; i < YARD_CALLOUT_ZONES.length; i++) {
    const zc = YARD_CALLOUT_ZONES[i];
    if (x >= zc.minX && x <= zc.maxX && z >= zc.minZ && z <= zc.maxZ) {
      return zc.name;
    }
  }
  return 'PÁTIO CENTRAL · YARD';
}

export interface YardTextureSet {
  sandyGround: THREE.CanvasTexture;
  adobeBrick: THREE.CanvasTexture;
  greenStucco: THREE.CanvasTexture;
  woodenCrate: THREE.CanvasTexture;
  tealGate: THREE.CanvasTexture;
  hotelSign: THREE.CanvasTexture;
  shopSign: THREE.CanvasTexture;
  crouchHintSign: THREE.CanvasTexture;
  bombSiteASign: THREE.CanvasTexture;
  bombSiteBSign: THREE.CanvasTexture;
}

function makeCanvasTex(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  repeat = true
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  return tex;
}

export function createYardTextures(): YardTextureSet {
  // 1. Dusty Afghan sandy dirt & stone ground with dry grass flecks
  const sandyGround = makeCanvasTex(256, 256, (ctx) => {
    ctx.fillStyle = '#9e896b';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillStyle =
        i % 5 === 0 ? '#78684e' : i % 3 === 0 ? '#b39f82' : '#6c6f49';
      ctx.fillRect(x, y, 2 + Math.random() * 3, 2 + Math.random() * 3);
    }
  });

  // 2. Tan mud-brick / adobe wall texture (matching Hotel & right brick wall in photo)
  const adobeBrick = makeCanvasTex(256, 256, (ctx) => {
    ctx.fillStyle = '#8d7358';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#6e5740';
    ctx.lineWidth = 2;
    const rows = 8;
    const rowH = 256 / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
      const offset = (r % 2) * 32;
      for (let x = offset; x < 256; x += 64) {
        ctx.fillStyle = r % 2 === 0 ? '#977c60' : '#83694f';
        ctx.fillRect(x + 2, y + 2, 60, rowH - 4);
      }
    }
  });

  // 3. Pale green weathered stucco (matching the green shop on the right in photo)
  const greenStucco = makeCanvasTex(256, 256, (ctx) => {
    ctx.fillStyle = '#7c8b68';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#6d7c5a' : '#8a9976';
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 4, 4);
    }
    // Weathered lower plaster base
    ctx.fillStyle = '#646b53';
    ctx.fillRect(0, 210, 256, 46);
  });

  // 4. Wooden supply crate with iron corner brackets (matching foreground crates in photo)
  const woodenCrate = makeCanvasTex(256, 256, (ctx) => {
    ctx.fillStyle = '#9c8a6e';
    ctx.fillRect(0, 0, 256, 256);
    // Horizontal planks
    ctx.strokeStyle = '#5c4f3c';
    ctx.lineWidth = 3;
    for (let y = 32; y < 256; y += 36) {
      ctx.beginPath();
      ctx.moveTo(16, y);
      ctx.lineTo(240, y);
      ctx.stroke();
    }
    // Outer frame border
    ctx.strokeStyle = '#827158';
    ctx.lineWidth = 22;
    ctx.strokeRect(11, 11, 234, 234);
    // Iron corner brackets with rivets
    ctx.fillStyle = '#3b4046';
    const corners = [
      [0, 0],
      [216, 0],
      [0, 216],
      [216, 216],
    ];
    corners.forEach(([cx, cy]) => {
      ctx.fillRect(cx, cy, 40, 14);
      ctx.fillRect(cx, cy, 14, 40);
    });
  }, false);

  // 5. Teal/Blue corrugated metal double gate (matching center gates in photo)
  const tealGate = makeCanvasTex(256, 256, (ctx) => {
    ctx.fillStyle = '#4f8699';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#366373';
    ctx.lineWidth = 4;
    for (let x = 8; x < 256; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    ctx.strokeStyle = '#294c59';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 246, 246);
    ctx.beginPath();
    ctx.moveTo(0, 128);
    ctx.lineTo(256, 128);
    ctx.stroke();
  }, false);

  // 6. Maywand Hotel Blue Sign (left building in screenshot)
  const hotelSign = makeCanvasTex(512, 160, (ctx) => {
    ctx.fillStyle = '#1b4965';
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = '#a3cef1';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 148);
    ctx.fillStyle = '#e0fbfc';
    ctx.font = 'bold 42px serif';
    ctx.textAlign = 'center';
    ctx.fillText('میوند مهمانخانه', 256, 68);
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('MAYWAND HOTEL', 256, 125);
  }, false);

  // 7. Green Shop White/Red Sign (right building in screenshot)
  const shopSign = makeCanvasTex(512, 140, (ctx) => {
    ctx.fillStyle = '#e5dec9';
    ctx.fillRect(0, 0, 512, 140);
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 6;
    ctx.strokeRect(5, 5, 502, 130);
    ctx.fillStyle = '#7f1d1d';
    ctx.font = 'bold 46px serif';
    ctx.textAlign = 'center';
    ctx.fillText('شبنم بهار', 270, 72);
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('SHABNAM BAHAR MARKET', 270, 114);
  }, false);

  // 8. Tactical Crouch Passage Sign
  const crouchHintSign = makeCanvasTex(512, 128, (ctx) => {
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 120);
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 30px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('▼ PASSAGEM BAIXA ▼', 256, 54);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('AGACHE [C] OU DESLIZE PARA PASSAR', 256, 96);
  }, false);

  // 9. Bomb Site A & B Tactical Signs
  const makeBombSign = (letter: 'A' | 'B', color: string) =>
    makeCanvasTex(256, 256, (ctx) => {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = color;
      ctx.lineWidth = 12;
      ctx.strokeRect(10, 10, 236, 236);
      ctx.fillStyle = color;
      ctx.font = 'bold 30px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PONTO DE BOMBA', 128, 56);
      ctx.font = 'bold 130px sans-serif';
      ctx.fillText(letter, 128, 185);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('PLANTE A C4 AQUI [F]', 128, 226);
    }, false);

  return {
    sandyGround,
    adobeBrick,
    greenStucco,
    woodenCrate,
    tealGate,
    hotelSign,
    shopSign,
    crouchHintSign,
    bombSiteASign: makeBombSign('A', '#ef4444'),
    bombSiteBSign: makeBombSign('B', '#38bdf8'),
  };
}
