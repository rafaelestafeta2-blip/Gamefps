import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CharacterAvatarKind,
  cloneVanguardCharacterAvatar,
  preloadProRifleBotCharacter,
  resolveCharacterAvatarKind,
} from '../three/botCharacterSystem';
import {
  alignWeaponPropToMixamoHands,
  createBotThirdPersonWeaponMesh,
  preloadRealBotWeaponGlbs,
} from '../three/botWeaponProps';
import {
  createSecondaryWebGLRenderer,
  disposeSecondaryWebGLRenderer,
} from '../three/webglContextGuard';
import { WeaponId } from '../types/game';
import { WarfaceClassId } from './WarfaceClassIcons';

interface RankedOperator3DCanvasProps {
  activeWeapon: WeaponId;
  operatorClass?: WarfaceClassId;
  team?: 'VANGUARD' | 'BLACKTHORN';
  externalRotateSignal?: { nonce: number; delta: number };
}

export const RankedOperator3DCanvas: React.FC<RankedOperator3DCanvasProps> = ({
  activeWeapon,
  operatorClass,
  team = 'VANGUARD',
  externalRotateSignal,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const weaponRef = useRef<WeaponId>(activeWeapon);
  const classRef = useRef<WarfaceClassId | undefined>(operatorClass);
  const swapSelectionRef = useRef<
    ((w: WeaponId, c?: WarfaceClassId) => void) | null
  >(null);
  const nudgeYawRef = useRef<((delta: number) => void) | null>(null);
  const isBlackthorn = team === 'BLACKTHORN';

  useEffect(() => {
    weaponRef.current = activeWeapon;
    classRef.current = operatorClass;
    if (swapSelectionRef.current) {
      swapSelectionRef.current(activeWeapon, operatorClass);
    }
  }, [activeWeapon, operatorClass]);

  useEffect(() => {
    if (externalRotateSignal && externalRotateSignal.nonce > 0 && nudgeYawRef.current) {
      nudgeYawRef.current(externalRotateSignal.delta);
    }
  }, [externalRotateSignal]);

  // Remount key when WebGL context is lost (thumbnail studios used to steal the slot).
  const [contextEpoch, setContextEpoch] = useState(0);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let disposed = false;
    let frameId = 0;
    setIsLoaded(false);

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = Math.max(260, container.clientWidth || 420);
    const height = Math.max(320, container.clientHeight || 520);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 30);
    camera.position.set(0, 0.98, isBlackthorn ? 3.12 : 3.18);
    camera.lookAt(0, 0.90, 0);

    const renderer = createSecondaryWebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
      // Never let inventory weapon/grenade thumbnail studios evict this canvas.
      pinned: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // Showcase only — keep midtones readable so 2K albedos don't look muddy.
    renderer.toneMappingExposure = isBlackthorn ? 1.12 : 1.08;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    if (!isSoftwareGl) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      if (disposed) return;
      disposed = true;
      window.setTimeout(() => {
        setContextEpoch((n) => n + 1);
      }, 50);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost, false);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.028).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 1.15;
    pmremGenerator.dispose();

    // Premium studio: white key + soft colored rims (don't crush albedo with neon).
    const hemiLight = new THREE.HemisphereLight(
      isBlackthorn ? 0xfff1f2 : 0xf0f9ff,
      isBlackthorn ? 0x1c0a0d : 0x0b1220,
      0.95
    );
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffaf5, 2.15);
    keyLight.position.set(2.1, 3.4, 2.6);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 12;
      keyLight.shadow.camera.left = -2.5;
      keyLight.shadow.camera.right = 2.5;
      keyLight.shadow.camera.top = 3.2;
      keyLight.shadow.camera.bottom = -0.4;
      keyLight.shadow.bias = -0.00025;
    }
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(
      isBlackthorn ? 0xfecdd3 : 0xbae6fd,
      0.55
    );
    fillLight.position.set(-1.6, 1.8, 2.4);
    scene.add(fillLight);

    const primaryRimLight = new THREE.PointLight(
      isBlackthorn ? 0xfb7185 : 0x38bdf8,
      isBlackthorn ? 2.4 : 2.1,
      8.5
    );
    primaryRimLight.position.set(-1.5, 1.55, -1.15);
    scene.add(primaryRimLight);

    const secondaryRimLight = new THREE.PointLight(
      isBlackthorn ? 0xf87171 : 0x818cf8,
      isBlackthorn ? 1.6 : 1.45,
      8.0
    );
    secondaryRimLight.position.set(1.45, 1.2, -1.2);
    scene.add(secondaryRimLight);

    const frontBottomFill = new THREE.PointLight(0xfff7ed, 0.85, 5.5);
    frontBottomFill.position.set(0, 0.35, 2.15);
    scene.add(frontBottomFill);

    // Pedestal / Reflexo no asfalto molhado sob as botas do Operador 3D
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.set(0, 0.01, 0);
    scene.add(pedestalGroup);

    const floorGeo = new THREE.CircleGeometry(0.72, 48);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: isBlackthorn ? 0x1a0b0e : 0x0b1524,
      metalness: 0.55,
      roughness: 0.35,
      envMapIntensity: 0.85,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.receiveShadow = !isSoftwareGl;
    floorMesh.position.y = -0.008;
    pedestalGroup.add(floorMesh);

    const ringGeo = new THREE.RingGeometry(0.46, 0.52, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: isBlackthorn ? 0xef4444 : 0x38bdf8,
      transparent: true,
      opacity: isBlackthorn ? 0.22 : 0.55,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    pedestalGroup.add(ringMesh);

    const innerDiscGeo = new THREE.CircleGeometry(isBlackthorn ? 0.58 : 0.45, 48);
    innerDiscGeo.rotateX(-Math.PI / 2);
    const innerDiscMat = new THREE.MeshBasicMaterial({
      color: isBlackthorn ? 0xdc2626 : 0x0284c7,
      transparent: true,
      opacity: isBlackthorn ? 0.18 : 0.16,
    });
    const innerDisc = new THREE.Mesh(innerDiscGeo, innerDiscMat);
    innerDisc.position.y = -0.004;
    pedestalGroup.add(innerDisc);

    // Grupo raiz do Operador .glb
    const BASE_YAW = 0.22;
    const operatorPivot = new THREE.Group();
    operatorPivot.position.set(0, 0.02, 0);
    operatorPivot.rotation.y = BASE_YAW;
    scene.add(operatorPivot);

    let currentModelRoot: THREE.Object3D | null = null;
    let currentAvatarKind: CharacterAvatarKind | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let rHandBone: THREE.Object3D | null = null;
    let lHandBone: THREE.Object3D | null = null;
    let weaponProp: THREE.Group | null = null;
    let targetYaw = BASE_YAW;
    let currentYaw = BASE_YAW;
    let isDragging = false;
    let prevPointerX = 0;

    preloadRealBotWeaponGlbs();

    const mountCharacterForSelection = (
      targetWeapon: WeaponId,
      targetClass?: WarfaceClassId
    ) => {
      if (disposed) return;
      const cloned = cloneVanguardCharacterAvatar(
        isSoftwareGl,
        targetWeapon,
        targetClass
      );
      if (!cloned) return;

      if (currentModelRoot) {
        mixer?.stopAllAction();
        operatorPivot.remove(currentModelRoot);
      }

      const { modelRoot, clips, avatarKind } = cloned;
      currentModelRoot = modelRoot;
      currentAvatarKind = avatarKind;
      rHandBone = null;
      lHandBone = null;

      modelRoot.scale.setScalar(avatarKind === 'VANGUARD_MEDICO' ? 1.0 : 1.02);
      modelRoot.position.set(0, 0, 0);

      modelRoot.traverse((child) => {
        if (child.name === 'mixamorigRightHand') rHandBone = child;
        else if (child.name === 'mixamorigLeftHand') lHandBone = child;

        if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
          const sk = child as THREE.SkinnedMesh;
          sk.frustumCulled = false;
          sk.skeleton?.bones.forEach((b) => {
            b.matrixAutoUpdate = true;
          });
        }

        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.castShadow = !isSoftwareGl;
          m.receiveShadow = false;
          m.frustumCulled = false;
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (let mi = 0; mi < mats.length; mi++) {
            const std = mats[mi] as THREE.MeshStandardMaterial;
            if (!std?.isMeshStandardMaterial) continue;
            // Keep 2K albedo readable — only a light team wash on DEFAULT pack.
            if (avatarKind === 'DEFAULT') {
              const customMat = std.clone();
              customMat.color.setHex(isBlackthorn ? 0xf3e8e8 : 0xe8eef6);
              customMat.roughness = Math.min(0.72, Math.max(0.28, customMat.roughness ?? 0.5));
              customMat.metalness = Math.min(0.45, Math.max(0.08, customMat.metalness ?? 0.2));
              customMat.envMapIntensity = 1.15;
              if (customMat.map) {
                customMat.map.anisotropy = 16;
                customMat.map.colorSpace = THREE.SRGBColorSpace;
                customMat.map.needsUpdate = true;
              }
              if (customMat.normalMap) {
                customMat.normalMap.anisotropy = 16;
                customMat.normalMap.needsUpdate = true;
              }
              customMat.needsUpdate = true;
              mats[mi] = customMat;
            } else {
              std.color?.setHex(0xffffff);
              std.envMapIntensity = Math.max(std.envMapIntensity || 0, 1.25);
              std.roughness = Math.min(0.78, Math.max(0.32, std.roughness ?? 0.55));
              std.metalness = Math.min(0.35, Math.max(0.05, std.metalness ?? 0.12));
              std.side = THREE.FrontSide;
              if (std.map) {
                std.map.anisotropy = 16;
                std.map.colorSpace = THREE.SRGBColorSpace;
                std.map.needsUpdate = true;
              }
              if (std.normalMap) {
                std.normalMap.anisotropy = 16;
                std.normalMap.needsUpdate = true;
              }
              std.needsUpdate = true;
            }
          }
          if (Array.isArray(m.material)) m.material = mats;
          else m.material = mats[0];
        }
      });

      // Plant feet on pedestal (Tripo medic bind can leave a tiny Y offset).
      modelRoot.updateMatrixWorld(true);
      const footBox = new THREE.Box3().setFromObject(modelRoot);
      if (Number.isFinite(footBox.min.y)) {
        modelRoot.position.y -= footBox.min.y;
      }

      operatorPivot.add(modelRoot);

      if (weaponProp) {
        operatorPivot.remove(weaponProp);
      }
      weaponProp = createBotThirdPersonWeaponMesh(targetWeapon, true);
      operatorPivot.add(weaponProp);

      mixer = new THREE.AnimationMixer(modelRoot);
      const idleClip = clips.RIFLE_IDLE || clips.RIFLE_AIM;
      if (idleClip) {
        const action = mixer.clipAction(idleClip);
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.play();
        mixer.update(0.01);
      }

      operatorPivot.updateMatrixWorld(true);
      alignWeaponPropToMixamoHands(weaponProp, operatorPivot, rHandBone, lHandBone);
      setIsLoaded(true);
    };

    swapSelectionRef.current = (
      nextWeapon: WeaponId,
      nextClass?: WarfaceClassId
    ) => {
      if (disposed) return;
      const wantKind = resolveCharacterAvatarKind(nextWeapon, nextClass, true);
      if (currentModelRoot === null || currentAvatarKind !== wantKind) {
        mountCharacterForSelection(nextWeapon, nextClass);
        return;
      }
      if (!rHandBone) return;
      if (weaponProp) {
        operatorPivot.remove(weaponProp);
      }
      weaponProp = createBotThirdPersonWeaponMesh(nextWeapon, true);
      operatorPivot.add(weaponProp);
      operatorPivot.updateMatrixWorld(true);
      alignWeaponPropToMixamoHands(weaponProp, operatorPivot, rHandBone, lHandBone);
    };

    void Promise.all([
      preloadProRifleBotCharacter(),
      preloadRealBotWeaponGlbs(),
    ]).then(() => {
      if (disposed) return;
      mountCharacterForSelection(weaponRef.current, classRef.current);
    });

    let manualYawOffset = 0;
    nudgeYawRef.current = (delta: number) => {
      manualYawOffset += delta;
    };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevPointerX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevPointerX;
      prevPointerX = e.clientX;
      manualYawOffset += dx * 0.012;
      targetYaw = BASE_YAW + manualYawOffset;
    };
    const onPointerUp = () => {
      isDragging = false;
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const handleResize = () => {
      if (!container || disposed) return;
      const nw = Math.max(240, container.clientWidth);
      const nh = Math.max(280, container.clientHeight);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    resizeObserver?.observe(container);

    const clock = new THREE.Clock();

    const animate = () => {
      if (disposed) return;
      frameId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      if (!isDragging) {
        targetYaw = BASE_YAW + manualYawOffset + Math.sin(elapsed * 0.65) * 0.08;
      }
      currentYaw = THREE.MathUtils.damp(currentYaw, targetYaw, 7, dt);
      operatorPivot.rotation.y = currentYaw;

      if (mixer) {
        mixer.update(dt);
        operatorPivot.updateMatrixWorld(true);
        if (weaponProp) {
          alignWeaponPropToMixamoHands(
            weaponProp,
            operatorPivot,
            rHandBone,
            lHandBone
          );
        }
      }

      ringMesh.rotation.z = elapsed * 0.4;
      ringMat.opacity = isBlackthorn
        ? 0.14 + 0.06 * Math.sin(elapsed * 2.2)
        : 0.5 + 0.2 * Math.sin(elapsed * 2.2);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      disposed = true;
      swapSelectionRef.current = null;
      nudgeYawRef.current = null;
      cancelAnimationFrame(frameId);
      domElem.removeEventListener('webglcontextlost', onContextLost);
      domElem.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      envTex.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      innerDiscGeo.dispose();
      innerDiscMat.dispose();
      disposeSecondaryWebGLRenderer(renderer);
    };
  }, [team, contextEpoch]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        title="Arraste para girar o Operador 3D (.glb)"
      />
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-8 h-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin mb-2" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-sky-300">
            CARREGANDO OPERADOR 3D (.GLB)...
          </span>
        </div>
      )}
    </div>
  );
};
