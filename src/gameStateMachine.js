"use strict";

class GameStateMachineModuleHelper {
    static getGameModule() {
        if (typeof module !== 'undefined' && module.exports != null) {
            return require("./game");
        }
        else {
            return window.game;
        }
    }

    static getPlayerModule() {
        if (typeof module !== 'undefined' && module.exports != null) {
            return require("./player");
        }
        else {
            return window.playerModule;
        }
    }
}



class GameStateMachine {

    static updateToNextGameState(game) {
        let gameModule = GameStateMachineModuleHelper.getGameModule();

        if (!GameStateMachine.gameIsValid(game)) {
            game.currentState2 = gameModule.GameState2.notStarted;
        }
        else if (game.currentState2 == gameModule.GameState2.notStarted) {
            game.currentState2 = gameModule.GameState2.waitingForPlayers;
        }
        else if (game.currentState2 == gameModule.GameState2.waitingForPlayers) {
            game.currentState2 = GameStateMachine.handleWaitingForPlayers(gameModule, game);
        }
        else if (game.currentState2 == gameModule.GameState2.readyToPlay) {
            game.currentState2 = gameModule.GameState2.dealCards;
        }
        else if (game.currentState2 == gameModule.GameState2.dealCards) {
            GameStateMachine.handleDealCards(gameModule, game);
        }
    }

    static gameIsValid(game) {
        if (game.numberOfPlayers > 10) {
            return false;
        }

        return true;
    }

    static handleWaitingForPlayers(gameModule, game) {
        if (game.players.length == game.numberOfPlayers) {
            return gameModule.GameState2.readyToPlay;
        }

        return gameModule.GameState2.waitingForPlayers;
    }

    static handleDealCards(gameModule, game) {
        let numCardsPerPlayer = 5;
        for (let p of game.players) {
            for (var i = 0; i < numCardsPerPlayer; i++) {
                p.cards.push(game.deck.cards.shift());
            }
        }

        game.currentState2 = gameModule.GameState2.cardsDealt;
    }

    static addPlayer(game, player) {
        game.players.push(player);
    }

    static fillWithAIs(game) {
        let numAiPlayersNeeded = game.numberOfPlayers - game.players.length;
        for (var i = 0; i < numAiPlayersNeeded; i++) {
            GameStateMachine.addPlayer(game, (GameStateMachineModuleHelper.getPlayerModule()).buildAiPlayer());
        }
    }
}


(function () {
    let e = {};
    e.GameStateMachine = GameStateMachine;
    
    if (typeof module !== 'undefined' && module.exports != null) {
        module.exports = e;
    } else {
        window.gameStateMachine = e;
    }
})();
