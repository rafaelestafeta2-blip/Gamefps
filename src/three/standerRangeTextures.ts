import * as THREE from 'three';

export interface StanderDarkTextures {
  acousticWallMap: THREE.CanvasTexture;
  acousticWallBump: THREE.CanvasTexture;
  rubberFloorMap: THREE.CanvasTexture;
  rubberFloorBump: THREE.CanvasTexture;
  darkCeilingMap: THREE.CanvasTexture;
  hazardStripeMap: THREE.CanvasTexture;
}

let cachedTextures: StanderDarkTextures | null = null;

interface SharedStanderMaterials {
  lightLum: THREE.MeshBasicMaterial;
  glass: THREE.MeshBasicMaterial;
  decalLine: THREE.MeshBasicMaterial;
  floorCeil: THREE.MeshLambertMaterial;
  wall: THREE.MeshLambertMaterial;
  wood: THREE.MeshLambertMaterial;
  plasticBlack: THREE.MeshLambertMaterial;
}

let sharedMats: SharedStanderMaterials | null = null;

/**
 * Texturas premium de estande de tiro tático moderno (padrão Sig Sauer Academy / John Wick Continental):
 * - Painéis acústicos antirricochete em carbono grafite escuro com fendas de absorção sonora
 * - Piso de borracha vulcanizada antiderrapante com demarcações táticas em amarelo ouro balístico
 * - Teto modular industrial em tungstênio fosco sem saturações estranhas
 */
export function getStanderDarkRangeTextures(): StanderDarkTextures {
  if (cachedTextures) return cachedTextures;

  // 1. Parede: Painéis Acústicos Antirricochete de Alta Performance em Carbono Tungstênio
  const wallCanvas = document.createElement('canvas');
  wallCanvas.width = 512;
  wallCanvas.height = 512;
  const wCtx = wallCanvas.getContext('2d')!;

  // Base em carbono grafite escuro premium (sem cinza lavado)
  wCtx.fillStyle = '#181d24';
  wCtx.fillRect(0, 0, 512, 512);

  // Cunha acústica antirricochete com chanfro 3D profundo
  for (let y = 0; y < 512; y += 48) {
    // Face superior iluminada
    wCtx.fillStyle = (y / 48) % 2 === 0 ? '#262d38' : '#202630';
    wCtx.fillRect(0, y, 512, 40);
    // Chanfro de sombra profunda
    wCtx.fillStyle = '#0f1318';
    wCtx.fillRect(0, y + 40, 512, 8);
    // Borda reflexiva superior
    wCtx.fillStyle = '#374151';
    wCtx.fillRect(0, y, 512, 2);
  }

  // Divisórias verticais em alumínio anodizado preto fosco
  [0, 256].forEach((x) => {
    wCtx.fillStyle = '#0b0e12';
    wCtx.fillRect(x, 0, 8, 512);
    wCtx.fillStyle = '#4b5563';
    wCtx.fillRect(x + 8, 0, 2, 512);
  });

  // Parafusos e rebites balísticos hexagonais
  [48, 144, 240, 336, 432].forEach((y) => {
    [32, 224, 288, 480].forEach((x) => {
      wCtx.fillStyle = '#0d1116';
      wCtx.beginPath();
      wCtx.arc(x, y, 4, 0, Math.PI * 2);
      wCtx.fill();
      wCtx.fillStyle = '#9ca3af';
      wCtx.beginPath();
      wCtx.arc(x - 1, y - 1, 1.8, 0, Math.PI * 2);
      wCtx.fill();
    });
  });

  // Estêncil tático de estande balístico
  wCtx.font = 'bold 13px monospace';
  wCtx.fillStyle = '#64748b';
  wCtx.fillText('KINETIC BALLISTIC RANGE // BAY 01-05', 24, 32);
  wCtx.fillText('HEARING & EYE PROTECTION REQUIRED', 24, 276);

  // Linha de advertência de segurança em amarelo ouro balístico na base
  wCtx.fillStyle = '#eab308';
  wCtx.fillRect(0, 498, 512, 6);
  wCtx.fillStyle = '#090c0f';
  wCtx.fillRect(0, 504, 512, 8);

  const acousticWallMap = new THREE.CanvasTexture(wallCanvas);
  acousticWallMap.colorSpace = THREE.SRGBColorSpace;
  acousticWallMap.wrapS = THREE.RepeatWrapping;
  acousticWallMap.wrapT = THREE.RepeatWrapping;
  acousticWallMap.repeat.set(2, 2);

  // 2. Piso: Borracha Vulcanizada de Estande em Ardósia Escura Fosca com Grip Antiderrapante
  const floorCanvas = document.createElement('canvas');
  floorCanvas.width = 512;
  floorCanvas.height = 512;
  const fCtx = floorCanvas.getContext('2d')!;

  // Base ardósia escura rica
  fCtx.fillStyle = '#14171d';
  fCtx.fillRect(0, 0, 512, 512);

  // Micro-textura de grânulos antiderrapantes
  for (let y = 8; y < 512; y += 16) {
    for (let x = 8; x < 512; x += 16) {
      fCtx.fillStyle = '#222832';
      fCtx.fillRect(x - 2, y - 2, 4, 4);
      fCtx.fillStyle = '#0d1014';
      fCtx.fillRect(x, y, 2, 2);
    }
  }

  // Linhas modulares de placas de borracha 1m x 1m
  fCtx.strokeStyle = '#090b0e';
  fCtx.lineWidth = 4;
  for (let i = 0; i <= 512; i += 128) {
    fCtx.beginPath();
    fCtx.moveTo(i, 0);
    fCtx.lineTo(i, 512);
    fCtx.moveTo(0, i);
    fCtx.lineTo(512, i);
    fCtx.stroke();
  }

  // Demarcação tática de baia em amarelo ouro balístico
  fCtx.strokeStyle = 'rgba(234, 179, 8, 0.65)';
  fCtx.lineWidth = 4;
  fCtx.strokeRect(6, 6, 500, 500);

  // Marcações de estêncil no chão
  fCtx.font = 'bold 16px monospace';
  fCtx.fillStyle = 'rgba(234, 179, 8, 0.7)';
  fCtx.fillText('FIRING LINE // KEEP MUZZLE DOWNRANGE', 32, 60);

  const rubberFloorMap = new THREE.CanvasTexture(floorCanvas);
  rubberFloorMap.colorSpace = THREE.SRGBColorSpace;
  rubberFloorMap.wrapS = THREE.RepeatWrapping;
  rubberFloorMap.wrapT = THREE.RepeatWrapping;
  rubberFloorMap.repeat.set(4, 4);

  // 3. Teto Modular Industrial Escuro
  const ceilCanvas = document.createElement('canvas');
  ceilCanvas.width = 256;
  ceilCanvas.height = 256;
  const cCtx = ceilCanvas.getContext('2d')!;
  cCtx.fillStyle = '#12151b';
  cCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    cCtx.fillStyle = '#0c0e12';
    cCtx.fillRect(0, y, 256, 6);
    cCtx.fillStyle = '#1f242e';
    cCtx.fillRect(0, y + 6, 256, 3);
  }
  const darkCeilingMap = new THREE.CanvasTexture(ceilCanvas);
  darkCeilingMap.colorSpace = THREE.SRGBColorSpace;
  darkCeilingMap.wrapS = THREE.RepeatWrapping;
  darkCeilingMap.wrapT = THREE.RepeatWrapping;
  darkCeilingMap.repeat.set(4, 4);

  // 4. Faixa de Advertência Balística Amarela / Preta
  const hazCanvas = document.createElement('canvas');
  hazCanvas.width = 128;
  hazCanvas.height = 128;
  const hCtx = hazCanvas.getContext('2d')!;
  hCtx.fillStyle = '#0f1217';
  hCtx.fillRect(0, 0, 128, 128);

  hCtx.fillStyle = '#eab308';
  for (let i = -128; i < 256; i += 32) {
    hCtx.beginPath();
    hCtx.moveTo(i, 0);
    hCtx.lineTo(i + 16, 0);
    hCtx.lineTo(i + 48, 32);
    hCtx.lineTo(i + 32, 32);
    hCtx.closePath();
    hCtx.fill();
  }

  const hazardStripeMap = new THREE.CanvasTexture(hazCanvas);
  hazardStripeMap.colorSpace = THREE.SRGBColorSpace;
  hazardStripeMap.wrapS = THREE.RepeatWrapping;
  hazardStripeMap.wrapT = THREE.RepeatWrapping;

  cachedTextures = {
    acousticWallMap,
    acousticWallBump: acousticWallMap,
    rubberFloorMap,
    rubberFloorBump: rubberFloorMap,
    darkCeilingMap,
    hazardStripeMap,
  };
  return cachedTextures;
}

