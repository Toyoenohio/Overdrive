/**
 * UI — cyberpunk HUD management.
 */
export class UI {
    constructor() {
        this.speedValue  = document.getElementById('speed-value');
        this.scoreValue  = document.getElementById('score-value');
        this.rpmValue    = document.getElementById('rpm-value');
        this.gearDisplay = document.getElementById('gear-display');
        this.timeLabel   = document.getElementById('time-label');
        this.odoValue    = document.getElementById('odo-value');
        this.hud         = document.getElementById('hud');

        this.startScreen   = document.getElementById('start-screen');
        this.gameoverScreen = document.getElementById('gameover-screen');
        this.finalScore    = document.getElementById('final-score');
        this.finalSpeed    = document.getElementById('final-speed');

        this.startBtn   = document.getElementById('start-btn');
        this.restartBtn = document.getElementById('restart-btn');

        this._totalDistance = 0;
        this._updateClock();
        this._clockInterval = setInterval(() => this._updateClock(), 1000);
    }

    /* ---------- HUD updates ---------- */

    updateSpeed(speed) {
        this.speedValue.textContent = Math.round(speed);

        // Gear indicator based on speed
        if (speed < 1) {
            this.gearDisplay.textContent = 'P';
        } else if (speed < 0) {
            this.gearDisplay.textContent = 'R';
        } else {
            this.gearDisplay.textContent = 'D';
        }
    }

    updateScore(distanceMeters) {
        this._totalDistance = distanceMeters;

        if (distanceMeters >= 1000) {
            this.scoreValue.textContent = (distanceMeters / 1000).toFixed(1) + ' KM';
        } else {
            this.scoreValue.textContent = Math.round(distanceMeters) + ' M';
        }

        // Odometer
        if (this.odoValue) {
            this.odoValue.textContent = String(Math.round(distanceMeters)).padStart(5, '0') + ' M';
        }
    }

    updateRPM(speed) {
        // Simulated RPM based on speed
        const rpm = Math.min(Math.abs(speed) / 160 * 7, 7).toFixed(1);
        if (this.rpmValue) {
            this.rpmValue.textContent = rpm;
        }
    }

    _updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        if (this.timeLabel) {
            this.timeLabel.textContent = `${h}:${m}`;
        }
    }

    /* ---------- Screen visibility ---------- */

    showHUD()  { this.hud.classList.remove('hidden'); }
    hideHUD()  { this.hud.classList.add('hidden'); }

    showStartScreen()  { this.startScreen.classList.remove('hidden'); }
    hideStartScreen()  { this.startScreen.classList.add('hidden'); }

    showGameOver(distance, speed) {
        const distText = distance >= 1000
            ? (distance / 1000).toFixed(1) + ' km'
            : Math.round(distance) + ' m';
        this.finalScore.textContent = `Distancia: ${distText}`;
        this.finalSpeed.textContent = `Velocidad: ${Math.round(speed)} km/h`;
        this.gameoverScreen.classList.remove('hidden');
    }

    hideGameOver() { this.gameoverScreen.classList.add('hidden'); }

    /* ---------- Callbacks ---------- */

    onStart(callback)   { this.startBtn.addEventListener('click', callback); }
    onRestart(callback) { this.restartBtn.addEventListener('click', callback); }
}
