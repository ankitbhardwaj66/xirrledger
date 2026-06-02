#!/usr/bin/env python3
"""
X.com XIRR Commenter
Finds posts about XIRR/portfolio returns on X.com and replies with helpful comments
that naturally reference xirrledger.com.

Usage:
    Login:     python x_commenter.py --login
    Dry run:   python x_commenter.py --dry-run
    Comment:   python x_commenter.py
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
SESSION_PATH = SCRIPT_DIR / ".x_session" / "state.json"
SEEN_FILE = SCRIPT_DIR / ".seen_posts.json"
SEEN_AUTHORS_FILE = SCRIPT_DIR / ".seen_authors.json"
LOG_FILE = SCRIPT_DIR / "comments_log.jsonl"

SEARCH_QUERIES = [
    "xirr portfolio",
    "XIRR Zerodha",
    "XIRR Groww",
    "portfolio returns India",
    "calculate XIRR",
]

MAX_POSTS_PER_QUERY = 8
MAX_COMMENTS_PER_RUN = 5   # conservative — X is stricter about rate limits
AUTHOR_COOLDOWN_DAYS = 14  # longer than LinkedIn to reduce spam risk

RELEVANCE_PROMPT = """You are screening posts from X.com (Twitter) to decide whether to reply for XIRR Ledger (xirrledger.com) — a free tool for Indian investors to calculate true portfolio XIRR from broker ledgers (Zerodha, Groww, etc.).

Reply with YES if the post is about ANY of:
- XIRR, CAGR, portfolio returns, SIP returns, investment performance
- Zerodha, Groww, or other Indian broker ledger/P&L topics
- Mutual fund or stock portfolio tracking
- Personal finance / investing in India

Reply with NO for anything else (political posts, polls unrelated to investing, company news, memes, etc.).

Reply with just YES or NO."""

SYSTEM_PROMPT = """You are an Indian retail investor who does stock investing, replying to a post on X.com (Twitter).

First, classify the post:
- TYPE A: The person is sharing their own XIRR / portfolio returns and saying they're doing well in investing (celebrating or showing off their returns)
- TYPE B: The post is informational, educational, or asking about XIRR/investing (not sharing their own returns)
- TYPE C: The person is complaining or frustrated that their broker's XIRR is wrong, missing, or unreliable
- TYPE D: The person is sad or discouraged because their XIRR came out very low (as shown by their broker app)

Then write a SHORT, natural reply — 1-2 sentences only, strictly under 250 characters total.

For TYPE A (person sharing their XIRR/returns):
- Congratulate them genuinely
- Ask if they've verified it on xirrledger.com — it reads off the broker ledger so it's very accurate

