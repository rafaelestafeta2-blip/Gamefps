import { useEffect, useRef, useState } from 'react';
import { GameShellModals } from './components/GameShellModals';
import { IntroScreen } from './components/IntroScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { MainMenu } from './components/MainMenu';
import { MobileTouchControls } from './components/MobileTouchControls';
import { OrientationLockOverlay } from './components/OrientationLockOverlay';
import { TacticalHudOverlay } from './components/TacticalHudOverlay';
import { mobileHardware } from './mobile/nativeHardware';
import { TacticalFPSEngine } from './three/fpsEngine';
import {
  DrillMode,
  GyroMode,
  HudState,
  OpticType,
  QualityPreset,
  WeaponId,
} from './types/game';

const INITIAL_HUD_STATE: HudState = {
  screen: 'INTRO',
  pointerLocked: false,
  activeWeapon: 'M4_CARBINE',
  primaryWeapon: 'M4_CARBINE',
  secondaryWeapon: 'P50_PISTOL',
  nearWallStand: false,
  focusedWallWeapon: null,
  chambered: 1,
  currentMagRounds: 30,
  magCapacity: 30,
  magazines: [30, 30, 30, 30],
  fragGrenades: 3,
  smokeGrenades: 3,
  equippedGrenade: null,
  isThrowingGrenade: false,
  boltLockedBack: false,
  fireMode: 'AUTO',
  optic: 'iron',
  lpvoZoom: 2.0,
  cantedActive: false,
  suppressorAttached: false,
  muzzleDevice: 'NONE',
  weaponCharm: 'NONE',
  laserActive: false,
  reloadPhase: 'IDLE',
  reloadProgress: 0,
  reloadTypeLabel: '',
  magCheckVisible: false,
  wallTuckAmount: 0,
  health: 100,
  maxHealth: 100,
  stamina: 100,
  isHoldingBreath: false,
  isAds: false,
  adsAlpha: 0,
  stance: 'STAND',
  leanDirection: 0,
  playerPos: { x: -6.8, z: 3.2 },
  playerYaw: 0,
  radarTargets: [],
  drillMode: 'FREE_RANGE',
  score: 0,
  hits: 0,
  shotsFired: 0,
  headshots: 0,
  targetsRemaining: 6,
  totalTargetsInDrill: 6,
  courseTimerSec: 0,
  bestCourseTimeSec: null,
  lastHitZone: null,
  lastShotTelemetry: null,
  shotHistory: [],
  hitMarkerAlpha: 0,
  hitMarkerIsCrit: false,
  damageFlashAlpha: 0,
  // Warface Rank Progression System
  playerXp: 0,
  rankLevel: 1,
  rankTitle: 'Recruta I',
  rankBadge: '★',
  rankBadgeColor: '#94a3b8',
  nextRankXp: 250,
  lastXpGained: 0,
  rankUpNotification: null,

  muted: false,
  dockCollapsed: true,
  touchControlsVisible: true,
  isCrouchingToggled: false,
  isProneToggled: false,
  qualityPreset: 'BALANCED_60',
  dynamicResolutionEnabled: true,
  liveFps: 60,
  renderScalePercent: 100,
  gyroMode: 'OFF',
  gyroSensitivity: 1.0,
  lookSensitivity: 1.0,
  adsSensitivity: 1.0,
  hapticsEnabled: true,
  isFullscreen: false,
  graphicQuality: 'HIGH',
  fpsLimit: 60,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<TacticalFPSEngine | null>(null);
  const [hud, setHud] = useState<HudState>(INITIAL_HUD_STATE);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [preloadStatus, setPreloadStatus] = useState('INICIALIZANDO GERENCIADOR DE RECURSOS (THREE.LoadingManager)...');

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const engine = new TacticalFPSEngine(container, (nextHud) => {
      setHud(nextHud);
    });
    engineRef.current = engine;

    const onUserGesture = () => {
      void mobileHardware.enterFullscreenLandscape();
    };
    window.addEventListener('pointerdown', onUserGesture, { once: true });
    window.addEventListener('keydown', onUserGesture, { once: true });

    return () => {
      window.removeEventListener('pointerdown', onUserGesture);
      window.removeEventListener('keydown', onUserGesture);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Trigger AssetPreloader sequence whenever screen changes to LOADING
  useEffect(() => {
    if (hud.screen === 'LOADING' && engineRef.current) {
      setPreloadProgress(0);
      setPreloadStatus('LIMPANDO MEMÓRIA E INICIALIZANDO CARREGAMENTO...');

      engineRef.current
        .preloadAssets((pct, status) => {
          setPreloadProgress(pct);
          setPreloadStatus(status);
        })
        .catch((err) => {
          console.warn('Asset preloader finished with fallback:', err);
          setPreloadProgress(100);
        });
    }
  }, [hud.screen]);

  return (
    <main
      className="relative w-screen h-screen overflow-hidden bg-[#090b0e]"
      style={{ touchAction: 'none' }}
    >
      {/* Mandatory Landscape and Fullscreen Orientation Enforcer */}
      <OrientationLockOverlay />

      {/* Isolated WebGL Canvas Mount Container */}
      <div
        ref={canvasMountRef}
        className="w-full h-full cursor-crosshair"
        aria-label="Viewport 3D do simulador tático KINETIC"
      />

      {/* 1. Animated Studio Intro ("Rafael Games") */}
      {hud.screen === 'INTRO' && (
        <IntroScreen
          onComplete={() => {
            engineRef.current?.setScreenState('LOADING');
            setHud((prev) => ({ ...prev, screen: 'LOADING' }));
          }}
        />
      )}

      {/* 2. Tactical Loading Screen with Artwork & Real Progress Bar */}
      {hud.screen === 'LOADING' && (
        <LoadingScreen
          progress={preloadProgress}
          statusLabel={preloadStatus}
          onComplete={() => {
            engineRef.current?.setScreenState('MAIN_MENU');
            setHud((prev) => ({ ...prev, screen: 'MAIN_MENU' }));
          }}
        />
      )}

      {/* 3. Main Menu (Call of Duty / Modern Warfare aesthetic matching attached screenshot) */}
      {(hud.screen === 'MAIN_MENU' || hud.screen === 'TITLE') && (
        <MainMenu
          onStartTraining={() => {
            engineRef.current?.startGame('FREE_RANGE');
          }}
          onStartDrill={(mode) => {
            engineRef.current?.startGame(mode);
          }}
          activeWeapon={hud.activeWeapon}
          onSelectStartingWeapon={(weaponId) => {
            engineRef.current?.selectWeapon(weaponId);
          }}
          qualityPreset={hud.qualityPreset}
          onSetQualityPreset={(preset) => {
            engineRef.current?.setQualityPreset(preset);
          }}
        />
      )}

      {/* 4. Active Playing HUD + On-Screen Mobile Multi-Touch Controls */}
      {hud.screen === 'PLAYING' && (
        <>
          <MobileTouchControls
            hud={hud}
            onMove={(mx, my, sprint) =>
              engineRef.current?.setTouchMovement(mx, my, sprint)
            }
            onLookDelta={(dx, dy) =>
              engineRef.current?.applyTouchLookDelta(dx, dy)
            }
            onFireHeld={(held) => engineRef.current?.setTouchFireHeld(held)}
            onToggleAds={() => engineRef.current?.toggleAds()}
            onToggleWeaponSlot={() => engineRef.current?.toggleWeaponSlot()}
            onReload={(speed) => engineRef.current?.triggerReload(speed)}
            onBoltRack={() => engineRef.current?.triggerManualBoltRack()}
            onMagCheck={() => engineRef.current?.triggerMagCheck()}
            onInspectWeapon={() => engineRef.current?.triggerWeaponInspect()}
            onJump={() => engineRef.current?.triggerJump()}
            onCrouchOrSlide={() => engineRef.current?.toggleCrouchOrSlide()}
            onToggleLean={(dir) => engineRef.current?.toggleLean(dir)}
            onHoldBreath={(held) => engineRef.current?.setHoldBreath(held)}
            onCycleZoom={() => engineRef.current?.cycleLpvoZoom()}
            onThrowGrenade={(type) => engineRef.current?.throwGrenade(type)}
          />

          <TacticalHudOverlay
            hud={hud}
            onSelectWeapon={(weaponId: WeaponId) =>
              engineRef.current?.selectWeapon(weaponId)
            }
            onToggleWeaponSlot={() => engineRef.current?.toggleWeaponSlot()}
            onInspectWeapon={() => engineRef.current?.triggerWeaponInspect()}
            onSelectOptic={(optic: OpticType) =>
              engineRef.current?.setOptic(optic)
            }
            onToggleCanted={() => engineRef.current?.toggleCantedSight()}
            onToggleSuppressor={() => engineRef.current?.toggleSuppressor()}
            onCycleCharm={() => engineRef.current?.cycleWeaponCharm()}
            onToggleLaser={() => engineRef.current?.toggleLaser()}
            onCycleFireMode={() => engineRef.current?.cycleFireMode()}
            onTriggerReload={(speed: boolean) =>
              engineRef.current?.triggerReload(speed)
            }
            onTriggerMagCheck={() => engineRef.current?.triggerMagCheck()}
            onResupply={() => engineRef.current?.resupplyAmmo()}
            onThrowGrenade={(type) => engineRef.current?.throwGrenade(type)}
            onSelectDrill={(mode: DrillMode) =>
              engineRef.current?.setDrillMode(mode)
            }
            onToggleMute={() => engineRef.current?.toggleMute()}
            onToggleDock={() => engineRef.current?.toggleDockCollapsed()}
            onToggleTouchControls={() =>
              engineRef.current?.toggleTouchControlsVisible()
            }
            onSetQualityPreset={(preset: QualityPreset) =>
              engineRef.current?.setQualityPreset(preset)
            }
            onToggleDrs={() => engineRef.current?.toggleDynamicResolution()}
            onSetGyroMode={(mode: GyroMode) => {
              void engineRef.current?.setGyroMode(mode);
            }}
            onRecalibrateGyro={() => engineRef.current?.recalibrateGyro()}
            onToggleHaptics={() => engineRef.current?.toggleHaptics()}
            onToggleFullscreen={() => {
              void engineRef.current?.toggleFullscreenLandscape();
            }}
            onSetGraphicQuality={(quality) =>
              engineRef.current?.setGraphicQuality(quality)
            }
            onSetFpsLimit={(fps) => engineRef.current?.setFpsLimit(fps)}
            onPause={() => engineRef.current?.pauseGame()}
          />
        </>
      )}

      {/* 5. Pause, Victory & Game Over Modals */}
      <GameShellModals
        hud={hud}
        onStartGame={(mode?: DrillMode) => engineRef.current?.startGame(mode)}
        onResumeGame={() => engineRef.current?.resumeGame()}
        onRestartDrill={() => engineRef.current?.startGame(hud.drillMode)}
        onReturnToTitle={() => {
          engineRef.current?.returnToMainMenu();
          setHud((prev) => ({ ...prev, screen: 'MAIN_MENU' }));
        }}
        onSelectDrillMode={(mode: DrillMode) =>
          engineRef.current?.setDrillMode(mode)
        }
        onSetQualityPreset={(preset: QualityPreset) =>
          engineRef.current?.setQualityPreset(preset)
        }
        onToggleDrs={() => engineRef.current?.toggleDynamicResolution()}
        onSetGyroMode={(mode: GyroMode) => {
          void engineRef.current?.setGyroMode(mode);
        }}
        onSetGyroSensitivity={(sens: number) =>
          engineRef.current?.setGyroSensitivity(sens)
        }
        onSetLookSensitivity={(sens: number) =>
          engineRef.current?.setLookSensitivity(sens)
        }
        onSetAdsSensitivity={(sens: number) =>
          engineRef.current?.setAdsSensitivity(sens)
        }
        onRecalibrateGyro={() => engineRef.current?.recalibrateGyro()}
        onToggleHaptics={() => engineRef.current?.toggleHaptics()}
        onToggleFullscreen={() => {
          void engineRef.current?.toggleFullscreenLandscape();
        }}
        onSetGraphicQuality={(quality) =>
          engineRef.current?.setGraphicQuality(quality)
        }
        onSetFpsLimit={(fps) => engineRef.current?.setFpsLimit(fps)}
      />
    </main>
  );
}
