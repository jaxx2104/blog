#!/bin/bash
# Cloudflare Pages build entry.
#
# This thin wrapper exists because the Cloudflare Pages dashboard build
# command is set to `bash build.sh`. After the Phase 4 modernization
# completed, `pnpm build` is the only build path (velite + vite prerender
# to dist/client/). The branch-aware logic that lived here during the
# migration was removed once main switched fully to TanStack Start.
set -euo pipefail
echo "build.sh: pnpm build"
pnpm build
