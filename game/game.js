/**
 * Космический Разведчик - Игра для WeChat Platform
 * Версия 1.0 - 2026
 * Модульная архитектура с процедурной генерацией
 */

// ============================================
// МОДУЛЬ: Конфигурация и Константы
// ============================================
const CONFIG = {
    // Размеры мира
    WORLD_SIZE: 4000,
    WORLD_BORDER_MARGIN: 50,
    
    // Игрок
    PLAYER_SIZE: 30,
    PLAYER_MAX_SPEED: 300,
    PLAYER_ACCELERATION: 150,
    PLAYER_ROTATION_SPEED: 2.5,
    PLAYER_TURN_RADIUS: 60, // Длина разворота ~2 длины корабля
    
    // Ракеты охотники
    HUNTER_ROCKET_SPEED: 225, // На 25% медленнее игрока
    HUNTER_ROCKET_COUNT: 3,
    HUNTER_SPAWN_DISTANCE: 1.3, // За краем видимости
    HUNTER_LIFETIME: 15000,
    
    // Пролётки
    FLYER_ROCKET_SPEED: 400,
    FLYER_GROUP_SIZE: 3,
    FLYER_SPAWN_CHANCE: 0.3,
    
    // Астероиды
    ASTEROID_COUNT: 25,
    ASTEROID_MIN_SIZE: 25,
    ASTEROID_MAX_SIZE: 80,
    
    // Камера
    CAMERA_BASE_ZOOM: 1.0,
    CAMERA_MIN_ZOOM: 0.55,
    CAMERA_DYNAMIC_OFFSET: 0.07,
    
    // Производительность
    MAX_SPRITES: 10000,
    TRAIL_SEGMENT_COUNT: 50,
    TRAIL_FADE_TIME: 2000,
    
    // Геймплей
    INITIAL_LIVES: 3,
    SCORE_PER_SURVIVAL: 10,
    BONUS_PER_DESTROYED: 50
};

// ============================================
// МОДУЛЬ: Утилиты
// ============================================
const Utils = {
    random(min, max) {
        return Math.random() * (max - min) + min;
    },
    
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },
    
    lerp(start, end, t) {
        return start + (end - start) * t;
    },
    
    distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },
    
    angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    },
    
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    },
    
    formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
};

// ============================================
// МОДУЛЬ: Хранение Данных
// ============================================
const StorageModule = {
    type: 'local',
    lastSave: null,
    
    init() {
        try {
            localStorage.setItem('test_storage', 'test');
            localStorage.removeItem('test_storage');
            this.type = 'local';
        } catch (e) {
            this.type = 'session';
        }
        this.load();
    },
    
    save(data) {
        try {
            const storage = this.type === 'local' ? localStorage : sessionStorage;
            storage.setItem('space_scout_data', JSON.stringify(data));
            this.lastSave = new Date();
        } catch (e) {
            console.warn('Storage save failed:', e);
        }
    },
    
    load() {
        try {
            const storage = this.type === 'local' ? localStorage : sessionStorage;
            const data = storage.getItem('space_scout_data');
            return data ? JSON.parse(data) : this.getDefaultData();
        } catch (e) {
            return this.getDefaultData();
        }
    },
    
    getDefaultData() {
        return {
            currency: 0,
            bestScore: 0,
            totalGames: 0,
            destroyedRockets: 0
        };
    },
    
    getStatus() {
        return {
            type: this.type === 'local' ? 'Локальное' : 'Временное',
            lastSave: this.lastSave ? this.lastSave.toLocaleTimeString() : '-'
        };
    }
};

