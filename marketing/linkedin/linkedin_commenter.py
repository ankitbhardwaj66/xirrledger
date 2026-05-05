#!/usr/bin/env python3
"""
LinkedIn XIRR Commenter
Finds LinkedIn posts about XIRR/portfolio returns and posts helpful comments
that naturally reference xirrledger.com.

Usage:
    Login:     python linkedin_commenter.py --login
    Dry run:   python linkedin_commenter.py --dry-run
    Comment:   python linkedin_commenter.py
"""

import argparse
import json
import os
import random
import re
import sys
import time
from datetime import datetime
from pathlib import Path

import anthropic
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

SCRIPT_DIR = Path(__file__).parent
SESSION_PATH = Path("/Users/ankitbhardwaj/Documents/GitHub/contact-job-hunt/.linkedin_session/state.json")
SEEN_FILE = SCRIPT_DIR / ".seen_posts.json"
SEEN_AUTHORS_FILE = SCRIPT_DIR / ".seen_authors.json"
LOG_FILE = SCRIPT_DIR / "comments_log.jsonl"

# Search queries — sorted by specificity/intent
SEARCH_QUERIES = [
    "xirr portfolio",
    "XIRR Zerodha",
    "XIRR Groww",
    "portfolio returns India",
    "calculate XIRR",
]

MAX_POSTS_PER_QUERY = 10
MAX_COMMENTS_PER_RUN = 12

RELEVANCE_PROMPT = """You are screening LinkedIn posts to decide whether to comment on them for XIRR Ledger (xirrledger.com) — a free tool for Indian investors to calculate true portfolio XIRR from broker ledgers (Zerodha, Groww, etc.).

Reply with YES if the post is about ANY of:
- XIRR, CAGR, portfolio returns, SIP returns, investment performance
- Zerodha, Groww, or other Indian broker ledger/P&L topics
- Mutual fund or stock portfolio tracking
- Personal finance / investing in India

Reply with NO for anything else (job posts, polls unrelated to investing, company news, etc.).

Reply with just YES or NO."""

SYSTEM_PROMPT = """You are an Indian retail investor who does stock investing (swing trades and long-term stock holdings), commenting on a LinkedIn post.

Write a SHORT, natural comment — 1-2 sentences max. Rules:
- Appreciate the post briefly
- Mention you used xirrledger.com to track your portfolio returns / calculate XIRR
- Say it's more accurate than broker apps because it accounts for all charges (brokerage, STT, etc.)
- NEVER say "SIP", "mutual fund", "matched with broker/Groww/Zerodha"
- NEVER say returns "matched perfectly" — say it's more accurate than what brokers show
- Sound like a real person, not a marketer
- No hashtags, no emojis

Good examples:
"Good post! I use xirrledger.com to track my portfolio returns — more accurate than what Zerodha shows since it accounts for all charges."
"Interesting take. I record my portfolio returns on xirrledger.com — gives a more accurate XIRR than any broker as it includes all charges."
"Great insight! I've been using xirrledger.com for my stock portfolio returns — much more accurate than broker apps."

Return ONLY the comment text. Nothing else."""


def load_seen() -> set:
    seen = set()
    # Primary store
    if SEEN_FILE.exists():
        with open(SEEN_FILE) as f:
            seen.update(json.load(f))
    # Also seed from log so already-commented posts are never re-attempted
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


def load_seen_authors() -> set:
    if SEEN_AUTHORS_FILE.exists():
        with open(SEEN_AUTHORS_FILE) as f:
            return set(json.load(f))
    return set()


def save_seen_authors(seen_authors: set):
    with open(SEEN_AUTHORS_FILE, "w") as f:
        json.dump(list(seen_authors), f)


def extract_author_slug(post_url: str) -> str:
    """Extract the LinkedIn profile slug from a post URL.
    e.g. .../posts/john-doe-123_some-title-activityid/ -> 'john-doe-123'
    Returns empty string if the URL format is unexpected.
    """
    m = re.search(r'/posts/([^/_]+)', post_url)
    return m.group(1) if m else ""


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
    print("\n--- LinkedIn Login ---")
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
    page.goto("https://www.linkedin.com/login")
    input("\nPress Enter after you've logged in and see your feed...")

    page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded")
    time.sleep(3)
    if "feed" in page.url:
        SESSION_PATH.parent.mkdir(parents=True, exist_ok=True)
        context.storage_state(path=str(SESSION_PATH))
        print(f"Session saved to {SESSION_PATH}")
    else:
        print("Could not verify login — please try again.")
    browser.close()


