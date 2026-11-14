import * as THREE from 'three';
import { DrillMode } from '../types/game';
import {
  BakedNavMesh,
  ensureBakedNavMesh,
  findBakedMeshPath,
} from './botNavMeshBake';
import { Dust2TriangleCollider } from './dust2Collider';
import { TacticalGrenadeSystem } from './grenadeSystem';
import { ColliderBox } from './levelBuilder';
import { YardBotEntity } from './yardPropsBuilder';

/** Active collision-baked mesh for this frame (set by bot AI update). */
let _activeBakedMesh: BakedNavMesh | null = null;

export function setActiveBotNavMesh(
  mode: DrillMode,
  activeGlbCollider?: Dust2TriangleCollider | null,
  colliders?: ColliderBox[]
): BakedNavMesh | null {
  const routes = getMapRoutes(mode);
  const seeds = [
    ...routes.vgA,
    ...routes.vgB,
    ...routes.vgMid,
    ...routes.btA,
    ...routes.btB,
    ...routes.btMid,
    routes.siteA,
    routes.siteB,
  ];
  _activeBakedMesh = ensureBakedNavMesh(mode, seeds, activeGlbCollider, colliders);
  return _activeBakedMesh;
}

export type SquadFlankRole = 'HOLD' | 'LEFT' | 'RIGHT' | 'PRESS';

export interface BotNavData {
  waypoints: THREE.Vector3[];
  wpIndex: number;
  patrolDir: 1 | -1;
  tacticalState:
    | 'PATROL'
    | 'FOLLOW_PLAYER'
    | 'INVESTIGATE'
    | 'COMBAT'
    | 'COVER'
    | 'PEEK'
    | 'RUSH_PLANTED'
    | 'DEFEND_PLANTED'
    | 'PLANTING'
    | 'DEFUSING';
  lockedTargetId: string | null;
  chaseTimer: number;
  lastKnownPos: THREE.Vector3 | null;
  investigateTimer: number;
  fireCooldown: number;
  burstShotsLeft: number;
  burstShotTimer: number;
  grenadeCooldown: number;
  grenadesLeft: number;
  coverTimer: number;
  peekTimer: number;
  coverSide: 1 | -1;
  strafeTimer: number;
  strafeDir: number;
  stuckTimer: number;
  /** Seconds with almost no progress toward moveTarget (doorway / wall grind). */
  progressFailTimer: number;
  /** Escalating unstick phase: 0 idle, 1 sidestep, 2 backtrack, 3 repath. */
  unstickPhase: number;
  unstickTimer: number;
  avoidAngle: number;
  avoidTimer: number;
  verticalVel: number;
  /** Cooldown before another hop / step-up jump. */
  jumpCooldown: number;
  plantOrDefuseTimer: number;
  lastKeypadDigit: number;
  visionRange: number;
  fieldOfView: number;
  /** Continuous LOS time on current target before bots may fire (fairness). */
  acquireTimer: number;
  /** Seconds left to hold a flank / reposition goal. */
  flankTimer: number;
  /** Hearing-only alert (gunfire/footsteps) — chase LKP without LOS cheat. */
  heardAlertTimer: number;
  /** A* path node indices into the mode nav graph (practical waypoint mesh). */
  pathNodeIds: number[];
  pathIndex: number;
  pathGoalKey: string;
  pathRefreshTimer: number;
  /** Collision-baked navmesh world waypoints (preferred over lane graph). */
  meshPath: THREE.Vector3[];
  meshPathIndex: number;
  /** Squad-assigned flank role for coordinated pushes. */
  squadRole: SquadFlankRole;
  /** Human peek: delay after leaving cover before first shot (swing-out). */
  peekPrefireDelay: number;
  /** Remaining time before peek fire is allowed. */
  peekPrefireTimer: number;
  /** Jiggle peek (expose briefly, no commit burst). */
  isJigglePeek: boolean;
  /** Burst recoil (climbs while firing, recovers after). */
  aimRecoil: number;
  /** Persistent aim drift offsets (meters at target). */
  aimDriftX: number;
  aimDriftY: number;
  aimDriftZ: number;
}

export interface TacticalMapRoutes {
  vgA: THREE.Vector3[];
  vgB: THREE.Vector3[];
  vgMid: THREE.Vector3[];
  btA: THREE.Vector3[];
  btB: THREE.Vector3[];
  btMid: THREE.Vector3[];
  siteA: THREE.Vector3;
  siteB: THREE.Vector3;
}

const _losDir = new THREE.Vector3();
const _navDir = new THREE.Vector3();
const _steerDir = new THREE.Vector3();
const _resolvedHoriz = { x: 0, z: 0 };
const STEER_TEST_ANGLES = [0.5, -0.5, 1.0, -1.0, 1.55, -1.55, 2.15, -2.15, 2.65, -2.65];

