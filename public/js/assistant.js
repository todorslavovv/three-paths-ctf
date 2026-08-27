(function () {
  var chat = document.getElementById('chat');
  var form = document.getElementById('chatform');
  var input = document.getElementById('msg');

  function add(text, who) {
    var el = document.createElement('div');
    el.className = 'm ' + who;
    el.textContent = text;
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
  }

  add('Hi, I am VaultBot. Ask me about VaultGate documents, departments, or the employee directory.', 'bot');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = input.value.trim();
    if (!msg) return;
    add(msg, 'user');
    input.value = '';
    fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) { add(d.reply || '(no response)', 'bot'); })
      .catch(function () { add('(error contacting VaultBot)', 'bot'); });
  });
})();
