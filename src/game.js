"use strict";

const GameState2 = Object.freeze({
    notStarted: 0,
    waitingForPlayers: 1,
    readyToPlay: 2,
    dealCards: 3,
    cardsDealt: 4,
    waitingForPlayerToRobTrumpCard: 5,
    waitingForPlayerMove: 6,
    roundFinished: 7,
    waitingForPlayersToMarkAsReady: 8,
    gameFinished: 9
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

class GameRules {
    constructor(winningScore, renegingAllowed) {
        this.winningScore = winningScore;
        this.renegingAllowed = renegingAllowed;
    }

    static parseGameRulesObject(gameRulesCandidate) {
        //
    }

    static buildDefaultRules() {
        return new GameRules(25, true);
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
        this.roundPlayerAndCards = [];
        this.currentPlayerIndex = 0;
        this.currentWinningPlayerAndCard = {};
        this.handFinished = false;
        this.needMoreCardsDealt = true;
    }
}

class EndOfHandInfo {
    constructor() {
        this.nextRoundFirstPlayerId = "";
        this.orderedPlayers = [];
        this.gameFinished = false;
    }
}

class Game {
    constructor(id, numberOfPlayers, gameRulesCandidate) {
        this.id = id;
        this.numberOfPlayers = numberOfPlayers;

        this.gameRules = gameRulesCandidate === undefined ? GameRules.buildDefaultRules() : GameRules.parseGameRulesObject(gameRulesCandidate);

        this.players = [];
        this.deck = new (GameHelper.getDeckModule()).Deck();
        this.trumpCard = new (GameHelper.getTrumpCardModule()).TrumpCard();

        this.currentState2 = GameState2.notStarted;

        this.roundRobbingInfo = new RoundRobbingInfo();
        this.currentHandInfo = new HandInfo();
        this.endOfHandInfo = new EndOfHandInfo();
    }
}

(function () {
    let e = {};
    e.Game = Game;
    e.GameState2 = GameState2;
    
    if (typeof module !== 'undefined' && module.exports != null) {
        module.exports = e;
    } else {
        window.game = e;
    }
})();