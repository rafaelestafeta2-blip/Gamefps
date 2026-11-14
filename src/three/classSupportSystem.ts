/**
 * Warface-style class support:
 * - FUZILEIRO: ammo crate (self + allies)
 * - MEDICO: heal (self + allies) + defibrillator revive
 * - ENGENHEIRO: armor kit (self + allies)
 *
 * Online: CLASS_SUPPORT WebSocket syncs heal/ammo/armor/revive to remotes.
 * Local player downed state is reviveable for ~40s (bot or teammate medic).
 */

import * as THREE from 'three';
import { WarfaceClassId } from '../components/WarfaceClassIcons';
import { getClassCombatModifiers, getPlayerInventoryState } from '../progression/loadoutSystem';
import { soundEngine } from '../audio/soundEngine';
import {
  getLocalOnlinePlayerState,
  isOnlineMatchActive,
  publishClassSupportEvent,
} from '../multiplayer/onlineRoomService';
import { YardBotEntity } from './yardPropsBuilder';
import {
  getKitUseTimings,
  KIT_CHANNEL_TOTAL_SEC,
} from './mixamoAnimPackLoader';

export const REVIVE_WINDOW_SEC = 40;
export const REVIVE_RANGE_M = 1.85;
export const REVIVE_CHARGE_SEC = 2.45;
export const SUPPORT_RANGE_M = 2.6;
/** Edge markers for class-relevant ally needs (HP / ammo / armor). */
export const ALLY_NEED_INDICATOR_RANGE_M = 26;
const ALLY_NEED_HP_FRAC = 0.65;
const ALLY_NEED_ARMOR = 40;
const ALLY_NEED_AMMO = 28;
const ALLY_AMMO_FULL = 100;
/** Warface-style kit apply channel (self or ally). */
export const KIT_USE_CHANNEL_SEC = KIT_CHANNEL_TOTAL_SEC;
const KIT_CANCEL_MOVE_M = 0.55;

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

export type AllyNeedKind = 'HP' | 'AMMO' | 'ARMOR';

export interface AllyNeedMarkerHud {
  id: string;
  callsign: string;
  need: AllyNeedKind;
  bearingRad: number;
  distanceM: number;
  /** 0..1 severity (1 = critical). */
  severity: number;
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
  /** ~15s ammo/heal/armor channel in progress. */
  kitChannelActive: boolean;
  kitChannelElapsed: number;
  kitChannelDuration: number;
  kitChannelTarget: 'SELF' | 'ALLY' | null;
  kitChannelAllyId: string | null;
  kitChannelStartX: number;
  kitChannelStartZ: number;
  kitChannelHpAtStart: number;
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
    kitChannelActive: false,
    kitChannelElapsed: 0,
    kitChannelDuration: KIT_USE_CHANNEL_SEC,
    kitChannelTarget: null,
    kitChannelAllyId: null,
    kitChannelStartX: 0,
    kitChannelStartZ: 0,
    kitChannelHpAtStart: 100,
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
  engine.state.allyNeedMarkers = [];
  engine.state.supportPrompt = '';
  engine.state.kitChannelProgress = 0;
  engine.state.maxArmor = Math.max(0, mods.armorBonus);
  engine.state.armor = engine.state.maxArmor;
  // HP no longer folds armor into the bar.
  engine.state.maxHealth = mods.totalMaxHealth;
  engine.state.health = mods.totalMaxHealth;
}

