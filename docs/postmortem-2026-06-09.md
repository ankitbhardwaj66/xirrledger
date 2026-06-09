# Postmortem — XIRR Ledger Production Outage
**Date:** June 9–10, 2026  
**Duration:** ~6 hours (approx. 19:00 UTC → 01:30 UTC+5:30 next day)  
**Severity:** P0 — Complete XIRR calculation outage for all users  
**Status:** Resolved

---

## Summary

An attempt to rotate the `HOSTINGER_API_SECRET` environment variable using the AWS CLI wiped **all** Lambda environment variables. Fixing the env vars via Terraform triggered a layer rebuild, which exposed a pre-existing but latent ABI incompatibility between numpy's compiled Cython extensions and Lambda's recently-updated Python 3.12 runtime. The incident cascaded through multiple failed fix attempts over ~6 hours before being resolved by switching the Lambda runtime to Python 3.11 x86_64 and patching two library files in the Lambda layer.

---

## Timeline

| Time (IST) | Event |
|---|---|
| ~06:00 PM | Secret rotation initiated. `aws lambda update-function-configuration --environment Variables={HOSTINGER_API_SECRET=...}` used — this **replaces** the entire Variables object, wiping all other env vars. |
| ~06:00 PM | Lambda begins returning 500 for all requests. Root cause: `KeyError: 'S3_UPLOADS_BUCKET'` — env var gone. |
| ~06:30 PM | Env vars restored via CLI (all 8 vars set correctly). Lambda responds again. |
| ~06:45 PM | Terraform apply run to sync env vars properly. Terraform detects that local `lambda/dist/layer.zip` checksum differs from S3, **replaces the Lambda layer** with the stale local zip. |
| ~06:50 PM | New error: `ImportError: cannot import name 'randbits'` from `numpy/random/bit_generator.pyx` — Lambda layer now broken. |
| ~07:00–09:00 PM | Multiple fix attempts: rebuild layer with numpy 2.1.3, switch arch from arm64 → x86_64, switch runtime Python 3.12 → 3.11, monkey-patch `numpy.random` in handler.py. Each attempt either failed or introduced new errors (RecursionError, BitGenerator size mismatch, scipy chain failures). |
| ~09:30 PM | Root cause fully identified: `pandas/_typing.py` evaluates `np.random.Generator` at module load time as a type alias VALUE (not annotation), triggering numpy.random import → bit_generator → randbits error. scipy also triggers same chain via `array_api_compat`. |
| ~09:45 PM | Fix identified: patch `pandas/_typing.py` (string refs) + patch `numpy/random/__init__.py` (try/except around Cython imports) + add `numpy/testing` stub. |
| ~10:00 PM | Fix validated by uploading `ledger-NBN208.xlsx` directly via CLI — `valid: true, 165 transactions found`. |
| ~10:30 PM | Patches codified into `build_layer.sh`, Terraform applied to dev + prod, merged to main. |

---

## Root Causes

### Root Cause 1: AWS CLI env var update replaces entire Variables object (Trigger)

```bash
# WRONG — replaces ALL env vars with just this one
aws lambda update-function-configuration \
  --environment "Variables={HOSTINGER_API_SECRET=new_value}"
```

AWS Lambda's `--environment Variables={...}` does a **full replacement**, not a merge. All 7 other env vars (`S3_UPLOADS_BUCKET`, `S3_REPORTS_BUCKET`, `S3_JOBS_BUCKET`, `HOSTINGER_API_URL`, `SES_FROM_EMAIL`, `SEND_EMAIL`, `TEST_EMAILS`) were silently deleted.

**Correct approach:** Always manage Lambda env vars through Terraform (`terraform.tfvars` → `terraform apply`). Never use CLI for env var updates.

### Root Cause 2: Stale local `layer.zip` triggered layer replacement (Amplifier)

When Terraform was run to properly sync env vars, it computed the MD5 of the local `lambda/dist/layer.zip`. This file had a different checksum from what was in S3 (the original working layer), so Terraform uploaded and deployed the local zip as a new layer version — destroying the previously-working layer.

The local zip was stale: it had been built months prior with different Docker/wheel settings that happened to produce a compatible binary. The newly-built zip triggered the ABI issue.

### Root Cause 3: numpy/bit_generator ABI incompatibility with Lambda Python 3.12 runtime (Core failure)

Lambda's Python 3.12 runtime (`mainlinev2.v11`) was updated at some point after the original layer was built. The updated runtime broke binary compatibility with numpy's compiled `bit_generator.pyx` extension, which calls `randbits` — a C API function that was removed or renamed.

This was a **latent bug** that existed but never triggered because the original working layer was built before the runtime update. The layer rebuild surfaced it.

**Chain of failures once numpy.random failed to import:**
```
pandas._typing.py (line 198)
  → RandomState = Union[..., np.random.Generator, ...]   ← evaluated at import time
  → numpy.__getattr__('random')
  → import numpy.random
  → numpy/random/__init__.py: from . import _pickle
  → numpy/random/_pickle.py: from .bit_generator import BitGenerator
  → bit_generator.pyx init: ImportError: cannot import name 'randbits'
```

