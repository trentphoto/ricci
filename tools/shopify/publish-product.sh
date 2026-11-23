#!/usr/bin/env bash
# Publish a product to Online Store + Headless.
# Needs store auth with publication scopes (one-time browser approval):
#   shopify store auth --store tiyndf-za.myshopify.com \
#     --scopes read_products,write_products,read_publications,write_publications
# Usage: tools/shopify/publish-product.sh gid://shopify/Product/123
set -euo pipefail
export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:${PATH}"
STORE="${SHOPIFY_STORE:-tiyndf-za}.myshopify.com"
G="$(cd "$(dirname "$0")" && pwd)/graphql"
T="$(mktemp -d)"
shopify store execute --store "$STORE" --query-file "$G/publications.query.graphql" --output-file "$T/pubs.json" --json >/dev/null
IDS=$(node -e '
const d=require(process.argv[1]); const n=(d.data||d).publications.nodes;
const ids=n.filter(p=>/online store|headless/i.test(p.name)).map(p=>({publicationId:p.id}));
if(!ids.length){console.error("No Online Store/Headless publication found",JSON.stringify(n));process.exit(1)}
console.log(JSON.stringify(ids))' "$T/pubs.json")
printf '{"id":"%s","input":%s}' "$1" "$IDS" > "$T/vars.json"
shopify store execute --store "$STORE" --query-file "$G/publishable-publish.mutation.graphql" \
  --variable-file "$T/vars.json" --output-file "$T/out.json" --allow-mutations --json >/dev/null
cat "$T/out.json"; echo
