import React, { useEffect, useRef, useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { BLACKTHORN_ROSTER, VANGUARD_ROSTER } from '../data/matchRoster';
import {
  isOnlineMatchActive,
  publishLocalLoadProgress,
  subscribeOnlineRoom,
} from '../multiplayer/onlineRoomService';
import { OnlineRoomState } from '../multiplayer/onlineTypes';
import { DrillMode } from '../types/game';
import {
  BlackthornTeamEmblem,
  OperatorTacticalAvatar,
  VanguardTeamEmblem,
  WARFACE_CLASS_META,
  WarfaceClassIcon,
  WarfaceClassId,
} from './WarfaceClassIcons';

interface YardMatchLoadingModalProps {
  mode?: DrillMode;
  onPrepareMap?: (
    mode: DrillMode,
    onProgress: (pct: number, statusLabel: string) => void
  ) => Promise<void>;
  onComplete: () => void;
}

const YARD_BG_SCREENSHOT = '/assets/aistudio/fba31cbf1a9790a5d2a3dce1a17a2b999cec04ce_9bd05733.jpg';
const DUST2_BG_SCREENSHOT = '/assets/aistudio/Screenshot_20261109_205345_Chrome_9cb4d380.jpg';
const ASSAULT_BG_SCREENSHOT = '/assets/aistudio/Screenshot_20261109_230919_YouTube_bbce4935.jpg';
const YARD_RADAR_IMAGE = '/assets/aistudio/Yard_Map_Radar_7754e5f9.webp';

const TUTORIAL_STORAGE_KEY = 'kinetic_plant_bomb_tutorial_played';
const BRIEFING_DURATION_MS = 40000;
const ONLINE_BARRIER_TIMEOUT_MS = 25000;

export const YardMatchLoadingModal: React.FC<YardMatchLoadingModalProps> = ({
  mode = 'YARD_BOMB_5V5',
  onPrepareMap,
  onComplete,
}) => {
  const [showRoster, setShowRoster] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isArenaReady, setIsArenaReady] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(40);
  const [isFirstTimeTutorial, setIsFirstTimeTutorial] = useState(false);
  const [statusText, setStatusText] = useState('INICIALIZANDO THREE.LOADINGMANAGER & DRACOLOADER...');
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoomState | null>(null);

  const completedRef = useRef(false);
  const localMapReadyRef = useRef(false);
  const lastProgressSentRef = useRef(-1);

  const isDust2 = mode === 'DUST2_BOMB_5V5';
  const isAssault = mode === 'ASSAULT_BOMB_5V5';
  const mapCodeLabel = isDust2 ? 'DE_DUST2' : isAssault ? 'CS_ASSAULT' : 'YARD';
  const bgScreenshot = isDust2 ? DUST2_BG_SCREENSHOT : isAssault ? ASSAULT_BG_SCREENSHOT : YARD_BG_SCREENSHOT;
  const isOnline = isOnlineMatchActive();

  const finishLoading = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    soundEngine.stopPlantBombTutorial();
    onComplete();
  };

  useEffect(() => {
    const unsub = subscribeOnlineRoom((room) => setOnlineRoom(room));
    return () => unsub();
  }, []);

  // Barreira de sincronização online: libera a partida assim que TODOS os jogadores da sala chegarem a 100%
  useEffect(() => {
    if (!isOnline || !localMapReadyRef.current || !onlineRoom) return;
    const players = Object.values(onlineRoom.players || {});
    if (players.length === 0) return;
    const allReady = players.every((p) => p.isLoaded === true || (p.loadProgress ?? 0) >= 100);
    if (allReady) {
      setStatusText('TODOS OS OPERADORES CONECTADOS E COMPILADOS (100%) — INICIANDO!');
      const t = window.setTimeout(() => finishLoading(), 450);
      return () => window.clearTimeout(t);
    }
  }, [isOnline, onlineRoom, isArenaReady]);

  useEffect(() => {
    let firstTime = false;
    try {
      firstTime = !isOnline && localStorage.getItem(TUTORIAL_STORAGE_KEY) !== 'true';
    } catch {}

    if (firstTime) {
      setIsFirstTimeTutorial(true);
      soundEngine.playPlantBombTutorial();
      try {
        localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
      } catch {}
    }

    const revealTimer = window.setTimeout(() => setShowRoster(true), 500);
    let cancelled = false;
    const startTime = performance.now();

    if (isOnline) {
      publishLocalLoadProgress(5, false);
    }

    const runRealPreparation = async () => {
      try {
        if (onPrepareMap) {
          await onPrepareMap(mode, (pct, label) => {
            if (cancelled) return;
            const clamped = Math.min(100, Math.max(0, Math.round(pct)));
            setProgress((prev) => Math.max(prev, clamped));
            setStatusText(label);
            if (isOnline && clamped - lastProgressSentRef.current >= 20 && clamped < 100) {
              lastProgressSentRef.current = clamped;
              publishLocalLoadProgress(clamped, false);
            }
          });
        }
        if (cancelled) return;
        localMapReadyRef.current = true;
        setProgress(100);
        setIsArenaReady(true);

        if (isOnline) {
          publishLocalLoadProgress(100, true);
          setStatusText('AGUARDANDO TODOS OS JOGADORES DA SALA CARREGAREM OS RECURSOS 3D...');
        } else if (!firstTime) {
          window.setTimeout(() => {
            if (!cancelled) finishLoading();
          }, 350);
        }
      } catch (err) {
        console.error('Erro ao preparar arena 3D:', err);
        if (!cancelled) {
          localMapReadyRef.current = true;
          setProgress(100);
          setIsArenaReady(true);
          if (isOnline) publishLocalLoadProgress(100, true);
          else finishLoading();
        }
      }
    };

    void runRealPreparation();

    const tick = window.setInterval(() => {
      const elapsed = performance.now() - startTime;
      const remainingSec = Math.max(0, Math.ceil((BRIEFING_DURATION_MS - elapsed) / 1000));
      setSecondsLeft(remainingSec);

      if (isOnline && localMapReadyRef.current && elapsed >= ONLINE_BARRIER_TIMEOUT_MS && !completedRef.current) {
        window.clearInterval(tick);
        finishLoading();
      } else if (firstTime && localMapReadyRef.current && elapsed >= BRIEFING_DURATION_MS && !completedRef.current) {
        window.clearInterval(tick);
        finishLoading();
      }
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(revealTimer);
      window.clearInterval(tick);
      soundEngine.stopPlantBombTutorial();
    };
  }, [mode, onPrepareMap, isOnline]);

  const totalBlocks = 18;
  const filledBlocks = Math.round((progress / 100) * totalBlocks);

  const onlinePlayers = onlineRoom ? Object.values(onlineRoom.players || {}) : [];
  const onlineReadyCount = onlinePlayers.filter((p) => p.isLoaded || (p.loadProgress ?? 0) >= 100).length;

  const vanguardDisplay = isOnline
    ? onlinePlayers.filter((p) => p.team === 'VANGUARD').map((p) => ({
        callsign: p.callsign,
        title: p.isLoaded || (p.loadProgress ?? 0) >= 100 ? '✓ 100% PRONTO' : `CARREGANDO ${p.loadProgress ?? 0}%`,
        classId: 'FUZILEIRO' as WarfaceClassId, isPlayer: true, isReady: Boolean(p.isLoaded || (p.loadProgress ?? 0) >= 100),
      }))
    : VANGUARD_ROSTER.map((op) => ({ ...op, isReady: isArenaReady }));

  const blackthornDisplay = isOnline
    ? onlinePlayers.filter((p) => p.team === 'BLACKTHORN').map((p) => ({
        callsign: p.callsign,
        title: p.isLoaded || (p.loadProgress ?? 0) >= 100 ? '✓ 100% PRONTO' : `CARREGANDO ${p.loadProgress ?? 0}%`,
        classId: 'ENGENHEIRO' as WarfaceClassId, isReady: Boolean(p.isLoaded || (p.loadProgress ?? 0) >= 100),
      }))
    : BLACKTHORN_ROSTER.map((op) => ({ ...op, isReady: isArenaReady }));

  return (
    <div className="fixed inset-0 z-50 bg-[#05080f] text-white select-none overflow-hidden flex flex-col justify-between font-sans">
      <div className="absolute inset-0">
        <img src={bgScreenshot} alt={`Mapa ${mapCodeLabel}`} referrerPolicy="no-referrer" className={`w-full h-full object-cover object-center transition-all duration-700 ${showRoster ? 'scale-105 brightness-[0.38]' : 'scale-100 brightness-95'}`} />
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-700 ${showRoster ? 'opacity-22' : 'opacity-0'}`}>
          <img src={YARD_RADAR_IMAGE} alt="" referrerPolicy="no-referrer" className="w-[62vw] max-w-[540px] max-h-[75vh] object-contain" />
        </div>
        <div className={`absolute inset-0 bg-gradient-to-b from-[#04070e]/90 via-[#050912]/65 to-[#04070e]/95 transition-opacity duration-700 ${showRoster ? 'opacity-100' : 'opacity-35'}`} />
      </div>

      {!showRoster && (
        <div className="relative z-20 m-auto text-center px-6 py-4 rounded-2xl bg-black/70 border border-amber-400/50 shadow-2xl">
          <div className="text-xs font-mono font-bold text-amber-400 tracking-[0.25em] uppercase">
            OPERAÇÃO TÁTICA · {mapCodeLabel}
          </div>
          <h1 className="text-2xl sm:text-4xl font-display font-black tracking-wider text-white uppercase mt-1">
            MAPA: {mapCodeLabel} (BOMB 5V5)
          </h1>
          <p className="text-xs font-mono text-slate-300 mt-1">
            Sincronizando recursos 3D e aguardando jogadores da sala...
          </p>
        </div>
      )}

      <header
        className={`relative z-10 px-4 sm:px-8 pt-2.5 sm:pt-3.5 flex items-center justify-between transition-all duration-500 ${
          showRoster ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-display font-black tracking-[0.16em] text-slate-100 uppercase">
              KINETIC: MOBILE
            </span>
            {isOnline && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[9px] font-mono font-bold">
                🌐 SINCRONIZAÇÃO ONLINE ({onlineReadyCount}/{onlinePlayers.length} PRONTOS)
              </span>
            )}
          </div>
          <div className="text-[9px] sm:text-[10px] font-mono tracking-[0.28em] text-sky-300/80 uppercase">
            STRIKE FRONT · MAPA {mapCodeLabel}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 bg-[#070d17]/85 border border-white/15 rounded-lg px-3 py-1">
          {(['FUZILEIRO', 'MEDICO', 'ENGENHEIRO', 'FRANCO_ATIRADOR'] as WarfaceClassId[]).map((cId) => (
            <div key={cId} className="flex items-center gap-1.5">
              <WarfaceClassIcon classId={cId} className="w-4 h-4" />
              <span className="text-[9px] font-mono font-bold text-slate-200">{WARFACE_CLASS_META[cId].label}</span>
            </div>
          ))}
        </div>

        <div className="text-right font-mono text-[10px] sm:text-xs">
          <span className="text-amber-400 font-bold">MAPA: {mapCodeLabel}</span>
          <span className="text-slate-400 mx-1.5">·</span>
          <span className="text-sky-300">PLANT THE BOMB</span>
        </div>
      </header>

      <div
        className={`relative z-10 flex-1 grid grid-cols-12 gap-2 sm:gap-4 px-3 sm:px-8 py-1 items-center max-w-6xl w-full mx-auto transition-all duration-500 ${
          showRoster ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-6 pointer-events-none'
        }`}
      >
        <div className="col-span-5 flex flex-col gap-1 sm:gap-1.5">
          <div className="flex items-center gap-2 pb-0.5">
            <h2 className="text-lg sm:text-2xl font-display font-black tracking-wider text-sky-200 drop-shadow-[0_0_12px_rgba(56,189,248,0.6)] uppercase">
              VANGUARD
            </h2>
            <VanguardTeamEmblem className="w-6 h-6 sm:w-8 sm:h-8 shrink-0" />
          </div>

          {vanguardDisplay.map((op) => (
            <div
              key={op.callsign}
              className={`relative h-9 sm:h-11 rounded border overflow-hidden flex items-center justify-between bg-[#081523]/90 transition-transform ${
                op.isReady
                  ? 'border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                  : 'border-sky-400/55 shadow-[0_0_10px_rgba(56,189,248,0.18)]'
              }`}
            >
              <div className="w-16 sm:w-22 h-full shrink-0 relative">
                <OperatorTacticalAvatar team="VANGUARD" classId={op.classId} />
                <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[#081523] to-transparent" />
              </div>
              <div className="flex-1 px-2 flex items-center justify-between min-w-0">
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs font-display font-black tracking-wide truncate text-amber-300">
                    {op.callsign}
                  </div>
                  <div className={`text-[8px] sm:text-[9px] font-mono uppercase tracking-wider truncate ${op.isReady ? 'text-emerald-300 font-bold' : 'text-sky-300/90'}`}>
                    {op.title}
                  </div>
                </div>
                <WarfaceClassIcon classId={op.classId} className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 ml-1.5" />
              </div>
            </div>
          ))}
        </div>

        <div className="col-span-2 flex flex-col items-center justify-center text-center relative">
          <div className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center border border-white/20 bg-[#070c14]/90 shadow-[0_0_30px_rgba(56,189,248,0.35)]">
            <div className="absolute inset-0 rounded-full border-2 border-l-sky-400 border-t-sky-300 border-r-red-500 border-b-amber-400 opacity-85" />
            <span className="font-display font-black text-base sm:text-2xl tracking-wider text-white">VS</span>
          </div>
        </div>

        <div className="col-span-5 flex flex-col gap-1 sm:gap-1.5">
          <div className="flex items-center justify-end gap-2 pb-0.5">
            <BlackthornTeamEmblem className="w-6 h-6 sm:w-8 sm:h-8 shrink-0" />
            <h2 className="text-lg sm:text-2xl font-display font-black tracking-wider text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.6)] uppercase">
              BLACKTHORN
            </h2>
          </div>

          {blackthornDisplay.map((op) => (
            <div
              key={op.callsign}
              className={`relative h-9 sm:h-11 rounded border bg-[#1b0a10]/90 overflow-hidden flex items-center justify-between ${
                op.isReady ? 'border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]' : 'border-red-500/55'
              }`}
            >
              <div className="flex-1 px-2 flex items-center justify-between min-w-0">
                <WarfaceClassIcon classId={op.classId} className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 mr-1.5" />
                <div className="min-w-0 text-right">
                  <div className="text-[10px] sm:text-xs font-display font-black tracking-wide text-white truncate">
                    {op.callsign}
                  </div>
                  <div className={`text-[8px] sm:text-[9px] font-mono uppercase tracking-wider truncate ${op.isReady ? 'text-emerald-300 font-bold' : 'text-red-300/90'}`}>
                    {op.title}
                  </div>
                </div>
              </div>
              <div className="w-16 sm:w-22 h-full shrink-0 relative">
                <OperatorTacticalAvatar team="BLACKTHORN" classId={op.classId} />
                <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[#1b0a10] to-transparent" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="relative z-10 px-4 sm:px-8 pb-2.5 sm:pb-4 pt-1.5 bg-[#050811]/85 border-t border-white/10">
        <div className="max-w-xl mx-auto flex flex-col items-center">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs font-display font-bold tracking-[0.2em] text-sky-200 uppercase mb-1">
            <span>LOADING MATCH ({Math.round(progress)}%)</span>
            {isOnline && (
              <>
                <span className="text-slate-400">·</span>
                <span className="text-emerald-400 font-mono">
                  SALA: {onlineReadyCount}/{onlinePlayers.length} CARREGADOS
                </span>
              </>
            )}
            {isFirstTimeTutorial && (
              <>
                <span className="text-slate-400">·</span>
                <span className="text-amber-400 font-mono">BRIEFING EM {secondsLeft}S</span>
              </>
            )}
          </div>

          <div className="w-full max-w-md border border-sky-400/60 bg-[#06101e] p-1 rounded-xs shadow-[0_0_16px_rgba(56,189,248,0.25)] grid grid-cols-18 gap-1">
            {Array.from({ length: totalBlocks }).map((_, idx) => {
              const active = idx < filledBlocks;
              return (
                <div
                  key={idx}
                  className={`h-2.5 sm:h-3 rounded-[1px] transition-colors duration-100 ${
                    active ? 'bg-sky-300 shadow-[0_0_8px_rgba(125,211,252,0.95)]' : 'bg-sky-950/50'
                  }`}
                />
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] sm:text-xs font-mono text-slate-300 mt-1.5">
          <div>
            <span className="text-slate-400 block text-[9px]">Modo de Jogo:</span>
            <span className="font-bold text-white">Plant the Bomb (5 vs 5)</span>
          </div>
          <div className="text-center px-2 truncate max-w-md text-[10px] text-sky-300">{statusText}</div>
          <div className="text-right">
            <span className="text-slate-400 block text-[9px]">META DA PARTIDA:</span>
            <span className="font-bold text-amber-400 tabular-nums">6 Rodadas</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
