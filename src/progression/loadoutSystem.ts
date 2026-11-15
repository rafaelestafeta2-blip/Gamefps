import { WarfaceClassId } from '../components/WarfaceClassIcons';
import { WeaponId } from '../types/game';
import {
  getRankForXp,
  isWeaponUnlockedAtXp,
  loadSavedPlayerCash,
  loadSavedPlayerXp,
  spendPlayerCash,
} from './ranks';

export type EquipmentSlotId =
  | 'primaryWeapon'
  | 'secondaryWeapon'
  | 'meleeWeapon'
  | 'grenadePack'
  | 'helmet'
  | 'vest'
  | 'gloves'
  | 'boots';

export interface GearItemDefinition {
  id: string;
  slot: Exclude<EquipmentSlotId, 'primaryWeapon' | 'secondaryWeapon' | 'meleeWeapon'>;
  name: string;
  code: string;
  rarity: 'PADRAO' | 'TATICO' | 'ELITE';
  description: string;
  perkLabel: string;
  unlockLevel: number;
  cashPrice: number; // 0 = liberado inicialmente no nível 1
  classes?: WarfaceClassId[]; // undefined = todas as classes
  stats: {
    armorBonus?: number;
    healthBonus?: number;
    headshotReductionPct?: number;
    reloadSpeedBonusPct?: number;
    sprintSpeedBonusPct?: number;
    adsSpeedBonusPct?: number;
    fragCount?: number;
    smokeCount?: number;
  };
}

export interface ClassLoadoutConfig {
  primaryWeapon: WeaponId;
  secondaryWeapon: WeaponId;
  meleeWeapon: WeaponId;
  grenadePack: string;
  helmet: string;
  vest: string;
  gloves: string;
  boots: string;
}

export interface PlayerInventoryState {
  selectedClass: WarfaceClassId;
  purchasedGearIds: string[];
  purchasedWeaponIds: WeaponId[];
  classLoadouts: Record<WarfaceClassId, ClassLoadoutConfig>;
}

export interface WarfaceClassCombatMeta {
  classId: WarfaceClassId;
  allowedPrimaries: WeaponId[];
  allowedWeaponRuleLabel: string;
  defaultPrimary: WeaponId;
  passiveTitle: string;
  passiveDesc: string;
  specialSlotTitle: string;
  specialSlotDesc: string;
  baseArmor: number;
  baseHealthBonus: number;
  characterModelLabel: string;
}

export const WARFACE_CLASS_LOADOUT_META: Record<
  WarfaceClassId,
  WarfaceClassCombatMeta
> = {
  FUZILEIRO: {
    classId: 'FUZILEIRO',
    allowedPrimaries: ['M4_CARBINE', 'AK12_RIFLE', 'AK47_RIFLE', 'CARBINE_AR'],
    allowedWeaponRuleLabel: 'EXCLUSIVO FUZILEIRO · APENAS RIFLES DE ASSALTO',
    defaultPrimary: 'M4_CARBINE',
    passiveTitle: 'ASSALTO VANGUARD',
    passiveDesc: 'Fuzis de Assalto 5.56/5.45/7.62 + 20% controle de rajada.',
    specialSlotTitle: 'Caixa de Munição',
    specialSlotDesc: 'Recarrega pentes de fuzil para todo o esquadrão.',
    baseArmor: 15,
    baseHealthBonus: 0,
    characterModelLabel: 'VANGUARD FUZILEIRO (.GLB)',
  },
  MEDICO: {
    classId: 'MEDICO',
    allowedPrimaries: ['SHOTGUN_12', 'SHOTGUN_SPAS'],
    allowedWeaponRuleLabel: 'EXCLUSIVO MÉDICO · APENAS ESCOPETAS 12 CURTO ALCANCE',
    defaultPrimary: 'SHOTGUN_12',
    passiveTitle: 'COMBATE CQB & SOCORRO',
    passiveDesc: 'Escopetas Calibre 12 de curto alcance + 15 HP máximo base.',
    specialSlotTitle: 'Kit Médico Tático',
    specialSlotDesc: 'Restaura PV em combate fechado após brechas CQB.',
    baseArmor: 10,
    baseHealthBonus: 15,
    characterModelLabel: 'OPERADOR MÉDICO VANGUARD (.GLB)',
  },
  ENGENHEIRO: {
    classId: 'ENGENHEIRO',
    allowedPrimaries: ['SMG_45', 'SMG_MP5'],
    allowedWeaponRuleLabel: 'EXCLUSIVO ENGENHEIRO · APENAS SMGs',
    defaultPrimary: 'SMG_45',
    passiveTitle: 'ESPECIALISTA SMG & BLINDAGEM',
    passiveDesc: 'Submetralhadoras de alta cadência + 25 Colete Balístico base.',
    specialSlotTitle: 'Kit Blindagem AP',
    specialSlotDesc: 'Reparo rápido de colete balístico e plantio C4 ágil.',
    baseArmor: 25,
    baseHealthBonus: 0,
    characterModelLabel: 'VANGUARD ENGENHEIRO (.GLB)',
  },
  FRANCO_ATIRADOR: {
    classId: 'FRANCO_ATIRADOR',
    allowedPrimaries: ['SNIPER_TACTICAL', 'SNIPER_BOLT'],
    allowedWeaponRuleLabel: 'EXCLUSIVO SNIPER · APENAS FUZIS SNIPER',
    defaultPrimary: 'SNIPER_TACTICAL',
    passiveTitle: 'RECONHECIMENTO DE PRECISÃO',
    passiveDesc: 'Fuzis de Precisão longo alcance + estabilização de mira.',
    specialSlotTitle: 'Sensor Balístico',
    specialSlotDesc: 'Telemetria avançada de alcance para tiros letais.',
    baseArmor: 5,
    baseHealthBonus: 0,
    characterModelLabel: 'VANGUARD SNIPER (.GLB)',
  },
};