/** Cancel in-progress ammo/heal/armor channel (move / damage / death). */
export function cancelKitChannel(
  engine: any,
  reason = 'cancelado'
): void {
  const cs = engine.classSupport as ClassSupportRuntime | undefined;
  if (!cs?.kitChannelActive) return;
  const kind = cs.kind;
  const allyId = cs.kitChannelAllyId;
  cs.kitChannelActive = false;
  cs.kitChannelElapsed = 0;
  cs.kitChannelTarget = null;
  cs.kitChannelAllyId = null;
  engine.state.kitChannelProgress = 0;
  if (
    engine.state.supportPrompt?.startsWith('APLICANDO') ||
    engine.state.supportPrompt?.startsWith('USANDO')
  ) {
    engine.state.supportPrompt = '';
  }
  engine.state.reloadTypeLabel = `KIT ${reason.toUpperCase()}`;
  engine.magCheckTimer = 1.1;
  try {
    engine.classKitProps?.hide?.();
    engine.playerGesture?.stop?.();
  } catch {
    /* optional */
  }
  if (kind !== 'NONE' && isOnlineMatchActive()) {
    const targetUid =
      allyId ||
      getLocalOnlinePlayerState()?.uid ||
      '';
    if (targetUid) {
      publishClassSupportEvent(targetUid, kind, 0, 'CANCEL');
    }
  }
  engine.emitHud?.(true);
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
  // Warface-like: taking damage interrupts kit channel.
  if (dmg > 0.25) {
    cancelKitChannel(engine, 'interrompido (dano)');
  }
}

