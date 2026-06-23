/**
 * InputManager — keyboard + gamepad + mobile touch controls.
 *
 * Run `update()` once per frame to poll the gamepad state.
 */
export class InputManager {
    constructor() {
        this.keys  = {};
        this.touch = { throttle: 0, brake: 0, steerLeft: 0, steerRight: 0 };
        this.gamepad = null;         // active gamepad reference
        this.gamepadConnected = false;
        this._prevGamepadButtons = [];

        /* ---- Keyboard ---- */
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') e.preventDefault();
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        window.addEventListener('blur', () => { this.keys = {}; });

        /* ---- Gamepad ---- */
        window.addEventListener('gamepadconnected', (e) => {
            this.gamepad = e.gamepad;
            this.gamepadConnected = true;
            console.log(`[input] Gamepad connected: ${e.gamepad.id}`);
        });
        window.addEventListener('gamepaddisconnected', () => {
            this.gamepad = null;
            this.gamepadConnected = false;
            console.log('[input] Gamepad disconnected');
        });

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

    /**
     * Call once per frame to poll gamepad state.
     * The Gamepad API requires polling — no events for button/axis changes.
     */
    update() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        this.gamepad = null;
        for (const gp of gamepads) {
            if (gp && gp.connected) {
                this.gamepad = gp;
                this.gamepadConnected = true;
                break;
            }
        }
        if (!this.gamepad) {
            this.gamepadConnected = false;
        }
    }

    /* ---- Getters (priority: keyboard > gamepad > touch) ---- */

    get throttle() {
        if (this.keys['KeyW'] || this.keys['ArrowUp']) return 1;
        if (this.touch.throttle) return 1;
        // Gamepad: right trigger (axis 5 on standard mapping, or button 7 for RT)
        if (this.gamepad) {
            const rt = this.gamepad.buttons[7]?.value ?? 0; // RT on Xbox/standard
            const r2Axis = this.gamepad.axes[5]; // alternate
            if (rt > 0.1) return rt;
            if (r2Axis > 0.1) return (r2Axis + 1) / 2; // axis -1..1 → 0..1
        }
        return 0;
    }

    get brake() {
        if (this.keys['KeyS'] || this.keys['ArrowDown']) return 1;
        if (this.touch.brake) return 1;
        // Gamepad: left trigger (button 6 on standard mapping)
        if (this.gamepad) {
            const lt = this.gamepad.buttons[6]?.value ?? 0;
            const l2Axis = this.gamepad.axes[4];
            if (lt > 0.1) return lt;
            if (l2Axis > 0.1) return (l2Axis + 1) / 2;
        }
        return 0;
    }

    get steerLeft() {
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) return 1;
        if (this.touch.steerLeft) return 1;
        // Gamepad: left stick X (axis 0) < -0.2
        if (this.gamepad && this.gamepad.axes[0] < -0.2) {
            return Math.abs(this.gamepad.axes[0]);
        }
        // D-pad left
        if (this.gamepad && this.gamepad.buttons[14]?.pressed) return 1;
        return 0;
    }

    get steerRight() {
        if (this.keys['KeyD'] || this.keys['ArrowRight']) return 1;
        if (this.touch.steerRight) return 1;
        // Gamepad: left stick X (axis 0) > 0.2
        if (this.gamepad && this.gamepad.axes[0] > 0.2) {
            return this.gamepad.axes[0];
        }
        // D-pad right
        if (this.gamepad && this.gamepad.buttons[15]?.pressed) return 1;
        return 0;
    }

    get handbrake() {
        if (this.keys['Space']) return 1;
        // Gamepad: A button (button 0) or X (button 2)
        if (this.gamepad) {
            if (this.gamepad.buttons[0]?.pressed) return 1; // A / Cross
            if (this.gamepad.buttons[2]?.pressed) return 1; // X / Square
        }
        return 0;
    }
}
