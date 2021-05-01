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

function getPlayerModule() {
    if (typeof module !== 'undefined' && module.exports != null) {
        let m = require("./player");
        return m;
    }
    else {
        return window.playerModule;
    }
}

function getDeckModule() {
    if (typeof module !== 'undefined' && module.exports != null) {
        let m = require("./deck");
        return m;
    }
    else {
        return window.deck;
    }
}

function getTrumpCardModule() {
    if (typeof module !== 'undefined' && module.exports != null) {
        let m = require("./trumpCard");
        return m;
    }
    else {
        return window.trumpCard;
    }
}

function getGameLogicModule() {
    if (typeof module !== 'undefined' && module.exports != null) {
        let m = require("./gameLogic");
        return m;
    }
    else {
        return window.gameLogic;
    }
}

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

var aiPlayerNum = 1;
function buildAiPlayer() {
    var p = new (getPlayerModule()).Player("AI_Player" + aiPlayerNum);
    p.isAi = true;
    aiPlayerNum++;
    return p;
}

class Game {
    constructor(id, numberOfPlayers, notifyOnePlayerFunc, notifyStateChangeFunc) {
        this.id = id;
        this.numberOfPlayers = numberOfPlayers;
        this.notifyOnePlayerFunc = notifyOnePlayerFunc;
        this.players = [];
        this.deck = new (getDeckModule()).Deck();
        this.trumpCard = new (getTrumpCardModule()).TrumpCard();
        this.roundPlayerAndCards = [];
        this.currentPlayerIndex = 0;
        this.currentWinningPlayerAndCard = {};
        this.currentState = GameState.notStarted;
        this.notifyStateChangeFunc = notifyStateChangeFunc;
    }

    init() {
        this.moveToState(GameState.waitingForPlayers);
    }

    moveToState(newState) {
        if (this.currentState != newState) {
            this.currentState = newState;
            if (this.notifyStateChangeFunc) {
                this.notifyStateChangeFunc(this.currentState);
            }
        }
    }

    notifyIfReadyToPlay() {
        if (this.players.length == this.numberOfPlayers) {
            this.moveToState(GameState.readyToPlay);
        }
    }

    addPlayer(player, notify = true) {
        this.players.push(player);
        if (notify) {
            this.notifyPlayersListChanged();
        }
        this.notifyIfReadyToPlay();
    }

    removePlayer(player) {
        let playerIndex = this.players.findIndex((p) => p.id == player.id);
        if (playerIndex == -1) {
            // log error?
            return;
        }

        this.players.splice(playerIndex, 1);
        this.notifyPlayersListChanged();
        this.notifyIfReadyToPlay();
    }

    fillWithAis() {
        let numAiPlayersNeeded = this.numberOfPlayers - this.players.length;
        for (var i = 0; i < numAiPlayersNeeded; i++) {
            this.addPlayer(buildAiPlayer(), i == (numAiPlayersNeeded - 1)); // only notify once
        }
    }

    notifyPlayersListChanged() {
        let playersDetails = buildPlayerDetailsJson(this.players);
        let data = {
            type: "playerListChanged",
            playersDetails: playersDetails,
            needMorePlayers: this.needsMorePlayers()
        }
        this.notifyAllPlayers(data);
    }

    notifyAllPlayers(data) {
        for (var i = 0; i < this.players.length; i++) {
            let p = this.players[i];
            if (p.isAi === false) {
                this.notifyOnePlayerFunc(p.id, data);
            }
        }
    }

    needsMorePlayers() {
        return this.numberOfPlayers != this.players.length;
    }

    robCard(player, droppedCardName) {
        player.playCard(droppedCardName);
        player.cards.push(this.trumpCard.card);
        this.trumpCard.steal(player);

        this.startRound();
    }

    playerCanRobTrumpCard(player) {
        return getGameLogicModule().canTrumpCardBeRobbed(player.cards, player.isDealer, this.trumpCard);
    }

    aiAttemptRob(player) {
        let canRob = this.playerCanRobTrumpCard(player);
        if (canRob === false) {
            return;
        }

        let willRob = player.aiWillRobCard();
        if (willRob === false) {
            return;
        }

        this.robCard(player, player.aiSelectCardToDropForRob(this.trumpCard));
    }

