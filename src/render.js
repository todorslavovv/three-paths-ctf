'use strict';

// Server-side HTML layout for VaultGate — dark "secure terminal" theme built on
// the Tailwind CDN. No template engine (YAGNI): a tagged helper plus escaping.
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Reusable utility-class bundles so routes stay concise and consistent.
const C = {
  btn:
    'inline-flex items-center justify-center gap-2 bg-primary-container text-[#000000] px-6 py-2.5 rounded font-label-mono text-label-mono font-bold hover:opacity-90 active:scale-95 transition-all shadow-[0_0_15px_rgba(71,168,246,0.3)]',
  btnGhost:
    'inline-flex items-center justify-center gap-2 bg-transparent text-primary border border-primary px-6 py-2.5 rounded font-label-mono text-label-mono font-bold hover:bg-primary/10 active:scale-95 transition-all',
  card:
    'group relative flex flex-col bg-surface-container-low border border-surface-border rounded-lg p-8 overflow-hidden hover:border-primary/50 transition-colors duration-300',
  panel: 'bg-surface-container-low border border-surface-border rounded-lg p-6',
  input:
    'w-full bg-surface-container-lowest border border-surface-border rounded px-3.5 py-2.5 text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors',
  label: 'block text-on-surface-variant font-label-mono text-label-mono mb-1.5 uppercase tracking-wide',
  h1: 'font-headline-lg text-headline-lg text-on-surface tracking-tight',
  h2: 'font-title-md text-title-md text-on-surface',
  muted: 'text-on-surface-variant font-body-md',
  alert: 'bg-error-container/40 border border-error/40 text-error rounded px-4 py-3 font-body-md flex items-center gap-2',
  chip: 'px-2 py-1 bg-secondary-container text-on-secondary-container font-label-sm-mono text-label-sm-mono rounded uppercase tracking-widest',
  table:
    'w-full text-left border-collapse',
};

function icon(name, extra) {
  return `<span class="material-symbols-outlined${extra ? ' ' + extra : ''}">${name}</span>`;
}

const NAV_LINKS = [
  ['dashboard', '/dashboard', 'Dashboard'],
  ['documents', '/documents', 'Documents'],
  ['search', '/search', 'Search'],
  ['assistant', '/assistant', 'VaultBot'],
];

function desktopNav(active, user) {
  let links = NAV_LINKS.slice();
  if (user && user.role === 'admin') links.push(['admin', '/admin', 'Admin']);
  return links
    .map(([key, href, label]) => {
      const on = key === active;
      const cls = on
        ? 'text-primary border-b-2 border-primary font-bold'
        : 'text-on-surface-variant font-medium hover:text-primary-container transition-colors duration-200 border-b-2 border-transparent';
      return `<a class="h-full flex items-center px-2 ${cls}" href="${href}">${label}</a>`;
    })
    .join('');
}

function mobileNav(active, user) {
  let links = NAV_LINKS.slice();
  if (user && user.role === 'admin') links.push(['admin', '/admin', 'Admin']);
  return links
    .map(([key, href, label]) => {
      const cls = key === active ? 'text-primary font-bold' : 'text-on-surface-variant';
      return `<a class="font-title-md text-title-md ${cls}" href="${href}">${label}</a>`;
    })
    .join('');
}

function headerRight(user) {
  if (user) {
    return `
      <div class="flex items-center gap-3">
        <a href="/profile" class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded bg-surface-container-lowest border border-surface-border text-on-surface-variant hover:text-primary-container transition-colors" title="Profile">
          ${icon('account_circle')}
          <span class="font-label-mono text-label-mono">${esc(user.display_name)}</span>
        </a>
        <a href="/logout" class="${C.btnGhost} !px-4 !py-2 hidden sm:inline-flex">Sign out</a>
      </div>`;
  }
  return `<a href="/login" class="${C.btn} hidden sm:inline-flex">Sign In</a>`;
}

