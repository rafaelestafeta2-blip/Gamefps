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
      if (!geom.boundingBox) {
        geom.computeBoundingBox();
      }
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

        // Skip tiny 3D ladder rungs & thin ladder side-rails inside ladder zones so they never block climbing
        const spanX = maxX - minX;
        const spanZ = maxZ - minZ;
        if (area < 0.26 && spanX < 1.05 && spanZ < 1.05 && this.isBoxInLadderZone(minX, maxX, minY, maxY, minZ, maxZ)) {
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
    this.generateTopDownRadarDataUrl(allFloors, allWalls);
    this.ready = true;
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
        yBottom <= l.maxY + 0.35
      ) {
        return l;
      }
    }
    return null;
  }

  /**
   * Computes exact barycentric Y height on floor/ramp/stair triangles under (x, z).
   */
  public getGroundHeight(x: number, yBottom: number, z: number): number {
    if (!this.ready) return yBottom;

    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    const bucket = this.floorGrid.get(this.cellKey(cx, cz));
    if (!bucket || bucket.length === 0) return 0;

    let bestY = -999;
    let fallbackLowestY = 999;

    for (let i = 0; i < bucket.length; i++) {
      const t = bucket[i];
      if (x < t.minX - 0.05 || x > t.maxX + 0.05 || z < t.minZ - 0.05 || z > t.maxZ + 0.05) {
        continue;
      }

      const yOnTri = this.sampleTriangleY(t, x, z);
      if (yOnTri === null) continue;

      if (yOnTri < fallbackLowestY) {
        fallbackLowestY = yOnTri;
      }

      // Walkable floor or step/ramp up to 0.56m above current feet
      if (yOnTri <= yBottom + 0.56 && yOnTri > bestY) {
        bestY = yOnTri;
      }
    }

    if (bestY > -900) return bestY;
    if (fallbackLowestY < 900) return fallbackLowestY;
    return 0;
  }

  /**
   * Checks if there is a low ceiling / air vent duct roof directly above the player.
   */
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

  /**
   * Resolves horizontal cylinder-vs-triangle wall collisions with smooth wall sliding.
   */
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

    // Step-up tolerance (0.54m) and 1.52m max standing head check so 1.60m CS archways/cars/vents don't snag
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
    const maxCz = Math.floor((rz + radius - 0.2) / this.cellSize);

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

              const dy = Math.abs(_closest.y - sy);
              if (dy > 0.28) continue;

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

  /**
   * Ultra-fast spatial-cell raycast for wall-tuck, PEQ laser, and bot LOS checks.
   * Avoids testing 10,100+ triangles on mobile CPUs.
   */
  public raycastDistance(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    maxDist: number
  ): number | null {
    if (!this.ready) return null;
    _ray.set(origin, dir);
    let closestDist = maxDist + 1;
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
          const hit = _ray.intersectTriangle(w.a, w.b, w.c, false, _hitPt);
          if (hit) {
            const dist = origin.distanceTo(_hitPt);
            if (dist <= maxDist && dist < closestDist) closestDist = dist;
          }
        }
      }
      const floors = this.floorGrid.get(key);
      if (floors) {
        for (let i = 0; i < floors.length; i++) {
          const f = floors[i];
          if (py + step < f.minY || py - step > f.maxY) continue;
          const hit = _ray.intersectTriangle(f.a, f.b, f.c, false, _hitPt);
          if (hit) {
            const dist = origin.distanceTo(_hitPt);
            if (dist <= maxDist && dist < closestDist) closestDist = dist;
          }
        }
      }
    }

    return closestDist <= maxDist ? closestDist : null;
  }

  private sampleTriangleY(t: Dust2TriEntry, x: number, z: number): number | null {
    const x0 = t.a.x;
    const z0 = t.a.z;
    const x1 = t.b.x;
    const z1 = t.b.z;
    const x2 = t.c.x;
    const z2 = t.c.z;

    const denom = (z1 - z2) * (x0 - x2) + (x2 - x1) * (z0 - z2);
    if (Math.abs(denom) < 1e-6) return null;

    const u = ((z1 - z2) * (x - x2) + (x2 - x1) * (z - z2)) / denom;
    const v = ((z2 - z0) * (x - x2) + (x0 - x2) * (z - z2)) / denom;
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

    for (let i = 0; i < floors.length; i++) {
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
    for (let i = 0; i < walls.length; i++) {
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
