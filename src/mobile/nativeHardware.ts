// Mobile Native Hardware Layer: Haptics, Gyroscope Sensor Fusion & Fullscreen Landscape Lock

export class MobileHardwareManager {
  public hapticsEnabled = true;
  private gyroActive = false;
  private lastBeta: number | null = null;
  private lastGamma: number | null = null;
  private filteredDx = 0;
  private filteredDy = 0;
  private onGyroDeltaCallback: ((dx: number, dy: number) => void) | null = null;

  // =========================================================================
  // 1. TACTICAL HAPTIC FEEDBACK (ANDROID NATIVE VIBRATE / CAPACITOR)
  // =========================================================================
  private triggerVibrate(pattern: number | number[]): void {
    if (!this.hapticsEnabled) return;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore if device or browser blocks vibration
    }
  }

  public vibrateGunshot(suppressed: boolean, boltLockedBack: boolean): void {
    if (boltLockedBack) {
      this.triggerVibrate([20, 25, 38]);
    } else if (suppressed) {
      this.triggerVibrate(12);
    } else {
      this.triggerVibrate(19);
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

  public vibrateDamage(): void {
    this.triggerVibrate([50, 35, 65]);
  }

  public vibrateHeartbeat(): void {
    this.triggerVibrate([28, 90, 22]);
  }

  // =========================================================================
  // 2. GYROSCOPE PRECISION AIMING (WITH ANTI-JITTER LOW-PASS FILTER)
  // =========================================================================
  public async enableGyroscope(
    onDelta: (dx: number, dy: number) => void
  ): Promise<boolean> {
    this.onGyroDeltaCallback = onDelta;

    // Request iOS 13+ DeviceOrientation permission if required
    try {
      const DevOrient = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };
      if (DevOrient && typeof DevOrient.requestPermission === 'function') {
        const res = await DevOrient.requestPermission();
        if (res !== 'granted') return false;
      }
    } catch {
      // Non-iOS or already permitted
    }

    if (!this.gyroActive) {
      this.gyroActive = true;
      this.lastBeta = null;
      this.lastGamma = null;
      window.addEventListener('deviceorientation', this.handleDeviceOrientation, {
        passive: true,
      });
    }
    return true;
  }

  public disableGyroscope(): void {
    if (!this.gyroActive) return;
    this.gyroActive = false;
    this.lastBeta = null;
    this.lastGamma = null;
    window.removeEventListener('deviceorientation', this.handleDeviceOrientation);
  }

  public recalibrateGyroCenter(): void {
    this.lastBeta = null;
    this.lastGamma = null;
    this.filteredDx = 0;
    this.filteredDy = 0;
  }

  private handleDeviceOrientation = (e: DeviceOrientationEvent) => {
    if (!this.gyroActive || !this.onGyroDeltaCallback) return;
    if (e.beta === null || e.gamma === null) return;

    if (this.lastBeta === null || this.lastGamma === null) {
      this.lastBeta = e.beta;
      this.lastGamma = e.gamma;
      return;
    }

    // Calculate raw angular delta (handling landscape orientation naturally)
    let dBeta = e.beta - this.lastBeta;
    let dGamma = e.gamma - this.lastGamma;
    this.lastBeta = e.beta;
    this.lastGamma = e.gamma;

    // Clamp sudden angle wraps
    if (Math.abs(dBeta) > 25) dBeta = 0;
    if (Math.abs(dGamma) > 25) dGamma = 0;

    // Determine screen orientation (landscape vs portrait)
    const isLandscape = window.innerWidth > window.innerHeight;
    const rawDx = isLandscape ? -dBeta * 4.2 : dGamma * 4.2;
    const rawDy = isLandscape ? dGamma * 4.2 : dBeta * 4.2;

    // Exponential smoothing filter to eliminate hand micro-tremor jitter
    this.filteredDx = this.filteredDx * 0.35 + rawDx * 0.65;
    this.filteredDy = this.filteredDy * 0.35 + rawDy * 0.65;

    if (Math.abs(this.filteredDx) > 0.04 || Math.abs(this.filteredDy) > 0.04) {
      this.onGyroDeltaCallback(this.filteredDx, this.filteredDy);
    }
  };

  // =========================================================================
  // 3. FULLSCREEN IMMERSIVE MODE + LANDSCAPE ORIENTATION LOCK
  // =========================================================================
  public async enterFullscreenLandscape(): Promise<boolean> {
    try {
      const docEl = document.documentElement as any;
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen().catch(() => {});
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
          // Fallback to landscape-primary if generic landscape is rejected
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
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen().catch(() => {});
        }
        return false;
      }
    } catch {
      return Boolean(document.fullscreenElement);
    }
  }
}

export const mobileHardware = new MobileHardwareManager();
