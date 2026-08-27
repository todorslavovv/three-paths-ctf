# Walkthrough screenshots

The LaTeX walkthrough references screenshots by filename. They are intentionally
left as **placeholders** — capture them from your own fresh deployment so the
evidence is real (never fabricate evidence). Suggested captures:

- `nmap-scan.png` — `nmap -sC -sV <TARGET>` output
- `robots.png` — `/robots.txt`
- `ffuf-login.png` — brute-force hit
- `status-endpoint.png` — `/api/status` showing node-serialize 0.0.4
- `maintenance-console.png` — `ss -lntp` / internal service discovery
- `path1-flag.png` — command-injection flag retrieval
- `revshell.png` — reverse shell + flag
- `sqli.png` — UNION-based flag extraction / sqlmap dump
- `vaultbot.png` — prompt injection disclosing the flag

If a screenshot is missing at compile time, the walkthrough shows a labelled
placeholder box instead (see the `\evidence` macro), so the PDF always builds.
