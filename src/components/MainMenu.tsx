import React, { useEffect, useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { mobileHardware } from '../mobile/nativeHardware';
import { DrillMode, QualityPreset, WeaponId } from '../types/game';

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
  const [activeTab, setActiveTab] = useState<'PLAY' | 'WEAPON' | 'BATTLE_PASS' | 'STORE' | 'SETTINGS'>('PLAY');
  const [showNewsModal, setShowNewsModal] = useState(false);

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
    { id: 'SMG_45', name: 'SMG .45 Sub', caliber: '.45 ACP', category: 'Submetralhadora', damage: 75, fireRate: '900 RPM', range: '35m' },
    { id: 'M4_CARBINE', name: 'M4A1 SOPMOD', caliber: '5.56x45mm', category: 'Fuzil de Assalto', damage: 85, fireRate: '800 RPM', range: '75m' },
    { id: 'CARBINE_AR', name: 'Carabina Tática', caliber: '5.56x45mm', category: 'Carabina de Precisão', damage: 88, fireRate: '750 RPM', range: '85m' },
    { id: 'AK47_RIFLE', name: 'AK-47 Comando', caliber: '7.62x39mm', category: 'Fuzil de Combate', damage: 95, fireRate: '600 RPM', range: '90m' },
    { id: 'L49_LMG', name: 'LMG Pesada 100R', caliber: '5.56x45mm', category: 'Metralhadora Leve', damage: 82, fireRate: '850 RPM', range: '95m' },
    { id: 'SNIPER_BOLT', name: 'Sniper Bolt-Action', caliber: '.338 Lapua Mag', category: 'Fuzil de Precisão', damage: 165, fireRate: 'Ferrolho Manual', range: '150m' },
    { id: 'SNIPER_TACTICAL', name: 'Sniper Tática S&B', caliber: '.308 Winchester', category: 'Fuzil Sniper Tático', damage: 140, fireRate: 'Semi-Auto', range: '130m' },
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
      {/* 1. BACKGROUND: EXACT OPERATOR IN THE DARK SHADOWS (FAITHFUL 1:1)    */}
      {/* =================================================================== */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src={codOperatorBg}
          alt="Operador Tático Rafael Games"
          className="w-full h-full object-cover object-center"
        />
        {/* Soft edge darkening to ensure 100% crisp contrast for UI */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60" />
      </div>

      {/* =================================================================== */}
      {/* 2. TOP HEADER BAR: IDENTICAL TO CALL OF DUTY / MODERN WARFARE       */}
      {/* =================================================================== */}
      <header className="relative z-20 w-full px-6 sm:px-10 py-2.5 bg-[#0e1014]/90 border-b border-white/20 flex items-center justify-between">
        {/* Left: MENU Brand with underline */}
        <div className="flex items-center gap-8 sm:gap-14">
          <div className="flex flex-col items-start cursor-pointer">
            <span className="text-2xl sm:text-3xl font-black tracking-wider uppercase text-white leading-none">
              MENU
            </span>
            <div className="h-[2px] w-full bg-white mt-1.5" />
          </div>

          {/* Center Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-4">
            {[
              { id: 'PLAY', label: 'PLAY' },
              { id: 'WEAPON', label: 'WEAPON / OPERATOR' },
              { id: 'BATTLE_PASS', label: 'BATTLE PASS' },
              { id: 'STORE', label: 'STORE' },
              { id: 'SETTINGS', label: 'SETTINGS' },
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
                  className={`relative px-3 sm:px-4 py-2 font-black text-xs sm:text-sm tracking-widest uppercase transition-colors cursor-pointer ${
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

        {/* Right: Currency, Rank, Social, Fullscreen */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Gold CP Currency */}
          <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
            <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.8)]">
              <span className="text-[9px] font-black text-black leading-none">★</span>
            </div>
            <span className="text-white tracking-wide">2,000</span>
          </div>

          {/* Rank Badge & Username */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full border-2 border-cyan-400 flex items-center justify-center text-[10px] font-black text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.5)]">
              121
            </div>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[9px] text-slate-300 font-semibold tracking-wider">RafaelGames</span>
              <span className="text-[11px] font-black text-cyan-400 tracking-wider">RANK 121</span>
            </div>
          </div>

          {/* Social & Party indicators */}
          <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 border-l border-white/15 pl-4">
            <button
              type="button"
              className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white transition-colors"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-amber-400 text-black font-black text-[9px] flex items-center justify-center">
                Y
              </span>
              <span>Social</span>
              <span className="text-[9px]">▴</span>
            </button>
            <div className="flex items-center gap-1 text-[11px]">
              <span>👥</span>
              <span>1/20</span>
            </div>
            <div className="flex items-center gap-1 text-[11px]">
              <span>👤</span>
              <span>0</span>
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
      {/* 3. LEFT COLUMN: VERTICAL MODES LIST (EXACT TO REFERENCE SCREENSHOT) */}
      {/* =================================================================== */}
      <main className="relative z-20 flex-1 flex items-start px-6 sm:px-12 pt-6 sm:pt-8 pointer-events-none">
        {activeTab === 'PLAY' && (
          <div className="w-64 sm:w-80 flex flex-col gap-1 pointer-events-auto">
            {/* << BACK TO MENU */}
            <div className="mb-2">
              <button
                type="button"
                onMouseEnter={handleHover}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white tracking-widest uppercase cursor-pointer"
              >
                <span>&lt;&lt;</span>
                <span className="underline underline-offset-4 decoration-white/40 hover:decoration-white">
                  BACK TO MENU
                </span>
              </button>
            </div>

            {/* QUICK PLAY */}
            <button
              type="button"
              onMouseEnter={handleHover}
              onClick={() => handleLaunchDrill('KILLHOUSE_BLITZ')}
              className="group relative w-full h-12 bg-black/40 hover:bg-white/15 border-b border-white/25 flex items-center justify-between px-4 text-left transition-all duration-100 cursor-pointer overflow-hidden"
            >
              <span className="text-sm sm:text-base font-black tracking-wider uppercase text-slate-200 group-hover:text-white group-hover:translate-x-1 transition-transform">
                QUICK PLAY
              </span>
              {/* Dotted texture on the right side */}
              <div
                className="w-20 h-6 opacity-30 group-hover:opacity-70 transition-opacity bg-[radial-gradient(circle,#ffffff_1px,transparent_1px)] bg-[size:6px_6px] [mask-image:linear-gradient(to_left,#000_60%,transparent_100%)] pointer-events-none"
              />
            </button>

            {/* MULTIPLAYER */}
            <button
              type="button"
              onMouseEnter={handleHover}
              onClick={() => handleLaunchDrill('TACTICAL_WAVE')}
              className="group relative w-full h-12 bg-black/40 hover:bg-white/15 border-b border-white/25 flex items-center justify-between px-4 text-left transition-all duration-100 cursor-pointer overflow-hidden"
            >
              <span className="text-sm sm:text-base font-black tracking-wider uppercase text-slate-200 group-hover:text-white group-hover:translate-x-1 transition-transform">
                MULTIPLAYER
              </span>
              <div
                className="w-20 h-6 opacity-30 group-hover:opacity-70 transition-opacity bg-[radial-gradient(circle,#ffffff_1px,transparent_1px)] bg-[size:6px_6px] [mask-image:linear-gradient(to_left,#000_60%,transparent_100%)] pointer-events-none"
              />
            </button>

            {/* SHOOT RANGE (THE REQUESTED TREINO / ESTANDE DE TIRO BUTTON) */}
            <button
              type="button"
              onMouseEnter={handleHover}
              onClick={handleLaunchTraining}
              className="group relative w-full h-12 bg-black/40 hover:bg-white/15 border-b border-white/25 flex items-center justify-between px-4 text-left transition-all duration-100 cursor-pointer overflow-hidden"
            >
              <span className="text-sm sm:text-base font-black tracking-wider uppercase text-slate-200 group-hover:text-white group-hover:translate-x-1 transition-transform">
                SHOOT RANGE
              </span>
              <div
                className="w-20 h-6 opacity-30 group-hover:opacity-70 transition-opacity bg-[radial-gradient(circle,#ffffff_1px,transparent_1px)] bg-[size:6px_6px] [mask-image:linear-gradient(to_left,#000_60%,transparent_100%)] pointer-events-none"
              />
            </button>

            {/* ZOMBIES (HIGHLIGHTED IN BOLD RED FROM REFERENCE IMAGE) */}
            <button
              type="button"
              onMouseEnter={handleHover}
              onClick={() => handleLaunchDrill('TACTICAL_WAVE')}
              className="group relative w-full h-12 bg-black/40 hover:bg-red-950/40 border-b border-white/25 flex items-center justify-between px-4 text-left transition-all duration-100 cursor-pointer overflow-hidden"
            >
              <span className="text-sm sm:text-base font-black tracking-wider uppercase text-[#e53935] group-hover:text-red-400 drop-shadow-[0_0_8px_rgba(229,57,53,0.7)] group-hover:translate-x-1 transition-transform">
                ZOMBIES
              </span>
              <div
                className="w-20 h-6 opacity-40 group-hover:opacity-90 transition-opacity bg-[radial-gradient(circle,#ef4444_1px,transparent_1px)] bg-[size:6px_6px] [mask-image:linear-gradient(to_left,#000_60%,transparent_100%)] pointer-events-none"
              />
            </button>
          </div>
        )}

        {/* WEAPON / OPERATOR MODAL */}
        {activeTab === 'WEAPON' && (
          <div className="max-w-4xl w-full bg-[#0c0e14]/95 border border-white/20 rounded-xl p-6 shadow-2xl backdrop-blur-md pointer-events-auto">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <div>
                <h3 className="font-display font-black text-lg text-white uppercase tracking-wider">
                  WEAPONS / OPERATOR LOADOUT
                </h3>
                <p className="font-mono text-xs text-slate-400">
                  Todas as 8 armas ficam expostas fisicamente na parede do estande de tiro (SHOOT RANGE).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('PLAY')}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-mono rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                BACK [ESC] ✕
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-[55vh] overflow-y-auto pr-1">
              {weaponList.map((w) => (
                <div
                  key={w.id}
                  onClick={() => {
                    soundEngine.playMenuSelect();
                    onSelectStartingWeapon(w.id);
                  }}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                    activeWeapon === w.id
                      ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                      : 'bg-black/60 border-white/15 hover:border-white/40 hover:bg-white/5'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-1 text-[10px] font-mono">
                      <span className="text-amber-400 font-bold">{w.caliber}</span>
                      <span className="text-slate-400">{w.category}</span>
                    </div>
                    <div className="font-bold text-sm text-white tracking-wide">{w.name}</div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/10 text-[10px] font-mono text-slate-400 flex justify-between">
                    <span>DMG: <b className="text-white">{w.damage}</b></span>
                    <span>ALC: <b className="text-white">{w.range}</b></span>
                  </div>

                  <button
                    type="button"
                    className={`mt-2 w-full py-1 text-[11px] font-mono font-black uppercase rounded ${
                      activeWeapon === w.id
                        ? 'bg-amber-500 text-black'
                        : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {activeWeapon === w.id ? 'EQUIPPED ✓' : 'EQUIP'}
                  </button>
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
                GRAPHICS & HARDWARE
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('PLAY')}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-mono rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                BACK [ESC] ✕
              </button>
            </div>

            <div className="flex flex-col gap-4 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-2 font-bold">FRAME RATE PRESET:</label>
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
                Renderização otimizada em WebGL 2.0 com suporte a iluminação direta nos modelos de armas e balística em tempo real.
              </div>
            </div>
          </div>
        )}

        {/* BATTLE PASS / STORE */}
        {(activeTab === 'BATTLE_PASS' || activeTab === 'STORE') && (
          <div className="max-w-md w-full bg-[#0c0e14]/95 border border-white/20 rounded-xl p-6 shadow-2xl backdrop-blur-md pointer-events-auto">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <h3 className="font-display font-black text-lg text-amber-400 uppercase tracking-wider">
                {activeTab === 'BATTLE_PASS' ? 'BATTLE PASS · SEASON 01' : 'OPERATOR STORE'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('PLAY')}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-mono rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                BACK [ESC] ✕
              </button>
            </div>
            <p className="font-mono text-xs text-slate-300 leading-relaxed">
              Complete treinos no estande de tiro (SHOOT RANGE) e elimine alvos balísticos para desbloquear novas camuflagens de armas e operadores táticos.
            </p>
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* 4. RIGHT EDGE VERTICAL TAB: NEWS (EXACT REPLICA FROM REFERENCE)    */}
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
            <span className="font-black text-sm text-amber-400 tracking-wider">TACTICAL DISPATCH · NEWS</span>
            <button
              type="button"
              onClick={() => setShowNewsModal(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="font-mono text-xs text-slate-300 leading-relaxed mb-3">
            • <b>8 Armas na Parede</b>: Sala de cofre militar modelada com iluminação de estúdio e pegboard em aço.<br />
            • <b>Tela Cheia Automática</b>: Experiência horizontal imersiva garantida em qualquer dispositivo.<br />
            • <b>M4, AK-47, Mark 23 & Snipers</b>: Balística completa com recarga tática por etapas.
          </p>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5. BOTTOM RIGHT WATERMARK (EXACT TEXT FROM REFERENCE SCREENSHOT)     */}
      {/* =================================================================== */}
      <footer className="relative z-20 w-full px-6 sm:px-10 py-3 flex items-center justify-end pointer-events-none">
        <p className="font-mono text-[9px] sm:text-[10px] text-slate-500 tracking-wider uppercase text-right">
          UNDER DEVELOPMENT - DOES NOT REPRESENT THE QUALITY OF THE FINAL PRODUCT - VERSION: 0.0.3
        </p>
      </footer>
    </div>
  );
};
