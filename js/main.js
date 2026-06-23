import * as THREE from 'three';
import { InputManager } from './input.js';
import { Car }          from './car.js';
import { CityRoad }     from './cityRoad.js';
import { Environment }  from './environment.js';
import { GameCamera }   from './camera.js';
import { UI }           from './ui.js';
import { Minimap }      from './minimap.js';
import { Buildings }    from './buildings.js';
import { cityCurve, curveLength } from './cityMap.js';

/**
 * Game — Lechería cyberpunk night driving.
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
        this.renderer.toneMappingExposure = 0.65;

        /* --- Scene --- */
        this.scene = new THREE.Scene();

        /* --- City modules --- */
        this.car         = new Car(this.scene);
        this.cityRoad    = new CityRoad(this.scene);
        this.environment = new Environment(this.scene);
        this.gameCamera  = new GameCamera(this.renderer);
        this.minimap     = new Minimap();
        this.buildings   = new Buildings(this.scene);

        /* --- State --- */
        this.isRunning  = false;
        this.isGameOver = false;
        this.clock      = new THREE.Clock(false);

        /* --- Place car at start of road --- */
        const startPoint = cityCurve.getPointAt(0);
        const startTangent = cityCurve.getTangentAt(0).normalize();
        const startAngle = Math.atan2(startTangent.x, startTangent.z);
        this.car.group.position.copy(startPoint);
        this.car.group.rotation.y = startAngle;

        /* --- UI wiring --- */
        this.ui.onStart(()   => this.start());
        this.ui.onRestart(() => this.restart());

        /* --- Initial render --- */
        this.gameCamera.reset(this.car.getPosition(), this.car.group.quaternion);
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
        const startPoint = cityCurve.getPointAt(0);
        const startTangent = cityCurve.getTangentAt(0).normalize();
        const startAngle = Math.atan2(startTangent.x, startTangent.z);
        this.car.group.position.copy(startPoint);
        this.car.group.rotation.y = startAngle;
        this.gameCamera.reset(this.car.getPosition(), this.car.group.quaternion);
        this.environment.reset();
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

        if (!this.isRunning || this.isGameOver) {
            this.renderer.render(this.scene, this.gameCamera.getCamera());
            return;
        }

        const dt = Math.min(this.clock.getDelta(), 0.05);

        // Poll gamepad
        this.input.update();

        // Update car (free 2D movement)
        this.car.update(dt, this.input);

        const carPos = this.car.getPosition();

        // Day/night — always night
        this.environment.update(dt, carPos.z);
        this.car.setHeadlights(1);   // always full headlights

        // Off-road detection
        if (!this.cityRoad.isOnRoad(carPos)) {
            this.gameOver();
            return;
        }

        // Camera follows behind the car
        this.gameCamera.update(dt, carPos, this.car.speed, this.car.group.quaternion);

        // HUD
        this.ui.updateSpeed(this.car.speed);
        this.ui.updateScore(this.car.distanceTraveled);
        this.ui.updateRPM(this.car.speed);

        // Minimap
        this.minimap.update(carPos);

        // Render
        this.renderer.render(this.scene, this.gameCamera.getCamera());
    }
}

/* ===== Bootstrap ===== */
const game = new Game();
window.game = game; // debugging
