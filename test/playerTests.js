"use strict";

let tf = require('..');

let gameLogic = tf.gameLogic;

let assert = require('assert');

describe('Player Tests', function() {
    let player = new tf.Player("player name");
    player.cards = [
        new gameLogic.Card(gameLogic.CardSuits.clubs, gameLogic.CardValues.eight),
        new gameLogic.Card(gameLogic.CardSuits.diamonds, gameLogic.CardValues.eight),
        new gameLogic.Card(gameLogic.CardSuits.spades, gameLogic.CardValues.eight),
        new gameLogic.Card(gameLogic.CardSuits.hearts, gameLogic.CardValues.eight),
        new gameLogic.Card(gameLogic.CardSuits.hearts, gameLogic.CardValues.seven)
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
            assert.strictEqual(playedCard.suit, gameLogic.CardSuits.hearts);
            assert.strictEqual(playedCard.value, gameLogic.CardValues.seven);
        });
    });
});
