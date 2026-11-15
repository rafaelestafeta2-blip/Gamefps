import * as THREE from 'three';

export interface Dust2TriEntry {
  a: THREE.Vector3;
  b: THREE.Vector3;
  c: THREE.Vector3;
  normal: THREE.Vector3;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface LadderZone {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

const _tri = new THREE.Triangle();
const _pt = new THREE.Vector3();
const _closest = new THREE.Vector3();
const _ray = new THREE.Ray();
const _hitPt = new THREE.Vector3();

/**
 * High-performance 2D Spatial Hash Triangle Collider for CS de_dust2 & cs_assault (.glb).
 * Zero per-frame GC allocations — designed for 60 FPS Android mobile WebGL.
 */
export class Dust2TriangleCollider {
  private readonly cellSize = 3.0;
  private floorGrid = new Map<string, Dust2TriEntry[]>();
  private wallGrid = new Map<string, Dust2TriEntry[]>();
  public boundingBoxes: THREE.Box3[] = [];
  public worldBounds = new THREE.Box3();
  public ladders: LadderZone[] = [];
  public triangleCount = 0;
  public ready = false;
  public radarDataUrl = '';

  private cellKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  public clear(): void {
    this.floorGrid.clear();
    this.wallGrid.clear();
    this.boundingBoxes.length = 0;
    this.ladders.length = 0;
    this.worldBounds.makeEmpty();
    this.triangleCount = 0;
    this.ready = false;
    this.radarDataUrl = '';
  }

  public buildFromGroup(rootGroup: THREE.Object3D, customLadders: LadderZone[] = []): void {
    this.clear();
    this.ladders = customLadders.map((l) => ({ ...l }));
    rootGroup.updateMatrixWorld(true);

    const allFloors: Dust2TriEntry[] = [];
    const allWalls: Dust2TriEntry[] = [];
    let totalTris = 0;

    rootGroup.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || !child.geometry) return;
      if (child.userData.targetId || child.userData.ignoreCollider) return;

      const geom = child.geometry as THREE.BufferGeometry;
      if (!geom.boundingBox) geom.computeBoundingBox();
      if (geom.boundingBox) {
        const worldBox = geom.boundingBox.clone().applyMatrix4(child.matrixWorld);
        this.boundingBoxes.push(worldBox);
        this.worldBounds.union(worldBox);
      }

      const posAttr = geom.attributes.position;
      if (!posAttr) return;

      const indexAttr = geom.index;
      const matWorld = child.matrixWorld;
      const triCount = indexAttr
        ? Math.floor(indexAttr.count / 3)
        : Math.floor(posAttr.count / 3);
      totalTris += triCount;

      for (let i = 0; i < triCount; i++) {
        const i0 = indexAttr ? indexAttr.getX(i * 3) : i * 3;
        const i1 = indexAttr ? indexAttr.getX(i * 3 + 1) : i * 3 + 1;
        const i2 = indexAttr ? indexAttr.getX(i * 3 + 2) : i * 3 + 2;

        const a = new THREE.Vector3().fromBufferAttribute(posAttr, i0).applyMatrix4(matWorld);
        const b = new THREE.Vector3().fromBufferAttribute(posAttr, i1).applyMatrix4(matWorld);
        const c = new THREE.Vector3().fromBufferAttribute(posAttr, i2).applyMatrix4(matWorld);

        const e1 = new THREE.Vector3().subVectors(b, a);
        const e2 = new THREE.Vector3().subVectors(c, a);
        const normal = new THREE.Vector3().crossVectors(e1, e2);
        const areaSq = normal.lengthSq();
        if (areaSq < 1e-6) continue;
        const area = Math.sqrt(areaSq) * 0.5;
        normal.normalize();

        const minX = Math.min(a.x, b.x, c.x);
        const maxX = Math.max(a.x, b.x, c.x);
        const minY = Math.min(a.y, b.y, c.y);
        const maxY = Math.max(a.y, b.y, c.y);
        const minZ = Math.min(a.z, b.z, c.z);
        const maxZ = Math.max(a.z, b.z, c.z);

        const spanX = maxX - minX;
        const spanZ = maxZ - minZ;
        if (
          area < 0.26 &&
          spanX < 1.05 &&
          spanZ < 1.05 &&
          this.isBoxInLadderZone(minX, maxX, minY, maxY, minZ, maxZ)
        ) {
          continue;
        }

        const entry: Dust2TriEntry = {
          a,
          b,
          c,
          normal,
          minX,
          maxX,
          minY,
          maxY,
          minZ,
          maxZ,
        };

        const absNy = Math.abs(normal.y);
        const minCx = Math.floor(entry.minX / this.cellSize);
        const maxCx = Math.floor(entry.maxX / this.cellSize);
        const minCz = Math.floor(entry.minZ / this.cellSize);
        const maxCz = Math.floor(entry.maxZ / this.cellSize);

        if (absNy >= 0.45) {
          allFloors.push(entry);
          for (let cx = minCx; cx <= maxCx; cx++) {
            for (let cz = minCz; cz <= maxCz; cz++) {
              const key = this.cellKey(cx, cz);
              let bucket = this.floorGrid.get(key);
              if (!bucket) {
                bucket = [];
                this.floorGrid.set(key, bucket);
              }
              bucket.push(entry);
            }
          }
        }

        if (absNy < 0.72) {
          allWalls.push(entry);
          for (let cx = minCx; cx <= maxCx; cx++) {
            for (let cz = minCz; cz <= maxCz; cz++) {
              const key = this.cellKey(cx, cz);
              let bucket = this.wallGrid.get(key);
              if (!bucket) {
                bucket = [];
                this.wallGrid.set(key, bucket);
              }
              bucket.push(entry);
            }
          }
        }
      }
    });

