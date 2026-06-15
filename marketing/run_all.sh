#!/bin/bash
# Master marketing commenter — runs X, LinkedIn, and Instagram in parallel
# Usage: ./marketing/run_all.sh [--dry-run] [--login]

set -uo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
ARGS=("$@")

PLATFORMS=(x linkedin instagram youtube)
PIDS=()
LOG_DIR="$(mktemp -d)"

for platform in "${PLATFORMS[@]}"; do
  echo "  Starting: $platform"
  bash "$ROOT/$platform/run.sh" "${ARGS[@]+"${ARGS[@]}"}" \
    > "$LOG_DIR/$platform.log" 2>&1 &
  PIDS+=($!)
done

echo ""
echo "  Waiting for all platforms to finish..."
echo ""

EXIT_CODES=()
for i in "${!PLATFORMS[@]}"; do
  wait "${PIDS[$i]}" && EXIT_CODES+=(0) || EXIT_CODES+=($?)
done

for platform in "${PLATFORMS[@]}"; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Output: $platform"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  cat "$LOG_DIR/$platform.log"
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
for i in "${!PLATFORMS[@]}"; do
  if [ "${EXIT_CODES[$i]}" -eq 0 ]; then
    printf "  %-12s ok\n" "${PLATFORMS[$i]}"
  else
    printf "  %-12s FAILED (exit %s)\n" "${PLATFORMS[$i]}" "${EXIT_CODES[$i]}"
  fi
done
echo ""

rm -rf "$LOG_DIR"
