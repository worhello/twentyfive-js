"use strict";

let tf = require('..');

let gameModule = require('../src/game');

let testHelpers = require('./testHelpers');

let assert = require('assert');
let sinon = require('sinon');

let player0Id = "Player0_id";
let player1Id = "Player1_id";

function checkOneDealerSet(game) {
    var numDealers = 0;
    for (let p of game.players) {
        if (p.isDealer == true) {
            numDealers++;
        }
    }

    return numDealers == 1;
}

function setGameToWaitingForPlayers(game) {
    game.currentState2 = tf.GameState2.waitingForPlayers;
    game.players.length = 0;
}

function setGameToReadyToPlay(game) {
    setGameToWaitingForPlayers(game);
    game.currentState2 = tf.GameState2.readyToPlay;
    tf.GameStateMachine.fillWithAIs(game);
    tf.GameStateMachine.rotateDealer(game);
    game.players[0].id = player0Id;
    game.players[1].id = player1Id;
    game.currentHandInfo.needMoreCardsDealt = true;
}

function setGameToDealCards(game) {
    setGameToReadyToPlay(game);
    game.currentState2 = tf.GameState2.dealCards;

    for (let p of game.players) {
        assert.strictEqual(p.cards.length, 0);
    }
}

function setGameToCardsDealt(game, onePlayerCanRob) {
    setGameToDealCards(game);

    if (!onePlayerCanRob) {
        // Ace of hearts is the top card, removing it will prevent anyone from being able to rob in these tests
        game.deck.cards.shift();
    }
    tf.GameStateMachine.handleDealCards(gameModule, game);
    game.currentState2 = tf.GameState2.cardsDealt;

    for (let p of game.players) {
        assert.strictEqual(p.cards.length, 5);
    }
}

function removeAcesFromDeck(game) {
    var aceIndex = -1;
    while ((aceIndex = game.deck.cards.findIndex(c => c.value == tf.CardValues.ace)) != -1) {
        game.deck.cards.splice(aceIndex, 1);
    }
    assert.strictEqual(game.deck.cards.length, 48);
}

function playNextPlayerCardInGame(game, playerId, expectedNewWinningCard) {
    let player = game.players[game.currentHandInfo.currentPlayerIndex];
    assert.strictEqual(player.id, playerId);

    let isNewWinningCard = tf.GameStateMachine.aiPlayCard(game, player);
    assert.strictEqual(isNewWinningCard, expectedNewWinningCard);
}

describe("GameStateMachineTests.resetDeckIfNeeded", function() {
    let gameId = "gameId";
    let numPlayers = 9;
    var game = new tf.Game(gameId, numPlayers);
    setGameToDealCards(game);

    describe ("handle 9 players", function() {
        tf.GameStateMachine.updateToNextGameState(game);
        assert.strictEqual(game.currentState2, tf.GameState2.cardsDealt);
        for (let p of game.players) {
            assert.strictEqual(p.cards.length, 5);
            for (let c of p.cards) {
                assert.notStrictEqual(c, undefined);
            }
        }

        it("second dealing - tests only", function() {
            game.currentState2 = tf.GameState2.dealCards;
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.cardsDealt);
            for (let p of game.players) {
                assert.strictEqual(p.cards.length, 10);
                for (let c of p.cards) {
                    assert.notStrictEqual(c, undefined);
                }
            }
        })
    });
});

