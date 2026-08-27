'use strict';

const express = require('express');
const { run } = require('../terminal/vfs');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { layout, C, icon } = require('../render');

const router = express.Router();

// Maintenance web console — administrator only (reached after Path 1 brute
// force). A simulated restricted shell; see src/terminal/vfs.js.
router.get('/terminal', requireAuth, requireAdmin, (req, res) => {
  const body = `
  <div class="flex items-center gap-3 text-tertiary">
    ${icon('terminal', 'text-2xl')}
    <h1 class="${C.h1} !text-tertiary-fixed-dim">Maintenance Console</h1>
  </div>
  <p class="font-label-mono text-label-mono text-outline">Restricted troubleshooting shell
    <span class="text-primary">svc-maint@vaultgate-app</span>. Type <code class="text-primary">help</code> for commands.</p>
  <div class="relative">
    <div class="absolute -top-px left-0 right-0 h-[2px] bg-tertiary/40 rounded-t"></div>
    <div id="term" class="vg-term" tabindex="0"></div>
  </div>
  <script src="/js/terminal.js"></script>`;
  res.send(layout({ title: 'Maintenance Console', body, user: req.currentUser || null, theme: req.prefs && req.prefs.theme, active: null }));
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
