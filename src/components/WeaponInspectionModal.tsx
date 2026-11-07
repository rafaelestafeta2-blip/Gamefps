import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { soundEngine } from '../audio/soundEngine';
import {
  getRequiredXpForWeapon,
  isWeaponUnlockedAtXp,
} from '../progression/ranks';
import { createProceduralTextures } from '../three/textures';
import { buildTacticalWeaponRig } from '../three/weaponBuilder';
import { WeaponId } from '../types/game';

interface WeaponInspectionModalProps {
  activeWeapon: WeaponId;
  playerXp: number;
  onSelectWeapon: (weaponId: WeaponId) => void;
  onClose: () => void;
  onStartTraining: () => void;
}

const WEAPON_SPECS: Record<
  WeaponId,
  {
    name: string;
    caliber: string;
    category: string;
    description: string;
    firepower: number; // 0..100
    accuracy: number; // 0..100
    mobility: number; // 0..100
    handling: number; // 0..100
    magSize: number;
    reserve: number;
  }
> = {
  P50_PISTOL: {
    name: 'Mark 23 Tática',
    caliber: '.45 ACP',
    category: 'Pistola Pesada',
    description: 'Pistola tática de alta precisão com supressor integrado e excelente poder de paragem em curtas distâncias.',
    firepower: 65,
    accuracy: 88,
    mobility: 95,
    handling: 92,
    magSize: 12,
    reserve: 48,
  },
  SMG_45: {
    name: 'SMG .45 Sub',
    caliber: '.45 ACP',
    category: 'Submetralhadora',
    description: 'Submetralhadora compacta de tiro rápido (900 RPM). Ideal para incursões CQB e combate dinâmico.',
    firepower: 75,
    accuracy: 78,
    mobility: 90,
    handling: 85,
    magSize: 32,
    reserve: 128,
  },
  M4_CARBINE: {
    name: 'M4A1 SOPMOD',
    caliber: '5.56x45mm NATO',
    category: 'Fuzil de Assalto',
    description: 'O padrão ouro em fuzis de assalto táticos. Versátil, equilibrado e com excelente controle de recuo.',
    firepower: 85,
    accuracy: 84,
    mobility: 78,
    handling: 80,
    magSize: 30,
    reserve: 120,
  },
  CARBINE_AR: {
    name: 'Carabina Tática',
    caliber: '5.56x45mm NATO',
    category: 'Carabina de Precisão',
    description: 'Variante de cano alongado focada em engajamentos de média distância com alta retenção de velocidade balística.',
    firepower: 88,
    accuracy: 89,
    mobility: 75,
    handling: 77,
    magSize: 30,
    reserve: 120,
  },
  AK47_RIFLE: {
    name: 'AK-47 Comando',
    caliber: '7.62x39mm',
    category: 'Fuzil de Combate',
    description: 'Poder de fogo bruto em calibre 7.62mm. Causa dano devastador por impacto com alta penetração em blindagem.',
    firepower: 96,
    accuracy: 72,
    mobility: 70,
    handling: 68,
    magSize: 30,
    reserve: 120,
  },
  L49_LMG: {
    name: 'LMG Pesada 100R',
    caliber: '5.56x45mm NATO',
    category: 'Metralhadora Leve',
    description: 'Pente tambor de 100 munições para supressão contínua de fogo em ondas inimigas.',
    firepower: 82,
    accuracy: 70,
    mobility: 55,
    handling: 60,
    magSize: 100,
    reserve: 300,
  },
  SNIPER_TACTICAL: {
    name: 'Sniper Tática S&B',
    caliber: '.308 Winchester',
    category: 'Fuzil Sniper Tático',
    description: 'Fuzil semiautomático de longo alcance equipado com luneta LPVO 1-4x para neutralização rápida de alvos distantes.',
    firepower: 98,
    accuracy: 96,
    mobility: 58,
    handling: 62,
    magSize: 10,
    reserve: 40,
  },
  SNIPER_BOLT: {
    name: 'Sniper Bolt-Action',
    caliber: '.338 Lapua Magnum',
    category: 'Fuzil de Precisão',
    description: 'Poder letal absoluto a 150m+. Cada disparo exige ciclagens manuais precisas do ferrolho tático.',
    firepower: 100,
    accuracy: 99,
    mobility: 50,
    handling: 55,
    magSize: 5,
    reserve: 25,
  },
};

