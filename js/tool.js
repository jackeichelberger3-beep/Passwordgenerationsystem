/* Keyforge standalone — page engine.
   Reads <body data-tool="…">, builds that generator's controls, and wires generation,
   copying and downloading. Depends on random.js, wordlist.js, generators.js, entropy.js,
   tools.js and ui.js, in that order. */

window.Keyforge = window.Keyforge || {};

(function (K) {
  "use strict";

  var tool = K.tools.byId(document.body.getAttribute("data-tool"));
  if (!tool) return;

  var ui = K.ui;
  var optionsHost = document.getElementById("options-panel");
  var outputHost = document.getElementById("output-panel");
  var strengthHost = document.getElementById("strength-panel");

  /* Start from the tool's own defaults, then let the saved settings override the
     keys this tool opts into with `inherit`. */
  var values = Object.assign({}, tool.defaults);
  if (K.settings && tool.inherit) {
    var preferences = K.settings.generatorDefaults();
    tool.inherit.forEach(function (key) {
      if (preferences[key] !== undefined) values[key] = preferences[key];
    });
  }
  if (Array.isArray(values.classes)) values.classes = values.classes.slice();

  tool.fields.forEach(function (field) {
    if (field.type === "slider" && typeof values[field.key] === "number" && K.settings) {
      values[field.key] = K.settings.clampTo(values[field.key], field.min, field.max);
    }
  });

  var state = { codes: [], block: "", busy: false, error: "" };

  function outputMode() {
    return tool.outputMode ? tool.outputMode(values) : "list";
  }

  function renderOptions() {
    optionsHost.innerHTML = "";
    optionsHost.classList.add("options-panel");
    optionsHost.appendChild(ui.panelHeading("Options"));

    var fields = ui.el("div", { class: "fields" });
    tool.fields.forEach(function (field) {
      if (field.showWhen && values[field.showWhen.key] !== field.showWhen.value) return;
      fields.appendChild(ui.buildField(field, values, handleChange));
    });
    optionsHost.appendChild(fields);

    var label = tool.generateLabel ? tool.generateLabel(values) : "Generate";
    var button = ui.primaryButton(state.busy ? "Generating…" : label, run);
    button.disabled = state.busy;
    optionsHost.appendChild(button);

    if (state.error) optionsHost.appendChild(ui.errorNotice(state.error));
  }

  function renderStrength() {
    strengthHost.innerHTML = "";
    var result = tool.strength ? tool.strength(values) : null;
    if (!result) return;
    strengthHost.appendChild(ui.strengthMeter(result));
  }

  function renderOutput() {
    if (outputMode() === "block") {
      ui.renderBlock(outputHost, {
        value: state.block,
        label: tool.blockLabel || "Output",
        filename: tool.blockFilename || "output.json",
        emptyMessage: tool.blockEmptyMessage || "Generate to see the result here.",
        onRegenerate: run,
        busy: state.busy
      });
    } else {
      ui.renderList(outputHost, {
        codes: state.codes,
        filename: tool.filename,
        onRegenerate: run
      });
    }
  }

  function handleChange(key, value, rerender, live) {
    if (key === "__patch") {
      Object.assign(values, value);
      renderOptions();
      run();
      return;
    }
    values[key] = value;
    ui.refreshHints(optionsHost);
    renderStrength();
    if (live) {
      run(true);
      return;
    }
    if (!rerender) return;
    renderOptions();
    if (outputMode() === "block") {
      state.block = "";
      state.codes = [];
      state.error = "";
      renderOutput();
    } else {
      run();
    }
  }

  function run(realtime) {
    if (state.busy) return;
    var silent = realtime === true;
    state.busy = true;
    state.error = "";
    if (!silent) renderOptions();
    return Promise.resolve()
      .then(function () { return tool.generate(values); })
      .then(function (result) {
        if (typeof result === "string") {
          state.block = result;
          state.codes = [];
        } else {
          state.codes = result;
          state.block = "";
        }
      })
      .catch(function (error) {
        state.error = error && error.message ? error.message : "Something went wrong. Try again.";
      })
      .then(function () {
        state.busy = false;
        if (!silent) renderOptions();
        renderStrength();
        renderOutput();
      });
  }

  renderOptions();
  renderStrength();
  run();
})(window.Keyforge);
