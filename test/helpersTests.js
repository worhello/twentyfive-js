"use strict";

const tf = require('..');

const helpers = tf.Helpers;

const assert = require('assert');

describe("isValidName tests", function() {
    it("null", function() {
        assert.strictEqual(helpers.isValidName(null), false);
    });
    it("undefined", function() {
        assert.strictEqual(helpers.isValidName(undefined), false);
    });
    it("empty string", function() {
        assert.strictEqual(helpers.isValidName(""), false);
    });
    it("1 character string", function() {
        assert.strictEqual(helpers.isValidName("a"), false);
    });
    it("2 character string", function() {
        assert.strictEqual(helpers.isValidName("ab"), false);
    });
    it("3 character string", function() {
        assert.strictEqual(helpers.isValidName("abc"), true);
    });
    it("20 character string", function() {
        assert.strictEqual(helpers.isValidName("abcde12345ABCDE12345"), true);
    });
    it("21 character string", function() {
        assert.strictEqual(helpers.isValidName("abcde12345abcde12345f"), false);
    });
    it("non-alphanumeric only string", function() {
        assert.strictEqual(helpers.isValidName("!\"£$%^"), false);
    });
    it("mix of alphanumeric and non-alphanumeric string", function() {
        assert.strictEqual(helpers.isValidName("abc!"), false);
    });
});