function layout({ title, body, user, theme, active }) {
  const t = theme === 'light' ? 'light' : 'dark';
  return `<!DOCTYPE html>
<html class="dark" lang="en" data-theme="${t}">
<head>
<meta charset="utf-8">
<meta content="width=device-width, initial-scale=1.0" name="viewport">
<title>${esc(title)} — VaultGate</title>
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
<script id="tailwind-config">
tailwind.config = { darkMode: "class", theme: { extend: {
  colors: {
    "primary-container":"#47a8f6","on-tertiary-container":"#77000e","surface-tint":"#98cbff","on-background":"#dfe3e7",
    "on-surface":"#dfe3e7","error-container":"#93000a","background":"#0f1417","outline-variant":"#404751",
    "tertiary-container":"#ff7871","on-secondary":"#283044","on-tertiary-fixed":"#410004","primary":"#98cbff",
    "status-alert":"#EF4444","surface-container-high":"#262b2e","tertiary-fixed-dim":"#ffb3ad","glow-cyan":"rgba(71,168,246,0.15)",
    "on-primary-fixed":"#001d33","on-secondary-container":"#adb4ce","surface-border":"#1E293B","on-primary-fixed-variant":"#004a77",
    "secondary-fixed":"#dae2fd","tertiary-fixed":"#ffdad7","secondary":"#bec6e0","on-tertiary-fixed-variant":"#930013",
    "on-secondary-fixed-variant":"#3f465c","on-secondary-fixed":"#131b2e","on-error-container":"#ffdad6","on-error":"#690005",
    "inverse-surface":"#dfe3e7","surface-container-lowest":"#0a0f12","secondary-container":"#3f465c","surface-container":"#1b2023",
    "outline":"#89919c","surface-bright":"#353a3d","error":"#ffb4ab","background-deep":"#020617","on-tertiary":"#68000a",
    "primary-fixed":"#cfe5ff","on-primary":"#003354","surface-container-highest":"#313539","on-surface-variant":"#bfc7d3",
    "tertiary":"#ffb3ad","on-primary-container":"#003b61","primary-fixed-dim":"#98cbff","inverse-primary":"#00639c",
    "surface-variant":"#313539","inverse-on-surface":"#2c3134","surface-dim":"#0f1417","surface-container-low":"#171c1f",
    "secondary-fixed-dim":"#bec6e0","surface":"#0f1417"
  },
  borderRadius: { "DEFAULT":"0.125rem","lg":"0.25rem","xl":"0.5rem","full":"0.75rem" },
  spacing: { "base":"4px","max-width":"1280px","margin-desktop":"64px","gutter":"24px","margin-mobile":"16px" },
  fontFamily: {
    "label-sm-mono":["JetBrains Mono"],"display-lg":["Montserrat"],"body-lg":["Montserrat"],"body-md":["Montserrat"],
    "headline-lg":["Montserrat"],"title-md":["Montserrat"],"headline-lg-mobile":["Montserrat"],"label-mono":["JetBrains Mono"]
  },
  fontSize: {
    "label-sm-mono":["12px",{"lineHeight":"16px","letterSpacing":"0.08em","fontWeight":"500"}],
    "display-lg":["48px",{"lineHeight":"56px","letterSpacing":"-0.02em","fontWeight":"700"}],
    "body-lg":["18px",{"lineHeight":"28px","fontWeight":"400"}],
    "body-md":["16px",{"lineHeight":"24px","fontWeight":"400"}],
    "headline-lg":["32px",{"lineHeight":"40px","fontWeight":"600"}],
    "title-md":["20px",{"lineHeight":"28px","fontWeight":"600"}],
    "headline-lg-mobile":["24px",{"lineHeight":"32px","fontWeight":"600"}],
    "label-mono":["14px",{"lineHeight":"20px","letterSpacing":"0.05em","fontWeight":"500"}]
  }
}}};
</script>
<style>
  .bg-micro-grid{background-size:16px 16px;background-image:radial-gradient(circle,rgba(142,153,168,0.1) 1px,transparent 1px);}
  .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;}
  /* VaultBot chat bubbles */
  .vg-chat{max-height:460px;overflow-y:auto;}
  .vg-msg{margin:.4rem 0;padding:.65rem .9rem;border-radius:.5rem;max-width:85%;white-space:pre-wrap;line-height:1.5;font-family:Montserrat,sans-serif;}
  .vg-msg.user{background:#47a8f6;color:#001d33;margin-left:auto;}
  .vg-msg.bot{background:#171c1f;border:1px solid #1E293B;color:#dfe3e7;}
  /* Simulated terminal */
  .vg-term{background:#020617;border:1px solid #1E293B;border-radius:.5rem;padding:1rem;
    font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.5;color:#a7f3d0;
    min-height:360px;max-height:560px;overflow-y:auto;white-space:pre-wrap;box-shadow:inset 0 0 40px rgba(2,6,23,0.8);}
  .vg-term .prompt{color:#98cbff;}
  .vg-term input{background:transparent;border:none;color:#dfe3e7;font:inherit;outline:none;flex:1;caret-color:#98cbff;}
</style>
</head>
<body class="bg-background-deep text-on-surface font-body-md antialiased min-h-screen flex flex-col relative overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container">
<div class="fixed inset-0 pointer-events-none z-0">
  <div class="absolute inset-0 bg-micro-grid opacity-50"></div>
  <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 blur-[120px] rounded-full"></div>
</div>

<header class="bg-background-deep text-primary sticky top-0 border-b border-surface-border shadow-sm shadow-glow-cyan z-50">
  <div class="flex items-center justify-between px-margin-mobile md:px-margin-desktop h-20 w-full max-w-max-width mx-auto">
    <a href="/" class="flex items-center gap-3 cursor-pointer group">
      ${icon('security', 'text-3xl group-hover:text-primary-container transition-colors duration-200')}
      <span class="font-display-lg text-title-md font-bold tracking-tighter text-primary group-hover:text-primary-container transition-colors duration-200">VaultGate</span>
    </a>
    <nav class="hidden md:flex items-center gap-8 h-full">${desktopNav(active, user)}</nav>
    <div class="flex items-center gap-4">
      ${headerRight(user)}
      <button class="md:hidden p-2 text-primary" id="mobile-menu-btn" aria-label="Menu">${icon('menu')}</button>
    </div>
  </div>
</header>

<main class="flex-grow relative z-10 w-full max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16 flex flex-col gap-12">
${body}
</main>

<footer class="bg-surface-container-lowest text-outline font-label-sm-mono text-label-sm-mono border-t border-surface-border z-40 mt-auto">
  <div class="flex flex-col md:flex-row justify-between items-center py-gutter px-margin-mobile md:px-margin-desktop w-full max-w-max-width mx-auto gap-6 md:gap-0">
    <div class="font-label-mono text-primary flex items-center gap-2">
      ${icon('shield', 'text-sm')}<span>VaultGate Ltd. | Secure System V2.4.0</span>
    </div>
    <div class="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-3">
      <a class="text-outline hover:text-on-surface transition-colors" href="/robots.txt">robots.txt</a>
      <a class="text-outline hover:text-on-surface transition-colors" href="/assistant">VaultBot</a>
      <a class="text-outline hover:text-on-surface transition-colors" href="/api/status">API Status</a>
    </div>
  </div>
</footer>

<div class="fixed inset-0 bg-background-deep/95 backdrop-blur-sm z-40 hidden flex-col pt-24 px-margin-mobile" id="mobile-menu">
  <nav class="flex flex-col gap-6 text-center">
    ${mobileNav(active, user)}
    <hr class="border-surface-border my-4">
    ${user
      ? `<a href="/logout" class="${C.btnGhost} mx-auto w-full max-w-xs">Sign out</a>`
      : `<a href="/login" class="${C.btn} mx-auto w-full max-w-xs">Sign In</a>`}
  </nav>
</div>

<script>
  document.getElementById('mobile-menu-btn').addEventListener('click', function () {
    var menu = document.getElementById('mobile-menu');
    var ic = this.querySelector('.material-symbols-outlined');
    if (menu.classList.contains('hidden')) { menu.classList.remove('hidden'); menu.classList.add('flex'); ic.textContent = 'close'; }
    else { menu.classList.add('hidden'); menu.classList.remove('flex'); ic.textContent = 'menu'; }
  });
</script>
</body>
</html>`;
}

module.exports = { layout, esc, C, icon };
