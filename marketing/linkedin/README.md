# LinkedIn XIRR Commenter

Automates finding and commenting on LinkedIn posts about XIRR, portfolio returns, and Indian investing — naturally mentioning [xirrledger.com](https://xirrledger.com).

## How it works

1. Searches LinkedIn for posts matching a set of queries (`xirr portfolio`, `XIRR Zerodha`, etc.)
2. Opens each post and reads the full text
3. Uses Claude Haiku to check if the post is relevant (XIRR, investing, Indian brokers)
4. Uses Claude Sonnet to draft a short, natural-sounding comment referencing xirrledger.com
5. Posts the comment with human-like typing delays and cooldowns between posts
6. Logs every comment (posted or not) to `comments_log.jsonl`

## Setup

Dependencies live in the `contact-job-hunt` venv. No separate install needed — `run.sh` points to it automatically.

Set your Anthropic API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

## Usage

```bash
# First-time login (opens browser, log in manually)
./run.sh --login

# Dry run — drafts comments, logs them, but does NOT post
./run.sh --dry-run

# Live run — posts comments for real
./run.sh

# Debug mode — probes selectors and saves page HTML, does not comment
./run.sh --debug
```

## Limits per run

| Setting | Value |
|---|---|
| Max posts checked per search query | 10 |
| Max comments posted per run | 12 |
| Delay between comments | 15–30 seconds |
| Search queries | 5 |

## Spam prevention

### Per-post deduplication
Every URL that has been seen (opened or commented on) is stored in `.seen_posts.json`. Posts are also seeded from `comments_log.jsonl` so already-commented posts are never re-attempted across runs.

### Per-author cooldown
To avoid commenting repeatedly on the same person's posts, the script tracks the last comment timestamp per author in `.seen_authors.json`.

- If you commented on someone's post **less than 7 days ago** → the post is skipped.
- If it's been **7+ days** → they're eligible again.

The cooldown period is controlled by `AUTHOR_COOLDOWN_DAYS = 7` at the top of the script.

## Logs

Every comment attempt is appended to `comments_log.jsonl` (one JSON object per line):

```json
{
  "timestamp": "2026-05-12T14:23:01.123456",
  "post_url": "https://www.linkedin.com/posts/...",
  "post_preview": "First 200 chars of the post...",
  "comment": "The drafted comment text",
  "posted": true
}
```

`posted: false` means it was a dry-run entry or the post attempt failed.

## State files

| File | Purpose |
|---|---|
| `.seen_posts.json` | URLs of all posts ever opened (prevents re-visiting) |
| `.seen_authors.json` | Author slug → last comment timestamp (cooldown tracking) |
| `comments_log.jsonl` | Full history of every comment drafted or posted |

All three are gitignored and live only on your local machine.

## Session

The LinkedIn browser session is saved to:
```
/Users/ankitbhardwaj/Documents/GitHub/contact-job-hunt/.linkedin_session/state.json
```

Re-run `./run.sh --login` if you see "Session expired".
