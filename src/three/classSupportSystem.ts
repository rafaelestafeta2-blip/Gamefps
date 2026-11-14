/**
 * Warface-style class support:
 * - FUZILEIRO: ammo crate (self + nearby allies)
 * - MEDICO: heal (self + allies) + defibrillator revive
 * - ENGENHEIRO: armor kit (self + allies)
 *
 * Online: local player abilities work on local ally bots; remote player
 * heal/revive sync is not implemented (see report gaps).
 */

import * as THREE from 'three';
import { WarfaceClassId } from '../components/WarfaceClassIcons';
import { getClassCombatModifiers, getPlayerInventoryState } from '../progression/loadoutSystem';
import { soundEngine } from '../audio/soundEngine';
import { YardBotEntity } from './yardPropsBuilder';

export const REVIVE_WINDOW_SEC = 40;
export const REVIVE_RANGE_M = 1.85;
export const REVIVE_CHARGE_SEC = 2.45;
export const SUPPORT_RANGE_M = 2.6;

export type ClassSupportKind = 'AMMO' | 'HEAL' | 'ARMOR' | 'NONE';

export interface ReviveMarkerHud {
  id: string;
  callsign: string;
  /** Screen-space hint: angle from player look yaw to body (rad). */
  bearingRad: number;
  distanceM: number;
  remainingSec: number;
  inRange: boolean;
}

export interface ClassSupportRuntime {
  classId: WarfaceClassId;
  kind: ClassSupportKind;
  charges: number;
  maxCharges: number;
  cooldownSec: number;
  reviveCharge: number;
  reviveTargetId: string | null;
  holdingSupport: boolean;
  cprGestureStarted: boolean;
}

const _toAlly = new THREE.Vector3();

export function supportKindForClass(classId: WarfaceClassId): ClassSupportKind {
  if (classId === 'FUZILEIRO') return 'AMMO';
  if (classId === 'MEDICO') return 'HEAL';
  if (classId === 'ENGENHEIRO') return 'ARMOR';
  return 'NONE';
}

export function maxChargesForClass(classId: WarfaceClassId): number {
  if (classId === 'FUZILEIRO') return 2;
  if (classId === 'MEDICO') return 4;
  if (classId === 'ENGENHEIRO') return 3;
  return 0;
}

export function createClassSupportRuntime(
  classId: WarfaceClassId = getPlayerInventoryState().selectedClass
): ClassSupportRuntime {
  return {
    classId,
    kind: supportKindForClass(classId),
    charges: maxChargesForClass(classId),
    maxCharges: maxChargesForClass(classId),
    cooldownSec: 0,
    reviveCharge: 0,
    reviveTargetId: null,
    holdingSupport: false,
    cprGestureStarted: false,
  };
}

export function resetClassSupportForRound(engine: any): void {
  const classId = getPlayerInventoryState().selectedClass;
  const mods = getClassCombatModifiers(classId);
  engine.classSupport = createClassSupportRuntime(classId);
  engine.state.playerClass = classId;
  engine.state.supportKind = engine.classSupport.kind;
  engine.state.supportCharges = engine.classSupport.charges;
  engine.state.supportMaxCharges = engine.classSupport.maxCharges;
  engine.state.supportCooldownSec = 0;
  engine.state.reviveChargeProgress = 0;
  engine.state.reviveMarkers = [];
  engine.state.supportPrompt = '';
  engine.state.maxArmor = Math.max(0, mods.armorBonus);
  engine.state.armor = engine.state.maxArmor;
  // HP no longer folds armor into the bar.
  engine.state.maxHealth = mods.totalMaxHealth;
  engine.state.health = mods.totalMaxHealth;
}

