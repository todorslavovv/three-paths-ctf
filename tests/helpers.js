'use strict';

const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');

function request(opts) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: opts.host || '127.0.0.1',
        port: opts.port,
        method: opts.method || 'GET',
        path: opts.path,
        headers: opts.headers || {},
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body,
            cookies: res.headers['set-cookie'] || [],
          })
        );
      }
    );
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function form(obj) {
  return Object.entries(obj)
    .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
    .join('&');
}

function cookieHeader(cookies) {
  return (cookies || []).map((c) => c.split(';')[0]).join('; ');
}

async function waitForServer(port, timeoutMs) {
  const deadline = Date.now() + (timeoutMs || 15000);
  while (Date.now() < deadline) {
    try {
      const r = await request({ port, path: '/' });
      if (r.status) return true;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error('server did not start within timeout');
}

function spawnServer(env) {
  const child = spawn('node', ['src/server.js'], {
    cwd: ROOT,
    env: Object.assign({}, process.env, env),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => process.env.VG_TEST_VERBOSE && process.stdout.write('[srv] ' + d));
  child.stderr.on('data', (d) => process.stderr.write('[srv-err] ' + d));
  return child;
}

// Tiny assertion helpers with a running tally.
const state = { pass: 0, fail: 0 };
function ok(cond, label) {
  if (cond) {
    state.pass++;
    console.log('  \x1b[32mPASS\x1b[0m ' + label);
  } else {
    state.fail++;
    console.log('  \x1b[31mFAIL\x1b[0m ' + label);
  }
}
function summary() {
  console.log(`\n${state.pass} passed, ${state.fail} failed`);
  return state.fail === 0;
}

module.exports = { request, form, cookieHeader, waitForServer, spawnServer, ok, summary, ROOT };
