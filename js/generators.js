/* Keyforge standalone — the generators themselves.
   Nothing here stores or transmits anything: values are created in memory, returned, and forgotten. */

window.Keyforge = window.Keyforge || {};

(function (K) {
  "use strict";

  var random = K.random;
  var ALPHABETS = random.ALPHABETS;
  var WORDS = K.WORDS;

  /* ------------------------------------------------------------- PIN codes */

  function randomPin(length, allowLeadingZero) {
    var out = "";
    for (var i = 0; i < length; i += 1) {
      var startsWithZero = i === 0 && !allowLeadingZero && length > 1;
      out += String(startsWithZero ? random.randomInt(9) + 1 : random.randomInt(10));
    }
    return out;
  }

  function generatePins(options) {
    var settings = options || {};
    var length = settings.length || 6;
    var wanted = Math.min(settings.count || 10, Math.pow(10, length));
    var allowLeadingZero = settings.allowLeadingZero !== false;
    var seen = {};
    var codes = [];
    var attempts = 0;
    var limit = wanted * 50 + 500;
    while (codes.length < wanted && attempts < limit) {
      attempts += 1;
      var pin = randomPin(length, allowLeadingZero);
      if (seen[pin]) continue;
      seen[pin] = true;
      codes.push(pin);
    }
    return codes;
  }

  /* -------------------------------------------------------- recovery codes */

  var RECOVERY_FORMATS = {
    "3x4": { label: "XXXX-XXXX-XXXX", groups: 3, groupSize: 4 },
    "3x5": { label: "XXXXX-XXXXX-XXXXX", groups: 3, groupSize: 5 },
    "4x4": { label: "XXXX-XXXX-XXXX-XXXX", groups: 4, groupSize: 4 },
    "2x6": { label: "XXXXXX-XXXXXX", groups: 2, groupSize: 6 }
  };

  var RECOVERY_ALPHABET_SIZE = ALPHABETS.unambiguous.length;

  function generateRecoveryCodes(options) {
    var settings = options || {};
    var format = RECOVERY_FORMATS[settings.format] || RECOVERY_FORMATS["3x4"];
    var count = settings.count || 8;
    var codes = [];
    for (var i = 0; i < count; i += 1) {
      codes.push(random.groupString(random.randomString(format.groups * format.groupSize, ALPHABETS.unambiguous), format.groupSize, "-"));
    }
    return codes;
  }

  /* ---------------------------------------------------------- backup codes */

  var BACKUP_CHARSETS = {
    digits: { label: "Numbers only (0-9)", alphabet: ALPHABETS.digits },
    alphanumeric: { label: "Letters + numbers", alphabet: ALPHABETS.unambiguous },
    hex: { label: "Hexadecimal (0-9, A-F)", alphabet: "0123456789ABCDEF" }
  };

  function generateBackupCodes(options) {
    var settings = options || {};
    var charset = BACKUP_CHARSETS[settings.charset] || BACKUP_CHARSETS.digits;
    var length = settings.length || 8;
    var count = settings.count || 10;
    var codes = [];
    for (var i = 0; i < count; i += 1) {
      var raw = random.randomString(length, charset.alphabet);
      if (settings.split && length % 2 === 0) raw = raw.slice(0, length / 2) + "-" + raw.slice(length / 2);
      codes.push(raw);
    }
    return codes;
  }

  /* ------------------------------------------------------------ passwords */

  var PASSWORD_CLASSES = {
    lower: { label: "abc", normal: "abcdefghijklmnopqrstuvwxyz", safe: "abcdefghijkmnopqrstuvwxyz" },
    upper: { label: "ABC", normal: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", safe: "ABCDEFGHJKLMNPQRSTUVWXYZ" },
    digits: { label: "123", normal: "0123456789", safe: "23456789" },
    symbols: { label: "!@#", normal: "!@#$%^&*()-_=+[]{};:,.?/", safe: "!@#$%^&*()-_=+[]{};:,.?/" }
  };

  function passwordAlphabet(classes, excludeAmbiguous) {
    var variant = excludeAmbiguous ? "safe" : "normal";
    var sets = [];
    (classes || []).forEach(function (key) {
      if (PASSWORD_CLASSES[key]) sets.push(PASSWORD_CLASSES[key][variant]);
    });
    if (!sets.length) sets = [PASSWORD_CLASSES.lower.normal];
    return { alphabet: sets.join(""), sets: sets };
  }

  function generatePasswords(options) {
    var settings = options || {};
    var length = settings.length || 24;
    var count = settings.count || 1;
    var built = passwordAlphabet(settings.classes, settings.excludeAmbiguous);
    var codes = [];
    for (var i = 0; i < count; i += 1) {
      var chars = built.sets.map(function (set) {
        return set[random.randomInt(set.length)];
      });
      while (chars.length < length) chars.push(built.alphabet[random.randomInt(built.alphabet.length)]);
      codes.push(random.shuffle(chars).slice(0, length).join(""));
    }
    return codes;
  }

  var PASSPHRASE_SEPARATORS = [
    { value: "-", label: "Hyphen — word-word" },
    { value: ".", label: "Dot — word.word" },
    { value: "_", label: "Underscore — word_word" },
    { value: " ", label: "Space — word word" }
  ];

  function passphraseEntropyBits(words) {
    return words * Math.log2(WORDS.length);
  }

  function wordCase(word, style) {
    if (style === "upper") return word.toUpperCase();
    if (style === "title") return word.charAt(0).toUpperCase() + word.slice(1);
    return word;
  }

  function generatePassphrases(options) {
    var settings = options || {};
    var count = settings.count || 1;
    var separator = typeof settings.separator === "string" ? settings.separator : "-";
    var style = settings.caseStyle || (settings.capitalize ? "title" : "lower");
    var codes = [];
    for (var i = 0; i < count; i += 1) {
      var chosen = [];
      for (var w = 0; w < (settings.words || 5); w += 1) chosen.push(random.pick(WORDS));
      var phrase = chosen
        .map(function (word) {
          return wordCase(word, style);
        })
        .join(separator);
      if (settings.appendNumber) phrase += separator + String(random.randomInt(90) + 10);
      codes.push(phrase);
    }
    return codes;
  }

  /* ------------------------------------------------------------- API keys */

  var KEY_CHARSETS = {
    base62: { label: "Letters + numbers (a-z, A-Z, 0-9)", alphabet: ALPHABETS.alphanumeric },
    base64url: { label: "URL-safe (letters, numbers, - and _)", alphabet: ALPHABETS.base64url },
    base58: { label: "Base58 (no look-alike characters)", alphabet: ALPHABETS.base58 },
    hex: { label: "Hexadecimal (0-9, a-f)", alphabet: ALPHABETS.hex }
  };

  function generateApiKeys(options) {
    var settings = options || {};
    var charset = KEY_CHARSETS[settings.charset] || KEY_CHARSETS.base62;
    var prefix = typeof settings.prefix === "string" ? settings.prefix : "";
    var length = settings.length || 40;
    var count = settings.count || 5;
    var codes = [];
    for (var i = 0; i < count; i += 1) codes.push(prefix + random.randomString(length, charset.alphabet));
    return codes;
  }

  /* ------------------------------------------------------------------ JWT */

  var JWT_SECRET_ALGORITHMS = {
    HS256: { label: "HS256 — 256-bit secret (32 bytes)", bytes: 32 },
    HS384: { label: "HS384 — 384-bit secret (48 bytes)", bytes: 48 },
    HS512: { label: "HS512 — 512-bit secret (64 bytes)", bytes: 64 }
  };

  var ENCODINGS = {
    base64url: { label: "Base64 URL-safe", encode: random.bytesToBase64Url },
    base64: { label: "Base64", encode: random.bytesToBase64 },
    hex: { label: "Hexadecimal", encode: random.bytesToHex }
  };

  function encodeBytes(bytes, encoding) {
    var scheme = ENCODINGS[encoding] || ENCODINGS.base64url;
    return scheme.encode(bytes);
  }

  function generateJwtSecrets(options) {
    var settings = options || {};
    var algorithm = JWT_SECRET_ALGORITHMS[settings.algorithm] || JWT_SECRET_ALGORITHMS.HS256;
    var count = settings.count || 1;
    var codes = [];
    for (var i = 0; i < count; i += 1) codes.push(encodeBytes(random.randomBytes(algorithm.bytes), settings.encoding));
    return codes;
  }

  var JWT_KEYPAIR_ALGORITHMS = {
    ES256: { label: "ES256 — ECDSA P-256", kind: "ec", curve: "P-256" },
    ES384: { label: "ES384 — ECDSA P-384", kind: "ec", curve: "P-384" },
    RS256: { label: "RS256 — RSA 2048", kind: "rsa" }
  };

  function generateJwtKeyPair(algorithm) {
    var config = JWT_KEYPAIR_ALGORITHMS[algorithm] || JWT_KEYPAIR_ALGORITHMS.ES256;
    var subtle = window.crypto && window.crypto.subtle;
    if (!subtle) {
      return Promise.reject(new Error("This browser does not expose the Web Crypto API, so key pairs can't be generated here."));
    }
    var params =
      config.kind === "ec"
        ? { name: "ECDSA", namedCurve: config.curve }
        : { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" };

    return subtle.generateKey(params, true, ["sign", "verify"]).then(function (pair) {
      return Promise.all([subtle.exportKey("jwk", pair.privateKey), subtle.exportKey("jwk", pair.publicKey)]);
    }).then(function (keys) {
      var privateKey = Object.assign({}, keys[0], { alg: config.kind === "ec" ? (algorithm === "ES384" ? "ES384" : "ES256") : "RS256", use: "sig" });
      var publicKey = Object.assign({}, keys[1], { alg: privateKey.alg, use: "sig" });
      return JSON.stringify({ alg: privateKey.alg, privateKey: privateKey, publicKey: publicKey }, null, 2);
    });
  }

  /* ------------------------------------------------------ encryption keys */

  var AES_KEY_SIZES = {
    "128": { label: "AES-128 — 16 bytes", bytes: 16 },
    "192": { label: "AES-192 — 24 bytes", bytes: 24 },
    "256": { label: "AES-256 — 32 bytes", bytes: 32 }
  };

  function generateEncryptionKeys(options) {
    var settings = options || {};
    var size = AES_KEY_SIZES[settings.bits] || AES_KEY_SIZES["256"];
    var count = settings.count || 1;
    var codes = [];
    for (var i = 0; i < count; i += 1) codes.push(encodeBytes(random.randomBytes(size.bytes), settings.encoding));
    return codes;
  }

  /* ---------------------------------------------------------------- UUIDs */

  function hexUuid(bytes) {
    var hex = random.bytesToHex(bytes);
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
  }

  function uuidV4() {
    var bytes = random.randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return hexUuid(bytes);
  }

  function uuidV7() {
    var bytes = random.randomBytes(16);
    var timestamp = Date.now();
    var view = new DataView(bytes.buffer);
    view.setUint16(0, Math.floor(timestamp / 4294967296));
    view.setUint32(2, timestamp >>> 0);
    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return hexUuid(bytes);
  }

  function generateUuids(options) {
    var settings = options || {};
    var factory = settings.version === "v7" ? uuidV7 : uuidV4;
    var count = settings.count || 10;
    var codes = [];
    for (var i = 0; i < count; i += 1) {
      var value = factory();
      if (settings.hyphens === false) value = value.replace(/-/g, "");
      if (settings.uppercase) value = value.toUpperCase();
      if (settings.quoted) value = '"' + value + '"';
      codes.push(value);
    }
    return codes;
  }

  /* ------------------------------------------- pronounceable passwords */

  var PRONOUNCEABLE_SETS = { consonants: "bcdfghjklmnprstvwz", vowels: "aeiou" };

  var CASE_STYLES = [
    { value: "lower", label: "lowercase" },
    { value: "title", label: "Title Case" },
    { value: "upper", label: "UPPERCASE" }
  ];

  function pronounceableEntropyBits(syllables, digits) {
    var space = PRONOUNCEABLE_SETS.consonants.length * PRONOUNCEABLE_SETS.vowels.length;
    return syllables * Math.log2(space) + (digits ? digits * Math.log2(10) : 0);
  }

  function applyCase(value, style) {
    if (style === "upper") return value.toUpperCase();
    if (style === "title") {
      return value.replace(/(^|[^a-z0-9])([a-z])/g, function (match, lead, letter) {
        return lead + letter.toUpperCase();
      });
    }
    return value;
  }

  function generatePronounceable(options) {
    var settings = options || {};
    var syllables = settings.syllables || 4;
    var digits = settings.digits || 0;
    var separator = settings.separator || "";
    var count = settings.count || 5;
    var codes = [];
    for (var i = 0; i < count; i += 1) {
      var word = "";
      for (var s = 0; s < syllables; s += 1) {
        word += random.pick(PRONOUNCEABLE_SETS.consonants) + random.pick(PRONOUNCEABLE_SETS.vowels);
      }
      if (separator) {
        var groups = [];
        for (var p = 0; p < word.length; p += 2) groups.push(word.slice(p, p + 2));
        word = groups.join(separator);
      }
      if (digits > 0) word += String(random.randomInt(Math.pow(10, digits))).padStart(digits, "0");
      codes.push(applyCase(word, settings.caseStyle));
    }
    return codes;
  }

  /* ----------------------------------------------------- password presets */

  var PASSWORD_PRESETS = [
    { value: "standard", label: "Standard", length: 24, classes: ["lower", "upper", "digits", "symbols"], excludeAmbiguous: false },
    { value: "8", label: "8 characters", length: 8, classes: ["lower", "upper", "digits"], excludeAmbiguous: false },
    { value: "16", label: "16 characters", length: 16, classes: ["lower", "upper", "digits", "symbols"], excludeAmbiguous: false },
    { value: "no-symbols", label: "No symbols", length: 20, classes: ["lower", "upper", "digits"], excludeAmbiguous: true },
    { value: "letters-only", label: "Letters only", length: 20, classes: ["lower", "upper"], excludeAmbiguous: true },
    { value: "wifi", label: "WiFi password", length: 63, classes: ["lower", "upper", "digits", "symbols"], excludeAmbiguous: false }
  ];

  /* ---------------------------------------------------- bulk generation */

  var BULK_TYPES = {
    passwords: { label: "Passwords" },
    pins: { label: "Numeric PINs" },
    "backup-codes": { label: "Backup codes" },
    "api-keys": { label: "API keys" },
    uuids: { label: "UUID v4" }
  };

  function generateBulk(options) {
    var settings = options || {};
    var count = settings.count || 100;
    var length = settings.length || 16;
    if (settings.type === "pins") return generatePins({ length: Math.min(length, 12), count: count, allowLeadingZero: true });
    if (settings.type === "backup-codes") return generateBackupCodes({ charset: "alphanumeric", length: 8, count: count });
    if (settings.type === "api-keys") return generateApiKeys({ prefix: "sk_", length: 32, charset: "base62", count: count });
    if (settings.type === "uuids") return generateUuids({ version: "v4", count: count });
    return generatePasswords({
      length: length,
      classes: ["lower", "upper", "digits"],
      excludeAmbiguous: settings.excludeAmbiguous !== false,
      count: count
    });
  }

  /* --------------------------------------------------- strength analysis */

  var COMMON_PASSWORDS = [
    "123456", "password", "123456789", "12345678", "12345", "qwerty", "1234567", "111111", "123123",
    "abc123", "1234567890", "iloveyou", "000000", "admin", "letmein", "monkey", "dragon", "sunshine",
    "princess", "football", "welcome", "login", "passw0rd", "master", "hello", "freedom", "whatever",
    "qazwsx", "trustno1", "superman", "batman", "shadow", "michael", "jennifer", "charlie", "donald",
    "baseball", "starwars", "letmein123", "password1", "password123", "admin123", "root", "guest"
  ];

  var KEYBOARD_RUNS = ["0123456789", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm"];

  /* Offline attack speed behind the estimate: 100 billion guesses per second. */
  var GUESSES_PER_SECOND = 100000000000;

  function plural(value, unit) {
    return value.toLocaleString() + " " + unit + (value === 1 ? "" : "s");
  }

  function humanizeSeconds(seconds) {
    if (!isFinite(seconds)) return "effectively forever";
    if (seconds < 1) return "instantly";
    var YEAR = 31557600;
    if (seconds < 60) return plural(Math.round(seconds), "second");
    if (seconds < 3600) return plural(Math.round(seconds / 60), "minute");
    if (seconds < 86400) return plural(Math.round(seconds / 3600), "hour");
    if (seconds < YEAR) return plural(Math.round(seconds / 86400), "day");
    var years = seconds / YEAR;
    if (years < 1000) return plural(Math.round(years), "year");
    if (years < 1e6) return Math.round(years / 1e3).toLocaleString() + " thousand years";
    if (years < 1e9) return Math.round(years / 1e6).toLocaleString() + " million years";
    return Math.round(years / 1e9).toLocaleString() + " billion years";
  }

  function analyzePassword(password) {
    var value = String(password || "");
    var length = value.length;
    var groups = [
      { label: "Lowercase letters", test: /[a-z]/, size: 26 },
      { label: "Uppercase letters", test: /[A-Z]/, size: 26 },
      { label: "Numbers", test: /[0-9]/, size: 10 },
      { label: "Symbols", test: /[^A-Za-z0-9]/, size: 33 }
    ];
    var present = groups.filter(function (group) {
      return group.test.test(value);
    });
    var alphabetSize = present.reduce(function (total, group) {
      return total + group.size;
    }, 0);
    var bits = K.entropy.entropyBits(alphabetSize, length);
    var warnings = [];
    var lowered = value.toLowerCase();

    if (!length) {
      warnings.push("Type a password to see how it holds up.");
    } else {
      if (COMMON_PASSWORDS.indexOf(lowered) >= 0) {
        warnings.push("This password sits in public breach lists, so an attacker would try it within the first few thousand guesses.");
      }
      if (length < 12) warnings.push("Shorter than 12 characters, which is below what a modern system should accept.");
      if (present.length === 1) {
        warnings.push("Only one character type in use, so each position adds just " + Math.log2(present[0].size).toFixed(1) + " bits.");
      }
      if (/^(.)\1+$/.test(value)) {
        warnings.push("One character repeated — that adds no randomness whatsoever.");
      } else if (/(..+)\1+$/.test(value)) {
        warnings.push("A repeated block such as abcabc means the real randomness is only as long as one block.");
      }
      if (length > 3 &&
        KEYBOARD_RUNS.some(function (run) {
          return run.indexOf(lowered) >= 0;
        })) {
        warnings.push("Contains a sequence such as abc, 123 or qwerty, which guessing tools try first.");
      }
    }

    var guesses = Math.pow(2, Math.min(bits, 200));
    var seconds = guesses / GUESSES_PER_SECOND;

    return {
      length: length,
      alphabetSize: alphabetSize,
      types: present.map(function (group) {
        return group.label;
      }),
      bits: bits,
      warnings: warnings,
      crackLabel: length ? humanizeSeconds(seconds) : "—"
    };
  }

  K.generators = {
    generatePins: generatePins,
    generateRecoveryCodes: generateRecoveryCodes,
    generateBackupCodes: generateBackupCodes,
    generatePasswords: generatePasswords,
    generatePassphrases: generatePassphrases,
    generateApiKeys: generateApiKeys,
    generateJwtSecrets: generateJwtSecrets,
    generateJwtKeyPair: generateJwtKeyPair,
    generateEncryptionKeys: generateEncryptionKeys,
    generateUuids: generateUuids,
    passwordAlphabet: passwordAlphabet,
    passphraseEntropyBits: passphraseEntropyBits,
    RECOVERY_FORMATS: RECOVERY_FORMATS,
    RECOVERY_ALPHABET_SIZE: RECOVERY_ALPHABET_SIZE,
    BACKUP_CHARSETS: BACKUP_CHARSETS,
    PASSWORD_CLASSES: PASSWORD_CLASSES,
    PASSPHRASE_SEPARATORS: PASSPHRASE_SEPARATORS,
    KEY_CHARSETS: KEY_CHARSETS,
    JWT_SECRET_ALGORITHMS: JWT_SECRET_ALGORITHMS,
    JWT_KEYPAIR_ALGORITHMS: JWT_KEYPAIR_ALGORITHMS,
    ENCODINGS: ENCODINGS,
    AES_KEY_SIZES: AES_KEY_SIZES,
    WORDLIST_SIZE: WORDS.length,
    generatePronounceable: generatePronounceable,
    pronounceableEntropyBits: pronounceableEntropyBits,
    generateBulk: generateBulk,
    analyzePassword: analyzePassword,
    humanizeSeconds: humanizeSeconds,
    PRONOUNCEABLE_SETS: PRONOUNCEABLE_SETS,
    CASE_STYLES: CASE_STYLES,
    PASSWORD_PRESETS: PASSWORD_PRESETS,
    BULK_TYPES: BULK_TYPES,
    COMMON_PASSWORDS: COMMON_PASSWORDS,
    GUESSES_PER_SECOND: GUESSES_PER_SECOND,
    encodeBytes: encodeBytes
  };
})(window.Keyforge);
