import React from 'react';
import { YardBombHudInfo } from '../types/game';
import { bindTap } from './hudTapUtils';
import { PostMatchSummaryOverlay } from './PostMatchSummaryOverlay';
import { BlackthornTeamEmblem, VanguardTeamEmblem } from './WarfaceClassIcons';

interface YardBombHudBarProps {
  yardBomb: YardBombHudInfo;
  onPlantBomb: () => void;
  onReturnToMenu?: () => void;
  onCycleSpectator?: (dir: -1 | 1) => void;
}

export const YardBombHudBar: React.FC<YardBombHudBarProps> = ({
  yardBomb,
  onPlantBomb,
  onReturnToMenu,
  onCycleSpectator,
}) => {
  if (yardBomb.roundState === 'MATCH_OVER') {
    return (
      <PostMatchSummaryOverlay
        yardBomb={yardBomb}
        onCloseToMenu={onReturnToMenu}
      />
    );
  }

  const isPlanted = yardBomb.bombStatus === 'PLANTED';
  const activeSeconds = isPlanted
    ? Math.ceil(yardBomb.c4TimerSec)
    : Math.ceil(yardBomb.roundTimerSec);
  const mins = Math.floor(activeSeconds / 60);
  const secs = activeSeconds % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <>
      {/* TOP-CENTER: WARFACE 5v5 PLANT THE BOMB SCOREBOARD (VANGUARD vs BLACKTHORN · 6 RODADAS) */}
      <div className="fixed top-2 left-1/2 -translate-x-1/2 z-25 pointer-events-none select-none flex flex-col items-center gap-1 font-mono">
        <div className="flex items-center gap-2 bg-[#070b12]/92 border border-white/20 rounded-xl px-2.5 py-1 shadow-xl">
          {/* VANGUARD Team + Alive Pips + Round Score */}
          <div className="flex items-center gap-1.5" title="Equipe Vanguard (Atacantes)">
            <VanguardTeamEmblem className="w-4 h-4 shrink-0" />
            <span className="text-[10px] font-display font-black text-sky-300 tracking-wide">
              VANGUARD
            </span>
            <div className="flex items-center gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={`ally-${i}`}
                  className={`w-2 h-2 rounded-xs border ${
                    i < yardBomb.alliesAlive
                      ? 'bg-sky-400 border-sky-200 shadow-[0_0_5px_rgba(56,189,248,0.8)]'
                      : 'bg-slate-800 border-white/10'
                  }`}
                />
              ))}
            </div>
            <span className="px-1.5 py-0.5 rounded bg-sky-500/25 border border-sky-400/50 text-xs font-black text-sky-200 tabular-nums">
              {yardBomb.vanguardScore}
            </span>
          </div>

          {/* Center Round Indicator & Timer / Bomb Status */}
          <div className="flex flex-col items-center px-1">
            <span className="text-[8px] font-mono font-bold text-slate-400 tracking-widest uppercase leading-none mb-0.5">
              RODADA {yardBomb.currentRound}/{yardBomb.maxRounds}
            </span>
            <div
              className={`px-2 py-0.5 rounded border text-xs font-black tabular-nums leading-none ${
                isPlanted
                  ? 'bg-red-600/95 border-red-300 text-white shadow-[0_0_15px_rgba(239,68,68,0.8)]'
                  : 'bg-black/85 border-amber-400/50 text-amber-300'
              }`}
            >
              {isPlanted ? `C4 [${yardBomb.plantedSite}] ${timeStr}` : timeStr}
            </div>
          </div>

          {/* BLACKTHORN Round Score + Alive Pips + Team */}
          <div className="flex items-center gap-1.5" title="Equipe Blackthorn (Defensores)">
            <span className="px-1.5 py-0.5 rounded bg-red-500/25 border border-red-400/50 text-xs font-black text-red-200 tabular-nums">
              {yardBomb.blackthornScore}
            </span>
            <div className="flex items-center gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={`enemy-${i}`}
                  className={`w-2 h-2 rounded-xs border ${
                    i < yardBomb.enemiesAlive
                      ? 'bg-red-500 border-red-200 shadow-[0_0_5px_rgba(239,68,68,0.8)]'
                      : 'bg-slate-800 border-white/10'
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] font-display font-black text-red-400 tracking-wide">
              BLACKTHORN
            </span>
            <BlackthornTeamEmblem className="w-4 h-4 shrink-0" />
          </div>
        </div>

        {/* Current Map Location Callout & Bomb Sites A / B */}
        <div className="flex items-center gap-1.5 bg-black/75 border border-white/15 rounded-lg px-2.5 py-0.5 text-[9px] text-slate-200">
          <span className="px-1 rounded bg-red-500/30 border border-red-400 text-red-200 font-bold">
            A
          </span>
          <span className="px-1 rounded bg-sky-500/30 border border-sky-400 text-sky-200 font-bold">
            B
          </span>
          <span className="text-amber-300 font-bold tracking-wider uppercase">
            {yardBomb.calloutLabel}
          </span>
        </div>
      </div>

      {/* MODO ESPECTADOR TÁTICO 5V5 (Acompanhando aliados vivos até o fim da rodada) */}
      {yardBomb.roundState === 'PLAYING' && yardBomb.isSpectating && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto select-none font-mono w-[min(92vw,440px)]"
        >
          <div className="bg-[#070b12]/92 border-2 border-sky-400/60 rounded-2xl p-3 shadow-[0_0_30px_rgba(14,165,233,0.35)] flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px] border-b border-white/10 pb-1.5">
              <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-400/50 text-red-300 font-bold uppercase tracking-wider">
                VOCÊ FOI ELIMINADO
              </span>
              <span className="text-amber-300 font-bold uppercase tracking-wider">
                RENASCIMENTO NA PRÓXIMA RODADA
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                {...bindTap(() => onCycleSpectator?.(-1))}
                className="px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-sky-400/40 text-sky-200 font-display font-black text-xs tracking-wider uppercase active:scale-95 transition-transform cursor-pointer"
              >
                ◄ ANTERIOR [Q]
              </button>

              <div className="flex flex-col items-center text-center flex-1 min-w-0">
                <span className="text-[9px] text-slate-400 uppercase tracking-widest">
                  CÂMERA DE ESPECTADOR (ALIADO VIVO)
                </span>
                <span className="text-sm font-display font-black text-sky-300 truncate">
                  {yardBomb.spectatedCallsign || 'VANGUARD-02'}
                </span>
                <div className="w-full max-w-[140px] h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1 border border-white/10">
                  <div
                    className="h-full bg-emerald-400 transition-all"
                    style={{
                      width: `${Math.max(0, Math.min(100, yardBomb.spectatedHealth ?? 100))}%`,
                    }}
                  />
                </div>
              </div>

              <button
                type="button"
                {...bindTap(() => onCycleSpectator?.(1))}
                className="px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-sky-400/40 text-sky-200 font-display font-black text-xs tracking-wider uppercase active:scale-95 transition-transform cursor-pointer"
              >
                PRÓXIMO [E] ►
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE PLANT C4 BUTTON WHEN INSIDE BOMB SITE A OR B */}
      {yardBomb.roundState === 'PLAYING' &&
        !yardBomb.isSpectating &&
        yardBomb.nearSite &&
        yardBomb.bombStatus !== 'PLANTED' && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="fixed top-22 left-1/2 -translate-x-1/2 z-40 pointer-events-auto select-none font-mono"
          >
            <button
              type="button"
              {...bindTap(onPlantBomb)}
              className="relative overflow-hidden px-4 py-2 rounded-xl bg-red-600/95 hover:bg-red-500 border-2 border-amber-300 text-white font-display font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(239,68,68,0.8)] active:scale-95 transition-transform cursor-pointer flex items-center gap-2"
            >
              {yardBomb.bombStatus === 'PLANTING' && (
                <div
                  className="absolute inset-y-0 left-0 bg-amber-400/40 pointer-events-none transition-all"
                  style={{ width: `${Math.round(yardBomb.plantProgress * 100)}%` }}
                />
              )}
              <span className="relative z-10">
                {yardBomb.bombStatus === 'PLANTING'
                  ? `PLANTANDO BOMBA C4 NO PONTO ${yardBomb.nearSite} (${Math.round(
                      yardBomb.plantProgress * 100
                    )}%)...`
                  : `PLANTAR BOMBA C4 — PONTO ${yardBomb.nearSite} [E / TOQUE]`}
              </span>
            </button>
          </div>
        )}

      {/* BANNER DE FIM DE RODADA (Reinicia automaticamente para a próxima rodada) */}
      {yardBomb.roundState === 'ROUND_OVER' && (
        <div className="fixed inset-0 z-45 pointer-events-none flex items-center justify-center p-4 select-none">
          <div
            className={`max-w-lg w-full rounded-2xl border-2 p-5 text-center shadow-2xl bg-[#070b12]/95 ${
              yardBomb.roundWinner === 'VANGUARD'
                ? 'border-sky-400 shadow-[0_0_40px_rgba(56,189,248,0.35)]'
                : 'border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.35)]'
            }`}
          >
            <div className="flex justify-center mb-2">
              {yardBomb.roundWinner === 'VANGUARD' ? (
                <VanguardTeamEmblem className="w-12 h-12" />
              ) : (
                <BlackthornTeamEmblem className="w-12 h-12" />
              )}
            </div>
            <div className="text-xs font-mono font-bold tracking-[0.2em] text-amber-400 uppercase">
              FIM DA RODADA {yardBomb.currentRound} DE {yardBomb.maxRounds}
            </div>
            <h2
              className={`text-xl sm:text-2xl font-display font-black tracking-wider uppercase mt-1 ${
                yardBomb.roundWinner === 'VANGUARD' ? 'text-sky-300' : 'text-red-400'
              }`}
            >
              VITÓRIA DA RODADA: {yardBomb.roundWinner}
            </h2>
            <p className="text-xs font-mono text-slate-300 mt-1">
              {yardBomb.roundWinReason}
            </p>

            <div className="my-3 py-2 px-4 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center gap-6 font-display font-black text-lg tabular-nums">
              <span className="text-sky-300">
                VANGUARD {yardBomb.vanguardScore}
              </span>
              <span className="text-slate-500 text-xs">VS</span>
              <span className="text-red-400">
                {yardBomb.blackthornScore} BLACKTHORN
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-slate-300 pt-1">
              <span className="text-emerald-400 font-bold">
                Recompensa: +{yardBomb.lastRoundXp} XP · +${yardBomb.lastRoundCash}
              </span>
              <span className="text-amber-300 tabular-nums">
                Próxima rodada em {Math.ceil(yardBomb.roundTransitionSec)}s...
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

