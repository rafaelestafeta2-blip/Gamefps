import * as THREE from 'three';
import { DrillMode } from '../types/game';
import { Dust2TriangleCollider } from './dust2Collider';
import { ColliderBox } from './levelBuilder';

/**
 * Collision-baked walkable grid (practical real navmesh).
 * Dust2/Assault: sample triangle floor + wall resolve.
 * Yard/etc: sample box colliders over tactical bounds.
 */
export interface BakedNavMesh {
  key: string;
  cellSize: number;
  originX: number;
  originZ: number;
  cols: number;
  rows: number;
  walkable: Uint8Array;
  height: Float32Array;
}

const _resolved = { x: 0, z: 0 };
const _meshCache = new Map<string, BakedNavMesh>();
const _pathScratch: number[] = [];
let _cameFrom = new Int32Array(0);
let _gScore = new Float32Array(0);
let _fScore = new Float32Array(0);
let _openFlags = new Uint8Array(0);
let _allocN = 0;

const NEIGHBOR_OFFS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, 1.42],
  [1, -1, 1.42],
  [-1, 1, 1.42],
  [-1, -1, 1.42],
] as const;

function ensurePathBuffers(n: number): void {
  if (n <= _allocN) return;
  _allocN = n;
  _cameFrom = new Int32Array(n);
  _gScore = new Float32Array(n);
  _fScore = new Float32Array(n);
  _openFlags = new Uint8Array(n);
}

function idx(mesh: BakedNavMesh, c: number, r: number): number {
  return r * mesh.cols + c;
}

function cellCenter(mesh: BakedNavMesh, c: number, r: number, out: THREE.Vector3): THREE.Vector3 {
  const x = mesh.originX + (c + 0.5) * mesh.cellSize;
  const z = mesh.originZ + (r + 0.5) * mesh.cellSize;
  const y = mesh.height[idx(mesh, c, r)] || 0;
  return out.set(x, y, z);
}

function worldToCell(
  mesh: BakedNavMesh,
  x: number,
  z: number
): { c: number; r: number } {
  const c = Math.floor((x - mesh.originX) / mesh.cellSize);
  const r = Math.floor((z - mesh.originZ) / mesh.cellSize);
  return {
    c: Math.max(0, Math.min(mesh.cols - 1, c)),
    r: Math.max(0, Math.min(mesh.rows - 1, r)),
  };
}

function nearestWalkable(
  mesh: BakedNavMesh,
  x: number,
  z: number
): { c: number; r: number } | null {
  const base = worldToCell(mesh, x, z);
  if (mesh.walkable[idx(mesh, base.c, base.r)]) return base;
  let best: { c: number; r: number } | null = null;
  let bestD = Infinity;
  const maxR = 6;
  for (let rad = 1; rad <= maxR; rad++) {
    for (let dc = -rad; dc <= rad; dc++) {
      for (let dr = -rad; dr <= rad; dr++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
        const c = base.c + dc;
        const r = base.r + dr;
        if (c < 0 || r < 0 || c >= mesh.cols || r >= mesh.rows) continue;
        if (!mesh.walkable[idx(mesh, c, r)]) continue;
        const cx = mesh.originX + (c + 0.5) * mesh.cellSize;
        const cz = mesh.originZ + (r + 0.5) * mesh.cellSize;
        const d = Math.hypot(cx - x, cz - z);
        if (d < bestD) {
          bestD = d;
          best = { c, r };
        }
      }
    }
    if (best) return best;
  }
  return null;
}

function isBoxBlocked(
  x: number,
  z: number,
  y: number,
  radius: number,
  colliders: ColliderBox[]
): boolean {
  const top = y + 1.55;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (c.maxY - c.minY < 0.85) continue;
    if (top <= c.minY || y >= c.maxY - 0.4) continue;
    if (x + radius > c.minX && x - radius < c.maxX && z + radius > c.minZ && z - radius < c.maxZ) {
      return true;
    }
  }
  return false;
}

