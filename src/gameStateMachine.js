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

    static getGameLogicModule() {
        if (typeof module !== 'undefined' && module.exports != null) {
            return require("./gameLogic");
        }
        else {
            return window.gameLogic;
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

    static getTrumpCardModule() {
        if (typeof module !== 'undefined' && module.exports != null) {
            return require("./trumpCard");
        }
        else {
            return window.trumpCard;
        }
    }
}



class GameStateMachine {

    // public
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
            game.currentState2 = GameStateMachine.handleDealCards(gameModule, game);
        }
        else if (game.currentState2 == gameModule.GameState2.cardsDealt) {
            game.currentState2 = GameStateMachine.handleCardsDealt(gameModule, game);
        }
        else if (game.currentState2 == gameModule.GameState2.waitingForPlayerToRobTrumpCard) {
            game.currentState2 = GameStateMachine.handleWaitingForPlayerToRobTrumpCard(gameModule, game);
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
            GameStateMachine.rotateDealer(game);
            return gameModule.GameState2.readyToPlay;
        }

        return gameModule.GameState2.waitingForPlayers;
    }

    static rotateDealer(game) {
        var dealerIndex = game.players.findIndex(p => p.isDealer == true);
        if (dealerIndex == -1) {
            dealerIndex = game.players.length - 2;
        } else {
            game.players[dealerIndex].isDealer = false;
        }
        
        dealerIndex = (dealerIndex + 1) % game.players.length;
        game.players[dealerIndex].isDealer = true;
    }

    static handleDealCards(gameModule, game) {
        let numCardsPerPlayer = 5;
        for (let p of game.players) {
            for (var i = 0; i < numCardsPerPlayer; i++) {
                p.cards.push(game.deck.cards.shift());
            }
        }

        game.trumpCard = new (GameStateMachineModuleHelper.getTrumpCardModule()).TrumpCard();
        game.trumpCard.card = game.deck.cards.shift();

        return gameModule.GameState2.cardsDealt;
    }

    static handleCardsDealt(gameModule, game) {
        let playerCanRob = GameStateMachine.updatePlayerCanRob(game);
        if (playerCanRob) {
            game.robbingFinished = false;
            return gameModule.GameState2.waitingForPlayerToRobTrumpCard;
        }

        return gameModule.GameState2.waitingForPlayerMove;
    }

    static updatePlayerCanRob(game) {
        game.playerCanRobIndex = -1;

        // first check dealer
        let dealerIndex = game.players.findIndex(p => p.isDealer == true);
        let dealer = game.players[dealerIndex];
        let dealerNeedsNotification = GameStateMachine.playerCanRobTrumpCard(game, dealer);
        if (dealerNeedsNotification) {
            game.playerCanRobIndex = dealerIndex;
            return true;
        }

        // then cycle through other players
        for (var i = 0; i < game.players.length; i++) {
            var player = game.players[i];
            if (player.isDealer) {
                continue; // already handled above
            }

            let playerNeedsNotification = GameStateMachine.playerCanRobTrumpCard(game, player);
            if (playerNeedsNotification) {
                game.playerCanRobIndex = i;
                return true;
            }
        }

        return false;
    }

    static playerCanRobTrumpCard(game, player) {
        return GameStateMachineModuleHelper.getGameLogicModule().canTrumpCardBeRobbed(player.cards, player.isDealer, game.trumpCard);
    }

    // public
    static addPlayer(game, player) {
        game.players.push(player);
    }

    // public
    static fillWithAIs(game) {
        let numAiPlayersNeeded = game.numberOfPlayers - game.players.length;
        for (var i = 0; i < numAiPlayersNeeded; i++) {
            GameStateMachine.addPlayer(game, (GameStateMachineModuleHelper.getPlayerModule()).buildAiPlayer());
        }
    }

    // public
    static handleAiPlayerRob(game) {
        let gameModule = GameStateMachineModuleHelper.getGameModule();
        let playerModule = GameStateMachineModuleHelper.getPlayerModule();
        if (game.currentState2 != gameModule.GameState2.waitingForPlayerToRobTrumpCard || game.playerCanRobIndex == -1) {
            return;
        }

        let player = game.players[game.playerCanRobIndex];
        if (!GameStateMachine.aiWillRob(playerModule, player)) {
            game.robbingFinished = true;
            return;
        }

        GameStateMachine.robCard(game, player, playerModule.PlayerLogic.aiSelectCardToDropForRob(player, game.trumpCard));
    }

    static robCard(game, player, droppedCardName) {
        (GameStateMachineModuleHelper.getPlayerModule()).PlayerLogic.playCard(player, droppedCardName);
        player.cards.push(game.trumpCard.card);
        (GameStateMachineModuleHelper.getTrumpCardModule()).TrumpCardLogic.steal(game.trumpCard, player);
        game.robbingFinished = true;
    }

    static aiWillRob(playerModule, player) {
        // TODO - seed player will rob chance for specific player
        return playerModule.PlayerLogic.aiWillRobCard();
    }

    static handleWaitingForPlayerToRobTrumpCard(gameModule, game) {
        if (!game.robbingFinished) {
            return gameModule.GameState2.waitingForPlayerToRobTrumpCard;
        }

        return gameModule.GameState2.waitingForPlayerMove;
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
