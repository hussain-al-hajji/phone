#!/usr/bin/env bash
# Auto-sync: rebuild index.html if sources changed, commit, and push to the working branch.
cd "$(dirname "$0")/../.." || exit 0
BRANCH=claude/vibrant-mendel-nvmbpc
if [ -n "$(git status --porcelain -- src)" ]; then node src/build.js >/dev/null; fi
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -q -m "تحديث تلقائي: رفع أحدث نسخة" \
    -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PvKxaNbxbRCnZZCDcjefFP"
fi
if [ -n "$(git log origin/$BRANCH..HEAD --oneline 2>/dev/null)" ] || ! git rev-parse -q --verify origin/$BRANCH >/dev/null; then
  for d in 0 2 4 8 16; do sleep $d; git push -q -u origin "$BRANCH" && break; done
fi
