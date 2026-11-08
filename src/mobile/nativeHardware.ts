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
  // 2. GYROSCOPE DISABLED (TOUCH-ONLY CAMERA & AIM CONTROL)
  // =========================================================================
  public async enableGyroscope(
    _onDelta: (dx: number, dy: number) => void
  ): Promise<boolean> {
    this.disableGyroscope();
    return false;
  }

  public disableGyroscope(): void {
    this.gyroActive = false;
    this.lastBeta = null;
    this.lastGamma = null;
    this.onGyroDeltaCallback = null;
  }

  public recalibrateGyroCenter(): void {
    this.lastBeta = null;
    this.lastGamma = null;
    this.filteredDx = 0;
    this.filteredDy = 0;
  }

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
