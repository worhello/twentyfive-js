"use strict";

let tf = require('..');

let assert = require('assert');

describe('Game Tests', function() {
    let id = "myId";
    let numberOfPlayers = 2;
    let game = new tf.Game(id, numberOfPlayers);

    it("check that initial game details are correct", function() {
        assert.strictEqual(game.id, id);
        assert.strictEqual(game.numberOfPlayers, numberOfPlayers);
        assert.strictEqual(game.players.length, 0);
        assert.strictEqual(game.gameRules.renegingAllowed, true);
        assert.strictEqual(game.currentHandInfo.roundPlayerAndCards.length, 0);
        assert.strictEqual(game.currentHandInfo.currentPlayerIndex, 0);
        assert.strictEqual(game.currentState2, tf.GameState2.notStarted);
    });
});