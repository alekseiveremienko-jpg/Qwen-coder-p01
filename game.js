/**
 * Neon Defender 2026 - Modern Web Game
 * Modular game architecture with procedural graphics
 */

// ==================== CONFIG MODULE ====================
const Config = {
    GAME_WIDTH: 800,
    GAME_HEIGHT: 600,
    FPS: 60,
    PLAYER_SPEED: 5,
    BULLET_SPEED: 10,
    ENEMY_SPEED: 2,
    SPAWN_RATE: 2000,
    COLORS: {
        player: '#00ffff',
        enemy: '#ff4444',
        bullet: '#ffff00',
        crystal: '#00ff88',
        background: '#0a0a1a'
    }
};

// ==================== STORAGE MODULE ====================
const StorageModule = {
    type: 'localStorage',
    status: 'connected',
    
    init() {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            this.type = 'localStorage';
            this.status = 'connected';
        } catch (e) {
            this.type = 'session';
            this.status = 'temporary';
        }
        return this;
    },
    
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    },
    
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            return false;
        }
    }
};

// ==================== AUDIO MODULE ====================
const AudioModule = {
    enabled: true,
    audioContext: null,
    
    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.enabled = false;
        }
        return this;
    },
    
    playTone(frequency, duration, type = 'sine') {
        if (!this.enabled || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    },
    
    playShoot() {
        this.playTone(800, 0.1, 'square');
    },
    
    playExplosion() {
        this.playTone(200, 0.3, 'sawtooth');
    },
    
    playCollect() {
        this.playTone(1200, 0.15, 'sine');
    },
    
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
};

// ==================== PARTICLE SYSTEM MODULE ====================
class ParticleSystem {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.particles = [];
        this.maxParticles = 1000;
    }
    
    emit(x, y, count, color, speed = 5, life = 60) {
        for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const velocity = Math.random() * speed;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                life,
                maxLife: life,
                color,
                size: Math.random() * 4 + 2
            });
        }
    }
    
    update() {
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.vx *= 0.98;
            p.vy *= 0.98;
            return p.life > 0;
        });
    }
    
    draw() {
        this.particles.forEach(p => {
            const alpha = p.life / p.maxLife;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
    }
    
    clear() {
        this.particles = [];
    }
}

// ==================== EFFECTS MODULE ====================
const EffectsModule = {
    screenShake: 0,
    flashIntensity: 0,
    
    addScreenShake(intensity) {
        this.screenShake = intensity;
    },
    
    addFlash(intensity) {
        this.flashIntensity = intensity;
    },
    
    update() {
        if (this.screenShake > 0) this.screenShake *= 0.9;
        if (this.flashIntensity > 0) this.flashIntensity *= 0.9;
        
        if (this.screenShake < 0.5) this.screenShake = 0;
        if (this.flashIntensity < 0.05) this.flashIntensity = 0;
    },
    
    apply(ctx, canvas) {
        ctx.save();
        if (this.screenShake > 0) {
            const dx = (Math.random() - 0.5) * this.screenShake;
            const dy = (Math.random() - 0.5) * this.screenShake;
            ctx.translate(dx, dy);
        }
        return ctx;
    },
    
    restore(ctx) {
        ctx.restore();
    },
    
    drawOverlay(ctx, canvas) {
        if (this.flashIntensity > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.flashIntensity})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
};

// ==================== ENTITY CLASSES ====================
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.speed = Config.PLAYER_SPEED;
        this.health = 100;
        this.angle = -Math.PI / 2;
    }
    
    update(input, canvasWidth, canvasHeight) {
        if (input.keys['ArrowLeft'] || input.keys['KeyA']) this.x -= this.speed;
        if (input.keys['ArrowRight'] || input.keys['KeyD']) this.x += this.speed;
        if (input.keys['ArrowUp'] || input.keys['KeyW']) this.y -= this.speed;
        if (input.keys['ArrowDown'] || input.keys['KeyS']) this.y += this.speed;
        
        // Mouse aiming
        if (input.mouseX !== null && input.mouseY !== null) {
            this.angle = Math.atan2(input.mouseY - this.y, input.mouseX - this.x);
        }
        
        // Boundaries
        this.x = Math.max(this.width/2, Math.min(canvasWidth - this.width/2, this.x));
        this.y = Math.max(this.height/2, Math.min(canvasHeight - this.height/2, this.y));
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2);
        
        // Procedural ship graphics
        const gradient = ctx.createLinearGradient(-20, -20, 20, 20);
        gradient.addColorStop(0, Config.COLORS.player);
        gradient.addColorStop(1, '#0088aa');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(-15, 15);
        ctx.lineTo(0, 10);
        ctx.lineTo(15, 15);
        ctx.closePath();
        ctx.fill();
        
        // Engine glow
        ctx.shadowColor = Config.COLORS.player;
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(0, 15, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    shoot() {
        const bx = this.x + Math.cos(this.angle) * 25;
        const by = this.y + Math.sin(this.angle) * 25;
        return new Bullet(bx, by, this.angle);
    }
}

