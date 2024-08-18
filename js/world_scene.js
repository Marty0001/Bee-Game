import DroneBeeManager from './drone_bee_manager.js';
import GlobalGameState from './game_state.js';

export default class World extends Phaser.Scene {
    constructor() {
        super({ key: 'World', active: true });
        this.elapsedTime = 0;
        this.gameState = GlobalGameState.getInstance();
    }

    preload() {
        // Load assets
        this.load.image('ground', 'assets/ground.png');
        this.load.image('ground2', 'assets/ground2.png');
        this.load.image('background', 'assets/background.png');
        this.load.image('tree1', 'assets/tree1.png');
        this.load.image('pollen_particle', 'assets/sparks.png');
        this.load.spritesheet('yellow_flower', 'assets/yellow_flower.png', {
            frameWidth: 32,
            frameHeight: 32
        });
        this.load.spritesheet('blue_flower', 'assets/blue_flower.png', {
            frameWidth: 32,
            frameHeight: 32
        });
        this.load.spritesheet('drone_world', 'assets/drone_world.png', {
            frameWidth: 16,
            frameHeight: 16
        });
    }

    create() {

        // Add the background clouds, scale to fit scene size
        const bgHeight = this.textures.get('background').getSourceImage().height;
        const scaleFactor = (this.gameState.gameHeight) / bgHeight;
        this.background = this.add.tileSprite(0, 0, this.gameState.gameWidth, this.gameState.gameHeight, 'background').setOrigin(0, 0).setScale(scaleFactor, scaleFactor);

        // Add the ground
        this.ground1 = this.add.tileSprite(0, this.gameState.gameHeight - 150, this.gameState.gameWidth, 125, 'ground').setOrigin(0, 0);
        this.ground2 = this.add.tileSprite(0, this.gameState.gameHeight - 75, this.gameState.gameWidth, 76, 'ground2').setOrigin(0, 0);

        // Add the main tree
        this.tree = this.add.image(10, this.gameState.gameHeight - 320, 'tree1').setOrigin(0, 0).setScale(1.7);

        // Define the animation for the bee and flower bounce
        this.anims.create({
            key: 'fly',
            frames: this.anims.generateFrameNumbers('drone_world', { start: 0, end: 2 }), // 3 frames
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'blue_flower_bounce',
            frames: this.anims.generateFrameNumbers('blue_flower', { start: 0, end: 4 }), // 5 frames
            frameRate: 5,
            repeat: -1
        });

        this.anims.create({
            key: 'yellow_flower_bounce',
            frames: this.anims.generateFrameNumbers('yellow_flower', { start: 0, end: 4 }), // 5 frames
            frameRate: 5,
            repeat: -1
        });

        // Create bee sprites and initialize the bee AI
        this.worldSceneBees = new DroneBeeManager(this);

        for (let i = 0; i < 2; i++)
            this.worldSceneBees.createDroneBee();

        // Array to keep track of flowers
        this.flowers = this.physics.add.group();

        this.events.on('spawnDrone', () => this.worldSceneBees.createDroneBee());
    }

    spawnFlower() {

        // 50/50 chance for flower color
        const type = Phaser.Math.Between(0, 1) === 1 ? 'yellow_flower' : 'blue_flower';

        // Randomly place the flower on the ground
        let x = Phaser.Math.Between(200, this.gameState.gameWidth * 0.9);
        let y = Phaser.Math.Between(this.gameState.gameHeight - 120, this.gameState.gameHeight - 20);

        // Create flower, add animation, add to flower list
        const flower = this.add.sprite(x, y, type).setScale(1.7, 1.7);
        type === 'blue_flower' ? flower.play('blue_flower_bounce') : flower.play('yellow_flower_bounce');
        flower.busy = false;
        this.flowers.add(flower);

        // Create an invisible circle around the flower so drone bees have better chance to find flower
        const aura = this.add.circle(x, y, 80, 0x000000, 0);
        this.physics.add.existing(aura);
        aura.body.setCircle(50);
        flower.setData('aura', aura);

        // Tween to despawn the flower if its been alive too long
        const fadeTween = this.tweens.add({
            targets: flower,
            alpha: { from: 1, to: 1 },
            duration: 45000,
            onComplete: () => {
                if (flower.active) {
                    flower.getData('aura').destroy();
                    flower.destroy();
                }
            }
        });
        flower.setData('fadeTween', fadeTween);

        flower.setInteractive();

        // Listen for mouse click
        flower.on('pointerdown', () => {
            const scenes = this.sys.game.scene.getScenes(true);
            const hiveScene = scenes.find(scene => scene.scene.key === 'Hive');

            if (hiveScene) {
                hiveScene.events.emit('collectPlayerNectar');
                this.worldSceneBees.collectNectarEffect(x, y);
                const fadeTween = flower.getData('fadeTween');
                if (fadeTween) fadeTween.stop(); // Stop the fade effect. This way it wont try to delete an already deleted flower
                const aura = flower.getData('aura');
                if (aura) aura.destroy();
                flower.destroy();
            }
        });
    }

    update(time, delta) {
        this.background.tilePositionX += 0.1; // Slowly shift clouds over time
        this.worldSceneBees.update(time, delta); // Update bee AI

        this.elapsedTime += delta;

        // spawn a flower every 10s
        if (this.elapsedTime >= 5000) {
            this.elapsedTime = 0;
            this.spawnFlower();
        }
    }
}
