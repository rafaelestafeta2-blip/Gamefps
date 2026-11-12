import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  cloneVanguardCharacterAvatar,
  preloadProRifleBotCharacter,
} from '../three/botCharacterSystem';
import {
  alignWeaponPropToMixamoHands,
  createBotThirdPersonWeaponMesh,
  preloadRealBotWeaponGlbs,
} from '../three/botWeaponProps';
import { WeaponId } from '../types/game';

interface RankedOperator3DCanvasProps {
  activeWeapon: WeaponId;
  team?: 'VANGUARD' | 'BLACKTHORN';
}

export const RankedOperator3DCanvas: React.FC<RankedOperator3DCanvasProps> = ({
  activeWeapon,
  team = 'VANGUARD',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const weaponRef = useRef<WeaponId>(activeWeapon);
  const swapWeaponRef = useRef<((w: WeaponId) => void) | null>(null);
  const isBlackthorn = team === 'BLACKTHORN';

  useEffect(() => {
    weaponRef.current = activeWeapon;
    if (swapWeaponRef.current) {
      swapWeaponRef.current(activeWeapon);
    }
  }, [activeWeapon]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let disposed = false;
    let frameId = 0;

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
    camera.position.set(0, 1.01, isBlackthorn ? 2.88 : 2.98);
    camera.lookAt(0, 0.93, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isBlackthorn ? 1.32 : 1.28;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    // Iluminação de estúdio temática (BLACKTHORN Carmesim ou VANGUARD Azul)
    const hemiLight = new THREE.HemisphereLight(
      isBlackthorn ? 0xfecdd3 : 0xbae6fd,
      isBlackthorn ? 0x1a0508 : 0x0f172a,
      1.3
    );
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(isBlackthorn ? 0xfff1f2 : 0xf0f9ff, 2.7);
    keyLight.position.set(2.0, 3.1, 2.9);
    scene.add(keyLight);

    const primaryRimLight = new THREE.PointLight(
      isBlackthorn ? 0xef4444 : 0x38bdf8,
      5.4,
      7.0
    );
    primaryRimLight.position.set(-1.35, 1.48, -1.05);
    scene.add(primaryRimLight);

    const secondaryRimLight = new THREE.PointLight(
      isBlackthorn ? 0xf97316 : 0x6366f1,
      4.2,
      7.0
    );
    secondaryRimLight.position.set(1.35, 1.18, -1.15);
    scene.add(secondaryRimLight);

    const frontBottomFill = new THREE.PointLight(
      isBlackthorn ? 0xdc2626 : 0x0ea5e9,
      1.7,
      5.0
    );
    frontBottomFill.position.set(0, 0.3, 1.8);
    scene.add(frontBottomFill);

    // Pedestal holográfico translúcido sob os pés do Operador 3D
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.set(0, 0.01, 0);
    scene.add(pedestalGroup);

    const ringGeo = new THREE.RingGeometry(0.46, 0.52, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: isBlackthorn ? 0xef4444 : 0x38bdf8,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    pedestalGroup.add(ringMesh);

    const innerDiscGeo = new THREE.CircleGeometry(0.45, 48);
    innerDiscGeo.rotateX(-Math.PI / 2);
    const innerDiscMat = new THREE.MeshBasicMaterial({
      color: isBlackthorn ? 0x991b1b : 0x0284c7,
      transparent: true,
      opacity: 0.22,
    });
    const innerDisc = new THREE.Mesh(innerDiscGeo, innerDiscMat);
    innerDisc.position.y = -0.005;
    pedestalGroup.add(innerDisc);

    // Grupo raiz do Operador .glb
    const BASE_YAW = 0.22;
    const operatorPivot = new THREE.Group();
    operatorPivot.position.set(0, 0.02, 0);
    operatorPivot.rotation.y = BASE_YAW;
    scene.add(operatorPivot);

    let mixer: THREE.AnimationMixer | null = null;
    let rHandBone: THREE.Object3D | null = null;
    let lHandBone: THREE.Object3D | null = null;
    let weaponProp: THREE.Group | null = null;
    let targetYaw = BASE_YAW;
    let currentYaw = BASE_YAW;
    let isDragging = false;
    let prevPointerX = 0;

    preloadRealBotWeaponGlbs();

    swapWeaponRef.current = (nextWeapon: WeaponId) => {
      if (disposed || !rHandBone) return;
      if (weaponProp) {
        operatorPivot.remove(weaponProp);
      }
      weaponProp = createBotThirdPersonWeaponMesh(nextWeapon, true);
      operatorPivot.add(weaponProp);
      operatorPivot.updateMatrixWorld(true);
      alignWeaponPropToMixamoHands(weaponProp, operatorPivot, rHandBone, lHandBone);
    };

    void preloadProRifleBotCharacter().then(() => {
      if (disposed) return;
      const cloned = cloneVanguardCharacterAvatar(isSoftwareGl);
      if (!cloned) return;

      const { modelRoot, clips } = cloned;
      modelRoot.scale.setScalar(1.02);
      modelRoot.position.set(0, 0, 0);

      modelRoot.traverse((child) => {
        if (child.name === 'mixamorigRightHand') rHandBone = child;
        else if (child.name === 'mixamorigLeftHand') lHandBone = child;

        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          const std = m.material as THREE.MeshStandardMaterial;
          if (std && std.clone) {
            const customMat = std.clone();
            customMat.color.setHex(isBlackthorn ? 0xccb8b8 : 0x9fb8d8);
            customMat.roughness = isBlackthorn ? 0.46 : 0.48;
            customMat.metalness = isBlackthorn ? 0.34 : 0.28;
            m.material = customMat;
          }
        }
      });

      operatorPivot.add(modelRoot);

      weaponProp = createBotThirdPersonWeaponMesh(weaponRef.current, true);
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
    });

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevPointerX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevPointerX;
      prevPointerX = e.clientX;
      targetYaw += dx * 0.012;
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
        targetYaw = BASE_YAW + Math.sin(elapsed * 0.65) * 0.1;
      }
      currentYaw = THREE.MathUtils.damp(currentYaw, targetYaw, 6, dt);
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
      ringMat.opacity = 0.5 + 0.2 * Math.sin(elapsed * 2.2);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      disposed = true;
      swapWeaponRef.current = null;
      cancelAnimationFrame(frameId);
      domElem.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      envTex.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      innerDiscGeo.dispose();
      innerDiscMat.dispose();
      renderer.dispose();
    };
  }, [team]);

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
