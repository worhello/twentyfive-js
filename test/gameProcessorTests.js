"use strict";

let tf = require('..');

let assert = require('assert');
let sinon = require('sinon');

let testHelpers = require('./testHelpers');

let gameProcessorTests_gameId = "myId";
var gameProcessorTests_selfPlayerId = "";

function checkPlayerListChangedEvent(data, expectedNeedsMorePlayers, expectedNumberOfPlayers) {
    assert.strictEqual(data.playerId, gameProcessorTests_selfPlayerId);
    let eventData = data.data;
    assert.strictEqual(eventData.type, "playerListChanged");
    assert.strictEqual(eventData.gameId, gameProcessorTests_gameId);
    assert.strictEqual(eventData.needMorePlayers, expectedNeedsMorePlayers);
    assert.strictEqual(eventData.playersDetails.length, expectedNumberOfPlayers);
}

function checkInitialStateEvent(data, trumpCardData) {
    assert.strictEqual(data.playerId, gameProcessorTests_selfPlayerId);
    let eventData = data.data;
    assert.strictEqual(eventData.type, "gameInitialState");
    assert.strictEqual(eventData.gameId, gameProcessorTests_gameId);
    testHelpers.assertCardsEqual(eventData.gameInfo.trumpCard.card, trumpCardData);
    assert.strictEqual(eventData.playerDetails.userId, gameProcessorTests_selfPlayerId);
}

function checkCurrentPlayerMovePendingEvent(data, isSelfPlayer) {
    assert.strictEqual(data.playerId, gameProcessorTests_selfPlayerId);
    let eventData = data.data;
    assert.strictEqual(eventData.type, "currentPlayerMovePending");
    assert.strictEqual(eventData.gameId, gameProcessorTests_gameId);
    assert.strictEqual(eventData.userId == gameProcessorTests_selfPlayerId, isSelfPlayer);
}

function checkCardPlayedEvent(data, expectedIsNewWinningCard) {
    assert.strictEqual(data.playerId, gameProcessorTests_selfPlayerId);
    let eventData = data.data;
    assert.strictEqual(eventData.type, "cardPlayed");
    assert.strictEqual(eventData.gameId, gameProcessorTests_gameId);
    assert.strictEqual(eventData.isNewWinningCard, expectedIsNewWinningCard);
}

function checkPlayerMoveRequestedEvent(data) {
    assert.strictEqual(data.playerId, gameProcessorTests_selfPlayerId);
    let eventData = data.data;
    assert.strictEqual(eventData.type, "playerMoveRequested");
    assert.strictEqual(eventData.gameId, gameProcessorTests_gameId);
    assert.strictEqual(eventData.userId, gameProcessorTests_selfPlayerId);
}

function checkCardsUpdatedEvent(data, numCardsAfterUpdate) {
    assert.strictEqual(data.playerId, gameProcessorTests_selfPlayerId);
    let eventData = data.data;
    assert.strictEqual(eventData.type, "cardsUpdated");
    assert.strictEqual(eventData.gameId, gameProcessorTests_gameId);
    assert.strictEqual(eventData.cards.length, numCardsAfterUpdate);
    assert.strictEqual(eventData.cards.every((card) => card.canPlay), true);
}

function checkScoresUpdatedEvent(data) {
    assert.strictEqual(data.playerId, gameProcessorTests_selfPlayerId);
    let eventData = data.data;
    assert.strictEqual(eventData.type, "scoresUpdated");
    assert.strictEqual(eventData.gameId, gameProcessorTests_gameId);
    assert.strictEqual(eventData.orderedPlayers.length, 2);
    assert.strictEqual(eventData.orderedPlayers[0].score < 25, true);
    assert.strictEqual(eventData.orderedPlayers[1].score < 25, true);
}

function checkRoundFinishedEvent(data) {
    assert.strictEqual(data.playerId, gameProcessorTests_selfPlayerId);
    let eventData = data.data;
    assert.strictEqual(eventData.type, "roundFinished");
    assert.strictEqual(eventData.gameId, gameProcessorTests_gameId);
    assert.strictEqual(eventData.orderedPlayers.length, 2);
    assert.strictEqual(eventData.orderedPlayers[0].id, gameProcessorTests_selfPlayerId);
    assert.strictEqual(eventData.orderedPlayers[0].score < 25, true);
    assert.notStrictEqual(eventData.orderedPlayers[1].id, gameProcessorTests_selfPlayerId);
    assert.strictEqual(eventData.orderedPlayers[1].score < 25, true);
}