class Enemy {
    constructor(x, y, type = 'basic') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = 30;
        this.height = 30;
        this.speed = Config.ENEMY_SPEED + Math.random() * 1;
        this.health = type === 'strong' ? 3 : 1;
        this.angle = 0;
        this.wobble = Math.random() * Math.PI * 2;
    }
    
    update(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        this.angle = Math.atan2(dy, dx);
        this.wobble += 0.1;
        
        if (dist > 0) {
            this.x += (dx / dist) * this.speed + Math.sin(this.wobble) * 0.5;
            this.y += (dy / dist) * this.speed;
        }
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
        gradient.addColorStop(0, Config.COLORS.enemy);
        gradient.addColorStop(1, '#880000');
        
        ctx.fillStyle = gradient;
        ctx.shadowColor = Config.COLORS.enemy;
        ctx.shadowBlur = 10;
        
        // Procedural enemy shape
        ctx.beginPath();
        const spikes = this.type === 'strong' ? 6 : 4;
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? 15 : 8;
            const angle = (Math.PI * i) / spikes;
            ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        ctx.closePath();
        ctx.fill();
        
        // Eyes
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(5, -5, 3, 0, Math.PI * 2);
        ctx.arc(5, 5, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * Config.BULLET_SPEED;
        this.vy = Math.sin(angle) * Config.BULLET_SPEED;
        this.radius = 5;
        this.life = 100;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.shadowColor = Config.COLORS.bullet;
        ctx.shadowBlur = 10;
        
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, Config.COLORS.bullet);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

class Crystal {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 15;
        this.life = 300;
        this.angle = 0;
    }
    
    update() {
        this.life--;
        this.angle += 0.05;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        ctx.shadowColor = Config.COLORS.crystal;
        ctx.shadowBlur = 15;
        
        const gradient = ctx.createLinearGradient(-10, -10, 10, 10);
        gradient.addColorStop(0, Config.COLORS.crystal);
        gradient.addColorStop(1, '#00aa55');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6;
            const radius = i % 2 === 0 ? 10 : 6;
            ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
}

// ==================== INPUT MODULE ====================
const InputModule = {
    keys: {},
    mouseX: null,
    mouseY: null,
    mouseDown: false,
    touchX: null,
    touchY: null,
    
    init() {
        window.addEventListener('keydown', e => this.keys[e.code] = true);
        window.addEventListener('keyup', e => this.keys[e.code] = false);
        window.addEventListener('mousemove', e => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
        window.addEventListener('mousedown', () => this.mouseDown = true);
        window.addEventListener('mouseup', () => this.mouseDown = false);
        
        // Touch controls
        window.addEventListener('touchstart', e => {
            e.preventDefault();
            const touch = e.touches[0];
            this.touchX = touch.clientX;
            this.touchY = touch.clientY;
            this.mouseDown = true;
        }, { passive: false });
        
        window.addEventListener('touchmove', e => {
            e.preventDefault();
            const touch = e.touches[0];
            this.touchX = touch.clientX;
            this.touchY = touch.clientY;
        }, { passive: false });
        
        window.addEventListener('touchend', e => {
            e.preventDefault();
            this.mouseDown = false;
        });
        
        return this;
    },
    
    reset() {
        this.keys = {};
        this.mouseX = null;
        this.mouseY = null;
        this.mouseDown = false;
        this.touchX = null;
        this.touchY = null;
    }
};

// ==================== GAME MODULE ====================
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isRunning = false;
        this.lastTime = 0;
        this.spawnTimer = 0;
        
        // Game state
        this.score = 0;
        this.health = 100;
        this.crystals = 0;
        this.wave = 1;
        this.gameTime = 0;
        
        // Entities
        this.player = null;
        this.bullets = [];
        this.enemies = [];
        this.crystals_list = [];
        
        // Modules
        this.particles = null;
        this.input = InputModule.init();
        this.storage = StorageModule.init();
        this.audio = AudioModule.init();
        
        // Load saved data
        this.loadProgress();
        
        // Bind UI
        this.bindUI();
        
        // Resize handler
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Detect mobile
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (this.isMobile) {
            document.getElementById('mobileControls').style.display = 'flex';
        }
    }
    
    resize() {
        const container = document.getElementById('gameContainer');
        const dashboardHeight = document.getElementById('dashboardPanel').offsetHeight;
        const infoHeight = document.getElementById('gameInfoPanel').offsetHeight;
        
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight - dashboardHeight - infoHeight;
        
        Config.GAME_WIDTH = this.canvas.width;
        Config.GAME_HEIGHT = this.canvas.height;
    }
    
    bindUI() {
        // Dashboard buttons
        document.getElementById('profileBtn').addEventListener('click', () => this.showProfile());
        document.getElementById('shareBtn').addEventListener('click', () => this.shareGame());
        document.getElementById('soundBtn').addEventListener('click', () => this.toggleSound());
        document.getElementById('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
        
        // Mobile controls
        document.getElementById('fireBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.shoot();
        });
        document.getElementById('abilityBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.useAbility();
        });
        
        // Profile modal
        document.getElementById('closeProfileBtn').addEventListener('click', () => {
            document.getElementById('profileModal').style.display = 'none';
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') this.shoot();
            if (e.code === 'KeyE') this.useAbility();
            if (e.code === 'Escape') this.toggleFullscreen();
        });
    }
    
    start() {
        this.player = new Player(Config.GAME_WIDTH / 2, Config.GAME_HEIGHT / 2);
        this.bullets = [];
        this.enemies = [];
        this.crystals_list = [];
        this.particles = new ParticleSystem(this.canvas, this.ctx);
        this.score = 0;
        this.health = 100;
        this.crystals = 0;
        this.wave = 1;
        this.gameTime = 0;
        this.isRunning = true;
        this.input.reset();
        
        this.updateUI();
        requestAnimationFrame(t => this.loop(t));
    }
    
    loop(timestamp) {
        if (!this.isRunning) return;
        
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        this.update();
        this.render();
        
        requestAnimationFrame(t => this.loop(t));
    }
    
    update() {
        this.gameTime += 1/60;
        
        // Update entities
        this.player.update(this.input, Config.GAME_WIDTH, Config.GAME_HEIGHT);
        
        this.bullets.forEach(b => b.update());
        this.bullets = this.bullets.filter(b => b.life > 0 && 
            b.x > 0 && b.x < Config.GAME_WIDTH && 
            b.y > 0 && b.y < Config.GAME_HEIGHT);
        
        this.enemies.forEach(e => e.update(this.player));
        
        this.crystals_list.forEach(c => c.update());
        this.crystals_list = this.crystals_list.filter(c => c.life > 0);
        
        this.particles.update();
        EffectsModule.update();
        
        // Spawn enemies
        this.spawnTimer += 16;
        const spawnRate = Math.max(500, Config.SPAWN_RATE - this.wave * 100);
        if (this.spawnTimer > spawnRate) {
            this.spawnEnemy();
            this.spawnTimer = 0;
        }
        
        // Wave progression
        if (this.score > this.wave * 500) {
            this.wave++;
            EffectsModule.addFlash(0.3);
        }
        
        // Collisions
        this.checkCollisions();
        
        // Update UI
        this.updateUI();
        
        // Auto-save
        if (Math.floor(this.gameTime) % 10 === 0) {
            this.saveProgress();
        }
        
        // Game over check
        if (this.health <= 0) {
            this.gameOver();
        }
    }
    
    render() {
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // Clear with trail effect
        ctx.fillStyle = 'rgba(10, 10, 26, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Apply effects
        EffectsModule.apply(ctx, canvas);
        
        // Draw grid background
        this.drawBackground();
        
        // Draw entities
        this.crystals_list.forEach(c => c.draw(ctx));
        this.particles.draw();
        this.bullets.forEach(b => b.draw(ctx));
        this.enemies.forEach(e => e.draw(ctx));
        this.player.draw(ctx);
        
        // Restore and draw overlays
        EffectsModule.restore(ctx);
        EffectsModule.drawOverlay(ctx, canvas);
    }
    
    drawBackground() {
        const ctx = this.ctx;
        const time = Date.now() / 1000;
        
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.1)';
        ctx.lineWidth = 1;
        
        const gridSize = 50;
        const offsetX = (time * 20) % gridSize;
        const offsetY = (time * 20) % gridSize;
        
        ctx.beginPath();
        for (let x = offsetX; x < Config.GAME_WIDTH; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, Config.GAME_HEIGHT);
        }
        for (let y = offsetY; y < Config.GAME_HEIGHT; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(Config.GAME_WIDTH, y);
        }
        ctx.stroke();
        
        // Stars
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        for (let i = 0; i < 50; i++) {
            const x = (i * 137.5) % Config.GAME_WIDTH;
            const y = (i * 93.7) % Config.GAME_HEIGHT;
            const twinkle = 0.5 + 0.5 * Math.sin(time * 3 + i);
            ctx.globalAlpha = twinkle;
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    
    spawnEnemy() {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        switch(side) {
            case 0: x = Math.random() * Config.GAME_WIDTH; y = -30; break;
            case 1: x = Config.GAME_WIDTH + 30; y = Math.random() * Config.GAME_HEIGHT; break;
            case 2: x = Math.random() * Config.GAME_WIDTH; y = Config.GAME_HEIGHT + 30; break;
            case 3: x = -30; y = Math.random() * Config.GAME_HEIGHT; break;
        }
        
        const type = Math.random() < 0.2 && this.wave > 2 ? 'strong' : 'basic';
        this.enemies.push(new Enemy(x, y, type));
    }
    
    shoot() {
        if (!this.player) return;
        this.bullets.push(this.player.shoot());
        this.audio.playShoot();
    }
    
    useAbility() {
        if (this.crystals >= 5) {
            this.crystals -= 5;
            EffectsModule.addScreenShake(20);
            EffectsModule.addFlash(0.5);
            
            // Destroy all enemies
            this.enemies.forEach(e => {
                this.particles.emit(e.x, e.y, 15, Config.COLORS.enemy);
                this.score += 50;
            });
            this.enemies = [];
            
            this.audio.playExplosion();
        }
    }
    
    checkCollisions() {
        // Bullets vs Enemies
        this.bullets.forEach(bullet => {
            this.enemies.forEach((enemy, ei) => {
                const dx = bullet.x - enemy.x;
                const dy = bullet.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < bullet.radius + enemy.width/2) {
                    bullet.life = 0;
                    enemy.health--;
                    
                    if (enemy.health <= 0) {
                        this.enemies.splice(ei, 1);
                        this.particles.emit(enemy.x, enemy.y, 10, Config.COLORS.enemy);
                        this.audio.playExplosion();
                        
                        this.score += enemy.type === 'strong' ? 150 : 50;
                        
                        // Drop crystal chance
                        if (Math.random() < 0.3) {
                            this.crystals_list.push(new Crystal(enemy.x, enemy.y));
                        }
                    }
                    
                    EffectsModule.addScreenShake(3);
                }
            });
        });
        
        // Enemies vs Player
        this.enemies.forEach((enemy, ei) => {
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < enemy.width/2 + this.player.width/2) {
                this.enemies.splice(ei, 1);
                this.health -= 20;
                this.particles.emit(this.player.x, this.player.y, 20, '#ff0000');
                EffectsModule.addScreenShake(15);
                EffectsModule.addFlash(0.4);
                this.audio.playExplosion();
            }
        });
        
        // Player vs Crystals
        this.crystals_list.forEach((crystal, ci) => {
            const dx = crystal.x - this.player.x;
            const dy = crystal.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < crystal.size + this.player.width/2) {
                this.crystals_list.splice(ci, 1);
                this.crystals++;
                this.audio.playCollect();
            }
        });
    }
    
    updateUI() {
        document.getElementById('scoreValue').textContent = this.score;
        document.getElementById('healthValue').textContent = Math.max(0, this.health);
        document.getElementById('crystalsValue').textContent = this.crystals;
        document.getElementById('waveValue').textContent = this.wave;
        
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        document.getElementById('centerInfo').textContent = 
            `⏱️ Время: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    saveProgress() {
        const progress = {
            score: this.score,
            crystals: this.crystals,
            wave: this.wave,
            gameTime: this.gameTime,
            lastSave: Date.now()
        };
        this.storage.set('neonDefender_progress', progress);
    }
    
    loadProgress() {
        const progress = this.storage.get('neonDefender_progress');
        if (progress) {
            // Could show continue option
        }
    }
    
    showProfile() {
        const progress = this.storage.get('neonDefender_progress', {});
        const totalCrystals = this.storage.get('neonDefender_totalCrystals', 0);
        
        document.getElementById('profileCurrency').textContent = `${totalCrystals} 💰`;
        document.getElementById('profileScore').textContent = progress.score || 0;
        document.getElementById('profileWaves').textContent = progress.wave || 0;
        
        const minutes = Math.floor((progress.gameTime || 0) / 60);
        const seconds = Math.floor((progress.gameTime || 0) % 60);
        document.getElementById('profileTime').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('storageStatus').textContent = 
            `${this.storage.type === 'localStorage' ? 'Локальное' : 'Временное'}`;
        
        // Mock ranking
        document.getElementById('playerRank').textContent = '#' + (Math.floor(Math.random() * 1000) + 1);
        
        document.getElementById('profileModal').style.display = 'flex';
    }
    
    shareGame() {
        const url = `https://krepost.ru/game/neon-defender?score=${this.score}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Neon Defender 2026',
                text: `Мой счет: ${this.score}! Сможешь побить?`,
                url: url
            });
        } else {
            // Copy to clipboard
            navigator.clipboard.writeText(url).then(() => {
                alert('Ссылка скопирована в буфер обмена!');
            });
        }
    }
    
    toggleSound() {
        const enabled = this.audio.toggle();
        document.querySelector('#soundBtn .dash-icon').textContent = enabled ? '🔊' : '🔇';
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
    
    restart() {
        this.isRunning = false;
        setTimeout(() => this.start(), 100);
    }
    
    gameOver() {
        this.isRunning = false;
        this.saveProgress();
        
        // Update total crystals
        const totalCrystals = this.storage.get('neonDefender_totalCrystals', 0);
        this.storage.set('neonDefender_totalCrystals', totalCrystals + this.crystals);
        
        alert(`Игра окончена!\n\nСчет: ${this.score}\nВолн пройдено: ${this.wave}\nКристаллов: ${this.crystals}`);
        
        this.start();
    }
}

// ==================== INITIALIZATION ====================
window.addEventListener('load', () => {
    const game = new Game();
    game.start();
});
