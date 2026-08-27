'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

// In-memory database keeps the challenge disposable (Railway-friendly, no
// persistent volume required). Recreated fresh on every boot.
const db = new Database(':memory:');
db.pragma('journal_mode = WAL');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

// The administrator password is intentionally weak and present in
// ctf-wordlist.txt so the brute-force path (Path 1) is practical. It is NOT a
// real person's password. Override with ADMIN_PASSWORD if desired.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'winter2024';

const users = [
  // username, display_name, email, department, role, plaintext_password
  ['j.reyes',       'Jordan Reyes',   'j.reyes@vaultgate.local',   'Operations',     'user',  'Horizon!22'],
  ['s.okafor',      'Sade Okafor',    's.okafor@vaultgate.local',  'Human Resources','user',  'sunflower7'],
  ['m.lindqvist',   'Max Lindqvist',  'm.lindqvist@vaultgate.local','Finance',       'user',  'Gr33nbook'],
  ['administrator', 'VaultGate Administrator', 'admin@vaultgate.local', 'Administration', 'admin', ADMIN_PASSWORD],
  ['t.vasquez',     'Tomas Vasquez',  't.vasquez@vaultgate.local', 'IT',            'user',  'redPanda!9'],
];

const insertUser = db.prepare(
  `INSERT INTO users (username, password_hash, display_name, email, department, role)
   VALUES (@username, @hash, @display_name, @email, @department, @role)`
);

for (const [username, display_name, email, department, role, pw] of users) {
  insertUser.run({
    username,
    hash: bcrypt.hashSync(pw, 10),
    display_name,
    email,
    department,
    role,
  });
}

const documents = [
  {
    title: 'Welcome to VaultGate',
    content:
      'VaultGate is the internal document-management platform for staff. Use the ' +
      'dashboard to browse departmental documents, search the archive, and reach ' +
      'the VaultBot assistant. For access issues contact the IT department.',
    department: 'General',
    classification: 'Public',
    owner_id: 1,
    restricted: 0,
  },
  {
    title: 'Onboarding Checklist',
    content:
      'New starters: confirm your profile details, set a strong passphrase, and ' +
      'review the acceptable-use policy. Accounts follow the first-initial + ' +
      'surname convention (e.g. j.reyes).',
    department: 'Human Resources',
    classification: 'Internal',
    owner_id: 2,
    restricted: 0,
  },
  {
    title: 'Q3 Finance Summary',
    content:
      'Revenue tracked to plan. Expense controls held. Detailed ledgers remain ' +
      'restricted to Finance staff and Administration.',
    department: 'Finance',
    classification: 'Confidential',
    owner_id: 3,
    restricted: 1,
  },
  {
    title: 'IT Maintenance & Access Procedures',
    content:
      'Maintenance access is available to Administration only. The maintenance ' +
      'web console is reachable from the dashboard after administrator sign-in. ' +
      'A local diagnostics service is kept running on the application host for ' +
      'network troubleshooting; it is bound to loopback and must never be ' +
      'exposed externally. Legacy SSH access (administrator@vaultgate) is ' +
      'disabled by default in cloud deployments.',
    department: 'IT',
    classification: 'Restricted',
    owner_id: 5,
    restricted: 1,
  },
  {
    title: 'Security Notes: VaultBot',
    content:
      'The VaultBot assistant can surface indexed company knowledge. It is ' +
      'configured with guardrails so it will not disclose confidential material. ' +
      'Report any assistant behaviour that leaks internal data to the Security ' +
      'team.',
    department: 'Security',
    classification: 'Internal',
    owner_id: 4,
    restricted: 0,
  },
  {
    title: 'Platform Status & Diagnostics',
    content:
      'A lightweight status endpoint (/api/status) reports runtime and dependency ' +
      'versions to assist support. This was enabled during the pilot and has not ' +
      'yet been locked down.',
    department: 'IT',
    classification: 'Internal',
    owner_id: 5,
    restricted: 0,
  },
];

const insertDoc = db.prepare(
  `INSERT INTO documents (title, content, department, classification, owner_id, restricted)
   VALUES (@title, @content, @department, @classification, @owner_id, @restricted)`
);
for (const d of documents) insertDoc.run(d);

// ---------------------------------------------------------------------------
// Secrets (flag) — loaded from the environment, never from source.
// ---------------------------------------------------------------------------
const FLAG = process.env.CTF_FLAG || 'CTF{vaultgate_three_paths_one_flag}';
db.prepare('INSERT INTO secrets (key, value) VALUES (?, ?)').run('ctf_flag', FLAG);

function getFlag() {
  const row = db.prepare('SELECT value FROM secrets WHERE key = ?').get('ctf_flag');
  return row ? row.value : null;
}

// Write the flag to the on-disk location used by the post-exploitation path.
// This is the file the internal-service RCE / reverse shell reads.
function writeFlagFile() {
  const dir = process.env.FLAG_DIR || '/opt/vaultgate/secrets';
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'flag.txt'), FLAG + '\n', { mode: 0o644 });
    return path.join(dir, 'flag.txt');
  } catch (e) {
    // Local (non-container) runs may not be able to write /opt; fall back so
    // the app still boots. Docker runs create the directory in the image.
    const fallback = path.join(require('os').tmpdir(), 'vaultgate-flag.txt');
    fs.writeFileSync(fallback, FLAG + '\n');
    return fallback;
  }
}

module.exports = { db, getFlag, writeFlagFile, FLAG };