    shouldNotifyPlayerForRobbing(player) {
        if (player.isAi) {
            this.aiAttemptRob(player);
        }
        else if (this.playerCanRobTrumpCard(player)) {
            return true;
        }
        return false;
    }

    notifyOnePlayerRobTrumpCardAvailable(p) {
        let data = {
            type: "robTrumpCardAvailable",
            userId: p.id,
            trumpCard: this.trumpCard
        }
        this.notifyOnePlayerFunc(p.id, data);
    }

    checkIfAnyPlayerCanRobAndNotify() {
        // sequence is explained in the rules

        // first check dealer
        let dealerIndex = this.players.findIndex(p => p.isDealer === true);
        let dealer = this.players[dealerIndex];
        let dealerNeedsNotification = this.shouldNotifyPlayerForRobbing(dealer);
        if (dealerNeedsNotification) {
            this.notifyOnePlayerRobTrumpCardAvailable(dealer);
            return true;
        }

        // then cycle through other players
        for (let player of this.players) {
            if (player.isDealer) {
                continue; // already handled above
            }

            let playerNeedsNotification = this.shouldNotifyPlayerForRobbing(player);
            if (playerNeedsNotification) {
                this.notifyOnePlayerRobTrumpCardAvailable(player);
                return true;
            }
        }

        return false;
    }

