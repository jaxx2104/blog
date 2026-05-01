#!/bin/bash
# Cloudflare Pages build entry.
#
# After Phase 2 of the stack modernization, `pnpm build` is the
# TanStack Start prerender (dist/client/). On main (which still ships
# Next.js until the migration merges), `pnpm build` resolves to
# `next build` from main's package.json — same script name, branch-
# specific behavior. We keep this thin wrapper so Cloudflare's dashboard
# build command does not need to change between branches.
set -euo pipefail
branch="${CF_PAGES_BRANCH:-main}"
echo "build.sh: branch=$branch -> pnpm build"
pnpm build
