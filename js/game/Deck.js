/**
 * Deck class for managing a standard 52-card deck
 */
import { Card } from './Card.js';
import { shuffle } from '../utils/helpers.js';

export class Deck {
    constructor() {
        this.cards = [];
        this.initialize();
    }

    /**
     * Initialize deck with 52 cards
     */
    initialize() {
        this.cards = [];
        for (const suit of Card.SUITS) {
            for (const rank of Card.RANKS) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }

    /**
     * Shuffle the deck using Fisher-Yates algorithm
     */
    shuffle() {
        shuffle(this.cards);
    }

    /**
     * Deal cards to players
     * @param {number} numPlayers - Number of players (default 4)
     * @returns {Array<Array<Card>>} Array of hands for each player
     */
    deal(numPlayers = 4) {
        this.shuffle();
        const hands = Array.from({ length: numPlayers }, () => []);
        const cardsPerPlayer = Math.floor(this.cards.length / numPlayers);

        for (let i = 0; i < this.cards.length; i++) {
            const playerIndex = i % numPlayers;
            if (hands[playerIndex].length < cardsPerPlayer) {
                hands[playerIndex].push(this.cards[i]);
            }
        }

        return hands;
    }

    /**
     * Get the number of cards remaining in deck
     * @returns {number} Cards remaining
     */
    get remaining() {
        return this.cards.length;
    }

    /**
     * Draw a card from the top of the deck
     * @returns {Card|null} Card drawn or null if empty
     */
    draw() {
        return this.cards.pop() || null;
    }

    /**
     * Reset and reshuffle the deck
     */
    reset() {
        this.initialize();
        this.shuffle();
    }
}
