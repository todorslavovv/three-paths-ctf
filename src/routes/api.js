'use strict';

const express = require('express');
const path = require('path');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// INTENTIONAL information disclosure (IDOR-style) — Path 1 username discovery.
// No authentication required; enumerable integer ids. Password material is NOT
// returned, but usernames/emails/roles are — enough to seed brute force.
// ---------------------------------------------------------------------------
router.get('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const user = db
    .prepare('SELECT id, username, display_name, email, department, role FROM users WHERE id = ?')
    .get(id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    email: user.email,
    department: user.department,
    role: user.role,
  });
});

// ---------------------------------------------------------------------------
// INTENTIONAL over-sharing status endpoint — Path 2 version identification.
// Leaks dependency versions, including node-serialize 0.0.4 (CVE-2017-5941).
// ---------------------------------------------------------------------------
router.get('/status', (req, res) => {
  let deps = {};
  try {
    deps = require(path.join(__dirname, '..', '..', 'package.json')).dependencies || {};
  } catch (e) { /* ignore */ }
  res.json({
    service: 'VaultGate',
    status: 'ok',
    version: '1.2.0',
    runtime: 'node ' + process.version,
    environment: process.env.NODE_ENV || 'production',
    dependencies: {
      express: deps.express || 'unknown',
      'express-session': deps['express-session'] || 'unknown',
      'better-sqlite3': deps['better-sqlite3'] || 'unknown',
      bcryptjs: deps.bcryptjs || 'unknown',
      // Preferences engine used for the vg_prefs cookie.
      'node-serialize': deps['node-serialize'] || 'unknown',
    },
    notes: 'Client theme preferences are restored from the vg_prefs cookie via the preferences engine.',
  });
});

// Authenticated document listing (safe, parameterised).
router.get('/documents', requireAuth, (req, res) => {
  const isAdmin = req.session.role === 'admin';
  const rows = isAdmin
    ? db.prepare('SELECT id, title, department, classification, restricted FROM documents').all()
    : db.prepare('SELECT id, title, department, classification, restricted FROM documents WHERE restricted = 0').all();
  res.json({ documents: rows });
});

module.exports = router;
