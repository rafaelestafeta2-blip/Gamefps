/**
 * Resolve the active Dust2TriangleCollider for the current drill mode.
 * Shared so bot navmesh bake / LOS / movement never miss new GLB maps.
 */

import { DrillMode } from '../types/game';
import { Dust2TriangleCollider } from './dust2Collider';

type LevelWithCollider = { collider: Dust2TriangleCollider };

export interface GlbColliderHost {
  state: { drillMode: DrillMode };
  dust2LevelData: LevelWithCollider;
  assaultLevelData: LevelWithCollider;
  industriaLevelData: LevelWithCollider;
  hangarLevelData: LevelWithCollider;
  easternCityLevelData: LevelWithCollider;
  mirageAnubisLevelData: LevelWithCollider;
}

export function getActiveGlbCollider(
  engine: GlbColliderHost
): Dust2TriangleCollider | null {
  switch (engine.state.drillMode) {
    case 'DUST2_BOMB_5V5':
      return engine.dust2LevelData.collider;
    case 'ASSAULT_BOMB_5V5':
      return engine.assaultLevelData.collider;
    case 'INDUSTRIA_BOMB_5V5':
      return engine.industriaLevelData.collider;
    case 'HANGAR_BOMB_5V5':
      return engine.hangarLevelData.collider;
    case 'EASTERN_CITY_BOMB_5V5':
      return engine.easternCityLevelData.collider;
    case 'MIRAGE_ANUBIS_BOMB_5V5':
      return engine.mirageAnubisLevelData.collider;
    default:
      return null;
  }
}

/** True when this mode uses a collision-baked GLB triangle navmesh. */
export function isGlbNavMeshMode(mode: DrillMode): boolean {
  return (
    mode === 'DUST2_BOMB_5V5' ||
    mode === 'ASSAULT_BOMB_5V5' ||
    mode === 'INDUSTRIA_BOMB_5V5' ||
    mode === 'HANGAR_BOMB_5V5' ||
    mode === 'EASTERN_CITY_BOMB_5V5' ||
    mode === 'MIRAGE_ANUBIS_BOMB_5V5'
  );
}
