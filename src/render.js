'use strict';

// Minimal server-side HTML layout. No template engine (YAGNI) — just a tagged
// helper with escaping for untrusted values.
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nav(user) {
  const links = [
    ['/dashboard', 'Dashboard'],
    ['/documents', 'Documents'],
    ['/search', 'Search'],
    ['/assistant', 'VaultBot'],
  ];
  let items = links
    .map(([href, label]) => `<a href="${href}">${label}</a>`)
    .join('');
  if (user && user.role === 'admin') items += '<a href="/admin">Admin</a>';
  const right = user
    ? `<span class="who">${esc(user.display_name)}</span><a class="btn-ghost" href="/logout">Sign out</a>`
    : `<a class="btn-ghost" href="/login">Sign in</a>`;
  return `<header class="nav"><a class="brand" href="/"><span class="logo">▚</span> VaultGate</a>
    <nav>${items}</nav><div class="nav-right">${right}</div></header>`;
}

function layout({ title, body, user, theme }) {
  const t = theme === 'dark' ? 'dark' : 'light';
  return `<!doctype html>
<html lang="en" data-theme="${t}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — VaultGate</title>
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<link rel="stylesheet" href="/css/styles.css">
</head>
<body>
${nav(user)}
<main class="container">
${body}
</main>
<footer class="foot">VaultGate Internal Platform · v1.2.0 · © VaultGate Ltd</footer>
</body>
</html>`;
}

module.exports = { layout, esc, nav };