export interface WeaponCatalogItem {
  id: WeaponId;
  name: string;
  caliber: string;
  category: string;
  exclusiveLabel: string;
  attachmentSlots: string;
  description: string;
  firepower: number;
  accuracy: number;
  mobility: number;
  damageStat: number;
  damagePct: number;
  rangeLabel: string;
  rangePct: number;
  rpmLabel: string;
  rpmPct: number;
  aimAcc: number;
  hipAcc: number;
  clipLabel: string;
  clipPct: number;
  cashPrice: number;
}

export const WEAPON_INVENTORY_CATALOG: Record<WeaponId, WeaponCatalogItem> = {
  M4_CARBINE: {
    id: 'M4_CARBINE',
    name: 'M4A1 SOPMOD',
    caliber: '5.56x45mm NATO',
    category: 'Fuzil de Assalto',
    exclusiveLabel: 'Fuzileiro · Rifle',
    attachmentSlots: 'Cano, Trilho, Mira',
    description:
      'Carabina de assalto padrão Vanguard com mira holográfica modular, recuo dócil e precisão consistente a média distância.',
    firepower: 85,
    accuracy: 84,
    mobility: 78,
    damageStat: 82,
    damagePct: 72,
    rangeLabel: '75m',
    rangePct: 68,
    rpmLabel: '770',
    rpmPct: 77,
    aimAcc: 84,
    hipAcc: 64,
    clipLabel: '30 / 120',
    clipPct: 65,
    cashPrice: 0,
  },
  AK12_RIFLE: {
    id: 'AK12_RIFLE',
    name: 'AK-12 SPETSNAZ',
    caliber: '5.45x39mm',
    category: 'Fuzil de Assalto',
    exclusiveLabel: 'Fuzileiro · Rifle',
    attachmentSlots: 'Cano, Mira Integrada',
    description:
      'Fuzil de 5ª geração equipado com luneta tática nativa, trilho Picatinny completo e alto poder de parada.',
    firepower: 88,
    accuracy: 86,
    mobility: 74,
    damageStat: 86,
    damagePct: 78,
    rangeLabel: '85m',
    rangePct: 74,
    rpmLabel: '700',
    rpmPct: 70,
    aimAcc: 86,
    hipAcc: 60,
    clipLabel: '30 / 120',
    clipPct: 65,
    cashPrice: 0,
  },
  AK47_RIFLE: {
    id: 'AK47_RIFLE',
    name: 'AK-47 COMANDO',
    caliber: '7.62x39mm Soviet',
    category: 'Fuzil de Assalto',
    exclusiveLabel: 'Fuzileiro · Rifle',
    attachmentSlots: 'Cano, Trilho, Mira',
    description:
      'Plataforma clássica em calibre 7.62mm com altíssimo dano por projétil e penetração em blindagens leves.',
    firepower: 96,
    accuracy: 72,
    mobility: 70,
    damageStat: 94,
    damagePct: 86,
    rangeLabel: '80m',
    rangePct: 70,
    rpmLabel: '630',
    rpmPct: 63,
    aimAcc: 74,
    hipAcc: 54,
    clipLabel: '30 / 120',
    clipPct: 65,
    cashPrice: 1200,
  },
  CARBINE_AR: {
    id: 'CARBINE_AR',
    name: 'HK416 CARABINA',
    caliber: '5.56x45mm NATO',
    category: 'Rifle Tático',
    exclusiveLabel: 'Fuzileiro · Rifle',
    attachmentSlots: 'Cano, Trilho, Mira',
    description:
      'Rifle de pistão a gás focado em engajamentos de precisão com estabilidade superior em rajadas curtas.',
    firepower: 82,
    accuracy: 88,
    mobility: 84,
    damageStat: 80,
    damagePct: 70,
    rangeLabel: '85m',
    rangePct: 75,
    rpmLabel: '770',
    rpmPct: 77,
    aimAcc: 88,
    hipAcc: 68,
    clipLabel: '30 / 120',
    clipPct: 65,
    cashPrice: 950,
  },
  SHOTGUN_12: {
    id: 'SHOTGUN_12',
    name: 'M870 BREACHER 12GA',
    caliber: 'Calibre 12 Buckshot',
    category: 'Escopeta 12 Curto Alcance',
    exclusiveLabel: 'Médico · Calibre 12',
    attachmentSlots: 'Cano, Mira Ghost-Ring',
    description:
      'Escopeta Pump-Action 12GA de curto alcance. Dispara 8 bagos de chumbo 00-Buckshot com dano devastador até 12m.',
    firepower: 100,
    accuracy: 62,
    mobility: 84,
    damageStat: 680,
    damagePct: 98,
    rangeLabel: '12m',
    rangePct: 26,
    rpmLabel: '88',
    rpmPct: 24,
    aimAcc: 64,
    hipAcc: 52,
    clipLabel: '6 / 24',
    clipPct: 28,
    cashPrice: 0,
  },
  SHOTGUN_SPAS: {
    id: 'SHOTGUN_SPAS',
    name: 'SPAS-12 TÁTICA 12GA',
    caliber: 'Calibre 12 Magnum',
    category: 'Escopeta 12 Curto Alcance',
    exclusiveLabel: 'Médico · Calibre 12',
    attachmentSlots: 'Cano, Trilho Superior',
    description:
      'Escopeta semiautomática de combate aproximado com tubo estendido para 8 cartuchos e cadência rápida em corredores.',
    firepower: 96,
    accuracy: 64,
    mobility: 80,
    damageStat: 640,
    damagePct: 93,
    rangeLabel: '14m',
    rangePct: 30,
    rpmLabel: '188',
    rpmPct: 45,
    aimAcc: 66,
    hipAcc: 55,
    clipLabel: '8 / 32',
    clipPct: 35,
    cashPrice: 1100,
  },
  SMG_45: {
    id: 'SMG_45',
    name: 'VECTOR .45 SUB',
    caliber: '.45 ACP',
    category: 'Submetralhadora SMG',
    exclusiveLabel: 'Engenheiro · SMG',
    attachmentSlots: 'Cano, Trilho, Mira',
    description:
      'Submetralhadora ultracompacta de altíssima cadência (900 RPM) otimizada para mobilidade e tiros sem mira.',
    firepower: 76,
    accuracy: 80,
    mobility: 94,
    damageStat: 68,
    damagePct: 58,
    rangeLabel: '35m',
    rangePct: 42,
    rpmLabel: '900',
    rpmPct: 94,
    aimAcc: 78,
    hipAcc: 86,
    clipLabel: '32 / 128',
    clipPct: 70,
    cashPrice: 0,
  },
  SMG_MP5: {
    id: 'SMG_MP5',
    name: 'MP5A3 TÁTICA 9MM',
    caliber: '9x19mm Parabellum',
    category: 'Submetralhadora SMG',
    exclusiveLabel: 'Engenheiro · SMG',
    attachmentSlots: 'Cano, Trilho, Mira',
    description:
      'Clássica SMG de forças especiais com excelente controle de recuo e alta precisão em rajadas móveis.',
    firepower: 74,
    accuracy: 85,
    mobility: 92,
    damageStat: 65,
    damagePct: 55,
    rangeLabel: '42m',
    rangePct: 48,
    rpmLabel: '830',
    rpmPct: 86,
    aimAcc: 84,
    hipAcc: 82,
    clipLabel: '30 / 120',
    clipPct: 65,
    cashPrice: 950,
  },
  L49_LMG: {
    id: 'L49_LMG',
    name: 'LMG PESADA 100R',
    caliber: '5.56x45mm SAW',
    category: 'Metralhadora Leve',
    exclusiveLabel: 'Arsenal Pesado',
    attachmentSlots: 'Cano, Mira',
    description:
      'Metralhadora leve com tambor de 100 munições para fogo de supressão contínuo.',
    firepower: 92,
    accuracy: 74,
    mobility: 55,
    damageStat: 84,
    damagePct: 75,
    rangeLabel: '85m',
    rangePct: 74,
    rpmLabel: '850',
    rpmPct: 85,
    aimAcc: 72,
    hipAcc: 46,
    clipLabel: '100 / 300',
    clipPct: 100,
    cashPrice: 1800,
  },
  SNIPER_TACTICAL: {
    id: 'SNIPER_TACTICAL',
    name: 'SNIPER TÁTICA S&B',
    caliber: '.308 Win',
    category: 'Fuzil Sniper',
    exclusiveLabel: 'Sniper · Precisão',
    attachmentSlots: 'Cano, Luneta S&B',
    description:
      'Fuzil de precisão semiautomático com luneta de alto zoom e abate letal em qualquer distância.',
    firepower: 95,
    accuracy: 96,
    mobility: 68,
    damageStat: 250,
    damagePct: 94,
    rangeLabel: '135m',
    rangePct: 92,
    rpmLabel: '55',
    rpmPct: 22,
    aimAcc: 98,
    hipAcc: 38,
    clipLabel: '10 / 40',
    clipPct: 42,
    cashPrice: 0,
  },
  SNIPER_BOLT: {
    id: 'SNIPER_BOLT',
    name: 'AWP BOLT-ACTION',
    caliber: '.338 Lapua',
    category: 'Fuzil Sniper Pesado',
    exclusiveLabel: 'Sniper · Precisão',
    attachmentSlots: 'Cano, Luneta Longo Alcance',
    description:
      'Fuzil de ferrolho .338 Lapua com perfuração total de coletes e letalidade máxima de 1 disparo.',
    firepower: 100,
    accuracy: 99,
    mobility: 60,
    damageStat: 350,
    damagePct: 100,
    rangeLabel: '150m',
    rangePct: 100,
    rpmLabel: '45',
    rpmPct: 18,
    aimAcc: 100,
    hipAcc: 32,
    clipLabel: '5 / 20',
    clipPct: 25,
    cashPrice: 1400,
  },
  P50_PISTOL: {
    id: 'P50_PISTOL',
    name: 'MARK 23 TÁTICA',
    caliber: '.45 ACP',
    category: 'Pistola Secundária',
    exclusiveLabel: 'Todas as Classes',
    attachmentSlots: 'Cano, Laser',
    description:
      'Pistola tática secundária de calibre .45 ACP com alto poder de parada para emergências.',
    firepower: 68,
    accuracy: 82,
    mobility: 95,
    damageStat: 62,
    damagePct: 52,
    rangeLabel: '25m',
    rangePct: 35,
    rpmLabel: '340',
    rpmPct: 42,
    aimAcc: 82,
    hipAcc: 74,
    clipLabel: '12 / 48',
    clipPct: 45,
    cashPrice: 0,
  },
  KNIFE_TACTICAL: {
    id: 'KNIFE_TACTICAL',
    name: 'FACA TÁTICA COMBATE',
    caliber: 'Aço Carbono',
    category: 'Corpo a Corpo',
    exclusiveLabel: 'Todas as Classes',
    attachmentSlots: 'Lâmina Fixa',
    description:
      'Lâmina tática silenciosa para abates imediatos em alcance corpo a corpo.',
    firepower: 90,
    accuracy: 100,
    mobility: 100,
    damageStat: 130,
    damagePct: 88,
    rangeLabel: '2.4m',
    rangePct: 12,
    rpmLabel: '115',
    rpmPct: 32,
    aimAcc: 100,
    hipAcc: 100,
    clipLabel: '∞',
    clipPct: 100,
    cashPrice: 0,
  },
};

