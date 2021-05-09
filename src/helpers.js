"use strict";

class Helpers {
    static shuffle(things) {
        things.sort(function() {
            return .5 - Math.random();
        });
    }
}

(function () {
    let e = {};
    e.Helpers = Helpers;
    
    if (typeof module !== 'undefined' && module.exports != null) {
        module.exports = e;
    } else {
        window.helpers = e;
    }
})();