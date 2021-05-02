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

class Game {
    constructor(id, numberOfPlayers, notifyOnePlayerFunc, notifyStateChangeFunc, disableReneging, isTutorial) {
        this.id = id;
        this.numberOfPlayers = numberOfPlayers;
        this.notifyOnePlayerFunc = notifyOnePlayerFunc;
        this.players = [];
        this.deck = new (this.getDeckModule()).Deck();
        this.trumpCard = new (this.getTrumpCardModule()).TrumpCard();
        this.roundPlayerAndCards = [];
        this.currentPlayerIndex = 0;
        this.currentWinningPlayerAndCard = {};
        this.currentState = GameState.notStarted;
        this.notifyStateChangeFunc = notifyStateChangeFunc;
        this.renegingDisabled = disableReneging;
        this.tutorialManager = null;
        if (isTutorial) {
            this.tutorialManager = new (this.getTutorialGameManagerModule()).TutorialGameManager();
        }
        console.log(this.tutorialManager);
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

    getTutorialGameManagerModule() {
        if (typeof module !== 'undefined' && module.exports != null) {
            let m = require("./tutorialGameManager");
            return m;
        }
        else {
            return window.tutorialGameManager;
        }
    }

    async init() {
        await this.moveToState(GameState.waitingForPlayers);
    }

    async moveToState(newState) {
        if (this.currentState != newState) {
            this.currentState = newState;
            if (this.notifyStateChangeFunc) {
                await this.notifyStateChangeFunc(this.currentState);
            }
        }
    }

    async notifyIfReadyToPlay() {
        if (this.players.length == this.numberOfPlayers) {
            await this.moveToState(GameState.readyToPlay);
        }
    }

    async addPlayer(player, notify = true) {
        this.players.push(player);
        if (notify) {
            await this.notifyPlayersListChanged();
        }
        await this.notifyIfReadyToPlay();
    }

    async removePlayer(player) {
        let playerIndex = this.players.findIndex((p) => p.id == player.id);
        if (playerIndex == -1) {
            // log error?
            return;
        }

        this.players.splice(playerIndex, 1);
        await this.notifyPlayersListChanged();
        await this.notifyIfReadyToPlay();
    }

    async fillWithAis() {
        let numAiPlayersNeeded = this.numberOfPlayers - this.players.length;
        for (var i = 0; i < numAiPlayersNeeded; i++) {
            await this.addPlayer((this.getPlayerModule()).buildAiPlayer(), i == (numAiPlayersNeeded - 1)); // only notify once
        }
    }

    async notifyPlayersListChanged() {
        let playersDetails = buildPlayerDetailsJson(this.players);
        let data = {
            type: "playerListChanged",
            playersDetails: playersDetails,
            needMorePlayers: this.needsMorePlayers()
        }
        await this.notifyAllPlayers(data);
    }

    async notifyAllPlayers(data) {
        for (var i = 0; i < this.players.length; i++) {
            let p = this.players[i];
            if (p.isAi === false) {
                await this.notifyOnePlayerFunc(p.id, data);
            }
        }
    }

    needsMorePlayers() {
        return this.numberOfPlayers != this.players.length;
    }

    async robCard(player, droppedCardName) {
        player.playCard(droppedCardName);
        player.cards.push(this.trumpCard.card);
        this.trumpCard.steal(player);

        await this.startRound();
    }

    playerCanRobTrumpCard(player) {
        return this.getGameLogicModule().canTrumpCardBeRobbed(player.cards, player.isDealer, this.trumpCard);
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

        await this.robCard(player, player.aiSelectCardToDropForRob(this.trumpCard));
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
            trumpCard: this.trumpCard
        }
        await this.notifyOnePlayerFunc(p.id, data);
    }

