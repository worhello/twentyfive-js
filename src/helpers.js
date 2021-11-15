"use strict";

// ripped from https://stackoverflow.com/a/25352300
function isAlphaNumeric(str) {
    var code, i, len;
  
    for (i = 0, len = str.length; i < len; i++) {
      code = str.charCodeAt(i);
      if (!(code > 47 && code < 58) && // numeric (0-9)
          !(code > 64 && code < 91) && // upper alpha (A-Z)
          !(code > 96 && code < 123)) { // lower alpha (a-z)
        return false;
      }
    }
    return true;
  }

class Helpers {
    static shuffle(things) {
        things.sort(function() {
            return .5 - Math.random();
        });
    }

    static isValidName(nameCandidate) {
        if (!nameCandidate) {
            return false;
        }

        if (Object.prototype.toString.call(nameCandidate) !== "[object String]") {
            return false;
        }

        if (nameCandidate.length < 3 || nameCandidate.length > 20) {
            return false;
        }

        if (!isAlphaNumeric(nameCandidate)) {
            return false;
        }

        return true;
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