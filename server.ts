import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer } from 'ws';
import {
  fetchPlayerMmrFromFirebase,
  getAllowedMmrTolerance,
  isPlayerMmrCompatibleWithRoom,
  normalizeQueueType,
} from './src/server/matchmakingEngine';
import {
  broadcastToRoom,
  evaluateAndConfirmRankedRoomIfFull,
  matchmakingQueue,
  recalculateRoomAverageMmr,
  removeClientFromQueue,
  removeClientFromRoom,
  roomMetaMap,
  roomsMap,
  WsClientMeta,
} from './src/server/roomSessionManager';

const PORT = 3000;

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      activeRooms: roomsMap.size,
      playersInQueue: matchmakingQueue.size,
      ts: Date.now(),
    });
  });

  app.post('/api/matchmaking/check-mmr', async (req, res) => {
    const { uid, idToken, fallbackMmr, queueType } = req.body as {
      uid?: string;
      idToken?: string;
      fallbackMmr?: number;
      queueType?: string;
    };
    const normalizedQueue = normalizeQueueType(queueType);
    const verifiedMmr = await fetchPlayerMmrFromFirebase(
      String(uid || ''),
      idToken,
      Number(fallbackMmr) || 1000
    );
    res.json({
      ok: true,
      queueType: normalizedQueue,
      mmr: verifiedMmr,
      baseTolerance: getAllowedMmrTolerance(Date.now()),
    });
  });

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    const clientMeta: WsClientMeta = {
      ws,
      roomId: null,
      uid: null,
      callsign: 'OPERADOR',
      queueType: 'CASUAL',
      arenaMode: 'DUST2_BOMB_5V5',
      mmr: 1000,
      enqueuedAtMs: Date.now(),
    };

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as {
          type?: string;
          roomId?: string;
          uid?: string;
          idToken?: string;
          queueType?: string;
          arenaMode?: string;
          isPrivate?: boolean;
          mmr?: number;
          player?: { callsign?: string; mmr?: number; [key: string]: unknown };
          [key: string]: unknown;
        };

        if (!msg || typeof msg.type !== 'string') return;

        // 1. Entrada na fila de Matchmaking ('CASUAL' ou 'RANKED')
        if (msg.type === 'JOIN_QUEUE' && msg.uid) {
          const uid = String(msg.uid).slice(0, 128);
          const queueType = normalizeQueueType(msg.queueType);
          const arenaMode = String(msg.arenaMode || 'DUST2_BOMB_5V5');
          const verifiedMmr = await fetchPlayerMmrFromFirebase(
            uid,
            typeof msg.idToken === 'string' ? msg.idToken : null,
            Number(msg.mmr ?? msg.player?.mmr) || 1000
          );

          clientMeta.uid = uid;
          clientMeta.callsign = String(msg.player?.callsign || 'OPERADOR').slice(0, 32);
          clientMeta.queueType = queueType;
          clientMeta.arenaMode = arenaMode;
          clientMeta.mmr = verifiedMmr;
          clientMeta.enqueuedAtMs = Date.now();
          matchmakingQueue.set(uid, clientMeta);

          ws.send(
            JSON.stringify({
              type: 'QUEUE_JOINED',
              uid,
              queueType,
              arenaMode,
              mmr: verifiedMmr,
              toleranceMmr: getAllowedMmrTolerance(clientMeta.enqueuedAtMs),
              ts: Date.now(),
            })
          );
          return;
        }

        if (msg.type === 'LEAVE_QUEUE') {
          removeClientFromQueue(clientMeta);
          return;
        }

        // 2. Entrada em Sala (verifica Tipo de Fila e compatibilidade de MMR no Modo Ranked)
        if (msg.type === 'JOIN_ROOM' && msg.roomId && msg.uid) {
          removeClientFromRoom(clientMeta);
          const roomId = String(msg.roomId).toUpperCase().slice(0, 12);
          const uid = String(msg.uid).slice(0, 128);
          const queueType = normalizeQueueType(msg.queueType);
          const arenaMode = String(msg.arenaMode || 'DUST2_BOMB_5V5');
          const isPrivate = Boolean(msg.isPrivate);

          const verifiedMmr = await fetchPlayerMmrFromFirebase(
            uid,
            typeof msg.idToken === 'string' ? msg.idToken : null,
            Number(msg.mmr ?? msg.player?.mmr) || 1000
          );

          let meta = roomMetaMap.get(roomId);
          if (!meta) {
            meta = {
              roomId,
              queueType,
              arenaMode,
              isPrivate,
              createdAtMs: Date.now(),
              averageMmr: verifiedMmr,
              serverConfirmedStart: false,
              memberMmrs: new Map([[uid, verifiedMmr]]),
            };
            roomMetaMap.set(roomId, meta);
          } else {
            if (
              meta.queueType === 'RANKED' &&
              !meta.isPrivate &&
              meta.memberMmrs.size > 0 &&
              !meta.memberMmrs.has(uid)
            ) {
              const isCompatible = isPlayerMmrCompatibleWithRoom(
                verifiedMmr,
                meta.averageMmr,
                meta.createdAtMs
              );
              if (!isCompatible) {
                ws.send(
                  JSON.stringify({
                    type: 'RANKED_MMR_MISMATCH',
                    roomId,
                    playerMmr: verifiedMmr,
                    roomAverageMmr: meta.averageMmr,
                    reason: 'Diferença de MMR acima do limite permitido para esta partida Ranked.',
                    ts: Date.now(),
                  })
                );
                return;
              }
            }
            meta.memberMmrs.set(uid, verifiedMmr);
            recalculateRoomAverageMmr(meta);
          }

          clientMeta.roomId = roomId;
          clientMeta.uid = uid;
          clientMeta.callsign = String(msg.player?.callsign || 'OPERADOR').slice(0, 32);
          clientMeta.queueType = meta.queueType;
          clientMeta.arenaMode = meta.arenaMode;
          clientMeta.mmr = verifiedMmr;

          let set = roomsMap.get(roomId);
          if (!set) {
            set = new Set();
            roomsMap.set(roomId, set);
          }
          set.add(clientMeta);

          const enrichedPlayer = msg.player
            ? { ...msg.player, mmr: verifiedMmr }
            : { uid, mmr: verifiedMmr };

          broadcastToRoom(
            roomId,
            {
              type: 'PLAYER_JOINED',
              roomId,
              uid: clientMeta.uid,
              queueType: meta.queueType,
              averageMmr: meta.averageMmr,
              player: enrichedPlayer,
              ts: Date.now(),
            },
            clientMeta.uid
          );

          ws.send(
            JSON.stringify({
              type: 'ROOM_SYNC_META',
              roomId,
              queueType: meta.queueType,
              averageMmr: meta.averageMmr,
              playerMmr: verifiedMmr,
              playersCount: set.size,
              ts: Date.now(),
            })
          );

          evaluateAndConfirmRankedRoomIfFull(roomId);
          return;
        }

        if (msg.type === 'LEAVE_ROOM') {
          removeClientFromQueue(clientMeta);
          removeClientFromRoom(clientMeta);
          return;
        }

        // 3. Bloqueio de Início Manual na Fila Ranked
        if (clientMeta.roomId && msg.type === 'MATCH_START') {
          const meta = roomMetaMap.get(clientMeta.roomId);
          const effectiveQueue = meta?.queueType || normalizeQueueType(msg.queueType);

          if (effectiveQueue === 'RANKED' && !meta?.serverConfirmedStart) {
            ws.send(
              JSON.stringify({
                type: 'MATCH_START_BLOCKED',
                roomId: clientMeta.roomId,
                queueType: 'RANKED',
                reason:
                  'Início manual bloqueado na fila Ranked. O servidor iniciará a partida automaticamente ao confirmar 10 jogadores com MMR equilibrado.',
                ts: Date.now(),
              })
            );
            return;
          }
        }

        if (
          clientMeta.roomId &&
          (msg.type === 'PLAYER_STATE' ||
            msg.type === 'COMBAT_HIT' ||
            msg.type === 'BOMB_EVENT' ||
            msg.type === 'ROUND_EVENT' ||
            msg.type === 'MATCH_START')
        ) {
          broadcastToRoom(
            clientMeta.roomId,
            {
              ...msg,
              roomId: clientMeta.roomId,
              senderUid: clientMeta.uid,
              ts: Date.now(),
            },
            msg.type === 'PLAYER_STATE' ? clientMeta.uid : null
          );
        }
      } catch {
        // Ignore malformed packets
      }
    });

    ws.on('close', () => {
      removeClientFromQueue(clientMeta);
      removeClientFromRoom(clientMeta);
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[KINETIC Server] HTTP + WebSocket active on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
