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
 * Generates dark, high-contrast PBR textures for the Stander de Tiro (.glb) and
 * the connected Tactical Obstacle & Parkour Hall:
 * - Dark charcoal acoustic baffle walls with amber tactical trim
 * - Dark vulcanized ballistic rubber floor tiles with subtle grid/tread
 * - Dark industrial steel ceiling baffles
 * - High-contrast yellow/black hazard stripes for jump/crouch/slide obstacles
 */
export function getStanderDarkRangeTextures(): StanderDarkTextures {
  if (cachedTextures) return cachedTextures;

  // 1. Dark Acoustic Baffle Wall Texture (Charcoal Slate + Soundproofing Pyramid Ribs + Amber Stripe)
  const wallCanvas = document.createElement('canvas');
  wallCanvas.width = 512;
  wallCanvas.height = 512;
  const wCtx = wallCanvas.getContext('2d')!;

  wCtx.fillStyle = '#151922';
  wCtx.fillRect(0, 0, 512, 512);

  // Horizontal acoustic slate panels & dark mortar grooves
  for (let y = 0; y < 512; y += 32) {
    wCtx.fillStyle = (y / 32) % 2 === 0 ? '#181d27' : '#12161e';
    wCtx.fillRect(0, y, 512, 30);
    wCtx.fillStyle = '#090b10';
    wCtx.fillRect(0, y + 30, 512, 2);
  }

  // Acoustic wedge micro-pattern inside panels
  for (let y = 0; y < 512; y += 16) {
    for (let x = 0; x < 512; x += 16) {
      wCtx.fillStyle =
        (x + y) % 32 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.18)';
      wCtx.fillRect(x + 2, y + 2, 12, 12);
    }
  }

  // Vertical dark gunmetal structural pilasters
  wCtx.fillStyle = '#0d1017';
  wCtx.fillRect(0, 0, 14, 512);
  wCtx.fillRect(250, 0, 12, 512);

  // Subtle tactical amber & slate accent band
  wCtx.fillStyle = '#d97706';
  wCtx.fillRect(0, 348, 512, 6);
  wCtx.fillStyle = 'rgba(56, 189, 248, 0.35)';
  wCtx.fillRect(0, 356, 512, 2);

  const acousticWallMap = new THREE.CanvasTexture(wallCanvas);
  acousticWallMap.colorSpace = THREE.SRGBColorSpace;
  acousticWallMap.wrapS = THREE.RepeatWrapping;
  acousticWallMap.wrapT = THREE.RepeatWrapping;
  acousticWallMap.repeat.set(3, 2);
  acousticWallMap.anisotropy = 4;

  const acousticWallBump = new THREE.CanvasTexture(wallCanvas);
  acousticWallBump.colorSpace = THREE.NoColorSpace;
  acousticWallBump.wrapS = THREE.RepeatWrapping;
  acousticWallBump.wrapT = THREE.RepeatWrapping;
  acousticWallBump.repeat.set(3, 2);

  // 2. Dark Vulcanized Ballistic Rubber Floor Texture
  const floorCanvas = document.createElement('canvas');
  floorCanvas.width = 512;
  floorCanvas.height = 512;
  const fCtx = floorCanvas.getContext('2d')!;

  fCtx.fillStyle = '#11141b';
  fCtx.fillRect(0, 0, 512, 512);

  // Interlocking dark rubber tile seams
  fCtx.strokeStyle = '#080a0e';
  fCtx.lineWidth = 4;
  for (let i = 0; i <= 512; i += 128) {
    fCtx.beginPath();
    fCtx.moveTo(i, 0);
    fCtx.lineTo(i, 512);
    fCtx.moveTo(0, i);
    fCtx.lineTo(512, i);
    fCtx.stroke();
  }

  // Anti-slip rubber stud dots & subtle metallic fleck
  for (let y = 8; y < 512; y += 16) {
    for (let x = 8; x < 512; x += 16) {
      fCtx.fillStyle = '#191e28';
      fCtx.beginPath();
      fCtx.arc(x, y, 3.2, 0, Math.PI * 2);
      fCtx.fill();
    }
  }

  // Subtle tactical lane border line
  fCtx.strokeStyle = 'rgba(245, 158, 11, 0.22)';
  fCtx.lineWidth = 2;
  fCtx.strokeRect(4, 4, 504, 504);

  const rubberFloorMap = new THREE.CanvasTexture(floorCanvas);
  rubberFloorMap.colorSpace = THREE.SRGBColorSpace;
  rubberFloorMap.wrapS = THREE.RepeatWrapping;
  rubberFloorMap.wrapT = THREE.RepeatWrapping;
  rubberFloorMap.repeat.set(6, 6);
  rubberFloorMap.anisotropy = 4;

  const rubberFloorBump = new THREE.CanvasTexture(floorCanvas);
  rubberFloorBump.colorSpace = THREE.NoColorSpace;
  rubberFloorBump.wrapS = THREE.RepeatWrapping;
  rubberFloorBump.wrapT = THREE.RepeatWrapping;
  rubberFloorBump.repeat.set(6, 6);

  // 3. Dark Industrial Baffle Ceiling Texture
  const ceilCanvas = document.createElement('canvas');
  ceilCanvas.width = 256;
  ceilCanvas.height = 256;
  const cCtx = ceilCanvas.getContext('2d')!;
  cCtx.fillStyle = '#0b0e14';
  cCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    cCtx.fillStyle = '#131822';
    cCtx.fillRect(0, y, 256, 12);
  }
  const darkCeilingMap = new THREE.CanvasTexture(ceilCanvas);
  darkCeilingMap.colorSpace = THREE.SRGBColorSpace;
  darkCeilingMap.wrapS = THREE.RepeatWrapping;
  darkCeilingMap.wrapT = THREE.RepeatWrapping;
  darkCeilingMap.repeat.set(4, 4);

  // 4. High-Contrast Tactical Hazard Stripe Texture (for Jump/Crouch/Slide Obstacles)
  const hazCanvas = document.createElement('canvas');
  hazCanvas.width = 256;
  hazCanvas.height = 256;
  const hCtx = hazCanvas.getContext('2d')!;
  hCtx.fillStyle = '#181c24';
  hCtx.fillRect(0, 0, 256, 256);

  hCtx.fillStyle = '#f59e0b';
  for (let i = -256; i < 512; i += 48) {
    hCtx.beginPath();
    hCtx.moveTo(i, 0);
    hCtx.lineTo(i + 24, 0);
    hCtx.lineTo(i + 80, 56);
    hCtx.lineTo(i + 56, 56);
    hCtx.closePath();
    hCtx.fill();
  }

  hCtx.strokeStyle = '#334155';
  hCtx.lineWidth = 4;
  hCtx.strokeRect(2, 2, 252, 252);

  const hazardStripeMap = new THREE.CanvasTexture(hazCanvas);
  hazardStripeMap.colorSpace = THREE.SRGBColorSpace;
  hazardStripeMap.wrapS = THREE.RepeatWrapping;
  hazardStripeMap.wrapT = THREE.RepeatWrapping;
  hazardStripeMap.anisotropy = 4;

  cachedTextures = {
    acousticWallMap,
    acousticWallBump,
    rubberFloorMap,
    rubberFloorBump,
    darkCeilingMap,
    hazardStripeMap,
  };
  return cachedTextures;
}