describe("GameStateMachineTests.calculateGameState", function() {
    var aiWillRobCardStub;
    beforeEach(() => {
        aiWillRobCardStub = sinon.stub(tf.PlayerLogic, 'aiWillRobCard');
        aiWillRobCardStub.callsFake(function() { return false; });
        var shuffleStub = sinon.stub(tf.Helpers, 'shuffle');
        shuffleStub.callsFake(function(things) {}); //no-op
    });

    afterEach(() => {
        sinon.restore();
    });

    let gameId = "gameId";
    let numPlayers = 2;
    var game = new tf.Game(gameId, numPlayers);
    assert.strictEqual(game.gameRules.winningScore, 25);
    assert.strictEqual(game.gameRules.renegingAllowed, true);
    assert.strictEqual(game.gameRules.useTeams, null);

    beforeEach(() => {
        game = new tf.Game(gameId, numPlayers);
        assert.strictEqual(game.currentState2, tf.GameState2.notStarted);
        assert.strictEqual(game.deck.cards.length, 52);
    });

    it ("initial state", () => {
        assert.strictEqual(game.id, gameId);
        assert.strictEqual(game.numberOfPlayers, numPlayers);
        assert.strictEqual(game.gameRules.renegingAllowed, true);
        assert.strictEqual(game.players.length, 0);
        assert.strictEqual(game.currentHandInfo.roundPlayerAndCards.length, 0);
        assert.strictEqual(game.currentHandInfo.currentPlayerIndex, 0);
        assert.strictEqual(Object.keys(game.currentHandInfo.currentWinningPlayerAndCard).length, 0);
    });

    it("notStarted state due to too many players requested", () => {
        game = new tf.Game(gameId, 11);
        tf.GameStateMachine.updateToNextGameState(game);
        assert.strictEqual(game.currentState2, tf.GameState2.notStarted);
    });

    it ("transition to waitingForPlayers", () => {
        tf.GameStateMachine.updateToNextGameState(game);
        assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayers);
    });

    describe ("transition to readyToPlay", () => {
        beforeEach(() => {
            setGameToWaitingForPlayers(game);
        });

        afterEach(() => {
            assert.strictEqual(game.players.length, numPlayers);
            assert.strictEqual(game.players[0].isHost, true);
            assert.strictEqual(game.players[1].isHost, false);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.readyToPlay);
            assert.strictEqual(checkOneDealerSet(game), true);
        });

        let realPlayer1 = new tf.Player("player1", false);
        let realPlayer2 = new tf.Player("player2", false);

        it ("add non-AI players", function() {
            tf.GameStateMachine.addPlayer(game, realPlayer1);
            tf.GameStateMachine.addPlayer(game, realPlayer2);
        });

        it ("add AI players", function() {
            tf.GameStateMachine.fillWithAIs(game);
        });

        it ("add AI and non-AI players", function() {
            tf.GameStateMachine.addPlayer(game, realPlayer1);
            tf.GameStateMachine.fillWithAIs(game);
        });

        it ("add, remove, add player", function () {
            tf.GameStateMachine.addPlayer(game, realPlayer1);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayers);

            tf.GameStateMachine.addPlayer(game, realPlayer2);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.readyToPlay);

            tf.GameStateMachine.removePlayer(game, realPlayer2.id);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayers);

            tf.GameStateMachine.addPlayer(game, realPlayer2);
        });
    });

    describe("transition to dealCards", () => {
        beforeEach(() => {
            setGameToReadyToPlay(game);
        });

        it ("calc next state with readyToPlay", function() {
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.dealCards);
            assert.strictEqual(game.trumpCard.card.suit, undefined);
            assert.strictEqual(game.trumpCard.card.value, undefined);
        });
    });

    describe("transition to cardsDealt", () => {
        beforeEach(() => {
            setGameToDealCards(game);
        });

        it ("transition from dealCards to cardsDealt", function() {
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.cardsDealt);
            for (let p of game.players) {
                assert.strictEqual(p.cards.length, 5);
            }
            testHelpers.assertCardsEqual(game.trumpCard.card, { suit: tf.CardSuits.hearts, value: tf.CardValues.jack });
            assert.strictEqual(game.currentHandInfo.needMoreCardsDealt, false);
        });
    });

    describe("handle robbing flows", () => {

        it("call updateToNextGameState again", () => {
            setGameToCardsDealt(game, true);
            tf.GameStateMachine.updateToNextGameState(game);

            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerToRobTrumpCard);
            assert.strictEqual(game.roundRobbingInfo.robbingFinished, false);

            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerToRobTrumpCard);
        });

        describe("transition to waitingForPlayerToRobTrumpCard", () => {
            beforeEach(() => {
                aiWillRobCardStub.callsFake(function() { return false; });

                setGameToCardsDealt(game, true);
                tf.GameStateMachine.updateToNextGameState(game);

                assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerToRobTrumpCard);
                assert.strictEqual(game.roundRobbingInfo.playerCanRobIndex, 0);
                assert.strictEqual(game.roundRobbingInfo.robbingFinished, false);
                assert.strictEqual(game.roundRobbingInfo.playerCanRobIndex >= 0, true);
            });

            afterEach(() => {
                tf.GameStateMachine.updateToNextGameState(game);
                assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);
            });

            it("handle as AI - AI chooses not to rob", () => {
                tf.GameStateMachine.handleAiPlayerRob(game);
                assert.strictEqual(game.roundRobbingInfo.robbingFinished, true);
                assert.strictEqual(game.trumpCard.hasBeenStolen, false);
            });

            it("handle as AI - AI chooses to rob", () => {
                aiWillRobCardStub.callsFake(function() { return true; });
                tf.GameStateMachine.handleAiPlayerRob(game);
                assert.strictEqual(game.roundRobbingInfo.robbingFinished, true);
                assert.strictEqual(game.trumpCard.hasBeenStolen, true);
            });

            it("handle as real player", () => {
                let player = game.players[game.roundRobbingInfo.playerCanRobIndex];
                tf.GameStateMachine.robCard(game, player, player.cards[4]);
                assert.strictEqual(game.roundRobbingInfo.robbingFinished, true);
                assert.strictEqual(game.trumpCard.hasBeenStolen, true);
            });

            it("handle as real player - skip", () => {
                let player = game.players[game.roundRobbingInfo.playerCanRobIndex];
                tf.GameStateMachine.skipRobbing(game);
                assert.strictEqual(game.roundRobbingInfo.robbingFinished, true);
                assert.strictEqual(game.trumpCard.hasBeenStolen, false);
            });
        });
    });

    describe("handle waitingForPlayersToMarkAsReady", function() {
        beforeEach(() => {
            setGameToWaitingForPlayers(game);
        });

        let realPlayer1 = new tf.Player("player1", false);
        let realPlayer2 = new tf.Player("player2", false);

        it ("all real players", function() {
            tf.GameStateMachine.addPlayer(game, realPlayer1);
            tf.GameStateMachine.addPlayer(game, realPlayer2);

            tf.GameStateMachine.markAllPlayersAsNotReady(game);
            game.currentState2 = tf.GameState2.waitingForPlayersToMarkAsReady;

            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayersToMarkAsReady);

            tf.GameStateMachine.markPlayerReadyForNextRound(game, realPlayer1.id);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayersToMarkAsReady);

            tf.GameStateMachine.markPlayerReadyForNextRound(game, realPlayer2.id);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.dealCards);
        });

        it ("all AI players", function() {
            tf.GameStateMachine.fillWithAIs(game);

            tf.GameStateMachine.markAllPlayersAsNotReady(game);
            game.currentState2 = tf.GameState2.waitingForPlayersToMarkAsReady;

            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.dealCards);
        });

        it ("mix of AI and real players", function() {
            tf.GameStateMachine.addPlayer(game, realPlayer1);
            tf.GameStateMachine.fillWithAIs(game);

            tf.GameStateMachine.markAllPlayersAsNotReady(game);
            game.currentState2 = tf.GameState2.waitingForPlayersToMarkAsReady;

            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayersToMarkAsReady);

            tf.GameStateMachine.markPlayerReadyForNextRound(game, realPlayer1.id);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.dealCards);
        });
    });

    describe("waitingForPlayerMove loop", () => {
        beforeEach(() => {
            setGameToCardsDealt(game, false);
            assert.strictEqual(game.endOfHandInfo.nextRoundFirstPlayerId, "");
            assert.strictEqual(game.players.every((p) => p.score == 0), true);

            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);
            assert.strictEqual(game.currentHandInfo.currentPlayerIndex, 0);
            assert.strictEqual(game.currentHandInfo.needMoreCardsDealt, false);
        });

        let playNextPlayerCard = function(playerId, expectedNewWinningCard) {
            playNextPlayerCardInGame(game, playerId, expectedNewWinningCard);
        }

        let checkScores = function(game, player0Score, player1Score) {
            assert.strictEqual(game.players.find((p) => p.id == player0Id).score, player0Score);
            assert.strictEqual(game.players.find((p) => p.id == player1Id).score, player1Score);
        }

        it("play first hand", () => {
            playNextPlayerCard(player0Id, true);
            assert.strictEqual(game.players.every((p) => p.score == 0), true);

            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);
            assert.strictEqual(game.currentHandInfo.currentPlayerIndex, 1);
            assert.strictEqual(game.players.every((p) => p.score == 0), true);

            playNextPlayerCard(player1Id, true);
            assert.strictEqual(game.players.every((p) => p.score == 0), true);

            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentHandInfo.currentPlayerIndex, 2);
            assert.strictEqual(game.currentState2, tf.GameState2.roundFinished);

            assert.strictEqual(game.players.every((p) => p.score == 0), false);
            checkScores(game, 0, 5);
        });

        it("play full round", () => {
            playNextPlayerCard(player0Id, true);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);

            playNextPlayerCard(player1Id, true);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.roundFinished);
            checkScores(game, 0, 5);

            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);

            playNextPlayerCard(player1Id, true);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);

            playNextPlayerCard(player0Id, false);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.roundFinished);
            checkScores(game, 0, 10);

            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);

            playNextPlayerCard(player1Id, true);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);

            playNextPlayerCard(player0Id, false);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.roundFinished);
            checkScores(game, 0, 15);

            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);

            playNextPlayerCard(player1Id, true);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);

            playNextPlayerCard(player0Id, true);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.roundFinished);
            checkScores(game, 5, 15);

            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);

            playNextPlayerCard(player0Id, true);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);

            playNextPlayerCard(player1Id, true);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.roundFinished);
            checkScores(game, 5, 20);
            assert.strictEqual(game.currentHandInfo.needMoreCardsDealt, true);

            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayersToMarkAsReady);

            tf.GameStateMachine.updateToNextGameState(game); // we have all AIs in this game
            assert.strictEqual(game.currentState2, tf.GameState2.dealCards);

            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.cardsDealt);
            assert.strictEqual(game.currentHandInfo.needMoreCardsDealt, false);

            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerToRobTrumpCard);
            aiWillRobCardStub.callsFake(function() { return true; });
            tf.GameStateMachine.handleAiPlayerRob(game);
            assert.strictEqual(game.roundRobbingInfo.robbingFinished, true);
            assert.strictEqual(game.trumpCard.hasBeenStolen, true);

            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);

            playNextPlayerCard(player1Id, true);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);

            playNextPlayerCard(player0Id, true);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.roundFinished);
            checkScores(game, 10, 20);

            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);

            playNextPlayerCard(player0Id, true);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);

            playNextPlayerCard(player1Id, false);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.roundFinished);
            checkScores(game, 15, 20);
            assert.strictEqual(game.endOfHandInfo.gameFinished, false);

            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);

            playNextPlayerCard(player0Id, true);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);

            playNextPlayerCard(player1Id, false);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.roundFinished);
            checkScores(game, 20, 20);
            assert.strictEqual(game.endOfHandInfo.gameFinished, false);

            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);

            playNextPlayerCard(player0Id, true);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);

            playNextPlayerCard(player1Id, false);
            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.roundFinished);
            checkScores(game, 25, 20);
            assert.strictEqual(game.endOfHandInfo.gameFinished, true);

            tf.GameStateMachine.updateToNextGameState(game);
            assert.strictEqual(game.currentState2, tf.GameState2.gameFinished);

            assert.strictEqual(game.endOfHandInfo.orderedPlayers.length, 2);
            assert.strictEqual(game.endOfHandInfo.orderedPlayers[0].id, player0Id);
            assert.strictEqual(game.endOfHandInfo.orderedPlayers[1].id, player1Id);
        });
    });
});

