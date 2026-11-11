import React from 'react';
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
  const isVictory = yardBomb.matchWinner === 'VANGUARD';
  const rawSquad =
    yardBomb.squadStats && yardBomb.squadStats.length > 0
      ? yardBomb.squadStats
      : FALLBACK_SQUAD;

  const sortedSquad = [...rawSquad].sort(
    (a, b) => b.score - a.score || b.kills - a.kills
  );

  // Ordem visual da esquerda para a direita correspondente à formação em V no palco 3D:
  // [#4 Flanco Esq, #2 Interna Esq, #1 MVP Centro, #3 Interna Dir, #5 Flanco Dir]
  const podiumVisualOrder = [
    { op: sortedSquad[3], rankNum: 4 },
    { op: sortedSquad[1], rankNum: 2 },
    { op: sortedSquad[0], rankNum: 1 },
    { op: sortedSquad[2], rankNum: 3 },
    { op: sortedSquad[4], rankNum: 5 },
  ].filter((item) => Boolean(item.op));

  const handleClose = () => {
    stopMatchEndFanfare();
    onCloseToMenu?.();
  };

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 pointer-events-auto flex flex-col justify-between p-2.5 sm:p-4 select-none bg-gradient-to-b from-black/80 via-transparent to-black/92 overflow-y-auto"
    >
      {/* TOPO: BANNER DE VITÓRIA / DERROTA E PLACAR FINAL DE RODADAS */}
      <div className="w-full max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 bg-[#070b13]/92 border border-white/15 rounded-2xl px-4 py-2.5 shadow-2xl">
        <div className="flex items-center gap-3">
          {isVictory ? (
            <VanguardTeamEmblem className="w-11 h-11 shrink-0" />
          ) : (
            <BlackthornTeamEmblem className="w-11 h-11 shrink-0" />
          )}
          <div>
            <div className="text-[10px] font-mono font-bold tracking-[0.2em] text-amber-400 uppercase">
              FIM DA OPERAÇÃO · CÍRCULO DOS VENCEDORES 3D
            </div>
            <h1
              className={`text-lg sm:text-2xl font-display font-black tracking-wider uppercase leading-tight ${
                isVictory ? 'text-sky-300' : 'text-red-400'
              }`}
            >
              {isVictory
                ? 'VITÓRIA DO ESQUADRÃO VANGUARD!'
                : 'DERROTA — VITÓRIA DA BLACKTHORN'}
            </h1>
            <p className="text-[11px] font-mono text-slate-300">
              {yardBomb.roundWinReason}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-4 py-1.5 rounded-xl bg-black/75 border border-white/15 flex items-center gap-3 font-display font-black text-base sm:text-lg tabular-nums">
            <span className="text-sky-300">VANGUARD {yardBomb.vanguardScore}</span>
            <span className="text-slate-500 text-xs">×</span>
            <span className="text-red-400">{yardBomb.blackthornScore} BLACKTHORN</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 font-mono text-xs tabular-nums">
            <div className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-300 font-bold">
              +{yardBomb.totalMatchXp} XP
            </div>
            <div className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 font-bold">
              +${yardBomb.totalMatchCash.toLocaleString('pt-BR')}
            </div>
          </div>
        </div>
      </div>

      {/* CENTRO: ESPAÇO ABERTO PARA OS 5 PERSONAGENS 3D EM POSE + ETIQUETAS TÁTICAS DE PÓDIO */}
      <div className="w-full max-w-5xl mx-auto my-auto pt-28 sm:pt-36 pb-2 pointer-events-none">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 items-end">
          {podiumVisualOrder.map(({ op, rankNum }) => {
            const isMvp = rankNum === 1;
            return (
              <div
                key={op.callsign}
                className={`rounded-xl px-2 py-1.5 border text-center transition-transform ${
                  isMvp
                    ? 'bg-[#0b1322]/90 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.35)] -translate-y-2'
                    : op.isPlayer
                      ? 'bg-[#081220]/85 border-sky-400/70'
                      : 'bg-black/75 border-white/15'
                }`}
              >
                <div
                  className={`text-[9px] font-mono font-bold uppercase tracking-wider ${
                    isMvp ? 'text-amber-400' : 'text-sky-300'
                  }`}
                >
                  {isMvp ? '★ #1 MVP DA PARTIDA' : `#${rankNum} ESQUADRÃO`}
                </div>
                <div className="font-display font-black text-xs sm:text-sm text-white truncate">
                  {op.callsign}
                </div>
                <div className="text-[9px] font-mono text-slate-400 truncate">
                  {WEAPON_LABELS[op.weaponId] || op.weaponId}
                </div>
                <div className="mt-0.5 text-[10px] font-mono font-bold text-emerald-300 tabular-nums">
                  {op.kills}K · {op.deaths}M · {op.assists}A
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RODAPÉ: TABELA COMPLETA DE ESTATÍSTICAS DO MEU TIME (MATOU / MORREU / ASSISTÊNCIAS) + BOTÃO FECHAR */}
      <div className="w-full max-w-5xl mx-auto bg-[#070b12]/95 border border-white/20 rounded-2xl p-3 sm:p-4 shadow-2xl space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <VanguardTeamEmblem className="w-5 h-5" />
            <span className="text-xs sm:text-sm font-display font-black text-sky-300 tracking-wider uppercase">
              ESTATÍSTICAS DO ESQUADRÃO VANGUARD (SEU TIME)
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Recompensas da Partida:{' '}
            <span className="text-amber-400 font-bold">+{yardBomb.totalMatchXp} XP</span>
            {' · '}
            <span className="text-emerald-400 font-bold">
              +${yardBomb.totalMatchCash.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs tabular-nums">
            <thead>
              <tr className="text-[10px] text-slate-400 uppercase border-b border-white/10">
                <th className="py-1.5 px-2">POS</th>
                <th className="py-1.5 px-2">OPERADOR</th>
                <th className="py-1.5 px-2 hidden sm:table-cell">FUNÇÃO / ARMA 3D</th>
                <th className="py-1.5 px-2 text-center text-emerald-300">MATOU (K)</th>
                <th className="py-1.5 px-2 text-center text-red-300">MORREU (M)</th>
                <th className="py-1.5 px-2 text-center text-sky-300">ASSIST. (A)</th>
                <th className="py-1.5 px-2 text-center">TAXA K/D</th>
                <th className="py-1.5 px-2 text-right text-amber-300">PONTOS</th>
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
                    <td className="py-1.5 px-2 font-bold">
                      {isMvp ? (
                        <span className="text-amber-400">★ #1 MVP</span>
                      ) : (
                        <span className="text-slate-400">#{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2">
                      <span className="font-display font-black text-white">
                        {op.callsign}
                      </span>
                      {op.isPlayer && (
                        <span className="ml-2 text-[10px] text-sky-300 font-mono">
                          (VOCÊ)
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-[11px] text-slate-400 hidden sm:table-cell">
                      {op.roleTitle} · {WEAPON_LABELS[op.weaponId] || op.weaponId}
                    </td>
                    <td className="py-1.5 px-2 text-center font-black text-emerald-400 text-sm">
                      {op.kills}
                    </td>
                    <td className="py-1.5 px-2 text-center font-bold text-red-400">
                      {op.deaths}
                    </td>
                    <td className="py-1.5 px-2 text-center font-bold text-sky-300">
                      {op.assists}
                    </td>
                    <td className="py-1.5 px-2 text-center text-slate-200">
                      {kd}
                    </td>
                    <td className="py-1.5 px-2 text-right font-black text-amber-400">
                      {op.score}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pt-1 flex items-center justify-end">
          <button
            type="button"
            {...bindTap(handleClose)}
            className="w-full sm:w-auto min-w-[260px] py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-black text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(245,158,11,0.45)] active:scale-95 transition-all cursor-pointer"
          >
            FECHAR E VOLTAR AO MENU PRINCIPAL
          </button>
        </div>
      </div>
    </div>
  );
};
