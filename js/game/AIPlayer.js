/**
 * AIPlayer class - AI decision logic for computer players
 */
import { Player } from './Player.js';

export class AIPlayer extends Player {
    /**
     * Create an AI player
     * @param {number} position - Position at table
     * @param {number} team - Team number
     */
    constructor(position, team) {
        super(position, team, false);
    }

    /**
     * Choose a card to play
     * @param {string|null} ledSuit - Suit that was led, or null if leading
     * @param {string|null} superiorSuit - Current superior suit, if any
     * @param {Array<Object>} trickCards - Cards already played in this trick
     * @param {Object} gameState - Current game state info
     * @returns {Card} Card to play
     */
    chooseCard(ledSuit, superiorSuit, trickCards, gameState) {
        const validCards = this.getValidCards(ledSuit);

        if (validCards.length === 1) {
            return validCards[0];
        }

        // Leading the trick
        if (!ledSuit) {
            return this.chooseLeadCard(superiorSuit, gameState);
        }

        // Following suit
        if (this.hasSuit(ledSuit)) {
            return this.chooseFollowCard(validCards, trickCards, superiorSuit, gameState);
        }

        // Can't follow suit - choose what to discard or trump
        return this.chooseOffSuitCard(validCards, trickCards, superiorSuit, gameState);
    }

    /**
     * Choose a card when leading the trick
     * @param {string|null} superiorSuit - Current superior suit
     * @param {Object} gameState - Game state info
     * @returns {Card} Card to lead
     */
    chooseLeadCard(superiorSuit, gameState) {
        const validCards = [...this.hand];

        // If we have the superior suit, consider leading high
        if (superiorSuit && this.hasSuit(superiorSuit)) {
            const superiorCards = this.getCardsOfSuit(superiorSuit);
            const highSuperior = this.getHighestCard(superiorCards);
            if (highSuperior.getPower() >= 12) { // Q or higher
                return highSuperior;
            }
        }

        // Lead with a 10 if we have high cards to protect it
        const tens = this.getTens();
        for (const ten of tens) {
            const suitCards = this.getCardsOfSuit(ten.suit);
            const hasHighProtection = suitCards.some(c => c.getPower() > 10);
            if (hasHighProtection || (superiorSuit === ten.suit)) {
                return ten;
            }
        }

        // Lead lowest card from weakest suit
        return this.getLowestCard(validCards);
    }

    /**
     * Choose a card when following suit
     * @param {Array<Card>} validCards - Valid cards to play
     * @param {Array<Object>} trickCards - Cards in current trick
     * @param {string|null} superiorSuit - Superior suit
     * @param {Object} gameState - Game state info
     * @returns {Card} Card to play
     */
    chooseFollowCard(validCards, trickCards, superiorSuit, gameState) {
        const ledSuit = trickCards[0]?.card?.suit;
        const currentWinner = this.getCurrentTrickWinner(trickCards, superiorSuit);
        const partnerPosition = (this.position + 2) % 4;

        // Check if partner is winning
        if (currentWinner && currentWinner.position === partnerPosition) {
            // Partner is winning - play low
            return this.getLowestCard(validCards);
        }

        // Check if we can win this trick
        const highestNeeded = this.getHighestTrickCard(trickCards, ledSuit, superiorSuit);
        const winningCards = validCards.filter(c => c.getPower() > highestNeeded);

        if (winningCards.length > 0) {
            // If a 10 is at stake in this trick, try to win
            const trickHasTen = trickCards.some(tc => tc.card?.isTen());
            if (trickHasTen) {
                return this.getLowestCard(winningCards);
            }

            // Win with lowest winning card
            return this.getLowestCard(winningCards);
        }

        // Can't win - play lowest
        return this.getLowestCard(validCards);
    }

    /**
     * Choose a card when can't follow suit
     * @param {Array<Card>} validCards - Valid cards to play
     * @param {Array<Object>} trickCards - Cards in current trick
     * @param {string|null} superiorSuit - Superior suit
     * @param {Object} gameState - Game state info
     * @returns {Card} Card to play
     */
    chooseOffSuitCard(validCards, trickCards, superiorSuit, gameState) {
        const partnerPosition = (this.position + 2) % 4;
        const currentWinner = this.getCurrentTrickWinner(trickCards, superiorSuit);

        // Check if partner is winning
        if (currentWinner && currentWinner.position === partnerPosition) {
            // Discard lowest card
            return this.getLowestCard(validCards);
        }

        // If superior suit exists and we have it, consider trumping
        if (superiorSuit) {
            const superiorCards = validCards.filter(c => c.suit === superiorSuit);
            if (superiorCards.length > 0) {
                // Trump with lowest superior card
                return this.getLowestCard(superiorCards);
            }
        }

        // No superior suit yet - we might establish one
        // Avoid establishing with high cards if possible
        if (!superiorSuit) {
            // Try to discard from a weak suit with low cards
            const nonTens = validCards.filter(c => !c.isTen());
            if (nonTens.length > 0) {
                return this.getLowestCard(nonTens);
            }
        }

        // Discard lowest card
        return this.getLowestCard(validCards);
    }

    /**
     * Get the highest card from a set
     * @param {Array<Card>} cards - Cards to check
     * @returns {Card} Highest card
     */
    getHighestCard(cards) {
        return cards.reduce((best, card) =>
            card.getPower() > best.getPower() ? card : best
        );
    }

    /**
     * Get the lowest card from a set
     * @param {Array<Card>} cards - Cards to check
     * @returns {Card} Lowest card
     */
    getLowestCard(cards) {
        // Prefer not to discard 10s
        const nonTens = cards.filter(c => !c.isTen());
        const searchCards = nonTens.length > 0 ? nonTens : cards;

        return searchCards.reduce((best, card) =>
            card.getPower() < best.getPower() ? card : best
        );
    }

    /**
     * Get the highest card power in current trick for comparison
     * @param {Array<Object>} trickCards - Cards in trick
     * @param {string} ledSuit - Led suit
     * @param {string|null} superiorSuit - Superior suit
     * @returns {number} Highest relevant power
     */
    getHighestTrickCard(trickCards, ledSuit, superiorSuit) {
        let highest = 0;

        for (const tc of trickCards) {
            if (!tc.card) continue;

            if (superiorSuit && tc.card.suit === superiorSuit) {
                highest = Math.max(highest, tc.card.getPower() + 100); // Superior beats all
            } else if (tc.card.suit === ledSuit) {
                highest = Math.max(highest, tc.card.getPower());
            }
        }

        return highest;
    }

    /**
     * Determine who is currently winning the trick
     * @param {Array<Object>} trickCards - Cards in trick
     * @param {string|null} superiorSuit - Superior suit
     * @returns {Object|null} Winning player info or null
     */
    getCurrentTrickWinner(trickCards, superiorSuit) {
        if (trickCards.length === 0) return null;

        const ledSuit = trickCards[0]?.card?.suit;
        let winner = null;
        let highestPower = -1;

        for (const tc of trickCards) {
            if (!tc.card) continue;

            let power = 0;
            if (superiorSuit && tc.card.suit === superiorSuit) {
                power = tc.card.getPower() + 100;
            } else if (tc.card.suit === ledSuit) {
                power = tc.card.getPower();
            }

            if (power > highestPower) {
                highestPower = power;
                winner = { position: tc.position, card: tc.card };
            }
        }

        return winner;
    }
}