/**
 * Replaces the washed-out white materials of `stander_tiro.glb` with dark tactical
 * acoustic wall panels, vulcanized rubber floor tiles, smoked walnut booths, and
 * glowing overhead range fixtures.
 */
export function applyDarkTacticalMaterialsToStanderGlb(
  gltfScene: THREE.Group
): void {
  const tex = getStanderDarkRangeTextures();

  gltfScene.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m) => {
      const std = m as THREE.MeshStandardMaterial;
      if (!std) return;
      const matName = std.name || '';

      if (matName.includes('LightLum')) {
        std.color.setHex(0xffffff);
        std.emissive = new THREE.Color(0xfff7ed);
        std.emissiveIntensity = 1.35;
        std.roughness = 0.2;
      } else if (matName.includes('GlassClear')) {
        std.color.setHex(0x38bdf8);
        std.transparent = true;
        std.opacity = 0.22;
        std.roughness = 0.1;
        std.metalness = 0.2;
        std.depthWrite = false;
      } else if (matName.includes('DecalLine')) {
        std.color.setHex(0xf59e0b);
        std.emissive = new THREE.Color(0xf59e0b);
        std.emissiveIntensity = 0.25;
        std.polygonOffset = true;
        std.polygonOffsetFactor = -1;
        std.polygonOffsetUnits = -1;
      } else if (
        matName.includes('ConcreteClear01') ||
        matName.includes('ConcreteClear09')
      ) {
        // Floor & Ceiling surfaces of Range_44
        std.map = tex.rubberFloorMap;
        std.bumpMap = tex.rubberFloorBump;
        std.bumpScale = 0.015;
        std.color.setHex(0x8a94a6);
        std.roughness = 0.65;
        std.metalness = 0.15;
        std.needsUpdate = true;
      } else if (
        matName.includes('TileWall') ||
        matName.includes('ConctereWall') ||
        matName.includes('PlasticWhite')
      ) {
        // Side walls, Firing booth walls & Borders_47 partitions -> Dark Acoustic Range Panels!
        std.map = tex.acousticWallMap;
        std.bumpMap = tex.acousticWallBump;
        std.bumpScale = 0.025;
        std.color.setHex(0x94a3b8);
        std.roughness = 0.68;
        std.metalness = 0.22;
        std.needsUpdate = true;
      } else if (matName.includes('WoodCherry')) {
        // Shooting Booths (StandPlace_45) & Prep Tables -> Dark Tactical Walnut/Carbon
        std.color.setHex(0x5c4938);
        std.roughness = 0.48;
        std.metalness = 0.18;
        std.needsUpdate = true;
      } else if (matName.includes('PlasticBlack')) {
        std.color.setHex(0x11151c);
        std.roughness = 0.45;
        std.metalness = 0.35;
      }
    });
  });
}
