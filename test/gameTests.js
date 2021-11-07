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
            let game = new tf.Game(id, numberOfPlayers, { "winningScore": 25, "renegingAllowed": true, "useTeams": false, "foo": "bar" });
        });
    });

    it('invalid config - invalid teams config', function() {
        assert.throws(() => {
            let game = new tf.Game(id, numberOfPlayers, { "winningScore": 45, "renegingAllowed": false, "useTeams": { "numTeams": 2 } });
        });
    });

    it('invalid config - wrong teams config', function() {
        assert.throws(() => {
            let game = new tf.Game(id, numberOfPlayers, { "winningScore": 45, "renegingAllowed": false, "useTeams": { "numTeams": 1, "foo": 2 } });
        });
    });

    it('invalid config - way too few teams config', function() {
        assert.throws(() => {
            let game = new tf.Game(id, numberOfPlayers, { "winningScore": 45, "renegingAllowed": false, "useTeams": { "numTeams": 0, "teamSize": 2 } });
        });
    });

    it('invalid config - too few teams config', function() {
        assert.throws(() => {
            let game = new tf.Game(id, numberOfPlayers, { "winningScore": 45, "renegingAllowed": false, "useTeams": { "numTeams": 1, "teamSize": 2 } });
        });
    });

    it('invalid config - way too small teams config', function() {
        assert.throws(() => {
            let game = new tf.Game(id, numberOfPlayers, { "winningScore": 45, "renegingAllowed": false, "useTeams": { "numTeams": 2, "teamSize": 0 } });
        });
    });

    it('invalid config - too small teams config', function() {
        assert.throws(() => {
            let game = new tf.Game(id, numberOfPlayers, { "winningScore": 45, "renegingAllowed": false, "useTeams": { "numTeams": 2, "teamSize": 1 } });
        });
    });

    it('invalid config - too many teams config', function() {
        assert.throws(() => {
            let game = new tf.Game(id, numberOfPlayers, { "winningScore": 45, "renegingAllowed": false, "useTeams": { "numTeams": 6, "teamSize": 2 } });
        });
    });

    it('invalid config - too big teams config', function() {
        assert.throws(() => {
            let game = new tf.Game(id, numberOfPlayers, { "winningScore": 45, "renegingAllowed": false, "useTeams": { "numTeams": 2, "teamSize": 6 } });
        });
    });

    it('invalid config - too small teams for number of players config', function() {
        assert.throws(() => {
            let game = new tf.Game(id, 5, { "winningScore": 45, "renegingAllowed": false, "useTeams": { "numTeams": 2, "teamSize": 2 } });
        });
    });

    it('invalid config - too big teams for number of players config', function() {
        assert.throws(() => {
            let game = new tf.Game(id, numberOfPlayers, { "winningScore": 45, "renegingAllowed": false, "useTeams": { "numTeams": 2, "teamSize": 2 } });
        });
    });

    it('invalid config - invalid types teams config', function() {
        assert.throws(() => {
            let game = new tf.Game(id, numberOfPlayers, { "winningScore": 45, "renegingAllowed": false, "useTeams": { "numTeams": "2", "teamSize": "2" } });
        });
    });

    it('valid config - no teams config', function() {
        let game = new tf.Game(id, numberOfPlayers, { "winningScore": 45, "renegingAllowed": false, "useTeams": null });
        assert.strictEqual(game.gameRules.winningScore, 45);
        assert.strictEqual(game.gameRules.renegingAllowed, false);
        assert.strictEqual(game.gameRules.useTeams, null);
    });

    it('valid config - small teams config', function() {
        let game = new tf.Game(id, 4, { "winningScore": 45, "renegingAllowed": false, "useTeams": { "numTeams": 2, "teamSize": 2 } });
        assert.strictEqual(game.gameRules.winningScore, 45);
        assert.strictEqual(game.gameRules.renegingAllowed, false);
        assert.strictEqual(game.gameRules.useTeams.numTeams, 2);
        assert.strictEqual(game.gameRules.useTeams.teamSize, 2);
    });
});