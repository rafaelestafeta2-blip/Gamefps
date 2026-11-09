import { OpticType, WeaponId } from '../types/game';

export interface RankDefinition {
  level: number;
  title: string;
  badge: string; // Insignia symbol
  badgeColor: string;
  category: 'INICIANTE' | 'SOLDADO' | 'SARGENTO' | 'OFICIAL' | 'COMANDANTE' | 'SF_ELITE' | 'SUPREMO';
  requiredXp: number;
  unlockRewardLabel: string;
  unlockedWeapons: WeaponId[];
  unlockedOptics: OpticType[];
  unlockedAttachments: Array<'suppressor' | 'laser' | 'canted'>;
}

// 70 EXACT WARFACE RANKS MATCHING THE OFFICIAL GAME PROGRESSION CHART
export const WARFACE_RANKS: RankDefinition[] = [
  // 1 to 15 (Coluna 1)
  {
    level: 1,
    title: 'Trainee',
    badge: '🔲',
    badgeColor: '#10b981',
    category: 'INICIANTE',
    requiredXp: 0,
    unlockRewardLabel: 'Equipamentos Iniciais: Mark 23, M4A1 SOPMOD, Faca Tática, Mira de Ferro',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'KNIFE_TACTICAL'],
    unlockedOptics: ['iron'],
    unlockedAttachments: [],
  },
  {
    level: 2,
    title: 'Cadete Júnior',
    badge: '◽',
    badgeColor: '#34d399',
    category: 'INICIANTE',
    requiredXp: 120,
    unlockRewardLabel: 'Acessório Tático: Laser PEQ-15 Verde',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE'],
    unlockedOptics: ['iron'],
    unlockedAttachments: ['laser'],
  },
  {
    level: 3,
    title: 'Cadete',
    badge: '🩵',
    badgeColor: '#94a3b8',
    category: 'INICIANTE',
    requiredXp: 300,
    unlockRewardLabel: 'Acessório Tático: Supressor de Ruído Silenciador',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE'],
    unlockedOptics: ['iron'],
    unlockedAttachments: ['laser', 'suppressor'],
  },
  {
    level: 4,
    title: 'Cadete Sênior',
    badge: '🩵🩵',
    badgeColor: '#94a3b8',
    category: 'INICIANTE',
    requiredXp: 550,
    unlockRewardLabel: 'Mira Óptica: Holográfica EXPS3',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE'],
    unlockedOptics: ['iron', 'holo'],
    unlockedAttachments: ['laser', 'suppressor'],
  },
  {
    level: 5,
    title: 'Cadete de 1ª Classe',
    badge: '🩵🩵🩵',
    badgeColor: '#94a3b8',
    category: 'INICIANTE',
    requiredXp: 900,
    unlockRewardLabel: 'Nova Arma: Submetralhadora SMG .45 (900 RPM)',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45'],
    unlockedOptics: ['iron', 'holo'],
    unlockedAttachments: ['laser', 'suppressor'],
  },
  {
    level: 6,
    title: 'Recruta',
    badge: '🩵🩵🩵🩵',
    badgeColor: '#94a3b8',
    category: 'SOLDADO',
    requiredXp: 1350,
    unlockRewardLabel: 'Acessório Óptico: Mira Inclinada 45° RDS',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45'],
    unlockedOptics: ['iron', 'holo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 7,
    title: 'Soldado',
    badge: '🟨',
    badgeColor: '#eab308',
    category: 'SOLDADO',
    requiredXp: 1900,
    unlockRewardLabel: 'Nova Arma: Fuzil AK-47 Comando (7.62mm)',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE'],
    unlockedOptics: ['iron', 'holo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 8,
    title: 'Soldado Raso de 2ª Classe',
    badge: '🟨🟨',
    badgeColor: '#eab308',
    category: 'SOLDADO',
    requiredXp: 2650,
    unlockRewardLabel: 'Mira Longo Alcance: Luneta LPVO 1-4x',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 9,
    title: 'Soldado Raso',
    badge: '🟨🟨🟨',
    badgeColor: '#eab308',
    category: 'SOLDADO',
    requiredXp: 3500,
    unlockRewardLabel: 'Nova Arma: Carabina Tática (5.56mm)',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 10,
    title: 'Soldado Raso de 1ª Classe',
    badge: '🟨🟨🟨🟨',
    badgeColor: '#eab308',
    category: 'SOLDADO',
    requiredXp: 4500,
    unlockRewardLabel: 'Nova Arma: LMG Pesada 100R',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 11,
    title: 'Especialista',
    badge: '❚',
    badgeColor: '#cbd5e1',
    category: 'SOLDADO',
    requiredXp: 5700,
    unlockRewardLabel: 'Bônus de Combate: +25% XP em Treinamento',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 12,
    title: 'Especialista de Artilharia',
    badge: '🟏',
    badgeColor: '#cbd5e1',
    category: 'SOLDADO',
    requiredXp: 7100,
    unlockRewardLabel: 'Nova Arma: Sniper Tática S&B (.308 Win)',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 13,
    title: 'Especialista Técnico',
    badge: '🟏🟨',
    badgeColor: '#eab308',
    category: 'SOLDADO',
    requiredXp: 8700,
    unlockRewardLabel: 'Bônus Tático: Estabilidade de Recuo Aumentada',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 14,
    title: 'Especialista de 1ª Classe',
    badge: '🟏🟨🟨',
    badgeColor: '#eab308',
    category: 'SOLDADO',
    requiredXp: 10500,
    unlockRewardLabel: 'Nova Arma: Sniper Heavy Bolt-Action (.338 Lapua)',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 15,
    title: 'Patrulheiro',
    badge: '🟏🔶',
    badgeColor: '#f59e0b',
    category: 'SOLDADO',
    requiredXp: 12500,
    unlockRewardLabel: 'Desbloqueio Total de Arsenal da Categoria Soldado',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },

  // 16 to 30 (Coluna 2)
  {
    level: 16,
    title: 'Soldado EP',
    badge: '❚❚',
    badgeColor: '#cbd5e1',
    category: 'SARGENTO',
    requiredXp: 14700,
    unlockRewardLabel: 'Pacote de Suprimento Warface: 500 Coroas',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 17,
    title: 'Cabo',
    badge: '◫',
    badgeColor: '#cbd5e1',
    category: 'SARGENTO',
    requiredXp: 17100,
    unlockRewardLabel: 'Velocidade de Troca de Pente +15%',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 18,
    title: 'Líder de Tiro',
    badge: '◫🟨',
    badgeColor: '#eab308',
    category: 'SARGENTO',
    requiredXp: 19700,
    unlockRewardLabel: 'Insignia Prata Tática de Liderança',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 19,
    title: 'Sargento de 3ª Classe',
    badge: '◫🟨▲',
    badgeColor: '#eab308',
    category: 'SARGENTO',
    requiredXp: 22500,
    unlockRewardLabel: 'Colete Tático Nível II',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 20,
    title: 'Sargento de 2ª Classe',
    badge: '⯎',
    badgeColor: '#f59e0b',
    category: 'SARGENTO',
    requiredXp: 25500,
    unlockRewardLabel: 'Camuflagem Ouro de Sargento',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 21,
    title: 'Sargento',
    badge: '◈',
    badgeColor: '#cbd5e1',
    category: 'SARGENTO',
    requiredXp: 28700,
    unlockRewardLabel: 'Insígnia de Diamante Prata',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 22,
    title: 'Sargento de 1ª Classe',
    badge: '◈🟨',
    badgeColor: '#eab308',
    category: 'SARGENTO',
    requiredXp: 32100,
    unlockRewardLabel: 'Bônus de Danos Críticos Headshot +10%',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 23,
    title: 'Sargento de Apoio',
    badge: '◈🟨🟨',
    badgeColor: '#eab308',
    category: 'SARGENTO',
    requiredXp: 35700,
    unlockRewardLabel: 'Capacidade Reserva de Pente +25%',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 24,
    title: 'Sargento de Artilharia',
    badge: '◈🟨',
    badgeColor: '#eab308',
    category: 'SARGENTO',
    requiredXp: 39500,
    unlockRewardLabel: 'Calibração Balística de Heavy Artillery',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 25,
    title: 'Sargento Mestre',
    badge: '🔷',
    badgeColor: '#f59e0b',
    category: 'SARGENTO',
    requiredXp: 43500,
    unlockRewardLabel: 'Insígnia Diamante Ouro de Sargento Mestre',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 26,
    title: 'Primeiro Sargento',
    badge: '◈◈',
    badgeColor: '#cbd5e1',
    category: 'SARGENTO',
    requiredXp: 47700,
    unlockRewardLabel: 'Duplo Diamante de Prata',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 27,
    title: 'Sargento Comandante',
    badge: '◈◈🟨',
    badgeColor: '#eab308',
    category: 'SARGENTO',
    requiredXp: 52100,
    unlockRewardLabel: 'Título Tático: Comando de Esquadrão',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 28,
    title: 'Sargento de Artilharia Mestre',
    badge: '◈◈🟨🟨',
    badgeColor: '#eab308',
    category: 'SARGENTO',
    requiredXp: 56700,
    unlockRewardLabel: 'Redução de Coice de Disparo -12%',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 29,
    title: 'Sargento Maior',
    badge: '◈◈▲',
    badgeColor: '#eab308',
    category: 'SARGENTO',
    requiredXp: 61500,
    unlockRewardLabel: 'Distintivo de Honra Militar Warface',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 30,
    title: 'Sargento de Companhia',
    badge: '🔷🔷',
    badgeColor: '#f59e0b',
    category: 'SARGENTO',
    requiredXp: 66500,
    unlockRewardLabel: 'Duplo Diamante Dourado de Companhia',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },

  // 31 to 45 (Coluna 3)
  {
    level: 31,
    title: 'Candidato a Sargento Oficial',
    badge: '◈◈◈',
    badgeColor: '#cbd5e1',
    category: 'OFICIAL',
    requiredXp: 71700,
    unlockRewardLabel: 'Triplo Diamante Prata de Transição',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 32,
    title: 'Sargento Oficial',
    badge: '◈◈◈🟨',
    badgeColor: '#eab308',
    category: 'OFICIAL',
    requiredXp: 77100,
    unlockRewardLabel: 'Barra Dourada de Oficialato',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 33,
    title: 'Sargento Oficial Chefe',
    badge: '◈◈◈🟨🟨',
    badgeColor: '#eab308',
    category: 'OFICIAL',
    requiredXp: 82700,
    unlockRewardLabel: 'Dupla Barra Dourada de Chefia',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 34,
    title: 'Sargento Oficial Chefe de 1ª Classe',
    badge: '◈◈◈🟨',
    badgeColor: '#eab308',
    category: 'OFICIAL',
    requiredXp: 88500,
    unlockRewardLabel: 'Placa Dourada de 1ª Classe',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 35,
    title: 'Sargento Oficial Mestre',
    badge: '🔷🔷🔷',
    badgeColor: '#f59e0b',
    category: 'OFICIAL',
    requiredXp: 94500,
    unlockRewardLabel: 'Triplo Diamante de Ouro Maciço',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 36,
    title: 'Intendente',
    badge: '🛡️',
    badgeColor: '#e2e8f0',
    category: 'OFICIAL',
    requiredXp: 100700,
    unlockRewardLabel: 'Escudo Prata de Suprimentos Estratégicos',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 37,
    title: 'Cadete-Oficial Júnior',
    badge: '🛡️🟨',
    badgeColor: '#eab308',
    category: 'OFICIAL',
    requiredXp: 107100,
    unlockRewardLabel: 'Escudo com Galão Dourado Júnior',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 38,
    title: 'Cadete-Oficial Sênior',
    badge: '🛡️🟨🟨',
    badgeColor: '#eab308',
    category: 'OFICIAL',
    requiredXp: 113700,
    unlockRewardLabel: 'Escudo com Duplo Galão Dourado',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 39,
    title: 'Aspirante',
    badge: '🛡️🟨',
    badgeColor: '#eab308',
    category: 'OFICIAL',
    requiredXp: 120500,
    unlockRewardLabel: 'Título de Aspirante a Oficial de Campo',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 40,
    title: 'Segundo Tenente',
    badge: '🪙',
    badgeColor: '#f59e0b',
    category: 'OFICIAL',
    requiredXp: 127500,
    unlockRewardLabel: 'Estrela Dourada de Tenente de Exército',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 41,
    title: 'Primeiro Tenente',
    badge: '🗲',
    badgeColor: '#e2e8f0',
    category: 'OFICIAL',
    requiredXp: 134700,
    unlockRewardLabel: 'Flor de Lótus / Estrela Prateada de 1º Tenente',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 42,
    title: 'Subtenente',
    badge: '🗲🟨',
    badgeColor: '#eab308',
    category: 'OFICIAL',
    requiredXp: 142100,
    unlockRewardLabel: 'Galão Superior de Subtenente',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 43,
    title: 'Tenente',
    badge: '🗲🟨🟨',
    badgeColor: '#eab308',
    category: 'OFICIAL',
    requiredXp: 149700,
    unlockRewardLabel: 'Duplo Galão Superior de Tenente',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 44,
    title: 'Tenente-Coronel',
    badge: '🗲🗲',
    badgeColor: '#e2e8f0',
    category: 'OFICIAL',
    requiredXp: 157500,
    unlockRewardLabel: 'Dupla Estrela Prateada de Oficial Superior',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 45,
    title: 'Tenente-Capitão',
    badge: '🪙🪙',
    badgeColor: '#f59e0b',
    category: 'OFICIAL',
    requiredXp: 165500,
    unlockRewardLabel: 'Dupla Estrela Dourada de Tenente-Capitão',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },

  // 46 to 60 (Coluna 4)
  {
    level: 46,
    title: 'Capitão',
    badge: '🗲🗲🗲',
    badgeColor: '#e2e8f0',
    category: 'COMANDANTE',
    requiredXp: 173700,
    unlockRewardLabel: 'Tripla Estrela Prateada de Capitão de Forças Especiais',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 47,
    title: 'Capitão 1',
    badge: '🗲🗲🗲🟨',
    badgeColor: '#eab308',
    category: 'COMANDANTE',
    requiredXp: 182100,
    unlockRewardLabel: 'Distintivo de Capitão de 1ª Divisão',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 48,
    title: 'Capitão 2',
    badge: '🗲🗲🗲🟨🟨',
    badgeColor: '#eab308',
    category: 'COMANDANTE',
    requiredXp: 190700,
    unlockRewardLabel: 'Distintivo de Capitão de 2ª Divisão',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 49,
    title: 'Capitão 3',
    badge: '🗲🗲🗲🟨',
    badgeColor: '#eab308',
    category: 'COMANDANTE',
    requiredXp: 199500,
    unlockRewardLabel: 'Distintivo de Capitão de 3ª Divisão',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 50,
    title: 'Coronel',
    badge: '👑',
    badgeColor: '#f59e0b',
    category: 'COMANDANTE',
    requiredXp: 208500,
    unlockRewardLabel: 'Coroa de Flor de Lótus Dourada de Coronel',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 51,
    title: 'Brigadeiro',
    badge: '🦅',
    badgeColor: '#e2e8f0',
    category: 'COMANDANTE',
    requiredXp: 217700,
    unlockRewardLabel: 'Asas Prateadas de Brigadeiro de Aviação Tática',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 52,
    title: 'Marechal de Campo',
    badge: '🦅🟨',
    badgeColor: '#eab308',
    category: 'COMANDANTE',
    requiredXp: 227100,
    unlockRewardLabel: 'Asas Prateadas com Galão de Marechal',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 53,
    title: 'Comandante',
    badge: '🦅🟨🟨',
    badgeColor: '#eab308',
    category: 'COMANDANTE',
    requiredXp: 236700,
    unlockRewardLabel: 'Asas com Duplo Galão Dourado de Comandante',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 54,
    title: 'Alto-Comandante',
    badge: '🦅🟨',
    badgeColor: '#eab308',
    category: 'COMANDANTE',
    requiredXp: 246500,
    unlockRewardLabel: 'Placa Dourada do Alto-Comando Warface',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 55,
    title: 'Supremo Comandante',
    badge: '👑🦅',
    badgeColor: '#f59e0b',
    category: 'COMANDANTE',
    requiredXp: 256500,
    unlockRewardLabel: 'Asas Douradas da Coroa Suprema de Comando',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 56,
    title: 'Major-General',
    badge: '⚜️',
    badgeColor: '#f59e0b',
    category: 'COMANDANTE',
    requiredXp: 266700,
    unlockRewardLabel: 'Chevrons Dourados com Estrela de Major-General',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 57,
    title: 'Tenente-General',
    badge: '⚜️⚜️',
    badgeColor: '#f59e0b',
    category: 'COMANDANTE',
    requiredXp: 277100,
    unlockRewardLabel: 'Triplo Chevron Dourado com Estrela de Tenente-General',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 58,
    title: 'General-Marechal de Campo',
    badge: '⚜️🦅',
    badgeColor: '#f59e0b',
    category: 'COMANDANTE',
    requiredXp: 287700,
    unlockRewardLabel: 'Brasão do Quad Chevron com Asas de General-Marechal',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 59,
    title: 'Segundo Tenente SF',
    badge: '⚔️',
    badgeColor: '#f59e0b',
    category: 'SF_ELITE',
    requiredXp: 298500,
    unlockRewardLabel: 'Distintivo de Ouro de Special Forces (SF)',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 60,
    title: 'Primeiro Tenente SF',
    badge: '⚔️⚔️',
    badgeColor: '#f59e0b',
    category: 'SF_ELITE',
    requiredXp: 309500,
    unlockRewardLabel: 'Espadas Cruzadas Douradas de Special Forces 1º Tenente',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },

  // 61 to 70 (Coluna 5: Special Forces Elite & Warface Apex)
  {
    level: 61,
    title: 'Subtenente SF',
    badge: '🛡️⭐',
    badgeColor: '#3b82f6',
    category: 'SF_ELITE',
    requiredXp: 320700,
    unlockRewardLabel: 'Escudo Azul de Operações Especiais com Estrela Prata',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 62,
    title: 'Tenente SF',
    badge: '🛡️🌟',
    badgeColor: '#3b82f6',
    category: 'SF_ELITE',
    requiredXp: 332100,
    unlockRewardLabel: 'Escudo Azul SF com Estrela Reluzente Ouro',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 63,
    title: 'Tenente-Coronel SF',
    badge: '🛡️👑',
    badgeColor: '#3b82f6',
    category: 'SF_ELITE',
    requiredXp: 343700,
    unlockRewardLabel: 'Escudo Azul SF com Coroa Imperial Dourada',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 64,
    title: 'Tenente-Capitão SF',
    badge: '🛡️🦅',
    badgeColor: '#3b82f6',
    category: 'SF_ELITE',
    requiredXp: 355500,
    unlockRewardLabel: 'Escudo Azul SF com Águia Real Dourada',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 65,
    title: 'Capitão SF',
    badge: '🛡️🪽',
    badgeColor: '#3b82f6',
    category: 'SF_ELITE',
    requiredXp: 367500,
    unlockRewardLabel: 'Escudo Azul SF com Asas de Anjo de Combate',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 66,
    title: 'Capitão 1 SF',
    badge: '🛡️☀️',
    badgeColor: '#3b82f6',
    category: 'SF_ELITE',
    requiredXp: 379700,
    unlockRewardLabel: 'Escudo Azul SF 1 com Sol de Ouro Radiante',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 67,
    title: 'Capitão 2 SF',
    badge: '🛡️⚜️',
    badgeColor: '#3b82f6',
    category: 'SF_ELITE',
    requiredXp: 392100,
    unlockRewardLabel: 'Escudo Azul SF 2 com Brasão de Flor de Lótus',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 68,
    title: 'Capitão 3 SF',
    badge: '🛡️💀',
    badgeColor: '#3b82f6',
    category: 'SF_ELITE',
    requiredXp: 404700,
    unlockRewardLabel: 'Escudo Azul SF 3 com Caveira de Ouro Warface',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 69,
    title: 'Coronel SF',
    badge: '🛡️🦁',
    badgeColor: '#3b82f6',
    category: 'SF_ELITE',
    requiredXp: 417500,
    unlockRewardLabel: 'Escudo Azul SF Coronel com Leão de Prata/Ouro',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
  {
    level: 70,
    title: 'Warface',
    badge: '🦁👑',
    badgeColor: '#fbbf24',
    category: 'SUPREMO',
    requiredXp: 430500,
    unlockRewardLabel: 'PATENTE MÁXIMA LENDÁRIA DE LEÃO DE OURO WARFACE (NÍVEL 70)',
    unlockedWeapons: ['P50_PISTOL', 'M4_CARBINE', 'SMG_45', 'AK47_RIFLE', 'CARBINE_AR', 'L49_LMG', 'SNIPER_TACTICAL', 'SNIPER_BOLT'],
    unlockedOptics: ['iron', 'holo', 'lpvo'],
    unlockedAttachments: ['laser', 'suppressor', 'canted'],
  },
];

const LOCAL_STORAGE_XP_KEY = 'kinetic_fps_warface_xp_v1';
const LOCAL_STORAGE_CASH_KEY = 'kinetic_fps_warface_cash_v1';

export function loadSavedPlayerXp(): number {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_XP_KEY);
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  } catch {
    return 0;
  }
}

