/**
 * Real photo / in-game scenic thumbs for map select UI.
 * Dust2 previously was the only photo crop; other modes used canvas drawings.
 */

import { DrillMode } from '../types/game';
import { MainMenuPlayModeId } from './MainMenuRightWidgets';

export const MAP_SELECT_THUMBS = {
  dust2: '/assets/maps/thumbs/dust2.jpg',
  assault: '/assets/maps/thumbs/assault.jpg',
  industria: '/assets/maps/thumbs/industria.jpg',
  hangar: '/assets/maps/thumbs/hangar.jpg',
  easternCity: '/assets/maps/thumbs/eastern_city.jpg',
  mirageAnubis: '/assets/maps/thumbs/mirage_anubis.jpg',
  yard: '/assets/maps/thumbs/yard.jpg',
  range: '/assets/maps/thumbs/range.jpg',
  killhouse: '/assets/maps/thumbs/killhouse.jpg',
} as const;

export function thumbForDrillMode(mode: DrillMode | string): string {
  switch (mode) {
    case 'DUST2_BOMB_5V5':
      return MAP_SELECT_THUMBS.dust2;
    case 'ASSAULT_BOMB_5V5':
      return MAP_SELECT_THUMBS.assault;
    case 'INDUSTRIA_BOMB_5V5':
      return MAP_SELECT_THUMBS.industria;
    case 'HANGAR_BOMB_5V5':
      return MAP_SELECT_THUMBS.hangar;
    case 'EASTERN_CITY_BOMB_5V5':
      return MAP_SELECT_THUMBS.easternCity;
    case 'MIRAGE_ANUBIS_BOMB_5V5':
      return MAP_SELECT_THUMBS.mirageAnubis;
    case 'YARD_BOMB_5V5':
      return MAP_SELECT_THUMBS.yard;
    case 'FREE_RANGE':
      return MAP_SELECT_THUMBS.range;
    case 'KILLHOUSE_BLITZ':
      return MAP_SELECT_THUMBS.killhouse;
    default:
      return MAP_SELECT_THUMBS.dust2;
  }
}

export function thumbForPlayMode(modeId: MainMenuPlayModeId): string {
  switch (modeId) {
    case 'CASUAL_DUST2':
    case 'RANKED':
    case 'PRIVATE_ROOM':
      return MAP_SELECT_THUMBS.dust2;
    case 'CASUAL_ASSAULT':
      return MAP_SELECT_THUMBS.assault;
    case 'CASUAL_INDUSTRIA':
      return MAP_SELECT_THUMBS.industria;
    case 'CASUAL_HANGAR':
      return MAP_SELECT_THUMBS.hangar;
    case 'CASUAL_EASTERN_CITY':
      return MAP_SELECT_THUMBS.easternCity;
    case 'CASUAL_MIRAGE_ANUBIS':
      return MAP_SELECT_THUMBS.mirageAnubis;
    case 'RANGE':
      return MAP_SELECT_THUMBS.range;
    case 'KILLHOUSE':
      return MAP_SELECT_THUMBS.killhouse;
    case 'VS_AI':
      return MAP_SELECT_THUMBS.yard;
    default:
      return MAP_SELECT_THUMBS.dust2;
  }
}
