import * as THREE from 'three';
import { cityCurve, waypoints3D } from './cityMap.js';

/**
 * Buildings — cyberpunk low-poly buildings with neon signs
 * and illuminated window strips along the Lechería route.
 */

// Neon palette
const NEON = {
    magenta: 0xff00ff,
    cyan:    0x00ffff,
    green:   0x00ff88,
    orange:  0xff6622,
    pink:    0xff4488,
    blue:    0x4466ff,
};
const NEON_COLORS = Object.values(NEON);

// Window glow colors (warm and cool mix)
const WINDOW_COLORS = [0xffcc66, 0xffeedd, 0x66ddff, 0xff66aa, 0xaaddff, 0xffaa44];

// Landmark definitions: [wpIdx, sideOffset, w, d, h, label, neonColor]
const LANDMARKS = [
    [ 2,  20, 10,  8, 5.5, 'CC PLAZA MAYOR',       NEON.cyan    ],
    [ 2, -18,  6,  6, 4.0, "McDONALD'S",            NEON.orange  ],
    [ 5,  18,  7,  5, 5.0, 'FARMATODO',             NEON.green   ],
    [ 7,  22, 14, 12, 6.5, 'AVENTURA PLAZA',        NEON.magenta ],
    [ 7, -20,  6,  6, 3.5, 'VERDADER SABOR',        NEON.orange  ],
    [ 12, 16,  6,  5, 3.5, 'LA BODEGUILLA',         NEON.pink    ],
    [ 14,-18,  7,  6, 4.5, 'BELLA CHINA',           NEON.magenta ],
    [ 16, 18,  8,  6, 4.0, 'AV. TAMANACO',          NEON.blue    ],
    [ 17,-20, 12, 10, 6.0, 'U.E. GARMENDIA',        NEON.cyan    ],
    [ 18, 16,  7,  7, 3.5, 'TASCA EL MOROCO',       NEON.orange  ],
];

// Dark building base colors
const BUILDING_COLORS = [
    0x1a1a25, 0x1e1e2a, 0x22222f, 0x252535,
    0x1c1c28, 0x20202d, 0x2a2a38, 0x181825,
];

export class Buildings {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();

        // Shared geometries for window strips
        this.windowStripGeo = new THREE.PlaneGeometry(1, 0.4);

