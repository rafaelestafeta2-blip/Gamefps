import React from 'react';
import { DrillMode } from '../types/game';

interface MainMenuOverlaysProps {
  showEventsModal: boolean;
  onCloseEvents: () => void;
  showNewsModal: boolean;
  onCloseNews: () => void;
  onLaunchDrill: (mode: DrillMode) => void;
  onLaunchTraining: () => void;
  onOpenPrivateLobby: () => void;
}

export const MainMenuOverlays: React.FC<MainMenuOverlaysProps> = ({
  showEventsModal,
  onCloseEvents,
  showNewsModal,
  onCloseNews,
  onLaunchDrill,
  onLaunchTraining,
  onOpenPrivateLobby,
}) => {
  return (
    <>
      {showEventsModal && (
        <div
          onClick={onCloseEvents}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#0b0e16]/98 border border-red-500/50 rounded-xl p-4 shadow-[0_0_40px_rgba(220,38,38,0.35)]"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
              <span className="font-display font-black text-sm text-amber-400 uppercase tracking-wider">
                EVENTOS &amp; OPERAÇÕES ESPECIAIS
              </span>
              <button
                type="button"
                onClick={onCloseEvents}
                className="text-xs font-mono text-slate-400 hover:text-white cursor-pointer"
              >
                FECHAR ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onCloseEvents();
                  onLaunchDrill('KILLHOUSE_BLITZ');
                }}
                className="p-3 rounded-lg bg-red-600/20 hover:bg-red-600/35 border border-red-500/50 text-left cursor-pointer"
              >
                <div className="font-display font-black text-xs text-white uppercase">
                  BATALHA SUPREMA
                </div>
                <div className="text-[9px] font-mono text-slate-300 mt-0.5">
                  Killhouse CQB Contra o Tempo
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  onCloseEvents();
                  onLaunchTraining();
                }}
                className="p-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-left cursor-pointer"
              >
                <div className="font-display font-black text-xs text-amber-300 uppercase">
                  ESTANDE DE TIRO
                </div>
                <div className="text-[9px] font-mono text-slate-300 mt-0.5">
                  Treino Balístico Livre
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  onCloseEvents();
                  onLaunchDrill('TACTICAL_WAVE');
                }}
                className="p-3 rounded-lg bg-sky-500/15 hover:bg-sky-500/30 border border-sky-400/45 text-left cursor-pointer"
              >
                <div className="font-display font-black text-xs text-sky-300 uppercase">
                  CONTRA IA
                </div>
                <div className="text-[9px] font-mono text-slate-300 mt-0.5">
                  Patrulhas Offline
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  onCloseEvents();
                  onOpenPrivateLobby();
                }}
                className="p-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-400/45 text-left cursor-pointer"
              >
                <div className="font-display font-black text-xs text-emerald-300 uppercase">
                  SALA PRIVADA X1
                </div>
                <div className="text-[9px] font-mono text-slate-300 mt-0.5">
                  Código de Sala &amp; Amigos
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewsModal && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed top-14 right-4 z-50 max-w-xs bg-[#0c0e14]/98 border border-red-500/50 rounded-xl p-4 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/15">
            <span className="font-black text-xs text-amber-400 tracking-wider">
              CORREIO TÁTICO
            </span>
            <button
              type="button"
              onClick={onCloseNews}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
          <p className="font-mono text-[11px] text-slate-300 leading-relaxed">
            • <b>Temporada 1: A Nova Era</b> ativa no Modo Ranked 5v5.
            <br />• <b>Estandarte 3D Blackthorn</b> &amp; Operador integrados.
            <br />• <b>70 Patentes Militares</b> e Arsenal L49 sincronizados.
          </p>
        </div>
      )}
    </>
  );
};
