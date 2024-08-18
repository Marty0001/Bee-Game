import GlobalGameState from './game_state.js';

export default class GameBar extends Phaser.Scene {
    constructor() {
        super({ key: 'GameBar', active: true });
        this.globalGameState = GlobalGameState.getInstance();
    }

    create() {
        const gameWidth = this.sys.game.config.width;
        const gameHeight = this.sys.game.config.height;

        // Background for game bar
        this.add.rectangle(0, 0, gameWidth, 100, 0x000000).setOrigin(0, 0);

        // Text for displaying stats
        this.statsText = this.add.text(10, 50, `Drone bees: ${this.globalGameState.getBeeCount('drone')} | Worker bees: ${this.globalGameState.getBeeCount('worker')} | Nectar: ${this.globalGameState.getHiveNectar()} | Water: ${this.globalGameState.getHiveWater()} | Honey: ${this.globalGameState.getHiveHoney()}`, { fontSize: '16px', fill: '#ffffff' });

        // Buttons for switching scenes
        const worldButton = this.add.text(10, 10, 'World', { fontSize: '16px', fill: '#ffffff' })
            .setInteractive()
            .on('pointerdown', () => this.switchScene('World'));

        const hiveButton = this.add.text(80, 10, 'Hive', { fontSize: '16px', fill: '#ffffff' })
            .setInteractive()
            .on('pointerdown', () => this.switchScene('Hive'));

        // upgrade button
        // const upgradeButton = this.add.text(200, 50, 'Upgrade', { fontSize: '16px', fill: '#ffffff' })
        //     .setInteractive()
        //     .on('pointerdown', () => this.upgrade());

    }

    switchScene(scene) {
        if (this.globalGameState.currentScene !== scene) {
            // Set the current scene's visibility to false
            const currentSceneInstance = this.scene.get(this.globalGameState.currentScene);
            if (currentSceneInstance) {
                currentSceneInstance.scene.setVisible(false);
            }

            // Update the current scene in global game state
            this.globalGameState.currentScene = scene;

            // Set the new scene's visibility to true
            const newSceneInstance = this.scene.get(scene);
            if (newSceneInstance) {
                newSceneInstance.scene.setVisible(true);
            }
        }
    }

    upgrade() {
        console.log('Upgrade clicked');
    }

    update() {
        // Update stats text
        this.statsText.setText(`Drone bees: ${this.globalGameState.getBeeCount('drone')} | Worker bees: ${this.globalGameState.getBeeCount('worker')} | Nectar: ${this.globalGameState.getHiveNectar()} | Water: ${this.globalGameState.getHiveWater()} | Honey: ${this.globalGameState.getHiveHoney()}`);
    }
}
