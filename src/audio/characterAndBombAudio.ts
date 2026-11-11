import * as THREE from 'three';
import { soundEngine } from './soundEngine';
import { triggerShellshockTinnitus } from './tacticalImmersionAudio';

type CharacterSoundKey =
  | 'CASING_BOUNCE'
  | 'SPRINT_PANTING'
  | 'C4_BEEP'
  | 'BOMB_PLANTED_VOICE'
  | 'PLAYER_HIT_GRUNT'
  | 'HITMARKER'
  | 'GRENADE_BOUNCE';

interface SoundSourceUrls {
  local: string;
  github: string;
}

const SOUND_URLS: Record<CharacterSoundKey, SoundSourceUrls> = {
  CASING_BOUNCE: {
    local: '/sounds/casing_bounce.wav',
    github:
      'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/36c457bb15ef7a22d1b66f754c211465857d2b02/Sound/Personagem/678887__drinkingwindgames__firearm-casing-bounce-6.wav',
  },
  SPRINT_PANTING: {
    local: '/sounds/sprint_panting.wav',
    github:
      'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/36c457bb15ef7a22d1b66f754c211465857d2b02/Sound/Personagem/422987__wakuwakuwakuwaku__sfxpantingafterrun.wav',
  },
  C4_BEEP: {
    local: '/sounds/c4_beep.flac',
    github:
      'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/36c457bb15ef7a22d1b66f754c211465857d2b02/Sound/Personagem/875010__cb9382__digital-watch-beep.flac',
  },
  BOMB_PLANTED_VOICE: {
    local: '/sounds/bomb_planted_voice.mp3',
    github:
      'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/36c457bb15ef7a22d1b66f754c211465857d2b02/Sound/Personagem/ElevenLabs_2026-11-11T16_56_40_Le%C3%B3nidas%20-%20Legendary%20Spartan%20Warrior_pvc_s50_m2.mp3',
  },
  PLAYER_HIT_GRUNT: {
    local: '/sounds/player_hit_grunt.wav',
    github:
      'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/36c457bb15ef7a22d1b66f754c211465857d2b02/Sound/Personagem/90164__snaginneb__gruntsound.wav',
  },
  HITMARKER: {
    local: '/sounds/hitmarker.wav',
    github:
      'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/36c457bb15ef7a22d1b66f754c211465857d2b02/Sound/Personagem/570335__user391915396__hitmarker-sound-effect.wav',
  },
  GRENADE_BOUNCE: {
    local: '/sounds/grenade_bounce.wav',
    github:
      'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/36c457bb15ef7a22d1b66f754c211465857d2b02/Sound/Personagem/466453__patrick_corra__grenade-bouncing.wav',
  },
};

const rawArrayBuffers = new Map<CharacterSoundKey, ArrayBuffer>();
const decodedBuffers = new Map<CharacterSoundKey, AudioBuffer>();
const decodingInProgress = new Set<CharacterSoundKey>();
let preloadInitiated = false;

let lastGruntTime = 0;
let sprintFatigue = 0;
let activePantingSource: AudioBufferSourceNode | null = null;
let activePantingGain: GainNode | null = null;

async function fetchSoundArrayBuffer(urls: SoundSourceUrls): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(urls.local);
    if (res.ok) return await res.arrayBuffer();
  } catch {
    // Fallback para URL raw do GitHub
  }
  try {
    const resGh = await fetch(urls.github);
    if (resGh.ok) return await resGh.arrayBuffer();
  } catch {
    // Ignorar falha de rede
  }
  return null;
}

export function preloadCharacterAndBombAudio(): void {
  if (preloadInitiated) return;
  preloadInitiated = true;

  const keys = Object.keys(SOUND_URLS) as CharacterSoundKey[];
  for (const key of keys) {
    void fetchSoundArrayBuffer(SOUND_URLS[key]).then((buf) => {
      if (buf) {
        rawArrayBuffers.set(key, buf);
        ensureDecodedBuffer(key);
      }
    });
  }
}

function ensureDecodedBuffer(key: CharacterSoundKey): AudioBuffer | null {
  const existing = decodedBuffers.get(key);
  if (existing) return existing;

  const state = soundEngine.getSpatialAudioState();
  const ctx = state.ctx;
  const raw = rawArrayBuffers.get(key);
  if (!ctx || !raw || decodingInProgress.has(key)) return null;

  decodingInProgress.add(key);
  const copy = raw.slice(0);
  ctx
    .decodeAudioData(copy)
    .then((decoded) => {
      decodedBuffers.set(key, decoded);
      decodingInProgress.delete(key);
    })
    .catch(() => {
      decodingInProgress.delete(key);
    });

  return null;
}

