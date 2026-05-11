#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$HOME/.claude/skills/br-profile-setup"

echo "=== br-profile-setup installer ==="
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
# br-profile-setup
- **br-profile-setup** (`~/.claude/skills/br-profile-setup/SKILL.md`) - creazione guidata profilo progetto con auto-detect codebase. Trigger: "crea profilo progetto", "setup profilo", "nuovo profilo"
When the user says "crea profilo progetto", "setup profilo", "nuovo profilo", "configura il profilo", or similar phrases about creating a project profile, invoke the Skill tool with `skill: "br-profile-setup"` before doing anything else.
BLOCK

echo ""
echo "Done."
