'use strict';

const path = require('path');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const { db } = require('./db');
const { loadPrefs } = require('./middleware/prefs');

const pages = require('./routes/pages');
const auth = require('./routes/auth');
const api = require('./routes/api');
const search = require('./routes/search');
const assistant = require('./routes/assistant');
const terminal = require('./routes/terminal');
const admin = require('./routes/admin');

function createApp() {
  const app = express();

  // Behind Railway/NGINX etc. — needed for a sensible req.ip in audit logs.
  app.set('trust proxy', 1);
  app.disable('etag');

  // Fingerprintable server header (intentional, for header-analysis lessons).
  app.use((req, res, next) => {
    res.setHeader('Server', 'VaultGate/1.2.0');
    next();
  });

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(cookieParser());

  app.use(
    session({
      name: 'vg_sid',
      secret: process.env.SESSION_SECRET || 'vaultgate-dev-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 },
    })
  );

  // Vulnerable preferences loader (Path 2 sink). Runs on every request.
  app.use(loadPrefs);

  // Attach the current user object for rendering (safe, parameterised).
  app.use((req, res, next) => {
    if (req.session && req.session.userId) {
      req.currentUser = db
        .prepare('SELECT id, username, display_name, email, department, role FROM users WHERE id = ?')
        .get(req.session.userId) || null;
    } else {
      req.currentUser = null;
    }
    next();
  });

  // Static assets — ONLY the public directory is ever served.
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Routes
  app.use('/', pages);
  app.use('/', auth);
  app.use('/', search);
  app.use('/', assistant);
  app.use('/', terminal);
  app.use('/', admin);
  app.use('/api', api);

  // 404
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    res.status(404).type('text/plain').send('404 Not Found');
  });

  return app;
}

module.exports = { createApp };
