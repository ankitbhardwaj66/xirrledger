#!/bin/bash
# Run the Instagram DM outreach script
# Usage:
#   ./run_dm.sh              — send DMs (max 3 per run)
#   ./run_dm.sh --dry-run    — draft messages without sending
#   ./run_dm.sh --discover   — find influencer candidates from hashtags
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV="$SCRIPT_DIR/venv/bin/python3"

exec "$VENV" "$SCRIPT_DIR/instagram_dm.py" "$@"
