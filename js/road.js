import * as THREE from 'three';

/**
 * RoadManager — infinite highway built from reusable chunks,
 * with street-light poles, ambient traffic, and scenery.
 */

const CHUNK_LENGTH  = 100;
const LANE_CENTERS  = [-4, 0, 4];
const BARRIER_X     = 8.5;
const POLE_SPACING  = 25;    // one pole every 25 m on each side

const TRAFFIC_COLORS = [
    0x457b9d, 0x2a9d8f, 0xe9c46a, 0xf4a261,
    0x264653, 0x6b705c, 0x3a86ff, 0x8338ec,
    0x06d6a0, 0xef476f, 0x118ab2, 0x073b4c,
];

export class RoadManager {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map();
        this.trafficCars = [];

        this._initSharedAssets();
    }

    /* ==========================================================
     *  SHARED GEOMETRIES & MATERIALS
     * ======================================================== */
    _initSharedAssets() {
        // Road surface
        this.roadGeo     = new THREE.PlaneGeometry(12, CHUNK_LENGTH);
        this.shoulderGeo = new THREE.PlaneGeometry(2, CHUNK_LENGTH);
        this.barrierGeo  = new THREE.BoxGeometry(0.5, 1.2, CHUNK_LENGTH);
        this.edgeGeo     = new THREE.PlaneGeometry(0.15, CHUNK_LENGTH);
        this.dashGeo     = new THREE.PlaneGeometry(0.12, 3);
        this.terrainGeo  = new THREE.PlaneGeometry(60, CHUNK_LENGTH);

        // Trees
        this.trunkGeo   = new THREE.CylinderGeometry(0.15, 0.28, 2.2, 5);
        this.foliageGeo = new THREE.ConeGeometry(1.3, 3.2, 6);

        // Light poles
        this.poleGeo     = new THREE.CylinderGeometry(0.06, 0.09, 7, 6);
        this.poleArmGeo  = new THREE.BoxGeometry(1.8, 0.06, 0.06);
        this.fixtureGeo  = new THREE.SphereGeometry(0.28, 6, 4);

        // Traffic car
        this.tcBodyGeo   = new THREE.BoxGeometry(2, 0.65, 4);
        this.tcCabinGeo  = new THREE.BoxGeometry(1.65, 0.5, 1.8);
        this.tcTailGeo   = new THREE.BoxGeometry(0.28, 0.14, 0.1);

        // ---- Materials ----
        this.roadMat = new THREE.MeshStandardMaterial({
            color: 0x333333, flatShading: true, roughness: 0.95, metalness: 0.05
        });
        this.shoulderMat = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a, flatShading: true, roughness: 0.9
        });
        this.barrierMat = new THREE.MeshStandardMaterial({
            color: 0x888888, flatShading: true, roughness: 0.85
        });
        this.markingMat = new THREE.MeshStandardMaterial({
            color: 0xffffff, flatShading: true, emissive: 0xffffff, emissiveIntensity: 0.08
        });
        this.terrainMat = new THREE.MeshStandardMaterial({
            color: 0x4a7c59, flatShading: true, roughness: 0.95
        });
        this.trunkMat = new THREE.MeshStandardMaterial({
            color: 0x8B5E3C, flatShading: true
        });
        this.foliageMats = [0x2D6A4F, 0x40916C, 0x52B788, 0x74C69D].map(c =>
            new THREE.MeshStandardMaterial({ color: c, flatShading: true })
        );

        // Light pole materials
        this.poleMat = new THREE.MeshStandardMaterial({
            color: 0x666666, flatShading: true, metalness: 0.7, roughness: 0.3
        });
        this.fixtureMat = new THREE.MeshStandardMaterial({
            color: 0xffcc44,
            emissive: 0xffaa22,
            emissiveIntensity: 0,   // starts off (daytime)
            flatShading: true,
        });

        // Traffic materials
        this.tcCabinMat = new THREE.MeshStandardMaterial({
            color: 0x222222, flatShading: true, metalness: 0.5, roughness: 0.4
        });
        this.tcTailMat = new THREE.MeshStandardMaterial({
            color: 0xff0000, emissive: 0xff2222, emissiveIntensity: 0.45, flatShading: true
        });
    }

    /* ==========================================================
     *  CHUNK CREATION
     * ======================================================== */
    _createChunk(index) {
        const group = new THREE.Group();
        const zCenter = index * CHUNK_LENGTH + CHUNK_LENGTH / 2;
        const zStart  = index * CHUNK_LENGTH;

        // Road surface
        const road = new THREE.Mesh(this.roadGeo, this.roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.set(0, 0.01, zCenter);
        road.receiveShadow = true;
        group.add(road);

        // Shoulders
        for (const sx of [-7, 7]) {
            const sh = new THREE.Mesh(this.shoulderGeo, this.shoulderMat);
            sh.rotation.x = -Math.PI / 2;
            sh.position.set(sx, 0.01, zCenter);
            sh.receiveShadow = true;
            group.add(sh);
        }

        // Barriers
        for (const sx of [-BARRIER_X, BARRIER_X]) {
            const b = new THREE.Mesh(this.barrierGeo, this.barrierMat);
            b.position.set(sx, 0.6, zCenter);
            b.castShadow = true;
            b.receiveShadow = true;
            group.add(b);
        }

        // Edge lines (solid white)
        for (const sx of [-6, 6]) {
            const e = new THREE.Mesh(this.edgeGeo, this.markingMat);
            e.rotation.x = -Math.PI / 2;
            e.position.set(sx, 0.02, zCenter);
            group.add(e);
        }

        // Lane dividers (dashed white) at x = -2 and +2
        for (let z = zStart + 2; z < zStart + CHUNK_LENGTH; z += 7) {
            for (const lx of [-2, 2]) {
                const d = new THREE.Mesh(this.dashGeo, this.markingMat);
                d.rotation.x = -Math.PI / 2;
                d.position.set(lx, 0.02, z + 1.5);
                group.add(d);
            }
        }

        // Terrain panels (both sides)
        for (const sx of [-38, 38]) {
            const t = new THREE.Mesh(this.terrainGeo, this.terrainMat);
            t.rotation.x = -Math.PI / 2;
            t.position.set(sx, -0.15, zCenter);
            t.receiveShadow = true;
            group.add(t);
        }

        // Light poles (every POLE_SPACING meters, both sides)
        for (let z = zStart; z < zStart + CHUNK_LENGTH; z += POLE_SPACING) {
            for (const side of [-1, 1]) {
                group.add(this._createLightPole(side * 9.5, z));
            }
        }

        // Trees
        const treeCount = 4 + Math.floor(Math.random() * 6);
        for (let i = 0; i < treeCount; i++) {
            const side = Math.random() > 0.5 ? 1 : -1;
            const tx = side * (12 + Math.random() * 26);
            const tz = zStart + Math.random() * CHUNK_LENGTH;
            group.add(this._createTree(tx, tz));
        }

        this.scene.add(group);
        this.chunks.set(index, group);
    }

    /* ---------- Light Pole ---------- */
    _createLightPole(x, z) {
        const g = new THREE.Group();
        const armDir = x < 0 ? 1 : -1;   // arm extends toward road

        // Vertical pole
        const pole = new THREE.Mesh(this.poleGeo, this.poleMat);
        pole.position.y = 3.5;
        pole.castShadow = true;
        g.add(pole);

        // Horizontal arm
        const arm = new THREE.Mesh(this.poleArmGeo, this.poleMat);
        arm.position.set(armDir * 0.9, 6.9, 0);
        g.add(arm);

        // Light fixture (glowing sphere)
        const fixture = new THREE.Mesh(this.fixtureGeo, this.fixtureMat);
        fixture.position.set(armDir * 1.8, 6.75, 0);
        g.add(fixture);

        g.position.set(x, 0, z);
        return g;
    }

    /* ---------- Tree ---------- */
    _createTree(x, z) {
        const g = new THREE.Group();

        const trunk = new THREE.Mesh(this.trunkGeo, this.trunkMat);
        trunk.position.y = 1.1;
        trunk.castShadow = true;
        g.add(trunk);

        const fMat = this.foliageMats[Math.floor(Math.random() * this.foliageMats.length)];
        const foliage = new THREE.Mesh(this.foliageGeo, fMat);
        foliage.position.y = 3.3;
        foliage.castShadow = true;
        g.add(foliage);

        const s = 0.7 + Math.random() * 0.7;
        g.scale.set(s, s, s);
        g.position.set(x, 0, z);
        return g;
    }

    /* ==========================================================
     *  CHUNK MANAGEMENT
     * ======================================================== */
    _updateChunks(carZ) {
        const cur = Math.floor(carZ / CHUNK_LENGTH);
        const lo  = cur - 2;
        const hi  = cur + 10;

        for (let i = lo; i <= hi; i++) {
            if (!this.chunks.has(i)) this._createChunk(i);
        }

        for (const [idx, grp] of this.chunks) {
            if (idx < lo || idx > hi) {
                this.scene.remove(grp);
                this.chunks.delete(idx);
            }
        }
    }

    /* ==========================================================
     *  TRAFFIC (sparse, scenic — no collision)
     * ======================================================== */
    _createTrafficCar(lane, z, speed) {
        const group = new THREE.Group();
        const color = TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)];
        const mat = new THREE.MeshStandardMaterial({
            color, flatShading: true, metalness: 0.3, roughness: 0.7
        });

        const body = new THREE.Mesh(this.tcBodyGeo, mat);
        body.position.y = 0.42;
        body.castShadow = true;
        group.add(body);

        const cab = new THREE.Mesh(this.tcCabinGeo, this.tcCabinMat);
        cab.position.set(0, 1.0, -0.15);
        cab.castShadow = true;
        group.add(cab);

        for (const sx of [-0.65, 0.65]) {
            const tl = new THREE.Mesh(this.tcTailGeo, this.tcTailMat);
            tl.position.set(sx, 0.45, -2);
            group.add(tl);
        }

        group.position.set(LANE_CENTERS[lane], 0, z);
        return { group, speed, lane };
    }

    _updateTraffic(carZ, dt) {
        const spawnZ = carZ + 350;

        // Sparse traffic — max 6 cars for scenic atmosphere
        if (this.trafficCars.length < 6 && Math.random() < dt * 0.5) {
            const lane  = Math.floor(Math.random() * 3);
            const z     = spawnZ + Math.random() * 300;
            const speed = 50 + Math.random() * 30; // 50-80 km/h

            const ok = !this.trafficCars.some(tc =>
                tc.lane === lane && Math.abs(tc.group.position.z - z) < 40
            );

            if (ok) {
                const tc = this._createTrafficCar(lane, z, speed);
                this.scene.add(tc.group);
                this.trafficCars.push(tc);
            }
        }

        for (const tc of this.trafficCars) {
            tc.group.position.z += (tc.speed / 3.6) * dt;
        }

        this.trafficCars = this.trafficCars.filter(tc => {
            if (tc.group.position.z < carZ - 60) {
                this.scene.remove(tc.group);
                return false;
            }
            return true;
        });
    }

    /* ==========================================================
     *  LIGHTING — pole fixtures react to day/night
     * ======================================================== */
    _updateLighting(dayFactor) {
        // All fixtures share this material — one update affects all
        const nightIntensity = 1 - dayFactor;
        this.fixtureMat.emissiveIntensity = nightIntensity * 1.5;
        this.fixtureMat.color.setHex(dayFactor > 0.5 ? 0x998855 : 0xffcc44);
    }

    /* ==========================================================
     *  PUBLIC API
     * ======================================================== */
    update(carZ, dt, dayFactor = 1) {
        this._updateChunks(carZ);
        this._updateTraffic(carZ, dt);
        this._updateLighting(dayFactor);
    }

    reset() {
        for (const [, grp] of this.chunks) this.scene.remove(grp);
        this.chunks.clear();
        for (const tc of this.trafficCars) this.scene.remove(tc.group);
        this.trafficCars = [];
    }
}
