/* Keyforge standalone — signing, tokens and identity: HMAC signatures, signed JWTs,
   OAuth 2.0 credential sets and OpenID Connect ID tokens.
   Everything is produced locally with the Web Crypto API. Depends on random.js and generators.js. */

window.Keyforge = window.Keyforge || {};

(function (K) {
  "use strict";

  var random = K.random;

  function base64UrlJson(value) {
    return random.bytesToBase64Url(random.textToBytes(JSON.stringify(value)));
  }

  function subtleCrypto() {
    var api = window.crypto && window.crypto.subtle;
    if (!api) throw new Error("This browser does not expose the Web Crypto API, so signatures can't be created here.");
    return api;
  }

  function hmacKey(secret, hash) {
    return subtleCrypto().importKey("raw", random.textToBytes(secret), { name: "HMAC", hash: hash }, false, ["sign"]);
  }

  /* ------------------------------------------------------------------ HMAC */

  var HMAC_ALGORITHMS = {
    HS256: { label: "HMAC-SHA256", hash: "SHA-256", bytes: 32 },
    HS384: { label: "HMAC-SHA384", hash: "SHA-384", bytes: 48 },
    HS512: { label: "HMAC-SHA512", hash: "SHA-512", bytes: 64 }
  };

  function hmacSignature(options) {
    var settings = options || {};
    var config = HMAC_ALGORITHMS[settings.algorithm] || HMAC_ALGORITHMS.HS256;
    return hmacKey(settings.secret || "", config.hash)
      .then(function (key) {
        return subtleCrypto().sign("HMAC", key, random.textToBytes(settings.payload || ""));
      })
      .then(function (signature) {
        return K.generators.encodeBytes(new Uint8Array(signature), settings.encoding);
      });
  }

  function generateHmacSecret(options) {
    var config = HMAC_ALGORITHMS[(options && options.algorithm) || "HS256"] || HMAC_ALGORITHMS.HS256;
    return K.generators.encodeBytes(random.randomBytes(config.bytes), "base64url");
  }

  /* ------------------------------------------------------ JSON Web Tokens */

  function signJwt(options) {
    var settings = options || {};
    var algorithm = settings.algorithm || "HS256";
    var config = HMAC_ALGORITHMS[algorithm] || HMAC_ALGORITHMS.HS256;
    var signingInput = base64UrlJson({ alg: algorithm, typ: "JWT" }) + "." + base64UrlJson(settings.claims || {});
    return hmacKey(settings.secret || "", config.hash)
      .then(function (key) {
        return subtleCrypto().sign("HMAC", key, random.textToBytes(signingInput));
      })
      .then(function (signature) {
        return signingInput + "." + random.bytesToBase64Url(new Uint8Array(signature));
      });
  }

  function buildJwtClaims(options) {
    var settings = options || {};
    var now = Math.floor(Date.now() / 1000);
    var claims = {
      iss: settings.issuer || "keyforge",
      sub: settings.subject || "user_1234",
      aud: settings.audience || "api://default"
    };
    if (settings.role) claims.role = settings.role;
    claims.iat = now;
    claims.exp = now + Math.round((settings.lifetimeMinutes || 60) * 60);
    return claims;
  }

  /* ------------------------------------------------------------------ OAuth 2.0 */

  function generateOAuthSet(options) {
    var settings = options || {};
    var provided = (settings.clientId || "").trim();
    var client = provided || "app_" + random.randomString(24, random.ALPHABETS.alphanumeric);
    var clientSecret = random.bytesToBase64Url(random.randomBytes(32));
    var accessToken = random.bytesToBase64Url(random.randomBytes(32));
    var refreshToken = random.bytesToBase64Url(random.randomBytes(48));
    var authorizationCode = random.randomString(43, random.ALPHABETS.base64url);
    var codeVerifier = random.randomString(64, random.ALPHABETS.base64url);
    var scope = settings.scope || "openid profile email";
    var lifetime = settings.tokenLifetime || 3600;

    return subtleCrypto().digest("SHA-256", random.textToBytes(codeVerifier)).then(function (digest) {
      var response = {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: lifetime,
        refresh_token: refreshToken,
        scope: scope
      };
      return {
        clientId: client,
        clientSecret: clientSecret,
        authorizationCode: authorizationCode,
        accessToken: accessToken,
        refreshToken: refreshToken,
        codeVerifier: codeVerifier,
        codeChallenge: random.bytesToBase64Url(new Uint8Array(digest)),
        response: JSON.stringify(response, null, 2)
      };
    });
  }

  /* ------------------------------------------------------- OpenID Connect */

  function generateOidcSet(options) {
    var settings = options || {};
    var algorithm = settings.algorithm || "HS256";
    var secret = generateHmacSecret({ algorithm: algorithm });
    var nonce = random.randomString(24, random.ALPHABETS.base64url);
    var now = Math.floor(Date.now() / 1000);
    var claims = {
      iss: settings.issuer || "https://accounts.example.com",
      sub: settings.subject || "user_1234",
      aud: settings.clientId || "app_example",
      iat: now,
      exp: now + Math.round((settings.lifetimeMinutes || 60) * 60),
      auth_time: now,
      nonce: nonce
    };
    if (settings.name) claims.name = settings.name;
    if (settings.email) {
      claims.email = settings.email;
      claims.email_verified = true;
    }
    var userinfo = {
      sub: claims.sub,
      name: settings.name || "Ada Lovelace",
      preferred_username: claims.sub,
      email: settings.email || "ada@example.com",
      email_verified: true
    };
    return signJwt({ algorithm: algorithm, secret: secret, claims: claims }).then(function (idToken) {
      return {
        idToken: idToken,
        nonce: nonce,
        secret: secret,
        claims: claims,
        userinfo: JSON.stringify(userinfo, null, 2)
      };
    });
  }

  K.tokens = {
    HMAC_ALGORITHMS: HMAC_ALGORITHMS,
    hmacSignature: hmacSignature,
    generateHmacSecret: generateHmacSecret,
    signJwt: signJwt,
    buildJwtClaims: buildJwtClaims,
    generateOAuthSet: generateOAuthSet,
    generateOidcSet: generateOidcSet
  };
})(window.Keyforge);
