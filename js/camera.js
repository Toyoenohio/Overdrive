import * as THREE from 'three';

/**
 * GameCamera — smooth third-person follow camera.
 * Follows behind the car based on its actual rotation.
 */
export class GameCamera {
    constructor(renderer) {
        this.camera = new THREE.PerspectiveCamera(
            65,
            window.innerWidth / window.innerHeight,
            0.1,
            1200
        );

        // Offsets relative to car (in car-local space)
        this.offsetBack   = -12.0;  // behind the car
        this.offsetUp     = 5.0;    // above
        this.lookAhead    = 12.0;   // look ahead of car

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

    /**
     * @param {THREE.Vector3} carPos  - world position of the car
     * @param {number} carSpeed        - km/h
     * @param {THREE.Quaternion} carQuat - car's world rotation
     */
    update(dt, carPos, carSpeed, carQuat) {
        // FOV increases with speed
        const speedRatio = Math.min(Math.abs(carSpeed) / 120, 1);
        const targetFOV  = this.baseFOV + (this.maxFOV - this.baseFOV) * speedRatio;
        this.camera.fov  = THREE.MathUtils.lerp(this.camera.fov, targetFOV, dt * 3);
        this.camera.updateProjectionMatrix();

        // Compute "behind" and "ahead" offsets in world space
        const behind = new THREE.Vector3(0, 0, this.offsetBack).applyQuaternion(carQuat);
        const ahead  = new THREE.Vector3(0, 0, this.lookAhead).applyQuaternion(carQuat);

        const targetPos = new THREE.Vector3(
            carPos.x + behind.x,
            carPos.y + this.offsetUp,
            carPos.z + behind.z,
        );

        const targetLook = new THREE.Vector3(
            carPos.x + ahead.x,
            carPos.y + 1.2,
            carPos.z + ahead.z,
        );

        // Smooth interpolation
        this._pos.lerp(targetPos, this.posDamping * dt);
        this._lookAt.lerp(targetLook, this.lookDamping * dt);

        this.camera.position.copy(this._pos);
        this.camera.lookAt(this._lookAt);
    }

    getCamera() { return this.camera; }

    reset(carPos, carQuat = null) {
        if (carQuat) {
            const behind = new THREE.Vector3(0, 0, this.offsetBack).applyQuaternion(carQuat);
            const ahead  = new THREE.Vector3(0, 0, this.lookAhead).applyQuaternion(carQuat);
            this._pos.set(
                carPos.x + behind.x,
                carPos.y + this.offsetUp,
                carPos.z + behind.z,
            );
            this._lookAt.set(
                carPos.x + ahead.x,
                carPos.y + 1.2,
                carPos.z + ahead.z,
            );
        } else {
            this._pos.set(
                carPos.x,
                carPos.y + this.offsetUp,
                carPos.z + this.offsetBack,
            );
            this._lookAt.set(
                carPos.x,
                carPos.y + 1.2,
                carPos.z + this.lookAhead,
            );
        }
        this.camera.position.copy(this._pos);
        this.camera.lookAt(this._lookAt);
        this.camera.fov = this.baseFOV;
        this.camera.updateProjectionMatrix();
    }
}
