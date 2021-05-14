"use strict";

let tf = require('..');

let assert = require('assert');

describe('Game Tests', function() {
    let id = "myId";
    let numberOfPlayers = 2;
    let renegingDisabled = true;
    let game = new tf.Game(id, numberOfPlayers, renegingDisabled);

    it("check that initial game details are correct", function() {
        assert.strictEqual(game.id, id);
        assert.strictEqual(game.numberOfPlayers, numberOfPlayers);
        assert.strictEqual(game.players.length, 0);
        assert.strictEqual(game.renegingDisabled, renegingDisabled);
        assert.strictEqual(game.roundPlayerAndCards.length, 0);
        assert.strictEqual(game.currentPlayerIndex, 0);
        assert.strictEqual(Object.keys(game.currentWinningPlayerAndCard).length, 0);
        assert.strictEqual(game.currentState, tf.GameState.notStarted);
    });
});