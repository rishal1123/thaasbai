/**
 * Game class - Main game controller for Dhiha Ei
 */
import { Deck } from './Deck.js';
import { Player } from './Player.js';
import { AIPlayer } from './AIPlayer.js';
import { Trick } from './Trick.js';
import { Rules } from './Rules.js';
import { delay } from '../utils/helpers.js';

export class Game {
    constructor() {
        this.deck = new Deck();
        this.players = [];
        this.currentTrick = null;
        this.currentPlayerIndex = 0;
        this.trickNumber = 0;
        this.superiorSuit = null;
        this.tricksWon = [0, 0]; // Team 0, Team 1
        this.tensCollected = [0, 0];
        this.gameOver = false;
        this.winner = null;

        // Event callbacks
        this.onStateChange = null;
        this.onTrickComplete = null;
        this.onGameOver = null;
        this.onSuperiorSuitEstablished = null;
        this.onCardPlayed = null;

        this.initializePlayers();
    }

    /**
     * Initialize the 4 players (1 human, 3 AI)
     * Teams: 0 = human + partner (positions 0,2), 1 = opponents (positions 1,3)
     */
    initializePlayers() {
        // Position 0: Human (bottom), Team 0
        this.players.push(new Player(0, 0, true));

        // Position 1: AI (left), Team 1
        this.players.push(new AIPlayer(1, 1));

        // Position 2: AI Partner (top), Team 0
        this.players.push(new AIPlayer(2, 0));

        // Position 3: AI (right), Team 1
        this.players.push(new AIPlayer(3, 1));
    }

    /**
     * Start a new game
     */
    startGame() {
        this.reset();
        this.dealCards();
        this.currentTrick = new Trick();
        this.notifyStateChange();
    }

    /**
     * Reset game state
     */
    reset() {
        this.deck = new Deck();
        this.currentPlayerIndex = 0;
        this.trickNumber = 0;
        this.superiorSuit = null;
        this.tricksWon = [0, 0];
        this.tensCollected = [0, 0];
        this.gameOver = false;
        this.winner = null;
        this.currentTrick = null;
    }

    /**
     * Deal cards to all players
     */
    dealCards() {
        const hands = this.deck.deal(4);
        for (let i = 0; i < 4; i++) {
            this.players[i].setHand(hands[i]);
        }
    }

    /**
     * Get the current player
     * @returns {Player} Current player
     */
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    /**
     * Check if it's the human player's turn
     * @returns {boolean} True if human's turn
     */
    isHumanTurn() {
        return this.getCurrentPlayer().isHuman;
    }

    /**
     * Get the led suit for the current trick
     * @returns {string|null} Led suit or null if leading
     */
    getLedSuit() {
        return this.currentTrick ? this.currentTrick.ledSuit : null;
    }

    /**
     * Get valid cards for the current player
     * @returns {Array<Card>} Valid cards to play
     */
    getValidCards() {
        const player = this.getCurrentPlayer();
        return player.getValidCards(this.getLedSuit());
    }

    /**
     * Play a card from the current player
     * @param {Card} card - Card to play
     * @returns {boolean} True if card was played successfully
     */
    async playCard(card) {
        if (this.gameOver) return false;

        const player = this.getCurrentPlayer();
        const ledSuit = this.getLedSuit();

        // Validate move
        if (!Rules.canPlayCard(player, card, ledSuit)) {
            console.warn('Invalid card play attempted');
            return false;
        }

        // Play the card
        const playedCard = player.playCard(card);
        if (!playedCard) return false;

        // Check if this establishes superior suit
        const superiorResult = Rules.handleSuperiorSuit(
            playedCard,
            ledSuit,
            this.superiorSuit,
            player
        );

        if (superiorResult.established) {
            this.superiorSuit = superiorResult.newSuperior;
            if (this.onSuperiorSuitEstablished) {
                this.onSuperiorSuitEstablished(this.superiorSuit, player);
            }
        }

        // Add to current trick
        this.currentTrick.addCard(playedCard, player.position, player);

        // Notify card played
        if (this.onCardPlayed) {
            this.onCardPlayed(playedCard, player);
        }

        // Check if trick is complete
        if (this.currentTrick.isComplete()) {
            await this.completeTrick();
        } else {
            // Move to next player
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 4;
            this.notifyStateChange();
        }

        return true;
    }

    /**
     * Complete the current trick
     */
    async completeTrick() {
        // Determine winner
        const winner = this.currentTrick.determineWinner(this.superiorSuit);
        const winningTeam = winner.player.team;

        // Award trick
        this.tricksWon[winningTeam]++;

        // Collect any 10s
        const tens = this.currentTrick.getTens();
        this.tensCollected[winningTeam] += tens.length;

        // Notify trick complete
        if (this.onTrickComplete) {
            await this.onTrickComplete(winner, this.currentTrick, tens);
        }

        this.trickNumber++;

        // Check for game over
        const gameResult = Rules.checkMatchWinner({
            tensCollected: this.tensCollected,
            tricksWon: this.tricksWon,
            trickNumber: this.trickNumber
        });

        if (gameResult) {
            this.gameOver = true;
            this.winner = gameResult;
            if (this.onGameOver) {
                this.onGameOver(gameResult);
            }
            return;
        }

        // Start new trick
        this.currentTrick = new Trick();
        this.currentPlayerIndex = winner.position;
        this.notifyStateChange();
    }

    /**
     * Let AI players take their turn
     */
    async playAITurn() {
        if (this.gameOver) return;

        const player = this.getCurrentPlayer();
        if (player.isHuman) return;

        // Small delay for visual effect
        await delay(600);

        const card = player.chooseCard(
            this.getLedSuit(),
            this.superiorSuit,
            this.currentTrick.getCards(),
            this.getGameState()
        );

        await this.playCard(card);
    }

    /**
     * Continue the game (process AI turns until human's turn or game over)
     */
    async continueGame() {
        while (!this.gameOver && !this.isHumanTurn()) {
            await this.playAITurn();
        }
    }

    /**
     * Get current game state
     * @returns {Object} Current state
     */
    getGameState() {
        return {
            currentPlayer: this.currentPlayerIndex,
            ledSuit: this.getLedSuit(),
            superiorSuit: this.superiorSuit,
            tricksWon: [...this.tricksWon],
            tensCollected: [...this.tensCollected],
            trickNumber: this.trickNumber,
            trickCards: this.currentTrick ? this.currentTrick.getCards() : [],
            gameOver: this.gameOver,
            winner: this.winner
        };
    }

    /**
     * Get player at a specific position
     * @param {number} position - Position (0-3)
     * @returns {Player} Player at position
     */
    getPlayer(position) {
        return this.players[position];
    }

    /**
     * Get human player
     * @returns {Player} Human player
     */
    getHumanPlayer() {
        return this.players[0];
    }

    /**
     * Notify state change
     */
    notifyStateChange() {
        if (this.onStateChange) {
            this.onStateChange(this.getGameState());
        }
    }
}
