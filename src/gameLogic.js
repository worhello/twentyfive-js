"use strict";

function getCardModule() {
    if (typeof module !== 'undefined' && module.exports != null) {
        let card = require("./card");
        return card;
    }
    else {
        return window.card;
    }
}

let suits = getCardModule().CardSuits;
let values = getCardModule().CardValues;

const RedNormalCardsRanking = Object.freeze([
    values.ace,
    values.two,
    values.three,
    values.four,
    values.five,
    values.six,
    values.seven,
    values.eight,
    values.nine,
    values.ten,
    values.jack,
    values.queen,
    values.king
]);

const BlackNormalCardsRanking = Object.freeze([
    values.ten,
    values.nine,
    values.eight,
    values.seven,
    values.six,
    values.five,
    values.four,
    values.three,
    values.two,
    values.ace,
    values.jack,
    values.queen,
    values.king
]);

function isRedCard(c) {
    return c.suit == suits.hearts || c.suit == suits.diamonds;
}

function isTrumpSuit(cardA, trumpCard) {
    return cardA.suit == trumpCard.card.suit;
}

function isAceCard(cardA) {
    return cardA.value == values.ace;
}

function isAceOfHearts(cardA) {
    return cardA.suit == suits.hearts && isAceCard(cardA);
}

function isFiveOfTrumps(cardA, trumpCard) {
    return isTrumpSuit(cardA, trumpCard) && cardA.value == values.five;
}

function isJackOfTrumps(cardA, trumpCard) {
    return isTrumpSuit(cardA, trumpCard) && cardA.value == values.jack;
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
    
    if (typeof module !== 'undefined' && module.exports != null) {
        module.exports = gameLogicExports;
    } else {
        window.gameLogic = gameLogicExports;
    }
})();