#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$HOME/.claude/skills/br-pipeline"

echo "=== br-pipeline installer ==="
echo ""

# Create symlink
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

# Verify
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
# br-pipeline
- **br-pipeline** (`~/.claude/skills/br-pipeline/SKILL.md`) - pipeline POM completo per gestione BR con manifest JSON e viste per ruolo. Trigger: "br-pipeline", "pipeline br", "le mie task"
When the user says "br-pipeline", "pipeline br", "le mie task", or similar phrases about the BR pipeline or viewing assigned tasks, invoke the Skill tool with `skill: "br-pipeline"` before doing anything else.
BLOCK

echo ""
echo "Done."
