#!/usr/bin/env python3
"""
Instagram XIRR Commenter
Finds Instagram posts about XIRR/investing and posts helpful comments
that naturally reference xirrledger.com.

Usage:
    Login:     python instagram_commenter.py --login
    Dry run:   python instagram_commenter.py --dry-run
    Comment:   python instagram_commenter.py
"""

import argparse
import json
import os
import random
import re
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import anthropic
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

SCRIPT_DIR = Path(__file__).parent
SESSION_PATH = SCRIPT_DIR / ".instagram_session.json"
SEEN_FILE = SCRIPT_DIR / ".seen_posts.json"
SEEN_AUTHORS_FILE = SCRIPT_DIR / ".seen_authors.json"
LOG_FILE = SCRIPT_DIR / "comments_log.jsonl"

# Hashtags to browse — sorted by specificity
HASHTAGS = [
    "xirr",
    "portfolioreturns",
    "zerodha",
    "groww",
    "stockportfolioindia",
    "investingindia",
    "mutualfundssahihai",
    "stockmarketindia",
]

MAX_POSTS_PER_HASHTAG = 8
MAX_COMMENTS_PER_RUN = 8
AUTHOR_COOLDOWN_DAYS = 14  # longer than LinkedIn — Instagram is more sensitive

RELEVANCE_PROMPT = """You are screening Instagram posts to decide whether to comment on them for XIRR Ledger (xirrledger.com) — a free tool for Indian investors to calculate true portfolio XIRR from broker ledgers (Zerodha, Groww, etc.).

Reply with YES if the post is about ANY of:
- XIRR, CAGR, portfolio returns, SIP returns, investment performance
- Zerodha, Groww, or other Indian broker ledger/P&L topics
- Mutual fund or stock portfolio tracking
- Personal finance / investing in India

Reply with NO for anything else (lifestyle posts, product promotions, etc.).

Reply with just YES or NO."""

SYSTEM_PROMPT = """You are an Indian retail investor who does stock investing, leaving a comment on an Instagram post.

Write a SHORT, casual comment — 1-2 sentences max. Structure:
1. A brief genuine reaction (optional — skip if it would sound forced)
2. Mention you track your XIRR every few weeks using xirrledger.com
3. One short reason why you find it useful

Rules:
- Sound like a real person sharing a personal habit, not a marketer
- Casual and conversational — Instagram style, not LinkedIn
- No hashtags, no emojis
- Keep it under 2 sentences

Good examples:
"I track my actual XIRR on xirrledger.com every month — works off the broker ledger so stocks, F&O, and all charges are captured."
"Same boat. Been using xirrledger.com to check my XIRR — a bit of effort to upload the ledger but way more accurate than guessing."
"Nice. I do this every few weeks on xirrledger.com — ledger-based so it catches every transaction and broker charge."
"Totally relate. xirrledger.com makes this easy — upload your Zerodha/Groww ledger and it calculates your true XIRR."

Return ONLY the comment text. Nothing else."""


def load_seen() -> set:
    seen = set()
    if SEEN_FILE.exists():
        with open(SEEN_FILE) as f:
            seen.update(json.load(f))
    if LOG_FILE.exists():
        with open(LOG_FILE) as f:
            for line in f:
                try:
                    entry = json.loads(line)
                    url = entry.get("post_url", "")
                    if url:
                        seen.add(url)
                except Exception:
                    pass
    return seen


def save_seen(seen: set):
    with open(SEEN_FILE, "w") as f:
        json.dump(list(seen), f)


def load_seen_authors() -> dict:
    if SEEN_AUTHORS_FILE.exists():
        with open(SEEN_AUTHORS_FILE) as f:
            data = json.load(f)
        if isinstance(data, list):
            return {slug: "2000-01-01T00:00:00" for slug in data}
        return data
    return {}


def save_seen_authors(seen_authors: dict):
    with open(SEEN_AUTHORS_FILE, "w") as f:
        json.dump(seen_authors, f)