For TYPE B (informational post):
- One short appreciative phrase (or skip if the post doesn't warrant it)
- Mention you track your XIRR on xirrledger.com — it reads off your broker ledger so it's very accurate, they can try it too

For TYPE C (person frustrated with broker XIRR):
- Empathize — say you've faced the same issue, brokers either don't show it or show it wrong
- Share that you use xirrledger.com because it reads off the broker ledger directly, so it's accurate

Rules:
- NEVER say "SIP" or "mutual fund"
- Sound like a real person sharing a personal habit, NOT a marketer
- Conversational and slightly informal
- No hashtags, no emojis
- Under 250 characters — keep it tight

Good examples for TYPE A:
"Congrats on the returns! Have you verified it on xirrledger.com? It reads straight off your broker ledger so every transaction and charge is captured — makes the number super accurate."
"Nice returns! Worth cross-checking on xirrledger.com — calculates directly from your ledger so stocks, F&O, and all charges are included."

Good examples for TYPE B:
"Good take. I track mine on xirrledger.com — it reads off the broker ledger so stocks, F&O, and all charges are included. Super accurate."
"Relatable! I use xirrledger.com every few weeks — ledger-based so it captures everything including charges. Worth it."

For TYPE D (person sad about low XIRR from broker):
- Acknowledge their disappointment briefly
- Gently suggest broker XIRR might not be fully accurate
- Recommend checking on xirrledger.com — it's more accurate since it reads off the actual ledger, the real number might look different

Good examples for TYPE C:
"Feel your pain — brokers either don't show XIRR or show it wrong. Switched to xirrledger.com, it reads off the ledger directly so the number is actually accurate."
"Same issue here. Brokers can't be trusted for this. I use xirrledger.com now — calculates from the actual ledger so every transaction and charge is captured."

Good examples for TYPE D:
"Oof, that hurts. Though broker XIRR isn't always accurate — worth checking on xirrledger.com, it reads off your actual ledger so the real number might look different."
"That's rough. But broker apps don't always calculate XIRR right. Try xirrledger.com — ledger-based so it captures everything accurately. Might be a different picture."

Return ONLY the reply text. Nothing else."""


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


def extract_author_from_url(tweet_url: str) -> str:
    """Extract username from https://x.com/username/status/id"""
    m = re.search(r'x\.com/([^/]+)/status/', tweet_url)
    return m.group(1).lower() if m else ""


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


def do_login(playwright):
    print("\n--- X.com Login ---")
    print("A browser will open. Log in manually, then press Enter here.\n")
    browser = playwright.chromium.launch(
        headless=False,
        args=["--disable-blink-features=AutomationControlled"],
    )
    context = browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport={"width": 1280, "height": 900},
    )
    page = context.new_page()
    page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    page.goto("https://x.com/login")
    input("\nPress Enter after you've logged in and see your home feed...")

    page.goto("https://x.com/home", wait_until="domcontentloaded")
    time.sleep(3)
    if "home" in page.url or "x.com" in page.url:
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
            max_tokens=120,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": f"X.com post:\n\n{post_text}\n\nWrite a reply."}
            ],
        )
        comment = resp.content[0].text.strip()
        # Hard trim if over limit — shouldn't happen but safety net
        if len(comment) > 270:
            comment = comment[:270].rsplit(" ", 1)[0]
        return comment
    except Exception as e:
        print(f"  [claude] Error drafting comment: {e}")
        return None


def extract_posts_from_search(page, query: str, seen: set) -> list[dict]:
    """Search X.com for posts and return unseen tweet links."""
    encoded = query.replace(" ", "%20")
    url = f"https://x.com/search?q={encoded}&f=live&src=typed_query"
    print(f"\n  Searching: {query}")

    try:
        page.goto(url, wait_until="domcontentloaded", timeout=25000)
        human_delay(3, 5)
    except PlaywrightTimeout:
        print("  [timeout] Search page took too long — skipping")
        return []
    except Exception as e:
        print(f"  [error] Navigation failed: {e}")
        return []

    # Dismiss any modal/popup
    try:
        page.keyboard.press("Escape")
        human_delay(0.5, 1)
    except Exception:
        pass

    # Wait for at least one tweet to appear
    try:
        page.wait_for_selector('article[data-testid="tweet"]', timeout=12000)
    except PlaywrightTimeout:
        print("  [warn] No tweets appeared — skipping query")
        return []

    collected = {}  # url -> snippet text
    already_processed = 0

    for _scroll_attempt in range(12):
        if len(collected) >= MAX_POSTS_PER_QUERY:
            break

        try:
            tweets = page.query_selector_all('article[data-testid="tweet"]')
        except Exception:
            break

        new_tweets = tweets[already_processed:]
        already_processed = len(tweets)

        for tweet in new_tweets:
            if len(collected) >= MAX_POSTS_PER_QUERY:
                break
            try:
                # Get tweet URL from the timestamp link
                time_link = tweet.query_selector('a[href*="/status/"]')
                if not time_link:
                    continue
                href = time_link.get_attribute("href") or ""
                if not href:
                    continue
                tweet_url = f"https://x.com{href}" if href.startswith("/") else href
                tweet_url = tweet_url.split("?")[0]

                if tweet_url in seen or tweet_url in collected:
                    continue

                # Get snippet text
                text_el = tweet.query_selector('[data-testid="tweetText"]')
                snippet = text_el.inner_text().strip() if text_el else ""

                collected[tweet_url] = snippet
                print(f"  Collected: ...{tweet_url[-60:]}")
            except Exception:
                continue

        if len(collected) < MAX_POSTS_PER_QUERY:
            page.evaluate("window.scrollBy(0, window.innerHeight * 0.9)")
            human_delay(2, 3)

    posts = [{"url": u, "text": t} for u, t in list(collected.items())[:MAX_POSTS_PER_QUERY]]
    print(f"  Found {len(posts)} new tweets")
    return posts


