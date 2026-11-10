import React, { useEffect, useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { DrillMode } from '../types/game';

interface WarfaceMatchmakingWidgetProps {
  selectedMode: DrillMode;
  onChangeMode: (mode: DrillMode) => void;
  onMatchReady: (mode: DrillMode) => void;
  onCancelSearch: () => void;
}

const TACTICAL_SEARCH_LOGS = [
  'SERVIDOR SA-EAST [16ms] · BUSCANDO SALA 5v5...',
  'ESTANDE DE TIRO LIVRE ENQUANTO AGUARDA PARTIDA',
  'BALANCEANDO ESQUADRÕES (VANGUARD vs BLACKTHORN)...',
  'SINCRONIZANDO OPERADORES NA SALA DE COMBATE...',
  'SALA COMPLETA (10/10)! INICIANDO TRANSPORTE...',
];

export const WarfaceMatchmakingWidget: React.FC<
  WarfaceMatchmakingWidgetProps
> = ({ selectedMode, onChangeMode, onMatchReady, onCancelSearch }) => {
  const [elapsedSec, setElapsedSec] = useState(0);
  const [playersFound, setPlayersFound] = useState(2);
  const [logIndex, setLogIndex] = useState(0);
  const [matchFound, setMatchFound] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (elapsedSec <= 3) {
      setPlayersFound(3);
      setLogIndex(0);
    } else if (elapsedSec <= 7) {
      setPlayersFound(6);
      setLogIndex(1);
    } else if (elapsedSec <= 12) {
      setPlayersFound(8);
      setLogIndex(2);
    } else if (elapsedSec <= 16) {
      setPlayersFound(9);
      setLogIndex(3);
    } else if (!matchFound) {
      setPlayersFound(10);
      setLogIndex(4);
      setMatchFound(true);
      soundEngine.playMenuSelect();
    }
  }, [elapsedSec, matchFound]);

  useEffect(() => {
    if (!matchFound) return;
    const launchTimeout = window.setTimeout(() => {
      onMatchReady(selectedMode);
    }, 1800);
    return () => window.clearTimeout(launchTimeout);
  }, [matchFound, onMatchReady, selectedMode]);

  const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
  const secs = String(elapsedSec % 60).padStart(2, '0');
  const isAssault = selectedMode === 'ASSAULT_BOMB_5V5';
  const mapLabel = isAssault ? 'ASSAULT' : 'DUST2';

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed top-2.5 left-2.5 z-35 w-[212px] sm:w-[238px] pointer-events-none select-none font-sans"
    >
      {/* Barra Minimalista de Busca no Topo Esquerdo */}
      <div
        className={`pointer-events-auto rounded-lg border backdrop-blur-md px-2.5 py-1.5 shadow-[0_6px_20px_rgba(0,0,0,0.75)] transition-colors ${
          matchFound
            ? 'bg-emerald-950/80 border-emerald-400/60'
            : 'bg-[#090d14]/80 border-white/15'
        }`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                matchFound
                  ? 'bg-emerald-400 animate-ping'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span
              className={`text-[9px] sm:text-[10px] font-display font-extrabold uppercase tracking-wider truncate ${
                matchFound ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {matchFound ? 'PARTIDA PRONTA' : 'BUSCANDO 5v5'}
            </span>
            <span className="text-[9px] font-mono font-bold text-slate-200 tabular-nums bg-white/10 px-1 rounded">
              {mins}:{secs}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playMenuSelect();
                onChangeMode(
                  isAssault ? 'DUST2_BOMB_5V5' : 'ASSAULT_BOMB_5V5'
                );
              }}
              title="Alternar mapa da fila"
              className="px-1.5 py-0.5 rounded bg-white/8 hover:bg-white/15 border border-white/10 text-[8px] font-mono font-bold text-cyan-300 uppercase cursor-pointer"
            >
              {mapLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playMenuSelect();
                onMatchReady(selectedMode);
              }}
              title="Entrar agora na partida"
              className="px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/40 text-[8px] font-mono font-bold text-amber-300 uppercase cursor-pointer"
            >
              IR
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playMenuSelect();
                onCancelSearch();
              }}
              title="Cancelar busca"
              className="w-4 h-4 rounded bg-white/8 hover:bg-red-500/25 border border-white/10 text-[8px] font-mono font-bold text-slate-300 hover:text-red-200 flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Barra Fina de Jogadores (10 slots) + Status Minimalista */}
        <div className="mt-1 flex items-center gap-1.5">
          <div className="grid grid-cols-10 gap-0.5 flex-1">
            {Array.from({ length: 10 }).map((_, idx) => {
              const filled = idx < playersFound;
              return (
                <div
                  key={idx}
                  className={`h-1 rounded-xs transition-all duration-300 ${
                    filled
                      ? matchFound
                        ? 'bg-emerald-400'
                        : 'bg-amber-400'
                      : 'bg-white/12'
                  }`}
                />
              );
            })}
          </div>
          <span className="text-[8px] font-mono font-bold text-slate-300 tabular-nums shrink-0">
            {playersFound}/10
          </span>
        </div>
      </div>

      {/* Linha Única Discreta de Log Abaixo da Barra */}
      <div className="mt-1 px-1 flex items-center gap-1 text-[8px] font-mono text-slate-300/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] truncate">
        <span className="text-amber-400 font-bold">&gt;</span>
        <span className="truncate">{TACTICAL_SEARCH_LOGS[logIndex]}</span>
      </div>
    </div>
  );
};
