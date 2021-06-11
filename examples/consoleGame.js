"use strict";

const readline = require('readline');

const tf = require('..');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var selfPlayer = {};
var game = {};
var printDebugMessages = false;
var numberOfPlayers = -1;

const args = process.argv.slice(2);
for (let arg of args) {
    if (arg == 'debug') {
        printDebugMessages = true;
    }
    else if (isValidNumPlayers(arg)) {
        numberOfPlayers = parseInt(arg) + 1;
    }
}

print("Welcome to Twenty Five - Console Edition");

if (numberOfPlayers == -1) {
    getNumPlayers((numPlayers) => {
        runGame(numPlayers);
    });
}
else {
    runGame(numberOfPlayers);
}

function runGame(numPlayers) {
    print("The game will have " + numPlayers + " players");
    selfPlayer = new tf.Player("You", true);
    let gameId = "gameId";
    let renegingDisabled = false;
    game = new tf.Game(gameId, numPlayers, renegingDisabled);
    updateGameState(game);
    tf.GameStateMachine.addPlayer(game, selfPlayer);
    addAis(game);
    updateGameState(game);
    updateGameState(game);
}

function exit() {
    rl.close();
    process.exit();
}

function debug_print(msg) {
    if (printDebugMessages) {
        print(msg);
    }
}

function print(msg) {
    console.log(msg);
}

function isValidNumPlayers(num) {
    let numPlayers = parseInt(num);
    return !Number.isNaN(numPlayers) && numPlayers >= 1 && numPlayers < 10;
}

function getNumPlayers(finishedCb) {
    rl.question("How many AI players would you like to have playing with you? ", (answer) => {
        if (!isValidNumPlayers(answer)) {
            print("Invalid number selected - exiting");
            exit();
        }
        finishedCb(parseInt(answer) + 1); // + 1 for you
    });
}

function updateGameState(game) {
    tf.GameStateMachine.updateToNextGameState(game);
    debug_print("Game transitioned to " + Object.keys(tf.GameState2).find((k) => tf.GameState2[k] == game.currentState2));

    if (game.currentState2 == tf.GameState2.dealCards || game.currentState2 == tf.GameState2.cardsDealt) {
        updateGameState(game);
    }
    else if (game.currentState2 == tf.GameState2.waitingForPlayerToRobTrumpCard) {
        handlePlayerRobbing(game);
    }
    else if (game.currentState2 == tf.GameState2.waitingForPlayerMove) {
        handleWaitingForPlayerMove(game);
    }
    else if (game.currentState2 == tf.GameState2.roundFinished) {
        handleRoundFinished(game);
    }
    else if (game.currentState2 == tf.GameState2.gameFinished) {
        handleGameFinished(game);
    }
}

function addAis(game) {
    debug_print("Adding AI players");
    tf.GameStateMachine.fillWithAIs(game);
}

function handlePlayerRobbing(game) {
    let player = game.players[game.roundRobbingInfo.playerCanRobIndex];
    if (player.id == selfPlayer.id) {
        handleSelfPlayerRobbing(game, player);
    }
    else {
        tf.GameStateMachine.handleAiPlayerRob(game);
        updateGameState(game);
    }
}

function handleSelfPlayerRobbing(game, player) {
    print("You can rob the trump card - select a card to drop for the trump card");
    print("Trump Card: " + game.trumpCard.card.cardName);
    print("0: Skip robbing the trump card");
    for (var i = 0; i < player.cards.length; i++) {
        print(i + 1 + ": " + player.cards[i].cardName);
    }

    rl.question("Type the number of the card you wish to drop: ", (answer) => {
        let cardNumber = parseInt(answer);
        if (Number.isNaN(cardNumber) || cardNumber < 0 || cardNumber > player.cards.length) {
            print("Invalid number selected - exiting");
            exit();
        }

        if (cardNumber == 0) {
            tf.GameStateMachine.skipRobbing(game);
        }
        else {
            tf.GameStateMachine.robCard(game, player, player.cards[cardNumber - 1].cardName);
        }

        updateGameState(game);
    });
}

function displayCardsSoFar(game) {
    print("===================================");
    if (game.currentHandInfo.roundPlayerAndCards.length == 0) {
        let firstPlayer = game.players[0];
        var msg = " starts";
        if (firstPlayer.id == selfPlayer.id) {
            msg = " start";
        }
        print(firstPlayer.name + msg);
    }
    else {
        print("Hand so far: (* means card to beat)");
        for (let pac of game.currentHandInfo.roundPlayerAndCards) {
            let isCurrentWinningMove = pac.player.id == game.currentHandInfo.currentWinningPlayerAndCard.player.id;
            let winningCardIndicator = isCurrentWinningMove ? "*" : "";
            print(pac.player.name + ": " + pac.card.cardName + winningCardIndicator);
        }
    }
    print("===================================");
}

function handleWaitingForPlayerMove(game) {
    let player = game.players[game.currentHandInfo.currentPlayerIndex];
    if (player.id == selfPlayer.id) {
        print("Trump Card: " + game.trumpCard.card.cardName);
        displayCardsSoFar(game);
        handleSelfPlayerPlayCard(game, player);
    }
    else {
        handleAiPlayCard(game, player);
    }
}

function handleSelfPlayerPlayCard(game, player) {
    for (var i = 0; i < player.cards.length; i++) {
        print(i + 1 + ": " + player.cards[i].cardName);
    }

    rl.question("Type the number of the card you wish to play: ", (answer) => {
        let cardNumberRaw = parseInt(answer);

        if (Number.isNaN(cardNumberRaw) || cardNumberRaw < 1 || cardNumberRaw > player.cards.length) {
            print("Invalid number selected - exiting");
            exit();
        }

        let cardNumCorrected = cardNumberRaw - 1;
        let cardName = player.cards[cardNumCorrected].cardName;
        tf.GameStateMachine.playCard(game, player, cardName);
        updateGameState(game);
    });
}

function handleAiPlayCard(game, player) {
    tf.GameStateMachine.aiPlayCard(game, player);
    updateGameState(game);
}

function handleRoundFinished(game) {
    displayCardsSoFar(game);

    print("===================================");
    var winWord = "wins";
    if (game.currentHandInfo.currentWinningPlayerAndCard.player.id == selfPlayer.id) {
        winWord = "win";
    }
    print(game.currentHandInfo.currentWinningPlayerAndCard.player.name + " " + winWord + " this hand!");

    for (let p of game.endOfHandInfo.orderedPlayers) {
        print(p.name + ": " + p.score);
    }
    print("===================================");

    updateGameState(game);
}

function handleGameFinished(game) {
    print("===================================");
    let winningPlayer = game.endOfHandInfo.orderedPlayers[0];
    print(winningPlayer.name + " won!");
    print("===================================");
}
