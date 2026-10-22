/* Keyforge standalone — application-wide preferences, kept in this browser only.
   Applies the accent tone and motion preference to every page and supplies the
   generator defaults the tool pages start from. Load before ui.js and tool.js. */

window.Keyforge = window.Keyforge || {};

(function (K) {
  "use strict";

  var STORAGE_KEY = "keyforge.settings";

  var DEFAULT_SETTINGS = {
    length: 24,
    count: 5,
    classes: ["lower", "upper", "digits", "symbols"],
    excludeAmbiguous: false,
    words: 5,
    separator: "-",
    accent: "mint",
    reduceMotion: false
  };

  var ACCENTS = [
    { value: "mint", label: "Mint", swatch: "#5be9a0" },
    { value: "ice", label: "Ice", swatch: "#4fd6e6" },
    { value: "ember", label: "Ember", swatch: "#f2c879" }
  ];

  function clampTo(value, min, max) {
    var number = Number(value);
    if (!isFinite(number)) return min;
    return Math.min(Math.max(number, min), max);
  }

  function load() {
    var stored = {};
    try {
      stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (error) {
      stored = {};
    }
    var settings = {};
    Object.keys(DEFAULT_SETTINGS).forEach(function (key) {
      settings[key] = stored[key] === undefined ? DEFAULT_SETTINGS[key] : stored[key];
    });
    if (!Array.isArray(settings.classes) || !settings.classes.length) settings.classes = DEFAULT_SETTINGS.classes.slice();
    return settings;
  }

  function save(next) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      /* storage blocked or full — preferences fall back to the defaults */
    }
  }

  function apply(settings) {
    var root = document.documentElement;
    root.setAttribute("data-accent", settings.accent);
    root.setAttribute("data-motion", settings.reduceMotion ? "reduced" : "full");
  }

  var current = load();
  apply(current);

  K.settings = {
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    ACCENTS: ACCENTS,
    STORAGE_KEY: STORAGE_KEY,
    clampTo: clampTo,
    generatorDefaults: function () {
      return current;
    },
    update: function (changes) {
      current = Object.assign({}, current, changes);
      save(current);
      apply(current);
      return current;
    },
    reset: function () {
      current = Object.assign({}, DEFAULT_SETTINGS);
      save(current);
      apply(current);
      return current;
    }
  };
})(window.Keyforge);
