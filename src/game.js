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

// replacement for GameState, not wired up yet
const GameState2 = Object.freeze({
    notStarted: 0,
    waitingForPlayers: 1,
    readyToPlay: 2,
    dealCards: 3,
    cardsDealt: 4,
    waitingForPlayerToRobTrumpCard: 5,
    waitingForPlayerMove: 6,
    roundFinished: 7,
    gameFinished: 8
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

class RoundRobbingInfo {
    constructor() {
        this.playerCanRobIndex = -1;
        this.robbingFinished = false;
    }
}

class HandInfo {
    constructor() {
        this.playerAndCards = [];
        this.currentPlayerIndex = 0;
        this.currentWinningPlayerAndCard = {};
        this.handFinished = false;
    }
}

class EndOfHandInfo {
    constructor() {
        this.nextRoundFirstPlayerId = "";
        this.orderedPlayers = [];
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

        this.currentState = GameState.notStarted; // deprecated
        this.currentState2 = GameState2.notStarted;

        this.roundRobbingInfo = new RoundRobbingInfo();
        this.playerCanRobIndex = -1; // deprecated
        this.roundRobbingInfo.robbingFinished = false; // deprecated

        this.currentHandInfo = new HandInfo();
        this.roundPlayerAndCards = [];
        this.currentPlayerIndex = 0;
        this.currentWinningPlayerAndCard = {};
        this.roundFinished = false;

        this.endOfHandInfo = new EndOfHandInfo();
        this.nextRoundFirstPlayerId = "";
        this.orderedPlayers = [];
    }
}

(function () {
    let e = {};
    e.Game = Game;
    e.GameState = GameState;
    e.GameState2 = GameState2;
    
    if (typeof module !== 'undefined' && module.exports != null) {
        module.exports = e;
    } else {
        window.game = e;
    }
})();