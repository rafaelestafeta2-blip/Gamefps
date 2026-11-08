import React, { useEffect, useRef, useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { mobileHardware } from '../mobile/nativeHardware';
import {
  getNextRank,
  getRankForXp,
  loadSavedPlayerXp,
  WARFACE_RANKS,
} from '../progression/ranks';
import { DrillMode, QualityPreset, WeaponId } from '../types/game';
import { WarfaceRankIcon } from './WarfaceRankIcon';
import { WeaponInspectionModal } from './WeaponInspectionModal';

const codOperatorBg = '/assets/images/cod_operator_bg_1794057245328.jpg';

interface MainMenuProps {
  onStartTraining: () => void;
  onStartDrill: (mode: DrillMode) => void;
  activeWeapon: WeaponId;
  onSelectStartingWeapon: (weaponId: WeaponId) => void;
  qualityPreset: QualityPreset;
  onSetQualityPreset: (preset: QualityPreset) => void;
}

const WEAPON_DISPLAY_NAMES: Record<
  WeaponId,
  { name: string; caliber: string; category: string }
> = {
  P50_PISTOL: {
    name: 'MARK 23 TÁTICA',
    caliber: '.45 ACP',
    category: 'Pistola Pesada',
  },
  M4_CARBINE: {
    name: 'M4A1 SOPMOD',
    caliber: '5.56x45mm',
    category: 'Fuzil de Assalto',
  },
  SMG_45: {
    name: 'SMG .45 SUB',
    caliber: '.45 ACP',
    category: 'Submetralhadora',
  },
  AK47_RIFLE: {
    name: 'AK-47 COMANDO',
    caliber: '7.62x39mm',
    category: 'Fuzil de Assalto',
  },
  CARBINE_AR: {
    name: 'CARABINA TÁTICA',
    caliber: '5.56x45mm',
    category: 'Carabina de Precisão',
  },
  L49_LMG: {
    name: 'LMG PESADA 100R',
    caliber: '5.56x45mm',
    category: 'Metralhadora Leve',
  },
  SNIPER_TACTICAL: {
    name: 'SNIPER TÁTICA S&B',
    caliber: '.308 Win',
    category: 'Fuzil Sniper',
  },
  SNIPER_BOLT: {
    name: 'SNIPER BOLT-ACTION',
    caliber: '.338 Lapua',
    category: 'Fuzil de Precisão',
  },
  KNIFE_TACTICAL: {
    name: 'FACA TÁTICA COMBATE',
    caliber: 'Aço Carbono',
    category: 'Lâmina Corpo a Corpo',
  },
};

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartTraining,
  onStartDrill,
  activeWeapon,
  onSelectStartingWeapon,
  qualityPreset,
  onSetQualityPreset,
}) => {
  const [activeTab, setActiveTab] = useState<
    'PLAY' | 'WEAPON' | 'RANKS' | 'BATTLE_PASS' | 'SETTINGS'
  >('PLAY');
  const [showNewsModal, setShowNewsModal] = useState(false);
  const particlesCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live Warface Progression State
  const playerXp = loadSavedPlayerXp();
  const currentRank = getRankForXp(playerXp);
  const nextRank = getNextRank(currentRank.level);
  const xpCurrentLevelBase = currentRank.requiredXp;
  const xpForNextLevel = nextRank
    ? nextRank.requiredXp
    : currentRank.requiredXp + 5000;
  const xpLevelProgress = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        ((playerXp - xpCurrentLevelBase) /
          Math.max(1, xpForNextLevel - xpCurrentLevelBase)) *
          100
      )
    )
  );

  useEffect(() => {
    soundEngine.playMenuMusic();
    return () => {
      soundEngine.stopMenuMusic();
    };
  }, []);

  // Lightweight 60 FPS Tactical Ember & Dust Particles Background Effect
  useEffect(() => {
    const canvas = particlesCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const PARTICLE_COUNT = 36;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.35) * 0.45,
      vy: -0.25 - Math.random() * 0.65,
      radius: 0.9 + Math.random() * 1.9,
      alpha: 0.15 + Math.random() * 0.65,
      phase: Math.random() * Math.PI * 2,
      isGold: Math.random() > 0.3,
    }));

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const renderParticles = () => {
      animId = requestAnimationFrame(renderParticles);
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.phase += 0.03;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const flicker = 0.65 + 0.35 * Math.sin(p.phase);
        const a = p.alpha * flicker;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.isGold
          ? `rgba(245, 158, 11, ${a.toFixed(2)})`
          : `rgba(148, 163, 184, ${(a * 0.55).toFixed(2)})`;
        ctx.fill();
      }
    };

    renderParticles();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleHover = () => {
    soundEngine.playMenuHover();
  };

  const handleLaunchTraining = async () => {
    soundEngine.playMenuSelect();
    soundEngine.stopMenuMusic();
    await mobileHardware.enterFullscreenLandscape();
    onStartTraining();
  };

  const handleLaunchDrill = async (mode: DrillMode) => {
    soundEngine.playMenuSelect();
    soundEngine.stopMenuMusic();
    await mobileHardware.enterFullscreenLandscape();
    onStartDrill(mode);
  };

  const activeWeaponMeta = WEAPON_DISPLAY_NAMES[activeWeapon];

  return (
    <div
      onClick={() => {
        void mobileHardware.enterFullscreenLandscape();
      }}
      className="fixed inset-0 z-40 bg-[#06080c] select-none text-white flex flex-col justify-between overflow-hidden font-sans"
    >
      {/* =================================================================== */}
      {/* 1. BACKGROUND: TACTICAL OPERATOR + VIGNETTE + 60FPS EMBER PARTICLES */}
      {/* =================================================================== */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src={codOperatorBg}
          alt="Operador Tático"
          className="w-full h-full object-cover object-center opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/30 to-black/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/65" />
        <canvas
          ref={particlesCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      </div>

      {/* =================================================================== */}
      {/* 2. COMPACT TOP NAVIGATION BAR (ZERO CLIPPING ON MOBILE LANDSCAPE)   */}
      {/* =================================================================== */}
      <header className="relative z-20 w-full h-11 sm:h-12 px-3 sm:px-6 bg-[#0a0d13]/92 border-b border-white/15 flex items-center justify-between gap-2 shrink-0 backdrop-blur-md">
        {/* Left: Compact Brand + Single-line Navigation Tabs */}
        <div className="flex items-center gap-3 sm:gap-5 min-w-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.playMenuSelect();
              setActiveTab('PLAY');
            }}
            className="flex items-center gap-1.5 cursor-pointer shrink-0 pr-2 border-r border-white/15"
          >
            <span className="w-2 h-4 bg-amber-500 rounded-xs shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            <span className="text-sm sm:text-base font-display font-black tracking-widest uppercase text-white">
              KINETIC
            </span>
          </button>

          {/* Navigation Tabs (Single Line, No Wrapping) */}
          <nav className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
            {[
              { id: 'PLAY', label: 'JOGAR' },
              { id: 'WEAPON', label: 'ARSENAL 3D' },
              { id: 'RANKS', label: 'PATENTES' },
              { id: 'BATTLE_PASS', label: 'PASSE' },
              { id: 'SETTINGS', label: 'OPÇÕES' },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onMouseEnter={handleHover}
                  onClick={(e) => {
                    e.stopPropagation();
                    soundEngine.playMenuSelect();
                    setActiveTab(tab.id as typeof activeTab);
                  }}
                  className={`relative px-2.5 sm:px-3 py-1.5 font-display font-bold text-[11px] sm:text-xs tracking-wider uppercase whitespace-nowrap transition-colors cursor-pointer rounded-lg ${
                    isSelected
                      ? 'text-amber-300 bg-amber-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <span>{tab.label}</span>
                  {isSelected && (
                    <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Compact Premium Warface Rank Pill + Fullscreen Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.playMenuSelect();
              setActiveTab('RANKS');
            }}
            title="Ver Tabela Completa de 70 Patentes Warface"
            className="flex items-center gap-2 bg-black/75 hover:bg-black/90 border border-amber-500/40 hover:border-amber-400 rounded-xl px-2.5 py-1 cursor-pointer transition-all shadow-md max-w-[185px] sm:max-w-[230px]"
          >
            <WarfaceRankIcon level={currentRank.level} className="w-6 h-6" />
            <div className="flex flex-col text-left min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-mono font-black tracking-wide text-amber-300 truncate">
                  NÍV.{currentRank.level} · {currentRank.title.toUpperCase()}
                </span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden border border-white/10 mt-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-300"
                  style={{ width: `${xpLevelProgress}%` }}
                />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void mobileHardware.toggleFullscreenLandscape();
            }}
            title="Alternar Tela Cheia Horizontal"
            className="w-8 h-8 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg flex items-center justify-center text-xs font-mono text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            ⛶
          </button>
        </div>
      </header>

      {/* =================================================================== */}
      {/* 3. MAIN TAB CONTENT WORKSPACE                                       */}
      {/* =================================================================== */}
      <main className="relative z-20 flex-1 flex items-center px-4 sm:px-10 py-2 overflow-hidden min-h-0 pointer-events-none">
        {/* TAB PLAY: SLEEK LEFT COMMAND COLUMN (PROPORTIONATE FOR MOBILE) */}
        {activeTab === 'PLAY' && (
          <div className="w-64 sm:w-76 flex flex-col gap-2 pointer-events-auto my-auto">
            {/* Equipped Loadout Quick Card */}
            <button
              type="button"
              onMouseEnter={handleHover}
              onClick={(e) => {
                e.stopPropagation();
                soundEngine.playMenuSelect();
                setActiveTab('WEAPON');
              }}
              className="group w-full bg-[#0b0f17]/85 hover:bg-[#111724]/95 border border-amber-500/40 hover:border-amber-400 rounded-xl p-2.5 flex items-center justify-between transition-all cursor-pointer shadow-lg backdrop-blur-md"
            >
              <div className="flex flex-col text-left min-w-0">
                <span className="text-[9px] font-mono font-bold text-amber-400 tracking-widest uppercase">
                  LOADOUT EQUIPADO · INSPECIONAR 3D
                </span>
                <span className="font-display font-black text-sm sm:text-base text-white tracking-wider truncate mt-0.5">
                  {activeWeaponMeta.name}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {activeWeaponMeta.category} · {activeWeaponMeta.caliber}
                </span>
              </div>
              <span className="px-2 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors shrink-0">
                TROCAR &gt;
              </span>
            </button>

            {/* MODE 1: ESTANDE DE TIRO (LIVRE) */}
            <button
              type="button"
              onMouseEnter={handleHover}
              onClick={handleLaunchTraining}
              className="group relative w-full h-11 bg-gradient-to-r from-amber-500/20 via-black/65 to-black/40 hover:from-amber-500/35 border-l-4 border-l-amber-400 border-y border-r border-white/15 rounded-r-xl flex items-center justify-between px-3.5 text-left transition-all duration-150 cursor-pointer shadow-md backdrop-blur-sm"
            >
              <div>
                <div className="text-xs sm:text-sm font-display font-black tracking-wider uppercase text-amber-300 group-hover:text-white transition-colors">
                  ESTANDE DE TIRO (LIVRE)
                </div>
                <div className="text-[9px] font-mono text-slate-400">
                  Treino balístico, alvos móveis e armas liberadas
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform">
                ▶
              </span>
            </button>

            {/* MODE 2: INCURSÃO KILLHOUSE */}
            <button
              type="button"
              onMouseEnter={handleHover}
              onClick={() => handleLaunchDrill('KILLHOUSE_BLITZ')}
              className="group relative w-full h-11 bg-gradient-to-r from-white/10 via-black/65 to-black/40 hover:from-white/20 border-l-4 border-l-sky-400 border-y border-r border-white/15 rounded-r-xl flex items-center justify-between px-3.5 text-left transition-all duration-150 cursor-pointer shadow-md backdrop-blur-sm"
            >
              <div>
                <div className="text-xs sm:text-sm font-display font-black tracking-wider uppercase text-slate-100 group-hover:text-white transition-colors">
                  INCURSÃO KILLHOUSE
                </div>
                <div className="text-[9px] font-mono text-slate-400">
                  Percurso CQB cronometrado de alta precisão
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-sky-400 group-hover:translate-x-0.5 transition-transform">
                ▶
              </span>
            </button>

            {/* MODE 3: COMBATE CONTRA IA */}
            <button
              type="button"
              onMouseEnter={handleHover}
              onClick={() => handleLaunchDrill('TACTICAL_WAVE')}
              className="group relative w-full h-11 bg-gradient-to-r from-red-500/20 via-black/65 to-black/40 hover:from-red-500/35 border-l-4 border-l-red-500 border-y border-r border-white/15 rounded-r-xl flex items-center justify-between px-3.5 text-left transition-all duration-150 cursor-pointer shadow-md backdrop-blur-sm"
            >
              <div>
                <div className="text-xs sm:text-sm font-display font-black tracking-wider uppercase text-red-400 group-hover:text-red-200 transition-colors">
                  COMBATE CONTRA IA
                </div>
                <div className="text-[9px] font-mono text-slate-400">
                  Incursão hostil com patrulhas armadas
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-red-400 group-hover:translate-x-0.5 transition-transform">
                ▶
              </span>
            </button>
          </div>
        )}

        {/* TAB WEAPON / LOADOUT: 3D INSPECTION STUDIO */}
        {activeTab === 'WEAPON' && (
          <WeaponInspectionModal
            activeWeapon={activeWeapon}
            playerXp={playerXp}
            onSelectWeapon={(wId) => onSelectStartingWeapon(wId)}
            onClose={() => setActiveTab('PLAY')}
            onStartTraining={handleLaunchTraining}
          />
        )}

        {/* TAB RANKS: 70 WARFACE RANKS WITH COMPACT VECTOR SVG INSIGNIAS */}
        {activeTab === 'RANKS' && (
          <div className="max-w-5xl w-full max-h-full bg-[#0a0d14]/95 border border-amber-500/40 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-xl pointer-events-auto flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <WarfaceRankIcon level={currentRank.level} className="w-7 h-7" />
                <div>
                  <h3 className="font-display font-black text-sm sm:text-base text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <span>PROGRESSÃO DE PATENTES WARFACE</span>
                    <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                      70 NÍVEIS
                    </span>
                  </h3>
                  <p className="font-mono text-[10px] text-slate-300">
                    Patente Atual:{' '}
                    <b className="text-white">
                      Nív. {currentRank.level} — {currentRank.title}
                    </b>{' '}
                    ({playerXp.toLocaleString()} XP)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('PLAY')}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-[10px] font-mono font-bold rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                FECHAR ✕
              </button>
            </div>

            {/* 5-Column Compact Scrollable Roster */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 overflow-y-auto pr-1 font-mono text-xs flex-1 min-h-0">
              {[
                { colTitle: 'NÍV. 1 AO 15', range: WARFACE_RANKS.slice(0, 15) },
                { colTitle: 'NÍV. 16 AO 30', range: WARFACE_RANKS.slice(15, 30) },
                { colTitle: 'NÍV. 31 AO 45', range: WARFACE_RANKS.slice(30, 45) },
                { colTitle: 'NÍV. 46 AO 60', range: WARFACE_RANKS.slice(45, 60) },
                {
                  colTitle: '61 AO 70 · ELITE',
                  range: WARFACE_RANKS.slice(60, 70),
                },
              ].map((col, cIdx) => (
                <div
                  key={cIdx}
                  className="bg-black/60 border border-white/10 rounded-xl p-1.5 flex flex-col gap-1"
                >
                  <div className="text-[9px] font-bold text-amber-400/90 border-b border-white/10 pb-1 text-center uppercase tracking-wider">
                    {col.colTitle}
                  </div>
                  <div className="space-y-1">
                    {col.range.map((r) => {
                      const isCurrent = currentRank.level === r.level;
                      const isReached = playerXp >= r.requiredXp;

                      return (
                        <div
                          key={r.level}
                          className={`px-1.5 py-1 rounded-lg border flex items-center justify-between gap-1 transition-all ${
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
                            <WarfaceRankIcon
                              level={r.level}
                              className="w-4 h-4"
                            />
                            <span
                              className="font-semibold truncate text-[9px] text-white"
                              title={r.title}
                            >
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
          </div>
        )}

        {/* SETTINGS MODAL */}
        {activeTab === 'SETTINGS' && (
          <div className="max-w-md w-full bg-[#0c0e14]/95 border border-white/20 rounded-xl p-4 sm:p-5 shadow-2xl backdrop-blur-md pointer-events-auto">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <h3 className="font-display font-black text-base text-white uppercase tracking-wider">
                GRÁFICOS &amp; DESEMPENHO (60 FPS)
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('PLAY')}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-[10px] font-mono rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                FECHAR ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-1.5 text-[11px] font-bold">
                  PRESET DE TAXA DE QUADROS:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      'COMPETITIVE_120',
                      'BALANCED_60',
                      'ULTRA_PBR',
                    ] as QualityPreset[]
                  ).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        soundEngine.playMenuSelect();
                        onSetQualityPreset(p);
                      }}
                      className={`py-1.5 rounded-lg font-black border text-[11px] transition-colors cursor-pointer ${
                        qualityPreset === p
                          ? 'bg-amber-500 text-black border-amber-400'
                          : 'bg-black/60 border-white/15 text-slate-300 hover:text-white'
                      }`}
                    >
                      {p === 'COMPETITIVE_120'
                        ? '120 FPS'
                        : p === 'BALANCED_60'
                          ? '60 FPS'
                          : 'ULTRA'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 bg-black/50 rounded-lg border border-white/10 text-[10px] text-slate-400 leading-relaxed">
                Renderização otimizada em WebGL 2.0 com aceleração nativa de GPU,
                escala dinâmica (DRS) e baixo consumo de RAM para APK Android.
              </div>
            </div>
          </div>
        )}

        {/* BATTLE PASS */}
        {activeTab === 'BATTLE_PASS' && (
          <div className="max-w-md w-full bg-[#0c0e14]/95 border border-white/20 rounded-xl p-4 sm:p-5 shadow-2xl backdrop-blur-md pointer-events-auto">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <h3 className="font-display font-black text-base text-amber-400 uppercase tracking-wider">
                PASSE DE BATALHA · TEMPORADA WARFACE
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('PLAY')}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-[10px] font-mono rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                FECHAR ✕
              </button>
            </div>
            <p className="font-mono text-xs text-slate-300 leading-relaxed">
              Acumule pontos de XP no estande de tiro e nas incursões táticas
              para subir sua patente militar de <b>Trainee (Nív. 1)</b> até{' '}
              <b>Warface Supremo (Nív. 70)</b> e liberar todo o arsenal.
            </p>
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* 4. RIGHT EDGE VERTICAL TAB: NEWS                                   */}
      {/* =================================================================== */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          soundEngine.playMenuSelect();
          setShowNewsModal((prev) => !prev);
        }}
        className="absolute top-1/2 -translate-y-1/2 right-0 z-30 bg-[#12161f]/90 hover:bg-[#1c222f] border-l border-y border-amber-500/50 rounded-l-lg px-1.5 py-3 flex flex-col items-center gap-1.5 cursor-pointer shadow-lg transition-colors group"
      >
        <div className="w-3 h-3 border border-amber-400 rounded-xs flex items-center justify-center text-[8px] text-amber-400 font-bold">
          ★
        </div>
        <span
          className="font-black text-[9px] tracking-[0.2em] text-slate-200 group-hover:text-amber-300 uppercase"
          style={{ writingMode: 'vertical-lr' }}
        >
          NEWS
        </span>
      </div>

      {/* NEWS POPUP MODAL */}
      {showNewsModal && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-1/2 -translate-y-1/2 right-10 z-40 max-w-xs bg-[#0c0e14]/98 border border-amber-500/40 rounded-xl p-4 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/15">
            <span className="font-black text-xs text-amber-400 tracking-wider">
              ATUALIZAÇÃO TÁTICA
            </span>
            <button
              type="button"
              onClick={() => setShowNewsModal(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
          <p className="font-mono text-[11px] text-slate-300 leading-relaxed">
            • <b>Insígnias Vetoriais SVG</b>: Todas as 70 patentes Warface com
            brasões metálicos nítidos.
            <br />• <b>Estúdio 3D de Armas</b>: Inspeção 360° centralizada e com
            zoom ajustável.
          </p>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5. COMPACT BOTTOM STATUS FOOTER                                     */}
      {/* =================================================================== */}
      <footer className="relative z-20 w-full px-4 sm:px-8 py-1.5 flex items-center justify-between pointer-events-none text-[9px] font-mono text-slate-400/80">
        <span>MOTOR 3D MOBILE OTIMIZADO · 60 FPS</span>
        <span>SISTEMA DE PATENTES WARFACE ATIVO · V0.0.5</span>
      </footer>
    </div>
  );
};
