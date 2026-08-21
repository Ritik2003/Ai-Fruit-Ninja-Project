/**
 * Main Game Logic for AI Fruit Ninja
 * Handles game states, scoring, lives, mobile-safe resizing, and rendering.
 */
const Game = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,

    state: 'loading',
    score: 0,
    lives: 3,
    maxLives: 3,
    combo: 0,
    maxCombo: 0,
    comboTimer: 0,
    comboTimeout: 60,
    fruitsSliced: 0,
    difficulty: 1,

    animationId: null,
    lastTime: 0,
    bgGradient: null,
    resizeHandler: null,
    lastViewportWidth: 0,
    lastViewportHeight: 0,

    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.resize();
        this.setupResizeHandling();
        this.preventMobileScroll();

        AudioManager.init();

        this.showScreen('startScreen');
        document.getElementById('menuBestScore').textContent = this.getBestScore();

        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.state === 'playing') {
                this.pause();
            }
        });
    },

    setupResizeHandling() {
        this.resizeHandler = Utils.debounce(() => this.resizeIfNeeded(), 140);
        window.addEventListener('resize', this.resizeHandler);
        window.addEventListener('orientationchange', this.resizeHandler);

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', this.resizeHandler);
            window.visualViewport.addEventListener('scroll', this.resizeHandler);
        }
    },

    preventMobileScroll() {
        const preventDefault = (e) => {
            if (e.cancelable) e.preventDefault();
        };

        document.addEventListener('touchmove', preventDefault, { passive: false });
        document.addEventListener('gesturestart', preventDefault, { passive: false });
        document.addEventListener('dblclick', preventDefault, { passive: false });
    },

    resizeIfNeeded() {
        const viewport = Utils.getViewportSize();
        const widthChanged = viewport.width !== this.lastViewportWidth;
        const heightChanged = Math.abs(viewport.height - this.lastViewportHeight) > 24;

        // Android Chrome address-bar show/hide can fire repeated tiny height changes.
        // Debounce + threshold keeps the gameplay canvas from jittering every frame.
        if (widthChanged || heightChanged) {
            this.resize();
        }
    },

    resize() {
        const dims = Utils.resizeCanvas(this.canvas);
        this.width = dims.width;
        this.height = dims.height;
        this.lastViewportWidth = dims.width;
        this.lastViewportHeight = dims.height;
        HandTracking.setCanvasDimensions(this.width, this.height);

        this.bgGradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        this.bgGradient.addColorStop(0, '#1a1a2e');
        this.bgGradient.addColorStop(0.5, '#16213e');
        this.bgGradient.addColorStop(1, '#0f3460');

        if (this.state === 'playing' || this.state === 'paused') {
            this.render();
        }
    },

    async start() {
        this.state = 'loading';
        this.showScreen('loadingScreen');
        this.hideScreen('cameraError');

        const cameraSuccess = await HandTracking.start();

        if (!cameraSuccess) {
            const errorEl = document.getElementById('cameraErrorMessage');
            errorEl.textContent = HandTracking.lastErrorMessage || 'Camera access failed. Permission aur HTTPS check karo.';
            this.hideScreen('loadingScreen');
            this.showScreen('cameraError');
            this.state = 'menu';
            return;
        }

        document.getElementById('cameraPreview').classList.remove('hidden');
        this.hideScreen('loadingScreen');
        this.startCountdown();
    },

    startCountdown() {
        this.state = 'countdown';
        const overlay = document.getElementById('countdownOverlay');
        const numberEl = document.getElementById('countdownNumber');

        overlay.classList.remove('hidden');

        let count = 3;
        numberEl.textContent = count;
        AudioManager.playTick();

        const interval = setInterval(() => {
            count--;

            if (count > 0) {
                numberEl.textContent = count;
                AudioManager.playTick();
            } else if (count === 0) {
                numberEl.textContent = 'GO!';
                AudioManager.playGo();
            } else {
                clearInterval(interval);
                overlay.classList.add('hidden');
                this.beginGameplay();
            }
        }, 1000);
    },

    beginGameplay() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.state = 'playing';
        this.lastFpsTime = performance.now();
        this.frameCount = 0;
        this.debugMode = false;
        this.score = 0;
        this.lives = this.maxLives;
        this.combo = 0;
        this.maxCombo = 0;
        this.fruitsSliced = 0;
        this.difficulty = 1;
        this.comboTimer = 0;

        FruitSpawner.clear();
        ParticleSystem.clear();
        CollisionSystem.reset();

        this.updateHUD();
        this.showScreen('hud');

        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
    },

    gameLoop(currentTime) {
        if (this.state !== 'playing') return;

        const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
        this.lastTime = currentTime;

        HandTracking.detect();

        const fingerPos = HandTracking.getFingerPosition();
        const velocity = HandTracking.getSwipeVelocity();
        CollisionSystem.updateFingerPosition(
            fingerPos.x,
            fingerPos.y,
            HandTracking.isFingerVisible,
            velocity
        );


        if (this.combo > 0) {
            this.comboTimer++;
            if (this.comboTimer >= this.comboTimeout) {
                this.combo = 0;
                this.updateHUD();
            }
        }

        FruitSpawner.update(this.width, this.height, this.score);

        const missedFruits = FruitSpawner.getMissedFruits();
        for (const fruit of missedFruits) {
            if (!fruit.isBomb) {
                this.lives--;
                AudioManager.playLifeLost();
                this.combo = 0;
                this.shakeScreen();

                if (this.lives <= 0) {
                    this.gameOver();
                    return;
                }
            }
        }

        if (CollisionSystem.isSwiping) {
            const hits = CollisionSystem.checkCollisions(FruitSpawner.getActiveFruits());

            for (const hit of hits) {
                const fruit = hit.fruit;

                if (fruit.isBomb) {
                    fruit.slice(hit.angle);
                    this.lives--;
                    AudioManager.playBomb();
                    ParticleSystem.spawnExplosion(fruit.x, fruit.y);
                    this.combo = 0;
                    this.shakeScreen();

                    if (this.lives <= 0) {
                        this.gameOver();
                        return;
                    }
                } else {
                    fruit.slice(hit.angle);

                    const points = fruit.type.points * (1 + this.combo);
                    this.score += points;
                    this.fruitsSliced++;
                    this.combo++;
                    this.comboTimer = 0;

                    if (this.combo > this.maxCombo) {
                        this.maxCombo = this.combo;
                    }

                    AudioManager.playSlice();
                    if (this.combo > 1) {
                        AudioManager.playCombo(this.combo);
                        ParticleSystem.spawnComboSparkles(fruit.x, fruit.y, this.combo);
                    }
                    ParticleSystem.spawnJuice(fruit.x, fruit.y, fruit.type.juiceColor);
                }
            }
        }

        ParticleSystem.update(dt);
        CollisionSystem.updateSlashTrail();
        this.updateHUD();
        this.render();

        this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
    },
    
    this.updateDebug();
     updateDebug() {
        if (!this.debugMode) return;
        document.getElementById('debugFps').textContent = this.fps || 0;
        document.getElementById('debugHand').textContent = HandTracking.isFingerVisible ? 'YES' : 'NO';
        document.getElementById('debugX').textContent = Math.round(HandTracking.fingerX || 0);
        document.getElementById('debugY').textContent = Math.round(HandTracking.fingerY || 0);
        document.getElementById('debugVel').textContent = Math.round(HandTracking.getSwipeVelocity());
        document.getElementById('debugMp').textContent = HandTracking.isInitialized ? (HandTracking.delegateUsed || 'OK') : 'FAIL';
        document.getElementById('debugCam').textContent = HandTracking.isRunning ? 'ON' : 'OFF';
    },

    toggleDebug() {
        this.debugMode = !this.debugMode;
        const panel = document.getElementById('debugPanel');
        if (panel) panel.classList.toggle('hidden', !this.debugMode);
        console.log('Debug:', this.debugMode ? 'ON' : 'OFF');
    },


    render() {
        const ctx = this.ctx;

        // Clear — camera is visible behind canvas via CSS
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Subtle overlay so fruits pop against real world
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.fillRect(0, 0, this.width, this.height);

        this.drawBackground(ctx);
        FruitSpawner.render(ctx);
        ParticleSystem.render(ctx);
        CollisionSystem.renderSlash(ctx);

        if (HandTracking.isFingerVisible) {
            this.drawFingerCursor(ctx);
        }
    },


    drawBackground(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1;
        const gridSize = 60;

        for (let x = 0; x < this.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }

        for (let y = 0; y < this.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }
    },

    drawFingerCursor(ctx) {
        const pos = HandTracking.getFingerPosition();

        ctx.save();
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.34)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(100, 200, 255, 0.68)';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    shakeScreen() {
        this.canvas.style.transform = `translate(${Utils.random(-5, 5)}px, ${Utils.random(-5, 5)}px)`;
        setTimeout(() => {
            this.canvas.style.transform = 'translate(0, 0)';
        }, 100);
    },

    updateHUD() {
        document.getElementById('scoreValue').textContent = Utils.formatNumber(this.score);

        const comboEl = document.getElementById('comboValue');
        if (this.combo > 1) {
            comboEl.textContent = `${this.combo}x COMBO!`;
            comboEl.classList.add('pop');
            setTimeout(() => comboEl.classList.remove('pop'), 300);
        } else {
            comboEl.textContent = '';
        }

        const hearts = '❤️'.repeat(Math.max(0, this.lives)) + '🖤'.repeat(Math.max(0, this.maxLives - this.lives));
        document.getElementById('livesHearts').textContent = hearts;
    },

    pause() {
        if (this.state !== 'playing') return;
        this.state = 'paused';
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.showScreen('pauseMenu');
    },

    resume() {
        if (this.state !== 'paused') return;
        this.hideScreen('pauseMenu');
        this.state = 'playing';
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
    },

    gameOver() {
        this.state = 'gameover';
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        AudioManager.playGameOver();

        const bestScore = this.getBestScore();
        if (this.score > bestScore) {
            localStorage.setItem('fruitNinjaBestScore', this.score);
        }

        document.getElementById('finalScore').textContent = Utils.formatNumber(this.score);
        document.getElementById('bestScore').textContent = Utils.formatNumber(Math.max(bestScore, this.score));
        document.getElementById('fruitsSliced').textContent = this.fruitsSliced;
        document.getElementById('maxCombo').textContent = this.maxCombo;

        this.hideScreen('hud');
        this.showScreen('gameOverScreen');
    },

    getBestScore() {
        const saved = localStorage.getItem('fruitNinjaBestScore');
        return saved ? parseInt(saved, 10) : 0;
    },

    restart() {
        this.hideScreen('gameOverScreen');
        this.startCountdown();
    },

    mainMenu() {
        this.state = 'menu';
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        HandTracking.stop();
        FruitSpawner.clear();
        ParticleSystem.clear();

        this.hideScreen('hud');
        this.hideScreen('pauseMenu');
        this.hideScreen('gameOverScreen');
        this.hideScreen('cameraError');
        this.hideScreen('loadingScreen');
        document.getElementById('cameraPreview').classList.add('hidden');

        this.showScreen('startScreen');
        document.getElementById('menuBestScore').textContent = this.getBestScore();
    },

    showScreen(id) {
        document.getElementById(id).classList.remove('hidden');
    },

    hideScreen(id) {
        document.getElementById(id).classList.add('hidden');
    }
};