export const GEAR_INVENTORY_CATALOG: GearItemDefinition[] = [
  // CAPACETES
  {
    id: 'helm_vanguard_std',
    slot: 'helmet',
    name: 'Capacete Vanguard ACH',
    code: 'HELM-01',
    rarity: 'PADRAO',
    description: 'Capacete balístico leve emitido pelo comando Vanguard.',
    perkLabel: '+10% Proteção Cabeça',
    unlockLevel: 1,
    cashPrice: 0,
    stats: { headshotReductionPct: 10 },
  },
  {
    id: 'helm_ops_core',
    slot: 'helmet',
    name: 'Capacete Ops-Core Carbon',
    code: 'HELM-02',
    rarity: 'TATICO',
    description: 'Casco composto com suporte NVG e absorção lateral.',
    perkLabel: '+20% Proteção Cabeça · +5% ADS',
    unlockLevel: 3,
    cashPrice: 650,
    stats: { headshotReductionPct: 20, adsSpeedBonusPct: 5 },
  },
  {
    id: 'helm_warlord',
    slot: 'helmet',
    name: 'Capacete Warlord Blindado',
    code: 'HELM-03',
    rarity: 'ELITE',
    description: 'Proteção craniana de titânio anti-calibre pesado.',
    perkLabel: '+35% Proteção Cabeça · +10 AP',
    unlockLevel: 8,
    cashPrice: 1450,
    stats: { headshotReductionPct: 35, armorBonus: 10 },
  },

  // COLETES
  {
    id: 'vest_vanguard_std',
    slot: 'vest',
    name: 'Colete Vanguard Plate Carrier',
    code: 'VEST-01',
    rarity: 'PADRAO',
    description: 'Placa frontal leve nível IIIA para mobilidade tática.',
    perkLabel: '+15 Colete Balístico',
    unlockLevel: 1,
    cashPrice: 0,
    stats: { armorBonus: 15 },
  },
  {
    id: 'vest_corvus_heavy',
    slot: 'vest',
    name: 'Colete Corvus Kevlar',
    code: 'VEST-02',
    rarity: 'TATICO',
    description: 'Blindagem reforçada multi-camada com bolsos modulares.',
    perkLabel: '+30 Colete Balístico',
    unlockLevel: 3,
    cashPrice: 800,
    stats: { armorBonus: 30 },
  },
  {
    id: 'vest_warlord_titan',
    slot: 'vest',
    name: 'Colete Warlord Titan IV',
    code: 'VEST-03',
    rarity: 'ELITE',
    description: 'Blindagem de assalto pesado usada em operaçõesRanked.',
    perkLabel: '+45 Colete · +10 HP Máx',
    unlockLevel: 9,
    cashPrice: 1850,
    stats: { armorBonus: 45, healthBonus: 10 },
  },

  // LUVAS
  {
    id: 'gloves_oakley_std',
    slot: 'gloves',
    name: 'Luvas Táticas Vanguard',
    code: 'GLV-01',
    rarity: 'PADRAO',
    description: 'Aderência antiderrapante para manejo seguro de fuzil.',
    perkLabel: '+5% Troca de Carregador',
    unlockLevel: 1,
    cashPrice: 0,
    stats: { reloadSpeedBonusPct: 5 },
  },
  {
    id: 'gloves_kevlar_pro',
    slot: 'gloves',
    name: 'Luvas Kevlar Quick-Mag',
    code: 'GLV-02',
    rarity: 'TATICO',
    description: 'Costura anatômica projetada para recargas sob pressão.',
    perkLabel: '+15% Vel. Recarga',
    unlockLevel: 4,
    cashPrice: 550,
    stats: { reloadSpeedBonusPct: 15 },
  },
  {
    id: 'gloves_carbon_elite',
    slot: 'gloves',
    name: 'Luvas Carbono S.F.',
    code: 'GLV-03',
    rarity: 'ELITE',
    description: 'Proteção articulada e controle fino de gatilho e mira.',
    perkLabel: '+20% Vel. Recarga · +12% ADS',
    unlockLevel: 10,
    cashPrice: 1200,
    stats: { reloadSpeedBonusPct: 20, adsSpeedBonusPct: 12 },
  },

  // BOTAS
  {
    id: 'boots_combat_std',
    slot: 'boots',
    name: 'Coturno Militar Vanguard',
    code: 'BOOT-01',
    rarity: 'PADRAO',
    description: 'Sola de tração mista para asfalto e terreno urbano.',
    perkLabel: '+3% Sprint',
    unlockLevel: 1,
    cashPrice: 0,
    stats: { sprintSpeedBonusPct: 3 },
  },
  {
    id: 'boots_light_sprint',
    slot: 'boots',
    name: 'Botas Corrida Leve',
    code: 'BOOT-02',
    rarity: 'TATICO',
    description: 'Entressola amortecida para rotação rápida entre bomb sites.',
    perkLabel: '+8% Velocidade Sprint',
    unlockLevel: 4,
    cashPrice: 600,
    stats: { sprintSpeedBonusPct: 8 },
  },
  {
    id: 'boots_atlas_stealth',
    slot: 'boots',
    name: 'Botas Atlas Recon',
    code: 'BOOT-03',
    rarity: 'ELITE',
    description: 'Calçado de infiltração leve com máxima resposta de arrancada.',
    perkLabel: '+12% Velocidade Sprint',
    unlockLevel: 11,
    cashPrice: 1350,
    stats: { sprintSpeedBonusPct: 12 },
  },

  // GRANADAS
  {
    id: 'nade_std_3_3',
    slot: 'grenadePack',
    name: 'Kit Padrão M67 + M18',
    code: 'ORD-01',
    rarity: 'PADRAO',
    description: 'Equilíbrio entre dano explosivo e cobertura tática de fumaça.',
    perkLabel: '3x Frag M67 · 3x Fumaça M18',
    unlockLevel: 1,
    cashPrice: 0,
    stats: { fragCount: 3, smokeCount: 3 },
  },
  {
    id: 'nade_breacher_4_2',
    slot: 'grenadePack',
    name: 'Kit Breacher Explosivo',
    code: 'ORD-02',
    rarity: 'TATICO',
    description: 'Prioriza granadas de fragmentação para limpar cantos e bombs.',
    perkLabel: '4x Frag M67 · 2x Fumaça M18',
    unlockLevel: 3,
    cashPrice: 500,
    stats: { fragCount: 4, smokeCount: 2 },
  },
  {
    id: 'nade_smoke_2_4',
    slot: 'grenadePack',
    name: 'Kit Cortina Tática',
    code: 'ORD-03',
    rarity: 'TATICO',
    description: 'Foco em bloqueio de visão de Snipers com fumaça densa.',
    perkLabel: '2x Frag M67 · 4x Fumaça M18',
    unlockLevel: 3,
    cashPrice: 500,
    stats: { fragCount: 2, smokeCount: 4 },
  },
];

