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

describe('GameRules tests', function() {
    let id = "myId";
    let numberOfPlayers = 2;
    it('default config', function() {
        let game = new tf.Game(id, numberOfPlayers);
        assert.strictEqual(game.gameRules.winningScore, 25);
        assert.strictEqual(game.gameRules.renegingAllowed, true);
    });

    it('invalid config - empty config', function() {
        assert.throws(() => {
            let game = new tf.Game(id, numberOfPlayers, {});
        });
    });

    it('invalid config - missing values config', function() {
        assert.throws(() => {
            let game = new tf.Game(id, numberOfPlayers, { "winningScore": 25 });
        });
    });

    it('invalid config - invalid key config', function() {
        assert.throws(() => {
            let game = new tf.Game(id, numberOfPlayers, { "winningScore": 25, "foo": "bar" });
        });
    });

    it('invalid config - too many values config', function() {
        assert.throws(() => {
            let game = new tf.Game(id, numberOfPlayers, { "winningScore": 25, "renegingAllowed": true, "foo": "bar" });
        });
    });

    it('valid config - too many values config', function() {
        let game = new tf.Game(id, numberOfPlayers, { "winningScore": 45, "renegingAllowed": false });
        assert.strictEqual(game.gameRules.winningScore, 45);
        assert.strictEqual(game.gameRules.renegingAllowed, false);
    });
});