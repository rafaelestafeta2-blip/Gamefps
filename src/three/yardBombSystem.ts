import * as THREE from 'three';
import {
  playC4DetonationExplosion,
  playC4KeypadDigitSound,
  playMatchEndFanfare,
  playRealBombPlantedVoice,
  playRealC4Beep,
  stopMatchEndFanfare,
} from '../audio/characterAndBombAudio';
import { soundEngine } from '../audio/soundEngine';
import { playSpatialBotGunshot } from '../audio/spatialCombatAudio';
import { mobileHardware } from '../mobile/nativeHardware';
import { DrillMode, SquadOperatorStats, WeaponId, YardBombHudInfo } from '../types/game';
import { BallisticsFXPool } from './ballisticsPool';
import { triggerBotFireAnimation, triggerBotHitAnimation } from './botCharacterSystem';
import { ASSAULT_BOMB_SITE_A, ASSAULT_BOMB_SITE_B, getAssaultCalloutForPos } from './assaultLevelBuilder';
import { DUST2_BOMB_SITE_A, DUST2_BOMB_SITE_B, getDust2CalloutForPos } from './dust2LevelBuilder';
import { TacticalTargetEntity } from './levelBuilder';
import { getYardCalloutForPos, YARD_BOMB_SITE_A, YARD_BOMB_SITE_B } from './yardMapData';
import { YardBotEntity } from './yardPropsBuilder';

const _allyOrigin = new THREE.Vector3();
const _enemyPos = new THREE.Vector3();

function createInitialSquadStats(): SquadOperatorStats[] {
  return [
    { callsign: 'VOCÊ', roleTitle: 'LÍDER DE ESQUADRÃO', weaponId: 'M4_CARBINE', kills: 0, deaths: 0, assists: 0, headshots: 0, score: 0, isPlayer: true },
    { callsign: 'RECON-02', roleTitle: 'ATIRADOR DE ELITE', weaponId: 'SNIPER_BOLT', kills: 0, deaths: 0, assists: 0, headshots: 0, score: 0, isPlayer: false },
    { callsign: 'STRIKER-03', roleTitle: 'ASSALTO PESADO', weaponId: 'AK47_RIFLE', kills: 0, deaths: 0, assists: 0, headshots: 0, score: 0, isPlayer: false },
    { callsign: 'LIFELINE-04', roleTitle: 'PARAMÉDICO TÁTICO', weaponId: 'M4_CARBINE', kills: 0, deaths: 0, assists: 0, headshots: 0, score: 0, isPlayer: false },
    { callsign: 'WARDEN-05', roleTitle: 'BREACHER CQB', weaponId: 'AK47_RIFLE', kills: 0, deaths: 0, assists: 0, headshots: 0, score: 0, isPlayer: false },
  ];
}

export class YardBombSystem {
  private c4MeshGroup: THREE.Group;
  private c4LedMesh: THREE.Mesh;
  private beepAccum = 0;
  private allyFireTimer = 0;
  private isPlantingHeld = false;
  private lastKeypadDigitIdx = -1;
  private activeMode: DrillMode = 'YARD_BOMB_5V5';

  public info: YardBombHudInfo = {
    bombStatus: 'CARRIED', plantedSite: null, nearSite: null, plantProgress: 0,
    roundTimerSec: 125, c4TimerSec: 40, alliesAlive: 5, enemiesAlive: 5,
    calloutLabel: 'SPAWN VANGUARD (SUL · RUA DO HOTEL)', currentRound: 1, maxRounds: 6,
    vanguardScore: 0, blackthornScore: 0, roundState: 'PLAYING', roundWinner: null,
    roundWinReason: '', roundTransitionSec: 0, matchWinner: null,
    lastRoundXp: 0, lastRoundCash: 0, totalMatchXp: 0, totalMatchCash: 0,
    squadStats: createInitialSquadStats(),
  };

