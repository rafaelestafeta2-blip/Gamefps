/**
 * Per-peer pose history for render interpolation and client-side lag compensation.
 * Stores a short ring of transforms keyed by uid; used by onlineMatchSync + combat hits.
 */

export interface PeerPoseSample {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  isCrouching: boolean;
  ts: number;
}

const MAX_SAMPLES = 24;
const buffers = new Map<string, PeerPoseSample[]>();

export function resetPeerSnapshotBuffers(): void {
  buffers.clear();
}

export function pushPeerPose(uid: string, sample: PeerPoseSample): void {
  if (!uid) return;
  let ring = buffers.get(uid);
  if (!ring) {
    ring = [];
    buffers.set(uid, ring);
  }
  const last = ring[ring.length - 1];
  if (last && sample.ts - last.ts < 8) {
    // Collapse sub-frame spam; keep newest.
    ring[ring.length - 1] = sample;
    return;
  }
  ring.push(sample);
  if (ring.length > MAX_SAMPLES) ring.shift();
}

/** Pose at approximately `whenMs` (rewind for fairer hits). Falls back to newest. */
export function samplePeerPoseAt(uid: string, whenMs: number): PeerPoseSample | null {
  const ring = buffers.get(uid);
  if (!ring || ring.length === 0) return null;
  if (ring.length === 1) return ring[0];

  // Find surrounding samples
  for (let i = ring.length - 1; i >= 1; i--) {
    const newer = ring[i];
    const older = ring[i - 1];
    if (whenMs >= older.ts && whenMs <= newer.ts) {
      const span = Math.max(1, newer.ts - older.ts);
      const a = (whenMs - older.ts) / span;
      return lerpPose(older, newer, a);
    }
  }
  // Too old → oldest; too new → newest
  if (whenMs < ring[0].ts) return ring[0];
  return ring[ring.length - 1];
}

/** Render-time pose: interpolate toward newest with mild extrapolation cap. */
export function samplePeerPoseForRender(
  uid: string,
  renderDelayMs = 100
): PeerPoseSample | null {
  const ring = buffers.get(uid);
  if (!ring || ring.length === 0) return null;
  const targetTs = Date.now() - renderDelayMs;
  return samplePeerPoseAt(uid, targetTs) || ring[ring.length - 1];
}

function lerpPose(a: PeerPoseSample, b: PeerPoseSample, t: number): PeerPoseSample {
  const u = Math.min(1, Math.max(0, t));
  return {
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
    z: a.z + (b.z - a.z) * u,
    yaw: lerpAngle(a.yaw, b.yaw, u),
    pitch: a.pitch + (b.pitch - a.pitch) * u,
    isCrouching: u < 0.5 ? a.isCrouching : b.isCrouching,
    ts: a.ts + (b.ts - a.ts) * u,
  };
}

function lerpAngle(current: number, target: number, alpha: number): number {
  let diff = target - current;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return current + diff * alpha;
}
