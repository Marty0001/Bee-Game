import Bee from './bee.js';
import GlobalGameState from './game_state.js';
/*

Bee has isWorking property. They are considered working if they are traveling from one honey comb to another.

Every update checks if the bee is working, and if not, they are assigned a task

Tasks are either make honey, or feed larvae

Once they arrive at a honey comb, isWorking is set to false. 

Feed larvae task is prioritized if honey is available and a larvae needs food

otherwise they make honey if nectar or water is available.

Example process of bee collecting honey ingredients, getting inreruppted to feed larvae, then finishing the honey making processs:

task: makeHoney > isWorking = true go collect nectar > isWorking = false > update
task: makeHoney > isWorking = true > go collect water > isWorking = false > update
*larvae just moved on to next stage and needs food*
task: feedLarvae > isWorking = true > go collect honey > isWorking = false > update
task: feedLarvae > isWorking = true > go feed larvae > isWorking = false > update
task: makeHoney > isWorking = true > go make honey with water and nectar it got before feeding larvae > isWorking = false

*/

export default class WorkerBeeManager {
    constructor(scene) {
        this.scene = scene; // Store the scene reference
        this.bees = []; // Array of bee sprites
        this.gameState = GlobalGameState.getInstance();
    }

    getHoneyEfficiency() {
        return this.gameState.workerBeeHoneyEfficiency;
    }

    // Spawn worker bee
    createWorkerBee(x = 0, y = 0) {
        const beeSprite = this.scene.physics.add.sprite(
            x == 0 ? Phaser.Math.Between(0, this.gameState.gameWidth) : x, // If not default values, spawn on larvae comb location
            y == 0 ? this.gameState.gameHeight- 50 : y,
            'worker_bee'
        ).setScale(1.2).setDepth(1).play('worker_walk');
        beeSprite.anims.pause();
        
        const workerBee = new Bee(beeSprite, 'worker');
        this.bees.push(workerBee);
        this.gameState.setBeeCount('worker', this.bees.length);
    }

    // Update bee task if not currently working
    update(time, delta) {
        this.bees.forEach(bee => {
            bee.consumeEnergy(delta);

            if (bee.isDead()) {
                this.killBee(bee);
            } else if (!bee.isEating && !bee.isWorking) {
                bee.task = this.assignTask(bee);
                if (bee.task === 'makeHoney') {
                    bee.isWorking = true;
                    this.performMakeHoneyTask(bee);
                } else if (bee.task === 'feedLarvae') {
                    bee.isWorking = true;
                    this.performFeedLarvaeTask(bee);
                } else if (bee.task === 'eat') {
                    bee.isEating = true;
                    this.performEatTask(bee);
                }
            }
        });
    }

    killBee(bee) {
        const index = this.bees.indexOf(bee);
        if (index !== -1) {
            this.bees.splice(index, 1);
        }
        bee.sprite.destroy();
        this.gameState.setBeeCount('worker', this.bees.length);
    }

    // Filter through honey combs to check which task the bee should do
    assignTask(bee) {
        // Get the count of larvae that need nutrients
        const larvaeNeedingFoodCount = this.scene.honeycombs.filter(honeycomb =>
            honeycomb.type === 'larvae' &&
            honeycomb.larvaeNutrients === 0 &&
            honeycomb.larvaeStage > 0 &&
            honeycomb.isOpen
        ).length;

        // Get the count of bees with honey
        const beesWithHoneyCount = this.bees.filter(bee => bee.honey > 0).length;

        const availableHoney = this.scene.honeycombs.some(honeycomb => honeycomb.type === 'honey' && honeycomb.honeyAmount > 0 && honeycomb.isOpen);

        const availableNectar = this.scene.honeycombs.some(honeycomb => honeycomb.type === 'nectar' && honeycomb.nectarAmount > 0 && honeycomb.isOpen);
        const availableWater = this.scene.honeycombs.some(honeycomb => honeycomb.type === 'water' && honeycomb.waterAmount > 0 && honeycomb.isOpen);

        // Give feed larvae task to bee if a larvae needs food, there's available honey, and it needs a feeder or has honey to feed it
        if (bee.energy <= 20 && !bee.isEating && availableHoney) {
            return 'eat';
        } else if (availableHoney && (beesWithHoneyCount < larvaeNeedingFoodCount || bee.honey > 0)) {
            return 'feedLarvae';
        } else if (availableNectar || availableWater) {
            return 'makeHoney';
        } else {
            return 'idle';
        }
    }

