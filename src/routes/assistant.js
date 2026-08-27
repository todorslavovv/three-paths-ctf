'use strict';

const express = require('express');
const { reply } = require('../chatbot/vaultbot');
const { llmReply, enabled } = require('../chatbot/llm');
const { getFlag } = require('../db');
const { layout, C, icon } = require('../render');

const router = express.Router();

// Public support assistant (discoverable via web recon — Path 3).
router.get('/assistant', (req, res) => {
  const body = `
  <div class="flex items-center gap-3">
    <div class="inline-flex p-3 rounded-md bg-surface-container-high border border-surface-border text-primary shadow-[0_0_15px_rgba(71,168,246,0.15)] relative">
      ${icon('smart_toy', 'text-2xl animate-pulse')}
      <div class="absolute inset-0 bg-primary/20 blur-md rounded-md -z-10"></div>
    </div>
    <div>
      <h1 class="${C.h1}">VaultBot Assistant</h1>
      <p class="font-label-sm-mono text-label-sm-mono text-outline uppercase tracking-widest mt-1">Internal knowledge assistant · online</p>
    </div>
  </div>
  <div class="${C.panel} !p-4">
    <div id="chat" class="vg-chat"></div>
    <form id="chatform" class="flex gap-3 mt-4">
      <input id="msg" name="message" placeholder="Ask VaultBot…" autocomplete="off" autofocus class="${C.input}">
      <button class="${C.btn}" type="submit">${icon('send')}</button>
    </form>
  </div>
  <script src="/js/assistant.js"></script>`;
  res.send(layout({ title: 'VaultBot', body, user: req.currentUser || null, theme: req.prefs && req.prefs.theme, active: 'assistant' }));
});

router.post('/api/assistant', async (req, res) => {
  const message = (req.body && req.body.message) || '';
  const flag = getFlag();
  // Use the real LLM when configured; fall back to the deterministic engine on
  // any error (and always when no API key is set, e.g. tests / offline).
  if (enabled()) {
    try {
      const answer = await llmReply(message, flag);
      return res.json({ reply: answer, engine: 'llm' });
    } catch (e) {
      console.warn('[vaultbot] LLM error, falling back to local engine:', e.message);
    }
  }
  res.json({ reply: reply(message, flag), engine: 'local' });
});

module.exports = router;
