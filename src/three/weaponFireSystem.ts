import * as THREE from 'three';
import { soundEngine } from '../audio/soundEngine';
import {
  detectSurfaceMaterialFromMesh,
  playMaterialImpact3D,
  playShellCasingDrop3D,
} from '../audio/tacticalImmersionAudio';
import { getSprayOffset, getWeaponFeel } from '../data/weaponFeel';
import { mobileHardware } from '../mobile/nativeHardware';
import { samplePeerPoseAt } from '../multiplayer/peerSnapshotBuffer';
import { WeaponId } from '../types/game';
import { alertBotsToPlayerCombat } from './botNavigationSystem';
import { raycastCombatShot } from './combatRaycast';
import {
  _forward,
  _hitNormal,
  _rayDir,
  _rayOrigin,
  _right,
  _up,
  _worldPos,
  _worldPos2,
} from './engineMathTemps';

/** Temporarily rewind online peer meshes to attacker-time pose for fairer hit checks. */
function withRewoundOnlinePeers<T>(engine: any, rewindMs: number, fn: () => T): T {
  const targets = engine.targets as Array<{
    root: THREE.Object3D;
    isDown?: boolean;
  }> | undefined;
  if (!targets || targets.length === 0) return fn();

  const restores: Array<{
    root: THREE.Object3D;
    x: number;
    y: number;
    z: number;
    ry: number;
  }> = [];
  const when = Date.now() - rewindMs;

  for (let i = 0; i < targets.length; i++) {
    const bot = targets[i];
    const uid = bot?.root?.userData?.remotePlayerUid as string | undefined;
    if (!uid || bot.isDown) continue;
    const pose = samplePeerPoseAt(uid, when);
    if (!pose) continue;
    restores.push({
      root: bot.root,
      x: bot.root.position.x,
      y: bot.root.position.y,
      z: bot.root.position.z,
      ry: bot.root.rotation.y,
    });
    bot.root.position.set(pose.x, pose.y, pose.z);
    bot.root.rotation.y = pose.yaw + Math.PI;
    bot.root.updateMatrixWorld(true);
  }

  try {
    return fn();
  } finally {
    for (let i = 0; i < restores.length; i++) {
      const r = restores[i];
      r.root.position.set(r.x, r.y, r.z);
      r.root.rotation.y = r.ry;
      r.root.updateMatrixWorld(true);
    }
  }
}


/** Extracted from TacticalFPSEngine.attemptFireWeapon — behavior preserved. */
export function attemptFireWeapon(engine: any): void {
    if (engine.isPlayerDying || engine.state.health <= 0) return;
    // If the player is holding a grenade in hand, pressing Fire pulls the pin & throws the grenade!
    if (
      engine.state.equippedGrenade !== null ||
      engine.grenadeSystem.isBusyOrHolding()
    ) {
      if (!engine.triggerPulledThisPress) {
        engine.triggerPulledThisPress = true;
        engine.useEquippedGrenade();
      }
      return;
    }

    if (engine.state.reloadPhase !== 'IDLE' && engine.state.reloadPhase !== 'MAG_CHECK') {
      return;
    }
    if (engine.fireCooldown > 0) return;

    // Prevent firing if barrel is heavily tucked against a wall
    if (engine.state.wallTuckAmount > 0.78) {
      soundEngine.playMechanicalSwitch(0.7);
      return;
    }

    if (engine.state.chambered === 0) {
      if (engine.sniperChamberTimer > 0) {
        return;
      }
      if (!engine.triggerPulledThisPress) {
        soundEngine.playDryFire();
        engine.triggerPulledThisPress = true;
        if (engine.state.currentMagRounds <= 0) {
          engine.triggerReload(false);
        } else {
          engine.triggerManualBoltRack();
        }
      }
      return;
    }

    if (engine.state.fireMode === 'SEMI' && engine.triggerPulledThisPress) {
      return;
    }

    engine.triggerPulledThisPress = true;
    if (engine.state.fireMode === 'BURST' && engine.burstRemaining === 0) {
      engine.burstRemaining = 3;
    }

    // Interrompe imediatamente o sprint para trazer a arma para a mira frontal e atirar no alvo
    if (engine.state.stance === 'SPRINT' || engine.touchSprinting) {
      engine.touchSprinting = false;
      engine.sprintPoseAlpha = 0;
      engine.state.stance = 'STAND';
    }

    engine.executeSingleShot();
}


