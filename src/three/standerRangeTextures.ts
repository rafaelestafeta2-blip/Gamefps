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

/**
 * Preserva 100% das texturas originais embutidas no arquivo `stander_tiro.glb`
 * (`ConcreteClear01`, `TileWall03a`, `TileWall03b`, `ConctereWall14a`, `WoodCherry5`,
 * `DecalLine01White`, `Metall03`, `Number1..5`, etc.) e restaura o vidro translúcido
 * original (`_ShootingRange01GlassClear`), convertendo apenas o shader pesado
 * `MeshPhysicalMaterial` para materiais leves de 60 FPS mobile.
 */
export function applyDarkTacticalMaterialsToStanderGlb(
  gltfScene: THREE.Group
): void {
  const convertedCache = new Map<THREE.Material, THREE.Material>();

  const glassMat = new THREE.MeshPhysicalMaterial({
    name: '_ShootingRange01GlassClear',
    color: new THREE.Color(0xdbeafe),
    transparent: true,
    opacity: 0.28,
    roughness: 0.08,
    metalness: 0.1,
    reflectivity: 0.9,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const lightLumMat = new THREE.MeshBasicMaterial({
    name: '_ShootingRange01LightLum',
    color: new THREE.Color(0xfffbeb),
  });

  gltfScene.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;

    const mapSingleMat = (m: THREE.Material): THREE.Material => {
      if (!m) return m;
      const cached = convertedCache.get(m);
      if (cached) return cached;

      const matName = m.name || '';
      const src = m as THREE.MeshStandardMaterial & THREE.MeshPhysicalMaterial;

      if (matName.includes('GlassClear') || src.transparent) {
        mesh.renderOrder = 2;
        convertedCache.set(m, glassMat);
        return glassMat;
      }

      if (matName.includes('LightLum')) {
        convertedCache.set(m, lightLumMat);
        return lightLumMat;
      }

      if (src.map) {
        src.map.colorSpace = THREE.SRGBColorSpace;
        src.map.needsUpdate = true;
      }

      const isDecal = matName.includes('DecalLine') || matName.includes('Number');
      const nextMat = new THREE.MeshLambertMaterial({
        name: matName,
        map: src.map || null,
        normalMap: src.normalMap || null,
        color: src.map
          ? new THREE.Color(0xffffff)
          : src.color
            ? src.color.clone()
            : new THREE.Color(0xffffff),
        transparent: Boolean(src.transparent),
        opacity: src.opacity ?? 1.0,
        alphaTest: src.alphaTest ?? 0,
        side: src.side ?? THREE.FrontSide,
        polygonOffset: isDecal,
        polygonOffsetFactor: isDecal ? -1 : 0,
        polygonOffsetUnits: isDecal ? -1 : 0,
      });

      convertedCache.set(m, nextMat);
      return nextMat;
    };

    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map(mapSingleMat);
    } else if (mesh.material) {
      mesh.material = mapSingleMat(mesh.material);
    }
  });
}

