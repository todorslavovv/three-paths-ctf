'use strict';

const express = require('express');
const { reply } = require('../chatbot/vaultbot');
const { getFlag } = require('../db');
const { layout } = require('../render');

const router = express.Router();

// Public support assistant (discoverable via web recon — Path 3).
router.get('/assistant', (req, res) => {
  const body = `
  <h1>VaultBot Assistant</h1>
  <p class="muted">Ask VaultBot about VaultGate documents, departments, and the employee directory.</p>
  <div id="chat" class="chat"></div>
  <form id="chatform" class="chatbar">
    <input id="msg" name="message" placeholder="Ask VaultBot…" autocomplete="off" autofocus>
    <button class="btn" type="submit">Send</button>
  </form>
  <script src="/js/assistant.js"></script>`;
  res.send(layout({ title: 'VaultBot', body, user: req.currentUser || null, theme: req.prefs && req.prefs.theme }));
});

router.post('/api/assistant', (req, res) => {
  const message = (req.body && req.body.message) || '';
  const answer = reply(message, getFlag());
  res.json({ reply: answer });
});

module.exports = router;