describe("gameState calculation - teams", function() {
    let gameId = "gameId";
    let numPlayers = 4;
    let gameRules = {
        "winningScore": 25, "renegingAllowed": true, "useTeams": { "numTeams": 2, "teamSize": 2 }, "customRules": null
    };
    var game = new tf.Game(gameId, numPlayers, gameRules);

    setGameToReadyToPlay(game);
    game.players[2].id = "Player2_id";
    game.players[3].id = "Player3_id";

    it("populating teams", function() {

        tf.GameStateMachine.updateToNextGameState(game);

        assert.strictEqual(game.currentState2, tf.GameState2.dealCards);
        assert.strictEqual(game.teams.length, 2);
        assert.strictEqual(game.teams[0].playerIds.length, 2);
        assert.strictEqual(game.teams[0].playerIds[0], "Player0_id");
        assert.strictEqual(game.teams[0].playerIds[1], "Player2_id");
        assert.strictEqual(game.teams[1].playerIds.length, 2);
        assert.strictEqual(game.teams[1].playerIds[0], "Player1_id");
        assert.strictEqual(game.teams[1].playerIds[1], "Player3_id");
    });

    it("end game when team has won", function() {
        game.players[0].score = 10;
        game.players[1].score = 10;
        game.players[2].score = 10;
        game.players[3].score = 5;

        game.currentState2 = tf.GameState2.waitingForPlayerMove;
        game.currentHandInfo.roundFinished = true;
        game.currentHandInfo.roundPlayerAndCards = [
            {"player": game.players[0], "card": game.deck.cards.pop() }
        ];

        tf.GameStateMachine.updateToNextGameState(game);

        assert.strictEqual(game.currentState2, tf.GameState2.roundFinished);
        assert.strictEqual(game.teams[0].totalScore, 25);
        assert.strictEqual(game.teams[1].totalScore, 15);
        assert.strictEqual(game.endOfHandInfo.winningTeamId, game.teams[0].id);
        assert.strictEqual(game.endOfHandInfo.gameFinished, true);
    });

    it("do not end game when no team has won", function() {
        game.players[0].score = 5;
        game.players[1].score = 5;
        game.players[2].score = 5;
        game.players[3].score = 5;

        game.currentState2 = tf.GameState2.waitingForPlayerMove;
        game.currentHandInfo.roundFinished = true;
        game.currentHandInfo.roundPlayerAndCards = [
            {"player": game.players[0], "card": game.deck.cards.pop() }
        ];

        tf.GameStateMachine.updateToNextGameState(game);

        assert.strictEqual(game.currentState2, tf.GameState2.roundFinished);
        assert.strictEqual(game.teams[0].totalScore, 15);
        assert.strictEqual(game.teams[1].totalScore, 10);
        assert.strictEqual(game.endOfHandInfo.winningTeamId, game.teams[0].id);
        assert.strictEqual(game.endOfHandInfo.gameFinished, false);
    });
});

