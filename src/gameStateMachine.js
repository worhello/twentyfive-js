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
        else if (game.currentState2 == gameModule.GameState2.waitingForPlayerMove) {
            game.currentState2 = GameStateMachine.handleWaitingForPlayerMove(gameModule, game);
        }
        else if (game.currentState2 == gameModule.GameState2.roundFinished) {
            game.currentState2 = GameStateMachine.handleRoundFinished(gameModule, game);
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
            game.roundRobbingInfo.robbingFinished = false;
            return gameModule.GameState2.waitingForPlayerToRobTrumpCard;
        }

        return gameModule.GameState2.waitingForPlayerMove;
    }

    static updatePlayerCanRob(game) {
        game.roundRobbingInfo.playerCanRobIndex = -1;

        // first check dealer
        let dealerIndex = game.players.findIndex(p => p.isDealer == true);
        let dealer = game.players[dealerIndex];
        let dealerNeedsNotification = GameStateMachine.playerCanRobTrumpCard(game, dealer);
        if (dealerNeedsNotification) {
            game.roundRobbingInfo.playerCanRobIndex = dealerIndex;
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
                game.roundRobbingInfo.playerCanRobIndex = i;
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
        if (game.currentState2 != gameModule.GameState2.waitingForPlayerToRobTrumpCard || game.roundRobbingInfo.playerCanRobIndex == -1) {
            return;
        }

        let player = game.players[game.roundRobbingInfo.playerCanRobIndex];
        if (!GameStateMachine.aiWillRob(playerModule, player)) {
            game.roundRobbingInfo.robbingFinished = true;
            return;
        }

        GameStateMachine.robCard(game, player, playerModule.PlayerLogic.aiSelectCardToDropForRob(player, game.trumpCard));
    }

    static robCard(game, player, droppedCardName) {
        (GameStateMachineModuleHelper.getPlayerModule()).PlayerLogic.playCard(player, droppedCardName);
        player.cards.push(game.trumpCard.card);
        (GameStateMachineModuleHelper.getTrumpCardModule()).TrumpCardLogic.steal(game.trumpCard, player);
        game.roundRobbingInfo.robbingFinished = true;
    }

    static skipRobbing(game) {
        game.roundRobbingInfo.robbingFinished = true;
    }

    static aiWillRob(playerModule, player) {
        // TODO - seed player will rob chance for specific player
        return playerModule.PlayerLogic.aiWillRobCard();
    }

    static handleWaitingForPlayerToRobTrumpCard(gameModule, game) {
        if (!game.roundRobbingInfo.robbingFinished) {
            return gameModule.GameState2.waitingForPlayerToRobTrumpCard;
        }

        return gameModule.GameState2.waitingForPlayerMove;
    }

    // public
    static playCard(game, player, playedCardName) {
        let playedCard = (GameStateMachineModuleHelper.getPlayerModule()).PlayerLogic.playCard(player, playedCardName);
        return GameStateMachine.handleCardPlayed(game, player, playedCard);
    }

    // public
    static aiPlayCard(game, player) {
        let playedCards = GameStateMachine.getPlayedCards(game);
        let card = (GameStateMachineModuleHelper.getPlayerModule()).PlayerLogic.aiPlayCard(player, playedCards, game.trumpCard);
        return GameStateMachine.handleCardPlayed(game, player, card);
    }

    static handleCardPlayed(game, player, playedCard) {
        let currentMove = { "player": player, "card": playedCard };
        game.currentHandInfo.roundPlayerAndCards.push(currentMove);

        let isNewWinningCard = GameStateMachine.updateCurrentWinningCard(game, currentMove);

        game.currentHandInfo.currentPlayerIndex++;
        game.currentHandInfo.roundFinished = game.currentHandInfo.currentPlayerIndex == game.players.length;

        return isNewWinningCard;
    }

    static updateCurrentWinningCard(game, currentMove) {
        let gameLogic = GameStateMachineModuleHelper.getGameLogicModule();
        let currentWinningCard = gameLogic.getWinningCard(game.trumpCard, GameStateMachine.getPlayedCards(game));
        if (!game.currentHandInfo.currentWinningPlayerAndCard.card || !gameLogic.isSameCard(game.currentHandInfo.currentWinningPlayerAndCard.card, currentWinningCard)) {
            game.currentHandInfo.currentWinningPlayerAndCard = currentMove;
            return true;
        }
        return false;
    }

    static getPlayedCards(game) {
        return game.currentHandInfo.roundPlayerAndCards.map(pAC => pAC.card);
    }

    static handleWaitingForPlayerMove(gameModule, game) {
        if (game.currentHandInfo.roundFinished) {
            GameStateMachine.evaluateRoundEnd(game);
            return gameModule.GameState2.roundFinished;
        }

        return gameModule.GameState2.waitingForPlayerMove;
    }

    static evaluateRoundEnd(game) {
        let playedCards = GameStateMachine.getPlayedCards(game);
        let winningCard = (GameStateMachineModuleHelper.getGameLogicModule()).getWinningCard(game.trumpCard, playedCards);
        let winningPlayer = game.currentHandInfo.roundPlayerAndCards.find(pAC => pAC.card == winningCard).player;

        game.endOfHandInfo.nextRoundFirstPlayerId = winningPlayer.id;
        game.players.find(p => p.id == game.endOfHandInfo.nextRoundFirstPlayerId).score += 5;

        game.endOfHandInfo.orderedPlayers.length = 0;
        game.endOfHandInfo.orderedPlayers = GameStateMachine.getSortedListOfPlayers(game);
    }

    static getSortedListOfPlayers(game) {
        let playersCopy = [...game.players];
        let cmpFunc = function(a, b) {
            if (a.score < b.score) {
                return 1;
            }
            if (a.score > b.score) {
                return -1;
            }
            return 0;
        }
        playersCopy.sort(cmpFunc);
        return playersCopy;
    }

    static handleRoundFinished(gameModule, game) {
        var winnerWithHighestScore = game.players[0];
        game.players.map(function(p) {
            if (p.score > winnerWithHighestScore.score) {
                winnerWithHighestScore = p;
            }
        });
        if (winnerWithHighestScore.score >= 25) {
            return gameModule.GameState2.gameFinished;
        }

        var nextGameState2 = gameModule.GameState2.waitingForPlayerMove;
        if (GameStateMachine.mustDealNewCards(game)) {
            game.endOfHandInfo.nextRoundFirstPlayerId = game.endOfHandInfo.orderedPlayers[0].id;
            nextGameState2 = gameModule.GameState2.dealCards;
        }

        // reset game state
        GameStateMachine.rotatePlayers(game);
        GameStateMachine.rotateDealer(game);
        game.currentHandInfo.roundPlayerAndCards.length = 0;
        game.currentHandInfo.currentPlayerIndex = 0;
        game.currentHandInfo.currentWinningPlayerAndCard = {};
        game.currentHandInfo.roundFinished = false;
        return nextGameState2;
    }

    static rotatePlayers(game) {
        let playersCopy = [...game.players];
        let winningPlayerIndex = playersCopy.findIndex(p => p.id == game.endOfHandInfo.nextRoundFirstPlayerId);
        var firstHalf = playersCopy.slice(winningPlayerIndex, playersCopy.length);
        let secondHalf = playersCopy.slice(0, winningPlayerIndex);
        game.players = firstHalf.concat(secondHalf);
    }

    static mustDealNewCards(game) {
        var needMoreCards = true;
        for (var i = 0; i < game.players.length; i++) {
            if (game.players[i].cards.length > 0) {
                needMoreCards = false;
                break;
            }
        }
        return needMoreCards;
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
