import * as THREE from 'three';
import { InputManager } from './input.js';
import { Car }          from './car.js';
import { RoadManager }  from './road.js';
import { Environment }  from './environment.js';
import { GameCamera }   from './camera.js';
import { UI }           from './ui.js';

/**
 * Game — main loop, module coordination, scenic driving experience.
 */
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ui     = new UI();
        this.input  = new InputManager();

        /* --- Renderer --- */
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            powerPreference: 'high-performance',
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        /* --- Scene --- */
        this.scene = new THREE.Scene();

        /* --- Modules --- */
        this.car         = new Car(this.scene);
        this.road        = new RoadManager(this.scene);
        this.environment = new Environment(this.scene);
        this.gameCamera  = new GameCamera(this.renderer);

        /* --- State --- */
        this.isRunning  = false;
        this.isGameOver = false;
        this.clock      = new THREE.Clock(false);

        /* --- UI wiring --- */
        this.ui.onStart(()   => this.start());
        this.ui.onRestart(() => this.restart());

        /* --- Initial scene render --- */
        this.road.update(0, 0, 1);
        this.gameCamera.reset(this.car.getPosition());
        this.renderer.render(this.scene, this.gameCamera.getCamera());

        /* --- Start loop --- */
        this._animate();
    }

    /* ---------- Game lifecycle ---------- */

    start() {
        this.isRunning  = true;
        this.isGameOver = false;
        this.clock.start();
        this.ui.hideStartScreen();
        this.ui.showHUD();
    }

    restart() {
        this.car.reset();
        this.road.reset();
        this.environment.reset();
        this.road.update(0, 0, 1);
        this.gameCamera.reset(this.car.getPosition());
        this.ui.hideGameOver();
        this.start();
    }

    gameOver() {
        this.isGameOver = true;
        this.isRunning  = false;
        this.clock.stop();
        this.ui.showGameOver(this.car.distanceTraveled, this.car.speed);
    }

    /* ---------- Main loop ---------- */

    _animate() {
        requestAnimationFrame(() => this._animate());

        // Still render even when not running (so start screen shows 3D scene)
        if (!this.isRunning || this.isGameOver) {
            this.renderer.render(this.scene, this.gameCamera.getCamera());
            return;
        }

        const dt = Math.min(this.clock.getDelta(), 0.05);

        // Update car
        this.car.update(dt, this.input);

        const carPos = this.car.getPosition();
        const carZ   = carPos.z;

        // Update world
        const dayFactor = this.environment.getDayFactor();
        this.road.update(carZ, dt, dayFactor);
        this.environment.update(dt, carZ);

        // Headlights react to day/night
        const nightFactor = 1 - dayFactor;
        this.car.setHeadlights(nightFactor);

        // Camera
        this.gameCamera.update(dt, carPos, this.car.speed, this.car.group.rotation.y);

        // HUD
        this.ui.updateSpeed(this.car.speed);
        this.ui.updateScore(this.car.distanceTraveled);
        this.ui.updateTimeOfDay(this.environment.getDayFactor());

        // No collision — this is a scenic cruise experience!

        // Tone-mapping exposure dims slightly at night
        this.renderer.toneMappingExposure = THREE.MathUtils.lerp(0.6, 1.0, this.environment.getDayFactor());

        // Render
        this.renderer.render(this.scene, this.gameCamera.getCamera());
    }
}

/* ===== Bootstrap ===== */
const game = new Game();
