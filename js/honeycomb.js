import GlobalGameState from './game_state.js';

export default class HoneyComb {

    constructor(id, sprite, type, scene) {

        this.gameState = GlobalGameState.getInstance();

        this.hiveScene = scene;

        this.maxNectar = 40;
        this.maxHoney = 40;
        this.maxWater = 30;

        this.sprite = sprite;
        this.id = id;
        this.nectarAmount = 0;
        this.waterAmount = 0;
        this.honeyAmount = 0;
        this.larvaeNutrients = 0;
        this.larvaeStage = 0;
        this.isOpen = true;
        this.isActive = false;
        this.type = type;
        this.sprite.setFrame(0).setScale(1.2).setOrigin(0).setAlpha(0.3).setInteractive();

        this.sprite.on('pointerdown', () => {
            if (this.gameState.currentScene === 'Hive') {
                if (!this.isActive) {
                    this.setActive();

                } else if (this.type === 'larvae') {
                    this.progressLarvaeStage();
                }
            }
        });
    }

    setActive() {
        this.isActive = true;
        this.sprite.setAlpha(1);

        if (this.hiveScene) {
            const id = this.id;
            this.hiveScene.events.emit('activateHoneyComb', { id });
        }
    }

    updateHoneycombFrame() {
        // The max will always be apporpiate type since the amounts of other type will always be 0
        const fullnessPercentage = Math.max(
            (this.nectarAmount / this.maxNectar) * 100,
            (this.waterAmount / this.maxWater) * 100,
            (this.honeyAmount / this.maxHoney) * 100);

        let frameIndex;
        if (fullnessPercentage < 1) {
            frameIndex = 0;
        } else if (fullnessPercentage <= 10) {
            frameIndex = 1;
        } else if (fullnessPercentage <= 20) {
            frameIndex = 2;
        } else if (fullnessPercentage <= 30) {
            frameIndex = 3;
        } else if (fullnessPercentage <= 40) {
            frameIndex = 4;
        } else {
            frameIndex = 5;
        }

        this.sprite.setFrame(frameIndex);
    }

    // Show particles for duration based on the amount of nutrients the larvae has to consume, then progress the larvae stage
    startLarvaeConsumption() {
        const consumptionTime = 10000 * this.larvaeNutrients; // 10 seconds per nutrient

        const emitter = this.hiveScene.add.particles(this.sprite.x + this.sprite.displayWidth / 2, this.sprite.y + this.sprite.displayHeight / 2, 'pollen_particle', {
            speed: { min: 10, max: 50 },
            duration: consumptionTime,
            gravityY: -200,
            velocityX: 0,
            maxAliveParticles: 16,
            scale: { start: 0.7, end: 0 },
            alpha: { start: 1, end: 0 },
            emitZone: {
                type: 'random',
                source: new Phaser.Geom.Circle(0, 0, 20)
            },
            deathZone: {
                type: 'onExit',
                source: new Phaser.Geom.Circle(this.sprite.x + this.sprite.displayWidth / 2, this.sprite.y + this.sprite.displayHeight / 2, 30) // 50 pixels radius
            },

        });

        this.hiveScene.time.delayedCall(consumptionTime, () => {
            this.larvaeNutrients = 0;
            this.progressLarvaeStage();
        });
    }


    // Increment the laravae stage, update the frame visual, and spawn bee if larvae has grown to a certain stage
    progressLarvaeStage() {
        this.larvaeStage++;
    
        if (this.larvaeStage > 4) {
    
            if (this.hiveScene) {
                this.hiveScene.events.emit('spawnBee', { honeyComb: this });
            }
    
            this.larvaeStage = 0;
        }
    
        this.sprite.setFrame(this.larvaeStage);
    }
    

}