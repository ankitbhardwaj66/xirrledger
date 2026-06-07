#!/bin/bash
# Run the X.com commenter
# Usage: ./run.sh [--dry-run] [--login]
# Requires: pip install anthropic playwright && playwright install chromium
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV="$SCRIPT_DIR/venv/bin/python3"

# Fall back to system python3 if no local venv
if [ ! -f "$VENV" ]; then
    VENV="python3"
fi

exec "$VENV" "$SCRIPT_DIR/x_commenter.py" "$@"
