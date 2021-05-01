"use strict";

function getPlayerModule() {
    if (typeof module !== 'undefined' && module.exports != null) {
        let playerModule = require("./player");
        return playerModule;
    }
    else {
        return window.playerModule;
    }
}

const CardSuits = Object.freeze({
    hearts: 0,
    diamonds: 1,
    clubs: 2,
    spades: 3
});

const CardValues = Object.freeze({
    ace : 1,
    two : 2,
    three : 3,
    four : 4,
    five : 5,
    six : 6,
    seven : 7,
    eight : 8,
    nine : 9,
    ten : 10,
    jack : 11,
    queen : 12,
    king : 13,
});

function convertSuitName(s) {
    switch(s) {
        case CardSuits.hearts: return "hearts";
        case CardSuits.diamonds: return "diamonds";
        case CardSuits.clubs: return "clubs";
        case CardSuits.spades: return "spades";
    }
    return "hearts";
}

function convertValueName(v) {
    switch(v) {
        case CardValues.ace: return "ace";
        case CardValues.jack: return "jack";
        case CardValues.queen: return "queen";
        case CardValues.king: return "king";
        default: return String(v);
    }
}

function buildCardName(s, v) {
    return convertValueName(v) + "_of_" + convertSuitName(s);
}

function buildCardUrl(cardName) {
    return "resources/images/Cards/" + cardName + ".svg";
}

class Card {
    constructor(suit, value) {
        this.suit = suit;
        this.value = value;
        this.cardName = buildCardName(suit, value);
        this.url = buildCardUrl(this.cardName);
        this.canPlay = true;
    }
}

function buildDeck() {
    var cards = [];
    for (let [_, s] of Object.entries(CardSuits)) {
        for (let [_1, v] of Object.entries(CardValues)) {
            cards.push(new Card(s, v));
        }
    }
    return cards;
}

class Deck {
    constructor() {
        this.cards = buildDeck();
        Deck.shuffleDeck(this.cards);
    }

    static shuffleDeck(cards) {
        cards.sort(function() {
            return .5 - Math.random();
        });
    }
}

class TrumpCard {
    constructor() {
        this.card = new Card();
        this.hasBeenStolen = false;
        this.stolenBy = {};
    }
    
    steal(player) {
        this.hasBeenStolen = true;
        this.stolenBy = player
    }
}

const RedNormalCardsRanking = Object.freeze([
    CardValues.ace,
    CardValues.two,
    CardValues.three,
    CardValues.four,
    CardValues.five,
    CardValues.six,
    CardValues.seven,
    CardValues.eight,
    CardValues.nine,
    CardValues.ten,
    CardValues.jack,
    CardValues.queen,
    CardValues.king
]);

const BlackNormalCardsRanking = Object.freeze([
    CardValues.ten,
    CardValues.nine,
    CardValues.eight,
    CardValues.seven,
    CardValues.six,
    CardValues.five,
    CardValues.four,
    CardValues.three,
    CardValues.two,
    CardValues.ace,
    CardValues.jack,
    CardValues.queen,
    CardValues.king
]);

function isRedCard(c) {
    return c.suit == CardSuits.hearts || c.suit == CardSuits.diamonds;
}

function isTrumpSuit(cardA, trumpCard) {
    return cardA.suit == trumpCard.card.suit;
}

function isAceCard(cardA) {
    return cardA.value == CardValues.ace;
}

function isAceOfHearts(cardA) {
    return cardA.suit == CardSuits.hearts && isAceCard(cardA);
}

function isFiveOfTrumps(cardA, trumpCard) {
    return isTrumpSuit(cardA, trumpCard) && cardA.value == CardValues.five;
}

function isJackOfTrumps(cardA, trumpCard) {
    return isTrumpSuit(cardA, trumpCard) && cardA.value == CardValues.jack;
}

function isAceOfTrumps(cardA, trumpCard) {
    return isTrumpSuit(cardA, trumpCard) && isAceCard(cardA);
}

