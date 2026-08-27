'use strict';

const http = require('http');

// -----------------------------------------------------------------------------
// Simulated restricted maintenance shell.
//
// This is a *fully virtual* filesystem and command set. It performs NO real
// host command execution — it only returns canned/computed strings. Its role in
// Path 1 is enumeration and pivoting: from here the player discovers the
// loopback-only diagnostics service on 127.0.0.1:8080 and reaches it with the
// (real) `curl` command. The actual code execution + flag read happens on the
// internal service, not here.
//
// The real flag file exists on disk but is owned by root; in this simulated
// low-privilege shell it reads back as "Permission denied", forcing the pivot.
// -----------------------------------------------------------------------------

const INTERNAL_PORT = Number(process.env.INTERNAL_DIAG_PORT || 8080);

// Virtual filesystem: path -> { type, content?, mode, owner }
const FS = {
  '/': { type: 'dir', entries: ['home', 'opt', 'etc', 'var', 'usr', 'tmp'] },
  '/home': { type: 'dir', entries: ['svc-maint'] },
  '/home/svc-maint': { type: 'dir', entries: ['.bashrc', 'README.txt'] },
  '/home/svc-maint/.bashrc': { type: 'file', content: '# maintenance service account\nexport PS1="\\u@\\h:\\w$ "\n' },
  '/home/svc-maint/README.txt': {
    type: 'file',
    content:
      'Maintenance account (svc-maint).\n' +
      'This restricted console is for network troubleshooting only.\n' +
      'The local diagnostics service listens on loopback; check ss -lntp.\n',
  },
  '/opt': { type: 'dir', entries: ['vaultgate'] },
  '/opt/vaultgate': { type: 'dir', entries: ['app', 'diagnostics', 'secrets', 'config.env'] },
  '/opt/vaultgate/config.env': {
    type: 'file',
    content:
      'NODE_ENV=production\n' +
      'PORT=3000\n' +
      'INTERNAL_DIAG_PORT=' + INTERNAL_PORT + '\n' +
      '# diagnostics service is loopback-only: http://127.0.0.1:' + INTERNAL_PORT + '/\n',
  },
  '/opt/vaultgate/app': { type: 'dir', entries: ['server.js'] },
  '/opt/vaultgate/app/server.js': { type: 'file', content: '// VaultGate web application entrypoint (see repository source).\n' },
  '/opt/vaultgate/diagnostics': { type: 'dir', entries: ['diag-service.js'] },
  '/opt/vaultgate/diagnostics/diag-service.js': {
    type: 'file',
    content:
      '// VaultGate Diagnostics Service v1.2 (loopback only)\n' +
      '// GET /api/diag?host=<host>  ->  runs a connectivity check\n',
  },
  // Secrets directory is root-owned; svc-maint cannot read it.
  '/opt/vaultgate/secrets': { type: 'dir', entries: ['flag.txt'], mode: 'rwx------', owner: 'root', denied: true },
  '/opt/vaultgate/secrets/flag.txt': { type: 'file', owner: 'root', denied: true },
  '/etc': { type: 'dir', entries: ['hostname', 'hosts', 'passwd'] },
  '/etc/hostname': { type: 'file', content: 'vaultgate-app\n' },
  '/etc/hosts': { type: 'file', content: '127.0.0.1\tlocalhost\n127.0.0.1\tvaultgate-app\n' },
  '/etc/passwd': {
    type: 'file',
    content:
      'root:x:0:0:root:/root:/bin/bash\n' +
      'svc-maint:x:1001:1001:VaultGate Maintenance:/home/svc-maint:/bin/bash\n',
  },
  '/var': { type: 'dir', entries: ['log'] },
  '/var/log': { type: 'dir', entries: [] },
  '/usr': { type: 'dir', entries: ['bin'] },
  '/usr/bin': { type: 'dir', entries: [] },
  '/tmp': { type: 'dir', entries: [] },
};

function normalize(cwd, arg) {
  if (!arg) return cwd;
  let p = arg.startsWith('/') ? arg : (cwd === '/' ? '/' + arg : cwd + '/' + arg);
  const parts = [];
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') { parts.pop(); continue; }
    parts.push(seg);
  }
  return '/' + parts.join('/');
}

function lsLine(name, node) {
  const isDir = node && node.type === 'dir';
  const mode = (node && node.mode) || (isDir ? 'rwxr-xr-x' : 'rw-r--r--');
  const owner = (node && node.owner) || 'svc-maint';
  const perms = (isDir ? 'd' : '-') + mode;
  return `${perms} 1 ${owner} ${owner}  4096 Jan 01 00:00 ${name}`;
}

function curlInternal(url) {
  return new Promise((resolve) => {
    // Only loopback to the diagnostics port is reachable from this console.
    const m = url.match(/^https?:\/\/(127\.0\.0\.1|localhost)(?::(\d+))?(\/.*)?$/i);
    if (!m) {
      return resolve(`curl: (7) Failed to connect: only the local diagnostics service is reachable from this console`);
    }
    const port = m[2] ? Number(m[2]) : 80;
    // Encode spaces so a pasted injection payload forms a valid request line;
    // other characters (';', '%26', '%3E', ...) pass through as typed.
    const path = (m[3] || '/').replace(/ /g, '%20');
    if (port !== INTERNAL_PORT) {
      return resolve(`curl: (7) Failed to connect to ${m[1]} port ${port}: Connection refused`);
    }
    const req = http.get({ host: '127.0.0.1', port: INTERNAL_PORT, path }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
    });
    req.on('error', (e) => resolve(`curl: (7) ${e.message}`));
    req.setTimeout(8000, () => { req.destroy(); resolve('curl: (28) Operation timed out'); });
  });
}

