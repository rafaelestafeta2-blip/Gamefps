import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  createSecondaryWebGLRenderer,
  disposeSecondaryWebGLRenderer,
} from '../three/webglContextGuard';
import {
  createFactionBannerAlphaMap,
  createFactionBannerTexture,
  FactionBannerTeam,
} from './FactionFlagTexture';

interface FactionFlagCanvasProps {
  team?: FactionBannerTeam;
  layoutMode?: 'MENU_RIGHT' | 'HERO_CENTER' | 'RANKED_CENTER';
}

// Renderizador 3D PBR Real de Tecido em WebGL (Three.js MeshPhysicalMaterial + GLSL Vertex Cloth)
// Suporta BLACKTHORN (vermelho no menu principal) e VANGUARD (azul no menu competitivo ranked).
export const FactionFlagCanvas: React.FC<FactionFlagCanvasProps> = ({
  team = 'BLACKTHORN',
  layoutMode = 'MENU_RIGHT',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let disposed = false;
    let frameId = 0;
    const isVanguard = team === 'VANGUARD';
    const isCentered = layoutMode === 'RANKED_CENTER' || layoutMode === 'HERO_CENTER';

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const isLowPowerMobile =
      window.innerWidth < 900 ||
      (navigator.hardwareConcurrency || 4) <= 4 ||
      ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4;

    const width = Math.max(320, container.clientWidth || window.innerWidth);
    const height = Math.max(200, container.clientHeight || window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 30);
    camera.position.set(0, 0, 5.2);

    const renderer = createSecondaryWebGLRenderer({
      pinned: true,
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: isLowPowerMobile ? 'low-power' : 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, isLowPowerMobile ? 1.25 : 1.5));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Iluminação 3 pontos temática (Azul/Ciano para VANGUARD, Carmesim para BLACKTHORN)
    const ambient = new THREE.HemisphereLight(
      isVanguard ? 0x93c5fd : 0xff8a8a,
      isVanguard ? 0x050a18 : 0x090406,
      0.9
    );
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(isVanguard ? 0xe0f2fe : 0xfff0f0, 2.85);
    keyLight.position.set(2.4, 3.2, 3.6);
    scene.add(keyLight);

    const teamRim = new THREE.DirectionalLight(isVanguard ? 0x38bdf8 : 0xff1e2d, 2.5);
    teamRim.position.set(-2.6, 1.4, -2.5);
    scene.add(teamRim);

    const bottomGlow = new THREE.PointLight(isVanguard ? 0x0ea5e9 : 0xef4444, 3.2, 9);
    bottomGlow.position.set(isCentered ? 0.2 : 1.4, -1.8, 1.5);
    scene.add(bottomGlow);

    const flagRig = new THREE.Group();
    const syncRigScaleToAspect = (w: number, h: number) => {
      const aspect = w / Math.max(1, h);
      const visH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
      const visW = visH * aspect;
      if (layoutMode === 'HERO_CENTER') {
        // Mastro à esquerda atrás das caixas militares e tecido tremulando atrás do Soldado 3D
        flagRig.position.set(-visW * 0.165, visH * 0.42, 0);
        flagRig.scale.setScalar(Math.max(0.62, Math.min(visW * 0.148, visH * 0.295)));
      } else if (isCentered) {
        flagRig.position.set(-visW * 0.14, visH * 0.40, 0);
        flagRig.scale.setScalar(Math.max(0.58, Math.min(visW * 0.13, visH * 0.275)));
      } else {
        flagRig.position.set(visW * 0.068, visH * 0.43, 0);
        flagRig.scale.setScalar(Math.max(0.55, Math.min(visW * 0.145, visH * 0.275)));
      }
    };
    syncRigScaleToAspect(width, height);
    flagRig.rotation.z = layoutMode === 'HERO_CENTER' ? -0.055 : isCentered ? -0.025 : -0.045;
    scene.add(flagRig);

    const poleMat = new THREE.MeshStandardMaterial({
      color: isVanguard ? 0x334155 : 0x27272a,
      metalness: 0.88,
      roughness: 0.28,
    });
    const poleGeo = new THREE.CylinderGeometry(0.032, 0.038, 3.6, 12);
    const poleMesh = new THREE.Mesh(poleGeo, poleMat);
    poleMesh.position.set(0, -1.7, 0);
    flagRig.add(poleMesh);

    const finialGeo = new THREE.ConeGeometry(0.068, 0.22, 12);
    const finialMesh = new THREE.Mesh(finialGeo, poleMat);
    finialMesh.position.set(0, 0.16, 0);
    flagRig.add(finialMesh);

    const ringGeo = new THREE.TorusGeometry(0.052, 0.011, 8, 18);
    for (let i = 0; i < 5; i++) {
      const ring = new THREE.Mesh(ringGeo, poleMat);
      ring.position.set(0.018, -0.14 - i * 0.36, 0);
      ring.rotation.y = Math.PI * 0.35;
      flagRig.add(ring);
    }

    const bannerW = 2.65;
    const bannerH = 1.66;
    const segX = isSoftwareGl || isLowPowerMobile ? 28 : 44;
    const segY = isSoftwareGl || isLowPowerMobile ? 16 : 26;

    const clothGeo = new THREE.PlaneGeometry(bannerW, bannerH, segX, segY);
    clothGeo.translate(bannerW * 0.5 + 0.03, -bannerH * 0.5 - 0.05, 0);

    const colorTex = new THREE.CanvasTexture(createFactionBannerTexture(team));
    colorTex.colorSpace = THREE.SRGBColorSpace;
    colorTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    colorTex.needsUpdate = true;

    const alphaTex = new THREE.CanvasTexture(createFactionBannerAlphaMap());
    alphaTex.needsUpdate = true;

    const clothMat = new THREE.MeshPhysicalMaterial({
      map: colorTex,
      alphaMap: alphaTex,
      alphaTest: 0.42,
      side: THREE.DoubleSide,
      roughness: 0.76,
      metalness: 0.04,
      sheen: 0.9,
      sheenRoughness: 0.52,
      sheenColor: new THREE.Color(isVanguard ? 0x60a5fa : 0xff4d52),
    });

    const clothUniforms = {
      uTime: { value: 0 },
      uBannerW: { value: bannerW },
    };

    clothMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = clothUniforms.uTime;
      shader.uniforms.uBannerW = clothUniforms.uBannerW;

      const waveFuncs = `
        uniform float uTime;
        uniform float uBannerW;

        vec3 evalClothDisp(vec3 p) {
          float u = clamp((p.x - 0.03) / uBannerW, 0.0, 1.0);
          float v = clamp((-p.y - 0.05) / 1.66, 0.0, 1.0);
          float pin = pow(u, 1.32);

          float w1 = sin(u * 6.2 - uTime * 2.15 + v * 1.9);
          float w2 = sin(u * 11.4 - uTime * 3.55 - v * 2.5) * 0.42;
          float w3 = cos(u * 17.5 - uTime * 5.2 + v * 3.1) * 0.16 * u;
          float gust = sin(uTime * 0.85 + u * 2.2) * 0.24;

          float waveZ = (w1 + w2 + w3 + gust) * 0.28 * pin;
          float droopY = -0.26 * pow(u, 1.38) + sin(u * 5.4 - uTime * 2.15 + v * 1.4) * 0.065 * pin;
          float pullX = -0.095 * pow(u, 1.4) * (0.5 + 0.5 * abs(cos(u * 6.2 - uTime * 2.15)));
          return vec3(p.x + pullX, p.y + droopY, p.z + waveZ);
        }
      `;

      shader.vertexShader = waveFuncs + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <beginnormal_vertex>',
        `
        #include <beginnormal_vertex>
        vec3 pCenter = evalClothDisp(position);
        vec3 pDx = evalClothDisp(position + vec3(0.025, 0.0, 0.0));
        vec3 pDy = evalClothDisp(position + vec3(0.0, 0.025, 0.0));
        objectNormal = normalize(cross(pDx - pCenter, pDy - pCenter));
        `
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        transformed = pCenter;
        `
      );
    };

    const clothMesh = new THREE.Mesh(clothGeo, clothMat);
    flagRig.add(clothMesh);

    const handleResize = () => {
      if (!container || disposed) return;
      const nw = Math.max(320, container.clientWidth || window.innerWidth);
      const nh = Math.max(200, container.clientHeight || window.innerHeight);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      syncRigScaleToAspect(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    const startMs = performance.now();
    const renderFrame = (now: number) => {
      const elapsed = (now - startMs) * 0.001;
      clothUniforms.uTime.value = prefersReducedMotion ? elapsed * 0.2 : elapsed;
      renderer.render(scene, camera);
    };

    const tick = (now: number) => {
      if (disposed || document.hidden) return;
      renderFrame(now);
      if (isSoftwareGl) {
        frameId = window.setTimeout(() => requestAnimationFrame(tick), 65);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
      } else if (!disposed) {
        frameId = requestAnimationFrame(tick);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
    };
    const onContextRestored = () => {
      if (!disposed) frameId = requestAnimationFrame(tick);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    renderFrame(performance.now());
    if (!document.hidden) frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      clothGeo.dispose();
      clothMat.dispose();
      colorTex.dispose();
      alphaTex.dispose();
      poleGeo.dispose();
      finialGeo.dispose();
      ringGeo.dispose();
      poleMat.dispose();
      disposeSecondaryWebGLRenderer(renderer);
    };
  }, [team, layoutMode]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 z-10 w-full h-full pointer-events-none"
    />
  );
};
