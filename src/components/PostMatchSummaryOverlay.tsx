import React, { useState } from 'react';
import { stopMatchEndFanfare } from '../audio/characterAndBombAudio';
import { SquadOperatorStats, WeaponId, YardBombHudInfo } from '../types/game';
import { bindTap } from './hudTapUtils';
import { BlackthornTeamEmblem, VanguardTeamEmblem } from './WarfaceClassIcons';

interface PostMatchSummaryOverlayProps {
  yardBomb: YardBombHudInfo;
  onCloseToMenu?: () => void;
}

const WEAPON_LABELS: Record<WeaponId, string> = {
  M4_CARBINE: 'M4A1 CARBINE',
  AK47_RIFLE: 'AK-47 RIFLE',
  SNIPER_BOLT: 'AWP SNIPER',
  SNIPER_TACTICAL: 'M110 SASS',
  SMG_45: 'VECTOR .45',
  CARBINE_AR: 'HK416 CQB',
  L49_LMG: 'L49 SAW LMG',
  P50_PISTOL: 'DESERT EAGLE',
  KNIFE_TACTICAL: 'KARAMBIT',
};

const OPERATOR_LEVELS: Record<string, number> = {
  VOCÊ: 154,
  'RECON-02': 98,
  'STRIKER-03': 112,
  'LIFELINE-04': 85,
  'WARDEN-05': 109,
};

const FALLBACK_SQUAD: SquadOperatorStats[] = [
  { callsign: 'VOCÊ', roleTitle: 'LÍDER DE ESQUADRÃO', weaponId: 'M4_CARBINE', kills: 5, deaths: 1, assists: 2, headshots: 2, score: 650, isPlayer: true },
  { callsign: 'RECON-02', roleTitle: 'ATIRADOR DE ELITE', weaponId: 'SNIPER_BOLT', kills: 4, deaths: 2, assists: 3, headshots: 2, score: 550, isPlayer: false },
  { callsign: 'STRIKER-03', roleTitle: 'ASSALTO PESADO', weaponId: 'AK47_RIFLE', kills: 3, deaths: 2, assists: 4, headshots: 1, score: 500, isPlayer: false },
  { callsign: 'LIFELINE-04', roleTitle: 'PARAMÉDICO TÁTICO', weaponId: 'M4_CARBINE', kills: 2, deaths: 2, assists: 3, headshots: 1, score: 350, isPlayer: false },
  { callsign: 'WARDEN-05', roleTitle: 'BREACHER CQB', weaponId: 'AK47_RIFLE', kills: 2, deaths: 3, assists: 2, headshots: 0, score: 300, isPlayer: false },
];

