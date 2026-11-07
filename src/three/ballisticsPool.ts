import * as THREE from 'three';
import { soundEngine } from '../audio/soundEngine';

interface BrassShellInstance {
  mesh: THREE.Mesh;
  active: boolean;
  age: number;
  bounced: boolean;
  vel: THREE.Vector3;
  angVel: THREE.Vector3;
}

interface DroppedMagInstance {
  mesh: THREE.Mesh;
  active: boolean;
  age: number;
  bounced: boolean;
  vel: THREE.Vector3;
  angVel: THREE.Vector3;
}

interface SparkParticle {
  mesh: THREE.Mesh;
  active: boolean;
  age: number;
  maxAge: number;
  vel: THREE.Vector3;
}

interface BulletDecalInstance {
  mesh: THREE.Mesh;
  active: boolean;
}

interface TracerBeamInstance {
  line: THREE.Line;
  mat: THREE.LineBasicMaterial;
  active: boolean;
  age: number;
}

// Module-scope reusable math temporaries (Zero GC in update loop)
const _upVec = new THREE.Vector3(0, 0, 1);
const _quat = new THREE.Quaternion();

export class BallisticsFXPool {
  private group = new THREE.Group();
  private shells: BrassShellInstance[] = [];
  private shellCursor = 0;

  private droppedMags: DroppedMagInstance[] = [];
  private magCursor = 0;

  private sparks: SparkParticle[] = [];
  private sparkCursor = 0;

  private decals: BulletDecalInstance[] = [];
  private decalCursor = 0;