const LOADOUT_STORAGE_KEY = 'kinetic_warface_inventory_v1';

function createDefaultInventory(): PlayerInventoryState {
  return {
    selectedClass: 'FUZILEIRO',
    purchasedGearIds: [
      'helm_vanguard_std',
      'vest_vanguard_std',
      'gloves_oakley_std',
      'boots_combat_std',
      'nade_std_3_3',
    ],
    purchasedWeaponIds: [
      'M4_CARBINE',
      'AK12_RIFLE',
      'SHOTGUN_12',
      'SMG_45',
      'SNIPER_TACTICAL',
      'P50_PISTOL',
      'KNIFE_TACTICAL',
    ],
    classLoadouts: {
      FUZILEIRO: {
        primaryWeapon: 'M4_CARBINE',
        secondaryWeapon: 'P50_PISTOL',
        meleeWeapon: 'KNIFE_TACTICAL',
        grenadePack: 'nade_std_3_3',
        helmet: 'helm_vanguard_std',
        vest: 'vest_vanguard_std',
        gloves: 'gloves_oakley_std',
        boots: 'boots_combat_std',
      },
      MEDICO: {
        primaryWeapon: 'SHOTGUN_12',
        secondaryWeapon: 'P50_PISTOL',
        meleeWeapon: 'KNIFE_TACTICAL',
        grenadePack: 'nade_smoke_2_4',
        helmet: 'helm_vanguard_std',
        vest: 'vest_vanguard_std',
        gloves: 'gloves_oakley_std',
        boots: 'boots_combat_std',
      },
      ENGENHEIRO: {
        primaryWeapon: 'SMG_45',
        secondaryWeapon: 'P50_PISTOL',
        meleeWeapon: 'KNIFE_TACTICAL',
        grenadePack: 'nade_std_3_3',
        helmet: 'helm_vanguard_std',
        vest: 'vest_vanguard_std',
        gloves: 'gloves_oakley_std',
        boots: 'boots_combat_std',
      },
      FRANCO_ATIRADOR: {
        primaryWeapon: 'SNIPER_TACTICAL',
        secondaryWeapon: 'P50_PISTOL',
        meleeWeapon: 'KNIFE_TACTICAL',
        grenadePack: 'nade_smoke_2_4',
        helmet: 'helm_vanguard_std',
        vest: 'vest_vanguard_std',
        gloves: 'gloves_oakley_std',
        boots: 'boots_combat_std',
      },
    },
  };
}

