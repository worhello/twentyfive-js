"use strict";

class TutorialGameManager {
    constructor() {
        this.playCount = -1;
        this.deckSorted = false;
        this.dealerSet = false;
    }

    static getGameLogicModule() {
        if (typeof module !== 'undefined' && module.exports != null) {
            let gameLogic = require("./gameLogic");
            return gameLogic;
        }
        else {
            return window.gameLogic;
        }
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

    sortDeckIfNeeded(deckCards) {
        if (this.deckSorted === true) {
            return;
        }
        this.deckSorted = true;

        let gameLogic = TutorialGameManager.getGameLogicModule();
        let cardModule = TutorialGameManager.getCardModule();
        let cardsToFindAndReplace = [
            new cardModule.Card(cardModule.CardSuits.diamonds, cardModule.CardValues.seven),
            new cardModule.Card(cardModule.CardSuits.spades,   cardModule.CardValues.three),
            new cardModule.Card(cardModule.CardSuits.clubs,    cardModule.CardValues.ace  ),
            new cardModule.Card(cardModule.CardSuits.hearts,   cardModule.CardValues.six  ),
            new cardModule.Card(cardModule.CardSuits.hearts,   cardModule.CardValues.three),

            new cardModule.Card(cardModule.CardSuits.diamonds, cardModule.CardValues.four ),
            new cardModule.Card(cardModule.CardSuits.spades,   cardModule.CardValues.two  ),
            new cardModule.Card(cardModule.CardSuits.clubs,    cardModule.CardValues.ten  ),
            new cardModule.Card(cardModule.CardSuits.hearts,   cardModule.CardValues.seven),
            new cardModule.Card(cardModule.CardSuits.clubs,    cardModule.CardValues.three),

            new cardModule.Card(cardModule.CardSuits.hearts,   cardModule.CardValues.four ),

            new cardModule.Card(cardModule.CardSuits.clubs,    cardModule.CardValues.nine ),
            new cardModule.Card(cardModule.CardSuits.diamonds, cardModule.CardValues.five ),
            new cardModule.Card(cardModule.CardSuits.diamonds, cardModule.CardValues.ten  ),
            new cardModule.Card(cardModule.CardSuits.hearts,   cardModule.CardValues.king ),
            new cardModule.Card(cardModule.CardSuits.spades,   cardModule.CardValues.queen),

            new cardModule.Card(cardModule.CardSuits.diamonds, cardModule.CardValues.jack ),
            new cardModule.Card(cardModule.CardSuits.hearts,   cardModule.CardValues.ace  ),
            new cardModule.Card(cardModule.CardSuits.diamonds, cardModule.CardValues.queen),
            new cardModule.Card(cardModule.CardSuits.spades,   cardModule.CardValues.four ),
            new cardModule.Card(cardModule.CardSuits.hearts,   cardModule.CardValues.jack ),

            new cardModule.Card(cardModule.CardSuits.diamonds, cardModule.CardValues.ace  )
        ];

        for (var i = 0; i < cardsToFindAndReplace.length; i++) {
            let deckIndex = 51 - i;
            let cardIndex = deckCards.findIndex(function(card) { return gameLogic.isSameCard(card, cardsToFindAndReplace[i]); } );
            var tmp = deckCards[deckIndex];
            deckCards[deckIndex] = deckCards[cardIndex];
            deckCards[cardIndex] = tmp;
        }
    }

    getDealerIndex(selfPlayerIndex) {
        if (this.dealerSet === true) {
            return selfPlayerIndex;
        }
        this.dealerSet = true;
        return  (selfPlayerIndex + 1) % 2;
    }

    enableCardsForPlay(selfPlayerCards) {
        for (var card of selfPlayerCards) {
            card.canPlay = false;
        }
        if (selfPlayerCards.length > 0) {
            selfPlayerCards[0].canPlay = true;
        }

        return selfPlayerCards;
    }

    playNextAiCard(player) {
        // always play the first card
        return player.playCard(player.cards[0].cardName);
    }
}

(function () {
    let e = {};
    e.TutorialGameManager = TutorialGameManager;
    
    if (typeof module !== 'undefined' && module.exports != null) {
        module.exports = e;
    } else {
        window.tutorialGameManager = e;
    }
})();