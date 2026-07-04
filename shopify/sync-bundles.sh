#!/usr/bin/env bash
# Run bundle sync with Node 22 (required by Shopify CLI 4.x)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:${PATH}"
if ! command -v shopify >/dev/null 2>&1; then
  echo "✗ shopify CLI not found. Install: npm install -g @shopify/cli@latest" >&2
  exit 1
fi
if ! node -e "const v=process.versions.node.split('.').map(Number); process.exit(v[0]>=22?0:1)"; then
  echo "✗ Shopify CLI 4.x needs Node 22+. Run: nvm install 22 && nvm use 22" >&2
  exit 1
fi
exec node "$ROOT/_build/sync-shopify-bundles.mjs" "$@"
