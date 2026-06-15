#!/usr/bin/env bash
# Build SLP-AI for the Keren Family Games subpath and stage it at /slp-ai/,
# then publish the static site to the gh-pages branch.
#
# Usage:
#   scripts/deploy-slp-ai.sh           # build + copy + commit main + publish gh-pages
#   scripts/deploy-slp-ai.sh --build   # build + copy only (no git)
#
# GitHub Pages serves gh-pages root at https://elirank1.github.io/keren-family/
# so SLP-AI lives at https://elirank1.github.io/keren-family/slp-ai/.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$ROOT/slp-ai-app"
OUT="$ROOT/slp-ai"
BASE="/keren-family/slp-ai/"

echo "▶ Building SLP-AI with base $BASE"
cd "$APP"
[ -d node_modules ] || npm ci
DEPLOY_BASE="$BASE" npm run build

echo "▶ Staging built app at $OUT"
rm -rf "$OUT"
mkdir -p "$OUT"
cp -R "$APP/dist/." "$OUT/"
touch "$OUT/.nojekyll"

if [ "${1:-}" = "--build" ]; then
  echo "✓ Build staged at $OUT (no git operations)"
  exit 0
fi

cd "$ROOT"
git add slp-ai slp-ai-app index.html .nojekyll scripts
git commit -m "Deploy SLP-AI to /slp-ai/" || echo "(nothing to commit on main)"
git push origin main

echo "▶ Publishing to gh-pages (additive — existing games untouched)"
WT="$(mktemp -d)"
git worktree add "$WT" gh-pages
rm -rf "$WT/slp-ai"
cp -R "$OUT" "$WT/slp-ai"
cp "$ROOT/index.html" "$WT/index.html"
touch "$WT/.nojekyll"
( cd "$WT" && git add -A && git commit -m "Publish SLP-AI to /slp-ai/" && git push origin gh-pages )
git worktree remove "$WT" --force
echo "✓ Deployed: https://elirank1.github.io/keren-family/slp-ai/"
