#!/usr/bin/env python3
"""
Instagram DM Outreach — xirrledger.com
Sends a personal message to fintech/investing influencers on Instagram.

Usage:
    Dry run (drafts only, no DMs sent):
        python instagram_dm.py --dry-run

    Run (sends DMs):
        python instagram_dm.py

    Discover influencers from hashtags and print list (no DMs):
        python instagram_dm.py --discover

Target list:
    Edit TARGETS below, or create a file targets.txt with one username per line.
    Only accounts in that list will ever be messaged.

Safety:
    - Max 3 DMs per run
    - 2–4 minute delay between each DM
    - Permanent seen list — never DMs the same person twice
    - Requires existing Instagram session from instagram_commenter.py --login
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

import anthropic
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

SCRIPT_DIR  = Path(__file__).parent
SESSION_PATH = SCRIPT_DIR / ".instagram_session.json"
SEEN_DM_FILE = SCRIPT_DIR / ".seen_dm_targets.json"
LOG_FILE     = SCRIPT_DIR / "dm_log.jsonl"
TARGETS_FILE = SCRIPT_DIR / "targets.txt"

# ── Hard-coded seed list — add influencer usernames here ─────────────────────
# Accounts that post about Zerodha / investing / XIRR / personal finance India
TARGETS: list[str] = [
    # Add Instagram usernames here (without @), e.g.:
    # "pranjal_kamra",
    # "ca_rachanaranade",
    # "shashankudupa",
]

MAX_DMS_PER_RUN    = 3
DM_DELAY_MIN       = 120   # seconds between DMs (2 min)
DM_DELAY_MAX       = 240   # seconds between DMs (4 min)

# ── Hashtags for --discover mode ─────────────────────────────────────────────
DISCOVERY_HASHTAGS = [
    "zerodha",
    "stockmarketindia",
    "investingindia",
    "xirr",
    "portfolioreturns",
    "personalfinanceindia",
]
MIN_FOLLOWERS_FOR_DM = 2000   # only DM accounts with at least this many followers

MESSAGE_SYSTEM = """You are writing a short, genuine Instagram DM from Ankit Bhardwaj, a software engineer who built xirrledger.com for himself.

Write a natural, personal DM to a fintech/investing influencer. Cover:
1. Brief intro: you're a software engineer, built xirrledger.com for yourself
2. The problem it solves: Zerodha's Kite never shows portfolio XIRR properly
3. What it does: free tool that reads your actual broker ledger (Zerodha/Groww) and calculates true XIRR including every charge — ledger-based so it's accurate
4. The ask: try it, and if they find it useful, share it with their audience
5. It's free and will always be free — built for the community
6. Open to feedback and feature requests

Rules:
- 4–5 sentences max, conversational tone, not salesy
- Sound like a real person sharing something they built, not a marketer
- No hashtags, no emojis
- Vary the wording each call so messages don't look templated
- End with a warm, open invitation for feedback

