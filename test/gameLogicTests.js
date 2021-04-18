"use strict";

let tf = require('..');

let gameLogic = tf.gameLogic;//require('../gameLogic.js');
let gameLogicTestCases = require('./Resources/gameLogicTestCases.json');
let getBestCardTestCases = require('./Resources/getBestCardFromHandTestCases.json');
let canTrumpCardBeRobbedTestCases = require('./Resources/canTrumpCardBeRobbedTestCases.json');
let updatePlayerCardsEnabledStateTestCases = require('./Resources/updatePlayerCardsEnabledStateTestCases.json');
let assert = require('assert');

function buildSuitFromString(suitAsString) {
    if (suitAsString == "clubs") {
        return gameLogic.CardSuits.clubs;
    } else if (suitAsString == "spades") {
        return gameLogic.CardSuits.spades;
    } else if (suitAsString == "diamonds") {
        return gameLogic.CardSuits.diamonds;
    } else {
        return gameLogic.CardSuits.hearts;
    }
}

function buildValueFromString(valueAsString) {
    if (valueAsString == "ace") {
        return gameLogic.CardValues.ace;
    } else if (valueAsString == "two") {
        return gameLogic.CardValues.two;
    } else  if (valueAsString == "three") {
        return gameLogic.CardValues.three;
    } else  if (valueAsString == "four") {
        return gameLogic.CardValues.four;
    } else  if (valueAsString == "five") {
        return gameLogic.CardValues.five;
    } else  if (valueAsString == "six") {
        return gameLogic.CardValues.six;
    } else  if (valueAsString == "seven") {
        return gameLogic.CardValues.seven;
    } else  if (valueAsString == "eight") {
        return gameLogic.CardValues.eight;
    } else  if (valueAsString == "nine") {
        return gameLogic.CardValues.nine;
    } else  if (valueAsString == "ten") {
        return gameLogic.CardValues.ten;
    } else  if (valueAsString == "jack") {
        return gameLogic.CardValues.jack;
    } else  if (valueAsString == "queen") {
        return gameLogic.CardValues.queen;
    } else  if (valueAsString == "king") {
        return gameLogic.CardValues.king;
    }
}

function buildDeckCardFromJSON(cardAsJson) {
    return new gameLogic.Card(buildSuitFromString(cardAsJson.suit), buildValueFromString(cardAsJson.value));
}

function buildDeckCardsFromJSON(cardsAsJsonArray) {
    var cards = [];
    for (let cardAsJson of cardsAsJsonArray) {
        cards.push(buildDeckCardFromJSON(cardAsJson));
    }
    return cards;
}

// this is only needed because I want the same test cases across two languages
// (yes I like making things extra complicated for no reason!)
describe('parse test JSON test', function() {
    let testJson = {
        "testCases": [
            {
                "name": "test test case",
                "playedCards": [
                    {
                        "suit": "clubs",
                        "value": "queen"
                    },
                    {
                        "suit": "spades",
                        "value": "queen"
                    }
                ],
                "trumpCard": {
                    "suit": "diamonds",
                    "value": "two"
                },
                "expectedCardIndex": 0
            }
        ]
    };
    it ('should match test input', function() {
        let testCase = testJson.testCases[0];
        assert.strictEqual("test test case", testCase.name);
        assert.strictEqual(0, testCase.expectedCardIndex);

        let playedCards = buildDeckCardsFromJSON(testCase.playedCards);
        assert.strictEqual(2, playedCards.length);

        let playedCard0 = playedCards[0];
        assert.strictEqual(gameLogic.CardSuits.clubs, playedCard0.suit);
        assert.strictEqual(gameLogic.CardValues.queen, playedCard0.value);

        let playedCard1 = playedCards[1];
        assert.strictEqual(gameLogic.CardSuits.spades, playedCard1.suit);
        assert.strictEqual(gameLogic.CardValues.queen, playedCard1.value);

        let trumpCard = buildDeckCardFromJSON(testCase.trumpCard);
        assert.strictEqual(gameLogic.CardSuits.diamonds, trumpCard.suit);
        assert.strictEqual(gameLogic.CardValues.two, trumpCard.value);
    });
});

