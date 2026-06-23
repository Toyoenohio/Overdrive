import * as THREE from 'three';
import { cityCurve, ROAD_WIDTH, SHOULDER_WIDTH } from './cityMap.js';

/**
 * CityRoad — cyberpunk road: dark asphalt, neon markings, light poles.
 */

const SEGMENTS = 200;
const TERRAIN_WIDTH = 80;
const POLE_SPACING = 25;   // one pole every 25 meters

export class CityRoad {
    constructor(scene) {
        this.scene = scene;

        this._initMaterials();
        this._buildRoad();
        this._buildTerrain();
        this._buildMarkings();
        this._buildLightPoles();
    }

    _initMaterials() {
        // Dark cyberpunk asphalt
        this.roadMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a35, flatShading: true,
            roughness: 0.90, metalness: 0.08,
        });
        this.shoulderMat = new THREE.MeshStandardMaterial({
            color: 0x383848, flatShading: true, roughness: 0.9,
        });
        this.barrierMat = new THREE.MeshStandardMaterial({
            color: 0x444455, flatShading: true, roughness: 0.7, metalness: 0.3,
        });
        // Cyan edge markings with glow
        this.markingMat = new THREE.MeshStandardMaterial({
            color: 0x00cccc, flatShading: true,
            emissive: 0x00cccc, emissiveIntensity: 1.0,
        });
        // Yellow neon center line
        this.markingYellow = new THREE.MeshStandardMaterial({
            color: 0xffcc00, flatShading: true,
            emissive: 0xffaa00, emissiveIntensity: 1.2,
        });
        // Dark terrain
        this.terrainMat = new THREE.MeshStandardMaterial({
            color: 0x151a2a, flatShading: true, roughness: 0.95,
        });

        // Light pole materials
        this.poleMat = new THREE.MeshStandardMaterial({
            color: 0x444455, flatShading: true, metalness: 0.7, roughness: 0.3,
        });
        this.fixtureMat = new THREE.MeshStandardMaterial({
            color: 0xffaa44,
            emissive: 0xffaa22,
            emissiveIntensity: 2.5,
            flatShading: true,
        });

        // Shared pole geometries
        this.poleGeo     = new THREE.CylinderGeometry(0.06, 0.09, 7, 6);
        this.poleArmGeo  = new THREE.BoxGeometry(1.8, 0.06, 0.06);
        this.fixtureGeo  = new THREE.SphereGeometry(0.28, 6, 4);
    }

    /**
     * Build road ribbon along the curve.
     */
    _buildRoad() {
        const roadGroup = new THREE.Group();
        const halfW = ROAD_WIDTH / 2;
        const halfSW = halfW + SHOULDER_WIDTH;
        const halfTW = TERRAIN_WIDTH / 2;

        const points = cityCurve.getPoints(SEGMENTS);
        const tangents = [];
        for (let i = 0; i <= SEGMENTS; i++) {
            tangents.push(cityCurve.getTangentAt(i / SEGMENTS).normalize());
        }

        for (let layer = 0; layer < 3; layer++) {
            const width = layer === 0 ? halfW : layer === 1 ? halfSW : halfTW;
            const mat = layer === 0 ? this.roadMat : layer === 1 ? this.shoulderMat : this.terrainMat;
            const y = layer === 2 ? -0.1 : 0.01;

            const vertices = [];
            const indices = [];
            const uvs = [];

            for (let i = 0; i < points.length; i++) {
                const pt = points[i];
                const tan = tangents[i];
                const perp = new THREE.Vector3(-tan.z, 0, tan.x).normalize();

                const left = pt.clone().addScaledVector(perp, -width);
                const right = pt.clone().addScaledVector(perp, width);
                left.y = y;
                right.y = y;

                vertices.push(left.x, left.y, left.z);
                vertices.push(right.x, right.y, right.z);
                uvs.push(0, i / SEGMENTS);
                uvs.push(1, i / SEGMENTS);
            }

            for (let i = 0; i < points.length - 1; i++) {
                const a = i * 2;
                indices.push(a, a + 1, a + 3);
                indices.push(a, a + 3, a + 2);
            }

            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            geo.setIndex(indices);
            geo.computeVertexNormals();

            const mesh = new THREE.Mesh(geo, mat);
            mesh.receiveShadow = true;
            roadGroup.add(mesh);
        }

        // Barriers with slight neon accent on top edge
        const barrierH = 1.2;
        const barrierW = 0.3;
        const barrierStep = 2;

        for (const side of [-1, 1]) {
            for (let i = 0; i < points.length - barrierStep; i += barrierStep) {
                const pt = points[i];
                const next = points[Math.min(i + barrierStep, points.length - 1)];
                const dir = new THREE.Vector3(next.x - pt.x, 0, next.z - pt.z).normalize();
                const perp = new THREE.Vector3(-dir.z, 0, dir.x);
                const mid = pt.clone().add(next).multiplyScalar(0.5);
                mid.addScaledVector(perp, side * (halfSW - 0.3));

                const len = pt.distanceTo(next);
                const bar = new THREE.Mesh(
                    new THREE.BoxGeometry(barrierW, barrierH, len),
                    this.barrierMat
                );
                bar.position.copy(mid);
                bar.position.y = barrierH / 2;
                bar.rotation.y = Math.atan2(dir.x, dir.z);
                bar.castShadow = true;
                bar.receiveShadow = true;
                roadGroup.add(bar);
            }
        }

        this.scene.add(roadGroup);
        this.roadGroup = roadGroup;
    }

    /**
     * Center line + edge markings.
     */
    _buildMarkings() {
        const markGroup = new THREE.Group();
        const points = cityCurve.getPoints(SEGMENTS);
        const halfW = ROAD_WIDTH / 2;
        const dashLen = 3;
        const gapLen = 4;
        const totalLen = dashLen + gapLen;

        let accumulated = 0;
        for (let i = 0; i < points.length - 1; i++) {
            const t = i / SEGMENTS;
            const tan = cityCurve.getTangentAt(t).normalize();
            const pt = points[i];
            const perp = new THREE.Vector3(-tan.z, 0, tan.x);

            accumulated += pt.distanceTo(points[i + 1]);

            // Dashed yellow center line
            const mod = accumulated % totalLen;
            if (mod < dashLen) {
                const m = new THREE.Mesh(
                    new THREE.PlaneGeometry(0.12, 0.8),
                    this.markingYellow
                );
                m.rotation.x = -Math.PI / 2;
                m.position.copy(pt);
                m.position.y = 0.025;
                markGroup.add(m);
            }

            // Edge lines (cyan glow) every 3rd segment point
            if (i % 3 === 0) {
                for (const s of [-1, 1]) {
                    const edgePt = pt.clone().addScaledVector(perp, s * (halfW - 0.2));
                    const e = new THREE.Mesh(
                        new THREE.PlaneGeometry(0.12, 1.2),
                        this.markingMat
                    );
                    e.rotation.x = -Math.PI / 2;
                    e.position.copy(edgePt);
                    e.position.y = 0.025;
                    markGroup.add(e);
                }
            }
        }

        this.scene.add(markGroup);
    }

    /**
     * Ground plane.
     */
    _buildTerrain() {
        const bounds = this._getBounds();
        const sizeX = bounds.maxX - bounds.minX + 60;
        const sizeZ = bounds.maxZ - bounds.minZ + 60;
        const centerX = (bounds.maxX + bounds.minX) / 2;
        const centerZ = (bounds.maxZ + bounds.minZ) / 2;

        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(sizeX, sizeZ),
            this.terrainMat
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(centerX, -0.15, centerZ);
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    /**
     * Street light poles along the curve.
     */
    _buildLightPoles() {
        const poleGroup = new THREE.Group();
        const totalLen = cityCurve.getLength();
        const numPoles = Math.floor(totalLen / POLE_SPACING);
        const halfSW = ROAD_WIDTH / 2 + SHOULDER_WIDTH;

        for (let i = 0; i < numPoles; i++) {
            const t = Math.min((i * POLE_SPACING) / totalLen, 0.999);
            const pt = cityCurve.getPointAt(t);
            const tan = cityCurve.getTangentAt(t).normalize();
            const perp = new THREE.Vector3(-tan.z, 0, tan.x);

            for (const side of [-1, 1]) {
                const pos = pt.clone().addScaledVector(perp, side * (halfSW - 0.5));
                const armDir = -side;    // arm extends toward road

                const g = new THREE.Group();

                // Vertical pole
                const pole = new THREE.Mesh(this.poleGeo, this.poleMat);
                pole.position.y = 3.5;
                pole.castShadow = true;
                g.add(pole);

                // Horizontal arm
                const arm = new THREE.Mesh(this.poleArmGeo, this.poleMat);
                arm.position.set(armDir * 0.9, 6.9, 0);
                g.add(arm);

                // Light fixture (warm glow sphere)
                const fixture = new THREE.Mesh(this.fixtureGeo, this.fixtureMat);
                fixture.position.set(armDir * 1.8, 6.75, 0);
                g.add(fixture);

                g.position.copy(pos);
                poleGroup.add(g);
            }
        }

        this.scene.add(poleGroup);
    }

    _getBounds() {
        const points = cityCurve.getPoints(SEGMENTS);
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (const pt of points) {
            minX = Math.min(minX, pt.x);
            maxX = Math.max(maxX, pt.x);
            minZ = Math.min(minZ, pt.z);
            maxZ = Math.max(maxZ, pt.z);
        }
        return { minX, maxX, minZ, maxZ };
    }

    getClosestPoint(pos) {
        let bestDist = Infinity;
        let bestT = 0;
        const steps = 500;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const pt = cityCurve.getPointAt(t);
            const dist = pos.distanceToSquared(pt);
            if (dist < bestDist) { bestDist = dist; bestT = t; }
        }
        let lo = Math.max(0, bestT - 0.01);
        let hi = Math.min(1, bestT + 0.01);
        for (let r = 0; r < 8; r++) {
            const t1 = lo + (hi - lo) / 3;
            const t2 = hi - (hi - lo) / 3;
            if (pos.distanceToSquared(cityCurve.getPointAt(t1)) <
                pos.distanceToSquared(cityCurve.getPointAt(t2))) hi = t2;
            else lo = t1;
        }
        const finalT = (lo + hi) / 2;
        return {
            t: finalT,
            point: cityCurve.getPointAt(finalT),
            tangent: cityCurve.getTangentAt(finalT).normalize(),
        };
    }

    isOnRoad(pos, margin = 8) {
        const info = this.getClosestPoint(pos);
        return pos.distanceTo(info.point) < (ROAD_WIDTH / 2 + margin);
    }

    reset() {}
    update(carZ, dt, dayFactor) {}
}
