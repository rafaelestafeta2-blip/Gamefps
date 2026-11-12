import fs from 'node:fs';
import path from 'node:path';

export type ServerQueueType = 'CASUAL' | 'RANKED';

export interface QueuedPlayerEntry {
  uid: string;
  callsign: string;
  arenaMode: string;
  queueType: ServerQueueType;
  mmr: number;
  enqueuedAtMs: number;
  roomId?: string | null;
}

export interface BalancedMatchAllocation {
  roomId: string;
  queueType: ServerQueueType;
  arenaMode: string;
  averageMmr: number;
  vanguardUids: string[];
  blackthornUids: string[];
  players: QueuedPlayerEntry[];
}

const DEFAULT_MMR = 1000;
const BASE_RANKED_MMR_TOLERANCE = 150;
const EXPAND_MMR_PER_10S = 50;
const MAX_RANKED_MMR_TOLERANCE = 600;
const REQUIRED_MATCH_PLAYERS = 10;

let cachedFirebaseConfig: { projectId: string; firestoreDatabaseId: string } | null = null;

function getFirebaseProjectAndDb(): { projectId: string; firestoreDatabaseId: string } {
  if (cachedFirebaseConfig) return cachedFirebaseConfig;
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8');
    const parsed = JSON.parse(raw) as { projectId?: string; firestoreDatabaseId?: string };
    cachedFirebaseConfig = {
      projectId: parsed.projectId || 'gen-lang-client-0974852104',
      firestoreDatabaseId:
        parsed.firestoreDatabaseId ||
        'ai-studio-tacticalstrikeco-8b3150dc-163c-4aa2-9aa0-02f143e178e6',
    };
    return cachedFirebaseConfig;
  } catch {
    return {
      projectId: 'gen-lang-client-0974852104',
      firestoreDatabaseId: 'ai-studio-tacticalstrikeco-8b3150dc-163c-4aa2-9aa0-02f143e178e6',
    };
  }
}

export function normalizeQueueType(rawQueue?: unknown): ServerQueueType {
  const normalized = String(rawQueue || 'CASUAL').trim().toUpperCase();
  return normalized === 'RANKED' ? 'RANKED' : 'CASUAL';
}

/**
 * Lê o valor de MMR (Skill Rating) do jogador diretamente no Firebase Firestore (`players/{uid}`).
 * Caso o documento ainda não possua o campo `mmr`, calcula um MMR inicial baseado em vitórias/XP ou usa 1000.
 */
export async function fetchPlayerMmrFromFirebase(
  uid: string,
  idToken?: string | null,
  fallbackMmr?: number
): Promise<number> {
  const safeFallback =
    typeof fallbackMmr === 'number' && Number.isFinite(fallbackMmr) && fallbackMmr >= 100
      ? Math.round(fallbackMmr)
      : DEFAULT_MMR;

  if (!uid || !idToken) {
    return safeFallback;
  }

  try {
    const { projectId, firestoreDatabaseId } = getFirebaseProjectAndDb();
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/${encodeURIComponent(
      firestoreDatabaseId
    )}/documents/players/${encodeURIComponent(uid)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) return safeFallback;

    const docData = (await res.json()) as {
      fields?: Record<string, { integerValue?: string; doubleValue?: number }>;
    };
    const fields = docData?.fields;
    if (!fields) return safeFallback;

    const rawMmr =
      fields.mmr?.integerValue !== undefined
        ? Number(fields.mmr.integerValue)
        : fields.mmr?.doubleValue !== undefined
        ? Number(fields.mmr.doubleValue)
        : NaN;

    if (Number.isFinite(rawMmr) && rawMmr >= 100) {
      return Math.round(rawMmr);
    }

    const wins = Number(fields.matchesWon?.integerValue ?? fields.matchesWon?.doubleValue ?? 0);
    const played = Number(fields.matchesPlayed?.integerValue ?? fields.matchesPlayed?.doubleValue ?? 0);
    const losses = Math.max(0, played - wins);
    const derivedMmr = Math.max(100, DEFAULT_MMR + wins * 25 - losses * 18);
    return Math.round(derivedMmr);
  } catch {
    return safeFallback;
  }
}

