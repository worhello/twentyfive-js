"use strict";

const CardSuits = Object.freeze({
    hearts: 0,
    diamonds: 1,
    clubs: 2,
    spades: 3
});

const CardValues = Object.freeze({
    ace : 1,
    two : 2,
    three : 3,
    four : 4,
    five : 5,
    six : 6,
    seven : 7,
    eight : 8,
    nine : 9,
    ten : 10,
    jack : 11,
    queen : 12,
    king : 13,
});

function convertSuitName(s) {
    switch(s) {
        case CardSuits.hearts: return "hearts";
        case CardSuits.diamonds: return "diamonds";
        case CardSuits.clubs: return "clubs";
        case CardSuits.spades: return "spades";
    }
    return "hearts";
}

function convertValueName(v) {
    switch(v) {
        case CardValues.ace: return "ace";
        case CardValues.jack: return "jack";
        case CardValues.queen: return "queen";
        case CardValues.king: return "king";
        default: return String(v);
    }
}

function buildCardName(s, v) {
    return convertValueName(v) + "_of_" + convertSuitName(s);
}

function buildCardUrl(cardName) {
    return "resources/images/Cards/" + cardName + ".svg";
}

class Card {
    constructor(suit, value) {
        this.suit = suit;
        this.value = value;
        this.cardName = buildCardName(suit, value);
        this.url = buildCardUrl(this.cardName);
        this.canPlay = true;
    }
}

function buildDeck() {
    var cards = [];
    for (let [_, s] of Object.entries(CardSuits)) {
        for (let [_1, v] of Object.entries(CardValues)) {
            cards.push(new Card(s, v));
        }
    }
    return cards;
}

class Deck {
    constructor() {
        this.cards = buildDeck();
        Deck.shuffleDeck(this.cards);
    }

    static shuffleDeck(cards) {
        cards.sort(function() {
            return .5 - Math.random();
        });
    }
}

class TrumpCard {
    constructor() {
        this.card = new Card();
        this.hasBeenStolen = false;
        this.stolenBy = {};
    }
    
    steal(player) {
        this.hasBeenStolen = true;
        this.stolenBy = player
    }
}

const RedNormalCardsRanking = Object.freeze([
    CardValues.ace,
    CardValues.two,
    CardValues.three,
    CardValues.four,
    CardValues.five,
    CardValues.six,
    CardValues.seven,
    CardValues.eight,
    CardValues.nine,
    CardValues.ten,
    CardValues.jack,
    CardValues.queen,
    CardValues.king
]);

const BlackNormalCardsRanking = Object.freeze([
    CardValues.ten,
    CardValues.nine,
    CardValues.eight,
    CardValues.seven,
    CardValues.six,
    CardValues.five,
    CardValues.four,
    CardValues.three,
    CardValues.two,
    CardValues.ace,
    CardValues.jack,
    CardValues.queen,
    CardValues.king
]);

function isRedCard(c) {
    return c.suit == CardSuits.hearts || c.suit == CardSuits.diamonds;
}

function isTrumpSuit(cardA, trumpCard) {
    return cardA.suit == trumpCard.card.suit;
}

function isAceCard(cardA) {
    return cardA.value == CardValues.ace;
}

function isAceOfHearts(cardA) {
    return cardA.suit == CardSuits.hearts && isAceCard(cardA);
}

function isFiveOfTrumps(cardA, trumpCard) {
    return isTrumpSuit(cardA, trumpCard) && cardA.value == CardValues.five;
}

function isJackOfTrumps(cardA, trumpCard) {
    return isTrumpSuit(cardA, trumpCard) && cardA.value == CardValues.jack;
}

function isAceOfTrumps(cardA, trumpCard) {
    return isTrumpSuit(cardA, trumpCard) && isAceCard(cardA);
}

function isTrumpCard(cardA, trumpCard) {
    return isTrumpSuit(cardA, trumpCard) || isAceOfHearts(cardA);
}

function compareNormalCards(cardA, cardB) {
    var orderedCards = [];
    if (isRedCard(cardA)) {
        orderedCards = RedNormalCardsRanking;
    } else {
        orderedCards = BlackNormalCardsRanking;
    }

    let cardAIdx = orderedCards.indexOf(cardA.value);
    let cardBIdx = orderedCards.indexOf(cardB.value);

    return cardAIdx > cardBIdx ? cardA : cardB;
}

