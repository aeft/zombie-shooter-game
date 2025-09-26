import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { ShopScene } from './scenes/ShopScene.js';

// Game configuration
const config = {
    type: Phaser.WEBGL,
    width: window.innerWidth,
    height: window.innerHeight,
    canvas: document.querySelector('canvas'), // 使用现有的 canvas 元素
    backgroundColor: '#142840', // Same dark blue as KAPLAY version
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // Top-down game, no gravity
            debug: false, // Enable collision debugging
            checkCollision: {
                up: true,
                down: true,
                left: true,
                right: true
            }
        }
    },
    scene: [GameScene, GameOverScene, ShopScene],
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    input: {
        mouse: true,
        touch: true
    },
    render: {
        pixelArt: false, // For smooth sprites
        antialias: true
    }
};

// Initialize the game
const game = new Phaser.Game(config);

// Make game instance globally available for debugging
window.game = game;

export default game;