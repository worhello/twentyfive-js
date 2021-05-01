"use strict";

let tf = require('..');

let assert = require('assert');

describe('Game Tests', function() {
    let id = "myId";
    let numberOfPlayers = 2;
    var callbacks = [];
    let callbackFunc = function(details) { callbacks.push(details); };
    let game = new tf.Game(id, numberOfPlayers, callbackFunc);

    it("check that initial game details are correct", function() {
        assert.strictEqual(game.id, id);
        assert.strictEqual(game.numberOfPlayers, numberOfPlayers);
        assert.strictEqual(game.players.length, 0);
        assert.strictEqual(game.roundPlayerAndCards.length, 0);
        assert.strictEqual(game.currentPlayerIndex, 0);
    });
});