// ============================================
// МОДУЛЬ: Процедурная Генерация
// ============================================
const ProceduralGen = {
    // Генерация текстуры астероида
    generateAsteroidTexture(size, ctx) {
        const canvas = document.createElement('canvas');
        canvas.width = size * 2;
        canvas.height = size * 2;
        const context = canvas.getContext('2d');
        
        // Основной цвет
        const baseHue = Utils.randomInt(20, 40);
        const baseSat = Utils.randomInt(10, 30);
        const baseLight = Utils.randomInt(30, 50);
        
        // Градиент
        const gradient = context.createRadialGradient(size, size, 0, size, size, size);
        gradient.addColorStop(0, `hsl(${baseHue}, ${baseSat}%, ${baseLight + 20}%)`);
        gradient.addColorStop(1, `hsl(${baseHue}, ${baseSat}%, ${baseLight}%)`);
        
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(size, size, size - 2, 0, Math.PI * 2);
        context.fill();
        
        // Кратеры
        const craterCount = Utils.randomInt(3, 8);
        for (let i = 0; i < craterCount; i++) {
            const craterSize = Utils.random(3, size * 0.3);
            const craterX = Utils.random(craterSize, size * 2 - craterSize);
            const craterY = Utils.random(craterSize, size * 2 - craterSize);
            
            context.fillStyle = `hsla(${baseHue}, ${baseSat}%, ${baseLight - 15}%, 0.6)`;
            context.beginPath();
            context.arc(craterX, craterY, craterSize, 0, Math.PI * 2);
            context.fill();
            
            // Тень кратера
            context.strokeStyle = `hsla(${baseHue}, ${baseSat}%, ${baseLight - 25}%, 0.4)`;
            context.lineWidth = 1;
            context.stroke();
        }
        
        return canvas;
    },
    
    // Генерация корабля игрока
    generatePlayerShip(ctx, size) {
        const canvas = document.createElement('canvas');
        canvas.width = size * 3;
        canvas.height = size * 3;
        const context = canvas.getContext('2d');
        const cx = size * 1.5;
        const cy = size * 1.5;
        
        // Корпус
        const hullGradient = context.createLinearGradient(cx - size, cy, cx + size, cy);
        hullGradient.addColorStop(0, '#4a6fa5');
        hullGradient.addColorStop(0.5, '#6b9bd1');
        hullGradient.addColorStop(1, '#4a6fa5');
        
        context.fillStyle = hullGradient;
        context.beginPath();
        // Плавный футуристичный корпус без острых углов
        context.moveTo(cx + size * 0.8, cy);
        context.bezierCurveTo(cx + size * 0.5, cy - size * 0.3, cx - size * 0.3, cy - size * 0.5, cx - size * 0.8, cy);
        context.bezierCurveTo(cx - size * 0.3, cy + size * 0.5, cx + size * 0.5, cy + size * 0.3, cx + size * 0.8, cy);
        context.fill();
        
        // Кабина (закругленная)
        const cockpitGradient = context.createRadialGradient(cx + size * 0.3, cy, size * 0.1, cx + size * 0.3, cy, size * 0.4);
        cockpitGradient.addColorStop(0, '#a8d5ff');
        cockpitGradient.addColorStop(1, '#4a6fa5');
        
        context.fillStyle = cockpitGradient;
        context.beginPath();
        context.ellipse(cx + size * 0.3, cy, size * 0.35, size * 0.25, 0, 0, Math.PI * 2);
        context.fill();
        
        // Двигатели
        context.fillStyle = '#ff6b4a';
        context.beginPath();
        context.arc(cx - size * 0.7, cy - size * 0.3, size * 0.15, 0, Math.PI * 2);
        context.arc(cx - size * 0.7, cy + size * 0.3, size * 0.15, 0, Math.PI * 2);
        context.fill();
        
        return canvas;
    },
    
    // Генерация ракеты
    generateRocket(ctx, size, type = 'hunter') {
        const canvas = document.createElement('canvas');
        canvas.width = size * 3;
        canvas.height = size * 2;
        const context = canvas.getContext('2d');
        const cx = size * 1.5;
        const cy = size;
        
        if (type === 'hunter') {
            // Охотник - торпеда с красным свечением
            const rocketGradient = context.createLinearGradient(cx - size, cy, cx + size, cy);
            rocketGradient.addColorStop(0, '#ff4a4a');
            rocketGradient.addColorStop(0.5, '#ff8a8a');
            rocketGradient.addColorStop(1, '#ff4a4a');
            
            context.fillStyle = rocketGradient;
            context.beginPath();
            context.ellipse(cx, cy, size, size * 0.4, 0, 0, Math.PI * 2);
            context.fill();
            
            // Сопло
            context.fillStyle = '#ffaa00';
            context.beginPath();
            context.moveTo(cx - size * 0.8, cy - size * 0.2);
            context.lineTo(cx - size * 1.3, cy);
            context.lineTo(cx - size * 0.8, cy + size * 0.2);
            context.fill();
        } else {
            // Пролётка - синяя прямая ракета
            const flyerGradient = context.createLinearGradient(cx - size, cy, cx + size, cy);
            flyerGradient.addColorStop(0, '#4a4aff');
            flyerGradient.addColorStop(0.5, '#8a8aff');
            flyerGradient.addColorStop(1, '#4a4aff');
            
            context.fillStyle = flyerGradient;
            context.beginPath();
            context.ellipse(cx, cy, size * 1.2, size * 0.3, 0, 0, Math.PI * 2);
            context.fill();
        }
        
        return canvas;
    }
};

