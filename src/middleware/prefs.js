'use strict';

const serialize = require('node-serialize');

// -----------------------------------------------------------------------------
// INTENTIONALLY VULNERABLE — Path 2 (CVE-2017-5941)
// -----------------------------------------------------------------------------
// User theme preferences are stored client-side in the `vg_prefs` cookie as a
// base64-encoded, node-serialize-serialised object, and restored on every
// request. node-serialize 0.0.4's unserialize() will execute an
// Immediately-Invoked Function Expression embedded via the special
// `_$$ND_FUNC$$_` marker, so a crafted cookie yields remote code execution
// before authentication.
//
// A production app would use JSON.parse + an allowlist. This mirrors the real
// misuse pattern the CVE describes.
// -----------------------------------------------------------------------------
function loadPrefs(req, res, next) {
  const raw = req.cookies && req.cookies.vg_prefs;
  req.prefs = { theme: 'light' };
  if (!raw) return next();
  try {
    const json = Buffer.from(raw, 'base64').toString('utf8');
    const obj = serialize.unserialize(json); // <-- vulnerable sink
    if (obj && typeof obj === 'object') req.prefs = Object.assign(req.prefs, obj);
  } catch (e) {
    // Malformed cookie: ignore and use defaults.
  }
  next();
}

module.exports = { loadPrefs };