export const PostMatchSummaryOverlay: React.FC<PostMatchSummaryOverlayProps> = ({
  yardBomb,
  onCloseToMenu,
}) => {
  const [statsModalOpen, setStatsModalOpen] = useState(false);

  const isVictory = yardBomb.matchWinner === 'VANGUARD';
  const rawSquad =
    yardBomb.squadStats && yardBomb.squadStats.length > 0
      ? yardBomb.squadStats
      : FALLBACK_SQUAD;

  const sortedSquad = [...rawSquad].sort(
    (a, b) => b.score - a.score || b.kills - a.kills
  );

  const handleCloseToLobby = () => {
    stopMatchEndFanfare();
    onCloseToMenu?.();
  };

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 pointer-events-auto flex flex-col justify-between select-none overflow-hidden"
    >
      {/* 1. TOPO: BARRA SUPERIOR DE PLACAR E TÍTULO "WINNER'S CIRCLE" COMPACTO (NÃO COBRE OS PERSONAGENS 3D) */}
      <div className="w-full pointer-events-auto bg-gradient-to-b from-black/85 via-black/45 to-transparent pb-3">
        {/* Top Score Strip igual à imagem de referência */}
        <div className="w-full max-w-6xl mx-auto px-3 pt-2 flex items-center justify-between gap-2">
          {/* Esquerda: Emblema + Mini Retratos do Time Aliado */}
          <div className="flex items-center gap-1.5">
            <VanguardTeamEmblem className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
            <div className="hidden md:flex items-center gap-1">
              {sortedSquad.slice(0, 4).map((op) => (
                <div
                  key={op.callsign}
                  className="w-7 h-7 rounded bg-slate-800/90 border border-sky-400/40 flex items-center justify-center text-[9px] font-display font-black text-sky-200"
                  title={op.callsign}
                >
                  {op.callsign.slice(0, 2)}
                </div>
              ))}
            </div>
            <span className="text-slate-400 text-xs font-mono ml-1 hidden sm:inline">
              †††
            </span>
          </div>

          {/* Centro: VANGUARD [5] vs. BLACKTHORN [3] | ROUNDS */}
          <div className="flex items-center gap-2 sm:gap-3 font-display font-bold text-xs sm:text-base tracking-wider uppercase">
            <span className="text-sky-300">
              VANGUARD [{yardBomb.vanguardScore}]
            </span>
            <span className="text-slate-400 text-[11px] lowercase font-mono">
              vs.
            </span>
            <span className="text-red-400">
              BLACKTHORN [{yardBomb.blackthornScore}]
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-300 text-xs sm:text-sm hidden sm:inline">
              ROUNDS
            </span>
          </div>

          {/* Direita: Botão Minimalista de Estatísticas + Emblema Inimigo */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              {...bindTap(() => setStatsModalOpen(true))}
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-amber-500/25 border border-amber-400/50 text-amber-300 font-mono font-bold text-[10px] sm:text-xs tracking-wider uppercase flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <span>📊</span>
              <span>ESTATÍSTICAS</span>
            </button>
            <BlackthornTeamEmblem className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 hidden sm:block" />
          </div>
        </div>

        {/* Título Metálico Dourado "WINNER'S CIRCLE" posicionado no topo alto */}
        <div className="text-center mt-0.5 sm:mt-1 pointer-events-none px-2">
          <h1
            className="text-2xl sm:text-4xl md:text-5xl font-display font-black tracking-[0.06em] uppercase leading-none bg-gradient-to-b from-[#fff6d6] via-[#eab308] to-[#92610c] bg-clip-text text-transparent"
            style={{
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.95))',
            }}
          >
            WINNER&apos;S CIRCLE
          </h1>
          <div
            className="mt-0.5 text-xs sm:text-base font-display font-extrabold tracking-[0.14em] uppercase text-[#f3cf7a]"
            style={{
              textShadow: '0 2px 8px rgba(0,0,0,0.95)',
            }}
          >
            {isVictory
              ? 'SQUAD VICTORY - VANGUARD'
              : 'SQUAD DEFEAT - BLACKTHORN VICTORY'}
          </div>
        </div>
      </div>

      {/* 2. CENTRO TOTALMENTE LIVRE PARA OS 5 PERSONAGENS 3D EM POSE NO PALCO */}
      <div className="flex-1 pointer-events-none" />

      {/* 3. RODAPÉ IDÊNTICO À IMAGEM: 5 CARDS DOS OPERADORES + COLUNA DE BOTÕES À DIREITA */}
      <div className="w-full bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-6 pb-2.5 px-2.5 sm:px-5">
        <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-stretch lg:items-end gap-2.5">
          {/* 5 Cards dos Operadores na Base da Plataforma */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2">
            {sortedSquad.slice(0, 5).map((op, idx) => {
              const isMvp = idx === 0;
              const opLevel = OPERATOR_LEVELS[op.callsign] || 100;
              return (
                <div
                  key={op.callsign}
                  className={`relative rounded px-2.5 py-2 transition-all flex flex-col justify-between ${
                    isMvp
                      ? 'bg-gradient-to-b from-[#2b2316]/95 to-[#15120c]/95 border-2 border-amber-400 shadow-[0_0_22px_rgba(245,158,11,0.45)]'
                      : 'bg-[#12161c]/92 border border-white/15'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* Emblema / Insígnia Militar */}
                    <div
                      className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center border ${
                        isMvp
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-slate-800 border-white/20 text-sky-300'
                      }`}
                    >
                      <span className="text-xs font-black">
                        {isMvp ? '★' : `0${idx + 1}`}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-display font-black text-xs sm:text-sm text-white truncate leading-tight">
                        {op.callsign}
                      </div>
                      <div className="text-[10px] font-mono text-slate-300 leading-tight">
                        Level {opLevel}
                      </div>

                      {isMvp ? (
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded-xs bg-amber-400 text-slate-950 font-display font-black text-[9px] uppercase tracking-wider">
                            MVP
                          </span>
                          <span className="text-amber-400 text-[10px] tracking-tighter">
                            ✪ ✪ ✪
                          </span>
                        </div>
                      ) : (
                        <div className="mt-1 text-[9px] font-mono text-slate-400 truncate">
                          {WEAPON_LABELS[op.weaponId] || op.weaponId}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Linha inferior idêntica à foto: "23 Kills / 8 Assists / 15 Deaths / MVP" */}
                  <div className="mt-2 pt-1 border-t border-white/10 text-[9px] sm:text-[10px] font-mono font-bold text-slate-200 truncate tabular-nums">
                    {op.kills} Kills / {op.assists} Assists / {op.deaths} Deaths
                    {isMvp ? ' / MVP' : ''}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Coluna de Botões à Direita (Igual aos botões PLAY AGAIN / RETURN TO LOBBY da foto) */}
          <div className="flex sm:flex-row lg:flex-col gap-1.5 shrink-0 lg:w-48">
            <button
              type="button"
              {...bindTap(() => setStatsModalOpen(true))}
              className="flex-1 py-2 px-3 rounded bg-[#1b222c]/95 hover:bg-[#252f3d] border border-amber-400/50 text-amber-300 font-display font-black text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <span>📊</span>
              <span>ESTATÍSTICAS</span>
            </button>

            <button
              type="button"
              {...bindTap(handleCloseToLobby)}
              className="flex-1 py-2.5 px-4 rounded bg-gradient-to-r from-[#56a85a] to-[#68b86b] hover:from-[#64b868] hover:to-[#77c87a] border border-emerald-300/60 text-slate-950 font-display font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(86,168,90,0.4)] active:scale-95 transition-all cursor-pointer"
            >
              <span className="w-4 h-4 rounded-full bg-slate-950 text-emerald-400 flex items-center justify-center text-[10px] font-black">
                ✕
              </span>
              <span>RETURN TO LOBBY</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. MODAL DETALHADO DE ESTATÍSTICAS (ABRE AO CLICAR NO BOTÃO MINIMALISTA E TEM BOTÃO DE FECHAR) */}
      {statsModalOpen && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
        >
          <div className="w-full max-w-4xl bg-[#0a0f18]/98 border border-amber-400/40 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-3">
              <div className="flex items-center gap-2.5">
                <VanguardTeamEmblem className="w-7 h-7" />
                <div>
                  <h2 className="text-sm sm:text-lg font-display font-black text-amber-300 tracking-wider uppercase">
                    RELATÓRIO DE ESTATÍSTICAS DO ESQUADRÃO VANGUARD
                  </h2>
                  <p className="text-[11px] font-mono text-slate-400">
                    {yardBomb.roundWinReason} · Recompensas:{' '}
                    <span className="text-amber-400 font-bold">
                      +{yardBomb.totalMatchXp} XP
                    </span>{' '}
                    ·{' '}
                    <span className="text-emerald-400 font-bold">
                      +${yardBomb.totalMatchCash.toLocaleString('pt-BR')}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                {...bindTap(() => setStatsModalOpen(false))}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-red-500/25 border border-white/20 text-white font-mono font-bold text-xs uppercase cursor-pointer active:scale-95 transition-all"
              >
                ✕ FECHAR
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs tabular-nums">
                <thead>
                  <tr className="text-[10px] text-slate-400 uppercase border-b border-white/10">
                    <th className="py-2 px-2">POS</th>
                    <th className="py-2 px-2">OPERADOR</th>
                    <th className="py-2 px-2 hidden sm:table-cell">FUNÇÃO / ARMA 3D</th>
                    <th className="py-2 px-2 text-center text-emerald-300">MATOU (K)</th>
                    <th className="py-2 px-2 text-center text-red-300">MORREU (M)</th>
                    <th className="py-2 px-2 text-center text-sky-300">ASSIST. (A)</th>
                    <th className="py-2 px-2 text-center">TAXA K/D</th>
                    <th className="py-2 px-2 text-right text-amber-300">PONTOS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedSquad.map((op, idx) => {
                    const kd =
                      op.deaths === 0
                        ? op.kills.toFixed(1)
                        : (op.kills / op.deaths).toFixed(2);
                    const isMvp = idx === 0;
                    return (
                      <tr
                        key={op.callsign}
                        className={
                          op.isPlayer
                            ? 'bg-sky-500/15 text-white font-bold'
                            : isMvp
                              ? 'bg-amber-500/10 text-slate-100'
                              : 'text-slate-300'
                        }
                      >
                        <td className="py-2 px-2 font-bold">
                          {isMvp ? (
                            <span className="text-amber-400">★ #1 MVP</span>
                          ) : (
                            <span className="text-slate-400">#{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <span className="font-display font-black text-white">
                            {op.callsign}
                          </span>
                          {op.isPlayer && (
                            <span className="ml-2 text-[10px] text-sky-300 font-mono">
                              (VOCÊ)
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-[11px] text-slate-400 hidden sm:table-cell">
                          {op.roleTitle} · {WEAPON_LABELS[op.weaponId] || op.weaponId}
                        </td>
                        <td className="py-2 px-2 text-center font-black text-emerald-400 text-sm">
                          {op.kills}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-red-400">
                          {op.deaths}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-sky-300">
                          {op.assists}
                        </td>
                        <td className="py-2 px-2 text-center text-slate-200">
                          {kd}
                        </td>
                        <td className="py-2 px-2 text-right font-black text-amber-400">
                          {op.score}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-white/10">
              <button
                type="button"
                {...bindTap(() => setStatsModalOpen(false))}
                className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/20 text-white font-display font-bold text-xs tracking-wider uppercase cursor-pointer"
              >
                VOLTAR PARA POSE 3D (WINNER&apos;S CIRCLE)
              </button>
              <button
                type="button"
                {...bindTap(handleCloseToLobby)}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-black text-xs tracking-wider uppercase cursor-pointer"
              >
                SAIR PARA O MENU PRINCIPAL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