export function getAllowedMmrTolerance(enqueuedAtMs: number, nowMs = Date.now()): number {
  const waitedSec = Math.max(0, (nowMs - enqueuedAtMs) / 1000);
  const steps = Math.floor(waitedSec / 10);
  return Math.min(
    MAX_RANKED_MMR_TOLERANCE,
    BASE_RANKED_MMR_TOLERANCE + steps * EXPAND_MMR_PER_10S
  );
}

export function isPlayerMmrCompatibleWithRoom(
  playerMmr: number,
  roomAverageMmr: number,
  roomCreatedAtMs: number,
  nowMs = Date.now()
): boolean {
  const tolerance = getAllowedMmrTolerance(roomCreatedAtMs, nowMs);
  return Math.abs(playerMmr - roomAverageMmr) <= tolerance;
}

/**
 * Tenta formar uma partida de 10 jogadores:
 * - Na fila CASUAL: junta os primeiros 10 jogadores da mesma arena.
 * - Na fila RANKED: ordena por MMR e procura uma janela de 10 jogadores cujo spread de MMR
 *   esteja dentro da tolerância permitida, distribuindo os times em Snake Draft (1-2-2-2-2-1)
 *   para equilibrar o MMR médio de VANGUARD vs BLACKTHORN.
 */
export function tryFindBalancedMatch(
  queueEntries: QueuedPlayerEntry[],
  queueType: ServerQueueType,
  arenaMode: string,
  roomId: string,
  nowMs = Date.now()
): BalancedMatchAllocation | null {
  const candidates = queueEntries.filter(
    (entry) => entry.queueType === queueType && entry.arenaMode === arenaMode
  );

  if (candidates.length < REQUIRED_MATCH_PLAYERS) {
    return null;
  }

  let selectedTen: QueuedPlayerEntry[] | null = null;

  if (queueType === 'CASUAL') {
    const byWaitTime = [...candidates].sort((a, b) => a.enqueuedAtMs - b.enqueuedAtMs);
    selectedTen = byWaitTime.slice(0, REQUIRED_MATCH_PLAYERS);
  } else {
    const byMmr = [...candidates].sort((a, b) => a.mmr - b.mmr);
    let bestSpread = Infinity;
    let bestWindow: QueuedPlayerEntry[] | null = null;

    for (let i = 0; i <= byMmr.length - REQUIRED_MATCH_PLAYERS; i++) {
      const windowSlice = byMmr.slice(i, i + REQUIRED_MATCH_PLAYERS);
      const minMmr = windowSlice[0].mmr;
      const maxMmr = windowSlice[windowSlice.length - 1].mmr;
      const spread = maxMmr - minMmr;

      const oldestEnqueue = Math.min(...windowSlice.map((p) => p.enqueuedAtMs));
      const maxAllowedSpread = getAllowedMmrTolerance(oldestEnqueue, nowMs) * 2;

      if (spread <= maxAllowedSpread && spread < bestSpread) {
        bestSpread = spread;
        bestWindow = windowSlice;
      }
    }

    selectedTen = bestWindow;
  }

  if (!selectedTen || selectedTen.length < REQUIRED_MATCH_PLAYERS) {
    return null;
  }

  // Ordenar por MMR decrescente e aplicar Snake Draft para equilibrar as duas equipes 5v5
  const sortedBySkill = [...selectedTen].sort((a, b) => b.mmr - a.mmr);
  const vanguardUids: string[] = [];
  const blackthornUids: string[] = [];

  // Padrão Snake Draft 5v5: V, B, B, V, V, B, B, V, B, V
  const snakeTeams: ('VANGUARD' | 'BLACKTHORN')[] = [
    'VANGUARD',
    'BLACKTHORN',
    'BLACKTHORN',
    'VANGUARD',
    'VANGUARD',
    'BLACKTHORN',
    'BLACKTHORN',
    'VANGUARD',
    'BLACKTHORN',
    'VANGUARD',
  ];

  sortedBySkill.forEach((p, idx) => {
    if (snakeTeams[idx] === 'VANGUARD') {
      vanguardUids.push(p.uid);
    } else {
      blackthornUids.push(p.uid);
    }
  });

  const totalMmr = sortedBySkill.reduce((sum, p) => sum + p.mmr, 0);
  const averageMmr = Math.round(totalMmr / REQUIRED_MATCH_PLAYERS);

  return {
    roomId,
    queueType,
    arenaMode,
    averageMmr,
    vanguardUids,
    blackthornUids,
    players: sortedBySkill,
  };
}
