/**
 * Utility helpers for AI Fruit Ninja
 */
const Utils = {
    lerp(a, b, t) {
        return a + (b - a) * t;
    },
    clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    },
    random(min, max) {
        return Math.random() * (max - min) + min;
    },
    randomInt(min, max) {
        return Math.floor(this.random(min, max + 1));
    },
    formatNumber(value) {
        return Number(value || 0).toLocaleString('en-US');
    },
    debounce(fn, wait = 120) {
        let timeoutId = null;
        return (...args) => {
            window.clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => fn(...args), wait);
        };
    },
    getViewportSize() {
        const viewport = window.visualViewport;
        return {
            width: Math.max(1, Math.round(viewport ? viewport.width : window.innerWidth)),
            height: Math.max(1, Math.round(viewport ? viewport.height : window.innerHeight))
        };
    },
    resizeCanvas(canvas) {
        const { width, height } = this.getViewportSize();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const pixelWidth = Math.max(1, Math.round(width * dpr));
        const pixelHeight = Math.max(1, Math.round(height * dpr));
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
            canvas.width = pixelWidth;
            canvas.height = pixelHeight;
        }
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { width, height, dpr };
    },
    distance(x1, y1, x2, y2) {
        return Math.hypot(x2 - x1, y2 - y1);
    },
    segmentCircleHit(x1, y1, x2, y2, cx, cy, radius) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSq = dx * dx + dy * dy;
        if (lengthSq === 0) {
            return this.distance(x1, y1, cx, cy) <= radius;
        }
        let t = ((cx - x1) * dx + (cy - y1) * dy) / lengthSq;
        t = this.clamp(t, 0, 1);
        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;
        return this.distance(closestX, closestY, cx, cy) <= radius;
    }
};
