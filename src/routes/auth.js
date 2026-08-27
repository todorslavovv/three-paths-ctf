'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { layout, esc } = require('../render');

const router = express.Router();

function loginPage(req, error, username) {
  const body = `
  <div class="auth-card">
    <h1>Sign in to VaultGate</h1>
    <p class="muted">Use your corporate account.</p>
    ${error ? `<div class="alert">${esc(error)}</div>` : ''}
    <form method="post" action="/login" class="form">
      <label>Username<input name="username" autocomplete="username" value="${esc(username || '')}" required></label>
      <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
      <button class="btn" type="submit">Sign in</button>
    </form>
    <p class="muted small">No account? <a href="/register">Register</a></p>
  </div>`;
  return layout({ title: 'Sign in', body, user: null, theme: req.prefs && req.prefs.theme });
}

router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.send(loginPage(req, null, ''));
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username || ''));

  // INTENTIONAL user-enumeration weakness: the response distinguishes an
  // unknown username from a valid username with the wrong password.
  if (!user) {
    return res.status(401).send(loginPage(req, 'Unknown username', username));
  }
  if (!bcrypt.compareSync(String(password || ''), user.password_hash)) {
    db.prepare('INSERT INTO audit_logs (user_id, action, ip) VALUES (?,?,?)')
      .run(user.id, 'login_failed', req.ip);
    return res.status(401).send(loginPage(req, 'Incorrect password', username));
  }

  req.session.userId = user.id;
  req.session.role = user.role;
  req.session.username = user.username;
  db.prepare('INSERT INTO audit_logs (user_id, action, ip) VALUES (?,?,?)')
    .run(user.id, 'login_success', req.ip);
  res.redirect('/dashboard');
});

router.get('/register', (req, res) => {
  const body = `
  <div class="auth-card">
    <h1>Create an account</h1>
    <form method="post" action="/register" class="form">
      <label>Username<input name="username" required></label>
      <label>Display name<input name="display_name" required></label>
      <label>Email<input name="email" type="email" required></label>
      <label>Password<input name="password" type="password" required></label>
      <button class="btn" type="submit">Register</button>
    </form>
    <p class="muted small">Already registered? <a href="/login">Sign in</a></p>
  </div>`;
  res.send(layout({ title: 'Register', body, user: null, theme: req.prefs && req.prefs.theme }));
});

router.post('/register', (req, res) => {
  const { username, display_name, email, password } = req.body || {};
  if (!username || !password || !display_name || !email) {
    return res.status(400).send('All fields are required');
  }
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(String(username));
  if (exists) {
    const body = `<div class="auth-card"><h1>Create an account</h1>
      <div class="alert">That username is already taken.</div>
      <p><a href="/register">Try again</a></p></div>`;
    return res.status(409).send(layout({ title: 'Register', body, user: null, theme: req.prefs && req.prefs.theme }));
  }
  const info = db.prepare(
    `INSERT INTO users (username, password_hash, display_name, email, department, role)
     VALUES (?,?,?,?, 'General', 'user')`
  ).run(String(username), bcrypt.hashSync(String(password), 10), String(display_name), String(email));
  req.session.userId = info.lastInsertRowid;
  req.session.role = 'user';
  req.session.username = String(username);
  res.redirect('/dashboard');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