// ============================================
// МОДУЛЬ: Звуковой Движок
// ============================================
const AudioEngine = {
    enabled: true,
    ctx: null,
    
    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.enabled = false;
        }
    },
    
    playTone(freq, type, duration) {
        if (!this.enabled || !this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    
    playExplosion() {
        this.playTone(150, 'sawtooth', 0.3);
    },
    
    playWarning() {
        this.playTone(800, 'square', 0.1);
    },
    
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
};

// ============================================
// МОДУЛЬ: Ввод (Keyboard & Touch)
// ============================================
const InputModule = {
    keys: {},
    touchActive: false,
    joystick: { x: 0, y: 0 },
    boost: false,
    brake: false,
    
    init() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Mobile controls
        const btnBoost = document.getElementById('btnBoost');
        const btnBrake = document.getElementById('btnBrake');
        
        if (btnBoost) {
            btnBoost.addEventListener('touchstart', (e) => { e.preventDefault(); this.boost = true; });
            btnBoost.addEventListener('touchend', (e) => { e.preventDefault(); this.boost = false; });
        }
        
        if (btnBrake) {
            btnBrake.addEventListener('touchstart', (e) => { e.preventDefault(); this.brake = true; });
            btnBrake.addEventListener('touchend', (e) => { e.preventDefault(); this.brake = false; });
        }
    },
    
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    getMovement() {
        let dx = 0, dy = 0;
        
        if (this.keys['KeyW'] || this.keys['ArrowUp']) dy = -1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) dy = 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx = -1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) dx = 1;
        
        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
        }
        
        return { dx, dy, boost: this.keys['Space'] || this.boost, brake: this.keys['ShiftLeft'] || this.brake };
    }
};

// ============================================
// МОДУЛЬ: Камера с адаптивным зумом
// ============================================
const CameraModule = {
    zoom: 1.0,
    targetZoom: 1.0,
    dynamicOffset: 0,
    
    init() {
        this.calculateZoom();
        window.addEventListener('resize', () => this.calculateZoom());
    },
    
    calculateZoom() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const screenArea = screenWidth * screenHeight;
        
        // ПК эталон: 1920x1080
        const referenceArea = 1920 * 1080;
        
        // Zoom по площади экрана
        this.targetZoom = Math.sqrt(screenArea / referenceArea);
        this.targetZoom = Utils.clamp(this.targetZoom, CONFIG.CAMERA_MIN_ZOOM, CONFIG.CAMERA_BASE_ZOOM);
        
        this.zoom = this.targetZoom;
    },
    
    update(speedRatio) {
        // Динамический отъезд на скорости
        this.dynamicOffset = speedRatio * CONFIG.CAMERA_DYNAMIC_OFFSET;
        const effectiveZoom = this.zoom - this.dynamicOffset;
        return effectiveZoom;
    },
    
    getVisibleRadius() {
        const minDim = Math.min(window.innerWidth, window.innerHeight);
        return (minDim / 2) / this.zoom;
    }
};

