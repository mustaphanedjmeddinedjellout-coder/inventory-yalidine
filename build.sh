#!/usr/bin/env bash
# Resilient build script: works regardless of caller's CWD.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "==> Installing server deps"
( cd server && npm install )

echo "==> Installing client deps"
( cd client && npm install --include=dev --legacy-peer-deps )

echo "==> Building client"
( cd client && npm run build )

echo "==> Build complete"
