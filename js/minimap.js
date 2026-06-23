/**
 * Minimap — cyberpunk dark theme with neon accents.
 */
import { cityCurve, curveLength, waypoints3D } from './cityMap.js';

const MAP_SIZE = 180;
const PADDING = 20;
const DOT_RADIUS = 5;
const ROAD_COLOR = '#00666688';
const ROAD_WIDTH_PX = 4;
const CAR_COLOR = '#ff00ff';
const BG_COLOR = 'rgba(4, 4, 16, 0.8)';
const BORDER_COLOR = 'rgba(0, 255, 255, 0.2)';

export class Minimap {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'minimap-canvas';
        this.canvas.width = MAP_SIZE;
        this.canvas.height = MAP_SIZE;
        this.ctx = this.canvas.getContext('2d');

        this.canvas.className = 'minimap';
        Object.assign(this.canvas.style, {
            borderRadius: '4px',
            border: `1px solid ${BORDER_COLOR}`,
            pointerEvents: 'none',
            boxShadow: '0 0 12px rgba(0, 255, 255, 0.08)',
        });

        document.body.appendChild(this.canvas);

        this._computeBounds();
        this._buildRoadPath();
    }

    _computeBounds() {
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        const pts = cityCurve.getPoints(100);
        for (const p of pts) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.z < minZ) minZ = p.z;
            if (p.z > maxZ) maxZ = p.z;
        }
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

        // Clear
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = BG_COLOR;
        ctx.beginPath();
        ctx.roundRect(0, 0, w, h, 4);
        ctx.fill();

        // Grid lines (subtle)
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.04)';
        ctx.lineWidth = 0.5;
        for (let i = PADDING; i < w - PADDING; i += 20) {
            ctx.beginPath();
            ctx.moveTo(i, PADDING);
            ctx.lineTo(i, h - PADDING);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(PADDING, i);
            ctx.lineTo(w - PADDING, i);
            ctx.stroke();
        }

        // Road curve (cyan tint)
        ctx.strokeStyle = 'rgba(0, 200, 200, 0.4)';
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

        // Waypoint dots
        ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
        for (const wp of waypoints3D) {
            const { px, py } = this._worldToPixel(wp.x, wp.z);
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Car glow
        const { px, py } = this._worldToPixel(carPos.x, carPos.z);
        ctx.fillStyle = 'rgba(255, 0, 255, 0.25)';
        ctx.beginPath();
        ctx.arc(px, py, DOT_RADIUS + 4, 0, Math.PI * 2);
        ctx.fill();

        // Car dot
        ctx.fillStyle = CAR_COLOR;
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(px, py, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}