def is_relevant(client: anthropic.Anthropic, post_text: str) -> bool:
    """Return True if the post is relevant enough to comment on."""
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
    """Use Claude to draft a personal comment for the post."""
    try:
        resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=200,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": f"LinkedIn post:\n\n{post_text}\n\nWrite a comment."}
            ],
        )
        return resp.content[0].text.strip()
    except Exception as e:
        print(f"  [claude] Error drafting comment: {e}")
        return None


def get_full_post_text(page, post_url: str) -> str:
    """Open a post page and extract its full text, skipping nav/chrome."""
    try:
        page.goto(post_url, wait_until="domcontentloaded", timeout=30000)
        human_delay(2, 4)
    except PlaywrightTimeout:
        return ""

    # Wait for some meaningful content to load
    try:
        page.wait_for_selector('article, main, [role="main"], [class*="feed"], [class*="update"]', timeout=8000)
    except PlaywrightTimeout:
        pass

    try:
        # Expand "see more" if present
        see_more = page.query_selector('[aria-label*="see more" i], button:has-text("…more"), button:has-text("see more")')
        if see_more:
            see_more.click()
            human_delay(0.5, 1)
    except Exception:
        pass

    try:
        text = page.evaluate("""
            () => {
                // Try specific post content selectors first
                const candidates = [
                    '.feed-shared-update-v2__description',
                    '.attributed-text-segment-list__content',
                    '[class*="commentary"]',
                    '.update-components-text',
                    '.feed-shared-text',
                    '[data-test-id*="main-feed-activity"]',
                    'article',
                    '[role="main"]',
                ];
                for (const s of candidates) {
                    const el = document.querySelector(s);
                    if (el && el.innerText.trim().length > 80) return el.innerText.trim().slice(0, 1500);
                }
                // Smart fallback: find the largest text block not inside nav/header/footer/aside
                const skipTags = new Set(['NAV','HEADER','FOOTER','ASIDE','SCRIPT','STYLE']);
                let best = { len: 0, text: '' };
                document.querySelectorAll('div, p, section').forEach(el => {
                    // Skip if inside a navigation element
                    let node = el;
                    while (node) {
                        if (skipTags.has(node.tagName)) return;
                        // Skip top nav by class hints
                        const cls = (node.className || '').toLowerCase();
                        if (cls.includes('nav') || cls.includes('global-nav') || cls.includes('sidebar')) return;
                        node = node.parentElement;
                    }
                    // Only consider leaf-ish nodes with meaningful text
                    const t = el.innerText.trim();
                    if (t.length > best.len && t.length > 100 && t.length < 3000) {
                        best = { len: t.length, text: t };
                    }
                });
                return best.text.slice(0, 1500);
            }
        """)
        return text or ""
    except Exception:
        return ""