  constructor(sceneGroup: THREE.Object3D) {
    this.c4MeshGroup = new THREE.Group();
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.24), new THREE.MeshStandardMaterial({ color: 0x3f4d34, roughness: 0.65, metalness: 0.25 }));
    const keypad = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.1), new THREE.MeshBasicMaterial({ color: 0x111827 }));
    keypad.position.set(0.05, 0.065, 0);
    this.c4LedMesh = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    this.c4LedMesh.position.set(-0.08, 0.07, 0);
    this.c4MeshGroup.add(pack, keypad, this.c4LedMesh);
    this.c4MeshGroup.visible = false;
    sceneGroup.add(this.c4MeshGroup);
  }

  public resetRound(mode: DrillMode = 'YARD_BOMB_5V5', keepMatchScore = false): void {
    this.activeMode = mode;
    this.isPlantingHeld = false;
    this.lastKeypadDigitIdx = -1;
    this.beepAccum = 0;
    this.allyFireTimer = 0;
    this.c4MeshGroup.visible = false;
    if (!keepMatchScore) stopMatchEndFanfare();

    const prevRound = keepMatchScore ? this.info.currentRound : 1;
    const prevVg = keepMatchScore ? this.info.vanguardScore : 0;
    const prevBt = keepMatchScore ? this.info.blackthornScore : 0;
    const prevTotalXp = keepMatchScore ? this.info.totalMatchXp : 0;
    const prevTotalCash = keepMatchScore ? this.info.totalMatchCash : 0;
    const prevStats = keepMatchScore && this.info.squadStats
      ? this.info.squadStats.map((s) => ({ ...s }))
      : createInitialSquadStats();

    this.info = {
      bombStatus: 'CARRIED', plantedSite: null, nearSite: null, plantProgress: 0,
      roundTimerSec: 125, c4TimerSec: 40, alliesAlive: 5, enemiesAlive: 5,
      calloutLabel:
        mode === 'DUST2_BOMB_5V5'
          ? 'BASE VANGUARD (TR SPAWN · SUL)'
          : mode === 'ASSAULT_BOMB_5V5'
            ? 'BASE VANGUARD (CT STREET SPAWN)'
            : 'BASE VANGUARD (SUL · RUA DO HOTEL)',
      currentRound: prevRound, maxRounds: 6, vanguardScore: prevVg, blackthornScore: prevBt,
      roundState: 'PLAYING', roundWinner: null, roundWinReason: '', roundTransitionSec: 0,
      matchWinner: null, lastRoundXp: 0, lastRoundCash: 0,
      totalMatchXp: prevTotalXp, totalMatchCash: prevTotalCash,
      isSpectating: false, spectatedCallsign: undefined, spectatedWeapon: undefined, spectatedHealth: undefined,
      squadStats: prevStats,
    };
  }

  public recordKillEvent(
    killerName: string,
    killerTeam: 'VANGUARD' | 'BLACKTHORN',
    victimName: string,
    victimTeam: 'VANGUARD' | 'BLACKTHORN',
    isHeadshot: boolean,
    playerPrimaryWeapon?: WeaponId
  ): void {
    const stats = this.info.squadStats || createInitialSquadStats();
    if (playerPrimaryWeapon) {
      const playerOp = stats.find((s) => s.isPlayer);
      if (playerOp && playerPrimaryWeapon !== 'KNIFE_TACTICAL') {
        playerOp.weaponId = playerPrimaryWeapon;
      }
    }

    if (killerTeam === 'VANGUARD') {
      const killerOp = stats.find((s) => s.callsign === killerName) || stats[0];
      if (killerOp) {
        killerOp.kills += 1;
        if (isHeadshot) killerOp.headshots += 1;
        killerOp.score += isHeadshot ? 150 : 100;
      }
      // Concede assistência tática a um companheiro de equipe Vanguard
      const others = stats.filter((s) => s.callsign !== killerOp?.callsign);
      if (others.length > 0 && Math.random() < 0.65) {
        const assister = others[Math.floor(Math.random() * others.length)];
        assister.assists += 1;
        assister.score += 50;
      }
    }

    if (victimTeam === 'VANGUARD') {
      const victimOp = stats.find((s) => s.callsign === victimName);
      if (victimOp) {
        victimOp.deaths += 1;
      }
    }

    this.info.squadStats = [...stats];
  }

  public triggerPlantBomb(): void {
    if (this.info.roundState === 'PLAYING' && (this.info.bombStatus === 'CARRIED' || this.info.bombStatus === 'PLANTING') && this.info.nearSite !== null) {
      this.isPlantingHeld = true;
    }
  }

  public finishCurrentRound(
    winner: 'VANGUARD' | 'BLACKTHORN',
    reason: string,
    onReward: (xp: number, cash: number, isMatchEnd: boolean) => void
  ): void {
    if (this.info.roundState !== 'PLAYING') return;

    if (winner === 'VANGUARD') this.info.vanguardScore += 1;
    else this.info.blackthornScore += 1;

    let roundXp = winner === 'VANGUARD' ? 180 : 75;
    let roundCash = winner === 'VANGUARD' ? 400 : 150;

    const roundsPlayed = this.info.vanguardScore + this.info.blackthornScore;
    const hasMajorityClinch = this.info.vanguardScore >= 4 || this.info.blackthornScore >= 4;
    const completedSixDecisiveRounds =
      roundsPlayed >= this.info.maxRounds && this.info.vanguardScore !== this.info.blackthornScore;

    if (hasMajorityClinch || completedSixDecisiveRounds) {
      const matchWinner: 'VANGUARD' | 'BLACKTHORN' =
        this.info.vanguardScore > this.info.blackthornScore ? 'VANGUARD' : 'BLACKTHORN';
      this.info.matchWinner = matchWinner;
      this.info.roundWinner = winner;
      this.info.roundWinReason = reason;
      this.info.roundState = 'MATCH_OVER';
      this.info.isSpectating = false;
      this.info.roundTransitionSec = 0;

      const matchBonusXp = matchWinner === 'VANGUARD' ? 450 : 180;
      const matchBonusCash = matchWinner === 'VANGUARD' ? 1200 : 450;
      roundXp += matchBonusXp;
      roundCash += matchBonusCash;

      this.info.lastRoundXp = roundXp;
      this.info.lastRoundCash = roundCash;
      this.info.totalMatchXp += roundXp;
      this.info.totalMatchCash += roundCash;

      playMatchEndFanfare(matchWinner === 'VANGUARD');
      onReward(roundXp, roundCash, true);
    } else {
      this.info.roundWinner = winner;
      this.info.roundWinReason = reason;
      this.info.roundState = 'ROUND_OVER';
      this.info.roundTransitionSec = 3.5;
      this.info.lastRoundXp = roundXp;
      this.info.lastRoundCash = roundCash;
      this.info.totalMatchXp += roundXp;
      this.info.totalMatchCash += roundCash;
      onReward(roundXp, roundCash, false);
    }
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    targets: TacticalTargetEntity[],
    fxPool: BallisticsFXPool,
    onReward: (xp: number, cash: number, isMatchEnd: boolean) => void,
    onAdvanceNextRound: () => void,
    onMatchReturnToMenu: () => void,
    onRegisterKill?: (
      killerName: string,
      killerTeam: 'VANGUARD' | 'BLACKTHORN',
      victimName: string,
      victimTeam: 'VANGUARD' | 'BLACKTHORN',
      weaponId: WeaponId,
      isHeadshot: boolean
    ) => void,
    playerAlive = true
  ): void {
    if (this.info.roundState === 'ROUND_OVER') {
      this.info.roundTransitionSec = Math.max(0, this.info.roundTransitionSec - dt);
      if (this.info.roundTransitionSec <= 0) {
        this.info.currentRound += 1;
        this.resetRound(this.activeMode, true);
        onAdvanceNextRound();
      }
      return;
    }

    // Permanece na tela de estatísticas e pose 3D até o jogador clicar em Fechar!
    if (this.info.roundState === 'MATCH_OVER') {
      void onMatchReturnToMenu;
      return;
    }

    const isDust2 = this.activeMode === 'DUST2_BOMB_5V5';
    const isAssault = this.activeMode === 'ASSAULT_BOMB_5V5';
    const siteA = isDust2 ? DUST2_BOMB_SITE_A : isAssault ? ASSAULT_BOMB_SITE_A : YARD_BOMB_SITE_A;
    const siteB = isDust2 ? DUST2_BOMB_SITE_B : isAssault ? ASSAULT_BOMB_SITE_B : YARD_BOMB_SITE_B;

    this.info.calloutLabel = isDust2
      ? getDust2CalloutForPos(playerPos.x, playerPos.y, playerPos.z)
      : isAssault
        ? getAssaultCalloutForPos(playerPos.x, playerPos.y, playerPos.z)
        : getYardCalloutForPos(playerPos.x, playerPos.y, playerPos.z);

    let enemies = 0;
    let allies = playerAlive ? 1 : 0;
    const enemyList: YardBotEntity[] = [];
    const allyList: YardBotEntity[] = [];

    for (let i = 0; i < targets.length; i++) {
      const bot = targets[i] as YardBotEntity;
      if (bot.isDown) continue;
      if (bot.isAlly) {
        allies++;
        allyList.push(bot);
      } else {
        enemies++;
        enemyList.push(bot);
      }
    }
    this.info.enemiesAlive = enemies;
    this.info.alliesAlive = allies;

    if (enemies === 0 && targets.length > 0) {
      this.finishCurrentRound('VANGUARD', 'ESQUADRÃO BLACKTHORN ELIMINADO EM COMBATE!', onReward);
      return;
    }

    if (allies === 0 && targets.length > 0 && this.info.bombStatus !== 'PLANTED') {
      this.finishCurrentRound('BLACKTHORN', 'ESQUADRÃO VANGUARD ELIMINADO EM COMBATE!', onReward);
      return;
    }

    const distA = Math.hypot(playerPos.x - siteA.x, playerPos.z - siteA.z);
    const distB = Math.hypot(playerPos.x - siteB.x, playerPos.z - siteB.z);

    if (playerAlive && distA <= 4.2) {
      this.info.nearSite = 'A';
    } else if (playerAlive && distB <= 4.2) {
      this.info.nearSite = 'B';
    } else {
      this.info.nearSite = null;
      if (this.info.bombStatus === 'PLANTING') {
        this.info.bombStatus = 'CARRIED';
        this.info.plantProgress = 0;
        this.isPlantingHeld = false;
        this.lastKeypadDigitIdx = -1;
      }
    }

    if (playerAlive && this.isPlantingHeld && this.info.nearSite && this.info.bombStatus !== 'PLANTED') {
      this.info.bombStatus = 'PLANTING';
      this.info.plantProgress = Math.min(1, this.info.plantProgress + dt / 2.4);
      const digitIdx = Math.min(7, Math.floor(this.info.plantProgress * 8));
      if (digitIdx !== this.lastKeypadDigitIdx) {
        this.lastKeypadDigitIdx = digitIdx;
        playC4KeypadDigitSound(digitIdx);
      }
      if (this.info.plantProgress >= 1) {
        this.isPlantingHeld = false;
        this.lastKeypadDigitIdx = -1;
        this.info.bombStatus = 'PLANTED';
        this.info.plantedSite = this.info.nearSite;
        this.info.c4TimerSec = 40;
        if (this.info.squadStats && this.info.squadStats[0]) {
          this.info.squadStats[0].score += 100;
        }

        const sitePos = this.info.plantedSite === 'A' ? siteA : siteB;
        this.c4MeshGroup.position.set(sitePos.x, isDust2 || isAssault ? sitePos.y + 0.12 : 1.02, sitePos.z);
        this.c4MeshGroup.visible = true;
        soundEngine.playMechanicalSwitch(1.45);
        playRealBombPlantedVoice();
        mobileHardware.vibrateHitConfirm(true);
      }
    }

    if (this.info.bombStatus === 'PLANTED' && !this.c4MeshGroup.visible && this.info.plantedSite) {
      const sitePos = this.info.plantedSite === 'A' ? siteA : siteB;
      this.c4MeshGroup.position.set(sitePos.x, isDust2 || isAssault ? sitePos.y + 0.12 : 1.02, sitePos.z);
      this.c4MeshGroup.visible = true;
    }

    if (this.info.bombStatus === 'PLANTED') {
      this.info.c4TimerSec = Math.max(0, this.info.c4TimerSec - dt);
      const beepInterval = this.info.c4TimerSec < 5 ? 0.18 : this.info.c4TimerSec < 12 ? 0.35 : 0.75;
      this.beepAccum += dt;
      if (this.beepAccum >= beepInterval) {
        this.beepAccum = 0;
        this.c4LedMesh.visible = !this.c4LedMesh.visible;
        playRealC4Beep(this.c4MeshGroup.position, playerPos, this.info.c4TimerSec);
      }

      if (this.info.c4TimerSec <= 0) {
        this.info.bombStatus = 'DETONATED';
        playC4DetonationExplosion(this.c4MeshGroup.position, playerPos);
        mobileHardware.vibrateExplosion(1.0);
        this.finishCurrentRound('VANGUARD', `BOMBA C4 DETONADA NO PONTO ${this.info.plantedSite}!`, onReward);
      }
    } else if (this.info.bombStatus === 'CARRIED' || this.info.bombStatus === 'PLANTING') {
      this.info.roundTimerSec = Math.max(0, this.info.roundTimerSec - dt);
      if (this.info.roundTimerSec <= 0) {
        this.finishCurrentRound('BLACKTHORN', 'TEMPO ESGOTADO — ALVOS A E B DEFENDIDOS PELA BLACKTHORN!', onReward);
      }
    }

    this.allyFireTimer += dt;
    const skirmishInterval = playerAlive ? 1.25 : 0.75;
    if (this.allyFireTimer >= skirmishInterval && allyList.length > 0 && enemyList.length > 0) {
      this.allyFireTimer = 0;
      const ally = allyList[Math.floor(Math.random() * allyList.length)];
      const enemy = enemyList[Math.floor(Math.random() * enemyList.length)];
      if (ally.root.position.distanceTo(enemy.root.position) < 46) {
        _allyOrigin.set(ally.root.position.x, ally.root.position.y + 1.45, ally.root.position.z);
        _enemyPos.set(
          enemy.root.position.x + (Math.random() - 0.5) * 0.5,
          enemy.root.position.y + 1.25,
          enemy.root.position.z + (Math.random() - 0.5) * 0.5
        );
        fxPool.spawnTracer(_allyOrigin, _enemyPos, 0x38bdf8);
        triggerBotFireAnimation(ally);
        playSpatialBotGunshot(_allyOrigin, playerPos, 0, ally.weaponId || 'M4_CARBINE', true);

        const hitProb = playerAlive ? 0.26 : 0.42;
        if (Math.random() < hitProb && !enemy.isDown) {
          enemy.health -= 55;
          enemy.hitTiltVelocity = -12.0;
          triggerBotHitAnimation(enemy);
          if (enemy.health <= 0) {
            enemy.isDown = true;
            enemy.downTimer = 9999;
            onRegisterKill?.(ally.callsign || 'RECON-02', 'VANGUARD', enemy.callsign || 'KRAKEN-BT', 'BLACKTHORN', ally.weaponId || 'M4_CARBINE', Math.random() < 0.35);
          }
        } else if (Math.random() < (playerAlive ? 0.18 : 0.36) && !ally.isDown) {
          triggerBotFireAnimation(enemy);
          playSpatialBotGunshot(_enemyPos, playerPos, 0, enemy.weaponId || 'AK47_RIFLE', true);
          ally.health -= 55;
          ally.hitTiltVelocity = -12.0;
          triggerBotHitAnimation(ally);
          if (ally.health <= 0) {
            ally.isDown = true;
            ally.downTimer = 9999;
            onRegisterKill?.(enemy.callsign || 'KRAKEN-BT', 'BLACKTHORN', ally.callsign || 'RECON-02', 'VANGUARD', enemy.weaponId || 'AK47_RIFLE', Math.random() < 0.25);
          }
        }
      }
    }
  }
}