    this.triangleCount = totalTris;
    // Mark ready BEFORE radar bake. Radar can take tens of seconds on Eastern
    // (~1.3M floors) and used to leave ready=false while Loading 2 timed out and
    // startGame disposed the in-flight GLB → empty arena / white void.
    this.ready = true;
    try {
      this.generateTopDownRadarDataUrl(allFloors, allWalls);
    } catch {
      this.radarDataUrl = '';
    }
  }

  private isBoxInLadderZone(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    minZ: number,
    maxZ: number
  ): boolean {
    for (let i = 0; i < this.ladders.length; i++) {
      const l = this.ladders[i];
      if (
        maxX >= l.minX &&
        minX <= l.maxX &&
        maxZ >= l.minZ &&
        minZ <= l.maxZ &&
        maxY >= l.minY &&
        minY <= l.maxY
      ) {
        return true;
      }
    }
    return false;
  }

  public getActiveLadder(x: number, yBottom: number, z: number): LadderZone | null {
    if (!this.ready || this.ladders.length === 0) return null;
    for (let i = 0; i < this.ladders.length; i++) {
      const l = this.ladders[i];
      if (
        x >= l.minX &&
        x <= l.maxX &&
        z >= l.minZ &&
        z <= l.maxZ &&
        yBottom >= l.minY - 0.5 &&
        yBottom <= l.maxY + 0.08
      ) {
        return l;
      }
    }
    return null;
  }

  /**
   * Max Y considered a walkable floor (not a skybox/prop spike).
   * Dust2 used a hard 10.5m cap — that dropped players UNDER Industria/Hangar/
   * Eastern/Mirage walkables (post-lift roofs/courts sit at 12–45m).
   */
  private walkableYCap(): number {
    if (!this.worldBounds.isEmpty()) {
      return this.worldBounds.max.y + 0.5;
    }
    return 80;
  }

  /**
   * Computes exact barycentric Y height on floor/ramp/stair triangles under (x, z).
   * Ignores downward-facing ceiling triangles (`normal.y < -0.45`) above feet so climbing
   * near a ceiling never snaps the player onto the roof of the map, and rescues the player
   * onto the nearest walkable floor above if `yBottom` ever drops below the terrain.
   */
  public getGroundHeight(x: number, yBottom: number, z: number): number {
    if (!this.ready) return yBottom;

    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    // Drop sky-lid / roof-cap band (Mirage lid ≈ max.y) — same cut as snapToWalkableFloor.
    const skyCut = !this.worldBounds.isEmpty()
      ? this.worldBounds.max.y - 1.5
      : this.walkableYCap();
    let bestY = -999;
    let bestFlippedY = -999;
    let closestWalkableAboveY = 999;
    let closestFlippedAboveY = 999;
    let fallbackHighestFloorY = -999;

    // Search home cell + 8-neighborhood (spawns near cell borders / thin floors).
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const bucket = this.floorGrid.get(this.cellKey(cx + dx, cz + dz));
        if (!bucket || bucket.length === 0) continue;

        for (let i = 0; i < bucket.length; i++) {
          const t = bucket[i];
          if (
            x < t.minX - 0.05 ||
            x > t.maxX + 0.05 ||
            z < t.minZ - 0.05 ||
            z > t.maxZ + 0.05
          ) {
            continue;
          }

          const yOnTri = this.sampleTriangleY(t, x, z);
          if (yOnTri === null) continue;
          if (yOnTri > skyCut) continue;
          const upward = t.normal.y >= 0.45;
          // Unity floors often wind downward. Use them only when this column
          // has no real upward street — a ceiling stays a ceiling if a floor exists.
          const flippedFloor = t.normal.y <= -0.45;
          if (!upward && !flippedFloor) continue;

          if (flippedFloor) {
            if (yOnTri > yBottom + 0.05 && yOnTri < closestFlippedAboveY) {
              closestFlippedAboveY = yOnTri;
            }
            if (
              yOnTri <= yBottom + 0.65 &&
              yOnTri >= yBottom - 0.85 &&
              yOnTri > bestFlippedY
            ) {
              bestFlippedY = yOnTri;
            }
            continue;
          }

          if (yOnTri > yBottom + 0.05 && yOnTri < closestWalkableAboveY) {
            closestWalkableAboveY = yOnTri;
          }

          if (yOnTri > fallbackHighestFloorY) {
            fallbackHighestFloorY = yOnTri;
          }

          // Support surface near feet (step-up ≤0.65, step-down ≤0.85).
          if (
            yOnTri <= yBottom + 0.65 &&
            yOnTri >= yBottom - 0.85 &&
            yOnTri > bestY
          ) {
            bestY = yOnTri;
          }
        }
      }
    }

    // UNDER a walkable floor with no near-feet support → rescue UP (FrontSide white void).
    // Old order returned deep AABB-min slabs (y≈0.09) before closestWalkableAbove and
    // glued the player under Industria/Hangar/Eastern/Mirage streets every movement tick.
    // Cap the jump so a hangar roof ~14m up is not treated as the street.
    if (
      closestWalkableAboveY < 900 &&
      bestY < -900 &&
      closestWalkableAboveY - yBottom < 12
    ) {
      return closestWalkableAboveY;
    }
    if (
      closestWalkableAboveY < 900 &&
      bestY > -900 &&
      bestY < yBottom - 0.15 &&
      closestWalkableAboveY - yBottom < 12
    ) {
      return closestWalkableAboveY;
    }
    if (bestY > -900) return bestY;
    if (closestWalkableAboveY < 900 && closestWalkableAboveY - yBottom < 12) {
      return closestWalkableAboveY;
    }
    if (
      fallbackHighestFloorY > -900 &&
      fallbackHighestFloorY <= skyCut &&
      fallbackHighestFloorY - yBottom < 12
    ) {
      return fallbackHighestFloorY;
    }
    // A roof in the same column must not hide a flipped Unity street under it.
    const upwardNear =
      bestY > -900 ||
      (closestWalkableAboveY < 900 && closestWalkableAboveY - yBottom < 12) ||
      (fallbackHighestFloorY > -900 &&
        Math.abs(fallbackHighestFloorY - yBottom) < 12);
    if (!upwardNear) {
      if (bestFlippedY > -900) return bestFlippedY;
      if (
        closestFlippedAboveY < 900 &&
        closestFlippedAboveY - yBottom < 12
      ) {
        return closestFlippedAboveY;
      }
    }
    if (!this.worldBounds.isEmpty() && yBottom < this.worldBounds.min.y - 1) {
      return Math.max(yBottom, this.worldBounds.min.y);
    }
    return yBottom;
  }

  /**
   * Resolve a playable spawn inside the collider footprint (XZ + Y).
   * Prefer hint; if that column has no street-band floor, search nearby then AABB.
   */
  public findPlayableSpawn(
    hintX: number,
    hintZ: number,
    hintY = 0.35
  ): { x: number; y: number; z: number } {
    if (!this.ready || this.worldBounds.isEmpty()) {
      return { x: hintX, y: hintY, z: hintZ };
    }

    const skyCut = this.worldBounds.max.y - 1.5;
    const streetMax = Math.min(
      skyCut,
      Math.max(hintY + 6, this.worldBounds.min.y + 10)
    );

    const tryPoint = (x: number, z: number): number | null => {
      const y = this.snapToWalkableFloor(x, z, hintY);
      if (!Number.isFinite(y)) return null;
      if (y < this.worldBounds.min.y - 0.1 || y > streetMax) return null;
      // Must actually have upward floor support at result.
      const gh = this.getGroundHeight(x, y + 0.1, z);
      if (Math.abs(gh - y) > 0.75) return null;
      return y;
    };

    const atHint = tryPoint(hintX, hintZ);
    if (atHint !== null) return { x: hintX, y: atHint, z: hintZ };

    const radii = [4, 8, 12, 20, 32, 48];
    let best: { x: number; y: number; z: number; dist: number } | null = null;
    for (const r of radii) {
      for (let ang = 0; ang < Math.PI * 2; ang += Math.PI / 6) {
        const x = hintX + Math.cos(ang) * r;
        const z = hintZ + Math.sin(ang) * r;
        if (
          x < this.worldBounds.min.x + 1 ||
          x > this.worldBounds.max.x - 1 ||
          z < this.worldBounds.min.z + 1 ||
          z > this.worldBounds.max.z - 1
        ) {
          continue;
        }
        const y = tryPoint(x, z);
        if (y === null) continue;
        const dist = Math.hypot(x - hintX, z - hintZ);
        if (!best || dist < best.dist) best = { x, y, z, dist };
      }
      if (best && best.dist <= r + 0.1) break;
    }
    if (best) return { x: best.x, y: best.y, z: best.z };

    // Last resort: AABB center column.
    const cx = (this.worldBounds.min.x + this.worldBounds.max.x) * 0.5;
    const cz = (this.worldBounds.min.z + this.worldBounds.max.z) * 0.5;
    const cy = tryPoint(cx, cz);
    if (cy !== null) return { x: cx, y: cy, z: cz };

    const snapped = this.snapToWalkableFloor(hintX, hintZ, hintY);
    // Roof-only columns used to glue bots ~14m up, so they read as floating in the sky.
    const y = snapped <= hintY + 6 ? snapped : hintY;
    return { x: hintX, y, z: hintZ };
  }

  /**
   * Snap spawn/bot onto the correct walkable floor at (x,z).
   *
   * IMPORTANT: probing via getGroundHeight(from AABB max) picks the *highest*
   * triangle (roofs / Mirage sky-lid ≈ max.y) — that left players on lids or,
   * when collider wasn't ready yet, at authored Y under FrontSide floors
   * (white void). Collect upward floors, drop sky-lid band, pick closest to hint.
   */
  public snapToWalkableFloor(
    x: number,
    z: number,
    hintY = 0.2
  ): number {
    if (!this.ready) return hintY;

    const skyCut = !this.worldBounds.isEmpty()
      ? this.worldBounds.max.y - 1.5
      : 1e9;
    const minY = !this.worldBounds.isEmpty()
      ? this.worldBounds.min.y - 0.25
      : -5;

    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    const candidates: number[] = [];
    const flipped: number[] = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const bucket = this.floorGrid.get(this.cellKey(cx + dx, cz + dz));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const t = bucket[i];
          const upward = t.normal.y >= 0.45;
          const flippedFloor = t.normal.y <= -0.45;
          if (!upward && !flippedFloor) continue;
          if (
            x < t.minX - 0.08 ||
            x > t.maxX + 0.08 ||
            z < t.minZ - 0.08 ||
            z > t.maxZ + 0.08
          ) {
            continue;
          }
          const yOnTri = this.sampleTriangleY(t, x, z);
          if (yOnTri === null) continue;
          if (yOnTri < minY || yOnTri > skyCut) continue;
          if (flippedFloor) flipped.push(yOnTri);
          else candidates.push(yOnTri);
        }
      }
    }

    const pick = (list: number[]): number | null => {
      if (list.length === 0) return null;
      list.sort((a, b) => a - b);
      let best = list[0];
      let bestDist = Math.abs(best - hintY);
      for (let i = 1; i < list.length; i++) {
        const d = Math.abs(list[i] - hintY);
        if (d < bestDist) {
          best = list[i];
          bestDist = d;
        }
      }
      // Hint below every surface: take the lowest, but not a roof far above the feet.
      if (hintY < list[0] - 0.75) {
        return list[0] - hintY <= 12 ? list[0] : null;
      }
      return bestDist <= 12 ? best : null;
    };

    const upwardPick = pick(candidates);
    if (upwardPick !== null) return upwardPick;
    const flippedPick = pick(flipped);
    if (flippedPick !== null) return flippedPick;
    return hintY;
  }


  /**
   * Clamps upward vertical motion (`nextY > prevY`) so the player's head (`nextY + playerHeight`)
   * never clips upward through a ceiling or the skybox roof.
   */
  public clampCeilingHeight(
    x: number,
    prevY: number,
    nextY: number,
    z: number,
    playerHeight: number
  ): number {
    if (!this.ready || nextY <= prevY) return nextY;
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    const bucket = this.floorGrid.get(this.cellKey(cx, cz));
    if (!bucket) return nextY;

    let clampedY = nextY;
    for (let i = 0; i < bucket.length; i++) {
      const t = bucket[i];
      if (t.normal.y > -0.45) continue;
      if (x < t.minX || x > t.maxX || z < t.minZ || z > t.maxZ) continue;
      const yOnTri = this.sampleTriangleY(t, x, z);
      if (yOnTri === null) continue;

      if (yOnTri >= prevY + 0.85 && clampedY + playerHeight > yOnTri - 0.04) {
        clampedY = Math.min(clampedY, Math.max(prevY, yOnTri - playerHeight - 0.04));
      }
    }
    return clampedY;
  }

  public hasLowCeiling(x: number, yBottom: number, z: number): boolean {
    if (!this.ready) return false;
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    const bucket = this.floorGrid.get(this.cellKey(cx, cz));
    if (!bucket) return false;

    for (let i = 0; i < bucket.length; i++) {
      const t = bucket[i];
      if (t.maxY < yBottom + 0.82 || t.minY > yBottom + 1.58) continue;
      if (x < t.minX || x > t.maxX || z < t.minZ || z > t.maxZ) continue;
      const yOnTri = this.sampleTriangleY(t, x, z);
      if (yOnTri !== null && yOnTri >= yBottom + 0.82 && yOnTri < yBottom + 1.58) {
        return true;
      }
    }
    return false;
  }

  public resolveHorizontal(
    nextX: number,
    nextZ: number,
    yBottom: number,
    playerHeight: number,
    radius: number,
    outPos: { x: number; z: number }
  ): boolean {
    const minWorldX = !this.worldBounds.isEmpty() ? this.worldBounds.min.x + 0.45 : -66.0;
    const maxWorldX = !this.worldBounds.isEmpty() ? this.worldBounds.max.x - 0.45 : 46.0;
    const minWorldZ = !this.worldBounds.isEmpty() ? this.worldBounds.min.z + 0.45 : -79.0;
    const maxWorldZ = !this.worldBounds.isEmpty() ? this.worldBounds.max.z - 0.45 : 84.0;

    let rx = THREE.MathUtils.clamp(nextX, minWorldX, maxWorldX);
    let rz = THREE.MathUtils.clamp(nextZ, minWorldZ, maxWorldZ);
    let collided = rx !== nextX || rz !== nextZ;

    if (!this.ready) {
      outPos.x = rx;
      outPos.z = rz;
      return collided;
    }

    const waistMinY = yBottom + 0.54;
    const headMaxY = yBottom + Math.min(playerHeight - 0.2, 1.5);
    const midY = (waistMinY + headMaxY) * 0.5;
    const sampleHeights =
      headMaxY > waistMinY + 0.15
        ? [waistMinY + 0.04, midY, headMaxY - 0.04]
        : [waistMinY + 0.04];

    const minCx = Math.floor((rx - radius - 0.2) / this.cellSize);
    const maxCx = Math.floor((rx + radius + 0.2) / this.cellSize);
    const minCz = Math.floor((rz - radius - 0.2) / this.cellSize);
    const maxCz = Math.floor((rz + radius + 0.2) / this.cellSize);

    for (let iter = 0; iter < 2; iter++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        for (let cz = minCz; cz <= maxCz; cz++) {
          const bucket = this.wallGrid.get(this.cellKey(cx, cz));
          if (!bucket) continue;

          for (let i = 0; i < bucket.length; i++) {
            const w = bucket[i];
            if (w.maxY <= waistMinY || w.minY >= headMaxY) continue;
            if (
              rx + radius < w.minX ||
              rx - radius > w.maxX ||
              rz + radius < w.minZ ||
              rz - radius > w.maxZ
            ) {
              continue;
            }

            _tri.set(w.a, w.b, w.c);

            for (let s = 0; s < sampleHeights.length; s++) {
              const sy = sampleHeights[s];
              if (sy < w.minY - 0.05 || sy > w.maxY + 0.05) continue;

              _pt.set(rx, sy, rz);
              _tri.closestPointToPoint(_pt, _closest);

              if (Math.abs(_closest.y - sy) > 0.28) continue;

              const dx = rx - _closest.x;
              const dz = rz - _closest.z;
              const distSq = dx * dx + dz * dz;
              if (distSq < radius * radius && distSq > 1e-8) {
                const dist = Math.sqrt(distSq);
                const push = radius - dist + 0.002;
                rx += (dx / dist) * push;
                rz += (dz / dist) * push;
                collided = true;
              }
            }
          }
        }
      }
    }

    outPos.x = rx;
    outPos.z = rz;
    return collided;
  }

  public raycastDistance(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    maxDist: number
  ): number | null {
    const hit = this.raycastDetailed(origin, dir, maxDist);
    return hit ? hit.distance : null;
  }

  /**
   * Spatial-hash triangle raycast with hit point + face normal.
   * Used for bullet world impacts without Three.js mesh traversal of the whole GLB.
   */
  public raycastDetailed(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    maxDist: number,
    outPoint?: THREE.Vector3,
    outNormal?: THREE.Vector3
  ): { distance: number } | null {
    if (!this.ready) return null;
    _ray.set(origin, dir);
    let closestDist = maxDist + 1;
    let hitTri: Dust2TriEntry | null = null;
    const step = 1.45;
    const steps = Math.max(1, Math.ceil(maxDist / step));
    let lastKey = '';

    for (let s = 0; s <= steps; s++) {
      const d = Math.min(maxDist, s * step);
      if (d > closestDist + step) break;
      const px = origin.x + dir.x * d;
      const py = origin.y + dir.y * d;
      const pz = origin.z + dir.z * d;
      const key = this.cellKey(Math.floor(px / this.cellSize), Math.floor(pz / this.cellSize));
      if (key === lastKey) continue;
      lastKey = key;

      const walls = this.wallGrid.get(key);
      if (walls) {
        for (let i = 0; i < walls.length; i++) {
          const w = walls[i];
          if (py + step < w.minY || py - step > w.maxY) continue;
          if (_ray.intersectTriangle(w.a, w.b, w.c, false, _hitPt)) {
            const dist = origin.distanceTo(_hitPt);
            if (dist <= maxDist && dist < closestDist) {
              closestDist = dist;
              hitTri = w;
              if (outPoint) outPoint.copy(_hitPt);
            }
          }
        }
      }
      const floors = this.floorGrid.get(key);
      if (floors) {
        for (let i = 0; i < floors.length; i++) {
          const f = floors[i];
          if (py + step < f.minY || py - step > f.maxY) continue;
          if (_ray.intersectTriangle(f.a, f.b, f.c, false, _hitPt)) {
            const dist = origin.distanceTo(_hitPt);
            if (dist <= maxDist && dist < closestDist) {
              closestDist = dist;
              hitTri = f;
              if (outPoint) outPoint.copy(_hitPt);
            }
          }
        }
      }
    }

    if (closestDist > maxDist || !hitTri) return null;

    if (outPoint) {
      outPoint.copy(origin).addScaledVector(dir, closestDist);
    }
    if (outNormal) {
      outNormal.copy(hitTri.normal);
      // Ensure normal faces the shooter
      if (outNormal.dot(dir) > 0) outNormal.negate();
    }
    return { distance: closestDist };
  }

  private sampleTriangleY(t: Dust2TriEntry, x: number, z: number): number | null {
    const denom = (t.b.z - t.c.z) * (t.a.x - t.c.x) + (t.c.x - t.b.x) * (t.a.z - t.c.z);
    if (Math.abs(denom) < 1e-6) return null;

    const u = ((t.b.z - t.c.z) * (x - t.c.x) + (t.c.x - t.b.x) * (z - t.c.z)) / denom;
    const v = ((t.c.z - t.a.z) * (x - t.c.x) + (t.a.x - t.c.x) * (z - t.c.z)) / denom;
    const w = 1 - u - v;

    if (u >= -0.025 && v >= -0.025 && w >= -0.025) {
      return u * t.a.y + v * t.b.y + w * t.c.y;
    }
    return null;
  }

  private generateTopDownRadarDataUrl(floors: Dust2TriEntry[], walls: Dust2TriEntry[]): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0b1017';
    ctx.fillRect(0, 0, 256, 256);

    const minX = !this.worldBounds.isEmpty() ? this.worldBounds.min.x : -60;
    const maxX = !this.worldBounds.isEmpty() ? this.worldBounds.max.x : 48;
    const minZ = !this.worldBounds.isEmpty() ? this.worldBounds.min.z : -80;
    const maxZ = !this.worldBounds.isEmpty() ? this.worldBounds.max.z : 30;
    const spanX = Math.max(10, maxX - minX);
    const spanZ = Math.max(10, maxZ - minZ);

    const toPx = (wx: number) => ((wx - minX) / spanX) * 256;
    const toPz = (wz: number) => ((wz - minZ) / spanZ) * 256;

    // Subsample huge maps (Eastern) — full 1M+ fills freeze Android WebView.
    const floorStep = floors.length > 80000 ? Math.ceil(floors.length / 40000) : 1;
    for (let i = 0; i < floors.length; i += floorStep) {
      const f = floors[i];
      if (f.maxY > 9.6) continue;
      ctx.beginPath();
      ctx.moveTo(toPx(f.a.x), toPz(f.a.z));
      ctx.lineTo(toPx(f.b.x), toPz(f.b.z));
      ctx.lineTo(toPx(f.c.x), toPz(f.c.z));
      ctx.closePath();
      ctx.fillStyle = f.minY > 5.8 ? '#2b3948' : f.minY < 3.2 ? '#16202a' : '#212d3a';
      ctx.fill();
    }

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.1;
    const wallStep = walls.length > 40000 ? Math.ceil(walls.length / 20000) : 1;
    for (let i = 0; i < walls.length; i += wallStep) {
      const w = walls[i];
      if (w.minY > 8.5 || w.maxY < 1.0) continue;
      ctx.beginPath();
      ctx.moveTo(toPx(w.a.x), toPz(w.a.z));
      ctx.lineTo(toPx(w.b.x), toPz(w.b.z));
      ctx.stroke();
    }

    this.radarDataUrl = canvas.toDataURL('image/png');
  }
}
