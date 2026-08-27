'use strict';

const express = require('express');
const serialize = require('node-serialize');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { layout, esc } = require('../render');

const router = express.Router();

// ---- Landing page (public) ----
router.get('/', (req, res) => {
  const body = `
  <section class="hero">
    <h1>VaultGate</h1>
    <p class="lead">The internal document-management and administration platform for VaultGate Ltd.</p>
    <div class="hero-actions">
      <a class="btn" href="/login">Sign in</a>
      <a class="btn-ghost" href="/assistant">Ask VaultBot</a>
    </div>
  </section>
  <section class="grid3">
    <div class="card"><h3>Document Archive</h3><p>Departmental documents for IT, Finance, HR, Security and Operations.</p></div>
    <div class="card"><h3>VaultBot</h3><p>Internal assistant for finding company knowledge quickly.</p></div>
    <div class="card"><h3>Administration</h3><p>Maintenance tooling and audit logging for platform administrators.</p></div>
  </section>`;
  res.send(layout({ title: 'Home', body, user: req.currentUser || null, theme: req.prefs && req.prefs.theme }));
});

// ---- robots.txt (recon) ----
router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    'User-agent: *\n' +
    'Disallow: /admin\n' +
    'Disallow: /api\n' +
    'Disallow: /internal\n' +
    'Disallow: /terminal\n'
  );
});

// ---- Dashboard (auth) ----
router.get('/dashboard', requireAuth, (req, res) => {
  const user = req.currentUser;
  const docs = db.prepare('SELECT id, title, department, classification FROM documents WHERE restricted = 0').all();
  const cards = docs
    .map(
      (d) => `<a class="doc-card" href="/documents#${d.id}">
        <span class="tag">${esc(d.department)}</span>
        <h3>${esc(d.title)}</h3>
        <span class="class ${esc(d.classification.toLowerCase())}">${esc(d.classification)}</span></a>`
    )
    .join('');

  let adminPanel = '';
  if (user.role === 'admin') {
    adminPanel = `
    <div class="panel warn">
      <h3>Maintenance Access</h3>
      <p>Administrator maintenance tooling is available for platform troubleshooting.</p>
      <ul class="kv">
        <li><strong>Web console:</strong> <a href="/terminal">Open Maintenance Console</a></li>
        <li><strong>Legacy SSH:</strong> <code>administrator@vaultgate</code> (disabled by default in cloud)</li>
      </ul>
    </div>`;
  }

  const body = `
  <h1>Welcome, ${esc(user.display_name)}</h1>
  <p class="muted">${esc(user.department)} · ${esc(user.role)}</p>
  ${adminPanel}
  <h2>Recent documents</h2>
  <div class="doc-grid">${cards}</div>`;
  res.send(layout({ title: 'Dashboard', body, user, theme: req.prefs && req.prefs.theme }));
});

// ---- Documents (auth) ----
router.get('/documents', requireAuth, (req, res) => {
  const isAdmin = req.currentUser.role === 'admin';
  const docs = isAdmin
    ? db.prepare('SELECT * FROM documents').all()
    : db.prepare('SELECT * FROM documents WHERE restricted = 0').all();
  const items = docs
    .map(
      (d) => `<article class="doc" id="${d.id}">
      <div class="doc-head"><h3>${esc(d.title)}</h3>
      <span class="class ${esc(d.classification.toLowerCase())}">${esc(d.classification)}</span></div>
      <p class="muted small">${esc(d.department)}${d.restricted ? ' · Restricted' : ''}</p>
      <p>${esc(d.content)}</p></article>`
    )
    .join('');
  const body = `<h1>Documents</h1>${items}`;
  res.send(layout({ title: 'Documents', body, user: req.currentUser, theme: req.prefs && req.prefs.theme }));
});

// ---- Profile (auth) — sets the vg_prefs cookie (Path 2 sink origin) ----
router.get('/profile', requireAuth, (req, res) => {
  const u = req.currentUser;
  const theme = (req.prefs && req.prefs.theme) || 'light';
  const body = `
  <h1>Your profile</h1>
  <div class="panel">
    <ul class="kv">
      <li><strong>Username:</strong> ${esc(u.username)}</li>
      <li><strong>Display name:</strong> ${esc(u.display_name)}</li>
      <li><strong>Email:</strong> ${esc(u.email)}</li>
      <li><strong>Department:</strong> ${esc(u.department)}</li>
      <li><strong>Role:</strong> ${esc(u.role)}</li>
    </ul>
  </div>
  <div class="panel">
    <h3>Preferences</h3>
    <form method="post" action="/profile/theme" class="form-inline">
      <label>Theme
        <select name="theme">
          <option value="light" ${theme === 'light' ? 'selected' : ''}>Light</option>
          <option value="dark" ${theme === 'dark' ? 'selected' : ''}>Dark</option>
        </select>
      </label>
      <button class="btn" type="submit">Save</button>
    </form>
    <p class="muted small">Preferences are stored in your browser (vg_prefs cookie).</p>
  </div>`;
  res.send(layout({ title: 'Profile', body, user: u, theme }));
});

router.post('/profile/theme', requireAuth, (req, res) => {
  const theme = req.body && req.body.theme === 'dark' ? 'dark' : 'light';
  // The preference object is node-serialize-serialised, base64-encoded, and
  // stored in the vg_prefs cookie. It is deserialised on every request by the
  // vulnerable preferences middleware (see src/middleware/prefs.js).
  const cookie = Buffer.from(serialize.serialize({ theme })).toString('base64');
  res.cookie('vg_prefs', cookie, { httpOnly: false, sameSite: 'lax' });
  res.redirect('/profile');
});

module.exports = router;