export function savePlayerXp(xp: number): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_XP_KEY, Math.max(0, xp).toString());
  } catch {
    // Ignore quota errors
  }
}

export function loadSavedPlayerCash(): number {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CASH_KEY);
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  } catch {
    return 0;
  }
}

export function addPlayerCash(delta: number): number {
  const next = Math.max(0, loadSavedPlayerCash() + Math.round(delta));
  try {
    localStorage.setItem(LOCAL_STORAGE_CASH_KEY, next.toString());
  } catch {
    // Ignore quota errors
  }
  return next;
}

export function getRankForXp(xp: number): RankDefinition {
  let currentRank = WARFACE_RANKS[0];
  for (const rank of WARFACE_RANKS) {
    if (xp >= rank.requiredXp) {
      currentRank = rank;
    } else {
      break;
    }
  }
  return currentRank;
}

export function getNextRank(currentLevel: number): RankDefinition | null {
  const idx = WARFACE_RANKS.findIndex((r) => r.level === currentLevel);
  if (idx !== -1 && idx < WARFACE_RANKS.length - 1) {
    return WARFACE_RANKS[idx + 1];
  }
  return null;
}

export function getRequiredXpForWeapon(weaponId: WeaponId): {
  requiredLevel: number;
  rankTitle: string;
} {
  if (weaponId === 'KNIFE_TACTICAL') {
    return { requiredLevel: 1, rankTitle: 'Trainee' };
  }
  for (const rank of WARFACE_RANKS) {
    if (rank.unlockedWeapons.includes(weaponId)) {
      return { requiredLevel: rank.level, rankTitle: rank.title };
    }
  }
  return { requiredLevel: 1, rankTitle: 'Trainee' };
}

