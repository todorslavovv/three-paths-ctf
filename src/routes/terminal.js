'use strict';

const express = require('express');
const { run } = require('../terminal/vfs');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { layout } = require('../render');

const router = express.Router();

// Maintenance web console — administrator only (reached after Path 1 brute
// force). A simulated restricted shell; see src/terminal/vfs.js.
router.get('/terminal', requireAuth, requireAdmin, (req, res) => {
  const body = `
  <h1>Maintenance Console</h1>
  <p class="muted">Restricted troubleshooting shell (svc-maint@vaultgate-app). Type <code>help</code> for commands.</p>
  <div id="term" class="terminal" tabindex="0"></div>
  <script src="/js/terminal.js"></script>`;
  res.send(layout({ title: 'Maintenance Console', body, user: req.currentUser || null, theme: req.prefs && req.prefs.theme }));
});

router.post('/api/terminal', requireAuth, requireAdmin, async (req, res) => {
  const cmd = (req.body && req.body.command) || '';
  if (!req.session.term) req.session.term = { cwd: '/home/svc-maint' };
  const state = req.session.term;
  try {
    const output = await run(cmd, state);
    req.session.term = state;
    res.json({ output, cwd: state.cwd });
  } catch (e) {
    res.json({ output: 'error: ' + e.message, cwd: state.cwd });
  }
});

module.exports = router;