// ============================================
// КЛАСС: Игрок
// ============================================
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        this.size = CONFIG.PLAYER_SIZE;
        this.lives = CONFIG.INITIAL_LIVES;
        this.invincible = false;
        this.invincibleTime = 0;
        this.sprite = ProceduralGen.generatePlayerShip(null, this.size);
    }
    
    update(dt, input) {
        // Поворот к направлению движения
        if (input.dx !== 0 || input.dy !== 0) {
            const targetAngle = Math.atan2(input.dy, input.dx);
            const angleDiff = Utils.normalizeAngle(targetAngle - this.angle);
            
            // Плавный разворот с ограничением
            const turnAmount = CONFIG.PLAYER_ROTATION_SPEED * dt * (input.brake ? 2 : 1);
            if (Math.abs(angleDiff) < turnAmount) {
                this.angle = targetAngle;
            } else {
                this.angle += Math.sign(angleDiff) * turnAmount;
            }
        }
        
        // Ускорение
        const accel = input.boost ? CONFIG.PLAYER_ACCELERATION * 1.5 : 
                      input.brake ? CONFIG.PLAYER_ACCELERATION * 0.5 : CONFIG.PLAYER_ACCELERATION;
        
        if (input.dx !== 0 || input.dy !== 0) {
            this.vx += input.dx * accel * dt;
            this.vy += input.dy * accel * dt;
            
            // Ограничение скорости
            const speed = Math.sqrt(this.vx ** 2 + this.vy ** 2);
            const maxSpeed = input.boost ? CONFIG.PLAYER_MAX_SPEED * 1.3 : CONFIG.PLAYER_MAX_SPEED;
            
            if (speed > maxSpeed) {
                this.vx = (this.vx / speed) * maxSpeed;
                this.vy = (this.vy / speed) * maxSpeed;
            }
        }
        
        // Трение
        const friction = input.brake ? 0.95 : 0.98;
        this.vx *= friction;
        this.vy *= friction;
        
        // Обновление позиции
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Границы мира
        const margin = CONFIG.WORLD_BORDER_MARGIN;
        this.x = Utils.clamp(this.x, margin, CONFIG.WORLD_SIZE - margin);
        this.y = Utils.clamp(this.y, margin, CONFIG.WORLD_SIZE - margin);
        
        // Неуязвимость
        if (this.invincible) {
            this.invincibleTime -= dt * 1000;
            if (this.invincibleTime <= 0) {
                this.invincible = false;
            }
        }
    }
    
    hit() {
        if (this.invincible) return false;
        this.lives--;
        this.invincible = true;
        this.invincibleTime = 2000;
        AudioEngine.playExplosion();
        return true;
    }
    
    draw(ctx, cameraZoom) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.scale(cameraZoom, cameraZoom);
        
        // Мерцание при неуязвимости
        if (this.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
        
        ctx.drawImage(this.sprite, -this.size * 1.5, -this.size * 1.5);
        ctx.restore();
    }
    
    getSpeed() {
        return Math.sqrt(this.vx ** 2 + this.vy ** 2);
    }
}

// ============================================
// КЛАСС: Ракета
// ============================================
class Rocket {
    constructor(x, y, type = 'hunter', target = null) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.target = target;
        this.size = type === 'hunter' ? 12 : 10;
        this.speed = type === 'hunter' ? CONFIG.HUNTER_ROCKET_SPEED : CONFIG.FLYER_ROCKET_SPEED;
        this.vx = type === 'flyer' ? 1 : 0;
        this.vy = 0;
        this.angle = 0;
        this.lifetime = CONFIG.HUNTER_LIFETIME;
        this.smokeTime = CONFIG.HUNTER_LIFETIME * 0.7;
        this.trail = [];
        this.active = true;
        this.sprite = ProceduralGen.generateRocket(null, this.size, type);
    }
    
    update(dt, player) {
        this.lifetime -= dt * 1000;
        
        if (this.lifetime <= 0) {
            this.active = false;
            return;
        }
        
        if (this.type === 'hunter' && this.target) {
            // Плавное преследование с физикой
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                // Целевой угол
                const targetAngle = Math.atan2(dy, dx);
                
                // Плавный поворот (инерция)
                const turnRate = 2.0 * dt;
                const angleDiff = Utils.normalizeAngle(targetAngle - this.angle);
                this.angle += Utils.clamp(angleDiff, -turnRate, turnRate);
            }
            
            // Движение по направлению
            this.vx = Math.cos(this.angle) * this.speed;
            this.vy = Math.sin(this.angle) * this.speed;
        } else if (this.type === 'flyer') {
            // Прямое движение
            this.vx = Math.cos(this.angle) * this.speed;
            this.vy = Math.sin(this.angle) * this.speed;
        }
        
        // Обновление позиции
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Сохранение трейла
        this.trail.push({ x: this.x, y: this.y, time: Date.now() });
        if (this.trail.length > CONFIG.TRAIL_SEGMENT_COUNT) {
            this.trail.shift();
        }
    }
    
    draw(ctx, cameraZoom) {
        // Рисуем трейл
        if (this.trail.length > 1) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            for (let i = 1; i < this.trail.length; i++) {
                const point = this.trail[i];
                const prevPoint = this.trail[i - 1];
                const age = Date.now() - point.time;
                const alpha = 1 - (age / CONFIG.TRAIL_FADE_TIME);
                
                if (alpha > 0) {
                    const thickness = (i / this.trail.length) * 8 * cameraZoom;
                    ctx.strokeStyle = this.type === 'hunter' 
                        ? `rgba(255, 100, 100, ${alpha * 0.6})`
                        : `rgba(100, 100, 255, ${alpha * 0.6})`;
                    ctx.lineWidth = thickness;
                    
                    ctx.beginPath();
                    ctx.moveTo(prevPoint.x, prevPoint.y);
                    ctx.lineTo(point.x, point.y);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }
        
        // Рисуем ракету
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.scale(cameraZoom, cameraZoom);
        
        // Дым при окончании времени жизни
        if (this.lifetime < this.smokeTime) {
            ctx.globalAlpha = 0.7;
            const smokeSize = (1 - this.lifetime / this.smokeTime) * 20;
            ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
            ctx.beginPath();
            ctx.arc(-this.size, 0, smokeSize * cameraZoom, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.drawImage(this.sprite, -this.size * 1.5, -this.size);
        ctx.restore();
    }
}

// ============================================
// КЛАСС: Астероид
// ============================================
class Asteroid {
    constructor(x, y, size = null) {
        this.x = x;
        this.y = y;
        this.size = size || Utils.random(CONFIG.ASTEROID_MIN_SIZE, CONFIG.ASTEROID_MAX_SIZE);
        this.vx = Utils.random(-20, 20);
        this.vy = Utils.random(-20, 20);
        this.rotation = Utils.random(0, Math.PI * 2);
        this.rotationSpeed = Utils.random(-0.5, 0.5);
        this.sprite = ProceduralGen.generateAsteroidTexture(this.size, null);
        this.active = true;
    }
    
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.rotation += this.rotationSpeed * dt;
        
        // Отталкивание от границ
        const margin = CONFIG.WORLD_BORDER_MARGIN;
        if (this.x < margin || this.x > CONFIG.WORLD_SIZE - margin) {
            this.vx *= -1;
            this.x = Utils.clamp(this.x, margin, CONFIG.WORLD_SIZE - margin);
        }
        if (this.y < margin || this.y > CONFIG.WORLD_SIZE - margin) {
            this.vy *= -1;
            this.y = Utils.clamp(this.y, margin, CONFIG.WORLD_SIZE - margin);
        }
    }
    
    draw(ctx, cameraZoom) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(cameraZoom, cameraZoom);
        ctx.drawImage(this.sprite, -this.size, -this.size);
        ctx.restore();
    }
    
    split() {
        if (this.size < CONFIG.ASTEROID_MIN_SIZE * 1.5) {
            this.active = false;
            return [];
        }
        
        const fragments = [];
        const fragmentCount = Utils.randomInt(2, 4);
        
        for (let i = 0; i < fragmentCount; i++) {
            const frag = new Asteroid(this.x, this.y, this.size * 0.5);
            frag.vx = this.vx + Utils.random(-30, 30);
            frag.vy = this.vy + Utils.random(-30, 30);
            fragments.push(frag);
        }
        
        this.active = false;
        return fragments;
    }
}