function checkGameFinishedEvent(data) {
    assert.strictEqual(data.playerId, gameProcessorTests_selfPlayerId);
    let eventData = data.data;
    assert.strictEqual(eventData.type, "gameFinished");
    assert.strictEqual(eventData.gameId, gameProcessorTests_gameId);
    assert.strictEqual(eventData.orderedPlayers.length, 2);
    assert.strictEqual(eventData.orderedPlayers[0].id, gameProcessorTests_selfPlayerId);
    assert.strictEqual(eventData.orderedPlayers[0].score, 25);
    assert.notStrictEqual(eventData.orderedPlayers[1].id, gameProcessorTests_selfPlayerId);
    assert.strictEqual(eventData.orderedPlayers[1].score < 25, true);
}

describe('GameProcessor Tests', function() {
    var shuffleStub = sinon.stub(tf.Helpers, 'shuffle');
    shuffleStub.callsFake(function(things) {}); //no-op

    let id = gameProcessorTests_gameId;
    let numberOfPlayers = 2;
    let renegingDisabled = false;
    let game = new tf.Game(id, numberOfPlayers, renegingDisabled);

    let selfPlayer = new tf.Player("Me");
    gameProcessorTests_selfPlayerId = selfPlayer.id;

    var trumpCard = { suit: tf.CardSuits.spades, value: tf.CardValues.three };

    it ('shuffle stub is working', function() {
        testHelpers.assertCardsEqual(game.deck.cards[0], { suit: tf.CardSuits.hearts, value: tf.CardValues.ace });
        testHelpers.assertCardsEqual(game.deck.cards[1], { suit: tf.CardSuits.hearts, value: tf.CardValues.two });
        testHelpers.assertCardsEqual(game.deck.cards[2], { suit: tf.CardSuits.hearts, value: tf.CardValues.three });

        testHelpers.assertCardsEqual(game.deck.cards[49], { suit: tf.CardSuits.spades, value: tf.CardValues.jack });
        testHelpers.assertCardsEqual(game.deck.cards[50], { suit: tf.CardSuits.spades, value: tf.CardValues.queen });
        testHelpers.assertCardsEqual(game.deck.cards[51], { suit: tf.CardSuits.spades, value: tf.CardValues.king });
    });

    var notifyPlayerCallbacks = [];
    let notifyPlayerFunc = async function(playerId, data) {
        notifyPlayerCallbacks.push({ playerId: playerId, data: data }); 
    };
    var notifyStateChangedCallbacks = [];
    let notifyStateChangedFunc = async function(state) { notifyStateChangedCallbacks.push(state); };
    var notifyGameChangedCallbacks = [];
    var notifyGameChangedFunc = async function(g) { notifyGameChangedCallbacks.push(g); };

    let checkNumCallbacks = function(numPlayerCbs, numStateChangedCbs, numGameChangedCbs) {
        assert.strictEqual(notifyPlayerCallbacks.length, numPlayerCbs);
        assert.strictEqual(notifyStateChangedCallbacks.length, numStateChangedCbs);
        assert.strictEqual(notifyGameChangedCallbacks.length, numGameChangedCbs);
    };

    let gameProcessor = new tf.GameProcessor(game, notifyPlayerFunc, notifyStateChangedFunc, notifyGameChangedFunc);

    let playerActionFunc_selfPlayerWins_selfPlayerFirst = async function(expectedNumCards) {
        assert.strictEqual(selfPlayer.cards.length, expectedNumCards);
        await gameProcessor.playCardWithId(gameProcessorTests_selfPlayerId, { cardName: selfPlayer.cards[0].cardName });
        checkNumCallbacks(8, 0, 0);

        checkCardPlayedEvent(notifyPlayerCallbacks[0], true);
        checkCardsUpdatedEvent(notifyPlayerCallbacks[1], expectedNumCards - 1);
        checkCurrentPlayerMovePendingEvent(notifyPlayerCallbacks[2], false);
        checkCardPlayedEvent(notifyPlayerCallbacks[3], false);
        checkScoresUpdatedEvent(notifyPlayerCallbacks[4]);

        checkInitialStateEvent(notifyPlayerCallbacks[5], trumpCard);
        checkCurrentPlayerMovePendingEvent(notifyPlayerCallbacks[6], true);
        checkPlayerMoveRequestedEvent(notifyPlayerCallbacks[7]);
        notifyPlayerCallbacks.length = 0;
        checkNumCallbacks(0, 0, 0);
    }

    let playerActionFunc_aiPlayerWins_selfPlayerFirst = async function(expectedNumCards) {
        assert.strictEqual(selfPlayer.cards.length, expectedNumCards);
        await gameProcessor.playCardWithId(gameProcessorTests_selfPlayerId, { cardName: selfPlayer.cards[0].cardName });
        checkNumCallbacks(6, 0, 0);

        checkCardPlayedEvent(notifyPlayerCallbacks[0], true);
        checkCardsUpdatedEvent(notifyPlayerCallbacks[1], expectedNumCards - 1);
        checkScoresUpdatedEvent(notifyPlayerCallbacks[2]);

        checkInitialStateEvent(notifyPlayerCallbacks[3], trumpCard);
        checkCurrentPlayerMovePendingEvent(notifyPlayerCallbacks[4], true);
        checkPlayerMoveRequestedEvent(notifyPlayerCallbacks[5]);
        notifyPlayerCallbacks.length = 0;
        checkNumCallbacks(0, 0, 0);
    }

    let playerActionFunc_aiPlayerWins_selfPlayerLast = async function(expectedNumCards) {
        assert.strictEqual(selfPlayer.cards.length, expectedNumCards);
        await gameProcessor.playCardWithId(gameProcessorTests_selfPlayerId, { cardName: selfPlayer.cards[0].cardName });
        checkNumCallbacks(8, 0, 0);

        checkCardPlayedEvent(notifyPlayerCallbacks[0], false);
        checkCardsUpdatedEvent(notifyPlayerCallbacks[1], expectedNumCards - 1);
        checkScoresUpdatedEvent(notifyPlayerCallbacks[2]);

        checkInitialStateEvent(notifyPlayerCallbacks[3], trumpCard);
        checkCurrentPlayerMovePendingEvent(notifyPlayerCallbacks[4], false);
        checkCardPlayedEvent(notifyPlayerCallbacks[5], true);
        checkCurrentPlayerMovePendingEvent(notifyPlayerCallbacks[6], true);
        checkPlayerMoveRequestedEvent(notifyPlayerCallbacks[7]);
        notifyPlayerCallbacks.length = 0;
        checkNumCallbacks(0, 0, 0);
    }

    let playerActionFunc_aiPlayerWins = async function(expectedNumCards) {
        assert.strictEqual(selfPlayer.cards.length, expectedNumCards);
        await gameProcessor.playCardWithId(gameProcessorTests_selfPlayerId, { cardName: selfPlayer.cards[0].cardName });
        checkNumCallbacks(10, 0, 0);

        checkCardPlayedEvent(notifyPlayerCallbacks[0], true);
        checkCardsUpdatedEvent(notifyPlayerCallbacks[1], expectedNumCards - 1);
        checkCurrentPlayerMovePendingEvent(notifyPlayerCallbacks[2], false);
        checkCardPlayedEvent(notifyPlayerCallbacks[3], true);
        checkScoresUpdatedEvent(notifyPlayerCallbacks[4]);

        checkInitialStateEvent(notifyPlayerCallbacks[5], trumpCard);
        checkCurrentPlayerMovePendingEvent(notifyPlayerCallbacks[6], false);
        checkCardPlayedEvent(notifyPlayerCallbacks[7], true);
        checkCurrentPlayerMovePendingEvent(notifyPlayerCallbacks[8], true);
        checkPlayerMoveRequestedEvent(notifyPlayerCallbacks[9]);
        notifyPlayerCallbacks.length = 0;
        checkNumCallbacks(0, 0, 0);
    }

    let playerActionFunc_roundFinished = async function(expectedNumCards) {
        assert.strictEqual(selfPlayer.cards.length, expectedNumCards);
        await gameProcessor.playCardWithId(gameProcessorTests_selfPlayerId, { cardName: selfPlayer.cards[0].cardName });
        checkNumCallbacks(3, 1, 0);

        checkCardPlayedEvent(notifyPlayerCallbacks[0], false);
        checkCardsUpdatedEvent(notifyPlayerCallbacks[1], expectedNumCards - 1);
        checkRoundFinishedEvent(notifyPlayerCallbacks[2]);

        assert.strictEqual(notifyStateChangedCallbacks.pop(), tf.GameState.waitingToDealNewCards);
        notifyPlayerCallbacks.length = 0;
        checkNumCallbacks(0, 0, 0);
    }

    let playerActionFunc_gameFinished_selfPlayerWins = async function(expectedNumCards) {
        assert.strictEqual(selfPlayer.cards.length, expectedNumCards);
        await gameProcessor.playCardWithId(gameProcessorTests_selfPlayerId, { cardName: selfPlayer.cards[0].cardName });
        checkNumCallbacks(5, 1, 0);

        checkCardPlayedEvent(notifyPlayerCallbacks[0], true);
        checkCardsUpdatedEvent(notifyPlayerCallbacks[1], expectedNumCards - 1);
        checkCurrentPlayerMovePendingEvent(notifyPlayerCallbacks[2], false);
        checkCardPlayedEvent(notifyPlayerCallbacks[3], false);
        checkGameFinishedEvent(notifyPlayerCallbacks[4]);

        assert.strictEqual(notifyStateChangedCallbacks.pop(), tf.GameState.gameFinished);
        notifyPlayerCallbacks.length = 0;
        checkNumCallbacks(0, 0, 0);
    }

    it("game won't start if not in right state", async function () {
        await gameProcessor.start();
        assert.strictEqual(game.currentState, tf.GameState.notStarted);
    });

    it('do game', async function() {
        await gameProcessor.init();
        assert.strictEqual(game.currentState, tf.GameState.waitingForPlayers);
        checkNumCallbacks(0, 1, 0);
        assert.strictEqual(notifyStateChangedCallbacks.pop(), tf.GameState.waitingForPlayers);
        assert.strictEqual(gameProcessor.game.players.length, 0);

        await gameProcessor.addPlayer(selfPlayer, true);
        checkNumCallbacks(1, 0, 0);
        checkPlayerListChangedEvent(notifyPlayerCallbacks.pop(), true, 1);

        await gameProcessor.fillWithAis();
        checkNumCallbacks(1, 1, 0);
        checkPlayerListChangedEvent(notifyPlayerCallbacks.pop(), false, 2);
        assert.strictEqual(notifyStateChangedCallbacks.pop(), tf.GameState.readyToPlay);
        checkNumCallbacks(0, 0, 0);

        trumpCard = { suit: tf.CardSuits.spades, value: tf.CardValues.three };
        await gameProcessor.start();
        checkNumCallbacks(3, 1, 0);
        assert.strictEqual(game.currentState, tf.GameState.inProgress);

        checkInitialStateEvent(notifyPlayerCallbacks[0], trumpCard);
        checkCurrentPlayerMovePendingEvent(notifyPlayerCallbacks[1], true);
        checkPlayerMoveRequestedEvent(notifyPlayerCallbacks[2]);
        assert.strictEqual(notifyStateChangedCallbacks.pop(), tf.GameState.inProgress);
        notifyPlayerCallbacks.length = 0;
        checkNumCallbacks(0, 0, 0);

        await playerActionFunc_selfPlayerWins_selfPlayerFirst(5);
        await playerActionFunc_selfPlayerWins_selfPlayerFirst(4);
        await playerActionFunc_selfPlayerWins_selfPlayerFirst(3);
        await playerActionFunc_aiPlayerWins(2);
        await playerActionFunc_roundFinished(1);

        trumpCard = { suit: tf.CardSuits.clubs, value: tf.CardValues.five };
        await gameProcessor.startNextRound();
        checkNumCallbacks(3, 1, 0);
        assert.strictEqual(game.currentState, tf.GameState.inProgress);
        assert.strictEqual(notifyStateChangedCallbacks.pop(), tf.GameState.inProgress);

        checkInitialStateEvent(notifyPlayerCallbacks[0], trumpCard);
        checkCurrentPlayerMovePendingEvent(notifyPlayerCallbacks[1], true);
        checkPlayerMoveRequestedEvent(notifyPlayerCallbacks[2]);
        notifyPlayerCallbacks.length = 0;
        checkNumCallbacks(0, 0, 0);

        await playerActionFunc_aiPlayerWins(5);
        await playerActionFunc_aiPlayerWins_selfPlayerLast(4);
        await playerActionFunc_aiPlayerWins_selfPlayerFirst(3);
        await playerActionFunc_gameFinished_selfPlayerWins(2);
    });
});