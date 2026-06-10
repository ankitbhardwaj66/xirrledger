#!/usr/bin/env python3
"""
YouTube Shorts XIRR Commenter
Finds YouTube Shorts about XIRR/investing and posts helpful comments
that naturally reference xirrledger.com.

Usage:
    Login:     python youtube_commenter.py --login
    Dry run:   python youtube_commenter.py --dry-run
    Comment:   python youtube_commenter.py
"""

from __future__ import annotations

import argparse
import json
import os
import random
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import anthropic
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

SCRIPT_DIR   = Path(__file__).parent
SESSION_PATH = SCRIPT_DIR / ".youtube_session.json"
SEEN_FILE    = SCRIPT_DIR / ".seen_videos.json"
SEEN_AUTHORS_FILE = SCRIPT_DIR / ".seen_authors.json"
LOG_FILE     = SCRIPT_DIR / "comments_log.jsonl"

# Search queries — YouTube Shorts about XIRR / Indian investing
SEARCH_QUERIES = [
    "xirr portfolio returns",
    "zerodha xirr",
    "groww xirr returns",
    "portfolio returns india",
    "calculate xirr india",
    "stock portfolio india shorts",
    "mutual fund xirr",
    "zerodha portfolio shorts",
]

MAX_VIDEOS_PER_QUERY = 6
MAX_COMMENTS_PER_RUN = 5
AUTHOR_COOLDOWN_DAYS = 21  # YouTube is strict — longer cooldown

RELEVANCE_PROMPT = """You are screening YouTube Shorts to decide whether to comment on them for XIRR Ledger (xirrledger.com) — a free tool for Indian investors to calculate true portfolio XIRR from broker ledgers (Zerodha, Groww, etc.).

Reply with YES if the video is about ANY of:
- XIRR, CAGR, portfolio returns, SIP returns, investment performance
- Zerodha, Groww, or other Indian broker P&L topics
- Mutual fund or stock portfolio tracking
- Personal finance / investing in India

Reply with NO for anything else (unrelated topics, product ads, non-investing content, etc.).

Reply with just YES or NO."""