def author_on_cooldown(seen_authors: dict, username: str) -> bool:
    if username not in seen_authors:
        return False
    last = datetime.fromisoformat(seen_authors[username])
    return datetime.now() - last < timedelta(days=AUTHOR_COOLDOWN_DAYS)


def log_comment(post_url: str, post_text: str, comment: str, posted: bool):
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps({
            "timestamp": datetime.now().isoformat(),
            "post_url": post_url,
            "post_preview": post_text[:200],
            "comment": comment,
            "posted": posted,
        }) + "\n")


def human_delay(min_sec=2, max_sec=6):
    time.sleep(random.uniform(min_sec, max_sec))


def dismiss_dialogs(page):
    """Dismiss common Instagram modals (notifications, save login, cookie banners)."""
    for text in ["Not Now", "Not now", "Skip", "Maybe Later"]:
        try:
            btn = page.query_selector(
                f'button:has-text("{text}"), [role="button"]:has-text("{text}")'
            )
            if btn and btn.is_visible():
                btn.click()
                time.sleep(0.6)
        except Exception:
            pass
    try:
        page.keyboard.press("Escape")
        time.sleep(0.3)
    except Exception:
        pass


def do_login(playwright):
    print("\n--- Instagram Login ---")
    print("A browser will open. Log in manually, then press Enter here.\n")
    browser = playwright.chromium.launch(
        headless=False,
        args=["--disable-blink-features=AutomationControlled"],
    )
    context = browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport={"width": 1280, "height": 800},
    )
    page = context.new_page()
    page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    page.goto("https://www.instagram.com/accounts/login/")
    input("\nPress Enter after you've logged in and see your feed...")

    page.goto("https://www.instagram.com/", wait_until="domcontentloaded")
    time.sleep(3)
    dismiss_dialogs(page)

    if "instagram.com" in page.url and "login" not in page.url and "accounts" not in page.url:
        SESSION_PATH.parent.mkdir(parents=True, exist_ok=True)
        context.storage_state(path=str(SESSION_PATH))
        print(f"Session saved to {SESSION_PATH}")
    else:
        print("Could not verify login — please try again.")
    browser.close()


def is_relevant(client: anthropic.Anthropic, post_text: str) -> bool:
    try:
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=5,
            system=RELEVANCE_PROMPT,
            messages=[{"role": "user", "content": post_text[:600]}],
        )
        return resp.content[0].text.strip().upper().startswith("YES")
    except Exception:
        return False


def draft_comment(client: anthropic.Anthropic, post_text: str) -> "str | None":
    try:
        resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=150,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": f"Instagram post caption:\n\n{post_text}\n\nWrite a comment."}
            ],
        )
        return resp.content[0].text.strip()
    except Exception as e:
        print(f"  [claude] Error drafting comment: {e}")
        return None


def extract_username_from_page(page) -> str:
    """Extract post author's username from the current Instagram post page."""
    try:
        username = page.evaluate("""
            () => {
                // Author link in post header: href="/username/" with matching innerText
                const candidates = [
                    'header a[href]',
                    'article header a[href]',
                    'a[role="link"][href^="/"]',
                ];
                for (const sel of candidates) {
                    const els = document.querySelectorAll(sel);
                    for (const el of els) {
                        const href = el.getAttribute('href') || '';
                        const text = (el.innerText || '').trim();
                        // Valid username href: /username/ (no /p/, /explore/, /reel/, etc.)
                        if (
                            href.match(/^\\/[a-zA-Z0-9._]+\\/$/) &&
                            text &&
                            !href.includes('/p/') &&
                            !href.includes('/explore/') &&
                            !href.includes('/reel/')
                        ) {
                            return text;
                        }
                    }
                }
                return '';
            }
        """)
        return (username or "").strip().lstrip("@")
    except Exception:
        return ""


