import { ZOMBIE_TYPES, GAME_CONFIG } from '../gameConfig.js';

export class ZombieSystem {
    constructor(scene) {
        this.scene = scene;
        this.baseSpawnInterval = GAME_CONFIG.ZOMBIE_SPAWN_INTERVAL;
        this.currentSpawnMultiplier = 1.0;
        this.eliteZombieSpawned = false;
        
        this.setupZombieSpawning();
    }

    setupZombieSpawning() {
        // Setup zombie spawning timer
        this.zombieSpawnTimer = this.scene.time.addEvent({
            delay: GAME_CONFIG.ZOMBIE_SPAWN_INTERVAL,
            callback: this.spawnZombie,
            callbackScope: this,
            loop: true
        });

        // Spawn initial zombies immediately
        this.spawnInitialZombies();
    }

    spawnZombie() {
        const gameTime = this.scene.time.now - this.scene.gameStartTime;

        // Check for guaranteed elite zombie spawn at 15 seconds
        if (!this.eliteZombieSpawned && gameTime >= 15000) {
            this.eliteZombieSpawned = true;
            const eliteType = ZOMBIE_TYPES.elite_fast;
            this.createZombieAtEdge(eliteType);
            return;
        }

        // Select zombie type based on spawn weights and time restrictions
        const zombieTypeConfig = this.selectZombieType(gameTime);
        this.createZombieAtEdge(zombieTypeConfig);
    }

    createZombieAtEdge(zombieTypeConfig) {
        // Calculate spawn position at screen edge
        const screenWidth = this.scene.cameras.main.width;
        const screenHeight = this.scene.cameras.main.height;
        const playerX = this.scene.player.x;
        const playerY = this.scene.player.y;

        // Choose random edge
        const edge = Phaser.Math.Between(0, 3);
        let spawnX, spawnY;

        switch (edge) {
            case 0: // Top
                spawnX = Phaser.Math.Between(playerX - screenWidth/2, playerX + screenWidth/2);
                spawnY = playerY - screenHeight/2 - GAME_CONFIG.SPAWN_DISTANCE;
                break;
            case 1: // Right
                spawnX = playerX + screenWidth/2 + GAME_CONFIG.SPAWN_DISTANCE;
                spawnY = Phaser.Math.Between(playerY - screenHeight/2, playerY + screenHeight/2);
                break;
            case 2: // Bottom
                spawnX = Phaser.Math.Between(playerX - screenWidth/2, playerX + screenWidth/2);
                spawnY = playerY + screenHeight/2 + GAME_CONFIG.SPAWN_DISTANCE;
                break;
            case 3: // Left
                spawnX = playerX - screenWidth/2 - GAME_CONFIG.SPAWN_DISTANCE;
                spawnY = Phaser.Math.Between(playerY - screenHeight/2, playerY + screenHeight/2);
                break;
        }

        // Create zombie at calculated position
        const zombie = this.scene.zombies.create(spawnX, spawnY, zombieTypeConfig.spriteKey);

        // Configure zombie physics
        zombie.setSize(
            GAME_CONFIG.PHYSICS_BOXES.zombie.width,
            GAME_CONFIG.PHYSICS_BOXES.zombie.height
        );

        // Center the collision box on the sprite
        const offsetX = (zombie.width * GAME_CONFIG.GLOBAL_SCALE - GAME_CONFIG.PHYSICS_BOXES.zombie.width) / 2;
        const offsetY = (zombie.height * GAME_CONFIG.GLOBAL_SCALE - GAME_CONFIG.PHYSICS_BOXES.zombie.height) / 2;
        zombie.body.setOffset(offsetX, offsetY);

        zombie.setCollideWorldBounds(true);

        // Set zombie properties from config
        zombie.zombieTypeConfig = zombieTypeConfig;
        zombie.health = zombieTypeConfig.maxHealth;
        zombie.maxHealth = zombieTypeConfig.maxHealth;
        zombie.speed = zombieTypeConfig.speed;

        // Create health bar
        this.createZombieHealthBar(zombie);

        // Add red glow effect for elite_fast zombies
        if (zombieTypeConfig.hasRedGlow) {
            this.createRedGlowEffect(zombie);
        }

        console.log(`${zombieTypeConfig.description} spawned:`, {
            position: { x: spawnX, y: spawnY },
            physicsSize: { width: zombie.body.width, height: zombie.body.height },
            health: zombie.health,
            speed: zombie.speed,
            type: zombieTypeConfig.id
        });

        return zombie;
    }

