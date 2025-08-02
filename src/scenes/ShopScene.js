import { SHOP_ITEMS } from '../gameConfig.js';

export class ShopScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ShopScene' });
    }

    init(data) {
        // Receive data from GameScene
        this.coins = data.coins || 0;
        this.ownedWeapons = data.ownedWeapons || new Set();
        this.currentWeapon = data.currentWeapon;
    }

    create() {
        // Create semi-transparent background
        this.add.rectangle(
            this.cameras.main.centerX, 
            this.cameras.main.centerY, 
            this.cameras.main.width, 
            this.cameras.main.height, 
            0x000000, 
            0.8
        );

        // Create shop container
        this.shopUI = this.add.container(this.cameras.main.centerX, this.cameras.main.centerY);

        // Calculate dynamic shop height based on number of items
        const shopItems = Object.values(SHOP_ITEMS);
        const baseHeight = 200; // Base height for title, coins, close text
        const itemHeight = 90; // Height per item
        const dynamicHeight = baseHeight + shopItems.length * itemHeight;
        
        // Shop background
        const shopBg = this.add.rectangle(0, 0, 600, dynamicHeight, 0x222222, 0.9);
        shopBg.setStrokeStyle(2, 0x666666);
        this.shopUI.add(shopBg);

        // Shop title
        const titleText = this.add.text(0, -120, 'WEAPON SHOP', {
            fontFamily: 'monospace',
            fontSize: '24px',
            color: '#FFFFFF'
        });
        titleText.setOrigin(0.5);
        this.shopUI.add(titleText);

        // Coins display
        this.coinText = this.add.text(0, -90, `Coins: ${this.coins}`, {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#FFFF00'
        });
        this.coinText.setOrigin(0.5);
        this.shopUI.add(this.coinText);

        // Create shop items  
        const yOffset = -40;
        const itemSpacing = 90;
        
        shopItems.forEach((item, index) => {
            this.createShopItem(item, 0, yOffset + index * itemSpacing);
        });

        // Calculate dynamic close text position based on number of items
        const closeTextY = yOffset + shopItems.length * itemSpacing + 30;
        
        // Close instruction
        const closeText = this.add.text(0, closeTextY, 'Press C to close', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#CCCCCC'
        });
        closeText.setOrigin(0.5);
        this.shopUI.add(closeText);

        // Setup close input
        this.cKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    }

    createShopItem(item, x, y) {
        // Item container
        const itemContainer = this.add.container(x, y);

        // Item background
        const canAfford = this.coins >= item.price;
        const alreadyOwned = this.ownedWeapons.has(item.id);
        
        // Check if item requires a specific weapon
        const hasRequiredWeapon = !item.requiresWeapon || this.ownedWeapons.has(item.requiresWeapon);
        const canPurchase = canAfford && !alreadyOwned && hasRequiredWeapon;

        let bgColor = canPurchase ? 0x003300 : 0x330000;
        if (alreadyOwned) bgColor = 0x333333;
        if (!hasRequiredWeapon) bgColor = 0x660000; // Red background for missing requirements

        const itemBg = this.add.rectangle(0, 0, 550, 70, bgColor, 0.8);
        itemBg.setStrokeStyle(1, 0x666666);
        itemContainer.add(itemBg);

        // Item name and price
        let statusText = `${item.name} - ${item.price} coins`;
        if (alreadyOwned) statusText += ' (OWNED)';
        if (!hasRequiredWeapon && item.requiresWeapon) statusText += ` (Need ${item.requiresWeapon})`;

        const itemText = this.add.text(-260, -15, statusText, {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: alreadyOwned ? '#888888' : (canPurchase ? '#00FF00' : '#FF0000')
        });
        itemContainer.add(itemText);

        // Item description
        const descText = this.add.text(-260, 10, item.description, {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#CCCCCC'
        });
        itemContainer.add(descText);

        // Buy button
        if (!alreadyOwned) {
            let buttonText = 'BUY';
            if (!canAfford) buttonText = 'NO $';
            if (!hasRequiredWeapon) buttonText = 'LOCKED';
            
            const buyButton = this.add.text(220, 0, buttonText, {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: canPurchase ? '#FFFFFF' : '#666666',
                backgroundColor: canPurchase ? '#006600' : '#333333',
                padding: { x: 8, y: 4 }
            });
            buyButton.setOrigin(0.5);

            if (canPurchase) {
                buyButton.setInteractive();
                buyButton.on('pointerdown', () => {
                    this.buyItem(item);
                });
                buyButton.on('pointerover', () => {
                    buyButton.setScale(1.3);
                    buyButton.setStyle({
                        color: '#FFFF00',
                        backgroundColor: '#00AA00'
                    });
                });
                buyButton.on('pointerout', () => {
                    buyButton.setScale(1.0);
                    buyButton.setStyle({
                        color: '#FFFFFF',
                        backgroundColor: '#006600'
                    });
                });
            }

            itemContainer.add(buyButton);
        }

        this.shopUI.add(itemContainer);
    }

    buyItem(item) {
        // Check requirements
        const hasRequiredWeapon = !item.requiresWeapon || this.ownedWeapons.has(item.requiresWeapon);
        
        if (this.coins >= item.price && !this.ownedWeapons.has(item.id) && hasRequiredWeapon) {
            // Deduct coins
            this.coins -= item.price;
            this.coinText.setText(`Coins: ${this.coins}`);

            // Add weapon to owned weapons
            this.ownedWeapons.add(item.id);
            
            // If this is an upgrade, remove the old weapon from owned list
            if (item.requiresWeapon) {
                this.ownedWeapons.delete(item.requiresWeapon);
            }

            // Return to GameScene with purchase data
            this.scene.stop();
            this.scene.resume('GameScene');
            
            // Send purchase data back to GameScene
            this.scene.get('GameScene').handlePurchase(item, this.coins, this.ownedWeapons);
        }
    }

    update() {
        // Check for close
        if (Phaser.Input.Keyboard.JustDown(this.cKey)) {
            this.closeShop();
        }
    }

    closeShop() {
        // Return to GameScene without purchase
        this.scene.stop();
        this.scene.resume('GameScene');
        // Reset shop visibility in GameScene
        this.scene.get('GameScene').shopVisible = false;
    }
}