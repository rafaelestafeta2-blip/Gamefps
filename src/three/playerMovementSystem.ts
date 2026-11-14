import * as THREE from 'three';
import { soundEngine } from '../audio/soundEngine';
import { YardBotEntity } from './yardPropsBuilder';
import {
  _forward,
  _moveVec,
  _resolvedHoriz,
  _right,
} from './engineMathTemps';
import { tryStartMantle, updateMantle } from './playerMantleSystem';


/**
 * Extracted from TacticalFPSEngine.updatePlayerMovementAndCollision — behavior preserved.
 * `engine` is the live TacticalFPSEngine instance (cast at call site).
 */
export function updatePlayerMovementAndCollision(engine: any, dt: number): void {
    // Mantle / vault owns horizontal+vertical while active (code-only — no mantle GLB).
    if (updateMantle(engine, dt)) {
      engine.currentEyeHeight = THREE.MathUtils.damp(
        engine.currentEyeHeight,
        1.55,
        14,
        dt
      );
      engine.yawObject.position.set(
        engine.playerPos.x,
        engine.playerPos.y + engine.currentEyeHeight,
        engine.playerPos.z
      );
      return;
    }

    // Se o jogador estiver morrendo, bloqueia imediatamente qualquer caminhada, pulo, agachamento ou tiro
    if (engine.isPlayerDying || engine.playerDeathTp?.isActive()) {
      engine.playerVel.set(0, 0, 0);
      engine.touchMoveX = 0;
      engine.touchMoveY = 0;
      engine.touchSprinting = false;
      engine.touchFireHeld = false;
      engine.burstRemaining = 0;
      engine.slideTimer = 0;
      engine.jumpBufferTimer = 0;
      engine.state.isAds = false;

      engine.deathAnimElapsed += dt;
      engine.state.damageFlashAlpha = THREE.MathUtils.lerp(
        0.92,
        0.35,
        Math.min(1, engine.deathAnimElapsed / 1.8)
      );

      const activeGlbCol =
        engine.state.drillMode === 'DUST2_BOMB_5V5'
          ? engine.dust2LevelData.collider
          : engine.state.drillMode === 'ASSAULT_BOMB_5V5'
            ? engine.assaultLevelData.collider
            : engine.state.drillMode === 'INDUSTRIA_BOMB_5V5'
              ? engine.industriaLevelData.collider
              : engine.state.drillMode === 'HANGAR_BOMB_5V5'
                ? engine.hangarLevelData.collider
                : engine.state.drillMode === 'EASTERN_CITY_BOMB_5V5'
                  ? engine.easternCityLevelData.collider
                : engine.state.drillMode === 'MIRAGE_ANUBIS_BOMB_5V5'
                  ? engine.mirageAnubisLevelData.collider
                : null;

      const activeColliders =
        engine.state.drillMode === 'YARD_BOMB_5V5'
          ? engine.yardLevelData.colliders
          : engine.state.drillMode === 'FREE_RANGE'
            ? engine.standerTiroLevelData.colliders
            : engine.facilityLevelData.colliders;

      engine.playerDeathTp.update(
        dt,
        engine.deathAnimElapsed,
        engine.playerPos,
        engine.yawObject,
        engine.pitchObject,
        engine.camera,
        engine.weaponRig.root,
        engine.grenadeSystem,
        activeColliders,
        activeGlbCol,
        engine.targets as YardBotEntity[]
      );

      if (engine.isPlayerDying && engine.deathAnimElapsed >= engine.deathSequenceDuration) {
        engine.isPlayerDying = false;
        const cb = engine.deathOnFinish;
        engine.deathOnFinish = null;
        cb?.();
      }
      return;
    }

    // Check if a low ceiling (such as Yard's crouch-only wall breaches or Dust2 tunnels) is directly above the player
    let lowCeilingAbove = false;
    const checkR = 0.32;
    if (engine.state.drillMode === 'DUST2_BOMB_5V5') {
      lowCeilingAbove = engine.dust2LevelData.collider.hasLowCeiling(
        engine.playerPos.x,
        engine.playerPos.y,
        engine.playerPos.z
      );
    } else if (engine.state.drillMode === 'ASSAULT_BOMB_5V5') {
      lowCeilingAbove = engine.assaultLevelData.collider.hasLowCeiling(
        engine.playerPos.x,
        engine.playerPos.y,
        engine.playerPos.z
      );
    } else if (engine.state.drillMode === 'INDUSTRIA_BOMB_5V5') {
      lowCeilingAbove = engine.industriaLevelData.collider.hasLowCeiling(
        engine.playerPos.x,
        engine.playerPos.y,
        engine.playerPos.z
      );
    } else if (engine.state.drillMode === 'HANGAR_BOMB_5V5') {
      lowCeilingAbove = engine.hangarLevelData.collider.hasLowCeiling(
        engine.playerPos.x,
        engine.playerPos.y,
        engine.playerPos.z
      );
    } else if (engine.state.drillMode === 'EASTERN_CITY_BOMB_5V5') {
      lowCeilingAbove = engine.easternCityLevelData.collider.hasLowCeiling(
        engine.playerPos.x,
        engine.playerPos.y,
        engine.playerPos.z
      );
    } else if (engine.state.drillMode === 'MIRAGE_ANUBIS_BOMB_5V5') {
      lowCeilingAbove = engine.mirageAnubisLevelData.collider.hasLowCeiling(
        engine.playerPos.x,
        engine.playerPos.y,
        engine.playerPos.z
      );
    } else {
      for (let i = 0; i < engine.colliders.length; i++) {
        const c = engine.colliders[i];
        if (
          c.minY >= engine.playerPos.y + 0.4 &&
          c.minY < engine.playerPos.y + 1.68 &&
          engine.playerPos.x + checkR > c.minX &&
          engine.playerPos.x - checkR < c.maxX &&
          engine.playerPos.z + checkR > c.minZ &&
          engine.playerPos.z - checkR < c.maxZ
        ) {
          lowCeilingAbove = true;
          break;
        }
      }
    }

    // 1. Stance & Breath Stamina (Keyboard + Mobile Touch Controls)
    const crouchHeld =
      lowCeilingAbove ||
      engine.keysHeld.has('KeyC') ||
      engine.keysHeld.has('ControlLeft') ||
      engine.state.isCrouchingToggled;
    // Hysteresis latch prevents 60Hz SPRINT <-> STAND oscillation when stamina hits bottom
    if (engine.state.stamina <= 1) {
      engine.sprintExhausted = true;
    } else if (engine.state.stamina >= 26) {
      engine.sprintExhausted = false;
    }

    const wantsToSprint =
      ((engine.keysHeld.has('ShiftLeft') && engine.keysHeld.has('KeyW')) ||
        engine.touchSprinting) &&
      !engine.state.isAds &&
      !crouchHeld &&
      engine.state.reloadPhase === 'IDLE' &&
      !engine.touchFireHeld &&
      !engine.mouseButtonsHeld.has(0);

    const sprintHeld = wantsToSprint && !engine.sprintExhausted;

    // Breath holding when ShiftLeft or Mobile Breath Button is held during ADS
    const holdBreath =
      (engine.keysHeld.has('ShiftLeft') || engine.touchHoldBreath) &&
      engine.state.isAds &&
      engine.state.stamina > 5;
    engine.state.isHoldingBreath = holdBreath;

    if (holdBreath) {
      const prevStamina = engine.state.stamina;
      engine.state.stamina = Math.max(0, engine.state.stamina - 22 * dt);
      if (prevStamina > 25 && engine.state.stamina <= 25) {
        soundEngine.playHeartbeat();
      }
    } else if (sprintHeld) {
      engine.state.stamina = Math.max(0, engine.state.stamina - 14 * dt);
    } else {
      engine.state.stamina = Math.min(100, engine.state.stamina + 18 * dt);
    }

    if (engine.slideTimer > 0) {
      engine.slideTimer -= dt;
      engine.state.stance = 'SLIDE';

      // COD-style slide cancels (fire / ADS / re-sprint) — jump cancel is below.
      const fireCancel =
        engine.touchFireHeld || engine.mouseButtonsHeld.has(0);
      const adsCancel = Boolean(engine.state.isAds) || (engine.state.adsAlpha ?? 0) > 0.35;
      // Ignore isCrouchingToggled (forced on during slide) — only block if crouch key still held.
      const crouchKeyHeld =
        engine.keysHeld.has('KeyC') || engine.keysHeld.has('ControlLeft');
      const sprintCancel =
        engine.slideTimer < 0.48 &&
        ((engine.keysHeld.has('ShiftLeft') && engine.keysHeld.has('KeyW')) ||
          engine.touchSprinting) &&
        !crouchKeyHeld &&
        !engine.state.isAds;
      if (fireCancel || adsCancel || sprintCancel) {
        engine.slideTimer = 0;
        if (sprintCancel) {
          engine.state.isCrouchingToggled = false;
          engine.slideForcedCrouch = false;
          engine.state.stance = 'SPRINT';
          // Keep some forward momentum into the sprint.
          const spd = Math.hypot(engine.playerVel.x, engine.playerVel.z);
          if (spd > 0.1) {
            engine.playerVel.x *= 0.85;
            engine.playerVel.z *= 0.85;
          }
        } else {
          // Fire/ADS → settle into crouch.
          engine.state.isCrouchingToggled = true;
          engine.slideForcedCrouch = false;
          engine.state.stance = 'CROUCH';
          engine.playerVel.x *= 0.55;
          engine.playerVel.z *= 0.55;
        }
        engine.cameraFovPunch = Math.min((engine.cameraFovPunch || 0) + 2.2, 6);
      }

      if (engine.slideTimer <= 0 && engine.state.stance === 'SLIDE') {
        // Natural slide end: keep crouch only if player still wants low stance.
        const stillWantsCrouch =
          lowCeilingAbove ||
          engine.keysHeld.has('KeyC') ||
          engine.keysHeld.has('ControlLeft') ||
          (engine.state.isCrouchingToggled && !engine.slideForcedCrouch);
        if (engine.slideForcedCrouch && !stillWantsCrouch) {
          engine.state.isCrouchingToggled = false;
        }
        engine.slideForcedCrouch = false;
        engine.cameraFovPunch = Math.min((engine.cameraFovPunch || 0) + 2.5, 6);
      }
    } else if (engine.state.isProneToggled || engine.keysHeld.has('KeyZ')) {
      engine.state.stance = 'PRONE';
    } else if (crouchHeld) {
      engine.state.stance = 'CROUCH';
    } else if (sprintHeld) {
      engine.state.stance = 'SPRINT';
    } else {
      engine.state.stance = 'STAND';
    }

    // 2. Q / E shoulder peek (snappier when ADS — COD corner lean)
    if (engine.keysHeld.has('KeyQ') && !engine.keysHeld.has('KeyE')) {
      engine.leanTarget = -1;
    } else if (engine.keysHeld.has('KeyE') && !engine.keysHeld.has('KeyQ')) {
      engine.leanTarget = 1;
    } else {
      engine.leanTarget = engine.touchLeanToggle;
    }
    // No lean while sliding / prone / sprinting hard.
    if (
      engine.slideTimer > 0 ||
      engine.state.stance === 'PRONE' ||
      (engine.state.stance === 'SPRINT' && (engine.state.adsAlpha ?? 0) < 0.1)
    ) {
      engine.leanTarget = 0;
    }
    engine.state.leanDirection = engine.leanTarget;
    const leanLambda =
      (engine.state.adsAlpha ?? 0) > 0.35 || engine.state.isAds ? 20 : 15;
    engine.leanCurrent = THREE.MathUtils.damp(
      engine.leanCurrent,
      engine.leanTarget,
      leanLambda,
      dt
    );

    // 3. Horizontal Velocity & Acceleration (Keyboard WASD + Mobile Analog Joystick)
    const kbForward =
      (engine.keysHeld.has('KeyW') || engine.keysHeld.has('ArrowUp') ? 1 : 0) -
      (engine.keysHeld.has('KeyS') || engine.keysHeld.has('ArrowDown') ? 1 : 0);
    const kbRight =
      (engine.keysHeld.has('KeyD') || engine.keysHeld.has('ArrowRight') ? 1 : 0) -
      (engine.keysHeld.has('KeyA') || engine.keysHeld.has('ArrowLeft') ? 1 : 0);

    const forwardInput = THREE.MathUtils.clamp(
      kbForward + engine.touchMoveY,
      -1,
      1
    );
    const rightInput = THREE.MathUtils.clamp(
      kbRight + engine.touchMoveX,
      -1,
      1
    );

    _forward.set(-Math.sin(engine.yaw), 0, -Math.cos(engine.yaw)).normalize();
    _right.set(Math.cos(engine.yaw), 0, -Math.sin(engine.yaw)).normalize();

    if (engine.slideTimer > 0) {
      // Soft steer during slide — COD-like course correction without full air-strafe.
      _moveVec
        .copy(engine.slideDir)
        .addScaledVector(_forward, forwardInput * 0.35)
        .addScaledVector(_right, rightInput * 0.85);
      if (_moveVec.lengthSq() > 0.0001) _moveVec.normalize();
      engine.slideDir.x = THREE.MathUtils.damp(engine.slideDir.x, _moveVec.x, 8, dt);
      engine.slideDir.z = THREE.MathUtils.damp(engine.slideDir.z, _moveVec.z, 8, dt);
      const slideLen = Math.hypot(engine.slideDir.x, engine.slideDir.z) || 1;
      engine.slideDir.x /= slideLen;
      engine.slideDir.z /= slideLen;

      const slideSpeed = 8.2 * (0.38 + 0.62 * (engine.slideTimer / 0.72));
      engine.playerVel.x = engine.slideDir.x * slideSpeed;
      engine.playerVel.z = engine.slideDir.z * slideSpeed;
    } else {
      _moveVec
        .set(0, 0, 0)
        .addScaledVector(_forward, forwardInput)
        .addScaledVector(_right, rightInput);
      if (_moveVec.lengthSq() > 1) _moveVec.normalize();

      // Slight top-speed trim (~6%) kept from sprint tune.
      let maxSpeed = 4.55;
      if (engine.state.stance === 'SPRINT') maxSpeed = 6.7;
      else if (engine.state.stance === 'CROUCH') maxSpeed = 2.55;
      else if (engine.state.stance === 'PRONE') maxSpeed = 1.2;

      // Sticky ADS walk: slower top speed + heavier accel/decel (scales with adsAlpha).
      const adsA = Math.max(
        engine.state.adsAlpha ?? 0,
        engine.state.isAds ? 1 : 0
      );
      if (adsA > 0.04) {
        maxSpeed *= THREE.MathUtils.lerp(1, 0.42, adsA);
      }

      // Asymmetric feel: snappy accel, heavier stop (COD weight); stickier when ADS.
      const hasInput = _moveVec.lengthSq() > 0.01;
      const accelLambda = hasInput
        ? engine.state.stance === 'SPRINT'
          ? 20
          : adsA > 0.25
            ? 11
            : 17
        : adsA > 0.25
          ? 15
          : 9;

      engine.playerVel.x = THREE.MathUtils.damp(
        engine.playerVel.x,
        _moveVec.x * maxSpeed,
        accelLambda,
        dt
      );
      engine.playerVel.z = THREE.MathUtils.damp(
        engine.playerVel.z,
        _moveVec.z * maxSpeed,
        accelLambda,
        dt
      );
    }

    // 4. Jump with Coyote Time & Input Buffering
    if (engine.isGrounded) {
      engine.coyoteTimer = 0.12;
    } else {
      engine.coyoteTimer = Math.max(0, engine.coyoteTimer - dt);
    }
    if (engine.jumpBufferTimer > 0) {
      engine.jumpBufferTimer = Math.max(0, engine.jumpBufferTimer - dt);
    }

    const isDust2 = engine.state.drillMode === 'DUST2_BOMB_5V5';
    const isAssault = engine.state.drillMode === 'ASSAULT_BOMB_5V5';
    const isIndustria = engine.state.drillMode === 'INDUSTRIA_BOMB_5V5';
    const isHangar = engine.state.drillMode === 'HANGAR_BOMB_5V5';
    const isEasternCity = engine.state.drillMode === 'EASTERN_CITY_BOMB_5V5';
    const isMirageAnubis = engine.state.drillMode === 'MIRAGE_ANUBIS_BOMB_5V5';
    const activeGlbCollider = isDust2
      ? engine.dust2LevelData.collider
      : isAssault
        ? engine.assaultLevelData.collider
        : isIndustria
          ? engine.industriaLevelData.collider
          : isHangar
            ? engine.hangarLevelData.collider
            : isEasternCity
              ? engine.easternCityLevelData.collider
            : isMirageAnubis
              ? engine.mirageAnubisLevelData.collider
            : null;

    const activeLadder = activeGlbCollider
      ? activeGlbCollider.getActiveLadder(
          engine.playerPos.x,
          engine.playerPos.y,
          engine.playerPos.z
        )
      : null;

    if (activeLadder) {
      engine.coyoteTimer = 0.12;
      const climbJump = engine.keysHeld.has('Space') || engine.jumpBufferTimer > 0;
      if (climbJump) {
        engine.jumpBufferTimer = 0;
        engine.playerVel.y = 3.6;
        engine.playerVel.x = -_forward.x * 2.8;
        engine.playerVel.z = -_forward.z * 2.8;
        engine.isGrounded = false;
      } else if (forwardInput > 0.12) {
        const climbDir = engine.pitch < -0.55 ? -4.2 : 4.4;
        if (climbDir > 0 && engine.playerPos.y >= activeLadder.maxY - 0.06) {
          engine.playerPos.y = activeLadder.maxY;
          engine.playerVel.y = 0;
          engine.playerVel.x = _forward.x * 3.0;
          engine.playerVel.z = _forward.z * 3.0;
          engine.isGrounded = true;
        } else {
          engine.playerVel.y = climbDir;
          engine.isGrounded = false;
        }
      } else if (forwardInput < -0.12) {
        engine.playerVel.y = -4.5;
        engine.isGrounded = false;
      } else if (!engine.isGrounded) {
        engine.playerVel.y = 0;
        engine.playerVel.x *= 0.5;
        engine.playerVel.z *= 0.5;
      } else {
        engine.playerVel.y -= 15.5 * dt;
      }

      if (activeLadder.id.startsWith('vent_') && engine.playerPos.y >= 9.6) {
        engine.state.stance = 'CROUCH';
      }
    } else {
      if (engine.jumpBufferTimer > 0 && engine.coyoteTimer > 0) {
        // Jump-cancel slide (COD muscle memory).
        if (engine.slideTimer > 0) {
          engine.slideTimer = 0;
          if (engine.slideForcedCrouch) {
            engine.state.isCrouchingToggled = false;
            engine.slideForcedCrouch = false;
          }
        }
        engine.playerVel.y = 5.55;
        engine.isGrounded = false;
        engine.coyoteTimer = 0;
        engine.jumpBufferTimer = 0;
        engine.cameraFovPunch = Math.min((engine.cameraFovPunch || 0) + 1.8, 5);
        soundEngine.playPlayerJump();
      }

      // Gravity
      engine.playerVel.y -= 15.5 * dt;
    }

    // 5. Move & Resolve Colliders (Dust2 / Assault 3D Triangle Spatial Hash or AABB Boxes)
    const radius =
      activeLadder ||
      engine.state.stance === 'CROUCH' ||
      engine.state.stance === 'PRONE' ||
      lowCeilingAbove
        ? 0.26
        : 0.34;

    const currentHeight =
      engine.state.stance === 'SLIDE'
        ? 0.90
        : engine.state.stance === 'PRONE'
          ? 0.45
          : engine.state.stance === 'CROUCH'
            ? 1.10
            : 1.72;

    const intendedX = engine.playerPos.x + engine.playerVel.x * dt;
    const intendedZ = engine.playerPos.z + engine.playerVel.z * dt;
    engine.mantleWallBlocked = false;

    if (activeGlbCollider) {
      activeGlbCollider.resolveHorizontal(
        intendedX,
        intendedZ,
        engine.playerPos.y,
        currentHeight,
        radius,
        _resolvedHoriz
      );
      const blockedDist = Math.hypot(
        _resolvedHoriz.x - intendedX,
        _resolvedHoriz.z - intendedZ
      );
      if (blockedDist > 0.04 && Math.hypot(engine.playerVel.x, engine.playerVel.z) > 0.8) {
        engine.mantleWallBlocked = true;
      }
      engine.playerPos.x = _resolvedHoriz.x;
      engine.playerPos.z = _resolvedHoriz.z;
    } else {
      const nextX = intendedX;
      if (!engine.checkHorizontalCollision(nextX, engine.playerPos.z, engine.playerPos.y, radius)) {
        engine.playerPos.x = nextX;
      } else {
        engine.playerVel.x = 0;
        engine.mantleWallBlocked = true;
      }

      const nextZ = intendedZ;
      if (!engine.checkHorizontalCollision(engine.playerPos.x, nextZ, engine.playerPos.y, radius)) {
        engine.playerPos.z = nextZ;
      } else {
        engine.playerVel.z = 0;
        engine.mantleWallBlocked = true;
      }
    }

    // Attempt mantle when jammed into a waist/chest ledge (Space / jump buffer / air into wall).
    if (tryStartMantle(engine)) {
      engine.yawObject.position.set(
        engine.playerPos.x,
        engine.playerPos.y + engine.currentEyeHeight,
        engine.playerPos.z
      );
      return;
    }

    const wasGrounded = engine.isGrounded;
    const prevY = engine.playerPos.y;
    let nextY = prevY + engine.playerVel.y * dt;

    if (activeLadder && engine.playerVel.y > 0 && nextY >= activeLadder.maxY) {
      nextY = activeLadder.maxY;
      engine.playerVel.y = 0;
      engine.playerVel.x = _forward.x * 3.0;
      engine.playerVel.z = _forward.z * 3.0;
    }

    if (activeGlbCollider && nextY > prevY) {
      const clampedY = activeGlbCollider.clampCeilingHeight(
        engine.playerPos.x,
        prevY,
        nextY,
        engine.playerPos.z,
        currentHeight
      );
      if (clampedY < nextY) {
        nextY = clampedY;
        if (engine.playerVel.y > 0) engine.playerVel.y = 0;
      }
    }

    engine.playerPos.y = nextY;

    // Find highest walkable ground underneath player
    let groundHeight = 0;
    if (activeGlbCollider) {
      groundHeight = activeGlbCollider.getGroundHeight(
        engine.playerPos.x,
        engine.playerPos.y,
        engine.playerPos.z
      );
    } else {
      for (let i = 0; i < engine.colliders.length; i++) {
        const c = engine.colliders[i];
        if (
          engine.playerPos.x + radius > c.minX &&
          engine.playerPos.x - radius < c.maxX &&
          engine.playerPos.z + radius > c.minZ &&
          engine.playerPos.z - radius < c.maxZ
        ) {
          // Allow 0.45m step-up onto stairs/crates and landing onto roofs/balconies up to 8m
          if (
            engine.playerPos.y >= c.maxY - 0.46 &&
            c.maxY > groundHeight &&
            c.maxY <= 8.0
          ) {
            groundHeight = c.maxY;
          }
        }
      }
    }

    if (
      engine.playerPos.y <= groundHeight ||
      (!activeLadder &&
        wasGrounded &&
        engine.playerVel.y <= 0 &&
        engine.playerPos.y - groundHeight < 0.35)
    ) {
      if (!wasGrounded && engine.playerVel.y < -2.0) {
        const impact = Math.min(1.4, Math.abs(engine.playerVel.y) / 8);
        engine.landingDipVel = Math.max(engine.playerVel.y * 0.045, -0.22);
        engine.cameraFovPunch = Math.min(
          (engine.cameraFovPunch || 0) + 2.2 * impact,
          7
        );
        engine.cameraShake = Math.min(
          (engine.cameraShake || 0) + 0.006 * impact,
          0.02
        );
        soundEngine.playFootstep(true, false);
      }
      engine.playerPos.y = groundHeight;
      engine.playerVel.y = 0;
      engine.isGrounded = true;
    } else if (
      groundHeight > 0 &&
      Math.abs(engine.playerPos.y - groundHeight) < 0.05
    ) {
      engine.isGrounded = true;
    } else if (engine.playerPos.y > groundHeight + 0.06) {
      engine.isGrounded = false;
    }

    // Landing spring dip (critically damped physics)
    const clampedDt = Math.min(dt, 0.033);
    engine.landingDip += engine.landingDipVel * clampedDt;
    engine.landingDipVel += -engine.landingDip * 130 * clampedDt;
    engine.landingDipVel *= Math.exp(-18 * clampedDt);
    engine.landingDip = THREE.MathUtils.clamp(engine.landingDip, -0.12, 0.04);
    if (Math.abs(engine.landingDip) < 0.0002 && Math.abs(engine.landingDipVel) < 0.001) {
      engine.landingDip = 0;
      engine.landingDipVel = 0;
    }

    // Eye height interpolation (Stand: 1.68m, Crouch: 1.08m, Slide: 0.86m, Prone: 0.42m)
    const targetEye =
      engine.state.stance === 'SLIDE'
        ? 0.86
        : engine.state.stance === 'PRONE'
          ? 0.42
          : engine.state.stance === 'CROUCH'
            ? 1.08
            : 1.68;
    engine.currentEyeHeight = THREE.MathUtils.damp(
      engine.currentEyeHeight,
      targetEye,
      14,
      dt
    );

    // Apply Yaw, Pitch, Lean Offset & Camera Roll — ADS shoulder peek reaches farther.
    const adsLeanBoost =
      (engine.state.adsAlpha ?? 0) > 0.2 || engine.state.isAds ? 1.12 : 1;
    let leanOffsetDist = engine.leanCurrent * 0.52 * adsLeanBoost;
    // Collision-safe lean: shrink offset if shoulder would clip into world.
    if (Math.abs(leanOffsetDist) > 0.04) {
      const probeX = engine.playerPos.x + _right.x * leanOffsetDist;
      const probeZ = engine.playerPos.z + _right.z * leanOffsetDist;
      const blocked = engine.checkHorizontalCollision?.(
        probeX,
        probeZ,
        engine.playerPos.y,
        0.22
      );
      if (blocked) {
        leanOffsetDist *= 0.35;
      }
    }
    const leanWorldX = engine.playerPos.x + _right.x * leanOffsetDist;
    const leanWorldZ = engine.playerPos.z + _right.z * leanOffsetDist;

    // Smooth harmonic camera trauma shake (no random white noise)
    const shakePitch = engine.cameraShake > 0.0001 ? Math.sin(engine.elapsedTime * 42) * engine.cameraShake : 0;
    const shakeYaw = engine.cameraShake > 0.0001 ? Math.cos(engine.elapsedTime * 34) * engine.cameraShake * 0.5 : 0;

    // Mantle camera pitch kick (pull-up look).
    if (typeof engine.mantleCamPitch === 'number' && engine.mantleCamPitch !== 0) {
      engine.mantleCamPitch = THREE.MathUtils.damp(engine.mantleCamPitch, 0, 9, dt);
      if (Math.abs(engine.mantleCamPitch) < 0.0004) engine.mantleCamPitch = 0;
    } else {
      engine.mantleCamPitch = 0;
    }

    // Head bob / slide roll applied after walkBobPhase advances in weapon kinematics;
    // stash base pose here, kinematics finishes camera polish.
    const slideProgress =
      engine.slideTimer > 0 ? Math.min(1, engine.slideTimer / 0.72) : 0;
    const slideRoll = slideProgress > 0 ? -0.14 * (0.35 + 0.65 * slideProgress) : 0;
    // Stronger lean roll when ADS (reads as shoulder peek).
    const leanRollAmt =
      ((engine.state.adsAlpha ?? 0) > 0.35 ? 0.3 : 0.24) * engine.leanCurrent;
    engine.cameraBaseRoll = -leanRollAmt + slideRoll;
    engine.camera.rotation.z = engine.cameraBaseRoll;

    engine.yawObject.position.set(
      leanWorldX,
      engine.playerPos.y + engine.currentEyeHeight + engine.landingDip,
      leanWorldZ
    );
    engine.yawObject.rotation.y = engine.yaw + shakeYaw;
    engine.pitchObject.rotation.x =
      engine.pitch + shakePitch + (engine.mantleCamPitch || 0);

    engine.cameraShake = THREE.MathUtils.damp(engine.cameraShake, 0, 24, dt);
    if (typeof engine.cameraFovPunch === 'number' && engine.cameraFovPunch > 0) {
      engine.cameraFovPunch = THREE.MathUtils.damp(engine.cameraFovPunch, 0, 10, dt);
    }
}