    selectZombieType(gameTime = 0) {
        // Filter zombie types based on time restrictions
        const availableTypes = Object.values(ZOMBIE_TYPES).filter(type => {
            // If zombie has minSpawnTime, check if enough time has passed
            if (type.minSpawnTime && gameTime < type.minSpawnTime) {
                return false;
            }
            return true;
        });

        // Calculate total weight from available types
        const totalWeight = availableTypes.reduce((sum, type) => sum + type.spawnWeight, 0);

        // Generate random number
        let random = Math.random() * totalWeight;

        // Select zombie type based on weight
        for (const zombieType of availableTypes) {
            random -= zombieType.spawnWeight;
            if (random <= 0) {
                return zombieType;
            }
        }

        // Fallback to first available type
        return availableTypes[0] || Object.values(ZOMBIE_TYPES)[0];
    }

    spawnInitialZombies() {
        // Spawn 3-5 zombies in each direction (top, bottom, left, right)
        const screenWidth = this.scene.cameras.main.width;
        const screenHeight = this.scene.cameras.main.height;
        const playerX = this.scene.player.x;
        const playerY = this.scene.player.y;
        
        // Define spawn areas around the player
        const spawnAreas = [
            // Top side (3-5 zombies)
            {
                direction: 'top',
                count: Phaser.Math.Between(3, 5),
                getPosition: () => ({
                    x: Phaser.Math.Between(playerX - screenWidth/2, playerX + screenWidth/2),
                    y: playerY - screenHeight/2 - 50
                })
            },
            // Bottom side (3-5 zombies)
            {
                direction: 'bottom', 
                count: Phaser.Math.Between(3, 5),
                getPosition: () => ({
                    x: Phaser.Math.Between(playerX - screenWidth/2, playerX + screenWidth/2),
                    y: playerY + screenHeight/2 + 50
                })
            },
            // Left side (3-5 zombies)
            {
                direction: 'left',
                count: Phaser.Math.Between(3, 5),
                getPosition: () => ({
                    x: playerX - screenWidth/2 - 50,
                    y: Phaser.Math.Between(playerY - screenHeight/2, playerY + screenHeight/2)
                })
            },
            // Right side (3-5 zombies)
            {
                direction: 'right',
                count: Phaser.Math.Between(3, 5), 
                getPosition: () => ({
                    x: playerX + screenWidth/2 + 50,
                    y: Phaser.Math.Between(playerY - screenHeight/2, playerY + screenHeight/2)
                })
            }
        ];

        // Spawn zombies for each area
        spawnAreas.forEach(area => {
            for (let i = 0; i < area.count; i++) {
                const pos = area.getPosition();
                
                // Only spawn normal and fast zombies initially (no elite)
                const initialZombieTypes = ['normal', 'fast'];
                const randomType = Phaser.Utils.Array.GetRandom(initialZombieTypes);
                const zombieTypeConfig = ZOMBIE_TYPES[randomType];
                
                // Create zombie at calculated position
                const zombie = this.scene.zombies.create(pos.x, pos.y, zombieTypeConfig.spriteKey);
                
                // Configure zombie properties
                zombie.setSize(
                    GAME_CONFIG.PHYSICS_BOXES.zombie.width,
                    GAME_CONFIG.PHYSICS_BOXES.zombie.height
                );
                zombie.zombieType = zombieTypeConfig.id;
                zombie.zombieTypeConfig = zombieTypeConfig; // Store full config for health bar
                zombie.health = zombieTypeConfig.maxHealth;
                zombie.maxHealth = zombieTypeConfig.maxHealth;
                zombie.speed = zombieTypeConfig.speed;
                
                // Create health bar
                this.createZombieHealthBar(zombie);
                
                console.log(`Initial ${zombieTypeConfig.description} spawned from ${area.direction}:`, {
                    position: pos,
                    type: zombieTypeConfig.id
                });
            }
        });
    }

