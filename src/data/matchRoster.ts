import { WarfaceClassId } from '../components/WarfaceClassIcons';

export interface SquadMember {
  callsign: string;
  title: string;
  classId: WarfaceClassId;
  isPlayer?: boolean;
}

export const VANGUARD_ROSTER: SquadMember[] = [
  { callsign: 'VOCÊ [OPERADOR]', title: 'ENGENHEIRO · C4', classId: 'ENGENHEIRO', isPlayer: true },
  { callsign: 'RECON-02', title: 'FRANCO-ATIRADOR', classId: 'FRANCO_ATIRADOR' },
  { callsign: 'STRIKER-03', title: 'FUZILEIRO', classId: 'FUZILEIRO' },
  { callsign: 'LIFELINE-04', title: 'MÉDICO', classId: 'MEDICO' },
  { callsign: 'WARDEN-05', title: 'FUZILEIRO', classId: 'FUZILEIRO' },
];

export const BLACKTHORN_ROSTER: SquadMember[] = [
  { callsign: 'KRAKEN-BT', title: 'FUZILEIRO PESADO', classId: 'FUZILEIRO' },
  { callsign: 'WRAITH-BT', title: 'FRANCO-ATIRADOR', classId: 'FRANCO_ATIRADOR' },
  { callsign: 'VOLT-BT', title: 'ENGENHEIRO', classId: 'ENGENHEIRO' },
  { callsign: 'SERAPH-BT', title: 'MÉDICO TÁTICO', classId: 'MEDICO' },
  { callsign: 'HAVOC-BT', title: 'FUZILEIRO LÍDER', classId: 'FUZILEIRO' },
];
