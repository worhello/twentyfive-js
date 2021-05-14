"use strict";

class TrumpCardLogic {
    static steal(trumpCard, player) {
        trumpCard.hasBeenStolen = true;
        trumpCard.stolenBy = player
    }

    static getCardModule() {
        if (typeof module !== 'undefined' && module.exports != null) {
            let card = require("./card");
            return card;
        }
        else {
            return window.card;
        }
    }
}

class TrumpCard {
    constructor() {
        this.card = new (TrumpCardLogic.getCardModule()).Card();
        this.hasBeenStolen = false;
        this.stolenBy = {};
    }
}

(function () {
    let e = {};
    e.TrumpCard = TrumpCard;
    e.TrumpCardLogic = TrumpCardLogic;
    
    if (typeof module !== 'undefined' && module.exports != null) {
        module.exports = e;
    } else {
        window.trumpCard = e;
    }
})();