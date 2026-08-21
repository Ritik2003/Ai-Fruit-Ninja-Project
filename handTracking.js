/**
 * Hand Tracking Module using MediaPipe Tasks Vision
 * Android-safe version with GPU -> CPU delegate fallback, camera error messages,
 * inline video flags, and alternate-frame detection for low-end phones.
 */
             /**
 * Hand Tracking Module using MediaPipe Tasks Vision
 * Android-safe version with GPU -> CPU delegate fallback, camera error messages,
 * inline video flags, and alternate-frame detection for low-end phones.
 */
const HandTracking = {
    handLandmarker: null,
    video: null,
    stream: null,

    isInitialized: false,
    isRunning: false,
    delegateUsed: null,
    lastErrorMessage: '',

    fingerX: 0.5,
    fingerY: 0.5,
    isFingerVisible: false,

    smoothedX: 0.5,
    smoothedY: 0.5,
    smoothingFactor: 0.32,

    canvasWidth: window.innerWidth,
    canvasHeight: window.innerHeight,

    cameraCanvas: null,
    cameraCtx: null,
    lastResults: null,

    // Run MediaPipe on every frame on desktop and every alternate frame on phones.
    detectionInterval: (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 2 : 1),
    frameCounter: 0,

    async waitForMediaPipe() {
        if (window.MediaPipeVision?.HandLandmarker) return;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(
                () => reject(new Error('MediaPipe load timeout')),
                15000
            );

            window.addEventListener('mediapipe-ready', () => {
                clearTimeout(timeout);
                resolve();
            }, { once: true });
        });
    },

    async init() {
        try {
            await this.waitForMediaPipe();

            const { HandLandmarker, FilesetResolver } = window.MediaPipeVision;

            if (!HandLandmarker || !FilesetResolver) {
                throw new Error('MediaPipe library load nahi hui. Internet/CDN connection check karo.');
            }

            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
            );

            const commonOptions = {
                runningMode: 'VIDEO',
                numHands: 1,
                minHandDetectionConfidence: 0.5,
                minHandPresenceConfidence: 0.5,
                minTrackingConfidence: 0.5
            };

            try {
                this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                    ...commonOptions,
                    baseOptions: {
                        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                        delegate: 'GPU'
                    }
                });
                this.delegateUsed = 'GPU';
            } catch (gpuError) {
                console.warn('GPU delegate failed, falling back to CPU delegate:', gpuError);
                this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                    ...commonOptions,
                    baseOptions: {
                        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                        delegate: 'CPU'
                    }
                });
                this.delegateUsed = 'CPU';
            }

            this.isInitialized = true;
            console.log(`Hand tracking initialized successfully with ${this.delegateUsed} delegate`);
            return true;
        } catch (error) {
            console.error('Failed to initialize hand tracking:', error);
            this.lastErrorMessage = 'Hand tracking model load nahi ho paya. Internet connection ya browser WebAssembly support check karo.';
            return false;
        }
    },

    async start() {
        this.lastErrorMessage = '';

        if (!this.isInitialized) {
            const success = await this.init();
            if (!success) return false;
        }

        try {
            if (!window.isSecureContext) {
                throw new Error('Camera sirf HTTPS ya localhost pe kaam karti hai. GitHub Pages ka HTTPS link use karo.');
            }

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Is browser mein camera API support nahi hai. Latest Android Chrome use karo.');
            }

            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: 'user' },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                });
            } catch (firstError) {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                });
            }

            this.stream = stream;

            this.video = document.getElementById('webcam');
            this.video.setAttribute('playsinline', '');
            this.video.setAttribute('muted', '');
            this.video.setAttribute('autoplay', '');
            this.video.playsInline = true;
            this.video.muted = true;
            this.video.autoplay = true;
            this.video.srcObject = this.stream;

            await this.waitForVideoReady();
            await this.video.play();
            this.video.classList.add('active');

            this.cameraCanvas = document.getElementById('cameraCanvas');
            this.cameraCtx = this.cameraCanvas.getContext('2d');
            this.cameraCanvas.width = 320;
            this.cameraCanvas.height = 240;

            this.frameCounter = 0;
            this.isRunning = true;
            return true;
        } catch (error) {
            console.error('Camera start failed:', error);
            this.lastErrorMessage = this.getCameraErrorMessage(error);
            this.stopStreamOnly();
            return false;
        }
    },

    waitForVideoReady() {
        return new Promise((resolve, reject) => {
            if (!this.video) {
                reject(new Error('Video element nahi mila.'));
                return;
            }

            const timeout = window.setTimeout(() => {
                reject(new Error('Camera video start hone mein time lag raha hai. Dobara try karo.'));
            }, 10000);

            this.video.onloadedmetadata = () => {
                window.clearTimeout(timeout);
                resolve();
            };

            this.video.onerror = () => {
                window.clearTimeout(timeout);
                reject(new Error('Camera video load nahi ho paya.'));
            };
        });
    },

    getCameraErrorMessage(error) {
        const name = error && error.name ? error.name : '';

        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
            return 'Camera permission denied. Android Chrome mein address bar ke lock/icon → Permissions → Camera → Allow karo, phir Retry dabao.';
        }

        if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
            return 'Koi camera nahi mila. Phone ka front camera available hai ya nahi check karo.';
        }

        if (name === 'NotReadableError' || name === 'TrackStartError') {
            return 'Camera kisi aur app/tab mein busy lag raha hai. Camera use karne wale apps band karke Retry karo.';
        }

        if (name === 'OverconstrainedError') {
            return 'Requested camera settings support nahi ho rahi. Default camera ke saath dobara try karo.';
        }

        if (name === 'SecurityError') {
            return 'Camera blocked hai kyunki page secure context mein nahi hai. HTTPS GitHub Pages link ya localhost use karo.';
        }

        return (error && error.message) ? error.message : 'Camera start nahi ho paya. Permission, HTTPS, aur browser support check karo.';
    },

    stopStreamOnly() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.video) {
            this.video.srcObject = null;
        }
    },

    stop() {
        this.isRunning = false;
        this.isFingerVisible = false;
        this.frameCounter = 0;
        this.stopStreamOnly();
        if (this.video) this.video.classList.remove('active');
        if (this.handLandmarker) {
            this.handLandmarker.close();
            this.handLandmarker = null;
        }
        this.isInitialized = false;
    },

    detect() {
        if (!this.isRunning || !this.handLandmarker || !this.video || this.video.readyState < 2) return;

        this.frameCounter = (this.frameCounter + 1) % this.detectionInterval;
        if (this.frameCounter !== 0) {
            this.renderCameraPreview();
            return;
        }

        try {
            const startTimeMs = performance.now();
            this.lastResults = this.handLandmarker.detectForVideo(this.video, startTimeMs);
        } catch (error) {
            console.warn('Hand detection frame failed:', error);
            this.renderCameraPreview();
            return;
        }

        if (this.lastResults && this.lastResults.landmarks && this.lastResults.landmarks.length > 0) {
            const landmarks = this.lastResults.landmarks[0];
            const indexTip = landmarks[8];

            if (indexTip) {
                const rawX = 1 - indexTip.x;
                const rawY = indexTip.y;

                this.smoothedX = Utils.lerp(this.smoothedX, rawX, this.smoothingFactor);
                this.smoothedY = Utils.lerp(this.smoothedY, rawY, this.smoothingFactor);

                this.fingerX = this.smoothedX;
                this.fingerY = this.smoothedY;
                this.isFingerVisible = true;
            }
        } else {
            this.isFingerVisible = false;
        }

        this.renderCameraPreview();
    },

    getFingerPosition() {
        return {
            x: this.fingerX * this.canvasWidth,
            y: this.fingerY * this.canvasHeight
        };
    },

    setCanvasDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
    },

    renderCameraPreview() {
        if (!this.cameraCtx || !this.video) return;

        const ctx = this.cameraCtx;
        const w = this.cameraCanvas.width;
        const h = this.cameraCanvas.height;

        ctx.clearRect(0, 0, w, h);

        if (this.video.readyState >= 2) {
            ctx.save();
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(this.video, 0, 0, w, h);
            ctx.restore();
        }

        if (this.lastResults && this.lastResults.landmarks && this.lastResults.landmarks.length > 0) {
            const landmarks = this.lastResults.landmarks[0];
            this.drawHandConnections(ctx, landmarks, w, h);

            const tip = landmarks[8];
            if (tip) {
                const tx = (1 - tip.x) * w;
                const ty = tip.y * h;

                ctx.fillStyle = '#4ade80';
                ctx.shadowColor = '#4ade80';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(tx, ty, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
    },

    drawHandConnections(ctx, landmarks, w, h) {
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],
            [0, 5], [5, 6], [6, 7], [7, 8],
            [0, 9], [9, 10], [10, 11], [11, 12],
            [0, 13], [13, 14], [14, 15], [15, 16],
            [0, 17], [17, 18], [18, 19], [19, 20]
        ];

        ctx.strokeStyle = 'rgba(74, 222, 128, 0.62)';
        ctx.lineWidth = 2;

        for (const [start, end] of connections) {
            const p1 = landmarks[start];
            const p2 = landmarks[end];

            if (p1 && p2) {
                ctx.beginPath();
                ctx.moveTo((1 - p1.x) * w, p1.y * h);
                ctx.lineTo((1 - p2.x) * w, p2.y * h);
                ctx.stroke();
            }
        }

        ctx.fillStyle = 'rgba(74, 222, 128, 0.82)';
        for (const landmark of landmarks) {
            ctx.beginPath();
            ctx.arc((1 - landmark.x) * w, landmark.y * h, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
};
   
            
        
