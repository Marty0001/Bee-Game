// bee.js

export default class Bee {
    constructor(sprite, type) {

        // Worker and drone
        this.sprite = sprite;
        this.type = type;
        this.energy = 100;
        this.maxEnergy = 100;
        this.energyConsumptionRate = 0.1;
        this.isEating = false;
        this.nectar = 0;
        this.water= 0;
        this.honey = 0;

        // Worker
        this.task = 'idle';
        this.isWorking = false;

        // Drone
        this.nectarCapacity = 5;
        this.timeSinceLastChange = Phaser.Math.Between(0, 2000);
        this.changeDirectionTime = Phaser.Math.Between(1000, 3000);
        this.isReturning = false;
        this.isCollecting = false;
        
    }

    // Method to reduce energy
    consumeEnergy(delta) {
        this.energy -= this.energyConsumptionRate * (delta / 1000);
    }

    // Check if bee is dead
    isDead() {
        return this.energy <= 0;
    }

}
