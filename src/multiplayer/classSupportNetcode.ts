/**
 * WebSocket packets for Warface class support across remote players:
 * ammo / heal / armor / revive.
 */

import { ClassSupportKind } from '../three/classSupportSystem';

export type ClassSupportNetKind = Exclude<ClassSupportKind, 'NONE'> | 'REVIVE';

/** APPLY = effect lands; START/CANCEL sync the ~15s kit channel. */
export type ClassSupportPhase = 'START' | 'CANCEL' | 'APPLY';

export interface ClassSupportPacket {
  type: 'CLASS_SUPPORT';
  roomId: string;
  eventId: string;
  fromUid: string;
  targetUid: string;
  kind: ClassSupportNetKind;
  /** HP / armor amount when applicable. */
  amount?: number;
  /** Kit channel phase (default APPLY for legacy packets). */
  phase?: ClassSupportPhase;
  ts: number;
}

export function buildClassSupportEvent(
  roomId: string,
  fromUid: string,
  targetUid: string,
  kind: ClassSupportNetKind,
  amount?: number,
  phase: ClassSupportPhase = 'APPLY'
): ClassSupportPacket {
  return {
    type: 'CLASS_SUPPORT',
    roomId,
    eventId: `${fromUid}_${targetUid}_${kind}_${phase}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    fromUid,
    targetUid,
    kind,
    amount,
    phase,
    ts: Date.now(),
  };
}

export function sendClassSupportWs(
  wsClient: WebSocket | null,
  packet: ClassSupportPacket
): boolean {
  if (!wsClient || wsClient.readyState !== WebSocket.OPEN) return false;
  wsClient.send(JSON.stringify(packet));
  return true;
}
