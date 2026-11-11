import * as THREE from 'three';
import { WeaponId } from '../types/game';
import { playRealShellCasingBounce } from './characterAndBombAudio';
import { soundEngine } from './soundEngine';

export type SurfaceMaterialType = 'METAL' | 'CONCRETE' | 'WOOD';
export type RadioCalloutType =
  | 'ENEMY_SPOTTED'
  | 'RELOADING'
  | 'PLANTING_C4'
  | 'DEFUSING_C4'
  | 'TARGET_DOWN';

let shellshockStartTime = 0;
let shellshockDuration = 0;
let lastRadioCalloutTime = 0;

function computePan(
  sourcePos: THREE.Vector3,
  listenerPos: THREE.Vector3,
  listenerYaw: number
): number {
  const dx = sourcePos.x - listenerPos.x;
  const dz = sourcePos.z - listenerPos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.15) return 0;
  const rightX = Math.cos(listenerYaw);
  const rightZ = -Math.sin(listenerYaw);
  return THREE.MathUtils.clamp((dx * rightX + dz * rightZ) / dist, -0.95, 0.95);
}

/**
 * Retorna o multiplicador de frequência de corte (0.18 a 1.0) quando o jogador
 * está sob efeito de concussão (Shellshock) de uma granada próxima.
 */
export function getShellshockMuffleMultiplier(): number {
  const state = soundEngine.getSpatialAudioState();
  if (!state.ctx || shellshockDuration <= 0) return 1.0;
  const elapsed = state.ctx.currentTime - shellshockStartTime;
  if (elapsed < 0 || elapsed >= shellshockDuration) return 1.0;
  const progress = elapsed / shellshockDuration;
  return THREE.MathUtils.lerp(0.16, 1.0, progress * progress);
}

/**
 * 1. Zumbido de Concussão (Tinnitus Shellshock) + Abafamento Acústico Temporário
 * acionado quando uma granada Frag explode a menos de 14.5m do jogador.
 */
export function triggerShellshockTinnitus(
  explosionPos: THREE.Vector3,
  listenerPos: THREE.Vector3
): void {
  const state = soundEngine.getSpatialAudioState();
  if (state.muted || !state.ctx) return;

  const dist = explosionPos.distanceTo(listenerPos);
  if (dist > 14.5) return;

  const ctx = state.ctx;
  const now = ctx.currentTime;
  const intensity = THREE.MathUtils.clamp(1 - dist / 14.5, 0.15, 1.0);

  shellshockStartTime = now;
  shellshockDuration = THREE.MathUtils.lerp(1.6, 3.4, intensity);

  // Onda de choque sub-grave no tímpano (Pressure Blast Thump)
  const subOsc = ctx.createOscillator();
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(58, now);
  subOsc.frequency.exponentialRampToValueAtTime(22, now + 0.45);

  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.48 * intensity, now);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

  subOsc.connect(subGain);
  subGain.connect(ctx.destination);
  subOsc.start(now);
  subOsc.stop(now + 0.5);

  // Agudo característico de Tinnitus (Call of Duty Shellshock Ring ~3180 Hz)
  const ringOsc = ctx.createOscillator();
  ringOsc.type = 'sine';
  ringOsc.frequency.setValueAtTime(3180, now);
  ringOsc.frequency.linearRampToValueAtTime(3145, now + shellshockDuration);

  const ringGain = ctx.createGain();
  ringGain.gain.setValueAtTime(0.001, now);
  ringGain.gain.linearRampToValueAtTime(0.22 * intensity, now + 0.08);
  ringGain.gain.exponentialRampToValueAtTime(0.0008, now + shellshockDuration);

  ringOsc.connect(ringGain);
  ringGain.connect(ctx.destination);
  ringOsc.start(now);
  ringOsc.stop(now + shellshockDuration + 0.05);
}

/**
 * 2. Som 3D de Cápsulas Metálicas (Latão Quente) quicando no piso após disparos.
 */
