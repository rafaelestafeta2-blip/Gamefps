export type CompetitiveRankTierId =
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'DIAMOND'
  | 'ELITE'
  | 'MASTER'
  | 'LEGEND';

export interface CompetitiveRankTier {
  id: CompetitiveRankTierId;
  name: string;
  shortName: string;
  division: string;
  minMmr: number;
  maxMmr: number | null;
  accentHex: string;
  glowRgba: string;
  rewardLabel: string;
}

export const COMPETITIVE_RANKS: CompetitiveRankTier[] = [
  {
    id: 'BRONZE',
    name: 'Bronze I',
    shortName: 'Bronze',
    division: 'DIVISÃO I',
    minMmr: 0,
    maxMmr: 799,
    accentHex: '#d97706',
    glowRgba: 'rgba(217,119,6,0.55)',
    rewardLabel: 'Chaveiro Tático Bronze + 500 Cash',
  },
  {
    id: 'SILVER',
    name: 'Prata I',
    shortName: 'Prata',
    division: 'DIVISÃO II',
    minMmr: 800,
    maxMmr: 1199,
    accentHex: '#cbd5e1',
    glowRgba: 'rgba(203,213,225,0.55)',
    rewardLabel: 'Camuflagem Cromo Tático + 1.000 Cash',
  },
  {
    id: 'GOLD',
    name: 'Ouro I',
    shortName: 'Ouro',
    division: 'DIVISÃO III',
    minMmr: 1200,
    maxMmr: 1599,
    accentHex: '#fbbf24',
    glowRgba: 'rgba(251,191,36,0.65)',
    rewardLabel: 'Skin Pistola P50 Imperial + 1.500 Cash',
  },
  {
    id: 'PLATINUM',
    name: 'Platina I',
    shortName: 'Platina',
    division: 'DIVISÃO IV',
    minMmr: 1600,
    maxMmr: 1999,
    accentHex: '#22d3ee',
    glowRgba: 'rgba(34,211,238,0.65)',
    rewardLabel: 'Skin AK-47 Ciano Prisma + 2.500 Cash',
  },
  {
    id: 'DIAMOND',
    name: 'Diamante I',
    shortName: 'Diamante',
    division: 'DIVISÃO V',
    minMmr: 2000,
    maxMmr: 2399,
    accentHex: '#818cf8',
    glowRgba: 'rgba(129,140,248,0.75)',
    rewardLabel: 'Sniper Safira Competitiva + 4.000 Cash',
  },
  {
    id: 'ELITE',
    name: 'Elite I',
    shortName: 'Elite I',
    division: 'DIVISÃO VI',
    minMmr: 2400,
    maxMmr: 2999,
    accentHex: '#38bdf8',
    glowRgba: 'rgba(56,189,248,0.85)',
    rewardLabel: 'M4 SOPMOD Dourada + Traje Operador',
  },
  {
    id: 'MASTER',
    name: 'Mestre',
    shortName: 'Mestre',
    division: 'DIVISÃO VII',
    minMmr: 3000,
    maxMmr: 3799,
    accentHex: '#f87171',
    glowRgba: 'rgba(239,68,68,0.8)',
    rewardLabel: 'Arsenal Carmesim Mestre + Emblema Animado',
  },
  {
    id: 'LEGEND',
    name: 'Lenda Kinetic',
    shortName: 'Lenda',
    division: 'TOP 100 GLOBAL',
    minMmr: 3800,
    maxMmr: null,
    accentHex: '#facc15',
    glowRgba: 'rgba(250,204,21,0.9)',
    rewardLabel: 'Pacote Supremo Grão-Mestre + Título Lenda',
  },
];

