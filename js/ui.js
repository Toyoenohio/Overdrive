/**
 * UI — manages all DOM-based interface elements (HUD, screens).
 */
export class UI {
    constructor() {
        this.speedValue  = document.getElementById('speed-value');
        this.scoreValue  = document.getElementById('score-value');
        this.timeIcon    = document.getElementById('time-icon');
        this.timeLabel   = document.getElementById('time-label');
        this.hud         = document.getElementById('hud');

        this.startScreen   = document.getElementById('start-screen');
        this.gameoverScreen = document.getElementById('gameover-screen');
        this.finalScore    = document.getElementById('final-score');
        this.finalSpeed    = document.getElementById('final-speed');

        this.startBtn   = document.getElementById('start-btn');
        this.restartBtn = document.getElementById('restart-btn');
    }

    /* ---------- HUD updates ---------- */

    updateSpeed(speed) {
        this.speedValue.textContent = Math.round(speed);
    }

    updateScore(distanceMeters) {
        if (distanceMeters >= 1000) {
            this.scoreValue.textContent = (distanceMeters / 1000).toFixed(1) + ' km';
        } else {
            this.scoreValue.textContent = Math.round(distanceMeters) + ' m';
        }
    }

    updateTimeOfDay(dayFactor) {
        if (dayFactor > 0.5) {
            this.timeIcon.textContent  = '☀️';
            this.timeLabel.textContent = 'DÍA';
        } else {
            this.timeIcon.textContent  = '🌙';
            this.timeLabel.textContent = 'NOCHE';
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
