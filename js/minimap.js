/**
 * Minimap — 2D top-down road map with car position indicator.
 * Renders to a small canvas in the bottom-right corner.
 */
import { cityCurve, curveLength, waypoints3D } from './cityMap.js';

const MAP_SIZE = 180;   // canvas pixels
const PADDING = 20;
const DOT_RADIUS = 5;
const ROAD_COLOR = '#555';
const ROAD_WIDTH_PX = 4;
const CAR_COLOR = '#e63946';
const BG_COLOR = 'rgba(8, 8, 24, 0.7)';

export class Minimap {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'minimap-canvas';
        this.canvas.width = MAP_SIZE;
        this.canvas.height = MAP_SIZE;
        this.ctx = this.canvas.getContext('2d');

        // Style
        this.canvas.className = 'minimap';
        Object.assign(this.canvas.style, {
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.12)',
            pointerEvents: 'none',
        });

        document.body.appendChild(this.canvas);

        // Compute bounds from all waypoints
        this._computeBounds();

        // Pre-compute road polyline in pixel space
        this._buildRoadPath();
    }

    _computeBounds() {
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        const pts = cityCurve.getPoints(100); // fine sampling
        for (const p of pts) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.z < minZ) minZ = p.z;
            if (p.z > maxZ) maxZ = p.z;
        }
        // Add padding
        const dx = maxX - minX || 1;
        const dz = maxZ - minZ || 1;
        const scale = (MAP_SIZE - 2 * PADDING) / Math.max(dx, dz);

        this.offsetX = minX - (MAP_SIZE / scale - dx) / 2;
        this.offsetZ = minZ - (MAP_SIZE / scale - dz) / 2;
        this.scale = scale;
    }

    _worldToPixel(x, z) {
        return {
            px: PADDING + (x - this.offsetX) * this.scale,
            py: MAP_SIZE - PADDING - (z - this.offsetZ) * this.scale,
        };
    }

    _buildRoadPath() {
        const pts = cityCurve.getPoints(200);
        this.roadPath = pts.map(p => this._worldToPixel(p.x, p.z));
    }

    update(carPos) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear with rounded background
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = BG_COLOR;
        ctx.beginPath();
        ctx.roundRect(0, 0, w, h, 14);
        ctx.fill();

        // Draw road curve
        ctx.strokeStyle = ROAD_COLOR;
        ctx.lineWidth = ROAD_WIDTH_PX;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i < this.roadPath.length; i++) {
            const { px, py } = this.roadPath[i];
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Draw waypoint dots
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        for (const wp of waypoints3D) {
            const { px, py } = this._worldToPixel(wp.x, wp.z);
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw car position
        const { px, py } = this._worldToPixel(carPos.x, carPos.z);
        ctx.fillStyle = CAR_COLOR;
        ctx.beginPath();
        ctx.arc(px, py, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Car glow
        ctx.fillStyle = 'rgba(230, 57, 70, 0.4)';
        ctx.beginPath();
        ctx.arc(px, py, DOT_RADIUS + 3, 0, Math.PI * 2);
        ctx.fill();
    }
}
