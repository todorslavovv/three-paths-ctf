'use strict';

const { createApp } = require('./app');
const { writeFlagFile, getFlag } = require('./db');
const { startInternalService } = require('./internal/service');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Write the flag to the on-disk post-exploitation location.
const flagPath = writeFlagFile();

// Start the loopback-only vulnerable internal service (Path 1 target).
startInternalService();

// Optional real SSH is intentionally NOT started from Node. It is provided by
// the container (see Dockerfile / docker-compose) only when ENABLE_SSH=true,
// keeping the primary web challenge Railway-compatible.
const app = createApp();
app.listen(PORT, HOST, () => {
  console.log(`VaultGate listening on http://${HOST}:${PORT}`);
  console.log(`[boot] flag loaded from CTF_FLAG (len=${(getFlag() || '').length}), on-disk copy: ${flagPath}`);
  if (process.env.ENABLE_SSH === 'true') {
    console.log('[boot] ENABLE_SSH=true — container SSH service expected (see Dockerfile).');
  }
});
