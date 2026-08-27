'use strict';

const express = require('express');
const serialize = require('node-serialize');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { layout, esc, C, icon } = require('../render');

const router = express.Router();

function classChip(classification) {
  const c = String(classification || '').toLowerCase();
  const danger = c === 'confidential' || c === 'restricted';
  const cls = danger
    ? 'bg-error-container/40 text-error border border-error/40'
    : 'bg-secondary-container text-on-secondary-container';
  return `<span class="px-2 py-1 ${cls} font-label-sm-mono text-label-sm-mono rounded uppercase tracking-widest">${esc(classification)}</span>`;
}

// ---- Landing page (public) ----
router.get('/', (req, res) => {
  const features = [
    ['folder_managed', 'Document Archive', 'Departmental documents for IT, Finance, HR, Security and Operations. Securely stored and classified.', 'CLASS: CONFIDENTIAL', false],
    ['memory', 'VaultBot', 'Internal assistant for finding company knowledge quickly across departmental data silos.', 'AI: ACTIVE', true],
    ['tune', 'Administration', 'Maintenance tooling and audit logging for platform administrators. Monitor system health.', 'REQ: ADMIN_PRIV', false],
  ]
    .map(
      ([ic, title, desc, tag, pulse]) => `
    <div class="${C.card}">
      <div class="absolute top-0 left-0 w-full h-[2px] bg-primary/20"></div>
      <div class="absolute top-0 left-0 w-1/3 h-[2px] bg-primary group-hover:w-full transition-all duration-700 ease-in-out"></div>
      <div class="mb-6 inline-flex p-3 rounded-md bg-surface-container-high border border-surface-border text-primary shadow-[0_0_15px_rgba(71,168,246,0.1)] relative">
        ${icon(ic, 'text-3xl' + (pulse ? ' animate-pulse' : ''))}
        ${pulse ? '<div class="absolute inset-0 bg-primary/20 blur-md rounded-md -z-10"></div>' : ''}
      </div>
      <h3 class="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-3">${title}</h3>
      <p class="font-body-md text-body-md text-on-surface-variant mb-6 flex-grow">${desc}</p>
      <div class="flex items-center gap-2 mt-auto pt-4 border-t border-surface-border/50">
        <span class="${C.chip}">${tag}</span>
      </div>
    </div>`
    )
    .join('');

  const body = `
  <section class="flex flex-col items-center text-center max-w-4xl mx-auto space-y-10">
    <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary shadow-[0_0_10px_rgba(71,168,246,0.1)]">
      <span class="relative flex h-3 w-3">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
        <span class="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
      </span>
      <span class="font-label-sm-mono text-label-sm-mono tracking-widest uppercase">SYSTEM OPERATIONAL</span>
    </div>
    <div class="flex flex-col items-center gap-6">
      <h1 class="font-display-lg text-display-lg text-on-surface tracking-tight">VaultGate</h1>
      <p class="font-body-lg text-body-lg text-on-surface-variant max-w-2xl text-balance">
        The internal document-management and administration platform for VaultGate Ltd.
        Access restricted to authorized personnel only.
      </p>
    </div>
    <div class="flex flex-col sm:flex-row gap-4 pt-4 w-full sm:w-auto justify-center">
      <a href="/login" class="${C.btn} px-8 py-3 w-full sm:w-auto">${icon('login')} Sign In to Vault</a>
      <a href="/assistant" class="${C.btnGhost} px-8 py-3 w-full sm:w-auto">${icon('smart_toy')} Ask VaultBot</a>
    </div>
  </section>
  <section class="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">${features}</section>`;
  res.send(layout({ title: 'Home', body, user: req.currentUser || null, theme: req.prefs && req.prefs.theme, active: null }));
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
      (d) => `<a class="${C.card} !p-6" href="/documents#${d.id}">
        <div class="absolute top-0 left-0 w-1/3 h-[2px] bg-primary group-hover:w-full transition-all duration-700 ease-in-out"></div>
        <span class="font-label-sm-mono text-label-sm-mono text-outline uppercase tracking-widest">${esc(d.department)}</span>
        <h3 class="font-title-md text-title-md text-on-surface mt-2 mb-4">${esc(d.title)}</h3>
        <div class="mt-auto">${classChip(d.classification)}</div>
      </a>`
    )
    .join('');

  let adminPanel = '';
  if (user.role === 'admin') {
    adminPanel = `
    <div class="relative bg-surface-container-low border border-tertiary/40 rounded-lg p-6 overflow-hidden">
      <div class="absolute top-0 left-0 w-full h-[2px] bg-tertiary/40"></div>
      <div class="flex items-center gap-2 mb-3 text-tertiary">${icon('build')}<h3 class="font-title-md text-title-md">Maintenance Access</h3></div>
      <p class="${C.muted} mb-4">Administrator maintenance tooling is available for platform troubleshooting.</p>
      <ul class="space-y-2 font-label-mono text-label-mono">
        <li class="flex items-center gap-2">${icon('terminal', 'text-base text-primary')}<span class="text-on-surface-variant">Web console:</span>
          <a href="/terminal" class="text-primary hover:underline">Open Maintenance Console</a></li>
        <li class="flex items-center gap-2">${icon('key', 'text-base text-primary')}<span class="text-on-surface-variant">Legacy SSH:</span>
          <code class="text-tertiary-fixed-dim">administrator@vaultgate</code> <span class="text-outline">(disabled by default in cloud)</span></li>
      </ul>
    </div>`;
  }

  const body = `
  <div>
    <h1 class="${C.h1}">Welcome, ${esc(user.display_name)}</h1>
    <p class="font-label-mono text-label-mono text-outline mt-1 uppercase tracking-widest">${esc(user.department)} · ${esc(user.role)}</p>
  </div>
  ${adminPanel}
  <div>
    <h2 class="${C.h2} mb-4">Recent documents</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">${cards}</div>
  </div>`;
  res.send(layout({ title: 'Dashboard', body, user, theme: req.prefs && req.prefs.theme, active: 'dashboard' }));
});

