/**
 * Rules class - Game rules and win condition logic for Dhiha Ei
 */
export class Rules {
    /**
     * Check if a player can play a specific card
     * @param {Player} player - Player attempting to play
     * @param {Card} card - Card to play
     * @param {string|null} ledSuit - Suit that was led, or null if leading
     * @returns {boolean} True if card can be played
     */
    static canPlayCard(player, card, ledSuit) {
        return player.canPlayCard(card, ledSuit);
    }

    /**
     * Check if playing a card establishes or uses the superior suit
     * @param {Card} card - Card being played
     * @param {string|null} ledSuit - Suit that was led
     * @param {string|null} currentSuperior - Current superior suit
     * @param {Player} player - Player playing the card
     * @returns {Object} {newSuperior, established}
     */
    static handleSuperiorSuit(card, ledSuit, currentSuperior, player) {
        // If leading, no superior suit logic
        if (!ledSuit) {
            return { newSuperior: currentSuperior, established: false };
        }

        // If following suit, no change
        if (card.suit === ledSuit) {
            return { newSuperior: currentSuperior, established: false };
        }

        // Player didn't follow suit - playing a different suit
        // If no superior suit exists, this establishes one
        if (!currentSuperior) {
            return { newSuperior: card.suit, established: true };
        }

        // Superior suit already exists, no change
        return { newSuperior: currentSuperior, established: false };
    }

    /**
     * Check win conditions and determine if the game has a winner
     * @param {Object} state - Game state with tensCollected and tricksWon
     * @returns {Object|null} {winner: teamNumber, type: winType} or null if no winner yet
     */
    static checkMatchWinner(state) {
        const { tensCollected, tricksWon, trickNumber } = state;

        // Win condition 1: Collect all four 10s
        if (tensCollected[0] === 4) {
            return { winner: 0, type: 'all-tens', message: 'Your team collected all four 10s!' };
        }
        if (tensCollected[1] === 4) {
            return { winner: 1, type: 'all-tens', message: 'Opponents collected all four 10s!' };
        }

        // Only check other conditions after all 13 tricks
        if (trickNumber < 13) {
            // But check for early win if one team has 2+ tens and guaranteed majority
            const remainingTricks = 13 - trickNumber;

            // Team 0 has 2+ tens and can't be caught in tricks
            if (tensCollected[0] >= 2 && tricksWon[0] > tricksWon[1] + remainingTricks) {
                return { winner: 0, type: 'tens-and-tricks', message: 'Your team wins with 2+ tens and most tricks!' };
            }
            // Team 1 has 2+ tens and can't be caught
            if (tensCollected[1] >= 2 && tricksWon[1] > tricksWon[0] + remainingTricks) {
                return { winner: 1, type: 'tens-and-tricks', message: 'Opponents win with 2+ tens and most tricks!' };
            }

            return null; // Game continues
        }

        // All 13 tricks complete - final scoring

        // Win condition 2: 2+ tens AND more tricks
        if (tensCollected[0] >= 2 && tricksWon[0] > tricksWon[1]) {
            return { winner: 0, type: 'tens-and-tricks', message: 'Your team wins with 2+ tens and most tricks!' };
        }
        if (tensCollected[1] >= 2 && tricksWon[1] > tricksWon[0]) {
            return { winner: 1, type: 'tens-and-tricks', message: 'Opponents win with 2+ tens and most tricks!' };
        }

        // Special case: 2v2 tens split
        if (tensCollected[0] === 2 && tensCollected[1] === 2) {
            return this.handleTwoTwoSplit(tricksWon);
        }

        // Edge case: 3-1 tens split
        if (tensCollected[0] === 3 && tricksWon[0] > tricksWon[1]) {
            return { winner: 0, type: 'tens-and-tricks', message: 'Your team wins with 3 tens and most tricks!' };
        }
        if (tensCollected[1] === 3 && tricksWon[1] > tricksWon[0]) {
            return { winner: 1, type: 'tens-and-tricks', message: 'Opponents win with 3 tens and most tricks!' };
        }
        if (tensCollected[0] === 3 && tricksWon[0] <= tricksWon[1]) {
            return { winner: 1, type: 'tricks-only', message: 'Opponents win on tricks despite having fewer 10s!' };
        }
        if (tensCollected[1] === 3 && tricksWon[1] <= tricksWon[0]) {
            return { winner: 0, type: 'tricks-only', message: 'Your team wins on tricks despite having fewer 10s!' };
        }

        // Fallback: Most tricks wins
        if (tricksWon[0] > tricksWon[1]) {
            return { winner: 0, type: 'tricks-only', message: 'Your team wins with most tricks!' };
        }
        if (tricksWon[1] > tricksWon[0]) {
            return { winner: 1, type: 'tricks-only', message: 'Opponents win with most tricks!' };
        }

        // True tie (equal tricks, equal tens) - rare
        return { winner: -1, type: 'tie', message: 'The game is a tie!' };
    }

