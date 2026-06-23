/**
 * InputManager — keyboard + mobile touch controls.
 */
export class InputManager {
    constructor() {
        this.keys  = {};
        this.touch = { throttle: 0, brake: 0, steerLeft: 0, steerRight: 0 };

        /* ---- Keyboard ---- */
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') e.preventDefault();
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        window.addEventListener('blur', () => { this.keys = {}; });

        /* ---- Touch (deferred until DOM ready) ---- */
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this._setupTouch());
        } else {
            this._setupTouch();
        }
    }

    /* ---- Touch Setup ---- */
    _setupTouch() {
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const mc = document.getElementById('mobile-controls');
        if (mc && isTouchDevice) {
            mc.classList.remove('hidden');
        }

        const bindings = {
            'btn-steer-left':  'steerLeft',
            'btn-steer-right': 'steerRight',
            'btn-gas':         'throttle',
            'btn-brake':       'brake',
        };

        for (const [id, action] of Object.entries(bindings)) {
            const el = document.getElementById(id);
            if (!el) continue;

            // Touch events
            el.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.touch[action] = 1;
                el.classList.add('active');
            }, { passive: false });

            el.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.touch[action] = 0;
                el.classList.remove('active');
            }, { passive: false });

            el.addEventListener('touchcancel', () => {
                this.touch[action] = 0;
                el.classList.remove('active');
            });

            // Mouse fallback (for desktop testing)
            el.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.touch[action] = 1;
                el.classList.add('active');
            });
            el.addEventListener('mouseup', () => {
                this.touch[action] = 0;
                el.classList.remove('active');
            });
            el.addEventListener('mouseleave', () => {
                this.touch[action] = 0;
                el.classList.remove('active');
            });
        }
    }

    /* ---- Getters (keyboard OR touch) ---- */
    get throttle() {
        return (this.keys['KeyW'] || this.keys['ArrowUp'] || this.touch.throttle) ? 1 : 0;
    }
    get brake() {
        return (this.keys['KeyS'] || this.keys['ArrowDown'] || this.touch.brake) ? 1 : 0;
    }
    get steerLeft() {
        return (this.keys['KeyA'] || this.keys['ArrowLeft'] || this.touch.steerLeft) ? 1 : 0;
    }
    get steerRight() {
        return (this.keys['KeyD'] || this.keys['ArrowRight'] || this.touch.steerRight) ? 1 : 0;
    }
    get handbrake() {
        return this.keys['Space'] ? 1 : 0;
    }
}
