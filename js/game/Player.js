/**
 * Player class representing a player in the game
 */
import { sortCards } from '../utils/helpers.js';

export class Player {
    /**
     * Create a new player
     * @param {number} position - Position at table (0=bottom, 1=left, 2=top, 3=right)
     * @param {number} team - Team number (0 or 1)
     * @param {boolean} isHuman - Whether this player is human-controlled
     */
    constructor(position, team, isHuman = false) {
        this.position = position;
        this.team = team;
        this.isHuman = isHuman;
        this.hand = [];
        this.name = this.getPositionName();
    }

    /**
     * Get position name for display
     * @returns {string} Position name
     */
    getPositionName() {
        const names = ['You', 'Left', 'Partner', 'Right'];
        return names[this.position];
    }

    /**
     * Set the player's hand
     * @param {Array<Card>} cards - Cards to set as hand
     */
    setHand(cards) {
        this.hand = sortCards(cards);
    }

    /**
     * Check if player has any cards of a specific suit
     * @param {string} suit - Suit to check for
     * @returns {boolean} True if player has the suit
     */
    hasSuit(suit) {
        return this.hand.some(card => card.suit === suit);
    }

    /**
     * Get all cards of a specific suit from hand
     * @param {string} suit - Suit to filter by
     * @returns {Array<Card>} Cards of that suit
     */
    getCardsOfSuit(suit) {
        return this.hand.filter(card => card.suit === suit);
    }

    /**
     * Get valid cards that can be played given the led suit
     * @param {string|null} ledSuit - The suit that was led, or null if leading
     * @returns {Array<Card>} Valid cards to play
     */
    getValidCards(ledSuit) {
        if (!ledSuit) {
            // Leading the trick - can play anything
            return [...this.hand];
        }

        // Must follow suit if possible
        const suitCards = this.getCardsOfSuit(ledSuit);
        if (suitCards.length > 0) {
            return suitCards;
        }

        // Can't follow suit - can play anything
        return [...this.hand];
    }

    /**
     * Check if a specific card can be played
     * @param {Card} card - Card to check
     * @param {string|null} ledSuit - The suit that was led
     * @returns {boolean} True if card can be played
     */
    canPlayCard(card, ledSuit) {
        const validCards = this.getValidCards(ledSuit);
        return validCards.some(c => c.equals(card));
    }

    /**
     * Play a card from hand
     * @param {Card} card - Card to play
     * @returns {Card|null} The played card, or null if not in hand
     */
    playCard(card) {
        const index = this.hand.findIndex(c => c.equals(card));
        if (index === -1) {
            return null;
        }
        return this.hand.splice(index, 1)[0];
    }

    /**
     * Get the number of cards in hand
     * @returns {number} Number of cards
     */
    get cardCount() {
        return this.hand.length;
    }

    /**
     * Get all 10s in hand
     * @returns {Array<Card>} All 10s in hand
     */
    getTens() {
        return this.hand.filter(card => card.isTen());
    }

    /**
     * Sort hand by suit and rank
     */
    sortHand() {
        this.hand = sortCards(this.hand);
    }
}