export function dampAngleShortest(
  current: number,
  target: number,
  lambda: number,
  dt: number
): number {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * (1 - Math.exp(-lambda * dt));
}

/**
 * Rotas táticas CS a partir da Base de Spawn de cada time até os Bomb Sites A, B e Meio.
 */
export function getMapRoutes(mode: DrillMode): TacticalMapRoutes {
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

  if (mode === 'DUST2_BOMB_5V5') {
    return {
      vgA: [v(-4, 4.8, 16), v(18, 4.8, 12), v(33.5, 4.8, -16), v(34, 4.8, -42), v(28.8, 7.2, -60.4)],
      vgB: [v(-18, 6.0, 10), v(-38, 5.6, -16), v(-41, 4.8, -42), v(-40, 4.8, -67.2)],
      vgMid: [v(-11.5, 4.8, 6), v(-11, 2.8, -22), v(2, 4.8, -36.5), v(16, 6.0, -48), v(28.8, 7.2, -60.4)],
      btA: [v(6, 2.4, -54), v(22, 6.0, -56), v(28.5, 7.2, -58.5), v(34.5, 4.8, -36), v(28.8, 7.2, -60.4)],
      btB: [v(-16, 3.2, -56), v(-30, 4.8, -58), v(-39.5, 4.8, -65), v(-40.5, 4.8, -42), v(-40, 4.8, -67.2)],
      btMid: [v(-8, 2.4, -46), v(-11, 2.8, -36), v(2, 4.8, -36.5), v(22, 6.0, -52), v(-30, 4.8, -58)],
      siteA: v(28.8, 7.2, -60.4),
      siteB: v(-40.0, 4.8, -67.2),
    };
  }

  if (mode === 'ASSAULT_BOMB_5V5') {
    return {
      vgA: [v(-26.5, 0, 29), v(-26.5, 0, 19), v(-22.9, 0, 11.6)],
      vgB: [v(-18, 0, 31), v(-10, 0, 21), v(-8.8, 0, 12.5), v(-2.3, 0, 6.9)],
      vgMid: [v(-8, 0, 34), v(12, 0, 32), v(18, 0, 16), v(8, 0, 6.9), v(-2.3, 0, 6.9)],
      btA: [v(-11, 0, 6.5), v(-18, 0, 9.5), v(-22.9, 0, 11.6), v(-25, 0, 19), v(-22.9, 0, 11.6)],
      btB: [v(-2.3, 0, 6.9), v(-8.8, 0, 12.5), v(-9.5, 0, 20), v(-2.3, 0, 6.9)],
      btMid: [v(8, 0, 6.2), v(17.8, 0, 10), v(17.8, 0, 22), v(-9, 0, 21), v(-22.9, 0, 11.6)],
      siteA: v(-22.9, 0, 11.6),
      siteB: v(-2.3, 0, 6.9),
    };
  }

  if (mode === 'INDUSTRIA_BOMB_5V5') {
    return {
      vgA: [v(12, 1.85, -40), v(6, 2.0, -20), v(-8, 2.5, -8), v(-12, 3.3, 0)],
      vgB: [v(12, 1.85, -40), v(20, 2.0, -10), v(28, 2.2, 10), v(33.6, 2.2, 28)],
      vgMid: [v(12, 1.85, -40), v(18, 2.0, -5), v(20, 2.0, 5), v(10, 2.5, 15)],
      btA: [v(-5, 2.0, 48), v(-8, 2.5, 20), v(-12, 3.3, 5), v(-12, 3.3, 0)],
      btB: [v(-5, 2.0, 48), v(15, 2.2, 40), v(30, 2.2, 30), v(33.6, 2.2, 28)],
      btMid: [v(-5, 2.0, 48), v(10, 2.0, 25), v(20, 2.0, 5), v(-8, 2.5, -5)],
      siteA: v(-12, 3.3, 0),
      siteB: v(33.6, 2.2, 28),
    };
  }

  if (mode === 'HANGAR_BOMB_5V5') {
    return {
      vgA: [v(0, 0.15, -18), v(-6, 0.15, -8), v(-12, 0.15, 0)],
      vgB: [v(0, 0.15, -18), v(8, 0.15, -6), v(14, 0.15, 4)],
      vgMid: [v(0, 0.15, -18), v(0, 0.15, -4), v(0, 0.15, 6)],
      btA: [v(0, 0.15, 12), v(-8, 0.15, 6), v(-12, 0.15, 0)],
      btB: [v(0, 0.15, 12), v(8, 0.15, 8), v(14, 0.15, 4)],
      btMid: [v(0, 0.15, 12), v(0, 0.15, 4), v(0, 0.15, -6)],
      siteA: v(-12, 0.15, 0),
      siteB: v(14, 0.15, 4),
    };
  }

  if (mode === 'EASTERN_CITY_BOMB_5V5') {
    return {
      vgA: [v(0, 0.2, -48), v(-18, 0.2, -20), v(-36, 0.2, -4)],
      vgB: [v(0, 0.2, -48), v(14, 0.2, -10), v(28, 0.2, 16)],
      vgMid: [v(0, 0.2, -48), v(0, 0.2, -10), v(-4, 0.2, 12)],
      btA: [v(-6, 0.2, 48), v(-22, 0.2, 20), v(-36, 0.2, -4)],
      btB: [v(-6, 0.2, 48), v(12, 0.2, 30), v(28, 0.2, 16)],
      btMid: [v(-6, 0.2, 48), v(-4, 0.2, 16), v(0, 0.2, -8)],
      siteA: v(-36, 0.2, -4),
      siteB: v(28, 0.2, 16),
    };
  }

  if (mode === 'MIRAGE_ANUBIS_BOMB_5V5') {
    return {
      vgA: [v(-33, 0.2, -72), v(-45, 0.2, -50), v(-60, 0.2, -40)],
      vgB: [v(-33, 0.2, -72), v(-20, 0.2, -40), v(-10, 0.2, -20)],
      vgMid: [v(-33, 0.2, -72), v(-33, 0.2, -40), v(-30, 0.2, -20)],
      btA: [v(-20, 0.2, 12), v(-40, 0.2, -10), v(-60, 0.2, -40)],
      btB: [v(-20, 0.2, 12), v(-15, 0.2, -5), v(-10, 0.2, -20)],
      btMid: [v(-20, 0.2, 12), v(-30, 0.2, -15), v(-33, 0.2, -40)],
      siteA: v(-60, 0.2, -40),
      siteB: v(-10, 0.2, -20),
    };
  }

  return {
    vgA: [v(0, 0, 24), v(12, 0, 16), v(21, 0, 4), v(26, 0, -7.5)],
    vgB: [v(-1, 0, 24), v(-14, 0, 15), v(-20, 0, 2), v(-21.5, 0, -6.5)],
    vgMid: [v(0, 0, 24), v(-0.5, 0, 11), v(0, 0, -4), v(16, 0, -8), v(26, 0, -7.5)],
    btA: [v(12, 0, -21), v(23, 0, -16), v(26, 0, -7.5), v(21, 0, 5), v(26, 0, -7.5)],
    btB: [v(-12, 0, -21), v(-20, 0, -15), v(-21.5, 0, -6.5), v(-19, 0, 6), v(-21.5, 0, -6.5)],
    btMid: [v(0, 0, -18), v(-0.5, 0, -5), v(0, 0, 10), v(16, 0, 8), v(26, 0, -7.5)],
    siteA: v(26, 0, -7.5),
    siteB: v(-21.5, 0, -6.5),
  };
}

