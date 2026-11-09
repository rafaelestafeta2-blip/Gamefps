import React, { useEffect, useRef, useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { DrillMode } from '../types/game';
import { BLACKTHORN_ROSTER, VANGUARD_ROSTER } from '../data/matchRoster';
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

const YARD_BG_SCREENSHOT =
  '/assets/aistudio/fba31cbf1a9790a5d2a3dce1a17a2b999cec04ce_9bd05733.jpg';
const DUST2_BG_SCREENSHOT =
  '/assets/aistudio/Screenshot_20261109_205345_Chrome_9cb4d380.jpg';
const YARD_RADAR_IMAGE = '/assets/aistudio/Yard_Map_Radar_7754e5f9.webp';

const TUTORIAL_STORAGE_KEY = 'kinetic_plant_bomb_tutorial_played';
const LOADING_DURATION_MS = 40000; // ~40 segundos para briefing completo e visualização das equipes

export const YardMatchLoadingModal: React.FC<YardMatchLoadingModalProps> = ({
  mode = 'YARD_BOMB_5V5',
  onPrepareMap,
  onComplete,
}) => {
  const [showRoster, setShowRoster] = useState(false);
  const [progress, setProgress] = useState(4);
  const [secondsLeft, setSecondsLeft] = useState(40);
  const [isFirstTimeTutorial, setIsFirstTimeTutorial] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [statusText, setStatusText] = useState(
    'SINCRONIZANDO RECURSOS E BRIEFING DO COMANDO...'
  );
  const completedRef = useRef(false);
  const isDust2 = mode === 'DUST2_BOMB_5V5';

  const finishLoading = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    soundEngine.stopPlantBombTutorial();
    onComplete();
  };

  useEffect(() => {
    // 1. Toca tutorial se for a primeira vez do jogador no modo Plant the Bomb
    let firstTime = false;
    try {
      firstTime = localStorage.getItem(TUTORIAL_STORAGE_KEY) !== 'true';
    } catch {}

    if (firstTime) {
      setIsFirstTimeTutorial(true);
      soundEngine.playPlantBombTutorial();
      try {
        localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
      } catch {}
    }

    // Etapa 1: Mostra primeiro a foto do mapa em destaque por ~1350ms
    const revealTimer = window.setTimeout(() => {
      setShowRoster(true);
    }, 1350);

    let cancelled = false;
    let targetPct = 12;

    // Etapa 2: Executa o carregamento real da malha 3D, upload de texturas na VRAM e compilação de shaders WebGL
    if (onPrepareMap) {
      onPrepareMap(mode, (pct, label) => {
        if (cancelled) return;
        targetPct = Math.max(targetPct, pct);
        setStatusText(label);
      }).catch(() => {
        targetPct = 100;
      });
    } else {
      targetPct = 100;
    }

    const startTime = performance.now();

    const tick = window.setInterval(() => {
      const elapsed = performance.now() - startTime;
      const timeRatio = Math.min(1, elapsed / LOADING_DURATION_MS);
      const remainingSec = Math.max(0, Math.ceil((LOADING_DURATION_MS - elapsed) / 1000));
      setSecondsLeft(remainingSec);

      // Libera opção de pular espera após 5s se o mapa 3D já estiver totalmente compilado
      if (targetPct >= 100 && elapsed >= 5000) {
        setCanSkip(true);
      }

      const pacingCeiling = Math.min(100, Math.floor(timeRatio * 100));

      setProgress((prev) => {
        const allowedMax = Math.min(targetPct, pacingCeiling);
        const step = Math.max(0.4, (allowedMax - prev) * 0.18);
        const next = Math.min(allowedMax, prev + step);

        if (
          (next >= 99 && targetPct >= 100 && elapsed >= LOADING_DURATION_MS) &&
          !completedRef.current
        ) {
          window.clearInterval(tick);
          finishLoading();
          return 100;
        }
        return next;
      });
    }, 80);

    return () => {
      cancelled = true;
      window.clearTimeout(revealTimer);
      window.clearInterval(tick);
      soundEngine.stopPlantBombTutorial();
    };
  }, [mode, onPrepareMap]);

  const totalBlocks = 18;
  const filledBlocks = Math.round((progress / 100) * totalBlocks);

  return (
    <div className="fixed inset-0 z-50 bg-[#05080f] text-white select-none overflow-hidden flex flex-col justify-between font-sans">
      {/* 1. FOTO REAL DO MAPA EM TELA CHEIA (Aparece nítida primeiro e depois recebe o overlay tático) */}
      <div className="absolute inset-0">
        <img
          src={isDust2 ? DUST2_BG_SCREENSHOT : YARD_BG_SCREENSHOT}
          alt={isDust2 ? 'Mapa Counter-Strike DE_DUST2' : 'Mapa Warface Yard'}
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover object-center transition-all duration-700 ${
            showRoster ? 'scale-105 brightness-[0.38]' : 'scale-100 brightness-95'
          }`}
        />
        {/* Blueprint tático do radar ao centro do fundo */}
        <div
          className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-700 ${
            showRoster ? 'opacity-22' : 'opacity-0'
          }`}
        >
          <img
            src={YARD_RADAR_IMAGE}
            alt=""
            referrerPolicy="no-referrer"
            className="w-[62vw] max-w-[540px] max-h-[75vh] object-contain"
          />
        </div>
        <div
          className={`absolute inset-0 bg-gradient-to-b from-[#04070e]/90 via-[#050912]/65 to-[#04070e]/95 transition-opacity duration-700 ${
            showRoster ? 'opacity-100' : 'opacity-35'
          }`}
        />
      </div>

      {/* BANNER INICIAL DA FOTO DO MAPA (Antes dos jogadores surgirem) */}
      {!showRoster && (
        <div className="relative z-20 m-auto text-center px-6 py-4 rounded-2xl bg-black/70 border border-amber-400/50 shadow-2xl">
          <div className="text-xs font-mono font-bold text-amber-400 tracking-[0.25em] uppercase">
            {isDust2 ? 'OPERAÇÃO TÁTICA · DE_DUST2' : 'OPERAÇÃO TÁTICA · YARD'}
          </div>
          <h1 className="text-2xl sm:text-4xl font-display font-black tracking-wider text-white uppercase mt-1">
            {isDust2 ? 'MAPA: DE_DUST2 (BOMB 5V5)' : 'MAPA: YARD (WARFACE 5V5)'}
          </h1>
          <p className="text-xs font-mono text-slate-300 mt-1">
            Preparando terreno 3D e posicionando esquadrões Vanguard vs Blackthorn...
          </p>
        </div>
      )}

      {/* 2. TOP HEADER (KINETIC: MOBILE · STRIKE FRONT) */}
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
            {isFirstTimeTutorial && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[9px] font-mono font-bold animate-pulse">
                🎙️ BRIEFING DO COMANDANTE
              </span>
            )}
          </div>
          <div className="text-[9px] sm:text-[10px] font-mono tracking-[0.28em] text-sky-300/80 uppercase">
            STRIKE FRONT · {isDust2 ? 'MAPA DE_DUST2' : 'MAPA YARD'}
          </div>
        </div>

        {/* Legenda das 4 Classes Warface */}
        <div className="hidden md:flex items-center gap-3 bg-[#070d17]/85 border border-white/15 rounded-lg px-3 py-1">
          {(
            ['FUZILEIRO', 'MEDICO', 'ENGENHEIRO', 'FRANCO_ATIRADOR'] as WarfaceClassId[]
          ).map((cId) => (
            <div key={cId} className="flex items-center gap-1.5">
              <WarfaceClassIcon classId={cId} className="w-4 h-4" />
              <span className="text-[9px] font-mono font-bold text-slate-200">
                {WARFACE_CLASS_META[cId].label}
              </span>
            </div>
          ))}
        </div>

        <div className="text-right font-mono text-[10px] sm:text-xs">
          <span className="text-amber-400 font-bold">
            {isDust2 ? 'MAPA: DE_DUST2' : 'MAPA: YARD'}
          </span>
          <span className="text-slate-400 mx-1.5">·</span>
          <span className="text-sky-300">PLANT THE BOMB</span>
        </div>
      </header>

      {/* 3. CONFRONTO 5v5: VANGUARD vs BLACKTHORN (Surge sobre a foto do mapa) */}
      <div
        className={`relative z-10 flex-1 grid grid-cols-12 gap-2 sm:gap-4 px-3 sm:px-8 py-1 items-center max-w-6xl w-full mx-auto transition-all duration-500 ${
          showRoster
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-6 pointer-events-none'
        }`}
      >
        {/* COLUNA ESQUERDA: VANGUARD (5 OPERADORES) */}
        <div className="col-span-5 flex flex-col gap-1 sm:gap-1.5">
          <div className="flex items-center gap-2 pb-0.5">
            <h2 className="text-lg sm:text-2xl font-display font-black tracking-wider text-sky-200 drop-shadow-[0_0_12px_rgba(56,189,248,0.6)] uppercase">
              VANGUARD
            </h2>
            <VanguardTeamEmblem className="w-6 h-6 sm:w-8 sm:h-8 shrink-0" />
          </div>

          {VANGUARD_ROSTER.map((op) => (
            <div
              key={op.callsign}
              className={`relative h-9 sm:h-11 rounded border overflow-hidden flex items-center justify-between bg-[#081523]/90 transition-transform ${
                op.isPlayer
                  ? 'border-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.35)]'
                  : 'border-sky-400/55 shadow-[0_0_10px_rgba(56,189,248,0.18)]'
              }`}
            >
              {/* Retrato Tático à Esquerda */}
              <div className="w-16 sm:w-22 h-full shrink-0 relative">
                <OperatorTacticalAvatar team="VANGUARD" classId={op.classId} />
                <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[#081523] to-transparent" />
              </div>

              {/* Nome do Jogador + Classe + Ícone Oficial Warface */}
              <div className="flex-1 px-2 flex items-center justify-between min-w-0">
                <div className="min-w-0">
                  <div
                    className={`text-[10px] sm:text-xs font-display font-black tracking-wide truncate ${
                      op.isPlayer ? 'text-amber-300' : 'text-white'
                    }`}
                  >
                    {op.callsign}
                  </div>
                  <div className="text-[8px] sm:text-[9px] font-mono text-sky-300/90 uppercase tracking-wider truncate">
                    {op.title}
                  </div>
                </div>
                <WarfaceClassIcon
                  classId={op.classId}
                  className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 ml-1.5"
                />
              </div>
            </div>
          ))}
        </div>

        {/* CENTRO: ANEL VS LUMINOSO */}
        <div className="col-span-2 flex flex-col items-center justify-center text-center relative">
          <div className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center border border-white/20 bg-[#070c14]/90 shadow-[0_0_30px_rgba(56,189,248,0.35)]">
            <div className="absolute inset-0 rounded-full border-2 border-l-sky-400 border-t-sky-300 border-r-red-500 border-b-amber-400 opacity-85" />
            <span className="font-display font-black text-base sm:text-2xl tracking-wider text-white">
              VS
            </span>
          </div>
          <div className="mt-2 hidden sm:block text-[9px] font-display font-bold tracking-widest uppercase leading-tight">
            <span className="text-sky-300">VANGUARD OPERATIONS</span>
            <span className="text-slate-400 block my-0.5">VS</span>
            <span className="text-red-400">BLACKTHORN MERCENARIES</span>
          </div>
        </div>

        {/* COLUNA DIREITA: BLACKTHORN (5 OPERADORES) */}
        <div className="col-span-5 flex flex-col gap-1 sm:gap-1.5">
          <div className="flex items-center justify-end gap-2 pb-0.5">
            <BlackthornTeamEmblem className="w-6 h-6 sm:w-8 sm:h-8 shrink-0" />
            <h2 className="text-lg sm:text-2xl font-display font-black tracking-wider text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.6)] uppercase">
              BLACKTHORN
            </h2>
          </div>

          {BLACKTHORN_ROSTER.map((op) => (
            <div
              key={op.callsign}
              className="relative h-9 sm:h-11 rounded border border-red-500/55 bg-[#1b0a10]/90 shadow-[0_0_10px_rgba(239,68,68,0.18)] overflow-hidden flex items-center justify-between"
            >
              {/* Ícone da Classe Warface + Nome à Esquerda */}
              <div className="flex-1 px-2 flex items-center justify-between min-w-0">
                <WarfaceClassIcon
                  classId={op.classId}
                  className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 mr-1.5"
                />
                <div className="min-w-0 text-right">
                  <div className="text-[10px] sm:text-xs font-display font-black tracking-wide text-white truncate">
                    {op.callsign}
                  </div>
                  <div className="text-[8px] sm:text-[9px] font-mono text-red-300/90 uppercase tracking-wider truncate">
                    {op.title}
                  </div>
                </div>
              </div>

              {/* Retrato Tático à Direita */}
              <div className="w-16 sm:w-22 h-full shrink-0 relative">
                <OperatorTacticalAvatar team="BLACKTHORN" classId={op.classId} />
                <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[#1b0a10] to-transparent" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. RODAPÉ: BARRA SEGMENTADA AZUL CIANO + STATUS REAL DE SHADERS/MALHA */}
      <footer className="relative z-10 px-4 sm:px-8 pb-2.5 sm:pb-4 pt-1.5 bg-[#050811]/85 border-t border-white/10">
        <div className="max-w-xl mx-auto flex flex-col items-center">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs font-display font-bold tracking-[0.2em] text-sky-200 uppercase mb-1">
            <span>LOADING MATCH ({Math.round(progress)}%)</span>
            <span className="text-slate-400">·</span>
            <span className="text-amber-400 font-mono">COMBATE EM {secondsLeft}S</span>
          </div>

          {/* Barra Segmentada Estilo Warface Mobile */}
          <div className="w-full max-w-md border border-sky-400/60 bg-[#06101e] p-1 rounded-xs shadow-[0_0_16px_rgba(56,189,248,0.25)] grid grid-cols-18 gap-1">
            {Array.from({ length: totalBlocks }).map((_, idx) => {
              const active = idx < filledBlocks;
              return (
                <div
                  key={idx}
                  className={`h-2.5 sm:h-3 rounded-[1px] transition-colors duration-100 ${
                    active
                      ? 'bg-sky-300 shadow-[0_0_8px_rgba(125,211,252,0.95)]'
                      : 'bg-sky-950/50'
                  }`}
                />
              );
            })}
          </div>

          {canSkip && (
            <button
              onClick={finishLoading}
              className="mt-1.5 px-3 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 border border-amber-400/60 rounded text-[9px] font-mono font-bold text-amber-300 tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.25)]"
            >
              <span>⚡ ENTRAR AGORA ({secondsLeft}s)</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] sm:text-xs font-mono text-slate-300 mt-1.5">
          <div>
            <span className="text-slate-400 block text-[9px]">Modo de Jogo:</span>
            <span className="font-bold text-white">Plant the Bomb (5 vs 5)</span>
          </div>

          <div className="text-center px-2 truncate max-w-md text-[10px] text-sky-300">
            {statusText}
          </div>

          <div className="text-right">
            <span className="text-slate-400 block text-[9px]">META DA PARTIDA:</span>
            <span className="font-bold text-amber-400 tabular-nums">6 Rodadas</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