function bakeFromGlb(
  key: string,
  collider: Dust2TriangleCollider,
  cellSize: number,
  seedPoints: THREE.Vector3[]
): BakedNavMesh {
  const pad = 2.0;
  const minX = collider.worldBounds.min.x + pad;
  const maxX = collider.worldBounds.max.x - pad;
  const minZ = collider.worldBounds.min.z + pad;
  const maxZ = collider.worldBounds.max.z - pad;
  const cols = Math.max(4, Math.ceil((maxX - minX) / cellSize));
  const rows = Math.max(4, Math.ceil((maxZ - minZ) / cellSize));
  // Cap grid for mobile — coarsen if huge.
  let cs = cellSize;
  let cCols = cols;
  let cRows = rows;
  if (cCols * cRows > 5200) {
    const scale = Math.sqrt((cCols * cRows) / 5200);
    cs = cellSize * scale;
    cCols = Math.max(4, Math.ceil((maxX - minX) / cs));
    cRows = Math.max(4, Math.ceil((maxZ - minZ) / cs));
  }

  const mesh: BakedNavMesh = {
    key,
    cellSize: cs,
    originX: minX,
    originZ: minZ,
    cols: cCols,
    rows: cRows,
    walkable: new Uint8Array(cCols * cRows),
    height: new Float32Array(cCols * cRows),
  };

  const probeY = 48;
  for (let r = 0; r < cRows; r++) {
    for (let c = 0; c < cCols; c++) {
      const x = minX + (c + 0.5) * cs;
      const z = minZ + (r + 0.5) * cs;
      const h = collider.getGroundHeight(x, probeY, z);
      const i = idx(mesh, c, r);
      mesh.height[i] = h;
      // No floor sample (empty bucket / miss) echoes probeY.
      if (Math.abs(h - probeY) < 0.05 || h < -5 || h > 45) {
        mesh.walkable[i] = 0;
        continue;
      }
      // Standing inside a wall: horizontal resolve snaps hard away from center.
      collider.resolveHorizontal(x, z, h, 1.72, 0.34, _resolved);
      const snap = Math.hypot(_resolved.x - x, _resolved.z - z);
      if (snap > 0.28) {
        mesh.walkable[i] = 0;
        continue;
      }
      mesh.walkable[i] = 1;
    }
  }

  // Force tactical seeds walkable (sites / lane nodes).
  for (let s = 0; s < seedPoints.length; s++) {
    const p = seedPoints[s];
    const cell = worldToCell(mesh, p.x, p.z);
    const i = idx(mesh, cell.c, cell.r);
    mesh.walkable[i] = 1;
    mesh.height[i] = collider.getGroundHeight(p.x, p.y + 2.5, p.z);
  }

  return mesh;
}

function bakeFromBoxes(
  key: string,
  colliders: ColliderBox[],
  cellSize: number,
  seedPoints: THREE.Vector3[]
): BakedNavMesh {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let s = 0; s < seedPoints.length; s++) {
    const p = seedPoints[s];
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  if (!Number.isFinite(minX)) {
    minX = -30;
    maxX = 30;
    minZ = -30;
    maxZ = 30;
  }
  minX -= 8;
  maxX += 8;
  minZ -= 8;
  maxZ += 8;

  const cols = Math.max(4, Math.ceil((maxX - minX) / cellSize));
  const rows = Math.max(4, Math.ceil((maxZ - minZ) / cellSize));
  const mesh: BakedNavMesh = {
    key,
    cellSize,
    originX: minX,
    originZ: minZ,
    cols,
    rows,
    walkable: new Uint8Array(cols * rows),
    height: new Float32Array(cols * rows),
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = minX + (c + 0.5) * cellSize;
      const z = minZ + (r + 0.5) * cellSize;
      const i = idx(mesh, c, r);
      mesh.height[i] = 0;
      mesh.walkable[i] = isBoxBlocked(x, z, 0, 0.36, colliders) ? 0 : 1;
    }
  }

  for (let s = 0; s < seedPoints.length; s++) {
    const p = seedPoints[s];
    const cell = worldToCell(mesh, p.x, p.z);
    mesh.walkable[idx(mesh, cell.c, cell.r)] = 1;
  }

  return mesh;
}

/**
 * Ensure a collision-baked navmesh exists for this mode/collider state.
 * Re-bakes once when GLB collider becomes ready.
 */
