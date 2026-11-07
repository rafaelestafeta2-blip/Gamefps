// Hybrid Real Sample (.WAV) + Procedural Web Audio API Tactical Sound Engine
import { WeaponId } from '../types/game';

export const DESERT_EAGLE_WAV_LOCAL_URL =
  '/sounds/151071__vabadus__desert-eagle.wav';
export const DESERT_EAGLE_WAV_GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/cfd1dfbb4fb8491525a8438785550286b18bc42b/151071__vabadus__desert-eagle.wav';

export const PISTOL_RELOAD_WAV_LOCAL_URL =
  '/sounds/pistol_full_reload.wav';
export const PISTOL_RELOAD_WAV_GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/df0ed9964c37efbafe382d8f48fa93cdd3789ac3/370251__evanboyerman__full-reload-of-a-pistol-mixed.wav';

export const M4A1_RELOAD_LOCAL_URL =
  '/sounds/m4a1_reload.mp3';
export const M4A1_RELOAD_GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/7784d4846216684d62b7ee9d608f16decff29ee8/276964__gfl7__m4a1-or-m16-reload-sound.mp3';

export const M4A1_SHOT_WAV_LOCAL_URL =
  '/sounds/m4a1_shot.wav';
export const M4A1_SHOT_WAV_GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/02108defabf18df9a79b33638bbee54f344eedff/assault-rifle-shot-1.wav';

export const MENU_MUSIC_LOCAL_URL =
  '/sounds/menu_theme.m4a';
export const MENU_MUSIC_GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/rafaelestafeta2-blip/Gamesfps/956355e99d304990fce90aa7bdbc7e704314f130/videoplayback.m4a';

class TacticalSoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private desertEagleRawData: ArrayBuffer | null = null;
  private desertEagleBuffer: AudioBuffer | null = null;
  private desertEagleDecoding = false;
  private htmlAudioPool: HTMLAudioElement[] = [];
  private htmlAudioPoolIdx = 0;

  // Real Pistol Reload Audio Sample
  private pistolReloadRawData: ArrayBuffer | null = null;
  private pistolReloadBuffer: AudioBuffer | null = null;
  private pistolReloadDecoding = false;
  private pistolReloadAudioPool: HTMLAudioElement[] = [];
  private pistolReloadPoolIdx = 0;

  // Real M4A1 Reload Audio Sample
  private m4a1ReloadRawData: ArrayBuffer | null = null;
  private m4a1ReloadBuffer: AudioBuffer | null = null;
  private m4a1ReloadDecoding = false;
  private m4a1ReloadAudioPool: HTMLAudioElement[] = [];
  private m4a1ReloadPoolIdx = 0;

  // Real M4A1 Shot Audio Sample
  private m4a1ShotRawData: ArrayBuffer | null = null;
  private m4a1ShotBuffer: AudioBuffer | null = null;
  private m4a1ShotDecoding = false;
  private m4a1ShotAudioPool: HTMLAudioElement[] = [];
  private m4a1ShotPoolIdx = 0;

  // Main Menu Background Music
  private menuMusicAudio: HTMLAudioElement | null = null;
  private isMenuMusicPlaying = false;

  private _muted: boolean = false;

  public get muted(): boolean {
    return this._muted;
  }

  public set muted(val: boolean) {
    this._muted = val;
    if (val && this.menuMusicAudio) {
      this.menuMusicAudio.pause();
    } else if (!val && this.isMenuMusicPlaying) {
      this.playMenuMusic();
    }
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.preloadDesertEagleSample();
      this.preloadPistolReloadSample();
      this.preloadM4a1ReloadSample();
      this.preloadM4a1ShotSample();
    }
  }

  private preloadM4a1ShotSample(): void {
    for (let i = 0; i < 4; i++) {
      const audio = new Audio(M4A1_SHOT_WAV_LOCAL_URL);
      audio.preload = 'auto';
      audio.onerror = () => {
        audio.src = M4A1_SHOT_WAV_GITHUB_RAW_URL;
      };
      this.m4a1ShotAudioPool.push(audio);
    }

    fetch(M4A1_SHOT_WAV_LOCAL_URL)
      .then((res) => {
        if (!res.ok) throw new Error('Local M4A1 shot WAV fetch failed');
        return res.arrayBuffer();
      })
      .catch(() =>
        fetch(M4A1_SHOT_WAV_GITHUB_RAW_URL).then((res) => res.arrayBuffer())
      )
      .then((buf) => {
        this.m4a1ShotRawData = buf;
        if (this.ctx) {
          this.tryDecodeM4a1Shot(this.ctx);
        }
      })
      .catch(() => {});
  }

  private tryDecodeM4a1Shot(ctx: AudioContext): void {
    if (
      this.m4a1ShotBuffer ||
      this.m4a1ShotDecoding ||
      !this.m4a1ShotRawData
    ) {
      return;
    }
    this.m4a1ShotDecoding = true;
    const copy = this.m4a1ShotRawData.slice(0);
    ctx
      .decodeAudioData(copy)
      .then((decoded) => {
        this.m4a1ShotBuffer = decoded;
        this.m4a1ShotDecoding = false;
      })
      .catch(() => {
        this.m4a1ShotDecoding = false;
      });
  }

  private preloadM4a1ReloadSample(): void {
    for (let i = 0; i < 3; i++) {
      const audio = new Audio(M4A1_RELOAD_LOCAL_URL);
      audio.preload = 'auto';
      audio.onerror = () => {
        audio.src = M4A1_RELOAD_GITHUB_RAW_URL;
      };
      this.m4a1ReloadAudioPool.push(audio);
    }

    fetch(M4A1_RELOAD_LOCAL_URL)
      .then((res) => {
        if (!res.ok) throw new Error('Local M4A1 reload MP3 fetch failed');
        return res.arrayBuffer();
      })
      .catch(() =>
        fetch(M4A1_RELOAD_GITHUB_RAW_URL).then((res) => res.arrayBuffer())
      )
      .then((buf) => {
        this.m4a1ReloadRawData = buf;
        if (this.ctx) {
          this.tryDecodeM4a1Reload(this.ctx);
        }
      })
      .catch(() => {});
  }

  private tryDecodeM4a1Reload(ctx: AudioContext): void {
    if (
      this.m4a1ReloadBuffer ||
      this.m4a1ReloadDecoding ||
      !this.m4a1ReloadRawData
    ) {
      return;
    }
    this.m4a1ReloadDecoding = true;
    const copy = this.m4a1ReloadRawData.slice(0);
    ctx
      .decodeAudioData(copy)
      .then((decoded) => {
        this.m4a1ReloadBuffer = decoded;
        this.m4a1ReloadDecoding = false;
      })
      .catch(() => {
        this.m4a1ReloadDecoding = false;
      });
  }

  private preloadPistolReloadSample(): void {
    for (let i = 0; i < 3; i++) {
      const audio = new Audio(PISTOL_RELOAD_WAV_LOCAL_URL);
      audio.preload = 'auto';
      audio.onerror = () => {
        audio.src = PISTOL_RELOAD_WAV_GITHUB_RAW_URL;
      };
      this.pistolReloadAudioPool.push(audio);
    }

    fetch(PISTOL_RELOAD_WAV_LOCAL_URL)
      .then((res) => {
        if (!res.ok) throw new Error('Local pistol reload WAV fetch failed');
        return res.arrayBuffer();
      })
      .catch(() =>
        fetch(PISTOL_RELOAD_WAV_GITHUB_RAW_URL).then((res) => res.arrayBuffer())
      )
      .then((buf) => {
        this.pistolReloadRawData = buf;
        if (this.ctx) {
          this.tryDecodePistolReload(this.ctx);
        }
      })
      .catch(() => {});
  }

  private tryDecodePistolReload(ctx: AudioContext): void {
    if (
      this.pistolReloadBuffer ||
      this.pistolReloadDecoding ||
      !this.pistolReloadRawData
    ) {
      return;
    }
    this.pistolReloadDecoding = true;
    const copy = this.pistolReloadRawData.slice(0);
    ctx
      .decodeAudioData(copy)
      .then((decoded) => {
        this.pistolReloadBuffer = decoded;
        this.pistolReloadDecoding = false;
      })
      .catch(() => {
        this.pistolReloadDecoding = false;
      });
  }

  private preloadDesertEagleSample(): void {
    // Create a small HTMLAudioElement pool for instant zero-latency fallback
    for (let i = 0; i < 4; i++) {
      const audio = new Audio(DESERT_EAGLE_WAV_LOCAL_URL);
      audio.preload = 'auto';
      audio.onerror = () => {
        audio.src = DESERT_EAGLE_WAV_GITHUB_RAW_URL;
      };
      this.htmlAudioPool.push(audio);
    }

    // Fetch raw WAV bytes for Web Audio API AudioBuffer decoding
    fetch(DESERT_EAGLE_WAV_LOCAL_URL)
      .then((res) => {
        if (!res.ok) throw new Error('Local WAV fetch failed');
        return res.arrayBuffer();
      })
      .catch(() =>
        fetch(DESERT_EAGLE_WAV_GITHUB_RAW_URL).then((res) => res.arrayBuffer())
      )
      .then((buf) => {
        this.desertEagleRawData = buf;
        if (this.ctx) {
          this.tryDecodeDesertEagle(this.ctx);
        }
      })
      .catch(() => {});
  }

  private tryDecodeDesertEagle(ctx: AudioContext): void {
    if (
      this.desertEagleBuffer ||
      this.desertEagleDecoding ||
      !this.desertEagleRawData
    ) {
      return;
    }
    this.desertEagleDecoding = true;
    // Clone ArrayBuffer before decoding in case decodeAudioData detaches it
    const copy = this.desertEagleRawData.slice(0);
    ctx
      .decodeAudioData(copy)
      .then((decoded) => {
        this.desertEagleBuffer = decoded;
        this.desertEagleDecoding = false;
      })
      .catch(() => {
        this.desertEagleDecoding = false;
      });
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.desertEagleBuffer && this.desertEagleRawData) {
      this.tryDecodeDesertEagle(this.ctx);
    }
    if (this.ctx && !this.pistolReloadBuffer && this.pistolReloadRawData) {
      this.tryDecodePistolReload(this.ctx);
    }
    if (this.ctx && !this.m4a1ReloadBuffer && this.m4a1ReloadRawData) {
      this.tryDecodeM4a1Reload(this.ctx);
    }
    if (this.ctx && !this.m4a1ShotBuffer && this.m4a1ShotRawData) {
      this.tryDecodeM4a1Shot(this.ctx);
    }
    if (!this.noiseBuffer && this.ctx) {
      const length = this.ctx.sampleRate * 1.5;
      this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return this.ctx;
  }

  public playGunshot(
    suppressed: boolean,
    boltLockedBackAfterShot: boolean,
    weaponId: WeaponId = 'P50_PISTOL'
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;

    // 1. REAL DESERT EAGLE (.50 AE) WAV SAMPLE FOR P50 HEAVY PISTOL
    if (weaponId === 'P50_PISTOL') {
      if (this.desertEagleBuffer) {
        const src = ctx.createBufferSource();
        src.buffer = this.desertEagleBuffer;
        // Subtle organic pitch variation per shot
        src.playbackRate.setValueAtTime(0.985 + Math.random() * 0.03, now);

        const gain = ctx.createGain();
        if (suppressed) {
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(1450, now);
          gain.gain.setValueAtTime(0.58, now);
          src.connect(lp);
          lp.connect(gain);
        } else {
          gain.gain.setValueAtTime(1.0, now);
          src.connect(gain);
        }
        gain.connect(ctx.destination);
        src.start(now);
      } else if (this.htmlAudioPool.length > 0) {
        const el = this.htmlAudioPool[this.htmlAudioPoolIdx];
        this.htmlAudioPoolIdx =
          (this.htmlAudioPoolIdx + 1) % this.htmlAudioPool.length;
        el.currentTime = 0;
        el.volume = suppressed ? 0.55 : 1.0;
        el.play().catch(() => {});
      }

      if (boltLockedBackAfterShot) {
        const mechOsc = ctx.createOscillator();
        const mechGain = ctx.createGain();
        mechOsc.type = 'square';
        mechOsc.frequency.setValueAtTime(2450, now + 0.04);
        mechOsc.frequency.exponentialRampToValueAtTime(1780, now + 0.15);
        mechGain.gain.setValueAtTime(0.16, now + 0.04);
        mechGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        mechOsc.connect(mechGain);
        mechGain.connect(ctx.destination);
        mechOsc.start(now + 0.04);
        mechOsc.stop(now + 0.17);
      }
      return;
    }

    // 2. REAL M4A1 5.56MM ASSAULT RIFLE WAV SAMPLE FOR M4A1 SOPMOD & CARABINA TÁTICA
    if (weaponId === 'M4_CARBINE' || weaponId === 'CARBINE_AR') {
      if (this.m4a1ShotBuffer) {
        const src = ctx.createBufferSource();
        src.buffer = this.m4a1ShotBuffer;
        // Subtle organic pitch variation per shot
        src.playbackRate.setValueAtTime(0.98 + Math.random() * 0.04, now);

        const gain = ctx.createGain();
        if (suppressed) {
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(1250, now);
          gain.gain.setValueAtTime(0.55, now);
          src.connect(lp);
          lp.connect(gain);
        } else {
          gain.gain.setValueAtTime(0.95, now);
          src.connect(gain);
        }
        gain.connect(ctx.destination);
        src.start(now);
      } else if (this.m4a1ShotAudioPool.length > 0) {
        const el = this.m4a1ShotAudioPool[this.m4a1ShotPoolIdx];
        this.m4a1ShotPoolIdx =
          (this.m4a1ShotPoolIdx + 1) % this.m4a1ShotAudioPool.length;
        el.currentTime = 0;
        el.volume = suppressed ? 0.55 : 0.95;
        el.play().catch(() => {});
      }

      if (boltLockedBackAfterShot) {
        const mechOsc = ctx.createOscillator();
        const mechGain = ctx.createGain();
        mechOsc.type = 'square';
        mechOsc.frequency.setValueAtTime(2200, now + 0.04);
        mechOsc.frequency.exponentialRampToValueAtTime(1500, now + 0.15);
        mechGain.gain.setValueAtTime(0.12, now + 0.04);
        mechGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        mechOsc.connect(mechGain);
        mechGain.connect(ctx.destination);
        mechOsc.start(now + 0.04);
        mechOsc.stop(now + 0.16);
      }
      return;
    }

    // 2. 5.56MM NATO PROCEDURAL SYNTHESIS FOR L49 LMG & M4A1 CARBINE
    if (suppressed) {
      // Suppressed 5.56mm: High-pressure baffle hiss + tight low thud + loud bolt carrier clack
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1650, now);
      filter.frequency.exponentialRampToValueAtTime(420, now + 0.085);
      filter.Q.value = 1.4;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.1);

      // Sub baffle punch
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(170, now);
      subOsc.frequency.exponentialRampToValueAtTime(42, now + 0.06);
      subGain.gain.setValueAtTime(0.5, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.07);
    } else {
      // Unsuppressed 5.56mm NATO: Muzzle blast transient + chest thump + indoor killhouse reflection tail
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(195, now);
      subOsc.frequency.exponentialRampToValueAtTime(36, now + 0.09);
      subGain.gain.setValueAtTime(0.85, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.11);

      // Supersonic crack & blast noise
      const blast = ctx.createBufferSource();
      blast.buffer = this.noiseBuffer;

      const blastFilter = ctx.createBiquadFilter();
      blastFilter.type = 'lowpass';
      blastFilter.frequency.setValueAtTime(5200, now);
      blastFilter.frequency.exponentialRampToValueAtTime(340, now + 0.28);

      const blastGain = ctx.createGain();
      blastGain.gain.setValueAtTime(0.9, now);
      blastGain.gain.exponentialRampToValueAtTime(0.14, now + 0.05);
      blastGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      blast.connect(blastFilter);
      blastFilter.connect(blastGain);
      blastGain.connect(ctx.destination);
      blast.start(now);
      blast.stop(now + 0.38);
    }

    // Mechanical Bolt Carrier Reciprocation Clack (or Ping if locked back on empty)
    const mechOsc = ctx.createOscillator();
    const mechGain = ctx.createGain();
    mechOsc.type = 'square';
    if (boltLockedBackAfterShot) {
      // Distinct metallic bolt-lock ping
      mechOsc.frequency.setValueAtTime(2450, now + 0.03);
      mechOsc.frequency.exponentialRampToValueAtTime(1780, now + 0.14);
      mechGain.gain.setValueAtTime(0.18, now + 0.03);
      mechGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      mechOsc.connect(mechGain);
      mechGain.connect(ctx.destination);
      mechOsc.start(now + 0.03);
      mechOsc.stop(now + 0.16);
    } else {
      mechOsc.frequency.setValueAtTime(1450, now + 0.025);
      mechOsc.frequency.exponentialRampToValueAtTime(620, now + 0.065);
      mechGain.gain.setValueAtTime(0.14, now + 0.025);
      mechGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      mechOsc.connect(mechGain);
      mechGain.connect(ctx.destination);
      mechOsc.start(now + 0.025);
      mechOsc.stop(now + 0.075);
    }
  }

  public playShellBounce(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const offsets = [0, 0.11, 0.2];
    offsets.forEach((delay, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const baseFreq = 3950 + (idx % 2) * 420 + Math.random() * 180;
      osc.frequency.setValueAtTime(baseFreq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.92, now + delay + 0.035);
      const amp = 0.055 * Math.pow(0.55, idx);
      gain.gain.setValueAtTime(amp, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + delay + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.045);
    });
  }

  public playDryFire(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1900, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.025);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  public playMechanicalSwitch(pitchMultiplier = 1.0): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600 * pitchMultiplier, now);
    osc.frequency.exponentialRampToValueAtTime(750 * pitchMultiplier, now + 0.022);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  public playPistolFullReload(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();

    if (ctx && this.pistolReloadBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = this.pistolReloadBuffer;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.95, ctx.currentTime);
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start();
      return;
    }

    // Zero-latency HTMLAudioElement fallback
    if (this.pistolReloadAudioPool.length > 0) {
      const el = this.pistolReloadAudioPool[this.pistolReloadPoolIdx];
      this.pistolReloadPoolIdx =
        (this.pistolReloadPoolIdx + 1) % this.pistolReloadAudioPool.length;
      el.currentTime = 0;
      el.volume = 0.95;
      el.play().catch(() => {});
    }
  }

  public playM4a1FullReload(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();

    if (ctx && this.m4a1ReloadBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = this.m4a1ReloadBuffer;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.98, ctx.currentTime);
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start();
      return;
    }

    // Zero-latency HTMLAudioElement fallback
    if (this.m4a1ReloadAudioPool.length > 0) {
      const el = this.m4a1ReloadAudioPool[this.m4a1ReloadPoolIdx];
      this.m4a1ReloadPoolIdx =
        (this.m4a1ReloadPoolIdx + 1) % this.m4a1ReloadAudioPool.length;
      el.currentTime = 0;
      el.volume = 0.98;
      el.play().catch(() => {});
    }
  }

  public playReloadStage(stage: 'MAG_OUT' | 'MAG_DROP_FLOOR' | 'MAG_IN' | 'BOLT_SLAP' | 'CHARGING_HANDLE'): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    if (stage === 'MAG_OUT') {
      // Mag catch button click + polymer slide friction
      this.playMechanicalSwitch(0.95);
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, now + 0.04);
      filter.Q.value = 3.0;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.14, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now + 0.04);
      noise.stop(now + 0.2);
    } else if (stage === 'MAG_DROP_FLOOR') {
      // Heavy polymer magazine hitting concrete
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(85, now + 0.07);
      gain.gain.setValueAtTime(0.26, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (stage === 'MAG_IN') {
      // Magazine seating thump + positive metallic latch click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.06);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);

      // Lock click
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'square';
      clickOsc.frequency.setValueAtTime(1850, now + 0.055);
      clickOsc.frequency.exponentialRampToValueAtTime(920, now + 0.09);
      clickGain.gain.setValueAtTime(0.2, now + 0.055);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickOsc.start(now + 0.055);
      clickOsc.stop(now + 0.1);
    } else if (stage === 'BOLT_SLAP') {
      // Crisp metallic bolt carrier slam forward
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1450, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.08);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (stage === 'CHARGING_HANDLE') {
      // Two-part metallic rack: pull back + release slam
      const pullOsc = ctx.createOscillator();
      const pullGain = ctx.createGain();
      pullOsc.type = 'sawtooth';
      pullOsc.frequency.setValueAtTime(680, now);
      pullOsc.frequency.linearRampToValueAtTime(1320, now + 0.11);
      pullGain.gain.setValueAtTime(0.22, now);
      pullGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      pullOsc.connect(pullGain);
      pullGain.connect(ctx.destination);
      pullOsc.start(now);
      pullOsc.stop(now + 0.13);

      const slamOsc = ctx.createOscillator();
      const slamGain = ctx.createGain();
      slamOsc.type = 'sawtooth';
      slamOsc.frequency.setValueAtTime(1580, now + 0.16);
      slamOsc.frequency.exponentialRampToValueAtTime(380, now + 0.25);
      slamGain.gain.setValueAtTime(0.32, now + 0.16);
      slamGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      slamOsc.connect(slamGain);
      slamGain.connect(ctx.destination);
      slamOsc.start(now + 0.16);
      slamOsc.stop(now + 0.27);
    }
  }

  public playBoltActionCycle(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Bolt Handle Up & Pull Back (at t = 0.28s)
    const unlockOsc = ctx.createOscillator();
    const unlockGain = ctx.createGain();
    unlockOsc.type = 'sawtooth';
    unlockOsc.frequency.setValueAtTime(880, now + 0.28);
    unlockOsc.frequency.linearRampToValueAtTime(1420, now + 0.42);
    unlockGain.gain.setValueAtTime(0.24, now + 0.28);
    unlockGain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
    unlockOsc.connect(unlockGain);
    unlockGain.connect(ctx.destination);
    unlockOsc.start(now + 0.28);
    unlockOsc.stop(now + 0.46);

    // 2. Brass ejection metallic ping (at t = 0.48s)
    const ejectOsc = ctx.createOscillator();
    const ejectGain = ctx.createGain();
    ejectOsc.type = 'triangle';
    ejectOsc.frequency.setValueAtTime(2200, now + 0.48);
    ejectOsc.frequency.exponentialRampToValueAtTime(1200, now + 0.58);
    ejectGain.gain.setValueAtTime(0.18, now + 0.48);
    ejectGain.gain.exponentialRampToValueAtTime(0.001, now + 0.59);
    ejectOsc.connect(ejectGain);
    ejectGain.connect(ctx.destination);
    ejectOsc.start(now + 0.48);
    ejectOsc.stop(now + 0.6);

    // 3. Bolt Push Forward & Chamber New Round (at t = 0.85s)
    const chamberOsc = ctx.createOscillator();
    const chamberGain = ctx.createGain();
    chamberOsc.type = 'sawtooth';
    chamberOsc.frequency.setValueAtTime(1380, now + 0.85);
    chamberOsc.frequency.exponentialRampToValueAtTime(420, now + 0.98);
    chamberGain.gain.setValueAtTime(0.28, now + 0.85);
    chamberGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    chamberOsc.connect(chamberGain);
    chamberGain.connect(ctx.destination);
    chamberOsc.start(now + 0.85);
    chamberOsc.stop(now + 1.02);

    // 4. Bolt Handle Down Lock (at t = 1.05s)
    const lockOsc = ctx.createOscillator();
    const lockGain = ctx.createGain();
    lockOsc.type = 'square';
    lockOsc.frequency.setValueAtTime(1920, now + 1.05);
    lockOsc.frequency.exponentialRampToValueAtTime(620, now + 1.15);
    lockGain.gain.setValueAtTime(0.22, now + 1.05);
    lockGain.gain.exponentialRampToValueAtTime(0.001, now + 1.16);
    lockOsc.connect(lockGain);
    lockGain.connect(ctx.destination);
    lockOsc.start(now + 1.05);
    lockOsc.stop(now + 1.18);
  }

  public playImpact(type: 'STEEL_GONG' | 'HEADSHOT' | 'TORSO' | 'ARMOR_BREAK' | 'CONCRETE'): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'STEEL_GONG') {
      // Harmonic AR500 steel gong ring
      const freqs = [1140, 1720, 2680];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.exponentialRampToValueAtTime(f * 0.992, now + 0.55);
        gain.gain.setValueAtTime(0.2 / (i + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.58);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
      });
    } else if (type === 'HEADSHOT') {
      // Crisp tactical helmet/target dink confirm
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2150, now);
      osc.frequency.exponentialRampToValueAtTime(2850, now + 0.08);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
    } else if (type === 'ARMOR_BREAK') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.18);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'TORSO') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.065);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.075);
    } else {
      // Concrete impact thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.05);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    }
  }

  public playEnemyTelegraph(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1320, now + 0.06);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playHeartbeat(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.18].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(i === 0 ? 68 : 56, now + offset);
      osc.frequency.exponentialRampToValueAtTime(32, now + offset + 0.11);
      gain.gain.setValueAtTime(i === 0 ? 0.25 : 0.18, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.13);
    });
  }

  public playIntroTheme(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Sub-bass cinematic impact boom
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(85, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 1.8);
    subGain.gain.setValueAtTime(0.55, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 2.1);

    // 2. High-tech riser shimmer
    const riserOsc = ctx.createOscillator();
    const riserGain = ctx.createGain();
    riserOsc.type = 'sawtooth';
    riserOsc.frequency.setValueAtTime(140, now + 0.3);
    riserOsc.frequency.exponentialRampToValueAtTime(1650, now + 1.4);
    riserGain.gain.setValueAtTime(0.001, now + 0.3);
    riserGain.gain.linearRampToValueAtTime(0.12, now + 1.2);
    riserGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    const riserFilter = ctx.createBiquadFilter();
    riserFilter.type = 'bandpass';
    riserFilter.frequency.setValueAtTime(1200, now);
    riserFilter.Q.value = 4.0;
    riserOsc.connect(riserFilter);
    riserFilter.connect(riserGain);
    riserGain.connect(ctx.destination);
    riserOsc.start(now + 0.3);
    riserOsc.stop(now + 1.55);

    // 3. Heavy Metallic Charging Slam (Logo Lock-In at t = 1.4s)
    const slamOsc = ctx.createOscillator();
    const slamGain = ctx.createGain();
    slamOsc.type = 'sawtooth';
    slamOsc.frequency.setValueAtTime(1850, now + 1.4);
    slamOsc.frequency.exponentialRampToValueAtTime(120, now + 1.58);
    slamGain.gain.setValueAtTime(0.42, now + 1.4);
    slamGain.gain.exponentialRampToValueAtTime(0.001, now + 1.62);
    slamOsc.connect(slamGain);
    slamGain.connect(ctx.destination);
    slamOsc.start(now + 1.4);
    slamOsc.stop(now + 1.65);

    // 4. Golden bell shimmer chime
    [2400, 3600, 4800].forEach((freq, idx) => {
      const bell = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(freq, now + 1.42 + idx * 0.04);
      bellGain.gain.setValueAtTime(0.08 / (idx + 1), now + 1.42 + idx * 0.04);
      bellGain.gain.exponentialRampToValueAtTime(0.0005, now + 2.8);
      bell.connect(bellGain);
      bellGain.connect(ctx.destination);
      bell.start(now + 1.42 + idx * 0.04);
      bell.stop(now + 2.9);
    });
  }

  public playMenuHover(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.setValueAtTime(1500, now + 0.015);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  public playMenuSelect(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.setValueAtTime(980, now + 0.04);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playMenuMusic(): void {
    if (typeof window === 'undefined') return;
    this.isMenuMusicPlaying = true;
    if (this._muted) return;

    if (!this.menuMusicAudio) {
      const audio = new Audio(MENU_MUSIC_LOCAL_URL);
      audio.loop = true;
      audio.volume = 0.5;
      audio.onerror = () => {
        audio.src = MENU_MUSIC_GITHUB_RAW_URL;
      };
      this.menuMusicAudio = audio;
    }

    this.menuMusicAudio.loop = true;
    this.menuMusicAudio.volume = 0.5;

    if (this.menuMusicAudio.paused) {
      this.menuMusicAudio.play().catch(() => {
        const onInteraction = () => {
          if (this.isMenuMusicPlaying && this.menuMusicAudio && !this._muted) {
            this.menuMusicAudio.play().catch(() => {});
          }
          window.removeEventListener('pointerdown', onInteraction);
          window.removeEventListener('keydown', onInteraction);
        };
        window.addEventListener('pointerdown', onInteraction, { once: true });
        window.addEventListener('keydown', onInteraction, { once: true });
      });
    }
  }

  public stopMenuMusic(): void {
    this.isMenuMusicPlaying = false;
    if (this.menuMusicAudio) {
      this.menuMusicAudio.pause();
      this.menuMusicAudio.currentTime = 0;
    }
  }
}

export const soundEngine = new TacticalSoundEngine();
