/**
 * CardSprite class - Creates DOM elements for card display
 */
export class CardSprite {
    /**
     * Create a card DOM element
     * @param {Card} card - Card to render
     * @param {boolean} faceUp - Whether card is face up
     * @returns {HTMLElement} Card element
     */
    static createCardElement(card, faceUp = true) {
        const element = document.createElement('div');
        element.className = 'card';
        element.dataset.cardId = card.id;
        element.dataset.suit = card.suit;
        element.dataset.rank = card.rank;

        if (faceUp) {
            element.classList.add(card.suit);
            element.innerHTML = this.getCardContent(card);
        } else {
            element.classList.add('face-down');
        }

        return element;
    }

    /**
     * Get the inner HTML content for a card
     * @param {Card} card - Card to render
     * @returns {string} HTML content
     */
    static getCardContent(card) {
        const rankDisplay = card.getRankDisplay();
        const suitSymbol = card.getSuitSymbol();

        return `
            <div class="card-corner top">
                <span class="rank">${rankDisplay}</span>
                <span class="suit">${suitSymbol}</span>
            </div>
            <div class="card-center">${suitSymbol}</div>
            <div class="card-corner bottom">
                <span class="rank">${rankDisplay}</span>
                <span class="suit">${suitSymbol}</span>
            </div>
        `;
    }

    /**
     * Create a face-down card element
     * @returns {HTMLElement} Face-down card element
     */
    static createFaceDownCard() {
        const element = document.createElement('div');
        element.className = 'card face-down';
        return element;
    }

    /**
     * Create a placeholder card slot
     * @returns {HTMLElement} Empty slot element
     */
    static createEmptySlot() {
        const element = document.createElement('div');
        element.className = 'card-slot';
        return element;
    }

    /**
     * Set card as playable (highlighted)
     * @param {HTMLElement} element - Card element
     * @param {boolean} playable - Whether card is playable
     */
    static setPlayable(element, playable) {
        if (playable) {
            element.classList.add('playable');
            element.classList.remove('disabled');
        } else {
            element.classList.remove('playable');
            element.classList.add('disabled');
        }
    }

    /**
     * Add playing animation to card
     * @param {HTMLElement} element - Card element
     */
    static animatePlay(element) {
        element.classList.add('playing');
        setTimeout(() => element.classList.remove('playing'), 300);
    }

    /**
     * Add collecting animation to card
     * @param {HTMLElement} element - Card element
     */
    static animateCollect(element) {
        element.classList.add('collecting');
    }
}
