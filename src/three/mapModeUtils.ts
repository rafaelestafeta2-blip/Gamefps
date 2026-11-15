import { DrillMode } from '../types/game';

/** Isolated floor/spawn harness modes — no matchmaking / netcode / bomb round. */
export const MAP_SPAWN_HARNESS_MODES: DrillMode[] = [
  'MAP_TEST_INDUSTRIA',
  'MAP_TEST_HANGAR',
  'MAP_TEST_EASTERN',
  'MAP_TEST_MIRAGE',
];

export function isMapSpawnHarness(mode: DrillMode): boolean {
  return (
    mode === 'MAP_TEST_INDUSTRIA' ||
    mode === 'MAP_TEST_HANGAR' ||
    mode === 'MAP_TEST_EASTERN' ||
    mode === 'MAP_TEST_MIRAGE'
  );
}

/** Map harness / bomb mode → arena asset mode used by prepare + level bundles. */
export function arenaAssetMode(mode: DrillMode): DrillMode {
  switch (mode) {
    case 'MAP_TEST_INDUSTRIA':
      return 'INDUSTRIA_BOMB_5V5';
    case 'MAP_TEST_HANGAR':
      return 'HANGAR_BOMB_5V5';
    case 'MAP_TEST_EASTERN':
      return 'EASTERN_CITY_BOMB_5V5';
    case 'MAP_TEST_MIRAGE':
      return 'MIRAGE_ANUBIS_BOMB_5V5';
    default:
      return mode;
  }
}

export function isNewGlbBombArena(mode: DrillMode): boolean {
  const a = arenaAssetMode(mode);
  return (
    a === 'INDUSTRIA_BOMB_5V5' ||
    a === 'HANGAR_BOMB_5V5' ||
    a === 'EASTERN_CITY_BOMB_5V5' ||
    a === 'MIRAGE_ANUBIS_BOMB_5V5'
  );
}

/** Spawn numbers stay off the match screen. Only ?spawndbg=1 turns them on. */
export function shouldForceSpawnDebug(
  mode: DrillMode,
  settingsFlag?: boolean
): boolean {
  if (typeof window !== 'undefined') {
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get('spawndbg') === '1' || q.get('spawndbg') === 'true') return true;
      if (q.get('spawndbg') === '0') return false;
    } catch {
      /* ignore */
    }
  }
  return settingsFlag === true && (isNewGlbBombArena(mode) || isMapSpawnHarness(mode));
}
