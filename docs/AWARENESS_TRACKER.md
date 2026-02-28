# XIRRLedger — Awareness Tracker

> Live log of all outreach, community activity, and SEO work.
> Update this after every session.

---

## Google Search / SEO Status

| Item | Status | Notes |
|------|--------|-------|
| `sitemap.xml` | Submitted 2026-02-25 | Google Search Console accepted |
| `robots.txt` | Live | Points to sitemap |
| Indexing | Pending | Normal — takes 3–14 days after first submission |
| First organic impressions | Pending | Appears in Performance tab 1–2 weeks after indexing |
| Pages indexed so far | 0 | Check GSC → Coverage tab daily |

**What to check in GSC (daily 1-min check):**
- Coverage → Indexed count increasing?
- URL Inspection → paste `https://xirrledger.com` → "Request Indexing" if not queued
- Sitemaps → confirm status is "Success" (not "Couldn't fetch")

**SEO quick wins still to do:**
- [ ] Add `<meta name="description">` to every page (if not already set via Next.js metadata)
- [ ] Verify all 6 blog posts have unique titles + descriptions in metadata
- [ ] Add internal links between blog posts (helps Google crawl depth)
- [ ] Get at least 1–2 external backlinks pointing to `xirrledger.com` (TradingQ&A profile counts)

---

## TradingQ&A (tradingqna.zerodha.com)

**Account**: `xirrledger` (Ankit Bhardwaj) | Trust: Basic | Started: 2026-02-24

### Activity Log

| Date | Thread | Type | Notes |
|------|--------|------|-------|
| 2026-02-24 | "Measuring Mutual Fund Returns (XIRR & CAGR)" | Reply | First replies, trust upgrade |
| 2026-02-24 | "Need suggestions" | Reply | Helpful reply |
| 2026-02-25 | Multiple XIRR threads | Reply | 4 more replies |
| 2026-02-26 | "XIRR or CAGR return on COIN" | Reply ×3 | Explained XIRR vs CAGR, Coin's broken XIRR field |
| 2026-02-26 | "Know your XIRR: Excel Calculations" | Reply | Fund statement approach |
| 2026-02-26 | "How does XIRR work with stocks with dividends?" | Reply | Reinvested dividend = auto in fund statement |

### Thread ideas for today / this week

**Reply targets** (search these on TradingQ&A):
- [ ] Any thread asking "how to calculate returns on multiple investments"
- [ ] Any thread about "Zerodha P&L vs actual returns"
- [ ] Any thread asking about XIRR on Groww / Fyers
- [ ] "Is my portfolio beating Nifty?" type questions

**Create own topic** (ready when ~10 total replies done, Basic → Member trust):
```
Title: "Free tool to calculate your portfolio XIRR vs Nifty 50 — Zerodha/Groww/Fyers"
Category: General or Coin - Direct MF

Hook: "I kept seeing questions here about how to measure actual returns across brokers.
I built a free tool that does it automatically — upload your fund statement CSV/PDF,
it calculates XIRR and benchmarks against Nifty 50."

Body:
- What it does (1 para)
- How it works: upload Zerodha CSV or Groww PDF → get XIRR + Nifty comparison
- Supports: Zerodha, Groww, Fyers
- Link: https://xirrledger.com
- Ask for feedback / edge cases they want handled
```

**Rule**: Don't post own topic until you have ≥10 genuine replies. Don't mention the tool in every reply — only when it's the natural answer.

---

## Reddit

**Account**: u/xirrledger | Status: ✅ Created 2026-02-26, 2 achievements unlocked

### Week 1 plan (karma building only, no tool mentions)
- [ ] r/IndiaInvestments — answer 2–3 XIRR or returns questions
- [ ] r/personalfinanceindia — answer 2–3 questions
- [ ] r/zerodha — answer questions about fund statement, returns
- [ ] r/FIRE_Ind — helpful reply on returns tracking

**Week 2+**: Organic mention only when directly relevant.
**Week 3–4**: Transparent showcase post ("I built XIRRLedger — feedback welcome").

---

## Twitter / X

**Account**: @XIRRLedger | Status: Not started

**Today's task** (if starting today):
- [ ] Create account, set bio + link
- [ ] First tweet: the "Why I built this" 1-liner
- [ ] Reply to 2–3 threads from @Nithin0dha or @ZerodhaVarsity with a genuine take

---

## LinkedIn

**Account**: XIRRLedger page | Status: Not started

---

## Instagram

**Account**: @xirr.ledger | Status: Not started

---

## Backlinks Log
*(Every external link pointing to xirrledger.com helps SEO)*

| Source | URL / Context | Date |
|--------|--------------|------|
| TradingQ&A profile | xirrledger user profile bio | 2026-02-24 |

---

## Today's Priority Actions (2026-02-26)

### High priority
1. **TradingQ&A**: Reply to 2–3 more threads today — look for "how do I track returns across Zerodha and Groww" or similar. Aim for total ≥10 replies before creating own topic.
2. ~~**GSC check**: Open Google Search Console → URL Inspection → request indexing for homepage.~~ ✅ **DONE** — "Indexing requested" confirmed, added to priority crawl queue (2026-02-26)
3. ~~**Reddit**: Create u/XIRRLedger account.~~ ✅ **DONE** — u/xirrledger account created (2026-02-26), 2 achievements unlocked. Next: make 2–3 karma-building replies in r/IndiaInvestments (no tool mention yet).

### Medium priority
4. **Twitter**: Create @XIRRLedger account. Write first tweet (draft below).
5. **Blog internal links**: Add a link from 1 blog post to another where it makes sense.

### Can wait
6. Instagram / LinkedIn — start next week once Twitter and Reddit are moving.

---

## Draft: First Tweet

```
Most investors don't know their real returns.

Your app shows 22%. But that's point-to-point.
If you've done SIPs, the right number is XIRR.

I built a free calculator that does it automatically
for Zerodha, Groww, and Fyers.

→ xirrledger.com
```

---

## Draft: Reddit r/IndiaInvestments reply (for XIRR questions)

> Don't paste this verbatim — adapt it naturally to the thread.

```
XIRR is the right metric here. Unlike CAGR, it accounts for the exact dates
and amounts of every transaction — so it works correctly for SIPs and
irregular investments.

To calculate it:
1. Download your fund statement CSV from Zerodha Console (Fund Statement → All Segments)
2. You need two columns: Date, Amount (negative for investments, positive for withdrawals/current value)
3. Use =XIRR() in Excel/Sheets

If you don't want to do it manually, I've built a free tool that does this automatically
for Zerodha, Groww, and Fyers — xirrledger.com
```

---

*Last updated: 2026-02-26*
