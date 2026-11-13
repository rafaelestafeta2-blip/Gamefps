import * as THREE from 'three';

export interface ProceduralTextures {
  floorGrid: THREE.CanvasTexture;
  wallGrid: THREE.CanvasTexture;
  hazardBlock: THREE.CanvasTexture;
  plywoodGrid: THREE.CanvasTexture;
  brushedMetalRoughness: THREE.CanvasTexture;
  holoReticle: THREE.CanvasTexture;
  lpvoReticle: THREE.CanvasTexture;
  cantedDotReticle: THREE.CanvasTexture;
  silhouetteTarget: THREE.CanvasTexture;
  gloveFabric: THREE.CanvasTexture;
  gloveBump: THREE.CanvasTexture;
  gloveCarbon: THREE.CanvasTexture;
  combatSleeve: THREE.CanvasTexture;
  tacticalWatchFace: THREE.CanvasTexture;
  muzzleFlashStar: THREE.CanvasTexture;
  muzzleFlashJet: THREE.CanvasTexture;
}

export function createProceduralTextures(renderer: THREE.WebGLRenderer): ProceduralTextures {
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  // 1. Pre-Production Floor Grid (Dark Architectural Slate with 1m & 0.25m subdivisions)
  const floorCanvas = document.createElement('canvas');
  floorCanvas.width = 512;
  floorCanvas.height = 512;
  const fCtx = floorCanvas.getContext('2d')!;
  fCtx.fillStyle = '#181c23';
  fCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    fCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.03)';
    fCtx.fillRect(x, y, 2, 2);
  }

  fCtx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
  fCtx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const pos = i * 128;
    fCtx.beginPath();
    fCtx.moveTo(pos, 0);
    fCtx.lineTo(pos, 512);
    fCtx.moveTo(0, pos);
    fCtx.lineTo(512, pos);
    fCtx.stroke();
  }

  fCtx.strokeStyle = 'rgba(148, 163, 184, 0.24)';
  fCtx.lineWidth = 2;
  fCtx.strokeRect(1, 1, 510, 510);

  fCtx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
  fCtx.lineWidth = 2;
  fCtx.beginPath();
  fCtx.moveTo(0, 14);
  fCtx.lineTo(14, 14);
  fCtx.lineTo(14, 0);
  fCtx.stroke();

  fCtx.fillStyle = 'rgba(148, 163, 184, 0.35)';
  fCtx.font = '600 13px monospace';
  fCtx.fillText('1.0M GRID', 16, 26);

  const floorGrid = new THREE.CanvasTexture(floorCanvas);
  floorGrid.colorSpace = THREE.SRGBColorSpace;
  floorGrid.wrapS = THREE.RepeatWrapping;
  floorGrid.wrapT = THREE.RepeatWrapping;
  floorGrid.anisotropy = maxAniso;

  // 2. Pre-Production Wall Grid (Lighter Architectural Greybox)
  const wallCanvas = document.createElement('canvas');
  wallCanvas.width = 512;
  wallCanvas.height = 512;
  const wCtx = wallCanvas.getContext('2d')!;
  wCtx.fillStyle = '#262c36';
  wCtx.fillRect(0, 0, 512, 512);

  wCtx.strokeStyle = 'rgba(203, 213, 225, 0.09)';
  wCtx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const p = i * 128;
    wCtx.beginPath();
    wCtx.moveTo(p, 0);
    wCtx.lineTo(p, 512);
    wCtx.moveTo(0, p);
    wCtx.lineTo(512, p);
    wCtx.stroke();
  }

  wCtx.strokeStyle = 'rgba(203, 213, 225, 0.22)';
  wCtx.lineWidth = 2;
  wCtx.strokeRect(1, 1, 510, 510);

  const wallGrid = new THREE.CanvasTexture(wallCanvas);
  wallGrid.colorSpace = THREE.SRGBColorSpace;
  wallGrid.wrapS = THREE.RepeatWrapping;
  wallGrid.wrapT = THREE.RepeatWrapping;
  wallGrid.anisotropy = maxAniso;

  // 3. Tactical Amber Cover Block (Killhouse Prototyping Highlight)
  const hazardCanvas = document.createElement('canvas');
  hazardCanvas.width = 512;
  hazardCanvas.height = 512;
  const hCtx = hazardCanvas.getContext('2d')!;
  hCtx.fillStyle = '#b45309';
  hCtx.fillRect(0, 0, 512, 512);

  hCtx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  hCtx.lineWidth = 1.5;
  for (let i = 1; i < 4; i++) {
    const p = i * 128;
    hCtx.beginPath();
    hCtx.moveTo(p, 0);
    hCtx.lineTo(p, 512);
    hCtx.moveTo(0, p);
    hCtx.lineTo(512, p);
    hCtx.stroke();
  }

  hCtx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
  hCtx.lineWidth = 3;
  hCtx.strokeRect(2, 2, 508, 508);

  hCtx.fillStyle = 'rgba(15, 23, 42, 0.35)';
  hCtx.fillRect(0, 0, 512, 42);
  hCtx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  hCtx.font = '700 16px monospace';
  hCtx.fillText('COVER 1.0M BLOCK', 18, 27);

  const hazardBlock = new THREE.CanvasTexture(hazardCanvas);
  hazardBlock.colorSpace = THREE.SRGBColorSpace;
  hazardBlock.wrapS = THREE.RepeatWrapping;
  hazardBlock.wrapT = THREE.RepeatWrapping;
  hazardBlock.anisotropy = maxAniso;

  // 4. Killhouse OSB / Tactical Plywood Partition Texture
  const plyCanvas = document.createElement('canvas');
  plyCanvas.width = 512;
  plyCanvas.height = 512;
  const pCtx = plyCanvas.getContext('2d')!;
  pCtx.fillStyle = '#3f362c';
  pCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3000; i++) {
    pCtx.fillStyle = i % 2 === 0 ? 'rgba(217, 179, 130, 0.04)' : 'rgba(20, 16, 12, 0.05)';
    pCtx.fillRect(Math.random() * 512, Math.random() * 512, 8, 2);
  }
  pCtx.strokeStyle = 'rgba(245, 158, 11, 0.22)';
  pCtx.lineWidth = 2;
  pCtx.strokeRect(2, 2, 508, 508);
  const plywoodGrid = new THREE.CanvasTexture(plyCanvas);
  plywoodGrid.colorSpace = THREE.SRGBColorSpace;
  plywoodGrid.wrapS = THREE.RepeatWrapping;
  plywoodGrid.wrapT = THREE.RepeatWrapping;
  plywoodGrid.anisotropy = maxAniso;

  // 5. Linear Brushed Metal Roughness Map (NoColorSpace)
  const metalCanvas = document.createElement('canvas');
  metalCanvas.width = 256;
  metalCanvas.height = 256;
  const mCtx = metalCanvas.getContext('2d')!;
  mCtx.fillStyle = '#555555';
  mCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y++) {
    const v = 65 + Math.floor(Math.random() * 45);
    mCtx.fillStyle = `rgb(${v},${v},${v})`;
    mCtx.fillRect(0, y, 256, 1);
  }
  const brushedMetalRoughness = new THREE.CanvasTexture(metalCanvas);
  brushedMetalRoughness.colorSpace = THREE.NoColorSpace;
  brushedMetalRoughness.wrapS = THREE.RepeatWrapping;
  brushedMetalRoughness.wrapT = THREE.RepeatWrapping;

  // 6. EOTech EXPS3 Holographic Reticle Texture
  const holoCanvas = document.createElement('canvas');
  holoCanvas.width = 512;
  holoCanvas.height = 512;
  const hoCtx = holoCanvas.getContext('2d')!;
  hoCtx.clearRect(0, 0, 512, 512);
  const cx = 256;
  const cy = 256;

  hoCtx.shadowColor = '#ef4444';
  hoCtx.shadowBlur = 14;
  hoCtx.strokeStyle = '#ff3b30';
  hoCtx.lineWidth = 5;

  const r = 104;
  hoCtx.beginPath();
  hoCtx.arc(cx, cy, r, 0, Math.PI * 2);
  hoCtx.stroke();

  const tickInner = r - 18;
  const tickOuter = r + 22;
  [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].forEach((angle) => {
    hoCtx.beginPath();
    hoCtx.moveTo(cx + Math.cos(angle) * tickInner, cy + Math.sin(angle) * tickInner);
    hoCtx.lineTo(cx + Math.cos(angle) * tickOuter, cy + Math.sin(angle) * tickOuter);
    hoCtx.stroke();
  });

  hoCtx.fillStyle = '#ff6b6b';
  hoCtx.beginPath();
  hoCtx.arc(cx, cy, 4.5, 0, Math.PI * 2);
  hoCtx.fill();

  hoCtx.beginPath();
  hoCtx.arc(cx, cy + 36, 3.2, 0, Math.PI * 2);
  hoCtx.fill();

  const holoReticle = new THREE.CanvasTexture(holoCanvas);
  holoReticle.colorSpace = THREE.SRGBColorSpace;
  holoReticle.anisotropy = maxAniso;

  // 7. LPVO Firefield RapidStrike Mil-Dot / BDC Reticle (Call of Duty / Insurgency style)
  const lpvoSize = 1024;
  const lCx = lpvoSize / 2;
  const lCy = lpvoSize / 2;
  const lpvoCanvas = document.createElement('canvas');
  lpvoCanvas.width = lpvoSize;
  lpvoCanvas.height = lpvoSize;
  const lpCtx = lpvoCanvas.getContext('2d')!;
  lpCtx.clearRect(0, 0, lpvoSize, lpvoSize);

  // Subtle realistic optical lens rim shadow / soft focus around outer glass perimeter
  const lensRimGrad = lpCtx.createRadialGradient(
    lCx,
    lCy,
    lpvoSize * 0.36,
    lCx,
    lCy,
    lpvoSize * 0.5
  );
  lensRimGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
  lensRimGrad.addColorStop(0.58, 'rgba(0, 0, 0, 0.05)');
  lensRimGrad.addColorStop(0.84, 'rgba(4, 6, 10, 0.32)');
  lensRimGrad.addColorStop(0.95, 'rgba(2, 4, 8, 0.78)');
  lensRimGrad.addColorStop(1.0, 'rgba(2, 4, 8, 0.96)');
  lpCtx.fillStyle = lensRimGrad;
  lpCtx.beginPath();
  lpCtx.arc(lCx, lCy, lpvoSize * 0.5, 0, Math.PI * 2);
  lpCtx.fill();

  // Clip reticle strokes cleanly inside circular ocular aperture
  lpCtx.save();
  lpCtx.beginPath();
  lpCtx.arc(lCx, lCy, lpvoSize * 0.485, 0, Math.PI * 2);
  lpCtx.clip();

  // Fine full-span central horizontal & vertical crosshair hairlines (matching reference photo)
  lpCtx.strokeStyle = 'rgba(8, 10, 14, 0.92)';
  lpCtx.lineWidth = 2.6;
  lpCtx.beginPath();
  lpCtx.moveTo(0, lCy);
  lpCtx.lineTo(lpvoSize, lCy);
  lpCtx.moveTo(lCx, 0);
  lpCtx.lineTo(lCx, lpvoSize);
  lpCtx.stroke();

  // Heavy outer duplex stadia posts on Left, Right, and Bottom (no heavy top post)
  lpCtx.strokeStyle = 'rgba(6, 8, 12, 0.98)';
  lpCtx.lineWidth = 10;
  lpCtx.lineCap = 'butt';
  lpCtx.beginPath();
  lpCtx.moveTo(0, lCy);
  lpCtx.lineTo(lCx - 295, lCy);
  lpCtx.moveTo(lCx + 295, lCy);
  lpCtx.lineTo(lpvoSize, lCy);
  lpCtx.moveTo(lCx, lCy + 295);
  lpCtx.lineTo(lCx, lpvoSize);
  lpCtx.stroke();

  // Fine Mil-Dot & BDC graduation hash marks along all 4 axes
  lpCtx.strokeStyle = 'rgba(8, 10, 14, 0.92)';
  lpCtx.lineWidth = 2.4;
  for (let m = 1; m <= 9; m++) {
    const off = m * 29;
    const tickH = m % 2 === 0 ? 11 : 6;
    lpCtx.beginPath();
    // Left & Right windage ticks
    lpCtx.moveTo(lCx - off, lCy - tickH);
    lpCtx.lineTo(lCx - off, lCy + tickH);
    lpCtx.moveTo(lCx + off, lCy - tickH);
    lpCtx.lineTo(lCx + off, lCy + tickH);
    // Top & Bottom elevation ticks
    lpCtx.moveTo(lCx - tickH, lCy - off);
    lpCtx.lineTo(lCx + tickH, lCy - off);
    lpCtx.moveTo(lCx - tickH * 1.15, lCy + off);
    lpCtx.lineTo(lCx + tickH * 1.15, lCy + off);
    lpCtx.stroke();
  }

  // Micro razor-sharp illuminated center dot (1.5px core + subtle glow so center stays precise)
  lpCtx.fillStyle = 'rgba(239, 68, 68, 0.25)';
  lpCtx.beginPath();
  lpCtx.arc(lCx, lCy, 6.5, 0, Math.PI * 2);
  lpCtx.fill();

  lpCtx.fillStyle = '#ff2e2e';
  lpCtx.beginPath();
  lpCtx.arc(lCx, lCy, 2.8, 0, Math.PI * 2);
  lpCtx.fill();

  lpCtx.restore();

  const lpvoReticle = new THREE.CanvasTexture(lpvoCanvas);
  lpvoReticle.colorSpace = THREE.SRGBColorSpace;
  lpvoReticle.anisotropy = maxAniso;

  // 8. Canted 45° Micro Red Dot Reticle
  const cantedCanvas = document.createElement('canvas');
  cantedCanvas.width = 256;
  cantedCanvas.height = 256;
  const cCtx = cantedCanvas.getContext('2d')!;
  cCtx.clearRect(0, 0, 256, 256);
  cCtx.shadowColor = '#ef4444';
  cCtx.shadowBlur = 12;
  cCtx.fillStyle = '#ff3b30';
  cCtx.beginPath();
  cCtx.arc(128, 128, 8, 0, Math.PI * 2);
  cCtx.fill();
  const cantedDotReticle = new THREE.CanvasTexture(cantedCanvas);
  cantedDotReticle.colorSpace = THREE.SRGBColorSpace;
  cantedDotReticle.anisotropy = maxAniso;

  // 9. Tactical IPSC / IDPA Ballistic Silhouette Target Texture
  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = 512;
  targetCanvas.height = 768;
  const tCtx = targetCanvas.getContext('2d')!;
  tCtx.fillStyle = '#1e242d';
  tCtx.fillRect(0, 0, 512, 768);

  tCtx.strokeStyle = '#94a3b8';
  tCtx.lineWidth = 6;
  tCtx.strokeRect(18, 18, 476, 732);

  tCtx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
  tCtx.lineWidth = 4;
  tCtx.strokeRect(86, 210, 340, 460);

  tCtx.fillStyle = 'rgba(245, 158, 11, 0.16)';
  tCtx.fillRect(156, 260, 200, 260);
  tCtx.strokeStyle = '#f59e0b';
  tCtx.lineWidth = 4;
  tCtx.strokeRect(156, 260, 200, 260);

  tCtx.beginPath();
  tCtx.moveTo(236, 390);
  tCtx.lineTo(276, 390);
  tCtx.moveTo(256, 370);
  tCtx.lineTo(256, 410);
  tCtx.stroke();

  tCtx.fillStyle = 'rgba(239, 68, 68, 0.22)';
  tCtx.fillRect(186, 62, 140, 116);
  tCtx.strokeStyle = '#ef4444';
  tCtx.lineWidth = 4;
  tCtx.strokeRect(186, 62, 140, 116);

  tCtx.fillStyle = '#f8fafc';
  tCtx.font = '700 22px monospace';
  tCtx.fillText('A-ZONE 100', 184, 300);
  tCtx.fillText('CRANIAL', 208, 128);

  const silhouetteTarget = new THREE.CanvasTexture(targetCanvas);
  silhouetteTarget.colorSpace = THREE.SRGBColorSpace;
  silhouetteTarget.anisotropy = maxAniso;

  // 10. High-Frequency Tactical Leather & TrekDry Micro-Grain Map (Neutral White-Grey base so Vertex Colors tint cleanly)
  const gloveCanvas = document.createElement('canvas');
  gloveCanvas.width = 256;
  gloveCanvas.height = 256;
  const gCtx = gloveCanvas.getContext('2d')!;
  gCtx.fillStyle = '#e8e8e8';
  gCtx.fillRect(0, 0, 256, 256);

  // Micro-weave diamond pores & leather grain
  for (let y = 0; y < 256; y += 4) {
    for (let x = 0; x < 256; x += 4) {
      const offset = (y / 4) % 2 === 0 ? 0 : 2;
      gCtx.fillStyle = 'rgba(0, 0, 0, 0.16)';
      gCtx.beginPath();
      gCtx.arc(x + offset, y, 1.0, 0, Math.PI * 2);
      gCtx.fill();

      gCtx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      gCtx.fillRect(x + offset + 1, y + 1, 1.2, 1.2);
    }
  }

  // Fine tactical seam stitching lines
  gCtx.strokeStyle = 'rgba(30, 30, 30, 0.28)';
  gCtx.lineWidth = 1.5;
  gCtx.setLineDash([4, 3]);
  gCtx.beginPath();
  gCtx.moveTo(0, 64);
  gCtx.lineTo(256, 64);
  gCtx.moveTo(0, 128);
  gCtx.lineTo(256, 128);
  gCtx.moveTo(0, 192);
  gCtx.lineTo(256, 192);
  gCtx.stroke();
  gCtx.setLineDash([]);

  const gloveFabric = new THREE.CanvasTexture(gloveCanvas);
  gloveFabric.colorSpace = THREE.SRGBColorSpace;
  gloveFabric.wrapS = THREE.RepeatWrapping;
  gloveFabric.wrapT = THREE.RepeatWrapping;
  gloveFabric.repeat.set(4, 4);
  gloveFabric.anisotropy = maxAniso;

  const gloveBump = new THREE.CanvasTexture(gloveCanvas);
  gloveBump.colorSpace = THREE.NoColorSpace;
  gloveBump.wrapS = THREE.RepeatWrapping;
  gloveBump.wrapT = THREE.RepeatWrapping;
  gloveBump.repeat.set(4, 4);

  // 11. Molded Carbon-Fiber / Kevlar Hard Knuckle Weave Texture
  const carbonCanvas = document.createElement('canvas');
  carbonCanvas.width = 128;
  carbonCanvas.height = 128;
  const cbCtx = carbonCanvas.getContext('2d')!;
  cbCtx.fillStyle = '#14171c';
  cbCtx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 8) {
    for (let x = 0; x < 128; x += 8) {
      const shift = (y / 8) % 2 === 0 ? 0 : 4;
      cbCtx.fillStyle = '#2d333d';
      cbCtx.fillRect(x + shift, y, 4, 4);
      cbCtx.fillStyle = '#0d0f13';
      cbCtx.fillRect(x + shift + 4, y + 4, 4, 4);
    }
  }
  const gloveCarbon = new THREE.CanvasTexture(carbonCanvas);
  gloveCarbon.colorSpace = THREE.SRGBColorSpace;
  gloveCarbon.wrapS = THREE.RepeatWrapping;
  gloveCarbon.wrapT = THREE.RepeatWrapping;
  gloveCarbon.repeat.set(3, 3);
  gloveCarbon.anisotropy = maxAniso;

  // 12. Ripstop MultiCam / Ranger Green Combat Shirt Sleeve Texture
  const sleeveCanvas = document.createElement('canvas');
  sleeveCanvas.width = 256;
  sleeveCanvas.height = 256;
  const sCtx = sleeveCanvas.getContext('2d')!;
  sCtx.fillStyle = '#333b30';
  sCtx.fillRect(0, 0, 256, 256);

  const camoColors = [
    'rgba(78, 69, 52, 0.45)',
    'rgba(38, 44, 34, 0.55)',
    'rgba(122, 110, 86, 0.25)',
    'rgba(24, 28, 22, 0.45)',
  ];
  for (let i = 0; i < 42; i++) {
    sCtx.fillStyle = camoColors[i % camoColors.length];
    sCtx.beginPath();
    sCtx.ellipse(
      (i * 53) % 256,
      (i * 71) % 256,
      18 + (i % 4) * 9,
      10 + (i % 3) * 7,
      (i * 0.7) % Math.PI,
      0,
      Math.PI * 2
    );
    sCtx.fill();
  }

  sCtx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
  sCtx.lineWidth = 1;
  for (let p = 0; p < 256; p += 8) {
    sCtx.beginPath();
    sCtx.moveTo(p, 0);
    sCtx.lineTo(p, 256);
    sCtx.moveTo(0, p);
    sCtx.lineTo(256, p);
    sCtx.stroke();
  }

  const combatSleeve = new THREE.CanvasTexture(sleeveCanvas);
  combatSleeve.colorSpace = THREE.SRGBColorSpace;
  combatSleeve.wrapS = THREE.RepeatWrapping;
  combatSleeve.wrapT = THREE.RepeatWrapping;
  combatSleeve.repeat.set(2, 2);
  combatSleeve.anisotropy = maxAniso;

  // 13. Illuminated Tactical Operator Wristwatch Face
  const watchCanvas = document.createElement('canvas');
  watchCanvas.width = 128;
  watchCanvas.height = 128;
  const wtCtx = watchCanvas.getContext('2d')!;
  wtCtx.fillStyle = '#070b0e';
  wtCtx.fillRect(0, 0, 128, 128);
  wtCtx.strokeStyle = '#10b981';
  wtCtx.lineWidth = 3;
  wtCtx.beginPath();
  wtCtx.arc(64, 64, 56, 0, Math.PI * 2);
  wtCtx.stroke();
  wtCtx.fillStyle = '#10b981';
  wtCtx.font = '700 26px monospace';
  wtCtx.fillText('14:05', 24, 64);
  wtCtx.fillStyle = '#f59e0b';
  wtCtx.font = '600 13px monospace';
  wtCtx.fillText('BPM 78 · N34°', 16, 86);
  const tacticalWatchFace = new THREE.CanvasTexture(watchCanvas);
  tacticalWatchFace.colorSpace = THREE.SRGBColorSpace;

  // 14. Premium Volumetric Starburst Muzzle Flash Corona Texture (6-Point Compensator Star + White-Hot Core)
  const starCanvas = document.createElement('canvas');
  starCanvas.width = 256;
  starCanvas.height = 256;
  const stCtx = starCanvas.getContext('2d')!;
  stCtx.clearRect(0, 0, 256, 256);

  // Soft outer orange-amber glow halo
  const outerHalo = stCtx.createRadialGradient(128, 128, 4, 128, 128, 124);
  outerHalo.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  outerHalo.addColorStop(0.18, 'rgba(254, 243, 199, 0.96)');
  outerHalo.addColorStop(0.38, 'rgba(251, 191, 36, 0.72)');
  outerHalo.addColorStop(0.68, 'rgba(234, 88, 12, 0.28)');
  outerHalo.addColorStop(1.0, 'rgba(154, 52, 18, 0.0)');
  stCtx.fillStyle = outerHalo;
  stCtx.beginPath();
  stCtx.arc(128, 128, 124, 0, Math.PI * 2);
  stCtx.fill();

  // 6-point compensator gas spikes
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3 + (i % 2 === 0 ? 0.05 : -0.05);
    const spikeLen = i % 2 === 0 ? 122 : 96;
    const spikeWidth = i % 2 === 0 ? 22 : 16;
    stCtx.save();
    stCtx.translate(128, 128);
    stCtx.rotate(angle);

    const spikeGrad = stCtx.createLinearGradient(0, 0, spikeLen, 0);
    spikeGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    spikeGrad.addColorStop(0.3, 'rgba(253, 224, 71, 0.92)');
    spikeGrad.addColorStop(0.68, 'rgba(249, 115, 22, 0.52)');
    spikeGrad.addColorStop(1.0, 'rgba(234, 88, 12, 0.0)');
    stCtx.fillStyle = spikeGrad;

    stCtx.beginPath();
    stCtx.moveTo(0, -spikeWidth);
    stCtx.quadraticCurveTo(spikeLen * 0.55, -spikeWidth * 0.35, spikeLen, 0);
    stCtx.quadraticCurveTo(spikeLen * 0.55, spikeWidth * 0.35, 0, spikeWidth);
    stCtx.closePath();
    stCtx.fill();
    stCtx.restore();
  }

  // Incandescent white-hot plasma center
  const coreGrad = stCtx.createRadialGradient(128, 128, 0, 128, 128, 42);
  coreGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  coreGrad.addColorStop(0.55, 'rgba(254, 249, 195, 0.95)');
  coreGrad.addColorStop(1.0, 'rgba(251, 191, 36, 0.0)');
  stCtx.fillStyle = coreGrad;
  stCtx.beginPath();
  stCtx.arc(128, 128, 42, 0, Math.PI * 2);
  stCtx.fill();

  const muzzleFlashStar = new THREE.CanvasTexture(starCanvas);
  muzzleFlashStar.colorSpace = THREE.SRGBColorSpace;

  // 15. Directional Supersonic Flame Plume Jet Texture (Mach-Diamond Barrel Blast)
  const jetCanvas = document.createElement('canvas');
  jetCanvas.width = 256;
  jetCanvas.height = 128;
  const jCtx = jetCanvas.getContext('2d')!;
  jCtx.clearRect(0, 0, 256, 128);

  const jetGrad = jCtx.createLinearGradient(12, 64, 248, 64);
  jetGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
  jetGrad.addColorStop(0.08, 'rgba(255, 255, 255, 1.0)');
  jetGrad.addColorStop(0.28, 'rgba(254, 240, 138, 0.96)');
  jetGrad.addColorStop(0.58, 'rgba(249, 115, 22, 0.78)');
  jetGrad.addColorStop(0.85, 'rgba(220, 38, 38, 0.32)');
  jetGrad.addColorStop(1.0, 'rgba(127, 29, 29, 0.0)');

  jCtx.fillStyle = jetGrad;
  jCtx.beginPath();
  jCtx.moveTo(8, 64);
  jCtx.quadraticCurveTo(58, 10, 150, 26);
  jCtx.quadraticCurveTo(215, 40, 250, 64);
  jCtx.quadraticCurveTo(215, 88, 150, 102);
  jCtx.quadraticCurveTo(58, 118, 8, 64);
  jCtx.closePath();
  jCtx.fill();

  // Inner white-hot mach diamond core inside the flame plume
  const innerJetGrad = jCtx.createLinearGradient(16, 64, 145, 64);
  innerJetGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
  innerJetGrad.addColorStop(0.5, 'rgba(254, 249, 195, 0.9)');
  innerJetGrad.addColorStop(1.0, 'rgba(251, 191, 36, 0.0)');
  jCtx.fillStyle = innerJetGrad;
  jCtx.beginPath();
  jCtx.ellipse(72, 64, 58, 18, 0, 0, Math.PI * 2);
  jCtx.fill();

  const muzzleFlashJet = new THREE.CanvasTexture(jetCanvas);
  muzzleFlashJet.colorSpace = THREE.SRGBColorSpace;

  return {
    floorGrid,
    wallGrid,
    hazardBlock,
    plywoodGrid,
    brushedMetalRoughness,
    holoReticle,
    lpvoReticle,
    cantedDotReticle,
    silhouetteTarget,
    gloveFabric,
    gloveBump,
    gloveCarbon,
    combatSleeve,
    tacticalWatchFace,
    muzzleFlashStar,
    muzzleFlashJet,
  };
}
