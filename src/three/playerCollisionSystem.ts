/** Horizontal AABB capsule vs box colliders — extracted from fpsEngine. */

/**
 * Extracted from TacticalFPSEngine.checkHorizontalCollision — behavior preserved.
 * `engine` is the live TacticalFPSEngine instance (cast at call site).
 */
export function checkHorizontalCollision(engine: any, x: number, z: number, yBottom: number, r: number): boolean {
    const currentHeight =
      engine.state.stance === 'SLIDE'
        ? 0.90
        : engine.state.stance === 'PRONE'
          ? 0.45
          : engine.state.stance === 'CROUCH'
            ? 1.10
            : 1.72;
    const playerTop = yBottom + currentHeight;
    for (let i = 0; i < engine.colliders.length; i++) {
      const c = engine.colliders[i];
      // Allow smooth step-up onto stairs/crates up to 0.45m high
      if (playerTop <= c.minY || yBottom >= c.maxY - 0.45) continue;
      if (
        x + r > c.minX &&
        x - r < c.maxX &&
        z + r > c.minZ &&
        z - r < c.maxZ
      ) {
        return true;
      }
    }
    return false;
}