Return ONLY the message text. Nothing else."""


def load_seen() -> set:
    if SEEN_DM_FILE.exists():
        with open(SEEN_DM_FILE) as f:
            return set(json.load(f))
    return set()


def save_seen(seen: set):
    with open(SEEN_DM_FILE, "w") as f:
        json.dump(sorted(seen), f, indent=2)


def log_dm(username: str, message: str, sent: bool):
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps({
            "timestamp": datetime.now().isoformat(),
            "username": username,
            "message": message,
            "sent": sent,
        }) + "\n")


def human_delay(min_sec: float, max_sec: float):
    time.sleep(random.uniform(min_sec, max_sec))


def load_targets() -> list[str]:
    targets = list(TARGETS)
    if TARGETS_FILE.exists():
        lines = TARGETS_FILE.read_text().splitlines()
        for line in lines:
            u = line.strip().lstrip("@")
            if u and not u.startswith("#") and u not in targets:
                targets.append(u)
    return targets


def _append_to_targets(new_usernames: list[str], seen: set):
    """Append newly discovered usernames to targets.txt, skipping already-seen ones."""
    existing = set(load_targets())
    to_add = [u for u in new_usernames if u not in existing and u not in seen]
    if not to_add:
        return
    with open(TARGETS_FILE, "a") as f:
        for u in to_add:
            f.write(f"{u}\n")
    print(f"  Appended {len(to_add)} new usernames to targets.txt")


def draft_message(client: anthropic.Anthropic, username: str) -> str | None:
    try:
        resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=200,
            system=MESSAGE_SYSTEM,
            messages=[{"role": "user", "content": f"Write a DM for Instagram user @{username}."}],
        )
        return resp.content[0].text.strip()
    except Exception as e:
        print(f"  [claude] Error drafting message: {e}")
        return None


def get_follower_count(page, username: str) -> int:
    """Navigate to a profile and return follower count (0 if can't parse)."""
    try:
        page.goto(f"https://www.instagram.com/{username}/", wait_until="domcontentloaded", timeout=20000)
        human_delay(2, 3)
        count = page.evaluate("""
            () => {
                const parseNum = s => {
                    s = (s || '').replace(/,/g, '').trim();
                    if (/[Kk]$/.test(s)) return Math.round(parseFloat(s) * 1000);
                    if (/[Mm]$/.test(s)) return Math.round(parseFloat(s) * 1000000);
                    return parseInt(s) || 0;
                };
                // Method 1: <li> stats row — Instagram logged-in view
                for (const li of document.querySelectorAll('li')) {
                    const t = li.innerText || '';
                    if (t.toLowerCase().includes('follower')) {
                        const m = t.match(/([\d,\.]+[KkMm]?)/);
                        if (m) return parseNum(m[1]);
                    }
                }
                // Method 2: <a> with followers in href
                for (const a of document.querySelectorAll('a[href*="followers"]')) {
                    const t = a.innerText || a.getAttribute('aria-label') || '';
                    const m = t.match(/([\d,\.]+[KkMm]?)/);
                    if (m) return parseNum(m[1]);
                }
                // Method 3: meta description (works when not logged in)
                for (const meta of document.querySelectorAll('meta[content]')) {
                    const c = meta.getAttribute('content') || '';
                    const m = c.match(/([\d,\.]+[KkMm]?)\s+Followers/i);
                    if (m) return parseNum(m[1]);
                }
                return -1; // -1 = unknown, not 0
            }
        """)
        return count if count is not None else -1
    except Exception:
        return -1


def send_dm(page, username: str, message: str) -> bool:
    """Open profile, click Message, type and send DM. Returns True on success."""
    print(f"  Opening profile: @{username}")
    try:
        page.goto(f"https://www.instagram.com/{username}/", wait_until="domcontentloaded", timeout=20000)
        human_delay(2, 4)
    except PlaywrightTimeout:
        print("  [timeout] Profile page too slow")
        return False

    # Dismiss any dialogs
    try:
        page.keyboard.press("Escape")
        human_delay(0.5, 1)
    except Exception:
        pass

    # Click the Message button on the profile
    msg_btn = None
    for sel in [
        'div[role="button"]:has-text("Message")',
        'button:has-text("Message")',
        'a:has-text("Message")',
        '[aria-label="Message"]',
    ]:
        try:
            el = page.query_selector(sel)
            if el and el.is_visible():
                msg_btn = el
                break
        except Exception:
            pass

    if not msg_btn:
        print("  [error] Could not find Message button — account may not accept DMs or is private")
        return False

    try:
        msg_btn.click()
        human_delay(2, 4)
    except Exception as e:
        print(f"  [error] Could not click Message button: {e}")
        return False

    # Dismiss any "Not now" popup (e.g. notifications prompt)
    for text in ["Not Now", "Not now", "Maybe Later"]:
        try:
            btn = page.query_selector(f'button:has-text("{text}")')
            if btn and btn.is_visible():
                btn.click()
                human_delay(0.5, 1)
        except Exception:
            pass

    # Find the message input box
    input_box = None
    for sel in [
        'div[aria-label="Message"]',
        'div[contenteditable="true"][aria-label*="essage"]',
        'div[role="textbox"]',
        'textarea[placeholder*="essage"]',
        'div[contenteditable="true"]',
    ]:
        try:
            el = page.wait_for_selector(sel, timeout=8000)
            if el and el.is_visible():
                input_box = el
                break
        except PlaywrightTimeout:
            continue
        except Exception:
            break

    if not input_box:
        print("  [error] Could not find message input box")
        return False

    try:
        input_box.click()
        human_delay(0.8, 1.5)
        # Type with human-like pacing
        for char in message:
            input_box.type(char, delay=random.randint(40, 100))
            if random.random() < 0.04:
                time.sleep(random.uniform(0.2, 0.5))
        human_delay(1, 2)
    except Exception as e:
        print(f"  [error] Typing failed: {e}")
        return False

    # Send — try Enter key first (most reliable in Instagram DMs)
    try:
        page.keyboard.press("Enter")
        human_delay(3, 5)
        print("  [submit] Enter key")
        return True
    except Exception:
        pass

    # Fallback: find Send button
    for sel in [
        'button[type="submit"]',
        'div[role="button"]:has-text("Send")',
        'button:has-text("Send")',
    ]:
        try:
            btn = page.query_selector(sel)
            if btn and btn.is_visible():
                btn.click()
                human_delay(3, 5)
                print("  [submit] Send button click")
                return True
        except Exception:
            pass

    print("  [error] Could not send message")
    return False


def discover_influencers(page, seen: set) -> list[str]:
    """Browse hashtag pages and collect profiles with enough followers."""
    discovered = []
    targets = set(load_targets())

    for hashtag in DISCOVERY_HASHTAGS:
        print(f"\n  Browsing #{hashtag}...")
        try:
            page.goto(f"https://www.instagram.com/explore/tags/{hashtag}/", wait_until="domcontentloaded", timeout=20000)
            human_delay(3, 5)
        except PlaywrightTimeout:
            continue

        try:
            page.keyboard.press("Escape")
        except Exception:
            pass

        for _ in range(2):
            page.evaluate("window.scrollBy(0, window.innerHeight * 0.8)")
            human_delay(1.5, 2.5)

        try:
            post_urls = page.evaluate("""
                () => {
                    const seen = new Set(); const results = [];
                    document.querySelectorAll('a[href*="/p/"]').forEach(a => {
                        const href = (a.href || '').split('?')[0];
                        if (href.match(/instagram\\.com\\/p\\//) && !seen.has(href)) {
                            seen.add(href); results.push(href);
                        }
                    });
                    return results.slice(0, 6);
                }
            """)
        except Exception:
            continue

        for post_url in post_urls:
            try:
                page.goto(post_url, wait_until="domcontentloaded", timeout=20000)
                human_delay(2, 3)
                username = page.evaluate("""
                    () => {
                        for (const sel of ['header a[href]', 'article header a[href]']) {
                            const els = document.querySelectorAll(sel);
                            for (const el of els) {
                                const href = el.getAttribute('href') || '';
                                const text = (el.innerText || '').trim();
                                if (href.match(/^\\/[a-zA-Z0-9._]+\\/$/) && text) return text.replace('@','');
                            }
                        }
                        return '';
                    }
                """)
                if not username or username in seen or username in targets or username in discovered:
                    continue
                followers = get_follower_count(page, username)
                f_label = f"{followers:,}" if followers >= 0 else "unknown"
                print(f"    @{username}: {f_label} followers → added")
                discovered.append(username)
                human_delay(1, 2)
            except Exception:
                continue

    return discovered


def run(dry_run: bool = False, discover: bool = False):
    if not SESSION_PATH.exists():
        print(f"No session found at {SESSION_PATH}")
        print("Run instagram_commenter.py --login first to create a session.")
        sys.exit(1)

    api_key = __import__("os").environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ANTHROPIC_API_KEY not set.")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)
    seen   = load_seen()
    targets = load_targets()

    if not targets and not discover:
        print("No targets found. Add usernames to TARGETS list or targets.txt, or run with --discover.")
        sys.exit(0)

    dms_sent = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = browser.new_context(
            storage_state=str(SESSION_PATH),
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
            permissions=["clipboard-read", "clipboard-write"],
        )
        page = context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        # Verify session
        page.goto("https://www.instagram.com/", wait_until="domcontentloaded", timeout=20000)
        human_delay(2, 4)
        if "login" in page.url or "accounts" in page.url:
            print("Session expired. Run instagram_commenter.py --login to refresh.")
            browser.close()
            sys.exit(1)

        if discover:
            print("\n── Discovery mode ──────────────────────────────")
            found = discover_influencers(page, seen)
            _append_to_targets(found, seen)
            print(f"\nFound {len(found)} new targets — added to targets.txt.")
            browser.close()
            return

        targets = load_targets()
        pending = [u for u in targets if u not in seen]

        # Auto-discover if nothing left to DM
        if not pending:
            print("\nNo pending targets — running discovery first...")
            found = discover_influencers(page, seen)
            if found:
                _append_to_targets(found, seen)
                targets = load_targets()
                pending = [u for u in targets if u not in seen]
                print(f"\n{len(pending)} new targets discovered and added.")
            else:
                print("Discovery found no new targets. Try again later.")
                browser.close()
                return

        print(f"\n{len(pending)} targets pending (of {len(targets)} total)")

        for username in pending:
            if dms_sent >= MAX_DMS_PER_RUN:
                print(f"\nReached max {MAX_DMS_PER_RUN} DMs per run. Stopping.")
                break

            print(f"\n── @{username} ──")
            message = draft_message(client, username)
            if not message:
                continue

            print(f"  Message draft:\n    {message}\n")

            if dry_run:
                log_dm(username, message, sent=False)
                seen.add(username)
                save_seen(seen)
                dms_sent += 1
                print("  [dry-run] Not sending.")
            else:
                ok = send_dm(page, username, message)
                log_dm(username, message, sent=ok)
                if ok:
                    print(f"  [ok] DM sent to @{username}")
                    seen.add(username)
                    save_seen(seen)
                    dms_sent += 1
                    if dms_sent < MAX_DMS_PER_RUN:
                        delay = random.randint(DM_DELAY_MIN, DM_DELAY_MAX)
                        print(f"  Waiting {delay}s before next DM...")
                        time.sleep(delay)
                else:
                    print(f"  [fail] Could not send DM to @{username}")

        browser.close()

    print(f"\nDone. {'Drafted' if dry_run else 'Sent'} {dms_sent} DMs.")
    print(f"Log: {LOG_FILE}")


def main():
    parser = argparse.ArgumentParser(description="Instagram DM outreach for xirrledger.com")
    parser.add_argument("--dry-run",  action="store_true", help="Draft messages but don't send")
    parser.add_argument("--discover", action="store_true", help="Find influencers from hashtags (no DMs sent)")
    args = parser.parse_args()
    run(dry_run=args.dry_run, discover=args.discover)


if __name__ == "__main__":
    main()
