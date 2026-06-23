import * as THREE from 'three';

/**
 * cityMap — Lechería road network.
 *
 * Route: Crucero de Lechería → Av. Bolívar (2.3 km real)
 * Shape: "J" — diagonal NW from crucero, right turn near
 *        C.C. Aventura Plaza, then straight north to Av. Bolívar.
 *
 * Coordinates traced from Google Maps route image provided by user.
 */

const RAW_WAYPOINTS = [
    // lat,      lng           description
    [ 10.1823,  -64.6598  ], // 00 — Crucero de Lechería (McDonald's / Av. Intercomunal)
    [ 10.1828,  -64.6608  ], // 01 — entrando a la diagonal NW
    [ 10.1835,  -64.6620  ], // 02 — pasando CC Plaza Mayor
    [ 10.1842,  -64.6632  ], // 03 — diagonal NW
    [ 10.1850,  -64.6642  ], // 04 — cruza Av. A / Calle Marino
    [ 10.1860,  -64.6650  ], // 05 — zona El Verdader Sabor Zuliano
    [ 10.1870,  -64.6655  ], // 06 — aproximándose a C.C. Aventura Plaza
    [ 10.1880,  -64.6658  ], // 07 — C.C. Aventura Plaza (inicio de curva derecha)
    [ 10.1888,  -64.6655  ], // 08 — curva derecha (diagonal → norte)
    [ 10.1895,  -64.6650  ], // 09 — final de curva, alineando al norte
    [ 10.1900,  -64.6648  ], // 10 — recta norte, cruza Calle El Dorado
    [ 10.1910,  -64.6645  ], // 11 — recta norte
    [ 10.1920,  -64.6642  ], // 12 — La Bodeguilla Bodegón
    [ 10.1930,  -64.6640  ], // 13 — cruza Calle Sábalo
    [ 10.1940,  -64.6638  ], // 14 — Restaurant Bella China Lechería
    [ 10.1950,  -64.6635  ], // 15 — recta norte, cruza Calle Neverí
    [ 10.1958,  -64.6632  ], // 16 — cruza Av. Tamanaco
    [ 10.1965,  -64.6630  ], // 17 — Unidad Educativa J.J. Garmendia
    [ 10.1970,  -64.6628  ], // 18 — intersección Av. Bolívar / Av. Daniel Camejo Octavio
];

// Conversion factors for Lechería (~10.19° N)
const LAT_TO_M = 111_320;                     // meters per degree latitude
const LNG_TO_M = 111_320 * Math.cos(10.19 * Math.PI / 180); // ~109,590 m/deg
const SCALE = 3.5;                            // game units per real meter

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
export const ROAD_WIDTH = 28;        // game units (~4 real meters per side, 2 lanes)
export const SHOULDER_WIDTH = 5;
export const LANE_COUNT = 2;         // one each direction
export const LANE_WIDTH = ROAD_WIDTH / (LANE_COUNT * 2); // per half-lane

const realMeters = curveLength / SCALE;
console.log(`[cityMap] Road length: ${realMeters.toFixed(0)} real meters → ${curveLength.toFixed(0)} game units (scale ${SCALE}x)`);
console.log(`[cityMap] Shape: 19 waypoints, J-curve — diagonal NW → right turn → straight N`);
