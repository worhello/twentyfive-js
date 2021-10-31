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

class Card {
    constructor(suit, value) {
        this.suit = suit;
        this.value = value;
        this.cardName = buildCardName(suit, value);
        this.canPlay = true;
    }
}

(function () {
    let e = {};
    e.CardSuits = CardSuits;
    e.CardValues = CardValues;
    e.Card = Card;
    
    if (typeof module !== 'undefined' && module.exports != null) {
        module.exports = e;
    } else {
        window.card = e;
    }
})();