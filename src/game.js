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

class Game {
    constructor(id, numberOfPlayers, disableReneging) {
        this.id = id;
        this.numberOfPlayers = numberOfPlayers;
        this.renegingDisabled = disableReneging;
        this.players = [];
        this.deck = new (this.getDeckModule()).Deck();
        this.trumpCard = new (this.getTrumpCardModule()).TrumpCard();
        this.roundPlayerAndCards = [];
        this.currentPlayerIndex = 0;
        this.currentWinningPlayerAndCard = {};
        this.currentState = GameState.notStarted;
        this.nextRoundFirstPlayerId = "";
    }

    getDeckModule() {
        if (typeof module !== 'undefined' && module.exports != null) {
            let m = require("./deck");
            return m;
        }
        else {
            return window.deck;
        }
    }
    
    getTrumpCardModule() {
        if (typeof module !== 'undefined' && module.exports != null) {
            let m = require("./trumpCard");
            return m;
        }
        else {
            return window.trumpCard;
        }
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