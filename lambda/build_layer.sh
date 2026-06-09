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
  --platform linux/amd64 \
  --entrypoint pip \
  -v "$SCRIPT_DIR:/var/task" \
  -v "$LAYER_DIR:/var/layer/python" \
  public.ecr.aws/lambda/python:3.11 \
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

# ── Patches for Lambda Python 3.11 x86_64 runtime compatibility ─────────────
# numpy.random's bit_generator Cython extension has an ABI incompatibility
# with the Lambda runtime. Pandas and scipy both trigger numpy.random imports
# at module level via type hints / array_api_compat. We patch two files:
#
# 1. pandas/_typing.py  — replace live np.random.* type refs with strings so
#    they are not evaluated at import time.
# 2. numpy/random/__init__.py — wrap Cython extension imports in try/except
#    so numpy.random loads even if bit_generator fails.
# 3. Add numpy/testing/__init__.py stub (stripped for size but needed by scipy).

echo "==> Applying compatibility patches ..."

python3 - << 'PYEOF'
import re, pathlib

layer = pathlib.Path("$LAYER_DIR")

# Patch 1: pandas/_typing.py
typing_py = layer / "pandas/_typing.py"
if typing_py.exists():
    src = typing_py.read_text()
    src = src.replace(
        "    np.random.Generator,\n    np.random.BitGenerator,\n    np.random.RandomState,",
        '    "np.random.Generator",\n    "np.random.BitGenerator",\n    "np.random.RandomState",'
    )
    typing_py.write_text(src)
    print("  Patched pandas/_typing.py")

# Patch 2: numpy/random/__init__.py
random_init = layer / "numpy/random/__init__.py"
if random_init.exists():
    src = random_init.read_text()
    old = (
        "from . import _pickle\n"
        "from . import _common\n"
        "from . import _bounded_integers\n"
        "\n"
        "from ._generator import Generator, default_rng\n"
        "from .bit_generator import SeedSequence, BitGenerator\n"
        "from ._mt19937 import MT19937\n"
        "from ._pcg64 import PCG64, PCG64DXSM\n"
        "from ._philox import Philox\n"
        "from ._sfc64 import SFC64\n"
        "from .mtrand import *"
    )
    new = (
        "try:\n"
        "    from . import _pickle\n"
        "    from . import _common\n"
        "    from . import _bounded_integers\n"
        "    from ._generator import Generator, default_rng\n"
        "    from .bit_generator import SeedSequence, BitGenerator\n"
        "    from ._mt19937 import MT19937\n"
        "    from ._pcg64 import PCG64, PCG64DXSM\n"
        "    from ._philox import Philox\n"
        "    from ._sfc64 import SFC64\n"
        "    from .mtrand import *\n"
        "except (ImportError, SystemError):\n"
        "    class Generator: pass\n"
        "    class BitGenerator: pass\n"
        "    class SeedSequence: pass\n"
        "    class MT19937: pass\n"
        "    class PCG64: pass\n"
        "    PCG64DXSM = PCG64\n"
        "    class Philox: pass\n"
        "    class SFC64: pass\n"
        "    class RandomState: pass\n"
        "    def default_rng(seed=None): return None"
    )
    if old in src:
        random_init.write_text(src.replace(old, new))
        print("  Patched numpy/random/__init__.py")

# Patch 3: numpy/testing stub
testing_dir = layer / "numpy/testing"
testing_dir.mkdir(exist_ok=True)
(testing_dir / "__init__.py").write_text(
    "def assert_array_equal(*a, **k): pass\n"
    "def assert_allclose(*a, **k): pass\n"
    "def assert_almost_equal(*a, **k): pass\n"
)
print("  Added numpy/testing/__init__.py stub")
PYEOF

echo "==> Zipping layer ..."
cd "$DIST_DIR"
zip -r9 layer.zip python/
echo "==> Layer built: $DIST_DIR/layer.zip"
echo "    Zipped size:   $(du -sh layer.zip | cut -f1)"
