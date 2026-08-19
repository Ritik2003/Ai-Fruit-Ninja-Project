/**
 * Swipe trail and fruit collision detection
 */
const CollisionSystem = {
    trail: [],
    maxTrailLength: 15,
    minSwipeDistance: 12,
    minSwipeSpeed: 7,
    isSwiping: false,
    lastX: 0,
    lastY: 0,
    hasLastPoint: false,
    swipeAngle: 0,
    reset() {
        this.trail = [];
        this.isSwiping = false;
        this.hasLastPoint = false;
        this.swipeAngle = 0;
    },
    updateFingerPosition(x, y, visible) {
        if (!visible) {
            this.isSwiping = false;
            this.hasLastPoint = false;
            return;
        }
        if (!this.hasLastPoint) {
            this.lastX = x;
            this.lastY = y;
            this.hasLastPoint = true;
            this.trail.push({ x, y, life: 1 });
            return;
        }
        const dx = x - this.lastX;
        const dy = y - this.lastY;
        const distance = Math.hypot(dx, dy);
        if (distance >= this.minSwipeDistance) {
            this.isSwiping = distance >= this.minSwipeDistance;
            this.swipeAngle = Math.atan2(dy, dx);
            this.trail.push({ x, y, life: 1 });
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }
            this.lastX = x;
            this.lastY = y;
        } else {
            this.isSwiping = false;
            if (this.trail.length > 0) {
                this.trail[this.trail.length - 1].x = x;
                this.trail[this.trail.length - 1].y = y;
            }
        }
    },
    updateSlashTrail() {
        for (let i = this.trail.length - 1; i >= 0; i--) {
            this.trail[i].life -= 0.055;
            if (this.trail[i].life <= 0) {
                this.trail.splice(i, 1);
            }
        }
        if (this.trail.length === 0) {
            this.isSwiping = false;
        }
    },
    checkCollisions(fruits) {
        const hits = [];
        if (!this.isSwiping || this.trail.length < 2) return hits;
        const segmentCount = Math.min(3, this.trail.length - 1);
        for (const fruit of fruits) {
            if (fruit.isSliced) continue;
            for (let i = this.trail.length - segmentCount - 1; i < this.trail.length - 1; i++) {
                if (i < 0) continue;
                const p1 = this.trail[i];
                const p2 = this.trail[i + 1];
                if (Utils.segmentCircleHit(p1.x, p1.y, p2.x, p2.y, fruit.x, fruit.y, fruit.radius * 0.92)) {
                    hits.push({ fruit, angle: Math.atan2(p2.y - p1.y, p2.x - p1.x) });
                    break;
                }
            }
        }
        return hits;
    },
    renderSlash(ctx) {
        if (this.trail.length < 2) return;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 1; i < this.trail.length; i++) {
            const p1 = this.trail[i - 1];
            const p2 = this.trail[i];
            const alpha = Utils.clamp(Math.min(p1.life, p2.life), 0, 1);
            ctx.strokeStyle = `rgba(125, 211, 252, ${alpha * 0.9})`;
            ctx.lineWidth = 4 + alpha * 7;
            ctx.shadowColor = 'rgba(74, 222, 128, 0.8)';
            ctx.shadowBlur = 16 * alpha;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
        ctx.restore();
    }
};
