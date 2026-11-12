import React, { useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import {
  getRankForXp,
  loadSavedPlayerXp,
  WARFACE_RANKS,
} from '../progression/ranks';
import {
  COMPETITIVE_RANKS,
  CompetitiveRankBadgeSvg,
  getCompetitiveRankProgression,
} from './RankedInsigniasSvg';
import { WarfaceRankIcon } from './WarfaceRankIcon';

interface CompetitiveRanksModalProps {
  playerMmr: number;
  onClose: () => void;
}

export const CompetitiveRanksModal: React.FC<CompetitiveRanksModalProps> = ({
  playerMmr,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'RANKED_MMR' | 'MILITARY_70'>(
    'RANKED_MMR'
  );
  const { current, next, targetMmr, mmrRemaining, progressPct } =
    getCompetitiveRankProgression(playerMmr);

  const playerXp = loadSavedPlayerXp();
  const currentCareerRank = getRankForXp(playerXp);

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[94dvh] bg-[#070d1b]/98 border border-sky-400/45 rounded-xl shadow-[0_0_50px_rgba(14,165,233,0.35)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOPO DO MODAL + ABAS + BOTÃO FECHAR */}
        <div className="px-3 sm:px-5 py-2 sm:py-2.5 bg-[#0c162c] border-b border-sky-400/25 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <CompetitiveRankBadgeSvg
              tier={current.id}
              className="w-8 h-8 sm:w-9 sm:h-9"
            />
            <div>
              <h2 className="font-display font-black text-xs sm:text-base tracking-wider uppercase text-white flex items-center gap-2">
                <span>GALERIA DE PATENTES DO JOGO</span>
                <span className="text-[9px] font-mono bg-sky-500/20 text-sky-300 border border-sky-400/40 px-1.5 py-0.5 rounded">
                  TEMPORADA 1
                </span>
              </h2>
              <p className="text-[9px] sm:text-[10px] font-mono text-slate-300">
                Atual: <strong className="text-sky-300">{current.name}</strong> ({playerMmr.toLocaleString('en-US')} MMR)
                {next ? (
                  <>
                    {' '}· Próxima: <strong className="text-amber-300">{next.name}</strong> (Faltam {mmrRemaining} MMR)
                  </>
                ) : (
                  <> · Patente Máxima Alcançada!</>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                soundEngine.playMenuSelect();
                setActiveTab('RANKED_MMR');
              }}
              className={`px-2.5 py-1 rounded text-[9px] sm:text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                activeTab === 'RANKED_MMR'
                  ? 'bg-sky-500 text-slate-950 shadow-[0_0_12px_rgba(56,189,248,0.6)]'
                  : 'bg-white/5 text-slate-300 hover:bg-white/15 border border-white/10'
              }`}
            >
              DIVISÕES RANKED (8)
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playMenuSelect();
                setActiveTab('MILITARY_70');
              }}
              className={`px-2.5 py-1 rounded text-[9px] sm:text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                activeTab === 'MILITARY_70'
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                  : 'bg-white/5 text-slate-300 hover:bg-white/15 border border-white/10'
              }`}
            >
              PATENTES MILITARES (70)
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playMenuSelect();
                onClose();
              }}
              className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/35 border border-red-400/40 text-red-200 text-[10px] font-mono font-bold uppercase cursor-pointer"
            >
              FECHAR ✕
            </button>
          </div>
        </div>

        {/* BARRA DE PROGRESSO PATENTE ATUAL -> PRÓXIMA PATENTE */}
        {activeTab === 'RANKED_MMR' && (
          <div className="px-3 sm:px-5 py-2 bg-[#091224] border-b border-sky-400/20 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 shrink-0">
              <CompetitiveRankBadgeSvg tier={current.id} className="w-9 h-9" />
              <div>
                <div className="text-[8px] font-mono uppercase tracking-wider text-sky-300">
                  SUA PATENTE ATUAL
                </div>
                <div className="font-display font-black text-xs sm:text-sm text-white uppercase">
                  {current.name}
                </div>
              </div>
            </div>

            <div className="flex-1 max-w-md">
              <div className="flex items-center justify-between text-[9px] font-mono mb-1">
                <span className="text-sky-300 font-bold tabular-nums">
                  {playerMmr.toLocaleString('en-US')} MMR
                </span>
                <span className="text-slate-300">
                  {next
                    ? `FALTAM ${mmrRemaining} MMR PARA ${next.name.toUpperCase()}`
                    : 'TOPO DA LIGA'}
                </span>
                <span className="text-amber-300 font-bold tabular-nums">
                  {targetMmr.toLocaleString('en-US')} MMR
                </span>
              </div>
              <div className="w-full h-2 bg-slate-950 border border-sky-400/40 rounded-full overflow-hidden p-[1px]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-400 to-amber-400 shadow-[0_0_12px_rgba(56,189,248,0.85)]"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {next ? (
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <div className="text-[8px] font-mono uppercase tracking-wider text-amber-300">
                    PRÓXIMA PATENTE
                  </div>
                  <div className="font-display font-black text-xs sm:text-sm text-amber-200 uppercase">
                    {next.name}
                  </div>
                </div>
                <CompetitiveRankBadgeSvg tier={next.id} className="w-9 h-9" />
              </div>
            ) : (
              <div className="text-xs font-mono font-bold text-amber-400 uppercase">
                ★ LENDA MÁXIMA ★
              </div>
            )}
          </div>
        )}

        {/* CONTEÚDO ROLÁVEL */}
        <div className="p-2.5 sm:p-4 overflow-y-auto flex-1 min-h-0">
          {activeTab === 'RANKED_MMR' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {COMPETITIVE_RANKS.map((tier) => {
                const isCurrent = tier.id === current.id;
                const isNext = next?.id === tier.id;
                const isUnlocked = playerMmr >= tier.minMmr;

                return (
                  <div
                    key={tier.id}
                    className={`relative rounded-xl p-2.5 sm:p-3 border flex flex-col items-center text-center transition-all ${
                      isCurrent
                        ? 'bg-gradient-to-b from-sky-900/55 via-[#0e1b36] to-[#081021] border-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.45)]'
                        : isNext
                          ? 'bg-gradient-to-b from-amber-900/35 via-[#131b2e] to-[#081021] border-amber-400/70 shadow-[0_0_20px_rgba(251,191,36,0.28)]'
                          : isUnlocked
                            ? 'bg-[#0b1528]/90 border-emerald-400/35'
                            : 'bg-[#080f1d]/85 border-slate-700/60 opacity-80'
                    }`}
                  >
                    {/* Etiqueta de Status */}
                    <div className="w-full flex items-center justify-between mb-1">
                      <span className="text-[8px] font-mono text-slate-400 uppercase">
                        {tier.division}
                      </span>
                      {isCurrent ? (
                        <span className="px-1.5 py-0.5 rounded bg-sky-400 text-slate-950 font-mono font-black text-[8px] uppercase">
                          PATENTE ATUAL
                        </span>
                      ) : isNext ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-mono font-black text-[8px] uppercase">
                          PRÓXIMA PATENTE
                        </span>
                      ) : isUnlocked ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono font-bold text-[8px] uppercase">
                          ALCANÇADA ✓
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[8px] uppercase">
                          BLOQUEADA
                        </span>
                      )}
                    </div>

                    <CompetitiveRankBadgeSvg
                      tier={tier.id}
                      className="w-14 h-14 sm:w-16 sm:h-16 my-0.5 drop-shadow-[0_0_14px_rgba(56,189,248,0.45)]"
                    />

                    <div
                      className="font-display font-black text-xs sm:text-sm uppercase tracking-wider mt-0.5"
                      style={{ color: tier.accentHex }}
                    >
                      {tier.name}
                    </div>

                    <div className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-200 tabular-nums mt-0.5">
                      {tier.maxMmr
                        ? `${tier.minMmr.toLocaleString('en-US')} – ${tier.maxMmr.toLocaleString('en-US')} MMR`
                        : `${tier.minMmr.toLocaleString('en-US')}+ MMR`}
                    </div>

                    <div className="mt-1.5 pt-1.5 border-t border-white/10 w-full text-[8px] sm:text-[9px] font-mono text-slate-300 leading-tight">
                      <span className="text-sky-300 font-bold">Recompensa: </span>
                      {tier.rewardLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 font-mono text-xs">
              {[
                { colTitle: 'NÍV. 1 AO 15', range: WARFACE_RANKS.slice(0, 15) },
                { colTitle: 'NÍV. 16 AO 30', range: WARFACE_RANKS.slice(15, 30) },
                { colTitle: 'NÍV. 31 AO 45', range: WARFACE_RANKS.slice(30, 45) },
                { colTitle: 'NÍV. 46 AO 60', range: WARFACE_RANKS.slice(45, 60) },
                { colTitle: '61 AO 70 · ELITE', range: WARFACE_RANKS.slice(60, 70) },
              ].map((col, cIdx) => (
                <div
                  key={cIdx}
                  className="bg-black/60 border border-white/10 rounded-xl p-1.5 flex flex-col gap-1"
                >
                  <div className="text-[9px] font-bold text-amber-400 border-b border-white/10 pb-1 text-center uppercase tracking-wider">
                    {col.colTitle}
                  </div>
                  <div className="space-y-1">
                    {col.range.map((r) => {
                      const isCurrent = currentCareerRank.level === r.level;
                      const isReached = playerXp >= r.requiredXp;
                      return (
                        <div
                          key={r.level}
                          className={`px-1.5 py-1 rounded-lg border flex items-center justify-between gap-1 ${
                            isCurrent
                              ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                              : isReached
                                ? 'bg-black/75 border-emerald-500/30 text-slate-200'
                                : 'bg-black/85 border-slate-800/80 opacity-60 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-bold text-slate-400 text-[9px] w-4 text-right shrink-0">
                              {r.level}
                            </span>
                            <WarfaceRankIcon level={r.level} className="w-4 h-4" />
                            <span className="font-semibold truncate text-[9px] text-white">
                              {r.title}
                            </span>
                          </div>
                          {isCurrent && (
                            <span className="text-[7px] font-black bg-amber-400 text-black px-1 rounded shrink-0">
                              ATUAL
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
