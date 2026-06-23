import * as THREE from 'three';

/**
 * GameCamera — smooth third-person follow camera with speed-based FOV.
 */
export class GameCamera {
    constructor(renderer) {
        this.camera = new THREE.PerspectiveCamera(
            65,
            window.innerWidth / window.innerHeight,
            0.1,
            1200
        );

        // Offsets relative to car
        this.offsetY     = 5.0;
        this.offsetZ     = -11.0;   // behind the car (negative Z)
        this.lookAheadY  = 1.2;
        this.lookAheadZ  = 12.0;    // look ahead (positive Z)

        // Smoothing
        this.posDamping    = 4.0;
        this.lookDamping   = 6.0;

        // FOV
        this.baseFOV = 62;
        this.maxFOV  = 72;

        // Internal state
        this._pos    = new THREE.Vector3();
        this._lookAt = new THREE.Vector3();

        // Resize handler
        this._onResize = () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', this._onResize);
    }

    /* ---------- Update (every frame) ---------- */
    update(dt, carPos, carSpeed, carRotY) {
        // FOV → increases with speed
        const speedRatio = carSpeed / 80;
        const targetFOV  = this.baseFOV + (this.maxFOV - this.baseFOV) * speedRatio;
        this.camera.fov  = THREE.MathUtils.lerp(this.camera.fov, targetFOV, dt * 3);
        this.camera.updateProjectionMatrix();

        // Lateral offset follows car rotation (steering)
        const lateralOff = carRotY * 4;

        const targetPos = new THREE.Vector3(
            carPos.x + lateralOff,
            carPos.y + this.offsetY,
            carPos.z + this.offsetZ
        );

        const targetLook = new THREE.Vector3(
            carPos.x,
            carPos.y + this.lookAheadY,
            carPos.z + this.lookAheadZ
        );

        // Smooth interpolation
        this._pos.lerp(targetPos, this.posDamping * dt);
        this._lookAt.lerp(targetLook, this.lookDamping * dt);

        this.camera.position.copy(this._pos);
        this.camera.lookAt(this._lookAt);
    }

    getCamera() { return this.camera; }

    /** Snap camera to initial position (no lerp). */
    reset(carPos) {
        this._pos.set(
            carPos.x,
            carPos.y + this.offsetY,
            carPos.z + this.offsetZ
        );
        this._lookAt.set(
            carPos.x,
            carPos.y + this.lookAheadY,
            carPos.z + this.lookAheadZ
        );
        this.camera.position.copy(this._pos);
        this.camera.lookAt(this._lookAt);
        this.camera.fov = this.baseFOV;
        this.camera.updateProjectionMatrix();
    }
}
