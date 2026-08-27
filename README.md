# VaultGate — Vulnerable Web CTF & Pentesting Lab

VaultGate is a small, intentionally vulnerable internal document-management
platform used as a **hands-on penetration-testing laboratory**. It is designed
for a personal/local security lab and teaches methodology:

```
Recon → Enumeration → Information Gathering → Vulnerability Identification
→ Vulnerability Research → Exploitation → Initial Access → Post-Exploitation
→ Flag Retrieval
```

> ⚠️ **This application is deliberately insecure.** Run it only in a disposable,
> isolated lab (local Docker or a throwaway cloud instance). Never expose it to
> the public internet or run it on a machine you care about.

Difficulty: **Beginner → Intermediate**. There is **one flag**, reachable by
**three independent paths** (plus a bonus SQL-injection route).

---

## Features

- Realistic internal SaaS look: dashboard, documents, search, profile, admin,
  and the **VaultBot** assistant.
- Node.js + Express + SQLite (in-memory) + vanilla HTML/CSS/JS. No build step.
- Three intended attack paths and a bonus SQLi route (see below — no spoilers).
- Docker + Docker Compose, Railway-compatible.
- Simulated restricted maintenance console (virtual filesystem) and an optional
  real SSH service for local labs.
- A full LaTeX pentesting walkthrough in `docs/`.

## Architecture

```
Browser ──HTTP──▶ Express web app (0.0.0.0:3000)
                    ├─ pages / auth / search / assistant / admin
                    ├─ /api (status, users, documents, assistant, terminal)
                    ├─ preferences middleware  ← vg_prefs cookie (node-serialize)
                    └─ maintenance console  ──pivot──▶ Diagnostics service
                                                        (127.0.0.1:8080, loopback)
```

- The **internal diagnostics service** on `127.0.0.1:8080` is loopback-only and
  never exposed. It is reached by pivoting through the maintenance console.
- The **flag** comes from the `CTF_FLAG` environment variable. It is stored
  server-side and written to `/opt/vaultgate/secrets/flag.txt` for the
  post-exploitation read. It never appears in `public/`, HTML, JS, CSS, the
  Dockerfile, or this README.

Directory layout:

```
src/        server.js, app.js, routes/, middleware/, chatbot/, terminal/, internal/, db/
public/     css/, js/, assets/
docker/     entrypoint.sh
docs/       PENTEST_WALKTHROUGH.tex (+ PDF once compiled), images/
tests/      smoke.js, exploits.js, helpers.js
ctf-wordlist.txt   brute-force wordlist for Path 1
```

## Requirements

- Docker + Docker Compose **or** Node.js ≥ 18 (tested on Node 20/22).
- Attacker tooling for the walkthrough: `nmap`, `curl`, `ffuf`/`gobuster`,
  `sqlmap`, `netcat`, Burp Suite, `hydra` (optional).
- To build the walkthrough PDF: a LaTeX toolchain (`texlive` / `pdflatex` or
  `latexmk`).

## Environment variables

| Variable             | Default                                  | Purpose |
|----------------------|------------------------------------------|---------|
| `CTF_FLAG`           | `CTF{vaultgate_three_paths_one_flag}`    | The flag (server-side only). |
| `PORT`               | `3000`                                   | Web app port (binds `0.0.0.0`). |
| `INTERNAL_DIAG_PORT` | `8080`                                   | Loopback diagnostics service port. |
| `FLAG_DIR`           | `/opt/vaultgate/secrets`                 | On-disk flag location. |
| `ADMIN_PASSWORD`     | `winter2024`                             | Weak admin password (must be in the wordlist). |
| `SESSION_SECRET`     | `vaultgate-dev-session-secret`           | Express session secret. |
| `ENABLE_SSH`         | `false`                                  | Optional real SSH (local Docker only). |
| `NODE_ENV`           | `production`                             | Node environment. |

Copy the sample env file and edit as needed:

```bash
cp env.example .env
```

## Local installation (without Docker)

```bash
npm install
CTF_FLAG='CTF{my_local_flag}' FLAG_DIR="$PWD/.secrets" npm start
# App: http://localhost:3000
```

(`FLAG_DIR` is overridden here because a normal user cannot write `/opt`.)

## Docker usage

```bash
docker build -t vaultgate:latest .
docker run --rm -p 3000:3000 -e CTF_FLAG='CTF{my_flag}' vaultgate:latest
```

