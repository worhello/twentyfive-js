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

function buildPlayerDetailsJson(players) {
    var out = [];
    for (var i = 0; i < players.length; i++) {
        let p = players[i];
        out.push({
            name: p.name,
            userId: p.id
        });
    }

    return out;
}

class GameProcessor {
    constructor(game, notifyOnePlayerFunc, notifyStateChangeFunc, notifyGameChangedFunc) {
        this.game = game;
        this.notifyOnePlayerFunc = notifyOnePlayerFunc;
        this.notifyStateChangeFunc = notifyStateChangeFunc;
        this.notifyGameChangedFunc = notifyGameChangedFunc;
    }

    getPlayerModule() {
        if (typeof module !== 'undefined' && module.exports != null) {
            let m = require("./player");
            return m;
        }
        else {
            return window.playerModule;
        }
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
    
    getGameLogicModule() {
        if (typeof module !== 'undefined' && module.exports != null) {
            let m = require("./gameLogic");
            return m;
        }
        else {
            return window.gameLogic;
        }
    }

    getHelpersModule() {
        if (typeof module !== 'undefined' && module.exports != null) {
            let m = require("./helpers");
            return m;
        }
        else {
            return window.helpers;
        }
    }

    async init() {
        await this.moveToState(GameState.waitingForPlayers);
    }

    async moveToState(newState) {
        if (this.game.currentState != newState) {
            this.game.currentState = newState;
            if (this.notifyStateChangeFunc) {
                await this.notifyStateChangeFunc(this.game.currentState);
            }
        }
    }

    async notifyIfReadyToPlay() {
        if (this.game.players.length == this.game.numberOfPlayers) {
            await this.moveToState(GameState.readyToPlay);
        }
    }

    async addPlayer(player, notify = true) {
        this.game.players.push(player);
        if (notify) {
            await this.notifyPlayersListChanged();
        }
        await this.notifyIfReadyToPlay();
    }

    async removePlayer(player) {
        let playerIndex = this.game.players.findIndex((p) => p.id == player.id);
        if (playerIndex == -1) {
            // log error?
            return;
        }

        this.game.players.splice(playerIndex, 1);
        let p1 = this.notifyPlayersListChanged();
        let p2 = this.notifyIfReadyToPlay();
        await p1;
        await p2;
    }

    async fillWithAis() {
        let numAiPlayersNeeded = this.game.numberOfPlayers - this.game.players.length;
        for (var i = 0; i < numAiPlayersNeeded; i++) {
            await this.addPlayer((this.getPlayerModule()).buildAiPlayer(), i == (numAiPlayersNeeded - 1)); // only notify once
        }
    }

    async notifyPlayersListChanged() {
        let playersDetails = buildPlayerDetailsJson(this.game.players);
        let data = {
            type: "playerListChanged",
            playersDetails: playersDetails,
            needMorePlayers: this.needsMorePlayers()
        }
        await this.notifyAllPlayers(data);
    }

    async notifyOnePlayer(playerId, data) {
        await this.notifyOnePlayerFunc(playerId, data);
    }

    async notifyAllPlayers(data) {
        var promises = [];
        for (var i = 0; i < this.game.players.length; i++) {
            let p = this.game.players[i];
            if (p.isAi == false) {
                promises.push(this.notifyOnePlayer(p.id, data));
            }
        }

        for (let p of promises) {
            await p;
        }
    }

    needsMorePlayers() {
        return this.game.numberOfPlayers != this.game.players.length;
    }

    async robCard(player, droppedCardName) {
        player.playCard(droppedCardName);
        player.cards.push(this.game.trumpCard.card);
        this.game.trumpCard.steal(player);

        await this.startRound();
    }

    playerCanRobTrumpCard(player) {
        return this.getGameLogicModule().canTrumpCardBeRobbed(player.cards, player.isDealer, this.game.trumpCard);
    }

    async aiAttemptRob(player) {
        let canRob = this.playerCanRobTrumpCard(player);
        if (canRob == false) {
            return;
        }

        let willRob = player.aiWillRobCard();
        if (willRob == false) {
            return;
        }

        await this.robCard(player, player.aiSelectCardToDropForRob(this.game.trumpCard));
    }

    async shouldNotifyPlayerForRobbing(player) {
        if (player.isAi) {
            await this.aiAttemptRob(player);
        }
        else if (this.playerCanRobTrumpCard(player)) {
            return true;
        }
        return false;
    }

    async notifyOnePlayerRobTrumpCardAvailable(p) {
        let data = {
            type: "robTrumpCardAvailable",
            userId: p.id,
            trumpCard: this.game.trumpCard
        }
        await this.notifyOnePlayer(p.id, data);
    }

    async checkIfAnyPlayerCanRobAndNotify() {
        // sequence is explained in the rules

        // first check dealer
        let dealerIndex = this.game.players.findIndex(p => p.isDealer === true);
        let dealer = this.game.players[dealerIndex];
        let dealerNeedsNotification = await this.shouldNotifyPlayerForRobbing(dealer);
        if (dealerNeedsNotification) {
            await this.notifyOnePlayerRobTrumpCardAvailable(dealer);
            return true;
        }

        // then cycle through other players
        for (let player of this.game.players) {
            if (player.isDealer) {
                continue; // already handled above
            }

            let playerNeedsNotification = await this.shouldNotifyPlayerForRobbing(player);
            if (playerNeedsNotification) {
                await this.notifyOnePlayerRobTrumpCardAvailable(player);
                return true;
            }
        }

        return false;
    }

    async notifyAllGameError(errorMessage) {
        let data = {
            type: "gameError",
            errorMessage: errorMessage
        };
        await this.notifyAllPlayers(data);
    }

    async start() {
        if (this.game.currentState == GameState.readyToPlay) {
            this.getHelpersModule().Helpers.shuffle(this.game.players);
            await this.startRound();
        }
        else {
            await this.notifyAllGameError("Not enough players in the game to start!");
        }
    }

    hack_alwaysSelfPlayerCanRobDrawCard() {
        let me = this.game.players.find(function(p) { return p.isAi == false; });
        if (!me) {
            return this.drawCard();
        }

        // check if I have any aces
        let myAce = me.cards.findIndex(function (c) { return isAceCard(c); });
        if (myAce >= 0) {
            let mySuit = me.cards[myAce].suit;
            return this.game.deck.cards.find(function(c) { return c.suit == mySuit; });
        }
    }

    async startRound() {
        await this.moveToState(GameState.inProgress);
        this.resetDeckIfNeeded();
        this.game.roundPlayerAndCards = [];
        var canRobThisRound = false;
        if (this.mustDealNewCards()) {
            this.rotateDealer();
            this.dealAllPlayerCards();
            this.game.trumpCard = new (this.getTrumpCardModule()).TrumpCard();
            this.game.trumpCard.card = this.drawCard();
            canRobThisRound = true;
        }

        var promises = [];
        promises.push(this.notifyAllGameInitialState());

        var requestNextMove = true;
        if (canRobThisRound == true) {
            let trumpCardCanBeRobbed = await this.checkIfAnyPlayerCanRobAndNotify();
            if (trumpCardCanBeRobbed) {
                // waiting for the player who can rob to do something
                // the resulting player actions will handle starting the round
                promises.push(this.moveToState(GameState.waitingForPlayerToRobTrumpCard));
                requestNextMove = false;
            }
        }
        if (requestNextMove == true) {
            promises.push(this.requestNextPlayerMove());
        }

        for (let p of promises) {
            await p;
        }
    }

    async notifyAllGameInitialState() {
        var data = {
            type: "gameInitialState",
            gameId: this.game.id,
            gameInfo: {
                trumpCard: this.game.trumpCard
            },
            playerDetails: {
                userId: "",
                cards: []
            },
            players: this.game.players
        }
        var promises = [];
        for (var i = 0; i < this.game.players.length; i++) {
            let p = this.game.players[i];
            if (p.isAi == false) {
                data.playerDetails.userId = p.id;
                data.playerDetails.cards = p.cards;
                promises.push(this.notifyOnePlayer(p.id, data));
            }
        }

        for (let p of promises) {
            await p;
        }
    }

    updatePlayerCardsEnabled(player) {
        if (this.game.disableReneging) {
            let playedCards = this.getPlayedCards();
            this.getGameLogicModule().updatePlayerCardsEnabledState(playedCards, player.cards, this.game.trumpCard);
        }
    }

    playerBestCardAi(player) {
        let playedCards = this.getPlayedCards();
        return player.aiPlayCard(playedCards, this.game.trumpCard);
    }

    async requestNextPlayerMove() {
        let player = this.game.players[this.game.currentPlayerIndex];
        let p1 = this.notifyAllCurrentPlayerMovePending(player);
        var p2 = null;
        if (player.isAi == true) {
            this.playCard(player, this.playerBestCardAi(player));
        }
        else {
            this.updatePlayerCardsEnabled(player);
            p2 = this.notifyOnePlayerMoveRequested(player);
        }
        await p1;
        if (p2) {
            await p2;
        }
    }

    getPlayedCards() {
        return this.game.roundPlayerAndCards.map(pAC => pAC.card);
    }

    async notifyAllCurrentPlayerMovePending(player) {
        let data = {
            type: "currentPlayerMovePending",
            userId: player.id
        }
        await this.notifyAllPlayers(data);
    }

    async notifyOnePlayerMoveRequested(p) {
        let data = {
            type: "playerMoveRequested",
            userId: p.id
        }
        await this.notifyOnePlayer(p.id, data);
    }

    resetDeckIfNeeded() {
        let numCardsNeeded = (this.game.players.length * 5) + 1;
        if (this.game.deck.cards.length < numCardsNeeded) {
            this.game.deck = new (this.getDeckModule()).Deck();
        }
    }

    mustDealNewCards() {
        var needMoreCards = true;
        for (var i = 0; i < this.game.players.length; i++) {
            if (this.game.players[i].cards.length > 0) {
                needMoreCards = false;
                break;
            }
        }
        return needMoreCards;
    }

    rotateDealer() {
        var dealerIndex = this.game.players.findIndex(p => p.isDealer == true);
        if (dealerIndex == -1) {
            dealerIndex = this.game.players.length - 2;
        } else {
            this.game.players[dealerIndex].isDealer = false;
        }
        
        dealerIndex = (dealerIndex + 1) % this.game.players.length;
        this.game.players[dealerIndex].isDealer = true;
    }

    hack_dealAllPlayerCards(player) {
        if (player.isAi) {
            return this.drawCards(5);
        }
        else {
            let myAce = this.game.deck.cards.findIndex(function (c) { return isAceCard(c); });
            var cards = [];
            cards.push(this.game.deck.cards[myAce]);
            let others = this.drawCards(4);
            for (let c of others) {
                cards.push(c);
            }
            return cards;
        }
    }

    dealAllPlayerCards() {
        let gameMgr = this;
        this.game.players.forEach(function(player) {
            player.cards = gameMgr.drawCards(5);
        });
    }

    drawCard() {
        return this.game.deck.cards.pop();
    }

    drawCards(num) {
        var cards = [];
        for (var i = 0; i < num; i++) {
            cards.push(this.drawCard());
        }
        return cards;
    }

    async playCardWithId(userId, cardDetails) {
        let player = this.findPlayerById(userId);
        if (!player) {
            return;
        }
        let playedCard = player.playCard(cardDetails.cardName);
        if (playedCard) {
            await this.playCard(player, playedCard);
        }
    }

    async playCard(player, playedCard) {
        let currentMove = { "player": player, "card": playedCard };
        this.game.roundPlayerAndCards.push(currentMove);
        let isNewWinningCard = this.updateCurrentWinningCard(currentMove);

        var promises = [];
        promises.push(this.notifyAllCardPlayed(player, playedCard, isNewWinningCard));

        if (player.isAi == false) {
            promises.push(this.notifyOneCardsUpdated(player));
        }

        this.game.currentPlayerIndex++;
        if (this.game.currentPlayerIndex == this.game.players.length) {
            promises.push(this.evaluateRoundEnd());
        }
        else {
            promises.push(this.requestNextPlayerMove());
        }

        for (let p of promises) {
            await p;
        }
    }

    markAllPlayersWaitingForNextRound() {
        for (var player of this.game.players) {
            if (!player.isAi) {
                player.isReadyForNextRound = false;
            }
            else {
                // AIs are always "ready"
                player.isReadyForNextRound = true;
            }
        }
    }

    async onRoundEnded(continueFunc) {
        await continueFunc();
    }

    async evaluateRoundEnd() {
        let playedCards = this.getPlayedCards();
        let winningCard = this.getGameLogicModule().getWinningCard(this.game.trumpCard, playedCards);
        let winningPlayer = this.game.roundPlayerAndCards.find(pAC => pAC.card == winningCard).player;

        this.game.nextRoundFirstPlayerId = winningPlayer.id;
        this.game.players.find(p => p.id == this.game.nextRoundFirstPlayerId).score += 5;

        var winnerWithHighestScore = this.game.players[0];
        this.game.players.map(function(p) {
            if (p.score > winnerWithHighestScore.score) {
                winnerWithHighestScore = p;
            }
        });

        let game = this;
        let continueFunc = async function() {
            let orderedPlayers = game.getSortedListOfPlayers();
            var promises = [];
            if (winnerWithHighestScore.score >= 25) {
                promises.push(game.notifyAllRoundFinished(orderedPlayers, "gameFinished"));
                promises.push(game.moveToState(GameState.gameFinished));
            }
            else if (game.mustDealNewCards()) {
                game.markAllPlayersWaitingForNextRound();
                game.game.nextRoundFirstPlayerId = orderedPlayers[0].id;
                promises.push(game.notifyAllRoundFinished(orderedPlayers, "roundFinished"));
                promises.push(game.moveToState(GameState.waitingToDealNewCards));
            }
            else {
                promises.push(game.notifyAllRoundFinished(orderedPlayers, "scoresUpdated"));
                promises.push(game.startNextRound());
            }
            for (let p of promises) {
                await p;
            }
        }

        await this.onRoundEnded(continueFunc);
    }

    getSortedListOfPlayers() {
        let playersCopy = [...this.game.players];
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

    async startNextRound() {
        this.game.currentPlayerIndex = 0;
        this.rotatePlayersArray(this.game.nextRoundFirstPlayerId);
        await this.startRound();
    }

    rotatePlayersArray(lastRoundWinningPlayerId) {
        let playersCopy = [...this.game.players];
        let winningPlayerIndex = playersCopy.findIndex(p => p.id == lastRoundWinningPlayerId);
        var firstHalf = playersCopy.slice(winningPlayerIndex, playersCopy.length);
        let secondHalf = playersCopy.slice(0, winningPlayerIndex);
        this.game.players = firstHalf.concat(secondHalf);
    }

    async notifyAllRoundFinished(orderedPlayers, eventType) {
        let data = {
            type: eventType,
            gameId: this.game.id,
            orderedPlayers: orderedPlayers
        }
        await this.notifyAllPlayers(data);
    }

    updateCurrentWinningCard(currentMove) {
        let gameLogic = this.getGameLogicModule();
        let currentWinningCard = gameLogic.getWinningCard(this.game.trumpCard, this.getPlayedCards());
        if (!this.game.currentWinningPlayerAndCard.card || !gameLogic.isSameCard(this.game.currentWinningPlayerAndCard.card, currentWinningCard)) { // is new card
            this.game.currentWinningPlayerAndCard = currentMove;
            return true;
        }
        return false;
    }

    async notifyAllCardPlayed(player, playedCard, isNewWinningCard) {
        let data = {
            type: "cardPlayed",
            userId: player.id,
            playedCard: playedCard,
            isNewWinningCard: isNewWinningCard
        }
        await this.notifyAllPlayers(data);
    }

    async notifyOneCardsUpdated(player) {
        let data = {
            type: "cardsUpdated",
            userId: player.id,
            cards: player.cards
        }
        await this.notifyOnePlayer(player.id, data);
    }
    
    async robTrumpCard(userId, droppedCardDetails) {
        let player = this.findPlayerById(userId);
        if (!player) {
            // TODO do something
            return
        }

        let droppedCardName = droppedCardDetails.cardName;
        await this.robCard(player, droppedCardName);
    }

    async skipRobTrumpCard(userId) {
        let player = this.findPlayerById(userId);
        if (!player) {
            // TODO do something
            return
        }
        await this.startRound();
    }

    allPlayersReadyForNextRound() {
        var ready = true;
        for (let player of this.game.players) {
            if (!player.isAi && !player.isReadyForNextRound) {
                ready = false;
                break;
            }
        }

        return ready;
    }

    async notifyAllPlayerReadyForNextRoundChanged(readyPlayerIds) {
        let data = {
            type: "playersReadyForNextRoundChanged",
            readyPlayerIds: readyPlayerIds
        }
        await this.notifyAllPlayers(data);
    }

    async markPlayerReadyForNextRound(userId) {
        let player = this.findPlayerById(userId);
        if (!player) {
            // TODO do something
            return
        }

        player.isReadyForNextRound = true;

        if (this.allPlayersReadyForNextRound()) {
            await this.startNextRound();
        }
        else {
            let readyPlayers = this.game.players.filter((p) => p.isReadyForNextRound == true);
            let readyPlayerIds = readyPlayers.map((p) => p.id);
            await this.notifyAllPlayerReadyForNextRoundChanged(readyPlayerIds);
        }
    }

    findPlayerById(playerId) {
        let playerIndex = this.game.players.findIndex(function(p) { return p.id == playerId; });
        if (playerIndex > -1) {
            return this.game.players[playerIndex];
        }
        return null;
    }
}

(function () {
    let e = {};
    e.GameProcessor = GameProcessor;
    
    if (typeof module !== 'undefined' && module.exports != null) {
        module.exports = e;
    } else {
        window.gameProcess = e;
    }
})();