function getSharedStanderMaterials(): SharedStanderMaterials {
  if (sharedMats) return sharedMats;
  const tex = getStanderDarkRangeTextures();

  sharedMats = {
    lightLum: new THREE.MeshBasicMaterial({ color: 0xfff4e6 }),
    glass: new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    }),
    decalLine: new THREE.MeshBasicMaterial({
      color: 0xeab308,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
    floorCeil: new THREE.MeshLambertMaterial({
      map: tex.rubberFloorMap,
      color: 0xffffff,
    }),
    wall: new THREE.MeshLambertMaterial({
      map: tex.acousticWallMap,
      color: 0xffffff,
    }),
    wood: new THREE.MeshLambertMaterial({
      color: 0x3d2b1f, // Madeira escura nogueira nobre de bancada armaria
    }),
    plasticBlack: new THREE.MeshLambertMaterial({
      color: 0x181c24,
    }),
  };
  return sharedMats;
}

/**
 * Aplica os materiais realistas de estande tático premium à cena do Stander.
 */
export function applyDarkTacticalMaterialsToStanderGlb(
  gltfScene: THREE.Group
): void {
  const mats = getSharedStanderMaterials();

  gltfScene.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;

    const mapSingleMat = (m: THREE.Material): THREE.Material => {
      const matName = m?.name || '';
      if (matName.includes('LightLum')) return mats.lightLum;
      if (matName.includes('GlassClear')) return mats.glass;
      if (matName.includes('DecalLine')) return mats.decalLine;
      if (
        matName.includes('ConcreteClear01') ||
        matName.includes('ConcreteClear09')
      ) {
        return mats.floorCeil;
      }
      if (
        matName.includes('TileWall') ||
        matName.includes('ConctereWall') ||
        matName.includes('PlasticWhite')
      ) {
        return mats.wall;
      }
      if (matName.includes('WoodCherry')) return mats.wood;
      if (matName.includes('PlasticBlack')) return mats.plasticBlack;
      return m;
    };

    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map(mapSingleMat);
    } else if (mesh.material) {
      mesh.material = mapSingleMat(mesh.material);
    }
  });
}
