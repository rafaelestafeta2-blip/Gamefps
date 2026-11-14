import { startTransition, useEffect, useRef, useState } from 'react';
// startTransition is only used for same-screen HUD ticks — never for screen changes.
import { applyAudioSettings, initAudioSystem } from './audio/audioSettings';
import { AuthLoginScreen } from './components/AuthLoginScreen';
import { GameShellModals } from './components/GameShellModals';
import { IntroScreen } from './components/IntroScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { MainMenu } from './components/MainMenu';
import { MobileTouchControls } from './components/MobileTouchControls';
import { OrientationLockOverlay } from './components/OrientationLockOverlay';
import { TacticalHudOverlay } from './components/TacticalHudOverlay';
import { VideoIntroScreen } from './components/VideoIntroScreen';
import { WarfaceMatchmakingWidget } from './components/WarfaceMatchmakingWidget';
import { WarfaceRankUpModal } from './components/WarfaceRankUpModal';
import { YardMatchLoadingModal } from './components/YardMatchLoadingModal';
import { subscribePlayerProfile } from './firebase/playerCloudSync';
import { ControlSettings, loadControlSettings, saveControlSettings } from './controls/hudLayoutSettings';
import { applyGraphicsToEngine } from './graphics/applyGraphicsToEngine';
import { FpsLimit, GameSettings, getDefaultSettings, loadGameSettings, saveGameSettings } from './graphics/graphicsSettings';
import { mobileHardware } from './mobile/nativeHardware';
import { getClassCombatModifiers } from './progression/loadoutSystem';
import { TacticalFPSEngine } from './three/fpsEngine';
import { DrillMode, GyroMode, HudState, OpticType, WeaponId } from './types/game';
import { INITIAL_HUD_STATE } from './types/initialHudState';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<TacticalFPSEngine | null>(null);
  const [hud, setHud] = useState<HudState>(INITIAL_HUD_STATE);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [preloadStatus, setPreloadStatus] = useState('INICIALIZANDO GERENCIADOR...');
  const [loadingBombMode, setLoadingBombMode] = useState<DrillMode | null>(null);
  const [matchmakingTargetMode, setMatchmakingTargetMode] =
    useState<DrillMode | null>(null);
  const [gameSettings, setGameSettings] = useState<GameSettings>(() => loadGameSettings());
  const gameSettingsRef = useRef<GameSettings>(gameSettings);
  gameSettingsRef.current = gameSettings;

  const [controlSettings, setControlSettings] = useState<ControlSettings>(() =>
    loadControlSettings()
  );
  const controlSettingsRef = useRef<ControlSettings>(controlSettings);
  controlSettingsRef.current = controlSettings;

  useEffect(() => {
    initAudioSystem(gameSettingsRef.current);
    applyAudioSettings(gameSettingsRef.current);
    const unsub = subscribePlayerProfile((state) => {
      if (engineRef.current) {
        engineRef.current.syncProgressionFromCloud(
          state.profile.playerXp,
          state.profile.activeWeapon
        );
      }
      if (state.authReady && !state.isGoogleLinked) {
        setHud((prev) => {
          if (
            prev.screen === 'MAIN_MENU' ||
            prev.screen === 'PLAYING' ||
            prev.screen === 'PAUSED' ||
            prev.screen === 'TITLE'
          ) {
            engineRef.current?.setScreenState('AUTH_LOGIN');
            return { ...prev, screen: 'AUTH_LOGIN' };
          }
          return prev;
        });
      }
    });
    return () => {
      unsub();
    };
  }, []);

  const applyControlsToEngine = (
    engine: TacticalFPSEngine,
    next: ControlSettings,
    prev?: ControlSettings
  ) => {
    engine.setLookSensitivity(next.lookSensitivity);
    engine.setAdsSensitivity(next.adsSensitivity);
    engine.setGyroSensitivity(next.gyroSensitivity);
    engine.setAimAssistStrength(next.aimAssistStrength ?? 0.45);
    if (!prev || prev.gyroMode !== next.gyroMode) {
      void engine.setGyroMode(next.gyroMode);
    }
  };

  const handleUpdateControlSettings = (next: ControlSettings) => {
    const prev = controlSettingsRef.current;
    controlSettingsRef.current = next;
    setControlSettings(next);
    saveControlSettings(next);
    if (engineRef.current) {
      applyControlsToEngine(engineRef.current, next, prev);
    }
  };

  const handleUpdateSettings = (newSettings: GameSettings) => {
    gameSettingsRef.current = newSettings;
    setGameSettings(newSettings);
    saveGameSettings(newSettings);
    applyAudioSettings(newSettings);
    if (engineRef.current) {
      applyGraphicsToEngine(engineRef.current, newSettings);
    }
  };

  const handleResetSettings = () => handleUpdateSettings(getDefaultSettings());

  const launchMatchNow = (mode?: DrillMode) => {
    if (!engineRef.current) return;
    engineRef.current.startGame(mode);
    applyGraphicsToEngine(engineRef.current, gameSettingsRef.current);
    applyControlsToEngine(engineRef.current, controlSettingsRef.current);
  };

  const handleStartMatch = (mode?: DrillMode) => {
    if (!engineRef.current) return;
    setMatchmakingTargetMode(null);
    const targetMode: DrillMode = mode || hud.drillMode || 'DUST2_BOMB_5V5';
    if (targetMode === 'FREE_RANGE') {
      launchMatchNow(targetMode);
      return;
    }
    if (hud.screen === 'MAIN_MENU' || targetMode !== hud.drillMode) {
      setLoadingBombMode(targetMode);
      return;
    }
    launchMatchNow(targetMode);
  };

  const handleStartWarfaceMatchmaking = (targetMode: DrillMode) => {
    setMatchmakingTargetMode(targetMode);
  };

  const handleSelectWeapon = (weaponId: WeaponId) => {
    if (!engineRef.current) return;
    engineRef.current.selectWeapon(weaponId);
    applyGraphicsToEngine(engineRef.current, gameSettingsRef.current);
  };

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // HUD bridge dirty-checks. Screen changes MUST be synchronous — deferring
    // PLAYING with startTransition caused a one-frame MAIN_MENU flash after loading.
    // Weapon/grenade equip must also be sync — startTransition made grenade taps feel lagged.
    const hudScreenRef = { current: 'INTRO' as string };
    const hudInteractionRef = {
      equippedGrenade: null as string | null,
      isThrowingGrenade: false,
      activeWeapon: '' as string,
    };
    const engine = new TacticalFPSEngine(container, (nextHud) => {
      if (nextHud.screen !== hudScreenRef.current) {
        hudScreenRef.current = nextHud.screen;
        hudInteractionRef.equippedGrenade = nextHud.equippedGrenade;
        hudInteractionRef.isThrowingGrenade = nextHud.isThrowingGrenade;
        hudInteractionRef.activeWeapon = nextHud.activeWeapon;
        setHud(nextHud);
        return;
      }
      const interactionChanged =
        nextHud.equippedGrenade !== hudInteractionRef.equippedGrenade ||
        nextHud.isThrowingGrenade !== hudInteractionRef.isThrowingGrenade ||
        nextHud.activeWeapon !== hudInteractionRef.activeWeapon;
      if (interactionChanged) {
        hudInteractionRef.equippedGrenade = nextHud.equippedGrenade;
        hudInteractionRef.isThrowingGrenade = nextHud.isThrowingGrenade;
        hudInteractionRef.activeWeapon = nextHud.activeWeapon;
        setHud(nextHud);
        return;
      }
      startTransition(() => {
        setHud(nextHud);
      });
    });
    engineRef.current = engine;
    const initialLoadout = getClassCombatModifiers();
    if (initialLoadout.primaryWeapon) {
      engine.selectWeapon(initialLoadout.primaryWeapon);
    }

    applyGraphicsToEngine(engine, gameSettingsRef.current);
    applyControlsToEngine(engine, controlSettingsRef.current);

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

  useEffect(() => {
    if (hud.screen === 'LOADING' && engineRef.current) {
      setPreloadProgress(0);
      setPreloadStatus('LIMPANDO MEMÓRIA E INICIALIZANDO CARREGAMENTO...');

      engineRef.current
        .preloadAssets((pct, status) => {
          setPreloadProgress(pct);
          setPreloadStatus(status);
        })
        .then(() => {
          if (engineRef.current) {
            applyGraphicsToEngine(engineRef.current, gameSettingsRef.current);
          }
        })
        .catch((err) => {
          console.warn('Asset preloader finished with fallback:', err);
          setPreloadProgress(100);
          if (engineRef.current) {
            applyGraphicsToEngine(engineRef.current, gameSettingsRef.current);
          }
        });
    }
  }, [hud.screen]);

  return (
    <main
      className="relative w-screen h-screen overflow-hidden bg-[#090b0e]"
      style={{ touchAction: 'none' }}
    >
      <OrientationLockOverlay />

      <div
        ref={canvasMountRef}
        className="w-full h-full cursor-crosshair"
        aria-label="Viewport 3D do simulador tático KINETIC"
      />

      {gameSettings.showFpsCounter && hud.screen === 'PLAYING' && (
        <div className="absolute top-2 left-2 z-50 pointer-events-none px-2 py-0.5 rounded bg-black/80 border border-amber-500/50 font-mono text-[10px] text-amber-400 flex items-center gap-2 shadow-lg">
          <span className="font-bold">{hud.liveFps} FPS</span>
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-400">{(1000 / Math.max(1, hud.liveFps)).toFixed(1)}ms</span>
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-400">DPI {hud.renderScalePercent}%</span>
        </div>
      )}

      {hud.screen === 'INTRO' && (
        <IntroScreen
          onComplete={() => {
            setHud((prev) => ({ ...prev, screen: 'VIDEO_INTRO' }));
          }}
        />
      )}

      {hud.screen === 'VIDEO_INTRO' && (
        <VideoIntroScreen
          onComplete={() => {
            engineRef.current?.setScreenState('LOADING');
            setHud((prev) => ({ ...prev, screen: 'LOADING' }));
          }}
        />
      )}

      {hud.screen === 'LOADING' && (
        <LoadingScreen
          progress={preloadProgress}
          statusLabel={preloadStatus}
          onComplete={() => {
            engineRef.current?.setScreenState('AUTH_LOGIN');
            setHud((prev) => ({ ...prev, screen: 'AUTH_LOGIN' }));
          }}
        />
      )}

      {hud.screen === 'AUTH_LOGIN' && (
        <AuthLoginScreen
          onContinueToMenu={() => {
            engineRef.current?.setScreenState('MAIN_MENU');
            setHud((prev) => ({ ...prev, screen: 'MAIN_MENU' }));
          }}
        />
      )}

      {loadingBombMode && (
        <YardMatchLoadingModal
          mode={loadingBombMode}
          onPrepareMap={(targetMode, onProg) =>
            engineRef.current
              ? engineRef.current.prepareMapForMatch(targetMode, onProg)
              : Promise.resolve()
          }
          onComplete={() => {
            const targetMode = loadingBombMode;
            // Enter PLAYING first, then dismiss loading — avoids MAIN_MENU flash.
            launchMatchNow(targetMode);
            setLoadingBombMode(null);
          }}
        />
      )}

      {(hud.screen === 'MAIN_MENU' || hud.screen === 'TITLE') && !loadingBombMode && (
        <>
          <MainMenu
            onStartTraining={() => handleStartMatch('FREE_RANGE')}
            onStartDrill={(mode) => handleStartMatch(mode)}
            onStartMatchmaking={handleStartWarfaceMatchmaking}
            activeWeapon={hud.activeWeapon}
            onSelectStartingWeapon={handleSelectWeapon}
            gameSettings={gameSettings}
            onUpdateGameSettings={handleUpdateSettings}
            onResetGameSettings={handleResetSettings}
            controlSettings={controlSettings}
            onUpdateControlSettings={handleUpdateControlSettings}
            onRecalibrateGyro={() => engineRef.current?.recalibrateGyro()}
          />
          {hud.rankUpNotification && (
            <WarfaceRankUpModal
              rankLevel={parseInt(hud.rankUpNotification, 10) || hud.rankLevel}
              onConfirm={() => {
                engineRef.current?.acknowledgeRankUp();
                setHud((prev) => ({ ...prev, rankUpNotification: null }));
              }}
            />
          )}
        </>
      )}

      {hud.screen === 'PLAYING' && (
        <>
          {!hud.yardBomb?.isSpectating &&
            hud.yardBomb?.roundState !== 'MATCH_OVER' &&
            hud.yardBomb?.roundState !== 'EQUIP' && (
              <MobileTouchControls
              hud={hud}
              controlSettings={controlSettings}
              onMove={(mx, my, sprint) => engineRef.current?.setTouchMovement(mx, my, sprint)}
              onLookDelta={(dx, dy) => engineRef.current?.applyTouchLookDelta(dx, dy)}
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
          )}

          <TacticalHudOverlay
            hud={hud}
            onSelectWeapon={handleSelectWeapon}
            onToggleWeaponSlot={() => engineRef.current?.toggleWeaponSlot()}
            onInspectWeapon={() => engineRef.current?.triggerWeaponInspect()}
            onSelectOptic={(optic: OpticType) => engineRef.current?.setOptic(optic)}
            onToggleCanted={() => engineRef.current?.toggleCantedSight()}
            onToggleSuppressor={() => engineRef.current?.toggleSuppressor()}
            onCycleCharm={() => engineRef.current?.cycleWeaponCharm()}
            onToggleLaser={() => engineRef.current?.toggleLaser()}
            onCycleFireMode={() => engineRef.current?.cycleFireMode()}
            onResupply={() => engineRef.current?.resupplyAmmo()}
            onSupportHeld={(held) => engineRef.current?.setClassSupportHeld(held)}
            onThrowGrenade={(type) => engineRef.current?.throwGrenade(type)}
            onToggleMute={() => engineRef.current?.toggleMute()}
            onToggleDock={() => engineRef.current?.toggleDockCollapsed()}
            onToggleFullscreen={() => {
              void engineRef.current?.toggleFullscreenLandscape();
            }}
            onPause={() => engineRef.current?.pauseGame()}
            onPlantBomb={() => engineRef.current?.triggerPlantBomb()}
            onCycleSpectator={(dir) => engineRef.current?.cycleSpectator(dir)}
            onReturnToMenu={() => {
              setMatchmakingTargetMode(null);
              engineRef.current?.returnToMainMenu();
              setHud((prev) => ({ ...prev, screen: 'MAIN_MENU' }));
            }}
          />

        </>
      )}

      {matchmakingTargetMode &&
        !loadingBombMode &&
        (hud.screen === 'MAIN_MENU' ||
          hud.screen === 'TITLE' ||
          (hud.screen === 'PLAYING' && hud.drillMode === 'FREE_RANGE')) && (
          <WarfaceMatchmakingWidget
            selectedMode={matchmakingTargetMode}
            onChangeMode={(nextMode) => setMatchmakingTargetMode(nextMode)}
            onMatchReady={(readyMode) => {
              setMatchmakingTargetMode(null);
              if (document.pointerLockElement) {
                document.exitPointerLock();
              }
              setLoadingBombMode(readyMode);
            }}
            onCancelSearch={() => setMatchmakingTargetMode(null)}
          />
        )}

      {(hud.screen === 'PAUSED' ||
        hud.screen === 'TITLE' ||
        hud.screen === 'VICTORY' ||
        hud.screen === 'GAME_OVER') && (
        <GameShellModals
          hud={hud}
          fpsLimit={gameSettings.fpsLimit}
          vibration={gameSettings.vibration}
          controlSettings={controlSettings}
          onUpdateControlSettings={handleUpdateControlSettings}
          onStartGame={(mode?: DrillMode) => handleStartMatch(mode)}
          onResumeGame={() => engineRef.current?.resumeGame()}
          onRestartDrill={() => handleStartMatch(hud.drillMode)}
          onReturnToTitle={() => {
            setMatchmakingTargetMode(null);
            engineRef.current?.returnToMainMenu();
            setHud((prev) => ({ ...prev, screen: 'MAIN_MENU' }));
          }}
          onSelectDrillMode={(mode: DrillMode) => engineRef.current?.setDrillMode(mode)}
          onSetGyroMode={(m: GyroMode) => handleUpdateControlSettings({ ...controlSettingsRef.current, gyroMode: m })}
          onSetGyroSensitivity={(s: number) => handleUpdateControlSettings({ ...controlSettingsRef.current, gyroSensitivity: s })}
          onSetLookSensitivity={(s: number) => handleUpdateControlSettings({ ...controlSettingsRef.current, lookSensitivity: s })}
          onSetAdsSensitivity={(s: number) => handleUpdateControlSettings({ ...controlSettingsRef.current, adsSensitivity: s })}
          onRecalibrateGyro={() => engineRef.current?.recalibrateGyro()}
          onToggleHaptics={() => handleUpdateSettings({ ...gameSettingsRef.current, vibration: !gameSettingsRef.current.vibration })}
          onToggleFullscreen={() => { void engineRef.current?.toggleFullscreenLandscape(); }}
          onSetFpsLimit={(fps: number) => handleUpdateSettings({ ...gameSettingsRef.current, fpsLimit: fps as FpsLimit, preset: 'CUSTOM' })}
        />
      )}
    </main>
  );
}
