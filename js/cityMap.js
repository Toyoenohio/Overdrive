import * as THREE from 'three';

/**
 * cityMap — Lechería road network.
 *
 * Waypoints: Crucero de Lechería → Av. Bolívar
 * Coordinates in (lat, lng) — converted to local 3D space
 * with origin at the crucero.
 */

// Real waypoints following Av. Principal / Diego Bautista Urbaneja
// Exaggerated slightly for a more fun driving curve
const RAW_WAYPOINTS = [
    // lat,      lng           description
    [ 10.18820, -64.69820 ], // Crucero de Lechería (entrada)
    [ 10.18830, -64.69780 ], // entrando a la avenida
    [ 10.18845, -64.69720 ], // inicio recta
    [ 10.18855, -64.69670 ], // pasando cc
    [ 10.18875, -64.69620 ], // primera curva (izquierda hacia la costa)
    [ 10.18900, -64.69580 ], // bordeando la bahía
    [ 10.18925, -64.69540 ], // curva derecha suave
    [ 10.18945, -64.69500 ], // recta costera
    [ 10.18960, -64.69450 ], // aproximándose al centro
    [ 10.18970, -64.69400 ], // curva izquierda hacia av bolívar
    [ 10.18985, -64.69360 ], // recta final
    [ 10.19000, -64.69330 ], // intersección Av. Bolívar
];

// Conversion factors for Lechería (~10.188° N)
const LAT_TO_M = 111_320;                     // meters per degree latitude
const LNG_TO_M = 111_320 * Math.cos(10.188 * Math.PI / 180); // ~109,580 m/deg
const SCALE = 8.0;                            // game units per real meter (stretch for fun)

/**
 * Convert (lat, lng) → game 3D coords.
 * Origin = first waypoint. Z = north, X = east.
 */
function latLngToGame(lat, lng, originLat, originLng) {
    const x = (lng - originLng) * LNG_TO_M * SCALE;
    const z = (lat - originLat) * LAT_TO_M * SCALE;
    return { x, z };
}

function buildCurve(waypoints) {
    const originLat = waypoints[0][0];
    const originLng = waypoints[0][1];

    const points3D = waypoints.map(([lat, lng]) => {
        const { x, z } = latLngToGame(lat, lng, originLat, originLng);
        return new THREE.Vector3(x, 0, z);
    });

    // CatmullRom for smooth interpolation
    const curve = new THREE.CatmullRomCurve3(points3D, false, 'catmullrom', 0.5);
    return curve;
}

export const cityCurve = buildCurve(RAW_WAYPOINTS);
export const curveLength = cityCurve.getLength();
export const waypoints3D = RAW_WAYPOINTS.map(([lat, lng]) => {
    const { x, z } = latLngToGame(lat, lng, RAW_WAYPOINTS[0][0], RAW_WAYPOINTS[0][1]);
    return new THREE.Vector3(x, 0, z);
});

// For debugging: get nearest point on curve and its tangent
export function getCurvePoint(t) {
    const pt = cityCurve.getPointAt(Math.max(0, Math.min(1, t)));
    const tangent = cityCurve.getTangentAt(Math.max(0, Math.min(1, t))).normalize();
    return { point: pt, tangent };
}

// Road properties
export const ROAD_WIDTH = 28;        // game units (~3.5 real meters, 2 lanes)
export const SHOULDER_WIDTH = 5;
export const LANE_COUNT = 2;         // one each direction
export const LANE_WIDTH = ROAD_WIDTH / (LANE_COUNT * 2); // per half-lane

console.log(`[cityMap] Road length: ${(curveLength / SCALE).toFixed(0)} real meters → ${curveLength.toFixed(0)} game units`);
