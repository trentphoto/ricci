#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:${PATH}"
if ! command -v shopify >/dev/null 2>&1; then
  echo "✗ shopify CLI not found. Install: npm install -g @shopify/cli@latest" >&2
  exit 1
fi
exec node "$ROOT/_build/sync-shopify-theme.mjs" "$@"
