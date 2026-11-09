import React, { useEffect, useState } from 'react';
import { soundEngine } from '../audio/soundEngine';

interface MatchmakingModalProps {
  onMatchFound: () => void;
  onCancel: () => void;
}

export const MatchmakingModal: React.FC<MatchmakingModalProps> = ({
  onMatchFound,
  onCancel,
}) => {
  const [elapsedSec, setElapsedSec] = useState(0);
  const [matchFound, setMatchFound] = useState(false);

  useEffect(() => {
    // Cronômetro de busca estilo Warface
    const timer = window.setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);

    // Encontra a partida em ~2.4 segundos de forma ágil e satisfatória
    const matchTimer = window.setTimeout(() => {
      setMatchFound(true);
      soundEngine.playMechanicalSwitch(1.15);
    }, 2400);

    // Aguarda confirmação visual de "Partida Encontrada" antes de transicionar
    const launchTimer = window.setTimeout(() => {
      onMatchFound();
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
        <div className="relative w-20 h-20 mb-3 flex items-center justify-center">
          <div
            className={`absolute inset-0 rounded-full border-2 animate-ping ${
              matchFound ? 'border-emerald-400 opacity-60' : 'border-amber-400 opacity-40'
            }`}
          />
          <div
            className={`w-16 h-16 rounded-full border border-white/20 flex items-center justify-center shadow-lg ${
              matchFound ? 'bg-emerald-950/70 border-emerald-400' : 'bg-slate-900/80 border-amber-400/60'
            }`}
          >
            {matchFound ? (
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-emerald-400 animate-bounce" fill="none">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-amber-400 animate-spin" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="14 10" />
              </svg>
            )}
          </div>
        </div>

        {/* Status da Busca */}
        <div className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-amber-400 mb-1">
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

        {/* Metadados do Servidor Estilo Warface */}
        <div className="w-full bg-black/40 border border-white/10 rounded-xl p-3 mb-4 flex flex-col gap-1.5 text-xs font-mono">
          <div className="flex items-center justify-between text-slate-300">
            <span>Região do Servidor:</span>
            <span className="font-bold text-sky-300">SA-BRAZIL (São Paulo)</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>Latência / Ping:</span>
            <span className="font-bold text-emerald-400">18 ms · Conexão Estável</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>Jogadores na Fila:</span>
            <span className="font-bold text-amber-300">{matchFound ? '10/10 Prontos' : '9/10 Conectando...'}</span>
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
