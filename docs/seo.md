# SEO Status — XIRR Ledger

Last updated: 2026-03-02

---

## What's in Place

| Element | Status | Notes |
|---|---|---|
| Root layout metadata | ✅ | Title, description, keywords, OG tags in `website/app/layout.tsx` |
| Dynamic blog metadata | ✅ | `generateMetadata` in `website/app/blog/[slug]/page.tsx` — title, description, OG, canonical, Twitter card, publishedTime |
| sitemap.ts | ✅ | `website/app/sitemap.ts` — all static pages + 7 blog posts with priorities |
| robots.txt | ✅ | `website/public/robots.txt` — allows all, points to `https://xirrledger.com/sitemap.xml` |
| Trailing slashes | ✅ | `next.config.ts` — `trailingSlash: true` |
| Cache headers | ✅ | `.htaccess` — 1yr for `/_next/static/*`, no-cache for HTML |
| Google Analytics 4 | ✅ | Lazy-loaded via `NEXT_PUBLIC_GA_ID`, disabled on dev |

---

## Critical Gaps

### 1. Missing page-level metadata (High impact)
These pages have no `metadata` export — they fall back to root layout defaults:

| Page | File |
|---|---|
| `/calculator` | `website/app/calculator/page.tsx` |
| `/features` | `website/app/features/page.tsx` |
| `/faq` | `website/app/faq/page.tsx` |
| `/how-it-works` | `website/app/how-it-works/page.tsx` |
| `/contact` | `website/app/contact/page.tsx` |
| `/blog` | `website/app/blog/page.tsx` |

### 2. No structured data / JSON-LD (High impact — rich snippets)
- No `FAQPage` schema on `/faq`
- No `Article` schema on blog posts
- No `Organization` or `WebSite` schema on homepage

### 3. No Google Search Console verification (High impact)
- No `google-site-verification` meta tag in layout
- No HTML verification file in `website/public/`

### 4. No OG images (Medium impact)
- OG metadata exists but no `image` property on any page
- No featured images for blog posts
- No social sharing fallback image

### 5. No RSS feed (Low impact)
- Blog has no `/feed.xml` for subscribers/aggregators

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

---

## Site Structure

```
/                    - Homepage         priority 1.0, weekly
/calculator/         - Calculator       priority 0.9, monthly
/how-it-works/       - How It Works     priority 0.8, monthly
/features/           - Features         priority 0.7, monthly
/blog/               - Blog listing     priority 0.8, weekly
/blog/[slug]/        - Blog post        priority 0.8, monthly (× 7)
/faq/                - FAQ              priority 0.7, monthly
/contact/            - Contact          priority 0.5, yearly
```

---

## Key Files

| Purpose | Path |
|---|---|
| Root metadata | `website/app/layout.tsx` |
| Blog dynamic metadata | `website/app/blog/[slug]/page.tsx` |
| Sitemap generator | `website/app/sitemap.ts` |
| robots.txt | `website/public/robots.txt` |
| Blog content (MDX) | `website/content/blog/*.mdx` |
| Blog loader | `website/lib/blog.ts` |
| Next.js config | `website/next.config.ts` |
| Cache headers | `website/public/.htaccess` |

---

## Recommended Next Steps

1. **Add `metadata` exports** to the 6 pages missing them — biggest quick win
2. **Add JSON-LD schema** — `FAQPage` on `/faq`, `Article` on blog posts, `WebSite` on homepage
3. **Set up Google Search Console** — add verification, submit sitemap
4. **Add OG image** — at minimum a default fallback image for social sharing
5. **Monitor Core Web Vitals** via Search Console / Lighthouse
6. **RSS feed** for blog (`/feed.xml`)
