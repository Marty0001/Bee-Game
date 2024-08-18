import GlobalGameState from './game_state.js';
import TemporaryBee from './temporary_bee.js';
import WorkerBeeManager from './worker_bee_manager.js';
import HoneyComb from './honeycomb.js';

export default class Hive extends Phaser.Scene {
    constructor() {
        super({ key: 'Hive', active: true, visible: false });
        this.honeycombs = [];
        this.inactiveHoneycombs = [];
        this.gameState = GlobalGameState.getInstance();

        this.temporaryBee = new TemporaryBee(this);

        this.hiveSceneBees = new WorkerBeeManager(this);
    }

    preload() {
        // Load assets
        this.load.image('hive_background', 'assets/hive_background.png');
        this.load.image('water_particle', 'assets/water_particle.png');
        this.load.image('nectar_particle', 'assets/nectar_particle.png');

        this.load.spritesheet('drone_bee', 'assets/drone_bee.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('worker_bee', 'assets/worker_bee2.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('nectar', 'assets/nectar.png', {
            frameWidth: 45,
            frameHeight: 52
        });
        this.load.spritesheet('honey', 'assets/honey.png', {
            frameWidth: 45,
            frameHeight: 52
        });
        this.load.spritesheet('water', 'assets/water.png', {
            frameWidth: 45,
            frameHeight: 52
        });
        this.load.spritesheet('larvae', 'assets/larvae.png', {
            frameWidth: 45,
            frameHeight: 52
        });
    }

    create() {

        // Add the hive background and scale to fit the screen
        const background = this.add.image(this.gameState.gameWidth / 2, this.gameState.gameHeight / 2, 'hive_background');
        background.setDisplaySize(this.gameState.gameWidth + 5, this.gameState.gameHeight + 5);

        const honeyCombWidth = 50;
        const honeyCombHeight = 52;
        const gap = 6;
        const gameBarHeight = 105;

        //Fixed aomunt or honey comb rows, but columns determined by screen width
        const rows = 10; // Fixed number of rows
        const cols = Math.ceil(this.gameState.gameWidth / (honeyCombWidth + gap)) - 1; // -1 to avoid honey combs being off screen

        let honeyCombID = 0;

        // Create honey combs
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {

                // Shift every other row to the right by half honeycomb width
                const x = col * (honeyCombWidth + gap) + (row % 2) * ((honeyCombWidth + gap) / 2);
                const y = row * (honeyCombHeight) + gameBarHeight;

                const randomValue = Phaser.Math.Between(0, 99);

                // Each honey comb type has a certain chance to spawn
                let type;
                if (randomValue < 30) {
                    type = 'honey';
                } else if (randomValue < 60) {
                    type = 'nectar';
                } else if (randomValue < 75) {
                    type = 'water';
                } else {
                    type = 'larvae';
                }

                // Create honey comb sprite
                const honeyCombSprite = this.add.sprite(x, y, type);

                // Add to inactive honeycomb list
                this.inactiveHoneycombs.push(new HoneyComb(honeyCombID++, honeyCombSprite, type, this));
            }
        }

        // Activate initial honeycombs
        this.activateInitialHoneycombs();

        this.anims.create({
            key: 'drone_fly',
            frames: this.anims.generateFrameNumbers('drone_bee', { start: 0, end: 3 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'worker_walk',
            frames: this.anims.generateFrameNumbers('worker_bee', { start: 0, end: 6 }), // 4 frames
            frameRate: 8,
            repeat: -1
        });

        // Spawn 2 worker bees by default
        for (let i = 0; i < 2; i++) {
            this.hiveSceneBees.createWorkerBee();
            const honeycomb = this.honeycombs.find(honeycomb => honeycomb.type === 'larvae' && honeycomb.larvaeStage == 0)
            honeycomb.progressLarvaeStage();
        }

        // Listen for event on bee return to animate the drone bee depositing nectar and water
        this.events.on('beeReturned', this.temporaryBee.handleBeeReturn, this.temporaryBee);

        this.events.on('collectPlayerNectar', () => this.depositPlayerNectar());

        this.events.on('spawnBee', ({ honeyComb }) => this.spawnBee({ honeyComb }));

        this.events.on('activateHoneyComb', ({ id }) => this.activateHoneyComb({ id }));
    }

    spawnBee({ honeyComb }) {
        const randomBee = Phaser.Math.Between(0, 1);

        if (randomBee == 0) {
            this.hiveSceneBees.createWorkerBee(honeyComb.sprite.x + 30, honeyComb.sprite.y + 30);
        }
        else {
            this.temporaryBee.createDroneBee(honeyComb.sprite.x + 30, honeyComb.sprite.y + 30);
        }
    }

    activateHoneyComb({ id }) {
        let honeyComb = this.inactiveHoneycombs.find(honeyComb => honeyComb.id === id);
        const index = this.inactiveHoneycombs.indexOf(honeyComb);

        if (index !== -1) {
            this.inactiveHoneycombs.splice(index, 1);
        }
        this.honeycombs.push(honeyComb);

    }

    activateInitialHoneycombs() {
        // Helper function to activate a specified number of honeycombs of a given type
        const activateHoneycombsOfType = (type, count) => {
            const honeycombsOfType = this.inactiveHoneycombs.filter(honeycomb => honeycomb.type === type);
            for (let i = 0; i < count && honeycombsOfType.length > 0; i++) {
                const honeyComb = Phaser.Utils.Array.RemoveRandomElement(honeycombsOfType);
                honeyComb.setActive();

                const index = this.inactiveHoneycombs.indexOf(honeyComb);

                if (index !== -1) {
                    this.inactiveHoneycombs.splice(index, 1);
                }
                this.honeycombs.push(honeyComb);
            }
        };

        // Activate 2 honeycombs of each type initially
        activateHoneycombsOfType('honey', 2);
        activateHoneycombsOfType('nectar', 2);
        activateHoneycombsOfType('water', 2);
        activateHoneycombsOfType('larvae', 2);
    }


    depositPlayerNectar() {
        const nectarComb = this.honeycombs.find(honeycomb => honeycomb.type === 'nectar' && honeycomb.nectarAmount < honeycomb.maxNectar);
        const waterComb = this.honeycombs.find(honeycomb => honeycomb.type === 'water' && honeycomb.waterAmount < honeycomb.maxWater);

        if (nectarComb) {
            nectarComb.nectarAmount++;
            nectarComb.updateHoneycombFrame();
            this.updateNectar();
        }

        if (waterComb) {
            waterComb.waterAmount++;
            waterComb.updateHoneycombFrame();
            this.updateWater();
        }
    }


    updateNectar() {
        const totalNectar = this.honeycombs.reduce((sum, honeycomb) => sum + honeycomb.nectarAmount, 0);
        this.gameState.setHiveNectar(totalNectar);
    }

    updateWater() {
        const totalWater = this.honeycombs.reduce((sum, honeycomb) => sum + honeycomb.waterAmount, 0);
        this.gameState.setHiveWater(totalWater);
    }

    updateHoney() {
        const totalHoney = this.honeycombs.reduce((sum, honeycomb) => sum + honeycomb.honeyAmount, 0);
        this.gameState.setHiveHoney(totalHoney);
    }

    update(time, delta) {
        this.hiveSceneBees.update(time, delta);
    }
}