        this._buildLandmarks();
        this._buildGenericFillers();
        scene.add(this.group);
    }

    _getPositionAtWaypoint(wpIndex, sideOffset) {
        const wp = waypoints3D[Math.min(wpIndex, waypoints3D.length - 1)];
        const t = wpIndex / (waypoints3D.length - 1);
        const tangent = cityCurve.getTangentAt(Math.min(t, 0.99)).normalize();
        const perp = new THREE.Vector3(-tangent.z, 0, tangent.x);
        return wp.clone().addScaledVector(perp, sideOffset);
    }

    _buildLandmarks() {
        for (const [wpIdx, side, w, d, h, label, neonColor] of LANDMARKS) {
            const pos = this._getPositionAtWaypoint(wpIdx, side);

            // Dark building body
            const baseColor = BUILDING_COLORS[Math.floor(Math.random() * BUILDING_COLORS.length)];
            const mat = new THREE.MeshStandardMaterial({
                color: baseColor, flatShading: true,
                roughness: 0.8, metalness: 0.2,
            });

            const geo = new THREE.BoxGeometry(w, h, d);
            const building = new THREE.Mesh(geo, mat);
            building.position.copy(pos);
            building.position.y = h / 2;
            building.castShadow = true;
            building.receiveShadow = true;
            building.userData = { label, isLandmark: true };
            this.group.add(building);

            // Orient building toward road
            const t = wpIdx / (waypoints3D.length - 1);
            const tangent = cityCurve.getTangentAt(Math.min(t, 0.99)).normalize();
            const facingAngle = Math.atan2(tangent.x, tangent.z);
            building.rotation.y = facingAngle;

            // ---- NEON SIGN ----
            const signW = Math.min(w * 0.7, 5);
            const signMat = new THREE.MeshStandardMaterial({
                color: neonColor,
                emissive: neonColor,
                emissiveIntensity: 1.8,
                flatShading: true,
                transparent: true,
                opacity: 0.95,
            });
            const sign = new THREE.Mesh(
                new THREE.BoxGeometry(signW, 0.6, 0.12),
                signMat
            );
            sign.position.copy(pos);
            sign.position.y = h * 0.75;
            sign.rotation.y = facingAngle;
            // Push sign forward on facade
            const fwd = new THREE.Vector3(0, 0, d / 2 + 0.1).applyAxisAngle(
                new THREE.Vector3(0, 1, 0), facingAngle
            );
            sign.position.add(fwd);
            this.group.add(sign);

            // Secondary accent line (thin horizontal neon strip)
            const accentMat = new THREE.MeshStandardMaterial({
                color: neonColor, emissive: neonColor,
                emissiveIntensity: 1.2, flatShading: true,
            });
            const accent = new THREE.Mesh(
                new THREE.BoxGeometry(w + 0.3, 0.08, 0.08),
                accentMat
            );
            accent.position.copy(pos);
            accent.position.y = h * 0.5;
            accent.rotation.y = facingAngle;
            accent.position.add(fwd.clone().multiplyScalar(0.8));
            this.group.add(accent);

            // ---- WINDOW STRIPS ----
            this._addWindowStrips(pos, w, d, h, facingAngle);
        }
    }

    _buildGenericFillers() {
        // ~40 generic cyberpunk buildings along the route
        for (let i = 0; i < 40; i++) {
            const t = (i + 1) / 41;
            const pt = cityCurve.getPointAt(t);
            const tangent = cityCurve.getTangentAt(t).normalize();
            const perp = new THREE.Vector3(-tangent.z, 0, tangent.x);

            const side = (i % 2 === 0) ? 1 : -1;
            const offset = 12 + Math.random() * 22;
            const pos = pt.clone().addScaledVector(perp, side * offset);

            const w = 3 + Math.random() * 7;
            const d = 3 + Math.random() * 6;
            const h = 2.5 + Math.random() * 5;
            const color = BUILDING_COLORS[Math.floor(Math.random() * BUILDING_COLORS.length)];

            const mat = new THREE.MeshStandardMaterial({
                color, flatShading: true, roughness: 0.8, metalness: 0.15,
            });

            const geo = new THREE.BoxGeometry(w, h, d);
            const bldg = new THREE.Mesh(geo, mat);
            bldg.position.copy(pos);
            bldg.position.y = h / 2;
            bldg.castShadow = true;
            bldg.receiveShadow = true;
            this.group.add(bldg);

            const angle = Math.atan2(tangent.x, tangent.z);
            bldg.rotation.y = angle;

            // Window strips
            this._addWindowStrips(pos, w, d, h, angle);

            // ~25% get a small neon accent
            if (Math.random() < 0.25) {
                const nc = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
                const nMat = new THREE.MeshStandardMaterial({
                    color: nc, emissive: nc,
                    emissiveIntensity: 1.4, flatShading: true,
                });
                const nSign = new THREE.Mesh(
                    new THREE.BoxGeometry(w * 0.4, 0.35, 0.1),
                    nMat
                );
                nSign.position.copy(pos);
                nSign.position.y = h * 0.65;
                nSign.rotation.y = angle;
                const fwd = new THREE.Vector3(0, 0, d / 2 + 0.1).applyAxisAngle(
                    new THREE.Vector3(0, 1, 0), angle
                );
                nSign.position.add(fwd);
                this.group.add(nSign);
            }

            // ~30% get an adjacent smaller building
            if (Math.random() < 0.3) {
                const adjH = h * (0.5 + Math.random() * 0.3);
                const adj = new THREE.Mesh(
                    new THREE.BoxGeometry(w * 0.4, adjH, d * 0.5),
                    mat
                );
                adj.position.copy(pos);
                adj.position.x += side * (w / 2 + 1);
                adj.position.y = adjH / 2;
                adj.castShadow = true;
                adj.rotation.y = angle;
                this.group.add(adj);
            }
        }
    }

    /**
     * Add horizontal lit-window strips to a building facade.
     */
    _addWindowStrips(buildingPos, w, d, h, angle) {
        const floors = Math.floor(h / 1.8);
        const fwd = new THREE.Vector3(0, 0, d / 2 + 0.06).applyAxisAngle(
            new THREE.Vector3(0, 1, 0), angle
        );

        for (let f = 0; f < floors; f++) {
            if (Math.random() < 0.35) continue; // some floors dark

            const winColor = WINDOW_COLORS[Math.floor(Math.random() * WINDOW_COLORS.length)];
            const winMat = new THREE.MeshStandardMaterial({
                color: winColor,
                emissive: winColor,
                emissiveIntensity: 0.8 + Math.random() * 0.6,
                flatShading: true,
                transparent: true,
                opacity: 0.85,
            });

            const stripW = w * (0.5 + Math.random() * 0.3);
            const strip = new THREE.Mesh(
                new THREE.PlaneGeometry(stripW, 0.35),
                winMat
            );
            strip.position.copy(buildingPos);
            strip.position.y = 0.9 + f * 1.8;
            strip.position.add(fwd);
            strip.rotation.y = angle;
            this.group.add(strip);
        }
    }
}
