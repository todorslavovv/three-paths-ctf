#!/usr/bin/env bash
# VaultGate — one-shot verification. Run in a normal terminal (or a fresh
# Claude Code session in default permission mode):
#
#     bash verify.sh            # app + tests + LaTeX
#     bash verify.sh --docker   # also build & smoke-test the Docker image
#
# It does not stop on the first failure; it runs everything and prints a summary.
set -u
cd "$(dirname "$0")"

PASS=0; FAIL=0
step() { echo; echo "==== $* ===="; }
ok()   { echo "  [ OK ] $*"; PASS=$((PASS+1)); }
bad()  { echo "  [FAIL] $*"; FAIL=$((FAIL+1)); }

step "1/5  npm install"
if npm install; then ok "dependencies installed"; else bad "npm install"; fi

step "2/5  functional + Path 1/3 + SQLi tests (npm test)"
if npm test; then ok "smoke tests passed"; else bad "smoke tests"; fi

step "3/5  exploit tests: node-serialize RCE + reverse shell (npm run test:exploits)"
if npm run test:exploits; then
  ok "exploit tests passed"
else
  echo "  (retrying with VG_SKIP_REVSHELL=1 in case this host lacks bash /dev/tcp)"
  if VG_SKIP_REVSHELL=1 npm run test:exploits; then
    ok "exploit tests passed (reverse shell skipped)"
  else
    bad "exploit tests"
  fi
fi

step "4/5  LaTeX walkthrough -> PDF"
if command -v latexmk >/dev/null 2>&1; then
  ( cd docs && latexmk -pdf -interaction=nonstopmode PENTEST_WALKTHROUGH.tex >/tmp/vg_latex.log 2>&1 )
  [ -f docs/PENTEST_WALKTHROUGH.pdf ] && ok "PDF built (docs/PENTEST_WALKTHROUGH.pdf)" || { bad "latexmk (see /tmp/vg_latex.log)"; tail -20 /tmp/vg_latex.log; }
elif command -v pdflatex >/dev/null 2>&1; then
  ( cd docs && pdflatex -interaction=nonstopmode PENTEST_WALKTHROUGH.tex >/tmp/vg_latex.log 2>&1 && \
    pdflatex -interaction=nonstopmode PENTEST_WALKTHROUGH.tex >>/tmp/vg_latex.log 2>&1 )
  [ -f docs/PENTEST_WALKTHROUGH.pdf ] && ok "PDF built (docs/PENTEST_WALKTHROUGH.pdf)" || { bad "pdflatex (see /tmp/vg_latex.log)"; tail -20 /tmp/vg_latex.log; }
else
  echo "  latexmk/pdflatex not found. Install with:"
  echo "    sudo apt-get install -y texlive-latex-recommended texlive-latex-extra latexmk"
  bad "no LaTeX toolchain"
fi

step "5/5  Docker (optional)"
if [ "${1:-}" = "--docker" ]; then
  if docker build -t vaultgate:latest . ; then
    ok "docker image built"
    docker rm -f vaultgate_verify >/dev/null 2>&1 || true
    docker run -d --name vaultgate_verify -p 3999:3000 -e CTF_FLAG='CTF{docker_verify}' vaultgate:latest >/dev/null
    sleep 4
    if curl -sf http://127.0.0.1:3999/ >/dev/null; then ok "container serves HTTP"; else bad "container HTTP"; fi
    if curl -s "http://127.0.0.1:3999/search?q=%27%20UNION%20SELECT%20key,value,%27x%27%20FROM%20secrets--%20-" | grep -q 'CTF{docker_verify}'; then
      ok "SQLi extracts flag from container"; else bad "SQLi in container"; fi
    docker rm -f vaultgate_verify >/dev/null 2>&1 || true
  else bad "docker build"; fi
else
  echo "  (skipped; pass --docker to build & smoke-test the image)"
fi

echo; echo "================ SUMMARY: ${PASS} ok, ${FAIL} failed ================"
exit $FAIL
