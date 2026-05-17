# X.com XIRR Commenter

Automates finding and replying to posts on X.com about XIRR, portfolio returns, and Indian investing — naturally mentioning [xirrledger.com](https://xirrledger.com).

## How it works

1. Searches X.com for posts matching a set of queries (`xirr portfolio`, `XIRR Zerodha`, etc.) sorted by latest
2. Opens each tweet and reads its text
3. Uses Claude Haiku to check if the post is relevant (XIRR, investing, Indian brokers)
4. Uses Claude Sonnet to draft a short, natural-sounding reply (under 250 chars) referencing xirrledger.com
5. Posts the reply with human-like typing delays and cooldowns between posts
6. Logs every reply (posted or not) to `comments_log.jsonl`

## Setup

Same venv as the LinkedIn tool (`contact-job-hunt`). No extra install needed.

Set your Anthropic API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Make the run script executable:

```bash
chmod +x run.sh
```

## Usage

```bash
# First-time login (opens browser, log in manually, then press Enter)
./run.sh --login

# Dry run — drafts replies, logs them, but does NOT post
./run.sh --dry-run

# Live run — posts replies for real
./run.sh
```

## Limits per run

| Setting | Value |
|---|---|
| Max tweets checked per search query | 8 |
| Max replies posted per run | 5 |
| Delay between replies | 20–40 seconds |
| Author cooldown | 14 days |
| Search queries | 5 |

These are intentionally conservative — X.com is more aggressive about rate-limiting than LinkedIn.

## Spam prevention

- **Per-post deduplication**: every URL stored in `.seen_posts.json`; also seeded from `comments_log.jsonl`
- **Per-author cooldown**: tracks last reply timestamp per @username in `.seen_authors.json` — won't reply to the same account within 14 days

## Logs

Every reply attempt appended to `comments_log.jsonl`:

```json
{
  "timestamp": "2026-05-17T14:23:01.123456",
  "post_url": "https://x.com/username/status/123456789",
  "post_preview": "First 200 chars of the tweet...",
  "comment": "The drafted reply text",
  "posted": true
}
```

## State files (gitignored)

| File | Purpose |
|---|---|
| `.x_session/state.json` | Playwright browser session |
| `.seen_posts.json` | Tweet URLs already visited |
| `.seen_authors.json` | @username → last reply timestamp |
| `comments_log.jsonl` | Full history |

## Session

Session is saved to `marketing/x/.x_session/state.json`. Re-run `./run.sh --login` if you see "Session expired".
