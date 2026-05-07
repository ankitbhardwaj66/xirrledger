#!/bin/bash
# Run the LinkedIn commenter using the contact-job-hunt venv
# Usage: ./run.sh [--dry-run] [--login]
VENV="/Users/ankitbhardwaj/Documents/GitHub/contact-job-hunt/.venv/bin/python"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

exec "$VENV" "$SCRIPT_DIR/linkedin_commenter.py" "$@"