def get_post_text(page, post_url: str, debug: bool = False) -> tuple[str, str]:
    """Navigate to an Instagram post and return (caption, username)."""
    try:
        page.goto(post_url, wait_until="domcontentloaded", timeout=30000)
    except PlaywrightTimeout:
        return "", ""

    dismiss_dialogs(page)

    # Wait for article — Instagram renders asynchronously after domcontentloaded
    try:
        page.wait_for_selector("article", timeout=10000)
    except PlaywrightTimeout:
        pass

    # Waiting for the comment textarea appearing signals the full post has rendered
    try:
        page.wait_for_selector(
            'textarea[placeholder*="comment"], textarea[placeholder*="Add a comment"]',
            timeout=8000,
        )
    except PlaywrightTimeout:
        pass

    human_delay(1, 2)

    # Expand truncated caption if present
    try:
        for sel in [
            'span[role="button"]:has-text("more")',
            'button:has-text("more")',
        ]:
            more_btn = page.query_selector(sel)
            if more_btn and more_btn.is_visible():
                more_btn.click()
                human_delay(0.5, 1)
                break
    except Exception:
        pass

    if debug:
        debug_file = SCRIPT_DIR / "debug_post.html"
        debug_file.write_text(page.content())
        print(f"  [debug] HTML saved to {debug_file}")

    try:
        caption = page.evaluate("""
            () => {
                // h1 — newer Instagram desktop puts caption here
                const h1 = document.querySelector('article h1');
                if (h1 && h1.innerText.trim().length > 20)
                    return h1.innerText.trim().slice(0, 1500);

                const article = document.querySelector('article');
                if (article) {
                    // span[dir="auto"] — Instagram always marks user text with dir="auto"
                    for (const el of article.querySelectorAll('span[dir="auto"]')) {
                        const t = el.innerText.trim();
                        if (t.length > 30) return t.slice(0, 1500);
                    }
                    // div[dir="auto"] — some layouts use div instead
                    for (const el of article.querySelectorAll('div[dir="auto"]')) {
                        const t = el.innerText.trim();
                        if (t.length > 30) return t.slice(0, 1500);
                    }
                }

                // Last resort: any dir="auto" element on the page
                for (const el of document.querySelectorAll('[dir="auto"]')) {
                    const t = el.innerText.trim();
                    if (t.length > 30) return t.slice(0, 1500);
                }

                return '';
            }
        """)
    except Exception:
        caption = ""

    username = extract_username_from_page(page)
    return caption or "", username


def extract_posts_from_hashtag(page, hashtag: str, seen: set) -> list[str]:
    """Browse an Instagram hashtag page and return unseen post URLs."""
    url = f"https://www.instagram.com/explore/tags/{hashtag}/"
    print(f"\n  Browsing hashtag: #{hashtag}")

    try:
        page.goto(url, wait_until="domcontentloaded", timeout=20000)
        human_delay(3, 5)
    except PlaywrightTimeout:
        print("  [timeout] Hashtag page too slow — skipping")
        return []

    dismiss_dialogs(page)

    if "login" in page.url or "accounts" in page.url:
        print("  [warn] Redirected to login — session may be expired")
        return []

    # Try to switch to "Recent" posts tab so we get fresh content
    try:
        recent_tab = page.query_selector(
            'a:has-text("Recent"), [role="tab"]:has-text("Recent")'
        )
        if recent_tab and recent_tab.is_visible():
            recent_tab.click()
            human_delay(1.5, 2.5)
    except Exception:
        pass

    # Scroll to load more posts
    for _ in range(3):
        page.evaluate("window.scrollBy(0, window.innerHeight * 0.8)")
        human_delay(1.5, 2.5)

    try:
        post_urls = page.evaluate("""
            () => {
                const seen = new Set();
                const results = [];
                document.querySelectorAll('a[href*="/p/"]').forEach(a => {
                    const href = (a.href || '').split('?')[0];
                    if (href.match(/instagram\\.com\\/p\\/[A-Za-z0-9_-]+/) && !seen.has(href)) {
                        seen.add(href);
                        results.push(href.replace(/\\/$/, '') + '/');
                    }
                });
                return results;
            }
        """)
    except Exception as e:
        print(f"  [error] Could not extract post links: {e}")
        return []

    new_posts = [u for u in post_urls if u not in seen]
    print(f"  Found {len(new_posts)} new posts (from {len(post_urls)} total on page)")
    return new_posts[:MAX_POSTS_PER_HASHTAG]


