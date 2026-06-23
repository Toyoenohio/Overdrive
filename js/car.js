import * as THREE from 'three';

/**
 * Car — cyberpunk low-poly vehicle: dark metallic body, neon accents.
 */
export class Car {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();

        /* --- Physics --- */
        this.speed          = 0;
        this.maxSpeed        = 160;
        this.acceleration    = 45;
        this.brakeForce      = 55;
        this.naturalDecel    = 20;
        this.steerSpeed      = 2.2;
        this.maxSteerAngle   = 0.55;

        /* --- State --- */
        this.distanceTraveled = 0;

        this._buildModel();
        this._createHeadlightBeams();

        scene.add(this.group);
    }

    /* ========================================================
     *  CYBERPUNK MODEL
     * ====================================================== */
    _buildModel() {
        // Dark metallic body
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x22222e, flatShading: true, metalness: 0.7, roughness: 0.3,
        });

        // Lower body
        const lower = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 4.8), bodyMat);
        lower.position.y = 0.38;
        lower.castShadow = true;
        this.group.add(lower);

        // Upper body
        const upper = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.35, 4.4), bodyMat);
        upper.position.y = 0.88;
        upper.castShadow = true;
        this.group.add(upper);

        // Cabin glass — cyan tint
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x115577, flatShading: true,
            metalness: 0.8, roughness: 0.1, transparent: true, opacity: 0.55,
            emissive: 0x004455, emissiveIntensity: 0.15,
        });
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.55, 2.1), glassMat);
        cabin.position.set(0, 1.35, -0.25);
        cabin.castShadow = true;
        this.group.add(cabin);

        // Roof
        const roofMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a28, flatShading: true, metalness: 0.6, roughness: 0.35,
        });
        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.6), roofMat);
        roof.position.set(0, 1.68, -0.3);
        this.group.add(roof);

        // Neon accent strip along bottom (cyan)
        const accentMat = new THREE.MeshStandardMaterial({
            color: 0x00ffff, emissive: 0x00cccc,
            emissiveIntensity: 1.2, flatShading: true,
        });
        for (const sx of [-1.12, 1.12]) {
            const strip = new THREE.Mesh(
                new THREE.BoxGeometry(0.04, 0.06, 4.6),
                accentMat
            );
            strip.position.set(sx, 0.12, 0);
            this.group.add(strip);
        }

        // Wheels
        const wheelMat = new THREE.MeshStandardMaterial({
            color: 0x111118, flatShading: true, roughness: 0.95,
        });
        const rimMat = new THREE.MeshStandardMaterial({
            color: 0x556666, flatShading: true, metalness: 0.8,
        });
        const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 8);
        const rimGeo   = new THREE.CylinderGeometry(0.18, 0.18, 0.25, 6);

        this.wheels = [];
        const wp = [
            [-1.15, 0.34, 1.45], [1.15, 0.34, 1.45],
            [-1.15, 0.34,-1.45], [1.15, 0.34,-1.45],
        ];
        for (const p of wp) {
            const g = new THREE.Group();
            const w = new THREE.Mesh(wheelGeo, wheelMat);
            w.rotation.z = Math.PI / 2;
            g.add(w);
            const r = new THREE.Mesh(rimGeo, rimMat);
            r.rotation.z = Math.PI / 2;
            g.add(r);
            g.position.set(...p);
            g.castShadow = true;
            this.wheels.push(g);
            this.group.add(g);
        }

        // Headlights — bright white-yellow
        this.headlightMat = new THREE.MeshStandardMaterial({
            color: 0xffee88, emissive: 0xffdd57,
            emissiveIntensity: 0.8, flatShading: true,
        });
        const hlGeo = new THREE.BoxGeometry(0.32, 0.18, 0.1);
        for (const sx of [-0.72, 0.72]) {
            const hl = new THREE.Mesh(hlGeo, this.headlightMat);
            hl.position.set(sx, 0.48, 2.4);
            this.group.add(hl);
        }

        // Taillights — intense red neon
        this.taillightMat = new THREE.MeshStandardMaterial({
            color: 0xff0044, emissive: 0xff0033,
            emissiveIntensity: 1.2, flatShading: true,
        });
        const tlGeo = new THREE.BoxGeometry(0.38, 0.14, 0.1);
        for (const sx of [-0.78, 0.78]) {
            const tl = new THREE.Mesh(tlGeo, this.taillightMat);
            tl.position.set(sx, 0.48, -2.4);
            this.group.add(tl);
        }

        // Rear neon bar (connects taillights)
        const rearBar = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.04, 0.06),
            new THREE.MeshStandardMaterial({
                color: 0xff0044, emissive: 0xff0033,
                emissiveIntensity: 0.8, flatShading: true,
            })
        );
        rearBar.position.set(0, 0.48, -2.42);
        this.group.add(rearBar);

        // Bumpers
        const bMat = new THREE.MeshStandardMaterial({
            color: 0x181822, flatShading: true, metalness: 0.4,
        });
        const fBump = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.28, 0.25), bMat);
        fBump.position.set(0, 0.24, 2.38);
        this.group.add(fBump);
        const rBump = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.28, 0.25), bMat);
        rBump.position.set(0, 0.24, -2.38);
        this.group.add(rBump);
    }

    _createHeadlightBeams() {
        this.spotL = new THREE.SpotLight(0xffeedd, 15, 200, Math.PI / 4, 0.35, 0.8);
        this.spotL.position.set(-0.7, 0.5, 2.5);
        this.spotL.target.position.set(-0.7, -0.5, 35);
        this.spotL.castShadow = true;
        this.group.add(this.spotL);
        this.group.add(this.spotL.target);

        this.spotR = new THREE.SpotLight(0xffeedd, 15, 200, Math.PI / 4, 0.35, 0.8);
        this.spotR.position.set(0.7, 0.5, 2.5);
        this.spotR.target.position.set(0.7, -0.5, 35);
        this.spotR.castShadow = true;
        this.group.add(this.spotR);
        this.group.add(this.spotR.target);
    }

    setHeadlights(intensity) {
        const i = Math.max(0, Math.min(1, intensity));
        this.spotL.intensity = 10 + i * 10;
        this.spotR.intensity = 10 + i * 10;
        this.headlightMat.emissiveIntensity = 0.8 + i * 0.5;
    }

    /* ========================================================
     *  UPDATE — free 2D movement
     * ====================================================== */
    update(dt, input) {
        const throttle = input.throttle;
        const brake = input.brake;
        const steerLeft = input.steerLeft;
        const steerRight = input.steerRight;
        const steer = steerRight - steerLeft;

        if (throttle) this.speed += this.acceleration * throttle * dt;
        if (brake)    this.speed -= this.brakeForce * brake * dt;
        if (input.handbrake) this.speed *= (1 - 3.5 * dt);
        if (!throttle && !brake && !input.handbrake) {
            this.speed = Math.max(0, this.speed - this.naturalDecel * dt);
        }
        this.speed = THREE.MathUtils.clamp(this.speed, -15, this.maxSpeed);

        const speedMs = this.speed / 3.6;

        // Steering
        if (Math.abs(steer) > 0.01 && Math.abs(this.speed) > 0.5) {
            this.group.rotation.y += steer * this.steerSpeed * dt;
        }

        // Move forward
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion);
        this.group.position.x += forward.x * speedMs * dt;
        this.group.position.z += forward.z * speedMs * dt;

        // Body tilt
        const tiltZ = -steer * 0.06 * Math.min(Math.abs(this.speed) / 30, 1);
        this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, tiltZ, dt * 5);

        // Wheel spin
        const spin = speedMs * dt * 2.5;
        for (const w of this.wheels) {
            w.children[0].rotation.x += spin;
            w.children[1].rotation.x += spin;
        }

        // Brake lights
        this.taillightMat.emissiveIntensity = (brake || input.handbrake) ? 2.0 : 1.2;

        this.distanceTraveled += Math.abs(speedMs) * dt;
    }

    getPosition() { return this.group.position; }

    reset() {
        this.speed = 0;
        this.distanceTraveled = 0;
        this.group.position.set(0, 0, 0);
        this.group.rotation.set(0, 0, 0);
    }
}
