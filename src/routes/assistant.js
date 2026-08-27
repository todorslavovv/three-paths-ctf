'use strict';

const express = require('express');
const { reply, isInjection } = require('../chatbot/vaultbot');
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

  // Path 3 — application-level prompt injection. The app fails to isolate its
  // instructions from user input: an override-style message causes disclosure.
  // Handled server-side (not by the model) so the path is reliably solvable and
  // the flag is never sent to the LLM provider.
  if (isInjection(message)) {
    return res.json({ reply: reply(message, flag), engine: 'local' });
  }

  // Normal conversation → real LLM when configured; otherwise the deterministic
  // engine (tests / offline). Fall back to deterministic on any LLM error.
  if (enabled()) {
    try {
      const answer = await llmReply(message);
      return res.json({ reply: answer, engine: 'llm' });
    } catch (e) {
      console.warn('[vaultbot] LLM error, falling back to local engine:', e.message);
    }
  }
  res.json({ reply: reply(message, flag), engine: 'local' });
});

module.exports = router;
