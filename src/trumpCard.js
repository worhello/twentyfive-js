"use strict";

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
        this.hasBeenStolen = true;
        this.stolenBy = player
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