function loadInventoryState(): PlayerInventoryState {
  const def = createDefaultInventory();
  try {
    const raw = localStorage.getItem(LOADOUT_STORAGE_KEY);
    if (!raw) return def;
    const parsed = JSON.parse(raw) as Partial<PlayerInventoryState>;
    const selectedClass: WarfaceClassId =
      parsed.selectedClass && WARFACE_CLASS_LOADOUT_META[parsed.selectedClass]
        ? parsed.selectedClass
        : def.selectedClass;
    const classLoadouts = { ...def.classLoadouts };
    (['FUZILEIRO', 'MEDICO', 'ENGENHEIRO', 'FRANCO_ATIRADOR'] as WarfaceClassId[]).forEach(
      (cId) => {
        if (parsed.classLoadouts?.[cId]) {
          const merged = {
            ...def.classLoadouts[cId],
            ...parsed.classLoadouts[cId],
          };
          // Enforce strict Warface class weapon exclusivity on any legacy saved state
          if (
            !WARFACE_CLASS_LOADOUT_META[cId].allowedPrimaries.includes(
              merged.primaryWeapon
            )
          ) {
            merged.primaryWeapon = WARFACE_CLASS_LOADOUT_META[cId].defaultPrimary;
          }
          classLoadouts[cId] = merged;
        }
      }
    );
    return {
      selectedClass,
      purchasedGearIds: Array.from(
        new Set([...def.purchasedGearIds, ...(parsed.purchasedGearIds || [])])
      ),
      purchasedWeaponIds: Array.from(
        new Set([...def.purchasedWeaponIds, ...(parsed.purchasedWeaponIds || [])])
      ) as WeaponId[],
      classLoadouts,
    };
  } catch {
    return def;
  }
}

