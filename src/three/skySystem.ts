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
  private hemiLight: THREE.HemisphereLight | null;
  private rimLight: THREE.DirectionalLight | null;
  private keyLightTarget: THREE.Object3D;

  private sky: Sky;
  private sunDirection = new THREE.Vector3();
  private indoorBgColor = new THREE.Color(0x0d121a);
  private outdoorFallbackBg = new THREE.Color(0xdccbb1);
  private isOutdoor = false;

  constructor(
    scene: THREE.Scene,
    keyLight: THREE.DirectionalLight,
    hemiLight: THREE.HemisphereLight | null = null,
    rimLight: THREE.DirectionalLight | null = null
  ) {
    this.scene = scene;
    this.keyLight = keyLight;
    this.hemiLight = hemiLight;
    this.rimLight = rimLight;

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
    const isHangar = mode === 'HANGAR_BOMB_5V5';
    const isEasternCity = mode === 'EASTERN_CITY_BOMB_5V5';
    const isMirageAnubis = mode === 'MIRAGE_ANUBIS_BOMB_5V5';
    const isYard = mode === 'YARD_BOMB_5V5';
    this.isOutdoor = isDust2 || isAssault || isIndustria || isHangar || isEasternCity || isMirageAnubis || isYard;

    this.sky.visible = this.isOutdoor;
    const uniforms = this.sky.material.uniforms;

    if (isDust2 || isMirageAnubis) {
      // Desert path — Dust2 grit + Mirage Anubis (same warm ACES midtones, not milky).
      const phi = THREE.MathUtils.degToRad(90 - 44);
      const theta = THREE.MathUtils.degToRad(isMirageAnubis ? 42 : 35);
      this.sunDirection.setFromSphericalCoords(1, phi, theta);

      uniforms.turbidity.value = 2.6;
      uniforms.rayleigh.value = 1.55;
      uniforms.mieCoefficient.value = 0.0045;
      uniforms.mieDirectionalG.value = 0.82;
      uniforms.sunPosition.value.copy(this.sunDirection);
      uniforms.showSunDisc.value = 1.0;

      if (uniforms.cloudScale) uniforms.cloudScale.value = 0.00022;
      if (uniforms.cloudSpeed) uniforms.cloudSpeed.value = 0.000028;
      if (uniforms.cloudCoverage) uniforms.cloudCoverage.value = 0.44;
      if (uniforms.cloudDensity) uniforms.cloudDensity.value = 0.46;
      if (uniforms.cloudElevation) uniforms.cloudElevation.value = 0.45;

      this.outdoorFallbackBg.setHex(0xdccbb1);
      this.scene.background = this.outdoorFallbackBg;
      // Slightly thinner fog than before so sandstone keeps local contrast.
      this.scene.fog = fogEnabled ? new THREE.FogExp2(0xdccbb1, isMirageAnubis ? 0.0026 : 0.0035) : null;

      this.keyLightTarget.position.set(
        isMirageAnubis ? -33 : -6,
        isMirageAnubis ? 8 : 4.8,
        isMirageAnubis ? -30 : -24
      );
      this.keyLight.position
        .copy(this.keyLightTarget.position)
        .addScaledVector(this.sunDirection, isMirageAnubis ? 90 : 85);
      this.keyLight.color.setHex(0xfff7e6);
      // Mirage was 2.05 + cool level hemi → blown walls; match Dust2 contrast budget.
      this.keyLight.intensity = isMirageAnubis ? 1.65 : 1.85;
      this.updateShadowFrustum(isMirageAnubis ? 100 : 68, 175);
      this.applyFillRig('desert');
      if ('environmentIntensity' in this.scene) {
        (this.scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity =
          isMirageAnubis ? 0.35 : 0.55;
      }
    } else if (isAssault || isIndustria || isHangar || isEasternCity || isYard) {
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

      const industrialSky = isAssault || isIndustria || isHangar || isEasternCity;
      this.outdoorFallbackBg.setHex(industrialSky ? 0x1e293b : 0xcbd5e1);
      this.scene.background = this.outdoorFallbackBg;
      this.scene.fog = fogEnabled
        ? new THREE.FogExp2(
            industrialSky ? 0x1e293b : 0xcbd5e1,
            isEasternCity ? 0.0010 : isHangar ? 0.0014 : isIndustria ? 0.0009 : isAssault ? 0.0011 : 0.0048
          )
        : null;

      this.keyLightTarget.position.set(
        isEasternCity ? -8 : isHangar ? 0 : isIndustria ? 20 : isAssault ? -18 : 0,
        isEasternCity ? 6 : isHangar ? 4 : isIndustria ? 2 : 0,
        isEasternCity ? 0 : isHangar ? 0 : isIndustria ? 0 : isAssault ? 18 : 0
      );
      this.keyLight.position
        .copy(this.keyLightTarget.position)
        .addScaledVector(this.sunDirection, 80);
      this.keyLight.color.setHex(0xfffbeb);
      this.keyLight.intensity = industrialSky ? 1.55 : 1.95;
      this.updateShadowFrustum(isEasternCity ? 95 : isHangar ? 55 : isIndustria ? 90 : isAssault ? 65 : 52, 165);
      this.applyFillRig('outdoor');
      if ('environmentIntensity' in this.scene) {
        (this.scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity = 0.65;
      }
    } else {
      this.indoorBgColor.setHex(0x070a10);
      this.scene.background = this.indoorBgColor;
      this.scene.fog = fogEnabled ? new THREE.FogExp2(0x070a10, 0.011) : null;

      this.keyLightTarget.position.set(4, 0, -2);
      this.keyLight.position.set(16, 28, 12);
      this.keyLight.color.setHex(0xe2e8f0);
      this.keyLight.intensity = 1.05;
      this.keyLight.castShadow = false;
      this.applyFillRig('indoor');
      if ('environmentIntensity' in this.scene) {
        (this.scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity = 1.0;
      }
    }

    this.keyLightTarget.updateMatrixWorld();
  }

  private applyFillRig(kind: 'desert' | 'outdoor' | 'indoor'): void {
    if (this.hemiLight) {
      if (kind === 'desert') {
        this.hemiLight.color.setHex(0xfff7e6);
        this.hemiLight.groundColor.setHex(0x6e5944);
        this.hemiLight.intensity = 0.42;
      } else if (kind === 'outdoor') {
        this.hemiLight.color.setHex(0x93c5fd);
        this.hemiLight.groundColor.setHex(0x1e293b);
        this.hemiLight.intensity = 0.55;
      } else {
        this.hemiLight.color.setHex(0x93c5fd);
        this.hemiLight.groundColor.setHex(0x1e293b);
        this.hemiLight.intensity = 0.75;
      }
    }
    if (this.rimLight) {
      if (kind === 'desert') {
        this.rimLight.color.setHex(0xffd6a5);
        this.rimLight.intensity = 0.22;
      } else if (kind === 'outdoor') {
        this.rimLight.color.setHex(0x38bdf8);
        this.rimLight.intensity = 0.35;
      } else {
        this.rimLight.color.setHex(0x38bdf8);
        this.rimLight.intensity = 0.55;
      }
    }
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
