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

    static getDeckModule() {
        if (typeof module !== 'undefined' && module.exports != null) {
            return require("./deck");
        }
        else {
            return window.deck;
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
            game.currentState2 = GameStateMachine.handleReadyToPlay(gameModule, game);
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
        else if (game.currentState2 == gameModule.GameState2.waitingForPlayersToMarkAsReady) {
            game.currentState2 = GameStateMachine.handleWaitingForPlayersToMarkAsReady(gameModule, game);
        }
    }

    static gameIsValid(game) {
        if (game.numberOfPlayers > 10) {
            return false;
        }

        return true;
    }

    static incrementScore(player) {
        player.score += 5;
    }

    static handleWaitingForPlayers(gameModule, game) {
        if (game.players.length == game.numberOfPlayers) {
            GameStateMachine.rotateDealer(game);
            return gameModule.GameState2.readyToPlay;
        }

        return gameModule.GameState2.waitingForPlayers;
    }

    static handleReadyToPlay(gameModule, game) {
        if (game.players.length == game.numberOfPlayers) {
            GameStateMachine.populateTeamsIfNeeded(game);
            return gameModule.GameState2.dealCards;
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

    static populateTeamsIfNeeded(game) {
        if (game.gameRules.useTeams === null) {
            return;
        }

        var teamNum = 0;
        for (let player of game.players) {
            game.teams[teamNum].playerIds.push(player.id);
            teamNum = (teamNum + 1) % game.gameRules.useTeams.numTeams;
        }
    }

    static handleDealCards(gameModule, game) {
        let numCardsPerPlayer = 5;
        let numCardsNeeded = (game.players.length * numCardsPerPlayer) + 1;
        if (game.deck.cards.length < numCardsNeeded) {
            game.deck = new (GameStateMachineModuleHelper.getDeckModule()).Deck();
        }

        for (let p of game.players) {
            for (var i = 0; i < numCardsPerPlayer; i++) {
                p.cards.push(game.deck.cards.shift());
            }
        }

        game.trumpCard = new (GameStateMachineModuleHelper.getTrumpCardModule()).TrumpCard();
        game.trumpCard.card = game.deck.cards.shift();

        console.log(game.gameRules.customRules);
        if (game.gameRules.customRules && game.gameRules.customRules.dealerBonusIfTrumpIsAce == true) {
            console.log("went into custom rule");
            let dealer = game.players.find(p => p.isDealer == true);
            GameStateMachine.incrementScore(dealer);
        }

        game.currentHandInfo.needMoreCardsDealt = false;

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
        if (game.players.length == 1) {
            game.players[0].isHost = true;
        }
    }

    static removePlayer(game, playerId) {
        let i = game.players.findIndex((p) => p.id == playerId);
        if (i > -1) {
            game.players.splice(i, 1);
        }
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

        if (game.gameRules.renegingAllowed == false) {
            let playedCards = game.currentHandInfo.roundPlayerAndCards.map(pac => pac.card);
            let nextPlayer = game.players[game.currentHandInfo.currentPlayerIndex];
            GameStateMachineModuleHelper.getGameLogicModule().updatePlayerCardsEnabledState(playedCards, nextPlayer.cards, game.trumpCard);
        }

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
        GameStateMachine.incrementScore(game.players.find(p => p.id == game.endOfHandInfo.nextRoundFirstPlayerId));

        GameStateMachine.updateTeamsScores(game);

        game.endOfHandInfo.orderedPlayers.length = 0;
        game.endOfHandInfo.orderedPlayers = GameStateMachine.getSortedListOfPlayers(game);

        game.currentHandInfo.needMoreCardsDealt = GameStateMachine.mustDealNewCards(game);
        game.endOfHandInfo.gameFinished = GameStateMachine.isGameFinished(game);

        if (game.currentHandInfo.needMoreCardsDealt) {
            game.endOfHandInfo.nextRoundFirstPlayerId = game.endOfHandInfo.orderedPlayers[0].id;
        }
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

    static updateTeamsScores(game) {
        if (game.gameRules.useTeams === null) {
            return;
        }

        for (var team of game.teams) {
            team.totalScore = 0;
            for (let playerId of team.playerIds) {
                let player = game.players.find(p => p.id == playerId);
                if (player) {
                    team.totalScore += player.score;
                }
            }
        }
    }

    static isGameFinished(game) {
        if (game.gameRules.useTeams === null) {
            return game.endOfHandInfo.orderedPlayers[0].score >= game.gameRules.winningScore;
        }

        const max = game.teams.reduce((prev, current) => (prev.totalScore > current.totalScore) ? prev : current);
        game.endOfHandInfo.winningTeamId = max.id;
        return max.totalScore >= game.gameRules.winningScore;
    }

    static handleRoundFinished(gameModule, game) {
        if (game.endOfHandInfo.gameFinished) {
            return gameModule.GameState2.gameFinished;
        }

        // reset game state
        GameStateMachine.rotatePlayers(game);
        GameStateMachine.rotateDealer(game);
        game.currentHandInfo.roundPlayerAndCards.length = 0;
        game.currentHandInfo.currentPlayerIndex = 0;
        game.currentHandInfo.currentWinningPlayerAndCard = {};
        game.currentHandInfo.roundFinished = false;

        if (game.currentHandInfo.needMoreCardsDealt) {
            GameStateMachine.markAllPlayersAsNotReady(game);
            return gameModule.GameState2.waitingForPlayersToMarkAsReady;
        }

        return gameModule.GameState2.waitingForPlayerMove;
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

    static markAllPlayersAsNotReady(game) {
        for (var p of game.players) {
            p.isReadyForNextRound = p.isAi; // only non-AI players have to mark themselves ready
        }
    }

    static markPlayerReadyForNextRound(game, playerId) {
        let player = game.players.find((p) => p.id == playerId);
        if (player) {
            player.isReadyForNextRound = true;
        }
    }

    static handleWaitingForPlayersToMarkAsReady(gameModule, game) {
        let allPlayersReady = game.players.every((p) => p.isReadyForNextRound == true);
        if (allPlayersReady) {
            return gameModule.GameState2.dealCards;
        }
        return gameModule.GameState2.waitingForPlayersToMarkAsReady;
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
