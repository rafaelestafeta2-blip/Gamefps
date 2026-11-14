import { soundEngine } from '../audio/soundEngine';
import { mobileHardware } from '../mobile/nativeHardware';
import { _forward, _worldPos } from './engineMathTemps';

/**
 * Extracted from TacticalFPSEngine.updateReloadStateMachine — behavior preserved.
 * `engine` is the live TacticalFPSEngine instance (cast at call site).
 */
export function updateReloadStateMachine(engine: any, dt: number): void {
    const phase = engine.state.reloadPhase;

    // Update top brass cartridges visibility inside PMAG feed lips
    engine.weaponRig.topCartridges.forEach((c: { visible: boolean }, idx: number) => {
      c.visible = engine.state.currentMagRounds > idx;
    });

    if (phase === 'IDLE' || phase === 'MAG_CHECK') {
      // Smoothly return M4 magazine & charging handle to default position
      engine.weaponRig.magazineGroup.position.set(0, -0.125, -0.014);
      engine.weaponRig.magazineGroup.rotation.set(-0.11, 0, 0);
      engine.weaponRig.chargingHandle.position.z = 0.14;
      return;
    }

    if (phase === 'CHARGING_PULL') {
      engine.reloadTimer += dt;
      const p = Math.min(1, engine.reloadTimer / engine.reloadDuration);
      engine.state.reloadProgress = p;

      // Animate M4 charging handle pulled back and released (hands driven by updateGlbAnimations)
      const pullCurve = p < 0.6 ? p / 0.6 : Math.max(0, 1 - (p - 0.6) / 0.2);
      engine.weaponRig.chargingHandle.position.z = 0.14 + pullCurve * 0.068;

      if (p >= 1) {
        engine.state.reloadPhase = 'IDLE';
        engine.state.reloadProgress = 0;
        engine.state.reloadTypeLabel = '';
      }
      return;
    }

    // Standard Tactical / Speed / Dry Staged Reload
    engine.reloadTimer += dt;
    const p = Math.min(1, engine.reloadTimer / engine.reloadDuration);
    engine.state.reloadProgress = p;

    const magOutEnd = engine.needsBoltReleaseStage ? 0.36 : 0.46;
    const magInEnd = engine.needsBoltReleaseStage ? 0.76 : 1.0;

    const hasCustomReloadSound =
      engine.state.activeWeapon === 'P50_PISTOL' ||
      engine.state.activeWeapon === 'M4_CARBINE' ||
      engine.state.activeWeapon === 'CARBINE_AR';

    if (p < magOutEnd) {
      // STAGE 1: MAG_OUT
      engine.state.reloadPhase = 'MAG_OUT';

      if (!engine.stageSoundFlags.magOut) {
        engine.stageSoundFlags.magOut = true;
        if (!hasCustomReloadSound) {
          soundEngine.playReloadStage('MAG_OUT');
        }
        mobileHardware.vibrateReloadStage('MAG_OUT');
        if (engine.isSpeedReload) {
          engine.weaponRig.magazineGroup.getWorldPosition(_worldPos);
          engine.camera.getWorldDirection(_forward);
          engine.fxPool.spawnDroppedMagazine(_worldPos, _forward);
        }
      }
      const localP = p / magOutEnd;
      engine.weaponRig.magazineGroup.position.set(
        -0.02 * localP,
        -0.125 - localP * 0.24,
        -0.014 + localP * 0.04
      );
      engine.weaponRig.magazineGroup.rotation.z = localP * 0.35;
    } else if (p < magInEnd) {
      // STAGE 2: MAG_IN
      if (engine.state.reloadPhase !== 'MAG_IN') {
        engine.state.reloadPhase = 'MAG_IN';
        engine.completeMagazineSwap();
      }
      const localP = (p - magOutEnd) / (magInEnd - magOutEnd);
      if (localP > 0.68 && !engine.stageSoundFlags.magIn) {
        engine.stageSoundFlags.magIn = true;
        if (!hasCustomReloadSound) {
          soundEngine.playReloadStage('MAG_IN');
        }
        mobileHardware.vibrateReloadStage('MAG_IN');
        // Upward physical seating impulse
        engine.recoilPitch += 0.012;
      }
      const slideOffset = Math.max(0, 1 - localP * 1.25);
      engine.weaponRig.magazineGroup.position.set(
        -0.01 * slideOffset,
        -0.125 - slideOffset * 0.24,
        -0.014
      );
      engine.weaponRig.magazineGroup.rotation.z = slideOffset * 0.2;
    } else {
      // STAGE 3: BOLT_SLAP / CHAMBERING ROUND
      engine.state.reloadPhase = 'BOLT_SLAP';
      const localP = (p - magInEnd) / (1 - magInEnd);
      engine.weaponRig.magazineGroup.position.set(0, -0.125, -0.014);
      engine.weaponRig.magazineGroup.rotation.set(-0.11, 0, 0);

      if (localP > 0.38 && !engine.stageSoundFlags.boltSlap) {
        engine.stageSoundFlags.boltSlap = true;
        if (!hasCustomReloadSound) {
          soundEngine.playReloadStage('BOLT_SLAP');
        }
        mobileHardware.vibrateReloadStage('BOLT_SLAP');
        if (engine.state.currentMagRounds > 0 && engine.state.chambered === 0) {
          engine.state.currentMagRounds -= 1;
          engine.state.chambered = 1;
        }
        engine.state.boltLockedBack = false;
        engine.recoilKickZ += 0.018;
      }
    }

    if (p >= 1) {
      if (engine.state.chambered === 0 && engine.state.currentMagRounds > 0) {
        engine.state.currentMagRounds -= 1;
        engine.state.chambered = 1;
      }
      engine.state.boltLockedBack = false;
      engine.state.reloadPhase = 'IDLE';
      engine.state.reloadProgress = 0;
      engine.state.reloadTypeLabel = '';
    }
}
