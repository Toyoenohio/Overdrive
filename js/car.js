import * as THREE from 'three';

/**
 * Car — low-poly vehicle model with free 2D arcade physics.
 * Moves in the direction it faces. Steering rotates the car.
 */
export class Car {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();

        /* --- Physics --- */
        this.speed          = 0;     // km/h
        this.maxSpeed        = 160;
        this.acceleration    = 45;   // km/h per second
        this.brakeForce      = 55;
        this.naturalDecel    = 20;
        this.steerSpeed      = 2.2;  // radians per second at full lock
        this.maxSteerAngle   = 0.55; // ~31° max steering angle

        /* --- State --- */
        this.distanceTraveled = 0;

        this._buildModel();
        this._createHeadlightBeams();

        scene.add(this.group);
    }

    /* ========================================================
     *  MODEL (unchanged from original)
     * ====================================================== */
    _buildModel() {
        const bodyColor = 0xe63946;
        const bodyMat = new THREE.MeshStandardMaterial({
            color: bodyColor, flatShading: true, metalness: 0.4, roughness: 0.6
        });

        const lower = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 4.8), bodyMat);
        lower.position.y = 0.38;
        lower.castShadow = true;
        this.group.add(lower);

        const upper = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.35, 4.4), bodyMat);
        upper.position.y = 0.88;
        upper.castShadow = true;
        this.group.add(upper);

        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x1a759f, flatShading: true,
            metalness: 0.8, roughness: 0.2, transparent: true, opacity: 0.65
        });
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.55, 2.1), glassMat);
        cabin.position.set(0, 1.35, -0.25);
        cabin.castShadow = true;
        this.group.add(cabin);

        const roofMat = new THREE.MeshStandardMaterial({
            color: 0xc1121f, flatShading: true, metalness: 0.35, roughness: 0.65
        });
        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.6), roofMat);
        roof.position.set(0, 1.68, -0.3);
        this.group.add(roof);

        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, flatShading: true, roughness: 0.95 });
        const rimMat   = new THREE.MeshStandardMaterial({ color: 0x888888, flatShading: true, metalness: 0.8 });
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

        this.headlightMat = new THREE.MeshStandardMaterial({
            color: 0xffee88, emissive: 0xffdd57, emissiveIntensity: 0.3, flatShading: true
        });
        const hlGeo = new THREE.BoxGeometry(0.32, 0.18, 0.1);
        for (const sx of [-0.72, 0.72]) {
            const hl = new THREE.Mesh(hlGeo, this.headlightMat);
            hl.position.set(sx, 0.48, 2.4);
            this.group.add(hl);
        }

        this.taillightMat = new THREE.MeshStandardMaterial({
            color: 0xff0000, emissive: 0xff2222, emissiveIntensity: 0.5, flatShading: true
        });
        const tlGeo = new THREE.BoxGeometry(0.38, 0.14, 0.1);
        for (const sx of [-0.78, 0.78]) {
            const tl = new THREE.Mesh(tlGeo, this.taillightMat);
            tl.position.set(sx, 0.48, -2.4);
            this.group.add(tl);
        }

        const bMat = new THREE.MeshStandardMaterial({ color: 0x222222, flatShading: true, metalness: 0.3 });
        const fBump = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.28, 0.25), bMat);
        fBump.position.set(0, 0.24, 2.38);
        this.group.add(fBump);
        const rBump = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.28, 0.25), bMat);
        rBump.position.set(0, 0.24, -2.38);
        this.group.add(rBump);
    }

    _createHeadlightBeams() {
        this.spotL = new THREE.SpotLight(0xffffcc, 0, 120, Math.PI / 5, 0.4, 1.0);
        this.spotL.position.set(-0.7, 0.5, 2.5);
        this.spotL.target.position.set(-0.7, -0.5, 30);
        this.group.add(this.spotL);
        this.group.add(this.spotL.target);

        this.spotR = new THREE.SpotLight(0xffffcc, 0, 120, Math.PI / 5, 0.4, 1.0);
        this.spotR.position.set(0.7, 0.5, 2.5);
        this.spotR.target.position.set(0.7, -0.5, 30);
        this.group.add(this.spotR);
        this.group.add(this.spotR.target);
    }

    setHeadlights(intensity) {
        const i = Math.max(0, Math.min(1, intensity));
        this.spotL.intensity = i * 6;
        this.spotR.intensity = i * 6;
        this.headlightMat.emissiveIntensity = 0.3 + i * 0.7;
    }

    /* ========================================================
     *  UPDATE — free 2D movement
     * ====================================================== */
    update(dt, input) {
        // Input polling
        const throttle = input.throttle;
        const brake = input.brake;
        const steerLeft = input.steerLeft;
        const steerRight = input.steerRight;
        const steer = steerRight - steerLeft; // -1..1

        // Acceleration / braking
        if (throttle) {
            this.speed += this.acceleration * throttle * dt;
        }
        if (brake) {
            this.speed -= this.brakeForce * brake * dt;
        }
        if (input.handbrake) {
            this.speed *= (1 - 3.5 * dt);
        }
        if (!throttle && !brake && !input.handbrake) {
            this.speed = Math.max(0, this.speed - this.naturalDecel * dt);
        }
        this.speed = THREE.MathUtils.clamp(this.speed, -15, this.maxSpeed);

        const speedMs = this.speed / 3.6;

        // Steering rotates the car (speed-dependent)
        if (Math.abs(steer) > 0.01 && Math.abs(this.speed) > 0.5) {
            const steerAmount = steer * this.steerSpeed * dt;
            this.group.rotation.y += steerAmount;
        }

        // Move forward in the direction the car faces
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion);
        this.group.position.x += forward.x * speedMs * dt;
        this.group.position.z += forward.z * speedMs * dt;

        // Visual body tilt when steering
        const tiltZ = -steer * 0.06 * Math.min(Math.abs(this.speed) / 30, 1);
        this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, tiltZ, dt * 5);

        // Wheel spin
        const spin = speedMs * dt * 2.5;
        for (const w of this.wheels) {
            w.children[0].rotation.x += spin;
            w.children[1].rotation.x += spin;
        }

        // Brake lights
        const braking = brake || input.handbrake;
        this.taillightMat.emissiveIntensity = braking ? 1.0 : 0.4;

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
