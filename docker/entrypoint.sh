#!/usr/bin/env bash
set -e

# Ensure the post-exploitation flag directory exists (server.js writes flag.txt).
mkdir -p "${FLAG_DIR:-/opt/vaultgate/secrets}"

# Optional real SSH — local Docker labs only. Railway/cloud: keep ENABLE_SSH=false.
if [ "${ENABLE_SSH}" = "true" ]; then
  echo "administrator:${ADMIN_PASSWORD:-winter2024}" | chpasswd
  echo "[entrypoint] ENABLE_SSH=true — starting sshd on :22 (administrator account)"
  /usr/sbin/sshd
fi

echo "[entrypoint] starting VaultGate web application"
exec node src/server.js
