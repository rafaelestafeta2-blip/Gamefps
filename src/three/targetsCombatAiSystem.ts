import * as THREE from 'three';
import { playRealPlayerHitGrunt } from '../audio/characterAndBombAudio';
import {
  playSpatialBotGunshot,
  updateSpatialBotFootstepsAndHeartbeat,
} from '../audio/spatialCombatAudio';
import { soundEngine } from '../audio/soundEngine';
import { mobileHardware } from '../mobile/nativeHardware';
import { isOnlineMatchActive } from '../multiplayer/onlineRoomService';
import { addPlayerCash } from '../progression/ranks';
import { canGrantMatchProgressionRewards } from '../progression/matchProgressionGate';
import {
  alertBotsToPlayerFootsteps,
  updateSmartBotNavigation,
} from './botNavigationSystem';
import {
  triggerBotFireAnimation,
  triggerBotHitAnimation,
  updateAllBotCharacters,
} from './botCharacterSystem';
import { _worldPos } from './engineMathTemps';
import {
  enforceUnusedBotVisibility,
  syncOnlineMatchFrame,
} from './onlineMatchSync';
import { YardBotEntity } from './yardPropsBuilder';
import { applyPlayerCombatDamage } from './classSupportSystem';


/**
 * Extracted from TacticalFPSEngine.updateTargetsAndCombatAI — behavior preserved.
 * `engine` is the live TacticalFPSEngine instance (cast at call site).
 */