describe("gameStateMachine - reneging disabled", function() {
    beforeEach(() => {
        var aiWillRobCardStub = sinon.stub(tf.PlayerLogic, 'aiWillRobCard');
        aiWillRobCardStub.callsFake(function() { return false; });
        var shuffleStub = sinon.stub(tf.Helpers, 'shuffle');
        shuffleStub.callsFake(function(things) {});
    });

    afterEach(() => {
        sinon.restore();
    });

    let gameId = "gameId";
    let numPlayers = 3;
    let gameRules = {
        "winningScore": 25, "renegingAllowed": false, "useTeams": null, "customRules": null
    };
    var game = new tf.Game(gameId, numPlayers, gameRules);
    removeAcesFromDeck(game);

    // Sort the deck so it's ordered 2,2,2,2,3,3,3,3, ...
    // This to ensure all players have multiple suits
    game.deck.cards.sort((a, b) => {
        if (a.value < b.value) {
            return -1;
        }
        if (a.value > b.value) {
            return 1;
        }
        if (a.suit < b.suit) {
            return -1;
        }
        if (a.suit > b.suit) {
            return 1;
        }
        return 0
    });

    setGameToCardsDealt(game, true);
    game.players[2].id = "Player2_id";

    tf.GameStateMachine.updateToNextGameState(game);
    assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);
    for (let player of game.players) {
        assert.strictEqual(player.cards.length, 5);
        assert.strictEqual(player.cards.every(c => c.canPlay == true), true);
    }

    let playNext = function(playerId, currentPlayerIndex) {
        playNextPlayerCardInGame(game, playerId, true);
        tf.GameStateMachine.updateToNextGameState(game);
        assert.strictEqual(game.currentState2, tf.GameState2.waitingForPlayerMove);
        assert.strictEqual(game.currentHandInfo.currentPlayerIndex, currentPlayerIndex);
    }

    describe("one card played", function() {
        beforeEach(() => {
            playNext(player0Id, 1);
        });

        it ("player1 now has some cards disabled", function() {
            assert.strictEqual(game.players[1].cards.length, 5);
            assert.strictEqual(game.players[1].cards[0].canPlay, false);
            assert.strictEqual(game.players[1].cards[1].canPlay, false);
            assert.strictEqual(game.players[1].cards[2].canPlay, true);
            assert.strictEqual(game.players[1].cards[3].canPlay, true);
            assert.strictEqual(game.players[1].cards[4].canPlay, false);
        });
    });

    describe("two cards played", function() {
        beforeEach(() => {
            playNext(player1Id, 2);
        });

        it ("player2 now has some cards disabled", function() {
            assert.strictEqual(game.players[2].cards.length, 5);
            assert.strictEqual(game.players[2].cards[0].canPlay, false);
            assert.strictEqual(game.players[2].cards[1].canPlay, true);
            assert.strictEqual(game.players[2].cards[2].canPlay, true);
            assert.strictEqual(game.players[2].cards[3].canPlay, false);
            assert.strictEqual(game.players[2].cards[4].canPlay, false);
        });
    });
});