let currentInventory: PlayerInventoryState = loadInventoryState();
const listeners = new Set<(state: PlayerInventoryState) => void>();

function saveAndEmit(): void {
  try {
    localStorage.setItem(LOADOUT_STORAGE_KEY, JSON.stringify(currentInventory));
  } catch {
    // ignore storage errors
  }
  const snap = getPlayerInventoryState();
  listeners.forEach((fn) => fn(snap));
}

export function getPlayerInventoryState(): PlayerInventoryState {
  return {
    selectedClass: currentInventory.selectedClass,
    purchasedGearIds: [...currentInventory.purchasedGearIds],
    purchasedWeaponIds: [...currentInventory.purchasedWeaponIds],
    classLoadouts: {
      FUZILEIRO: { ...currentInventory.classLoadouts.FUZILEIRO },
      MEDICO: { ...currentInventory.classLoadouts.MEDICO },
      ENGENHEIRO: { ...currentInventory.classLoadouts.ENGENHEIRO },
      FRANCO_ATIRADOR: { ...currentInventory.classLoadouts.FRANCO_ATIRADOR },
    },
  };
}

export function subscribePlayerInventory(
  listener: (state: PlayerInventoryState) => void
): () => void {
  listeners.add(listener);
  listener(getPlayerInventoryState());
  return () => {
    listeners.delete(listener);
  };
}