export function getRequiredXpForOptic(optic: OpticType): {
  requiredLevel: number;
  rankTitle: string;
} {
  for (const rank of WARFACE_RANKS) {
    if (rank.unlockedOptics.includes(optic)) {
      return { requiredLevel: rank.level, rankTitle: rank.title };
    }
  }
  return { requiredLevel: 1, rankTitle: 'Trainee' };
}

export function getRequiredXpForAttachment(
  attachment: 'suppressor' | 'laser' | 'canted'
): {
  requiredLevel: number;
  rankTitle: string;
} {
  for (const rank of WARFACE_RANKS) {
    if (rank.unlockedAttachments.includes(attachment)) {
      return { requiredLevel: rank.level, rankTitle: rank.title };
    }
  }
  return { requiredLevel: 1, rankTitle: 'Trainee' };
}

export function isWeaponUnlockedAtXp(weaponId: WeaponId, xp: number): boolean {
  if (weaponId === 'KNIFE_TACTICAL') return true;
  const currentRank = getRankForXp(xp);
  return currentRank.unlockedWeapons.includes(weaponId);
}

export function isOpticUnlockedAtXp(optic: OpticType, xp: number): boolean {
  const currentRank = getRankForXp(xp);
  return currentRank.unlockedOptics.includes(optic);
}

export function isAttachmentUnlockedAtXp(
  attachment: 'suppressor' | 'laser' | 'canted',
  xp: number
): boolean {
  const currentRank = getRankForXp(xp);
  return currentRank.unlockedAttachments.includes(attachment);
}
