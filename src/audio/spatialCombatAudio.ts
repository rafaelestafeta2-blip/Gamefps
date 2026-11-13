import * as THREE from 'three';
import { WeaponId } from '../types/game';
import { checkBotLineOfSight } from '../three/botNavigationRoutes';
import { Dust2TriangleCollider } from '../three/dust2Collider';
import { TacticalGrenadeSystem } from '../three/grenadeSystem';
import { ColliderBox, TacticalTargetEntity } from '../three/levelBuilder';
import { YardBotEntity } from '../three/yardPropsBuilder';
import { soundEngine } from './soundEngine';
import {
  getShellshockMuffleMultiplier,
  playShellCasingDrop3D,
} from './tacticalImmersionAudio';

const _botEar = new THREE.Vector3();
const _playerEar = new THREE.Vector3();
const _segDir = new THREE.Vector3();
const _toListener = new THREE.Vector3();
const _closestPt = new THREE.Vector3();

let heartbeatTimer = 0;

/**
 * Calcula o Pan Estéreo (-0.95 Esquerda a +0.95 Direita) relativo ao Yaw da câmera do jogador.
 * No Three.js, quando yaw = 0 a câmera olha para -Z e o eixo +X aponta para a direita.
 */
function computeStereoPan(
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
  const rightDot = (dx * rightX + dz * rightZ) / dist;
  return THREE.MathUtils.clamp(rightDot, -0.95, 0.95);
}

/**
 * Curva de atenuação de distância estilo Call of Duty para tiros 3D:
 * Próximo (0-5m) = forte; Médio (5-28m) = queda progressiva; Longe (>30m) = abafado/distante.
 */
function computeGunshotDistanceGain(dist: number, isSniper: boolean): number {
  const maxRange = isSniper ? 95 : 72;
  if (dist >= maxRange) return 0.018;
  if (dist <= 4.0) return 0.92;
  const norm = (dist - 4.0) / (maxRange - 4.0);
  const invCurve = 1 / (1 + dist * (isSniper ? 0.085 : 0.125));
  return Math.max(0.02, invCurve * (1 - norm * 0.45));
}

/**
 * Disparo 3D Espacializado para Bots com Atenuação de Distância, Pan Estéreo Real,
 * Oclusão Acústica de Parede (Low-Pass Filter) e Eco Exterior de Mapa.
 */