  private tracers: TracerBeamInstance[] = [];
  private tracerCursor = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);

    // 1. Pool of 32 Brass 5.56mm Casings
    const shellGeo = new THREE.CylinderGeometry(0.0048, 0.005, 0.044, 8);
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      metalness: 0.94,
      roughness: 0.2,
    });
    for (let i = 0; i < 32; i++) {
      const mesh = new THREE.Mesh(shellGeo, shellMat);
      mesh.visible = false;
      this.group.add(mesh);
      this.shells.push({
        mesh,
        active: false,
        age: 0,
        bounced: false,
        vel: new THREE.Vector3(),
        angVel: new THREE.Vector3(),
      });
    }

    // 2. Pool of 8 Dropped Polymer Magazines (for Emergency Speed Reloads)
    const magGeo = new THREE.BoxGeometry(0.028, 0.165, 0.068);
    const magMat = new THREE.MeshStandardMaterial({
      color: 0x8c7355,
      roughness: 0.78,
      metalness: 0.1,
    });
    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(magGeo, magMat);
      mesh.visible = false;
      this.group.add(mesh);
      this.droppedMags.push({
        mesh,
        active: false,
        age: 0,
        bounced: false,
        vel: new THREE.Vector3(),
        angVel: new THREE.Vector3(),
      });
    }

    // 3. Pool of 64 Impact Spark Particles
    const sparkGeo = new THREE.BoxGeometry(0.018, 0.018, 0.065);
    for (let i = 0; i < 64; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(sparkGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.sparks.push({
        mesh,
        active: false,
        age: 0,
        maxAge: 0.28,
        vel: new THREE.Vector3(),
      });
    }

    // 4. Pool of 45 Bullet Hole Decals (polygonOffset prevents Z-fighting)
    const decalGeo = new THREE.CircleGeometry(0.026, 10);
    const decalMat = new THREE.MeshBasicMaterial({
      color: 0x090b0f,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      depthWrite: false,
    });
    for (let i = 0; i < 45; i++) {
      const mesh = new THREE.Mesh(decalGeo, decalMat);
      mesh.visible = false;
      this.group.add(mesh);
      this.decals.push({ mesh, active: false });
    }

    // 5. Pool of 12 Supersonic Ballistic Tracer Streaks
    for (let i = 0; i < 12; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(0, 0, -1),
      ]);
      const mat = new THREE.LineBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(geo, mat);
      line.visible = false;
      line.frustumCulled = false;
      this.group.add(line);
      this.tracers.push({ line, mat, active: false, age: 0 });
    }
  }

  public spawnBrassCasing(
    worldPos: THREE.Vector3,
    cameraRight: THREE.Vector3,
    cameraUp: THREE.Vector3
  ): void {
    const item = this.shells[this.shellCursor];
    this.shellCursor = (this.shellCursor + 1) % this.shells.length;

    item.active = true;
    item.age = 0;
    item.bounced = false;
    item.mesh.visible = true;
    item.mesh.position.copy(worldPos);
    item.mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    // Eject up and right
    item.vel
      .copy(cameraRight)
      .multiplyScalar(2.2 + Math.random() * 0.9)
      .addScaledVector(cameraUp, 1.35 + Math.random() * 0.55);

    item.angVel.set(
      (Math.random() - 0.5) * 28,
      (Math.random() - 0.5) * 28,
      (Math.random() - 0.5) * 28
    );
  }

  public spawnDroppedMagazine(worldPos: THREE.Vector3, forwardDir: THREE.Vector3): void {
    const item = this.droppedMags[this.magCursor];
    this.magCursor = (this.magCursor + 1) % this.droppedMags.length;

    item.active = true;
    item.age = 0;
    item.bounced = false;
    item.mesh.visible = true;
    item.mesh.position.copy(worldPos);
    item.vel
      .copy(forwardDir)
      .multiplyScalar(0.8)
      .setY(-1.4);
    item.angVel.set(4.5, (Math.random() - 0.5) * 6, 3.2);
  }

  public spawnImpactFX(
    hitPoint: THREE.Vector3,
    hitNormal: THREE.Vector3,
    isMetallic: boolean,
    isCrit: boolean
  ): void {
    // 1. Place bullet decal slightly offset along surface normal
    const decal = this.decals[this.decalCursor];
    this.decalCursor = (this.decalCursor + 1) % this.decals.length;
    decal.active = true;
    decal.mesh.visible = true;
    decal.mesh.position.copy(hitPoint).addScaledVector(hitNormal, 0.004);
    _quat.setFromUnitVectors(_upVec, hitNormal);
    decal.mesh.quaternion.copy(_quat);

    // 2. Burst of 10 pooled sparks
    const count = isMetallic || isCrit ? 14 : 7;
    const sparkColor = isCrit ? 0xef4444 : isMetallic ? 0xfbbf24 : 0x94a3b8;
    for (let i = 0; i < count; i++) {
      const sp = this.sparks[this.sparkCursor];
      this.sparkCursor = (this.sparkCursor + 1) % this.sparks.length;

      sp.active = true;
      sp.age = 0;
      sp.maxAge = 0.18 + Math.random() * 0.18;
      sp.mesh.visible = true;
      sp.mesh.position.copy(hitPoint).addScaledVector(hitNormal, 0.02);
      (sp.mesh.material as THREE.MeshBasicMaterial).color.setHex(sparkColor);
      (sp.mesh.material as THREE.MeshBasicMaterial).opacity = 1;

      const speed = isMetallic ? 5.5 + Math.random() * 6.5 : 2.5 + Math.random() * 3.5;
      sp.vel
        .copy(hitNormal)
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 1.4,
            Math.random() * 1.1,
            (Math.random() - 0.5) * 1.4
          )
        )
        .normalize()
        .multiplyScalar(speed);
    }
  }

  public spawnTracer(startPos: THREE.Vector3, endPos: THREE.Vector3, colorHex = 0xfde047): void {
    const tr = this.tracers[this.tracerCursor];
    this.tracerCursor = (this.tracerCursor + 1) % this.tracers.length;

    const posAttr = tr.line.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.setXYZ(0, startPos.x, startPos.y, startPos.z);
    posAttr.setXYZ(1, endPos.x, endPos.y, endPos.z);
    posAttr.needsUpdate = true;

    tr.mat.color.setHex(colorHex);
    tr.mat.opacity = 0.72;
    tr.active = true;
    tr.age = 0;
    tr.line.visible = true;
  }

  public update(dt: number): void {
    // Update Brass Shells
    for (let i = 0; i < this.shells.length; i++) {
      const s = this.shells[i];
      if (!s.active) continue;
      s.age += dt;
      if (s.age > 8.0) {
        s.active = false;
        s.mesh.visible = false;
        continue;
      }
      if (s.mesh.position.y > 0.012 || s.vel.y > 0) {
        s.vel.y -= 13.5 * dt;
        s.mesh.position.addScaledVector(s.vel, dt);
        s.mesh.rotation.x += s.angVel.x * dt;
        s.mesh.rotation.y += s.angVel.y * dt;
        s.mesh.rotation.z += s.angVel.z * dt;

        if (s.mesh.position.y <= 0.012) {
          s.mesh.position.y = 0.012;
          s.vel.y = Math.abs(s.vel.y) * 0.35;
          s.vel.x *= 0.55;
          s.vel.z *= 0.55;
          s.angVel.multiplyScalar(0.4);
          if (!s.bounced) {
            s.bounced = true;
            soundEngine.playShellBounce();
          }
          if (s.vel.y < 0.35) {
            s.vel.set(0, 0, 0);
            s.angVel.set(0, 0, 0);
          }
        }
      }
    }

    // Update Dropped Magazines
    for (let i = 0; i < this.droppedMags.length; i++) {
      const m = this.droppedMags[i];
      if (!m.active) continue;
      m.age += dt;
      if (m.mesh.position.y > 0.03 || m.vel.y > 0) {
        m.vel.y -= 14.0 * dt;
        m.mesh.position.addScaledVector(m.vel, dt);
        m.mesh.rotation.x += m.angVel.x * dt;
        m.mesh.rotation.y += m.angVel.y * dt;
        m.mesh.rotation.z += m.angVel.z * dt;

        if (m.mesh.position.y <= 0.03) {
          m.mesh.position.y = 0.03;
          m.vel.set(0, 0, 0);
          m.angVel.set(0, 0, 0);
          m.mesh.rotation.x = Math.PI / 2;
          if (!m.bounced) {
            m.bounced = true;
            soundEngine.playReloadStage('MAG_DROP_FLOOR');
          }
        }
      }
    }

    // Update Sparks
    for (let i = 0; i < this.sparks.length; i++) {
      const sp = this.sparks[i];
      if (!sp.active) continue;
      sp.age += dt;
      if (sp.age >= sp.maxAge) {
        sp.active = false;
        sp.mesh.visible = false;
        continue;
      }
      sp.vel.y -= 12.0 * dt;
      sp.mesh.position.addScaledVector(sp.vel, dt);
      sp.mesh.lookAt(
        sp.mesh.position.x + sp.vel.x,
        sp.mesh.position.y + sp.vel.y,
        sp.mesh.position.z + sp.vel.z
      );
      (sp.mesh.material as THREE.MeshBasicMaterial).opacity =
        1 - sp.age / sp.maxAge;
    }

    // Update Tracers
    for (let i = 0; i < this.tracers.length; i++) {
      const tr = this.tracers[i];
      if (!tr.active) continue;
      tr.age += dt;
      if (tr.age >= 0.085) {
        tr.active = false;
        tr.line.visible = false;
      } else {
        tr.mat.opacity = 0.72 * (1 - tr.age / 0.085);
      }
    }
  }
}
