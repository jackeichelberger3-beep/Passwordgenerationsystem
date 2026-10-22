/* Keyforge standalone — which controls each generator shows, and how it runs.
   Depends on generators.js and entropy.js. */

window.Keyforge = window.Keyforge || {};

(function (K) {
  "use strict";

  var G = K.generators;
  var E = K.entropy;

  function fromMap(map) {
    return Object.keys(map).map(function (value) {
      return { value: value, label: map[value].label };
    });
  }

  var TOOLS = {
    "pin-codes": {
      id: "pin-codes",
      filename: "pin-codes.txt",
      defaults: { length: 6, count: 10, allowLeadingZero: true },
      fields: [
        { type: "slider", key: "length", label: "Digits per PIN", min: 4, max: 12 },
        { type: "slider", key: "count", label: "How many PINs", min: 1, max: 50 },
        {
          type: "switch",
          key: "allowLeadingZero",
          label: "Allow codes starting with zero",
          note: "Turn off for systems that strip leading zeros"
        }
      ],
      generate: function (v) { return G.generatePins(v); },
      strength: function (v) {
        var bits = E.entropyBits(10, v.length);
        return {
          bits: bits,
          note: "Digits only, so each position adds 3.3 bits. A " + v.length + "-digit PIN holds about " + E.formatBits(bits) + " of randomness."
        };
      }
    },

    "recovery-codes": {
      id: "recovery-codes",
      filename: "recovery-codes.txt",
      defaults: { format: "3x4", count: 8 },
      fields: [
        { type: "select", key: "format", label: "Code format", options: fromMap(G.RECOVERY_FORMATS) },
        { type: "slider", key: "count", label: "How many codes", min: 4, max: 24 }
      ],
      generate: function (v) { return G.generateRecoveryCodes(v); },
      strength: function (v) {
        var format = G.RECOVERY_FORMATS[v.format] || G.RECOVERY_FORMATS["3x4"];
        var bits = E.entropyBits(G.RECOVERY_ALPHABET_SIZE, format.groups * format.groupSize);
        return {
          bits: bits,
          note:
            "Each code uses " + G.RECOVERY_ALPHABET_SIZE + " characters with I, O, 0 and 1 left out, so one code holds about " +
            E.formatBits(bits) + " of randomness."
        };
      }
    },

    "backup-codes": {
      id: "backup-codes",
      filename: "backup-codes.txt",
      defaults: { charset: "digits", length: 8, count: 10, split: false },
      fields: [
        { type: "select", key: "charset", label: "Characters", options: fromMap(G.BACKUP_CHARSETS) },
        { type: "slider", key: "length", label: "Characters per code", min: 6, max: 12 },
        { type: "slider", key: "count", label: "How many codes", min: 5, max: 20 },
        { type: "switch", key: "split", label: "Split codes in half", note: "Easier to read, e.g. 4821-9350" }
      ],
      generate: function (v) { return G.generateBackupCodes(v); },
      strength: function (v) {
        var alphabetSize = G.BACKUP_CHARSETS[v.charset].alphabet.length;
        return {
          bits: E.entropyBits(alphabetSize, v.length),
          note: alphabetSize + " possible characters, so each code holds that much randomness per character."
        };
      }
    },

    "master-passwords": {
      id: "master-passwords",
      filename: "master-passwords.txt",
      defaults: {
        mode: "random",
        length: 24,
        classes: ["lower", "upper", "digits", "symbols"],
        excludeAmbiguous: false,
        words: 5,
        separator: "-",
        capitalize: false,
        appendNumber: true,
        count: 1
      },
      fields: [
        {
          type: "segment",
          key: "mode",
          label: "Type",
          rerender: true,
          options: [
            { value: "random", label: "Random string" },
            { value: "passphrase", label: "Passphrase" }
          ]
        },
        { type: "slider", key: "length", label: "Length", min: 12, max: 64, showWhen: { key: "mode", value: "random" } },
        {
          type: "chips",
          key: "classes",
          label: "Character sets",
          showWhen: { key: "mode", value: "random" },
          options: [
            { value: "lower", label: "abc" },
            { value: "upper", label: "ABC" },
            { value: "digits", label: "123" },
            { value: "symbols", label: "!@#" }
          ],
          hint: function (v) { return G.passwordAlphabet(v.classes, v.excludeAmbiguous).alphabet.length + " symbols"; }
        },
        {
          type: "switch",
          key: "excludeAmbiguous",
          label: "Exclude look-alike characters",
          note: "Leaves out l, I, O, 0 and 1",
          showWhen: { key: "mode", value: "random" }
        },
        { type: "slider", key: "words", label: "Words", min: 4, max: 8, showWhen: { key: "mode", value: "passphrase" } },
        {
          type: "select",
          key: "separator",
          label: "Separator",
          showWhen: { key: "mode", value: "passphrase" },
          options: G.PASSPHRASE_SEPARATORS
        },
        {
          type: "switch",
          key: "capitalize",
          label: "Capitalise each word",
          note: "Helps with rules that demand an uppercase letter",
          showWhen: { key: "mode", value: "passphrase" }
        },
        {
          type: "switch",
          key: "appendNumber",
          label: "Add a two-digit number",
          note: "Satisfies rules that demand a number",
          showWhen: { key: "mode", value: "passphrase" }
        },
        { type: "slider", key: "count", label: "How many", min: 1, max: 10 }
      ],
      generate: function (v) {
        return v.mode === "random" ? G.generatePasswords(v) : G.generatePassphrases(v);
      },
      strength: function (v) {
        if (v.mode === "passphrase") {
          var phraseBits = G.passphraseEntropyBits(v.words) + (v.appendNumber ? Math.log2(90) : 0);
          return {
            bits: phraseBits,
            note:
              "Each word comes from a " + G.WORDLIST_SIZE + "-word list, so " + v.words + " words give about " +
              Math.round(phraseBits) + " bits of randomness."
          };
        }
        var alphabetSize = G.passwordAlphabet(v.classes, v.excludeAmbiguous).alphabet.length;
        return {
          bits: E.entropyBits(alphabetSize, v.length),
          note:
            "Drawn from " + alphabetSize + " possible characters across " + v.length +
            " positions, with at least one from each set you selected."
        };
      }
    },

    "api-keys": {
      id: "api-keys",
      filename: "api-keys.txt",
      defaults: { prefix: "sk_live_", length: 40, charset: "base62", count: 5 },
      fields: [
        {
          type: "text",
          key: "prefix",
          label: "Prefix",
          hint: "no randomness added",
          placeholder: "sk_live_",
          sanitize: function (value) { return value.replace(/\s+/g, ""); }
        },
        { type: "slider", key: "length", label: "Random characters", min: 24, max: 64 },
        { type: "select", key: "charset", label: "Characters", options: fromMap(G.KEY_CHARSETS) },
        { type: "slider", key: "count", label: "How many keys", min: 1, max: 25 }
      ],
      generate: function (v) { return G.generateApiKeys(v); },
      strength: function (v) {
        var alphabetSize = G.KEY_CHARSETS[v.charset].alphabet.length;
        return {
          bits: E.entropyBits(alphabetSize, v.length),
          note: alphabetSize + " possible characters per position, so the random part holds about " +
            E.formatBits(E.entropyBits(alphabetSize, v.length)) + " of randomness."
        };
      }
    },

    "jwt-keys": {
      id: "jwt-keys",
      filename: "jwt-secret.txt",
      blockFilename: "jwt-keypair.json",
      blockLabel: "JWK key pair",
      blockEmptyMessage: "Generate a key pair to see the JWK here.",
      defaults: { mode: "secret", algorithm: "HS256", encoding: "base64url", count: 1, pairAlgorithm: "ES256" },
      outputMode: function (v) { return v.mode === "pair" ? "block" : "list"; },
      generateLabel: function (v) { return v.mode === "pair" ? "Generate key pair" : "Generate"; },
      fields: [
        {
          type: "segment",
          key: "mode",
          label: "What do you need?",
          rerender: true,
          options: [
            { value: "secret", label: "Signing secret" },
            { value: "pair", label: "Key pair" }
          ]
        },
        {
          type: "select",
          key: "algorithm",
          label: "Algorithm",
          showWhen: { key: "mode", value: "secret" },
          options: fromMap(G.JWT_SECRET_ALGORITHMS)
        },
        {
          type: "select",
          key: "encoding",
          label: "Encoding",
          showWhen: { key: "mode", value: "secret" },
          options: fromMap(G.ENCODINGS)
        },
        { type: "slider", key: "count", label: "How many secrets", min: 1, max: 5, showWhen: { key: "mode", value: "secret" } },
        {
          type: "select",
          key: "pairAlgorithm",
          label: "Algorithm",
          showWhen: { key: "mode", value: "pair" },
          options: fromMap(G.JWT_KEYPAIR_ALGORITHMS)
        },
        {
          type: "note",
          showWhen: { key: "mode", value: "pair" },
          text: "Generated live with your browser's Web Crypto API. Publish the public JWK where verifiers can read it and keep the private key secret."
        }
      ],
      generate: function (v) {
        return v.mode === "pair" ? G.generateJwtKeyPair(v.pairAlgorithm) : G.generateJwtSecrets(v);
      },
      strength: function (v) {
        if (v.mode === "pair") return null;
        var algorithm = G.JWT_SECRET_ALGORITHMS[v.algorithm] || G.JWT_SECRET_ALGORITHMS.HS256;
        return {
          bits: algorithm.bytes * 8,
          note: "A " + v.algorithm + " secret is " + algorithm.bytes + " random bytes — exactly the length the signature expects."
        };
      }
    },

    "encryption-keys": {
      id: "encryption-keys",
      filename: "encryption-keys.txt",
      defaults: { bits: "256", encoding: "base64", count: 1 },
      fields: [
        { type: "select", key: "bits", label: "Key size", options: fromMap(G.AES_KEY_SIZES) },
        { type: "select", key: "encoding", label: "Encoding", options: fromMap(G.ENCODINGS) },
        { type: "slider", key: "count", label: "How many keys", min: 1, max: 10 }
      ],
      generate: function (v) { return G.generateEncryptionKeys(v); },
      strength: function (v) {
        var bytes = G.AES_KEY_SIZES[v.bits].bytes;
        return {
          bits: bytes * 8,
          note: bytes + " truly random bytes, which is exactly what AES-" + bytes * 8 +
            " expects. The encoding changes the characters you see, not the strength of the key."
        };
      }
    },

    "uuid-keys": {
      id: "uuid-keys",
      filename: "uuids.txt",
      defaults: { version: "v4", count: 10, uppercase: false, hyphens: true, quoted: false },
      fields: [
        {
          type: "segment",
          key: "version",
          label: "Version",
          rerender: true,
          options: [
            { value: "v4", label: "v4 — random" },
            { value: "v7", label: "v7 — time-ordered" }
          ]
        },
        { type: "slider", key: "count", label: "How many", min: 1, max: 100 },
        { type: "switch", key: "hyphens", label: "Keep hyphens", note: "Turn off for compact 32-character IDs" },
        { type: "switch", key: "uppercase", label: "Uppercase" },
        { type: "switch", key: "quoted", label: "Wrap in quotes", note: "Ready to paste into SQL or JSON" }
      ],
      generate: function (v) { return G.generateUuids(v); },
      strength: function (v) {
        return {
          bits: v.version === "v4" ? 122 : 74,
          note: v.version === "v4"
            ? "Fully random apart from the version marker: about 122 bits, so collisions and guessing are both impractical."
            : "A millisecond timestamp plus 74 random bits — IDs sort by creation time while staying hard to guess."
        };
      }
    },

    "jwt-tokens": {
      id: "jwt-tokens",
      filename: "jwt-token.txt",
      blockFilename: "jwt-token.txt",
      blockLabel: "Signed JWT",
      blockEmptyMessage: "Sign the token to see it here.",
      generateLabel: function () { return "Sign token"; },
      outputMode: function () { return "block"; },
      defaults: {
        algorithm: "HS256",
        secret: "",
        subject: "user_1234",
        issuer: "keyforge",
        audience: "api://default",
        role: "admin",
        lifetimeMinutes: 60
      },
      fields: [
        { type: "select", key: "algorithm", label: "Algorithm", options: fromMap(K.tokens.HMAC_ALGORITHMS) },
        { type: "text", key: "secret", label: "Signing secret", hint: "blank generates one", placeholder: "Paste your own secret, or leave blank" },
        { type: "text", key: "subject", label: "Subject", placeholder: "user_1234" },
        { type: "text", key: "issuer", label: "Issuer", placeholder: "keyforge" },
        { type: "text", key: "audience", label: "Audience", placeholder: "api://default" },
        { type: "text", key: "role", label: "Role claim", hint: "optional", placeholder: "admin" },
        { type: "slider", key: "lifetimeMinutes", label: "Lifetime", min: 5, max: 1440, hint: function (v) { return v.lifetimeMinutes + " minutes"; } }
      ],
      generate: function (v) {
        var secret = v.secret && v.secret.trim() ? v.secret.trim() : K.tokens.generateHmacSecret({ algorithm: v.algorithm });
        var claims = K.tokens.buildJwtClaims({
          subject: v.subject,
          issuer: v.issuer,
          audience: v.audience,
          role: v.role,
          lifetimeMinutes: v.lifetimeMinutes
        });
        return K.tokens.signJwt({ algorithm: v.algorithm, secret: secret, claims: claims }).then(function (token) {
          return [
            "TOKEN",
            token,
            "",
            "PAYLOAD CLAIMS",
            JSON.stringify(claims, null, 2),
            "",
            "SIGNING SECRET",
            secret
          ].join("\n");
        });
      },
      strength: function (v) {
        var algorithm = K.tokens.HMAC_ALGORITHMS[v.algorithm] || K.tokens.HMAC_ALGORITHMS.HS256;
        return {
          bits: algorithm.bytes * 8,
          note: "Signed with " + v.algorithm + " and a " + algorithm.bytes +
            "-byte key. The claims are readable by anyone holding the token — they are signed, not encrypted."
        };
      }
    },

    "oauth-tokens": {
      id: "oauth-tokens",
      filename: "oauth-credentials.txt",
      blockFilename: "oauth-credentials.txt",
      blockLabel: "OAuth 2.0 credential set",
      blockEmptyMessage: "Generate to see the credentials here.",
      generateLabel: function () { return "Generate credentials"; },
      outputMode: function () { return "block"; },
      defaults: { clientId: "", scope: "openid profile email", tokenLifetime: 3600 },
      fields: [
        { type: "text", key: "clientId", label: "Client ID", hint: "optional", placeholder: "Leave blank to generate one" },
        { type: "text", key: "scope", label: "Scopes", placeholder: "openid profile email" },
        { type: "slider", key: "tokenLifetime", label: "Access token lifetime", min: 300, max: 86400, hint: function (v) { return Math.round(v.tokenLifetime / 60) + " minutes"; } }
      ],
      generate: function (v) {
        return K.tokens.generateOAuthSet({
          clientId: v.clientId,
          scope: v.scope,
          tokenLifetime: v.tokenLifetime
        }).then(function (set) {
          return [
            "CLIENT ID", set.clientId,
            "", "CLIENT SECRET", set.clientSecret,
            "", "AUTHORIZATION CODE", set.authorizationCode,
            "", "ACCESS TOKEN", set.accessToken,
            "", "REFRESH TOKEN", set.refreshToken,
            "", "PKCE VERIFIER", set.codeVerifier,
            "", "PKCE CHALLENGE (S256)", set.codeChallenge,
            "", "TOKEN RESPONSE", set.response
          ].join("\n");
        });
      },
      strength: function () { return null; }
    },

    "oidc-tokens": {
      id: "oidc-tokens",
      filename: "oidc-identity.txt",
      blockFilename: "oidc-identity.txt",
      blockLabel: "OpenID Connect identity",
      blockEmptyMessage: "Generate an ID token to see it here.",
      generateLabel: function () { return "Generate ID token"; },
      outputMode: function () { return "block"; },
      defaults: {
        issuer: "https://accounts.example.com",
        clientId: "app_example",
        subject: "user_1234",
        email: "ada@example.com",
        name: "Ada Lovelace",
        lifetimeMinutes: 60,
        algorithm: "HS256"
      },
      fields: [
        { type: "text", key: "issuer", label: "Issuer", placeholder: "https://accounts.example.com" },
        { type: "text", key: "clientId", label: "Client ID (audience)", placeholder: "app_example" },
        { type: "text", key: "subject", label: "Subject", placeholder: "user_1234" },
        { type: "text", key: "email", label: "Email claim", hint: "optional", placeholder: "ada@example.com" },
        { type: "text", key: "name", label: "Name claim", hint: "optional", placeholder: "Ada Lovelace" },
        { type: "select", key: "algorithm", label: "Algorithm", options: fromMap(K.tokens.HMAC_ALGORITHMS) },
        { type: "slider", key: "lifetimeMinutes", label: "Token lifetime", min: 5, max: 720, hint: function (v) { return v.lifetimeMinutes + " minutes"; } }
      ],
      generate: function (v) {
        return K.tokens.generateOidcSet({
          issuer: v.issuer,
          clientId: v.clientId,
          subject: v.subject,
          email: v.email,
          name: v.name,
          lifetimeMinutes: v.lifetimeMinutes,
          algorithm: v.algorithm
        }).then(function (identity) {
          return [
            "ID TOKEN", identity.idToken,
            "", "NONCE", identity.nonce,
            "", "SIGNING SECRET", identity.secret,
            "", "USERINFO RESPONSE", identity.userinfo
          ].join("\n");
        });
      },
      strength: function () { return null; }
    },

    "hmac-keys": {
      id: "hmac-keys",
      filename: "hmac-signature.txt",
      blockFilename: "hmac-signature.txt",
      blockLabel: "HMAC signature",
      blockEmptyMessage: "Sign a payload to see the signature here.",
      generateLabel: function () { return "Sign payload"; },
      outputMode: function () { return "block"; },
      defaults: {
        algorithm: "HS256",
        encoding: "hex",
        secret: "",
        payload: '{"event":"payment.succeeded","id":"evt_3PxQz8","amount":4200}'
      },
      fields: [
        { type: "select", key: "algorithm", label: "Algorithm", options: fromMap(K.tokens.HMAC_ALGORITHMS) },
        { type: "select", key: "encoding", label: "Signature encoding", options: fromMap(G.ENCODINGS) },
        { type: "text", key: "secret", label: "Shared secret", hint: "blank generates one", placeholder: "Paste the secret your service holds" },
        { type: "text", key: "payload", label: "Payload", hint: "sign the raw body", multiline: true, rows: 5, placeholder: "Paste the raw request body" }
      ],
      generate: function (v) {
        var secret = v.secret && v.secret.trim() ? v.secret.trim() : K.tokens.generateHmacSecret({ algorithm: v.algorithm });
        return K.tokens.hmacSignature({
          payload: v.payload,
          secret: secret,
          algorithm: v.algorithm,
          encoding: v.encoding
        }).then(function (signature) {
          var lines = ["SIGNATURE (" + v.encoding.toUpperCase() + ")", signature, "", "SHARED SECRET", secret];
          if (v.encoding === "hex") {
            lines = lines.concat(["", "WEBHOOK HEADER", 'X-Signature-256: sha256=' + signature]);
          }
          return lines.join("\n");
        });
      },
      strength: function (v) {
        var algorithm = K.tokens.HMAC_ALGORITHMS[v.algorithm] || K.tokens.HMAC_ALGORITHMS.HS256;
        return {
          bits: algorithm.bytes * 8,
          note: "HMAC-" + algorithm.hash.replace("SHA-", "SHA") + " with a " + algorithm.bytes +
            "-byte shared secret. Sign the bytes exactly as they arrived — re-serialising the JSON changes them."
        };
      }
    },

    "password-generator": {
      id: "password-generator",
      filename: "passwords.txt",
      inherit: ["length", "classes", "excludeAmbiguous", "count"],
      defaults: {
        length: 24,
        classes: ["lower", "upper", "digits", "symbols"],
        excludeAmbiguous: false,
        count: 5
      },
      fields: [
        {
          type: "presets",
          label: "Preset",
          options: G.PASSWORD_PRESETS.map(function (preset) {
            return {
              label: preset.label,
              patch: { length: preset.length, classes: preset.classes, excludeAmbiguous: preset.excludeAmbiguous }
            };
          })
        },
        { type: "slider", key: "length", label: "Length", min: 8, max: 64, hint: function (v) { return v.length + " characters"; } },
        {
          type: "chips",
          key: "classes",
          label: "Character sets",
          options: [
            { value: "lower", label: "abc" },
            { value: "upper", label: "ABC" },
            { value: "digits", label: "123" },
            { value: "symbols", label: "!@#" }
          ],
          hint: function (v) { return G.passwordAlphabet(v.classes, v.excludeAmbiguous).alphabet.length + " symbols"; }
        },
        {
          type: "switch",
          key: "excludeAmbiguous",
          label: "Exclude look-alike characters",
          note: "Leaves out l, I, O, 0 and 1"
        },
        { type: "slider", key: "count", label: "How many", min: 1, max: 25 }
      ],
      generate: function (v) { return G.generatePasswords(v); },
      strength: function (v) {
        var alphabetSize = G.passwordAlphabet(v.classes, v.excludeAmbiguous).alphabet.length;
        return {
          bits: E.entropyBits(alphabetSize, v.length),
          note: "Drawn from " + alphabetSize + " possible characters across " + v.length +
            " positions, with at least one from each set you selected."
        };
      }
    },

    "passphrase": {
      id: "passphrase",
      filename: "passphrases.txt",
      inherit: ["words", "separator", "count"],
      defaults: { words: 5, separator: "-", caseStyle: "lower", appendNumber: true, count: 5 },
      fields: [
        { type: "slider", key: "words", label: "Words", min: 3, max: 12, hint: function (v) { return v.words + " words"; } },
        { type: "select", key: "separator", label: "Separator", options: G.PASSPHRASE_SEPARATORS },
        { type: "select", key: "caseStyle", label: "Capitalisation", options: G.CASE_STYLES },
        {
          type: "switch",
          key: "appendNumber",
          label: "Add a two-digit number",
          note: "Satisfies rules that demand a number"
        },
        { type: "slider", key: "count", label: "How many", min: 1, max: 25 }
      ],
      generate: function (v) { return G.generatePassphrases(v); },
      strength: function (v) {
        var bits = G.passphraseEntropyBits(v.words) + (v.appendNumber ? Math.log2(90) : 0);
        return {
          bits: bits,
          note: "Each word comes from a " + G.WORDLIST_SIZE + "-word list, so " + v.words + " words give about " +
            Math.round(bits) + " bits of randomness."
        };
      }
    },

    "pronounceable": {
      id: "pronounceable",
      filename: "pronounceable-passwords.txt",
      inherit: ["count"],
      defaults: { syllables: 5, separator: "", caseStyle: "lower", digits: 2, count: 5 },
      fields: [
        { type: "slider", key: "syllables", label: "Syllables", min: 3, max: 10 },
        {
          type: "select",
          key: "separator",
          label: "Separator",
          options: [
            { value: "", label: "None — kavoramisu42" },
            { value: "-", label: "Hyphen — ka-vo-ra-mi-42" },
            { value: ".", label: "Dot — ka.vo.ra.mi.42" },
            { value: " ", label: "Space — ka vo ra mi 42" }
          ]
        },
        { type: "select", key: "caseStyle", label: "Capitalisation", options: G.CASE_STYLES },
        { type: "slider", key: "digits", label: "Trailing digits", min: 0, max: 4, hint: function (v) { return v.digits ? String(v.digits) : "none"; } },
        { type: "slider", key: "count", label: "How many", min: 1, max: 25 }
      ],
      generate: function (v) { return G.generatePronounceable(v); },
      strength: function (v) {
        return {
          bits: G.pronounceableEntropyBits(v.syllables, v.digits),
          note: "Each syllable is one of 100 consonant–vowel pairs, so " + v.syllables + " syllables give about " +
            Math.round(G.pronounceableEntropyBits(v.syllables, v.digits)) + " bits."
        };
      }
    },

    "bulk-generator": {
      id: "bulk-generator",
      filename: "bulk-codes.txt",
      inherit: ["length"],
      defaults: { type: "passwords", length: 16, count: 100, excludeAmbiguous: true },
      fields: [
        { type: "select", key: "type", label: "What to generate", options: fromMap(G.BULK_TYPES) },
        {
          type: "slider",
          key: "length",
          label: "Length",
          min: 8,
          max: 64,
          showWhen: { key: "type", value: "passwords" },
          hint: function (v) { return v.length + " characters"; }
        },
        {
          type: "switch",
          key: "excludeAmbiguous",
          label: "Exclude look-alike characters",
          note: "Leaves out l, I, O, 0 and 1",
          showWhen: { key: "type", value: "passwords" }
        },
        { type: "slider", key: "count", label: "How many", min: 10, max: 500, step: 10 }
      ],
      generate: function (v) { return G.generateBulk(v); },
      strength: function (v) {
        var alphabetSize = v.type === "pins" ? 10 : v.type === "backup-codes" ? 32 : v.type === "api-keys" ? 62 : v.type === "uuids" ? 16 : 62;
        var length = v.type === "pins" ? Math.min(v.length, 12) : v.type === "backup-codes" ? 8 : v.type === "api-keys" ? 32 : v.type === "uuids" ? 32 : v.length;
        return {
          bits: E.entropyBits(alphabetSize, length),
          note: "Each of the " + v.count + " codes is drawn independently, so one code reveals nothing about the next."
        };
      }
    },

    "strength-checker": {
      id: "strength-checker",
      filename: "strength-check.txt",
      blockFilename: "strength-check.txt",
      blockLabel: "Analysis",
      blockEmptyMessage: "Type a password to see how it holds up.",
      generateLabel: function () { return "Analyse"; },
      outputMode: function () { return "block"; },
      defaults: { password: "" },
      fields: [
        { type: "text", key: "password", label: "Password", live: true, placeholder: "Type or paste a password" }
      ],
      generate: function (v) {
        var analysis = G.analyzePassword(v.password);
        if (!analysis.length) return "Type a password to see how it holds up.";
        var lines = [
          "LENGTH", analysis.length + " characters",
          "", "CHARACTER SET", analysis.alphabetSize + " possible characters",
          "", "CHARACTER TYPES", analysis.types.length ? analysis.types.join(", ") : "—",
          "", "RANDOMNESS", Math.round(analysis.bits) + " bits",
          "", "TIME TO CRACK OFFLINE", analysis.crackLabel
        ];
        if (analysis.warnings.length) {
          lines = lines.concat(["", "WHAT GIVES IT AWAY"]);
          analysis.warnings.forEach(function (warning) {
            lines.push("• " + warning);
          });
        }
        lines = lines.concat(["", "Estimated at 100 billion guesses per second against a stolen hash. Nothing you type here leaves the tab."]);
        return lines.join("\n");
      },
      strength: function (v) {
        var analysis = G.analyzePassword(v.password);
        return {
          bits: analysis.bits,
          note: "Measured from the characters actually used, then reduced by any pattern that gives the password away early."
        };
      }
    }
  };

  K.tools = {
    all: Object.keys(TOOLS).map(function (id) { return TOOLS[id]; }),
    byId: function (id) { return TOOLS[id]; }
  };
})(window.Keyforge);