function playBufferOneShot(
  key: CharacterSoundKey,
  gainVal: number,
  pitchRate = 1.0,
  panVal = 0,
  delaySec = 0
): boolean {
  preloadCharacterAndBombAudio();
  const state = soundEngine.getSpatialAudioState();
  if (state.muted || !state.ctx) return false;

  const buf = ensureDecodedBuffer(key);
  if (!buf) return false;

  const ctx = state.ctx;
  const startAt = ctx.currentTime + Math.max(0, delaySec);

  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.setValueAtTime(
    THREE.MathUtils.clamp(pitchRate, 0.5, 2.0),
    startAt
  );

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(THREE.MathUtils.clamp(gainVal, 0.01, 1.5), startAt);

  if (typeof ctx.createStereoPanner === 'function' && Math.abs(panVal) > 0.01) {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(THREE.MathUtils.clamp(panVal, -0.95, 0.95), startAt);
    src.connect(gain);
    gain.connect(panner);
    panner.connect(ctx.destination);
  } else {
    src.connect(gain);
    gain.connect(ctx.destination);
  }

  src.start(startAt);
  return true;
}

/**
 * 1. Som real do cartucho metálico vazio quicando no chão após os disparos.
 */
export function playRealShellCasingBounce(
  panVal: number,
  gainVal: number,
  pitchRate = 1.0,
  delaySec = 0.26
): boolean {
  return playBufferOneShot('CASING_BOUNCE', gainVal, pitchRate, panVal, delaySec);
}

/**
 * 2. Som real de Hitmarker quando o jogador acerta um inimigo.
 */
export function playRealHitmarkerSound(isHeadshotOrCrit = false): void {
  const pitch = isHeadshotOrCrit ? 1.12 : 1.0 + (Math.random() - 0.5) * 0.04;
  const vol = isHeadshotOrCrit ? 0.88 : 0.72;
  playBufferOneShot('HITMARKER', vol, pitch, 0, 0);
}

/**
 * 3. Som real de gemido/impacto quando o personagem do jogador recebe tiro ou dano.
 */
export function playRealPlayerHitGrunt(isCritical = false): void {
  const now = performance.now();
  if (now - lastGruntTime < 220) return;
  lastGruntTime = now;

  const pitch = (isCritical ? 0.94 : 1.0) + (Math.random() - 0.5) * 0.08;
  const vol = isCritical ? 0.92 : 0.78;
  playBufferOneShot('PLAYER_HIT_GRUNT', vol, pitch, 0, 0);
}

/**
 * 4. Voz ElevenLabs "Bomba Plantada" acionada imediatamente ao plantar a C4.
 */
export function playRealBombPlantedVoice(): void {
  const played = playBufferOneShot('BOMB_PLANTED_VOICE', 1.15, 1.0, 0, 0);
  if (!played) {
    try {
      const audio = new Audio(SOUND_URLS.BOMB_PLANTED_VOICE.local);
      audio.volume = 0.95;
      void audio.play().catch(() => {});
    } catch {
      // Ignorar bloqueio de autoplay
    }
  }
}

/**
 * 5. Bip digital real da bomba C4 plantada (com atenuação 3D por distância).
 */
export function playRealC4Beep(
  c4Pos: THREE.Vector3,
  listenerPos: THREE.Vector3,
  remainingSec: number
): void {
  const dist = c4Pos.distanceTo(listenerPos);
  const atten = THREE.MathUtils.clamp(1 / (1 + dist * 0.045), 0.14, 0.95);
  const urgentPitch =
    remainingSec < 5 ? 1.18 : remainingSec < 12 ? 1.08 : 1.0;

  const played = playBufferOneShot('C4_BEEP', atten, urgentPitch, 0, 0);
  if (!played) {
    soundEngine.playMechanicalSwitch(1.65);
  }
}

/**
 * 6. Explosão real da Bomba C4 usando o áudio real de explosão da granada + concussão.
 */
export function playC4DetonationExplosion(
  c4Pos: THREE.Vector3,
  listenerPos: THREE.Vector3
): void {
  soundEngine.playGrenadeExplosion();
  triggerShellshockTinnitus(c4Pos, listenerPos);
}

/**
 * 7. Som real da granada quicando no chão ou parede.
 */
