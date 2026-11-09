import { GameSettings } from '../graphics/graphicsSettings';

// Intercepta e gerencia o áudio sem tocar em soundEngine.ts
let masterGainNode: GainNode | null = null;
let dynamicsCompressorNode: DynamicsCompressorNode | null = null;
let activeAudioContext: AudioContext | null = null;

let currentSettings: GameSettings | null = null;
let isAudioInitialized = false;

// Subclasse ou patch de AudioContext
export function initAudioSystem(initialSettings: GameSettings): void {
  if (isAudioInitialized || typeof window === 'undefined') return;
  isAudioInitialized = true;
  currentSettings = initialSettings;

  const NativeAudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!NativeAudioContext) return;

  class ManagedAudioContext extends NativeAudioContext {
    private localMasterGain: GainNode;
    private localCompressor: DynamicsCompressorNode;

    constructor(options?: AudioContextOptions) {
      // Ajusta latência e sampleRate se qualidade for BAIXA (para poupar bateria/RAM em mobile)
      const tunedOptions: AudioContextOptions = { ...options };
      if (currentSettings?.audioQuality === 'LOW') {
        tunedOptions.latencyHint = 'playback';
      } else if (currentSettings?.audioQuality === 'HIGH') {
        tunedOptions.latencyHint = 'interactive';
      }

      super(tunedOptions);
      activeAudioContext = this;

      // Cria nó compressor (limitador de picos)
      this.localCompressor = this.createDynamicsCompressor();
      this.localCompressor.threshold.setValueAtTime(-1.0, this.currentTime);
      this.localCompressor.knee.setValueAtTime(6.0, this.currentTime);
      this.localCompressor.ratio.setValueAtTime(12.0, this.currentTime);
      this.localCompressor.attack.setValueAtTime(0.003, this.currentTime);
      this.localCompressor.release.setValueAtTime(0.15, this.currentTime);

      // Cria nó de ganho master
      this.localMasterGain = this.createGain();
      const masterVol = (currentSettings?.volumeMaster ?? 100) / 100;
      this.localMasterGain.gain.setValueAtTime(masterVol, this.currentTime);

      // Encadeamento: localMasterGain -> localCompressor -> super.destination
      this.localMasterGain.connect(this.localCompressor);
      this.localCompressor.connect(super.destination);

      masterGainNode = this.localMasterGain;
      dynamicsCompressorNode = this.localCompressor;
    }

    // Sobrescreve destination para que nós de som se conectem ao masterGain
    override get destination(): AudioDestinationNode {
      return (this.localMasterGain as unknown as AudioDestinationNode) || super.destination;
    }
  }

  // Substitui no escopo global antes de qualquer inicialização do soundEngine
  window.AudioContext = ManagedAudioContext as unknown as typeof AudioContext;
  if ('webkitAudioContext' in window) {
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext =
      ManagedAudioContext as unknown as typeof AudioContext;
  }

  // Intercepta elementos HTMLMediaElement (músicas/efeitos HTML5)
  interceptMediaElements();
}

function interceptMediaElements(): void {
  if (typeof HTMLMediaElement === 'undefined') return;

  const originalPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args: unknown[]) {
    if (currentSettings) {
      applyVolumeToMediaElement(this, currentSettings);
    }
    return originalPlay.apply(this, args as []);
  };
}

function applyVolumeToMediaElement(el: HTMLMediaElement, settings: GameSettings): void {
  const master = settings.volumeMaster / 100;
  // Elementos em loop geralmente são trilha sonora / música de fundo
  const isMusic = el.loop || el.dataset.role === 'music';
  const specificVol = isMusic ? settings.volumeMusic / 100 : settings.volumeEffects / 100;
  el.volume = Math.max(0, Math.min(1, master * specificVol));
}

export function applyAudioSettings(settings: GameSettings): void {
  currentSettings = settings;

  // Atualiza ganho master no AudioContext ativo
  if (masterGainNode && activeAudioContext) {
    const targetMaster = Math.max(0, Math.min(1, settings.volumeMaster / 100));
    masterGainNode.gain.setTargetAtTime(targetMaster, activeAudioContext.currentTime, 0.05);
  }

  // Habilita ou desabilita compressão de picos
  if (dynamicsCompressorNode && activeAudioContext) {
    if (settings.peakLimiter) {
      dynamicsCompressorNode.threshold.setTargetAtTime(-1.0, activeAudioContext.currentTime, 0.05);
      dynamicsCompressorNode.ratio.setTargetAtTime(12.0, activeAudioContext.currentTime, 0.05);
    } else {
      // Deixa neutro se desabilitado
      dynamicsCompressorNode.threshold.setTargetAtTime(0.0, activeAudioContext.currentTime, 0.05);
      dynamicsCompressorNode.ratio.setTargetAtTime(1.0, activeAudioContext.currentTime, 0.05);
    }
  }

  // Atualiza elementos de áudio existentes no DOM
  if (typeof document !== 'undefined') {
    const audios = document.querySelectorAll('audio, video');
    audios.forEach((media) => {
      if (media instanceof HTMLMediaElement) {
        applyVolumeToMediaElement(media, settings);
      }
    });
  }
}