function isTrumpCard(cardA, trumpCard) {
    return isTrumpSuit(cardA, trumpCard) || isAceOfHearts(cardA);
}

function compareNormalCards(cardA, cardB) {
    var orderedCards = [];
    if (isRedCard(cardA)) {
        orderedCards = RedNormalCardsRanking;
    } else {
        orderedCards = BlackNormalCardsRanking;
    }

    let cardAIdx = orderedCards.indexOf(cardA.value);
    let cardBIdx = orderedCards.indexOf(cardB.value);

    return cardAIdx > cardBIdx ? cardA : cardB;
}

function compareTrumpCards(cardA, cardB, trumpCard) {
    if (isFiveOfTrumps(cardA, trumpCard)) {
        return cardA;
    }
    if (isFiveOfTrumps(cardB, trumpCard)) {
        return cardB;
    }

    if (isJackOfTrumps(cardA, trumpCard)) {
        return cardA;
    }
    if (isJackOfTrumps(cardB, trumpCard)) {
        return cardB;
    }

    if (isAceOfHearts(cardA)) {
        return cardA;
    }
    if (isAceOfHearts(cardB)) {
        return cardB;
    }
    
    if (isAceOfTrumps(cardA, trumpCard)) {
        return cardA;
    }
    if (isAceOfTrumps(cardB, trumpCard)) {
        return cardB;
    }

    return compareNormalCards(cardA, cardB);
}

function compareCards(cardA, cardB, trumpCard) {
    let cardATrump = isTrumpCard(cardA, trumpCard);
    let cardBTrump = isTrumpCard(cardB, trumpCard);

    if (cardATrump && !cardBTrump) {
        return cardA;
    }  else if (!cardATrump && cardBTrump) {
        return cardB;
    } else if (cardA.suit != cardB.suit && !cardATrump && !cardBTrump) {
        return cardA;
    }

    if (cardATrump) {
        return compareTrumpCards(cardA, cardB, trumpCard);
    }

    return compareNormalCards(cardA, cardB);
}


function getBestCardFromOptions(cardOptions, trumpCard, playedCards) {
    if (cardOptions.length == 0) {
        return {};
    }
    if (cardOptions.length == 1) {
        return cardOptions[0];
    }

    if (playedCards.length == 0) {
        return cardOptions[0];
    }

    let firstCardSuit = playedCards[0].suit;
    let optionWithFirstCardSuit = cardOptions.find(c => c.suit == firstCardSuit);
    if (optionWithFirstCardSuit) {
        return optionWithFirstCardSuit;
    }
    
    let trumpCardSuit = trumpCard.card.suit;
    let optionWithTrumpCardSuit = cardOptions.find(c => c.suit == trumpCardSuit);
    if (optionWithTrumpCardSuit) {
        return optionWithTrumpCardSuit;
    }

    return cardOptions[0];
}

function getWinningCard(trumpCard, playedCards) {
    if (playedCards.length == 0) {
        return {};
    }
    if (playedCards.length == 1) {
        return playedCards[0];
    }

    var currentWinningCard = playedCards[0];

    for (var i = 1; i < playedCards.length; i++) {
        let betterMove = compareCards(currentWinningCard, playedCards[i], trumpCard);
        if (currentWinningCard.suit != betterMove.suit || currentWinningCard.value != betterMove.value) {
            currentWinningCard = betterMove;
        }
    }

    return currentWinningCard;
}

function canTrumpCardBeRobbed(playerHand, playerIsDealer, trumpCard) {
    let trumpCardIsAce = isAceCard(trumpCard.card);
    if (trumpCardIsAce && playerIsDealer) {
        return true;
    }

    for (let card of playerHand) {
        if (isAceOfTrumps(card, trumpCard)) {
            return true;
        }
    }

    return false;
}