    /**
     * Handle the special 2v2 tens split scenario
     * @param {Array<number>} tricksWon - Tricks won by each team
     * @returns {Object} Winner result
     */
    static handleTwoTwoSplit(tricksWon) {
        // With 2-2 tens: first to 7 tricks wins
        // Unless the loser has 0 tricks
        if (tricksWon[0] >= 7) {
            if (tricksWon[1] === 0) {
                // Special rule: if opponent has 0 tricks, they lose badly
                return { winner: 0, type: 'shutout', message: 'Your team wins - opponents got no tricks!' };
            }
            return { winner: 0, type: 'first-to-seven', message: 'Your team reached 7 tricks first!' };
        }
        if (tricksWon[1] >= 7) {
            if (tricksWon[0] === 0) {
                return { winner: 1, type: 'shutout', message: 'Opponents win - your team got no tricks!' };
            }
            return { winner: 1, type: 'first-to-seven', message: 'Opponents reached 7 tricks first!' };
        }

        // If neither reached 7, most tricks wins
        if (tricksWon[0] > tricksWon[1]) {
            return { winner: 0, type: 'tens-split-tricks', message: 'Your team wins with more tricks in 2-2 split!' };
        }
        if (tricksWon[1] > tricksWon[0]) {
            return { winner: 1, type: 'tens-split-tricks', message: 'Opponents win with more tricks in 2-2 split!' };
        }

        return { winner: -1, type: 'tie', message: 'The game is a tie!' };
    }

    /**
     * Get a summary of current game state for display
     * @param {Object} state - Game state
     * @returns {Object} Summary info
     */
    static getGameSummary(state) {
        const { tensCollected, tricksWon, superiorSuit, trickNumber } = state;

        return {
            team0: {
                tens: tensCollected[0],
                tricks: tricksWon[0],
                needsForWin: this.getWinRequirements(0, tensCollected, tricksWon)
            },
            team1: {
                tens: tensCollected[1],
                tricks: tricksWon[1],
                needsForWin: this.getWinRequirements(1, tensCollected, tricksWon)
            },
            superiorSuit,
            tricksRemaining: 13 - trickNumber
        };
    }

    /**
     * Determine what a team needs to win
     * @param {number} team - Team number
     * @param {Array<number>} tens - Tens collected
     * @param {Array<number>} tricks - Tricks won
     * @returns {string} Description of win requirements
     */
    static getWinRequirements(team, tens, tricks) {
        const otherTeam = 1 - team;

        if (tens[team] >= 2 && tricks[team] > tricks[otherTeam]) {
            return 'Currently winning!';
        }

        if (tens[team] >= 2) {
            return `Need more tricks than opponent (currently ${tricks[team]} vs ${tricks[otherTeam]})`;
        }

        if (tens[team] === 1) {
            return 'Need 1 more 10 and more tricks';
        }

        return 'Need 2+ tens and more tricks';
    }
}
