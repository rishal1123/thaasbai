/**
 * Trick class - Manages a single trick (sub-round) of 4 cards
 */
export class Trick {
    constructor() {
        this.cards = []; // Array of {position, card, player}
        this.ledSuit = null;
        this.winner = null;
        this.complete = false;
    }

    /**
     * Add a card to the trick
     * @param {Card} card - Card being played
     * @param {number} position - Player position (0-3)
     * @param {Player} player - Player who played the card
     */
    addCard(card, position, player) {
        if (this.cards.length === 0) {
            this.ledSuit = card.suit;
        }

        this.cards.push({
            card,
            position,
            player
        });

        if (this.cards.length === 4) {
            this.complete = true;
        }
    }

    /**
     * Determine the winner of this trick
     * @param {string|null} superiorSuit - The superior suit, if established
     * @returns {Object} Winner info {position, player, card}
     */
    determineWinner(superiorSuit) {
        if (this.cards.length === 0) {
            return null;
        }

        let winningPlay = this.cards[0];
        let highestPower = this.getEffectivePower(winningPlay.card, superiorSuit);

        for (let i = 1; i < this.cards.length; i++) {
            const play = this.cards[i];
            const power = this.getEffectivePower(play.card, superiorSuit);

            if (power > highestPower) {
                highestPower = power;
                winningPlay = play;
            }
        }

        this.winner = winningPlay;
        return winningPlay;
    }

    /**
     * Calculate effective power of a card considering superior suit
     * @param {Card} card - Card to evaluate
     * @param {string|null} superiorSuit - Superior suit if any
     * @returns {number} Effective power (0-114)
     */
    getEffectivePower(card, superiorSuit) {
        // Superior suit beats everything
        if (superiorSuit && card.suit === superiorSuit) {
            return 100 + card.getPower(); // 102-114
        }

        // Led suit has base power
        if (card.suit === this.ledSuit) {
            return card.getPower(); // 2-14
        }

        // Off-suit (non-superior) cards can't win
        return 0;
    }

    /**
     * Get all 10s collected in this trick
     * @returns {Array<Card>} Array of 10s
     */
    getTens() {
        return this.cards
            .filter(play => play.card.isTen())
            .map(play => play.card);
    }

    /**
     * Get the number of cards played
     * @returns {number} Card count
     */
    get cardCount() {
        return this.cards.length;
    }

    /**
     * Check if this trick is complete (4 cards played)
     * @returns {boolean} True if complete
     */
    isComplete() {
        return this.complete;
    }

    /**
     * Get cards played as array
     * @returns {Array<Object>} Played cards info
     */
    getCards() {
        return [...this.cards];
    }

    /**
     * Get card played by a specific position
     * @param {number} position - Player position
     * @returns {Card|null} Card played by that position or null
     */
    getCardByPosition(position) {
        const play = this.cards.find(p => p.position === position);
        return play ? play.card : null;
    }

    /**
     * Reset trick for new round
     */
    reset() {
        this.cards = [];
        this.ledSuit = null;
        this.winner = null;
        this.complete = false;
    }
}