describe("gameStateMachine - custom rules: dealerBonusIfTrumpIsAce", function() {
    beforeEach(() => {
        var aiWillRobCardStub = sinon.stub(tf.PlayerLogic, 'aiWillRobCard');
        aiWillRobCardStub.callsFake(function() { return false; });
        var shuffleStub = sinon.stub(tf.Helpers, 'shuffle');
        shuffleStub.callsFake(function(things) {});
    });

    afterEach(() => {
        sinon.restore();
    });

    let sortDeckFunc = (deck) => {
        deck.cards.sort((a, b) => {
            if (a.suit < b.suit) {
                return 1;
            }
            if (a.suit > b.suit) {
                return -1;
            }
            if (a.value < b.value) {
                return 1;
            }
            if (a.value > b.value) {
                return -1;
            }
            return 0
        });
    }

    let gameId = "gameId";
    let numPlayers = 2;

    describe("dealerBonusIfTrumpIsAce = true", function() {
        let gameRules = {
            "winningScore": 25, "renegingAllowed": false, "useTeams": null, "customRules": { "dealerBonusIfTrumpIsAce": true }
        };
        var game = new tf.Game(gameId, numPlayers, gameRules);
        sortDeckFunc(game.deck);

        it("player1 is dealer - trump card is ace - extra score applied", function() {
            game.deck.cards.shift();
            game.deck.cards.shift();
            assert.strictEqual(game.deck.cards[10].value, tf.CardValues.ace);
            setGameToCardsDealt(game, true);
            assert.strictEqual(game.players[0].isDealer, false);
            assert.strictEqual(game.players[1].isDealer, true);
            assert.strictEqual(game.players[0].score, 0);
            assert.strictEqual(game.players[1].score, 5);
        });
        it("player1 is dealer - trump card is not ace - extra score not applied", function() {
            assert.strictEqual(game.deck.cards[10].value == tf.CardValues.ace, false);
            setGameToCardsDealt(game, true);
            assert.strictEqual(game.players[0].isDealer, false);
            assert.strictEqual(game.players[1].isDealer, true);
            assert.strictEqual(game.players[0].score, 0);
            assert.strictEqual(game.players[1].score, 0);
        });
    });
    describe("dealerBonusIfTrumpIsAce = false", function() {
        let gameRules = {
            "winningScore": 25, "renegingAllowed": false, "useTeams": null, "customRules": { "dealerBonusIfTrumpIsAce": false }
        };
        var game = new tf.Game(gameId, numPlayers, gameRules);
        sortDeckFunc(game.deck);

        it("player1 is dealer - trump card is ace - extra score not applied", function() {
            game.deck.cards.shift();
            game.deck.cards.shift();
            assert.strictEqual(game.deck.cards[10].value, tf.CardValues.ace);
            setGameToCardsDealt(game, true);
            assert.strictEqual(game.players[0].isDealer, false);
            assert.strictEqual(game.players[1].isDealer, true);
            assert.strictEqual(game.players[0].score, 0);
            assert.strictEqual(game.players[1].score, 0);
        });
    });
});