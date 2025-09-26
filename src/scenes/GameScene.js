import { GAME_CONFIG, ASSETS, UI_CONFIG, PARTICLE_MATERIALS, WEAPON_TYPES, SHOP_ITEMS } from '../gameConfig.js';
import { ZombieSystem } from '../systems/ZombieSystem.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });

        // Initialize game state
        this.resetGameState();

        // Game objects
        this.player = null;
        this.gun = null;
        this.zombies = null;
        this.bullets = null;
        this.cursors = null;
        this.wasdKeys = null;

        // UI elements
        this.coinText = null;
        this.shopUI = null;
        this.shopVisible = false;
    }

    resetGameState() {
        // Reset all game state to initial values
        this.coins = 0; // Start with 0 coins
        this.currentWeapon = WEAPON_TYPES.pistol;
        this.ownedWeapons = new Set(['pistol']); // Player starts with pistol only
        this.gameStartTime = 0; // Will be set when game starts
        
        // Game statistics
        this.gameStats = {
            totalCoins: 0, // Total coins collected
            zombieKills: {
                normal: 0,
                fast: 0,
                elite_fast: 0,
                tank: 0
            },
            weaponsPurchased: [], // List of weapons purchased this game
            survivalTime: 0, // Will be calculated at game over
            gameStartTime: 0 // Store start time for survival calculation
        };
    }

    preload() {
        // Load all game assets
        Object.entries(ASSETS.sprites).forEach(([name, path]) => {
            this.load.image(name, path);
            console.log(`Loading ${name}: ${path}`);
        });

        // Add load error handling
        this.load.on('loaderror', (file) => {
            console.error('Failed to load:', file.src);
        });

        this.load.on('complete', () => {
            console.log('All assets loaded successfully');
        });

        console.log('GameScene: Starting asset loading...');
    }

    create() {
        console.log('GameScene: Scene created');
        
        // Reset game state when scene starts
        this.resetGameState();

        // Set world bounds (larger than screen)
        this.physics.world.setBounds(0, 0, GAME_CONFIG.MAP_WIDTH, GAME_CONFIG.MAP_HEIGHT);

        // Create background grid
        this.createBackgroundGrid();

        // Create map boundaries
        this.createMapBoundaries();

        // Create environment objects
        this.createEnvironmentObjects();

        // Create physics groups
        this.createPhysicsGroups();

        // Setup camera bounds first (needed for safe spawn calculation)
        this.setupCameraBounds();

        // Create player at safe position
        this.createPlayer();

        // Create gun
        this.createGun();

        // Setup input controls
        this.setupControls();

        // Setup camera to follow player
        this.setupCameraFollow();

        // Create UI
        this.createUI();

        // Set game start time
        this.gameStartTime = this.time.now;
        this.gameStats.gameStartTime = this.time.now;

        // Initialize zombie system
        this.zombieSystem = new ZombieSystem(this);

        // Setup collision detection
        this.setupCollisions();
    }

    createBackgroundGrid() {
        // Create a simple grid pattern (optional visual enhancement)
        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0x333333, 0.3);

        const gridSize = GAME_CONFIG.GRID_SIZE;

        // Vertical lines
        for (let x = 0; x <= GAME_CONFIG.MAP_WIDTH; x += gridSize) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, GAME_CONFIG.MAP_HEIGHT);
        }

        // Horizontal lines  
        for (let y = 0; y <= GAME_CONFIG.MAP_HEIGHT; y += gridSize) {
            graphics.moveTo(0, y);
            graphics.lineTo(GAME_CONFIG.MAP_WIDTH, y);
        }

        graphics.strokePath();
    }

    createMapBoundaries() {
        // Create invisible boundaries at map edges
        const thickness = GAME_CONFIG.BOUNDARY_THICKNESS;

        // Top boundary
        const topBoundary = this.physics.add.staticGroup();
        topBoundary.create(GAME_CONFIG.MAP_WIDTH / 2, -thickness / 2, null)
            .setSize(GAME_CONFIG.MAP_WIDTH, thickness)
            .setVisible(false);

        // Bottom boundary
        const bottomBoundary = this.physics.add.staticGroup();
        bottomBoundary.create(GAME_CONFIG.MAP_WIDTH / 2, GAME_CONFIG.MAP_HEIGHT + thickness / 2, null)
            .setSize(GAME_CONFIG.MAP_WIDTH, thickness)
            .setVisible(false);

        // Left boundary
        const leftBoundary = this.physics.add.staticGroup();
        leftBoundary.create(-thickness / 2, GAME_CONFIG.MAP_HEIGHT / 2, null)
            .setSize(thickness, GAME_CONFIG.MAP_HEIGHT)
            .setVisible(false);

        // Right boundary
        const rightBoundary = this.physics.add.staticGroup();
        rightBoundary.create(GAME_CONFIG.MAP_WIDTH + thickness / 2, GAME_CONFIG.MAP_HEIGHT / 2, null)
            .setSize(thickness, GAME_CONFIG.MAP_HEIGHT)
            .setVisible(false);

        // Store for collision detection
        this.boundaries = this.physics.add.staticGroup([
            ...topBoundary.children.entries,
            ...bottomBoundary.children.entries,
            ...leftBoundary.children.entries,
            ...rightBoundary.children.entries
        ]);
    }

    createEnvironmentObjects() {
        // Create static environment objects groups
        this.environment = this.physics.add.staticGroup();
        this.trees = this.physics.add.staticGroup();
        this.barrels = this.physics.add.staticGroup();

        // Create separate groups for hit detection (larger collision boxes for bullets)
        this.environmentHitDetection = this.physics.add.staticGroup();
        this.treesHitDetection = this.physics.add.staticGroup();
        this.barrelsHitDetection = this.physics.add.staticGroup();

        // Generate environment positions (from KAPLAY version)
        const { wallPositions, treePositions } = this.generateEnvironmentPositions();
        const barrelPositions = this.generateBarrelPositions(wallPositions, treePositions);

        // Create walls with dual collision system
        wallPositions.forEach(pos => {
            // Physics body for movement collision (smaller)
            const wallPhysics = this.environment.create(pos.x, pos.y, 'wall');
            wallPhysics.setSize(GAME_CONFIG.PHYSICS_BOXES.wall.width, GAME_CONFIG.PHYSICS_BOXES.wall.height);
            wallPhysics.setScale(GAME_CONFIG.GLOBAL_SCALE);
            wallPhysics.objectType = 'wall';
            wallPhysics.setImmovable(true);

            // Hit detection body for bullets (larger)
            const wallHit = this.environmentHitDetection.create(pos.x, pos.y, null);
            wallHit.setSize(GAME_CONFIG.HIT_DETECTION_BOXES.wall.width, GAME_CONFIG.HIT_DETECTION_BOXES.wall.height);
            wallHit.setVisible(false);
            wallHit.objectType = 'wall';
            wallHit.health = 1;
            wallHit.setImmovable(true);
        });

        // Create trees with dual collision system
        treePositions.forEach(pos => {
            // Physics body for movement collision (smaller)
            const treePhysics = this.trees.create(pos.x, pos.y + 6 * GAME_CONFIG.GLOBAL_SCALE, 'tree');
            treePhysics.setSize(GAME_CONFIG.PHYSICS_BOXES.tree.width, GAME_CONFIG.PHYSICS_BOXES.tree.height);
            treePhysics.setScale(GAME_CONFIG.GLOBAL_SCALE);
            treePhysics.objectType = 'tree';
            treePhysics.setImmovable(true);

            // Hit detection body for bullets (larger)
            const treeHit = this.treesHitDetection.create(pos.x, pos.y, null);
            treeHit.setSize(GAME_CONFIG.HIT_DETECTION_BOXES.tree.width, GAME_CONFIG.HIT_DETECTION_BOXES.tree.height);
            treeHit.setVisible(false);
            treeHit.objectType = 'tree';
            treeHit.health = 1;
            treeHit.setImmovable(true);
        });

        // Create explosive barrels with dual collision system
        barrelPositions.forEach(pos => {
            // Physics body for movement collision (smaller)
            const barrelPhysics = this.barrels.create(pos.x, pos.y, 'explosive_barrel');
            barrelPhysics.setSize(GAME_CONFIG.PHYSICS_BOXES.explosive_barrel.width, GAME_CONFIG.PHYSICS_BOXES.explosive_barrel.height);
            barrelPhysics.setScale(GAME_CONFIG.GLOBAL_SCALE);
            barrelPhysics.objectType = 'explosive_barrel';
            barrelPhysics.setImmovable(true);

            // Hit detection body for bullets (larger)
            const barrelHit = this.barrelsHitDetection.create(pos.x, pos.y, null);
            barrelHit.setSize(GAME_CONFIG.HIT_DETECTION_BOXES.explosive_barrel.width, GAME_CONFIG.HIT_DETECTION_BOXES.explosive_barrel.height);
            barrelHit.setVisible(false);
            barrelHit.objectType = 'explosive_barrel';
            barrelHit.health = 1;
            barrelHit.setImmovable(true);
        });
    }

    createPhysicsGroups() {
        // Create physics groups for game objects
        this.bullets = this.physics.add.group({
            defaultKey: null,
            maxSize: 100 // Pool bullets for performance
        });

        this.zombies = this.physics.add.group();
    }

    createPlayer() {
        // Find a safe spawn position for the player
        const spawnPosition = this.findSafeSpawnPosition();

        // Create player sprite at safe position
        this.player = this.physics.add.sprite(spawnPosition.x, spawnPosition.y, 'player');

        // Set player physics properties
        this.player.setCollideWorldBounds(true);
        this.player.setScale(GAME_CONFIG.GLOBAL_SCALE);

        // CRITICAL: Set precise collision boundaries for pixel-perfect detection
        this.player.body.setSize(
            GAME_CONFIG.PHYSICS_BOXES.player.width,
            GAME_CONFIG.PHYSICS_BOXES.player.height
        );

        // Center the collision box on the sprite
        const offsetX = (this.player.width * GAME_CONFIG.GLOBAL_SCALE - GAME_CONFIG.PHYSICS_BOXES.player.width) / 2;
        const offsetY = (this.player.height * GAME_CONFIG.GLOBAL_SCALE - GAME_CONFIG.PHYSICS_BOXES.player.height) / 2;
        this.player.body.setOffset(offsetX, offsetY);

        // Set player speed and movement properties
        this.player.setMaxVelocity(GAME_CONFIG.PLAYER_SPEED);
        this.player.setDrag(800); // Add drag for smooth stopping

        console.log('Player created at:', { x: spawnPosition.x, y: spawnPosition.y });
        console.log('Player created with precise collision box:', {
            spriteSize: { width: this.player.width, height: this.player.height },
            physicsSize: { width: this.player.body.width, height: this.player.body.height },
            offset: { x: this.player.body.offset.x, y: this.player.body.offset.y }
        });
    }

    createGun() {
        // Create gun sprite that follows player using current weapon
        this.gun = this.add.sprite(
            this.player.x + 20 * GAME_CONFIG.GLOBAL_SCALE,
            this.player.y + 8 * GAME_CONFIG.GLOBAL_SCALE,
            this.currentWeapon.spriteKey
        );
        this.gun.setScale(GAME_CONFIG.GLOBAL_SCALE * 0.6);
        this.gun.setOrigin(0.5, 0.5);
    }

    setupControls() {
        // Create cursor keys (arrow keys)
        this.cursors = this.input.keyboard.createCursorKeys();

        // Create WASD keys
        this.wasdKeys = this.input.keyboard.addKeys('W,S,A,D');

        // Shop toggle key
        this.shopKey = this.input.keyboard.addKey(GAME_CONFIG.SHOP_TOGGLE_KEY);
        this.shopKey.on('down', this.toggleShop, this);


        // Mouse input for shooting
        this.input.on('pointerdown', this.shoot, this);
    }

    setupCameraBounds() {
        // Calculate safe bounds for spawn calculation only
        const screenWidth = this.cameras.main.width;
        const screenHeight = this.cameras.main.height;

        // Player spawn bounds: ensure initial spawn is safe
        const playerBounds = {
            minX: screenWidth / 2,
            minY: screenHeight / 2,
            maxX: GAME_CONFIG.MAP_WIDTH - screenWidth / 2,
            maxY: GAME_CONFIG.MAP_HEIGHT - screenHeight / 2
        };

        // Store bounds for spawn calculation only
        this.playerBounds = playerBounds;

        // Set camera bounds to ensure player stays visible
        // Camera bounds prevent camera from showing outside the map
        this.cameras.main.setBounds(0, 0, GAME_CONFIG.MAP_WIDTH, GAME_CONFIG.MAP_HEIGHT);
    }

    setupCameraFollow() {
        // Setup camera to follow player
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setLerp(0.1, 0.1); // Smooth camera following
    }

    createUI() {
        // Create coin counter (fixed to camera)
        this.coinText = this.add.text(
            UI_CONFIG.coinText.position[0],
            UI_CONFIG.coinText.position[1],
            `Coins: ${this.coins}`,
            {
                fontFamily: UI_CONFIG.coinText.font,
                fontSize: UI_CONFIG.coinText.size + 'px',
                color: UI_CONFIG.coinText.color
            }
        );
        this.coinText.setScrollFactor(0); // Keep UI fixed to camera

        // Create shop button
        this.shopButton = this.add.text(
            20,
            60,
            'Shop (C)',
            {
                fontFamily: 'monospace',
                fontSize: '18px',
                color: '#FFFF00',
                backgroundColor: '#333333',
                padding: { x: 8, y: 4 }
            }
        );
        this.shopButton.setScrollFactor(0);
        this.shopButton.setInteractive();
        this.shopButton.on('pointerdown', this.toggleShop, this);

        // Create shop hint text (initially hidden)
        this.shopHint = this.add.text(
            20,
            85,
            '',
            {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#00FF00'
            }
        );
        this.shopHint.setScrollFactor(0);
        this.updateShopHint();

        // Create notification text (initially hidden)
        this.notificationText = this.add.text(
            this.cameras.main.centerX,
            150,
            '',
            {
                fontFamily: 'monospace',
                fontSize: '20px',
                color: '#FF4444',
                backgroundColor: '#000000',
                padding: { x: 12, y: 8 },
                align: 'center'
            }
        );
        this.notificationText.setOrigin(0.5);
        this.notificationText.setScrollFactor(0);
        this.notificationText.setVisible(false);
    }


    setupCollisions() {
        // Player vs Environment (using smaller physics boxes for tighter movement)
        this.physics.add.collider(this.player, this.environment);
        this.physics.add.collider(this.player, this.trees);
        this.physics.add.collider(this.player, this.barrels);
        this.physics.add.collider(this.player, this.boundaries);

        // Bullets vs Environment (using larger hit detection boxes)
        this.physics.add.collider(this.bullets, this.environmentHitDetection, this.bulletHitEnvironment, null, this);
        this.physics.add.collider(this.bullets, this.treesHitDetection, this.bulletHitEnvironment, null, this);
        this.physics.add.collider(this.bullets, this.barrelsHitDetection, this.bulletHitBarrel, null, this);
        this.physics.add.collider(this.bullets, this.boundaries, this.bulletHitBoundary, null, this);

        // Bullets vs Zombies
        this.physics.add.overlap(this.bullets, this.zombies, this.zombieSystem.bulletHitZombie, null, this.zombieSystem);

        // CRITICAL: Player vs Zombies - PRECISE collision detection for game over
        this.physics.add.overlap(this.player, this.zombies, this.playerHitZombie, null, this);

        // Zombie vs Environment (using smaller physics boxes for tighter movement)
        this.physics.add.collider(this.zombies, this.environment, this.zombieHitEnvironment, null, this);
        this.physics.add.collider(this.zombies, this.trees, this.zombieHitTree, null, this);
        this.physics.add.collider(this.zombies, this.barrels, this.zombieHitBarrel, null, this);
        this.physics.add.collider(this.zombies, this.boundaries);

        // Zombie vs Zombie (prevent overlapping)
        this.physics.add.collider(this.zombies, this.zombies);
    }

    update(time, delta) {
        // Update spawn speed based on game time
        this.zombieSystem.updateSpawnSpeed();

        // Handle player movement
        this.handlePlayerMovement();

        // Update gun position and rotation
        this.updateGun();

        // Update zombies AI
        this.zombieSystem.updateZombies();

        // Update bullet trails
        this.bullets.children.entries.forEach(bullet => {
            if (bullet.active && bullet.updateTrail) {
                bullet.updateTrail();
            }
        });
    }

    handlePlayerMovement() {
        const velocity = new Phaser.Math.Vector2(0, 0);

        // WASD or Arrow Key movement
        if (this.wasdKeys.A.isDown || this.cursors.left.isDown) {
            velocity.x = -1;
        }
        if (this.wasdKeys.D.isDown || this.cursors.right.isDown) {
            velocity.x = 1;
        }
        if (this.wasdKeys.W.isDown || this.cursors.up.isDown) {
            velocity.y = -1;
        }
        if (this.wasdKeys.S.isDown || this.cursors.down.isDown) {
            velocity.y = 1;
        }

        // Normalize diagonal movement
        velocity.normalize();
        velocity.scale(GAME_CONFIG.PLAYER_SPEED);

        this.player.setVelocity(velocity.x, velocity.y);
    }

    updateGun() {
        // Get mouse position in world coordinates
        const pointer = this.input.activePointer;
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

        // Calculate angle from player to mouse
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, worldPoint.x, worldPoint.y);

        // Update gun position relative to player
        const gunDistance = 20 * GAME_CONFIG.GLOBAL_SCALE;
        let gunOffset = 8 * GAME_CONFIG.GLOBAL_SCALE;

        // Flip gun when pointing left to maintain consistent arm position
        if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
            // Mouse is on the left side, flip the gun vertically and adjust offset
            this.gun.setFlipY(true);
            gunOffset = -gunOffset; // Invert the offset to maintain arm position
        } else {
            // Mouse is on the right side, keep gun normal
            this.gun.setFlipY(false);
        }

        this.gun.x = this.player.x + Math.cos(angle) * gunDistance - Math.sin(angle) * gunOffset;
        this.gun.y = this.player.y + Math.sin(angle) * gunDistance + Math.cos(angle) * gunOffset;
        this.gun.rotation = angle;
    }




    shoot() {
        // Don't shoot if shop is open
        if (this.shopVisible) {
            return;
        }

        // Get mouse position in world coordinates
        const pointer = this.input.activePointer;
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

        // Calculate direction from gun to mouse
        const baseAngle = Phaser.Math.Angle.Between(this.gun.x, this.gun.y, worldPoint.x, worldPoint.y);

        // Create bullets based on current weapon
        const weapon = this.currentWeapon;
        const bulletCount = weapon.bulletCount;
        const spread = weapon.spread;

        for (let i = 0; i < bulletCount; i++) {
            // Calculate angle for this bullet
            let angle = baseAngle;
            if (bulletCount > 1) {
                // Spread bullets in cone pattern
                const spreadOffset = (i - (bulletCount - 1) / 2) * spread;
                angle += spreadOffset;
            }

            // Create bullet at gun tip
            const gunTipDistance = 10 * GAME_CONFIG.GLOBAL_SCALE;
            const bulletX = this.gun.x + Math.cos(angle) * gunTipDistance;
            const bulletY = this.gun.y + Math.sin(angle) * gunTipDistance;

            this.createBullet(bulletX, bulletY, angle);
        }
    }

    createBullet(x, y, angle) {
        let bullet;
        let rayLength = 0; // Define rayLength for all bullet types
        
        // Create different bullet types based on weapon
        if (this.currentWeapon.id === 'raygun' || this.currentWeapon.id === 'raygun_upgraded') {
            // Create ray beam - longer line instead of circular bullet
            rayLength = 60 * GAME_CONFIG.GLOBAL_SCALE; // Shorter ray that moves
            const endX = x + Math.cos(angle) * rayLength;
            const endY = y + Math.sin(angle) * rayLength;
            
            // Create ray using rectangle rotated to angle with configurable width
            const baseRayWidth = 4 * GAME_CONFIG.GLOBAL_SCALE;
            const rayWidthMultiplier = this.currentWeapon.rayWidth || 1;
            const rayWidth = baseRayWidth * rayWidthMultiplier;
            
            bullet = this.add.rectangle(x, y, rayLength, rayWidth, 0x00FFFF);
            bullet.setRotation(angle);
            bullet.setOrigin(0, 0.5); // Rotate around start point
            
            // Store ray properties
            bullet.isRay = true;
            bullet.rayStart = { x, y };
            bullet.rayEnd = { x: endX, y: endY };
            bullet.rayWidth = rayWidth; // Store for collision detection
        } else {
            // Create normal circular bullet
            bullet = this.add.circle(x, y, 3 * GAME_CONFIG.GLOBAL_SCALE, 0xFFFF00);
            bullet.setStrokeStyle(1, 0xFF6600, 1); // Orange outline
        }

        // Add bullet to bullets group first (this creates the physics body)
        this.bullets.add(bullet);
        
        // Calculate velocity for all bullet types
        const velX = Math.cos(angle) * GAME_CONFIG.BULLET_SPEED;
        const velY = Math.sin(angle) * GAME_CONFIG.BULLET_SPEED;
        
        if (bullet.isRay) {
            // For ray beams, set collision area matching the visual width
            bullet.body.setSize(rayLength, bullet.rayWidth);
            bullet.body.velocity.x = velX;
            bullet.body.velocity.y = velY;
        } else {
            bullet.body.setSize(GAME_CONFIG.HIT_DETECTION_BOXES.bullet.width, GAME_CONFIG.HIT_DETECTION_BOXES.bullet.height);
            bullet.body.velocity.x = velX;
            bullet.body.velocity.y = velY;
        }
        
        // Store weapon damage on bullet
        bullet.damage = this.currentWeapon.damage || 1;

        if (!bullet.isRay) {
            // Initialize bullet trail system (only for normal bullets)
            bullet.trail = [];
            bullet.trailObjects = [];
            bullet.glowTimer = 0;

            // Add bullet trail update logic
            bullet.updateTrail = () => {
                if (!bullet.active) return;

                // Store previous position for trail
                bullet.trail.push({ x: bullet.x, y: bullet.y });

                // Limit trail length
                if (bullet.trail.length > 8) {
                    bullet.trail.shift();
                }

                // Add bullet glow effect
                bullet.glowTimer += 0.016; // ~60fps
                const glowIntensity = 0.8 + 0.2 * Math.sin(bullet.glowTimer * 20);
                bullet.setAlpha(glowIntensity);

                // Update trail visual objects
                this.updateBulletTrailVisuals(bullet);
            };
        }

        // Auto-destroy bullet after configured lifetime
        this.time.delayedCall(this.currentWeapon.bulletLifetime, () => {
            if (bullet.active) {
                this.cleanupBulletTrail(bullet);
                bullet.destroy();
            }
        });
    }

    // Collision handlers
    bulletHitEnvironment(bullet, environment) {
        this.cleanupBulletTrail(bullet);

        // Add particle effects based on object type
        const materialType = this.getMaterialType(environment.objectType || 'wall');
        this.createHitEffect(bullet.x, bullet.y, materialType);

        // Destroy both hit detection object and corresponding visual object
        if (environment.health !== undefined) {
            environment.health--;
            if (environment.health <= 0) {
                // Destroy the hit detection object
                environment.destroy();

                // Find and destroy the corresponding visual/physics object
                this.destroyCorrespondingVisualObject(environment);
            }
        }

        bullet.destroy();
    }

    bulletHitBarrel(bullet, barrel) {
        this.cleanupBulletTrail(bullet);

        // Store barrel position before destroying
        const barrelX = barrel.x;
        const barrelY = barrel.y;

        // Destroy hit detection barrel
        barrel.destroy();

        // Find and destroy corresponding visual barrel
        this.destroyCorrespondingVisualObject({ x: barrelX, y: barrelY, objectType: 'explosive_barrel' });

        // Create explosion effect
        this.createExplosion(barrelX, barrelY);

        bullet.destroy();
    }

    bulletHitBoundary(bullet, _boundary) {
        this.cleanupBulletTrail(bullet);
        bullet.destroy();
    }


    playerHitZombie(player, zombie) {
        // CRITICAL: This is our precise collision detection for game over
        console.log('Player hit zombie - GAME OVER!');
        console.log('Collision details:', {
            playerPos: { x: player.x, y: player.y },
            zombiePos: { x: zombie.x, y: zombie.y },
            distance: Phaser.Math.Distance.Between(player.x, player.y, zombie.x, zombie.y),
            playerBodySize: { width: player.body.width, height: player.body.height },
            zombieBodySize: { width: zombie.body.width, height: zombie.body.height }
        });

        // Transition to game over scene as overlay
        // Calculate survival time
        this.gameStats.survivalTime = Math.floor((this.time.now - this.gameStats.gameStartTime) / 1000);
        
        // Pause current scene and launch game over as overlay
        this.scene.pause();
        this.scene.launch('GameOverScene', { 
            coins: this.coins,
            gameStats: this.gameStats
        });
    }

    // Helper functions from KAPLAY version
    generateEnvironmentPositions() {
        // Position ALEX letters above the player's initial spawn position (screen center)
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        const textY = centerY - 200 * GAME_CONFIG.GLOBAL_SCALE;

        // Calculate centered start position for "ALEX" (4 letters with 80px each + 3 gaps of 80px = 560px total)
        const totalTextWidth = 4 * 80 + 3 * 80; // 560px
        const startX = centerX - (totalTextWidth / 2) * GAME_CONFIG.GLOBAL_SCALE;

        // Helper function to scale text positions
        const s = (x) => x * GAME_CONFIG.GLOBAL_SCALE;

        // Letter spacing: each letter is 80px wide with 80px gap between letters
        const letterSpacing = 160; // 80px letter + 80px gap

        const wallPositions = [
            // Letter "A" (centered at startX + 40)
            { x: startX + s(20), y: textY }, { x: startX + s(60), y: textY },
            { x: startX, y: textY + s(20) }, { x: startX + s(80), y: textY + s(20) },
            { x: startX, y: textY + s(40) }, { x: startX + s(80), y: textY + s(40) },
            { x: startX, y: textY + s(60) }, { x: startX + s(20), y: textY + s(60) }, { x: startX + s(60), y: textY + s(60) }, { x: startX + s(80), y: textY + s(60) },
            { x: startX, y: textY + s(80) }, { x: startX + s(80), y: textY + s(80) },
            { x: startX, y: textY + s(100) }, { x: startX + s(80), y: textY + s(100) },
            { x: startX, y: textY + s(120) }, { x: startX + s(80), y: textY + s(120) },

            // Letter "L" (centered at startX + letterSpacing + 40)
            { x: startX + s(letterSpacing), y: textY }, { x: startX + s(letterSpacing), y: textY + s(20) },
            { x: startX + s(letterSpacing), y: textY + s(40) }, { x: startX + s(letterSpacing), y: textY + s(60) },
            { x: startX + s(letterSpacing), y: textY + s(80) }, { x: startX + s(letterSpacing), y: textY + s(100) },
            { x: startX + s(letterSpacing), y: textY + s(120) }, { x: startX + s(letterSpacing + 20), y: textY + s(120) }, { x: startX + s(letterSpacing + 40), y: textY + s(120) }, { x: startX + s(letterSpacing + 60), y: textY + s(120) }, { x: startX + s(letterSpacing + 80), y: textY + s(120) },

            // Letter "E" (centered at startX + 2*letterSpacing + 40)
            { x: startX + s(2 * letterSpacing), y: textY }, { x: startX + s(2 * letterSpacing + 20), y: textY }, { x: startX + s(2 * letterSpacing + 40), y: textY }, { x: startX + s(2 * letterSpacing + 60), y: textY }, { x: startX + s(2 * letterSpacing + 80), y: textY },
            { x: startX + s(2 * letterSpacing), y: textY + s(20) }, { x: startX + s(2 * letterSpacing), y: textY + s(40) },
            { x: startX + s(2 * letterSpacing), y: textY + s(60) }, { x: startX + s(2 * letterSpacing + 20), y: textY + s(60) }, { x: startX + s(2 * letterSpacing + 40), y: textY + s(60) }, { x: startX + s(2 * letterSpacing + 60), y: textY + s(60) },
            { x: startX + s(2 * letterSpacing), y: textY + s(80) }, { x: startX + s(2 * letterSpacing), y: textY + s(100) },
            { x: startX + s(2 * letterSpacing), y: textY + s(120) }, { x: startX + s(2 * letterSpacing + 20), y: textY + s(120) }, { x: startX + s(2 * letterSpacing + 40), y: textY + s(120) }, { x: startX + s(2 * letterSpacing + 60), y: textY + s(120) }, { x: startX + s(2 * letterSpacing + 80), y: textY + s(120) },

            // Letter "X" (centered at startX + 3*letterSpacing + 40)
            { x: startX + s(3 * letterSpacing), y: textY }, { x: startX + s(3 * letterSpacing + 80), y: textY },
            { x: startX + s(3 * letterSpacing + 20), y: textY + s(20) }, { x: startX + s(3 * letterSpacing + 60), y: textY + s(20) },
            { x: startX + s(3 * letterSpacing + 30), y: textY + s(40) }, { x: startX + s(3 * letterSpacing + 50), y: textY + s(40) },
            { x: startX + s(3 * letterSpacing + 40), y: textY + s(60) },
            { x: startX + s(3 * letterSpacing + 30), y: textY + s(80) }, { x: startX + s(3 * letterSpacing + 50), y: textY + s(80) },
            { x: startX + s(3 * letterSpacing + 20), y: textY + s(100) }, { x: startX + s(3 * letterSpacing + 60), y: textY + s(100) },
            { x: startX + s(3 * letterSpacing), y: textY + s(120) }, { x: startX + s(3 * letterSpacing + 80), y: textY + s(120) },

            // Fort structure (top-left corner)
            { x: 150, y: 150 }, { x: 170, y: 150 }, { x: 190, y: 150 }, { x: 210, y: 150 }, { x: 230, y: 150 },
            { x: 150, y: 170 }, { x: 230, y: 170 },
            { x: 150, y: 190 }, { x: 230, y: 190 },
            { x: 150, y: 210 }, { x: 170, y: 210 }, { x: 190, y: 210 }, { x: 210, y: 210 }, { x: 230, y: 210 },

            // Maze-like corridors (bottom area)
            { x: 200, y: 1200 }, { x: 220, y: 1200 }, { x: 240, y: 1200 }, { x: 260, y: 1200 }, { x: 280, y: 1200 },
            { x: 200, y: 1220 }, { x: 280, y: 1220 },
            { x: 200, y: 1240 }, { x: 240, y: 1240 }, { x: 280, y: 1240 },
            { x: 200, y: 1260 }, { x: 280, y: 1260 },
            { x: 220, y: 1280 }, { x: 240, y: 1280 }, { x: 260, y: 1280 },

            // L-shaped bunker (middle-right)
            { x: GAME_CONFIG.MAP_WIDTH - 300, y: 600 }, { x: GAME_CONFIG.MAP_WIDTH - 280, y: 600 }, { x: GAME_CONFIG.MAP_WIDTH - 260, y: 600 },
            { x: GAME_CONFIG.MAP_WIDTH - 300, y: 620 },
            { x: GAME_CONFIG.MAP_WIDTH - 300, y: 640 },
            { x: GAME_CONFIG.MAP_WIDTH - 300, y: 660 }, { x: GAME_CONFIG.MAP_WIDTH - 280, y: 660 }, { x: GAME_CONFIG.MAP_WIDTH - 260, y: 660 },

            // Defensive perimeter (center-bottom)
            { x: centerX - 100, y: centerY + 300 }, { x: centerX - 80, y: centerY + 300 }, { x: centerX - 60, y: centerY + 300 },
            { x: centerX + 60, y: centerY + 300 }, { x: centerX + 80, y: centerY + 300 }, { x: centerX + 100, y: centerY + 300 },
            { x: centerX - 100, y: centerY + 320 },
            { x: centerX + 100, y: centerY + 320 },

            // Scattered tactical walls
            { x: 400, y: 400 }, { x: 420, y: 400 }, { x: 440, y: 400 },
            { x: 1200, y: 1000 }, { x: 1220, y: 1000 },
            { x: 800, y: 200 }, { x: 820, y: 200 }, { x: 840, y: 200 },
            { x: 1600, y: 1400 }, { x: 1620, y: 1400 }, { x: 1640, y: 1400 },
        ];

        const treePositions = [
            // Heart shape easter egg
            { x: 980, y: 980 }, { x: 1020, y: 980 },
            { x: 960, y: 1000 }, { x: 1000, y: 1000 }, { x: 1040, y: 1000 },
            { x: 970, y: 1020 }, { x: 1030, y: 1020 },
            { x: 980, y: 1040 }, { x: 1020, y: 1040 },
            { x: 1000, y: 1060 },

            // Dense forest area (top-right)
            { x: 1400, y: 200 }, { x: 1420, y: 180 }, { x: 1450, y: 220 },
            { x: 1480, y: 190 }, { x: 1510, y: 230 }, { x: 1530, y: 200 },
            { x: 1460, y: 250 }, { x: 1490, y: 270 }, { x: 1520, y: 260 },
            { x: 1440, y: 280 }, { x: 1470, y: 300 }, { x: 1500, y: 290 },

            // Sparse woodland (left side) - moved further from center
            { x: 200, y: 800 }, { x: 180, y: 840 }, { x: 220, y: 880 },
            { x: 250, y: 820 }, { x: 230, y: 900 }, { x: 270, y: 860 },
            { x: 150, y: 920 }, { x: 190, y: 950 }, { x: 210, y: 980 },

            // Tree barrier (middle horizontal line)
            { x: 700, y: centerY }, { x: 740, y: centerY + 20 }, { x: 780, y: centerY - 20 },
            { x: 820, y: centerY }, { x: 860, y: centerY + 30 }, { x: 900, y: centerY - 10 },
            { x: 940, y: centerY + 10 }, { x: 980, y: centerY - 30 },

            // Orchard pattern (bottom-right)
            { x: 1300, y: 1200 }, { x: 1340, y: 1200 }, { x: 1380, y: 1200 },
            { x: 1300, y: 1240 }, { x: 1340, y: 1240 }, { x: 1380, y: 1240 },
            { x: 1300, y: 1280 }, { x: 1340, y: 1280 }, { x: 1380, y: 1280 },
            { x: 1320, y: 1320 }, { x: 1360, y: 1320 },

            // Natural clusters and scattered trees
            { x: 150, y: 600 }, { x: 450, y: 300 }, { x: 750, y: 700 },
            { x: 1100, y: 150 }, { x: 1350, y: 600 }, { x: 1650, y: 900 },
            { x: 200, y: 1400 }, { x: 550, y: 1100 }, { x: 850, y: 1300 },
            { x: 1200, y: 1500 }, { x: 1600, y: 1200 }, { x: 100, y: 900 },
            { x: 800, y: 400 }, { x: 1300, y: 1100 }, { x: 600, y: 1600 },

            // Additional strategic cover trees
            { x: 500, y: 800 }, { x: 600, y: 450 }, { x: 1050, y: 800 },
            { x: 1500, y: 1000 }, { x: 400, y: 1200 }, { x: 900, y: 1450 },
            { x: 1700, y: 500 }, { x: 120, y: 300 }, { x: 1800, y: 1300 },
        ];

        // Filter out trees that overlap with walls or are in protected areas
        const filteredTreePositions = treePositions.filter(pos =>
            this.isTreePositionClear(pos, wallPositions) && !this.isInProtectedArea(pos.x, pos.y)
        );

        // Filter out walls that are in protected areas (except ALEX letters themselves)
        const filteredWallPositions = wallPositions.filter((pos, index) => {
            // Check if this wall is part of ALEX letters
            const screenCenterY = this.cameras.main.centerY;
            const alexY = screenCenterY - 200 * GAME_CONFIG.GLOBAL_SCALE;

            // ALEX letters are the first walls in the array (before other structures)
            // They span from the beginning until we hit the "Fort structure" comment
            const isAlexLetterWall = index < wallPositions.findIndex(wall =>
                wall.x === 150 && wall.y === 150 // First fort wall position
            );

            // Also check Y position - ALEX letters should be around textY
            const isInAlexYRange = Math.abs(pos.y - alexY) < 150;
            const isAlexLetter = isAlexLetterWall && isInAlexYRange;

            // For ALEX area: only allow ALEX letter walls, reject all others
            const alexCenterX = this.cameras.main.centerX;
            const alexCenterY = screenCenterY - 200;
            const alexDistance = Phaser.Math.Distance.Between(pos.x, pos.y, alexCenterX, alexCenterY);
            const alexProtectionRadius = 400; // Same as in isInProtectedArea

            if (alexDistance < alexProtectionRadius) {
                // In ALEX area: only allow actual ALEX letter walls
                return isAlexLetter;
            }

            // Outside ALEX area: apply normal protection rules
            return !this.isInProtectedArea(pos.x, pos.y);
        });

        return { wallPositions: filteredWallPositions, treePositions: filteredTreePositions };
    }

    generateBarrelPositions(wallPositions, treePositions) {
        const centerX = GAME_CONFIG.MAP_WIDTH / 2;
        const centerY = GAME_CONFIG.MAP_HEIGHT / 2;

        const barrelPositions = [
            // Strategic choke points near fort
            { x: 300, y: 250 }, { x: 350, y: 350 },

            // Ambush positions near tree barriers
            { x: 650, y: centerY + 50 }, { x: 1050, y: centerY - 50 },

            // Maze entrance/exit traps
            { x: 180, y: 1180 }, { x: 300, y: 1300 },

            // Forest clearing explosives
            { x: 1350, y: 350 }, { x: 1550, y: 250 },

            // Defensive line barrels
            { x: centerX - 150, y: centerY + 250 }, { x: centerX + 150, y: centerY + 250 },

            // Bunker approach hazards
            { x: GAME_CONFIG.MAP_WIDTH - 400, y: 550 }, { x: GAME_CONFIG.MAP_WIDTH - 350, y: 700 },

            // Chain reaction clusters
            { x: 800, y: 600 }, { x: 820, y: 620 }, { x: 840, y: 600 }, // Triangle formation
            { x: 1200, y: 1000 }, { x: 1220, y: 1020 }, // Paired barrels

            // Scattered tactical barrels
            { x: 450, y: 750 }, { x: 850, y: 1150 }, { x: 650, y: 1350 },
            { x: 1050, y: 550 }, { x: 1750, y: 350 }, { x: 550, y: 950 },
            { x: 1600, y: 800 }, { x: 400, y: 1000 }, { x: 1400, y: 1400 },

            // Corner ambush positions
            { x: 200, y: 200 }, { x: GAME_CONFIG.MAP_WIDTH - 200, y: 200 },
            { x: 200, y: GAME_CONFIG.MAP_HEIGHT - 200 }, { x: GAME_CONFIG.MAP_WIDTH - 200, y: GAME_CONFIG.MAP_HEIGHT - 200 },

            // Bridge/passage control barrels
            { x: centerX, y: 400 }, { x: centerX, y: GAME_CONFIG.MAP_HEIGHT - 400 },
        ].filter(pos =>
            this.isPositionClear(pos, wallPositions, treePositions) &&
            !this.isInProtectedArea(pos.x, pos.y)
        );

        return barrelPositions;
    }

    isPositionClear(pos, wallPositions, treePositions, minDistance = 60) {
        // Check against walls
        for (let wallPos of wallPositions) {
            const distance = Phaser.Math.Distance.Between(wallPos.x, wallPos.y, pos.x, pos.y);
            if (distance < minDistance) {
                return false;
            }
        }
        // Check against trees
        for (let treePos of treePositions) {
            const distance = Phaser.Math.Distance.Between(treePos.x, treePos.y, pos.x, pos.y);
            if (distance < minDistance) {
                return false;
            }
        }
        // Check if position is in protected area
        if (this.isInProtectedArea(pos.x, pos.y)) {
            return false;
        }
        return true;
    }

    // New function to check if trees overlap with walls
    isTreePositionClear(pos, wallPositions, minDistance = 50) {
        for (let wallPos of wallPositions) {
            const distance = Phaser.Math.Distance.Between(wallPos.x, wallPos.y, pos.x, pos.y);
            if (distance < minDistance) {
                return false;
            }
        }
        return true;
    }

    // Check if position is in protected area (player spawn area or ALEX letters area)
    isInProtectedArea(x, y, protectionRadius = 250) {
        // Use the same coordinates as used in generateEnvironmentPositions
        const screenCenterX = this.cameras.main.centerX;
        const screenCenterY = this.cameras.main.centerY;

        // Protect player spawn area (screen center and below ALEX) - larger areas
        const playerAreas = [
            { x: screenCenterX, y: screenCenterY, radius: protectionRadius },
            { x: screenCenterX, y: screenCenterY + 200, radius: protectionRadius },
            { x: screenCenterX, y: screenCenterY + 300, radius: protectionRadius },
            { x: screenCenterX - 150, y: screenCenterY + 200, radius: protectionRadius * 0.7 },
            { x: screenCenterX + 150, y: screenCenterY + 200, radius: protectionRadius * 0.7 }
        ];

        // Protect ALEX letters area (above screen center) - much larger protection
        const alexCenterX = screenCenterX;
        const alexCenterY = screenCenterY - 200;
        const alexArea = { x: alexCenterX, y: alexCenterY, radius: protectionRadius + 150 }; // Much larger protection for ALEX

        // Check against player areas
        for (let area of playerAreas) {
            const distance = Phaser.Math.Distance.Between(x, y, area.x, area.y);
            if (distance < area.radius) {
                return true;
            }
        }

        // Check against ALEX area
        const alexDistance = Phaser.Math.Distance.Between(x, y, alexArea.x, alexArea.y);
        if (alexDistance < alexArea.radius) {
            return true;
        }

        return false;
    }

    // Check if a position is safe for player spawn (no obstacles nearby)
    isSpawnPositionSafe(x, y, minDistance = 80) {
        // Check against all wall objects
        if (this.environment && this.environment.children.entries) {
            for (let wall of this.environment.children.entries) {
                if (wall.active) {
                    const distance = Phaser.Math.Distance.Between(x, y, wall.x, wall.y);
                    if (distance < minDistance) {
                        return false;
                    }
                }
            }
        }

        // Check against all tree objects
        if (this.trees && this.trees.children.entries) {
            for (let tree of this.trees.children.entries) {
                if (tree.active) {
                    const distance = Phaser.Math.Distance.Between(x, y, tree.x, tree.y);
                    if (distance < minDistance) {
                        return false;
                    }
                }
            }
        }

        // Check against all barrel objects
        if (this.barrels && this.barrels.children.entries) {
            for (let barrel of this.barrels.children.entries) {
                if (barrel.active) {
                    const distance = Phaser.Math.Distance.Between(x, y, barrel.x, barrel.y);
                    if (distance < minDistance) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    // Find a safe spawn position for the player
    findSafeSpawnPosition() {
        // Multiple preferred positions to try
        const screenCenterX = this.cameras.main.centerX;
        const screenCenterY = this.cameras.main.centerY;

        const preferredPositions = [
            // Screen center
            { x: screenCenterX, y: screenCenterY },
            // Below ALEX letters (center + 250px down)
            { x: screenCenterX, y: screenCenterY + 250 },
            // Left of center
            { x: screenCenterX - 200, y: screenCenterY },
            // Right of center  
            { x: screenCenterX + 200, y: screenCenterY },
            // Bottom left
            { x: screenCenterX - 150, y: screenCenterY + 200 },
            // Bottom right
            { x: screenCenterX + 150, y: screenCenterY + 200 }
        ];

        // Try each preferred position
        for (let i = 0; i < preferredPositions.length; i++) {
            const pos = preferredPositions[i];

            // Ensure position is within bounds
            if (this.playerBounds) {
                const clampedX = Phaser.Math.Clamp(pos.x, this.playerBounds.minX, this.playerBounds.maxX);
                const clampedY = Phaser.Math.Clamp(pos.y, this.playerBounds.minY, this.playerBounds.maxY);

                if (this.isSpawnPositionSafe(clampedX, clampedY)) {
                    console.log(`Player spawning at preferred position ${i + 1}: (${clampedX}, ${clampedY})`);
                    return { x: clampedX, y: clampedY };
                }
            }
        }

        // If none of the preferred positions work, do random search
        const searchRadius = 200;
        const maxAttempts = 100;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Generate random position around screen center
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * searchRadius;
            const x = screenCenterX + Math.cos(angle) * distance;
            const y = screenCenterY + Math.sin(angle) * distance;

            // Ensure position is within safe bounds
            if (this.playerBounds) {
                const clampedX = Phaser.Math.Clamp(x, this.playerBounds.minX, this.playerBounds.maxX);
                const clampedY = Phaser.Math.Clamp(y, this.playerBounds.minY, this.playerBounds.maxY);

                if (this.isSpawnPositionSafe(clampedX, clampedY)) {
                    console.log(`Player spawning at random position after ${attempt + 1} attempts: (${clampedX}, ${clampedY})`);
                    return { x: clampedX, y: clampedY };
                }
            }
        }

        // Fallback: spawn below ALEX letters, should usually be safe
        const fallbackX = screenCenterX;
        const fallbackY = screenCenterY + 300;
        const clampedFallbackX = this.playerBounds ? Phaser.Math.Clamp(fallbackX, this.playerBounds.minX, this.playerBounds.maxX) : fallbackX;
        const clampedFallbackY = this.playerBounds ? Phaser.Math.Clamp(fallbackY, this.playerBounds.minY, this.playerBounds.maxY) : fallbackY;

        console.warn(`Could not find safe spawn position, using fallback below ALEX: (${clampedFallbackX}, ${clampedFallbackY})`);
        return { x: clampedFallbackX, y: clampedFallbackY };
    }

    getMaterialType(objectType) {
        switch (objectType) {
            case 'wall': return 'stone';
            case 'tree': return 'wood';
            case 'explosive_barrel': return 'metal';
            case 'zombie': return 'blood';
            default: return 'stone';
        }
    }

    createHitEffect(x, y, materialType, intensity = 'normal') {
        // Create particle effect based on material
        const particleCount = intensity === 'strong' ? 16 : 8;
        this.createParticleEffect(x, y, materialType, particleCount);

        // Screen shake for impact with varying intensity
        let shakeIntensity = 0.01;
        let shakeDuration = 50;

        if (materialType === 'metal' || intensity === 'strong') {
            shakeIntensity = 0.03;
            shakeDuration = 100;
        } else if (materialType === 'blood') {
            shakeIntensity = 0.015;
            shakeDuration = 75;
        }

        this.cameras.main.shake(shakeDuration, shakeIntensity);
    }

    createParticleEffect(x, y, particleType = 'stone', count = null) {
        const material = PARTICLE_MATERIALS[particleType] || PARTICLE_MATERIALS.stone;
        const particleCount = count || material.count;

        for (let i = 0; i < particleCount; i++) {
            // Randomize particle properties based on material
            const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 1.0;
            const speed = material.speed[0] + Math.random() * (material.speed[1] - material.speed[0]);
            const lifetime = material.lifetime[0] + Math.random() * (material.lifetime[1] - material.lifetime[0]);
            const size = material.size[0] + Math.random() * (material.size[1] - material.size[0]);

            // Choose random color from material's color palette
            const colors = material.colors || [material.color];
            const color = colors[Math.floor(Math.random() * colors.length)];

            // Create particle with varying shapes for different materials
            let particle;
            if (particleType === 'blood') {
                // Circular blood drops
                particle = this.add.circle(x, y, size / 2, color);
            } else if (particleType === 'spark' || particleType === 'metal') {
                // Small bright sparks
                particle = this.add.star(x, y, 4, size / 2, size, color);
            } else {
                // Rectangular chunks for wood/stone
                particle = this.add.rectangle(x, y, size, size, color);
            }

            particle.setOrigin(0.5);
            particle.setDepth(15); // High depth for particles

            // Add rotation for more dynamic effect
            const rotationSpeed = (Math.random() - 0.5) * 720;

            // Enhanced particle physics with gravity
            const velocityX = Math.cos(angle) * speed;
            const velocityY = Math.sin(angle) * speed;
            const gravityEffect = material.gravity * lifetime / 100;

            this.tweens.add({
                targets: particle,
                x: x + velocityX * lifetime / 80,
                y: y + velocityY * lifetime / 80 + gravityEffect,
                alpha: 0,
                angle: particle.angle + rotationSpeed * lifetime,
                scaleX: 0.1,
                scaleY: 0.1,
                duration: lifetime * 1000,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });

            // Add a slight delay between particles for more organic feel
            if (i > 0 && Math.random() < 0.3) {
                this.time.delayedCall(Math.random() * 100, () => { });
            }
        }

        // Add screen flash for stronger impacts
        if (particleType === 'metal' || particleType === 'blood') {
            this.addImpactFlash(x, y, material.color);
        }
    }

    createExplosion(x, y) {
        // Visual explosion effect
        this.cameras.main.shake(200, 0.05);
        this.createParticleEffect(x, y, 'metal', 20);
        this.addImpactFlash(x, y, 0xFF6347); // Explosion flash

        // Explosion damage to nearby objects
        const explosionRadius = GAME_CONFIG.EXPLOSION_RADIUS * GAME_CONFIG.GLOBAL_SCALE;

        // Create visual explosion ring
        this.createExplosionRing(x, y, explosionRadius);

        // Damage zombies in range
        this.zombies.children.entries.forEach(zombie => {
            if (zombie.active) {
                const distance = Phaser.Math.Distance.Between(x, y, zombie.x, zombie.y);
                if (distance < explosionRadius) {
                    // Add blood effect for zombie death
                    this.createHitEffect(zombie.x, zombie.y, 'blood', 'strong');

                    // Clean up zombie effects (health bar, glow effects)
                    this.zombieSystem.destroyZombieEffects(zombie);
                    
                    // Add coins based on zombie type
                    const coinReward = zombie.zombieTypeConfig.coinReward || 1;
                    this.coins += coinReward;
                    this.coinText.setText(`Coins: ${this.coins}`);
                    this.updateShopHint();
                    
                    // Update statistics
                    this.gameStats.totalCoins += coinReward;
                    this.gameStats.zombieKills[zombie.zombieTypeConfig.id]++;
                    
                    zombie.destroy();
                }
            }
        });

        // Chain reaction: trigger nearby barrels
        this.triggerChainExplosion(x, y, explosionRadius);

        // Destroy nearby destructible objects
        this.damageNearbyObjects(x, y, explosionRadius);

        // Check if player is in range
        const playerDistance = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
        if (playerDistance < explosionRadius) {
            // Calculate survival time
            this.gameStats.survivalTime = Math.floor((this.time.now - this.gameStats.gameStartTime) / 1000);
            
            // Pause current scene and launch game over as overlay
            this.scene.pause();
            this.scene.launch('GameOverScene', { 
                coins: this.coins,
                gameStats: this.gameStats
            });
        }
    }

    createExplosionRing(x, y, radius) {
        // Create animated explosion ring
        const ring = this.add.circle(x, y, 10, 0xFF6347, 0);
        ring.setStrokeStyle(4, 0xFF6347, 0.8);
        ring.setDepth(20);

        this.tweens.add({
            targets: ring,
            radius: radius,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => ring.destroy()
        });
    }

    triggerChainExplosion(x, y, explosionRadius) {
        // Find nearby barrels and trigger chain explosions
        const nearbyBarrels = [];

        // Check physics barrels
        this.barrels.children.entries.forEach(barrel => {
            if (barrel.active && !barrel.exploding) { // Don't chain explode already exploding barrels
                const distance = Phaser.Math.Distance.Between(x, y, barrel.x, barrel.y);
                if (distance < explosionRadius) {
                    nearbyBarrels.push(barrel);
                }
            }
        });

        // Only trigger chain explosions if there are nearby barrels
        if (nearbyBarrels.length > 0) {
            console.log(`Chain explosion triggered! ${nearbyBarrels.length} barrels in range`);

            // Trigger chain explosions with delay
            nearbyBarrels.forEach((barrel, index) => {
                // Mark barrel as exploding to prevent duplicate chain reactions
                barrel.exploding = true;

                this.time.delayedCall(100 + index * 50, () => {
                    if (barrel.active) {
                        const barrelX = barrel.x;
                        const barrelY = barrel.y;

                        // Destroy the barrel
                        barrel.destroy();

                        // Find corresponding hit detection barrel and destroy it
                        this.barrelsHitDetection.children.entries.forEach(hitBarrel => {
                            if (hitBarrel.active) {
                                const hitDistance = Phaser.Math.Distance.Between(barrelX, barrelY, hitBarrel.x, hitBarrel.y);
                                if (hitDistance < 10) { // Very close, same barrel
                                    hitBarrel.destroy();
                                }
                            }
                        });

                        // Create new explosion (which can trigger further chain reactions)
                        this.createExplosion(barrelX, barrelY);
                    }
                });
            });
        } else {
            console.log('No barrels in explosion range - no chain reaction');
        }
    }

    damageNearbyObjects(x, y, explosionRadius) {
        // Destroy ALL objects within explosion range - no discrimination
        const objectsToDestroy = [];

        // Check trees - full explosion radius
        this.trees.children.entries.forEach(tree => {
            if (tree.active) {
                const distance = Phaser.Math.Distance.Between(x, y, tree.x, tree.y);
                if (distance < explosionRadius) { // Full radius destruction
                    objectsToDestroy.push({ obj: tree, type: 'tree' });
                }
            }
        });

        // Check walls - full explosion radius  
        this.environment.children.entries.forEach(wall => {
            if (wall.active) {
                const distance = Phaser.Math.Distance.Between(x, y, wall.x, wall.y);
                if (distance < explosionRadius) { // Full radius destruction
                    objectsToDestroy.push({ obj: wall, type: 'wall' });
                }
            }
        });

        // Destroy objects with particle effects
        objectsToDestroy.forEach(({ obj, type }) => {
            this.createHitEffect(obj.x, obj.y, this.getMaterialType(type), 'strong');
            obj.destroy();

            // Remove corresponding hit detection objects
            const hitGroup = type === 'tree' ? this.treesHitDetection : this.environmentHitDetection;
            hitGroup.children.entries.forEach(hitObj => {
                if (hitObj.active) {
                    const distance = Phaser.Math.Distance.Between(obj.x, obj.y, hitObj.x, hitObj.y);
                    if (distance < 10) {
                        hitObj.destroy();
                    }
                }
            });
        });
    }

    addImpactFlash(x, y, color) {
        // Create bright impact flash
        const flash = this.add.circle(x, y, 8 * GAME_CONFIG.GLOBAL_SCALE, color);
        flash.setAlpha(0.8);
        flash.setDepth(20);

        this.tweens.add({
            targets: flash,
            scaleX: 3,
            scaleY: 3,
            alpha: 0,
            duration: 200,
            ease: 'Power2',
            onComplete: () => flash.destroy()
        });
    }

    updateBulletTrailVisuals(bullet) {
        if (!bullet.trail || bullet.trail.length === 0) return;

        // Clean up old trail objects if count changed
        if (bullet.trailObjects.length !== bullet.trail.length) {
            bullet.trailObjects.forEach(obj => {
                if (obj && obj.destroy) obj.destroy();
            });
            bullet.trailObjects = [];

            // Create new trail objects
            bullet.trail.forEach((trailPos, index) => {
                const trailOpacity = (index + 1) / bullet.trail.length * 0.7;
                const size = (index + 1) / bullet.trail.length * 6 * GAME_CONFIG.GLOBAL_SCALE;

                const trailObj = this.add.circle(trailPos.x, trailPos.y, size / 2, 0xFF9632);
                trailObj.setAlpha(trailOpacity);
                trailObj.setDepth(8);

                bullet.trailObjects.push(trailObj);
            });
        } else {
            // Update positions of existing trail objects
            bullet.trail.forEach((trailPos, index) => {
                if (bullet.trailObjects[index]) {
                    bullet.trailObjects[index].setPosition(trailPos.x, trailPos.y);
                }
            });
        }
    }

    cleanupBulletTrail(bullet) {
        if (bullet.trailObjects) {
            bullet.trailObjects.forEach(obj => {
                if (obj && obj.destroy) obj.destroy();
            });
            bullet.trailObjects = [];
        }
        if (bullet.trail) {
            bullet.trail = [];
        }
    }

    destroyCorrespondingVisualObject(hitDetectionObject) {
        const objectType = hitDetectionObject.objectType;
        const hitX = hitDetectionObject.x;
        const hitY = hitDetectionObject.y;

        // Find and destroy corresponding visual/physics objects within a small distance
        const searchDistance = 10; // Very close objects are considered matching

        if (objectType === 'wall') {
            this.environment.children.entries.forEach(visualObj => {
                if (visualObj.active) {
                    const distance = Phaser.Math.Distance.Between(hitX, hitY, visualObj.x, visualObj.y);
                    if (distance < searchDistance) {
                        visualObj.destroy();
                    }
                }
            });
        } else if (objectType === 'tree') {
            this.trees.children.entries.forEach(visualObj => {
                if (visualObj.active) {
                    const distance = Phaser.Math.Distance.Between(hitX, hitY, visualObj.x, visualObj.y);
                    if (distance < searchDistance) {
                        visualObj.destroy();
                    }
                }
            });
        } else if (objectType === 'explosive_barrel') {
            this.barrels.children.entries.forEach(visualObj => {
                if (visualObj.active) {
                    const distance = Phaser.Math.Distance.Between(hitX, hitY, visualObj.x, visualObj.y);
                    if (distance < searchDistance) {
                        // Don't destroy barrel here, let bulletHitBarrel handle the explosion
                        visualObj.destroy();
                    }
                }
            });
        }
    }





    toggleShop() {
        if (!this.shopVisible) {
            this.openShop();
        }
    }

    openShop() {
        this.shopVisible = true;
        // Pause current scene and launch shop scene
        this.scene.pause();
        this.scene.launch('ShopScene', {
            coins: this.coins,
            ownedWeapons: this.ownedWeapons,
            currentWeapon: this.currentWeapon
        });
    }

    handlePurchase(item, coins, ownedWeapons) {
        // Update game state after purchase
        this.coins = coins;
        this.ownedWeapons = ownedWeapons;
        this.coinText.setText(`Coins: ${this.coins}`);
        this.updateShopHint();
        
        // Update statistics
        this.gameStats.weaponsPurchased.push({
            name: item.name,
            price: item.price,
            purchaseTime: Math.floor((this.time.now - this.gameStats.gameStartTime) / 1000)
        });
        
        // Switch to new weapon
        this.switchWeapon(item.weaponType);
        
        this.shopVisible = false;
    }


    switchWeapon(weaponType) {
        this.currentWeapon = weaponType;

        // Update gun sprite
        this.gun.setTexture(weaponType.spriteKey);

        console.log(`Switched to ${weaponType.name}`);
    }


    showNotification(message) {
        // Set the message and make visible
        this.notificationText.setText(message);
        this.notificationText.setVisible(true);
        this.notificationText.setAlpha(1);
        
        // Create fade out tween after 5 seconds
        this.tweens.add({
            targets: this.notificationText,
            alpha: 0,
            duration: 1000, // 1 second fade duration
            delay: 4000,    // Wait 4 seconds before fading (5 seconds total visible time)
            ease: 'Power2',
            onComplete: () => {
                this.notificationText.setVisible(false);
            }
        });
    }

    updateShopHint() {
        // Check what items can be purchased
        const availableItems = Object.values(SHOP_ITEMS).filter(item => {
            // Check if already owned
            if (this.ownedWeapons.has(item.id)) return false;
            
            // Check if can afford
            if (this.coins < item.price) return false;
            
            // Check weapon requirements
            if (item.requiresWeapon && !this.ownedWeapons.has(item.requiresWeapon)) return false;
            
            return true;
        });

        if (availableItems.length > 0) {
            // Show hint for the most expensive available item
            const mostExpensiveItem = availableItems.reduce((prev, current) => 
                (prev.price > current.price) ? prev : current
            );
            this.shopHint.setText(`Can buy: ${mostExpensiveItem.name}`);
        } else {
            // Hide hint if nothing can be purchased
            this.shopHint.setText('');
        }
    }

    zombieHitEnvironment(zombie, wall) {
        // Only tank zombies can destroy obstacles
        if (zombie.canDestroyObstacles) {
            // Create particle effect
            this.createParticleEffect(wall.x, wall.y, 'stone');
            
            // Find and destroy the corresponding hit detection wall
            this.environmentHitDetection.children.entries.forEach(hitWall => {
                if (Math.abs(hitWall.x - wall.x) < 5 && Math.abs(hitWall.y - wall.y) < 5) {
                    hitWall.destroy();
                }
            });
            
            // Destroy the wall
            wall.destroy();
        }
    }

    zombieHitTree(zombie, tree) {
        // Only tank zombies can destroy obstacles
        if (zombie.canDestroyObstacles) {
            // Create particle effect
            this.createParticleEffect(tree.x, tree.y, 'wood');
            
            // Find and destroy the corresponding hit detection tree
            this.treesHitDetection.children.entries.forEach(hitTree => {
                if (Math.abs(hitTree.x - tree.x) < 5 && Math.abs(hitTree.y - tree.y) < 5) {
                    hitTree.destroy();
                }
            });
            
            // Destroy the tree
            tree.destroy();
        }
    }

    zombieHitBarrel(zombie, barrel) {
        // Only tank zombies can destroy obstacles
        if (zombie.canDestroyObstacles) {
            // Create particle effect (metal sparks, not explosion)
            this.createParticleEffect(barrel.x, barrel.y, 'metal');
            
            // Find and destroy the corresponding hit detection barrel
            this.barrelsHitDetection.children.entries.forEach(hitBarrel => {
                if (Math.abs(hitBarrel.x - barrel.x) < 5 && Math.abs(hitBarrel.y - barrel.y) < 5) {
                    hitBarrel.destroy();
                }
            });
            
            // Destroy the barrel without explosion
            barrel.destroy();
            
            console.log('Tank zombie destroyed barrel without explosion');
        }
    }

    destroy() {
        // Clean up zombie system
        if (this.zombieSystem) {
            this.zombieSystem.destroy();
        }
        super.destroy();
    }
}