export const WeaponInspectionModal: React.FC<WeaponInspectionModalProps> = ({
  activeWeapon,
  playerXp,
  onSelectWeapon,
  onClose,
  onStartTraining,
}) => {
  const [selectedId, setSelectedId] = useState<WeaponId>(activeWeapon);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const weaponRigRef = useRef<ReturnType<typeof buildTacticalWeaponRig> | null>(null);

  const weaponInfo = WEAPON_SPECS[selectedId];
  const isUnlocked = isWeaponUnlockedAtXp(selectedId, playerXp);
  const req = getRequiredXpForWeapon(selectedId);

  // Initialize live 3D Three.js weapon viewer canvas
  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 350;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    camera.position.set(0, 0.15, 2.2);

    // Studio Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 2.5);
    dirLight.position.set(3, 5, 4);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    rimLight.position.set(-3, 2, -3);
    scene.add(rimLight);

    const textures = createProceduralTextures(renderer);
    const rig = buildTacticalWeaponRig(textures, false);
    rig.root.position.set(0, -0.08, 0);
    rig.root.rotation.set(0.1, Math.PI * 0.15, 0);
    scene.add(rig.root);
    weaponRigRef.current = rig;

    rig.setActiveWeapon(selectedId);
    rig.ironSightsGroup.visible = true;
    rig.holoSightGroup.visible = false;
    rig.lpvoScopeGroup.visible = false;

    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      if (rig.root) {
        rig.root.rotation.y += dt * 0.45; // Smooth cinematic weapon spin
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [selectedId]);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 select-none font-sans text-white pointer-events-auto">
      <div className="max-w-6xl w-full h-[85vh] bg-[#0c0e14] border-2 border-amber-500/50 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.3)] flex flex-col overflow-hidden">
        
        {/* TOP HEADER BAR (COD MW STYLE) */}
        <header className="px-6 py-4 bg-[#141820] border-b border-white/15 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono font-bold tracking-[0.25em] text-amber-400 bg-amber-500/20 px-3 py-1 rounded border border-amber-500/40 uppercase">
              CUSTOM LOADOUT 1 · INSPEÇÃO 3D
            </span>
            <h2 className="font-display font-black text-xl sm:text-2xl uppercase tracking-wider text-white">
              PRIMARY WEAPON SHOWCASE
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-base font-bold cursor-pointer transition-colors"
          >
            ✕
          </button>
        </header>

        {/* MAIN BODY GRID */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* LEFT COLUMN: WEAPON LIST */}
          <div className="lg:col-span-4 bg-[#090b0e] border-r border-white/10 p-4 overflow-y-auto space-y-2">
            <div className="text-[11px] font-mono font-bold text-slate-400 tracking-wider uppercase mb-2 px-1">
              SELECIONAR ARMA DO ARSENAL ({Object.keys(WEAPON_SPECS).length})
            </div>

            {(Object.keys(WEAPON_SPECS) as WeaponId[]).map((wId) => {
              const spec = WEAPON_SPECS[wId];
              const unlocked = isWeaponUnlockedAtXp(wId, playerXp);
              const isSelected = selectedId === wId;
              const isEquipped = activeWeapon === wId;
              const reqRank = getRequiredXpForWeapon(wId);

              return (
                <div
                  key={wId}
                  onClick={() => {
                    soundEngine.playMenuSelect();
                    setSelectedId(wId);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-500/25 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                      : unlocked
                        ? 'bg-black/60 border-white/15 hover:border-white/40 hover:bg-white/10'
                        : 'bg-black/90 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-amber-400 font-bold">{spec.caliber}</span>
                      {isEquipped && (
                        <span className="text-[8px] font-mono font-black bg-amber-400 text-black px-1.5 py-0.2 rounded">
                          EQUIPADA
                        </span>
                      )}
                    </div>
                    <span className="font-display font-bold text-sm sm:text-base text-white tracking-wide mt-0.5">
                      {spec.name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">{spec.category}</span>
                  </div>

                  <div className="text-right font-mono text-xs">
                    {unlocked ? (
                      <span className="text-emerald-400 font-bold">DESBLOQUEADA ✓</span>
                    ) : (
                      <span className="text-amber-400 font-bold">🔒 NÍV {reqRank.requiredLevel}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT / CENTER COLUMN: 3D VIEWER & STATS (COD MW ATTACHED IMAGE STYLE) */}
          <div className="lg:col-span-8 bg-[#0e1117] p-6 flex flex-col justify-between overflow-y-auto">
            
            {/* Top Details & Title */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-xs font-mono text-amber-400 font-bold tracking-widest uppercase">
                    {weaponInfo.category} · {weaponInfo.caliber}
                  </div>
                  <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-wider mt-1">
                    {weaponInfo.name.toUpperCase()}
                  </h1>
                  <p className="font-mono text-xs text-slate-300 max-w-xl mt-2 leading-relaxed">
                    {weaponInfo.description}
                  </p>
                </div>

                {/* Mastery Badge */}
                <div className="flex items-center gap-2 bg-black/60 border border-amber-500/40 rounded-xl px-4 py-2.5">
                  <span className="text-2xl">🔥</span>
                  <div className="flex flex-col font-mono">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">MASTERY ELIMS</span>
                    <span className="text-base font-bold text-amber-400">4,821 ELIMS</span>
                  </div>
                </div>
              </div>

              {/* LIVE 3D GLB WEAPON VIEWER CANVAS */}
              <div className="relative w-full h-56 sm:h-68 bg-gradient-to-b from-black/80 via-black/40 to-black/90 border border-white/15 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                <div ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
                <div className="absolute bottom-3 left-4 font-mono text-[10px] text-amber-400 bg-black/70 px-2.5 py-1 rounded border border-white/10 pointer-events-none">
                  🔍 INSPEÇÃO 3D EM TEMPO REAL (ROTAÇÃO CINEMATOGRÁFICA)
                </div>
                {!isUnlocked && (
                  <div className="absolute top-3 right-3 bg-black/80 border border-amber-500/40 rounded-lg px-2.5 py-1 font-mono text-[10px] text-amber-300 pointer-events-none">
                    PATENTE RECOMENDADA: NÍV {req.requiredLevel} ({req.rankTitle})
                  </div>
                )}
              </div>
            </div>

            {/* DETAILED WEAPON STATS BARS */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-2.5 font-mono text-xs">
                <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                  ESPECIFICAÇÕES TÁTICAS DE COMBATE
                </div>
                {[
                  { label: 'FIREPOWER (DANHO)', val: weaponInfo.firepower, color: 'bg-amber-500' },
                  { label: 'ACCURACY (PRECISÃO)', val: weaponInfo.accuracy, color: 'bg-emerald-500' },
                  { label: 'MOBILITY (MOBILIDADE)', val: weaponInfo.mobility, color: 'bg-sky-500' },
                  { label: 'HANDLING (MANUSEIO)', val: weaponInfo.handling, color: 'bg-purple-500' },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-3">
                    <span className="w-40 text-slate-400 text-[11px] shrink-0">{stat.label}</span>
                    <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                      <div className={`h-full ${stat.color} transition-all duration-500`} style={{ width: `${stat.val}%` }} />
                    </div>
                    <span className="w-10 text-right font-bold text-white">{stat.val}</span>
                  </div>
                ))}
              </div>

              {/* Ammo & Stats Summary Boxes */}
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="bg-black/60 border border-white/15 rounded-xl p-3.5 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-400 uppercase">CAPACIDADE DO PENTE</span>
                  <span className="text-2xl font-black text-white mt-0.5">{weaponInfo.magSize} <span className="text-xs text-amber-400 font-normal">ROUNDS</span></span>
                </div>
                <div className="bg-black/60 border border-white/15 rounded-xl p-3.5 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-400 uppercase">MUNIÇÃO DE RESERVA</span>
                  <span className="text-2xl font-black text-white mt-0.5">{weaponInfo.reserve} <span className="text-xs text-amber-400 font-normal">ROUNDS</span></span>
                </div>
              </div>
            </div>

            {/* ACTION FOOTER BUTTONS */}
            <div className="mt-6 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
                <span>STATUS:</span>
                <span className="text-emerald-400 font-bold">
                  PRONTA PARA COMBATE &amp; TESTE
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playMenuSelect();
                    onSelectWeapon(selectedId);
                  }}
                  className={`px-6 py-3 rounded-xl font-display font-black text-sm uppercase tracking-widest transition-all cursor-pointer ${
                    activeWeapon === selectedId
                      ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                      : 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                  }`}
                >
                  {activeWeapon === selectedId ? 'ARMA EQUIPADA ✓' : 'EQUIPAR ARMA'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playMenuSelect();
                    onSelectWeapon(selectedId);
                    onClose();
                    onStartTraining();
                  }}
                  className="px-6 py-3 rounded-xl font-display font-black text-sm uppercase tracking-widest border bg-white/10 hover:bg-white/20 border-white/30 text-white transition-all cursor-pointer"
                >
                  ESTANDE DE TIRO [TESTAR]
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