describe('Game Logic - using JSON', function() {
    for (let testCase of gameLogicTestCases.testCases) {
        it(testCase.name, function() {
            let playedCards = buildDeckCardsFromJSON(testCase.playedCards);
            var trumpCard = new gameLogic.TrumpCard();
            trumpCard.card = buildDeckCardFromJSON(testCase.trumpCard);
            let expectedCard = playedCards[testCase.expectedCardIndex];
            let actualCard = gameLogic.getWinningCard(trumpCard, playedCards);
            assert.strictEqual(actualCard.suit, expectedCard.suit);
            assert.strictEqual(actualCard.value, expectedCard.value);
        });
    }
});

describe('Game Logic', function() {
    describe('getWinningCard', function() {
        it('should return a default Card if no cards passed in', function() {
            let trumpCard = new gameLogic.TrumpCard();
            let cards = [ new gameLogic.Card() ];
            assert.ok(gameLogic.getWinningCard(trumpCard, cards));
        });

        it('should return the first card if a single card passed in', function() {
            let trumpCard = new gameLogic.TrumpCard();
            let cards = [ new gameLogic.Card() ];
            let expectedCard = cards[0];
            let actualCard = gameLogic.getWinningCard(trumpCard, cards);
            assert.strictEqual(expectedCard.suit, actualCard.suit);
            assert.strictEqual(expectedCard.value, actualCard.value);
        });
    });
});

describe('Game Logic - getBestCardFromOptions - using JSON', function() {
    for (let testCase of getBestCardTestCases.testCases) {
        it(testCase.name, function() {
            let playedCards = buildDeckCardsFromJSON(testCase.playedCards);
            let cardOptions = buildDeckCardsFromJSON(testCase.cardOptions);
            var trumpCard = new gameLogic.TrumpCard();
            trumpCard.card = buildDeckCardFromJSON(testCase.trumpCard);
            let expectedCard = cardOptions[testCase.expectedCardIndex];
            let actualCard = gameLogic.getBestCardFromOptions(cardOptions, trumpCard, playedCards);
            assert.strictEqual(actualCard.suit, expectedCard.suit);
            assert.strictEqual(actualCard.value, expectedCard.value);
        });
    }
});

describe('Game Logic (Client only)', function() {
    describe('getBestCardFromOptions', function() {
        describe('no cards available', function() {
            it('should not crash', function() {
                assert.ok(gameLogic.getBestCardFromOptions([]));
            });
        });
        describe('one card available', function() {
            it('should return the first card', function() {
                let cardOptions = [ new gameLogic.Card() ];
                let expectedCard = cardOptions[0];
                let actualCard = gameLogic.getBestCardFromOptions(cardOptions);
                assert.strictEqual(expectedCard.suit, actualCard.suit);
                assert.strictEqual(expectedCard.value, actualCard.value);
            });
        });
    });
});

describe('Game Logic - canTrumpCardBeRobbed - using JSON', function() {
    for (let testCase of canTrumpCardBeRobbedTestCases.testCases) {
        it(testCase.name, function() {
            let playerHand = buildDeckCardsFromJSON(testCase.playerHand);
            let isDealer = testCase.isDealer;
            var trumpCard = new gameLogic.TrumpCard();
            trumpCard.card = buildDeckCardFromJSON(testCase.trumpCard);
            let expectedResult = testCase.expectedResult;
            let actualResult = gameLogic.canTrumpCardBeRobbed(playerHand, isDealer, trumpCard);
            assert.strictEqual(actualResult, expectedResult);
        });
    }
});

describe('Game Logic - updatePlayerCardsEnabledState - using JSON', function() {
    for (let testCase of updatePlayerCardsEnabledStateTestCases.testCases) {
        it(testCase.name, function() {
            var playerHand = buildDeckCardsFromJSON(testCase.playerHand);
            let playedCards = buildDeckCardsFromJSON(testCase.playedCards);
            var trumpCard = new gameLogic.TrumpCard();
            trumpCard.card = buildDeckCardFromJSON(testCase.trumpCard);
            let expectedEnabledStates = testCase.expectedEnabledStates;
            gameLogic.updatePlayerCardsEnabledState(playedCards, playerHand, trumpCard);
            for (var i = 0; i < playerHand.length; i++) {
                assert.strictEqual(playerHand[i].canPlay, expectedEnabledStates[i]);
            }
        });
    }
});
