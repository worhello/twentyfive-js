"use strict";

let tf = require('..');

let gameModule = require('../src/game');

let testHelpers = require('./testHelpers');

let assert = require('assert');
let sinon = require('sinon');

function checkOneDealerSet(game) {
    var numDealers = 0;
    for (let p of game.players) {
        if (p.isDealer == true) {
            numDealers++;
        }
    }

    return numDealers == 1;
}

function setGameToWaitingForPlayers(game) {
    game.currentState2 = tf.GameState2.waitingForPlayers;
    game.players.length = 0;
}

function setGameToReadyToPlay(game) {
    setGameToWaitingForPlayers(game);
    game.currentState2 = tf.GameState2.readyToPlay;
    tf.GameStateMachine.fillWithAIs(game);
    tf.GameStateMachine.rotateDealer(game);
}

function setGameToDealCards(game) {
    setGameToReadyToPlay(game);
    game.currentState2 = tf.GameState2.dealCards;

    for (let p of game.players) {
        assert.strictEqual(p.cards.length, 0);
    }
}

function setGameToCardsDealt(game, onePlayerCanRob) {
    setGameToDealCards(game);

    if (!onePlayerCanRob) {
        // Ace of hearts is the top card, removing it will prevent anyone from being able to rob in these tests
        game.deck.cards.shift();
    }
    tf.GameStateMachine.handleDealCards(gameModule, game);
    game.currentState2 = tf.GameState2.cardsDealt;

    for (let p of game.players) {
        assert.strictEqual(p.cards.length, 5);
    }
}

describe("GameStateMachineTests.calculateGameState", function() {
    var aiWillRobCardStub = sinon.stub(tf.PlayerLogic, 'aiWillRobCard');
    aiWillRobCardStub.callsFake(function() { return false; });

    let gameId = "gameId";
    let numPlayers = 2;
    let renegingDisabled = false;
    var game = new tf.Game(gameId, numPlayers, renegingDisabled);

    beforeEach(() => {
        game = new tf.Game(gameId, numPlayers, renegingDisabled);
        assert.strictEqual(game.currentState2, tf.GameState2.notStarted);
        assert.strictEqual(game.deck.cards.length, 52);
    });

    it ("initial state", () => {
        assert.strictEqual(game.id, gameId);
        assert.strictEqual(game.numberOfPlayers, numPlayers);
        assert.strictEqual(game.renegingDisabled, renegingDisabled);
        assert.strictEqual(game.players.length, 0);
        assert.strictEqual(game.roundPlayerAndCards.length, 0);
        assert.strictEqual(game.currentPlayerIndex, 0);
        assert.strictEqual(Object.keys(game.currentWinningPlayerAndCard).length, 0);
    });

    it("notStarted state due to too many players requested", () => {
        game = new tf.Game(gameId, 11, renegingDisabled);
        tf.GameStateMachine.updateToNextGameState(game);
        assert.strictEqual(game.currentState2, tf.GameState2.notStarted);
    });

    it ("transition to waitingForPlayers", () => {
        tf.GameStateMachine.updateToNextGameState(game);
        assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayers);
    });

    describe ("transition to readyToPlay", () => {
        beforeEach(() => {
            setGameToWaitingForPlayers(game);
        });

        afterEach(() => {
            assert.strictEqual(game.players.length, numPlayers);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.readyToPlay);
            assert.strictEqual(checkOneDealerSet(game), true);
        });

        let realPlayer1 = new tf.Player("player1", false);
        let realPlayer2 = new tf.Player("player2", false);

        it ("add non-AI players", function() {
            tf.GameStateMachine.addPlayer(game, realPlayer1);
            tf.GameStateMachine.addPlayer(game, realPlayer2);
        });

        it ("add AI players", function() {
            tf.GameStateMachine.fillWithAIs(game);
        });

        it ("add AI and non-AI players", function() {
            tf.GameStateMachine.addPlayer(game, realPlayer1);
            tf.GameStateMachine.fillWithAIs(game);
        });
    });

    describe("transition to dealCards", () => {
        beforeEach(() => {
            setGameToReadyToPlay(game);
        });

        it ("calc next state with readyToPlay", function() {
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.dealCards);
            assert.strictEqual(game.trumpCard.card.suit, undefined);
            assert.strictEqual(game.trumpCard.card.value, undefined);
        });
    });

    describe("transition to cardsDealt", () => {
        beforeEach(() => {
            setGameToDealCards(game);
        });

        it ("transition from dealCards to cardsDealt", function() {
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.cardsDealt);
            for (let p of game.players) {
                assert.strictEqual(p.cards.length, 5);
            }
            testHelpers.assertCardsEqual(game.trumpCard.card, { suit: tf.CardSuits.hearts, value: tf.CardValues.jack });
        });
    });

    describe("handle robbing flows", () => {

        it("call updateToNextGameState again", () => {
            setGameToCardsDealt(game, true);
            tf.GameStateMachine.updateToNextGameState(game);

            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerToRobTrumpCard);
            assert.strictEqual(game.robbingFinished, false);

            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerToRobTrumpCard);
        });

        describe("transition to waitingForPlayerToRobTrumpCard", () => {
            beforeEach(() => {
                aiWillRobCardStub.callsFake(function() { return false; });

                setGameToCardsDealt(game, true);
                tf.GameStateMachine.updateToNextGameState(game);

                assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerToRobTrumpCard);
                assert.strictEqual(game.playerCanRobIndex, 0);
                assert.strictEqual(game.robbingFinished, false);
                assert.strictEqual(game.playerCanRobIndex >= 0, true);
            });

            afterEach(() => {
                tf.GameStateMachine.updateToNextGameState(game);
                assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);
            });

            it("handle as AI - AI chooses not to rob", () => {
                tf.GameStateMachine.handleAiPlayerRob(game);
                assert.strictEqual(game.robbingFinished, true);
                assert.strictEqual(game.trumpCard.hasBeenStolen, false);
            });

            it("handle as AI - AI chooses to rob", () => {
                aiWillRobCardStub.callsFake(function() { return true; });
                tf.GameStateMachine.handleAiPlayerRob(game);
                assert.strictEqual(game.robbingFinished, true);
                assert.strictEqual(game.trumpCard.hasBeenStolen, true);
            });

            it("handle as real player", () => {
                let player = game.players[game.playerCanRobIndex];
                tf.GameStateMachine.robCard(game, player, player.cards[4]);
                assert.strictEqual(game.robbingFinished, true);
                assert.strictEqual(game.trumpCard.hasBeenStolen, true);
            });
        });
    });

    describe("waitingForPlayerMove loop", () => {
        beforeEach(() => {
            setGameToCardsDealt(game, false);
        });

        it("0 players have played", () => {
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);
            assert.strictEqual(game.currentPlayerIndex, 0);

            // TODO play move
        });
    });

});