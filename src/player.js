

// using a class as a way of namespacing
class PlayerLogic
{
    static getGameLogicModule() {
        if (typeof module !== 'undefined' && module.exports != null) {
            return require("./gameLogic");
        }
        else {
            return window.gameLogic;
        }
    }

    static playCard(player, cardName) {
        let cardIndex = player.cards.findIndex(card => card.cardName == cardName);
        if (cardIndex > -1) {
            let playedCard = player.cards[cardIndex];
            player.cards.splice(cardIndex, 1);
            return playedCard;
        }
        return player.cards[0];
    }

    static aiPlayCard(player, playedCards, trumpCard) {
        let cardToPlay = PlayerLogic.getGameLogicModule().getBestCardFromOptions(player.cards, trumpCard, playedCards);
        return PlayerLogic.playCard(player, cardToPlay.cardName);
    }

    static aiWillRobCard() {
        return Math.floor(Math.random() * 10) > 4;
    }

    static aiSelectCardToDropForRob(player, trumpCard) {
        var card = player.cards[0];
        if (PlayerLogic.getGameLogicModule().isAceOfTrumps(card, trumpCard)) {
            card = player.cards[1];
        }

        return card.cardName;
    }
}

function buildPlayerId(name) {
    let strippedName = name.replace(/ /g,'');
    return "playerId_" + strippedName;
}

class Player {
    constructor(name, isSelfPlayer = false) {
        this.name = name;
        this.id = buildPlayerId(name);
        this.cards = [];
        this.score = 0;
        this.isSelfPlayer = isSelfPlayer;
        this.isDealer = false;
        this.isAi = false;
        this.isReadyForNextRound = false;
        this.isHost = false;
    }
}

var aiPlayerNum = 1;
function buildAiPlayer(gameId) {
    var p = new Player("AI_Player" + aiPlayerNum);
    p.id = p.id + "_" + gameId;
    p.isAi = true;
    aiPlayerNum++;
    return p;
}

(function () {
    let playerExports = {};
    playerExports.Player = Player;
    playerExports.PlayerLogic = PlayerLogic;
    playerExports.buildAiPlayer = buildAiPlayer;
    
    if (typeof module !== 'undefined' && module.exports != null) {
        module.exports = playerExports;
    } else {
        window.playerModule = playerExports;
    }
})();
