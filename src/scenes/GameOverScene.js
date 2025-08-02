import { UI_CONFIG } from '../gameConfig.js';

export class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        // Receive data from GameScene
        this.finalCoins = data.coins || 0;
        this.gameStats = data.gameStats || {
            totalCoins: 0,
            zombieKills: { normal: 0, fast: 0, elite_fast: 0 },
            weaponsPurchased: [],
            survivalTime: 0
        };
    }

    create() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        
        // Create full screen semi-transparent overlay
        this.add.rectangle(centerX, centerY, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.6);
        
        // Create compact popup panel
        const panelWidth = 400;
        const panelHeight = 320;
        const panel = this.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x000000, 0.9);
        panel.setStrokeStyle(3, 0x666666);

        let currentY = centerY - 140;
        const lineHeight = 22;
        const sectionSpacing = 25;

        // Game Over title with shadow effect (smaller)
        const titleShadow = this.add.text(centerX + 2, currentY + 2, 'GAME OVER', {
            fontFamily: UI_CONFIG.gameOverText.font,
            fontSize: '28px',
            color: '#000000'
        }).setOrigin(0.5);
        
        const title = this.add.text(centerX, currentY, 'GAME OVER', {
            fontFamily: UI_CONFIG.gameOverText.font,
            fontSize: '28px',
            color: '#FF4444'
        }).setOrigin(0.5);
        currentY += sectionSpacing;

        // Stats container with organized layout (more compact)
        const leftX = centerX - 90;
        const rightX = centerX + 90;

        // Survival time (centered, prominent but smaller)
        const minutes = Math.floor(this.gameStats.survivalTime / 60);
        const seconds = this.gameStats.survivalTime % 60;
        this.add.text(centerX, currentY, 'SURVIVAL TIME', {
            fontFamily: UI_CONFIG.gameOverText.font,
            fontSize: '16px',
            color: '#AAAAAA'
        }).setOrigin(0.5);
        currentY += 18;
        
        this.add.text(centerX, currentY, `${minutes}:${seconds.toString().padStart(2, '0')}`, {
            fontFamily: UI_CONFIG.gameOverText.font,
            fontSize: '24px',
            color: '#FFFF00'
        }).setOrigin(0.5);
        currentY += sectionSpacing;

        // Two column layout for stats
        const col1Y = currentY;
        let col1CurrentY = col1Y;
        let col2CurrentY = col1Y;

        // Left column - Coins (smaller)
        this.add.text(leftX, col1CurrentY, 'COINS', {
            fontFamily: UI_CONFIG.gameOverText.font,
            fontSize: '14px',
            color: '#AAAAAA'
        }).setOrigin(0.5);
        col1CurrentY += 16;
        
        this.add.text(leftX, col1CurrentY, `${this.gameStats.totalCoins}`, {
            fontFamily: UI_CONFIG.gameOverText.font,
            fontSize: '20px',
            color: '#00FF00'
        }).setOrigin(0.5);
        col1CurrentY += sectionSpacing - 5;

        // Right column - Total kills (smaller)
        const totalKills = Object.values(this.gameStats.zombieKills).reduce((sum, kills) => sum + kills, 0);
        this.add.text(rightX, col2CurrentY, 'KILLS', {
            fontFamily: UI_CONFIG.gameOverText.font,
            fontSize: '14px',
            color: '#AAAAAA'
        }).setOrigin(0.5);
        col2CurrentY += 16;
        
        this.add.text(rightX, col2CurrentY, `${totalKills}`, {
            fontFamily: UI_CONFIG.gameOverText.font,
            fontSize: '20px',
            color: '#FF6666'
        }).setOrigin(0.5);
        col2CurrentY += sectionSpacing - 5;

        // Zombie breakdown (vertical under KILLS column)
        let breakdownY = col2CurrentY;
        
        this.add.text(rightX, breakdownY, `Normal: ${this.gameStats.zombieKills.normal}`, {
            fontFamily: UI_CONFIG.gameOverText.font,
            fontSize: '11px',
            color: '#CCCCCC'
        }).setOrigin(0.5);
        breakdownY += 14;
        
        this.add.text(rightX, breakdownY, `Fast: ${this.gameStats.zombieKills.fast}`, {
            fontFamily: UI_CONFIG.gameOverText.font,
            fontSize: '11px',
            color: '#CCCCCC'
        }).setOrigin(0.5);
        breakdownY += 14;
        
        this.add.text(rightX, breakdownY, `Elite Fast: ${this.gameStats.zombieKills.elite_fast}`, {
            fontFamily: UI_CONFIG.gameOverText.font,
            fontSize: '11px',
            color: '#CCCCCC'
        }).setOrigin(0.5);
        
        currentY = Math.max(col1CurrentY, breakdownY + 20);

        // Weapons purchased (if any, more compact)
        if (this.gameStats.weaponsPurchased.length > 0) {
            this.add.text(centerX, currentY, 'WEAPONS', {
                fontFamily: UI_CONFIG.gameOverText.font,
                fontSize: '14px',
                color: '#AAAAAA'
            }).setOrigin(0.5);
            currentY += 18;

            this.gameStats.weaponsPurchased.forEach(weapon => {
                this.add.text(centerX, currentY, `${weapon.name}`, {
                    fontFamily: UI_CONFIG.gameOverText.font,
                    fontSize: '11px',
                    color: '#CCCCCC'
                }).setOrigin(0.5);
                currentY += 16;
            });
            currentY += 5;
        }

        // Restart instruction at bottom (adjusted for smaller panel)
        const restartY = centerY + 130;
        this.add.text(centerX, restartY, 'Press SPACE to restart', {
            fontFamily: UI_CONFIG.gameOverText.font,
            fontSize: '16px',
            color: '#FFFFFF'
        }).setOrigin(0.5);

        // Setup restart input
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    update() {
        // Check for restart
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            // Stop the overlay and restart the GameScene
            this.scene.stop();
            this.scene.start('GameScene');
        }
    }
}