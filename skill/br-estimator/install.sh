#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$HOME/.claude/skills/br-estimator"

echo "=== br-estimator installer ==="
echo ""

if [ -L "$SKILL_DIR" ]; then
    EXISTING_TARGET="$(readlink "$SKILL_DIR")"
    if [ "$EXISTING_TARGET" = "$SCRIPT_DIR" ]; then
        echo "Symlink already exists and points to the correct location."
    else
        echo "Symlink exists but points to: $EXISTING_TARGET"
        echo "Updating to: $SCRIPT_DIR"
        rm "$SKILL_DIR"
        ln -s "$SCRIPT_DIR" "$SKILL_DIR"
        echo "Symlink updated."
    fi
elif [ -d "$SKILL_DIR" ]; then
    echo "ERROR: $SKILL_DIR exists as a directory (not a symlink)."
    echo "Remove it manually and re-run this script."
    exit 1
else
    mkdir -p "$(dirname "$SKILL_DIR")"
    ln -s "$SCRIPT_DIR" "$SKILL_DIR"
    echo "Symlink created: $SKILL_DIR -> $SCRIPT_DIR"
fi

if [ -f "$SKILL_DIR/SKILL.md" ]; then
    echo "Verification: SKILL.md found at $SKILL_DIR/SKILL.md"
else
    echo "ERROR: SKILL.md not found after symlink. Something went wrong."
    exit 1
fi

echo ""
echo "=== Add this to ~/.claude/CLAUDE.md ==="
echo ""
cat <<'BLOCK'
# br-estimator
- **br-estimator** (`~/.claude/skills/br-estimator/SKILL.md`) - stima team e simulazioni what-if per BR. Trigger: "stima il br", "quanti sviluppatori servono", "simulazione team", "stima effort"
When the user says "stima il br", "quanti sviluppatori servono", "simulazione team", "stima effort", "stima team", or similar phrases about estimating team size or effort for a BR, invoke the Skill tool with `skill: "br-estimator"` before doing anything else.
BLOCK

echo ""
echo "Done."