function isBombMode(mode: string): boolean {
  return (
    mode === 'YARD_BOMB_5V5' ||
    mode === 'DUST2_BOMB_5V5' ||
    mode === 'ASSAULT_BOMB_5V5' ||
    mode === 'INDUSTRIA_BOMB_5V5' ||
    mode === 'HANGAR_BOMB_5V5'
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

function ensureAllyAmmoReserve(bot: YardBotEntity): number {
  const cur = bot.root.userData.ammoReserve;
  if (typeof cur !== 'number' || Number.isNaN(cur)) {
    bot.root.userData.ammoReserve = ALLY_AMMO_FULL;
    return ALLY_AMMO_FULL;
  }
  return cur;
}

/** Soft ammo drain for ally need indicators (bots + remotes). */
export function drainAllyAmmoReserve(bot: YardBotEntity, rounds = 1): void {
  if (!bot.isAlly || bot.isDown) return;
  const cur = ensureAllyAmmoReserve(bot);
  bot.root.userData.ammoReserve = Math.max(0, cur - rounds);
}

function resupplyAllyAmmo(bot: YardBotEntity): void {
  bot.root.userData.ammoResuppliedAt = performance.now();
  bot.root.userData.ammoReserve = ALLY_AMMO_FULL;
  // Refill soft magazine so bot exits empty→reload loop after crate use.
  bot.root.userData.magRounds = 30;
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

  const remoteUid = bot.root.userData?.remotePlayerUid as string | undefined;
  if (remoteUid && isOnlineMatchActive()) {
    publishClassSupportEvent(remoteUid, 'REVIVE', bot.health);
  }
}

/** Mark local player as downed with Warface revive window (bomb modes). */
export function markLocalPlayerDownForRevive(engine: any): void {
  const now = performance.now() / 1000;
  engine.playerReviveUntilSec = now + REVIVE_WINDOW_SEC;
  engine.playerReviveExpired = false;
  engine.playerCorpsePos = engine.playerPos.clone();
}

export function isLocalPlayerPendingRevive(engine: any): boolean {
  if (engine.playerReviveExpired) return false;
  const until = engine.playerReviveUntilSec || 0;
  if (until <= 0) return false;
  return performance.now() / 1000 < until;
}

/** Bring local player back from downed/spectate into 1P at corpse. */
export function reviveLocalPlayer(engine: any, viaLabel = 'REANIMADO'): void {
  const mods = getClassCombatModifiers(
    getPlayerInventoryState().selectedClass
  );
  const hp = Math.round(mods.totalMaxHealth * 0.55);
  engine.state.health = hp;
  engine.state.maxHealth = mods.totalMaxHealth;
  engine.state.armor = Math.min(mods.armorBonus || 0, 25);
  engine.state.maxArmor = Math.max(0, mods.armorBonus || 0);
  engine.playerReviveUntilSec = 0;
  engine.playerReviveExpired = false;
  engine.isPlayerDying = false;
  engine.deathOnFinish = null;
  engine.deathAnimElapsed = 0;

  const corpse =
    engine.playerCorpsePos ||
    engine.playerDeathTp?.getCorpsePosition?.() ||
    engine.playerPos;
  if (corpse) {
    engine.playerPos.set(corpse.x, corpse.y, corpse.z);
    engine.yawObject.position.set(
      corpse.x,
      corpse.y + (engine.currentEyeHeight || 1.6),
      corpse.z
    );
  }
  try {
    engine.playerDeathTp?.stop?.(engine.camera, engine.weaponRig.root);
  } catch {
    /* optional */
  }
  if (engine.yardBombSystem?.info) {
    engine.yardBombSystem.info.isSpectating = false;
    engine.state.score += 50;
  }
  soundEngine.playMechanicalSwitch(1.15);
  engine.state.reloadTypeLabel = viaLabel;
  engine.magCheckTimer = 1.8;
  engine.state.damageFlashAlpha = 0.35;
  engine.emitHud?.(true);

  // Publish alive vitals so remotes clear isDown.
  if (isOnlineMatchActive()) {
    const me = getLocalOnlinePlayerState();
    if (me) {
      // Transform publish happens next frame via syncOnlineMatchFrame.
      me.isDown = false;
      me.health = hp;
    }
  }
}

/** Apply an incoming CLASS_SUPPORT packet aimed at the local player. */
export function applyIncomingClassSupportToLocal(
  engine: any,
  kind: 'AMMO' | 'HEAL' | 'ARMOR' | 'REVIVE',
  amount?: number,
  phase: 'START' | 'CANCEL' | 'APPLY' = 'APPLY'
): void {
  if (kind === 'REVIVE') {
    if (
      isLocalPlayerPendingRevive(engine) ||
      engine.state.health <= 0 ||
      engine.playerDeathTp?.isActive?.()
    ) {
      reviveLocalPlayer(engine, 'REANIMADO POR ALIADO');
    }
    return;
  }

  if (phase === 'START') {
    const label =
      kind === 'HEAL'
        ? 'ALIADO CURANDO VOCÊ…'
        : kind === 'ARMOR'
          ? 'ALIADO APLICANDO BLINDAGEM…'
          : 'ALIADO REABASTECENDO…';
    engine.state.supportPrompt = label;
    engine.emitHud?.(true);
    return;
  }
  if (phase === 'CANCEL') {
    if (
      engine.state.supportPrompt?.startsWith('ALIADO CURANDO') ||
      engine.state.supportPrompt?.startsWith('ALIADO APLICANDO') ||
      engine.state.supportPrompt?.startsWith('ALIADO REABASTECENDO')
    ) {
      engine.state.supportPrompt = '';
    }
    engine.state.reloadTypeLabel = 'KIT ALIADO CANCELADO';
    engine.magCheckTimer = 1.0;
    engine.emitHud?.(true);
    return;
  }

  if (engine.state.health <= 0 || engine.isPlayerDying) return;
  if (kind === 'HEAL') {
    healTarget(engine, null, amount || 45);
    engine.state.reloadTypeLabel = 'KIT MÉDICO RECEBIDO (+HP)';
  } else if (kind === 'ARMOR') {
    armorTarget(engine, null, amount || 40);
    engine.state.reloadTypeLabel = 'KIT BLINDAGEM RECEBIDO';
  } else if (kind === 'AMMO') {
    resupplySelfMags(engine);
    engine.state.fragGrenades = Math.min(3, (engine.state.fragGrenades || 0) + 1);
    engine.state.reloadTypeLabel = 'CAIXA DE MUNIÇÃO RECEBIDA';
  }
  if (
    engine.state.supportPrompt?.startsWith('ALIADO CURANDO') ||
    engine.state.supportPrompt?.startsWith('ALIADO APLICANDO') ||
    engine.state.supportPrompt?.startsWith('ALIADO REABASTECENDO')
  ) {
    engine.state.supportPrompt = '';
  }
  engine.magCheckTimer = 1.5;
  engine.emitHud?.(true);
}

function resolveKitChannelTarget(
  engine: any,
  cs: ClassSupportRuntime
): { target: 'SELF' | 'ALLY'; ally: YardBotEntity | null; label: string } | null {
  const ally = nearestLivingAlly(engine, SUPPORT_RANGE_M);
  if (cs.kind === 'AMMO') {
    if (ally) {
      return {
        target: 'ALLY',
        ally,
        label: `APLICANDO MUNIÇÃO → ${ally.callsign || 'ALIADO'}`,
      };
    }
    return { target: 'SELF', ally: null, label: 'APLICANDO CAIXA DE MUNIÇÃO' };
  }
  if (cs.kind === 'HEAL') {
    const needSelf = engine.state.health < engine.state.maxHealth - 1;
    const needAlly = ally && ally.health < ally.maxHealth - 1;
    if (needAlly && ally) {
      return {
        target: 'ALLY',
        ally,
        label: `APLICANDO KIT MÉDICO → ${ally.callsign || 'ALIADO'}`,
      };
    }
    if (needSelf) {
      return { target: 'SELF', ally: null, label: 'APLICANDO KIT MÉDICO' };
    }
    return null;
  }
  if (cs.kind === 'ARMOR') {
    const needSelf = (engine.state.armor || 0) < engine.state.maxArmor - 1;
    const needAlly = ally && (ally.armorHealth || 0) < 55;
    if (needAlly && ally) {
      return {
        target: 'ALLY',
        ally,
        label: `APLICANDO BLINDAGEM → ${ally.callsign || 'ALIADO'}`,
      };
    }
    if (needSelf) {
      return { target: 'SELF', ally: null, label: 'APLICANDO KIT BLINDAGEM' };
    }
    return null;
  }
  return null;
}

function completeKitChannel(engine: any, cs: ClassSupportRuntime): void {
  const ally =
    cs.kitChannelAllyId != null
      ? allyBots(engine).find((b) => b.id === cs.kitChannelAllyId) || null
      : null;
  const usedOn = cs.kitChannelTarget || 'SELF';
  const kind = cs.kind;

  if (kind === 'AMMO') {
    if (usedOn === 'ALLY' && ally) {
      resupplyAllyAmmo(ally);
      resupplySelfMags(engine);
      const uid = ally.root.userData?.remotePlayerUid as string | undefined;
      if (uid && isOnlineMatchActive()) {
        publishClassSupportEvent(uid, 'AMMO', engine.state.magCapacity || 30, 'APPLY');
      }
      engine.state.reloadTypeLabel = `CAIXA DE MUNIÇÃO → ${ally.callsign || 'ALIADO'} + VOCÊ`;
    } else {
      resupplySelfMags(engine);
      engine.state.fragGrenades = Math.min(3, engine.state.fragGrenades + 1);
      engine.state.reloadTypeLabel = `CAIXA DE MUNIÇÃO — PENTES CHEIOS (${engine.state.magCapacity})`;
      if (isOnlineMatchActive()) {
        const me = getLocalOnlinePlayerState();
        if (me) publishClassSupportEvent(me.uid, 'AMMO', engine.state.magCapacity || 30, 'APPLY');
      }
    }
    soundEngine.playReloadStage('MAG_IN');
  } else if (kind === 'HEAL') {
    if (usedOn === 'ALLY' && ally) {
      healTarget(engine, ally, 55);
      const uid = ally.root.userData?.remotePlayerUid as string | undefined;
      if (uid && isOnlineMatchActive()) {
        publishClassSupportEvent(uid, 'HEAL', 55, 'APPLY');
      }
      engine.state.reloadTypeLabel = `KIT MÉDICO → ${ally.callsign || 'ALIADO'} (+55 HP)`;
    } else {
      healTarget(engine, null, 45);
      engine.state.reloadTypeLabel = 'KIT MÉDICO — +45 HP';
      if (isOnlineMatchActive()) {
        const me = getLocalOnlinePlayerState();
        if (me) publishClassSupportEvent(me.uid, 'HEAL', 45, 'APPLY');
      }
    }
    soundEngine.playMechanicalSwitch(1.05);
  } else if (kind === 'ARMOR') {
    if (usedOn === 'ALLY' && ally) {
      armorTarget(engine, ally, 45);
      const uid = ally.root.userData?.remotePlayerUid as string | undefined;
      if (uid && isOnlineMatchActive()) {
        publishClassSupportEvent(uid, 'ARMOR', 45, 'APPLY');
      }
      engine.state.reloadTypeLabel = `KIT BLINDAGEM → ${ally.callsign || 'ALIADO'}`;
    } else {
      armorTarget(engine, null, 40);
      engine.state.reloadTypeLabel = 'KIT BLINDAGEM — COLETE REPARADO';
      if (isOnlineMatchActive()) {
        const me = getLocalOnlinePlayerState();
        if (me) publishClassSupportEvent(me.uid, 'ARMOR', 40, 'APPLY');
      }
    }
    soundEngine.playMechanicalSwitch(1.0);
  }

  cs.charges = Math.max(0, cs.charges - 1);
  cs.cooldownSec = usedOn === 'ALLY' ? 1.25 : 2.0;
  cs.kitChannelActive = false;
  cs.kitChannelElapsed = 0;
  cs.kitChannelTarget = null;
  cs.kitChannelAllyId = null;
  engine.state.supportCharges = cs.charges;
  engine.state.supportCooldownSec = cs.cooldownSec;
  engine.state.kitChannelProgress = 0;
  engine.state.supportPrompt = '';
  engine.magCheckTimer = 1.6;
  engine.emitHud?.(true);
}

/**
 * Press class support: starts ~15s kit channel (ammo/heal/armor) with Picup anim.
 * Revive still uses hold via setSupportHeld.
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
  if (cs.kitChannelActive) {
    engine.state.reloadTypeLabel = 'AGUARDE — KIT EM USO';
    engine.magCheckTimer = 0.8;
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

  const resolved = resolveKitChannelTarget(engine, cs);
  if (!resolved) {
    engine.state.reloadTypeLabel =
      cs.kind === 'HEAL'
        ? 'NENHUM ALVO PRECISA DE CURA'
        : cs.kind === 'ARMOR'
          ? 'COLETE JÁ NO MÁXIMO'
          : 'KIT INDISPONÍVEL';
    engine.magCheckTimer = 1.1;
    engine.emitHud?.(true);
    return;
  }

  const t = getKitUseTimings();
  cs.kitChannelActive = true;
  cs.kitChannelElapsed = 0;
  cs.kitChannelDuration = t.total;
  cs.kitChannelTarget = resolved.target;
  cs.kitChannelAllyId = resolved.ally?.id ?? null;
  cs.kitChannelStartX = engine.playerPos.x;
  cs.kitChannelStartZ = engine.playerPos.z;
  cs.kitChannelHpAtStart = engine.state.health;
  engine.state.kitChannelProgress = 0;
  engine.state.supportPrompt = `${resolved.label} 0%`;
  engine.state.reloadTypeLabel = 'USANDO KIT — NÃO SE MOVA';
  engine.magCheckTimer = 1.2;
  soundEngine.playMechanicalSwitch(0.9);

  try {
    // 1P kit prop phases follow Picup timings (pickup → loop hold → put down).
    // Local full-body 3P gesture stays off (clips 1P camera); remotes use APPLY sync.
    engine.classKitProps?.presentKit?.(cs.kind, t.total);
  } catch {
    /* optional visual */
  }

  if (isOnlineMatchActive()) {
    const targetUid =
      (resolved.ally?.root.userData?.remotePlayerUid as string | undefined) ||
      getLocalOnlinePlayerState()?.uid ||
      '';
    if (targetUid) {
      publishClassSupportEvent(targetUid, cs.kind, 0, 'START');
    }
  }
  engine.emitHud?.(true);
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

function playerTryingToMove(engine: any): boolean {
  const keys: Set<string> | undefined = engine.keysHeld;
  if (!keys || keys.size === 0) return false;
  return (
    keys.has('KeyW') ||
    keys.has('KeyA') ||
    keys.has('KeyS') ||
    keys.has('KeyD') ||
    keys.has('ArrowUp') ||
    keys.has('ArrowDown') ||
    keys.has('ArrowLeft') ||
    keys.has('ArrowRight')
  );
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

  // ~15s kit channel (ammo / heal / armor) — cancel on move or death.
  if (cs.kitChannelActive) {
    if (
      engine.state.health <= 0 ||
      engine.isPlayerDying ||
      engine.state.screen !== 'PLAYING'
    ) {
      cancelKitChannel(engine, 'cancelado');
    } else {
      const moved =
        Math.hypot(
          engine.playerPos.x - cs.kitChannelStartX,
          engine.playerPos.z - cs.kitChannelStartZ
        ) > KIT_CANCEL_MOVE_M;
      if (moved || playerTryingToMove(engine)) {
        cancelKitChannel(engine, 'interrompido (movimento)');
      } else if (
        cs.kitChannelAllyId &&
        cs.kitChannelTarget === 'ALLY'
      ) {
        const ally = allyBots(engine).find((b) => b.id === cs.kitChannelAllyId);
        if (!ally || ally.isDown || ally.health <= 0 || distTo(engine, ally) > SUPPORT_RANGE_M + 0.6) {
          cancelKitChannel(engine, 'alvo fora de alcance');
        }
      }
    }

    if (cs.kitChannelActive) {
      cs.kitChannelElapsed += dt;
      const dur = Math.max(0.5, cs.kitChannelDuration || KIT_USE_CHANNEL_SEC);
      const pct = Math.min(1, cs.kitChannelElapsed / dur);
      engine.state.kitChannelProgress = pct;
      const baseLabel =
        cs.kind === 'HEAL'
          ? 'APLICANDO KIT MÉDICO'
          : cs.kind === 'ARMOR'
            ? 'APLICANDO KIT BLINDAGEM'
            : 'APLICANDO CAIXA DE MUNIÇÃO';
      const allyName =
        cs.kitChannelAllyId &&
        allyBots(engine).find((b) => b.id === cs.kitChannelAllyId)?.callsign;
      engine.state.supportPrompt = allyName
        ? `${baseLabel} → ${allyName} ${Math.round(pct * 100)}%`
        : `${baseLabel} ${Math.round(pct * 100)}%`;
      if (cs.kitChannelElapsed >= dur) {
        completeKitChannel(engine, cs);
      }
    }
  } else {
    engine.state.kitChannelProgress = 0;
  }

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

  // Class-filtered ally need edge icons (not self, not enemies).
  const needMarkers: AllyNeedMarkerHud[] = [];
  if (playerAlive && cs.charges > 0 && cs.kind !== 'NONE' && !cs.kitChannelActive) {
    const living = allies.filter((a) => !a.isDown && a.health > 0 && a.root.visible);
    for (let i = 0; i < living.length; i++) {
      const a = living[i];
      const d = distTo(engine, a);
      if (d > ALLY_NEED_INDICATOR_RANGE_M) continue;

      let need: AllyNeedKind | null = null;
      let severity = 0;
      if (cs.kind === 'HEAL') {
        const frac = a.health / Math.max(1, a.maxHealth);
        if (frac < ALLY_NEED_HP_FRAC) {
          need = 'HP';
          severity = 1 - frac;
        }
      } else if (cs.kind === 'AMMO') {
        const ammo = ensureAllyAmmoReserve(a);
        if (ammo < ALLY_NEED_AMMO) {
          need = 'AMMO';
          severity = 1 - ammo / ALLY_AMMO_FULL;
        }
      } else if (cs.kind === 'ARMOR') {
        const armor = a.armorHealth || 0;
        const hasVest =
          Boolean(a.armorMesh) ||
          armor > 0 ||
          Boolean(a.root.userData?.remotePlayerUid);
        // Skip vestless AI with no plate — avoid constant false positives.
        if (hasVest && armor < ALLY_NEED_ARMOR) {
          const armorCap = a.armorMesh ? 60 : 40;
          need = 'ARMOR';
          severity = 1 - armor / Math.max(1, armorCap);
        }
      }
      if (!need) continue;

      _toAlly.set(
        a.root.position.x - engine.playerPos.x,
        0,
        a.root.position.z - engine.playerPos.z
      );
      const bearing = Math.atan2(-_toAlly.x, -_toAlly.z) - engine.yaw;
      needMarkers.push({
        id: a.id,
        callsign: a.callsign || 'ALIADO',
        need,
        bearingRad: bearing,
        distanceM: d,
        severity: Math.min(1, Math.max(0.15, severity)),
        inRange: d <= SUPPORT_RANGE_M,
      });
    }
    needMarkers.sort((a, b) => a.distanceM - b.distanceM);
    engine.state.allyNeedMarkers = needMarkers.slice(0, 4);
  } else {
    engine.state.allyNeedMarkers = [];
  }

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

  // Local player Warface revive window (downed corpse still reviveable).
  if (
    isBombMode(engine.state.drillMode) &&
    (engine.playerReviveUntilSec || 0) > 0 &&
    !engine.playerReviveExpired
  ) {
    const remain = engine.playerReviveUntilSec - now;
    if (remain <= 0) {
      engine.playerReviveExpired = true;
      engine.playerReviveUntilSec = 0;
      engine._allyReviveCharge = 0;
      if (engine.yardBombSystem?.info?.isSpectating) {
        engine.state.supportPrompt = 'JANELA DE REANIMAÇÃO ESGOTADA';
        engine.magCheckTimer = 1.4;
      }
    } else {
      // Ally bots near corpse auto-charge defibrillator (offline / AI medics).
      const corpse: THREE.Vector3 =
        engine.playerDeathTp?.getCorpsePosition?.() ||
        engine.playerCorpsePos ||
        engine.playerPos;
      let nearAlly = false;
      for (let i = 0; i < allies.length; i++) {
        const a = allies[i];
        if (a.isDown) continue;
        const d = Math.hypot(
          a.root.position.x - corpse.x,
          a.root.position.z - corpse.z
        );
        if (d <= REVIVE_RANGE_M + 0.35) {
          nearAlly = true;
          break;
        }
      }
      if (nearAlly) {
        engine._allyReviveCharge = Math.min(
          1,
          (engine._allyReviveCharge || 0) + dt / REVIVE_CHARGE_SEC
        );
        engine.state.supportPrompt = `ALIADO REANIMANDO… ${Math.round(
          (engine._allyReviveCharge || 0) * 100
        )}%`;
        if ((engine._allyReviveCharge || 0) >= 1) {
          engine._allyReviveCharge = 0;
          reviveLocalPlayer(engine, 'REANIMADO POR ALIADO');
        }
      } else {
        engine._allyReviveCharge = Math.max(
          0,
          (engine._allyReviveCharge || 0) - dt * 0.85
        );
        if (!engine.state.supportPrompt?.startsWith('ALIADO REANIMANDO')) {
          engine.state.supportPrompt = `AGUARDANDO REANIMAÇÃO · ${Math.ceil(remain)}s`;
        }
      }
    }
  }
}