export function getCompetitiveRankProgression(rawMmr: number): {
  current: CompetitiveRankTier;
  next: CompetitiveRankTier | null;
  targetMmr: number;
  mmrRemaining: number;
  progressPct: number;
} {
  const mmr = Math.max(0, Math.round(rawMmr));
  let currentIdx = 0;
  for (let i = 0; i < COMPETITIVE_RANKS.length; i++) {
    if (mmr >= COMPETITIVE_RANKS[i].minMmr) {
      currentIdx = i;
    }
  }
  const current = COMPETITIVE_RANKS[currentIdx];
  const next =
    currentIdx < COMPETITIVE_RANKS.length - 1
      ? COMPETITIVE_RANKS[currentIdx + 1]
      : null;
  const targetMmr = next ? next.minMmr : current.minMmr + 1000;
  const mmrRemaining = next ? Math.max(0, next.minMmr - mmr) : 0;
  const span = Math.max(1, targetMmr - current.minMmr);
  const progressPct = next
    ? Math.min(100, Math.max(8, ((mmr - current.minMmr) / span) * 100))
    : 100;

  return { current, next, targetMmr, mmrRemaining, progressPct };
}

export interface RankTierPalette {
  glow1: string;
  glow2: string;
  metal1: string;
  metal2: string;
  metal3: string;
  core1: string;
  core2: string;
  core3: string;
  gem1: string;
  gem2: string;
  stroke: string;
}

export const RANK_TIER_PALETTES: Record<CompetitiveRankTierId, RankTierPalette> = {
  BRONZE: {
    glow1: '#f59e0b',
    glow2: '#78350f',
    metal1: '#fde68a',
    metal2: '#b45309',
    metal3: '#451a03',
    core1: '#d97706',
    core2: '#92400e',
    core3: '#271206',
    gem1: '#fef3c7',
    gem2: '#d97706',
    stroke: '#fcd34d',
  },
  SILVER: {
    glow1: '#e2e8f0',
    glow2: '#334155',
    metal1: '#ffffff',
    metal2: '#94a3b8',
    metal3: '#1e293b',
    core1: '#cbd5e1',
    core2: '#475569',
    core3: '#0f172a',
    gem1: '#f8fafc',
    gem2: '#64748b',
    stroke: '#e2e8f0',
  },
  GOLD: {
    glow1: '#facc15',
    glow2: '#854d0e',
    metal1: '#fef9c3',
    metal2: '#eab308',
    metal3: '#713f12',
    core1: '#fde047',
    core2: '#ca8a04',
    core3: '#422006',
    gem1: '#ffffff',
    gem2: '#f59e0b',
    stroke: '#fef08a',
  },
  PLATINUM: {
    glow1: '#22d3ee',
    glow2: '#155e75',
    metal1: '#ecfeff',
    metal2: '#06b6d4',
    metal3: '#0f172a',
    core1: '#67e8f9',
    core2: '#0891b2',
    core3: '#083344',
    gem1: '#ffffff',
    gem2: '#06b6d4',
    stroke: '#a5f3fc',
  },
  DIAMOND: {
    glow1: '#818cf8',
    glow2: '#312e81',
    metal1: '#e0e7ff',
    metal2: '#6366f1',
    metal3: '#1e1b4b',
    core1: '#a5b4fc',
    core2: '#4f46e5',
    core3: '#1e1b4b',
    gem1: '#ffffff',
    gem2: '#6366f1',
    stroke: '#c7d2fe',
  },
  ELITE: {
    glow1: '#38bdf8',
    glow2: '#4c1d95',
    metal1: '#f8fafc',
    metal2: '#94a3b8',
    metal3: '#1e293b',
    core1: '#38bdf8',
    core2: '#2563eb',
    core3: '#1e1b4b',
    gem1: '#e0f2fe',
    gem2: '#0284c7',
    stroke: '#7dd3fc',
  },
  MASTER: {
    glow1: '#ef4444',
    glow2: '#7f1d1d',
    metal1: '#fef08a',
    metal2: '#f59e0b',
    metal3: '#78350f',
    core1: '#f87171',
    core2: '#dc2626',
    core3: '#450a0a',
    gem1: '#fee2e2',
    gem2: '#b91c1c',
    stroke: '#fde68a',
  },
  LEGEND: {
    glow1: '#facc15',
    glow2: '#dc2626',
    metal1: '#fef9c3',
    metal2: '#f59e0b',
    metal3: '#7c2d12',
    core1: '#fde047',
    core2: '#ea580c',
    core3: '#450a0a',
    gem1: '#ffffff',
    gem2: '#ef4444',
    stroke: '#fef08a',
  },
};
