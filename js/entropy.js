/* Keyforge standalone — how much randomness a value actually contains, in bits. */

window.Keyforge = window.Keyforge || {};

(function (K) {
  "use strict";

  function entropyBits(alphabetSize, length) {
    if (!alphabetSize || !length) return 0;
    return length * Math.log2(alphabetSize);
  }

  var LEVELS = [
    { min: 128, label: "Excellent", index: 5, color: "#8ff3c0" },
    { min: 90, label: "Very strong", index: 4, color: "#5be9a0" },
    { min: 60, label: "Strong", index: 3, color: "#2fd183" },
    { min: 40, label: "Fair", index: 2, color: "#f2c879" },
    { min: 25, label: "Weak", index: 1, color: "#f2c879" },
    { min: 0, label: "Very weak", index: 1, color: "#f08a8a" }
  ];

  function strengthLevel(bits) {
    for (var i = 0; i < LEVELS.length; i += 1) {
      if (bits >= LEVELS[i].min) return LEVELS[i];
    }
    return LEVELS[LEVELS.length - 1];
  }

  function formatBits(bits) {
    return Math.round(bits) + " bits";
  }

  K.entropy = { entropyBits: entropyBits, strengthLevel: strengthLevel, formatBits: formatBits };
})(window.Keyforge);
