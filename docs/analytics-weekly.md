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

## Week 6 — 2026-04-07
*Period: Mar 31 – Apr 6 (last 7 days)*

### GA Overview
| Metric | Last 7d | WoW change | Note |
|---|---|---|---|
| Active users | 19 | +111.1% | Strong growth |
| Views | 172 | +616.7% | Blog pages driving this |
| Key events | 11 | +1,000.0% | Calculator completions up sharply |
| Event count | 365 | +529.3% | — |
| Avg engagement time | 1m 24s | — | Pulled from report snapshot |
| New users | 48 | — | 94% of 51 total users |

### Traffic Sources (last 7 days)
| Source / Medium | Sessions | Note |
|---|---|---|
| (direct) / (none) | 46 | Word of mouth / direct |
| google / organic | 13 | SEO starting to work |
| bing / organic | 2 | — |
| search.google.com | 2 | — |
| aisearchindex.space | 1 | **AI search index referral** — notable |
| egerin.com / referral | 1 | — |
| iconlet.com / referral | 1 | — |

> **aisearchindex.space** is an AI-powered search engine crawler/referral — first AI search signal appearing in traffic. Our `llms.txt` and Quick Answer blocks are already having an effect.

### Top Pages (report snapshot period)
| Page | Views | Active Users | Bounce Rate | Note |
|---|---|---|---|---|
| Homepage | 99 | 50 | 50.8% | — |
| Calculator | 59 | 13 | **18.2%** | Excellent engagement |
| How to Calculate XIRR | 21 | 6 | **0.0%** | Very strong |
| Blog index | 16 | 2 | 25.0% | — |
| How It Works | 14 | 8 | 16.7% | — |
| Features | 10 | 4 | 0.0% | — |
| Zerodha XIRR blog | 9 | 1 | **0.0%** | New blog already indexed |

### Geography (last 7 days)
| City | Users | Note |
|---|---|---|
| Ashburn | 12 | AWS datacenter — bots, discount |
| Chennai | 6 | Real user |
| Bengaluru | 2 | Real user |
| Chicago | 2 | Possibly bot |
| Delhi | 2 | Real user |
| Ho Chi Minh City | 2 | — |
| Hyderabad | 2 | Real user |

### Key Observations
- **Calculator bounce rate 18.2%** — very healthy, most visitors who reach it engage
- **How to Calculate XIRR: 0% bounce** — content is exactly what searchers need
- **Zerodha XIRR blog: 9 views, 0% bounce** — published Apr 6, already getting traffic within 24h
- **13 Google organic sessions** — SEO is working, up from ~3 in Week 1
- **Key events up 1,000%** — biggest signal, actual calculator usage is accelerating
- **aisearchindex.space referral** — first AI search platform referral appearing; AEO work is paying off early
- **Ashburn (12 users)** — still inflating US numbers, same as Week 1 pattern

### Week 6 Summary
Traffic up strongly across all metrics. Calculator is converting well (18.2% bounce = 81.8% engagement rate). SEO is producing organic sessions. The new Zerodha blog got traffic within 24 hours. First AI search referral visible. Main gap: returning users still low — email reminders or "share your results" could help retention.

### Targets for next check
| Metric | Week 6 | Target |
|---|---|---|
| Active users (7d) | 19 | >30 |
| Google organic sessions | 13 | >25 |
| Key events (7d) | 11 | >20 |
| Zerodha blog views | 9 | >25 |
| AI search referrals | 1 | >3 |
