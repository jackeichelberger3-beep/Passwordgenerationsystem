/* Keyforge standalone — the settings page form.
   Builds the controls with the same field renderer the generators use, so every
   preference looks and behaves exactly like it does inside a generator.
   Depends on settings.js and ui.js. */

window.Keyforge = window.Keyforge || {};

(function (K) {
  "use strict";

  var ui = K.ui;
  var settings = K.settings;

  var defaultsHost = document.getElementById("settings-defaults");
  var displayHost = document.getElementById("settings-display");
  var resetButton = document.getElementById("settings-reset");

  var DEFAULT_FIELDS = [
    {
      type: "slider",
      key: "length",
      label: "Default password length",
      min: 8,
      max: 64,
      hint: function (v) { return v.length + " characters"; }
    },
    {
      type: "chips",
      key: "classes",
      label: "Default character sets",
      options: [
        { value: "lower", label: "abc" },
        { value: "upper", label: "ABC" },
        { value: "digits", label: "123" },
        { value: "symbols", label: "!@#" }
      ],
      hint: function (v) { return v.classes.length + " selected"; }
    },
    {
      type: "switch",
      key: "excludeAmbiguous",
      label: "Exclude look-alike characters by default",
      note: "Leaves out l, I, O, 0 and 1"
    },
    {
      type: "slider",
      key: "words",
      label: "Default word count",
      min: 3,
      max: 12,
      hint: function (v) { return v.words + " words"; }
    },
    {
      type: "slider",
      key: "count",
      label: "Codes per batch",
      min: 1,
      max: 25
    }
  ];

  var DISPLAY_FIELDS = [
    {
      type: "chips",
      key: "accent",
      label: "Accent tone",
      options: settings.ACCENTS.map(function (accent) {
        return { value: accent.value, label: accent.label, swatch: accent.swatch };
      })
    },
    {
      type: "switch",
      key: "reduceMotion",
      label: "Reduce motion",
      note: "Turns off the fade-in and hover animations"
    }
  ];

  function currentValues() {
    var stored = settings.generatorDefaults();
    var copy = Object.assign({}, stored);
    copy.classes = stored.classes.slice();
    return copy;
  }

  function handlerFor(field, values) {
    return function (key, value) {
      if (key === "classes" && (!value || !value.length)) {
        return; /* keep at least one character set selected */
      }
      values[key] = value;
      settings.update({ [key]: value });
      ui.refreshHints(defaultsHost);
      ui.refreshHints(displayHost);
      if (field.type === "chips") render();
    };
  }

  function buildFields(host, fields, values) {
    host.innerHTML = "";
    var wrapper = ui.el("div", { class: "fields", style: "margin-top:0" });
    fields.forEach(function (field) {
      wrapper.appendChild(ui.buildField(field, values, handlerFor(field, values)));
    });
    host.appendChild(wrapper);
  }

  function render() {
    var values = currentValues();
    buildFields(defaultsHost, DEFAULT_FIELDS, values);
    buildFields(displayHost, DISPLAY_FIELDS, values);
  }

  if (resetButton) {
    resetButton.addEventListener("click", function () {
      settings.reset();
      render();
    });
  }

  render();
})(window.Keyforge);