    updateZombies() {
        // Move zombies toward player using Phaser's built-in physics
        this.scene.zombies.children.entries.forEach(zombie => {
            if (zombie.active) {
                // Calculate direction to player
                const angle = Phaser.Math.Angle.Between(
                    zombie.x, zombie.y,
                    this.scene.player.x, this.scene.player.y
                );

                // Set velocity based on zombie speed
                const speed = zombie.speed * GAME_CONFIG.GLOBAL_SCALE;
                zombie.setVelocity(
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed
                );

                // Update health bar position if it exists
                if (zombie.healthBarBg) {
                    this.updateZombieHealthBar(zombie);
                }

                // Update red glow position for elite zombies
                if (zombie.redGlowRings) {
                    zombie.redGlowRings.forEach(ring => {
                        ring.x = zombie.x;
                        ring.y = zombie.y;
                    });
                }
            }
        });
    }

    updateSpawnSpeed() {
        const gameTime = this.scene.time.now - this.scene.gameStartTime;
        const gameTimeSeconds = gameTime / 1000;
        
        // Start increasing spawn speed after 1 minute (60 seconds)
        if (gameTimeSeconds >= 60) {
            // Calculate how many 30-second intervals have passed since 60 seconds
            const intervalsElapsed = Math.floor((gameTimeSeconds - 60) / 30);
            
            // Calculate new spawn multiplier: 1.3^intervals, capped at 3.0x
            const newMultiplier = Math.min(3.0, Math.pow(1.3, intervalsElapsed));
            
            // Only update if multiplier has changed significantly
            if (Math.abs(newMultiplier - this.currentSpawnMultiplier) > 0.01) {
                this.currentSpawnMultiplier = newMultiplier;
                
                // Update spawn timer with new interval
                const newInterval = this.baseSpawnInterval / this.currentSpawnMultiplier;
                
                if (this.zombieSpawnTimer) {
                    this.zombieSpawnTimer.destroy();
                    this.zombieSpawnTimer = this.scene.time.addEvent({
                        delay: newInterval,
                        callback: this.spawnZombie,
                        callbackScope: this,
                        loop: true
                    });
                }
                
                console.log(`Spawn speed increased! Multiplier: ${this.currentSpawnMultiplier.toFixed(2)}x, Interval: ${newInterval}ms`);
                
                // Show notification
                this.scene.showNotification('More zombies are approaching!');
            }
        }
    }

    createZombieHealthBar(zombie) {
        // Get health bar properties from zombie type config
        const config = zombie.zombieTypeConfig;
        const bgWidth = GAME_CONFIG.ZOMBIE_HEALTH_BAR_WIDTH * GAME_CONFIG.GLOBAL_SCALE * config.healthBarWidthMultiplier;
        const bgHeight = GAME_CONFIG.ZOMBIE_HEALTH_BAR_HEIGHT * GAME_CONFIG.GLOBAL_SCALE;

        zombie.healthBarBg = this.scene.add.rectangle(
            zombie.x,
            zombie.y - 35 * GAME_CONFIG.GLOBAL_SCALE,
            bgWidth,
            bgHeight,
            0x000000
        );

        zombie.healthBar = this.scene.add.rectangle(
            zombie.x,
            zombie.y - 35 * GAME_CONFIG.GLOBAL_SCALE,
            bgWidth,
            bgHeight,
            config.healthBarColor
        );

        // Set depth to appear above zombies
        zombie.healthBarBg.setDepth(2);
        zombie.healthBar.setDepth(3);
    }