export function playRealGrenadeBounce(intensity = 1.0): boolean {
  const gain = THREE.MathUtils.clamp(intensity * 0.85, 0.15, 0.95);
  const pitch = 0.94 + Math.random() * 0.14;
  return playBufferOneShot('GRENADE_BOUNCE', gain, pitch, 0, 0);
}

/**
 * 8. Respiração ofegante realista do personagem durante e logo após correr (SPRINT).
 */
export function updatePlayerSprintPantingAudio(
  isSprinting: boolean,
  horizSpeed: number,
  isAlive: boolean,
  dt: number
): void {
  preloadCharacterAndBombAudio();
  const state = soundEngine.getSpatialAudioState();

  if (!isAlive || state.muted || !state.ctx) {
    sprintFatigue = 0;
    if (activePantingSource) {
      try {
        activePantingSource.stop();
      } catch {
        // Ignorar se já parado
      }
      activePantingSource = null;
      activePantingGain = null;
    }
    return;
  }

  const activelyRunning = isSprinting && horizSpeed > 3.4;
  if (activelyRunning) {
    // Acumula fadiga após ~1.5s de corrida contínua
    sprintFatigue = Math.min(1.0, sprintFatigue + dt * 0.38);
  } else {
    // Recupera o fôlego gradualmente após parar de correr (efeito "panting after run")
    sprintFatigue = Math.max(0.0, sprintFatigue - dt * 0.24);
  }

  const ctx = state.ctx;
  if (sprintFatigue > 0.22) {
    const targetGain = THREE.MathUtils.lerp(0.06, 0.44, (sprintFatigue - 0.22) / 0.78);
    if (!activePantingSource) {
      const buf = ensureDecodedBuffer('SPRINT_PANTING');
      if (buf) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.01, ctx.currentTime);
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start(ctx.currentTime);
        src.onended = () => {
          if (activePantingSource === src) {
            activePantingSource = null;
            activePantingGain = null;
          }
        };
        activePantingSource = src;
        activePantingGain = gain;
      }
    }
    if (activePantingGain) {
      activePantingGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.12);
    }
  } else if (activePantingSource && activePantingGain) {
    activePantingGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
    if (sprintFatigue <= 0.02) {
      try {
        activePantingSource.stop();
      } catch {
        // Ignorar
      }
      activePantingSource = null;
      activePantingGain = null;
    }
  }
}

const MATCH_VICTORY_LOCAL = '/sounds/match_victory_fanfare.mp3';
const MATCH_VICTORY_GITHUB =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/2114b7f72a1293400bf8f5fd4c70e85dd73e74ea/Sound/Victory%20fanfare%20sound%20effect%20(4).mp3';
const MATCH_DEFEAT_LOCAL = '/sounds/match_defeat_fanfare.mp3';
const MATCH_DEFEAT_GITHUB =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/2114b7f72a1293400bf8f5fd4c70e85dd73e74ea/Sound/Victory%20fanfare%20sound%20effect%20(3).mp3';

let activeMatchFanfareAudio: HTMLAudioElement | null = null;

/**
 * 9. Toca a música tema oficial de Fim de Partida:
 * - Vitória do time Vanguard: Victory fanfare sound effect (4).mp3
 * - Derrota do time Vanguard: Victory fanfare sound effect (3).mp3
 */
export function playMatchEndFanfare(isVanguardVictory: boolean): void {
  stopMatchEndFanfare();
  const state = soundEngine.getSpatialAudioState();
  if (state.muted) return;

  const primaryUrl = isVanguardVictory ? MATCH_VICTORY_LOCAL : MATCH_DEFEAT_LOCAL;
  const fallbackUrl = isVanguardVictory ? MATCH_VICTORY_GITHUB : MATCH_DEFEAT_GITHUB;

  try {
    const audio = new Audio(primaryUrl);
    audio.volume = 0.85;
    audio.onerror = () => {
      if (audio.src !== fallbackUrl) {
        audio.src = fallbackUrl;
        void audio.play().catch(() => {});
      }
    };
    activeMatchFanfareAudio = audio;
    void audio.play().catch(() => {});
  } catch {
    // Ignorar se bloqueado pelo navegador
  }
}

export function stopMatchEndFanfare(): void {
  if (activeMatchFanfareAudio) {
    try {
      activeMatchFanfareAudio.pause();
      activeMatchFanfareAudio.currentTime = 0;
    } catch {
      // Ignorar
    }
    activeMatchFanfareAudio = null;
  }
}