    start() {
        this.players.sort(function() {
            return .5 - Math.random();
        });
        this.startRound();
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

    startRound() {
        this.moveToState(GameState.inProgress);
        this.resetDeckIfNeeded();
        this.roundPlayerAndCards = [];
        if (this.mustDealNewCards()) {
            this.rotateDealer();
            this.dealAllPlayerCards();
            this.trumpCard = new (getTrumpCardModule()).TrumpCard();
            this.trumpCard.card = this.drawCard();
            
            this.notifyAllGameInitialState();
            
            let trumpCardCanBeRobbed = this.checkIfAnyPlayerCanRobAndNotify();
            if (trumpCardCanBeRobbed) {
                // waiting for the player who can rob to do something
                // the resulting player actions will handle starting the round
                this.moveToState(GameState.waitingForPlayerToRobTrumpCard);
                return;
            }
        }

        this.notifyAllGameInitialState();

        this.requestNextPlayerMove();
    }

    notifyAllGameInitialState() {
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
                this.notifyOnePlayerFunc(p.id, data);
            }
        }
    }

    requestNextPlayerMove() {
        let player = this.players[this.currentPlayerIndex];
        this.notifyAllCurrentPlayerMovePending(player);
        if (player.isAi === true) {
            // Add delay for AIs so the gameplay feels a little more natural
            let gameMgr = this;
            setTimeout(function() {
                let playedCards = gameMgr.getPlayedCards();
                gameMgr.playCard(player, player.aiPlayCard(playedCards, gameMgr.trumpCard));
            }, 500);
        }
        else {
            this.notifyOnePlayerMoveRequested(player);
        }
    }

    getPlayedCards() {
        return this.roundPlayerAndCards.map(pAC => pAC.card);
    }

    notifyAllCurrentPlayerMovePending(player) {
        let data = {
            type: "currentPlayerMovePending",
            userId: player.id
        }
        this.notifyAllPlayers(data);
    }

    notifyOnePlayerMoveRequested(p) {
        let data = {
            type: "playerMoveRequested",
            userId: p.id
        }
        this.notifyOnePlayerFunc(p.id, data);
    }

    resetDeckIfNeeded() {
        let numCardsNeeded = (this.players.length * 5) + 1;
        if (this.deck.cards.length < numCardsNeeded) {
            this.deck = new (getDeckModule()).Deck();
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
        var dealerIndex = this.players.findIndex(p => p.isDealer == true);
        if (dealerIndex == -1) {
            dealerIndex = this.players.length - 2;
        } else {
            this.players[dealerIndex].isDealer = false;
        }

        dealerIndex = (dealerIndex + 1) % this.players.length;
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

    playCard(player, playedCard) {
        let currentMove = { "player": player, "card": playedCard };
        this.roundPlayerAndCards.push(currentMove);
        let isNewWinningCard = this.updateCurrentWinningCard(currentMove);
        this.notifyAllCardPlayed(player, playedCard, isNewWinningCard);

        this.notifyOneCardsUpdated(player);

        this.currentPlayerIndex++; // if it's ==
        if (this.currentPlayerIndex == this.players.length) {
            let gameMgr = this;
            setTimeout(function() { gameMgr.evaluateRoundEnd(); }, 1000);
        }
        else {
            this.requestNextPlayerMove();
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

    evaluateRoundEnd() {
        let playedCards = this.getPlayedCards();
        let winningCard = getGameLogicModule().getWinningCard(this.trumpCard, playedCards);
        let winningPlayer = this.roundPlayerAndCards.find(pAC => pAC.card == winningCard).player;
        let winningPlayerId = winningPlayer.id;

        this.players.find(p => p.id == winningPlayerId).score += 5;

        var winnerWithHighestScore = this.players[0];
        this.players.map(function(p) {
            if (p.score > winnerWithHighestScore.score) {
                winnerWithHighestScore = p;
            }
        });

        
        let orderedPlayers = this.getSortedListOfPlayers();
        if (winnerWithHighestScore.score >= 25) {
            this.notifyAllRoundFinished(orderedPlayers, "gameFinished");
            this.moveToState(GameState.gameFinished);
        }
        else if (this.mustDealNewCards()) {
            this.markAllPlayersWaitingForNextRound();
            this.notifyAllRoundFinished(orderedPlayers, "roundFinished");
            this.moveToState(GameState.waitingToDealNewCards);
        }
        else {
            this.notifyAllRoundFinished(orderedPlayers, "scoresUpdated");
            this.startNextRound(winningPlayerId);
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

    startNextRound(startingPlayerId) {
        this.currentPlayerIndex = 0;
        this.rotatePlayersArray(startingPlayerId);
        this.startRound();
    }

    rotatePlayersArray(lastRoundWinningPlayerId) {
        let playersCopy = [...this.players];
        let winningPlayerIndex = playersCopy.findIndex(p => p.id == lastRoundWinningPlayerId);
        var firstHalf = playersCopy.slice(winningPlayerIndex, playersCopy.length);
        let secondHalf = playersCopy.slice(0, winningPlayerIndex);
        this.players = firstHalf.concat(secondHalf);
    }

    notifyAllRoundFinished(orderedPlayers, eventType) {
        let data = {
            type: eventType,
            gameId: this.gameId,
            orderedPlayers: orderedPlayers
        }
        this.notifyAllPlayers(data);
    }

    updateCurrentWinningCard(currentMove) {
        let gameLogic = getGameLogicModule();
        let currentWinningCard = gameLogic.getWinningCard(this.trumpCard, this.getPlayedCards());
        if (!this.currentWinningPlayerAndCard.card || !gameLogic.isSameCard(this.currentWinningPlayerAndCard.card, currentWinningCard)) { // is new card
            this.currentWinningPlayerAndCard = currentMove;
            return true;
        }
        return false;
    }

    notifyAllCardPlayed(player, playedCard, isNewWinningCard) {
        let data = {
            type: "cardPlayed",
            userId: player.id,
            playedCard: playedCard,
            isNewWinningCard: isNewWinningCard
        }
        this.notifyAllPlayers(data);
    }

    notifyOneCardsUpdated(player) {
        let data = {
            type: "cardsUpdated",
            userId: player.id,
            cards: player.cards
        }
        this.notifyOnePlayerFunc(player.id, data);
    }
    
    robTrumpCard(userId, droppedCardDetails) {
        let player = this.findPlayerById(userId);
        if (!player) {
            // TODO do something
            return
        }

        let droppedCardName = droppedCardDetails.cardName;
        this.robCard(player, droppedCardName);
    }

    skipRobTrumpCard(userId) {
        let player = this.findPlayerById(userId);
        if (!player) {
            // TODO do something
            return
        }
        this.startRound();
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

    markPlayerReadyForNextRound(userId) {
        let player = this.findPlayerById(userId);
        if (!player) {
            // TODO do something
            return
        }

        player.isReadyForNextRound = true;

        if (this.allPlayersReadyForNextRound()) {
            this.startNextRound();
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