interface NavGraph {
  nodes: THREE.Vector3[];
  /** Undirected adjacency: neighbor index + edge cost. */
  edges: Array<Array<{ to: number; cost: number }>>;
}

const _navGraphCache = new Map<DrillMode, NavGraph>();

function distXZ(a: THREE.Vector3, b: THREE.Vector3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function findOrInsertNode(nodes: THREE.Vector3[], p: THREE.Vector3, mergeDist = 2.4): number {
  for (let i = 0; i < nodes.length; i++) {
    if (distXZ(nodes[i], p) <= mergeDist) return i;
  }
  nodes.push(p.clone());
  return nodes.length - 1;
}

function addUndirectedEdge(
  edges: NavGraph['edges'],
  a: number,
  b: number,
  cost: number
): void {
  if (a === b) return;
  if (!edges[a].some((e) => e.to === b)) edges[a].push({ to: b, cost });
  if (!edges[b].some((e) => e.to === a)) edges[b].push({ to: a, cost });
}

/**
 * Practical "navmesh": merge all tactical lane waypoints into a graph,
 * connect sequential lane hops + nearby cross-lane bridges, then A*.
 */
export function getMapNavGraph(mode: DrillMode): NavGraph {
  const cached = _navGraphCache.get(mode);
  if (cached) return cached;

  const routes = getMapRoutes(mode);
  const lanes = [
    routes.vgA,
    routes.vgB,
    routes.vgMid,
    routes.btA,
    routes.btB,
    routes.btMid,
    [routes.siteA],
    [routes.siteB],
  ];
  const nodes: THREE.Vector3[] = [];
  const edges: NavGraph['edges'] = [];

  const ensureEdgeSlots = () => {
    while (edges.length < nodes.length) edges.push([]);
  };

  for (let L = 0; L < lanes.length; L++) {
    const lane = lanes[L];
    let prevIdx = -1;
    for (let i = 0; i < lane.length; i++) {
      const idx = findOrInsertNode(nodes, lane[i]);
      ensureEdgeSlots();
      if (prevIdx >= 0) {
        addUndirectedEdge(edges, prevIdx, idx, distXZ(nodes[prevIdx], nodes[idx]));
      }
      prevIdx = idx;
    }
  }

  // Cross-lane bridges: connect nearby nodes so A/B/Mid form a walkable mesh.
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = distXZ(nodes[i], nodes[j]);
      if (d > 0.5 && d <= 14.5) {
        addUndirectedEdge(edges, i, j, d * 1.08);
      }
    }
  }

  const graph: NavGraph = { nodes, edges };
  _navGraphCache.set(mode, graph);
  return graph;
}

