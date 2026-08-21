/**
 * Main Entry Point for AI Fruit Ninja
 * Sets up event listeners, mobile touch guards, and camera preview dragging.
 */

document.addEventListener('DOMContentLoaded', () => {
    Game.init();

    const on = (id, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', handler);
    };

    on('startBtn', () => {
        AudioManager.init();
        Game.start();
    });

    on('restartBtn', () => Game.restart());
    on('restartFromPauseBtn', () => {
        Game.hideScreen('pauseMenu');
        Game.startCountdown();
    });
    on('mainMenuBtn', () => Game.mainMenu());
    on('mainMenuFromPauseBtn', () => Game.mainMenu());
    on('pauseBtn', () => Game.pause());
    on('resumeBtn', () => Game.resume());
    on('retryCameraBtn', () => Game.start());
    on('cameraErrorMenuBtn', () => Game.mainMenu());
    on('closeCameraBtn', () => {
        document.getElementById('cameraPreview').classList.add('hidden');
    });

    setupGameplayTouchGuard();
    setupCameraDrag();

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
            if (Game.state === 'playing') {
                Game.pause();
            } else if (Game.state === 'paused') {
                Game.resume();
            }
        }
    });
        // Debug toggle: tap hint 5 times or press D
    let debugTaps = 0;
    const hintEl = document.querySelector('.hint');
    if (hintEl) {
        hintEl.addEventListener('click', () => {
            debugTaps++;
            if (debugTaps >= 5) {
                Game.toggleDebug();
                debugTaps = 0;
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'd' || e.key === 'D') {
            Game.toggleDebug();
        }
    });

    console.log('AI Fruit Ninja initialized. Click Start Game to begin!');
});

function setupGameplayTouchGuard() {
    const canvas = document.getElementById('gameCanvas');
    const prevent = (e) => {
        if (e.cancelable) e.preventDefault();
    };

    // passiv&e:false is required on Android Chrome to stop pull-to-refresh/scroll
    // while the player is swiping over the gameplay area.
    canvas.addEventListener('touchstart', prevent, { passive: false });
    canvas.addEventListener('touchmove', prevent, { passive: false });
    canvas.addEventListener('touchend', prevent, { passive: false });
    canvas.addEventListener('touchcancel', prevent, { passive: false });
}

function setupCameraDrag() {
    const preview = document.getElementById('cameraPreview');
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    preview.addEventListener('mousedown', startDrag);
    preview.addEventListener('touchstart', startDrag, { passive: false });

    function startDrag(e) {
        if (e.target.id === 'closeCameraBtn') return;
        if (e.cancelable) e.preventDefault();

        isDragging = true;
        const point = getPoint(e);

        startX = point.x;
        startY = point.y;
        initialLeft = preview.offsetLeft;
        initialTop = preview.offsetTop;

        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', stopDrag);
        document.addEventListener('touchcancel', stopDrag);
    }

    function drag(e) {
        if (!isDragging) return;
        if (e.cancelable) e.preventDefault();

        const point = getPoint(e);
        const dx = point.x - startX;
        const dy = point.y - startY;
        const maxLeft = Math.max(0, window.innerWidth - preview.offsetWidth);
        const maxTop = Math.max(0, window.innerHeight - preview.offsetHeight);

        preview.style.left = `${Utils.clamp(initialLeft + dx, 0, maxLeft)}px`;
        preview.style.top = `${Utils.clamp(initialTop + dy, 0, maxTop)}px`;
        preview.style.right = 'auto';
    }

    function stopDrag() {
        isDragging = false;
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('touchend', stopDrag);
        document.removeEventListener('touchcancel', stopDrag);
    }

    function getPoint(e) {
        const touch = e.touches && e.touches.length > 0
            ? e.touches[0]
            : (e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : null);

        return {
            x: touch ? touch.clientX : e.clientX,
            y: touch ? touch.clientY : e.clientY
        };
    }
}