And separately via scipy:
```
scipy.optimize → scipy.linalg → scipy._lib._array_api
  → scipy._lib.array_api_compat.numpy: from numpy import *
  → numpy.__getattr__('random') → same chain
```

---

## What We Tried (and why it didn't work)

| Attempt | Why it failed |
|---|---|
| Rebuild layer with numpy 2.1.3 | numpy 2.1.3 has the same `randbits` issue — it's not a version problem, it's a Lambda runtime ABI problem |
| Switch Lambda arch arm64 → x86_64 | Fixed architecture mismatch but `randbits` persisted — issue is in the Python runtime, not CPU arch |
| Switch Lambda runtime Python 3.12 → 3.11 | The Python 3.11 Lambda runtime (`mainlinev2.v11`) ALSO has the same `randbits` issue |
| Monkey-patch `numpy.random` in `handler.py` via `sys.modules` | Triggered `RecursionError` — numpy's `__getattr__` for 'random' recursively calls `import numpy.random` |
| Inject stub via `numpy.__dict__['random']` directly | Fixed the recursion but numpy's other compiled extensions need the real `BitGenerator` C struct (96 bytes); our Python stub was 24 bytes |
| Replace `bit_generator.so` with pure Python stub | `BitGenerator` Python class had wrong C struct size (size mismatch error from `_generator.so`) |
| Rebuild layer natively without `--platform` Docker flag | Same result — PyPI wheel for the Lambda Python runtime still has the `randbits` issue |

---

## Resolution

**Two-file patch applied to the Lambda layer:**

**Patch 1 — `pandas/_typing.py`:** Replace the `RandomState` type alias's `np.random.*` references with string literals so they are not evaluated at import time:
```python
# Before (evaluated at import time — triggers numpy.random)
RandomState = Union[int, np.ndarray, np.random.Generator, np.random.BitGenerator, ...]

# After (string refs — never evaluated)
RandomState = Union[int, np.ndarray, "np.random.Generator", "np.random.BitGenerator", ...]
```

**Patch 2 — `numpy/random/__init__.py`:** Wrap all Cython extension imports in `try/except` so numpy.random loads gracefully even when `bit_generator` fails:
```python
try:
    from . import _pickle
    from .bit_generator import BitGenerator, SeedSequence
    ...
except (ImportError, SystemError):
    class BitGenerator: pass  # stub — safe since we don't use numpy.random
    ...
```

**Patch 3 — Add `numpy/testing/__init__.py` stub:** The build script strips test directories to save space, but scipy's import chain needs `numpy.testing` to exist.

All three patches were codified into `build_layer.sh` so they are applied automatically on every layer rebuild. The Lambda was also permanently switched to **Python 3.11 x86_64** for better wheel compatibility.

---

## What Actually Broke vs What We Thought

| What we thought | What was actually happening |
|---|---|
| "Old ARM64 containers keep surviving" | Some containers DID reuse old layer; others hit new broken layer — different errors on same attempt |
| "numpy version is the problem" | The ABI issue exists in ALL numpy versions with Lambda's updated runtime |
| "Architecture is the problem" | Architecture didn't matter — `randbits` fails on both arm64 and x86_64 |
| "The error message 'wrong structure' means file parsing failed" | ALL errors (numpy, scipy, recursion) return the same "wrong structure" generic message — making debugging hard |

---

## Action Items

| Priority | Item | Status |
|---|---|---|
| **P0** | Never use `aws lambda update-function-configuration --environment Variables={...}` for single-var updates — always use Terraform | ✅ Documented in CLAUDE.md |
| **P0** | Lambda env vars managed exclusively through Terraform | ✅ Done |
| **P1** | Patches auto-applied in `build_layer.sh` on every rebuild | ✅ Done |
| **P1** | S3 versioning enabled on artifacts bucket — every layer.zip upload preserved | ✅ Done via Terraform |
| **P1** | `HOSTINGER_API_SECRET` moved to AWS Secrets Manager — no longer in `terraform.tfvars` | ✅ Done |
| **P2** | Improve error handling in `handle_validate` — log the actual exception type alongside the user-facing message | Backlog |
| **P2** | Add Lambda health-check CloudWatch alarm to detect future outages automatically | Backlog |
| **P2** | Test Lambda with real file after every layer rebuild before deploying to prod | Process improvement |

---

## Lessons Learned

1. **`--environment Variables={...}` is a full replace, never a merge.** This is the most dangerous AWS CLI footgun for Lambda. Document it, avoid it.

2. **Never let Terraform rebuild a working layer without verifying the local zip is fresh.** The original layer worked because it was built before a runtime update. Terraform silently replaced it with an incompatible version.

3. **All errors hiding behind the same generic message makes debugging very slow.** The Lambda's `handle_validate` catches all exceptions and returns "wrong structure" — making it impossible to distinguish numpy errors from file parsing errors from S3 errors from the browser.

4. **Test with the actual file directly via CLI before deploying.** We spent hours asking the user to try again via browser when we could have tested the Lambda directly with the real file from the start.

5. **Lambda runtime updates can break working layers silently.** The original layer was working fine until AWS updated the Python 3.12 runtime. There's no notification for this.