/** Extracted from TacticalFPSEngine.executeSingleShot — behavior preserved. */
export function executeSingleShot(engine: any): void {
    if (engine.state.activeWeapon === 'KNIFE_TACTICAL') {
      engine.fireCooldown = 0.52;
      engine.state.shotsFired += 1;
      engine.weaponRig.triggerFireAnimation(false);
      soundEngine.playKnifeSlash();
      mobileHardware.vibrateKnifeSlash();

      engine.yawObject.rotation.y = engine.yaw;
      engine.pitchObject.rotation.x = engine.pitch;
      engine.camera.updateMatrixWorld(true);

      engine.camera.getWorldPosition(_rayOrigin);
      engine.camera.getWorldDirection(_rayDir);
      engine.raycaster.set(_rayOrigin, _rayDir);
      engine.raycaster.far = 2.4;

      const knifeCollider =
        engine.state.drillMode === 'DUST2_BOMB_5V5'
          ? engine.dust2LevelData.collider
          : engine.state.drillMode === 'ASSAULT_BOMB_5V5'
            ? engine.assaultLevelData.collider
            : null;
      const hit = raycastCombatShot(
        engine.raycaster,
        engine.shootableMeshes,
        knifeCollider,
        engine.combatRayHit
      );
      if (hit) {
        const hitMesh = hit.object as THREE.Mesh | null;
        const wallWeaponId = hitMesh?.userData?.wallWeaponId as
          | WeaponId
          | undefined;
        if (wallWeaponId) {
          engine.selectWeapon(wallWeaponId);
          return;
        }

        const targetId = hitMesh?.userData?.targetId as string | undefined;
        if (targetId) {
          soundEngine.playKnifeHit();
          mobileHardware.vibrateKnifeHit();
          engine.state.hitMarkerAlpha = 1.0;
          engine.state.hitMarkerIsCrit = true;
          _hitNormal.copy(hit.normal);
          engine.handleTargetHit(
            targetId,
            'HEAD',
            hit.distance,
            hit.point,
            _hitNormal
          );
        } else {
          soundEngine.playKnifeHit();
          _hitNormal.copy(hit.normal);
          engine.fxPool.spawnImpactFX(hit.point, _hitNormal, false, false);
        }
      }
      engine.emitHud();
      return;
    }

    // Safety check: weapon cannot fire if chamber is empty
    if (engine.state.chambered === 0) {
      engine.burstRemaining = 0;
      soundEngine.playDryFire();
      if (engine.state.currentMagRounds <= 0) {
        engine.triggerReload(false);
      } else {
        engine.triggerManualBoltRack();
      }
      return;
    }

    const isSniper =
      engine.state.activeWeapon === 'SNIPER_BOLT' ||
      engine.state.activeWeapon === 'SNIPER_TACTICAL';
    const wasScopedAtShot = engine.state.isAds;

    const isShotgun =
      engine.state.activeWeapon === 'SHOTGUN_12' ||
      engine.state.activeWeapon === 'SHOTGUN_SPAS';

    if (isSniper) {
      const boltDur =
        engine.state.activeWeapon === 'SNIPER_BOLT' ? 1.32 : 1.08;
      engine.fireCooldown = boltDur + 0.1;
      engine.sniperChamberDuration = boltDur;
      if (engine.state.currentMagRounds > 0) {
        engine.sniperChamberTimer = boltDur;
        engine.sniperReturnToScopeAfterBolt = wasScopedAtShot;
        engine.state.reloadTypeLabel =
          'CICLANDO FERROLHO — CARREGANDO PRÓXIMA BALA...';
        engine.magCheckTimer = boltDur;
        soundEngine.playBoltActionCycle();
      } else {
        engine.sniperChamberTimer = 0;
        engine.sniperReturnToScopeAfterBolt = false;
        engine.state.boltLockedBack = true;
      }
    } else if (isShotgun) {
      engine.fireCooldown =
        engine.state.activeWeapon === 'SHOTGUN_12' ? 0.68 : 0.32;
    } else {
      engine.fireCooldown =
        engine.state.activeWeapon === 'SMG_45'
          ? 0.066
          : engine.state.activeWeapon === 'SMG_MP5'
            ? 0.072
            : engine.state.activeWeapon === 'AK47_RIFLE'
              ? 0.095
              : engine.state.activeWeapon === 'AK12_RIFLE'
                ? 0.086
                : 0.078;
    }
    engine.state.shotsFired += 1;

    // Consume chambered round and cycle bolt carrier
    engine.state.chambered = 0;
    if (!isSniper) {
      if (engine.state.currentMagRounds > 0) {
        engine.state.currentMagRounds -= 1;
        engine.state.chambered = 1;
        engine.state.boltLockedBack = false;
      } else {
        // Last round fired! Lock Bolt Carrier Group back!
        engine.state.boltLockedBack = true;
      }
    }

    // Play weapon-specific gunshot audio (Desert Eagle .WAV for P50 Pistol) + Mobile Haptic Vibration
    soundEngine.playGunshot(
      engine.state.suppressorAttached,
      engine.state.boltLockedBack,
      engine.state.activeWeapon
    );
    if (!engine.state.suppressorAttached) {
      alertBotsToPlayerCombat(engine.targets, engine.playerPos, null);
    }
    const feel = getWeaponFeel(engine.state.activeWeapon as WeaponId);
    mobileHardware.vibrateGunshot(
      engine.state.suppressorAttached,
      engine.state.boltLockedBack,
      feel.hapticMs
    );

    // Muzzle flash, GLB embedded fire animation (Fire / Fire_ADS) & bolt carrier kick
    engine.weaponRig.triggerFireAnimation(wasScopedAtShot);
    engine.boltCycleOffset = 0.052;
    engine.muzzleFlashTimer = engine.state.suppressorAttached ? 0.022 : 0.056;
    engine.weaponRig.muzzleFlashGroup.rotation.z = Math.random() * Math.PI * 2;
    const randFlashScale = 0.92 + Math.random() * 0.36;
    engine.weaponRig.muzzleFlashGroup.scale.set(
      randFlashScale,
      randFlashScale,
      0.95 + Math.random() * 0.45
    );

    // Eject spinning 5.56mm brass casing from ejection port + 3D brass bounce sound on concrete
    engine.weaponRig.ejectionPortWorldPos.getWorldPosition(_worldPos);
    engine.camera.getWorldDirection(_forward);
    _right.crossVectors(_forward, _up).normalize();
    engine.fxPool.spawnBrassCasing(_worldPos, _right, _up);
    playShellCasingDrop3D(
      engine.playerPos,
      engine.playerPos,
      engine.yaw,
      engine.state.activeWeapon,
      true
    );

    // Perform Ballistic Raycast FIRST (aligned with exact current Sight/Crosshair vector before recoil kick & unscope!)
    engine.yawObject.rotation.y = engine.yaw;
    engine.pitchObject.rotation.x = engine.pitch;
    engine.camera.updateMatrixWorld(true);

    engine.camera.getWorldPosition(_rayOrigin);
    engine.camera.getWorldDirection(_rayDir);

    // Tight, predictable dispersion when hip-firing or moving fast; 100% pinpoint accuracy when ADS
    const speed = Math.hypot(engine.playerVel.x, engine.playerVel.z);
    const hipSpread =
      engine.state.adsAlpha > 0.85
        ? 0
        : (1 - engine.state.adsAlpha) * 0.0028 + speed * 0.001;
    if (hipSpread > 0.0002) {
      _rayDir.x += (Math.random() - 0.5) * hipSpread;
      _rayDir.y += (Math.random() - 0.5) * hipSpread;
      _rayDir.z += (Math.random() - 0.5) * hipSpread;
      _rayDir.normalize();
    }

    engine.weaponRig.muzzleWorldPos.getWorldPosition(_worldPos2);

    const pelletCount = isShotgun ? 8 : 1;
    const baseDir = _rayDir.clone();
    const pelletSpread =
      engine.state.activeWeapon === 'SHOTGUN_12'
        ? wasScopedAtShot
          ? 0.036
          : 0.052
        : engine.state.activeWeapon === 'SHOTGUN_SPAS'
          ? wasScopedAtShot
            ? 0.04
            : 0.058
          : 0;

    // For bolt-action Snipers: immediately exit the scope zoom AFTER the shot raycast so the player sees the 3D bolt-action animation!
    if (isSniper && wasScopedAtShot) {
      engine.state.isAds = false;
      engine.touchHoldBreath = false;
    }

    // Physical Recoil Impulse applied AFTER raycast (so shot lands where player aimed)
    const stanceMult = engine.state.stance === 'CROUCH' ? 0.72 : 1.0;
    const suppMult = engine.state.suppressorAttached ? 0.82 : 1.0;
    const adsMult = wasScopedAtShot ? 0.55 : 1.0;
    const totalMult = stanceMult * suppMult * adsMult;
    const sprayIdx = Math.max(0, (engine.state.shotsFired || 1) - 1);
    const spray = getSprayOffset(engine.state.activeWeapon as WeaponId, sprayIdx);
    const jitter = 0.15 + Math.random() * 0.2;

    engine.recoilKickZ = Math.min(
      engine.recoilKickZ + feel.kickZ * totalMult,
      0.092
    );
    engine.recoilPitch += (feel.kickPitch + spray.pitch * jitter) * totalMult;
    engine.recoilYaw += (spray.yaw + (Math.random() - 0.5) * feel.kickYaw) * totalMult;
    engine.cameraShake = Math.min(
      engine.cameraShake + feel.shake * totalMult,
      0.02
    );
    engine.weaponFeelRecovery = feel.recovery;

    engine.pitch = THREE.MathUtils.clamp(
      engine.pitch + feel.kickPitch * 0.55 * totalMult,
      -Math.PI * 0.46,
      Math.PI * 0.46
    );

    // ~RTT/2 rewind for online peers so hits register closer to what the attacker saw.
    withRewoundOnlinePeers(engine, 75, () => {
      let wallSelected = false;
      for (let p = 0; p < pelletCount; p++) {
        const pDir = _rayDir.copy(baseDir);
        if (isShotgun) {
          if (p > 0) {
            const ang =
              ((p - 1) / (pelletCount - 1)) * Math.PI * 2 +
              (Math.random() - 0.5) * 0.45;
            const rad = (0.35 + Math.random() * 0.65) * pelletSpread;
            pDir.x += Math.cos(ang) * rad;
            pDir.y += Math.sin(ang) * rad;
            pDir.z += (Math.random() - 0.5) * rad * 0.35;
            pDir.normalize();
          }
        }
        engine.raycaster.set(_rayOrigin, pDir);
        engine.raycaster.far = isShotgun ? 34 : 140;

        const glbCollider =
          engine.state.drillMode === 'DUST2_BOMB_5V5'
            ? engine.dust2LevelData.collider
            : engine.state.drillMode === 'ASSAULT_BOMB_5V5'
              ? engine.assaultLevelData.collider
              : null;

        const hit = raycastCombatShot(
          engine.raycaster,
          engine.shootableMeshes,
          glbCollider,
          engine.combatRayHit
        );

        if (hit) {
          const hitMesh = hit.object as THREE.Mesh | null;
          const dist = hit.distance;
          _hitNormal.copy(hit.normal);

          if (p < 3) {
            engine.fxPool.spawnTracer(_worldPos2, hit.point);
          }

          const wallWeaponId = hitMesh?.userData?.wallWeaponId as
            | WeaponId
            | undefined;
          if (wallWeaponId && !wallSelected) {
            wallSelected = true;
            engine.selectWeapon(wallWeaponId);
            return;
          }

          const targetId = hitMesh?.userData?.targetId as string | undefined;
          const hitZone = hitMesh?.userData?.hitZone as
            | 'HEAD'
            | 'TORSO_A'
            | 'ARMOR'
            | 'STEEL_GONG'
            | undefined;

          if (targetId && hitZone) {
            engine.handleTargetHit(
              targetId,
              hitZone,
              dist,
              hit.point,
              _hitNormal,
              isShotgun
            );
          } else {
            const surfMat = hitMesh
              ? detectSurfaceMaterialFromMesh(hitMesh, hit.point)
              : 'CONCRETE';
            engine.fxPool.spawnImpactFX(
              hit.point,
              _hitNormal,
              surfMat === 'METAL',
              false
            );
            if (p === 0) {
              playMaterialImpact3D(hit.point, _rayOrigin, engine.yaw, surfMat);
              if (surfMat === 'CONCRETE') {
                soundEngine.playImpact('CONCRETE');
              }
            }
          }
        } else if (p < 2) {
          _worldPos.copy(_rayOrigin).addScaledVector(pDir, isShotgun ? 28 : 80);
          engine.fxPool.spawnTracer(_worldPos2, _worldPos);
        }
      }
    });

    if (engine.burstRemaining > 0) {
      engine.burstRemaining -= 1;
    }

    engine.emitHud();
}
