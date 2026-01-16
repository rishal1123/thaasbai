/**
 * Card class representing a single playing card
 * Rank values: 2-10, J=11, Q=12, K=13, A=14
 */
export class Card {
    static SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
    static RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

    /**
     * Create a new card
     * @param {string} suit - Card suit (hearts, diamonds, clubs, spades)
     * @param {number} rank - Card rank (2-14, where 14 is Ace)
     */
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.id = `${suit}-${rank}`;
    }

    /**
     * Get the power/value of this card for comparison
     * Higher power beats lower power
     * @returns {number} Power value (2-14)
     */
    getPower() {
        return this.rank;
    }

    /**
     * Check if this card is a 10 (important for scoring)
     * @returns {boolean} True if this is a 10
     */
    isTen() {
        return this.rank === 10;
    }

    /**
     * Check if this card is red (hearts or diamonds)
     * @returns {boolean} True if red suit
     */
    isRed() {
        return this.suit === 'hearts' || this.suit === 'diamonds';
    }

    /**
     * Get display string for the rank
     * @returns {string} Rank display (A, K, Q, J, or number)
     */
    getRankDisplay() {
        const displays = {
            14: 'A',
            13: 'K',
            12: 'Q',
            11: 'J'
        };
        return displays[this.rank] || this.rank.toString();
    }

    /**
     * Get the suit symbol
     * @returns {string} Unicode suit symbol
     */
    getSuitSymbol() {
        const symbols = {
            hearts: '\u2665',    // ♥
            diamonds: '\u2666',  // ♦
            clubs: '\u2663',     // ♣
            spades: '\u2660'     // ♠
        };
        return symbols[this.suit];
    }

    /**
     * Get a string representation of the card
     * @returns {string} Card description (e.g., "Ace of Spades")
     */
    toString() {
        return `${this.getRankDisplay()}${this.getSuitSymbol()}`;
    }

    /**
     * Compare this card to another for sorting
     * @param {Card} other - Other card to compare
     * @returns {number} Negative if this < other, positive if this > other
     */
    compareTo(other) {
        const suitOrder = { spades: 0, hearts: 1, clubs: 2, diamonds: 3 };
        if (this.suit !== other.suit) {
            return suitOrder[this.suit] - suitOrder[other.suit];
        }
        return this.rank - other.rank;
    }

    /**
     * Check if this card equals another
     * @param {Card} other - Other card to compare
     * @returns {boolean} True if same suit and rank
     */
    equals(other) {
        return this.suit === other.suit && this.rank === other.rank;
    }
}
