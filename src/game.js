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

function allKeysPresent(object, keysToTest) {
    return Object.keys(object).sort().join(',') === keysToTest.sort().join(',');
}

function parseUseTeams(gameRulesCandidate, numberOfPlayers) {
    if (!allKeysPresent(gameRulesCandidate.useTeams, GameRules.allowedTeamsKeys) || typeof gameRulesCandidate.useTeams.numTeams !== 'number' || typeof gameRulesCandidate.useTeams.teamSize !== 'number') {
        throw "Invalid teams config";
    }
    let totalPlayersRequired = gameRulesCandidate.useTeams.numTeams * gameRulesCandidate.useTeams.teamSize;
    if (totalPlayersRequired < 4) {
        throw "Too few players";
    }
    else if (totalPlayersRequired > 10) {
        throw "Too many players needed";
    }
    else if (totalPlayersRequired < numberOfPlayers) {
        throw "Too few players specified in teams config";
    }
    else if (totalPlayersRequired > numberOfPlayers) {
        throw "Not enough players specified for the game";
    }
}

function parseCustomRules(gameRulesCandidate, allowedCustomRules) {
    if (typeof gameRulesCandidate.customRules !== "object" || Array.isArray(gameRulesCandidate.customRules)) {
        throw "customRules is not null and not an object";
    }

    if (Object.keys(gameRulesCandidate.customRules).length > Object.keys(allowedCustomRules).length) {
        throw "too many keys in customRules";
    }

    for (let customRuleCandidate of Object.keys(gameRulesCandidate.customRules)) {
        if (!Object.keys(allowedCustomRules).some(allowed => allowed == customRuleCandidate)) {
            throw "unsupported key in customRules";
        }

        if (typeof gameRulesCandidate.customRules[customRuleCandidate] != allowedCustomRules[customRuleCandidate]) {
            throw "key of unsupported type in customRules";
        }
    }


}

class GameRules {
    constructor(winningScore, renegingAllowed, useTeams, customRules) {
        this.winningScore = winningScore;
        this.renegingAllowed = renegingAllowed;
        this.useTeams = useTeams;
        this.customRules = customRules;
    }

    static allowedKeys = [
        "winningScore",
        "renegingAllowed",
        "useTeams",
        "customRules"
    ];

    static allowedTeamsKeys = [
        "numTeams", "teamSize"
    ];

    static allowedCustomRules = {
        "dealerBonusIfTrumpIsAce": "boolean"
    }

    static parseGameRulesObject(gameRulesCandidate, numberOfPlayers) {
        if (gameRulesCandidate === undefined) {
            return GameRules.buildDefaultRules();
        }

        if (!allKeysPresent(gameRulesCandidate, GameRules.allowedKeys)) {
            throw "Too many or missing keys in game rules candidate";
        }

        if (gameRulesCandidate.useTeams !== null) {
            parseUseTeams(gameRulesCandidate, numberOfPlayers);
        }

        if (gameRulesCandidate.customRules !== null) {
            parseCustomRules(gameRulesCandidate, GameRules.allowedCustomRules);
        }

        var rules = GameRules.buildDefaultRules();
        for (let key of GameRules.allowedKeys) {
            rules[key] = gameRulesCandidate[key];
        }

        return rules;
    }

    static buildDefaultRules() {
        return new GameRules(25, true, null, null);
    }
}

class Team {
    static teamId = 0;
    constructor() {
        this.id = "teamId_" + Team.teamId++;
        this.playerIds = [];
        this.totalScore = 0;
    }
}

function generateTeams(gameRules) {
    if (gameRules.useTeams === null) {
        return [];
    }

    var teams = [];
    for (var i = 0; i < gameRules.useTeams.numTeams; i++) {
        teams.push(new Team());
    }
    return teams;
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
        this.winningTeamId = "";
        this.gameFinished = false;
    }
}

class Game {
    constructor(id, numberOfPlayers, gameRulesCandidate) {
        this.id = id;
        this.numberOfPlayers = numberOfPlayers;

        this.gameRules = GameRules.parseGameRulesObject(gameRulesCandidate, this.numberOfPlayers);

        this.players = [];
        this.teams = generateTeams(this.gameRules);
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