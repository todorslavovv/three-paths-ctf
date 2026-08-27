'use strict';

const http = require('http');
const url = require('url');
const { exec } = require('child_process');

// -----------------------------------------------------------------------------
// INTENTIONALLY VULNERABLE internal diagnostics service — Path 1 exploitation.
//
// Bound to loopback (127.0.0.1) only, so it is NOT reachable from outside the
// container. The player must pivot to it via the simulated maintenance console
// (src/terminal/vfs.js `curl`). It runs a "connectivity check" by passing the
// `host` parameter straight into a shell — classic OS command injection.
//
// Exploitation is contained inside the disposable container: no privileged
// mode, no host mounts, no socket mounts. The reverse shell / flag read all
// terminate inside this environment.
// -----------------------------------------------------------------------------

const INTERNAL_PORT = Number(process.env.INTERNAL_DIAG_PORT || 8080);

function startInternalService() {
  const server = http.createServer((req, res) => {
    const parsed = url.parse(req.url, true);

    if (parsed.pathname === '/' || parsed.pathname === '') {
      res.writeHead(200, { 'Content-Type': 'text/plain', 'Server': 'VaultGate-Diag/1.2' });
      res.end(
        'VaultGate Diagnostics Service v1.2\n' +
        'Internal use only (loopback).\n\n' +
        'Endpoints:\n' +
        '  GET /              this banner\n' +
        '  GET /api/diag?host=<host>   run a connectivity check against <host>\n'
      );
      return;
    }

    if (parsed.pathname === '/api/diag') {
      const host = parsed.query.host || '127.0.0.1';
      // VULNERABLE: user input concatenated into a shell command.
      const command = 'ping -c 1 -W 2 ' + host;
      exec(command, { timeout: 15000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
        res.writeHead(200, { 'Content-Type': 'text/plain', 'Server': 'VaultGate-Diag/1.2' });
        res.end(
          'VaultGate Diagnostics — connectivity check\n' +
          'command: ' + command + '\n' +
          '----------------------------------------\n' +
          (stdout || '') +
          (stderr ? '\n[stderr]\n' + stderr : '') +
          (err && !stdout && !stderr ? '\n[error] ' + err.message : '')
        );
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found\n');
  });

  // Loopback bind — never expose externally.
  server.listen(INTERNAL_PORT, '127.0.0.1', () => {
    console.log(`[internal] diagnostics service on http://127.0.0.1:${INTERNAL_PORT} (loopback only)`);
  });
  return server;
}

module.exports = { startInternalService, INTERNAL_PORT };
