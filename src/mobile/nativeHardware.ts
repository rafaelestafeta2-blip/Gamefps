// Mobile Native Hardware Layer: Haptics, Gyroscope Sensor Fusion & Fullscreen Immersive Landscape Lock

type DeviceOrientationEventCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied' | string>;
};

export class MobileHardwareManager {
  public hapticsEnabled = true;
  private gyroActive = false;
  private lastBeta: number | null = null;
  private lastGamma: number | null = null;
  private filteredDx = 0;
  private filteredDy = 0;
  private onGyroDeltaCallback: ((dx: number, dy: number) => void) | null = null;
  private orientationHandler: ((ev: DeviceOrientationEvent) => void) | null = null;
  private capacitorHaptics: { impact: (opts: { style: string }) => Promise<void> } | null =
    null;
  private capacitorTried = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const enforceImmersiveOnGesture = () => {
        if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
          void this.enterFullscreenLandscape();
        }
      };
      window.addEventListener('touchend', enforceImmersiveOnGesture, { passive: true });
      window.addEventListener('click', enforceImmersiveOnGesture, { passive: true });
    }
  }

  private async ensureCapacitorHaptics(): Promise<void> {
    if (this.capacitorTried) return;
    this.capacitorTried = true;
    try {
      // Prefer Capacitor plugin registry when the native shell exposes Haptics.
      const cap = (window as any)?.Capacitor;
      const plugins = cap?.Plugins;
      if (plugins?.Haptics?.impact) {
        this.capacitorHaptics = plugins.Haptics;
        return;
      }
    } catch {
      this.capacitorHaptics = null;
    }
  }

  // =========================================================================
  // 1. TACTICAL HAPTIC FEEDBACK (CAPACITOR HAPTICS → navigator.vibrate)
  // =========================================================================
  private triggerVibrate(pattern: number | number[]): void {
    if (!this.hapticsEnabled) return;
    void this.ensureCapacitorHaptics().then(() => {
      try {
        if (this.capacitorHaptics && typeof pattern === 'number') {
          const style = pattern >= 28 ? 'HEAVY' : pattern >= 16 ? 'MEDIUM' : 'LIGHT';
          void this.capacitorHaptics.impact({ style });
          return;
        }
      } catch {
        // fall through to vibrate
      }
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          navigator.vibrate(pattern);
        }
      } catch {
        // Ignore if device or browser blocks vibration
      }
    });
  }

  public vibrateGunshot(
    suppressed: boolean,
    boltLockedBack: boolean,
    weaponHapticMs?: number
  ): void {
    if (boltLockedBack) {
      this.triggerVibrate([20, 25, 38]);
    } else if (suppressed) {
      this.triggerVibrate(Math.max(8, Math.round((weaponHapticMs || 16) * 0.55)));
    } else {
      this.triggerVibrate(weaponHapticMs || 19);
    }
  }

  public vibrateReloadStage(
    stage: 'MAG_OUT' | 'MAG_DROP_FLOOR' | 'MAG_IN' | 'BOLT_SLAP' | 'CHARGING_HANDLE'
  ): void {
    switch (stage) {
      case 'MAG_OUT':
        this.triggerVibrate(14);
        break;
      case 'MAG_DROP_FLOOR':
        this.triggerVibrate(26);
        break;
      case 'MAG_IN':
        this.triggerVibrate([12, 35, 28]);
        break;
      case 'BOLT_SLAP':
        this.triggerVibrate(34);
        break;
      case 'CHARGING_HANDLE':
        this.triggerVibrate([18, 45, 30]);
        break;
    }
  }

  public vibrateHitConfirm(isHeadshot: boolean): void {
    if (isHeadshot) {
      this.triggerVibrate([22, 28, 26]);
    } else {
      this.triggerVibrate(10);
    }
  }

  public vibrateKnifeSlash(): void {
    this.triggerVibrate(12);
  }

  public vibrateKnifeHit(): void {
    this.triggerVibrate([28, 30, 42]);
  }

  public vibrateDamage(): void {
    this.triggerVibrate([50, 35, 65]);
  }

  public vibratePinPull(): void {
    this.triggerVibrate([20, 30, 35]);
  }

  public vibrateExplosion(intensity = 1.0): void {
    const scale = Math.max(0.35, Math.min(1.0, intensity));
    const p1 = Math.round(180 * scale);
    const p2 = Math.round(260 * scale);
    const p3 = Math.round(150 * scale);
    const p4 = Math.round(95 * scale);
    this.triggerVibrate([p1, 35, p2, 40, p3, 35, p4]);
  }

  public vibrateHeartbeat(): void {
    this.triggerVibrate([28, 90, 22]);
  }

  // =========================================================================
  // 2. GYROSCOPE / DEVICE ORIENTATION (landscape aim)
  // =========================================================================
  public async enableGyroscope(
    onDelta: (dx: number, dy: number) => void
  ): Promise<boolean> {
    this.disableGyroscope();
    if (typeof window === 'undefined') return false;

    this.onGyroDeltaCallback = onDelta;

    const DOE = window.DeviceOrientationEvent as DeviceOrientationEventCtor | undefined;
    try {
      if (DOE && typeof DOE.requestPermission === 'function') {
        const perm = await DOE.requestPermission();
        if (perm !== 'granted') return false;
      }
    } catch {
      // Android / older browsers: no permission API
    }

    this.orientationHandler = (ev: DeviceOrientationEvent) => {
      if (!this.gyroActive || !this.onGyroDeltaCallback) return;
      // Landscape: gamma ≈ pitch tilt, beta ≈ roll/yaw contribution
      const beta = ev.beta;
      const gamma = ev.gamma;
      if (beta == null || gamma == null) return;

      if (this.lastBeta == null || this.lastGamma == null) {
        this.lastBeta = beta;
        this.lastGamma = gamma;
        return;
      }

      let dBeta = beta - this.lastBeta;
      let dGamma = gamma - this.lastGamma;
      this.lastBeta = beta;
      this.lastGamma = gamma;

      // Ignore huge jumps (orientation flips)
      if (Math.abs(dBeta) > 25 || Math.abs(dGamma) > 25) return;

      // Map to look deltas (tuned for landscape FPS)
      const rawDx = dBeta * 2.4;
      const rawDy = -dGamma * 2.1;
      this.filteredDx = this.filteredDx * 0.55 + rawDx * 0.45;
      this.filteredDy = this.filteredDy * 0.55 + rawDy * 0.45;

      if (Math.abs(this.filteredDx) < 0.02 && Math.abs(this.filteredDy) < 0.02) return;
      this.onGyroDeltaCallback(this.filteredDx, this.filteredDy);
    };

    window.addEventListener('deviceorientation', this.orientationHandler, true);
    this.gyroActive = true;
    return true;
  }

  public disableGyroscope(): void {
    this.gyroActive = false;
    this.lastBeta = null;
    this.lastGamma = null;
    this.filteredDx = 0;
    this.filteredDy = 0;
    if (this.orientationHandler && typeof window !== 'undefined') {
      window.removeEventListener('deviceorientation', this.orientationHandler, true);
    }
    this.orientationHandler = null;
    this.onGyroDeltaCallback = null;
  }

  public recalibrateGyroCenter(): void {
    this.lastBeta = null;
    this.lastGamma = null;
    this.filteredDx = 0;
    this.filteredDy = 0;
  }

  // =========================================================================
  // 3. FULLSCREEN IMMERSIVE MODE (HIDES ANDROID NAVIGATION & STATUS BARS)
  // =========================================================================
  public async enterFullscreenLandscape(): Promise<boolean> {
    try {
      const win = window as any;
      if (win.AndroidFullScreen && typeof win.AndroidFullScreen.immersiveMode === 'function') {
        win.AndroidFullScreen.immersiveMode();
      }

      const docEl = document.documentElement as any;
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen({ navigationUI: 'hide' }).catch(() => {
            return docEl.requestFullscreen().catch(() => {});
          });
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen().catch(() => {});
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen().catch(() => {});
        }
      }
      const scrOrientation = screen.orientation as unknown as {
        lock?: (orientation: string) => Promise<void>;
      };
      if (scrOrientation && typeof scrOrientation.lock === 'function') {
        await scrOrientation.lock('landscape').catch(() => {
          return scrOrientation.lock?.('landscape-primary').catch(() => {});
        });
      }
      return true;
    } catch {
      return Boolean(document.fullscreenElement);
    }
  }

  public async toggleFullscreenLandscape(): Promise<boolean> {
    try {
      if (!document.fullscreenElement) {
        return await this.enterFullscreenLandscape();
      }
      if (document.exitFullscreen) {
        await document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen().catch(() => {});
      }
      return false;
    } catch {
      return Boolean(document.fullscreenElement);
    }
  }
}

export const mobileHardware = new MobileHardwareManager();
