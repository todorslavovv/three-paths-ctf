'use strict';

// Manual, low-cost connectivity check for VaultBot's real-LLM chat backend.
// Requires OPENCODE_API_KEY. Makes ONE short call.
//
//   OPENCODE_API_KEY=sk-... node tests/llm.js
//   OPENCODE_API_KEY=sk-... VAULTBOT_MODEL=laguna-s-2.1-free node tests/llm.js
//
// Note: the prompt-injection disclosure (Path 3) is handled at the application
// layer, not by the model (see src/routes/assistant.js), so it does not appear
// here — it is covered by tests/smoke.js and works with or without a key.

const { llmReply, enabled, MODEL } = require('../src/chatbot/llm');

(async () => {
  if (!enabled()) {
    console.error('OPENCODE_API_KEY not set — nothing to test. See env.example.');
    process.exit(2);
  }
  console.log('Model:', MODEL);
  try {
    const t0 = Date.now();
    const answer = await llmReply('What is VaultGate and how are employee logins formatted?');
    console.log('\n[reply in ' + ((Date.now() - t0) / 1000).toFixed(1) + 's] >', answer);
    console.log('\nOK — VaultBot chat is live on a real model. Prompt injection is app-level (see tests/smoke.js).');
  } catch (e) {
    console.error('LLM call failed:', e.message);
    console.error('(The app falls back to the deterministic engine on such errors.)');
    process.exit(1);
  }
})();
