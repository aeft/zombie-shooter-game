// Phaser Game Configuration and Constants
export const GAME_CONFIG = {
    // Player and movement settings
    PLAYER_SPEED: 200,
    BULLET_SPEED: 400,

    // Explosion settings
    EXPLOSION_RADIUS: 160,

    // Global scaling system
    GLOBAL_SCALE: 1.0,

    // Map boundaries - 1.5x screen size
    MAP_WIDTH: window.innerWidth * 1.5,
    MAP_HEIGHT: window.innerHeight * 1.5,
    BOUNDARY_THICKNESS: 20,

    // Visual feedback settings
    SCREEN_SHAKE_DURATION: 0.1,
    SCREEN_SHAKE_INTENSITY: 5,
    PARTICLE_LIFETIME: 0.8,
    PARTICLE_COUNT: 8,

    // Grid settings
    GRID_SIZE: 100,

    // Spawn settings
    ZOMBIE_SPAWN_INTERVAL: 1000, // milliseconds for Phaser timers (2x faster)
    SPAWN_DISTANCE: 100,

    // Health bar settings
    ZOMBIE_HEALTH_BAR_WIDTH: 24,
    ZOMBIE_HEALTH_BAR_HEIGHT: 4,

    // Shop settings
    SHOP_TOGGLE_KEY: 'C',

    // Collision settings - PRECISE collision detection
    COLLISION_DETECTION_ENABLED: true,
    MIN_COLLISION_DISTANCE: 40,
    ZOMBIE_OBSTACLE_DISTANCE: 30,

    // Debug settings
    DEBUG_HIT_DETECTION_BOXES: false,
    DEBUG_PHYSICS_BOXES: true,

    // PHYSICS_BOXES: For player/zombie movement blocking (smaller for tighter movement)
    PHYSICS_BOXES: {
        // Player: small for precise visual contact detection
        player: { width: 32, height: 48 },

        // Zombie: small for precise visual contact detection  
        zombie: { width: 32, height: 48 },

        // Wall: smaller than visual for tighter movement
        wall: { width: 30, height: 30 },

        // Tree: very thin trunk
        tree: { width: 24, height: 46 },

        // Barrel: medium size
        explosive_barrel: { width: 26, height: 32 }
    },

    // HIT_DETECTION_BOXES: For bullet hit detection and damage calculation (larger for easier hits)
    HIT_DETECTION_BOXES: {
        bullet: { width: 8, height: 8 },
        player: { width: 32, height: 48 },
        zombie: { width: 32, height: 48 },
        tree: { width: 26, height: 48 },
        wall: { width: 32, height: 32 },
        explosive_barrel: { width: 28, height: 36 }
    }
};

// Particle material types configuration
export const PARTICLE_MATERIALS = {
    wood: {
        color: 0x8B4513,    // Brown wood chips
        size: [4, 8],       // Size range
        gravity: 120,
        count: 12,
        speed: [80, 200],
        lifetime: [0.8, 1.2],
        colors: [0x8B4513, 0xA0522D, 0x654321] // Various wood browns
    },
    stone: {
        color: 0xC8C8C8,    // Gray stone debris
        size: [3, 6],       // Size range
        gravity: 150,
        count: 10,
        speed: [60, 180],
        lifetime: [0.6, 1.0],
        colors: [0xC8C8C8, 0x808080, 0xA9A9A9] // Various grays
    },
    metal: {
        color: 0xFFFF64,    // Golden sparks
        size: [2, 4],       // Size range
        gravity: 80,
        count: 16,
        speed: [100, 250],
        lifetime: [0.4, 0.8],
        colors: [0xFFFF64, 0xFFA500, 0xFF6347] // Golden to orange sparks
    },
    blood: {
        color: 0xDC143C,    // Red blood
        size: [3, 5],       // Size range
        gravity: 200,
        count: 8,
        speed: [50, 150],
        lifetime: [0.5, 1.0],
        colors: [0xDC143C, 0x8B0000, 0xFF0000] // Various reds
    },
    spark: {
        color: 0xFFFF96,    // Light yellow sparks
        size: [2, 3],       // Size range
        gravity: 100,
        count: 6,
        speed: [80, 180],
        lifetime: [0.3, 0.6],
        colors: [0xFFFF96, 0xFFFFFF, 0xFFFACD] // Yellow to white
    }
};

// Zombie Types Configuration
export const ZOMBIE_TYPES = {
    normal: {
        id: 'normal',
        spriteKey: 'zombie',
        assetPath: '../assets/zombie.png',
        maxHealth: 2,
        speed: 50,
        spawnWeight: 70, // 70% spawn chance
        healthBarColor: 0xFF0000, // Red
        healthBarWidthMultiplier: 1.0,
        description: 'Standard zombie - moderate speed, 2 health'
    },
    fast: {
        id: 'fast',
        spriteKey: 'zombie_fast',
        assetPath: '../assets/zombie_fast.png',
        maxHealth: 1,
        speed: 100, // 2x normal speed
        spawnWeight: 20, // 20% spawn chance (reduced to make room for elite)
        healthBarColor: 0xFFA500, // Orange
        healthBarWidthMultiplier: 0.7,
        description: 'Fast zombie - high speed, 1 health'
    },
    elite_fast: {
        id: 'elite_fast',
        spriteKey: 'zombie_fast', // Reuse fast zombie sprite but add red glow effect
        assetPath: '../assets/zombie_fast.png',
        maxHealth: 3,
        speed: 100, // Same speed as fast zombie
        spawnWeight: 10, // 10% spawn chance
        healthBarColor: 0xFF0000, // Red
        healthBarWidthMultiplier: 1.2,
        coinReward: 3, // 3 coins when killed
        hasRedGlow: true, // Special visual effect
        minSpawnTime: 15000, // Only spawns after 15 seconds
        guaranteedFirstSpawn: true, // Guaranteed to spawn at 15 second mark
        description: 'Elite zombie - tough, fast, valuable'
    }
    // Future zombie types can be added here:
    // tank: {
    //     id: 'tank',
    //     spriteKey: 'zombie_tank',
    //     assetPath: '../assets/zombie_tank.png', 
    //     maxHealth: 5,
    //     speed: 30,
    //     spawnWeight: 10,
    //     healthBarColor: 0x8B0000,
    //     healthBarWidthMultiplier: 1.3,
    //     description: 'Tank zombie - slow but very tough'
    // }
};