    updateZombieHealthBar(zombie) {
        if (zombie.healthBar && zombie.healthBarBg) {
            const config = zombie.zombieTypeConfig;
            const bgWidth = GAME_CONFIG.ZOMBIE_HEALTH_BAR_WIDTH * GAME_CONFIG.GLOBAL_SCALE * config.healthBarWidthMultiplier;
            
            // Update position
            const barY = zombie.y - 35 * GAME_CONFIG.GLOBAL_SCALE;
            zombie.healthBarBg.setPosition(zombie.x, barY);
            zombie.healthBar.setPosition(zombie.x, barY);
            
            // Update health bar width based on current health
            const healthPercent = zombie.health / zombie.maxHealth;
            const healthWidth = bgWidth * healthPercent;
            zombie.healthBar.setSize(healthWidth, zombie.healthBar.height);
        }
    }

    createRedGlowEffect(zombie) {
        // Create multiple layered glow effects for more intensity
        const baseRadius = 35 * GAME_CONFIG.GLOBAL_SCALE;
        zombie.redGlowRings = [];
        
        // Create 3 pulsing glow rings for layered effect
        for (let i = 0; i < 3; i++) {
            const glowRing = this.scene.add.circle(
                zombie.x, 
                zombie.y, 
                baseRadius + (i * 8), // Varying sizes
                0xFF0000, 
                0.15 + (i * 0.05)  // Varying opacity (0.15, 0.2, 0.25)
            );
            
            // Set depth to appear behind zombie but above background
            glowRing.setDepth(-1);
            
            // Create pulsing animation with different phases
            this.scene.tweens.add({
                targets: glowRing,
                scaleX: 1.3,
                scaleY: 1.3,
                alpha: 0.05,
                duration: 1200 + (i * 200), // Different speeds
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
            
            zombie.redGlowRings.push(glowRing);
        }
    }

    bulletHitZombie(bullet, zombie) {
        // Clean up bullet trail before destroying
        if (this.scene.cleanupBulletTrail) {
            this.scene.cleanupBulletTrail(bullet);
        }
        
        // Remove bullet
        bullet.destroy();

        // Get weapon damage
        const damage = this.scene.currentWeapon.damage;
        
        // Damage zombie
        zombie.health -= damage;

        // Create hit particle effect
        this.scene.createParticleEffect(zombie.x, zombie.y, 'blood');

        // Create hit spark effect
        this.scene.createParticleEffect(zombie.x, zombie.y, 'spark');

        // Check if zombie is killed
        if (zombie.health <= 0) {
            // Get coin reward (default 1, or custom amount for special zombies)
            const coinReward = zombie.zombieTypeConfig.coinReward || 1;
            this.scene.coins += coinReward;
            this.scene.coinText.setText(`Coins: ${this.scene.coins}`);
            
            // Update statistics
            this.scene.gameStats.totalCoins += coinReward;
            this.scene.gameStats.zombieKills[zombie.zombieTypeConfig.id]++;

            // Clean up zombie effects (health bar, glow effects)
            this.destroyZombieEffects(zombie);

            // Remove zombie
            zombie.destroy();

            // Update shop hint
            this.scene.updateShopHint();

            console.log('Zombie killed! Coins:', this.scene.coins, 'Reward:', coinReward);
        } else {
            console.log('Zombie hit! Health remaining:', zombie.health);
        }
    }

    destroyZombieHealthBar(zombie) {
        if (zombie.healthBar) {
            zombie.healthBar.destroy();
            zombie.healthBar = null;
        }
        if (zombie.healthBarBg) {
            zombie.healthBarBg.destroy();
            zombie.healthBarBg = null;
        }
    }

    destroyZombieEffects(zombie) {
        // Clean up health bar
        this.destroyZombieHealthBar(zombie);
        
        // Clean up red glow effects for elite zombies
        if (zombie.redGlowRings) {
            zombie.redGlowRings.forEach(ring => ring.destroy());
            zombie.redGlowRings = null;
        }
    }

    destroy() {
        if (this.zombieSpawnTimer) {
            this.zombieSpawnTimer.destroy();
        }
    }
}