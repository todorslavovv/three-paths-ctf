'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { layout, esc, C, icon } = require('../render');

const router = express.Router();

function authShell(title, subtitle, inner) {
  return `
  <div class="w-full max-w-md mx-auto">
    <div class="relative bg-surface-container-low border border-surface-border rounded-lg p-8 overflow-hidden">
      <div class="absolute top-0 left-0 w-full h-[2px] bg-primary/20"></div>
      <div class="absolute top-0 left-0 w-1/3 h-[2px] bg-primary"></div>
      <div class="flex items-center gap-3 mb-1 text-primary">${icon('lock', 'text-2xl')}
        <h1 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">${title}</h1></div>
      <p class="font-label-sm-mono text-label-sm-mono text-outline uppercase tracking-widest mb-6">${subtitle}</p>
      ${inner}
    </div>
  </div>`;
}

function field(label, name, type, value, autocomplete) {
  return `<label class="block">
    <span class="${C.label}">${label}</span>
    <input class="${C.input}" name="${name}" type="${type || 'text'}"${autocomplete ? ` autocomplete="${autocomplete}"` : ''} value="${esc(value || '')}" required>
  </label>`;
}

function loginPage(req, error, username) {
  const alert = error
    ? `<div class="${C.alert} mb-5">${icon('error', 'text-lg')}<span>${esc(error)}</span></div>`
    : '';
  const inner = `
    ${alert}
    <form method="post" action="/login" class="flex flex-col gap-4">
      ${field('Username', 'username', 'text', username, 'username')}
      ${field('Password', 'password', 'password', '', 'current-password')}
      <button class="${C.btn} w-full mt-2" type="submit">${icon('login')} Sign in</button>
    </form>
    <p class="font-label-sm-mono text-label-sm-mono text-outline mt-6 text-center">No account?
      <a href="/register" class="text-primary hover:underline">Register</a></p>`;
  return layout({
    title: 'Sign in',
    body: authShell('Sign in to VaultGate', 'Authorized personnel only', inner),
    user: null,
    theme: req.prefs && req.prefs.theme,
    active: null,
  });
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
  const inner = `
    <form method="post" action="/register" class="flex flex-col gap-4">
      ${field('Username', 'username', 'text', '', 'username')}
      ${field('Display name', 'display_name', 'text', '')}
      ${field('Email', 'email', 'email', '', 'email')}
      ${field('Password', 'password', 'password', '', 'new-password')}
      <button class="${C.btn} w-full mt-2" type="submit">${icon('person_add')} Register</button>
    </form>
    <p class="font-label-sm-mono text-label-sm-mono text-outline mt-6 text-center">Already registered?
      <a href="/login" class="text-primary hover:underline">Sign in</a></p>`;
  res.send(layout({
    title: 'Register',
    body: authShell('Create an account', 'New personnel registration', inner),
    user: null,
    theme: req.prefs && req.prefs.theme,
    active: null,
  }));
});

router.post('/register', (req, res) => {
  const { username, display_name, email, password } = req.body || {};
  if (!username || !password || !display_name || !email) {
    return res.status(400).send('All fields are required');
  }
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(String(username));
  if (exists) {
    const inner = `<div class="${C.alert} mb-5">${icon('error', 'text-lg')}<span>That username is already taken.</span></div>
      <a href="/register" class="${C.btnGhost} w-full">Try again</a>`;
    return res
      .status(409)
      .send(layout({ title: 'Register', body: authShell('Create an account', 'New personnel registration', inner), user: null, theme: req.prefs && req.prefs.theme, active: null }));
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
