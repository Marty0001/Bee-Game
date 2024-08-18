import GlobalGameState from './game_state.js';


// Temporarily displays drone bee in hive depositing to random honey combs
export default class TemporaryBee {
    constructor(scene) {
        this.scene = scene;

        this.gameState = GlobalGameState.getInstance();

    }

    // Used for when a drone bee is born from larvae. Show it leaving the hive from the larave comb it came from
    createDroneBee(x, y) {
        const tempBee = this.createTempBee(x, y);
        this.exitBee(tempBee);
    }

    //Create sequence of steps for drone bee to travel to honey combs and deposit
    handleBeeReturn({ bee }) {

        const tempBee = this.createTempBee();

        // Select a random honeycomb to deposit nectar and water in
        const targetNectarHoneycomb = this.getRandomHoneycomb('nectar');
        const targetWaterHoneycomb = this.getRandomHoneycomb('water');

        // Create a sequence of actions for the bee, only including steps with non-zero amounts
        const sequence = [
            { honeycomb: targetWaterHoneycomb, amount: bee.water, type: 'water' },
            { honeycomb: targetNectarHoneycomb, amount: bee.nectar, type: 'nectar' }
        ].filter(step => step.amount > 0);

        // Start processing the sequence of actions
        this.handleBeeSequence(tempBee, sequence, bee);
    }

    // Iterate through the bees destinations to show them moving between honey combs and leaving
    handleBeeSequence(tempBee, sequence, bee) {
        // Get the next step in the sequence
        const step = sequence.shift();
        if (!step) {
            // If there are no more steps, exit the bee
            this.exitBee(tempBee, bee);
            return;
        }

        // Move the bee to the target honeycomb
        this.moveBeeToHoneycomb(tempBee, step.honeycomb, () => {
            // Deposit the amount once the bee reaches the comb
            this.depositToHoneycomb(step.honeycomb, step.amount, step.type, bee, tempBee);
            // Wait 500 milliseconds before going to the next step
            this.scene.time.delayedCall(500, () => {
                this.handleBeeSequence(tempBee, sequence, bee);
            });
        });
    }

    // Create a seperate temporary drone bee sprite to visualize it depositing water/nectar in the hive while the real one is invisible
    createTempBee(x = this.gameState.gameWidth + 20, y = this.gameState.gameHeight / 2) {
        return this.scene.physics.add.sprite(x, y, 'drone_bee').setScale(1.3).play('drone_fly').setDepth(9);
    }

    // Make bee travel to honey comb
    moveBeeToHoneycomb(tempBee, targetHoneycomb, onComplete) {
        // Calculate the target position (audjust for center of the honeycomb)
        const honeycombX = targetHoneycomb.sprite.x + 20;
        const honeycombY = targetHoneycomb.sprite.y + 25;

        // Event to move the bee towards the honeycomb
        const moveEvent = this.scene.time.addEvent({
            delay: 1000 / 60, // 60 FPS update rate
            loop: true,
            callback: () => {
                // Calculate the direction towards the target
                const dx = honeycombX - tempBee.x;
                const dy = honeycombY - tempBee.y;

                // Calculate the angle to the target
                const angle = Math.atan2(dy, dx);
                const speed = 200;

                // Calculate the velocity
                const vx = speed * Math.cos(angle);
                const vy = speed * Math.sin(angle);

                // Set the bees velocity
                tempBee.setVelocityX(vx);
                tempBee.setVelocityY(vy);

                // Flip the bee sprite based on the x velocity
                tempBee.setFlipX(vx > 0);

                // Once the bee has reached the honeycomb, remove the event, stop bee from moving, use callback on completeion
                if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
                    moveEvent.remove();
                    tempBee.setVelocity(0, 0);
                    onComplete();
                }
            }
        });
    }

    // Subtract amount from bee and add it to honey comb
    depositToHoneycomb(targetHoneycomb, amount, type, bee, tempBee) {
        if (type === 'water') {
            // Update the water amount in the honeycomb and reset the bee's water data
            targetHoneycomb.waterAmount = Math.min(targetHoneycomb.waterAmount + amount, targetHoneycomb.maxWater);
            bee.water = 0;
            this.depositWaterEffect(tempBee.x, tempBee.y);
            this.scene.updateWater();
        } else if (type === 'nectar') {
            // Update the nectar amount in the honeycomb and reset the bee's nectar data
            targetHoneycomb.nectarAmount = Math.min(targetHoneycomb.nectarAmount + amount, targetHoneycomb.maxNectar);
            bee.nectar = 0;
            this.depositNectarEffect(tempBee.x, tempBee.y);
            this.scene.updateNectar();
        }
        // Update the visual frame of the honeycomb based on the new amounts
        targetHoneycomb.updateHoneycombFrame();
    }

    // Show the bee leaving the hive, make bee in world scene visible again
    exitBee(tempBee, bee) {
        // Set the exit position to the right side of the screen
        const exitX = this.gameState.gameWidth + 20;
        const exitY = tempBee.y;

        // Event to move the bee towards the right
        const moveEvent = this.scene.time.addEvent({
            delay: 1000 / 60, // 60 FPS update rate
            loop: true,
            callback: () => {
                // Calculate the direction towards the exit
                const dx = exitX - tempBee.x;
                const dy = exitY - tempBee.y;

                // Calculate the angle to the exit
                const angle = Math.atan2(dy, dx);
                const speed = 200;

                // Calculate the velocity
                const vx = speed * Math.cos(angle);
                const vy = speed * Math.sin(angle);

                // Set the bees velocity
                tempBee.setVelocityX(vx);
                tempBee.setVelocityY(vy);

                // Flip the bee sprite based on the x velocity
                tempBee.setFlipX(vx > 0);

                // Check if the bee has exited the screen
                if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
                    moveEvent.remove();
                    tempBee.destroy(); // Destroy the temp bee
                    // Display the bee in the world scene again, set isReturning to false so it will start wandering again
                    if (bee) {
                        bee.sprite.setAlpha(1);
                        bee.isReturning = false;
                    } else {
                        const scenes = this.scene.sys.game.scene.getScenes(true);
                        const worldScene = scenes.find(scene => scene.scene.key === 'World');
                        worldScene.events.emit("spawnDrone")
                    }

                }
            }
        });
    }

    getRandomHoneycomb(type) {

        if (type === 'water') {
            const honeycombs = this.scene.honeycombs.filter(honeyComb => honeyComb.type === type);
            return Phaser.Utils.Array.GetRandom(honeycombs);
        } else {
            const honeycombs = this.scene.honeycombs.filter(honeyComb => honeyComb.type === type);
            return Phaser.Utils.Array.GetRandom(honeycombs);
        }
    }


    depositNectarEffect(x, y) {
        const emitter = this.scene.add.particles(x, y + 20, 'nectar_particle', {
            speed: 50,
            duration: 600,
            gravityY: 200,
            maxAliveParticles: 8,
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            deathZone: {
                type: 'onExit',
                source: new Phaser.Geom.Circle(x, y, 100) // 50 pixels radius
            },
        });
    }

    depositWaterEffect(x, y) {
        const emitter = this.scene.add.particles(x, y + 20, 'water_particle', {
            speed: 50,
            duration: 600,
            gravityY: 200,
            maxAliveParticles: 5,
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            deathZone: {
                type: 'onExit',
                source: new Phaser.Geom.Circle(x, y, 100) // 50 pixels radius
            },
        });
    }
}
