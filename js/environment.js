import * as THREE from 'three';

/**
 * Environment — lighting, sky, fog, stars, and day/night cycle.
 *
 * Cycle: 5 minutes of day → 30 s transition → 5 minutes of night → 30 s transition → repeat.
 */
export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.totalTime = 0;
        this.dayFactor = 1;  // 1 = full day, 0 = full night

        this.phaseDuration      = 300;  // 5 minutes per phase (day or night)
        this.transitionDuration = 30;   // 30-second smooth transition

        /* --- Color palettes --- */
        this.day = {
            sky:     new THREE.Color(0x7ec8e3),
            fog:     new THREE.Color(0xa8d8ea),
            sun:     new THREE.Color(0xfff5d6),
            sunInt:  1.8,
            amb:     new THREE.Color(0x8899aa),
            ambInt:  0.50,
            hemiSky: new THREE.Color(0x87ceeb),
            hemiGnd: new THREE.Color(0x3a6b35),
            hemiInt: 0.40,
            fogNear: 120,
            fogFar:  650,
        };
        this.night = {
            sky:     new THREE.Color(0x080e1f),
            fog:     new THREE.Color(0x060a18),
            sun:     new THREE.Color(0x334466),
            sunInt:  0.12,
            amb:     new THREE.Color(0x0a1530),
            ambInt:  0.08,
            hemiSky: new THREE.Color(0x0a1530),
            hemiGnd: new THREE.Color(0x050f05),
            hemiInt: 0.04,
            fogNear: 40,
            fogFar:  280,
        };

        this._setupLighting();
        this._setupFog();
        this._createStars();
    }

    /* ---------- Lighting ---------- */
    _setupLighting() {
        // Sun / moon
        this.sunLight = new THREE.DirectionalLight(this.day.sun, this.day.sunInt);
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

        // Ambient
        this.ambientLight = new THREE.AmbientLight(this.day.amb, this.day.ambInt);
        this.scene.add(this.ambientLight);

        // Hemisphere
        this.hemiLight = new THREE.HemisphereLight(this.day.hemiSky, this.day.hemiGnd, this.day.hemiInt);
        this.scene.add(this.hemiLight);
    }

    /* ---------- Fog ---------- */
    _setupFog() {
        this.scene.fog = new THREE.Fog(this.day.fog, this.day.fogNear, this.day.fogFar);
        this.scene.background = this.day.sky.clone();
    }

    /* ---------- Stars ---------- */
    _createStars() {
        const count = 900;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi   = Math.random() * Math.PI * 0.40;
            const r     = 380 + Math.random() * 120;
            positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.cos(phi) + 40;
            positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        this.starsMat = new THREE.PointsMaterial({
            color: 0xffffff, size: 1.6, transparent: true, opacity: 0, sizeAttenuation: true
        });
        this.stars = new THREE.Points(geo, this.starsMat);
        this.scene.add(this.stars);
    }

    /* ==========================================================
     *  DAY / NIGHT CYCLE
     * ======================================================== */
    _updateCycle() {
        const full   = this.phaseDuration * 2;           // 600 s
        const ct     = this.totalTime % full;
        const dayEnd = this.phaseDuration - this.transitionDuration;   // 270
        const nightStart = this.phaseDuration;                          // 300
        const nightEnd   = full - this.transitionDuration;              // 570

        if (ct < dayEnd) {
            this.dayFactor = 1;
        } else if (ct < nightStart) {
            this.dayFactor = 1 - (ct - dayEnd) / this.transitionDuration;
        } else if (ct < nightEnd) {
            this.dayFactor = 0;
        } else {
            this.dayFactor = (ct - nightEnd) / this.transitionDuration;
        }

        const f = this.dayFactor;
        const lerp = THREE.MathUtils.lerp;

        // Sky / background
        this.scene.background.lerpColors(this.night.sky, this.day.sky, f);

        // Fog
        this.scene.fog.color.lerpColors(this.night.fog, this.day.fog, f);
        this.scene.fog.near = lerp(this.night.fogNear, this.day.fogNear, f);
        this.scene.fog.far  = lerp(this.night.fogFar,  this.day.fogFar,  f);

        // Sun
        this.sunLight.color.lerpColors(this.night.sun, this.day.sun, f);
        this.sunLight.intensity = lerp(this.night.sunInt, this.day.sunInt, f);

        // Ambient
        this.ambientLight.color.lerpColors(this.night.amb, this.day.amb, f);
        this.ambientLight.intensity = lerp(this.night.ambInt, this.day.ambInt, f);

        // Hemisphere
        this.hemiLight.color.lerpColors(this.night.hemiSky, this.day.hemiSky, f);
        this.hemiLight.groundColor.lerpColors(this.night.hemiGnd, this.day.hemiGnd, f);
        this.hemiLight.intensity = lerp(this.night.hemiInt, this.day.hemiInt, f);

        // Stars
        this.stars.visible = f < 0.75;
        this.starsMat.opacity = THREE.MathUtils.clamp(1 - f * 1.8, 0, 1);
    }

    /* ==========================================================
     *  PUBLIC API
     * ======================================================== */
    update(dt, carZ) {
        this.totalTime += dt;
        this._updateCycle();

        // Follow car with sun & shadow frustum
        this.sunLight.position.set(carZ * 0.05 + 40, 90, carZ + 60);
        this.sunLight.target.position.set(0, 0, carZ);

        // Keep stars centered on player
        this.stars.position.z = carZ;
    }

    getDayFactor() { return this.dayFactor; }

    reset() {
        this.totalTime = 0;
        this.dayFactor = 1;
    }
}
