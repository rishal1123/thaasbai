/**
 * Dhiha Ei - Main Entry Point
 * A traditional Maldivian card game
 */
import { Game } from './game/Game.js';
import { UIManager } from './ui/UIManager.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Dhiha Ei - Initializing game...');

    // Create game instance
    const game = new Game();

    // Create UI manager
    const ui = new UIManager(game);

    // Initialize and start
    ui.init();

    console.log('Dhiha Ei - Game initialized!');

    // Make game accessible for debugging
    window.dhihaEi = {
        game,
        ui,
        getState: () => game.getGameState()
    };
});
