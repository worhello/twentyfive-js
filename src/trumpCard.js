"use strict";

class TrumpCardLogic {
    static steal(trumpCard, player) {
        trumpCard.hasBeenStolen = true;
        trumpCard.stolenBy = player
    }
}

class TrumpCard {
    constructor() {
        this.card = new (this.getCardModule()).Card();
        this.hasBeenStolen = false;
        this.stolenBy = {};
    }

    getCardModule() {
        if (typeof module !== 'undefined' && module.exports != null) {
            let card = require("./card");
            return card;
        }
        else {
            return window.card;
        }
    }

    steal(player) {
        TrumpCardLogic.steal(this, player);
    }
}

(function () {
    let e = {};
    e.TrumpCard = TrumpCard;
    
    if (typeof module !== 'undefined' && module.exports != null) {
        module.exports = e;
    } else {
        window.trumpCard = e;
    }
})();