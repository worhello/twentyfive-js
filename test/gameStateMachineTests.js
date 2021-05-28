"use strict";

let tf = require('..');

let testHelpers = require('./testHelpers');

let assert = require('assert');
let sinon = require('sinon');


describe("GameStateMachineTests.calculateGameState", function() {
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
            game.currentState2 = tf.GameState2.waitingForPlayers;
            game.players.length = 0;
        });

        afterEach(() => {
            assert.strictEqual(game.players.length, numPlayers);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.readyToPlay);
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
            game.currentState2 = tf.GameState2.readyToPlay;
            tf.GameStateMachine.fillWithAIs(game);
        });

        it ("calc next state with readyToPlay", function() {
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.dealCards);
        });
    });

    describe("transition to cardsDealt", () => {
        beforeEach(() => {
            game.currentState2 = tf.GameState2.dealCards;
            tf.GameStateMachine.fillWithAIs(game);

            for (let p of game.players) {
                assert.strictEqual(p.cards.length, 0);
            }
        });

        it ("transition from dealCards to cardsDealt", function() {
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.cardsDealt);
            for (let p of game.players) {
                assert.strictEqual(p.cards.length, 5);
            }
        });
    });

    describe("handle robbing flows", () => {
        describe("transition to waitingForPlayerToRobTrumpCard", () => {
            //
        });
    
        describe("transition to waitingForPlayerToRobTrumpCard", () => {
            //
        });
    });

    describe("transition to waitingForPlayerMove", () => {
        //
    });

});