export function updateTargetsAndCombatAI(engine: any, dt: number): void {
    engine.camera.getWorldPosition(_worldPos);

    for (let i = 0; i < engine.targets.length; i++) {
      const t = engine.targets[i];

      // 1. Patrol Motion on Active Range Rail Targets Only (COMBAT_BOT uses full AI pursuit!)
      if (t.type !== 'COMBAT_BOT' && !t.isDown && t.patrolAxis !== 'NONE' && t.patrolSpeed > 0) {
        const offset =
          Math.sin(engine.elapsedTime * t.patrolSpeed * 1.45 + t.patrolOffset) *
          t.patrolRange;
        if (t.patrolAxis === 'X') {
          t.root.position.x = t.basePosition.x + offset;
        } else {
          t.root.position.z = t.basePosition.z + offset;
        }
      }

      // 2. Pop-Up Recovery in Free Range Mode
      if (t.isDown) {
        if (!t.root.userData?.hasSkeletalCharacter) {
          t.pivotGroup.rotation.x = THREE.MathUtils.damp(
            t.pivotGroup.rotation.x,
            -Math.PI / 2,
            14,
            dt
          );
        }
        if (engine.state.drillMode === 'FREE_RANGE') {
          t.downTimer -= dt;
          if (t.downTimer <= 0) {
            t.isDown = false;
            t.health = t.maxHealth;
            t.armorHealth = t.armorMesh ? 60 : 0;
            if (t.armorMesh) t.armorMesh.visible = true;
            soundEngine.playMechanicalSwitch(0.85);
          }
        }
        continue;
      }

      // Spring-damper reactive impact wobble when standing (paper/steel targets)
      t.hitTiltAngle += t.hitTiltVelocity * dt;
      t.hitTiltVelocity += -t.hitTiltAngle * 145 * dt;
      t.hitTiltVelocity *= Math.exp(-9 * dt);
      if (!t.root.userData?.hasSkeletalCharacter) {
        t.pivotGroup.rotation.x = t.hitTiltAngle;
      }
    }

    // 3. Sistema Tático de Navegação, Ronda e Perseguição Implacável (5v5 Bomb, Tactical Wave e Killhouse)
    const isBombMode =
      engine.state.drillMode === 'YARD_BOMB_5V5' ||
      engine.state.drillMode === 'DUST2_BOMB_5V5' ||
      engine.state.drillMode === 'ASSAULT_BOMB_5V5' ||
      engine.state.drillMode === 'INDUSTRIA_BOMB_5V5' ||
      engine.state.drillMode === 'HANGAR_BOMB_5V5';

    if (engine.state.drillMode !== 'FREE_RANGE' && engine.targets.length > 0) {
      if (isOnlineMatchActive()) {
        syncOnlineMatchFrame({
          dt,
          targets: engine.targets as YardBotEntity[],
          shootableMeshes: engine.shootableMeshes,
          playerPos: _worldPos,
          yaw: engine.yaw,
          pitch: engine.pitch,
          activeWeapon: engine.state.activeWeapon,
          health: engine.state.health,
          isPlayerDead:
            engine.isPlayerDying ||
            Boolean(engine.playerDeathTp?.isActive()) ||
            engine.state.health <= 0,
          isCrouching:
            engine.state.stance === 'CROUCH' || engine.state.stance === 'PRONE',
          isFiring: engine.fireCooldown > 0,
          yardBombSystem: engine.yardBombSystem,
          isBombMode,
          getGroundHeight: (x, y, z) => engine.getCurrentGroundHeight(x, y, z),
        });
        if (isBombMode) {
          engine.state.yardBomb = { ...engine.yardBombSystem.info };
        }
      } else {
        const activeGlbCollider =
          engine.state.drillMode === 'DUST2_BOMB_5V5'
            ? engine.dust2LevelData.collider
            : engine.state.drillMode === 'ASSAULT_BOMB_5V5'
              ? engine.assaultLevelData.collider
              : engine.state.drillMode === 'INDUSTRIA_BOMB_5V5'
                ? engine.industriaLevelData.collider
                : null;

        const playerAlive =
          engine.state.health > 0 &&
          !engine.isPlayerDying &&
          !engine.playerDeathTp?.isActive();

        // Footsteps → nearby enemies investigate frozen LKP (no LOS / wallhack).
        const horizSpd = Math.hypot(engine.playerVel?.x || 0, engine.playerVel?.z || 0);
        const isMoving =
          playerAlive &&
          horizSpd > 0.85 &&
          !engine.state.isProneToggled &&
          engine.state.stance !== 'PRONE';
        const isSprinting = isMoving && engine.state.stance === 'SPRINT';
        if (isMoving) {
          engine._botFootstepHearTimer =
            (engine._botFootstepHearTimer || 0) - dt;
          if (engine._botFootstepHearTimer <= 0) {
            engine._botFootstepHearTimer = isSprinting ? 0.34 : 0.55;
            alertBotsToPlayerFootsteps(
              engine.targets,
              _worldPos,
              isSprinting,
              true
            );
          }
        } else {
          engine._botFootstepHearTimer = 0;
        }

        updateSmartBotNavigation(
          engine.targets as YardBotEntity[],
          engine.state.drillMode,
          _worldPos,
          engine.yaw,
          dt,
          engine.yardBombSystem,
          engine.fxPool,
          engine.grenadeSystem,
          (dmg, isHeadshot, bot) => {
            if (engine.isPlayerDying || engine.playerDeathTp?.isActive()) return;
            if (isHeadshot) {
              soundEngine.playImpact('HEADSHOT');
            } else {
              soundEngine.playImpact('TORSO');
            }
            mobileHardware.vibrateDamage();
            playRealPlayerHitGrunt(isHeadshot);
            applyPlayerCombatDamage(engine, dmg, isHeadshot);
            engine.state.damageFlashAlpha = isHeadshot ? 0.95 : 0.75;
            {
              const flinchMod =
                engine.state.activeWeapon === 'SNIPER_BOLT' ||
                engine.state.activeWeapon === 'SNIPER_TACTICAL'
                  ? 1.25
                  : engine.state.activeWeapon === 'L49_LMG'
                    ? 1.15
                    : 1.0;
              engine.cameraShake = (isHeadshot ? 0.024 : 0.012) * flinchMod;
              engine.pitch = Math.max(
                -Math.PI * 0.46,
                Math.min(
                  Math.PI * 0.46,
                  engine.pitch - (isHeadshot ? 0.018 : 0.01) * flinchMod
                )
              );
            }

            if (engine.state.health <= 0) {
              engine.triggerPlayerDeathSequence(
                isHeadshot,
                bot.callsign || 'KRAKEN-BT',
                'BLACKTHORN',
                bot.weaponId || 'AK47_RIFLE',
                () => {
                  if (!isBombMode) {
                    engine.state.screen = 'GAME_OVER';
                    engine.emitHud();
                    return;
                  }
                  const specBot = engine.playerDeathTp.startSpectating(
                    engine.targets as YardBotEntity[]
                  );
                  if (specBot && engine.yardBombSystem.info.roundState === 'PLAYING') {
                    engine.yardBombSystem.info.isSpectating = true;
                    engine.yardBombSystem.info.spectatedCallsign =
                      specBot.callsign || 'VANGUARD-02';
                    engine.yardBombSystem.info.spectatedWeapon =
                      specBot.weaponId || 'M4_CARBINE';
                    engine.yardBombSystem.info.spectatedHealth = Math.max(0, specBot.health);
                    engine.state.damageFlashAlpha = 0;
                  } else if (engine.yardBombSystem.info.bombStatus !== 'PLANTED') {
                    engine.yardBombSystem.finishCurrentRound(
                      'BLACKTHORN',
                      isHeadshot
                        ? 'ESQUADRÃO VANGUARD ELIMINADO COM HEADSHOT CRÍTICO!'
                        : 'ESQUADRÃO VANGUARD NEUTRALIZADO EM COMBATE!',
                      (xp: number, cash: number) => {
                        engine.addPlayerXp(xp);
                        if (canGrantMatchProgressionRewards() && cash > 0) {
                          addPlayerCash(cash);
                        }
                        engine.state.score += xp;
                      }
                    );
                  }
                  engine.state.yardBomb = { ...engine.yardBombSystem.info };
                  engine.emitHud();
                },
                bot.root.position
              );
            }
            engine.emitHud();
          },
          engine.colliders,
          activeGlbCollider,
          playerAlive,
          engine.registerKill.bind(engine)
        );
      }
    }

    // 3.8. Áudio Tático 3D Estilo Call of Duty: Passos de Inimigos por Proximidade + Batimento Cardíaco
    if (engine.state.drillMode !== 'FREE_RANGE') {
      const activeGlbCollider =
        engine.state.drillMode === 'DUST2_BOMB_5V5'
          ? engine.dust2LevelData.collider
          : engine.state.drillMode === 'ASSAULT_BOMB_5V5'
            ? engine.assaultLevelData.collider
            : engine.state.drillMode === 'INDUSTRIA_BOMB_5V5'
              ? engine.industriaLevelData.collider
              : engine.state.drillMode === 'HANGAR_BOMB_5V5'
                ? engine.hangarLevelData.collider
                : null;
      updateSpatialBotFootstepsAndHeartbeat(
        engine.targets,
        _worldPos,
        engine.yaw,
        engine.state.health,
        engine.isPlayerDying || engine.playerDeathTp?.isActive() || engine.state.health <= 0,
        dt,
        engine.grenadeSystem,
        engine.colliders,
        activeGlbCollider
      );
    }

    // 4. Update Pro.Rifle.Pack.glb 3D Skeletal Bot Mixers & State Machines
    if (engine.state.drillMode !== 'FREE_RANGE') {
      updateAllBotCharacters(
        engine.targets,
        _worldPos,
        dt,
        engine.isSoftwareGl
      );
      if (isOnlineMatchActive()) {
        enforceUnusedBotVisibility(engine.targets as YardBotEntity[]);
      }
    }
}
