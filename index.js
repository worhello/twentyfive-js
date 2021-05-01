"use strict";

let gameLogic = require('./src/gameLogic.js');
let playerModule = require('./src/player.js');
let card = require('./src/card.js');
let deck = require('./src/deck.js');
let trumpCard = require('./src/trumpCard.js');
let game = require('./src/game');

module.exports.gameLogic = gameLogic;

module.exports.Player = playerModule.Player;

module.exports.Card = card.Card;
module.exports.CardSuits = card.CardSuits;
module.exports.CardValues = card.CardValues;
module.exports.Deck = deck.Deck;
module.exports.TrumpCard = trumpCard.TrumpCard;

module.exports.Game = game.Game;
module.exports.GameState = game.GameState;