// ---- Documents (auth) ----
router.get('/documents', requireAuth, (req, res) => {
  const isAdmin = req.currentUser.role === 'admin';
  const docs = isAdmin
    ? db.prepare('SELECT * FROM documents').all()
    : db.prepare('SELECT * FROM documents WHERE restricted = 0').all();
  const items = docs
    .map(
      (d) => `<article id="${d.id}" class="${C.panel} scroll-mt-24">
      <div class="flex items-start justify-between gap-4 mb-2">
        <h3 class="font-title-md text-title-md text-on-surface">${esc(d.title)}</h3>
        ${classChip(d.classification)}
      </div>
      <p class="font-label-sm-mono text-label-sm-mono text-outline uppercase tracking-widest mb-3">${esc(d.department)}${d.restricted ? ' · Restricted' : ''}</p>
      <p class="${C.muted}">${esc(d.content)}</p>
    </article>`
    )
    .join('');
  const body = `<h1 class="${C.h1}">Documents</h1><div class="flex flex-col gap-5">${items}</div>`;
  res.send(layout({ title: 'Documents', body, user: req.currentUser, theme: req.prefs && req.prefs.theme, active: 'documents' }));
});

// ---- Profile (auth) — sets the vg_prefs cookie (Path 2 sink origin) ----
router.get('/profile', requireAuth, (req, res) => {
  const u = req.currentUser;
  const theme = (req.prefs && req.prefs.theme) || 'light';
  const row = (label, value) =>
    `<li class="flex justify-between gap-4 py-2 border-b border-surface-border/60">
      <span class="font-label-mono text-label-mono text-outline uppercase tracking-wide">${label}</span>
      <span class="text-on-surface">${value}</span></li>`;
  const body = `
  <h1 class="${C.h1}">Your profile</h1>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="${C.panel}">
      <ul>
        ${row('Username', esc(u.username))}
        ${row('Display name', esc(u.display_name))}
        ${row('Email', esc(u.email))}
        ${row('Department', esc(u.department))}
        ${row('Role', esc(u.role))}
      </ul>
    </div>
    <div class="${C.panel}">
      <h3 class="${C.h2} mb-4">Preferences</h3>
      <form method="post" action="/profile/theme" class="flex items-end gap-3 flex-wrap">
        <label class="flex-1 min-w-[160px]">
          <span class="${C.label}">Theme</span>
          <select name="theme" class="${C.input}">
            <option value="light" ${theme === 'light' ? 'selected' : ''}>Light</option>
            <option value="dark" ${theme === 'dark' ? 'selected' : ''}>Dark</option>
          </select>
        </label>
        <button class="${C.btn}" type="submit">Save</button>
      </form>
      <p class="font-label-sm-mono text-label-sm-mono text-outline mt-3">Preferences are stored in your browser (vg_prefs cookie).</p>
    </div>
  </div>`;
  res.send(layout({ title: 'Profile', body, user: u, theme, active: null }));
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
