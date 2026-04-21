#!/usr/bin/env bash
# ============================================================
#  OpenPlay — Build & Deploy Script
#  Usage: chmod +x deploy.sh && ./deploy.sh "your commit message"
# ============================================================
set -e

COMMIT_MSG="${1:-chore: deploy $(date '+%Y-%m-%d %H:%M')}"

echo ""
echo "🏸  OpenPlay Deploy Script"
echo "================================"

# ── Pre-flight checks ────────────────────────────────────────

echo ""
echo "🔍  Pre-flight checks..."

# 1. Ensure .env.local exists
if [ ! -f ".env.local" ]; then
  echo "❌  ERROR: .env.local not found!"
  echo "   Create it from .env.example and fill in your Supabase credentials."
  exit 1
fi

# 2. Verify env vars are set
source .env.local 2>/dev/null || true

if [ -z "$VITE_SUPABASE_URL" ] || [ "$VITE_SUPABASE_URL" = "https://YOUR_PROJECT_REF.supabase.co" ]; then
  echo "❌  ERROR: VITE_SUPABASE_URL is not set in .env.local"
  exit 1
fi

if [ -z "$VITE_SUPABASE_ANON_KEY" ] || [ "$VITE_SUPABASE_ANON_KEY" = "YOUR_ANON_KEY_HERE" ]; then
  echo "❌  ERROR: VITE_SUPABASE_ANON_KEY is not set in .env.local"
  exit 1
fi

echo "✅  Env vars look good"

# 3. Check .env.local is gitignored
if git check-ignore -q .env.local 2>/dev/null; then
  echo "✅  .env.local is gitignored"
else
  echo "⚠️   WARNING: .env.local may not be gitignored! Check your .gitignore"
fi

# ── Install dependencies ─────────────────────────────────────

echo ""
echo "📦  Installing dependencies..."
npm install

# ── Build ────────────────────────────────────────────────────

echo ""
echo "🔨  Building for production..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌  Build failed!"
  exit 1
fi

echo "✅  Build succeeded → dist/"

# ── Git commit & push ────────────────────────────────────────

echo ""
echo "🚀  Committing and pushing to git..."

git add -A

# Check if there's anything to commit
if git diff --cached --quiet; then
  echo "ℹ️   Nothing to commit — working tree clean"
else
  git commit -m "$COMMIT_MSG"
  echo "✅  Committed: $COMMIT_MSG"
fi

# Push to current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git push origin "$BRANCH"

echo ""
echo "✅  Pushed to origin/$BRANCH"
echo ""
echo "🎉  Deploy complete!"
echo ""
echo "📋  Next steps:"
echo "   1. Vercel auto-deploys on push (if connected)"
echo "   2. Or run: vercel --prod"
echo "   3. Check your deployment at your Vercel dashboard"
echo ""
echo "   Don't forget to set env vars in Vercel:"
echo "   VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (+ VITE_GOOGLE_MAPS_KEY if used)"
echo ""
