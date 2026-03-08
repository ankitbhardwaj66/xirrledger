# SEO Status — XIRR Ledger

Last updated: 2026-03-02 (evening — new page + 2 blogs + remark-gfm)

---

## What's in Place

| Element | Status | Notes |
|---|---|---|
| Root layout metadata | ✅ | Title, description, keywords, OG tags in `website/app/layout.tsx` |
| Page-level metadata — all pages | ✅ Done 2026-03-02 | All 6 pages now have unique title, description, keywords, OG, canonical |
| Dynamic blog metadata | ✅ | `generateMetadata` in `website/app/blog/[slug]/page.tsx` — title, description, OG, canonical, Twitter card, publishedTime |
| sitemap.ts | ✅ | `website/app/sitemap.ts` — all static pages + 9 blog posts with priorities |
| robots.txt | ✅ | `website/public/robots.txt` — allows all, points to `https://xirrledger.com/sitemap.xml` |
| Trailing slashes | ✅ | `next.config.ts` — `trailingSlash: true` |
| Cache headers | ✅ | `.htaccess` — 1yr for `/_next/static/*`, no-cache for HTML |
| Google Analytics 4 | ✅ | Lazy-loaded via `NEXT_PUBLIC_GA_ID`, disabled on dev |
| Google Search Console | ✅ | Property verified, sitemap submitted, 14 pages indexed |
| JSON-LD structured data | ✅ Done 2026-03-02 | WebSite schema (homepage), FAQPage schema (/faq), Article schema (all blog posts) |
| OG images | ✅ Done 2026-03-02 | Default 1200×630 image for all static pages; unique per-post image for all 9 blog posts |
| MDX table rendering | ✅ Done 2026-03-02 | `remark-gfm` added — GFM tables render in all blog posts; prose-table Tailwind classes added |
| `/how-to-calculate-xirr` page | ✅ Done 2026-03-02 | Dedicated formula page with full metadata, JSON-LD, sitemap entry (priority 0.8) |

### Page metadata added (2026-03-02)

| Page | Title |
|---|---|
| `/calculator` | XIRR Calculator — Upload Your Broker Ledger \| XIRR Ledger |
| `/faq` | FAQ — XIRR Ledger \| Common Questions Answered |
| `/contact` | Contact Us — XIRR Ledger |
| `/features` | Features — XIRR Ledger \| Ledger-Based XIRR Calculator |
| `/how-it-works` | How It Works — XIRR Ledger \| 4 Simple Steps |
| `/blog` | Blog — XIRR Ledger \| XIRR, Returns & Portfolio Analysis |
| `/how-to-calculate-xirr` | How to Calculate XIRR — Formula, Steps & Ledger Method \| XIRR Ledger |

Pattern used: `page.tsx` = server component with `metadata` export. Client logic extracted to `CalculatorClient.tsx` and `FAQClient.tsx`.

---

## Remaining Gaps

### 1. ~~No structured data / JSON-LD~~ — ✅ Done 2026-03-02
- `FAQPage` schema on `/faq` ✅
- `Article` schema on all blog posts ✅
- `WebSite` schema on homepage ✅

### 2. ~~Google Search Console verification~~ — ✅ Already done
- Property `xirrledger.com` verified, sitemap submitted (14 pages discovered, last read 2 Mar 2026)

### 3. ~~OG images~~ — ✅ Done 2026-03-02
- `app/opengraph-image.tsx` — full-screen portfolio vs Nifty 50 chart as background, frosted dark panel behind centered text, "Free Ledger-Based XIRR Calculator / Compare your returns with Nifty 50"
- `app/blog/[slug]/opengraph-image.tsx` — same chart background, post title centered on frosted panel, font size adapts to title length
- `metadataBase` set in root layout; all pages have explicit `openGraph.images`
- Verified working on WhatsApp and Twitter/X previews

### 4. RSS feed (Low impact — skipped for now)
- Blog has no `/feed.xml` for subscribers/aggregators
- Can revisit if needed

---

## Blog Posts Inventory

| Slug | Title | Published | Target Keywords |
|---|---|---|---|
| `why-every-trader-needs-xirr` | Why Every Type of Trader Needs Ledger-Based XIRR | 2026-02-17 | XIRR for traders India, F&O trader returns, ledger based XIRR |
| `why-ledger-based-xirr-shows-true-returns` | Why Ledger-Based XIRR Shows Your True Returns | 2026-02-17 | ledger based XIRR, true investment returns, idle cash |
| `broker-xirr-misses-sgb-govt-bonds-unlisted-stocks` | Your Broker's XIRR Is Lying to You (SGBs, Govt Bonds & Unlisted Stocks) | 2026-02-25 | broker XIRR wrong, SGB XIRR, Zerodha XIRR missing |
| `why-brokerage-charges-matter-in-xirr` | Why Brokerage Charges Matter in XIRR | 2026-02-17 | brokerage charges XIRR, STT impact, hidden trading costs |
| `are-you-beating-nifty50` | Are You Actually Beating Nifty 50? | 2026-02-18 | beating Nifty 50, XIRR vs Nifty 50, benchmark comparison |
| `xirr-vs-cagr-which-one-shows-real-returns` | XIRR vs CAGR: Why the Return % on Your Portfolio App Is Lying to You | 2026-02-24 | XIRR vs CAGR, CAGR limitations, XIRR for SIP investors |
| `how-dividends-and-sgb-interest-are-handled-in-xirr` | Dividends Are Part of Your Returns | 2026-02-27 | dividend XIRR, Zerodha dividend report, how dividends affect XIRR |
| `xirr-in-sip-the-smarter-way-to-invest` | XIRR in SIP: The Smarter Way to Invest | 2026-03-02 | xirr in sip (5k/mo +900%), xirr meaning in sip (500/mo +900%) |
| `how-to-calculate-xirr-excel-vs-ledger` | How to Calculate XIRR: Why Excel Gets It Wrong and the Ledger Method Gets It Right | 2026-03-02 | how to calculate xirr (500/mo), how to calculate xirr manually, xirr excel calculation |

---

## Site Structure

```
/                    - Homepage         priority 1.0, weekly
/calculator/         - Calculator       priority 0.9, monthly
/how-it-works/       - How It Works     priority 0.8, monthly
/features/           - Features         priority 0.7, monthly
/blog/               - Blog listing     priority 0.8, weekly
/blog/[slug]/        - Blog post        priority 0.8, monthly (× 9)
/how-to-calculate-xirr/ - XIRR Formula priority 0.8, monthly
/faq/                - FAQ              priority 0.7, monthly
/contact/            - Contact          priority 0.5, yearly
```

---

## Key Files

| Purpose | Path |
|---|---|
| Root metadata | `website/app/layout.tsx` |
| Calculator client component | `website/app/calculator/CalculatorClient.tsx` |
| FAQ client component | `website/app/faq/FAQClient.tsx` |
| Blog dynamic metadata | `website/app/blog/[slug]/page.tsx` (+ remarkGfm, table prose classes) |
| XIRR Formula page | `website/app/how-to-calculate-xirr/page.tsx` |
| Sitemap generator | `website/app/sitemap.ts` |
| robots.txt | `website/public/robots.txt` |
| Blog content (MDX) | `website/content/blog/*.mdx` |
| Blog loader | `website/lib/blog.ts` |
| Next.js config | `website/next.config.ts` |
| Cache headers | `website/public/.htaccess` |
