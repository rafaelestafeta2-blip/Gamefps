import React, { useEffect, useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { mobileHardware } from '../mobile/nativeHardware';
import {
  getNextRank,
  getRankForXp,
  getRequiredXpForWeapon,
  isWeaponUnlockedAtXp,
  loadSavedPlayerXp,
  WARFACE_RANKS,
} from '../progression/ranks';
import { DrillMode, QualityPreset, WeaponId } from '../types/game';
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

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartTraining,
  onStartDrill,
  activeWeapon,
  onSelectStartingWeapon,
  qualityPreset,
  onSetQualityPreset,
}) => {
  const [activeTab, setActiveTab] = useState<
    'PLAY' | 'WEAPON' | 'RANKS' | 'BATTLE_PASS' | 'STORE' | 'SETTINGS'
  >('PLAY');
  const [showNewsModal, setShowNewsModal] = useState(false);

  // Live Warface Progression State
  const playerXp = loadSavedPlayerXp();
  const currentRank = getRankForXp(playerXp);
  const nextRank = getNextRank(currentRank.level);
  const xpCurrentLevelBase = currentRank.requiredXp;
  const xpForNextLevel = nextRank ? nextRank.requiredXp : currentRank.requiredXp + 5000;
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

  const weaponList: Array<{
    id: WeaponId;
    name: string;
    caliber: string;
    category: string;
    damage: number;
    fireRate: string;
    range: string;
  }> = [
    { id: 'P50_PISTOL', name: 'Mark 23 Tática', caliber: '.45 ACP', category: 'Pistola Pesada', damage: 68, fireRate: 'Semi', range: '25m' },
    { id: 'M4_CARBINE', name: 'M4A1 SOPMOD', caliber: '5.56x45mm', category: 'Fuzil de Assalto', damage: 85, fireRate: '800 RPM', range: '75m' },
    { id: 'SMG_45', name: 'SMG .45 Sub', caliber: '.45 ACP', category: 'Submetralhadora', damage: 75, fireRate: '900 RPM', range: '35m' },
    { id: 'AK47_RIFLE', name: 'AK-47 Comando', caliber: '7.62x39mm', category: 'Fuzil de Combate', damage: 95, fireRate: '600 RPM', range: '90m' },
    { id: 'CARBINE_AR', name: 'Carabina Tática', caliber: '5.56x45mm', category: 'Carabina de Precisão', damage: 88, fireRate: '750 RPM', range: '85m' },
    { id: 'L49_LMG', name: 'LMG Pesada 100R', caliber: '5.56x45mm', category: 'Metralhadora Leve', damage: 82, fireRate: '850 RPM', range: '95m' },
    { id: 'SNIPER_TACTICAL', name: 'Sniper Tática S&B', caliber: '.308 Winchester', category: 'Fuzil Sniper Tático', damage: 140, fireRate: 'Semi-Auto', range: '130m' },
    { id: 'SNIPER_BOLT', name: 'Sniper Bolt-Action', caliber: '.338 Lapua Mag', category: 'Fuzil de Precisão', damage: 165, fireRate: 'Ferrolho Manual', range: '150m' },
  ];

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

  return (
    <div
      onClick={() => {
        void mobileHardware.enterFullscreenLandscape();
      }}
      className="fixed inset-0 z-40 bg-black select-none text-white flex flex-col justify-between overflow-hidden font-sans"
    >
      {/* =================================================================== */}
      {/* 1. BACKGROUND: EXACT OPERATOR IN THE DARK SHADOWS                   */}
      {/* =================================================================== */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src={codOperatorBg}
          alt="Operador Tático Rafael Games"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60" />
      </div>

      {/* =================================================================== */}
      {/* 2. TOP HEADER BAR: CALL OF DUTY / WARFACE STYLE WITH RANK BADGE      */}
      {/* =================================================================== */}
      <header className="relative z-20 w-full px-6 sm:px-10 py-2.5 bg-[#0e1014]/90 border-b border-white/20 flex items-center justify-between">
        {/* Left: MENU Brand with underline */}
        <div className="flex items-center gap-6 sm:gap-12">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.playMenuSelect();
              setActiveTab('PLAY');
            }}
            className="flex flex-col items-start cursor-pointer"
          >
            <span className="text-2xl sm:text-3xl font-black tracking-wider uppercase text-white leading-none">
              MENU
            </span>
            <div className="h-[2px] w-full bg-white mt-1.5" />
          </button>

          {/* Center Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-3">
            {[
              { id: 'PLAY', label: 'JOGAR' },
              { id: 'WEAPON', label: 'ARMAS / LOADOUT' },
              { id: 'RANKS', label: 'PATENTES WARFACE' },
              { id: 'BATTLE_PASS', label: 'PASSE DE BATALHA' },
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
                    setActiveTab(tab.id as any);
                  }}
                  className={`relative px-2.5 sm:px-3.5 py-2 font-black text-xs sm:text-sm tracking-widest uppercase transition-colors cursor-pointer ${
                    isSelected ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  {isSelected && (
                    <div className="absolute bottom-[-11px] left-0 right-0 h-[3px] bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.9)]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Warface Rank Badge & Player Profile */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Warface Rank Badge Card */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.playMenuSelect();
              setActiveTab('RANKS');
            }}
            className="flex items-center gap-2.5 bg-black/60 border border-amber-500/40 hover:border-amber-400 rounded-xl px-3 py-1 cursor-pointer transition-colors"
          >
            <div
              className="w-7 h-7 rounded-lg border-2 flex items-center justify-center font-black text-xs shadow-md"
              style={{
                borderColor: currentRank.badgeColor,
                color: currentRank.badgeColor,
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}
            >
              {currentRank.badge}
            </div>
            <div className="flex flex-col text-left leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black tracking-wider text-amber-300">
                  NÍV {currentRank.level} · {currentRank.title.toUpperCase()}
                </span>
              </div>
              {/* XP Bar */}
              <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/10 mt-0.5">
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${xpLevelProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Fullscreen Button Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void mobileHardware.toggleFullscreenLandscape();
            }}
            title="Ativar/Desativar Tela Cheia Horizontal"
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-[11px] font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            ⛶
          </button>
        </div>
      </header>

      {/* =================================================================== */}
      {/* 3. MAIN TAB CONTENT PANELS                                          */}
      {/* =================================================================== */}
      <main className="relative z-20 flex-1 flex items-start px-6 sm:px-12 pt-6 sm:pt-8 pointer-events-none">
        {/* TAB PLAY: VERTICAL MODES LIST */}
        {activeTab === 'PLAY' && (
          <div className="w-64 sm:w-80 flex flex-col gap-1 pointer-events-auto">
            <div className="mb-2">
              <button
                type="button"
                onMouseEnter={handleHover}
                onClick={(e) => {
                  e.stopPropagation();
                  soundEngine.playMenuSelect();
                  setActiveTab('WEAPON');
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-200 tracking-widest uppercase cursor-pointer"
              >
                <span>&gt;&gt;</span>
                <span className="underline underline-offset-4 decoration-amber-400/50 hover:decoration-amber-200">
                  ESCOLHER ARMA / LOADOUT
                </span>
              </button>
            </div>

            {/* SHOOT RANGE / ESTANDE DE TIRO (PRIMARY) */}
            <button
              type="button"
              onMouseEnter={handleHover}
              onClick={handleLaunchTraining}
              className="group relative w-full h-12 bg-black/40 hover:bg-white/15 border-b border-amber-500/50 flex items-center justify-between px-4 text-left transition-all duration-100 cursor-pointer overflow-hidden"
            >
              <span className="text-sm sm:text-base font-black tracking-wider uppercase text-amber-300 group-hover:text-amber-200 group-hover:translate-x-1 transition-transform">
                ESTANDE DE TIRO (LIVRE)
              </span>
              <div className="w-20 h-6 opacity-40 group-hover:opacity-90 transition-opacity bg-[radial-gradient(circle,#f59e0b_1px,transparent_1px)] bg-[size:6px_6px] [mask-image:linear-gradient(to_left,#000_60%,transparent_100%)] pointer-events-none" />
            </button>

            {/* KILLHOUSE CQB INVASION */}
            <button
              type="button"
              onMouseEnter={handleHover}
              onClick={() => handleLaunchDrill('KILLHOUSE_BLITZ')}
              className="group relative w-full h-12 bg-black/40 hover:bg-white/15 border-b border-white/25 flex items-center justify-between px-4 text-left transition-all duration-100 cursor-pointer overflow-hidden"
            >
              <span className="text-sm sm:text-base font-black tracking-wider uppercase text-slate-200 group-hover:text-white group-hover:translate-x-1 transition-transform">
                INCURSÃO KILLHOUSE
              </span>
              <div className="w-20 h-6 opacity-30 group-hover:opacity-70 transition-opacity bg-[radial-gradient(circle,#ffffff_1px,transparent_1px)] bg-[size:6px_6px] [mask-image:linear-gradient(to_left,#000_60%,transparent_100%)] pointer-events-none" />
            </button>

            {/* COMBATE IA HOSTIL */}
            <button
              type="button"
              onMouseEnter={handleHover}
              onClick={() => handleLaunchDrill('TACTICAL_WAVE')}
              className="group relative w-full h-12 bg-black/40 hover:bg-red-950/40 border-b border-white/25 flex items-center justify-between px-4 text-left transition-all duration-100 cursor-pointer overflow-hidden"
            >
              <span className="text-sm sm:text-base font-black tracking-wider uppercase text-red-400 group-hover:text-red-300 group-hover:translate-x-1 transition-transform">
                COMBATE CONTRA IA
              </span>
              <div className="w-20 h-6 opacity-40 group-hover:opacity-90 transition-opacity bg-[radial-gradient(circle,#ef4444_1px,transparent_1px)] bg-[size:6px_6px] [mask-image:linear-gradient(to_left,#000_60%,transparent_100%)] pointer-events-none" />
            </button>
          </div>
        )}

        {/* TAB WEAPON / LOADOUT: PREMIUM 3D INSPECTION SHOWCASE (COD MW STYLE) */}
        {activeTab === 'WEAPON' && (
          <WeaponInspectionModal
            activeWeapon={activeWeapon}
            playerXp={playerXp}
            onSelectWeapon={(wId) => onSelectStartingWeapon(wId)}
            onClose={() => setActiveTab('PLAY')}
            onStartTraining={handleLaunchTraining}
          />
        )}

        {/* TAB RANKS: WARFACE RANKING & CAREER PROGRESSION ROSTER (70 EXACT WARFACE RANKS) */}
        {activeTab === 'RANKS' && (
          <div className="max-w-6xl w-full bg-[#0c0e14]/98 border border-amber-500/40 rounded-2xl p-5 shadow-2xl backdrop-blur-xl pointer-events-auto">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-3">
              <div>
                <h3 className="font-display font-black text-xl text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <span>TABELA OFICIAL DE PATENTES WARFACE</span>
                  <span className="text-xs font-mono text-slate-300 bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                    70 PATENTES COMPLETA
                  </span>
                </h3>
                <p className="font-mono text-xs text-slate-300 mt-1">
                  Patente Atual: <b className="text-amber-400">{currentRank.badge} Nív. {currentRank.level} — {currentRank.title}</b> ({playerXp.toLocaleString()} XP TOTAL)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('PLAY')}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-mono rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                VOLTAR [ESC] ✕
              </button>
            </div>

            {/* 5-Column Grid matching the Warface Rank Chart Screenshot */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5 max-h-[62vh] overflow-y-auto pr-1.5 font-mono text-xs">
              {[
                { colTitle: '1 AO 15', range: WARFACE_RANKS.slice(0, 15) },
                { colTitle: '16 AO 30', range: WARFACE_RANKS.slice(15, 30) },
                { colTitle: '31 AO 45', range: WARFACE_RANKS.slice(30, 45) },
                { colTitle: '46 AO 60', range: WARFACE_RANKS.slice(45, 60) },
                { colTitle: '61 AO 70 (SPECIAL FORCES & WARFACE)', range: WARFACE_RANKS.slice(60, 70) },
              ].map((col, cIdx) => (
                <div key={cIdx} className="bg-black/60 border border-white/10 rounded-xl p-2 flex flex-col gap-1.5">
                  <div className="text-[10px] font-bold text-amber-400/90 border-b border-white/10 pb-1 px-1 tracking-widest text-center uppercase">
                    {col.colTitle}
                  </div>
                  <div className="space-y-1">
                    {col.range.map((r) => {
                      const isCurrent = currentRank.level === r.level;
                      const isReached = playerXp >= r.requiredXp;

                      return (
                        <div
                          key={r.level}
                          className={`p-1.5 rounded border flex items-center justify-between gap-1.5 transition-all text-[11px] ${
                            isCurrent
                              ? 'bg-amber-500/25 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)] text-amber-200'
                              : isReached
                                ? 'bg-black/80 border-emerald-500/30 text-slate-200'
                                : 'bg-black/90 border-slate-800/80 opacity-60 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-bold text-slate-400 text-[10px] w-5 text-right shrink-0">
                              {r.level}
                            </span>
                            <span
                              className="w-5 h-5 rounded border flex items-center justify-center text-[10px] font-bold shrink-0"
                              style={{
                                borderColor: r.badgeColor,
                                color: r.badgeColor,
                                backgroundColor: 'rgba(0,0,0,0.6)',
                              }}
                            >
                              {r.badge}
                            </span>
                            <span className="font-semibold truncate text-[10px] text-white" title={r.title}>
                              {r.title}
                            </span>
                          </div>

                          {isCurrent && (
                            <span className="text-[8px] font-bold bg-amber-400 text-black px-1 rounded shrink-0">
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
          <div className="max-w-md w-full bg-[#0c0e14]/95 border border-white/20 rounded-xl p-6 shadow-2xl backdrop-blur-md pointer-events-auto">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <h3 className="font-display font-black text-lg text-white uppercase tracking-wider">
                GRÁFICOS &amp; DESEMPENHO
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('PLAY')}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-mono rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                VOLTAR [ESC] ✕
              </button>
            </div>

            <div className="flex flex-col gap-4 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-2 font-bold">PRESET DE TAXA DE QUADROS:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['COMPETITIVE_120', 'BALANCED_60', 'ULTRA_PBR'] as QualityPreset[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        soundEngine.playMenuSelect();
                        onSetQualityPreset(p);
                      }}
                      className={`py-2 rounded font-black border transition-colors ${
                        qualityPreset === p
                          ? 'bg-amber-500 text-black border-amber-400'
                          : 'bg-black/60 border-white/15 text-slate-300 hover:text-white'
                      }`}
                    >
                      {p === 'COMPETITIVE_120' ? '120 FPS' : p === 'BALANCED_60' ? '60 FPS' : 'ULTRA'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-black/50 rounded border border-white/10 text-[11px] text-slate-400 leading-relaxed">
                Renderização otimizada em WebGL 2.0 com aceleração nativa de GPU, DRS automático e persistência de dados.
              </div>
            </div>
          </div>
        )}

        {/* BATTLE PASS / STORE */}
        {activeTab === 'BATTLE_PASS' && (
          <div className="max-w-md w-full bg-[#0c0e14]/95 border border-white/20 rounded-xl p-6 shadow-2xl backdrop-blur-md pointer-events-auto">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <h3 className="font-display font-black text-lg text-amber-400 uppercase tracking-wider">
                PASSE DE BATALHA · TEMPORADA WARFACE
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('PLAY')}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-mono rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                VOLTAR [ESC] ✕
              </button>
            </div>
            <p className="font-mono text-xs text-slate-300 leading-relaxed">
              Acumule pontos de XP no estande de tiro e em combate para subir sua patente militar de <b>Recruta (Nív. 1)</b> a <b>Lenda Warface (Nív. 15)</b> e desbloquear o arsenal completo.
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
        className="absolute top-1/2 -translate-y-1/2 right-0 z-30 bg-[#16191f]/90 hover:bg-[#20252e] border-l border-y border-amber-500/50 rounded-l-md px-1.5 py-4 flex flex-col items-center gap-2 cursor-pointer shadow-lg transition-colors group"
      >
        <div className="w-3.5 h-3.5 border border-amber-400 rounded-sm flex items-center justify-center text-[9px] text-amber-400 font-bold group-hover:scale-110 transition-transform">
          □
        </div>
        <span
          className="font-black text-[10px] tracking-[0.25em] text-slate-200 group-hover:text-amber-300 uppercase"
          style={{ writingMode: 'vertical-lr' }}
        >
          NEWS
        </span>
      </div>

      {/* NEWS POPUP MODAL */}
      {showNewsModal && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-1/2 -translate-y-1/2 right-12 z-40 max-w-sm bg-[#0c0e14]/98 border border-amber-500/40 rounded-xl p-5 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/15">
            <span className="font-black text-sm text-amber-400 tracking-wider">NOTÍCIAS TÁTICAS</span>
            <button
              type="button"
              onClick={() => setShowNewsModal(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="font-mono text-xs text-slate-300 leading-relaxed mb-3">
            • <b>Sistema de Patentes Warface</b>: 15 patentes militares com desbloqueio de armas e miras por XP.<br />
            • <b>Acessórios Desbloqueáveis</b>: Laser PEQ (Nív. 2), Supressor (Nív. 3), Holo (Nív. 4), Mira 45° (Nív. 6) e LPVO (Nív. 8).
          </p>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5. BOTTOM RIGHT WATERMARK                                           */}
      {/* =================================================================== */}
      <footer className="relative z-20 w-full px-6 sm:px-10 py-3 flex items-center justify-end pointer-events-none">
        <p className="font-mono text-[9px] sm:text-[10px] text-slate-500 tracking-wider uppercase text-right">
          SISTEMA DE PATENTES WARFACE ATIVO - VERSÃO: 0.0.4
        </p>
      </footer>
    </div>
  );
};
