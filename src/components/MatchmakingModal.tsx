import React, { useEffect, useRef, useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { prefetchMapAssetsForMode } from '../three/mapAssetCatalog';
import { DrillMode } from '../types/game';
import { thumbForDrillMode } from './mapSelectThumbs';

interface MatchmakingModalProps {
  onMatchFound: (selectedMode: DrillMode) => void;
  onCancel: () => void;
}

export const MatchmakingModal: React.FC<MatchmakingModalProps> = ({
  onMatchFound,
  onCancel,
}) => {
  const [elapsedSec, setElapsedSec] = useState(0);
  const [matchFound, setMatchFound] = useState(false);
  const [selectedMap, setSelectedMap] = useState<DrillMode>('ASSAULT_BOMB_5V5');
  const selectedMapRef = useRef<DrillMode>(selectedMap);
  selectedMapRef.current = selectedMap;

  // Prefetch selected arena GLB + Draco while the queue UI runs (Warface-style).
  useEffect(() => {
    void prefetchMapAssetsForMode(selectedMap);
  }, [selectedMap]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);

    const matchTimer = window.setTimeout(() => {
      setMatchFound(true);
      soundEngine.playMechanicalSwitch(1.15);
    }, 2400);

    const launchTimer = window.setTimeout(() => {
      onMatchFound(selectedMapRef.current);
    }, 3200);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(matchTimer);
      window.clearTimeout(launchTimer);
    };
  }, [onMatchFound]);

  const formattedTime = `00:${elapsedSec < 10 ? '0' : ''}${elapsedSec}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none">
      <div className="relative w-full max-w-md bg-[#0a0f18]/95 border-2 border-amber-400/80 rounded-2xl p-5 shadow-[0_0_35px_rgba(245,158,11,0.35)] flex flex-col items-center text-center overflow-hidden">
        {/* Glow de fundo */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
            matchFound
              ? 'bg-gradient-to-b from-emerald-500/15 via-transparent to-transparent opacity-100'
              : 'bg-gradient-to-b from-amber-500/10 via-transparent to-transparent opacity-70'
          }`}
        />

        {/* Radar animado / Pulsar de Matchmaking */}
        <div className="relative w-18 h-18 mb-2.5 flex items-center justify-center">
          <div
            className={`absolute inset-0 rounded-full border-2 animate-ping ${
              matchFound ? 'border-emerald-400 opacity-60' : 'border-amber-400 opacity-40'
            }`}
          />
          <div
            className={`w-14 h-14 rounded-full border border-white/20 flex items-center justify-center shadow-lg ${
              matchFound ? 'bg-emerald-950/70 border-emerald-400' : 'bg-slate-900/80 border-amber-400/60'
            }`}
          >
            {matchFound ? (
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-emerald-400 animate-bounce" fill="none">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-amber-400 animate-spin" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="14 10" />
              </svg>
            )}
          </div>
        </div>

        {/* Status da Busca */}
        <div className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-amber-400 mb-0.5">
          {matchFound ? 'SISTEMA DE MATCHMAKING' : 'PROCURANDO PARTIDA...'}
        </div>

        <h2 className="text-xl sm:text-2xl font-display font-black tracking-wider uppercase text-white mb-2">
          {matchFound ? (
            <span className="text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]">
              PARTIDA ENCONTRADA!
            </span>
          ) : (
            'PLANT THE BOMB 5v5'
          )}
        </h2>

        {/* Seletor de Arena Oficial (.GLB) */}
        <div className="w-full mb-3 relative z-10">
          <div className="text-[9px] font-mono uppercase tracking-widest text-slate-400 mb-1">
            SELECIONAR MAPA DA OPERAÇÃO (.GLB):
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                {
                  id: 'ASSAULT_BOMB_5V5' as DrillMode,
                  title: 'CS_ASSAULT',
                  sub: 'Galpão Industrial · Real Light',
                },
                {
                  id: 'DUST2_BOMB_5V5' as DrillMode,
                  title: 'DE_DUST2',
                  sub: 'Deserto Tático · Clássico 5v5',
                },
                {
                  id: 'INDUSTRIA_BOMB_5V5' as DrillMode,
                  title: 'INDUSTRIA',
                  sub: 'Pátio Industrial · 2K',
                },
                {
                  id: 'HANGAR_BOMB_5V5' as DrillMode,
                  title: 'HANGAR',
                  sub: 'Angar Industrial · 2K',
                },
                {
                  id: 'EASTERN_CITY_BOMB_5V5' as DrillMode,
                  title: 'EASTERN CITY',
                  sub: 'Cidade Leste · 2K',
                },
                {
                  id: 'MIRAGE_ANUBIS_BOMB_5V5' as DrillMode,
                  title: 'MIRAGE ANUBIS',
                  sub: 'Deserto · WebP 2K',
                },
              ] as const
            ).map((m) => {
              const active = selectedMap === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playMechanicalSwitch(1.05);
                    setSelectedMap(m.id);
                  }}
                  className={`rounded-lg border text-left transition-all cursor-pointer overflow-hidden ${
                    active
                      ? 'bg-amber-500/25 border-amber-400 text-white shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                      : 'bg-black/45 border-white/15 text-slate-300 hover:border-white/35'
                  }`}
                >
                  <img
                    src={thumbForDrillMode(m.id)}
                    alt={m.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-10 object-cover object-center opacity-95"
                    draggable={false}
                  />
                  <div className="px-2.5 py-1.5">
                    <div className="text-[10px] font-display font-black tracking-wider text-amber-300">
                      {m.title}
                    </div>
                    <div className="text-[8px] font-mono text-slate-300 truncate">{m.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Metadados do Servidor Estilo Warface */}
        <div className="w-full bg-black/40 border border-white/10 rounded-xl p-3 mb-3.5 flex flex-col gap-1.5 text-xs font-mono">
          <div className="flex items-center justify-between text-slate-300">
            <span>Mapa Selecionado:</span>
            <span className="font-bold text-amber-300">
              {selectedMap === 'ASSAULT_BOMB_5V5'
                ? 'CS_ASSAULT (.GLB)'
                : selectedMap === 'INDUSTRIA_BOMB_5V5'
                  ? 'INDUSTRIA (.GLB)'
                  : selectedMap === 'HANGAR_BOMB_5V5'
                    ? 'HANGAR (.GLB)'
                    : selectedMap === 'EASTERN_CITY_BOMB_5V5'
                      ? 'EASTERN CITY (.GLB)'
                    : selectedMap === 'MIRAGE_ANUBIS_BOMB_5V5'
                      ? 'MIRAGE ANUBIS (.GLB)'
                    : 'DE_DUST2 (.GLB)'}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>Região do Servidor:</span>
            <span className="font-bold text-sky-300">SA-BRAZIL (São Paulo)</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>Jogadores na Fila:</span>
            <span className="font-bold text-emerald-400">
              {matchFound ? '10/10 Prontos' : '9/10 Conectando...'}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-white/10">
            <span>Tempo Decorrido:</span>
            <span className="font-bold text-white tabular-nums">{formattedTime}</span>
          </div>
        </div>

        {/* Botão Cancelar ou Aviso de Conexão */}
        {matchFound ? (
          <div className="text-xs font-mono text-emerald-300 animate-pulse">
            Carregando mapa e sincronizando esquadrões...
          </div>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 rounded-lg bg-red-600/80 hover:bg-red-500 border border-red-400 text-white font-display font-black text-xs tracking-wider uppercase transition-colors cursor-pointer shadow-md"
          >
            CANCELAR BUSCA
          </button>
        )}
      </div>
    </div>
  );
};