function nearestNodeId(graph: NavGraph, pos: THREE.Vector3): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < graph.nodes.length; i++) {
    const d = distXZ(graph.nodes[i], pos);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** A* over the waypoint graph. Returns node id path inclusive of start/goal. */
export function findNavPathIds(
  mode: DrillMode,
  fromPos: THREE.Vector3,
  toPos: THREE.Vector3
): number[] {
  const graph = getMapNavGraph(mode);
  if (graph.nodes.length === 0) return [];
  const start = nearestNodeId(graph, fromPos);
  const goal = nearestNodeId(graph, toPos);
  if (start === goal) return [start];

  const open: number[] = [start];
  const cameFrom = new Map<number, number>();
  const gScore = new Float64Array(graph.nodes.length).fill(Infinity);
  const fScore = new Float64Array(graph.nodes.length).fill(Infinity);
  gScore[start] = 0;
  fScore[start] = distXZ(graph.nodes[start], graph.nodes[goal]);

  while (open.length > 0) {
    let bestOpen = 0;
    for (let i = 1; i < open.length; i++) {
      if (fScore[open[i]] < fScore[open[bestOpen]]) bestOpen = i;
    }
    const current = open.splice(bestOpen, 1)[0];
    if (current === goal) {
      const path = [current];
      let c = current;
      while (cameFrom.has(c)) {
        c = cameFrom.get(c)!;
        path.push(c);
      }
      path.reverse();
      return path;
    }
    const neighbors = graph.edges[current] || [];
    for (let n = 0; n < neighbors.length; n++) {
      const { to, cost } = neighbors[n];
      const tent = gScore[current] + cost;
      if (tent >= gScore[to]) continue;
      cameFrom.set(to, current);
      gScore[to] = tent;
      fScore[to] = tent + distXZ(graph.nodes[to], graph.nodes[goal]);
      if (!open.includes(to)) open.push(to);
    }
  }
  return [start];
}

function goalKey(goal: THREE.Vector3): string {
  return `${Math.round(goal.x * 2)}_${Math.round(goal.z * 2)}`;
}

/**
 * Follow collision-baked navmesh when available; else lane waypoint A*.
 */
export function followNavPath(
  nav: BotNavData,
  botPos: THREE.Vector3,
  goal: THREE.Vector3,
  mode: DrillMode,
  forceRepath = false
): THREE.Vector3 {
  const distToGoal = distXZ(botPos, goal);
  if (distToGoal <= 3.2) {
    nav.pathNodeIds = [];
    nav.pathIndex = 0;
    nav.meshPath = [];
    nav.meshPathIndex = 0;
    return goal;
  }

  if (!nav.meshPath) nav.meshPath = [];
  if (nav.meshPathIndex == null) nav.meshPathIndex = 0;

  const key = goalKey(goal);
  const needsBuild =
    forceRepath ||
    nav.pathGoalKey !== key ||
    (nav.pathRefreshTimer || 0) <= 0 ||
    (nav.meshPath.length === 0 && nav.pathNodeIds.length === 0);

  if (needsBuild) {
    nav.pathGoalKey = key;
    nav.pathRefreshTimer = 1.8 + Math.random() * 0.7;
    nav.meshPathIndex = 0;
    nav.pathIndex = 0;
    // Prefer real collision-baked mesh path.
    if (_activeBakedMesh) {
      nav.meshPath = findBakedMeshPath(_activeBakedMesh, botPos, goal);
      nav.pathNodeIds = [];
    } else {
      nav.meshPath = [];
    }
    if (nav.meshPath.length === 0) {
      nav.pathNodeIds = findNavPathIds(mode, botPos, goal);
    }
  }

  // 1) Collision mesh path
  if (nav.meshPath.length > 0) {
    while (nav.meshPathIndex < nav.meshPath.length) {
      const node = nav.meshPath[nav.meshPathIndex];
      if (!node) break;
      if (distXZ(botPos, node) < 1.85) {
        nav.meshPathIndex += 1;
        continue;
      }
      break;
    }
    if (nav.meshPathIndex < nav.meshPath.length) {
      return nav.meshPath[nav.meshPathIndex];
    }
    return goal;
  }

  // 2) Lane waypoint graph fallback
  const graph = getMapNavGraph(mode);
  const path = nav.pathNodeIds;
  if (path.length === 0) {
    return pickApproachWaypointFallback(botPos, goal, mode, false, 8.5, forceRepath);
  }

  while (nav.pathIndex < path.length) {
    const node = graph.nodes[path[nav.pathIndex]];
    if (!node) break;
    if (distXZ(botPos, node) < 2.35) {
      nav.pathIndex += 1;
      continue;
    }
    break;
  }

  if (nav.pathIndex >= path.length) return goal;
  return graph.nodes[path[nav.pathIndex]] || goal;
}

function pickApproachWaypointFallback(
  botPos: THREE.Vector3,
  goal: THREE.Vector3,
  mode: DrillMode,
  isAlly: boolean,
  directArriveDist: number,
  preferAltLane: boolean
): THREE.Vector3 {
  const distToGoal = distXZ(botPos, goal);
  if (distToGoal <= directArriveDist) return goal;

  const routes = getMapRoutes(mode);
  const primary = isAlly
    ? [routes.vgA, routes.vgB, routes.vgMid]
    : [routes.btA, routes.btB, routes.btMid];
  const lanes = preferAltLane
    ? [primary[1], primary[2], primary[0]]
    : primary;

  let bestWp = goal;
  let bestScore = Infinity;
  for (let L = 0; L < lanes.length; L++) {
    const lane = lanes[L];
    for (let i = 0; i < lane.length; i++) {
      const wp = lane[i];
      const wpDistToGoal = distXZ(wp, goal);
      if (wpDistToGoal >= distToGoal - 1.2) continue;
      const botDistToWp = distXZ(botPos, wp);
      const score = botDistToWp * 1.05 + wpDistToGoal * 0.55 + L * 0.8;
      if (score < bestScore) {
        bestScore = score;
        bestWp = wp;
      }
    }
  }
  return bestWp;
}

/**
 * Corridor-aware approach via A* waypoint graph (practical navmesh).
 */
export function pickApproachWaypoint(
  botPos: THREE.Vector3,
  goal: THREE.Vector3,
  mode: DrillMode,
  isAlly: boolean,
  directArriveDist = 8.5,
  preferAltLane = false,
  nav?: BotNavData
): THREE.Vector3 {
  const distToGoal = distXZ(botPos, goal);
  if (distToGoal <= directArriveDist) {
    if (nav) {
      nav.pathNodeIds = [];
      nav.pathIndex = 0;
      nav.meshPath = [];
      nav.meshPathIndex = 0;
    }
    return goal;
  }
  if (nav) {
    return followNavPath(nav, botPos, goal, mode, preferAltLane);
  }
  return pickApproachWaypointFallback(
    botPos,
    goal,
    mode,
    isAlly,
    directArriveDist,
    preferAltLane
  );
}

/**
 * Guia o bot até o Bomb Site plantado (A ou B) via A* waypoint graph.
 */
export function getWaypointTowardPlantedSite(
  botPos: THREE.Vector3,
  plantedSite: 'A' | 'B',
  mode: DrillMode,
  isAlly: boolean
): THREE.Vector3 {
  const routes = getMapRoutes(mode);
  const sitePos = plantedSite === 'A' ? routes.siteA : routes.siteB;
  if (_activeBakedMesh) {
    const meshPath = findBakedMeshPath(_activeBakedMesh, botPos, sitePos);
    if (meshPath.length > 0) return meshPath[0];
  }
  const path = findNavPathIds(mode, botPos, sitePos);
  const graph = getMapNavGraph(mode);
  for (let i = 0; i < path.length; i++) {
    const node = graph.nodes[path[i]];
    if (node && distXZ(botPos, node) > 2.4) return node;
  }
  return pickApproachWaypoint(botPos, sitePos, mode, isAlly, 11.5);
}

/** Snapshot last-known position (frozen) — never live-track while hidden. */
export function setLastKnownPos(nav: BotNavData, pos: THREE.Vector3): void {
  if (!nav.lastKnownPos) nav.lastKnownPos = pos.clone();
  else nav.lastKnownPos.copy(pos);
}

/** True after doorway unstick escalates to a forced corridor repath. */
export function botNeedsRepath(nav: BotNavData, bot?: YardBotEntity): boolean {
  if (nav.unstickPhase >= 3) return true;
  if (bot?.root.userData?.botNeedsRepath) return true;
  return false;
}

export function clearBotNeedsRepath(nav: BotNavData, bot?: YardBotEntity): void {
  if (bot?.root.userData) bot.root.userData.botNeedsRepath = false;
  if (nav.unstickPhase >= 3) nav.unstickPhase = 1;
}

export function isTargetInFieldOfView(
  botPos: THREE.Vector3,
  botYaw: number,
  targetPos: THREE.Vector3,
  fovDegrees = 135
): boolean {
  const dx = targetPos.x - botPos.x;
  const dz = targetPos.z - botPos.z;
  const distSq = dx * dx + dz * dz;
  if (distSq < 72.25 || fovDegrees >= 350) return true;
  const dist = Math.sqrt(distSq);
  if (dist < 0.001) return true;
  const dot = (Math.sin(botYaw) * dx + Math.cos(botYaw) * dz) / dist;
  return dot >= Math.cos(THREE.MathUtils.degToRad(fovDegrees * 0.5));
}

export function checkBotLineOfSight(
  from: THREE.Vector3,
  to: THREE.Vector3,
  grenadeSystem: TacticalGrenadeSystem,
  colliders?: ColliderBox[],
  activeGlbCollider?: Dust2TriangleCollider | null
): boolean {
  if (grenadeSystem.isLineOfSightBlockedBySmoke(from, to)) return false;

  _losDir.subVectors(to, from);
  const dist = _losDir.length();
  if (dist < 0.001) return true;
  _losDir.multiplyScalar(1 / dist);

  // Dust2/Assault: until triangle collider is ready, refuse long "wallbang" sightlines.
  if (activeGlbCollider && !activeGlbCollider.ready) {
    return dist < 5.5;
  }

  if (activeGlbCollider && activeGlbCollider.ready) {
    const hitDist = activeGlbCollider.raycastDistance(from, _losDir, Math.max(0.2, dist - 0.35));
    if (hitDist !== null) return false;
  }

  if (!colliders || colliders.length === 0) {
    // No box colliders and no GLB hit → only trust short open-air LOS (Yard props missing).
    if (!activeGlbCollider) return dist < 8.0;
    return true;
  }

  const invX = 1 / (to.x - from.x || 0.000001);
  const invY = 1 / (to.y - from.y || 0.000001);
  const invZ = 1 / (to.z - from.z || 0.000001);

  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (c.maxY - c.minY < 0.8) continue;
    const t1 = (c.minX - from.x) * invX;
    const t2 = (c.maxX - from.x) * invX;
    const t3 = (c.minY - from.y) * invY;
    const t4 = (c.maxY - from.y) * invY;
    const t5 = (c.minZ - from.z) * invZ;
    const t6 = (c.maxZ - from.z) * invZ;
    const tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
    const tmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));
    if (tmax >= tmin && tmin >= 0 && tmin <= 1) return false;
  }
  return true;
}