    async checkIfAnyPlayerCanRobAndNotify() {
        // sequence is explained in the rules

        // first check dealer
        let dealerIndex = this.players.findIndex(p => p.isDealer === true);
        let dealer = this.players[dealerIndex];
        let dealerNeedsNotification = await this.shouldNotifyPlayerForRobbing(dealer);
        if (dealerNeedsNotification) {
            await this.notifyOnePlayerRobTrumpCardAvailable(dealer);
            return true;
        }

        // then cycle through other players
        for (let player of this.players) {
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

    async start() {
        this.players.sort(function() {
            return .5 - Math.random();
        });
        await this.startRound();
    }

    hack_alwaysSelfPlayerCanRobDrawCard() {
        let me = this.players.find(function(p) { return p.isAi == false; });
        if (!me) {
            console.log("hitting error path in hack for trump card");
            return this.drawCard();
        }

        // check if I have any aces
        let myAce = me.cards.findIndex(function (c) { return isAceCard(c); });
        if (myAce >= 0) {
            let mySuit = me.cards[myAce].suit;
            return this.deck.cards.find(function(c) { return c.suit == mySuit; });
        }
        console.log("failed to find any aces in the deck??");
    }

    async startRound() {
        await this.moveToState(GameState.inProgress);
        this.resetDeckIfNeeded();
        this.roundPlayerAndCards = [];
        var canRobThisRound = false;
        if (this.mustDealNewCards()) {
            this.rotateDealer();
            this.dealAllPlayerCards();
            this.trumpCard = new (this.getTrumpCardModule()).TrumpCard();
            this.trumpCard.card = this.drawCard();
            
            canRobThisRound = true;
        }

        await this.notifyAllGameInitialState();

        if (canRobThisRound == true) {
            let trumpCardCanBeRobbed = await this.checkIfAnyPlayerCanRobAndNotify();
            if (trumpCardCanBeRobbed) {
                // waiting for the player who can rob to do something
                // the resulting player actions will handle starting the round
                await this.moveToState(GameState.waitingForPlayerToRobTrumpCard);
                return;
            }
        }

        this.requestNextPlayerMove();
    }

    async notifyAllGameInitialState() {
        var data = {
            type: "gameInitialState",
            gameId: this.gameId,
            gameInfo: {
                trumpCard: this.trumpCard
            },
            playerDetails: {
                userId: "",
                cards: []
            },
            players: this.players
        }
        for (var i = 0; i < this.players.length; i++) {
            let p = this.players[i];
            if (p.isAi == false) {
                data.playerDetails.userId = p.id;
                data.playerDetails.cards = p.cards;
                await this.notifyOnePlayerFunc(p.id, data);
            }
        }
    }

    async requestNextPlayerMove() {
        let player = this.players[this.currentPlayerIndex];
        await this.notifyAllCurrentPlayerMovePending(player);
        if (player.isAi === true) {
            // Add delay for AIs so the gameplay feels a little more natural
            let gameMgr = this;
            setTimeout(function() {
                let playedCards = gameMgr.getPlayedCards();
                let nextCard = gameMgr.tutorialManager ? gameMgr.tutorialManager.playNextAiCard(player)
                                                       : player.aiPlayCard(playedCards, gameMgr.trumpCard);
                gameMgr.playCard(player, nextCard);
            }, 500);
        }
        else {
            if (this.tutorialManager) {
                this.tutorialManager.enableCardsForPlay(player.cards);
            }
            else if (this.disableReneging) {
                let playedCards = this.getPlayedCards();
                this.getGameLogicModule().updatePlayerCardsEnabledState(playedCards, player.cards, this.trumpCard);
            }
            await this.notifyOnePlayerMoveRequested(player);
        }
    }

    getPlayedCards() {
        return this.roundPlayerAndCards.map(pAC => pAC.card);
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
        await this.notifyOnePlayerFunc(p.id, data);
    }

    resetDeckIfNeeded() {
        let numCardsNeeded = (this.players.length * 5) + 1;
        if (this.deck.cards.length < numCardsNeeded) {
            this.deck = new (this.getDeckModule()).Deck();
        }

        if (this.tutorialManager) {
            this.tutorialManager.sortDeckIfNeeded(this.deck.cards);
        }
    }

    mustDealNewCards() {
        var needMoreCards = true;
        for (var i = 0; i < this.players.length; i++) {
            if (this.players[i].cards.length > 0) {
                needMoreCards = false;
                break;
            }
        }
        return needMoreCards;
    }

    rotateDealer() {
        if (this.tutorialManager) {
            dealerIndex = this.tutorialManager.getDealerIndex(this.getSelfPlayerIndex());
        }
        else {
            var dealerIndex = this.players.findIndex(p => p.isDealer == true);
            if (dealerIndex == -1) {
                dealerIndex = this.players.length - 2;
            } else {
                this.players[dealerIndex].isDealer = false;
            }
            
            dealerIndex = (dealerIndex + 1) % this.players.length;
        }
        this.players[dealerIndex].isDealer = true;
    }

    hack_dealAllPlayerCards(player) {
        if (player.isAi) {
            return this.drawCards(5);
        }
        else {
            let myAce = this.deck.cards.findIndex(function (c) { return isAceCard(c); });
            var cards = [];
            cards.push(this.deck.cards[myAce]);
            let others = this.drawCards(4);
            for (let c of others) {
                cards.push(c);
            }
            return cards;
        }
    }

    dealAllPlayerCards() {
        let gameMgr = this;
        this.players.forEach(function(player) {
            player.cards = gameMgr.drawCards(5);
        });
    }

    drawCard() {
        return this.deck.cards.pop();
    }

    drawCards(num) {
        var cards = [];
        for (var i = 0; i < num; i++) {
            cards.push(this.drawCard());
        }
        return cards;
    }

    playCardWithId(userId, cardDetails) {
        let player = this.findPlayerById(userId);
        if (!player) {
            // do something
            console.log(userId);
            return;
        }
        let playedCard = player.playCard(cardDetails.cardName);
        if (playedCard) {
            this.playCard(player, playedCard);
        }
    }

    async playCard(player, playedCard) {
        let currentMove = { "player": player, "card": playedCard };
        this.roundPlayerAndCards.push(currentMove);
        let isNewWinningCard = this.updateCurrentWinningCard(currentMove);
        await this.notifyAllCardPlayed(player, playedCard, isNewWinningCard);

        await this.notifyOneCardsUpdated(player);

        this.currentPlayerIndex++; // if it's ==
        if (this.currentPlayerIndex == this.players.length) {
            let gameMgr = this;
            setTimeout(function() { gameMgr.evaluateRoundEnd(); }, 1000);
        }
        else {
            await this.requestNextPlayerMove();
        }
    }

    markAllPlayersWaitingForNextRound() {
        for (var player of this.players) {
            if (!player.isAi) {
                player.isReadyForNextRound = false;
            }
            else {
                // AIs are always "ready"
                player.isReadyForNextRound = true;
            }
        }
    }

    async notifyAllTutorialRoundEnded(continueFunc) {
        let data = {
            type: "tutorialRoundEnded",
            continueFunc: continueFunc
        };
        await this.notifyAllPlayers(data);
    }

    async evaluateRoundEnd() {
        let playedCards = this.getPlayedCards();
        let winningCard = this.getGameLogicModule().getWinningCard(this.trumpCard, playedCards);
        let winningPlayer = this.roundPlayerAndCards.find(pAC => pAC.card == winningCard).player;
        let winningPlayerId = winningPlayer.id;

        this.players.find(p => p.id == winningPlayerId).score += 5;

        var winnerWithHighestScore = this.players[0];
        this.players.map(function(p) {
            if (p.score > winnerWithHighestScore.score) {
                winnerWithHighestScore = p;
            }
        });

        let continueFunc = async function() {
            let orderedPlayers = this.getSortedListOfPlayers();
            if (winnerWithHighestScore.score >= 25) {
                await this.notifyAllRoundFinished(orderedPlayers, "gameFinished");
                await this.moveToState(GameState.gameFinished);
            }
            else if (this.mustDealNewCards()) {
                this.markAllPlayersWaitingForNextRound();
                await this.notifyAllRoundFinished(orderedPlayers, "roundFinished");
                await this.moveToState(GameState.waitingToDealNewCards);
            }
            else {
                await this.notifyAllRoundFinished(orderedPlayers, "scoresUpdated");
                await this.startNextRound(winningPlayerId);
            }
        }

        if (this.tutorialManager) {
            await notifyAllTutorialRoundEnded(continueFunc);
        }
        else {
            await continueFunc();
        }
    }

    getSortedListOfPlayers() {
        let playersCopy = [...this.players];
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

    async startNextRound(startingPlayerId) {
        this.currentPlayerIndex = 0;
        this.rotatePlayersArray(startingPlayerId);
        await this.startRound();
    }

    rotatePlayersArray(lastRoundWinningPlayerId) {
        let playersCopy = [...this.players];
        let winningPlayerIndex = playersCopy.findIndex(p => p.id == lastRoundWinningPlayerId);
        var firstHalf = playersCopy.slice(winningPlayerIndex, playersCopy.length);
        let secondHalf = playersCopy.slice(0, winningPlayerIndex);
        this.players = firstHalf.concat(secondHalf);
    }

    async notifyAllRoundFinished(orderedPlayers, eventType) {
        let data = {
            type: eventType,
            gameId: this.gameId,
            orderedPlayers: orderedPlayers
        }
        await this.notifyAllPlayers(data);
    }

    updateCurrentWinningCard(currentMove) {
        let gameLogic = this.getGameLogicModule();
        let currentWinningCard = gameLogic.getWinningCard(this.trumpCard, this.getPlayedCards());
        if (!this.currentWinningPlayerAndCard.card || !gameLogic.isSameCard(this.currentWinningPlayerAndCard.card, currentWinningCard)) { // is new card
            this.currentWinningPlayerAndCard = currentMove;
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
        await this.notifyOnePlayerFunc(player.id, data);
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
        for (let player of this.players) {
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
            this.startNextRound();// fix me
        }
        else {
            let readyPlayers = this.players.filter((p) => p.isReadyForNextRound == true);
            let readyPlayerIds = readyPlayers.map((p) => p.id);
            await this.notifyAllPlayerReadyForNextRoundChanged(readyPlayerIds);
        }
    }

    findPlayerById(playerId) {
        let playerIndex = this.players.findIndex(function(p) { return p.id == playerId; });
        if (playerIndex > -1) {
            return this.players[playerIndex];
        }
        return null;
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