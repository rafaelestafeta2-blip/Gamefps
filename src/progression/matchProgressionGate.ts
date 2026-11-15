/**
 * Central gate for match XP / cash / rank / unlock / combat telemetry.
 * Online room service registers the live check (avoids import cycles).
 */

type ProgressionGateFn = () => boolean;

let gateFn: ProgressionGateFn | null = null;

export function registerMatchProgressionGate(fn: ProgressionGateFn): void {
  gateFn = fn;
}

/**
 * XP / cash / rank unlocks / profile combat telemetry may only come from
 * real online matches with at least one other human. Bot / offline / solo
 * practice modes grant none.
 */
export function canGrantMatchProgressionRewards(): boolean {
  return gateFn ? gateFn() : false;
}
