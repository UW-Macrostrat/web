#!/usr/bin/env bash
# Assemble the Macrostrat documentation vault (github.com/Macrostrat/docs)
# into ./content, which the site build renders under /docs.
#
#   yarn docs:assemble               # fetch the vault and rebuild ./content
#   yarn docs:assemble --if-missing  # only when ./content does not exist yet
#
# Environment:
#   DOCS_SOURCE_DIR  use an existing local checkout of the vault instead of cloning
#   DOCS_REPO        clone URL          (default: https://github.com/Macrostrat/docs.git)
#   DOCS_REF         branch or tag      (default: main)
#   DOCS_CACHE_DIR   where to clone     (default: .cache/docs, git-ignored)
set -euo pipefail
cd "$(dirname "$0")/.."
# When invoked through `yarn docs:assemble`, yarn injects its Plug'n'Play loader
# via NODE_OPTIONS. The vault's tooling is a plain node-modules project and must
# run without it, especially when the vault is cloned under this tree.
unset NODE_OPTIONS

: "${DOCS_REPO:=https://github.com/Macrostrat/docs.git}"
: "${DOCS_REF:=main}"
: "${DOCS_CACHE_DIR:=.cache/docs}"
OUT="$PWD/content"

if [ "${1:-}" = "--if-missing" ] && [ -d "$OUT" ]; then
  echo "[docs] content/ already present; run 'yarn docs:assemble' to refresh it"
  exit 0
fi

if [ -n "${DOCS_SOURCE_DIR:-}" ]; then
  DOCS_DIR="$DOCS_SOURCE_DIR"
  echo "[docs] using local vault at $DOCS_DIR"
else
  DOCS_DIR="$DOCS_CACHE_DIR"
  if [ -d "$DOCS_DIR/.git" ]; then
    git -C "$DOCS_DIR" fetch --quiet --depth 1 origin "$DOCS_REF"
    git -C "$DOCS_DIR" checkout --quiet --detach FETCH_HEAD
  else
    git clone --quiet --depth 1 --branch "$DOCS_REF" "$DOCS_REPO" "$DOCS_DIR"
  fi
  echo "[docs] vault $DOCS_REPO @ $DOCS_REF ($(git -C "$DOCS_DIR" rev-parse --short HEAD))"
fi

if [ ! -f "$DOCS_DIR/.tooling/assemble.mjs" ]; then
  echo "[docs] error: $DOCS_DIR does not look like the documentation vault" >&2
  exit 1
fi

# The tooling's lockfile belongs to the vault; a different yarn release here
# must not fail the install on lockfile-format drift.
(cd "$DOCS_DIR/.tooling" && YARN_ENABLE_IMMUTABLE_INSTALLS=false yarn install)

rm -rf "$OUT"
node "$DOCS_DIR/.tooling/assemble.mjs" --mode=publish --out="$OUT"
node "$DOCS_DIR/.tooling/check.mjs" "$OUT"
