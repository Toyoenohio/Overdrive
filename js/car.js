import * as THREE from 'three';

/**
 * Car — low-poly vehicle model with arcade-style physics.
 */
export class Car {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();

        /* --- Physics --- */
        this.speed          = 0;     // km/h
        this.maxSpeed        = 80;
        this.acceleration    = 30;   // km/h per second
        this.brakeForce      = 50;
        this.naturalDecel    = 18;
        this.lateralSpeed    = 0;
        this.maxLateralSpeed = 14;

        /* --- State --- */
        this.distanceTraveled = 0;

        this._buildModel();
        this._createHeadlightBeams();

        scene.add(this.group);
    }

    /* ========================================================
     *  MODEL
     * ====================================================== */
    _buildModel() {
        const bodyColor = 0xe63946;
        const bodyMat = new THREE.MeshStandardMaterial({
            color: bodyColor, flatShading: true, metalness: 0.4, roughness: 0.6
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

        // Cabin / glass
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x1a759f, flatShading: true,
            metalness: 0.8, roughness: 0.2, transparent: true, opacity: 0.65
        });
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.55, 2.1), glassMat);
        cabin.position.set(0, 1.35, -0.25);
        cabin.castShadow = true;
        this.group.add(cabin);

        // Roof ridge
        const roofMat = new THREE.MeshStandardMaterial({
            color: 0xc1121f, flatShading: true, metalness: 0.35, roughness: 0.65
        });
        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.6), roofMat);
        roof.position.set(0, 1.68, -0.3);
        this.group.add(roof);

        // Wheels
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, flatShading: true, roughness: 0.95 });
        const rimMat   = new THREE.MeshStandardMaterial({ color: 0x888888, flatShading: true, metalness: 0.8 });
        const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 8);
        const rimGeo   = new THREE.CylinderGeometry(0.18, 0.18, 0.25, 6);

        this.wheels = [];
        const wp = [
            [-1.15, 0.34, 1.45],
            [ 1.15, 0.34, 1.45],
            [-1.15, 0.34,-1.45],
            [ 1.15, 0.34,-1.45],
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

        // Headlights
        this.headlightMat = new THREE.MeshStandardMaterial({
            color: 0xffee88, emissive: 0xffdd57, emissiveIntensity: 0.3, flatShading: true
        });
        const hlGeo = new THREE.BoxGeometry(0.32, 0.18, 0.1);
        for (const sx of [-0.72, 0.72]) {
            const hl = new THREE.Mesh(hlGeo, this.headlightMat);
            hl.position.set(sx, 0.48, 2.4);
            this.group.add(hl);
        }

        // Taillights
        this.taillightMat = new THREE.MeshStandardMaterial({
            color: 0xff0000, emissive: 0xff2222, emissiveIntensity: 0.5, flatShading: true
        });
        const tlGeo = new THREE.BoxGeometry(0.38, 0.14, 0.1);
        for (const sx of [-0.78, 0.78]) {
            const tl = new THREE.Mesh(tlGeo, this.taillightMat);
            tl.position.set(sx, 0.48, -2.4);
            this.group.add(tl);
        }

        // Bumpers
        const bMat = new THREE.MeshStandardMaterial({ color: 0x222222, flatShading: true, metalness: 0.3 });
        const fBump = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.28, 0.25), bMat);
        fBump.position.set(0, 0.24, 2.38);
        this.group.add(fBump);
        const rBump = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.28, 0.25), bMat);
        rBump.position.set(0, 0.24, -2.38);
        this.group.add(rBump);
    }

    /* ========================================================
     *  HEADLIGHT BEAMS (SpotLights)
     * ====================================================== */
    _createHeadlightBeams() {
        this.spotL = new THREE.SpotLight(0xffffcc, 0, 60, Math.PI / 7, 0.6, 1.2);
        this.spotL.position.set(-0.7, 0.5, 2.5);
        this.spotL.target.position.set(-0.7, -0.5, 25);
        this.group.add(this.spotL);
        this.group.add(this.spotL.target);

        this.spotR = new THREE.SpotLight(0xffffcc, 0, 60, Math.PI / 7, 0.6, 1.2);
        this.spotR.position.set(0.7, 0.5, 2.5);
        this.spotR.target.position.set(0.7, -0.5, 25);
        this.group.add(this.spotR);
        this.group.add(this.spotR.target);
    }

    /** Set headlight intensity (0 = off, 1 = full). */
    setHeadlights(intensity) {
        const i = Math.max(0, Math.min(1, intensity));
        this.spotL.intensity = i * 4;
        this.spotR.intensity = i * 4;
        this.headlightMat.emissiveIntensity = 0.3 + i * 0.7;
    }

    /* ========================================================
     *  UPDATE (called every frame)
     * ====================================================== */
    update(dt, input) {
        // Throttle
        if (input.throttle) this.speed += this.acceleration * dt;
        // Brake
        if (input.brake)    this.speed -= this.brakeForce * dt;
        // Handbrake
        if (input.handbrake) this.speed *= (1 - 3.5 * dt);
        // Natural decel
        if (!input.throttle && !input.brake && !input.handbrake) {
            this.speed = Math.max(0, this.speed - this.naturalDecel * dt);
        }
        this.speed = THREE.MathUtils.clamp(this.speed, 0, this.maxSpeed);

        const speedMs = this.speed / 3.6;

        // Lateral steering
        const steer = input.steerLeft - input.steerRight;
        const target = steer * this.maxLateralSpeed * (this.speed / this.maxSpeed);
        this.lateralSpeed = THREE.MathUtils.lerp(this.lateralSpeed, target, dt * 8);

        // Move
        this.group.position.z += speedMs * dt;
        this.group.position.x += this.lateralSpeed * dt;

        // Clamp to road
        this.group.position.x = THREE.MathUtils.clamp(this.group.position.x, -6.5, 6.5);

        // Visual tilt
        const tiltY = -steer * 0.15 * (this.speed / this.maxSpeed);
        this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, tiltY, dt * 5);
        const tiltZ = steer * 0.045;
        this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, tiltZ, dt * 4);

        // Wheel spin
        const spin = speedMs * dt * 2.5;
        for (const w of this.wheels) {
            w.children[0].rotation.x += spin;
            w.children[1].rotation.x += spin;
        }

        // Brake lights intensity
        const braking = input.brake || input.handbrake;
        this.taillightMat.emissiveIntensity = braking ? 1.0 : 0.4;

        this.distanceTraveled += speedMs * dt;
    }

    getPosition() { return this.group.position; }

    getBoundingBox() {
        return {
            x: this.group.position.x,
            z: this.group.position.z,
            width: 2.0,
            length: 4.5,
        };
    }

    reset() {
        this.speed = 0;
        this.lateralSpeed = 0;
        this.distanceTraveled = 0;
        this.group.position.set(0, 0, 0);
        this.group.rotation.set(0, 0, 0);
    }
}
