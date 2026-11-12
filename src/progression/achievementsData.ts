import { WeaponId } from '../types/game';

export interface TacticalAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  targetValue: number;
  unitLabel: string;
  getValue: (stats: AchievementEvalInput) => number;
}

export interface AchievementEvalInput {
  playerXp: number;
  rankLevel: number;
  playerCash: number;
  unlockedWeapons: WeaponId[];
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  totalHeadshots: number;
  matchesPlayed: number;
  matchesWon: number;
  bombsPlanted: number;
  hasCustomAvatarOrCallsign: boolean;
  isGoogleLinked: boolean;
}

export const TACTICAL_ACHIEVEMENTS: TacticalAchievement[] = [
  {
    id: 'CLOUD_VERIFIED',
    title: 'Operador Verificado',
    description: 'Vincule sua conta Google para salvar seu progresso na nuvem Firebase.',
    icon: '☁️',
    tier: 'GOLD',
    targetValue: 1,
    unitLabel: 'Conta Google',
    getValue: (s) => (s.isGoogleLinked ? 1 : 0),
  },
  {
    id: 'CUSTOM_IDENTITY',
    title: 'Identidade Operacional',
    description: 'Personalize sua foto de perfil ou Callsign tático no jogo.',
    icon: '🪪',
    tier: 'BRONZE',
    targetValue: 1,
    unitLabel: 'Perfil Editado',
    getValue: (s) => (s.hasCustomAvatarOrCallsign ? 1 : 0),
  },
  {
    id: 'FIRST_BLOOD',
    title: 'Primeiro Sangue',
    description: 'Neutralize seu primeiro inimigo em combate tático.',
    icon: '🩸',
    tier: 'BRONZE',
    targetValue: 1,
    unitLabel: 'Kills',
    getValue: (s) => s.totalKills,
  },
  {
    id: 'HEADHUNTER_I',
    title: 'Caçador de Cabeças',
    description: 'Alcance 10 eliminações com tiro crítico na cabeça (Headshot).',
    icon: '🎯',
    tier: 'SILVER',
    targetValue: 10,
    unitLabel: 'Headshots',
    getValue: (s) => s.totalHeadshots,
  },
  {
    id: 'HEADHUNTER_ELITE',
    title: 'Precisão Cirúrgica',
    description: 'Alcance 50 eliminações com Headshot crítico na carreira.',
    icon: '💀',
    tier: 'PLATINUM',
    targetValue: 50,
    unitLabel: 'Headshots',
    getValue: (s) => s.totalHeadshots,
  },
  {
    id: 'DEMOLITION_EXPERT',
    title: 'Especialista em C4',
    description: 'Digite o código e plante a bomba C4 5 vezes em partidas 5v5.',
    icon: '💣',
    tier: 'SILVER',
    targetValue: 5,
    unitLabel: 'Bombas Plantadas',
    getValue: (s) => s.bombsPlanted,
  },
  {
    id: 'VANGUARD_VETERAN',
    title: 'Veterano Vanguard',
    description: 'Conquiste 5 vitórias completas em partidas táticas 5v5.',
    icon: '🏆',
    tier: 'GOLD',
    targetValue: 5,
    unitLabel: 'Vitórias',
    getValue: (s) => s.matchesWon,
  },
  {
    id: 'CENTURION',
    title: 'Centurião Implacável',
    description: 'Elimine 100 combatentes inimigos ao longo da sua carreira.',
    icon: '⚔️',
    tier: 'GOLD',
    targetValue: 100,
    unitLabel: 'Kills',
    getValue: (s) => s.totalKills,
  },
  {
    id: 'SERGEANT_PROMOTION',
    title: 'Graduação de Sargento',
    description: 'Alcance a Patente Militar Nível 10 ou superior.',
    icon: '🎖️',
    tier: 'SILVER',
    targetValue: 10,
    unitLabel: 'Nível',
    getValue: (s) => s.rankLevel,
  },
  {
    id: 'COMMANDER_ELITE',
    title: 'Comandante Supremo',
    description: 'Alcance a Patente Militar Nível 30 ou superior.',
    icon: '👑',
    tier: 'PLATINUM',
    targetValue: 30,
    unitLabel: 'Nível',
    getValue: (s) => s.rankLevel,
  },
  {
    id: 'ARSENAL_COLLECTOR',
    title: 'Mestre do Arsenal 3D',
    description: 'Desbloqueie pelo menos 6 armas táticas no seu inventário.',
    icon: '🔫',
    tier: 'GOLD',
    targetValue: 6,
    unitLabel: 'Armas',
    getValue: (s) => s.unlockedWeapons.length,
  },
  {
    id: 'HIGH_ROLLER',
    title: 'Magnata de Guerra',
    description: 'Acumule $25.000 ou mais em saldo de Créditos Táticos.',
    icon: '💰',
    tier: 'SILVER',
    targetValue: 25000,
    unitLabel: 'Créditos $',
    getValue: (s) => 15000 + s.playerXp * 2 + s.playerCash,
  },
];

export function evaluateUnlockedAchievements(
  input: AchievementEvalInput,
  existingUnlocked: string[] = []
): string[] {
  const unlockedSet = new Set<string>(existingUnlocked);
  for (const ach of TACTICAL_ACHIEVEMENTS) {
    const current = ach.getValue(input);
    if (current >= ach.targetValue) {
      unlockedSet.add(ach.id);
    }
  }
  return Array.from(unlockedSet);
}
