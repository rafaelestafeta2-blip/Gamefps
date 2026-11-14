import * as THREE from 'three';
import { updatePlayerSprintPantingAudio } from '../audio/characterAndBombAudio';
import { soundEngine } from '../audio/soundEngine';
import { WeaponId } from '../types/game';
import { getAimRaycastIntervalSec } from './combatRaycast';
import {
  _hipPosPistol,
  _hipPosRifle,
  _rayDir,
  _rayOrigin,
  _worldPos,
} from './engineMathTemps';
import { getOpticAdsTransform } from './weaponBuilder';


/**
 * Extracted from TacticalFPSEngine.updateWeaponKinematicsAndOptics — behavior preserved.
 * `engine` is the live TacticalFPSEngine instance (cast at call site).
 */
export function updateWeaponKinematicsAndOptics(engine: any, dt: number): void {
    // 1. ADS Interpolation & Field of View (FOV) Zoom
    const canAds =
      engine.state.isAds &&
      engine.state.reloadPhase === 'IDLE' &&
      engine.state.stance !== 'SPRINT' &&
      engine.state.wallTuckAmount < 0.55;

    engine.state.adsAlpha = THREE.MathUtils.damp(
      engine.state.adsAlpha,
      canAds ? 1 : 0,
      14,
      dt
    );

    let targetFov = 72;
    if (engine.state.stance === 'SPRINT') {
      targetFov = 82;
    } else if (engine.state.stance === 'SLIDE') {
      targetFov = 80;
    } else if (canAds) {
      if (engine.state.cantedActive) {
        targetFov = 60;
      } else if (engine.state.activeWeapon === 'SNIPER_BOLT') {
        targetFov = 14;
      } else if (engine.state.activeWeapon === 'SNIPER_TACTICAL') {
        targetFov = 18;
      } else if (engine.state.activeWeapon === 'AK12_RIFLE') {
        // Moderate 2.1x optical zoom on AK-12's native scope keeping ~48% bezel and upper receiver crisp
        targetFov = 34;
      } else if (engine.state.optic === 'lpvo') {
        targetFov = THREE.MathUtils.clamp(54 - (engine.state.lpvoZoom - 1) * 4.5, 36, 54);
      } else {
        targetFov = 58;
      }
    }

    const punch = typeof engine.cameraFovPunch === 'number' ? engine.cameraFovPunch : 0;
    const desiredFov = targetFov + punch;
    if (Math.abs(engine.camera.fov - desiredFov) > 0.05) {
      engine.camera.fov = THREE.MathUtils.damp(engine.camera.fov, desiredFov, 16, dt);
      engine.camera.updateProjectionMatrix();
    }

    // Consolidated Single Forward Camera Raycast for Wall Avoidance, Aim Focus & Green PEQ Laser (Throttled for Mobile Performance)
    const activeGlbCollider =
      engine.state.drillMode === 'DUST2_BOMB_5V5'
        ? engine.dust2LevelData.collider
        : engine.state.drillMode === 'ASSAULT_BOMB_5V5'
          ? engine.assaultLevelData.collider
          : null;

    const aimInterval = getAimRaycastIntervalSec({
      laserActive: engine.state.laserActive && engine.state.activeWeapon !== 'KNIFE_TACTICAL',
      isAds: engine.state.isAds,
    });

    if (activeGlbCollider && activeGlbCollider.ready) {
      engine.aimRaycastTimer += dt;
      if (!engine.aimRaycastInitialized || engine.aimRaycastTimer >= aimInterval) {
        engine.aimRaycastInitialized = true;
        engine.aimRaycastTimer = 0;
        engine.camera.getWorldPosition(_rayOrigin);
        engine.camera.getWorldDirection(_rayDir);
        const maxCheckDist =
          engine.state.laserActive && engine.state.activeWeapon !== 'KNIFE_TACTICAL'
            ? 45.0
            : 0.9;
        const hitDist = activeGlbCollider.raycastDistance(
          _rayOrigin,
          _rayDir,
          maxCheckDist
        );
        const targetTuck =
          hitDist !== null && hitDist <= 0.85
            ? Math.max(0, 1 - hitDist / 0.85)
            : 0;
        engine.state.wallTuckAmount = THREE.MathUtils.damp(
          engine.state.wallTuckAmount,
          targetTuck,
          14,
          dt
        );
        engine.state.focusedWallWeapon = null;

        if (engine.state.laserActive && engine.state.activeWeapon !== 'KNIFE_TACTICAL') {
          engine.weaponRig.peqLaserBeam.visible = true;
          const laserDist = hitDist !== null ? hitDist : 45.0;
          engine.weaponRig.peqLaserBeam.scale.set(1, 1, Math.max(0.2, laserDist));
          if (hitDist !== null) {
            engine.laserDotMesh.position
              .copy(_rayOrigin)
              .addScaledVector(_rayDir, hitDist - 0.02);
            engine.laserDotMesh.visible = true;
          } else {
            engine.laserDotMesh.visible = false;
          }
        } else {
          engine.weaponRig.peqLaserBeam.visible = false;
          engine.laserDotMesh.visible = false;
        }
      }
    } else {
      engine.aimRaycastTimer += dt;
      if (!engine.aimRaycastInitialized || engine.aimRaycastTimer >= aimInterval) {
        engine.aimRaycastInitialized = true;
        engine.aimRaycastTimer = 0;
        engine.camera.getWorldPosition(_rayOrigin);
        engine.camera.getWorldDirection(_rayDir);
        engine.raycaster.set(_rayOrigin, _rayDir);
        engine.raycaster.far =
          engine.state.laserActive && engine.state.activeWeapon !== 'KNIFE_TACTICAL'
            ? 45.0
            : 7.5;
        engine.cachedAimHits = engine.raycaster.intersectObjects(engine.shootableMeshes, false);
      }
      const aimHits = engine.cachedAimHits;

      // 1. Wall avoidance tuck
      const firstWall = aimHits.find(
        (h: THREE.Intersection) =>
          h.distance <= 0.85 && h.object.userData.isEnvironment
      );
      const targetTuck = firstWall ? Math.max(0, 1 - firstWall.distance / 0.85) : 0;
      engine.state.wallTuckAmount = THREE.MathUtils.damp(
        engine.state.wallTuckAmount,
        targetTuck,
        14,
        dt
      );

      // 2. Focused Wall Weapon pickup prompt
      if (
        aimHits.length > 0 &&
        aimHits[0].distance <= 7.5 &&
        aimHits[0].object.userData.wallWeaponId
      ) {
        engine.state.focusedWallWeapon = aimHits[0].object.userData
          .wallWeaponId as WeaponId;
      } else {
        engine.state.focusedWallWeapon = null;
      }

      // 3. Green Laser Beam & World Impact Dot
      if (engine.state.laserActive && engine.state.activeWeapon !== 'KNIFE_TACTICAL') {
        engine.weaponRig.peqLaserBeam.visible = true;
        const laserDist = aimHits.length > 0 ? aimHits[0].distance : 45.0;
        engine.weaponRig.peqLaserBeam.scale.set(1, 1, Math.max(0.2, laserDist));
        if (aimHits.length > 0) {
          engine.laserDotMesh.position
            .copy(aimHits[0].point)
            .addScaledVector(_rayDir, -0.02);
          engine.laserDotMesh.visible = true;
        } else {
          engine.laserDotMesh.visible = false;
        }
      } else {
        engine.weaponRig.peqLaserBeam.visible = false;
        engine.laserDotMesh.visible = false;
      }
    }

    // 4. Second-Order Sway, Walk Bob & Respiratory Figure-8 Curve
    const horizSpeed = Math.hypot(engine.playerVel.x, engine.playerVel.z);
    const bobFreq =
      engine.state.stance === 'SPRINT'
        ? 13.4
        : engine.state.stance === 'CROUCH'
          ? 6.2
          : 9.6;
    if (engine.isGrounded && horizSpeed > 0.25 && engine.slideTimer <= 0) {
      const prevStepCycle = Math.floor(engine.walkBobPhase / Math.PI);
      engine.walkBobPhase += dt * bobFreq;
      const nextStepCycle = Math.floor(engine.walkBobPhase / Math.PI);
      if (nextStepCycle > prevStepCycle && engine.state.stance !== 'PRONE') {
        soundEngine.playFootstep(
          engine.state.stance === 'SPRINT',
          engine.state.stance === 'CROUCH'
        );
      }
      if (engine.walkBobPhase > Math.PI * 64) {
        engine.walkBobPhase -= Math.PI * 64;
      }
      engine.walkBobAmp = THREE.MathUtils.damp(
        engine.walkBobAmp,
        Math.min(1, horizSpeed / 5.0),
        10,
        dt
      );
    } else {
      engine.walkBobAmp = THREE.MathUtils.damp(engine.walkBobAmp, 0, 10, dt);
    }

    updatePlayerSprintPantingAudio(
      engine.state.stance === 'SPRINT',
      horizSpeed,
      engine.state.health > 0 && !engine.isPlayerDying && !engine.playerDeathTp?.isActive(),
      dt
    );

    // Spring-damper mouse look sway
    const clampedDt = Math.min(dt, 0.033);
    engine.swayPos.x += engine.swayVel.x * clampedDt;
    engine.swayPos.y += engine.swayVel.y * clampedDt;
    engine.swayVel.x += -engine.swayPos.x * 120 * clampedDt;
    engine.swayVel.y += -engine.swayPos.y * 120 * clampedDt;
    engine.swayVel.multiplyScalar(Math.exp(-16 * clampedDt));
    engine.swayPos.clampScalar(-0.025, 0.025);
    if (engine.swayPos.lengthSq() < 0.000005 && engine.swayVel.lengthSq() < 0.00005) {
      engine.swayPos.set(0, 0);
      engine.swayVel.set(0, 0);
    }

    // Respiratory breathing Lissajous figure-8
    const breathScale = engine.state.isHoldingBreath
      ? 0.08
      : engine.state.adsAlpha > 0.5
        ? 0.38
        : 1.0;
    const breathX = Math.sin(engine.elapsedTime * 1.45) * 0.0028 * breathScale;
    const breathY = Math.cos(engine.elapsedTime * 2.9) * 0.0022 * breathScale;

    // Counter-Strike 2 (CS2) Viewmodel Framing (matches CS2 Desert Eagle bottom-right framing) vs Precision ADS Target Pose
    const hipPos =
      engine.state.activeWeapon === 'P50_PISTOL' ? _hipPosPistol : _hipPosRifle;
    const adsTransform = getOpticAdsTransform(
      engine.state.optic,
      engine.state.cantedActive,
      engine.state.activeWeapon
    );

    const basePosX = THREE.MathUtils.lerp(
      hipPos.x,
      adsTransform.pos.x,
      engine.state.adsAlpha
    );
    const basePosY = THREE.MathUtils.lerp(
      hipPos.y,
      adsTransform.pos.y,
      engine.state.adsAlpha
    );
    const basePosZ = THREE.MathUtils.lerp(
      hipPos.z,
      adsTransform.pos.z,
      engine.state.adsAlpha
    );

    const bobScale = THREE.MathUtils.lerp(1.0, 0.14, engine.state.adsAlpha);
    const bobAmpScale =
      engine.state.stance === 'SPRINT' ? 1.25 : engine.state.stance === 'CROUCH' ? 0.7 : 1;
    // Packs without Walk/Run clips get stronger procedural bob so locomotion still reads.
    const hasGlbLoco =
      typeof engine.weaponRig.activePackHasWalkRunClips === 'function'
        ? engine.weaponRig.activePackHasWalkRunClips()
        : engine.state.activeWeapon === 'AK47_RIFLE';
    const proceduralLocoBoost = hasGlbLoco ? 1 : engine.state.stance === 'SPRINT' ? 1.7 : 1.45;
    const bobX =
      Math.cos(engine.walkBobPhase) *
      0.013 *
      engine.walkBobAmp *
      bobScale *
      bobAmpScale *
      proceduralLocoBoost;
    const bobY =
      Math.abs(Math.sin(engine.walkBobPhase)) *
      -0.014 *
      engine.walkBobAmp *
      bobScale *
      bobAmpScale *
      proceduralLocoBoost;

    // Camera head bob + roll polish (COD weight) — applied on top of movement pose.
    const headBobScale = THREE.MathUtils.lerp(1.0, 0.2, engine.state.adsAlpha);
    const headBobY =
      Math.abs(Math.sin(engine.walkBobPhase)) *
      0.016 *
      engine.walkBobAmp *
      headBobScale *
      bobAmpScale *
      (hasGlbLoco ? 1 : 1.2);
    const headBobRoll =
      Math.sin(engine.walkBobPhase) *
      0.012 *
      engine.walkBobAmp *
      headBobScale *
      bobAmpScale *
      (hasGlbLoco ? 1 : 1.25);
    const headBobPitch =
      Math.cos(engine.walkBobPhase * 2) *
      0.004 *
      engine.walkBobAmp *
      headBobScale *
      (hasGlbLoco ? 1 : 1.15);
    if (engine.yawObject) {
      engine.yawObject.position.y += headBobY;
    }
    engine.pitchObject.rotation.x += headBobPitch;
    engine.camera.rotation.z =
      (typeof engine.cameraBaseRoll === 'number' ? engine.cameraBaseRoll : 0) +
      headBobRoll;

    // Recoil decay
    const recovery = typeof engine.weaponFeelRecovery === 'number' ? engine.weaponFeelRecovery : 1;
    engine.recoilKickZ = THREE.MathUtils.damp(engine.recoilKickZ, 0, 22 * recovery, dt);
    engine.recoilPitch = THREE.MathUtils.damp(engine.recoilPitch, 0, 18 * recovery, dt);
    engine.recoilYaw = THREE.MathUtils.damp(engine.recoilYaw, 0, 18 * recovery, dt);

    // Sprint / Mag Check / Wall-Tuck / CS2 Hip-Angle Pose Modifiers (smoothly damped to prevent snap jitter)
    const isSprinting = engine.state.stance === 'SPRINT' && engine.state.adsAlpha < 0.2;
    const isSliding = engine.state.stance === 'SLIDE';
    engine.sprintPoseAlpha = THREE.MathUtils.damp(
      engine.sprintPoseAlpha,
      isSprinting || isSliding ? 1 : 0,
      isSliding ? 18 : 12,
      dt
    );
    const isAk47 =
      engine.state.activeWeapon === 'AK47_RIFLE' ||
      engine.state.activeWeapon === 'AK12_RIFLE';
    const slideBoost = isSliding ? 1.35 : 1;
    const sprintRotX = (isAk47 ? -0.14 : -0.26) * engine.sprintPoseAlpha * slideBoost;
    const sprintRotY = (isAk47 ? 0.08 : 0.48) * engine.sprintPoseAlpha;
    const sprintRotZ =
      ((isAk47 ? -0.08 : -0.24) - (isSliding ? 0.12 : 0)) * engine.sprintPoseAlpha;
    const sprintDropY =
      ((isAk47 ? -0.032 : 0) - (isSliding ? 0.04 : 0)) * engine.sprintPoseAlpha;

    // CS2 inward barrel angle in hipfire (smoothly zeroes out in ADS)
    const cs2HipRotY = (1 - engine.state.adsAlpha) * 0.055;
    const cs2HipRotX = (1 - engine.state.adsAlpha) * 0.015;

    const magCheckAlpha = engine.state.reloadPhase === 'MAG_CHECK' ? 1 : 0;
    const throwDipAlpha = engine.grenadeSystem.isThrowing() ? 1 : 0;
    const tuck = Math.max(engine.state.wallTuckAmount, throwDipAlpha * 0.72);

    // Procedural bolt-action chambering tilt on Sniper rifles while pulling the bolt handle
    let boltTiltRotX = 0;
    let boltTiltRotZ = 0;
    let boltPullPosZ = 0;
    let boltLiftPosY = 0;
    if (engine.sniperChamberTimer > 0 && engine.sniperChamberDuration > 0.1) {
      const boltP = 1 - engine.sniperChamberTimer / engine.sniperChamberDuration;
      const boltWave = Math.sin(boltP * Math.PI);
      const pullPulse = Math.sin(Math.min(1, Math.max(0, (boltP - 0.18) / 0.65)) * Math.PI);
      boltTiltRotZ = boltWave * 0.22;
      boltTiltRotX = boltWave * 0.08 + pullPulse * 0.06;
      boltPullPosZ = pullPulse * 0.032;
      boltLiftPosY = boltWave * 0.015;
    }

    engine.weaponRig.root.position.set(
      basePosX + bobX + engine.swayPos.x * bobScale + breathX + magCheckAlpha * 0.025,
      basePosY +
        bobY +
        engine.swayPos.y * bobScale +
        breathY +
        engine.landingDip * 0.55 +
        magCheckAlpha * 0.032 +
        boltLiftPosY +
        sprintDropY -
        tuck * 0.06 -
        throwDipAlpha * 0.08,
      basePosZ + engine.recoilKickZ + boltPullPosZ + tuck * 0.14
    );

    const targetRotZ = THREE.MathUtils.lerp(
      sprintRotZ - engine.swayPos.x * 1.8,
      adsTransform.rotZ,
      engine.state.adsAlpha
    );

    engine.weaponRig.root.rotation.set(
      cs2HipRotX + engine.recoilPitch + sprintRotX + boltTiltRotX + tuck * 0.65 + magCheckAlpha * 0.24,
      cs2HipRotY + engine.recoilYaw + sprintRotY - engine.swayPos.x * 1.2 - magCheckAlpha * 0.18,
      targetRotZ + boltTiltRotZ - magCheckAlpha * 0.42
    );

    // Hide 3D weapon viewmodel when scoped sniper, holding grenade, or presenting class kit
    const isSniperScoped =
      (engine.state.activeWeapon === 'SNIPER_BOLT' ||
        engine.state.activeWeapon === 'SNIPER_TACTICAL') &&
      !engine.state.cantedActive &&
      engine.state.adsAlpha > 0.82;
    const holdingClassKit = Boolean(engine.classKitProps?.isHolding?.());
    engine.weaponRig.root.visible =
      !engine.isPlayerDying &&
      !engine.playerDeathTp?.isActive() &&
      !isSniperScoped &&
      !engine.grenadeSystem.isBusyOrHolding() &&
      !holdingClassKit;

    // 5. Mechanical Sub-Component Animations (Bolt Carrier, Selector, Reticle Parallax)
    if (engine.state.boltLockedBack) {
      engine.weaponRig.boltCarrier.position.z = 0.052;
    } else {
      engine.boltCycleOffset = THREE.MathUtils.damp(engine.boltCycleOffset, 0, 35, dt);
      engine.weaponRig.boltCarrier.position.z = 0.005 + engine.boltCycleOffset;
    }

    // Fire Selector Lever Angle
    const selTargetX =
      engine.state.fireMode === 'SEMI'
        ? 0
        : engine.state.fireMode === 'BURST'
          ? Math.PI / 4
          : Math.PI / 2;
    engine.weaponRig.fireSelector.rotation.x = THREE.MathUtils.damp(
      engine.weaponRig.fireSelector.rotation.x,
      selTargetX,
      20,
      dt
    );

    // Trigger Shoe & Articulated GLB Index Finger Squeeze Animation
    const triggerPressed =
      engine.mouseButtonsHeld.has(0) || engine.touchFireHeld || engine.fireCooldown > 0.04;
    const targetTriggerRot = triggerPressed ? 0.52 : 0.22;
    engine.weaponRig.triggerMesh.rotation.x = THREE.MathUtils.damp(
      engine.weaponRig.triggerMesh.rotation.x,
      targetTriggerRot,
      28,
      dt
    );
    const pullAlpha = (engine.weaponRig.triggerMesh.rotation.x - 0.22) / 0.3;
    engine.weaponRig.setTriggerPull(THREE.MathUtils.clamp(pullAlpha, 0, 1));

    const isMoving = engine.isGrounded && horizSpeed > 0.35;
    engine.weaponRig.updateGlbAnimations(
      dt,
      isMoving,
      canAds,
      engine.state.reloadPhase,
      engine.state.reloadProgress
    );

    // Proximity to 3D Wall Weapon Stands
    let nearStand = false;
    for (let i = 0; i < engine.wallStandPositions.length; i++) {
      const standPos = engine.wallStandPositions[i];
      const dx = engine.playerPos.x - standPos.x;
      const dz = engine.playerPos.z - standPos.z;
      if (dx * dx + dz * dz < 64.0) {
        nearStand = true;
        break;
      }
    }
    engine.state.nearWallStand = nearStand;

    // LPVO Throw Lever Angle & Reticle Scale (~2 o'clock right side, matching Firefield reference)
    engine.weaponRig.lpvoThrowLever.rotation.z =
      -1.05 - ((engine.state.lpvoZoom - 1) / 3) * 0.45;

    // Optical Parallax Projection on Holographic & Red Dot Reticles
    const parallaxX = THREE.MathUtils.clamp(-engine.swayPos.x * 0.18, -0.006, 0.006);
    const parallaxY = THREE.MathUtils.clamp(-engine.swayPos.y * 0.18, -0.006, 0.006);
    engine.weaponRig.holoReticleMesh.position.x = parallaxX;
    engine.weaponRig.holoReticleMesh.position.y = 0.03 + parallaxY;

    // Muzzle Flash Visibility, Volumetric Expansion & HDR PointLight Decay
    if (engine.muzzleFlashTimer > 0) {
      engine.muzzleFlashTimer -= dt;
      const maxFlashTime = engine.state.suppressorAttached ? 0.022 : 0.056;
      const flashAlpha = Math.max(0, engine.muzzleFlashTimer / maxFlashTime);
      engine.weaponRig.muzzleFlashGroup.visible = !engine.state.suppressorAttached;
      engine.weaponRig.muzzleLight.intensity = engine.state.suppressorAttached
        ? 2.2 * flashAlpha
        : 15.5 * Math.pow(flashAlpha, 0.65);
    } else {
      engine.weaponRig.muzzleFlashGroup.visible = false;
      engine.weaponRig.muzzleLight.intensity = 0;
    }
}
