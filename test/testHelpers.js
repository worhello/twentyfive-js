"use strict";

let assert = require('assert');

function assertCardsEqual(cardA, cardB) {
    assert.strictEqual(cardA.suit, cardB.suit);
    assert.strictEqual(cardA.value, cardB.value);
}

(function () {
    let e = {};
    e.assertCardsEqual = assertCardsEqual;

    module.exports = e;
})();