export function playSpatialBotGunshot(
  shooterPos: THREE.Vector3,
  listenerPos: THREE.Vector3,
  listenerYaw: number,
  weaponId: WeaponId,
  isOccludedByWall = false
): void {
  const state = soundEngine.getSpatialAudioState();
  if (state.muted || !state.ctx) return;
  const ctx = state.ctx;
  const now = ctx.currentTime;

  const dist = shooterPos.distanceTo(listenerPos);
  const isSniper = weaponId === 'SNIPER_BOLT' || weaponId === 'SNIPER_TACTICAL';
  const baseGain = computeGunshotDistanceGain(dist, isSniper);
  const occlusionMult = isOccludedByWall ? 0.46 : 1.0;
  const finalGain = baseGain * occlusionMult;
  if (finalGain < 0.012) return;

  const panValue = computeStereoPan(shooterPos, listenerPos, listenerYaw);

  // Filtro passa-baixa que simula absorção do ar + abafamento atrás de paredes + concussão Shellshock
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  const muffle = getShellshockMuffleMultiplier();
  const distCutoff = THREE.MathUtils.lerp(9500, 1450, Math.min(1, dist / 62));
  filter.frequency.setValueAtTime(
    (isOccludedByWall ? Math.min(distCutoff, 880) : distCutoff) * muffle,
    now
  );
  filter.Q.setValueAtTime(0.7, now);
  playShellCasingDrop3D(shooterPos, listenerPos, listenerYaw, weaponId, false);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(finalGain, now);

  let outputNode: AudioNode = gainNode;
  if (typeof ctx.createStereoPanner === 'function') {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(panValue, now);
    gainNode.connect(panner);
    outputNode = panner;
  }
  filter.connect(gainNode);
  outputNode.connect(ctx.destination);

  const sampleBuffer =
    weaponId === 'AK47_RIFLE' || weaponId === 'AK12_RIFLE'
      ? state.ak47ShotBuffer || state.m4a1ShotBuffer
      : isSniper
        ? state.sniperShotBuffer || state.ak47ShotBuffer
        : weaponId === 'P50_PISTOL'
          ? state.desertEagleBuffer || state.m4a1ShotBuffer
          : state.m4a1ShotBuffer || state.ak47ShotBuffer;

  if (sampleBuffer) {
    const src = ctx.createBufferSource();
    src.buffer = sampleBuffer;
    const rate =
      (weaponId === 'SNIPER_TACTICAL' ? 1.12 : 1.0) +
      (Math.random() - 0.5) * 0.05;
    src.playbackRate.setValueAtTime(rate, now);
    src.connect(filter);
    src.start(now);

    // Cauda de eco exterior (Reverb / Slapback de mapa aberto quando distante > 12m)
    if (dist > 12 && !isOccludedByWall) {
      const echoDelay = THREE.MathUtils.clamp(0.09 + dist * 0.0022, 0.1, 0.24);
      const echoSrc = ctx.createBufferSource();
      echoSrc.buffer = sampleBuffer;
      echoSrc.playbackRate.setValueAtTime(rate * 0.92, now + echoDelay);

      const echoFilter = ctx.createBiquadFilter();
      echoFilter.type = 'bandpass';
      echoFilter.frequency.setValueAtTime(680, now + echoDelay);
      echoFilter.Q.setValueAtTime(0.9, now + echoDelay);

      const echoGain = ctx.createGain();
      echoGain.gain.setValueAtTime(finalGain * 0.26, now + echoDelay);

      echoSrc.connect(echoFilter);
      echoFilter.connect(echoGain);
      echoGain.connect(outputNode);
      echoSrc.start(now + echoDelay);
    }
    return;
  }

  // Fallback sintético caso o buffer ainda esteja decodificando
  if (state.noiseBuffer) {
    const noise = ctx.createBufferSource();
    noise.buffer = state.noiseBuffer;
    gainNode.gain.setValueAtTime(finalGain * 0.7, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    noise.connect(filter);
    noise.start(now);
    noise.stop(now + 0.19);
  }
}

/**
 * Estalo Supersônico (Bullet Crack) + Assobio Doppler (Bullet Whizz) quando um tiro
 * inimigo passa raspando perto da cabeça do jogador (< 3.8m).
 */
export function playBulletSnapAndWhizz(
  shooterPos: THREE.Vector3,
  targetPos: THREE.Vector3,
  listenerPos: THREE.Vector3,
  listenerYaw: number
): void {
  const state = soundEngine.getSpatialAudioState();
  if (state.muted || !state.ctx || !state.noiseBuffer) return;

  _segDir.subVectors(targetPos, shooterPos);
  const segLen = _segDir.length();
  if (segLen < 0.5) return;
  _segDir.multiplyScalar(1 / segLen);

  _toListener.subVectors(listenerPos, shooterPos);
  const proj = THREE.MathUtils.clamp(_toListener.dot(_segDir), 0, segLen);
  _closestPt.copy(shooterPos).addScaledVector(_segDir, proj);

  const missDist = _closestPt.distanceTo(listenerPos);
  if (missDist > 3.8) return;

  const ctx = state.ctx;
  const now = ctx.currentTime;
  const proximity = 1 - missDist / 3.8;
  const panValue = computeStereoPan(_closestPt, listenerPos, listenerYaw);

  let destNode: AudioNode = ctx.destination;
  if (typeof ctx.createStereoPanner === 'function') {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(panValue, now);
    panner.connect(ctx.destination);
    destNode = panner;
  }

  // 1. Estalo Supersônico Seco (Crack)
  const snapSrc = ctx.createBufferSource();
  snapSrc.buffer = state.noiseBuffer;
  const snapFilter = ctx.createBiquadFilter();
  snapFilter.type = 'bandpass';
  snapFilter.frequency.setValueAtTime(2400, now);
  snapFilter.frequency.exponentialRampToValueAtTime(850, now + 0.045);
  snapFilter.Q.setValueAtTime(2.2, now);

  const snapGain = ctx.createGain();
  snapGain.gain.setValueAtTime(0.38 * proximity, now);
  snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  snapSrc.connect(snapFilter);
  snapFilter.connect(snapGain);
  snapGain.connect(destNode);
  snapSrc.start(now);
  snapSrc.stop(now + 0.055);

  // 2. Assobio Aerodinâmico com Efeito Doppler (Whizz)
  const whizzOsc = ctx.createOscillator();
  whizzOsc.type = 'sine';
  whizzOsc.frequency.setValueAtTime(1480 + Math.random() * 260, now);
  whizzOsc.frequency.exponentialRampToValueAtTime(340, now + 0.11);

  const whizzGain = ctx.createGain();
  whizzGain.gain.setValueAtTime(0.001, now);
  whizzGain.gain.linearRampToValueAtTime(0.16 * proximity, now + 0.025);
  whizzGain.gain.exponentialRampToValueAtTime(0.001, now + 0.115);

  whizzOsc.connect(whizzGain);
  whizzGain.connect(destNode);
  whizzOsc.start(now);
  whizzOsc.stop(now + 0.12);
}

/**
 * Reproduz um passo 3D posicionado de um Bot (inimigo ou aliado) conforme ele se aproxima.
 */
function playSpatialBotFootstep(
  botPos: THREE.Vector3,
  listenerPos: THREE.Vector3,
  listenerYaw: number,
  dist: number,
  isRunning: boolean,
  isEnemy: boolean,
  isOccluded: boolean
): void {
  const state = soundEngine.getSpatialAudioState();
  if (state.muted || !state.ctx) return;
  const ctx = state.ctx;
  const now = ctx.currentTime;

  const maxStepRange = isEnemy ? 25.0 : 14.0;
  if (dist >= maxStepRange) return;

  const prox = 1 - dist / maxStepRange;
  const baseVol = (isRunning ? 0.62 : 0.36) * (isEnemy ? 1.0 : 0.42);
  const finalGain = baseVol * prox * prox * (isOccluded ? 0.52 : 1.0);
  if (finalGain < 0.015) return;

  const panValue = computeStereoPan(botPos, listenerPos, listenerYaw);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  const muffle = getShellshockMuffleMultiplier();
  filter.frequency.setValueAtTime(
    (isOccluded ? 560 : 2400 - dist * 55) * muffle,
    now
  );

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(finalGain, now);

  let outNode: AudioNode = gainNode;
  if (typeof ctx.createStereoPanner === 'function') {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(panValue, now);
    gainNode.connect(panner);
    outNode = panner;
  }
  filter.connect(gainNode);
  outNode.connect(ctx.destination);

  if (state.footstepRunBuffer) {
    const src = ctx.createBufferSource();
    src.buffer = state.footstepRunBuffer;
    const rate = (isRunning ? 1.05 : 0.92) + (Math.random() - 0.5) * 0.08;
    src.playbackRate.setValueAtTime(rate, now);
    src.connect(filter);
    src.start(now);
    return;
  }

  // Fallback sintético de bota tática no piso
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(115, now);
  osc.frequency.exponentialRampToValueAtTime(38, now + 0.065);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  osc.connect(filter);
  osc.start(now);
  osc.stop(now + 0.075);
}

/**
 * Atualiza a cadência de passos 3D de todos os Bots vivos no mapa + Batimento Cardíaco de Vida Baixa.
 */
export function updateSpatialBotFootstepsAndHeartbeat(
  targets: TacticalTargetEntity[],
  listenerPos: THREE.Vector3,
  listenerYaw: number,
  playerHealth: number,
  isPlayerDead: boolean,
  dt: number,
  grenadeSystem: TacticalGrenadeSystem,
  colliders?: ColliderBox[],
  activeGlbCollider?: Dust2TriangleCollider | null
): void {
  _playerEar.set(listenerPos.x, listenerPos.y + 1.5, listenerPos.z);

  for (let i = 0; i < targets.length; i++) {
    const bot = targets[i] as YardBotEntity;
    if (bot.isDown || bot.type !== 'COMBAT_BOT') continue;

    bot.root.userData = bot.root.userData || {};
    const prevX = bot.root.userData.audioPrevX ?? bot.root.position.x;
    const prevZ = bot.root.userData.audioPrevZ ?? bot.root.position.z;
    const stepMove = Math.hypot(
      bot.root.position.x - prevX,
      bot.root.position.z - prevZ
    );
    bot.root.userData.audioPrevX = bot.root.position.x;
    bot.root.userData.audioPrevZ = bot.root.position.z;

    const speed = dt > 0.0001 ? stepMove / dt : 0;
    if (speed < 0.25) continue;

    const dist = bot.root.position.distanceTo(listenerPos);
    if (dist > 25.0) continue;

    const strideLen = speed > 1.85 ? 1.38 : 1.65;
    bot.root.userData.stepDistAccum =
      (bot.root.userData.stepDistAccum || 0) + stepMove;

    if (bot.root.userData.stepDistAccum >= strideLen) {
      bot.root.userData.stepDistAccum %= strideLen;
      _botEar.set(bot.root.position.x, bot.root.position.y + 1.0, bot.root.position.z);
      const hasLos = checkBotLineOfSight(
        _botEar,
        _playerEar,
        grenadeSystem,
        colliders,
        activeGlbCollider
      );
      playSpatialBotFootstep(
        bot.root.position,
        listenerPos,
        listenerYaw,
        dist,
        speed > 1.85,
        !bot.isAlly,
        !hasLos
      );
    }
  }

  // Batimento cardíaco tenso estilo Call of Duty quando o jogador está com vida crítica (<= 38 HP)
  if (!isPlayerDead && playerHealth > 0 && playerHealth <= 38) {
    heartbeatTimer -= dt;
    if (heartbeatTimer <= 0) {
      const urgency = 1 - playerHealth / 38;
      heartbeatTimer = THREE.MathUtils.lerp(0.78, 0.46, urgency);
      const state = soundEngine.getSpatialAudioState();
      if (!state.muted && state.ctx) {
        const ctx = state.ctx;
        const now = ctx.currentTime;
        const beatVol = THREE.MathUtils.lerp(0.18, 0.42, urgency);
        for (let pulse = 0; pulse < 2; pulse++) {
          const t0 = now + pulse * 0.16;
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(pulse === 0 ? 62 : 52, t0);
          osc.frequency.exponentialRampToValueAtTime(28, t0 + 0.11);
          const g = ctx.createGain();
          g.gain.setValueAtTime(beatVol * (pulse === 0 ? 1.0 : 0.72), t0);
          g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(t0);
          osc.stop(t0 + 0.125);
        }
      }
    }
  }
}
