# GA Weekly Analytics — XIRR Ledger

**GA Property**: G-2YGVB963RE
**GA live since**: 2026-02-18
**Search Console**: xirrledger.com (verified, sitemap submitted 2026-02-27)

---

## Week 1 — Baseline Session (2026-02-28)
*Period: Feb 18–27 (~10 days since launch)*

### GA Overview
| Metric | All-time (10d) | Last 7 days | Last 1 day |
|---|---|---|---|
| Active users | 91 | 71 (+222.7%) | 14 (+55.6%) |
| New users | 91 (100%) | 69 (+213.6%) | — |
| Returning users | **0** | 0 | — |
| Avg engagement time | **3m 55s** | — | — |
| Event count | 1.4k | 1.3k (+853.4%) | — |
| Sessions (session_start) | ~145 | 121 | — |

### Traffic Sources (last 7 days)
| Channel | Sessions | WoW |
|---|---|---|
| Direct | 107 | +365.2% |
| Referral | 11 | +450.0% |
| Organic Search | 3 | — |

**Referrers (all-time)**: tradingqna.com (2), cn.bing.com (1), ansearch.com (1), behjoo.com (1), dogpile.com (1), ecofreek.com (1)

### Geography (last 7 days)
| Country | Users | Note |
|---|---|---|
| India | 40 | Primary audience |
| United States | 25 | Mostly Ashburn bots (see below) |
| Canada | 2 | — |
| Others | 4 | China, Iran, Philippines, Poland |

**Top Indian cities**: Bengaluru 6, Mumbai 6, Hyderabad 5, Ludhiana 5, Chandigarh 4

> Ashburn (VA) = 15 users all-time — AWS datacenter city, likely crawlers. Discount from real US count.

### Top Pages (all-time)
| Page | Views | Active Users | Bounce Rate |
|---|---|---|---|
| Homepage | 601 | 91 | 37.7% |
| Dividends & SGB blog | 7 | 1 | 0% |
| Beating Nifty 50 blog | 3 | 1 | 0% |
| XIRR vs CAGR blog | 3 | 1 | 0% |
| 404 page | 2 | 1 | — |
| Why Ledger-Based XIRR blog | 2 | 1 | 0% |
| Dividends post | 1 | 1 | 0% |

### Events (last 7 days)
| Event | Count | Note |
|---|---|---|
| page_view | 572 | — |
| user_engagement | 250 | — |
| scroll | 140 | — |
| session_start | 121 | — |
| first_visit | 69 | — |
| file_download | 64 | **Inflated — see DB note** |
| click | 52 | — |

### DB Cross-Reference
- **Real external completions**: 4 (anupam×3 on Feb 22, trader dude×1 on Feb 25)
- **file_download = 64 is inflated**: bulk of events were owner testing on prod before dev/prod separation (merged Feb 27). Real user downloads ≈ 5–10
- **From now on**: dev testing has no GA ID → won't inflate prod numbers
- **Anupam×3 in DB but 0 returning in GA**: cleared cache / different browser each time

### Google Search Console
| Metric | Value |
|---|---|
| Sitemap submitted | Feb 27, 2026 — Success |
| Pages discovered | 14 |
| Total impressions | 1 |
| Total clicks | 0 |
| Avg position | 8 (page 1 for 1 query) |

> Only 1 day old at review time. Expect 2–4 weeks for full indexing.

### PageSpeed Insights — Mobile (final scores, Feb 28)
| Category | Before (session start) | After (session end) | Change |
|---|---|---|---|
| **Performance** | 80 | **99** | **+19** |
| **Accessibility** | 84 | **96** | **+12** |
| Best Practices | 100 | 100 | — |
| SEO | 100 | 100 | — |

**Core Web Vitals (final)**:
| Metric | Before | After | Status |
|---|---|---|---|
| FCP | 2.7s | **1.6s** | Green |
| LCP | 4.0s | **2.2s** | Green |
| TBT | 80ms | **70ms** | Green |
| CLS | 0 | 0 | Green |

**All scores green. All 4 Core Web Vitals green.**

### Fixes Applied This Session (2026-02-28)
| Fix | Status | Expected Impact |
|---|---|---|
| GA4 `file_download` marked as key event | ✅ Done | Conversion tracking now visible |
| GA scripts → `lazyOnload` + moved to body | ✅ Deployed | Removes render-blocking, improves LCP |
| `preconnect` hint for googletagmanager.com | ✅ Deployed | Faster DNS for GA load |
| `.htaccess` cache headers for `_next/static/` (1yr) | ✅ Deployed | +5–8 perf points expected |
| `.htaccess` gzip compression | ✅ Deployed | Smaller asset transfers |
| `.htaccess` no-cache for HTML | ✅ Deployed | Always fresh on redeploy |
| CLAUDE.md: auto-deploy on push | ✅ Done | SSH deploy now part of push flow |

### Week 1 Summary
**What's working**: 3m55s engagement (users genuinely use the tool), steep growth curve (+222% WoW), TradingQNA referrals starting, 4 real external completions in 10 days with zero paid promotion.

**What needs work**: 0 returning users, blog traffic near-zero, organic search = 3 sessions (SEO just starting), 37.7% homepage bounce rate.

### Targets for Week 2 (check ~Mar 7)
| Metric | Week 1 | Target Week 2 |
|---|---|---|
| Active users (7d) | 71 | >100 |
| Returning users | 0 | >5 |
| Organic search sessions | 3 | >10 |
| Search Console impressions | 1 | >20 |
| PageSpeed Performance (mobile) | 80 | >88 |
| PageSpeed LCP | 4.0s | <2.5s |
| Real DB completions | 4 | >8 |
| Blog page views | 7 (max) | >20 |

### Open Action Items for Week 2
- [ ] Re-run PageSpeed after deploy — verify LCP and performance score improved
- [ ] Search Console: manually request indexing for homepage + top 2 blog posts
- [ ] Publish 1–2 new blog posts (long-tail keywords: "zerodha xirr calculator", "groww portfolio returns")
- [ ] Add internal links from homepage → blog section
- [ ] Accessibility audit (score 84) — check contrast ratios, ARIA labels
- [ ] Consider "Share your results" or monthly reminder CTA for retention
- [ ] More TradingQNA / Reddit posts to grow referral channel

---

## Week 2 — (target: ~2026-03-07)

*Paste GA screenshots + Search Console + PageSpeed data here next week*

### GA Overview
| Metric | Week 1 | Week 2 | Change |
|---|---|---|---|
| Active users (7d) | 71 | — | — |
| New users (7d) | 69 | — | — |
| Returning users | 0 | — | — |
| Avg engagement time | 3m 55s | — | — |
| Sessions | 121 | — | — |

### Traffic Sources
| Channel | Week 1 | Week 2 | Change |
|---|---|---|---|
| Direct | 107 | — | — |
| Referral | 11 | — | — |
| Organic Search | 3 | — | — |

### Search Console
| Metric | Week 1 | Week 2 | Change |
|---|---|---|---|
| Impressions | 1 | — | — |
| Clicks | 0 | — | — |
| Avg position | 8 | — | — |
| Pages indexed | — | — | — |

### PageSpeed (mobile)
| Metric | Week 1 (end-of-week) | Week 2 | Change |
|---|---|---|---|
| Performance | **99** | — | — |
| Accessibility | **96** | — | — |
| LCP | **2.2s** | — | — |
| FCP | **1.6s** | — | — |

### DB Completions
| Metric | Week 1 | Week 2 | Change |
|---|---|---|---|
| Total real completions | 4 | — | — |

### Action Items Review
*(copy from Week 1 open items, mark done/carry forward)*