    // If there's available water or nectar, and the bee can carry more, go collect. If it's at capacity, make the honey. Otherwise do nothing
    performMakeHoneyTask(bee) {
        const targetWater = this.scene.honeycombs.find(honeycomb => (honeycomb.type === 'water' && honeycomb.waterAmount > 0 && honeycomb.isOpen));
        const targetNectar = this.scene.honeycombs.find(honeycomb => (honeycomb.type === 'nectar' && honeycomb.nectarAmount > 0 && honeycomb.isOpen));

        if (bee.water < this.getHoneyEfficiency() / 2 && targetWater) {
            this.collectResources(bee, targetWater);
        } else if (bee.nectar < this.getHoneyEfficiency() && targetNectar) {
            this.collectResources(bee, targetNectar);
        } else if (bee.water >= this.getHoneyEfficiency() / 2 && bee.nectar >= this.getHoneyEfficiency()) {
            this.produceHoney(bee);
        } else {
            bee.isWorking = false;
        }
    }

    // Move bee to honey comb if it doesn't have enough to feed the larvae at its current stage, otherwise go to feed the larvae
    performFeedLarvaeTask(bee) {
        const larvaeComb = this.scene.honeycombs.find(honeycomb => honeycomb.type === 'larvae' && honeycomb.larvaeNutrients === 0 && honeycomb.larvaeStage > 0 && honeycomb.isOpen);

        if (!larvaeComb) {
            bee.isWorking = false;
            return;
        }

        if (bee.honey < this.getRequiredHoney(larvaeComb.larvaeStage)) {
            this.collectHoney(bee, larvaeComb);
        } else {
            this.feedLarvae(bee, larvaeComb);
        }
    }

    // Move bee to honey comb to eat up to 10 honey. 1 honey = 10 energy
    performEatTask(bee) {
        const honeycombWithHoney = this.scene.honeycombs.find(honeycomb => honeycomb.type === 'honey' && honeycomb.honeyAmount > 0 && honeycomb.isOpen);

        if (honeycombWithHoney) {
            honeycombWithHoney.isOpen = false;
            this.moveBeeToHoneycomb(bee, honeycombWithHoney, () => {
                const eatenHoney = Math.min(10, honeycombWithHoney.honeyAmount);
                bee.energy += eatenHoney * 10;
                honeycombWithHoney.honeyAmount -= eatenHoney;
                if (bee.energy >= bee.maxEnergy) {
                    bee.energy = bee.maxEnergy;
                }
                honeycombWithHoney.isOpen = true;
                bee.isEating = false;
                honeycombWithHoney.updateHoneycombFrame();
                this.scene.updateHoney();
            });
        } else {
            bee.isEating = false; // If no honeycomb available, stop eating task
        }
    }

    // Move bee to nectar or water comb and collect amount based on the honey efficiency
    collectResources(bee, targetHoneycomb) {
        targetHoneycomb.isOpen = false;

        this.moveBeeToHoneycomb(bee, targetHoneycomb, () => {
            if (targetHoneycomb.type === 'water') {
                const collectedWater = Math.min(this.getHoneyEfficiency() / 2 - bee.water, targetHoneycomb.waterAmount);
                bee.water += collectedWater;
                targetHoneycomb.waterAmount -= collectedWater;
            } else {
                const collectedNectar = Math.min(this.getHoneyEfficiency() - bee.nectar, targetHoneycomb.nectarAmount);
                bee.nectar += collectedNectar;
                targetHoneycomb.nectarAmount -= collectedNectar;
            }
            targetHoneycomb.updateHoneycombFrame();
            bee.isWorking = false;
            targetHoneycomb.isOpen = true;
            this.scene.updateWater();
        });
    }