def extract_posts_from_search(page, query: str, seen: set, debug: bool = False) -> list[dict]:
    """Search LinkedIn posts for query and return unseen post links."""
    encoded = query.replace(" ", "%20")
    url = f"https://www.linkedin.com/search/results/content/?keywords={encoded}&sortBy=date"
    print(f"\n  Searching: {query}")

    try:
        page.goto(url, wait_until="domcontentloaded", timeout=20000)
        human_delay(3, 5)
    except PlaywrightTimeout:
        print("  [timeout] Search page took too long — skipping")
        return []
    except Exception as e:
        print(f"  [error] Navigation failed: {e}")
        return []

    # Click the "Posts" filter tab if present (ensures we're on content/posts view)
    try:
        posts_tab = page.query_selector('button:has-text("Posts"), a:has-text("Posts")')
        if posts_tab and posts_tab.is_visible():
            posts_tab.click()
            human_delay(2, 3)
    except Exception:
        pass

    # Dismiss any popup that may have opened on load
    try:
        page.keyboard.press("Escape")
        human_delay(0.5, 1)
    except Exception:
        pass

    # Initial scroll to trigger lazy loading
    for _ in range(2):
        page.evaluate("window.scrollBy(0, window.innerHeight * 0.8)")
        human_delay(1.5, 3)

    if debug:
        # Save full HTML for inspection
        debug_html = SCRIPT_DIR / "debug_page.html"
        debug_html.write_text(page.content())
        print(f"  [debug] Page HTML saved to {debug_html}")
        print(f"  [debug] Current URL: {page.url}")

        # Check for interop iframe (LinkedIn SDUI wraps legacy content)
        iframes = page.frames
        print(f"  [debug] Frames on page: {len(iframes)}")
        for i, frame in enumerate(iframes):
            print(f"    frame[{i}] url={frame.url}")

        # Probe main doc first, then each frame
        probe_selectors = [
            '[data-urn*="activity"]',
            '[data-urn]',
            '.search-results__list li',
            '.reusable-search__result-container',
            '[class*="search-result"]',
            '[class*="feed-shared-update"]',
            'article',
            '[class*="ember-view"][data-id]',
            '[class*="occludable-update"]',
            '.entity-result',
            '[data-testid*="result"]',
            '[data-testid*="post"]',
            '[data-testid*="update"]',
            '[data-testid*="feed"]',
        ]

        for ctx_label, ctx in [("main", page)] + [(f"frame[{i}]", f) for i, f in enumerate(iframes[1:], 1)]:
            print(f"\n  [debug] --- Probing {ctx_label} ---")
            any_hit = False
            for sel in probe_selectors:
                try:
                    count = ctx.eval_on_selector_all(sel, "els => els.length")
                    if count:
                        sample = ctx.eval_on_selector(
                            sel,
                            "el => ({ tag: el.tagName, attrs: Object.fromEntries([...el.attributes].slice(0,6).map(a=>[a.name,a.value])) })"
                        )
                        print(f"    {sel!r:55s} → {count} els  sample={sample}")
                        any_hit = True
                except Exception as e:
                    print(f"    {sel!r:55s} → error: {e}")
            if not any_hit:
                print(f"    (no selector matched)")

            # data-* attrs
            try:
                data_attrs = ctx.evaluate("""
                    () => {
                        const attrs = new Set();
                        document.querySelectorAll('*').forEach(el => {
                            [...el.attributes].forEach(a => { if (a.name.startsWith('data-')) attrs.add(a.name); });
                        });
                        return [...attrs].sort();
                    }
                """)
                print(f"  [debug] data-* in {ctx_label}: {data_attrs}")

                # Save iframe HTML if it has content
                if ctx_label != "main":
                    try:
                        iframe_html = ctx.content()
                        iframe_file = SCRIPT_DIR / f"debug_{ctx_label.replace('[','').replace(']','')}.html"
                        iframe_file.write_text(iframe_html)
                        print(f"  [debug] {ctx_label} HTML ({len(iframe_html)} chars) → {iframe_file}")
                    except Exception:
                        pass
            except Exception as e:
                print(f"  [debug] could not eval in {ctx_label}: {e}")

        return []

    # Wait for at least one post card to appear
    try:
        page.wait_for_selector('button[aria-label*="control menu"], button[aria-label*="more actions"], .feed-shared-control-menu__trigger, button.artdeco-dropdown__trigger', timeout=10000)
    except PlaywrightTimeout:
        print("  [warn] No posts appeared — skipping query")
        return []
    except Exception as e:
        print(f"  [error] {e}")
        return []

    collected = {}  # url -> snippet text
    already_processed = 0  # index into dots_buttons; only iterate new ones after each scroll

    for scroll_attempt in range(15):
        if len(collected) >= MAX_POSTS_PER_QUERY:
            break

        # Find all "..." (three-dot) menu buttons on the page
        try:
            dots_buttons = page.query_selector_all(
                'button[aria-label*="control menu" i], '
                'button[aria-label*="more actions" i], '
                'button[aria-label*="more options" i], '
                '.artdeco-dropdown__trigger[aria-label*="Open"]'
            )
        except Exception:
            break

        # Only process buttons that appeared after the last scroll
        new_buttons = dots_buttons[already_processed:]
        already_processed = len(dots_buttons)

        for btn in new_buttons:
            if len(collected) >= MAX_POSTS_PER_QUERY:
                break
            try:
                if not btn.is_visible():
                    continue

                # Get the snippet text from the post card (walk up from the button)
                snippet = btn.evaluate("""el => {
                    let node = el;
                    for (let i = 0; i < 8; i++) {
                        node = node.parentElement;
                        if (!node) break;
                        const t = node.innerText.trim();
                        if (t.length > 80) return t.slice(0, 600);
                    }
                    return '';
                }""")

                # Click the "..." button to open the context menu
                btn.click()
                time.sleep(0.5)

                # Extract URL directly from the dropdown — "Copy link to post" is an <a> with the post href
                url = page.evaluate("""
                    () => {
                        // Find any open dropdown that contains "Copy link to post"
                        const items = [...document.querySelectorAll(
                            '[class*="dropdown"] a, [class*="overflow-menu"] a, li a, [role="menu"] a, [role="menuitem"] a'
                        )];
                        for (const a of items) {
                            const rect = a.getBoundingClientRect();
                            const href = a.href || '';
                            if (rect.width > 0 && rect.height > 0 &&
                                (href.includes('/posts/') || href.includes('/feed/update/'))) {
                                return href;
                            }
                        }
                        // Fallback: read from clipboard via click on "Copy link to post"
                        const spans = [...document.querySelectorAll('span, div, li')];
                        const item = spans.find(el => el.innerText.trim() === 'Copy link to post' && el.getBoundingClientRect().width > 0);
                        if (item) item.click();
                        return null;
                    }
                """)

                if not url:
                    # If href not found, try clipboard after clicking "Copy link to post"
                    time.sleep(0.4)
                    try:
                        url = page.evaluate("navigator.clipboard.readText()")
                    except Exception:
                        pass

                page.keyboard.press("Escape")
                time.sleep(0.2)

                if not url or "linkedin.com" not in url:
                    continue

                url = url.strip().split("?")[0].rstrip("/") + "/"

                if url not in seen and url not in collected:
                    collected[url] = snippet.strip()
                    print(f"  Collected: {url[-50:]}")

            except Exception:
                try:
                    page.keyboard.press("Escape")
                except Exception:
                    pass
                time.sleep(0.2)
                continue

        if len(collected) < MAX_POSTS_PER_QUERY:
            page.evaluate("window.scrollBy(0, window.innerHeight * 0.8)")
            time.sleep(1.5)

    posts = [{"url": u, "text": t} for u, t in list(collected.items())[:MAX_POSTS_PER_QUERY]]
    print(f"  Found {len(posts)} new post links")
    return posts