def post_comment_on_instagram(page, comment: str) -> bool:
    """Post a comment on the currently open Instagram post page. Returns True on success."""
    for _ in range(2):
        page.evaluate("window.scrollBy(0, 400)")
        human_delay(0.8, 1.5)

    def find_textarea(timeout=5000):
        for sel in [
            'textarea[placeholder*="Add a comment"]',
            'textarea[placeholder*="comment"]',
            'form textarea',
            'textarea',
        ]:
            try:
                el = page.wait_for_selector(sel, timeout=timeout)
                if el and el.is_visible():
                    return el
            except PlaywrightTimeout:
                continue
            except Exception:
                return None
        return None

    textarea = find_textarea()
    if not textarea:
        print("  [error] Could not find comment textarea")
        return False

    try:
        textarea.click()
        # Instagram re-renders the textarea on focus (React unmount/remount).
        # Wait for it to settle, then type via page.keyboard which operates on
        # whatever is currently focused — no stale element handle needed.
        human_delay(1.0, 1.8)
    except Exception as e:
        print(f"  [error] Could not click textarea: {e}")
        return False

    try:
        page.keyboard.type(comment, delay=random.randint(40, 100))
    except Exception as e:
        print(f"  [error] Typing failed: {e}")
        return False

    human_delay(0.8, 1.5)

    # Re-find a fresh textarea handle — the original is stale after React re-render
    def get_comment_textarea():
        for sel in [
            'textarea[placeholder*="Add a comment"]',
            'textarea[placeholder*="comment"]',
            'form textarea',
        ]:
            try:
                el = page.query_selector(sel)
                if el and el.is_visible():
                    return el
            except Exception:
                pass
        return None

    def textarea_has_text() -> bool:
        """Return True if the comment textarea still contains text (= not yet submitted)."""
        try:
            val = page.evaluate("""
                () => {
                    // Find the textarea that's inside the comment form (not Stories/Reels inputs)
                    for (const ta of document.querySelectorAll('textarea')) {
                        const rect = ta.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0 && ta.value.trim()) return ta.value.trim();
                    }
                    return '';
                }
            """)
            return bool(val)
        except Exception:
            return False  # element gone = submitted

    # Method 1: re-focus the textarea then press Enter (most reliable for React)
    fresh_ta = get_comment_textarea()
    if fresh_ta:
        try:
            fresh_ta.click()
            time.sleep(0.4)
            fresh_ta.press("Enter")
            human_delay(2, 3)
            if not textarea_has_text():
                print("  [submit] Enter on focused textarea — verified")
                return True
            print("  [warn] Enter on textarea — text still present, trying JS click")
        except Exception as e:
            print(f"  [warn] textarea.press Enter failed: {e}")

    # Method 2: JS click — find Post button inside the same form as the textarea
    try:
        coords = page.evaluate("""
            () => {
                for (const ta of document.querySelectorAll('textarea')) {
                    const form = ta.closest('form') || ta.parentElement;
                    if (!form) continue;
                    for (const btn of form.querySelectorAll('button, [role="button"], div[role="button"]')) {
                        const rect = btn.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0 && btn.innerText.trim() === 'Post') {
                            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
                        }
                    }
                }
                return null;
            }
        """)
        if coords:
            page.mouse.click(coords["x"], coords["y"])
            human_delay(2, 3)
            if not textarea_has_text():
                print("  [submit] Mouse click on form Post button — verified")
                return True
            print("  [warn] Form Post button clicked — text still present, trying requestSubmit")
    except Exception as e:
        print(f"  [warn] JS coords click failed: {e}")

    # Method 3: form.requestSubmit()
    try:
        ok = page.evaluate("""
            () => {
                for (const ta of document.querySelectorAll('textarea')) {
                    const form = ta.closest('form');
                    if (form) { try { form.requestSubmit(); return true; } catch(e) {} }
                }
                return false;
            }
        """)
        if ok:
            human_delay(2, 3)
            if not textarea_has_text():
                print("  [submit] form.requestSubmit — verified")
                return True
    except Exception:
        pass

    print("  [fail] Could not confirm comment was posted")
    return False


