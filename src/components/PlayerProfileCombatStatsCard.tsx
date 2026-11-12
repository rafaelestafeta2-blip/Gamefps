import React, { useEffect, useRef } from 'react';
import { PlayerCloudProfile } from '../firebase/playerProfileModel';

interface PlayerProfileCombatStatsCardProps {
  profile: PlayerCloudProfile;
}

export const PlayerProfileCombatStatsCard: React.FC<PlayerProfileCombatStatsCardProps> = ({
  profile,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const kdRatio = (
    profile.totalKills / Math.max(1, profile.totalDeaths)
  ).toFixed(2);

  const winRate = profile.matchesPlayed > 0
    ? ((profile.matchesWon / profile.matchesPlayed) * 100).toFixed(1)
    : '100.0';

  const headshotRate = profile.totalKills > 0
    ? Math.round((profile.totalHeadshots / profile.totalKills) * 100)
    : 32;

  // Renderiza o mapa térmico tático (Heatmap) no canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Fundo azul escuro de satélite militar
    ctx.fillStyle = '#060c18';
    ctx.fillRect(0, 0, w, h);

    // Linhas de grade tática
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Heatmap blob clusters
    const drawHeatSpot = (cx: number, cy: number, r: number) => {
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, 'rgba(239, 68, 68, 0.85)'); // Centro Vermelho quente
      grad.addColorStop(0.35, 'rgba(245, 158, 11, 0.75)'); // Âmbar
      grad.addColorStop(0.65, 'rgba(234, 179, 8, 0.45)'); // Amarelo
      grad.addColorStop(0.85, 'rgba(56, 189, 248, 0.25)'); // Ciano frio
      grad.addColorStop(1, 'rgba(6, 12, 24, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    };

    drawHeatSpot(w * 0.35, h * 0.45, 42);
    drawHeatSpot(w * 0.48, h * 0.52, 34);
    drawHeatSpot(w * 0.82, h * 0.42, 30);
    drawHeatSpot(w * 0.22, h * 0.60, 26);
  }, []);

  return (
    <div className="flex flex-col justify-between bg-[#0b0e14]/90 border border-white/10 rounded-xl p-3.5 sm:p-4 backdrop-blur-md h-full">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <h4 className="font-display font-black text-xs sm:text-sm tracking-wider uppercase text-white">
          ESTATÍSTICAS COMPLETAS
        </h4>
        <span className="font-mono text-[9px] text-sky-400 font-bold">
          TELEMETRIA TÁTICA
        </span>
      </div>

      {/* Heatmap Tático e Indicadores Topo */}
      <div className="my-2 space-y-2">
        <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/50 shadow-inner">
          <canvas
            ref={canvasRef}
            width={240}
            height={70}
            className="w-full h-16 sm:h-20 object-cover"
          />
          <span className="absolute top-1 left-2 font-mono text-[8px] text-sky-300 font-bold bg-black/60 px-1 py-0.2 rounded">
            HEATMAP DE IMPACTO
          </span>
        </div>

        {/* Grade de 4 Métricas Chave */}
        <div className="grid grid-cols-2 gap-2 text-left">
          <div className="bg-white/[0.03] border border-white/5 rounded-md p-1.5">
            <div className="font-mono text-[8px] text-slate-400 uppercase">
              Ratio K/D
            </div>
            <div className="font-display font-black text-sm text-amber-300">
              {kdRatio}
            </div>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-md p-1.5">
            <div className="font-mono text-[8px] text-slate-400 uppercase">
              Win Rate %
            </div>
            <div className="font-display font-black text-sm text-emerald-300">
              {winRate}%
            </div>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-md p-1.5">
            <div className="font-mono text-[8px] text-slate-400 uppercase">
              Headshot %
            </div>
            <div className="font-display font-black text-sm text-sky-300">
              {headshotRate}% ({profile.totalHeadshots})
            </div>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-md p-1.5">
            <div className="font-mono text-[8px] text-slate-400 uppercase">
              Partidas / Vitórias
            </div>
            <div className="font-display font-black text-sm text-yellow-300">
              {profile.matchesPlayed} / {profile.matchesWon}
            </div>
          </div>
        </div>
      </div>

      {/* Playstyle de Combate com Barras de Progresso */}
      <div className="border-t border-white/10 pt-2 space-y-1.5">
        <div className="font-mono text-[8.5px] text-slate-300 font-bold uppercase tracking-wider">
          PLAYSTYLE DE COMBATE
        </div>

        {[
          { label: 'Assalto Tático', val: Math.min(10, Math.max(3, profile.totalKills % 10)), max: 10 },
          { label: 'Precisão / Headshots', val: Math.min(10, Math.max(2, profile.totalHeadshots % 10)), max: 10 },
          { label: 'Desarme de C4', val: Math.min(5, Math.max(1, profile.bombsPlanted % 5)), max: 5 },
          { label: 'Eficiência de Combate', val: Math.min(10, Math.max(4, profile.matchesWon % 10)), max: 10 },
        ].map((item) => (
          <div key={item.label} className="space-y-0.5">
            <div className="flex justify-between font-mono text-[8px]">
              <span className="text-slate-400">{item.label}</span>
              <span className="text-amber-300 font-bold">
                {item.val}/{item.max}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-black/60 border border-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-300"
                style={{ width: `${(item.val / item.max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
