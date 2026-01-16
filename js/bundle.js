/**
 * Dhiha Ei - Maldivian Card Game
 * Bundled version with multi-round scoring
 */

(function() {
    'use strict';

    // ============================================
    // CONSTANTS
    // ============================================

    const POINTS_TO_WIN_MATCH = 7;

    // All win types give 1 point each
    const WIN_TYPES = {
        ALL_TENS: 'all-tens',
        SHUTOUT: 'shutout',
        NORMAL: 'normal'
    };

    // ============================================
    // UTILITIES
    // ============================================

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function getSuitSymbol(suit) {
        const symbols = {
            hearts: '\u2665',
            diamonds: '\u2666',
            clubs: '\u2663',
            spades: '\u2660'
        };
        return symbols[suit] || '';
    }

    function getSuitDisplay(suit) {
        return suit.charAt(0).toUpperCase() + suit.slice(1);
    }

    function sortCards(cards) {
        const suitOrder = { spades: 0, hearts: 1, clubs: 2, diamonds: 3 };
        return [...cards].sort((a, b) => {
            if (suitOrder[a.suit] !== suitOrder[b.suit]) {
                return suitOrder[a.suit] - suitOrder[b.suit];
            }
            return b.rank - a.rank;
        });
    }

    // ============================================
    // CARD CLASS
    // ============================================

    class Card {
        static SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
        static RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

        constructor(suit, rank) {
            this.suit = suit;
            this.rank = rank;
            this.id = `${suit}-${rank}`;
        }

        getPower() {
            return this.rank;
        }

        isTen() {
            return this.rank === 10;
        }

        isRed() {
            return this.suit === 'hearts' || this.suit === 'diamonds';
        }

        getRankDisplay() {
            const displays = { 14: 'A', 13: 'K', 12: 'Q', 11: 'J' };
            return displays[this.rank] || this.rank.toString();
        }

        getSuitSymbol() {
            return getSuitSymbol(this.suit);
        }

        toString() {
            return `${this.getRankDisplay()}${this.getSuitSymbol()}`;
        }

        equals(other) {
            return this.suit === other.suit && this.rank === other.rank;
        }
    }

    // ============================================
    // DECK CLASS
    // ============================================

    class Deck {
        constructor() {
            this.cards = [];
            this.initialize();
        }

        initialize() {
            this.cards = [];
            for (const suit of Card.SUITS) {
                for (const rank of Card.RANKS) {
                    this.cards.push(new Card(suit, rank));
                }
            }
        }

        shuffle() {
            shuffle(this.cards);
        }

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
    }

    // ============================================
    // PLAYER CLASS
    // ============================================

    class Player {
        constructor(position, team, isHuman = false) {
            this.position = position;
            this.team = team;
            this.isHuman = isHuman;
            this.hand = [];
            this.name = this.getPositionName();
        }

        getPositionName() {
            const names = ['You', 'Left', 'Partner', 'Right'];
            return names[this.position];
        }

        setHand(cards) {
            this.hand = sortCards(cards);
        }

        hasSuit(suit) {
            return this.hand.some(card => card.suit === suit);
        }

        getCardsOfSuit(suit) {
            return this.hand.filter(card => card.suit === suit);
        }

        getValidCards(ledSuit) {
            if (!ledSuit) {
                return [...this.hand];
            }
            const suitCards = this.getCardsOfSuit(ledSuit);
            if (suitCards.length > 0) {
                return suitCards;
            }
            return [...this.hand];
        }

        canPlayCard(card, ledSuit) {
            const validCards = this.getValidCards(ledSuit);
            return validCards.some(c => c.equals(card));
        }

        playCard(card) {
            const index = this.hand.findIndex(c => c.equals(card));
            if (index === -1) {
                return null;
            }
            return this.hand.splice(index, 1)[0];
        }

        get cardCount() {
            return this.hand.length;
        }

        getTens() {
            return this.hand.filter(card => card.isTen());
        }

        sortHand() {
            this.hand = sortCards(this.hand);
        }
    }

    // ============================================
    // AI PLAYER CLASS
    // ============================================

    class AIPlayer extends Player {
        constructor(position, team) {
            super(position, team, false);
        }

        chooseCard(ledSuit, superiorSuit, trickCards, gameState) {
            const validCards = this.getValidCards(ledSuit);

            if (validCards.length === 1) {
                return validCards[0];
            }

            if (!ledSuit) {
                return this.chooseLeadCard(superiorSuit, gameState);
            }

            if (this.hasSuit(ledSuit)) {
                return this.chooseFollowCard(validCards, trickCards, superiorSuit, gameState);
            }

            return this.chooseOffSuitCard(validCards, trickCards, superiorSuit, gameState);
        }

        chooseLeadCard(superiorSuit, gameState) {
            const validCards = [...this.hand];

            if (superiorSuit && this.hasSuit(superiorSuit)) {
                const superiorCards = this.getCardsOfSuit(superiorSuit);
                const highSuperior = this.getHighestCard(superiorCards);
                if (highSuperior.getPower() >= 12) {
                    return highSuperior;
                }
            }

            const tens = this.getTens();
            for (const ten of tens) {
                const suitCards = this.getCardsOfSuit(ten.suit);
                const hasHighProtection = suitCards.some(c => c.getPower() > 10);
                if (hasHighProtection || (superiorSuit === ten.suit)) {
                    return ten;
                }
            }

            return this.getLowestCard(validCards);
        }

        chooseFollowCard(validCards, trickCards, superiorSuit, gameState) {
            const currentWinner = this.getCurrentTrickWinner(trickCards, superiorSuit);
            const partnerPosition = (this.position + 2) % 4;

            if (currentWinner && currentWinner.position === partnerPosition) {
                return this.getLowestCard(validCards);
            }

            const ledSuit = trickCards[0]?.card?.suit;
            const highestNeeded = this.getHighestTrickCard(trickCards, ledSuit, superiorSuit);
            const winningCards = validCards.filter(c => c.getPower() > highestNeeded);

            if (winningCards.length > 0) {
                const trickHasTen = trickCards.some(tc => tc.card?.isTen());
                if (trickHasTen) {
                    return this.getLowestCard(winningCards);
                }
                return this.getLowestCard(winningCards);
            }

            return this.getLowestCard(validCards);
        }

        chooseOffSuitCard(validCards, trickCards, superiorSuit, gameState) {
            const partnerPosition = (this.position + 2) % 4;
            const currentWinner = this.getCurrentTrickWinner(trickCards, superiorSuit);

            if (currentWinner && currentWinner.position === partnerPosition) {
                return this.getLowestCard(validCards);
            }

            if (superiorSuit) {
                const superiorCards = validCards.filter(c => c.suit === superiorSuit);
                if (superiorCards.length > 0) {
                    return this.getLowestCard(superiorCards);
                }
            }

            if (!superiorSuit) {
                const nonTens = validCards.filter(c => !c.isTen());
                if (nonTens.length > 0) {
                    return this.getLowestCard(nonTens);
                }
            }

            return this.getLowestCard(validCards);
        }

        getHighestCard(cards) {
            return cards.reduce((best, card) =>
                card.getPower() > best.getPower() ? card : best
            );
        }

        getLowestCard(cards) {
            const nonTens = cards.filter(c => !c.isTen());
            const searchCards = nonTens.length > 0 ? nonTens : cards;
            return searchCards.reduce((best, card) =>
                card.getPower() < best.getPower() ? card : best
            );
        }

        getHighestTrickCard(trickCards, ledSuit, superiorSuit) {
            let highest = 0;
            for (const tc of trickCards) {
                if (!tc.card) continue;
                if (superiorSuit && tc.card.suit === superiorSuit) {
                    highest = Math.max(highest, tc.card.getPower() + 100);
                } else if (tc.card.suit === ledSuit) {
                    highest = Math.max(highest, tc.card.getPower());
                }
            }
            return highest;
        }

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

    // ============================================
    // TRICK CLASS
    // ============================================

    class Trick {
        constructor() {
            this.cards = [];
            this.ledSuit = null;
            this.winner = null;
            this.complete = false;
        }

        addCard(card, position, player) {
            if (this.cards.length === 0) {
                this.ledSuit = card.suit;
            }

            this.cards.push({ card, position, player });

            if (this.cards.length === 4) {
                this.complete = true;
            }
        }

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

        getEffectivePower(card, superiorSuit) {
            if (superiorSuit && card.suit === superiorSuit) {
                return 100 + card.getPower();
            }
            if (card.suit === this.ledSuit) {
                return card.getPower();
            }
            return 0;
        }

        getTens() {
            return this.cards
                .filter(play => play.card.isTen())
                .map(play => play.card);
        }

        get cardCount() {
            return this.cards.length;
        }

        isComplete() {
            return this.complete;
        }

        getCards() {
            return [...this.cards];
        }

        reset() {
            this.cards = [];
            this.ledSuit = null;
            this.winner = null;
            this.complete = false;
        }
    }

    // ============================================
    // RULES CLASS
    // ============================================

    class Rules {
        static canPlayCard(player, card, ledSuit) {
            return player.canPlayCard(card, ledSuit);
        }

        static handleSuperiorSuit(card, ledSuit, currentSuperior, player) {
            if (!ledSuit) {
                return { newSuperior: currentSuperior, established: false };
            }
            if (card.suit === ledSuit) {
                return { newSuperior: currentSuperior, established: false };
            }
            if (!currentSuperior) {
                return { newSuperior: card.suit, established: true };
            }
            return { newSuperior: currentSuperior, established: false };
        }

        static checkRoundWinner(state) {
            const { tensCollected, tricksWon, trickNumber } = state;
            const totalTensPlayed = tensCollected[0] + tensCollected[1];

            // When all 4 tens have been played, check who has more
            if (totalTensPlayed === 4) {
                // Team with more tens wins (All 10s type)
                if (tensCollected[0] > tensCollected[1]) {
                    const isShutout = tricksWon[1] === 0 && trickNumber === 13;
                    return {
                        winner: 0,
                        type: tensCollected[0] === 4 ? WIN_TYPES.ALL_TENS : (isShutout ? WIN_TYPES.SHUTOUT : WIN_TYPES.NORMAL),
                        points: 1,
                        message: tensCollected[0] === 4 ? 'Your team collected all four 10s!' : `Your team wins with ${tensCollected[0]} tens!`
                    };
                }
                if (tensCollected[1] > tensCollected[0]) {
                    const isShutout = tricksWon[0] === 0 && trickNumber === 13;
                    return {
                        winner: 1,
                        type: tensCollected[1] === 4 ? WIN_TYPES.ALL_TENS : (isShutout ? WIN_TYPES.SHUTOUT : WIN_TYPES.NORMAL),
                        points: 1,
                        message: tensCollected[1] === 4 ? 'Opponents collected all four 10s!' : `Opponents win with ${tensCollected[1]} tens!`
                    };
                }
                // 2-2 split - need to continue playing for tricks
            }

            // Only check other conditions after all 13 tricks
            if (trickNumber < 13) {
                return null;
            }

            // All 13 tricks complete - final scoring
            const team0Shutout = tricksWon[1] === 0;
            const team1Shutout = tricksWon[0] === 0;

            // 2-2 tens split - winner decided by tricks
            if (tensCollected[0] === 2 && tensCollected[1] === 2) {
                if (tricksWon[0] > tricksWon[1]) {
                    return {
                        winner: 0,
                        type: team0Shutout ? WIN_TYPES.SHUTOUT : WIN_TYPES.NORMAL,
                        points: 1,
                        message: team0Shutout ? 'Your team wins with a shutout!' : 'Your team wins with more tricks (2-2 tens)!'
                    };
                }
                if (tricksWon[1] > tricksWon[0]) {
                    return {
                        winner: 1,
                        type: team1Shutout ? WIN_TYPES.SHUTOUT : WIN_TYPES.NORMAL,
                        points: 1,
                        message: team1Shutout ? 'Opponents win with a shutout!' : 'Opponents win with more tricks (2-2 tens)!'
                    };
                }
                // Equal tricks with 2-2 tens = tie
                return { winner: -1, type: 'tie', points: 0, message: 'The round is a tie (2-2 tens, equal tricks)!' };
            }

            // Should not reach here if tens logic above works, but fallback to tricks
            if (tricksWon[0] > tricksWon[1]) {
                return {
                    winner: 0,
                    type: team0Shutout ? WIN_TYPES.SHUTOUT : WIN_TYPES.NORMAL,
                    points: 1,
                    message: 'Your team wins with most tricks!'
                };
            }
            if (tricksWon[1] > tricksWon[0]) {
                return {
                    winner: 1,
                    type: team1Shutout ? WIN_TYPES.SHUTOUT : WIN_TYPES.NORMAL,
                    points: 1,
                    message: 'Opponents win with most tricks!'
                };
            }

            return { winner: -1, type: 'tie', points: 0, message: 'The round is a tie!' };
        }

    }

    // ============================================
    // GAME CLASS
    // ============================================

    class Game {
        constructor() {
            this.deck = new Deck();
            this.players = [];
            this.currentTrick = null;
            this.currentPlayerIndex = 0;
            this.trickNumber = 0;
            this.superiorSuit = null;
            this.tricksWon = [0, 0];
            this.tensCollected = [0, 0];
            this.collectedTensCards = [[], []]; // Actual 10 cards collected by each team
            this.roundOver = false;
            this.roundResult = null;

            // Match points (persists across rounds)
            this.matchPoints = [0, 0];
            this.matchOver = false;
            this.matchWinner = null;

            // Track win types for display
            this.winTypeCount = [
                { normal: 0, 'all-tens': 0, shutout: 0 },
                { normal: 0, 'all-tens': 0, shutout: 0 }
            ];

            this.onStateChange = null;
            this.onTrickComplete = null;
            this.onRoundOver = null;
            this.onMatchOver = null;
            this.onSuperiorSuitEstablished = null;
            this.onCardPlayed = null;

            this.initializePlayers();
        }

        initializePlayers() {
            this.players.push(new Player(0, 0, true));
            this.players.push(new AIPlayer(1, 1));
            this.players.push(new AIPlayer(2, 0));
            this.players.push(new AIPlayer(3, 1));
        }

        startNewMatch() {
            this.matchPoints = [0, 0];
            this.matchOver = false;
            this.matchWinner = null;
            this.winTypeCount = [
                { normal: 0, 'all-tens': 0, shutout: 0 },
                { normal: 0, 'all-tens': 0, shutout: 0 }
            ];
            this.startRound();
        }

        startRound() {
            this.resetRound();
            this.dealCards();
            this.currentTrick = new Trick();
            this.notifyStateChange();
        }

        resetRound() {
            this.deck = new Deck();
            this.currentPlayerIndex = 0;
            this.trickNumber = 0;
            this.superiorSuit = null;
            this.tricksWon = [0, 0];
            this.tensCollected = [0, 0];
            this.collectedTensCards = [[], []];
            this.roundOver = false;
            this.roundResult = null;
            this.currentTrick = null;
        }

        dealCards() {
            const hands = this.deck.deal(4);
            for (let i = 0; i < 4; i++) {
                this.players[i].setHand(hands[i]);
            }
        }

        getCurrentPlayer() {
            return this.players[this.currentPlayerIndex];
        }

        isHumanTurn() {
            return this.getCurrentPlayer().isHuman;
        }

        getLedSuit() {
            return this.currentTrick ? this.currentTrick.ledSuit : null;
        }

        getValidCards() {
            const player = this.getCurrentPlayer();
            return player.getValidCards(this.getLedSuit());
        }

        async playCard(card) {
            if (this.roundOver) return false;

            const player = this.getCurrentPlayer();
            const ledSuit = this.getLedSuit();

            if (!Rules.canPlayCard(player, card, ledSuit)) {
                console.warn('Invalid card play attempted');
                return false;
            }

            const playedCard = player.playCard(card);
            if (!playedCard) return false;

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

            this.currentTrick.addCard(playedCard, player.position, player);

            if (this.onCardPlayed) {
                this.onCardPlayed(playedCard, player);
            }

            if (this.currentTrick.isComplete()) {
                await this.completeTrick();
            } else {
                // Counter-clockwise: 0 → 3 → 2 → 1 → 0
                this.currentPlayerIndex = (this.currentPlayerIndex + 3) % 4;
                this.notifyStateChange();
            }

            return true;
        }

        async completeTrick() {
            const winner = this.currentTrick.determineWinner(this.superiorSuit);
            const winningTeam = winner.player.team;

            this.tricksWon[winningTeam]++;

            const tens = this.currentTrick.getTens();
            this.tensCollected[winningTeam] += tens.length;
            // Store actual 10 card objects for display
            tens.forEach(ten => this.collectedTensCards[winningTeam].push(ten));

            if (this.onTrickComplete) {
                await this.onTrickComplete(winner, this.currentTrick, tens);
            }

            this.trickNumber++;

            const roundResult = Rules.checkRoundWinner({
                tensCollected: this.tensCollected,
                tricksWon: this.tricksWon,
                trickNumber: this.trickNumber
            });

            if (roundResult) {
                this.roundOver = true;
                this.roundResult = roundResult;

                // Award match points and track win type
                if (roundResult.winner >= 0) {
                    this.matchPoints[roundResult.winner] += roundResult.points;
                    if (this.winTypeCount[roundResult.winner][roundResult.type] !== undefined) {
                        this.winTypeCount[roundResult.winner][roundResult.type]++;
                    }
                }

                // Check for match win
                if (this.matchPoints[0] >= POINTS_TO_WIN_MATCH) {
                    this.matchOver = true;
                    this.matchWinner = 0;
                } else if (this.matchPoints[1] >= POINTS_TO_WIN_MATCH) {
                    this.matchOver = true;
                    this.matchWinner = 1;
                }

                if (this.matchOver && this.onMatchOver) {
                    this.onMatchOver(this.matchWinner, this.matchPoints);
                } else if (this.onRoundOver) {
                    this.onRoundOver(roundResult);
                }
                return;
            }

            this.currentTrick = new Trick();
            this.currentPlayerIndex = winner.position;
            this.notifyStateChange();
        }

        async playAITurn() {
            if (this.roundOver) return;

            const player = this.getCurrentPlayer();
            if (player.isHuman) return;

            await delay(600);

            const card = player.chooseCard(
                this.getLedSuit(),
                this.superiorSuit,
                this.currentTrick.getCards(),
                this.getGameState()
            );

            await this.playCard(card);
        }

        async continueGame() {
            while (!this.roundOver && !this.isHumanTurn()) {
                await this.playAITurn();
            }
        }

        getGameState() {
            return {
                currentPlayer: this.currentPlayerIndex,
                ledSuit: this.getLedSuit(),
                superiorSuit: this.superiorSuit,
                tricksWon: [...this.tricksWon],
                tensCollected: [...this.tensCollected],
                collectedTensCards: [
                    [...this.collectedTensCards[0]],
                    [...this.collectedTensCards[1]]
                ],
                trickNumber: this.trickNumber,
                trickCards: this.currentTrick ? this.currentTrick.getCards() : [],
                roundOver: this.roundOver,
                roundResult: this.roundResult,
                matchPoints: [...this.matchPoints],
                matchOver: this.matchOver,
                matchWinner: this.matchWinner,
                winTypeCount: [
                    { ...this.winTypeCount[0] },
                    { ...this.winTypeCount[1] }
                ]
            };
        }

        getPlayer(position) {
            return this.players[position];
        }

        getHumanPlayer() {
            return this.players[0];
        }

        notifyStateChange() {
            if (this.onStateChange) {
                this.onStateChange(this.getGameState());
            }
        }
    }

    // ============================================
    // CARD SPRITE CLASS
    // ============================================

    class CardSprite {
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

        static setPlayable(element, playable) {
            if (playable) {
                element.classList.add('playable');
                element.classList.remove('disabled');
            } else {
                element.classList.remove('playable');
                element.classList.add('disabled');
            }
        }

        static animatePlay(element) {
            element.classList.add('playing');
            setTimeout(() => element.classList.remove('playing'), 300);
        }

        static animateCollect(element) {
            element.classList.add('collecting');
        }
    }

    // ============================================
    // RENDERER CLASS
    // ============================================

    class Renderer {
        constructor() {
            this.elements = {
                hands: {
                    0: document.getElementById('hand-bottom'),
                    1: document.getElementById('hand-left'),
                    2: document.getElementById('hand-top'),
                    3: document.getElementById('hand-right')
                },
                played: {
                    0: document.getElementById('played-bottom'),
                    1: document.getElementById('played-left'),
                    2: document.getElementById('played-top'),
                    3: document.getElementById('played-right')
                },
                scores: {
                    team0Tens: document.getElementById('team0-tens'),
                    team0Tricks: document.getElementById('team0-tricks'),
                    team1Tens: document.getElementById('team1-tens'),
                    team1Tricks: document.getElementById('team1-tricks')
                },
                matchPoints: {
                    0: document.getElementById('match-points-0'),
                    1: document.getElementById('match-points-1')
                },
                collectedTens: {
                    0: document.getElementById('collected-tens-0'),
                    1: document.getElementById('collected-tens-1')
                },
                winTypes: {
                    normal: [document.getElementById('normal-0'), document.getElementById('normal-1')],
                    'all-tens': [document.getElementById('all-tens-0'), document.getElementById('all-tens-1')],
                    shutout: [document.getElementById('shutout-0'), document.getElementById('shutout-1')]
                },
                superiorSuit: document.getElementById('superior-suit-display'),
                turnIndicator: document.getElementById('turn-indicator'),
                messageOverlay: document.getElementById('message-overlay'),
                messageTitle: document.getElementById('message-title'),
                messageText: document.getElementById('message-text'),
                messageButton: document.getElementById('message-button')
            };
        }

        renderHand(player, validCards = [], onCardClick = null) {
            const handElement = this.elements.hands[player.position];
            handElement.innerHTML = '';

            const isHuman = player.isHuman;

            player.hand.forEach(card => {
                const cardElement = CardSprite.createCardElement(card, isHuman);

                if (isHuman && validCards.length > 0) {
                    const isValid = validCards.some(c => c.equals(card));
                    CardSprite.setPlayable(cardElement, isValid);

                    if (isValid && onCardClick) {
                        cardElement.addEventListener('click', () => onCardClick(card));
                    }
                }

                handElement.appendChild(cardElement);
            });
        }

        renderAllHands(players, validCards = [], onCardClick = null) {
            players.forEach(player => {
                this.renderHand(
                    player,
                    player.isHuman ? validCards : [],
                    player.isHuman ? onCardClick : null
                );
            });
        }

        renderPlayedCard(card, position) {
            const playedElement = this.elements.played[position];
            playedElement.innerHTML = '';

            const cardElement = CardSprite.createCardElement(card, true);
            CardSprite.animatePlay(cardElement);
            playedElement.appendChild(cardElement);
        }

        clearPlayedCards() {
            for (let i = 0; i < 4; i++) {
                this.elements.played[i].innerHTML = '';
            }
        }

        async animateCollectTrick(winnerPosition) {
            for (let i = 0; i < 4; i++) {
                const cardElement = this.elements.played[i].firstChild;
                if (cardElement) {
                    CardSprite.animateCollect(cardElement);
                }
            }

            await new Promise(resolve => setTimeout(resolve, 500));
            this.clearPlayedCards();
        }

        updateScores(tricksWon, tensCollected) {
            this.elements.scores.team0Tens.textContent = tensCollected[0];
            this.elements.scores.team0Tricks.textContent = tricksWon[0];
            this.elements.scores.team1Tens.textContent = tensCollected[1];
            this.elements.scores.team1Tricks.textContent = tricksWon[1];
        }

        updateMatchPoints(matchPoints) {
            this.elements.matchPoints[0].textContent = matchPoints[0];
            this.elements.matchPoints[1].textContent = matchPoints[1];
        }

        updateWinTypeCounts(winTypeCount) {
            for (const type of ['normal', 'all-tens', 'shutout']) {
                this.elements.winTypes[type][0].textContent = winTypeCount[0][type];
                this.elements.winTypes[type][1].textContent = winTypeCount[1][type];
            }
        }

        updateCollectedTens(collectedTensCards) {
            for (let team = 0; team < 2; team++) {
                const container = this.elements.collectedTens[team];
                container.innerHTML = '';

                collectedTensCards[team].forEach(card => {
                    const tenElement = document.createElement('div');
                    tenElement.className = `collected-ten ${card.suit}`;
                    tenElement.innerHTML = `<span>10</span><span>${card.getSuitSymbol()}</span>`;
                    container.appendChild(tenElement);
                });
            }
        }

        clearCollectedTens() {
            this.elements.collectedTens[0].innerHTML = '';
            this.elements.collectedTens[1].innerHTML = '';
        }

        updateSuperiorSuit(suit) {
            const element = this.elements.superiorSuit;
            element.classList.remove('hearts', 'diamonds', 'clubs', 'spades');

            if (suit) {
                element.textContent = `Superior: ${getSuitSymbol(suit)} ${getSuitDisplay(suit)}`;
                element.classList.add(suit);
            } else {
                element.textContent = 'Superior Suit: None';
            }
        }

        showTurnIndicator(position, isHuman) {
            const indicator = this.elements.turnIndicator;

            const positions = {
                0: { bottom: '140px', left: '50%', transform: 'translateX(-50%)' },
                1: { left: '140px', top: '50%', transform: 'translateY(-50%)' },
                2: { top: '140px', left: '50%', transform: 'translateX(-50%)' },
                3: { right: '140px', top: '50%', transform: 'translateY(-50%)' }
            };

            indicator.style.top = '';
            indicator.style.bottom = '';
            indicator.style.left = '';
            indicator.style.right = '';
            indicator.style.transform = '';

            Object.assign(indicator.style, positions[position]);
            indicator.classList.toggle('active', isHuman);
        }

        showMessage(title, text, buttonText = 'Continue') {
            return new Promise(resolve => {
                this.elements.messageTitle.textContent = title;
                this.elements.messageText.textContent = text;
                this.elements.messageButton.textContent = buttonText;
                this.elements.messageButton.style.display = '';
                this.elements.messageOverlay.classList.remove('hidden');

                const handleClick = () => {
                    this.elements.messageButton.removeEventListener('click', handleClick);
                    this.elements.messageOverlay.classList.add('hidden');
                    resolve();
                };

                this.elements.messageButton.addEventListener('click', handleClick);
            });
        }

        hideMessage() {
            this.elements.messageOverlay.classList.add('hidden');
        }

        flashMessage(text, duration = 1500) {
            this.elements.messageTitle.textContent = text;
            this.elements.messageText.textContent = '';
            this.elements.messageButton.style.display = 'none';
            this.elements.messageOverlay.classList.remove('hidden');

            setTimeout(() => {
                this.elements.messageOverlay.classList.add('hidden');
                this.elements.messageButton.style.display = '';
            }, duration);
        }
    }

    // ============================================
    // UI MANAGER CLASS
    // ============================================

    class UIManager {
        constructor(game) {
            this.game = game;
            this.renderer = new Renderer();
            this.isProcessing = false;

            this.setupEventListeners();
            this.bindGameEvents();
        }

        setupEventListeners() {
            const newGameBtn = document.getElementById('new-game-btn');
            newGameBtn.addEventListener('click', () => this.startNewMatch());
        }

        bindGameEvents() {
            this.game.onStateChange = (state) => this.handleStateChange(state);
            this.game.onCardPlayed = (card, player) => this.handleCardPlayed(card, player);
            this.game.onTrickComplete = (winner, trick, tens) => this.handleTrickComplete(winner, trick, tens);
            this.game.onRoundOver = (result) => this.handleRoundOver(result);
            this.game.onMatchOver = (winner, points) => this.handleMatchOver(winner, points);
            this.game.onSuperiorSuitEstablished = (suit, player) => this.handleSuperiorSuit(suit, player);
        }

        async startNewMatch() {
            this.isProcessing = false;
            this.game.startNewMatch();
            this.renderer.clearPlayedCards();
            this.renderer.clearCollectedTens();
            this.renderer.updateSuperiorSuit(null);
            this.renderer.updateMatchPoints([0, 0]);
            this.renderer.updateWinTypeCounts([
                { normal: 0, 'all-tens': 0, shutout: 0 },
                { normal: 0, 'all-tens': 0, shutout: 0 }
            ]);
            this.updateDisplay();

            await this.game.continueGame();
        }

        async startNextRound() {
            this.isProcessing = false;
            this.game.startRound();
            this.renderer.clearPlayedCards();
            this.renderer.clearCollectedTens();
            this.renderer.updateSuperiorSuit(null);
            this.updateDisplay();

            await this.game.continueGame();
        }

        updateDisplay() {
            const state = this.game.getGameState();
            const validCards = this.game.isHumanTurn() ? this.game.getValidCards() : [];

            this.renderer.renderAllHands(
                this.game.players,
                validCards,
                (card) => this.handleCardClick(card)
            );

            this.renderer.updateScores(state.tricksWon, state.tensCollected);
            this.renderer.updateMatchPoints(state.matchPoints);
            this.renderer.updateWinTypeCounts(state.winTypeCount);
            this.renderer.updateCollectedTens(state.collectedTensCards);
            this.renderer.updateSuperiorSuit(state.superiorSuit);
            this.renderer.showTurnIndicator(state.currentPlayer, this.game.isHumanTurn());
        }

        async handleCardClick(card) {
            if (this.isProcessing) return;
            if (!this.game.isHumanTurn()) return;

            this.isProcessing = true;

            const success = await this.game.playCard(card);

            if (success) {
                await this.game.continueGame();
            }

            this.isProcessing = false;
        }

        handleStateChange(state) {
            this.updateDisplay();
        }

        handleCardPlayed(card, player) {
            this.renderer.renderPlayedCard(card, player.position);
            this.updateDisplay();
        }

        async handleTrickComplete(winner, trick, tens) {
            await delay(800);

            const winnerName = winner.player.isHuman ? 'You' : winner.player.name;
            let message = `${winnerName} won the trick!`;

            if (tens.length > 0) {
                const tensStr = tens.map(t => `${t.getSuitSymbol()}10`).join(', ');
                message += ` (+${tens.length} ten${tens.length > 1 ? 's' : ''}: ${tensStr})`;
            }

            this.renderer.flashMessage(message, 1200);
            await delay(1200);

            await this.renderer.animateCollectTrick(winner.position);

            const state = this.game.getGameState();
            this.renderer.updateScores(state.tricksWon, state.tensCollected);
        }

        async handleSuperiorSuit(suit, player) {
            this.renderer.updateSuperiorSuit(suit);

            const playerName = player.isHuman ? 'You' : player.name;
            const suitDisplay = `${getSuitSymbol(suit)} ${getSuitDisplay(suit)}`;

            await this.renderer.showMessage(
                'Superior Suit Established!',
                `${playerName} couldn't follow suit and played ${suitDisplay}. This suit now beats all others for the rest of the round!`,
                'Got it!'
            );
        }

        async handleRoundOver(result) {
            await delay(500);

            const state = this.game.getGameState();
            let title, bonusText = '';

            if (result.winner === 0) {
                title = 'Round Won!';
            } else if (result.winner === 1) {
                title = 'Round Lost!';
            } else {
                title = 'Round Tied!';
            }

            if (result.points === 1) {
                const typeLabel = result.type === 'all-tens' ? 'All 10s' :
                                  result.type === 'shutout' ? 'Shutout' : 'Normal';
                bonusText = `\n\n+1 POINT (${typeLabel})`;
            }

            const text = result.message + bonusText +
                `\n\nRound Score:\nYour Team: ${state.tensCollected[0]} tens, ${state.tricksWon[0]} tricks\nOpponents: ${state.tensCollected[1]} tens, ${state.tricksWon[1]} tricks` +
                `\n\nMatch Score: You ${state.matchPoints[0]} - ${state.matchPoints[1]} Opp`;

            await this.renderer.showMessage(title, text, 'Next Round');
            this.startNextRound();
        }

        async handleMatchOver(winner, points) {
            await delay(500);

            let title, text;

            if (winner === 0) {
                title = 'MATCH WON!';
                text = `Congratulations! You won the match!\n\nFinal Score: ${points[0]} - ${points[1]}`;
            } else {
                title = 'MATCH LOST';
                text = `The opponents won the match.\n\nFinal Score: ${points[0]} - ${points[1]}`;
            }

            await this.renderer.showMessage(title, text, 'New Match');
            this.startNewMatch();
        }

        init() {
            this.startNewMatch();
        }
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    document.addEventListener('DOMContentLoaded', () => {
        console.log('Dhiha Ei - Initializing game...');

        const game = new Game();
        const ui = new UIManager(game);
        ui.init();

        console.log('Dhiha Ei - Game initialized!');

        window.dhihaEi = {
            game,
            ui,
            getState: () => game.getGameState(),
            POINTS_TO_WIN: POINTS_TO_WIN_MATCH
        };
    });

})();
