/* Keyforge standalone — DOM helpers: fields, output panels, strength meter, clipboard.
   Depends on random.js, wordlist.js, generators.js, entropy.js. */

window.Keyforge = window.Keyforge || {};

(function (K) {
  "use strict";

  var entropy = K.entropy;

  /* ------------------------------------------------------------ dom helpers */

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value === null || value === undefined) return;
        if (key === "class") node.className = value;
        else if (key === "text") node.textContent = value;
        else if (key === "style") node.setAttribute("style", value);
        else if (key.indexOf("on") === 0) node.addEventListener(key.slice(2).toLowerCase(), value);
        else node.setAttribute(key, value);
      });
    }
    var list = children || [];
    if (!Array.isArray(list)) list = [list];
    list.forEach(function (child) {
      if (child === null || child === undefined) return;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () {
        return legacyCopy(text);
      });
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    var area = el("textarea", { readonly: "readonly" });
    area.value = text;
    area.setAttribute("style", "position:fixed;top:-1000px;opacity:0");
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }

  function downloadText(filename, text) {
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = el("a", { href: url, download: filename });
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function toolbarButton(label, onClick) {
    return el("button", { type: "button", class: "tool-btn", text: label, onclick: onClick });
  }

  function copyButton(value, label) {
    var button = el("button", { type: "button", class: "copy-btn", "aria-label": label || "Copy", text: label || "Copy" });
    button.addEventListener("click", function () {
      copyText(value).then(function () {
        button.textContent = "Copied";
        button.classList.add("is-done");
        window.setTimeout(function () {
          button.textContent = label || "Copy";
          button.classList.remove("is-done");
        }, 1500);
      });
    });
    return button;
  }

  /* --------------------------------------------------------------- strength */

  function strengthMeter(result) {
    var level = entropy.strengthLevel(result.bits);
    var meter = el("div", { class: "strength", style: "--tone:" + level.color });
    meter.appendChild(
      el("div", { class: "strength-head" }, [
        el("span", { class: "strength-label", text: "Strength" }),
        el("span", { class: "strength-value", text: level.label + " · " + Math.round(result.bits) + " bits" })
      ])
    );
    var bars = el("div", { class: "strength-bars" });
    for (var i = 1; i <= 5; i += 1) {
      bars.appendChild(el("span", { class: "strength-bar" + (i <= level.index ? " is-on" : "") }));
    }
    meter.appendChild(bars);
    if (result.note) meter.appendChild(el("p", { class: "strength-note", text: result.note }));
    return meter;
  }

  /* ----------------------------------------------------------------- fields */

  function hintText(field, values) {
    if (!field.hint) return "";
    return typeof field.hint === "function" ? field.hint(values) : field.hint;
  }

  function fieldShell(field, values, control) {
    var hint = el("span", { class: "field-hint", text: hintText(field, values) });
    var shell = el("div", { class: "field" }, [
      field.label ? el("div", { class: "field-head" }, [el("span", { class: "field-label", text: field.label }), hint]) : null,
      control
    ]);
    shell.refreshHint = function () {
      hint.textContent = hintText(field, values);
    };
    return shell;
  }

  function refreshHints(host) {
    if (!host) return;
    host.querySelectorAll(".field").forEach(function (node) {
      if (typeof node.refreshHint === "function") node.refreshHint();
    });
  }

  function sliderField(field, values, onChange) {
    var input = el("input", {
      type: "range",
      min: field.min,
      max: field.max,
      step: 1,
      class: "range-input",
      "aria-label": field.label
    });
    var readout = el("span", { class: "range-value", text: String(values[field.key]) });
    var fill = function () {
      var percent = ((values[field.key] - field.min) / (field.max - field.min)) * 100;
      input.style.setProperty("--range-fill", percent + "%");
      readout.textContent = String(values[field.key]);
    };
    input.value = values[field.key];
    fill();
    input.addEventListener("input", function () {
      onChange(field.key, Number(input.value));
      fill();
    });
    return fieldShell(field, values, el("div", { class: "range-wrap" }, [input, readout]));
  }

  function selectField(field, values, onChange) {
    var select = el("select", { class: "select", "aria-label": field.label });
    field.options.forEach(function (option) {
      select.appendChild(el("option", { value: option.value, text: option.label }));
    });
    select.value = values[field.key];
    select.addEventListener("change", function () {
      onChange(field.key, select.value, field.rerender);
    });
    return fieldShell(field, values, el("div", { class: "select-wrap" }, [select]));
  }

  function textField(field, values, onChange) {
    var input = field.multiline
      ? el("textarea", { class: "text-input text-area", spellcheck: "false", placeholder: field.placeholder || "" })
      : el("input", { type: "text", class: "text-input", spellcheck: "false", autocomplete: "off", placeholder: field.placeholder || "" });
    if (field.multiline) input.rows = field.rows || 5;
    input.value = values[field.key];
    input.addEventListener("input", function () {
      var next = field.sanitize ? field.sanitize(input.value) : input.value;
      if (next !== input.value) input.value = next;
      onChange(field.key, next, false, field.live);
    });
    return fieldShell(field, values, input);
  }

  function switchField(field, values, onChange) {
    var control = el("button", { type: "button", role: "switch", class: "switch" });
    var track = el("span", { class: "switch-track" }, [el("span", { class: "switch-dot" })]);
    var body = el("span", { class: "switch-body" }, [
      el("span", { class: "switch-label", text: field.label }),
      field.note ? el("span", { class: "switch-note", text: field.note }) : null
    ]);
    control.appendChild(track);
    control.appendChild(body);

    var sync = function () {
      var on = !!values[field.key];
      control.setAttribute("aria-checked", on ? "true" : "false");
      if (on) control.classList.add("is-on");
      else control.classList.remove("is-on");
    };
    control.addEventListener("click", function () {
      onChange(field.key, !values[field.key]);
      sync();
    });
    sync();
    return fieldShell(field, values, control);
  }

  function segmentField(field, values, onChange) {
    var group = el("div", { class: "segment", role: "group", "aria-label": field.label });
    field.options.forEach(function (option) {
      var button = el("button", { type: "button", class: "segment-option", text: option.label });
      button.addEventListener("click", function () {
        if (values[field.key] === option.value) return;
        onChange(field.key, option.value, field.rerender);
      });
      group.appendChild(button);
    });
    field.options.forEach(function (option, index) {
      var active = values[field.key] === option.value;
      var button = group.children[index];
      if (active) button.classList.add("is-active");
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    return fieldShell(field, values, group);
  }

  function chipsField(field, values, onChange) {
    var row = el("div", { class: "chips" });
    field.options.forEach(function (option) {
      var button = el("button", { type: "button", class: "chip" });
      if (option.swatch) button.appendChild(el("span", { class: "swatch", style: "background:" + option.swatch }));
      button.appendChild(document.createTextNode(option.label));
      button.setAttribute("aria-pressed", values[field.key].indexOf(option.value) >= 0 ? "true" : "false");
      button.addEventListener("click", function () {
        var current = values[field.key];
        var next = current.indexOf(option.value) >= 0
          ? current.filter(function (item) { return item !== option.value; })
          : current.concat(option.value);
        onChange(field.key, next);
        var active = next.indexOf(option.value) >= 0;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
      if (values[field.key].indexOf(option.value) >= 0) button.classList.add("is-active");
      row.appendChild(button);
    });
    return fieldShell(field, values, row);
  }

  /* Presets: one click sets several options at once (length, character sets, …). */
  function presetsField(field, values, onChange) {
    var row = el("div", { class: "chips" });
    field.options.forEach(function (option) {
      var button = el("button", { type: "button", class: "chip", text: option.label });
      var matches = Object.keys(option.patch).every(function (key) {
        return JSON.stringify(values[key]) === JSON.stringify(option.patch[key]);
      });
      if (matches) button.classList.add("is-active");
      button.setAttribute("aria-pressed", matches ? "true" : "false");
      button.addEventListener("click", function () {
        onChange("__patch", option.patch);
      });
      row.appendChild(button);
    });
    return fieldShell(field, values, row);
  }

  function buildField(field, values, onChange) {
    switch (field.type) {
      case "slider": return sliderField(field, values, onChange);
      case "select": return selectField(field, values, onChange);
      case "text": return textField(field, values, onChange);
      case "switch": return switchField(field, values, onChange);
      case "segment": return segmentField(field, values, onChange);
      case "chips": return chipsField(field, values, onChange);
      case "presets": return presetsField(field, values, onChange);
      case "note": return el("p", { class: "note-field", text: field.text });
      default: return el("div");
    }
  }

  /* ----------------------------------------------------------- output panels */

  function panelHeading(text) {
    return el("h2", { class: "panel-label", text: text });
  }

  function errorNotice(message) {
    return el("p", { class: "error", text: message });
  }

  function primaryButton(label, onClick) {
    return el("button", { type: "button", class: "btn btn-primary", text: label, onclick: onClick });
  }

  function outputHeader(options) {
    var left = el("div", { class: "panel-head-left" }, [el("h2", { class: "panel-title", text: options.title })]);
    if (typeof options.count === "number") left.appendChild(el("span", { class: "count-pill", text: String(options.count) }));

    var tools = el("div", { class: "panel-tools" });
    var hasValue = Boolean(options.text);

    var copyAll = toolbarButton("Copy all", function () {
      copyText(options.text).then(function () {
        copyAll.textContent = "Copied all";
        window.setTimeout(function () { copyAll.textContent = "Copy all"; }, 1600);
      });
    });
    copyAll.disabled = !hasValue;
    tools.appendChild(copyAll);

    var download = toolbarButton("Download", function () {
      downloadText(options.filename, options.text);
    });
    download.disabled = !hasValue;
    tools.appendChild(download);

    if (options.onRegenerate) {
      var regenerate = toolbarButton("Regenerate", options.onRegenerate);
      regenerate.disabled = Boolean(options.busy);
      tools.appendChild(regenerate);
    }

    return el("div", { class: "panel-head" }, [left, tools]);
  }

  function renderList(host, options) {
    host.innerHTML = "";
    host.classList.add("output-panel");
    var text = options.codes.join("\n");
    host.appendChild(outputHeader({
      title: "Generated codes",
      count: options.codes.length,
      text: text,
      filename: options.filename,
      onRegenerate: options.onRegenerate
    }));

    if (!options.codes.length) {
      host.appendChild(el("p", { class: "output-empty", text: "Set your options and generate a set." }));
      return;
    }

    var list = el("ul", { class: "output-list" });
    options.codes.forEach(function (code, index) {
      var row = el("li", { class: "output-row rise" }, [
        el("span", { class: "output-index", text: String(index + 1).padStart(2, "0") }),
        el("span", { class: "output-value", text: code }),
        copyButton(code)
      ]);
      row.style.animationDelay = Math.min(index, 12) * 18 + "ms";
      list.appendChild(row);
    });
    host.appendChild(list);
  }

  function renderBlock(host, options) {
    host.innerHTML = "";
    host.classList.add("output-panel");
    host.appendChild(outputHeader({
      title: options.label,
      text: options.value,
      filename: options.filename,
      onRegenerate: options.onRegenerate,
      busy: options.busy
    }));

    if (!options.value) {
      host.appendChild(el("p", { class: "output-empty", text: options.emptyMessage }));
      return;
    }
    host.appendChild(el("pre", { class: "block", text: options.value }));
  }

  K.ui = {
    el: el,
    copyText: copyText,
    downloadText: downloadText,
    copyButton: copyButton,
    panelHeading: panelHeading,
    primaryButton: primaryButton,
    errorNotice: errorNotice,
    strengthMeter: strengthMeter,
    buildField: buildField,
    refreshHints: refreshHints,
    renderList: renderList,
    renderBlock: renderBlock
  };
})(window.Keyforge);