// Weapon Types Configuration
export const WEAPON_TYPES = {
    pistol: {
        id: 'pistol',
        name: 'Pistol',
        spriteKey: 'gun',
        assetPath: '../assets/blue_toy_gun.png',
        bulletCount: 1,
        spread: 0,
        bulletLifetime: 1500, // 1.5 seconds
        damage: 1, // Base damage
        description: 'Basic pistol - single shot'
    },
    shotgun: {
        id: 'shotgun',
        name: 'Shotgun',
        spriteKey: 'shotgun',
        assetPath: '../assets/shotgun.png',
        bulletCount: 3,
        spread: 0.3, // Radians spread between bullets
        bulletLifetime: 1000, // 1 second
        damage: 1, // Same damage per bullet as pistol
        description: 'Shotgun - fires 3 bullets in cone',
        upgradeTarget: 'shotgun_upgraded'
    },
    shotgun_upgraded: {
        id: 'shotgun_upgraded',
        name: 'Shotgun+',
        spriteKey: 'shotgun',
        assetPath: '../assets/shotgun.png',
        bulletCount: 5,
        spread: 0.4, // Slightly wider spread for 5 bullets
        bulletLifetime: 1000, // 1 second
        damage: 1, // Same damage per bullet as basic shotgun
        description: 'Upgraded Shotgun - fires 5 bullets in cone'
    },
    raygun: {
        id: 'raygun',
        name: 'Ray Gun',
        spriteKey: 'raygun',
        assetPath: '../assets/raygun.png',
        bulletCount: 1,
        spread: 0,
        bulletLifetime: 2000, // 2 seconds for longer range
        damage: 2, // Double damage compared to pistol
        rayWidth: 1, // Base ray width multiplier
        description: 'Ray Gun - fires powerful energy beams',
        upgradeTarget: 'raygun_upgraded'
    },
    raygun_upgraded: {
        id: 'raygun_upgraded',
        name: 'Ray Gun+',
        spriteKey: 'raygun',
        assetPath: '../assets/raygun.png',
        bulletCount: 1,
        spread: 0,
        bulletLifetime: 2000, // 2 seconds for longer range
        damage: 3, // Increased damage for upgrade
        rayWidth: 3, // 3x wider ray
        description: 'Upgraded Ray Gun - fires wider energy beams'
    }
};

// Shop Items Configuration
export const SHOP_ITEMS = {
    shotgun: {
        id: 'shotgun',
        name: 'Shotgun',
        price: 20,
        weaponType: WEAPON_TYPES.shotgun,
        description: 'Fires 3 bullets in a cone pattern'
    },
    shotgun_upgrade: {
        id: 'shotgun_upgrade',
        name: 'Shotgun Upgrade',
        price: 20,
        weaponType: WEAPON_TYPES.shotgun_upgraded,
        description: 'Upgrades shotgun to fire 5 bullets',
        requiresWeapon: 'shotgun' // Must own shotgun to buy this upgrade
    },
    raygun: {
        id: 'raygun',
        name: 'Ray Gun',
        price: 50,
        weaponType: WEAPON_TYPES.raygun,
        description: 'Fires powerful energy beams with 2x damage'
    },
    raygun_upgrade: {
        id: 'raygun_upgrade',
        name: 'Ray Gun Upgrade',
        price: 50,
        weaponType: WEAPON_TYPES.raygun_upgraded,
        description: 'Upgrades ray gun to fire 3x wider beams',
        requiresWeapon: 'raygun' // Must own raygun to buy this upgrade
    }
};

// Asset paths - Auto-generated from zombie types and weapons + manual assets
export const ASSETS = {
    sprites: {
        // Auto-include all zombie types
        ...Object.fromEntries(
            Object.values(ZOMBIE_TYPES).map(zombieType => [
                zombieType.spriteKey,
                zombieType.assetPath
            ])
        ),
        // Auto-include all weapon types
        ...Object.fromEntries(
            Object.values(WEAPON_TYPES).map(weaponType => [
                weaponType.spriteKey,
                weaponType.assetPath
            ])
        ),
        // Manual assets
        player: "../assets/player.png",
        wall: "../assets/wall.png",
        tree: "../assets/tree.png",
        explosive_barrel: "../assets/explosive_barrel.png"
    }
};

// UI configuration
export const UI_CONFIG = {
    coinText: {
        font: "monospace",
        size: 24,
        position: [20, 20],
        color: "#FFFFFF"
    },
    gameOverText: {
        font: "monospace",
        size: 32,
        color: "#FFFFFF"
    }
};