export function isWeaponOwnedInInventory(
  weaponId: WeaponId,
  playerXp = loadSavedPlayerXp()
): boolean {
  if (
    WEAPON_INVENTORY_CATALOG[weaponId]?.cashPrice === 0 ||
    isWeaponUnlockedAtXp(weaponId, playerXp) ||
    currentInventory.purchasedWeaponIds.includes(weaponId)
  ) {
    return true;
  }
  return false;
}

export function isGearOwnedInInventory(
  gearId: string,
  playerXp = loadSavedPlayerXp()
): boolean {
  const item = GEAR_INVENTORY_CATALOG.find((g) => g.id === gearId);
  if (!item) return false;
  const rank = getRankForXp(playerXp);
  if (item.cashPrice === 0 || rank.level >= item.unlockLevel) return true;
  return currentInventory.purchasedGearIds.includes(gearId);
}

export function purchaseWeaponWithCash(weaponId: WeaponId): boolean {
  const spec = WEAPON_INVENTORY_CATALOG[weaponId];
  if (!spec) return false;
  if (isWeaponOwnedInInventory(weaponId)) return true;
  if (loadSavedPlayerCash() < spec.cashPrice) return false;
  if (!spendPlayerCash(spec.cashPrice)) return false;
  currentInventory.purchasedWeaponIds = Array.from(
    new Set([...currentInventory.purchasedWeaponIds, weaponId])
  );
  saveAndEmit();
  return true;
}

export function purchaseGearWithCash(gearId: string): boolean {
  const item = GEAR_INVENTORY_CATALOG.find((g) => g.id === gearId);
  if (!item) return false;
  if (isGearOwnedInInventory(gearId)) return true;
  if (loadSavedPlayerCash() < item.cashPrice) return false;
  if (!spendPlayerCash(item.cashPrice)) return false;
  currentInventory.purchasedGearIds = Array.from(
    new Set([...currentInventory.purchasedGearIds, gearId])
  );
  saveAndEmit();
  return true;
}

export function inferWarfaceClassForWeapon(weaponId: WeaponId): WarfaceClassId {
  if (weaponId === 'SNIPER_BOLT' || weaponId === 'SNIPER_TACTICAL') {
    return 'FRANCO_ATIRADOR';
  }
  if (weaponId === 'SHOTGUN_12' || weaponId === 'SHOTGUN_SPAS') {
    return 'MEDICO';
  }
  if (weaponId === 'SMG_45' || weaponId === 'SMG_MP5') {
    return 'ENGENHEIRO';
  }
  return 'FUZILEIRO';
}

export function setSelectedWarfaceClass(classId: WarfaceClassId): WeaponId {
  currentInventory.selectedClass = classId;
  saveAndEmit();
  return currentInventory.classLoadouts[classId].primaryWeapon;
}