def get_full_tweet_text(page, tweet_url: str) -> str:
    """Navigate to tweet detail and return its full text."""
    try:
        page.goto(tweet_url, wait_until="domcontentloaded", timeout=25000)
        human_delay(2, 4)
    except PlaywrightTimeout:
        return ""

    try:
        page.wait_for_selector('article[data-testid="tweet"]', timeout=10000)
    except PlaywrightTimeout:
        pass

    try:
        # The first tweet article on a detail page is the original post
        text_el = page.query_selector('article[data-testid="tweet"] [data-testid="tweetText"]')
        if text_el:
            return text_el.inner_text().strip()
    except Exception:
        pass

    return ""


def dismiss_premium_popup(page):
    """Dismiss the 'Want more people to see your reply?' premium upsell popup if present."""
    try:
        btn = page.query_selector('button:has-text("Maybe later")')
        if btn and btn.is_visible():
            btn.click()
            print("  [popup] Dismissed premium upsell")
            human_delay(0.5, 1)
    except Exception:
        pass


def post_reply_on_x(page, tweet_url: str, comment: str) -> bool:
    """Post a reply to the tweet already loaded at tweet_url. Returns True on success."""
    human_delay(1, 2)

    def find_reply_textarea(timeout=8000):
        """Find the reply textbox on the tweet detail page."""
        selectors = [
            '[data-testid="tweetTextarea_0"]',
            'div[role="textbox"][contenteditable="true"]',
            'div[contenteditable="true"][data-block="true"]',
        ]
        for sel in selectors:
            try:
                el = page.wait_for_selector(sel, timeout=timeout)
                if el and el.is_visible():
                    return el
            except PlaywrightTimeout:
                continue
            except Exception:
                return None
        return None

    # On tweet detail page there's an inline reply box — try to find it directly
    textarea = find_reply_textarea(timeout=5000)

    if not textarea:
        # Try clicking the reply button on the first tweet card
        try:
            btn = page.query_selector('article[data-testid="tweet"] button[data-testid="reply"]')
            if btn and btn.is_visible():
                btn.click()
                human_delay(1, 2)
        except Exception:
            pass
        textarea = find_reply_textarea(timeout=8000)

    if not textarea:
        print("  [error] Could not find reply textarea")
        return False

    try:
        textarea.click()
        human_delay(0.5, 1)

        # Type with human-like pacing
        for char in comment:
            textarea.type(char, delay=random.randint(30, 80))
            if random.random() < 0.04:
                time.sleep(random.uniform(0.2, 0.5))
    except Exception as e:
        print(f"  [error] Typing failed: {e}")
        return False

    human_delay(1, 2)

    # Find and click the Reply submit button.
    # X.com keeps the textarea visible after posting (for the next reply),
    # so we cannot verify by checking if it emptied. Trust the button click instead —
    # the Reply button is only enabled when there is typed text to submit.

    # Primary: tweetButton
    try:
        btn = page.query_selector('[data-testid="tweetButton"]')
        if not btn:
            btn = page.query_selector('[data-testid="tweetButtonInline"]')
        if btn and btn.is_visible():
            btn.click()
            print(f"  [submit] tweetButton click")
            human_delay(3, 5)
            dismiss_premium_popup(page)
            return True
    except Exception as e:
        print(f"  [submit] tweetButton failed: {e}")

    # Fallback: Ctrl+Enter
    try:
        textarea.focus()
        time.sleep(0.4)
        page.keyboard.press("Control+Enter")
        print(f"  [submit] Ctrl+Enter")
        human_delay(3, 5)
        dismiss_premium_popup(page)
        return True
    except Exception as e:
        print(f"  [submit] Ctrl+Enter failed: {e}")

    # Last resort: Meta+Enter
    try:
        textarea.focus()
        time.sleep(0.4)
        page.keyboard.press("Meta+Enter")
        print(f"  [submit] Meta+Enter")
        human_delay(3, 5)
        dismiss_premium_popup(page)
        return True
    except Exception as e:
        print(f"  [submit] Meta+Enter failed: {e}")

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
            viewport={"width": 1280, "height": 900},
            permissions=["clipboard-read", "clipboard-write"],
        )
        page = context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        # Verify session is valid
        page.goto("https://x.com/home", wait_until="domcontentloaded", timeout=20000)
        human_delay(2, 4)
        if "login" in page.url or "i/flow/login" in page.url:
            print("Session expired. Run with --login to refresh.")
            browser.close()
            sys.exit(1)

        for query in SEARCH_QUERIES:
            if comments_posted >= MAX_COMMENTS_PER_RUN:
                break

            try:
                post_links = extract_posts_from_search(page, query, seen)
            except Exception as e:
                print(f"  [error] Query '{query}' failed: {e}")
                break
            human_delay(8, 12)

            for post in post_links:
                if comments_posted >= MAX_COMMENTS_PER_RUN:
                    break

                post_url = post["url"]
                snippet = post["text"]
                print(f"\n  Opening: {post_url}")

                try:
                    page.keyboard.press("Escape")
                    human_delay(0.5, 1)
                except Exception:
                    pass

                username = extract_author_from_url(post_url)
                if username and author_on_cooldown(seen_authors, username):
                    last_ts = seen_authors[username][:10]
                    print(f"  [skip] Replied to @{username} on {last_ts} — cooldown active")
                    seen.add(post_url)
                    continue

                # Navigate to tweet and get full text
                try:
                    full_text = get_full_tweet_text(page, post_url)
                except Exception as e:
                    print(f"  [error] Could not open tweet: {e}")
                    break

                text_to_check = full_text if len(full_text) > 40 else snippet
                if not text_to_check or len(text_to_check) < 20:
                    print("  [skip] Could not read tweet text")
                    seen.add(post_url)
                    continue

                print(f"  Text: {text_to_check[:200]}...")

                if not is_relevant(client, text_to_check):
                    print("  [skip] Not relevant to XIRR/investing")
                    seen.add(post_url)
                    continue

                comment = draft_comment(client, text_to_check)
                if not comment:
                    continue

                print(f"  Reply draft ({len(comment)} chars):\n    {comment}\n")

                if dry_run:
                    log_comment(post_url, text_to_check, comment, posted=False)
                    seen.add(post_url)
                    if username:
                        seen_authors[username] = datetime.now().isoformat()
                    comments_posted += 1
                    print("  [dry-run] Not posting.")
                else:
                    ok = post_reply_on_x(page, post_url, comment)
                    log_comment(post_url, text_to_check, comment, posted=ok)
                    if ok:
                        print(f"  [ok] Reply posted")
                        seen.add(post_url)
                        if username:
                            seen_authors[username] = datetime.now().isoformat()
                        comments_posted += 1
                        # Save immediately so a concurrent/next run won't re-post
                        save_seen(seen)
                        save_seen_authors(seen_authors)
                    else:
                        print(f"  [fail] Could not post — will retry next run")

                    human_delay(20, 40)  # longer cooldown between replies on X

        browser.close()

    save_seen(seen)
    save_seen_authors(seen_authors)
    print(f"\nDone. {'Drafted' if dry_run else 'Posted'} {comments_posted} replies.")
    print(f"Log: {LOG_FILE}")


def main():
    # DISABLED — account @jgdankit was locked by X for inauthentic behaviour.
    # Do not re-enable until account is fully restored and a safer approach is planned.
    print("X commenter is currently disabled. Exiting.")
    sys.exit(0)

    parser = argparse.ArgumentParser()
    parser.add_argument("--login", action="store_true", help="Open browser for manual X.com login")
    parser.add_argument("--dry-run", action="store_true", help="Draft replies but don't post them")
    args = parser.parse_args()

    with sync_playwright() as p:
        if args.login:
            do_login(p)
            return

    run(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