export function isBotCollidingHorizontallyWithBoxes(
  x: number,
  z: number,
  yBottom: number,
  radius: number,
  colliders?: ColliderBox[]
): boolean {
  if (!colliders || colliders.length === 0) return false;
  const botTop = yBottom + 1.7;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (botTop <= c.minY || yBottom >= c.maxY - 0.45) continue;
    if (x + radius > c.minX && x - radius < c.maxX && z + radius > c.minZ && z - radius < c.maxZ) {
      return true;
    }
  }
  return false;
}

function tryStepDirection(
  prevX: number,
  prevZ: number,
  yBottom: number,
  dirX: number,
  dirZ: number,
  step: number,
  botRadius: number,
  colliders?: ColliderBox[],
  activeGlbCollider?: Dust2TriangleCollider | null
): { x: number; z: number; movedDist: number } {
  const candX = prevX + dirX * step;
  const candZ = prevZ + dirZ * step;
  let outX = prevX;
  let outZ = prevZ;

  if (activeGlbCollider && activeGlbCollider.ready) {
    activeGlbCollider.resolveHorizontal(candX, candZ, yBottom, 1.72, botRadius, _resolvedHoriz);
    outX = _resolvedHoriz.x;
    outZ = _resolvedHoriz.z;
  } else {
    if (!isBotCollidingHorizontallyWithBoxes(candX, prevZ, yBottom, botRadius, colliders)) outX = candX;
    if (!isBotCollidingHorizontallyWithBoxes(outX, candZ, yBottom, botRadius, colliders)) outZ = candZ;
  }

  return { x: outX, z: outZ, movedDist: Math.hypot(outX - prevX, outZ - prevZ) };
}