// ============================================
// КЛАСС: Взрыв
// ============================================
class Explosion {
    constructor(x, y, size = 30) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.particles = [];
        this.active = true;
        this.lifetime = 1000;
        
        // Создаем частицы
        const particleCount = Math.floor(size);
        for (let i = 0; i < particleCount; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const speed = Utils.random(50, 200);
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: Utils.random(0.02, 0.05)
            });
        }
    }
    
    update(dt) {
        this.lifetime -= dt * 1000;
        if (this.lifetime <= 0) {
            this.active = false;
            return;
        }
        
        this.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= p.decay;
        });
        
        this.particles = this.particles.filter(p => p.life > 0);
    }
    
    draw(ctx, cameraZoom) {
        this.particles.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.scale(cameraZoom, cameraZoom);
            ctx.globalAlpha = p.life;
            ctx.fillStyle = `rgb(255, ${Math.floor(p.life * 200)}, 0)`;
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }
}

// ============================================
// КЛАСС: Игра
// ============================================
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.player = null;
        this.rockets = [];
        this.asteroids = [];
        this.explosions = [];
        this.score = 0;
        this.startTime = 0;
        this.gameOver = false;
        this.warningTimer = 0;
        this.warningPosition = null;
        this.storageData = null;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.initUI();
        this.startNewGame();
        this.loop();
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    initUI() {
        // Service buttons
        document.getElementById('btnProfile').addEventListener('click', () => {
            this.showProfile();
        });
        
        document.getElementById('btnShare').addEventListener('click', () => {
            this.shareGame();
        });
        
        document.getElementById('btnSound').addEventListener('click', () => {
            const enabled = AudioEngine.toggle();
            document.getElementById('btnSound').textContent = enabled ? '🔊' : '🔇';
        });
        
        document.getElementById('btnFullscreen').addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });
        
        document.getElementById('btnRestart').addEventListener('click', () => {
            this.startNewGame();
        });
        
        // Mobile controls visibility
        if (InputModule.isMobile()) {
            document.getElementById('mobileControls').style.display = 'block';
        }
    }
    
    showProfile() {
        const modal = document.getElementById('profileModal');
        modal.style.display = 'flex';
        
        document.getElementById('currencyValue').textContent = `${this.storageData.currency} 💎`;
        document.getElementById('bestScoreValue').textContent = this.storageData.bestScore;
        document.getElementById('totalGamesValue').textContent = this.storageData.totalGames;
        document.getElementById('destroyedRocketsValue').textContent = this.storageData.destroyedRockets;
        
        const status = StorageModule.getStatus();
        document.getElementById('storageStatus').textContent = status.type;
        document.getElementById('lastSaveValue').textContent = status.lastSave;
    }
    
    shareGame() {
        const url = `https://krepost.ru/game?score=${this.score}`;
        if (navigator.share) {
            navigator.share({
                title: 'Космический Разведчик',
                text: `Мой счет: ${this.score}`,
                url: url
            });
        } else {
            navigator.clipboard.writeText(url);
            alert('Ссылка скопирована в буфер обмена!');
        }
    }
    
    startNewGame() {
        this.storageData = StorageModule.load();
        this.storageData.totalGames++;
        
        this.player = new Player(CONFIG.WORLD_SIZE / 2, CONFIG.WORLD_SIZE / 2);
        this.rockets = [];
        this.asteroids = [];
        this.explosions = [];
        this.score = 0;
        this.startTime = Date.now();
        this.gameOver = false;
        
        // Генерация астероидов
        for (let i = 0; i < CONFIG.ASTEROID_COUNT; i++) {
            let x, y;
            do {
                x = Utils.random(100, CONFIG.WORLD_SIZE - 100);
                y = Utils.random(100, CONFIG.WORLD_SIZE - 100);
            } while (Utils.distance(x, y, this.player.x, this.player.y) < 300);
            
            this.asteroids.push(new Asteroid(x, y));
        }
        
        this.spawnHunterRockets();
    }
    
    spawnHunterRockets() {
        const count = CONFIG.HUNTER_ROCKET_COUNT;
        const visibleRadius = CameraModule.getVisibleRadius();
        
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Utils.random(0, 0.5);
            const distance = visibleRadius * CONFIG.HUNTER_SPAWN_DISTANCE;
            
            const x = this.player.x + Math.cos(angle) * distance;
            const y = this.player.y + Math.sin(angle) * distance;
            
            const rocket = new Rocket(x, y, 'hunter', this.player);
            rocket.angle = angle + Math.PI; // Смотрят на игрока
            this.rockets.push(rocket);
        }
    }
    
    spawnFlyerRockets() {
        const visibleRadius = CameraModule.getVisibleRadius();
        const side = Utils.randomInt(0, 3); // 0: top, 1: right, 2: bottom, 3: left
        
        let startX, startY, angle;
        const offset = visibleRadius * 1.2;
        
        switch(side) {
            case 0: // Top
                startX = Utils.random(this.player.x - offset, this.player.x + offset);
                startY = this.player.y - offset;
                angle = Math.PI / 2;
                break;
            case 1: // Right
                startX = this.player.x + offset;
                startY = Utils.random(this.player.y - offset, this.player.y + offset);
                angle = Math.PI;
                break;
            case 2: // Bottom
                startX = Utils.random(this.player.x - offset, this.player.x + offset);
                startY = this.player.y + offset;
                angle = -Math.PI / 2;
                break;
            case 3: // Left
                startX = this.player.x - offset;
                startY = Utils.random(this.player.y - offset, this.player.y + offset);
                angle = 0;
                break;
        }
        
        // Показываем предупреждение
        this.warningPosition = { x: startX, y: startY, side };
        this.warningTimer = 1500;
        AudioEngine.playWarning();
        
        // Спавн группы после задержки
        setTimeout(() => {
            this.warningPosition = null;
            const groupSize = Utils.randomInt(1, CONFIG.FLYER_GROUP_SIZE);
            
            for (let i = 0; i < groupSize; i++) {
                const rocket = new Rocket(
                    startX + Utils.random(-30, 30),
                    startY + Utils.random(-30, 30),
                    'flyer'
                );
                rocket.angle = angle;
                this.rockets.push(rocket);
            }
        }, this.warningTimer);
    }
    
    checkCollisions() {
        const player = this.player;
        
        // Ракеты vs Игрок
        this.rockets.forEach(rocket => {
            if (!rocket.active) return;
            
            const dist = Utils.distance(rocket.x, rocket.y, player.x, player.y);
            if (dist < rocket.size + player.size) {
                rocket.active = false;
                this.explosions.push(new Explosion(rocket.x, rocket.y, 30));
                
                if (player.hit()) {
                    this.storageData.destroyedRockets++;
                }
                
                if (player.lives <= 0) {
                    this.gameOver = true;
                    this.storageData.bestScore = Math.max(this.storageData.bestScore, this.score);
                    StorageModule.save(this.storageData);
                }
            }
        });
        
        // Ракеты vs Астероиды
        this.asteroids.forEach(asteroid => {
            if (!asteroid.active) return;
            
            this.rockets.forEach(rocket => {
                if (!rocket.active) return;
                
                const dist = Utils.distance(rocket.x, rocket.y, asteroid.x, asteroid.y);
                if (dist < rocket.size + asteroid.size) {
                    rocket.active = false;
                    asteroid.active = false;
                    this.explosions.push(new Explosion(rocket.x, rocket.y, 25));
                    
                    // Разделение астероида
                    const fragments = asteroid.split();
                    this.asteroids.push(...fragments);
                    
                    this.score += CONFIG.BONUS_PER_DESTROYED;
                    this.storageData.destroyedRockets++;
                }
            });
        });
        
        // Ракеты vs Ракеты
        for (let i = 0; i < this.rockets.length; i++) {
            for (let j = i + 1; j < this.rockets.length; j++) {
                const r1 = this.rockets[i];
                const r2 = this.rockets[j];
                
                if (!r1.active || !r2.active) continue;
                
                const dist = Utils.distance(r1.x, r1.y, r2.x, r2.y);
                if (dist < r1.size + r2.size) {
                    r1.active = false;
                    r2.active = false;
                    this.explosions.push(new Explosion((r1.x + r2.x) / 2, (r1.y + r2.y) / 2, 35));
                    this.score += CONFIG.BONUS_PER_DESTROYED * 2;
                    this.storageData.destroyedRockets += 2;
                }
            }
        }
        
        // Игрок vs Астероиды
        this.asteroids.forEach(asteroid => {
            if (!asteroid.active) return;
            
            const dist = Utils.distance(player.x, player.y, asteroid.x, asteroid.y);
            if (dist < player.size + asteroid.size) {
                // Отталкивание
                const angle = Utils.angle(asteroid.x, asteroid.y, player.x, player.y);
                player.vx += Math.cos(angle) * 100;
                player.vy += Math.sin(angle) * 100;
                
                if (player.hit()) {
                    if (player.lives <= 0) {
                        this.gameOver = true;
                        this.storageData.bestScore = Math.max(this.storageData.bestScore, this.score);
                        StorageModule.save(this.storageData);
                    }
                }
            }
        });
        
        // Астероиды vs Астероиды (отталкивание)
        for (let i = 0; i < this.asteroids.length; i++) {
            for (let j = i + 1; j < this.asteroids.length; j++) {
                const a1 = this.asteroids[i];
                const a2 = this.asteroids[j];
                
                if (!a1.active || !a2.active) continue;
                
                const dist = Utils.distance(a1.x, a1.y, a2.x, a2.y);
                const minDist = a1.size + a2.size;
                
                if (dist < minDist && dist > 0) {
                    const angle = Utils.angle(a1.x, a1.y, a2.x, a2.y);
                    const push = (minDist - dist) * 0.5;
                    
                    a1.x -= Math.cos(angle) * push;
                    a1.y -= Math.sin(angle) * push;
                    a2.x += Math.cos(angle) * push;
                    a2.y += Math.sin(angle) * push;
                    
                    // Небольшое изменение скоростей
                    a1.vx -= Math.cos(angle) * 10;
                    a1.vy -= Math.sin(angle) * 10;
                    a2.vx += Math.cos(angle) * 10;
                    a2.vy += Math.sin(angle) * 10;
                }
            }
        }
    }
    
    update() {
        if (this.gameOver) return;
        
        const dt = 1 / 60;
        const input = InputModule.getMovement();
        
        // Обновление игрока
        this.player.update(dt, input);
        
        // Обновление ракет
        this.rockets.forEach(rocket => rocket.update(dt, this.player));
        this.rockets = this.rockets.filter(r => r.active);
        
        // Обновление астероидов
        this.asteroids.forEach(asteroid => asteroid.update(dt));
        this.asteroids = this.asteroids.filter(a => a.active);
        
        // Обновление взрывов
        this.explosions.forEach(exp => exp.update(dt));
        this.explosions = this.explosions.filter(e => e.active);
        
        // Проверка столкновений
        this.checkCollisions();
        
        // Спавн новых ракет
        if (this.rockets.length < CONFIG.HUNTER_ROCKET_COUNT) {
            setTimeout(() => this.spawnHunterRockets(), 3000);
        }
        
        // Шанс спавна пролёток
        if (Math.random() < CONFIG.FLYER_SPAWN_CHANCE * 0.01 && !this.warningPosition) {
            this.spawnFlyerRockets();
        }
        
        // Счет за выживание
        const survivalTime = Date.now() - this.startTime;
        this.score = Math.floor(survivalTime / 1000) * CONFIG.SCORE_PER_SURVIVAL;
        
        // Обновление UI
        this.updateUI(survivalTime);
    }
    
    updateUI(survivalTime) {
        document.getElementById('centerInfo').textContent = `Время: ${Utils.formatTime(survivalTime)}`;
        document.getElementById('scoreValue').textContent = this.score;
        document.getElementById('rocketsValue').textContent = this.rockets.length;
        document.getElementById('livesValue').textContent = this.player.lives;
    }
    
    drawWorldGrid(ctx, zoom) {
        const gridSize = 100;
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.1)';
        ctx.lineWidth = 1;
        
        const startX = Math.floor((this.player.x - CameraModule.getVisibleRadius()) / gridSize) * gridSize;
        const endX = Math.ceil((this.player.x + CameraModule.getVisibleRadius()) / gridSize) * gridSize;
        const startY = Math.floor((this.player.y - CameraModule.getVisibleRadius()) / gridSize) * gridSize;
        const endY = Math.ceil((this.player.y + CameraModule.getVisibleRadius()) / gridSize) * gridSize;
        
        for (let x = startX; x <= endX; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }
        
        for (let y = startY; y <= endY; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
        
        // Границы системы
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            CONFIG.WORLD_BORDER_MARGIN,
            CONFIG.WORLD_BORDER_MARGIN,
            CONFIG.WORLD_SIZE - CONFIG.WORLD_BORDER_MARGIN * 2,
            CONFIG.WORLD_SIZE - CONFIG.WORLD_BORDER_MARGIN * 2
        );
    }
    
    drawWarning(ctx, zoom) {
        if (!this.warningPosition) return;
        
        const { x, y } = this.warningPosition;
        const dist = Utils.distance(this.player.x, this.player.y, x, y);
        const visibleRadius = CameraModule.getVisibleRadius();
        
        if (dist < visibleRadius * 1.5) {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(zoom, zoom);
            
            // Пульсирующий восклицательный знак
            const pulse = 1 + Math.sin(Date.now() / 100) * 0.2;
            ctx.scale(pulse, pulse);
            
            // Красный фон
            ctx.fillStyle = 'rgba(255, 50, 50, 0.8)';
            ctx.beginPath();
            ctx.arc(0, 0, 25, 0, Math.PI * 2);
            ctx.fill();
            
            // Восклицательный знак
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('!', 0, 2);
            
            ctx.restore();
        }
    }
    
    draw() {
        const zoom = CameraModule.update(this.player.getSpeed() / CONFIG.PLAYER_MAX_SPEED);
        
        // Очистка
        this.ctx.fillStyle = '#000510';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        
        // Центрирование камеры на игроке
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(zoom, zoom);
        this.ctx.translate(-this.player.x, -this.player.y);
        
        // Сетка мира
        this.drawWorldGrid(this.ctx, zoom);
        
        // Предупреждения
        this.drawWarning(this.ctx, zoom);
        
        // Астероиды
        this.asteroids.forEach(asteroid => asteroid.draw(this.ctx, zoom));
        
        // Ракеты
        this.rockets.forEach(rocket => rocket.draw(this.ctx, zoom));
        
        // Игрок
        this.player.draw(this.ctx, zoom);
        
        // Взрывы
        this.explosions.forEach(exp => exp.draw(this.ctx, zoom));
        
        this.ctx.restore();
        
        // Game Over экран
        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('ИГРА ОКОНЧЕНА', this.canvas.width / 2, this.canvas.height / 2 - 30);
            
            this.ctx.font = '24px Arial';
            this.ctx.fillText(`Счет: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
            this.ctx.fillText('Нажмите ↻ для рестарта', this.canvas.width / 2, this.canvas.height / 2 + 60);
        }
    }
    
    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

// ============================================
// ЗАПУСК ИГРЫ
// ============================================
window.addEventListener('load', () => {
    StorageModule.init();
    AudioEngine.init();
    InputModule.init();
    CameraModule.init();
    
    new Game();
});

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}
