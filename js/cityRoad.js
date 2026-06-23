import * as THREE from 'three';
import { cityCurve, ROAD_WIDTH, SHOULDER_WIDTH } from './cityMap.js';

/**
 * CityRoad — builds a road mesh that follows the cityCurve spline.
 * Uses ExtrudeGeometry to create a ribbon along the curve.
 */

const SEGMENTS = 200; // resolution along the curve
const TERRAIN_WIDTH = 80;

export class CityRoad {
    constructor(scene) {
        this.scene = scene;

        this._initMaterials();
        this._buildRoad();
        this._buildTerrain();
        this._buildMarkings();
    }

    _initMaterials() {
        this.roadMat = new THREE.MeshStandardMaterial({
            color: 0x333333, flatShading: true,
            roughness: 0.95, metalness: 0.05,
        });
        this.shoulderMat = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a, flatShading: true, roughness: 0.9,
        });
        this.barrierMat = new THREE.MeshStandardMaterial({
            color: 0x888888, flatShading: true, roughness: 0.85,
        });
        this.markingMat = new THREE.MeshStandardMaterial({
            color: 0xffffff, flatShading: true,
            emissive: 0xffffff, emissiveIntensity: 0.08,
        });
        this.markingYellow = new THREE.MeshStandardMaterial({
            color: 0xffcc00, flatShading: true,
        });
        this.terrainMat = new THREE.MeshStandardMaterial({
            color: 0x4a7c59, flatShading: true, roughness: 0.95,
        });
    }

    /**
     * Build road as a ribbon extruded along the curve.
     * Uses a simple approach: sample points, build quads.
     */
    _buildRoad() {
        const roadGroup = new THREE.Group();
        const halfW = ROAD_WIDTH / 2;
        const halfSW = halfW + SHOULDER_WIDTH;
        const halfTW = TERRAIN_WIDTH / 2;

        // Sample curve
        const points = cityCurve.getPoints(SEGMENTS);
        const tangents = [];
        for (let i = 0; i <= SEGMENTS; i++) {
            const t = i / SEGMENTS;
            tangents.push(cityCurve.getTangentAt(t).normalize());
        }

        // Generate road mesh using a custom geometry approach:
        // Build a flat ribbon with quads between consecutive points
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
                // Perpendicular (right vector in XZ plane)
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
                const b = a + 1;
                const c = a + 2;
                const d = a + 3;
                indices.push(a, b, d);
                indices.push(a, d, c);
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

        // Barriers along edges
        const barrierH = 1.2;
        const barrierW = 0.3;
        const barrierStep = 2; // one barrier segment every 2 sample points (smoother)

        for (const side of [-1, 1]) {
            for (let i = 0; i < points.length - barrierStep; i += barrierStep) {
                const pt = points[i];
                const next = points[Math.min(i + barrierStep, points.length - 1)];

                // Direction from pt to next (in XZ plane)
                const dir = new THREE.Vector3(next.x - pt.x, 0, next.z - pt.z).normalize();
                // Perpendicular: right vector in XZ
                const perp = new THREE.Vector3(-dir.z, 0, dir.x);

                const mid = pt.clone().add(next).multiplyScalar(0.5);
                mid.addScaledVector(perp, side * (halfSW - 0.3));

                const len = pt.distanceTo(next);
                const barGeo = new THREE.BoxGeometry(barrierW, barrierH, len);
                const bar = new THREE.Mesh(barGeo, this.barrierMat);
                bar.position.copy(mid);
                bar.position.y = barrierH / 2;
                // Align barrier along the segment direction
                const angle = Math.atan2(dir.x, dir.z);
                bar.rotation.y = angle;
                bar.castShadow = true;
                bar.receiveShadow = true;
                roadGroup.add(bar);
            }
        }

        this.scene.add(roadGroup);
        this.roadGroup = roadGroup;
    }

    /**
     * Build center line marking (yellow dashed).
     */
    _buildMarkings() {
        const markGroup = new THREE.Group();
        const points = cityCurve.getPoints(SEGMENTS);
        const dashLen = 3;
        const gapLen = 4;
        const totalLen = dashLen + gapLen;

        let accumulated = 0;
        for (let i = 0; i < points.length - 1 && accumulated < cityCurve.getLength(); i++) {
            const t = i / SEGMENTS;
            const tan = cityCurve.getTangentAt(t).normalize();
            const pt = points[i];

            accumulated += pt.distanceTo(points[i + 1]);

            // Dashed yellow center line
            const mod = accumulated % totalLen;
            if (mod < dashLen) {
                const markGeo = new THREE.PlaneGeometry(0.12, 0.8);
                const mark = new THREE.Mesh(markGeo, this.markingYellow);
                mark.rotation.x = -Math.PI / 2;
                mark.position.copy(pt);
                mark.position.y = 0.02;
                markGroup.add(mark);
            }
        }

        this.scene.add(markGroup);
    }

    /**
     * Build terrain panels on both sides of the road.
     * We use large planes placed under/around the road curve.
     */
    _buildTerrain() {
        // Simple approach: a large ground plane that covers the whole area
        const bounds = this._getBounds();
        const sizeX = bounds.maxX - bounds.minX + 40;
        const sizeZ = bounds.maxZ - bounds.minZ + 40;
        const centerX = (bounds.maxX + bounds.minX) / 2;
        const centerZ = (bounds.maxZ + bounds.minZ) / 2;

        const groundGeo = new THREE.PlaneGeometry(sizeX, sizeZ);
        const ground = new THREE.Mesh(groundGeo, this.terrainMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(centerX, -0.15, centerZ);
        ground.receiveShadow = true;
        this.scene.add(ground);
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

    /** Get the closest point on the road to a given position. */
    getClosestPoint(pos) {
        let bestDist = Infinity;
        let bestT = 0;
        // Dense sampling: 500 steps over 4626 units = ~9 units between samples
        const steps = 500;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const pt = cityCurve.getPointAt(t);
            const dist = pos.distanceToSquared(pt);
            if (dist < bestDist) {
                bestDist = dist;
                bestT = t;
            }
        }
        // Refine with a local binary search around bestT
        let lo = Math.max(0, bestT - 0.01);
        let hi = Math.min(1, bestT + 0.01);
        for (let refine = 0; refine < 8; refine++) {
            const t1 = lo + (hi - lo) / 3;
            const t2 = hi - (hi - lo) / 3;
            const d1 = pos.distanceToSquared(cityCurve.getPointAt(t1));
            const d2 = pos.distanceToSquared(cityCurve.getPointAt(t2));
            if (d1 < d2) hi = t2;
            else lo = t1;
        }
        const finalT = (lo + hi) / 2;
        return {
            t: finalT,
            point: cityCurve.getPointAt(finalT),
            tangent: cityCurve.getTangentAt(finalT).normalize(),
        };
    }

    /** Check if a position is on the road (within ROAD_WIDTH/2 + margin). */
    isOnRoad(pos, margin = 8) {
        const info = this.getClosestPoint(pos);
        const dist = pos.distanceTo(info.point);
        return dist < (ROAD_WIDTH / 2 + margin);
    }

    reset() {
        // City road is static — nothing to reset
    }

    update(carZ, dt, dayFactor) {
        // No chunk management needed — static road
    }
}
