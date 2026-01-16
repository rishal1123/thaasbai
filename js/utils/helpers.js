/**
 * Utility helper functions for Dhiha Ei card game
 */

/**
 * Fisher-Yates shuffle algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array (mutates original)
 */
export function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Delay execution for a specified time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after delay
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get suit symbol
 * @param {string} suit - Suit name (hearts, diamonds, clubs, spades)
 * @returns {string} Unicode symbol for the suit
 */
export function getSuitSymbol(suit) {
    const symbols = {
        hearts: '\u2665',    // ♥
        diamonds: '\u2666',  // ♦
        clubs: '\u2663',     // ♣
        spades: '\u2660'     // ♠
    };
    return symbols[suit] || '';
}

/**
 * Get rank display string
 * @param {number} rank - Card rank (1-14)
 * @returns {string} Display string (A, 2-10, J, Q, K)
 */
export function getRankDisplay(rank) {
    const ranks = {
        14: 'A',
        13: 'K',
        12: 'Q',
        11: 'J'
    };
    return ranks[rank] || rank.toString();
}

/**
 * Get suit display name
 * @param {string} suit - Suit identifier
 * @returns {string} Capitalized suit name
 */
export function getSuitDisplay(suit) {
    return suit.charAt(0).toUpperCase() + suit.slice(1);
}

/**
 * Check if a suit is red
 * @param {string} suit - Suit name
 * @returns {boolean} True if hearts or diamonds
 */
export function isRedSuit(suit) {
    return suit === 'hearts' || suit === 'diamonds';
}

/**
 * Generate a unique ID
 * @returns {string} Unique identifier
 */
export function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Sort cards by suit and rank for display
 * @param {Array} cards - Array of Card objects
 * @returns {Array} Sorted cards
 */
export function sortCards(cards) {
    const suitOrder = { spades: 0, hearts: 1, clubs: 2, diamonds: 3 };
    return [...cards].sort((a, b) => {
        if (suitOrder[a.suit] !== suitOrder[b.suit]) {
            return suitOrder[a.suit] - suitOrder[b.suit];
        }
        return b.rank - a.rank;
    });
}
