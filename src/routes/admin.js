'use strict';

const express = require('express');
const { db } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { layout, esc } = require('../render');

const router = express.Router();

router.get('/admin', requireAuth, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, display_name, department, role FROM users').all();
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 15').all();

  const userRows = users
    .map(
      (u) => `<tr><td>${u.id}</td><td>${esc(u.username)}</td><td>${esc(u.display_name)}</td>
      <td>${esc(u.department)}</td><td>${esc(u.role)}</td></tr>`
    )
    .join('');
  const logRows = logs
    .map(
      (l) => `<tr><td>${l.id}</td><td>${l.user_id == null ? '-' : l.user_id}</td>
      <td>${esc(l.action)}</td><td>${esc(l.ip || '')}</td><td>${esc(l.timestamp)}</td></tr>`
    )
    .join('');

  const body = `
  <h1>Administration</h1>
  <div class="panel warn">
    <h3>Maintenance</h3>
    <p><a class="btn" href="/terminal">Open Maintenance Console</a></p>
  </div>
  <h2>Users</h2>
  <table class="tbl"><thead><tr><th>ID</th><th>Username</th><th>Display name</th><th>Department</th><th>Role</th></tr></thead>
  <tbody>${userRows}</tbody></table>
  <h2>Recent audit log</h2>
  <table class="tbl"><thead><tr><th>ID</th><th>User</th><th>Action</th><th>IP</th><th>Time</th></tr></thead>
  <tbody>${logRows}</tbody></table>`;
  res.send(layout({ title: 'Admin', body, user: req.currentUser, theme: req.prefs && req.prefs.theme }));
});

module.exports = router;
