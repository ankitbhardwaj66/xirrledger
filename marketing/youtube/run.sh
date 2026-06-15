#!/bin/bash
# Run the YouTube Shorts commenter
# Usage:
#   ./run.sh              — post comments (max 5 per run)
#   ./run.sh --dry-run    — draft comments without posting
#   ./run.sh --login      — open browser to log in to YouTube
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV="$SCRIPT_DIR/venv/bin/python3"

if [ ! -f "$VENV" ]; then
    VENV="python3"
fi

exec "$VENV" "$SCRIPT_DIR/youtube_commenter.py" "$@"
