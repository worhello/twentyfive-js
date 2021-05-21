"use strict";

class DeckHelper {
    static getCardModule() {
        if (typeof module !== 'undefined' && module.exports != null) {
            return require("./card");
        }
        else {
            return window.card;
        }
    }

    static getHelpersModule() {
        if (typeof module !== 'undefined' && module.exports != null) {
            return require("./helpers");
        }
        else {
            return window.helpers;
        }
    }

    static buildDeck() {
        var cards = [];
        let cardModule = DeckHelper.getCardModule();
        for (let [_, s] of Object.entries(cardModule.CardSuits)) {
            for (let [_1, v] of Object.entries(cardModule.CardValues)) {
                cards.push(new cardModule.Card(s, v));
            }
        }
        return cards;
    }

    static shuffleDeck(cards) {
        DeckHelper.getHelpersModule().Helpers.shuffle(cards);
    }
}

class Deck {
    constructor() {
        this.cards = DeckHelper.buildDeck();

        DeckHelper.shuffleDeck(this.cards);
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