    // Move bee to honey comb, reset its carrying water and nectar, add honey to comb
    produceHoney(bee) {
        const targetComb = Phaser.Utils.Array.GetRandom(this.scene.honeycombs.filter(honeyComb => honeyComb.type === 'honey' && honeyComb.honeyAmount < honeyComb.maxHoney));

        if (targetComb) {
            this.moveBeeToHoneycomb(bee, targetComb, () => {
                this.scene.time.delayedCall(5000, () => {
                    targetComb.honeyAmount += bee.nectar + bee.water;
                    bee.nectar = 0;
                    bee.water = 0;
                    targetComb.updateHoneycombFrame();
                    this.scene.updateHoney();
                    bee.isWorking = false;
                });
            });
        }
    }

    // Move bee to honey comb, collect only the honey it needs or as much as it can from the comb
    collectHoney(bee, larvaeComb) {
        larvaeComb.isOpen = false;
        const targetComb = this.scene.honeycombs.find(honeycomb => honeycomb.type === 'honey' && honeycomb.honeyAmount > 0 && honeycomb.isOpen);

        if (targetComb) {
            targetComb.isOpen = false;
            this.moveBeeToHoneycomb(bee, targetComb, () => {
                const collectedHoney = Math.min(this.getRequiredHoney(larvaeComb.larvaeStage) - bee.honey, targetComb.honeyAmount);
                bee.honey += collectedHoney;
                targetComb.honeyAmount -= collectedHoney;
                targetComb.updateHoneycombFrame();
                this.scene.updateHoney();
                targetComb.isOpen = true;
                larvaeComb.isOpen = true;
                bee.isWorking = false;
            });
        }
    }

    // Move bee to larvae comb, then deposit honey to feed larvae
    feedLarvae(bee, larvaeComb) {
        larvaeComb.isOpen = false;
        this.moveBeeToHoneycomb(bee, larvaeComb, () => {
            larvaeComb.larvaeNutrients += bee.honey;
            bee.honey = 0;
            larvaeComb.isOpen = true;
            bee.isWorking = false;
            larvaeComb.startLarvaeConsumption();
        });
    }

    getRequiredHoney(larvaeStage) { return larvaeStage * 2; }

    moveBeeToHoneycomb(bee, targetHoneycomb, onArrival) {
        bee.sprite.anims.resume();
        // Get the current position and the target position
        const startX = bee.sprite.x;
        const startY = bee.sprite.y;

        // Adjust for center
        const targetX = targetHoneycomb.sprite.x + 20;
        const targetY = targetHoneycomb.sprite.y + 30;

        // Calculate the distance between the start and target
        const dx = targetX - startX;
        const dy = targetY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Avoid division by zero
        if (distance === 0) {
            return;
        }

        // Calculate the velocity components
        const speed = 150;
        const velocityX = (dx / distance) * speed;
        const velocityY = (dy / distance) * speed;

        // Set the initial velocity
        bee.sprite.setVelocityX(velocityX);
        bee.sprite.setVelocityY(velocityY);

        // Calculate the angle to rotate the sprite
        const angle = Math.atan2(dy, dx);

        // Set the rotation and flip of the bee sprite
        bee.sprite.setRotation(angle + Math.PI / 2); // Add PI/2 to align the top of the sprite with the direction

        // Create an update event to check if the bee has arrived
        const moveEvent = this.scene.time.addEvent({
            delay: 1000 / 60, // 60 FPS update rate
            loop: true,
            callback: () => {
                // Check if the bee is close enough to the target
                const distanceToTarget = Math.sqrt(
                    (targetX - bee.sprite.x) ** 2 + (targetY - bee.sprite.y) ** 2
                );

                if (distanceToTarget < 10) {
                    // Stop the bee's movement
                    bee.sprite.setVelocity(0, 0);
                    bee.sprite.anims.pause();

                    // Call the onArrival callback
                    this.scene.time.delayedCall(500, () => {
                        bee.energy -= 3;
                        onArrival();
                    });

                    // Remove the update event and the line
                    moveEvent.remove();
                }
            }
        });
    }
}