function updatePlayerCardsEnabledState(playedCards, cards, trumpCard) {
    if (playedCards.length === 0) {
        for (var card of cards) {
            card.canPlay = true;
        }
        return;
    }

    let firstCard = playedCards[0];
    var canPlayAtLeastOneCard = false;
    for (var card of cards) {
        card.canPlay = (card.suit === firstCard.suit || card.suit === trumpCard.card.suit);
        if (card.canPlay === true) {
            canPlayAtLeastOneCard = true;
        }
    }

    if (canPlayAtLeastOneCard === false) {
        for (var card of cards) {
            card.canPlay = true;
        }
    }
}

function isSameCard(a, b) {
    return a.suit === b.suit && a.value === b.value;
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
    let playerModule = getPlayerModule();
    var p = new playerModule.Player("AI_Player" + aiPlayerNum);
    p.isAi = true;
    aiPlayerNum++;
    return p;
}

class Game {
    constructor(id, numberOfPlayers, notifyOnePlayerFunc) {
        this.id = id;
        this.numberOfPlayers = numberOfPlayers;
        this.notifyOnePlayerFunc = notifyOnePlayerFunc;
        this.players = [];
        this.deck = new Deck();
        this.trumpCard = new TrumpCard();
        this.roundPlayerAndCards = [];
        this.currentPlayerIndex = 0;
        this.currentWinningPlayerAndCard = {};
    }

    addPlayer(player, notify = true) {
        this.players.push(player);
        if (notify) {
            this.notifyPlayersListChanged();
        }
    }

    removePlayer(player) {
        // TODO - remove player from list
        this.notifyPlayersListChanged();
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
        return canTrumpCardBeRobbed(player.cards, player.isDealer, this.trumpCard);
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
        this.resetDeckIfNeeded();
        this.roundPlayerAndCards = [];
        if (this.mustDealNewCards()) {
            this.rotateDealer();
            this.dealAllPlayerCards();
            this.trumpCard = new TrumpCard();
            this.trumpCard.card = this.drawCard();

            this.notifyAllGameInitialState();

            let trumpCardCanBeRobbed = this.checkIfAnyPlayerCanRobAndNotify();
            if (trumpCardCanBeRobbed) {
                // waiting for the player who can rob to do something
                // the resulting player actions will handle starting the round
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
            this.deck = new Deck();
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

    evaluateRoundEnd() {
        let playedCards = this.getPlayedCards();
        let winningCard = getWinningCard(this.trumpCard, playedCards);
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
        }
        else if (this.mustDealNewCards()) {
            this.notifyAllRoundFinished(orderedPlayers, "roundFinished");
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
        let currentWinningCard = getWinningCard(this.trumpCard, this.getPlayedCards());
        if (!this.currentWinningPlayerAndCard.card || !isSameCard(this.currentWinningPlayerAndCard.card, currentWinningCard)) { // is new card
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
        // TODO
        let player = this.findPlayerById(userId);
        if (!player) {
            // do something
            return
        }

        let droppedCardName = droppedCardDetails.cardName;
        this.robCard(player, droppedCardName);
    }

    skipRobTrumpCard(userId) {
        // TODO validation??
        this.startRound();
    }

    markPlayerReadyForNextRound(userId) {
        // TODO - put in some logic here to make sure all players are ready
        // before starting next round

        // for now just go straight through
        this.startNextRound();
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
    let gameLogicExports = {};
    gameLogicExports.getBestCardFromOptions = getBestCardFromOptions;
    gameLogicExports.getWinningCard = getWinningCard;
    gameLogicExports.canTrumpCardBeRobbed = canTrumpCardBeRobbed;
    gameLogicExports.updatePlayerCardsEnabledState = updatePlayerCardsEnabledState;
    gameLogicExports.isAceOfTrumps = isAceOfTrumps;
    gameLogicExports.isSameCard = isSameCard;
    gameLogicExports.CardSuits = CardSuits;
    gameLogicExports.CardValues = CardValues;
    gameLogicExports.Card = Card;
    gameLogicExports.Deck = Deck;
    gameLogicExports.TrumpCard = TrumpCard;
    gameLogicExports.Game = Game;
    
    if (typeof module !== 'undefined' && module.exports != null) {
        module.exports = gameLogicExports;
    } else {
        window.gameLogic = gameLogicExports;
    }
})();