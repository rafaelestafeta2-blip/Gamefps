import React, { useEffect, useRef, useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import {
  leaveActiveRoom,
  quickMatchOrCreateRoom,
  startMatchInActiveRoom,
  subscribeOnlineRoom,
} from '../multiplayer/onlineRoomService';
import { OnlineRoomState } from '../multiplayer/onlineTypes';
import { DrillMode } from '../types/game';

interface WarfaceMatchmakingWidgetProps {
  selectedMode: DrillMode;
  onChangeMode: (mode: DrillMode) => void;
  onMatchReady: (mode: DrillMode) => void;
  onCancelSearch: () => void;
}

const REQUIRED_PUBLIC_PLAYERS = 10;

export const WarfaceMatchmakingWidget: React.FC<WarfaceMatchmakingWidgetProps> = ({
  selectedMode,
  onChangeMode,
  onMatchReady,
  onCancelSearch,
}) => {
  const [elapsedSec, setElapsedSec] = useState(0);
  const [activeRoom, setActiveRoom] = useState<OnlineRoomState | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [matchFound, setMatchFound] = useState(false);
  const launchedRef = useRef(false);

  // Cronômetro em segundo plano
  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Entra ou cria automaticamente uma sala pública (isPrivate: false) para o mapa selecionado
  useEffect(() => {
    let cancelled = false;
    setIsConnecting(true);
    setMatchFound(false);
    launchedRef.current = false;

    quickMatchOrCreateRoom(selectedMode)
      .then((room) => {
        if (cancelled) return;
        setActiveRoom(room);
        setIsConnecting(false);
      })
      .catch(() => {
        if (!cancelled) setIsConnecting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMode]);

  // Escuta em tempo real a entrada dos jogadores reais na sala pública e aguarda fechar 10/10
  useEffect(() => {
    const unsub = subscribeOnlineRoom((room) => {
      setActiveRoom(room);
      if (!room || launchedRef.current) return;

      const realCount = Object.keys(room.players || {}).length;

      // Só inicia automaticamente a partida pública quando juntar os 10 jogadores reais (ou se a sala já mudou para PLAYING)
      if (room.status === 'PLAYING' || realCount >= REQUIRED_PUBLIC_PLAYERS) {
        launchedRef.current = true;
        setMatchFound(true);
        soundEngine.playMenuSelect();
        if (room.status !== 'PLAYING') {
          void startMatchInActiveRoom();
        }
        window.setTimeout(() => {
          onMatchReady(room.arenaMode);
        }, 1200);
      }
    });
    return () => unsub();
  }, [onMatchReady]);

  const playersCount = activeRoom ? Object.keys(activeRoom.players || {}).length : 1;
  const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
  const secs = String(elapsedSec % 60).padStart(2, '0');
  const mapLabel =
    selectedMode === 'ASSAULT_BOMB_5V5'
      ? 'CS_ASSAULT'
      : selectedMode === 'INDUSTRIA_BOMB_5V5'
        ? 'INDUSTRIA'
        : selectedMode === 'HANGAR_BOMB_5V5'
          ? 'HANGAR'
          : 'DE_DUST2';

  const handleCancel = async () => {
    soundEngine.playMenuSelect();
    await leaveActiveRoom();
    onCancelSearch();
  };

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="fixed top-12 left-3 z-45 w-[245px] sm:w-[275px] pointer-events-none select-none font-sans"
    >
      <div
        className={`pointer-events-auto rounded-xl border backdrop-blur-md px-3 py-2 shadow-[0_8px_28px_rgba(0,0,0,0.85)] transition-colors ${
          matchFound
            ? 'bg-emerald-950/90 border-emerald-400/70'
            : 'bg-[#090d14]/92 border-amber-400/50'
        }`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            {/* Radar / Spinner de Procura em Segundo Plano */}
            <div className="relative w-3.5 h-3.5 flex items-center justify-center shrink-0">
              <span
                className={`absolute inset-0 rounded-full border-2 ${
                  matchFound
                    ? 'border-emerald-400 animate-ping'
                    : 'border-amber-400 border-t-transparent animate-spin'
                }`}
              />
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  matchFound ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
            </div>

            <span
              className={`text-[10px] sm:text-[11px] font-display font-black uppercase tracking-wider truncate ${
                matchFound ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {matchFound ? 'PARTIDA ENCONTRADA!' : 'PROCURANDO PARTIDA'}
            </span>
            <span className="text-[9px] font-mono font-bold text-slate-200 tabular-nums bg-white/10 px-1.5 py-0.5 rounded">
              {mins}:{secs}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playMenuSelect();
                onChangeMode(
                  selectedMode === 'DUST2_BOMB_5V5'
                    ? 'ASSAULT_BOMB_5V5'
                    : selectedMode === 'ASSAULT_BOMB_5V5'
                      ? 'INDUSTRIA_BOMB_5V5'
                      : selectedMode === 'INDUSTRIA_BOMB_5V5'
                        ? 'HANGAR_BOMB_5V5'
                        : 'DUST2_BOMB_5V5'
                );
              }}
              title="Alternar mapa da fila"
              className="px-1.5 py-0.5 rounded bg-white/8 hover:bg-white/15 border border-white/10 text-[8px] font-mono font-bold text-cyan-300 uppercase cursor-pointer"
            >
              {mapLabel}
            </button>
            <button
              type="button"
              onClick={() => void handleCancel()}
              title="Cancelar procura de partida"
              className="w-4 h-4 rounded bg-red-500/20 hover:bg-red-500/35 border border-red-400/40 text-[9px] font-mono font-bold text-red-200 flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Barra de 10 Slots de Jogadores Reais */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="grid grid-cols-10 gap-0.5 flex-1">
            {Array.from({ length: REQUIRED_PUBLIC_PLAYERS }).map((_, idx) => {
              const filled = idx < playersCount;
              return (
                <div
                  key={idx}
                  className={`h-1.5 rounded-xs transition-all duration-300 ${
                    filled
                      ? matchFound
                        ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                        : 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
                      : 'bg-white/12'
                  }`}
                />
              );
            })}
          </div>
          <span className="text-[9px] font-mono font-black text-amber-300 tabular-nums shrink-0">
            {playersCount}/{REQUIRED_PUBLIC_PLAYERS}
          </span>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2 text-[8px] font-mono text-slate-300">
          <span className="truncate">
            {isConnecting
              ? 'Conectando à fila global Firebase...'
              : matchFound
                ? '10/10 Jogadores prontos! Iniciando mapa...'
                : `Aguardando jogadores online (${playersCount}/10)...`}
          </span>
          <button
            type="button"
            onClick={async () => {
              soundEngine.playMenuSelect();
              const launchArena = activeRoom?.arenaMode || selectedMode;
              await leaveActiveRoom();
              onMatchReady(launchArena);
            }}
            className="shrink-0 px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-[8px] font-mono font-bold text-amber-300 uppercase cursor-pointer"
          >
            ENTRAR C/ BOTS ›
          </button>
        </div>
      </div>
    </div>
  );
};
