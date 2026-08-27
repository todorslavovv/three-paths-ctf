'use strict';

// ---------------------------------------------------------------------------
// Resolve ports BEFORE requiring anything that reads them at module load time
// (app -> routes -> terminal/vfs, and internal/service both read
// INTERNAL_DIAG_PORT on require). Railway assigns PORT (often 8080), which is
// also the internal service's default -> collision. Guarantee they differ.
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT || 3000);
if (!process.env.INTERNAL_DIAG_PORT) process.env.INTERNAL_DIAG_PORT = '8080';
if (Number(process.env.INTERNAL_DIAG_PORT) === PORT) {
  // Web port and diagnostics port clash (e.g. Railway PORT=8080). Shift the
  // loopback diagnostics service so the primary web challenge always boots.
  process.env.INTERNAL_DIAG_PORT = String(PORT === 8080 ? 8079 : PORT + 1);
}

const { createApp } = require('./app');
const { writeFlagFile, getFlag } = require('./db');
const { startInternalService } = require('./internal/service');

const HOST = '0.0.0.0';

// Write the flag to the on-disk post-exploitation location.
const flagPath = writeFlagFile();

// Start the loopback-only vulnerable internal service (Path 1 target). It fails
// soft: a diagnostics bind error must never take down the web challenge.
startInternalService();

// Optional real SSH is intentionally NOT started from Node. It is provided by
// the container (see Dockerfile / docker-compose) only when ENABLE_SSH=true,
// keeping the primary web challenge Railway-compatible.
const app = createApp();
app.listen(PORT, HOST, () => {
  console.log(`VaultGate listening on http://${HOST}:${PORT}`);
  console.log(`[boot] internal diagnostics port: ${process.env.INTERNAL_DIAG_PORT} (loopback only)`);
  console.log(`[boot] flag loaded from CTF_FLAG (len=${(getFlag() || '').length}), on-disk copy: ${flagPath}`);
  if (process.env.OPENCODE_API_KEY) {
    console.log(`[boot] VaultBot LLM backend ENABLED (model=${process.env.VAULTBOT_MODEL || 'laguna-s-2.1-free'}).`);
  } else {
    console.log('[boot] VaultBot LLM backend disabled (OPENCODE_API_KEY not set) — using deterministic engine.');
  }
  if (process.env.ENABLE_SSH === 'true') {
    console.log('[boot] ENABLE_SSH=true — container SSH service expected (see Dockerfile).');
  }
});