/** Apply damage with armor absorption (Warface-ish vest soak). */
export function applyPlayerCombatDamage(
  engine: any,
  rawDamage: number,
  isHeadshot: boolean
): void {
  let dmg = rawDamage;
  const reduction = isHeadshot
    ? (getClassCombatModifiers().headshotReductionPct || 0) / 100
    : 0;
  if (reduction > 0 && isHeadshot) {
    dmg *= 1 - Math.min(0.55, reduction);
  }

  let remaining = dmg;
  const armor = engine.state.armor ?? 0;
  if (armor > 0) {
    const soakMult = isHeadshot ? 0.45 : 0.8;
    const absorbed = Math.min(armor, remaining * soakMult);
    engine.state.armor = Math.max(0, armor - absorbed);
    remaining = Math.max(0, remaining - absorbed);
  }
  engine.state.health = Math.max(0, engine.state.health - remaining);
}

function isBombMode(mode: string): boolean {
  return (
    mode === 'YARD_BOMB_5V5' ||
    mode === 'DUST2_BOMB_5V5' ||
    mode === 'ASSAULT_BOMB_5V5'
  );
}

function allyBots(engine: any): YardBotEntity[] {
  return (engine.targets as YardBotEntity[]).filter(
    (t) => t.type === 'COMBAT_BOT' && t.isAlly
  );
}

function distTo(engine: any, bot: YardBotEntity): number {
  return Math.hypot(
    bot.root.position.x - engine.playerPos.x,
    bot.root.position.z - engine.playerPos.z
  );
}