function compareTrumpCards(cardA, cardB, trumpCard) {
    if (isFiveOfTrumps(cardA, trumpCard)) {
        return cardA;
    }
    if (isFiveOfTrumps(cardB, trumpCard)) {
        return cardB;
    }

    if (isJackOfTrumps(cardA, trumpCard)) {
        return cardA;
    }
    if (isJackOfTrumps(cardB, trumpCard)) {
        return cardB;
    }

    if (isAceOfHearts(cardA)) {
        return cardA;
    }
    if (isAceOfHearts(cardB)) {
        return cardB;
    }
    
    if (isAceOfTrumps(cardA, trumpCard)) {
        return cardA;
    }
    if (isAceOfTrumps(cardB, trumpCard)) {
        return cardB;
    }

    return compareNormalCards(cardA, cardB);
}

function compareCards(cardA, cardB, trumpCard) {
    let cardATrump = isTrumpCard(cardA, trumpCard);
    let cardBTrump = isTrumpCard(cardB, trumpCard);

    if (cardATrump && !cardBTrump) {
        return cardA;
    }  else if (!cardATrump && cardBTrump) {
        return cardB;
    } else if (cardA.suit != cardB.suit && !cardATrump && !cardBTrump) {
        return cardA;
    }

    if (cardATrump) {
        return compareTrumpCards(cardA, cardB, trumpCard);
    }

    return compareNormalCards(cardA, cardB);
}


function getBestCardFromOptions(cardOptions, trumpCard, playedCards) {
    if (cardOptions.length == 0) {
        return {};
    }
    if (cardOptions.length == 1) {
        return cardOptions[0];
    }

    if (playedCards.length == 0) {
        return cardOptions[0];
    }

    let firstCardSuit = playedCards[0].suit;
    let optionWithFirstCardSuit = cardOptions.find(c => c.suit == firstCardSuit);
    if (optionWithFirstCardSuit) {
        return optionWithFirstCardSuit;
    }
    
    let trumpCardSuit = trumpCard.card.suit;
    let optionWithTrumpCardSuit = cardOptions.find(c => c.suit == trumpCardSuit);
    if (optionWithTrumpCardSuit) {
        return optionWithTrumpCardSuit;
    }

    return cardOptions[0];
}

function getWinningCard(trumpCard, playedCards) {
    if (playedCards.length == 0) {
        return {};
    }
    if (playedCards.length == 1) {
        return playedCards[0];
    }

    var currentWinningCard = playedCards[0];

    for (var i = 1; i < playedCards.length; i++) {
        let betterMove = compareCards(currentWinningCard, playedCards[i], trumpCard);
        if (currentWinningCard.suit != betterMove.suit || currentWinningCard.value != betterMove.value) {
            currentWinningCard = betterMove;
        }
    }

    return currentWinningCard;
}

function canTrumpCardBeRobbed(playerHand, playerIsDealer, trumpCard) {
    let trumpCardIsAce = isAceCard(trumpCard.card);
    if (trumpCardIsAce && playerIsDealer) {
        return true;
    }

    for (let card of playerHand) {
        if (isAceOfTrumps(card, trumpCard)) {
            return true;
        }
    }

    return false;
}

function updatePlayerCardsEnabledState(playedCards, cards, trumpCard) {
    if (playedCards.length === 0) {
        for (var card of cards) {
            card.canPlay = true;
        }
        return;
    }

    let firstCard = playedCards[0];
    var canPlayAtLeastOneCard = false;
    for (var card of cards) {
        card.canPlay = (card.suit === firstCard.suit || card.suit === trumpCard.card.suit);
        if (card.canPlay === true) {
            canPlayAtLeastOneCard = true;
        }
    }

    if (canPlayAtLeastOneCard === false) {
        for (var card of cards) {
            card.canPlay = true;
        }
    }
}

function isSameCard(a, b) {
    return a.suit === b.suit && a.value === b.value;
}

(function () {
    let gameLogicExports = {};
    gameLogicExports.getBestCardFromOptions = getBestCardFromOptions;
    gameLogicExports.getWinningCard = getWinningCard;
    gameLogicExports.canTrumpCardBeRobbed = canTrumpCardBeRobbed;
    gameLogicExports.updatePlayerCardsEnabledState = updatePlayerCardsEnabledState;
    gameLogicExports.isAceOfTrumps = isAceOfTrumps;
    gameLogicExports.isSameCard = isSameCard;
    gameLogicExports.CardSuits = CardSuits;
    gameLogicExports.CardValues = CardValues;
    gameLogicExports.Card = Card;
    gameLogicExports.Deck = Deck;
    gameLogicExports.TrumpCard = TrumpCard;
    
    if (typeof module !== 'undefined' && module.exports != null) {
        module.exports = gameLogicExports;
    } else {
        window.gameLogic = gameLogicExports;
    }
})();