// state: { cwd }
async function run(cmdline, state) {
  const line = String(cmdline || '').trim();
  if (!line) return '';
  const argv = line.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g).map((s) => s.replace(/^['"]|['"]$/g, ''));
  const cmd = argv[0];
  const args = argv.slice(1);
  const flags = args.filter((a) => a.startsWith('-'));
  const rest = args.filter((a) => !a.startsWith('-'));
  const cwd = state.cwd || '/home/svc-maint';

  switch (cmd) {
    case 'help':
      return 'Available: whoami id pwd hostname env ls cat grep find ps ss ip curl cd clear help';
    case 'whoami':
      return 'svc-maint';
    case 'id':
      return 'uid=1001(svc-maint) gid=1001(svc-maint) groups=1001(svc-maint)';
    case 'hostname':
      return 'vaultgate-app';
    case 'pwd':
      return cwd;
    case 'env':
      return [
        'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
        'HOSTNAME=vaultgate-app',
        'HOME=/home/svc-maint',
        'USER=svc-maint',
        'NODE_ENV=production',
        'PORT=3000',
        'INTERNAL_DIAG_PORT=' + INTERNAL_PORT,
      ].join('\n');
    case 'cd': {
      const target = normalize(cwd, rest[0] || '/home/svc-maint');
      const node = FS[target];
      if (!node) return `cd: ${rest[0]}: No such file or directory`;
      if (node.type !== 'dir') return `cd: ${rest[0]}: Not a directory`;
      state.cwd = target;
      return '';
    }
    case 'ls': {
      const target = normalize(cwd, rest[0] || cwd);
      const node = FS[target];
      if (!node) return `ls: cannot access '${rest[0] || target}': No such file or directory`;
      if (node.denied) return `ls: cannot open directory '${rest[0] || target}': Permission denied`;
      if (node.type === 'file') return target.split('/').pop();
      const long = flags.some((f) => f.includes('l'));
      const entries = node.entries.slice();
      if (long) {
        const lines = ['total ' + entries.length];
        lines.push(lsLine('.', node));
        lines.push(lsLine('..', FS['/']));
        for (const e of entries) {
          const child = FS[normalize(target, e)];
          lines.push(lsLine(e, child));
        }
        return lines.join('\n');
      }
      return entries.join('  ');
    }
    case 'cat': {
      if (!rest.length) return 'cat: missing operand';
      const target = normalize(cwd, rest[0]);
      const node = FS[target];
      if (!node) return `cat: ${rest[0]}: No such file or directory`;
      if (node.denied) return `cat: ${rest[0]}: Permission denied`;
      if (node.type === 'dir') return `cat: ${rest[0]}: Is a directory`;
      return node.content || '';
    }
    case 'grep': {
      if (rest.length < 2) return 'usage: grep PATTERN FILE';
      const pattern = rest[0];
      const target = normalize(cwd, rest[1]);
      const node = FS[target];
      if (!node || node.type !== 'file') return `grep: ${rest[1]}: No such file`;
      if (node.denied) return `grep: ${rest[1]}: Permission denied`;
      return (node.content || '')
        .split('\n')
        .filter((l) => l.toLowerCase().includes(pattern.toLowerCase()))
        .join('\n');
    }
    case 'find': {
      const base = normalize(cwd, rest[0] || cwd);
      const nameIdx = args.indexOf('-name');
      const namePat = nameIdx >= 0 ? args[nameIdx + 1] : null;
      const out = [];
      for (const p of Object.keys(FS)) {
        if (p === base || p.startsWith(base === '/' ? '/' : base + '/')) {
          // Do not descend into denied directories.
          const parent = p.substring(0, p.lastIndexOf('/')) || '/';
          if (FS[parent] && FS[parent].denied && p !== parent) continue;
          if (namePat) {
            const nm = p.split('/').pop();
            const re = new RegExp('^' + namePat.replace(/[.]/g, '\\.').replace(/\*/g, '.*') + '$');
            if (!re.test(nm)) continue;
          }
          out.push(p);
        }
      }
      return out.sort().join('\n');
    }
    case 'ps': {
      return [
        '  PID TTY          TIME CMD',
        '    1 ?        00:00:01 node /opt/vaultgate/app/server.js',
        '   28 ?        00:00:00 node /opt/vaultgate/diagnostics/diag-service.js',
        '   44 pts/0    00:00:00 bash',
        '   57 pts/0    00:00:00 ps',
      ].join('\n');
    }
    case 'ss': {
      return [
        'State   Recv-Q  Send-Q   Local Address:Port    Peer Address:Port  Process',
        'LISTEN  0       511            0.0.0.0:3000         0.0.0.0:*      users:(("node",pid=1,fd=18))',
        'LISTEN  0       511          127.0.0.1:' + INTERNAL_PORT + '        0.0.0.0:*      users:(("node",pid=28,fd=18))',
      ].join('\n');
    }
    case 'ip': {
      return [
        '1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN',
        '    inet 127.0.0.1/8 scope host lo',
        '2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP',
        '    inet 172.18.0.2/16 brd 172.18.255.255 scope global eth0',
      ].join('\n');
    }
    case 'curl': {
      const url = rest[0];
      if (!url) return 'curl: try \'curl http://127.0.0.1:' + INTERNAL_PORT + '/\'';
      return await curlInternal(url);
    }
    case 'clear':
      return '__CLEAR__';
    default:
      return `${cmd}: command not found`;
  }
}

module.exports = { run, INTERNAL_PORT };
