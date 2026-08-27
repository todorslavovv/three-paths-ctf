(function () {
  var term = document.getElementById('term');
  var cwd = '/home/svc-maint';
  var history = [];
  var hi = 0;

  function write(text) {
    if (text) {
      var pre = document.createElement('div');
      pre.textContent = text;
      term.appendChild(pre);
    }
  }
  function banner() {
    write('VaultGate maintenance console — restricted shell (svc-maint@vaultgate-app)');
    write("Type 'help' for available commands.");
    newLine();
  }
  function newLine() {
    var row = document.createElement('div');
    row.className = 'terminal-input';
    var prompt = document.createElement('span');
    prompt.className = 'prompt';
    prompt.textContent = 'svc-maint@vaultgate-app:' + cwd + '$ ';
    var inp = document.createElement('input');
    inp.className = 'in';
    inp.style.cssText = 'flex:1;background:transparent;border:none;color:#e6ebf5;font:inherit;outline:none';
    inp.autofocus = true;
    row.appendChild(prompt);
    row.appendChild(inp);
    term.appendChild(row);
    inp.focus();
    term.scrollTop = term.scrollHeight;

    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var cmd = inp.value;
        inp.disabled = true;
        history.push(cmd); hi = history.length;
        run(cmd);
      } else if (e.key === 'ArrowUp') {
        if (hi > 0) { hi--; inp.value = history[hi] || ''; }
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        if (hi < history.length) { hi++; inp.value = history[hi] || ''; }
        e.preventDefault();
      }
    });
  }

  function run(cmd) {
    if (!cmd.trim()) { newLine(); return; }
    fetch('/api/terminal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.output === '__CLEAR__') { term.innerHTML = ''; cwd = d.cwd; newLine(); return; }
        if (d.output) write(d.output);
        cwd = d.cwd || cwd;
        newLine();
      })
      .catch(function () { write('(connection error)'); newLine(); });
  }

  term.addEventListener('click', function () {
    var inputs = term.querySelectorAll('input');
    if (inputs.length) inputs[inputs.length - 1].focus();
  });

  banner();
})();
