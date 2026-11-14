#!/usr/bin/env bash
# Deploy the COMMITTED frontend/ to Vercel production from this laptop.
# Uses a clean copy, so local files (.env.local with localhost URLs, node_modules, .next)
# never reach Vercel. Needs: `npx vercel login` once, and frontend/.vercel (from `vercel link`).
# The API addresses come from the Vercel project's env vars (NEXT_PUBLIC_API_URL / _WS_URL).
set -euo pipefail
repo=$(git rev-parse --show-toplevel)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
git -C "$repo" archive HEAD frontend | tar -x -C "$tmp"
cp -r "$repo/frontend/.vercel" "$tmp/frontend/"
cd "$tmp/frontend"
# no build cache: NEXT_PUBLIC_* values are baked into the build, and a cached build
# kept serving the previous API address after it changed
npx --yes vercel@65 deploy --prod --yes --force --build-env VERCEL_FORCE_NO_BUILD_CACHE=1
