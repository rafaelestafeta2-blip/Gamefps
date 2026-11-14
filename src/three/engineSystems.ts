/**
 * engineSystems.ts
 * Index of modular systems extracted from TacticalFPSEngine.
 * Public API of the game remains on TacticalFPSEngine; these modules own the
 * heavy per-frame logic so the engine class stays a thin orchestrator.
 */

export { updateReloadStateMachine } from './reloadStateMachine';
export { updatePlayerMovementAndCollision } from './playerMovementSystem';
export { checkHorizontalCollision } from './playerCollisionSystem';
export { updateWeaponKinematicsAndOptics } from './weaponKinematicsSystem';
export { updateTargetsAndCombatAI } from './targetsCombatAiSystem';
export { raycastCombatShot, getAimRaycastIntervalSec } from './combatRaycast';
export {
  configureIntermittentShadows,
  tickShadowBudget,
  followKeyLightShadowFrustum,
} from './shadowUpdateBudget';
export { emitHudIfChanged } from './hudBridge';
export { updateDynamicResolutionGovernor } from './dynamicResolutionGovernor';
