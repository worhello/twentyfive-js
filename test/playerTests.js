"use strict";

let tf = require('..');

let assert = require('assert');

describe('Player Tests', function() {
    let player = new tf.Player("player name");
    player.cards = [
        new tf.Card(tf.CardSuits.clubs, tf.CardValues.eight),
        new tf.Card(tf.CardSuits.diamonds, tf.CardValues.eight),
        new tf.Card(tf.CardSuits.spades, tf.CardValues.eight),
        new tf.Card(tf.CardSuits.hearts, tf.CardValues.eight),
        new tf.Card(tf.CardSuits.hearts, tf.CardValues.seven)
    ];

    it("check that internal player details are correct", function() {
        assert.strictEqual(player.name, "player name");
        assert.strictEqual(player.id, "playerId_playername");
    });

    describe("check that playing a card removes it from the player", function() {
        it("invalid input", function() {
            // TODO
        });

        it("card the player does not have", function() {
            // TODO
        });

        it("card the player does have", function() {
            let playedCard = player.playCard("7_of_hearts");
            assert.strictEqual(playedCard.suit, tf.CardSuits.hearts);
            assert.strictEqual(playedCard.value, tf.CardValues.seven);
        });
    });
});
