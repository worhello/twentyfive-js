"use strict";

class Deck {
    constructor() {
        this.cards = Deck.buildDeck();
        Deck.shuffleDeck(this.cards);
    }

    static getCardModule() {
        if (typeof module !== 'undefined' && module.exports != null) {
            let card = require("./card");
            return card;
        }
        else {
            return window.card;
        }
    }

    static buildDeck() {
        var cards = [];
        let cardModule = Deck.getCardModule();
        for (let [_, s] of Object.entries(cardModule.CardSuits)) {
            for (let [_1, v] of Object.entries(cardModule.CardValues)) {
                cards.push(new cardModule.Card(s, v));
            }
        }
        return cards;
    }

    static shuffleDeck(cards) {
        cards.sort(function() {
            return .5 - Math.random();
        });
    }
}

(function () {
    let e = {};
    e.Deck = Deck;
    
    if (typeof module !== 'undefined' && module.exports != null) {
        module.exports = e;
    } else {
        window.deck = e;
    }
})();