def run(dry_run: bool = False, debug: bool = False):
    if not SESSION_PATH.exists():
        print(f"No session found at {SESSION_PATH}")
        print("Run with --login first.")
        sys.exit(1)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ANTHROPIC_API_KEY not set.")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)
    seen = load_seen()
    seen_authors = load_seen_authors()
    comments_posted = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = browser.new_context(
            storage_state=str(SESSION_PATH),
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
        )
        page = context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        # Verify session is still valid
        page.goto("https://www.instagram.com/", wait_until="domcontentloaded", timeout=20000)
        human_delay(2, 4)
        dismiss_dialogs(page)

        if "login" in page.url or "accounts" in page.url:
            print("Session expired. Run with --login to refresh.")
            browser.close()
            sys.exit(1)

        for hashtag in HASHTAGS:
            if comments_posted >= MAX_COMMENTS_PER_RUN:
                break

            try:
                post_urls = extract_posts_from_hashtag(page, hashtag, seen)
            except Exception as e:
                print(f"  [error] Hashtag '#{hashtag}' failed: {e}")
                continue

            human_delay(6, 12)

            for post_url in post_urls:
                if comments_posted >= MAX_COMMENTS_PER_RUN:
                    break

                print(f"\n  Opening: {post_url}")

                try:
                    caption, username = get_post_text(page, post_url, debug=debug)
                except Exception as e:
                    print(f"  [error] Could not open post: {e}")
                    seen.add(post_url)
                    continue

                if not caption or len(caption) < 20:
                    print("  [skip] No caption or too short")
                    seen.add(post_url)
                    continue

                print(f"  Caption: {caption[:200]}...")
                if username:
                    print(f"  Author: @{username}")

                if username and author_on_cooldown(seen_authors, username):
                    last_ts = seen_authors[username][:10]
                    print(f"  [skip] Commented on @{username}'s post on {last_ts} — cooldown active")
                    seen.add(post_url)
                    continue

                if not is_relevant(client, caption):
                    print("  [skip] Not relevant to XIRR/investing")
                    seen.add(post_url)
                    continue

                comment = draft_comment(client, caption)
                if not comment:
                    continue

                print(f"  Comment draft:\n    {comment}\n")

                if dry_run:
                    log_comment(post_url, caption, comment, posted=False)
                    seen.add(post_url)
                    if username:
                        seen_authors[username] = datetime.now().isoformat()
                    comments_posted += 1
                    print("  [dry-run] Not posting.")
                else:
                    ok = post_comment_on_instagram(page, comment)
                    log_comment(post_url, caption, comment, posted=ok)
                    if ok:
                        print("  [ok] Comment posted")
                        seen.add(post_url)
                        if username:
                            seen_authors[username] = datetime.now().isoformat()
                        comments_posted += 1
                        # Save immediately so a concurrent/next run won't re-post
                        save_seen(seen)
                        save_seen_authors(seen_authors)
                    else:
                        print("  [fail] Could not post — will retry next run")
                    human_delay(25, 45)  # Instagram needs longer cooldown between comments

        browser.close()

    save_seen(seen)
    save_seen_authors(seen_authors)
    print(f"\nDone. {'Drafted' if dry_run else 'Posted'} {comments_posted} comments.")
    print(f"Log: {LOG_FILE}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--login", action="store_true", help="Open browser for manual Instagram login")
    parser.add_argument("--dry-run", action="store_true", help="Draft comments but don't post them")
    parser.add_argument("--debug", action="store_true", help="Save page HTML to debug_post.html on first post, then exit")
    args = parser.parse_args()

    with sync_playwright() as p:
        if args.login:
            do_login(p)
            return

    run(dry_run=args.dry_run, debug=args.debug)


if __name__ == "__main__":
    main()