## Docker Compose

```bash
# Web-only (Railway-equivalent):
CTF_FLAG='CTF{my_flag}' docker compose up -d --build

# With optional real SSH for the local lab:
#   1. uncomment the "2222:22" port line in docker-compose.yml
#   2. start with SSH enabled:
ENABLE_SSH=true CTF_FLAG='CTF{my_flag}' docker compose up -d --build
#   ssh administrator@localhost -p 2222   (password: winter2024)

docker compose down -v   # tear down (challenge is disposable)
```

## CTF rules

- Target is the web app at `http://<TARGET>:3000`. You are given only the target
  IP/host and port — everything else must be discovered.
- One flag, format `CTF{...}`. Reachable via three independent paths.
- Everything you need is on the target or in `ctf-wordlist.txt`. No brute forcing
  of anything not covered by the provided wordlist is required.

## Finding the target

- Local Docker: `http://localhost:3000` (host `127.0.0.1`).
- Container IP for `nmap`: `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' vaultgate`.

## Player instructions

Start with reconnaissance and follow the methodology. The full guided
walkthrough is in [`docs/PENTEST_WALKTHROUGH.tex`](docs/PENTEST_WALKTHROUGH.tex)
(compile it to PDF — see below). High level, without spoilers:

- Enumerate HTTP: `robots.txt`, headers, endpoints, the `/api` surface.
- Investigate authentication behaviour.
- Identify the technology stack and research it.
- Talk to VaultBot.

## Author instructions

The complete solution — credentials, payloads, CVE details, flag locations — is
in [`CHALLENGE_AUTHOR_NOTES.md`](CHALLENGE_AUTHOR_NOTES.md). **This file is never
served by the application** (it is excluded from `public/` and from the Docker
image via `.dockerignore`).

## Testing

```bash
npm install
npm test              # functional + SQLi + Path 3 + terminal-pivot RCE (Path 1)
npm run test:exploits # node-serialize RCE (Path 2) + reverse shell (Path 1)
```

`test:exploits` needs `bash` with `/dev/tcp` support (default on Linux). Set
`VG_SKIP_REVSHELL=1` to skip the reverse-shell case.

## Building the walkthrough PDF

```bash
cd docs
latexmk -pdf PENTEST_WALKTHROUGH.tex   # or: pdflatex PENTEST_WALKTHROUGH.tex (run twice)
```

No LaTeX installed? Compile in a container instead (no host install needed):

```bash
docker run --rm -v "$PWD/docs":/work -w /work texlive/texlive:latest \
  latexmk -pdf -interaction=nonstopmode PENTEST_WALKTHROUGH.tex
```

A pre-built `docs/PENTEST_WALKTHROUGH.pdf` (16 pages) is included.

## Railway deployment

VaultGate is Railway-compatible: it binds `0.0.0.0`, reads `process.env.PORT`,
uses in-memory SQLite (disposable), and does not require a persistent volume.

1. Create a new Railway service from this repo (it uses the `Dockerfile`).
2. Set variables: `CTF_FLAG`, `SESSION_SECRET`, and keep `ENABLE_SSH=false`
   (Railway does not expose arbitrary inbound TCP). `PORT` is provided by
   Railway automatically.
3. Deploy. The web challenge (Paths 1–3 via the web app + simulated console) is
   fully functional; the optional real SSH service is a local-Docker-only extra.

## Troubleshooting

See the Troubleshooting chapter of the walkthrough. Quick hits:

- **Port 3000 in use:** change the host mapping, e.g. `-p 3001:3000`.
- **`nmap` shows only 3000:** correct — 8080 is loopback-only by design; reach
  it by pivoting through the maintenance console.
- **Reverse shell won't connect from Docker:** use `host.docker.internal` as the
  attacker IP (mapped via `host-gateway` in `docker-compose.yml`), or the bridge
  gateway from `ip route` inside the container.
- **`better-sqlite3` build errors:** ensure Python 3 + a C++ toolchain are
  present (the Docker image installs them).

## Security & isolation

Intentionally vulnerable — but contained. The container is **unprivileged**: do
not run with `--privileged`, and do not mount the Docker socket or host paths.
No real credentials, API keys, or personal data are included. All intended
exploitation terminates inside the disposable container.
