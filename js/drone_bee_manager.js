import Bee from './bee.js';
import GlobalGameState from './game_state.js';

export default class DroneBeeManager {
    constructor(scene) {
        this.scene = scene; // Store the scene reference
        this.bees = []; // Array of bees
        this.gameState = GlobalGameState.getInstance();
    }

    createDroneBee() {
        const beeSprite = this.scene.physics.add.sprite(190, this.gameState.gameHeight - 140, 'drone_bee')
            .setScale(0.3).play('drone_fly').setDepth(9).setCollideWorldBounds(true);

        const droneBee = new Bee(beeSprite, 'drone');
        this.bees.push(droneBee);
        this.gameState.setBeeCount('drone', this.bees.length);
    }

    // If bee is not collecting or returning, check if its near a flower, and update bee velocity based on its randomized changeDirectionTime
    update(time, delta) {
        this.bees.forEach(bee => {
            bee.timeSinceLastChange += delta;
            if (!bee.isReturning && !bee.isCollecting) {
                if (bee.timeSinceLastChange >= bee.changeDirectionTime) {
                    this.wander(bee);
                }
                this.scene.physics.overlap(bee.sprite, this.scene.flowers.getChildren().map(flower => flower.getData('aura')), (beeSprite, aura) => {
                    const flower = this.scene.flowers.getChildren().find(f => f.getData('aura') === aura);
                    if ((bee.nectar < bee.nectarCapacity) && flower && !flower.busy) {
                        bee.isCollecting = true;
                        flower.busy = true;
                        this.moveToFlower(bee, flower);
                    }
                });
            }
        });
    }

    killBee(bee) {
        const index = this.bees.indexOf(bee);
        if (index !== -1) {
            this.bees.splice(index, 1);
        }
        bee.sprite.destroy();
        this.gameState.setBeeCount('drone', this.bees.length);
    }


    // Give a random velocity to the bee, giving bias to avoid staying in one area too long or flying too high
    wander(bee) {
        const x = bee.sprite.x;
        const y = bee.sprite.y;

        // Calculate the bias based on the bee's position
        const edgeBias = 0.05; // Avoid going within 5% from the edges
        let xBias = 0;
        let yBias = 0;

        // Bias the xVelocity based on the bee's position
        if (x < this.gameState.gameWidth * edgeBias) {
            xBias = Phaser.Math.Between(20, 70); // Move right if on the left edge
        } else if (x > this.gameState.gameWidth * (1 - edgeBias)) {
            xBias = Phaser.Math.Between(-70, -20); // Move left if on the right edge
        } else {
            xBias = Phaser.Math.Between(-40, 70); // Default bias to fly to the right
        }

        if (y < this.gameState.gameHeight * 0.8) {
            yBias = Phaser.Math.Between(5, 10); // Move back down to stay within range of flower spawn
        }
        else {
            yBias = Phaser.Math.Between(-10, 10); // No verical bias
        }

        // Apply velocity to the bee
        bee.sprite.setVelocityX(xBias);
        bee.sprite.setVelocityY(yBias);

        // Flip based on direction
        bee.sprite.setFlipX(xBias > 0);

        // Reset the timers with random values
        bee.timeSinceLastChange = 0;
        bee.changeDirectionTime = Phaser.Math.Between(1000, 3000);
    }

    // Move bee on top of the flower sprite
    moveToFlower(bee, flower) {
        const flowerX = flower.x;
        const flowerY = flower.y;

        // Move bee on top of flower
        const moveEvent = this.scene.time.addEvent({
            delay: 1000 / 60, // 60 FPS update rate
            loop: true,
            callback: () => {
                const dx = flowerX - bee.sprite.x;
                const dy = flowerY - bee.sprite.y;

                const angle = Math.atan2(dy, dx);
                const speed = 50;

                const vx = speed * Math.cos(angle);
                const vy = speed * Math.sin(angle);

                bee.sprite.setVelocityX(vx);
                bee.sprite.setVelocityY(vy);

                // Flip the bee sprite based on the x velocity
                bee.sprite.setFlipX(vx > 0);

                // Check if the bee has reached the flower
                if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
                    moveEvent.remove();
                    this.collectNectar(bee, flower);
                }
            }
        });
    }

    // Collect water and nectar based on efficieny, despawn flower
    collectNectar(bee, flower) {

        // Bee stays still while collecting
        bee.sprite.setVelocity(0, 0);

        // Collect nectar from flower, add it to the bee
        bee.nectar += Phaser.Math.Between(1, this.gameState.droneBeeNectarEfficiency);
        bee.water += Phaser.Math.Between(1, this.gameState.droneBeeWaterEfficiency);

        // Wait 1 second before returning to hive for better visual
        this.scene.time.delayedCall(1000, () => {
            bee.isCollecting = false;

            // Make sure the bee has nectar before returning so that any other nearby bees who missed the nectar dont go back too
            if (bee.nectar > 0) {
                const fadeTween = flower.getData('fadeTween');
                if (fadeTween) {
                    fadeTween.stop();
                }

                const aura = flower.getData('aura');
                if (aura) {
                    aura.destroy();
                }

                flower.destroy();

                this.collectNectarEffect(bee.sprite.x, bee.sprite.y);
                this.returnToHive(bee);
            }
        });
    }

    collectNectarEffect(x, y) {
        const emitter = this.scene.add.particles(x, y, 'pollen_particle', {
            speed: 50,
            duration: 300,
            gravityY: 100,
            maxAliveParticles: 10,
            scale: { start: 0.5, end: 0.1 },
            deathZone: {
                type: 'onExit',
                source: new Phaser.Geom.Circle(x, y, 25) // 25 pixels radius
            },
        });
    }

    // Notify the hive scene to show create a temporarty drone bee sprite depositing the nectar and water
    notifyHive(bee) {
        const scenes = this.scene.sys.game.scene.getScenes(true);
        const hiveScene = scenes.find(scene => scene.scene.key === 'Hive');

        if (hiveScene) {
            hiveScene.events.emit('beeReturned', { bee });
        }
    }

    // Move drone bee back to the hive, make it invisible until it finishes depositing
    returnToHive(bee) {
        bee.isReturning = true;
        const hiveX = 190;
        const hiveY = this.gameState.gameHeight - 140;

        const moveEvent = this.scene.time.addEvent({
            delay: 1000 / 60, // 60 FPS update rate
            loop: true,
            callback: () => {
                const dx = hiveX - bee.sprite.x;
                const dy = hiveY - bee.sprite.y;

                const angle = Math.atan2(dy, dx);
                const speed = 50;

                const vx = speed * Math.cos(angle);
                const vy = speed * Math.sin(angle);

                bee.sprite.setVelocityX(vx);
                bee.sprite.setVelocityY(vy);

                // Make bee face hive
                bee.sprite.setFlipX(vx > 0);

                // Check if the bee has reached the hive
                if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
                    moveEvent.remove();
                    // Make the bee disappear and pause its movement. Notify hive to show the bee depositing nectar
                    bee.sprite.setVelocity(0, 0);
                    bee.sprite.setAlpha(0);
                    this.notifyHive(bee);
                }
            }
        });
    }
}
