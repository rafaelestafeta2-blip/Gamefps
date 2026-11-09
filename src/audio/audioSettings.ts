import { GameSettings, loadGameSettings } from '../graphics/graphicsSettings';

// Intercepta e gerencia o áudio sem modificar soundEngine.ts
let masterGainNode: GainNode | null = null;
let dynamicsCompressorNode: DynamicsCompressorNode | null = null;
let activeAudioContext: AudioContext | null = null;

let currentSettings: GameSettings | null = null;
let isAudioInitialized = false;

const requestedVolumes = new WeakMap<HTMLMediaElement, number>();
const seenMediaElements = new Set<HTMLMediaElement>();
let nativeVolumeDescriptor: PropertyDescriptor | undefined;
let nativeLoopDescriptor: PropertyDescriptor | undefined;

function getWebAudioMasterGainValue(settings: GameSettings | null): number {
  const master = (settings?.volumeMaster ?? 100) / 100;
  const effects = (settings?.volumeEffects ?? 100) / 100;
  return Math.max(0, Math.min(1, master * effects));
}

function applyScaledVolumeToElement(
  el: HTMLMediaElement,
  settings: GameSettings | null
): void {
  if (!nativeVolumeDescriptor?.set) return;
  const requested = requestedVolumes.has(el)
    ? requestedVolumes.get(el)!
    : nativeVolumeDescriptor.get
      ? Number(nativeVolumeDescriptor.get.call(el))
      : 1;

  if (!requestedVolumes.has(el)) {
    requestedVolumes.set(el, requested);
  }

  const master = (settings?.volumeMaster ?? 100) / 100;
  const isMusic = Boolean(el.loop || el.dataset?.role === 'music');
  const categoryScale = isMusic
    ? (settings?.volumeMusic ?? 80) / 100
    : (settings?.volumeEffects ?? 100) / 100;

  const finalVolume = Math.max(0, Math.min(1, requested * master * categoryScale));
  nativeVolumeDescriptor.set.call(el, finalVolume);
}

function interceptMediaElements(): void {
  if (typeof HTMLMediaElement === 'undefined') return;

  nativeVolumeDescriptor = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype,
    'volume'
  );
  nativeLoopDescriptor = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype,
    'loop'
  );

  if (nativeVolumeDescriptor?.set && nativeVolumeDescriptor?.get) {
    Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
      configurable: true,
      enumerable: true,
      get(this: HTMLMediaElement): number {
        return requestedVolumes.has(this)
          ? requestedVolumes.get(this)!
          : nativeVolumeDescriptor!.get!.call(this);
      },
      set(this: HTMLMediaElement, value: number) {
        const clamped = Math.max(0, Math.min(1, Number(value) || 0));
        requestedVolumes.set(this, clamped);
        seenMediaElements.add(this);
        applyScaledVolumeToElement(this, currentSettings);
      },
    });
  }

  if (nativeLoopDescriptor?.set && nativeLoopDescriptor?.get) {
    Object.defineProperty(HTMLMediaElement.prototype, 'loop', {
      configurable: true,
      enumerable: true,
      get(this: HTMLMediaElement): boolean {
        return nativeLoopDescriptor!.get!.call(this);
      },
      set(this: HTMLMediaElement, value: boolean) {
        nativeLoopDescriptor!.set!.call(this, Boolean(value));
        seenMediaElements.add(this);
        applyScaledVolumeToElement(this, currentSettings);
      },
    });
  }
}

export function initAudioSystem(initialSettings: GameSettings): void {
  currentSettings = initialSettings;
  if (isAudioInitialized || typeof window === 'undefined') return;
  isAudioInitialized = true;

  const NativeAudioContext =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;

  if (NativeAudioContext) {
    class ManagedAudioContext extends NativeAudioContext {
      private localMasterGain: GainNode;
      private localCompressor: DynamicsCompressorNode;

      constructor(options?: AudioContextOptions) {
        const tunedOptions: AudioContextOptions = { ...options };
        const quality = currentSettings?.audioQuality ?? 'HIGH';

        if (quality === 'LOW') {
          tunedOptions.latencyHint = 'balanced';
          tunedOptions.sampleRate = 22050;
        } else if (quality === 'MEDIUM') {
          tunedOptions.latencyHint = 'interactive';
          tunedOptions.sampleRate = 32000;
        } else {
          tunedOptions.latencyHint = 'interactive';
          delete tunedOptions.sampleRate;
        }

        super(tunedOptions);
        activeAudioContext = this;

        const limiterOn = currentSettings?.peakLimiter ?? true;
        this.localCompressor = this.createDynamicsCompressor();
        this.localCompressor.threshold.setValueAtTime(
          limiterOn ? -1.0 : 0.0,
          this.currentTime
        );
        this.localCompressor.knee.setValueAtTime(6.0, this.currentTime);
        this.localCompressor.ratio.setValueAtTime(
          limiterOn ? 12.0 : 1.0,
          this.currentTime
        );
        this.localCompressor.attack.setValueAtTime(0.003, this.currentTime);
        this.localCompressor.release.setValueAtTime(0.15, this.currentTime);

        this.localMasterGain = this.createGain();
        this.localMasterGain.gain.setValueAtTime(
          getWebAudioMasterGainValue(currentSettings),
          this.currentTime
        );

        this.localMasterGain.connect(this.localCompressor);
        this.localCompressor.connect(super.destination);

        masterGainNode = this.localMasterGain;
        dynamicsCompressorNode = this.localCompressor;
      }

      override get destination(): AudioDestinationNode {
        return (
          (this.localMasterGain as unknown as AudioDestinationNode) ||
          super.destination
        );
      }
    }

    window.AudioContext = ManagedAudioContext as unknown as typeof AudioContext;
    if ('webkitAudioContext' in window) {
      (
        window as unknown as { webkitAudioContext: typeof AudioContext }
      ).webkitAudioContext = ManagedAudioContext as unknown as typeof AudioContext;
    }
  }

  interceptMediaElements();
}

export function applyAudioSettings(settings: GameSettings): void {
  currentSettings = settings;

  // Todos os sons Web Audio são efeitos: volumeMaster/100 * volumeEffects/100
  if (masterGainNode && activeAudioContext) {
    const targetGain = getWebAudioMasterGainValue(settings);
    masterGainNode.gain.setTargetAtTime(
      targetGain,
      activeAudioContext.currentTime,
      0.05
    );
  }

  // Atualiza limitador de picos
  if (dynamicsCompressorNode && activeAudioContext) {
    if (settings.peakLimiter) {
      dynamicsCompressorNode.threshold.setTargetAtTime(
        -1.0,
        activeAudioContext.currentTime,
        0.05
      );
      dynamicsCompressorNode.ratio.setTargetAtTime(
        12.0,
        activeAudioContext.currentTime,
        0.05
      );
    } else {
      dynamicsCompressorNode.threshold.setTargetAtTime(
        0.0,
        activeAudioContext.currentTime,
        0.05
      );
      dynamicsCompressorNode.ratio.setTargetAtTime(
        1.0,
        activeAudioContext.currentTime,
        0.05
      );
    }
  }

  // Reaplica escala a todos os HTMLMediaElement vistos (inclusive new Audio())
  seenMediaElements.forEach((el) => {
    applyScaledVolumeToElement(el, settings);
  });
}

// Inicializa imediatamente ao carregar o módulo para interceptar new Audio() antes do soundEngine
if (typeof window !== 'undefined') {
  initAudioSystem(loadGameSettings());
}
