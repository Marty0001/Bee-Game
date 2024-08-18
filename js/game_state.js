export default class GlobalGameState {
    constructor(gameWidth, gameHeight) {
        if (!GlobalGameState.instance) {
            this.beeCounts = { drone: 0, worker: 0 };
            this.hiveNectar = 0;
            this.hiveWater = 0;
            this.hiveHoney = 0;

            this.currentScene = 'World';

            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;

            this.droneBeeNectarEfficiency = 6;
            this.droneBeeWaterEfficiency = 3;

            this.workerBeeHoneyEfficiency = 2; 

            GlobalGameState.instance = this;
        }
        return GlobalGameState.instance;
    }

    static getInstance() { return new GlobalGameState(); }

    setBeeCount(type, count) { this.beeCounts[type] = count; }

    setHiveNectar(amount) { this.hiveNectar = amount; }

    setHiveWater(amount) { this.hiveWater = amount; }

    setHiveHoney(amount) { this.hiveHoney = amount; }

    getBeeCount(type) { return this.beeCounts[type]; }

    getHiveHoney() { return this.hiveHoney; }

    getHiveNectar() { return this.hiveNectar; }

    getHiveWater() { return this.hiveWater; }
}