export function equipClassSlotItem(
  classId: WarfaceClassId,
  slot: EquipmentSlotId,
  itemId: string
): void {
  const cfg = { ...currentInventory.classLoadouts[classId] };
  if (slot === 'primaryWeapon') {
    const wId = itemId as WeaponId;
    if (!WARFACE_CLASS_LOADOUT_META[classId].allowedPrimaries.includes(wId)) return;
    cfg.primaryWeapon = wId;
  } else if (slot === 'secondaryWeapon') {
    cfg.secondaryWeapon = itemId as WeaponId;
  } else if (slot === 'meleeWeapon') {
    cfg.meleeWeapon = itemId as WeaponId;
  } else if (slot === 'grenadePack') {
    cfg.grenadePack = itemId;
  } else if (slot === 'helmet') {
    cfg.helmet = itemId;
  } else if (slot === 'vest') {
    cfg.vest = itemId;
  } else if (slot === 'gloves') {
    cfg.gloves = itemId;
  } else if (slot === 'boots') {
    cfg.boots = itemId;
  }
  currentInventory.classLoadouts[classId] = cfg;
  saveAndEmit();
}

export function syncEquippedWeaponToInventory(weaponId: WeaponId): void {
  if (weaponId === 'P50_PISTOL' || weaponId === 'KNIFE_TACTICAL') return;
  const activeCfg = currentInventory.classLoadouts[currentInventory.selectedClass];
  if (
    WARFACE_CLASS_LOADOUT_META[currentInventory.selectedClass].allowedPrimaries.includes(
      weaponId
    )
  ) {
    activeCfg.primaryWeapon = weaponId;
    saveAndEmit();
    return;
  }
  const targetClass = inferWarfaceClassForWeapon(weaponId);
  currentInventory.selectedClass = targetClass;
  currentInventory.classLoadouts[targetClass].primaryWeapon = weaponId;
  saveAndEmit();
}

export interface ClassCombatModifiers {
  classId: WarfaceClassId;
  primaryWeapon: WeaponId;
  secondaryWeapon: WeaponId;
  meleeWeapon: WeaponId;
  totalMaxHealth: number;
  armorBonus: number;
  headshotReductionPct: number;
  reloadSpeedMult: number;
  sprintSpeedMult: number;
  adsSpeedMult: number;
  fragCount: number;
  smokeCount: number;
  helmetName: string;
  vestName: string;
  glovesName: string;
  bootsName: string;
}

export function getClassCombatModifiers(
  classId: WarfaceClassId = currentInventory.selectedClass
): ClassCombatModifiers {
  const cfg = currentInventory.classLoadouts[classId];
  const classMeta = WARFACE_CLASS_LOADOUT_META[classId];

  const findGear = (id: string) =>
    GEAR_INVENTORY_CATALOG.find((g) => g.id === id);

  const helm = findGear(cfg.helmet);
  const vest = findGear(cfg.vest);
  const gloves = findGear(cfg.gloves);
  const boots = findGear(cfg.boots);
  const nade = findGear(cfg.grenadePack);

  const armorBonus =
    classMeta.baseArmor +
    (vest?.stats.armorBonus || 0) +
    (helm?.stats.armorBonus || 0);
  const healthBonus =
    classMeta.baseHealthBonus + (vest?.stats.healthBonus || 0);
  const headshotReductionPct = helm?.stats.headshotReductionPct || 0;
  const reloadBonusPct = gloves?.stats.reloadSpeedBonusPct || 0;
  const sprintBonusPct = boots?.stats.sprintSpeedBonusPct || 0;
  const adsBonusPct =
    (helm?.stats.adsSpeedBonusPct || 0) + (gloves?.stats.adsSpeedBonusPct || 0);

  return {
    classId,
    primaryWeapon: cfg.primaryWeapon,
    secondaryWeapon: cfg.secondaryWeapon,
    meleeWeapon: cfg.meleeWeapon,
    // Armor is a separate vest pool (engineer repairs) — not folded into HP.
    totalMaxHealth: 100 + healthBonus,
    armorBonus,
    headshotReductionPct,
    reloadSpeedMult: 1 + reloadBonusPct / 100,
    sprintSpeedMult: 1 + sprintBonusPct / 100,
    adsSpeedMult: 1 + adsBonusPct / 100,
    fragCount: nade?.stats.fragCount ?? 3,
    smokeCount: nade?.stats.smokeCount ?? 3,
    helmetName: helm?.name || 'Capacete Vanguard',
    vestName: vest?.name || 'Colete Vanguard',
    glovesName: gloves?.name || 'Luvas Táticas',
    bootsName: boots?.name || 'Coturno Vanguard',
  };
}