export function playShellCasingDrop3D(
  shooterPos: THREE.Vector3,
  listenerPos: THREE.Vector3,
  listenerYaw: number,
  weaponId: WeaponId,
  isFirstPerson: boolean
): void {
  const state = soundEngine.getSpatialAudioState();
  if (state.muted || !state.ctx) return;

  const dist = isFirstPerson ? 0.6 : shooterPos.distanceTo(listenerPos);
  if (dist > 13.0) return;

  const ctx = state.ctx;
  const now = ctx.currentTime;
  const atten = isFirstPerson ? 0.24 : 0.18 * Math.pow(1 - dist / 13.0, 1.6);
  if (atten < 0.01) return;

  const panVal = isFirstPerson
    ? 0.28
    : computePan(shooterPos, listenerPos, listenerYaw);

  const isHeavyBrass =
    weaponId === 'AK47_RIFLE' ||
    weaponId === 'SNIPER_BOLT' ||
    weaponId === 'SNIPER_TACTICAL';
  const firstBounceDelay =
    weaponId === 'SNIPER_BOLT' ? 0.48 : 0.24 + Math.random() * 0.05;
  const realPitch =
    (isHeavyBrass ? 0.92 : 1.04) + (Math.random() - 0.5) * 0.08;

  if (
    playRealShellCasingBounce(
      panVal,
      Math.min(0.95, atten * 2.6),
      realPitch,
      firstBounceDelay
    )
  ) {
    return;
  }

  let outNode: AudioNode = ctx.destination;
  if (typeof ctx.createStereoPanner === 'function') {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(panVal, now);
    panner.connect(ctx.destination);
    outNode = panner;
  }

  const baseFreq1 = isHeavyBrass ? 3850 : 4750;
  const baseFreq2 = isHeavyBrass ? 5620 : 6880;
  const bounceOffsets = [0, 0.13 + Math.random() * 0.03, 0.22 + Math.random() * 0.03];
  const bounceGains = [1.0, 0.58, 0.32];

  for (let b = 0; b < 3; b++) {
    const t0 = now + firstBounceDelay + bounceOffsets[b];
    const gVal = atten * bounceGains[b];
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'triangle';
    const jitter = 1 + (Math.random() - 0.5) * 0.06;
    osc1.frequency.setValueAtTime(baseFreq1 * jitter, t0);
    osc2.frequency.setValueAtTime(baseFreq2 * jitter, t0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gVal, t0);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.038);
    osc1.connect(g);
    osc2.connect(g);
    g.connect(outNode);
    osc1.start(t0);
    osc2.start(t0);
    osc1.stop(t0 + 0.042);
    osc2.stop(t0 + 0.042);
  }
}

/**
 * Detecta automaticamente o material acústico (METAL, WOOD ou CONCRETE) da malha atingida.
 */
export function detectSurfaceMaterialFromMesh(
  mesh: THREE.Mesh,
  hitPoint: THREE.Vector3
): SurfaceMaterialType {
  const name = (mesh.name || '').toLowerCase();
  const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as
    | THREE.MeshStandardMaterial
    | undefined;
  const matName = (mat?.name || '').toLowerCase();

  if (
    name.includes('metal') ||
    name.includes('steel') ||
    name.includes('container') ||
    name.includes('barrel') ||
    name.includes('door_metal') ||
    matName.includes('metal') ||
    matName.includes('steel') ||
    (mat && typeof mat.metalness === 'number' && mat.metalness >= 0.45)
  ) {
    return 'METAL';
  }

  if (
    name.includes('wood') ||
    name.includes('crate') ||
    name.includes('box') ||
    name.includes('plywood') ||
    matName.includes('wood') ||
    matName.includes('crate')
  ) {
    return 'WOOD';
  }

  if (mat?.color) {
    const r = mat.color.r;
    const g = mat.color.g;
    const b = mat.color.b;
    if (r > 0.35 && g > 0.22 && b < 0.18 && r > g * 1.15) {
      return 'WOOD';
    }
  }

  void hitPoint;
  return 'CONCRETE';
}

/**
 * 3. Som 3D de Impacto Balístico Diferenciado por Material (METAL, CONCRETE, WOOD).
 */
