/**
 * Fruit entities and spawner
 */
const FRUIT_TYPES = [
    { name: 'watermelon', emoji: '🍉', color: '#22c55e', juiceColor: '#ef4444', points: 10 },
    { name: 'orange', emoji: '🍊', color: '#f97316', juiceColor: '#fb923c', points: 12 },
    { name: 'apple', emoji: '🍎', color: '#ef4444', juiceColor: '#f87171', points: 14 },
    { name: 'banana', emoji: '🍌', color: '#facc15', juiceColor: '#fde047', points: 16 },
    { name: 'lemon', emoji: '🍋', color: '#fde047', juiceColor: '#fef08a', points: 18 },
    { name: 'strawberry', emoji: '🍓', color: '#fb7185', juiceColor: '#fda4af', points: 20 }
];

class Fruit {
    constructor(width, height, difficulty = 1, isBomb = false) {
        this.isBomb = isBomb;
        this.type = isBomb
            ? { name: 'bomb', emoji: '💣', color: '#111827', juiceColor: '#f97316', points: 0 }
            : FRUIT_TYPES[Utils.randomInt(0, FRUIT_TYPES.length - 1)];

        this.radius = isBomb ? Utils.random(24, 34) : Utils.random(28, 42);
        this.x = Utils.random(this.radius + 8, Math.max(this.radius + 9, width - this.radius - 8));
        this.y = height + this.radius + Utils.random(0, 60);
        this.vx = Utils.random(-90, 90);
        this.vy = -(Utils.random(height * 0.62, height * 0.88) + difficulty * 22);
        this.gravity = Utils.random(1180, 1520);
        this.rotation = Utils.random(0, Math.PI * 2);
        this.rotationSpeed = Utils.random(-2.8, 2.8);
        this.isSliced = false;
        this.sliceAngle = 0;
        this.sliceTime = 0;
        this.alpha = 1;
    }

    update(dt) {
        this.vy += this.gravity * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.rotation += this.rotationSpeed * dt;

        if (this.isSliced) {
            this.sliceTime += dt;
            this.alpha = Utils.clamp(1 - this.sliceTime / 0.9, 0, 1);
        }
    }

    slice(angle = 0) {
        if (this.isSliced) return;
        this.isSliced = true;
        this.sliceAngle = angle;
        this.vx *= 0.35;
        this.vy = Math.min(this.vy, -120);
    }

    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        if (this.isSliced) {
            const offset = 9 + this.sliceTime * 48;
            ctx.rotate(this.sliceAngle);
            ctx.save();
            ctx.translate(-offset, 0);
            this.drawFruit(ctx, true);
            ctx.restore();
            ctx.save();
            ctx.translate(offset, 0);
            ctx.scale(-1, 1);
            this.drawFruit(ctx, true);
            ctx.restore();
        } else {
            this.drawFruit(ctx, false);
        }

        ctx.restore();
    }

    drawFruit(ctx, sliced) {
        const r = this.radius;

        ctx.save();
        ctx.shadowColor = this.isBomb ? 'rgba(0,0,0,0.55)' : this.type.color;
        ctx.shadowBlur = this.isBomb ? 6 : 14;
        ctx.fillStyle = this.isBomb ? '#111827' : this.type.color;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (this.isBomb) {
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(r * 0.35, -r * 0.75);
            ctx.quadraticCurveTo(r * 0.85, -r * 1.15, r * 1.05, -r * 0.72);
            ctx.stroke();
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(r * 1.08, -r * 0.72, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.font = `${Math.round(r * 1.15)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type.emoji, 0, 2);

        if (sliced) {
            ctx.strokeStyle = 'rgba(255,255,255,0.82)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-r, 0);
            ctx.lineTo(r, 0);
            ctx.stroke();
        }
    }
}

const FruitSpawner = {
    fruits: [],
    missedFruits: [],
    spawnTimer: 0,
    lastUpdate: 0,

    clear() {
        this.fruits = [];
        this.missedFruits = [];
        this.spawnTimer = 0;
        this.lastUpdate = performance.now();
    },

    update(width, height, score = 0) {
        const now = performance.now();
        const dt = Math.min((now - this.lastUpdate) / 1000 || 0.016, 0.05);
        this.lastUpdate = now;

        const difficulty = 1 + Math.floor(score / 180);
        const spawnInterval = Math.max(0.42, 1.05 - difficulty * 0.055);
        this.spawnTimer += dt;

        if (this.spawnTimer >= spawnInterval) {
            this.spawnTimer = 0;
            const bombChance = Math.min(0.10 + difficulty * 0.018, 0.26);
            this.fruits.push(new Fruit(width, height, difficulty, Math.random() < bombChance));
        }

        for (let i = this.fruits.length - 1; i >= 0; i--) {
            const fruit = this.fruits[i];
            fruit.update(dt);

            if (!fruit.isSliced && fruit.vy > 0 && fruit.y - fruit.radius > height) {
                this.missedFruits.push(fruit);
                this.fruits.splice(i, 1);
                continue;
            }

            if (fruit.isSliced && (fruit.alpha <= 0 || fruit.y - fruit.radius > height + 140)) {
                this.fruits.splice(i, 1);
            }
        }
    },

    getMissedFruits() {
        const missed = this.missedFruits;
        this.missedFruits = [];
        return missed;
    },

    getActiveFruits() {
        return this.fruits.filter(fruit => !fruit.isSliced);
    },

    render(ctx) {
        for (const fruit of this.fruits) {
            fruit.render(ctx);
        }
    }
};