SYSTEM_PROMPT = """You are an Indian retail investor who does stock investing, leaving a comment on a YouTube Shorts video.

First, classify the video:
- TYPE A: Creator is showing/celebrating their own XIRR or portfolio returns (bragging or sharing performance)
- TYPE B: Video is informational/educational about XIRR or investing (not sharing their own returns)
- TYPE C: Creator is frustrated or complaining that their broker XIRR is wrong, missing, or unreliable
- TYPE D: Creator is sad or discouraged because their XIRR came out very low

Then write a SHORT, natural comment — 1-2 sentences max.

For TYPE A (showing their XIRR/returns):
- Congratulate them genuinely
- Ask if they verified it on xirrledger.com — it reads off the actual broker ledger so it's very accurate

For TYPE B (informational/educational):
- Brief reaction or agreement
- Mention you track yours on xirrledger.com — ledger-based so it captures every transaction and charge

For TYPE C (frustrated with broker XIRR):
- Empathize — say you faced the same, brokers don't show it or show it wrong
- Share that xirrledger.com fixed it for you — reads off the actual ledger

For TYPE D (sad about low XIRR):
- Acknowledge their pain briefly
- Suggest broker XIRR might not be accurate — worth checking on xirrledger.com, the real number might look different

Rules:
- Sound like a real person, not a marketer
- Casual YouTube comment style
- No hashtags, no emojis
- Under 2 sentences

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
                    url = entry.get("video_url", "")
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


def author_on_cooldown(seen_authors: dict, channel_id: str) -> bool:
    if channel_id not in seen_authors:
        return False
    last = datetime.fromisoformat(seen_authors[channel_id])
    return datetime.now() - last < timedelta(days=AUTHOR_COOLDOWN_DAYS)


def log_comment(video_url: str, video_title: str, comment: str, posted: bool):
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps({
            "timestamp": datetime.now().isoformat(),
            "video_url": video_url,
            "video_title": video_title[:200],
            "comment": comment,
            "posted": posted,
        }) + "\n")


def human_delay(min_sec: float, max_sec: float):
    time.sleep(random.uniform(min_sec, max_sec))


def dismiss_dialogs(page):
    for text in ["No thanks", "Not now", "Skip", "Dismiss", "Reject all", "Accept all"]:
        try:
            btn = page.query_selector(f'button:has-text("{text}"), [aria-label*="{text}"]')
            if btn and btn.is_visible():
                btn.click()
                time.sleep(0.5)
        except Exception:
            pass
    try:
        page.keyboard.press("Escape")
        time.sleep(0.3)
    except Exception:
        pass


def do_login(playwright):
    print("\n--- YouTube Login ---")
    print("A browser will open. Log in with your Google account, then press Enter.\n")
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
    page.goto("https://www.youtube.com", wait_until="domcontentloaded")
    input("\nLog in to YouTube, then press Enter here...")

    page.goto("https://www.youtube.com", wait_until="domcontentloaded")
    time.sleep(3)
    dismiss_dialogs(page)

    # Verify logged in by checking for avatar
    avatar = page.query_selector('#avatar-btn, button[aria-label*="account"]')
    if avatar:
        SESSION_PATH.parent.mkdir(parents=True, exist_ok=True)
        context.storage_state(path=str(SESSION_PATH))
        print(f"Session saved to {SESSION_PATH}")
    else:
        print("Could not verify login — please try again.")
    browser.close()


def is_relevant(client: anthropic.Anthropic, text: str) -> bool:
    try:
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=5,
            system=RELEVANCE_PROMPT,
            messages=[{"role": "user", "content": text[:600]}],
        )
        return resp.content[0].text.strip().upper().startswith("YES")
    except Exception:
        return False


def draft_comment(client: anthropic.Anthropic, video_text: str) -> Optional[str]:
    try:
        resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=120,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"YouTube Shorts video title/description:\n\n{video_text}\n\nWrite a comment."}],
        )
        return resp.content[0].text.strip()
    except Exception as e:
        print(f"  [claude] Error drafting comment: {e}")
        return None


def search_shorts(page, query: str, seen: set) -> list[dict]:
    """Search YouTube for Shorts matching the query and return unseen video info."""
    encoded = query.replace(" ", "+")
    # Filter for Shorts specifically
    url = f"https://www.youtube.com/results?search_query={encoded}&sp=EgIYAQ%253D%253D"
    print(f"\n  Searching: {query}")

    try:
        page.goto(url, wait_until="domcontentloaded", timeout=25000)
        human_delay(3, 5)
    except PlaywrightTimeout:
        print("  [timeout] Search took too long — skipping")
        return []

    dismiss_dialogs(page)

    # Scroll to load more results
    for _ in range(3):
        page.evaluate("window.scrollBy(0, window.innerHeight * 0.8)")
        human_delay(1.5, 2.5)

    try:
        videos = page.evaluate("""
            () => {
                const seen = new Set();
                const results = [];
                // Shorts appear as /shorts/VIDEO_ID links
                document.querySelectorAll('a[href*="/shorts/"]').forEach(a => {
                    const href = (a.href || '').split('?')[0];
                    if (!href.match(/youtube\\.com\\/shorts\\/[A-Za-z0-9_-]+/)) return;
                    if (seen.has(href)) return;
                    seen.add(href);

                    // Get title from aria-label or nearby text
                    const label = a.getAttribute('aria-label') || '';
                    const titleEl = a.querySelector('#video-title, span#video-title');
                    const title = titleEl ? titleEl.innerText.trim() : label.split(' by ')[0].trim();

                    // Try to get channel name
                    const channelEl = document.querySelector(`[href="${a.getAttribute('href')}"] ~ * #channel-name, [href="${a.getAttribute('href')}"] ~ * #metadata`);
                    const channel = channelEl ? channelEl.innerText.trim().split('\\n')[0] : '';

                    if (title || label) {
                        results.push({ url: href, title: title || label, channel: channel });
                    }
                });
                return results.slice(0, 8);
            }
        """)
    except Exception as e:
        print(f"  [error] Could not extract video links: {e}")
        return []

    new_videos = [v for v in videos if v["url"] not in seen]
    print(f"  Found {len(new_videos)} new Shorts")
    return new_videos[:MAX_VIDEOS_PER_QUERY]


def get_video_info(page, video_url: str) -> tuple[str, str, str]:
    """Open a Short and return (title, description, channel_id)."""
    try:
        page.goto(video_url, wait_until="domcontentloaded", timeout=25000)
        human_delay(2, 4)
    except PlaywrightTimeout:
        return "", "", ""

    dismiss_dialogs(page)

    try:
        page.wait_for_selector("ytd-reel-video-renderer, ytd-shorts", timeout=8000)
    except PlaywrightTimeout:
        pass

    human_delay(1, 2)

    try:
        info = page.evaluate("""
            () => {
                // Title
                const titleEl = document.querySelector(
                    'ytd-reel-player-header-renderer #title, ' +
                    'h1.ytd-reel-video-renderer, ' +
                    'yt-formatted-string.ytd-reel-player-header-renderer, ' +
                    'h2.ytd-shorts span, ' +
                    '[class*="title"]'
                );
                const title = document.title.replace(' - YouTube', '').trim();

                // Description / caption
                const descEl = document.querySelector(
                    '#description-text, ytd-expander #content, ' +
                    'yt-formatted-string[class*="description"]'
                );
                const desc = descEl ? descEl.innerText.trim().slice(0, 500) : '';

                // Channel
                const chanEl = document.querySelector(
                    'ytd-channel-name a, #channel-name a, ' +
                    '[class*="channelName"] a'
                );
                const channel = chanEl ? (chanEl.getAttribute('href') || '').replace('/','') : '';

                return { title, desc, channel };
            }
        """)
        return info.get("title", ""), info.get("desc", ""), info.get("channel", "")
    except Exception:
        return "", "", ""


def post_comment(page, comment: str) -> bool:
    """Post a comment on the currently open YouTube Short. Returns True on success."""
    human_delay(1, 2)

    # Scroll down to reveal comment section
    for _ in range(3):
        page.evaluate("window.scrollBy(0, 300)")
        human_delay(0.8, 1.5)

    # Find the comment input box
    comment_box = None
    for sel in [
        '#placeholder-area',
        'ytd-comment-simplebox-renderer #placeholder-area',
        '[placeholder*="comment"]',
        '#contenteditable-root',
    ]:
        try:
            el = page.wait_for_selector(sel, timeout=5000)
            if el and el.is_visible():
                comment_box = el
                break
        except PlaywrightTimeout:
            continue
        except Exception:
            break

    if not comment_box:
        print("  [error] Could not find comment box")
        return False

    try:
        comment_box.click()
        human_delay(1, 2)
    except Exception as e:
        print(f"  [error] Could not click comment box: {e}")
        return False

    # After clicking, the real editable input appears
    editor = None
    for sel in [
        '#contenteditable-root',
        'div[contenteditable="true"]',
        '#simple-box ytd-commentbox #input',
    ]:
        try:
            el = page.wait_for_selector(sel, timeout=5000)
            if el and el.is_visible():
                editor = el
                break
        except PlaywrightTimeout:
            continue

    if not editor:
        print("  [error] Could not find comment editor after click")
        return False

    try:
        editor.click()
        human_delay(0.5, 1)
        for char in comment:
            editor.type(char, delay=random.randint(40, 100))
            if random.random() < 0.04:
                time.sleep(random.uniform(0.2, 0.5))
    except Exception as e:
        print(f"  [error] Typing failed: {e}")
        return False

    human_delay(1, 2)

    # Click the Submit/Comment button
    for sel in [
        '#submit-button button',
        'ytd-button-renderer#submit-button button',
        'button[aria-label*="Comment"]',
        'button:has-text("Comment")',
    ]:
        try:
            btn = page.query_selector(sel)
            if btn and btn.is_visible() and btn.is_enabled():
                btn.click()
                human_delay(3, 5)
                print("  [submit] Comment button clicked")
                return True
        except Exception:
            pass

    # Fallback: Ctrl+Enter
    try:
        editor.focus()
        time.sleep(0.4)
        page.keyboard.press("Control+Enter")
        human_delay(3, 5)
        print("  [submit] Ctrl+Enter")
        return True
    except Exception:
        pass

    print("  [error] Could not submit comment")
    return False


def run(dry_run: bool = False):
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

        # Verify session
        page.goto("https://www.youtube.com", wait_until="domcontentloaded", timeout=20000)
        human_delay(2, 4)
        dismiss_dialogs(page)

        # Check if logged in
        avatar = page.query_selector('#avatar-btn, button[aria-label*="account"], #avatar-image')
        if not avatar:
            print("Session may have expired. Run with --login to refresh.")
            browser.close()
            sys.exit(1)

        for query in SEARCH_QUERIES:
            if comments_posted >= MAX_COMMENTS_PER_RUN:
                break

            try:
                videos = search_shorts(page, query, seen)
            except Exception as e:
                print(f"  [error] Query '{query}' failed: {e}")
                continue

            human_delay(6, 10)

            for video in videos:
                if comments_posted >= MAX_COMMENTS_PER_RUN:
                    break

                video_url = video["url"]
                print(f"\n  Opening: {video_url}")

                try:
                    page.keyboard.press("Escape")
                except Exception:
                    pass

                try:
                    title, desc, channel_id = get_video_info(page, video_url)
                except Exception as e:
                    print(f"  [error] Could not open video: {e}")
                    seen.add(video_url)
                    continue

                video_text = f"{title}\n{desc}".strip() or video.get("title", "")

                if not video_text or len(video_text) < 10:
                    print("  [skip] No title/description found")
                    seen.add(video_url)
                    continue

                print(f"  Title: {video_text[:150]}")

                if channel_id and author_on_cooldown(seen_authors, channel_id):
                    print(f"  [skip] Channel {channel_id} on cooldown")
                    seen.add(video_url)
                    continue

                if not is_relevant(client, video_text):
                    print("  [skip] Not relevant to XIRR/investing")
                    seen.add(video_url)
                    continue

                comment = draft_comment(client, video_text)
                if not comment:
                    continue

                print(f"  Comment draft:\n    {comment}\n")

                if dry_run:
                    log_comment(video_url, video_text, comment, posted=False)
                    seen.add(video_url)
                    if channel_id:
                        seen_authors[channel_id] = datetime.now().isoformat()
                    save_seen(seen)
                    save_seen_authors(seen_authors)
                    comments_posted += 1
                    print("  [dry-run] Not posting.")
                else:
                    ok = post_comment(page, comment)
                    log_comment(video_url, video_text, comment, posted=ok)
                    if ok:
                        print(f"  [ok] Comment posted")
                        seen.add(video_url)
                        if channel_id:
                            seen_authors[channel_id] = datetime.now().isoformat()
                        save_seen(seen)
                        save_seen_authors(seen_authors)
                        comments_posted += 1
                        human_delay(30, 60)  # YouTube needs long cooldown
                    else:
                        print(f"  [fail] Could not post — will retry next run")

        browser.close()

    print(f"\nDone. {'Drafted' if dry_run else 'Posted'} {comments_posted} comments.")
    print(f"Log: {LOG_FILE}")


def main():
    parser = argparse.ArgumentParser(description="YouTube Shorts XIRR Commenter")
    parser.add_argument("--login",   action="store_true", help="Open browser to log in to YouTube")
    parser.add_argument("--dry-run", action="store_true", help="Draft comments without posting")
    args = parser.parse_args()

    with sync_playwright() as p:
        if args.login:
            do_login(p)
            return

    run(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
