"""
Tests for the XIRR sanity guard in compute_portfolio_stats.

Root case (EHC825, 2026-07-02): a Zerodha ledger where securities entered the
account WITHOUT a matching cash "Funds added" (IPO allotments funded bank-side
via UPI/ASBA, and buyback tenders of already-held shares). Only Rs 46,800 of
cash was deposited, but Rs 10,17,655 was paid out — the sale proceeds of those
securities. The fund-flow model then reports XIRR ~= 707% (and the Nifty
benchmark, replaying the same cashflows, ~= 706%).

The guard must detect this "withdrawn >> invested + absurd XIRR" fingerprint
and suppress the number rather than publishing garbage.

Run:  cd lambda && python3 test_xirr_guard.py
"""
import os
import sys

# ── Make processor importable despite lambda/secrets.py shadowing stdlib ──
# numpy.random needs the stdlib `secrets` (randbits). The script's own dir
# (lambda/) is auto-added to sys.path[0], so `secrets` would resolve to
# lambda/secrets.py and break numpy. Fix: drop lambda/ from the path, force
# numpy/scipy to init against the real stdlib secrets, THEN put lambda/ back so
# `secrets` resolves to lambda/secrets.py for processor's own import.
_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path = [p for p in sys.path if os.path.abspath(p or ".") != _HERE]

import secrets as _stdlib_secrets   # noqa: E402,F401  (real stdlib — cache it)
import numpy                        # noqa: E402
import numpy.random                 # noqa: E402  (init bit_generator w/ stdlib secrets)
import scipy.optimize               # noqa: E402,F401

os.environ.setdefault("HOSTINGER_API_SECRET", "test")
sys.modules.pop("secrets", None)    # forget stdlib; let lambda/secrets.py win now
sys.path.insert(0, _HERE)

import pandas as pd     # noqa: E402
import processor        # noqa: E402


def _df(rows):
    return pd.DataFrame(rows, columns=["date", "amount"])


# Real EHC825 cashflows extracted from the uploaded ledger.
EHC825_OUTFLOWS = _df([
    {"date": "2023-08-22", "amount": -9000},
    {"date": "2023-11-10", "amount": -5000},
    {"date": "2024-08-16", "amount": -12800},
    {"date": "2026-04-24", "amount": -5000},
    {"date": "2026-05-13", "amount": -15000},
])  # total invested = 46,800
EHC825_INFLOWS = _df([
    {"date": "2025-06-06", "amount": 45472},
    {"date": "2025-06-17", "amount": 189387},
    {"date": "2025-08-18", "amount": 32878},
    {"date": "2025-10-01", "amount": 200000},
    {"date": "2025-10-08", "amount": 326800},
    {"date": "2026-02-24", "amount": 200000},
    {"date": "2023-11-08", "amount": 607.98},
    {"date": "2025-10-03", "amount": 22463.37},
    {"date": "2025-11-07", "amount": 46.94},
])  # total withdrawn = 10,17,655.29
EHC825_CURRENT_VALUE = 27033.0


def test_absurd_xirr_from_securities_in_without_cash_is_suppressed():
    stats = processor.compute_portfolio_stats(
        EHC825_OUTFLOWS, EHC825_INFLOWS, EHC825_CURRENT_VALUE, nifty_data=None
    )
    assert stats["xirr_percentage"] is None, (
        f"expected suppressed XIRR, got {stats['xirr_percentage']}"
    )
    assert stats["xirr_unreliable"] is True, "expected xirr_unreliable flag"
    assert stats.get("xirr_unreliable_reason"), "expected a human-readable reason"
    # totals must still be reported for display
    assert round(stats["total_invested"], 2) == 46800.0
    assert round(stats["total_withdrawn"], 2) == 1017655.29
    print("PASS: absurd XIRR suppressed —", stats["xirr_unreliable_reason"])


def test_huge_current_value_typo_is_suppressed():
    # Deposited 1,00,000 three years ago, withdrew nothing, but typed the
    # current value as 1 crore (extra zeros). XIRR explodes off the terminal
    # value even though total_withdrawn is 0 -> the withdrawn-only guard misses
    # it, so the guard must also weigh current value (total recovery).
    outflows = _df([{"date": "2022-07-01", "amount": -100000}])
    inflows = _df([])
    stats = processor.compute_portfolio_stats(
        outflows, inflows, 10000000.0, nifty_data=None
    )
    assert stats["xirr_percentage"] is None, (
        f"expected suppressed XIRR for crore-typo, got {stats['xirr_percentage']}"
    )
    assert stats["xirr_unreliable"] is True
    print("PASS: huge current-value typo suppressed —", stats["xirr_unreliable_reason"])


def test_high_but_plausible_xirr_gets_soft_warning():
    # Invested 1,00,000 two years ago, now worth 2,50,000 (~58%/yr). Plausible
    # but high -> keep the number, attach a "please verify" note (not suppressed).
    outflows = _df([{"date": "2024-07-01", "amount": -100000}])
    inflows = _df([])
    stats = processor.compute_portfolio_stats(
        outflows, inflows, 250000.0, nifty_data=None
    )
    assert stats["xirr_percentage"] is not None, "should still show the number"
    assert stats["xirr_unreliable"] in (False, None), "should not be hard-suppressed"
    assert stats["xirr_suspicious"] is True, "should be flagged suspicious (>50%)"
    assert stats.get("xirr_suspicious_note"), "expected a verify note"
    print(f"PASS: high XIRR soft-warned — {stats['xirr_percentage']:.1f}%")


def test_normal_account_xirr_not_suppressed():
    # Deposited 1,00,000 three years ago, took out 20,000, still holds 1,30,000.
    outflows = _df([{"date": "2023-01-02", "amount": -100000}])
    inflows = _df([{"date": "2024-06-01", "amount": 20000}])
    stats = processor.compute_portfolio_stats(
        outflows, inflows, 130000.0, nifty_data=None
    )
    assert stats["xirr_percentage"] is not None, "normal account XIRR wrongly suppressed"
    assert stats.get("xirr_unreliable") in (False, None), "normal account wrongly flagged"
    print(f"PASS: normal account XIRR kept — {stats['xirr_percentage']:.2f}%")


if __name__ == "__main__":
    failures = 0
    for fn in [
        test_absurd_xirr_from_securities_in_without_cash_is_suppressed,
        test_huge_current_value_typo_is_suppressed,
        test_high_but_plausible_xirr_gets_soft_warning,
        test_normal_account_xirr_not_suppressed,
    ]:
        try:
            fn()
        except AssertionError as e:
            failures += 1
            print(f"FAIL: {fn.__name__}: {e}")
        except Exception as e:
            failures += 1
            print(f"ERROR: {fn.__name__}: {type(e).__name__}: {e}")
    sys.exit(1 if failures else 0)