export function moveBotWithPhysics(
  bot: YardBotEntity,
  nav: BotNavData,
  moveTarget: THREE.Vector3,
  moveSpeed: number,
  dt: number,
  colliders?: ColliderBox[],
  activeGlbCollider?: Dust2TriangleCollider | null,
  lockLookAtTarget?: THREE.Vector3 | null
): void {
  const bPos = bot.root.position;
  const botRadius = 0.34;
  if (nav.jumpCooldown == null) nav.jumpCooldown = 0;
  if (nav.progressFailTimer == null) nav.progressFailTimer = 0;
  if (nav.unstickPhase == null) nav.unstickPhase = 0;
  if (nav.unstickTimer == null) nav.unstickTimer = 0;
  nav.jumpCooldown = Math.max(0, nav.jumpCooldown - dt);
  nav.unstickTimer = Math.max(0, nav.unstickTimer - dt);

  if (nav.avoidTimer > 0) nav.avoidTimer = Math.max(0, nav.avoidTimer - dt);

  const prevDistToGoal = Math.hypot(moveTarget.x - bPos.x, moveTarget.z - bPos.z);
  let horizDist = prevDistToGoal;

  if (moveSpeed > 0.05) {
    _navDir.subVectors(moveTarget, bPos);
    _navDir.y = 0;
    const dist = _navDir.length();
    horizDist = dist;
    if (dist > 0.1) {
      _navDir.normalize();

      let moveDirX = _navDir.x;
      let moveDirZ = _navDir.z;

      // Escalating unstick steering (doorways / corridors).
      if (nav.unstickPhase === 1) {
        // Sidestep perpendicular to goal.
        const side = nav.strafeDir >= 0 ? 1 : -1;
        moveDirX = -_navDir.z * side * 0.85 + _navDir.x * 0.25;
        moveDirZ = _navDir.x * side * 0.85 + _navDir.z * 0.25;
        const len = Math.hypot(moveDirX, moveDirZ) || 1;
        moveDirX /= len;
        moveDirZ /= len;
      } else if (nav.unstickPhase === 2) {
        // Backtrack then peel off.
        const side = nav.strafeDir >= 0 ? 1 : -1;
        moveDirX = -_navDir.x * 0.75 - _navDir.z * side * 0.55;
        moveDirZ = -_navDir.z * 0.75 + _navDir.x * side * 0.55;
        const len = Math.hypot(moveDirX, moveDirZ) || 1;
        moveDirX /= len;
        moveDirZ /= len;
      } else if (nav.avoidTimer > 0 && Math.abs(nav.avoidAngle) > 0.01) {
        const cosA = Math.cos(nav.avoidAngle);
        const sinA = Math.sin(nav.avoidAngle);
        moveDirX = _navDir.x * cosA - _navDir.z * sinA;
        moveDirZ = _navDir.x * sinA + _navDir.z * cosA;
      }

      const step = Math.min(dist, moveSpeed * dt);
      const prevX = bPos.x;
      const prevZ = bPos.z;

      let attempt = tryStepDirection(prevX, prevZ, bPos.y, moveDirX, moveDirZ, step, botRadius, colliders, activeGlbCollider);

      if (attempt.movedDist < step * 0.55) {
        // Prefer steers that still advance toward the goal (not just any free space).
        let best = attempt;
        let bestScore = -Infinity;
        for (let i = 0; i < STEER_TEST_ANGLES.length; i++) {
          const ang = STEER_TEST_ANGLES[i] * (nav.strafeDir >= 0 ? 1 : -1);
          const cosA = Math.cos(ang);
          const sinA = Math.sin(ang);
          _steerDir.set(_navDir.x * cosA - _navDir.z * sinA, 0, _navDir.x * sinA + _navDir.z * cosA);
          const alt = tryStepDirection(prevX, prevZ, bPos.y, _steerDir.x, _steerDir.z, step, botRadius, colliders, activeGlbCollider);
          if (alt.movedDist < step * 0.28) continue;
          const newDist = Math.hypot(moveTarget.x - alt.x, moveTarget.z - alt.z);
          const progress = prevDistToGoal - newDist;
          const score = alt.movedDist * 1.2 + progress * 2.4;
          if (score > bestScore) {
            bestScore = score;
            best = alt;
            moveDirX = _steerDir.x;
            moveDirZ = _steerDir.z;
            nav.avoidAngle = ang;
            nav.avoidTimer = 0.42;
          }
        }
        attempt = best;
      }

      bPos.x = attempt.x;
      bPos.z = attempt.z;

      const newDistToGoal = Math.hypot(moveTarget.x - bPos.x, moveTarget.z - bPos.z);
      const madeProgress = newDistToGoal < prevDistToGoal - 0.015 || attempt.movedDist > step * 0.45;

      if (attempt.movedDist < step * 0.28 || !madeProgress) {
        nav.stuckTimer += dt;
        nav.progressFailTimer += dt;
      } else {
        nav.stuckTimer = Math.max(0, nav.stuckTimer - dt * 3.0);
        nav.progressFailTimer = Math.max(0, nav.progressFailTimer - dt * 2.2);
        if (nav.progressFailTimer < 0.35 && nav.unstickPhase > 0 && nav.unstickTimer <= 0) {
          nav.unstickPhase = 0;
        }
      }

      // Escalate unstick when grinding a doorway/wall.
      if (nav.progressFailTimer > 0.55 && nav.unstickTimer <= 0) {
        nav.unstickPhase = Math.min(3, (nav.unstickPhase || 0) + 1);
        nav.unstickTimer = nav.unstickPhase === 1 ? 0.55 : nav.unstickPhase === 2 ? 0.7 : 0.35;
        nav.strafeDir *= -1;
        nav.progressFailTimer = 0.15;
        bot.root.userData.botNeedsRepath = nav.unstickPhase >= 3;
        if (nav.unstickPhase >= 3) {
          nav.unstickPhase = 1;
          if (nav.waypoints.length > 0) {
            // Skip jammed node — jump to a farther waypoint on the lane.
            nav.wpIndex = Math.min(
              nav.waypoints.length - 1,
              nav.wpIndex + 1 + Math.floor(Math.random() * 2)
            );
          }
        }
      } else if (nav.stuckTimer > 0.4 && nav.unstickTimer <= 0) {
        nav.stuckTimer = 0;
        nav.strafeDir *= -1;
        nav.avoidAngle = nav.strafeDir * 1.35;
        nav.avoidTimer = 0.65;
        nav.unstickPhase = Math.max(1, nav.unstickPhase || 1);
        nav.unstickTimer = 0.5;
      }

      if (!lockLookAtTarget) {
        const lookAngle = Math.atan2(moveDirX, moveDirZ);
        bot.root.rotation.y = dampAngleShortest(bot.root.rotation.y, lookAngle, 10.5, dt);
      }
    }
  } else {
    nav.progressFailTimer = Math.max(0, nav.progressFailTimer - dt * 2);
  }

  if (lockLookAtTarget) {
    const enemyAngle = Math.atan2(lockLookAtTarget.x - bPos.x, lockLookAtTarget.z - bPos.z);
    bot.root.rotation.y = dampAngleShortest(bot.root.rotation.y, enemyAngle, 14.0, dt);
  }

  const floorY =
    activeGlbCollider && activeGlbCollider.ready
      ? activeGlbCollider.getGroundHeight(bPos.x, bPos.y + 0.35, bPos.z)
      : 0;

  const grounded =
    bPos.y <= floorY + 0.14 && Math.abs(nav.verticalVel) < 0.35;
  // Step-up toward higher waypoint / hop when stuck on a lip.
  if (grounded && nav.jumpCooldown <= 0 && moveSpeed > 0.05) {
    const heightDelta = moveTarget.y - floorY;
    const wantStepUp = heightDelta > 0.55 && horizDist < 3.2 && horizDist > 0.25;
    const wantStuckHop = (nav.stuckTimer > 0.22 || nav.unstickPhase >= 2) && heightDelta > -0.2;
    if (wantStepUp || wantStuckHop) {
      nav.verticalVel = wantStepUp ? 6.4 : 5.2;
      nav.jumpCooldown = 0.9;
      bot.root.userData.botJumpPulse = true;
    }
  }

  if (bPos.y <= floorY + 0.52 && bPos.y >= floorY - 0.6 && nav.verticalVel <= 0.05) {
    bPos.y = THREE.MathUtils.damp(bPos.y, floorY, 18, dt);
    nav.verticalVel = 0;
  } else if (nav.verticalVel > 0.05 || bPos.y > floorY + 0.02) {
    nav.verticalVel = Math.max(-18.0, nav.verticalVel - 15.5 * dt);
    bPos.y = Math.max(floorY, bPos.y + nav.verticalVel * dt);
    if (bPos.y <= floorY + 0.02 && nav.verticalVel <= 0) {
      bPos.y = floorY;
      nav.verticalVel = 0;
    }
  } else {
    bPos.y = floorY;
    nav.verticalVel = 0;
  }
}
