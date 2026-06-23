import * as THREE from 'three';
import { cityCurve, waypoints3D } from './cityMap.js';

/**
 * Buildings — landmark boxes along the Lechería route.
 * Simple colored blocks with distinctive features.
 */

// Building definitions: [waypointIndex, sideOffset, color, width, depth, height, label]
// sideOffset: positive = right of road, negative = left
const LANDMARKS = [
    // waypoint, side,  color,      w,    d,   h,   label
    [ 2,   8,  0xd4a574,  8,   6,   4.0, 'CC Plaza Mayor'     ], // beige, near start
    [ 2,  -6,  0xcc0000,  5,   5,   3.5, "McDonald's"         ], // red
    [ 5,   7,  0x4488cc,  6,   4,   4.5, 'Farmatodo'          ], // blue roof
    [ 7,  10,  0x888888, 12,  10,   5.0, 'C.C. Aventura Plaza' ], // gray, big
    [ 7,  -8,  0xff8844,  5,   5,   3.0, 'Verdader Sabor'     ], // orange
    [ 12,  6,  0x996633,  5,   4,   3.0, 'La Bodeguilla'      ], // brown
    [ 14, -7,  0xcc4444,  6,   5,   4.0, 'Bella China'        ], // red/restaurant
    [ 16,  8,  0x66aa66,  7,   5,   3.5, 'Av. Tamanaco'       ], // green
    [ 17, -6,  0xeeeecc, 10,   8,   5.5, 'U.E. Garmendia'     ], // cream, school
    [ 18,  5,  0xcc8844,  6,   6,   3.0, 'Tasca El Moroco'    ], // terra cotta
];

export class Buildings {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this._buildLandmarks();
        this._buildGenericFillers();
        scene.add(this.group);
    }

    _getPositionAtWaypoint(wpIndex, sideOffset) {
        // Get position on the curve near this waypoint
        const wp = waypoints3D[Math.min(wpIndex, waypoints3D.length - 1)];
        // Get tangent to compute perpendicular
        const t = wpIndex / (waypoints3D.length - 1);
        const tangent = cityCurve.getTangentAt(Math.min(t, 0.99)).normalize();
        const perp = new THREE.Vector3(-tangent.z, 0, tangent.x);
        return wp.clone().addScaledVector(perp, sideOffset);
    }

    _buildLandmarks() {
        for (const [wpIdx, side, color, w, d, h, label] of LANDMARKS) {
            const pos = this._getPositionAtWaypoint(wpIdx, side);

            const mat = new THREE.MeshStandardMaterial({
                color,
                flatShading: true,
                roughness: 0.7,
                metalness: 0.1,
            });

            const geo = new THREE.BoxGeometry(w, h, d);
            const building = new THREE.Mesh(geo, mat);
            building.position.copy(pos);
            building.position.y = h / 2;
            building.castShadow = true;
            building.receiveShadow = true;
            building.userData = { label, isLandmark: true };
            this.group.add(building);

            // Roof accent for Farmatodo (blue roof on gray/white building)
            if (label === 'Farmatodo') {
                const roofMat = new THREE.MeshStandardMaterial({
                    color: 0x2266cc,
                    flatShading: true,
                    roughness: 0.5,
                });
                const roof = new THREE.Mesh(
                    new THREE.BoxGeometry(w + 0.3, 0.2, d + 0.3),
                    roofMat
                );
                roof.position.copy(pos);
                roof.position.y = h + 0.1;
                roof.castShadow = true;
                this.group.add(roof);
            }

            // Light glow for Bella China (restaurant sign)
            if (label === 'Bella China') {
                const signMat = new THREE.MeshStandardMaterial({
                    color: 0xff4444,
                    emissive: 0xff2222,
                    emissiveIntensity: 0.4,
                    flatShading: true,
                });
                const sign = new THREE.Mesh(
                    new THREE.BoxGeometry(w - 1, 0.3, 0.3),
                    signMat
                );
                sign.position.copy(pos);
                sign.position.y = h + 0.2;
                sign.position.z += d / 2;
                this.group.add(sign);
            }
        }
    }

    /**
     * Add generic filler buildings between landmarks to avoid empty stretches.
     */
    _buildGenericFillers() {
        const colors = [0xbbbbbb, 0xaaaaaa, 0xccccbb, 0xb8b8a8, 0xc8c8c0, 0xa8a8a8];
        // Spread ~30 generic buildings along the route
        for (let i = 0; i < 30; i++) {
            const t = (i + 1) / 31; // distribute evenly
            const pt = cityCurve.getPointAt(t);
            const tangent = cityCurve.getTangentAt(t).normalize();
            const perp = new THREE.Vector3(-tangent.z, 0, tangent.x);

            const side = (i % 2 === 0) ? 1 : -1;
            const offset = 5 + Math.random() * 12;
            const pos = pt.clone().addScaledVector(perp, side * offset);

            const w = 3 + Math.random() * 6;
            const d = 3 + Math.random() * 5;
            const h = 2 + Math.random() * 4;
            const color = colors[Math.floor(Math.random() * colors.length)];

            const mat = new THREE.MeshStandardMaterial({
                color,
                flatShading: true,
                roughness: 0.75,
            });

            const geo = new THREE.BoxGeometry(w, h, d);
            const bldg = new THREE.Mesh(geo, mat);
            bldg.position.copy(pos);
            bldg.position.y = h / 2;
            bldg.castShadow = true;
            bldg.receiveShadow = true;
            bldg.userData = { isLandmark: false };
            this.group.add(bldg);

            // Sometimes add a small adjacent box
            if (Math.random() < 0.3) {
                const adj = new THREE.Mesh(
                    new THREE.BoxGeometry(w * 0.4, h * 0.7, d * 0.5),
                    mat
                );
                adj.position.copy(pos);
                adj.position.x += side * (w / 2 + 1);
                adj.position.y = (h * 0.7) / 2;
                adj.castShadow = true;
                this.group.add(adj);
            }
        }
    }
}
