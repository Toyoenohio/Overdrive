import * as THREE from 'three';

/**
 * Environment — permanent cyberpunk night sky, dim moonlight, stars.
 */
export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.totalTime = 0;

        this._setupLighting();
        this._setupFog();
        this._createStars();
    }

    /* ---------- Lighting ---------- */
    _setupLighting() {
        // Moonlight — dim blue-purple directional
        this.sunLight = new THREE.DirectionalLight(0x3344aa, 0.35);
        this.sunLight.position.set(40, 90, 60);
        this.sunLight.castShadow = true;
        const s = this.sunLight.shadow;
        s.mapSize.width  = 2048;
        s.mapSize.height = 2048;
        s.camera.near   = 1;
        s.camera.far    = 250;
        s.camera.left   = -60;
        s.camera.right  =  60;
        s.camera.top    =  60;
        s.camera.bottom = -60;
        s.bias = -0.0005;
        this.scene.add(this.sunLight);
        this.scene.add(this.sunLight.target);

        // Ambient — faint blue-violet fill
        this.ambientLight = new THREE.AmbientLight(0x1a1040, 0.18);
        this.scene.add(this.ambientLight);

        // Hemisphere — purple sky / dark ground
        this.hemiLight = new THREE.HemisphereLight(0x1a0a2e, 0x050510, 0.10);
        this.scene.add(this.hemiLight);
    }

    /* ---------- Fog ---------- */
    _setupFog() {
        this.scene.fog = new THREE.Fog(0x060818, 40, 300);
        this.scene.background = new THREE.Color(0x0a0618);
    }

    /* ---------- Stars ---------- */
    _createStars() {
        const count = 1800;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi   = Math.random() * Math.PI * 0.45;
            const r     = 320 + Math.random() * 180;
            positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.cos(phi) + 30;
            positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        this.starsMat = new THREE.PointsMaterial({
            color: 0xeeeeff, size: 1.4, transparent: true, opacity: 0.72,
            sizeAttenuation: true,
        });
        this.stars = new THREE.Points(geo, this.starsMat);
        this.scene.add(this.stars);
    }

    /* ==========================================================
     *  PUBLIC API
     * ======================================================== */
    update(dt, carZ) {
        this.totalTime += dt;

        // Follow car with shadow frustum
        this.sunLight.position.set(carZ * 0.05 + 40, 90, carZ + 60);
        this.sunLight.target.position.set(0, 0, carZ);

        // Stars centered on player
        this.stars.position.z = carZ;
    }

    getDayFactor() { return 0; }   // always night

    reset() { this.totalTime = 0; }
}
