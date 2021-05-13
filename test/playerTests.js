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
            let playedCard = tf.PlayerLogic.playCard(player, "7_of_hearts");
            assert.strictEqual(playedCard.suit, tf.CardSuits.hearts);
            assert.strictEqual(playedCard.value, tf.CardValues.seven);
        });
    });

    describe("assert that AI will not drop ace of trumps when robbing", function() {
        var trumpCard = new tf.TrumpCard();
        trumpCard.card = new tf.Card(tf.CardSuits.clubs, tf.CardValues.eight);

        let expectedCardToDrop = new tf.Card(tf.CardSuits.clubs, tf.CardValues.eight);
        it ("should drop the first card if first card is NOT ace of trumps", function() {
            player.cards = [
                expectedCardToDrop,
                new tf.Card(tf.CardSuits.clubs, tf.CardValues.ace)
            ];

            let actualCard = tf.PlayerLogic.aiSelectCardToDropForRob(player, trumpCard);
            assert.strictEqual(actualCard, expectedCardToDrop.cardName);
        });

        it ("should drop the second card if first card IS ace of trumps", function() {
            player.cards = [
                new tf.Card(tf.CardSuits.clubs, tf.CardValues.ace),
                expectedCardToDrop
            ];

            let actualCard = tf.PlayerLogic.aiSelectCardToDropForRob(player, trumpCard);
            assert.strictEqual(actualCard, expectedCardToDrop.cardName);
        });
    });
});