function nearestLivingAlly(engine: any, maxDist: number): YardBotEntity | null {
  let best: YardBotEntity | null = null;
  let bestD = maxDist;
  const allies = allyBots(engine);
  for (let i = 0; i < allies.length; i++) {
    const a = allies[i];
    if (a.isDown || a.health <= 0) continue;
    const d = distTo(engine, a);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best;
}

function nearestDownedAlly(engine: any, maxDist: number): YardBotEntity | null {
  let best: YardBotEntity | null = null;
  let bestD = maxDist;
  const now = performance.now() / 1000;
  const allies = allyBots(engine);
  for (let i = 0; i < allies.length; i++) {
    const a = allies[i];
    if (!a.isDown) continue;
    const until = a.reviveUntilSec ?? 0;
    if (until > 0 && now > until) continue;
    const d = distTo(engine, a);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best;
}

function resupplySelfMags(engine: any): void {
  const cap = engine.state.magCapacity;
  engine.state.magazines =
    engine.state.activeWeapon === 'L49_LMG'
      ? [cap, cap, cap]
      : [cap, cap, cap, cap];
  engine.state.currentMagRounds = cap;
  engine.state.chambered = 1;
  engine.state.boltLockedBack = false;
}

function resupplyAllyAmmo(bot: YardBotEntity): void {
  // Ally bots don't track mag counts — bump a soft "ammo ready" flag + health-neutral feedback.
  bot.root.userData.ammoResuppliedAt = performance.now();
}

function healTarget(engine: any, bot: YardBotEntity | null, amount: number): void {
  if (bot) {
    bot.health = Math.min(bot.maxHealth, bot.health + amount);
  } else {
    engine.state.health = Math.min(
      engine.state.maxHealth,
      engine.state.health + amount
    );
  }
}

function armorTarget(engine: any, bot: YardBotEntity | null, amount: number): void {
  if (bot) {
    const maxA = bot.armorMesh ? 60 : 40;
    bot.armorHealth = Math.min(maxA, (bot.armorHealth || 0) + amount);
    if (bot.armorMesh && bot.armorHealth > 0) bot.armorMesh.visible = true;
  } else {
    engine.state.armor = Math.min(
      engine.state.maxArmor,
      (engine.state.armor || 0) + amount
    );
  }
}

/**
 * Mark ally corpse for Warface revive window when they go down in bomb modes.
 */
export function markAllyDownForRevive(bot: YardBotEntity, drillMode: string): void {
  if (!bot.isAlly) return;
  if (!isBombMode(drillMode)) {
    bot.reviveUntilSec = 0;
    bot.reviveExpired = false;
    return;
  }
  const now = performance.now() / 1000;
  bot.reviveUntilSec = now + REVIVE_WINDOW_SEC;
  bot.reviveExpired = false;
  bot.root.visible = true;
}

export function reviveAllyBot(engine: any, bot: YardBotEntity): void {
  bot.isDown = false;
  bot.downTimer = 0;
  bot.health = Math.round(bot.maxHealth * 0.55);
  bot.armorHealth = bot.armorMesh ? 20 : 0;
  if (bot.armorMesh) bot.armorMesh.visible = bot.armorHealth > 0;
  bot.lastDeathWasHeadshot = false;
  bot.reviveUntilSec = 0;
  bot.reviveExpired = false;
  bot.root.visible = true;
  bot.pivotGroup.position.y = 0;
  bot.pivotGroup.rotation.x = 0;
  const ctrl = bot.root.userData?.botAnimCtrl;
  if (ctrl) {
    ctrl.deathElapsed = 0;
    ctrl.currentState = 'RIFLE_IDLE';
  }
  if (engine.yardBombSystem?.info) {
    // alliesAlive recount happens in bomb tick; nudge score feel
    engine.state.score += 75;
  }
  soundEngine.playMechanicalSwitch(1.1);
  engine.state.reloadTypeLabel = `${bot.callsign || 'ALIADO'} REANIMADO`;
  engine.magCheckTimer = 1.8;
}

/**
 * Press/tap class support once (ammo/heal/armor). Revive uses hold via setSupportHeld.
 */
export function useClassSupport(engine: any): void {
  if (engine.state.screen !== 'PLAYING') return;
  if (engine.isPlayerDying || engine.state.health <= 0) return;
  if (engine.state.reloadPhase !== 'IDLE' && engine.classSupport?.kind !== 'HEAL') return;

  const cs = engine.classSupport as ClassSupportRuntime | undefined;
  if (!cs || cs.kind === 'NONE') {
    engine.state.reloadTypeLabel = 'CLASSE SEM KIT DE SUPORTE';
    engine.magCheckTimer = 1.2;
    engine.emitHud?.(true);
    return;
  }
  if (cs.cooldownSec > 0) {
    engine.state.reloadTypeLabel = `KIT EM RECARGA (${cs.cooldownSec.toFixed(1)}s)`;
    engine.magCheckTimer = 1.0;
    engine.emitHud?.(true);
    return;
  }

  // Medic near a downed ally: start/continue defibrillator (hold).
  if (cs.kind === 'HEAL') {
    const downed = nearestDownedAlly(engine, REVIVE_RANGE_M);
    if (downed) {
      cs.holdingSupport = true;
      cs.reviveTargetId = downed.id;
      engine.state.supportPrompt = 'MANTENHA PARA DESFIBRILAR';
      engine.emitHud?.(true);
      return;
    }
  }

  if (cs.charges <= 0) {
    engine.state.reloadTypeLabel = 'SEM CARGAS DE SUPORTE — PRÓXIMA RODADA';
    engine.magCheckTimer = 1.4;
    soundEngine.playMechanicalSwitch(0.7);
    engine.emitHud?.(true);
    return;
  }

  const ally = nearestLivingAlly(engine, SUPPORT_RANGE_M);
  let usedOn: 'SELF' | 'ALLY' = 'SELF';

  if (cs.kind === 'AMMO') {
    // Prefer ally if nearby and "needs" ammo (always allow); else self.
    if (ally) {
      resupplyAllyAmmo(ally);
      usedOn = 'ALLY';
      // Also top off self lightly when sharing crate.
      resupplySelfMags(engine);
      engine.state.reloadTypeLabel = `CAIXA DE MUNIÇÃO → ${ally.callsign || 'ALIADO'} + VOCÊ`;
    } else {
      resupplySelfMags(engine);
      engine.state.fragGrenades = Math.min(3, engine.state.fragGrenades + 1);
      engine.state.reloadTypeLabel = `CAIXA DE MUNIÇÃO — PENTES CHEIOS (${engine.state.magCapacity})`;
    }
    soundEngine.playReloadStage('MAG_IN');
  } else if (cs.kind === 'HEAL') {
    const needSelf = engine.state.health < engine.state.maxHealth - 1;
    const needAlly = ally && ally.health < ally.maxHealth - 1;
    if (needAlly && ally) {
      healTarget(engine, ally, 55);
      usedOn = 'ALLY';
      engine.state.reloadTypeLabel = `KIT MÉDICO → ${ally.callsign || 'ALIADO'} (+55 HP)`;
    } else if (needSelf) {
      healTarget(engine, null, 45);
      engine.state.reloadTypeLabel = 'KIT MÉDICO — +45 HP';
    } else {
      engine.state.reloadTypeLabel = 'NENHUM ALVO PRECISA DE CURA';
      engine.magCheckTimer = 1.1;
      engine.emitHud?.(true);
      return;
    }
    soundEngine.playMechanicalSwitch(1.05);
  } else if (cs.kind === 'ARMOR') {
    const needSelf = (engine.state.armor || 0) < engine.state.maxArmor - 1;
    const needAlly = ally && (ally.armorHealth || 0) < 55;
    if (needAlly && ally) {
      armorTarget(engine, ally, 45);
      usedOn = 'ALLY';
      engine.state.reloadTypeLabel = `KIT BLINDAGEM → ${ally.callsign || 'ALIADO'}`;
    } else if (needSelf) {
      armorTarget(engine, null, 40);
      engine.state.reloadTypeLabel = 'KIT BLINDAGEM — COLETE REPARADO';
    } else {
      engine.state.reloadTypeLabel = 'COLETE JÁ NO MÁXIMO';
      engine.magCheckTimer = 1.1;
      engine.emitHud?.(true);
      return;
    }
    soundEngine.playMechanicalSwitch(1.0);
  }

  cs.charges -= 1;
  cs.cooldownSec = usedOn === 'ALLY' ? 1.25 : 2.0;
  engine.state.supportCharges = cs.charges;
  engine.state.supportCooldownSec = cs.cooldownSec;
  engine.magCheckTimer = 1.6;
  engine.emitHud?.(true);
  void usedOn;
}

export function setClassSupportHeld(engine: any, held: boolean): void {
  const cs = engine.classSupport as ClassSupportRuntime | undefined;
  if (!cs) return;
  cs.holdingSupport = held;
  if (!held) {
    cs.reviveCharge = 0;
    cs.reviveTargetId = null;
    cs.cprGestureStarted = false;
    engine.state.reviveChargeProgress = 0;
    if (engine.state.supportPrompt === 'MANTENHA PARA DESFIBRILAR') {
      engine.state.supportPrompt = '';
    }
  }
}

export function updateClassSupport(engine: any, dt: number): void {
  const cs = engine.classSupport as ClassSupportRuntime | undefined;
  if (!cs) return;

  if (cs.cooldownSec > 0) {
    cs.cooldownSec = Math.max(0, cs.cooldownSec - dt);
    engine.state.supportCooldownSec = cs.cooldownSec;
  }

  engine.state.supportCharges = cs.charges;
  engine.state.supportKind = cs.kind;
  engine.state.playerClass = cs.classId;

  // Expire / keep ally corpses for revive window.
  const now = performance.now() / 1000;
  const allies = allyBots(engine);
  const markers: ReviveMarkerHud[] = [];
  const isMedic = cs.kind === 'HEAL';
  const playerAlive =
    engine.state.health > 0 &&
    !engine.isPlayerDying &&
    !engine.playerDeathTp?.isActive();

  for (let i = 0; i < allies.length; i++) {
    const a = allies[i];
    if (!a.isDown) {
      a.reviveUntilSec = 0;
      a.reviveExpired = false;
      continue;
    }

    // Ensure bomb-mode downs get a window if not stamped yet.
    if (isBombMode(engine.state.drillMode) && !a.reviveUntilSec && !a.reviveExpired) {
      markAllyDownForRevive(a, engine.state.drillMode);
    }

    const until = a.reviveUntilSec || 0;
    if (until > 0 && now >= until) {
      a.reviveExpired = true;
      a.reviveUntilSec = 0;
      a.root.visible = false;
      continue;
    }

    if (a.reviveExpired) {
      a.root.visible = false;
      continue;
    }

    // Keep corpse visible during window (overrides death fade hide).
    if (until > 0) {
      a.root.visible = true;
    }

    if (!isMedic || !playerAlive) continue;

    const remaining = Math.max(0, until - now);
    const d = distTo(engine, a);
    _toAlly.set(
      a.root.position.x - engine.playerPos.x,
      0,
      a.root.position.z - engine.playerPos.z
    );
    const bearing = Math.atan2(-_toAlly.x, -_toAlly.z) - engine.yaw;
    markers.push({
      id: a.id,
      callsign: a.callsign || 'ALIADO',
      bearingRad: bearing,
      distanceM: d,
      remainingSec: remaining,
      inRange: d <= REVIVE_RANGE_M,
    });
  }

  engine.state.reviveMarkers = isMedic ? markers : [];

  // Defibrillator charge while held near body.
  if (cs.kind === 'HEAL' && cs.holdingSupport && playerAlive) {
    const target =
      (cs.reviveTargetId
        ? allies.find((a) => a.id === cs.reviveTargetId)
        : null) || nearestDownedAlly(engine, REVIVE_RANGE_M);

    if (target && !target.reviveExpired && (target.reviveUntilSec || 0) > now) {
      cs.reviveTargetId = target.id;
      cs.reviveCharge = Math.min(1, cs.reviveCharge + dt / REVIVE_CHARGE_SEC);
      engine.state.reviveChargeProgress = cs.reviveCharge;
      engine.state.supportPrompt = `DESFIBRILADOR ${Math.round(cs.reviveCharge * 100)}%`;

      if (cs.reviveCharge >= 1) {
        reviveAllyBot(engine, target);
        cs.reviveCharge = 0;
        cs.holdingSupport = false;
        cs.reviveTargetId = null;
        cs.cooldownSec = 3.5;
        engine.state.reviveChargeProgress = 0;
        engine.state.supportPrompt = '';
        engine.state.supportCooldownSec = cs.cooldownSec;
        // Revive does not spend a medkit charge (Warface defibrillator is separate).
      } else if (!cs.cprGestureStarted && cs.reviveCharge > 0.05) {
        cs.cprGestureStarted = true;
        try {
          engine.playerGesture?.playCpr?.(target.root.position, engine.yaw);
        } catch {
          /* optional */
        }
      }
    } else {
      cs.reviveCharge = 0;
      cs.cprGestureStarted = false;
      engine.state.reviveChargeProgress = 0;
      if (!nearestDownedAlly(engine, REVIVE_RANGE_M)) {
        cs.holdingSupport = false;
        engine.state.supportPrompt = '';
      }
    }
  } else if (cs.kind === 'HEAL') {
    // Soft prompt when downed ally exists but out of range.
    const anyDown = markers[0];
    if (anyDown && !cs.holdingSupport) {
      engine.state.supportPrompt = anyDown.inRange
        ? 'TOQUE/SEGURE [U] PARA REANIMAR'
        : `ALIADO CAÍDO · ${anyDown.distanceM.toFixed(0)}m · ${Math.ceil(anyDown.remainingSec)}s`;
    } else if (!markers.length && engine.state.supportPrompt.startsWith('ALIADO')) {
      engine.state.supportPrompt = '';
    }
  }
}