export function playMaterialImpact3D(
  hitPos: THREE.Vector3,
  listenerPos: THREE.Vector3,
  listenerYaw: number,
  material: SurfaceMaterialType
): void {
  const state = soundEngine.getSpatialAudioState();
  if (state.muted || !state.ctx) return;

  const dist = hitPos.distanceTo(listenerPos);
  if (dist > 38.0) return;

  const ctx = state.ctx;
  const now = ctx.currentTime;
  const muffle = getShellshockMuffleMultiplier();
  const gainVal = THREE.MathUtils.clamp(1 / (1 + dist * 0.11), 0.04, 0.78);
  const panVal = computePan(hitPos, listenerPos, listenerYaw);

  let outNode: AudioNode = ctx.destination;
  if (typeof ctx.createStereoPanner === 'function') {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(panVal, now);
    panner.connect(ctx.destination);
    outNode = panner;
  }

  if (material === 'METAL') {
    // Ping metálico agudo + assobio de ricochete (Call of Duty Metal Ricochet)
    const pingOsc = ctx.createOscillator();
    pingOsc.type = 'triangle';
    const f0 = 1950 + Math.random() * 450;
    pingOsc.frequency.setValueAtTime(f0, now);
    pingOsc.frequency.exponentialRampToValueAtTime(f0 * 1.55, now + 0.035);
    pingOsc.frequency.exponentialRampToValueAtTime(680, now + 0.19);

    const pingGain = ctx.createGain();
    pingGain.gain.setValueAtTime(gainVal * 0.55, now);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    pingOsc.connect(pingGain);
    pingGain.connect(outNode);
    pingOsc.start(now);
    pingOsc.stop(now + 0.21);
    return;
  }

  if (material === 'WOOD') {
    // Impacto oco na madeira + estalo de farpas (Wood Thud + Splinter)
    const thudOsc = ctx.createOscillator();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(285, now);
    thudOsc.frequency.exponentialRampToValueAtTime(75, now + 0.09);

    const thudGain = ctx.createGain();
    thudGain.gain.setValueAtTime(gainVal * 0.65, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    thudOsc.connect(thudGain);
    thudGain.connect(outNode);
    thudOsc.start(now);
    thudOsc.stop(now + 0.1);
  }

  // Estalo seco de pedra/concreto + queda de detritos (Debris Scatter)
  if (state.noiseBuffer) {
    const src = ctx.createBufferSource();
    src.buffer = state.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(
      (material === 'WOOD' ? 1150 : 1850) * muffle,
      now
    );
    filter.Q.setValueAtTime(1.4, now);

    const g = ctx.createGain();
    g.gain.setValueAtTime(gainVal * 0.52, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

    src.connect(filter);
    filter.connect(g);
    g.connect(outNode);
    src.start(now);
    src.stop(now + 0.09);
  }
}

/**
 * 4. Rádio Tático Contextual (Walkie-Talkie PTT Squelch + Voz de Esquadrão Filtrada)
 * acionado quando aliados avistam inimigos, plantam a C4 ou abatem alvos.
 */
export function triggerTacticalRadioCallout(type: RadioCalloutType): void {
  const state = soundEngine.getSpatialAudioState();
  if (state.muted || !state.ctx) return;

  const ctx = state.ctx;
  const now = ctx.currentTime;
  const minCooldown =
    type === 'PLANTING_C4' || type === 'DEFUSING_C4' ? 3.2 : 7.5;
  if (now - lastRadioCalloutTime < minCooldown) return;
  lastRadioCalloutTime = now;

  // 1. Beep Duplo de Abertura do Rádio Militar (PTT Key-On Squelch)
  const pttOsc = ctx.createOscillator();
  pttOsc.type = 'sine';
  pttOsc.frequency.setValueAtTime(1820, now);
  pttOsc.frequency.setValueAtTime(2280, now + 0.028);

  const pttGain = ctx.createGain();
  pttGain.gain.setValueAtTime(0.11, now);
  pttGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  pttOsc.connect(pttGain);
  pttGain.connect(ctx.destination);
  pttOsc.start(now);
  pttOsc.stop(now + 0.065);

  // 2. Cadência Vocal de Rádio Walkie-Talkie (Formantes Filtrados em 550Hz-2200Hz)
  const syllables =
    type === 'ENEMY_SPOTTED'
      ? [145, 168, 152, 138]
      : type === 'PLANTING_C4' || type === 'DEFUSING_C4'
        ? [158, 175, 162, 148, 132]
        : [142, 160, 128];

  const radioBandpass = ctx.createBiquadFilter();
  radioBandpass.type = 'bandpass';
  radioBandpass.frequency.setValueAtTime(1250, now);
  radioBandpass.Q.setValueAtTime(2.4, now);
  radioBandpass.connect(ctx.destination);

  let cursor = now + 0.08;
  for (let i = 0; i < syllables.length; i++) {
    const dur = 0.085 + (i % 2) * 0.03;
    const vOsc = ctx.createOscillator();
    vOsc.type = 'sawtooth';
    vOsc.frequency.setValueAtTime(syllables[i], cursor);
    vOsc.frequency.linearRampToValueAtTime(syllables[i] * 0.94, cursor + dur);

    const vGain = ctx.createGain();
    vGain.gain.setValueAtTime(0.001, cursor);
    vGain.gain.linearRampToValueAtTime(0.09, cursor + 0.015);
    vGain.gain.exponentialRampToValueAtTime(0.001, cursor + dur);

    vOsc.connect(vGain);
    vGain.connect(radioBandpass);
    vOsc.start(cursor);
    vOsc.stop(cursor + dur + 0.01);
    cursor += dur + 0.025;
  }

  // 3. Clique de Fechamento do Rádio (PTT Key-Off Squelch Tail)
  if (state.noiseBuffer) {
    const tailSrc = ctx.createBufferSource();
    tailSrc.buffer = state.noiseBuffer;
    const tailGain = ctx.createGain();
    tailGain.gain.setValueAtTime(0.08, cursor);
    tailGain.gain.exponentialRampToValueAtTime(0.001, cursor + 0.045);
    tailSrc.connect( radioBandpass );
    radioBandpass.connect(tailGain);
    tailGain.connect(ctx.destination);
    tailSrc.start(cursor);
    tailSrc.stop(cursor + 0.05);
  }
}