export function ensureBakedNavMesh(
  mode: DrillMode,
  seedPoints: THREE.Vector3[],
  activeGlbCollider?: Dust2TriangleCollider | null,
  colliders?: ColliderBox[]
): BakedNavMesh | null {
  const glbReady = Boolean(activeGlbCollider && activeGlbCollider.ready);
  const key = glbReady
    ? `${mode}:glb:${activeGlbCollider!.triangleCount}`
    : `${mode}:box:${colliders?.length || 0}`;
  const cached = _meshCache.get(key);
  if (cached) return cached;

  let mesh: BakedNavMesh;
  if (glbReady && activeGlbCollider) {
    mesh = bakeFromGlb(key, activeGlbCollider, 1.85, seedPoints);
  } else if (colliders && colliders.length > 0) {
    mesh = bakeFromBoxes(key, colliders, 1.6, seedPoints);
  } else {
    mesh = bakeFromBoxes(key, [], 2.0, seedPoints);
  }
  _meshCache.set(key, mesh);
  return mesh;
}

function canStep(mesh: BakedNavMesh, from: number, to: number): boolean {
  if (!mesh.walkable[to]) return false;
  const dy = Math.abs(mesh.height[to] - mesh.height[from]);
  return dy <= 0.95;
}

/** A* on baked collision grid. Returns world waypoints (skip start). */
export function findBakedMeshPath(
  mesh: BakedNavMesh,
  from: THREE.Vector3,
  to: THREE.Vector3,
  maxNodes = 1800
): THREE.Vector3[] {
  const start = nearestWalkable(mesh, from.x, from.z);
  const goal = nearestWalkable(mesh, to.x, to.z);
  if (!start || !goal) return [];
  const startI = idx(mesh, start.c, start.r);
  const goalI = idx(mesh, goal.c, goal.r);
  if (startI === goalI) return [];

  const n = mesh.cols * mesh.rows;
  ensurePathBuffers(n);
  _cameFrom.fill(-1, 0, n);
  _gScore.fill(1e12, 0, n);
  _fScore.fill(1e12, 0, n);
  _openFlags.fill(0, 0, n);

  const open: number[] = [startI];
  _openFlags[startI] = 1;
  _gScore[startI] = 0;
  const goalC = goal.c;
  const goalR = goal.r;
  _fScore[startI] = Math.hypot(start.c - goalC, start.r - goalR);

  let expanded = 0;
  while (open.length > 0 && expanded < maxNodes) {
    expanded++;
    let bestOpen = 0;
    for (let i = 1; i < open.length; i++) {
      if (_fScore[open[i]] < _fScore[open[bestOpen]]) bestOpen = i;
    }
    const current = open[bestOpen];
    open[bestOpen] = open[open.length - 1];
    open.pop();
    _openFlags[current] = 0;

    if (current === goalI) {
      _pathScratch.length = 0;
      let c = current;
      while (c >= 0) {
        _pathScratch.push(c);
        c = _cameFrom[c];
      }
      _pathScratch.reverse();
      const out: THREE.Vector3[] = [];
      // Skip start; thin path to every ~2 cells for smoother follow.
      for (let i = 1; i < _pathScratch.length; i++) {
        if (i < _pathScratch.length - 1 && i % 2 === 0) continue;
        const id = _pathScratch[i];
        const cc = id % mesh.cols;
        const rr = (id / mesh.cols) | 0;
        out.push(cellCenter(mesh, cc, rr, new THREE.Vector3()).clone());
      }
      return out;
    }

    const cc = current % mesh.cols;
    const rr = (current / mesh.cols) | 0;
    for (let nIdx = 0; nIdx < NEIGHBOR_OFFS.length; nIdx++) {
      const [dc, dr, costMul] = NEIGHBOR_OFFS[nIdx];
      const nc = cc + dc;
      const nr = rr + dr;
      if (nc < 0 || nr < 0 || nc >= mesh.cols || nr >= mesh.rows) continue;
      const ni = idx(mesh, nc, nr);
      if (!canStep(mesh, current, ni)) continue;
      const tent = _gScore[current] + costMul;
      if (tent >= _gScore[ni]) continue;
      _cameFrom[ni] = current;
      _gScore[ni] = tent;
      _fScore[ni] = tent + Math.hypot(nc - goalC, nr - goalR);
      if (!_openFlags[ni]) {
        _openFlags[ni] = 1;
        open.push(ni);
      }
    }
  }
  return [];
}

export function getBakedMeshCellPoint(
  mesh: BakedNavMesh,
  x: number,
  z: number,
  out: THREE.Vector3
): THREE.Vector3 | null {
  const cell = nearestWalkable(mesh, x, z);
  if (!cell) return null;
  return cellCenter(mesh, cell.c, cell.r, out);
}
