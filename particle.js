/**
 * Juice, sparkle, and explosion particles
 */
const ParticleSystem = {
    particles: [],
    clear() {
        this.particles = [];
    },
    spawnJuice(x, y, color = '#f97316') {
        for (let i = 0; i < 18; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const speed = Utils.random(90, 320);
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - Utils.random(40, 140),
                radius: Utils.random(2, 6),
                life: Utils.random(0.35, 0.75),
                maxLife: 0,
                color,
                gravity: 620,
                type: 'juice'
            });
            this.particles[this.particles.length - 1].maxLife = this.particles[this.particles.length - 1].life;
        }
    },
    spawnExplosion(x, y) {
        const colors = ['#f97316', '#ef4444', '#facc15', '#111827'];
        for (let i = 0; i < 42; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const speed = Utils.random(140, 520);
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Utils.random(2, 8),
                life: Utils.random(0.35, 0.9),
                maxLife: 0,
                color: colors[Utils.randomInt(0, colors.length - 1)],
                gravity: 360,
                type: 'explosion'
            });
            this.particles[this.particles.length - 1].maxLife = this.particles[this.particles.length - 1].life;
        }
    },
    spawnComboSparkles(x, y, combo = 2) {
        const count = Math.min(10 + combo * 2, 34);
        for (let i = 0; i < count; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const speed = Utils.random(70, 240);
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Utils.random(1.5, 3.5),
                life: Utils.random(0.35, 0.7),
                maxLife: 0,
                color: '#facc15',
                gravity: 120,
                type: 'sparkle'
            });
            this.particles[this.particles.length - 1].maxLife = this.particles[this.particles.length - 1].life;
        }
    },
    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            p.vy += p.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
        }
    },
    render(ctx) {
        ctx.save();
        for (const p of this.particles) {
            const alpha = Utils.clamp(p.life / p.maxLife, 0, 1);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * (0.55 + alpha * 0.45), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
};
