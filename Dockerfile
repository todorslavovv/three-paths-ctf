# VaultGate — intentionally vulnerable CTF. Disposable challenge container.
# NOTE: this image is deliberately vulnerable at the APPLICATION layer. The
# container itself is unprivileged: do NOT run it with --privileged, and do not
# mount the Docker socket or host paths. All intended exploitation terminates
# inside this container.
FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    PORT=3000 \
    INTERNAL_DIAG_PORT=8080 \
    FLAG_DIR=/opt/vaultgate/secrets \
    ENABLE_SSH=false

# Runtime tools:
#   bash            — reverse-shell payloads use bash /dev/tcp
#   iputils-ping    — the diagnostics service's base command
#   openssh-server  — optional real SSH (started only when ENABLE_SSH=true)
# Build tools (python3/make/g++) are needed to compile better-sqlite3.
RUN apt-get update && apt-get install -y --no-install-recommends \
      bash iputils-ping ca-certificates openssh-server \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/vaultgate/app

# Install dependencies first (better layer caching).
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

# Application source.
COPY src ./src
COPY public ./public

# Post-exploitation flag location (populated at runtime from CTF_FLAG).
RUN mkdir -p /opt/vaultgate/secrets

# Optional-SSH plumbing: an OS 'administrator' account and password auth.
# The password is set at runtime from ADMIN_PASSWORD (default winter2024).
RUN useradd -m -s /bin/bash administrator \
    && mkdir -p /var/run/sshd \
    && sed -i 's/#\?PasswordAuthentication .*/PasswordAuthentication yes/' /etc/ssh/sshd_config \
    && sed -i 's/#\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Web app (3000). The internal diagnostics service (8080) is loopback-only and
# intentionally NOT exposed. SSH (22) is used only when ENABLE_SSH=true.
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
