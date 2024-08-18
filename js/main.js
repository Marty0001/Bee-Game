// Import scenes
import World from './world_scene.js';
import Hive from './hive_scene.js';
import GameBar from './gamebar_scene.js';
import GlobalGameState from './game_state.js';

const globalGameState = new GlobalGameState(window.innerWidth, window.innerHeight);

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    scene: [Hive, World, GameBar],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.ScaleModes.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);
