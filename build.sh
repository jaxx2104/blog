#!/bin/bash
# Cloudflare Pages build entry.
#
# main: legacy Next.js build (out/) — used until the stack-modernization
#   migration completes (Phase 5 of docs/superpowers/specs/2026-05-01-modernize-stack-design.md).
# all other branches: TanStack Start prerender build (dist/client/) so the
#   migration branches see real Deploy Preview output without disturbing
#   production.
#
# CF_PAGES_BRANCH is provided by Cloudflare Pages. We default to "main" if
# unset (e.g. local invocation) so the safe path runs.

set -euo pipefail

branch="${CF_PAGES_BRANCH:-main}"

if [ "$branch" = "main" ]; then
  echo "build.sh: branch=$branch -> pnpm build (Next.js)"
  pnpm build
else
  echo "build.sh: branch=$branch -> pnpm build:vite (TanStack Start)"
  pnpm build:vite
fi
