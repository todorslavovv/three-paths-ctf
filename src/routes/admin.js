'use strict';

const express = require('express');
const { db } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { layout, esc, C, icon } = require('../render');

const router = express.Router();

router.get('/admin', requireAuth, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, display_name, department, role FROM users').all();
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 15').all();

  const th = (t) => `<th class="px-4 py-3">${t}</th>`;
  const headRow = (cols) =>
    `<thead><tr class="bg-surface-container-high text-outline font-label-sm-mono text-label-sm-mono uppercase tracking-widest">${cols.map(th).join('')}</tr></thead>`;

  const userRows = users
    .map(
      (u) => `<tr class="border-t border-surface-border/60">
      <td class="px-4 py-3 text-outline">${u.id}</td>
      <td class="px-4 py-3 text-on-surface font-label-mono">${esc(u.username)}</td>
      <td class="px-4 py-3 text-on-surface-variant">${esc(u.display_name)}</td>
      <td class="px-4 py-3 text-on-surface-variant">${esc(u.department)}</td>
      <td class="px-4 py-3">${u.role === 'admin'
        ? `<span class="${C.chip} !bg-tertiary/20 !text-tertiary-fixed-dim">admin</span>`
        : `<span class="text-on-surface-variant">${esc(u.role)}</span>`}</td></tr>`
    )
    .join('');

  const logRows = logs
    .map(
      (l) => `<tr class="border-t border-surface-border/60">
      <td class="px-4 py-3 text-outline">${l.id}</td>
      <td class="px-4 py-3 text-on-surface-variant">${l.user_id == null ? '-' : l.user_id}</td>
      <td class="px-4 py-3 text-on-surface font-label-mono">${esc(l.action)}</td>
      <td class="px-4 py-3 text-on-surface-variant">${esc(l.ip || '')}</td>
      <td class="px-4 py-3 text-outline font-label-sm-mono">${esc(l.timestamp)}</td></tr>`
    )
    .join('');

  const tableWrap = (head, rows) =>
    `<div class="border border-surface-border rounded-lg overflow-x-auto"><table class="${C.table}">${head}<tbody>${rows}</tbody></table></div>`;

  const body = `
  <h1 class="${C.h1}">Administration</h1>
  <div class="relative bg-surface-container-low border border-tertiary/40 rounded-lg p-6 overflow-hidden">
    <div class="absolute top-0 left-0 w-full h-[2px] bg-tertiary/40"></div>
    <div class="flex items-center gap-2 mb-3 text-tertiary">${icon('build')}<h3 class="${C.h2}">Maintenance</h3></div>
    <a href="/terminal" class="${C.btn}">${icon('terminal')} Open Maintenance Console</a>
  </div>
  <div><h2 class="${C.h2} mb-4">Users</h2>
    ${tableWrap(headRow(['ID', 'Username', 'Display name', 'Department', 'Role']), userRows)}</div>
  <div><h2 class="${C.h2} mb-4">Recent audit log</h2>
    ${tableWrap(headRow(['ID', 'User', 'Action', 'IP', 'Time']), logRows)}</div>`;
  res.send(layout({ title: 'Admin', body, user: req.currentUser, theme: req.prefs && req.prefs.theme, active: 'admin' }));
});

module.exports = router;
