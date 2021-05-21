"use strict";

const GameState = Object.freeze({
    notStarted: 0,
    waitingForPlayers: 1,
    readyToPlay: 2,
    inProgress: 3,
    waitingToDealNewCards: 4,
    waitingForPlayerToRobTrumpCard: 5,
    gameFinished: 6
});

class GameHelper {
    static getDeckModule() {
        if (typeof module !== 'undefined' && module.exports != null) {
            return require("./deck");
        }
        else {
            return window.deck;
        }
    }

    static getTrumpCardModule() {
        if (typeof module !== 'undefined' && module.exports != null) {
            return require("./trumpCard");
        }
        else {
            return window.trumpCard;
        }
    }
}

class Game {
    constructor(id, numberOfPlayers, disableReneging) {
        this.id = id;
        this.numberOfPlayers = numberOfPlayers;
        this.renegingDisabled = disableReneging;
        this.players = [];
        this.deck = new (GameHelper.getDeckModule()).Deck();
        this.trumpCard = new (GameHelper.getTrumpCardModule()).TrumpCard();
        this.roundPlayerAndCards = [];
        this.currentPlayerIndex = 0;
        this.currentWinningPlayerAndCard = {};
        this.currentState = GameState.notStarted;
        this.nextRoundFirstPlayerId = "";
    }
}

(function () {
    let e = {};
    e.Game = Game;
    e.GameState = GameState;
    
    if (typeof module !== 'undefined' && module.exports != null) {
        module.exports = e;
    } else {
        window.game = e;
    }
})();