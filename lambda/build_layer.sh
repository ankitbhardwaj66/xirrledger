#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Build Lambda Layer zip for Python dependencies.
#
# Lambda runtime: python3.12 / x86_64 (Linux)
# Must be run on a Linux x86_64 machine or via Docker.
# The easiest way on macOS is to use Docker.
#
# Usage:
#   chmod +x build_layer.sh
#   ./build_layer.sh
#
# Output: dist/layer.zip  (referenced by Terraform)
# ─────────────────────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"
LAYER_DIR="$DIST_DIR/python"

echo "==> Cleaning dist/ ..."
rm -rf "$DIST_DIR"
mkdir -p "$LAYER_DIR"

echo "==> Installing dependencies for linux/x86_64 via Docker ..."
docker run --rm \
  --platform linux/arm64 \
  --entrypoint pip \
  -v "$SCRIPT_DIR:/var/task" \
  -v "$LAYER_DIR:/var/layer/python" \
  public.ecr.aws/lambda/python:3.12 \
  install \
    --no-cache-dir \
    --target /var/layer/python \
    -r /var/task/requirements.txt

echo "==> Stripping unnecessary files to reduce size ..."
# Remove test directories (scipy tests alone are ~50MB)
find "$LAYER_DIR" -type d -name "tests"    -exec rm -rf {} + 2>/dev/null || true
find "$LAYER_DIR" -type d -name "test"     -exec rm -rf {} + 2>/dev/null || true
find "$LAYER_DIR" -type d -name "testing"  -exec rm -rf {} + 2>/dev/null || true
# Remove dist-info and egg-info metadata (not needed at runtime)
find "$LAYER_DIR" -type d -name "*.dist-info" -exec rm -rf {} + 2>/dev/null || true
find "$LAYER_DIR" -type d -name "*.egg-info"  -exec rm -rf {} + 2>/dev/null || true
# Remove compiled Python caches
find "$LAYER_DIR" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find "$LAYER_DIR" -name "*.pyc" -delete 2>/dev/null || true
# Remove Cython source files and C headers (not needed post-compile)
find "$LAYER_DIR" -name "*.pyx"  -delete 2>/dev/null || true
find "$LAYER_DIR" -name "*.pxd"  -delete 2>/dev/null || true
find "$LAYER_DIR" -name "*.h"    -delete 2>/dev/null || true
# Remove type stubs (not needed at runtime)
find "$LAYER_DIR" -name "*.pyi"  -delete 2>/dev/null || true
# Remove static libs (not needed for Lambda)
find "$LAYER_DIR" -name "*.a"    -delete 2>/dev/null || true

echo "    Unzipped size after strip: $(du -sh "$LAYER_DIR" | cut -f1)"

echo "==> Zipping layer ..."
cd "$DIST_DIR"
zip -r9 layer.zip python/
echo "==> Layer built: $DIST_DIR/layer.zip"
echo "    Zipped size:   $(du -sh layer.zip | cut -f1)"
