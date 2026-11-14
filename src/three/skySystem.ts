import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { DrillMode } from '../types/game';

/**
 * Sistema Físico de Céu 3D (Preetham Atmospheric Rayleigh/Mie Scattering + Shader de Nuvens Volumétricas FBM).
 * Utiliza o shader analítico oficial `Sky` do Three.js com auto-sombreamento Beer-Powder,
 * espalhamento frontal solar Henyey-Greenstein (silver lining) e sombras direcionais PCF.
 */
export class TacticalSkySystem {
  private scene: THREE.Scene;
  private keyLight: THREE.DirectionalLight;
  private keyLightTarget: THREE.Object3D;

  private sky: Sky;
  private sunDirection = new THREE.Vector3();
  private indoorBgColor = new THREE.Color(0x0d121a);
  private outdoorFallbackBg = new THREE.Color(0xdccbb1);
  private isOutdoor = false;

  constructor(scene: THREE.Scene, keyLight: THREE.DirectionalLight) {
    this.scene = scene;
    this.keyLight = keyLight;

    this.keyLightTarget = new THREE.Object3D();
    this.keyLightTarget.position.set(0, 0, 0);
    this.scene.add(this.keyLightTarget);
    this.keyLight.target = this.keyLightTarget;

    // Instancia o Skybox físico Preetham + Nuvens FBM do Three.js
    this.sky = new Sky();
    this.sky.name = 'PhysicalAtmosphericSky';
    this.sky.scale.setScalar(10000);
    this.sky.visible = false;
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
  }

  public configureForMode(mode: DrillMode, fogEnabled = true): void {
    const isDust2 = mode === 'DUST2_BOMB_5V5';
    const isAssault = mode === 'ASSAULT_BOMB_5V5';
    const isIndustria = mode === 'INDUSTRIA_BOMB_5V5';
    const isYard = mode === 'YARD_BOMB_5V5';
    this.isOutdoor = isDust2 || isAssault || isIndustria || isYard;

    this.sky.visible = this.isOutdoor;
    const uniforms = this.sky.material.uniforms;

    if (isDust2) {
      // Elevação solar de 44° e azimute de 35° (sol de deserto realista da Dust2)
      const phi = THREE.MathUtils.degToRad(90 - 44);
      const theta = THREE.MathUtils.degToRad(35);
      this.sunDirection.setFromSphericalCoords(1, phi, theta);

      uniforms.turbidity.value = 2.6;
      uniforms.rayleigh.value = 1.55;
      uniforms.mieCoefficient.value = 0.0045;
      uniforms.mieDirectionalG.value = 0.82;
      uniforms.sunPosition.value.copy(this.sunDirection);
      uniforms.showSunDisc.value = 1.0;

      // Parâmetros de nuvens volumétricas FBM (Beer-Powder + Silver Lining)
      if (uniforms.cloudScale) uniforms.cloudScale.value = 0.00022;
      if (uniforms.cloudSpeed) uniforms.cloudSpeed.value = 0.000028;
      if (uniforms.cloudCoverage) uniforms.cloudCoverage.value = 0.44;
      if (uniforms.cloudDensity) uniforms.cloudDensity.value = 0.46;
      if (uniforms.cloudElevation) uniforms.cloudElevation.value = 0.45;

      this.outdoorFallbackBg.setHex(0xdccbb1);
      this.scene.background = this.outdoorFallbackBg;
      this.scene.fog = fogEnabled ? new THREE.FogExp2(0xdccbb1, 0.0035) : null;

      // Alinha a luz direcional de sombras (keyLight) exatamente com o vetor solar físico
      this.keyLightTarget.position.set(-6, 4.8, -24);
      this.keyLight.position
        .copy(this.keyLightTarget.position)
        .addScaledVector(this.sunDirection, 85);
      this.keyLight.color.setHex(0xfff7e6);
      this.keyLight.intensity = 2.15;
      this.updateShadowFrustum(68, 175);
    } else if (isAssault || isIndustria || isYard) {
      // Elevação solar de 38° e azimute de 52° para mapas urbanos industriais
      const phi = THREE.MathUtils.degToRad(90 - 38);
      const theta = THREE.MathUtils.degToRad(52);
      this.sunDirection.setFromSphericalCoords(1, phi, theta);

      uniforms.turbidity.value = 3.4;
      uniforms.rayleigh.value = 1.35;
      uniforms.mieCoefficient.value = 0.0055;
      uniforms.mieDirectionalG.value = 0.8;
      uniforms.sunPosition.value.copy(this.sunDirection);
      uniforms.showSunDisc.value = 1.0;

      if (uniforms.cloudScale) uniforms.cloudScale.value = 0.00024;
      if (uniforms.cloudSpeed) uniforms.cloudSpeed.value = 0.000032;
      if (uniforms.cloudCoverage) uniforms.cloudCoverage.value = 0.52;
      if (uniforms.cloudDensity) uniforms.cloudDensity.value = 0.5;
      if (uniforms.cloudElevation) uniforms.cloudElevation.value = 0.48;

      const industrialSky = isAssault || isIndustria;
      this.outdoorFallbackBg.setHex(industrialSky ? 0x1e293b : 0xcbd5e1);
      this.scene.background = this.outdoorFallbackBg;
      this.scene.fog = fogEnabled
        ? new THREE.FogExp2(
            industrialSky ? 0x1e293b : 0xcbd5e1,
            isIndustria ? 0.0009 : isAssault ? 0.0011 : 0.0048
          )
        : null;

      this.keyLightTarget.position.set(
        isIndustria ? 20 : isAssault ? -18 : 0,
        isIndustria ? 2 : 0,
        isIndustria ? 0 : isAssault ? 18 : 0
      );
      this.keyLight.position
        .copy(this.keyLightTarget.position)
        .addScaledVector(this.sunDirection, 80);
      this.keyLight.color.setHex(0xfffbeb);
      this.keyLight.intensity = industrialSky ? 1.55 : 1.95;
      this.updateShadowFrustum(isIndustria ? 90 : isAssault ? 65 : 52, 165);
    } else {
      this.indoorBgColor.setHex(0x070a10);
      this.scene.background = this.indoorBgColor;
      this.scene.fog = fogEnabled ? new THREE.FogExp2(0x070a10, 0.011) : null;

      this.keyLightTarget.position.set(4, 0, -2);
      this.keyLight.position.set(16, 28, 12);
      this.keyLight.color.setHex(0xe2e8f0);
      this.keyLight.intensity = 1.05;
      this.keyLight.castShadow = false;
    }

    this.keyLightTarget.updateMatrixWorld();
  }

  private updateShadowFrustum(halfExtent: number, far: number): void {
    const cam = this.keyLight.shadow.camera;
    cam.left = -halfExtent;
    cam.right = halfExtent;
    cam.top = halfExtent;
    cam.bottom = -halfExtent;
    cam.near = 2;
    cam.far = far;
    cam.updateProjectionMatrix();
    this.keyLight.shadow.needsUpdate = true;
  }

  public update(playerPos: THREE.Vector3, dt: number): void {
    if (!this.isOutdoor) return;

    // Mantém o Skybox centrado na câmera e avança a evolução temporal das nuvens FBM
    this.sky.position.copy(playerPos);
    const uniforms = this.sky.material.uniforms;
    if (uniforms.time) {
      uniforms.time.value = (uniforms.time.value + dt) % 10000;
    }
  }

  public dispose(): void {
    this.sky.geometry.dispose();
    this.sky.material.dispose();
  }
}
