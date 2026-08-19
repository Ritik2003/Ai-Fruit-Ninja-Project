/**
 * Procedural sound effects using Web Audio API
 */
const AudioManager = {
    ctx: null,
    masterGain: null,
    initialized: false,

    init() {
        if (this.initialized && this.ctx) {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
            return;
        }

        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;

            this.ctx = new AudioContextClass();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.22;
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
        } catch (error) {
            console.warn('Audio initialization failed:', error);
        }
    },

    ensureContext() {
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    },

    tone({ frequency = 440, duration = 0.12, type = 'sine', volume = 0.5, slideTo = null, delay = 0 }) {
        const ctx = this.ensureContext();
        if (!ctx || !this.masterGain) return;

        const start = ctx.currentTime + delay;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);
        if (slideTo) {
            oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + duration);
        }

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        oscillator.connect(gain);
        gain.connect(this.masterGain);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.03);
    },

    noise({ duration = 0.2, volume = 0.4, delay = 0, filterFrequency = 900 }) {
        const ctx = this.ensureContext();
        if (!ctx || !this.masterGain) return;

        const start = ctx.currentTime + delay;
        const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }

        const source = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        source.buffer = buffer;
        filter.type = 'lowpass';
        filter.frequency.value = filterFrequency;
        gain.gain.setValueAtTime(volume, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        source.start(start);
    },

    playSlice() {
        this.noise({ duration: 0.09, volume: 0.32, filterFrequency: 2400 });
        this.tone({ frequency: 720, slideTo: 260, duration: 0.1, type: 'triangle', volume: 0.28 });
    },

    playCombo(combo = 2) {
        const base = 420 + Math.min(combo, 10) * 35;
        this.tone({ frequency: base, duration: 0.08, type: 'square', volume: 0.18 });
        this.tone({ frequency: base * 1.35, duration: 0.1, type: 'square', volume: 0.16, delay: 0.06 });
    },

    playBomb() {
        this.noise({ duration: 0.42, volume: 0.65, filterFrequency: 360 });
        this.tone({ frequency: 140, slideTo: 42, duration: 0.38, type: 'sawtooth', volume: 0.38 });
    },

    playTick() {
        this.tone({ frequency: 620, duration: 0.06, type: 'sine', volume: 0.2 });
    },

    playGo() {
        this.tone({ frequency: 520, duration: 0.08, type: 'triangle', volume: 0.24 });
        this.tone({ frequency: 780, duration: 0.14, type: 'triangle', volume: 0.28, delay: 0.08 });
    },

    playLifeLost() {
        this.tone({ frequency: 260, slideTo: 120, duration: 0.24, type: 'sawtooth', volume: 0.24 });
    },

    playGameOver() {
        this.tone({ frequency: 320, slideTo: 190, duration: 0.22, type: 'triangle', volume: 0.24 });
        this.tone({ frequency: 220, slideTo: 110, duration: 0.32, type: 'triangle', volume: 0.24, delay: 0.18 });
    }
};
