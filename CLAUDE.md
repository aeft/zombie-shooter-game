## Development Workflow

- use mcp to open http://127.0.0.1:8000/src/ You only need to check console to see whether there are errors. You don't need to test
- When modifying CLAUDE.md, update it directly to the latest logic without writing changelog
- CLAUDE.md should not maintain frequently changing content like specific parameters

## Game Overview

### Core Game Logic

This is a top-down survival shooter built with Phaser.js featuring:

**Game Mechanics:**

- Player controls a character with WASD movement
- Mouse aiming and clicking to shoot
- Multiple zombie types with different stats and behaviors
- Destructible environment (walls, trees, explosive barrels)
- Coin collection system for scoring
- Shop system accessible via C key for weapon purchases

**Visual Features:**

- Custom sprites for player, zombies, and environment objects
- Comprehensive particle effect system for hit feedback
- Screen shake effects for impact
- Bullet trail effects with glow animation
- Global scaling system controlled by `GLOBAL_SCALE` parameter

**Architecture:**

- **GameScene**: Main game world with player, enemies, and environment
- **GameOverScene**: Score display and restart functionality
- **Collision System**: Pixel-perfect collision detection using Phaser.js Arcade Physics
- **Feedback System**: Material-specific particle effects (wood, stone, metal, blood)
- **Zombie System**: Structured zombie types with configurable stats
- **Weapon System**: Multiple weapons with different firing patterns
- **Shop System**: In-game store for weapon purchases

### Key Code Features

**Global Scaling System:**

```javascript
const GLOBAL_SCALE = 1.0; // Controls all sprite sizes and positions
```

**Enhanced Particle Effects:**

- Wood chips for trees (brown, rectangular chunks with rotation)
- Stone debris for walls (gray, varied sizes with physics)
- Metal sparks for barrels (golden star-shaped particles)
- Blood splatter for zombies (red circular drops)
- Each material has multiple color variations and realistic physics

**Pixel-Perfect Collision Detection System:**

- Uses Phaser.js Arcade Physics with precise collision boundaries
- **Dual-layer collision system** for different purposes:
  - `HIT_DETECTION_BOXES`: For bullet hit detection (larger, easier to hit)
  - `PHYSICS_BOXES`: For player/zombie movement blocking (smaller, tighter movement)
- Separate collision groups for different interaction types

**Bullet System:**

- Small circular bullets (3px radius) with orange outline
- Dynamic trail effects with fading particles
- Glow animation effects
- Automatic cleanup and destruction

**Explosive Chain Reactions:**

- Smart chain explosion logic - only triggers when nearby barrels exist
- Prevention of duplicate explosions with `exploding` flags
- Visual explosion rings with expanding animation
- Damage radius affects zombies, trees, and walls

**Player Spawn System:**

- Safe spawn position detection with 80px minimum distance from obstacles
- Multiple preferred spawn locations (screen center, below ALEX letters)
- Automatic fallback system with 100 search attempts
- Player bounds enforcement to prevent screen exit

**Gun Mechanics:**

- Gun position follows mouse with smart flipping for left/right aiming
- Prevents upside-down appearance when aiming left
- Consistent arm positioning regardless of aim direction

**Map Layout:**

- Map size: 1.5x screen dimensions for balanced exploration
- ALEX letters prominently displayed above player spawn
- Rich obstacle variety: walls (fort, maze, bunkers), trees (forests, barriers), explosive barrels (strategic clusters)
- Protected areas system ensures clean spawn and ALEX letter visibility

**Protected Areas System:**

- **Player Protection**: 250px radius around spawn areas (screen center and below ALEX)
- **ALEX Protection**: 400px radius around letters with strict filtering
- **ALEX Area Rules**: Only ALEX letter walls allowed, all other obstacles filtered out
- **Obstacle Filtering**: Trees, barrels, and non-ALEX walls automatically removed from protected zones
- **Smart Detection**: Distinguishes ALEX letter walls from other structures by array position and coordinates

**Explosion Mechanics:**

- Unified destruction radius (160px) for all objects - no discrimination
- Chain reaction system with 100ms delays between barrel explosions
- Visual explosion rings and comprehensive particle effects
- Destroys zombies, trees, walls, and triggers other barrels within range

**Zombie System Architecture:**

- **Modular Design**: Extracted into separate `ZombieSystem.js` for better code organization
- **Structured Configuration**: All zombie types defined in `ZOMBIE_TYPES` object with unified properties
- **Multiple Zombie Types**: Normal, Fast, and Elite variants with different health, speed, and rewards
- **Initial Zombie Wave**: Multiple zombies spawn immediately from screen edges at game start
- **Dynamic Difficulty**: Spawn rate increases progressively over time with maximum cap
- **Health Bar System**: Positioned above zombies to prevent overlap, with proper cleanup
- **Notification System**: Visual alerts when difficulty increases with timed fade effects

**Comprehensive Weapon System:**

- **Multiple Weapon Types**: Pistol (default), Shotgun (cone spread), Ray Gun (energy beams)
- **Upgrade System**: Weapons can be upgraded with enhanced properties and requirements  
- **Trail Effects**: Proper cleanup for all bullet types to prevent visual artifacts
- **Damage Scaling**: Progressive damage increases for upgraded weapons

**Advanced Shop System:**

- **Separate Scene**: Runs as overlay scene to maintain game background visibility
- **Smart Hints**: Shows most expensive affordable weapon in yellow text
- **Upgrade Dependencies**: Some items require owning prerequisite weapons
- **Auto-Sizing UI**: Dynamic layout adjusts to number of available items
- **Purchase Statistics**: Tracks all weapon purchases with timestamps for game stats

**Game Over Enhancement:**

- **Popup Overlay**: Appears over paused game scene instead of replacing it
- **Comprehensive Statistics**: Survival time, coins collected, zombie kills by type, weapons purchased
- **Visual Polish**: Semi-transparent background, organized layout, color-coded stats
- **Compact Design**: Prevents UI overlap with smaller fonts and efficient spacing

**Screen Positioning System:**

- **Unified Centering**: Uses `this.cameras.main.centerX/centerY` for accurate positioning
- **Responsive Layout**: Works correctly with Phaser.Scale.RESIZE mode
- **Cross-Scene Consistency**: GameScene and GameOverScene use same centering approach

**Code Architecture:**

- **Modular Design**: Zombie system extracted to dedicated module for better organization
- **Centralized Configuration**: All game constants and types in `gameConfig.js`
- **Scene Separation**: Clean separation between GameScene, ShopScene, and GameOverScene

**Performance Optimizations:**

- Collision areas smaller than visual sprites
- Automatic cleanup of particles and bullet trails with proper disposal
- Efficient object destruction and memory management
- Obstacle overlap detection prevents visual conflicts
- No screen shake on zombie kills for smoother gameplay
- Proper health bar cleanup for explosion-killed zombies
