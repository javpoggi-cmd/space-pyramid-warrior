document.addEventListener('DOMContentLoaded', () => {
    const lobby = document.getElementById('lobby');
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startScreen = document.getElementById('startScreen');
    const initButton = document.getElementById('initButton');

    const gameContainer = document.createElement('div');
    gameContainer.style.position = 'relative';
    document.body.appendChild(gameContainer);
    gameContainer.appendChild(canvas);

    // --- Variables de Escala ---
    const BASE_WIDTH = 1280; // Ancho de referencia para el diseño del juego
    let scaleFactor = 1;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        scaleFactor = canvas.width / BASE_WIDTH;
        // En un juego más complejo, aquí se podrían reposicionar los elementos si el juego está activo
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // Llamada inicial para establecer el tamaño y el scaleFactor

    // =========================================================================
    // --- 1. MEJORA DE CÓDIGO: OBJETO DE CONFIGURACIÓN CENTRALIZADO ---
    // =========================================================================
    // NOTA: Los valores base ahora se multiplicarán por scaleFactor donde sea necesario
    const GAME_CONFIG = {
        player: {
            speed: 7,
            width: 100,
            height: 100,
            initialLives: 3,
            maxLives: 6,
            initialHealth: 3,
            maxHealth: 3,
            invulnerabilityDuration: 2000,
            shootCooldown: 350,
            heavyCannonCooldown: 800,
            heavyCannonDuration: 15000,
        },
        powerups: {
            spawnChance: 0.15,
            luckUpChance: 0.90,
            luckUpDuration: 25000,
            luckUpCooldown: 60000
        },
        drones: {
            orbitRadius: 100,
            rotationSpeed: 0.04,
            shootCooldown: 2000,
            bulletSpeed: 9,
            maxDrones: 2,
        },
        missiles: {
            maxCharges: 3,
            chargeTime: 6000
        },
        difficulty: {
            increaseInterval: 120000, // 2 minutos
            speedMultiplierIncrease: 0.15
        },
        gameplay: {
            chargeCycleDuration: 60000, // 1 minuto para oleada normal
            superBossChargeCycleDuration: 90000 // 1.5 minutos para superbosses
        }
    };

    // --- Variables del juego ---
    let appState = 'START_SCREEN';
    let gameState = 'NORMAL_WAVE';
    let gameRunning = false;
    let isPaused = false;
    let allowSpawning = true;
    let score = 0;
    let keys = {};
    let animationFrameId;
    let player;
    let bullets = [], enemyBullets = [], asteroids = [], enemies = [], explosions = [], smallExplosions = [], stars = [], powerUps = [], bosses = [], missiles = [], drones = [];
    let enemyDestroyedCount = 0;
    let bossesDestroyed = 0;
    let asteroidInterval, bossTimer, meteorShowerTimer, aggressiveAsteroidSpawner, waveTimer;
    const bossProgression = [1, 3, 4, 5, 6, 7, 2];
    const superBossProgression = ['SUPER_BOSS_1', 'SUPER_BOSS_2', 'SUPER_BOSS_3', 'SUPER_BOSS_4', 'GIGA_BOSS', 'FINAL_ENEMY'];
    let currentBossIndex = 0;

    // --- Variables de Sonido, Assets y Cheats ---
    const assets = {};
    const audioAssets = {};
    let isMusicOn = true;
    let isSfxOn = true;
    let musicVolume = 0.5;
    let sfxVolume = 1.0;
    let cheatModeActive = false;
    let applyAllPowerupsCheat = false;

    // --- Variables de estado del jugador ---
    let playerLives = GAME_CONFIG.player.initialLives;
    let playerHealth = GAME_CONFIG.player.initialHealth;
    let isInvulnerable = false;
    let shieldStacks = 0;
    let playerLastShotTime = 0;
    let burstFireLevel = 0;
    let wingCannonsActive = false;
    let heavyCannonLevel = 0;
    let heavyCannonTimeout;
    let missileSystemActive = false;
    let missileCharges = 0;
    let missileChargeInterval;
    let homingSidekickActive = false;

    // --- Dificultad y Power-ups ---
    let difficultyLevel = 2;
    const difficultySettings = [ { name: 'Cero', enemies: 1 }, { name: 'Baja', enemies: 3 }, { name: 'Normal', enemies: 6 }, { name: 'Difícil', enemies: 9 }, { name: 'Severa', enemies: 12 }, { name: 'Máxima', enemies: 15 } ];
    let enemySpeedMultiplier = 1.0;
    let difficultyTimer;
    let powerUpSpawnChance = GAME_CONFIG.powerups.spawnChance;
    let luckUpTimeout;
    let luckUpOnCooldown = false;

    // --- Rutas de Assets (con nuevo dron) ---
    const assetPaths = { player: 'img/player.png', drone: 'img/drone.png', bullet: 'img/bullet.png', heavyBullet: 'img/heavy_bullet.png', sidekickBullet: 'img/sidekick_bullet.png', missile: 'img/missile.png', enemyBullet: 'img/enemy_bullet.png', explosion1: 'img/explosion1.png', explosion2: 'img/explosion2.png', explosion3: 'img/explosion3.png', shieldEffect1: 'img/shield_effect_1.png', shieldEffect2: 'img/shield_effect_2.png', shieldEffect3: 'img/shield_effect_3.png', enemy1: 'img/enemy1.png', enemy2: 'img/enemy2.png', enemy3: 'img/enemy3.png', enemy4: 'img/enemy4.png', enemy5: 'img/enemy5.png', enemy6: 'img/enemy6.png', enemy7: 'img/enemy7.png', superBoss1: 'img/super_boss_1.png', superBoss2: 'img/super_boss_2.png', superBoss3: 'img/super_boss_3.png', superBoss4: 'img/super_boss_4.png', gigaBoss: 'img/giga_boss.png', finalEnemy: 'img/final_enemy.png', asteroid1: 'img/asteroid1.png', asteroid2: 'img/asteroid2.png', powerupShield: 'img/powerup_shield.png', powerupRapidFire: 'img/powerup_rapidfire.png', powerupExtraLife: 'img/powerup_extralife.png', powerupWings: 'img/powerup_wings.png', powerupHeavy: 'img/powerup_heavy.png', powerupMissile: 'img/powerup_missile.png', powerupSidekick: 'img/powerup_sidekick.png', powerupBomb: 'img/powerup_bomb.png', powerupLuck: 'img/powerup_luck.png', powerupDrone: 'img/powerup_drone.png', missileIcon: 'img/missile_icon.png', introScreen: 'img/intro_screen.png', ending1: 'img/ending_1.png', ending2: 'img/ending_2.png', ending3: 'img/ending_3.png', ending4: 'img/ending_4.png', ending5: 'img/ending_5.png' };
    const audioPaths = { backgroundMusic: 'audio/background_music.mp3', bossMusic: 'audio/boss_music.mp3', introMusic: 'audio/intro_music.mp3', endingMusic: 'audio/ending_music.mp3', playerShoot: 'audio/player_shoot.wav', heavyShoot: 'audio/heavy_shoot.wav', missileLaunch: 'audio/missile_launch.wav', missileExplosion: 'audio/missile_explosion.wav', enemyShoot: 'audio/enemy_shoot.wav', explosionSmall: 'audio/explosion_small.wav', explosionLarge: 'audio/explosion_large.wav', bossExplosion: 'audio/boss_explosion.wav', powerupShield: 'audio/powerup_shield.wav', powerupBurst: 'audio/powerup_burst.wav', powerupExtraLife: 'audio/powerup_extralife.wav', powerupWings: 'audio/powerup_wings.wav', powerupHeavy: 'audio/powerup_heavy.wav', powerupMissile: 'audio/powerup_missile.wav', powerupSidekick: 'audio/powerup_sidekick.wav', powerupBombPickup: 'audio/powerup_bomb_pickup.wav', powerupLuck: 'audio/powerup_luck.wav', powerupDrone: 'audio/powerup_drone.wav', bombExplode: 'audio/bomb_explode.wav', hit: 'audio/hit.wav', playerDamaged: 'audio/player_damaged.wav' };

    function preloadAssets() { console.log("Iniciando precarga de imágenes..."); const promises = Object.keys(assetPaths).map(key => { return new Promise((resolve) => { const img = new Image(); const path = assetPaths[key]; img.src = path; img.onload = () => { console.log(`Imagen cargada: ${path}`); assets[key] = img; resolve(); }; img.onerror = () => { console.warn(`¡ERROR! No se pudo cargar la imagen: ${path}. Revisa que el archivo exista.`); resolve(); }; }); }); return Promise.all(promises); }
    function preloadAudio() { console.log("Creando objetos de audio..."); for (const key in audioPaths) { const audio = new Audio(); audio.src = audioPaths[key]; audioAssets[key] = audio; } console.log("Objetos de audio creados."); }
    function playMusic(track) { if (audioAssets.backgroundMusic) audioAssets.backgroundMusic.pause(); if (audioAssets.bossMusic) audioAssets.bossMusic.pause(); if(audioAssets.introMusic) audioAssets.introMusic.pause(); if(audioAssets.endingMusic) audioAssets.endingMusic.pause(); if (isMusicOn && track) { track.currentTime = 0; track.loop = true; track.volume = musicVolume; track.play().catch(e => { /* Ignorar errores */ }); } }
    function playSound(sound, volume = 1.0) { if (isSfxOn && sound) { const soundInstance = sound.cloneNode(); soundInstance.volume = sfxVolume * volume; soundInstance.play().catch(e => {/* Ignorar errores */}); } }

    // --- Clases del Juego ---
    class Player { constructor() { this.image = assets.player; this.width = GAME_CONFIG.player.width * scaleFactor; this.height = GAME_CONFIG.player.height * scaleFactor; this.x = canvas.width / 2 - this.width / 2; this.y = canvas.height + this.height; this.speed = GAME_CONFIG.player.speed * scaleFactor; this.isPositioned = false; } draw() { if (this.image) { if (isInvulnerable && !shieldStacks) { ctx.globalAlpha = (Math.floor(Date.now() / 100) % 2 === 0) ? 0.5 : 1; } ctx.drawImage(this.image, this.x, this.y, this.width, this.height); ctx.globalAlpha = 1; if (shieldStacks > 0 && assets[`shieldEffect${shieldStacks}`]) { const shieldImage = assets[`shieldEffect${shieldStacks}`]; const shieldOffset = 20 * scaleFactor; ctx.drawImage(shieldImage, this.x - shieldOffset, this.y - shieldOffset, this.width + shieldOffset * 2, this.height + shieldOffset * 2); } } } update() { if (!this.isPositioned) { const targetY = canvas.height - 150 * scaleFactor; if (this.y > targetY) { this.y -= 2 * scaleFactor; } else { this.y = targetY; this.isPositioned = true; } return; } let moveX = 0; let moveY = 0; if (keys['arrowleft'] || keys['a']) moveX -= 1; if (keys['arrowright'] || keys['d']) moveX += 1; if (keys['arrowup'] || keys['w']) moveY -= 1; if (keys['arrowdown'] || keys['s']) moveY += 1; const gamepad = navigator.getGamepads()[0]; if (gamepad) { const stickX = gamepad.axes[0]; const stickY = gamepad.axes[1]; const deadzone = 0.2; if (Math.abs(stickX) > deadzone) moveX = stickX; if (Math.abs(stickY) > deadzone) moveY = stickY; if (gamepad.buttons[0].pressed) { this.shoot(); } } if (touchMoveX) moveX = touchMoveX; if (touchMoveY) moveY = touchMoveY; if (moveX !== 0) this.x += this.speed * moveX; if (moveY !== 0) this.y += this.speed * moveY; if (this.x < 0) this.x = 0; if (this.x > canvas.width - this.width) this.x = canvas.width - this.width; if (this.y < 0) this.y = 0; if (this.y > canvas.height - this.height) this.y = canvas.height - this.height; } shoot() { const now = Date.now(); const currentCooldown = (heavyCannonLevel > 0) ? GAME_CONFIG.player.heavyCannonCooldown : GAME_CONFIG.player.shootCooldown; if (!this.isPositioned || now - playerLastShotTime < currentCooldown) return; if (homingSidekickActive) { const target = findNearestTarget(this.x, this.y, ['enemies', 'bosses']); if (target) { bullets.push(new SidekickBullet(this.x + this.width / 2 - (5 * scaleFactor), this.y, target)); } } if (heavyCannonLevel > 0) { playSound(audioAssets.heavyShoot, 0.8); const shots = heavyCannonLevel; for (let i = 0; i < shots; i++) { setTimeout(() => { if (gameRunning) bullets.push(new HeavyBullet(this.x + this.width / 2 - (15 * scaleFactor), this.y)); }, i * 120); } } else { playSound(audioAssets.playerShoot, 0.7); let shotsPerBurst = 1; if (burstFireLevel === 1) shotsPerBurst = 2; if (burstFireLevel === 2) shotsPerBurst = 3; const fire = (xOffset) => { for (let i = 0; i < shotsPerBurst; i++) { setTimeout(() => { if (gameRunning) bullets.push(new Bullet(this.x + xOffset, this.y)); }, i * 100); } }; if (wingCannonsActive) { fire(this.width * 0.2); fire(this.width * 0.8 - (10 * scaleFactor)); } else { fire(this.width / 2 - (5 * scaleFactor)); } } playerLastShotTime = now; } }
    class Bullet { constructor(x, y) { this.image = assets.bullet; this.x = x; this.y = y; this.width = 10 * scaleFactor; this.height = 30 * scaleFactor; this.speed = 12 * scaleFactor; this.damage = 1; } draw() { if (this.image) ctx.drawImage(this.image, this.x, this.y, this.width, this.height); } update() { this.y -= this.speed; } }
    
    class DroneBullet {
        constructor(x, y, target) {
            this.image = assets.sidekickBullet;
            this.x = x;
            this.y = y;
            this.target = target;
            this.width = 15 * scaleFactor;
            this.height = 15 * scaleFactor;
            this.speed = GAME_CONFIG.drones.bulletSpeed * scaleFactor;
            this.damage = 0.6;
        }
        draw() {
            if (this.image) {
                ctx.filter = 'hue-rotate(280deg) brightness(1.2)';
                ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
                ctx.filter = 'none';
            }
        }
        update() {
            if (this.target && this.target.health > 0) {
                const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
                this.x += Math.cos(angle) * this.speed;
                this.y += Math.sin(angle) * this.speed;
            } else {
                this.y -= this.speed;
            }
        }
    }

    class Drone {
        constructor(player, angleOffset) {
            this.player = player;
            this.image = assets.drone;
            this.width = 50 * scaleFactor;
            this.height = 50 * scaleFactor;
            this.angle = angleOffset;
            this.lastShotTime = 0;
            this.target = null;
        }

        update() {
            const orbitRadius = GAME_CONFIG.drones.orbitRadius * scaleFactor;
            this.angle += GAME_CONFIG.drones.rotationSpeed;
            this.x = this.player.x + this.player.width / 2 + Math.cos(this.angle) * orbitRadius - this.width / 2;
            this.y = this.player.y + this.player.height / 2 + Math.sin(this.angle) * orbitRadius - this.height / 2;

            if (this.target && this.target.health <= 0) {
                this.target = null;
            }

            if (!this.target) {
                this.target = findNearestTarget(this.x, this.y, ['enemies', 'bosses']);
            }

            const now = Date.now();
            if (this.target && now - this.lastShotTime > GAME_CONFIG.drones.shootCooldown) {
                bullets.push(new DroneBullet(this.x + this.width / 2, this.y + this.height / 2, this.target));
                this.lastShotTime = now;
            }
        }

        draw() {
            if (this.image) {
                ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
            }
        }
    }
    class HeavyBullet { constructor(x, y) { this.image = assets.heavyBullet; this.x = x; this.y = y; this.width = 30 * scaleFactor; this.height = 50 * scaleFactor; this.speed = 8 * scaleFactor; this.damage = 15; } draw() { if (this.image) ctx.drawImage(this.image, this.x, this.y, this.width, this.height); } update() { this.y -= this.speed; } }
    class SidekickBullet { constructor(x, y, target) { this.image = assets.sidekickBullet; this.x = x; this.y = y; this.target = target; this.width = 12 * scaleFactor; this.height = 12 * scaleFactor; this.speed = 10 * scaleFactor; this.damage = 0.5; } draw() { if (this.image) ctx.drawImage(this.image, this.x, this.y, this.width, this.height); } update() { if (this.target && this.target.health > 0) { const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x); this.x += Math.cos(angle) * this.speed; this.y += Math.sin(angle) * this.speed; } else { this.y -= this.speed; } } }
    class Missile { constructor(x, y, target) { this.image = assets.missile; this.x = x; this.y = y; this.target = target; this.width = 40 * scaleFactor; this.height = 80 * scaleFactor; this.speed = 4 * scaleFactor; this.damage = 15; } draw() { if (this.image) { ctx.save(); ctx.translate(this.x + this.width / 2, this.y + this.height / 2); const angle = this.target ? Math.atan2(this.target.y - this.y, this.target.x - this.x) + Math.PI / 2 : 0; ctx.rotate(angle); ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height); ctx.restore(); } } update() { if (this.target && this.target.health > 0) { const angle = Math.atan2(this.target.y + this.target.height / 2 - this.y, this.target.x + this.target.width / 2 - this.x); this.x += Math.cos(angle) * this.speed; this.y += Math.sin(angle) * this.speed; } else { this.y -= this.speed; } } }
    class EnemyBullet { constructor(x, y, speedX = 0, speedY = 7) { this.image = assets.enemyBullet; this.x = x; this.y = y; this.width = 32 * scaleFactor; this.height = 32 * scaleFactor; this.speedX = speedX * scaleFactor; this.speedY = speedY * scaleFactor; } draw() { if (this.image) ctx.drawImage(this.image, this.x, this.y, this.width, this.height); } update() { this.x += this.speedX; this.y += this.speedY; } }
    class HomingEnemyBullet { constructor(x, y, target) { this.image = assets.enemyBullet; this.x = x; this.y = y; this.target = target; this.width = 40 * scaleFactor; this.height = 40 * scaleFactor; this.speed = 3 * scaleFactor; } draw() { if (this.image) { ctx.filter = 'hue-rotate(120deg) brightness(1.5)'; ctx.drawImage(this.image, this.x, this.y, this.width, this.height); ctx.filter = 'none'; } } update() { if (this.target && player) { const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x); this.x += Math.cos(angle) * this.speed; this.y += Math.sin(angle) * this.speed; } else { this.y += this.speed; } } }
    class MineBullet { constructor(x, y) { this.x = x; this.y = y; this.width = 25 * scaleFactor; this.height = 25 * scaleFactor; this.speedY = 1.5 * scaleFactor; this.life = 200; } draw() { ctx.fillStyle = `hsl(${this.life * 2}, 100%, 50%)`; ctx.fillRect(this.x, this.y, this.width, this.height); } update() { this.y += this.speedY; this.life--; if (this.life <= 0) { this.explode(); } } explode() { playSound(audioAssets.explosionSmall, 0.7); for (let i = 0; i < 8; i++) { const angle = (i / 8) * (Math.PI * 2); enemyBullets.push(new EnemyBullet(this.x, this.y, Math.cos(angle) * 4, Math.sin(angle) * 4)); } } }
    class Explosion { constructor(x, y, size) { const type = Math.ceil(Math.random() * 3); this.image = assets[`explosion${type}`]; this.x = x - size / 2; this.y = y - size / 2; this.width = size; this.height = size; this.life = 20; } draw() { if (this.image) ctx.drawImage(this.image, this.x, this.y, this.width, this.height); } update() { this.life--; } }
    class SmallExplosion extends Explosion { constructor(x, y) { super(x, y, 30 * scaleFactor); this.life = 10; } }
    class PowerUp { constructor(x, y, type) { this.x = x; this.y = y; this.type = type; this.width = 75 * scaleFactor; this.height = 75 * scaleFactor; this.speed = 2.5 * scaleFactor; let imgKey = 'powerupShield'; if (type === 'rapidFire') imgKey = 'powerupRapidFire'; if (type === 'extraLife') imgKey = 'powerupExtraLife'; if (type === 'wingCannons') imgKey = 'powerupWings'; if (type === 'heavyCannon') imgKey = 'powerupHeavy'; if (type === 'missileSystem') imgKey = 'powerupMissile'; if (type === 'sidekick') imgKey = 'powerupSidekick'; if (type === 'smartBomb') imgKey = 'powerupBomb'; if (type === 'luckUp') imgKey = 'powerupLuck'; if (type === 'drone') imgKey = 'powerupDrone'; this.image = assets[imgKey]; } draw() { if (this.image) ctx.drawImage(this.image, this.x, this.y, this.width, this.height); } update() { this.y += this.speed; } }
    class Asteroid { constructor(type) { this.type = type; this.image = assets[`asteroid${type}`]; if (this.type === 1) { this.width = 150 * scaleFactor; this.height = 150 * scaleFactor; this.health = 3; } else { this.width = 280 * scaleFactor; this.height = 280 * scaleFactor; this.health = 8; } this.x = Math.random() * canvas.width; this.y = 0 - this.height; this.speedX = (Math.random() - 0.5) * 1 * scaleFactor; this.speedY = (Math.random() * 1.5 + 0.5) * scaleFactor; } draw() { if(this.image) ctx.drawImage(this.image, this.x, this.y, this.width, this.height); } update() { this.x += this.speedX; this.y += this.speedY; } }
    class Star { constructor() { this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height; this.size = (Math.random() * 2 + 1) * scaleFactor; this.speed = this.size / 2; } draw() { ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2); ctx.fill(); } update(playerSpeedX, playerSpeedY) { this.y += this.speed * 2.5; this.x -= playerSpeedX * this.speed * 0.1; this.y -= playerSpeedY * this.speed * 0.1; if (this.y > canvas.height) { this.y = 0; this.x = Math.random() * canvas.width; } if (this.y < 0) { this.y = canvas.height; this.x = Math.random() * canvas.width; } if (this.x > canvas.width) { this.x = 0; this.y = Math.random() * canvas.height; } if (this.x < 0) { this.x = canvas.width; this.y = Math.random() * canvas.height; } } }
    class Enemy { constructor(type) { this.type = type; this.image = assets[`enemy${type}`]; this.retreating = false; let baseWidth, baseHeight, baseSpeed, baseHealth; switch(type) { case 1: baseWidth = 100; baseHeight = 100; baseSpeed = 2.5; baseHealth = 2; this.shootInterval = 2200; this.movementPattern = 'chaseRetreat'; this.behaviorState = 'advancing'; this.behaviorTimer = Date.now(); break; case 2: baseWidth = 80; baseHeight = 80; baseSpeed = 4; baseHealth = 1; this.shootInterval = 1500; break; case 3: baseWidth = 140; baseHeight = 140; baseSpeed = 1; baseHealth = 5; this.shootInterval = 3000; break; case 4: baseWidth = 90; baseHeight = 90; baseSpeed = 3; baseHealth = 2; this.movementPattern = 'zigzag'; this.zigzagDir = 1; this.shootInterval = 2000; break; case 5: baseWidth = 110; baseHeight = 110; baseSpeed = 1.5; baseHealth = 3; this.movementPattern = 'homing'; this.shootInterval = 1800; break; case 6: baseWidth = 100; baseHeight = 100; baseSpeed = 2.5; baseHealth = 3; this.movementPattern = 'sineWave'; this.angle = 0; this.initialX = Math.random() * (canvas.width - (baseWidth * scaleFactor)); this.shootInterval = 2200; break; case 7: baseWidth = 180; baseHeight = 180; baseSpeed = 0.8; baseHealth = 10; this.shootInterval = 3500; break; default: baseWidth = 100; baseHeight = 100; baseSpeed = 2; baseHealth = 1; this.shootInterval = 2500; } this.width = baseWidth * scaleFactor; this.height = baseHeight * scaleFactor; this.speed = baseSpeed * scaleFactor; this.health = baseHealth; this.x = this.initialX || Math.random() * (canvas.width - this.width); this.y = 0 - this.height; this.lastShotTime = Date.now(); } draw() { if (this.image) ctx.drawImage(this.image, this.x, this.y, this.width, this.height); } update(player) { if (this.retreating) { this.y += this.speed * 3; return; } const currentSpeed = this.speed * enemySpeedMultiplier; if (this.movementPattern === 'chaseRetreat') { if (Date.now() - this.behaviorTimer > 2000) { this.behaviorState = this.behaviorState === 'advancing' ? 'retreating' : 'advancing'; this.behaviorTimer = Date.now(); } let angle; if (this.behaviorState === 'advancing') { angle = Math.atan2(player.y - this.y, player.x - this.x); } else { angle = Math.atan2(player.y - this.y, player.x - this.x) + Math.PI; } this.x += Math.cos(angle) * currentSpeed; this.y += Math.sin(angle) * currentSpeed; if (this.y < 0) this.y = 0; } else if (this.movementPattern === 'zigzag') { this.x += currentSpeed * this.zigzagDir; if (this.x <= 0 || this.x >= canvas.width - this.width) this.zigzagDir *= -1; this.y += currentSpeed / 2; } else if (this.movementPattern === 'homing') { const angle = Math.atan2(player.y - this.y, player.x - this.x); this.x += Math.cos(angle) * currentSpeed; this.y += Math.sin(angle) * currentSpeed; } else if (this.movementPattern === 'sineWave') { this.angle += 0.05; this.x = this.initialX + Math.sin(this.angle) * (100 * scaleFactor); this.y += currentSpeed / 2; } else { if (this.x < player.x) this.x += currentSpeed / 2; if (this.x > player.x) this.x -= currentSpeed / 2; if (this.type === 7) { this.y += currentSpeed * 1.5; } else { this.y += currentSpeed / 2; } } if (this.x > canvas.width) { this.x = 0 - this.width; } else if (this.x + this.width < 0) { this.x = canvas.width; } if (this.y > canvas.height) { this.y = 0 - this.height; this.x = player.x + (Math.random() * 200 - 100); if (this.x < 0) this.x = 0; if (this.x > canvas.width - this.width) this.x = canvas.width - this.width; } if (Date.now() - this.lastShotTime > this.shootInterval) { this.shoot(); } } shoot() { if (!gameRunning) return; playSound(audioAssets.enemyShoot, 0.4); this.lastShotTime = Date.now(); const bulletX = this.x + this.width / 2 - (16 * scaleFactor); const bulletY = this.y + this.height; switch (this.type) { case 1: setTimeout(() => { if (gameRunning) enemyBullets.push(new EnemyBullet(this.x + this.width / 2 - (16 * scaleFactor), this.y + this.height)); }, 0); setTimeout(() => { if (gameRunning) enemyBullets.push(new EnemyBullet(this.x + this.width / 2 - (16 * scaleFactor), this.y + this.height)); }, 150); break; case 3: enemyBullets.push(new EnemyBullet(this.x + this.width * 0.2, bulletY)); enemyBullets.push(new EnemyBullet(this.x + this.width * 0.8, bulletY)); break; case 4: const speedX = 2 * this.zigzagDir; const speedY = 5; enemyBullets.push(new EnemyBullet(bulletX, bulletY, speedX - 1.5, speedY)); enemyBullets.push(new EnemyBullet(bulletX, bulletY, speedX - 0.5, speedY)); enemyBullets.push(new EnemyBullet(bulletX, bulletY, speedX + 0.5, speedY)); enemyBullets.push(new EnemyBullet(bulletX, bulletY, speedX + 1.5, speedY)); break; case 5: enemyBullets.push(new EnemyBullet(bulletX, bulletY, 0, 7)); enemyBullets.push(new EnemyBullet(bulletX, this.y, 0, -7)); break; case 7: for (let i = 0; i < 4; i++) { setTimeout(() => { if(gameRunning) enemyBullets.push(new EnemyBullet(this.x + this.width / 2 - (16 * scaleFactor), this.y + this.height)); }, i * 150); } break; default: enemyBullets.push(new EnemyBullet(bulletX, bulletY)); break; } } }
    class Boss { constructor(bossType) { this.bossType = bossType; const bossConfigs = { 'SUPER_BOSS_1': { img: assets.superBoss1, size: 6, health: 250, attacks: ['homingBarrage', 'sweepingWall'] }, 'SUPER_BOSS_2': { img: assets.superBoss2, size: 6, health: 300, attacks: ['mineLayer', 'crossfire'] }, 'SUPER_BOSS_3': { img: assets.superBoss3, size: 6, health: 350, attacks: ['spiral', 'burstSnipe'] }, 'SUPER_BOSS_4': { img: assets.superBoss4, size: 6, health: 450, attacks: ['cone', 'summon'] }, 'GIGA_BOSS':    { img: assets.gigaBoss,   size: 10, health: 900, attacks: ['homingBarrage', 'sweepingWall', 'mineLayer', 'crossfire', 'spiral', 'burstSnipe', 'cone', 'summon'] }, 'FINAL_ENEMY':  { img: assets.finalEnemy, size: 1.5, health: 100, attacks: ['finalBurst', 'spiral'] }, 'REGULAR':      { img: assets[`enemy${bossType}`], size: 4, health: 100, attacks: ['radial', 'circular'] } }; const config = bossConfigs[bossType] || bossConfigs['REGULAR']; this.image = config.img; const playerBaseWidth = GAME_CONFIG.player.width * scaleFactor; if (this.bossType === 'GIGA_BOSS') { this.width = 1000 * scaleFactor; this.height = 500 * scaleFactor; } else { this.width = playerBaseWidth * config.size; this.height = playerBaseWidth * config.size; } this.health = config.health; this.maxHealth = this.health; this.attackPatterns = config.attacks; this.x = canvas.width / 2 - this.width / 2; this.y = 0 - this.height; this.speed = 1 * scaleFactor; this.isPositioned = false; this.attackPhaseIndex = 0; this.attackPhase = this.attackPatterns[0]; this.lastAttackSwitch = Date.now(); this.lastShotTime = 0; this.circularShotIndex = 0; this.movementAngle = -Math.PI / 2; this.sweepAngle = -Math.PI / 4; this.sweepDirection = 1; if (this.bossType === 'FINAL_ENEMY') { this.speed = GAME_CONFIG.player.speed * scaleFactor * 1.5; this.moveTimer = 0; this.targetX = Math.random() * (canvas.width - this.width); this.targetY = Math.random() * (canvas.height - this.height); } } draw() { if (this.image) { ctx.drawImage(this.image, this.x, this.y, this.width, this.height); } if (this.isPositioned && this.bossType !== 'FINAL_ENEMY') { const barWidth = canvas.width / 2; const barHeight = 25 * scaleFactor; const barY = 30 * scaleFactor; const healthPercentage = this.health / this.maxHealth; ctx.fillStyle = '#440000'; ctx.fillRect(canvas.width / 2 - barWidth / 2, barY, barWidth, barHeight); ctx.fillStyle = '#00ff00'; ctx.fillRect(canvas.width / 2 - barWidth / 2, barY, barWidth * healthPercentage, barHeight); ctx.strokeStyle = 'white'; ctx.strokeRect(canvas.width / 2 - barWidth / 2, barY, barWidth, barHeight); } } update() { if (this.bossType === 'FINAL_ENEMY') { if (!this.isPositioned) { if (this.y < canvas.height / 2) { this.y += this.speed; } else { this.isPositioned = true; } } this.moveTimer -= 16; if (this.moveTimer <= 0) { if (Math.random() < 0.3) { this.targetX = player.x > canvas.width / 2 ? Math.random() * (canvas.width / 4) : canvas.width * 0.75 + Math.random() * (canvas.width / 4); this.targetY = player.y > canvas.height / 2 ? Math.random() * (canvas.height / 4) : canvas.height * 0.75 + Math.random() * (canvas.height / 4); } else { this.targetX = Math.random() * (canvas.width - this.width); this.targetY = Math.random() * (canvas.height * 0.8); } this.moveTimer = Math.random() * 1000 + 500; } const angle = Math.atan2(this.targetY - this.y, this.targetX - this.x); this.x += Math.cos(angle) * this.speed; this.y += Math.sin(angle) * this.speed; } else { if (!this.isPositioned) { if (this.y < (50 * scaleFactor)) { this.y += this.speed; } else { this.isPositioned = true; } return; } this.movementAngle += 0.01; const moveRange = (this.bossType === 'GIGA_BOSS') ? (200 * scaleFactor) : (100 * scaleFactor); this.x = (canvas.width / 2 - this.width / 2) + Math.cos(this.movementAngle) * moveRange; if (this.bossType === 'GIGA_BOSS') { this.y = (50 * scaleFactor) + Math.sin(this.movementAngle * 0.7) * (40 * scaleFactor); } } if (Date.now() - this.lastAttackSwitch > 10000) { this.attackPhaseIndex = (this.attackPhaseIndex + 1) % this.attackPatterns.length; this.attackPhase = this.attackPatterns[this.attackPhaseIndex]; this.lastAttackSwitch = Date.now(); this.circularShotIndex = 0; } this.shoot(); } shoot() { switch(this.attackPhase) { case 'radial': if (Date.now() - this.lastShotTime > 4000) { this.lastShotTime = Date.now(); setTimeout(() => this.fireRadialBurst(), 0); setTimeout(() => this.fireRadialBurst(), 500); } break; case 'circular': if (Date.now() - this.lastShotTime > 150) { this.lastShotTime = Date.now(); this.fireCircularShot(); } break; case 'homingBarrage': if (Date.now() - this.lastShotTime > 2000) { this.lastShotTime = Date.now(); this.firePredictiveBurst(); } break; case 'sweepingWall': if (Date.now() - this.lastShotTime > 50) { this.lastShotTime = Date.now(); this.fireSweepingWall(); } break; case 'mineLayer': if (Date.now() - this.lastShotTime > 1000) { this.lastShotTime = Date.now(); this.fireMine(); } break; case 'crossfire': if (Date.now() - this.lastShotTime > 200) { this.lastShotTime = Date.now(); this.fireCrossfire(); } break; case 'spiral': if (Date.now() - this.lastShotTime > 40) { this.lastShotTime = Date.now(); this.fireSpiral(); } break; case 'burstSnipe': if (Date.now() - this.lastShotTime > 2000) { this.lastShotTime = Date.now(); this.fireBurstSnipe(); } break; case 'cone': if (Date.now() - this.lastShotTime > 1500) { this.lastShotTime = Date.now(); this.fireCone(); } break; case 'summon': if (Date.now() - this.lastShotTime > 8000) { this.lastShotTime = Date.now(); this.summonEnemies(); } break; case 'finalBurst': if (Date.now() - this.lastShotTime > 1500) { this.lastShotTime = Date.now(); this.fireFinalBurst(); } break; } } fireRadialBurst() { playSound(audioAssets.enemyShoot, 0.6); const bulletSpeed = 5; const wingLeftX = this.x + this.width * 0.1; const wingRightX = this.x + this.width * 0.9; const wingY = this.y + this.height * 0.7; for (let i = 0; i < 8; i++) { const angle = (i / 8) * Math.PI * 2; const speedX = Math.cos(angle) * bulletSpeed; const speedY = Math.sin(angle) * bulletSpeed; enemyBullets.push(new EnemyBullet(wingLeftX, wingY, speedX, speedY)); enemyBullets.push(new EnemyBullet(wingRightX, wingY, speedX, speedY)); } } fireCircularShot() { playSound(audioAssets.enemyShoot, 0.3); const bulletSpeed = 6; const baseAngle = Math.atan2(0, -Math.sin(this.movementAngle)); const angle = baseAngle + (this.circularShotIndex / 15) * Math.PI * 2; const speedX = Math.cos(angle) * bulletSpeed; const speedY = Math.sin(angle) * bulletSpeed; enemyBullets.push(new EnemyBullet(this.x + this.width / 2, this.y + this.height * 0.8, speedX, speedY)); this.circularShotIndex++; if (this.circularShotIndex >= 15) { this.circularShotIndex = 0; this.lastShotTime = Date.now() + 2000; } } firePredictiveBurst() { playSound(audioAssets.enemyShoot, 0.7); const bulletSpeed = 8; const centerX = this.x + this.width / 2; const centerY = this.y + this.height * 0.8; const angleToPlayer = Math.atan2(player.y - centerY, player.x - centerX); for(let i = -1; i <= 1; i++){ const angle = angleToPlayer + i * 0.2; enemyBullets.push(new EnemyBullet(centerX, centerY, Math.cos(angle) * bulletSpeed, Math.sin(angle) * bulletSpeed)); } } fireSweepingWall() { playSound(audioAssets.enemyShoot, 0.2); const bulletSpeed = 7; const baseAngle = Math.PI / 2; const angle = baseAngle + this.sweepAngle; const speedX = Math.cos(angle) * bulletSpeed; const speedY = Math.sin(angle) * bulletSpeed; enemyBullets.push(new EnemyBullet(this.x + this.width / 2, this.y + this.height * 0.8, speedX, speedY)); this.sweepAngle += 0.05 * this.sweepDirection; if (this.sweepAngle > Math.PI / 4 || this.sweepAngle < -Math.PI / 4) { this.sweepDirection *= -1; } } fireMine() { playSound(audioAssets.enemyShoot, 0.5); const mineX = this.x + Math.random() * this.width; enemyBullets.push(new MineBullet(mineX, this.y + this.height * 0.7)); } fireCrossfire() { playSound(audioAssets.enemyShoot, 0.2); const bulletSpeed = 8; const angleToPlayerL = Math.atan2(player.y - (this.y + this.height * 0.6), player.x - (this.x + this.width * 0.2)); const angleToPlayerR = Math.atan2(player.y - (this.y + this.height * 0.6), player.x - (this.x + this.width * 0.8)); enemyBullets.push(new EnemyBullet(this.x + this.width * 0.2, this.y + this.height * 0.6, Math.cos(angleToPlayerL) * bulletSpeed, Math.sin(angleToPlayerL) * bulletSpeed)); enemyBullets.push(new EnemyBullet(this.x + this.width * 0.8, this.y + this.height * 0.6, Math.cos(angleToPlayerR) * bulletSpeed, Math.sin(angleToPlayerR) * bulletSpeed)); } fireSpiral() { playSound(audioAssets.enemyShoot, 0.1); const bulletSpeed = 5; for(let j = 0; j < 2; j++){ const angle = this.circularShotIndex * 0.2 + j * Math.PI; const speedX = Math.cos(angle) * bulletSpeed; const speedY = Math.sin(angle) * bulletSpeed; enemyBullets.push(new EnemyBullet(this.x + this.width / 2, this.y + this.height / 2, speedX, speedY)); } const increment = this.bossType === 'FINAL_ENEMY' ? 2 : 1; this.circularShotIndex += increment; } fireBurstSnipe() { playSound(audioAssets.enemyShoot, 0.7); const bulletSpeed = 10; const angleToPlayer = Math.atan2(player.y - (this.y + this.height / 2), player.x - (this.x + this.width / 2)); for(let i = 0; i < 3; i++){ setTimeout(() => { enemyBullets.push(new EnemyBullet(this.x + this.width / 2, this.y + this.height / 2, Math.cos(angleToPlayer) * bulletSpeed, Math.sin(angleToPlayer) * bulletSpeed)); }, i * 100); } } fireCone() { playSound(audioAssets.enemyShoot, 0.8); const bulletSpeed = 6; const angleToPlayer = Math.atan2(player.y - (this.y + this.height * 0.8), player.x - (this.x + this.width / 2)); for(let i = -2; i <= 2; i++){ const angle = angleToPlayer + i * 0.15; enemyBullets.push(new EnemyBullet(this.x + this.width / 2, this.y + this.height * 0.8, Math.cos(angle) * bulletSpeed, Math.sin(angle) * bulletSpeed)); } } summonEnemies() { playSound(audioAssets.powerupBurst); for(let i = 0; i < 2; i++){ const randomType = Math.floor(Math.random() * 5) + 1; if(gameRunning) enemies.push(new Enemy(randomType)); } } fireFinalBurst() { playSound(audioAssets.enemyShoot, 0.6); const bulletSpeed = 9; const angleToPlayer = Math.atan2(player.y - (this.y + this.height / 2), player.x - (this.x + this.width / 2)); for(let i = 0; i < 6; i++){ setTimeout(() => { if (gameRunning) enemyBullets.push(new EnemyBullet(this.x + this.width / 2, this.y + this.height / 2, Math.cos(angleToPlayer) * bulletSpeed, Math.sin(angleToPlayer) * bulletSpeed)); }, i * 80); } } }
    
    // --- Lógica del Juego y Funciones Principales ---
    function resetPlayerStats(fullReset = false) {
        if(fullReset) {
            playerLives = GAME_CONFIG.player.initialLives;
            score = 0; 
            enemyDestroyedCount = 0; 
            bossesDestroyed = 0;
        }
        playerHealth = GAME_CONFIG.player.initialHealth;
        shieldStacks = 0; 
        isInvulnerable = false; 
        burstFireLevel = 0; 
        wingCannonsActive = false; 
        heavyCannonLevel = 0; 
        missileSystemActive = false; 
        missileCharges = 0; 
        homingSidekickActive = false;
        drones = [];
        powerUpSpawnChance = GAME_CONFIG.powerups.spawnChance;
        luckUpOnCooldown = false;
        clearTimeout(heavyCannonTimeout);
        clearTimeout(luckUpTimeout);
        clearInterval(missileChargeInterval);
    }

    function initGame(startProgressionIndex = 0) {
        resetPlayerStats(true);
        enemySpeedMultiplier = 1.0; 
        allowSpawning = true;
        
        [difficultyTimer, asteroidInterval, bossTimer, meteorShowerTimer, aggressiveAsteroidSpawner, waveTimer].forEach(timer => { if(timer) {clearInterval(timer); clearTimeout(timer);} });
        
        difficultyTimer = setInterval(() => { 
            if (gameRunning && !isPaused) { 
                enemySpeedMultiplier += GAME_CONFIG.difficulty.speedMultiplierIncrease; 
            } 
        }, GAME_CONFIG.difficulty.increaseInterval);
        
        player = new Player();
        bullets = []; enemyBullets = []; asteroids = []; enemies = []; explosions = []; smallExplosions = []; stars = []; powerUps = []; bosses = []; missiles = [];
        for (let i = 0; i < 100; i++) stars.push(new Star());
        
        currentBossIndex = startProgressionIndex;
        
        if (applyAllPowerupsCheat) {
            shieldStacks = 3;
            burstFireLevel = 2;
            wingCannonsActive = true;
            missileSystemActive = true;
            missileCharges = GAME_CONFIG.missiles.maxCharges;
            if(!missileChargeInterval) {
                missileChargeInterval = setInterval(() => {
                    if (gameRunning && !isPaused && missileCharges < GAME_CONFIG.missiles.maxCharges) {
                        missileCharges++;
                    }
                }, GAME_CONFIG.missiles.chargeTime);
            }
            applyAllPowerupsCheat = false;
        }

        gameState = 'NORMAL_WAVE';
        handleGameStateChange();
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        gameRunning = true;
        isPaused = false;
        gameLoop();
    }
    
    function spawnWave(count) { for (let i = 0; i < count; i++) { const randomType = Math.floor(Math.random() * 7) + 1; setTimeout(() => { if (gameRunning) enemies.push(new Enemy(randomType)); }, i * 300); } }
    function handleGameStateChange(arg) { switch (gameState) { case 'METEOR_SHOWER': playMusic(audioAssets.bossMusic); clearInterval(asteroidInterval); allowSpawning = false; enemies.forEach(e => e.retreating = true); aggressiveAsteroidSpawner = setInterval(() => { if (gameRunning && !isPaused) asteroids.push(new Asteroid(Math.floor(Math.random() * 2) + 1)); }, 400); meteorShowerTimer = setTimeout(() => { gameState = 'BOSS_FIGHT'; handleGameStateChange(); }, 10000); break; case 'BOSS_FIGHT': clearInterval(aggressiveAsteroidSpawner); let bossType; if (currentBossIndex < bossProgression.length) { bossType = bossProgression[currentBossIndex]; } else { const superIndex = currentBossIndex - bossProgression.length; bossType = superBossProgression[superIndex]; } bosses.push(new Boss(bossType)); break; case 'NORMAL_WAVE': playMusic(audioAssets.backgroundMusic); allowSpawning = true; const chargeCycleDuration = (currentBossIndex >= bossProgression.length) ? GAME_CONFIG.gameplay.superBossChargeCycleDuration : GAME_CONFIG.gameplay.chargeCycleDuration; bossTimer = setInterval(() => { gameState = 'METEOR_SHOWER'; handleGameStateChange(); clearInterval(bossTimer); }, chargeCycleDuration); asteroidInterval = setInterval(() => { if (gameRunning && !isPaused && asteroids.length < 3) { asteroids.push(new Asteroid(Math.floor(Math.random() * 2) + 1)); } }, 12000); const startingEnemies = typeof arg === 'number' ? arg : difficultySettings[difficultyLevel].enemies; spawnWave(startingEnemies); break; } }
    
    function findNearestTarget(fromX, fromY, targetTypes = ['enemies', 'bosses', 'asteroids']) {
        let allTargets = [];
        if (targetTypes.includes('enemies')) allTargets.push(...enemies);
        if (targetTypes.includes('bosses')) allTargets.push(...bosses);
        if (targetTypes.includes('asteroids')) allTargets.push(...asteroids);
        
        if (allTargets.length === 0) return null;

        let nearestTarget = null;
        let minDistanceSq = Infinity;

        allTargets.forEach(target => {
            if (target.health <= 0) return;

            const dx = target.x - fromX;
            const dy = target.y - fromY;
            const distanceSq = dx * dx + dy * dy;

            if (distanceSq < minDistanceSq) {
                minDistanceSq = distanceSq;
                nearestTarget = target;
            }
        });
        return nearestTarget;
    }
    
    function gameLoop() {
        if (!gameRunning || gameState === 'ENDING' || gameState === 'POST_ENDING') {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            return;
        }
        if (isPaused) { requestAnimationFrame(gameLoop); return; }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        let playerSpeedX = 0, playerSpeedY = 0;
        if (keys['arrowleft'] || keys['a']) playerSpeedX = -player.speed;
        if (keys['arrowright'] || keys['d']) playerSpeedX = player.speed;
        if (keys['arrowup'] || keys['w']) playerSpeedY = -player.speed;
        if (keys['arrowdown'] || keys['s']) playerSpeedY = player.speed;

        if (isShooting) player.shoot();

        stars.forEach(s => s.update(playerSpeedX, playerSpeedY));
        player.update();
        bullets.forEach((b, i) => { b.update(); if (b.y + b.height < 0 || b.y > canvas.height) bullets.splice(i, 1); });
        missiles.forEach(m => m.update());
        drones.forEach(d => d.update());
        enemyBullets.forEach((eb, i) => { eb.update(); if (eb.y > canvas.height || eb.life <= 0 || eb.x < -eb.width || eb.x > canvas.width) enemyBullets.splice(i, 1); });
        enemies.forEach((e, i) => { e.update(player); if (e.y > canvas.height + e.height*2 && e.retreating) enemies.splice(i,1); });
        bosses.forEach(b => b.update());
        explosions.forEach((ex, i) => { ex.update(); if (ex.life <= 0) explosions.splice(i, 1); });
        smallExplosions.forEach((ex, i) => { ex.update(); if (ex.life <= 0) smallExplosions.splice(i, 1); });
        powerUps.forEach((p, i) => { p.update(); if (p.y > canvas.height) powerUps.splice(i, 1); });
        asteroids.forEach((a, i) => { a.update(); if (a.y > canvas.height) asteroids.splice(i, 1); });

        handleCollisions();

        stars.forEach(s => s.draw());
        asteroids.forEach(a => a.draw());
        bullets.forEach(b => b.draw());
        missiles.forEach(m => m.draw());
        enemies.forEach(e => e.draw());
        bosses.forEach(b => b.draw());
        powerUps.forEach(p => p.draw());
        player.draw();
        drones.forEach(d => d.draw());
        explosions.forEach(ex => ex.draw());
        smallExplosions.forEach(ex => ex.draw());
        enemyBullets.forEach(eb => eb.draw());

        const fontSize = 24 * scaleFactor;
        ctx.fillStyle = 'white';
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(`Puntaje: ${score}`, 20 * scaleFactor, 40 * scaleFactor);
        ctx.fillText(`Vidas: ${playerLives}`, 20 * scaleFactor, 70 * scaleFactor);
        ctx.fillText(`Salud: ${playerHealth}`, 20 * scaleFactor, 100 * scaleFactor);
        ctx.textAlign = 'right';
        ctx.fillText(`Jefes: ${bossesDestroyed}`, canvas.width - (20 * scaleFactor), 40 * scaleFactor);
        
        if (missileSystemActive && assets.missileIcon) {
            const iconSize = 80 * scaleFactor;
            const gap = 10 * scaleFactor;
            const totalWidth = GAME_CONFIG.missiles.maxCharges * (iconSize + gap);
            for (let i = 0; i < missileCharges; i++) {
                ctx.drawImage(assets.missileIcon, (canvas.width / 2) - (totalWidth / 2) + (i * (iconSize + gap)), canvas.height - (iconSize + gap), iconSize, iconSize);
            }
        }
        
        if (isPaused) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        animationFrameId = requestAnimationFrame(gameLoop);
    }
    
    function togglePause() { isPaused = !isPaused; if (isPaused) { cancelAnimationFrame(animationFrameId); if (audioAssets.backgroundMusic) audioAssets.backgroundMusic.pause(); if (audioAssets.bossMusic) audioAssets.bossMusic.pause(); ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, 0, canvas.width, canvas.height); const pauseMenu = document.createElement('div'); Object.assign(pauseMenu.style, { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: '#fff', zIndex: '100', fontFamily: "'Arial', sans-serif" }); pauseMenu.id = 'pauseMenu'; pauseMenu.innerHTML = `<h1 style="font-size: 3em; color: #00ff00; text-shadow: 2px 2px 4px #000;">PAUSA</h1><button id="resumeButton" style="padding: 15px 30px; font-size: 1.5em; margin: 10px; cursor: pointer;">Seguir</button><button id="exitButton" style="padding: 15px 30px; font-size: 1.5em; margin: 10px; cursor: pointer;">Salir</button>`; gameContainer.appendChild(pauseMenu); document.getElementById('resumeButton').onclick = togglePause; document.getElementById('exitButton').onclick = exitToLobby; } else { if (isMusicOn) { if (gameState === 'NORMAL_WAVE') playMusic(audioAssets.backgroundMusic); else playMusic(audioAssets.bossMusic); } const pauseMenu = document.getElementById('pauseMenu'); if (pauseMenu) gameContainer.removeChild(pauseMenu); gameLoop(); } }
    function exitToLobby() { gameRunning = false; isPaused = false; playMusic(null); [difficultyTimer, asteroidInterval, bossTimer, meteorShowerTimer, aggressiveAsteroidSpawner, missileChargeInterval, luckUpTimeout, waveTimer].forEach(timer => { if(timer) {clearInterval(timer); clearTimeout(timer);} }); const pauseMenu = document.getElementById('pauseMenu'); if (pauseMenu) gameContainer.removeChild(pauseMenu); canvas.style.display = 'none'; lobby.style.display = 'block'; updateLobbyUI(); }
    
    function damagePlayer(amount = 1) {
        if (isInvulnerable) return;

        if (shieldStacks > 0) {
            shieldStacks--;
            playSound(audioAssets.powerupShield);
            isInvulnerable = true;
            setTimeout(() => { isInvulnerable = false; }, 500);
            return;
        }

        playerHealth -= amount;
        playSound(audioAssets.playerDamaged || audioAssets.hit);
        triggerDamageVignette();

        if (playerHealth <= 0) {
            handlePlayerDeath();
        } else {
            isInvulnerable = true;
            setTimeout(() => { isInvulnerable = false; }, 500);
        }
    }

    function handlePlayerDeath() {
        playerLives--;
        playSound(audioAssets.explosionLarge);
        explosions.push(new Explosion(player.x, player.y, player.width));

        if (playerLives <= 0) {
            gameRunning = false;
            playMusic(null);
            [difficultyTimer, asteroidInterval, bossTimer, meteorShowerTimer, aggressiveAsteroidSpawner, missileChargeInterval, luckUpTimeout, waveTimer].forEach(timer => { if (timer) { clearInterval(timer); clearTimeout(timer); } });
            showGameOverScreen();
        } else {
            resetPlayerStats(false);
            player.x = canvas.width / 2 - player.width / 2;
            player.y = canvas.height - 150 * scaleFactor;
            isInvulnerable = true;
            setTimeout(() => { isInvulnerable = false; }, GAME_CONFIG.player.invulnerabilityDuration);
        }
    }

    function triggerDamageVignette() {
        const vignette = document.createElement('div');
        Object.assign(vignette.style, {
            position: 'absolute',
            top: '0', left: '0',
            width: '100vw', height: '100vh',
            boxShadow: 'inset 0 0 150px 50px rgba(255, 0, 0, 0.6)',
            pointerEvents: 'none',
            zIndex: '998',
            opacity: '1',
            transition: 'opacity 0.5s ease-out'
        });
        gameContainer.appendChild(vignette);
        setTimeout(() => {
            vignette.style.opacity = '0';
        }, 100);
        setTimeout(() => {
            if (gameContainer.contains(vignette)) {
                gameContainer.removeChild(vignette);
            }
        }, 600);
    }
    
    function handleCollisions() {
        checkPlayerProjectilesVsTargets();
        checkEnemyProjectilesVsPlayer();
        checkPlayerVsPowerUps();
        checkPlayerVsHazards();
    }

    function checkPlayerProjectilesVsTargets() {
        const projectiles = [...bullets, ...missiles];
        for (let pIndex = projectiles.length - 1; pIndex >= 0; pIndex--) {
            const p = projectiles[pIndex];
            if (!p) continue;
            let targets = [...bosses, ...enemies, ...asteroids];
            for (let tIndex = targets.length - 1; tIndex >= 0; tIndex--) {
                const target = targets[tIndex];
                if (!target) continue;
                
                let hitbox = { x: target.x, y: target.y, width: target.width, height: target.height };
                if (target instanceof Boss) {
                    hitbox.width /= 2;
                    hitbox.height /= 2;
                    hitbox.x = target.x + hitbox.width / 2;
                    hitbox.y = target.y + hitbox.height / 2;
                }

                if (p.x < hitbox.x + hitbox.width && p.x + p.width > hitbox.x && p.y < hitbox.y + hitbox.height && p.y + p.height > hitbox.y) {
                    target.health -= p.damage;
                    playSound(p instanceof Missile ? audioAssets.missileExplosion : audioAssets.hit);
                    explosions.push(new Explosion(p.x, p.y, p instanceof Missile ? 150 * scaleFactor : 30 * scaleFactor));
                    
                    if(bullets.includes(p)) bullets.splice(bullets.indexOf(p), 1);
                    if(missiles.includes(p)) missiles.splice(missiles.indexOf(p), 1);

                    if (target.health <= 0) {
                        handleTargetDestroyed(target);
                    }
                    break; 
                }
            }
        }
    }
    
    function handleTargetDestroyed(target) {
        if (target instanceof Boss) {
            if (target.bossType === 'FINAL_ENEMY') {
                startEndingSequence();
                return;
            }
            createChainedExplosions(target);
            bosses.splice(bosses.indexOf(target), 1);
            bossesDestroyed++;
            currentBossIndex++;
            if (currentBossIndex >= bossProgression.length + superBossProgression.length) {
                currentBossIndex = 0;
            }
            gameState = 'NORMAL_WAVE';
            handleGameStateChange(6);
        } else if (target instanceof Asteroid) {
            playSound(audioAssets.explosionLarge);
            explosions.push(new Explosion(target.x, target.y, target.width));
            asteroids.splice(asteroids.indexOf(target), 1);
        } else if (target instanceof Enemy) {
            playSound(audioAssets.explosionLarge);
            explosions.push(new Explosion(target.x, target.y, target.width));
            enemies.splice(enemies.indexOf(target), 1);
            score++;
            enemyDestroyedCount++;
            
            if (enemyDestroyedCount > 0 && enemyDestroyedCount % 20 === 0) {
                powerUps.push(new PowerUp(target.x, target.y, 'smartBomb'));
            } else if (Math.random() < 0.05 && !luckUpOnCooldown) {
                powerUps.push(new PowerUp(target.x, target.y, 'luckUp'));
                luckUpOnCooldown = true;
                setTimeout(() => { luckUpOnCooldown = false; }, GAME_CONFIG.powerups.luckUpCooldown);
            } else if (Math.random() < powerUpSpawnChance) {
                const rand = Math.random();
                let type = 'shield';
                if (rand < 0.15) type = 'shield';
                else if (rand < 0.30) type = 'rapidFire';
                else if (rand < 0.42) type = 'extraLife';
                else if (rand < 0.54) type = 'wingCannons';
                else if (rand < 0.66) type = 'heavyCannon';
                else type = 'missileSystem';
                powerUps.push(new PowerUp(target.x, target.y, type));
            }

            if (gameState === 'NORMAL_WAVE') {
                spawnEnemies();
            }
        }
    }

    function checkEnemyProjectilesVsPlayer() {
        if (!player || isInvulnerable) return;

        const playerHitboxWidth = player.width / 3;
        const playerHitboxHeight = player.height / 3;
        const playerHitboxX = player.x + playerHitboxWidth;
        const playerHitboxY = player.y + playerHitboxHeight;

        for (let bIndex = enemyBullets.length - 1; bIndex >= 0; bIndex--) {
            const bullet = enemyBullets[bIndex];
            if (bullet.x < playerHitboxX + playerHitboxWidth && bullet.x + bullet.width > playerHitboxX && bullet.y < playerHitboxY + playerHitboxHeight && bullet.y + bullet.height > playerHitboxY) {
                enemyBullets.splice(bIndex, 1);
                smallExplosions.push(new SmallExplosion(bullet.x, bullet.y));
                damagePlayer(1);
                return;
            }
        }
    }

    function checkPlayerVsPowerUps() {
        if (!player) return;
        for (let pIndex = powerUps.length - 1; pIndex >= 0; pIndex--) {
            const powerUp = powerUps[pIndex];
            if (player.x < powerUp.x + powerUp.width && player.x + player.width > powerUp.x && player.y < powerUp.y + powerUp.height && player.y + player.height > powerUp.y) {
                applyPowerUp(powerUp.type);
                powerUps.splice(pIndex, 1);
            }
        }
    }

    function applyPowerUp(type) {
        switch(type) {
            case 'shield': playSound(audioAssets.powerupShield); shieldStacks = Math.min(3, shieldStacks + 1); break;
            case 'rapidFire': playSound(audioAssets.powerupBurst); burstFireLevel = Math.min(2, burstFireLevel + 1); break;
            case 'extraLife': playSound(audioAssets.powerupExtraLife); if (playerLives < GAME_CONFIG.player.maxLives) { playerLives++; } break;
            case 'wingCannons': playSound(audioAssets.powerupWings); wingCannonsActive = true; break;
            case 'heavyCannon': playSound(audioAssets.powerupHeavy); heavyCannonLevel = Math.min(2, heavyCannonLevel + 1); clearTimeout(heavyCannonTimeout); heavyCannonTimeout = setTimeout(() => { heavyCannonLevel = 0; }, GAME_CONFIG.player.heavyCannonDuration); break;
            case 'missileSystem': playSound(audioAssets.powerupMissile); if (!missileSystemActive) { missileSystemActive = true; missileChargeInterval = setInterval(() => { if (gameRunning && !isPaused && missileCharges < GAME_CONFIG.missiles.maxCharges) { missileCharges++; } }, GAME_CONFIG.missiles.chargeTime); } if (missileCharges < GAME_CONFIG.missiles.maxCharges) missileCharges++; break;
            case 'sidekick': playSound(audioAssets.powerupSidekick); homingSidekickActive = true; break;
            case 'smartBomb': playSound(audioAssets.bombExplode); enemies.forEach(e => { explosions.push(new Explosion(e.x, e.y, e.width)); score++; }); enemies = []; triggerScreenFlash(); spawnWave(4); break;
            case 'luckUp': playSound(audioAssets.powerupLuck); powerUpSpawnChance = GAME_CONFIG.powerups.luckUpChance; clearTimeout(luckUpTimeout); luckUpTimeout = setTimeout(() => { powerUpSpawnChance = GAME_CONFIG.powerups.spawnChance; }, GAME_CONFIG.powerups.luckUpDuration); break;
            case 'drone': playSound(audioAssets.powerupDrone); if(drones.length < GAME_CONFIG.drones.maxDrones) { const angleOffset = drones.length > 0 ? drones[0].angle + Math.PI : 0; drones.push(new Drone(player, angleOffset)); } break;
        }
    }

    function checkPlayerVsHazards() {
        if (!player || isInvulnerable) return;

        const playerHitboxWidth = player.width / 3;
        const playerHitboxHeight = player.height / 3;
        const playerHitboxX = player.x + playerHitboxWidth;
        const playerHitboxY = player.y + playerHitboxHeight;

        for (let i = asteroids.length - 1; i >= 0; i--) {
            const asteroid = asteroids[i];
            if (playerHitboxX < asteroid.x + asteroid.width && playerHitboxX + playerHitboxWidth > asteroid.x && playerHitboxY < asteroid.y + asteroid.height && playerHitboxY + playerHitboxHeight > asteroid.y) {
                playSound(audioAssets.explosionLarge);
                explosions.push(new Explosion(asteroid.x, asteroid.y, asteroid.width));
                asteroids.splice(i, 1);
                damagePlayer(GAME_CONFIG.player.maxHealth);
                return;
            }
        }

        for (let i = bosses.length - 1; i >= 0; i--) {
            const boss = bosses[i];
            const bossHitboxWidth = boss.width / 2;
            const bossHitboxHeight = boss.height / 2;
            const bossHitboxX = boss.x + (boss.width - bossHitboxWidth) / 2;
            const bossHitboxY = boss.y + (boss.height - bossHitboxHeight) / 2;
            if (playerHitboxX < bossHitboxX + bossHitboxWidth && playerHitboxX + playerHitboxWidth > bossHitboxX && playerHitboxY < bossHitboxY + bossHitboxHeight && playerHitboxY + playerHitboxHeight > bossHitboxY) {
                damagePlayer(1);
                return;
            }
        }
    }
    
    function createChainedExplosions(target, isIntro = false) { playSound(audioAssets.bossExplosion || audioAssets.explosionLarge); const numExplosions = isIntro ? 20 : 15; for (let i = 0; i < numExplosions; i++) { setTimeout(() => { const exX = target.x + Math.random() * target.width; const exY = target.y + Math.random() * target.height; const exSize = (Math.random() * 0.4 + 0.2) * target.width; explosions.push(new Explosion(exX, exY, exSize)); if(i % 3 === 0) playSound(audioAssets.explosionLarge, 0.5); }, i * 80); } }
    function spawnEnemies() { if(!allowSpawning) return; const enemiesToSpawn = (enemyDestroyedCount > 0 && enemyDestroyedCount % 3 === 0) ? 2 : 1; for (let i = 0; i < enemiesToSpawn; i++) { const randomType = Math.floor(Math.random() * 7) + 1; if (randomType === 7) { setTimeout(() => { if(gameRunning) enemies.push(new Enemy(7)); }, 500); break; } else { setTimeout(() => { if(gameRunning) enemies.push(new Enemy(randomType)); }, 500); } } }
    function triggerScreenFlash(duration = 240, intensity = 0.7) { const flash = document.createElement('div'); Object.assign(flash.style, { position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: '999', pointerEvents: 'none', transition: 'background-color 0.05s' }); gameContainer.appendChild(flash); setTimeout(() => { flash.style.backgroundColor = `rgba(255, 255, 255, ${intensity})`; }, 0); setTimeout(() => { flash.style.backgroundColor = 'rgba(0, 0, 0, 0)'; }, duration / 2); setTimeout(() => { if (gameContainer.contains(flash)) { gameContainer.removeChild(flash); } }, duration); }
    function showGameOverScreen() { const highScore = localStorage.getItem('spaceShooterHighScore') || 0; if (score > highScore) { localStorage.setItem('spaceShooterHighScore', score); } const bossHighScore = localStorage.getItem('spaceShooterBossHighScore') || 0; if (bossesDestroyed > bossHighScore) { localStorage.setItem('spaceShooterBossHighScore', bossesDestroyed); } const gameOverDiv = document.createElement('div'); gameOverDiv.id = 'gameOverScreen'; Object.assign(gameOverDiv.style, { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: '#fff', backgroundColor: 'rgba(0, 0, 0, 0.8)', padding: '40px', borderRadius: '10px', zIndex: '100' }); gameOverDiv.innerHTML = ` <h1 style="color: #ff4444; font-size: 3.5em;">GAME OVER</h1> <p style="font-size: 1.8em;">Tu puntaje: ${score}</p> <p style="font-size: 1.2em;">Puntaje Máximo: ${localStorage.getItem('spaceShooterHighScore') || 0}</p> <p style="font-size: 1.2em; color: #ffaa00;">Récord de Jefes: ${localStorage.getItem('spaceShooterBossHighScore') || 0}</p> <button id="restartButton">Volver al Menú</button> `; gameContainer.appendChild(gameOverDiv); const restartButton = document.getElementById('restartButton'); Object.assign(restartButton.style, { padding: '15px 30px', fontSize: '1.5em', cursor: 'pointer', backgroundColor: '#00ff00', color: '#000', border: 'none', borderRadius: '5px', marginTop: '20px' }); restartButton.onclick = () => { gameContainer.removeChild(gameOverDiv); lobby.style.display = 'block'; canvas.style.display = 'none'; updateLobbyUI(); }; }
    
    let endingState = { currentImage: 0, alpha: 0, phase: 'exploding', timer: 0 }; const endingTitles = [ "Space Pyramid Warrior Vs The Incectisoids from the 9th Dimension", "Producido por Zowie Pixel Arts", "Creación del Juego Javier Poggi", "Gracias por Jugar (˶˃ ᵕ ˂˶)" ]; function startEndingSequence() { playMusic(audioAssets.endingMusic); gameState = 'ENDING'; gameRunning = false; enemies = []; enemyBullets = []; asteroids = []; bosses = []; powerUps = []; let flashCount = 0; const flashInterval = setInterval(() => { triggerScreenFlash(150, 0.5); flashCount++; if (flashCount > 9) clearInterval(flashInterval); }, 200); setTimeout(() => { for (let i = 0; i < 5; i++) { setTimeout(() => { const exX = Math.random() * canvas.width; const exY = Math.random() * canvas.height; explosions.push(new Explosion(exX, exY, Math.random() * 200 + 100)); }, i * 100); } }, 1000); endingState = { currentImage: 1, alpha: 0, phase: 'fade-in', timer: Date.now() }; setTimeout(() => requestAnimationFrame(endingLoop), 3000); } function endingLoop() { if (gameState !== 'ENDING' && gameState !== 'POST_ENDING') return; ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height); stars.forEach(s => { s.update(0,0); s.draw(); }); explosions.forEach((ex, i) => { ex.update(); if (ex.life <= 0) explosions.splice(i, 1); else ex.draw(); }); const img = assets[`ending${endingState.currentImage}`]; if (img && gameState === 'ENDING') { const elapsedTime = Date.now() - endingState.timer; if (endingState.phase === 'fade-in') { endingState.alpha = Math.min(1, elapsedTime / 3000); if (endingState.alpha >= 1) { endingState.phase = 'hold'; endingState.timer = Date.now(); } } else if (endingState.phase === 'hold') { if (elapsedTime > 4000) { endingState.phase = 'fade-out'; endingState.timer = Date.now(); } } else if (endingState.phase === 'fade-out') { endingState.alpha = Math.max(0, 1 - (elapsedTime / 3000)); if (endingState.alpha <= 0) { endingState.currentImage++; if (assets[`ending${endingState.currentImage}`]) { endingState.phase = 'fade-in'; endingState.timer = Date.now(); } else { gameState = 'POST_ENDING'; for (let i = 0; i < 5; i++) { setTimeout(() => { const exX = Math.random() * canvas.width; const exY = Math.random() * canvas.height; explosions.push(new Explosion(exX, exY, Math.random() * 250 + 50)); }, i * 100); } setTimeout(showVictoryScreen, 3000); } } } ctx.globalAlpha = endingState.alpha; const scale = Math.min(canvas.width / img.width, canvas.height / img.height); const w = img.width * scale; const h = img.height * scale; ctx.drawImage(img, canvas.width/2 - w/2, canvas.height/2 - h/2, w, h); const titleIndex = endingState.currentImage - 1; if (endingTitles[titleIndex]) { const title = endingTitles[titleIndex]; ctx.fillStyle = 'white'; ctx.textAlign = 'center'; const fontSize = (titleIndex === 0) ? Math.max(24, Math.floor(canvas.width / 45)) : Math.max(32, Math.floor(canvas.width / 40)); ctx.font = `bold ${fontSize}px Arial`; ctx.shadowColor = 'black'; ctx.shadowBlur = 10; ctx.fillText(title, canvas.width / 2, canvas.height * 0.85); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; } ctx.globalAlpha = 1; } requestAnimationFrame(endingLoop); } function showVictoryScreen() { const victoryDiv = document.createElement('div'); victoryDiv.id = 'victoryScreen'; Object.assign(victoryDiv.style, { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: '#fff', backgroundColor: 'rgba(0, 20, 0, 0.8)', padding: '40px', borderRadius: '10px', zIndex: '100', border: '2px solid #00ff00' }); victoryDiv.innerHTML = ` <h1 style="color: #00ff00; font-size: 3.5em; text-shadow: 2px 2px 8px #0f0;">¡VICTORIA!</h1> <p style="font-size: 1.8em;">Has derrotado a los insectoides de la 9ª Dimensión.</p> <p style="font-size: 1.5em;">Puntaje Final: ${score}</p> <button id="restartButton">Volver al Menú</button> `; gameContainer.appendChild(victoryDiv); const restartButton = document.getElementById('restartButton'); Object.assign(restartButton.style, { padding: '15px 30px', fontSize: '1.5em', cursor: 'pointer', backgroundColor: '#00ff00', color: '#000', border: 'none', borderRadius: '5px', marginTop: '20px' }); restartButton.onclick = () => { gameContainer.removeChild(victoryDiv); lobby.style.display = 'block'; canvas.style.display = 'none'; updateLobbyUI(); }; }
    
    // --- Lógica de Inicio y Menús ---
    async function startGame(startProgressionIndex = 0) { lobby.innerHTML = '<h1>Cargando...</h1>'; try { await preloadAssets(); lobby.style.display = 'none'; canvas.style.display = 'block'; if (isTouchDevice()) setupTouchControls(); initGame(startProgressionIndex); } catch (error) { lobby.innerHTML = `<h1>Error al cargar imágenes</h1><p>${error}</p>`; console.error("Error durante la precarga de assets:", error); } }
    function updateLobbyUI() { playMusic(audioAssets.introMusic); const bossHighScore = localStorage.getItem('spaceShooterBossHighScore') || 0; const highScore = localStorage.getItem('spaceShooterHighScore') || 0; lobby.innerHTML = ` <h1 style="font-size: 2.5em; line-height: 1.2; margin-bottom: 20px;">Space Pyramid Warrior Vs the Insectoids From 9th Dimension</h1> <h2>Puntaje Máximo: <span style="color: #00ff00;">${highScore}</span></h2> <h3>Récord de Jefes: <span style="color: #ffaa00;">${bossHighScore}</span></h3> <div id="difficultySelector" style="margin: 20px 0; color: #00ff00;"></div> <div id="soundControls" style="margin: 20px 0;"></div> <button id="startButton" style="margin-top: 20px;">¡Comenzar Juego!</button> <div id="cheatContainer" style="margin-top: 40px; border-top: 1px solid #333; padding-top: 20px;"></div> `; lobby.querySelector('#startButton').addEventListener('click', () => startGame()); const difficultyContainer = lobby.querySelector('#difficultySelector'); const difficultyLabel = document.createElement('label'); difficultyLabel.htmlFor = 'difficultySlider'; difficultyLabel.id = 'difficultyLabel'; difficultyLabel.style.display = 'block'; difficultyLabel.style.marginBottom = '10px'; difficultyLabel.style.fontSize = '1.2em'; const difficultySlider = document.createElement('input'); difficultySlider.type = 'range'; difficultySlider.id = 'difficultySlider'; difficultySlider.min = 0; difficultySlider.max = 5; difficultySlider.value = difficultyLevel; difficultyLabel.textContent = `Dificultad: ${difficultySettings[difficultyLevel].name}`; difficultySlider.addEventListener('input', (e) => { difficultyLevel = parseInt(e.target.value); lobby.querySelector('#difficultyLabel').textContent = `Dificultad: ${difficultySettings[difficultyLevel].name}`; }); difficultyContainer.appendChild(difficultyLabel); difficultyContainer.appendChild(difficultySlider); const soundControls = lobby.querySelector('#soundControls'); const musicButton = document.createElement('button'); musicButton.textContent = `Música: ${isMusicOn ? 'ON' : 'OFF'}`; musicButton.onclick = () => { isMusicOn = !isMusicOn; musicButton.textContent = `Música: ${isMusicOn ? 'ON' : 'OFF'}`; if(!isMusicOn){ playMusic(null); } else { playMusic(audioAssets.introMusic); } }; const sfxButton = document.createElement('button'); sfxButton.textContent = `SFX: ${isSfxOn ? 'ON' : 'OFF'}`; sfxButton.onclick = () => { isSfxOn = !isSfxOn; sfxButton.textContent = `SFX: ${isSfxOn ? 'ON' : 'OFF'}`; }; [musicButton, sfxButton].forEach(btn => { Object.assign(btn.style, { padding: '10px 20px', fontSize: '1em', cursor: 'pointer', backgroundColor: '#333', color: '#fff', border: '1px solid #fff', borderRadius: '5px', margin: '0 10px' }); soundControls.appendChild(btn); }); const createSlider = (labelText, volumeVar, callback) => { const container = document.createElement('div'); container.style.marginTop = '15px'; const label = document.createElement('label'); label.textContent = labelText; label.style.marginRight = '10px'; const slider = document.createElement('input'); slider.type = 'range'; slider.min = '0'; slider.max = '1'; slider.step = '0.05'; slider.value = volumeVar; slider.addEventListener('input', callback); container.appendChild(label); container.appendChild(slider); return container; }; const musicSlider = createSlider('Volumen Música:', musicVolume, (e) => { musicVolume = parseFloat(e.target.value); if (audioAssets.introMusic && !audioAssets.introMusic.paused) { audioAssets.introMusic.volume = musicVolume; } }); const sfxSlider = createSlider('Volumen SFX:', sfxVolume, (e) => { sfxVolume = parseFloat(e.target.value); }); soundControls.appendChild(musicSlider); soundControls.appendChild(sfxSlider); const cheatContainer = lobby.querySelector('#cheatContainer'); const cheatToggleButton = document.createElement('button'); cheatToggleButton.textContent = `Cheat Mode: ${cheatModeActive ? 'ON' : 'OFF'}`; Object.assign(cheatToggleButton.style, { backgroundColor: cheatModeActive ? '#ff4444' : '#555', color: '#fff', border: 'none', padding: '10px 20px', cursor: 'pointer', borderRadius: '5px', marginBottom: '10px' }); cheatToggleButton.onclick = () => { cheatModeActive = !cheatModeActive; updateLobbyUI(); }; cheatContainer.appendChild(cheatToggleButton); if (cheatModeActive) { const cheatButtonsContainer = document.createElement('div'); cheatButtonsContainer.style.marginTop = '15px'; const createCheatButton = (text, index, isToggle = false) => { const button = document.createElement('button'); button.textContent = text; Object.assign(button.style, { margin: '5px', padding: '8px 12px', cursor: 'pointer', backgroundColor: '#8a2be2', color: 'white', border: 'none', borderRadius: '3px' }); if (isToggle) { button.style.backgroundColor = applyAllPowerupsCheat ? '#00ff00' : '#8a2be2'; button.onclick = () => { applyAllPowerupsCheat = !applyAllPowerupsCheat; updateLobbyUI(); }; } else { button.onclick = () => startFromCheat(index); } cheatButtonsContainer.appendChild(button); }; createCheatButton(`Empezar con Todo: ${applyAllPowerupsCheat ? 'ON' : 'OFF'}`, 0, true); createCheatButton('Super-Boss 1', bossProgression.length); createCheatButton('Super-Boss 2', bossProgression.length + 1); createCheatButton('Super-Boss 3', bossProgression.length + 2); createCheatButton('Super-Boss 4', bossProgression.length + 3); createCheatButton('Giga-Boss', bossProgression.length + 4); createCheatButton('Final Boss', bossProgression.length + 5); cheatContainer.appendChild(cheatButtonsContainer); } }
    async function startFromCheat(progressionJumpIndex) { lobby.innerHTML = '<h1>Cargando...</h1>'; try { await preloadAssets(); if (isTouchDevice()) setupTouchControls(); initGame(progressionJumpIndex); gameState = 'METEOR_SHOWER'; handleGameStateChange(); lobby.style.display = 'none'; canvas.style.display = 'block'; } catch (error) { console.error("Error al iniciar con truco:", error); } }
    let introStartTime; async function initIntro() { appState = 'INTRO'; startScreen.style.display = 'none'; canvas.style.display = 'block'; await Promise.all([preloadAssets(), preloadAudio()]); introStartTime = Date.now(); playMusic(audioAssets.introMusic); introLoop(); }
    function introLoop() { if (appState !== 'INTRO') return; const elapsedTime = Date.now() - introStartTime; ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height); if (assets.introScreen) { if (elapsedTime < 10000) { ctx.globalAlpha = (elapsedTime < 5000) ? (elapsedTime / 5000) : 1; } else if (elapsedTime < 11000) { ctx.globalAlpha = 1 - (elapsedTime - 10000) / 1000; if (elapsedTime % 200 < 50) { ctx.fillStyle = 'white'; ctx.fillRect(0,0,canvas.width, canvas.height); } if (!explosions.length) { createChainedExplosions({x: canvas.width/2, y: canvas.height/2, width: canvas.width, height: canvas.height}, true); } } else { appState = 'LOBBY'; canvas.style.display = 'none'; lobby.style.display = 'block'; updateLobbyUI(); return; } const img = assets.introScreen; const startScale = 0.30; const endScale = 0.95; const animationDuration = 10000; let currentScale = startScale + (endScale - startScale) * (elapsedTime / animationDuration); currentScale = Math.min(currentScale, endScale); const newWidth = img.width * currentScale; const newHeight = img.height * currentScale; ctx.drawImage(img, canvas.width / 2 - newWidth / 2, canvas.height / 2 - newHeight / 2, newWidth, newHeight); ctx.globalAlpha = 1; } explosions.forEach((ex, i) => { ex.update(); ex.draw(); if (ex.life <= 0) explosions.splice(i, 1); }); requestAnimationFrame(introLoop); }
    
    // --- Manejo de Controles ---
    function launchMissile() {
        if (player && gameRunning && !isPaused && missileCharges > 0) {
            const target = findNearestTarget(player.x, player.y);
            if (target) {
                missiles.push(new Missile(player.x + player.width / 2 - (10 * scaleFactor), player.y, target));
                missileCharges--;
                playSound(audioAssets.missileLaunch);
            }
        }
    }

    window.addEventListener('keydown', (e) => { const key = e.key.toLowerCase(); keys[key] = true; if (key === ' ' && player && gameRunning && !isPaused) { player.shoot(); } if (key === 'control' && player && gameRunning && !isPaused) { e.preventDefault(); launchMissile(); } if (key === 'escape' && gameRunning) { togglePause(); } });
    window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
    
    let touchMoveX = 0, touchMoveY = 0, isShooting = false;

    function isTouchDevice() {
        return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    }

    function setupTouchControls() {
        const joystick = document.createElement('div');
        joystick.id = 'joystick';
        const stick = document.createElement('div');
        stick.id = 'stick';
        joystick.appendChild(stick);
        gameContainer.appendChild(joystick);

        const actionButton = document.createElement('div');
        actionButton.id = 'actionButton';
        actionButton.className = 'touch-button';
        gameContainer.appendChild(actionButton);

        const missileButton = document.createElement('div');
        missileButton.id = 'missileButton';
        missileButton.className = 'touch-button';
        gameContainer.appendChild(missileButton);

        let joystickActive = false;
        let joystickStartX, joystickStartY;
        joystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            joystickActive = true;
            const touch = e.changedTouches[0];
            joystickStartX = touch.clientX;
            joystickStartY = touch.clientY;
        }, { passive: false });

        joystick.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!joystickActive) return;
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - joystickStartX;
            const deltaY = touch.clientY - joystickStartY;
            const maxDistance = joystick.offsetWidth / 3;
            const angle = Math.atan2(deltaY, deltaX);
            const distance = Math.hypot(deltaX, deltaY);

            const limitedDistance = Math.min(distance, maxDistance);
            const stickX = Math.cos(angle) * limitedDistance;
            const stickY = Math.sin(angle) * limitedDistance;
            
            stick.style.transform = `translate(${stickX}px, ${stickY}px)`;
            
            touchMoveX = (deltaX / maxDistance);
            touchMoveY = (deltaY / maxDistance);
            touchMoveX = Math.max(-1, Math.min(1, touchMoveX));
            touchMoveY = Math.max(-1, Math.min(1, touchMoveY));
        }, { passive: false });
        
        const resetJoystick = () => {
            joystickActive = false;
            stick.style.transform = 'translate(0, 0)';
            touchMoveX = 0;
            touchMoveY = 0;
        };
        joystick.addEventListener('touchend', resetJoystick);
        joystick.addEventListener('touchcancel', resetJoystick);

        actionButton.addEventListener('touchstart', (e) => { e.preventDefault(); isShooting = true; }, { passive: false });
        actionButton.addEventListener('touchend', () => { isShooting = false; });
        missileButton.addEventListener('touchstart', (e) => { e.preventDefault(); launchMissile(); }, { passive: false });
    }

    initButton.onclick = initIntro;
});
