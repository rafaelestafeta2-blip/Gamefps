import * as THREE from 'three';

/** Pre-allocated math helpers shared by engine systems (zero GC in the frame loop). */
export const _resolvedHoriz = { x: 0, z: 0 };
export const _forward = new THREE.Vector3();
export const _right = new THREE.Vector3();
export const _up = new THREE.Vector3(0, 1, 0);
export const _moveVec = new THREE.Vector3();
export const _rayOrigin = new THREE.Vector3();
export const _rayDir = new THREE.Vector3();
export const _worldPos = new THREE.Vector3();
export const _worldPos2 = new THREE.Vector3();
export const _hitNormal = new THREE.Vector3();
export const _targetToPlayer = new THREE.Vector3();
export const _hipPosPistol = new THREE.Vector3(0.115, -0.062, -0.27);
export const _hipPosRifle = new THREE.Vector3(0.105, -0.068, -0.3);