def post_comment_on_linkedin(page, post_url: str, comment: str) -> bool:
    """Post a comment on the current post page (already navigated). Returns True on success."""
    # Scroll down past the post to reveal the Like/Comment buttons and comment input
    for _ in range(3):
        page.evaluate("window.scrollBy(0, 400)")
        human_delay(0.8, 1.5)

    def find_comment_box(timeout=4000):
        selectors = [
            'div[data-placeholder="Add a comment…"]',
            '[aria-placeholder="Add a comment…"]',
            'div[contenteditable="true"][data-placeholder]',
            'div[role="textbox"][contenteditable="true"]',
            '.comments-comment-box__form .ql-editor',
            '.comments-comment-texteditor .ql-editor',
            '.comments-comment-texteditor__editor .ql-editor',
            '.ql-editor[contenteditable="true"]',
        ]
        for sel in selectors:
            try:
                el = page.wait_for_selector(sel, timeout=timeout)
                if el and el.is_visible():
                    return el
            except PlaywrightTimeout:
                continue
            except Exception:
                return None  # browser closed
        return None

    comment_box = find_comment_box()

    if not comment_box:
        # Click the "Comment" action button (speech bubble icon below the post)
        try:
            btn = page.query_selector(
                'button[aria-label*="comment" i], '
                'button:has-text("Comment"), '
                '[data-control-name="comment"]'
            )
            if btn and btn.is_visible():
                btn.click()
                human_delay(1, 2)
            else:
                # Try clicking anywhere that says "Add a comment"
                placeholder = page.query_selector('span:has-text("Add a comment"), [placeholder*="Add a comment"]')
                if placeholder:
                    placeholder.click()
                    human_delay(1, 2)
        except Exception:
            pass
        comment_box = find_comment_box(timeout=6000)

    if not comment_box:
        # Screenshot to diagnose
        screenshot_path = str(SCRIPT_DIR / "debug_comment_box.png")
        try:
            page.screenshot(path=screenshot_path)
            print(f"  [error] Could not find comment box — screenshot saved to {screenshot_path}")
        except Exception:
            print("  [error] Could not find comment box")
        return False

    try:
        comment_box.click()
        human_delay(0.5, 1.5)

        # Type comment with human-like pacing
        for char in comment:
            comment_box.type(char, delay=random.randint(30, 90))
            if random.random() < 0.05:
                time.sleep(random.uniform(0.2, 0.5))
    except Exception as e:
        print(f"  [error] Typing failed: {e}")
        return False

    human_delay(1, 2)

    def try_submit(attempt: int):
        """Try to click the submit button. Returns the method used or None."""
        if attempt == 0:
            # Primary: JS click on the blue artdeco Comment button
            try:
                return page.evaluate("""
                    () => {
                        for (const btn of document.querySelectorAll('button.artdeco-button--primary')) {
                            const r = btn.getBoundingClientRect();
                            if (r.width > 0 && r.height > 0 && btn.innerText.trim() === 'Comment') {
                                btn.scrollIntoView({block:'center'});
                                btn.click();
                                return 'primary-js';
                            }
                        }
                        const all = [...document.querySelectorAll('button')].filter(b => {
                            const r = b.getBoundingClientRect();
                            return r.width > 0 && r.height > 0 && b.innerText.trim() === 'Comment';
                        });
                        if (all.length) {
                            all[all.length - 1].scrollIntoView({block:'center'});
                            all[all.length - 1].click();
                            return 'fallback-js';
                        }
                        return null;
                    }
                """)
            except Exception:
                return None
        elif attempt == 1:
            # Retry: focus comment box and press Enter
            try:
                comment_box.focus()
                time.sleep(0.3)
                page.keyboard.press("Enter")
                return 'keyboard-enter'
            except Exception:
                return None
        else:
            # Last resort: Ctrl+Enter (some LinkedIn editors use this)
            try:
                comment_box.focus()
                time.sleep(0.3)
                page.keyboard.press("Control+Enter")
                return 'ctrl-enter'
            except Exception:
                return None

    submitted = False
    for attempt in range(3):
        method = try_submit(attempt)
        print(f"  [submit] attempt {attempt + 1}: {method}")
        human_delay(3, 5)

        try:
            text_after = comment_box.inner_text()
            if not text_after.strip():
                submitted = True
                break
            print(f"  [warn] Comment box still has text after attempt {attempt + 1} — retrying")
        except Exception:
            submitted = True  # element gone = submitted
            break

    return submitted


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
            permissions=["clipboard-read", "clipboard-write"],
        )
        page = context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        # Verify session is still valid
        page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded", timeout=20000)
        human_delay(2, 4)
        if "login" in page.url or "authwall" in page.url:
            print("Session expired. Run with --login to refresh.")
            browser.close()
            sys.exit(1)

        for query in SEARCH_QUERIES:
            if comments_posted >= MAX_COMMENTS_PER_RUN:
                break

            try:
                post_links = extract_posts_from_search(page, query, seen, debug=debug)
            except Exception as e:
                print(f"  [error] Query '{query}' failed: {e}")
                break
            human_delay(8, 12)

            for post in post_links:
                if comments_posted >= MAX_COMMENTS_PER_RUN:
                    break

                post_url = post["url"]
                print(f"\n  Opening: {post_url[:80]}")

                # Dismiss any open modal (popup) before navigating
                try:
                    page.keyboard.press("Escape")
                    human_delay(0.5, 1)
                except Exception:
                    pass

                # Open the post to get the full text, then check relevance
                try:
                    full_text = get_full_post_text(page, post_url)
                except Exception as e:
                    print(f"  [error] Could not open post: {e}")
                    break
                if not full_text or len(full_text) < 40:
                    print("  [skip] Could not read post text")
                    continue

                print(f"  Full text: {full_text[:200]}...")

                author_slug = extract_author_slug(post_url)
                if author_slug and author_slug in seen_authors:
                    print(f"  [skip] Already commented on {author_slug}'s post before")
                    seen.add(post_url)
                    continue

                if not is_relevant(client, full_text):
                    print("  [skip] Not relevant to XIRR/investing")
                    seen.add(post_url)  # permanently skip irrelevant posts
                    continue

                comment = draft_comment(client, full_text)
                if not comment:
                    continue

                print(f"  Comment draft:\n    {comment}\n")

                if dry_run:
                    log_comment(post_url, full_text, comment, posted=False)
                    seen.add(post_url)
                    if author_slug:
                        seen_authors.add(author_slug)
                    comments_posted += 1
                    print("  [dry-run] Not posting.")
                else:
                    ok = post_comment_on_linkedin(page, post_url, comment)
                    log_comment(post_url, full_text, comment, posted=ok)
                    if ok:
                        print(f"  [ok] Comment posted")
                        seen.add(post_url)
                        if author_slug:
                            seen_authors.add(author_slug)
                        comments_posted += 1
                    else:
                        print(f"  [fail] Could not post — will retry next run")

                    human_delay(15, 30)  # Cool-down between comments

        browser.close()

    save_seen(seen)
    save_seen_authors(seen_authors)
    print(f"\nDone. {'Drafted' if dry_run else 'Posted'} {comments_posted} comments.")
    print(f"Log: {LOG_FILE}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--login", action="store_true", help="Open browser for manual LinkedIn login")
    parser.add_argument("--dry-run", action="store_true", help="Draft comments but don't post them")
    parser.add_argument("--debug", action="store_true", help="Probe selectors and save HTML, then exit")
    args = parser.parse_args()

    with sync_playwright() as p:
        if args.login:
            do_login(p)
            return

    run(dry_run=args.dry_run, debug=args.debug)


if __name__ == "__main__":
    main()
