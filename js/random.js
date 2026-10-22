/* Keyforge standalone — cryptographic random helpers.
   Every value comes from the Web Crypto API (a CSPRNG). Never Math.random. */

window.Keyforge = window.Keyforge || {};

(function (K) {
  "use strict";

  var ALPHABETS = {
    digits: "0123456789",
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    alphanumeric: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    unambiguous: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
    unambiguousLower: "abcdefghijkmnopqrstuvwxyz23456789",
    base58: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
    base64url: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_",
    hex: "0123456789abcdef"
  };

  function cryptoSource() {
    if (!window.crypto || !window.crypto.getRandomValues) {
      throw new Error("Secure random generation is not available in this browser.");
    }
    return window.crypto;
  }

  function randomBytes(length) {
    var bytes = new Uint8Array(length);
    cryptoSource().getRandomValues(bytes);
    return bytes;
  }

  /* Uniform integer in [0, maxExclusive) using rejection sampling: no modulo bias. */
  function randomInt(maxExclusive) {
    if (!maxExclusive || maxExclusive < 1) throw new Error("randomInt needs a positive range.");
    var limit = Math.floor(4294967296 / maxExclusive) * maxExclusive;
    var buffer = new Uint32Array(1);
    var value = 4294967296;
    while (value >= limit) {
      cryptoSource().getRandomValues(buffer);
      value = buffer[0];
    }
    return value % maxExclusive;
  }

  function randomString(length, alphabet) {
    var out = "";
    for (var i = 0; i < length; i += 1) out += alphabet[randomInt(alphabet.length)];
    return out;
  }

  function pick(list) {
    return list[randomInt(list.length)];
  }

  function shuffle(list) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i -= 1) {
      var j = randomInt(i + 1);
      var swap = out[i];
      out[i] = out[j];
      out[j] = swap;
    }
    return out;
  }

  function bytesToHex(bytes) {
    var out = "";
    for (var i = 0; i < bytes.length; i += 1) out += bytes[i].toString(16).padStart(2, "0");
    return out;
  }

  function bytesToBase64(bytes) {
    var binary = "";
    for (var i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function bytesToBase64Url(bytes) {
    return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function groupString(value, groupSize, separator) {
    var groups = [];
    for (var i = 0; i < value.length; i += groupSize) groups.push(value.slice(i, i + groupSize));
    return groups.join(separator);
  }

  /* UTF-8 bytes, so signatures and digests see exactly what was typed. */
  function textToBytes(text) {
    var value = String(text === null || text === undefined ? "" : text);
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(value);
    var out = new Uint8Array(value.length);
    for (var i = 0; i < value.length; i += 1) out[i] = value.charCodeAt(i) & 0xff;
    return out;
  }

  K.random = {
    ALPHABETS: ALPHABETS,
    cryptoSource: cryptoSource,
    randomBytes: randomBytes,
    randomInt: randomInt,
    randomString: randomString,
    pick: pick,
    shuffle: shuffle,
    bytesToHex: bytesToHex,
    bytesToBase64: bytesToBase64,
    bytesToBase64Url: bytesToBase64Url,
    groupString: groupString,
    textToBytes: textToBytes
  };
})(window.Keyforge);
