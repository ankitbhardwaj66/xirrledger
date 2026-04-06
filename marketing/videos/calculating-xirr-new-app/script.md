# XIRR Ledger — Video Script v2
# Teleprompter-ready. Estimated duration: 5–6 minutes.

---

## INTRO

Your broker is hiding your real returns.

That's not a conspiracy theory. That's just how their system works — and by the end of this video, you'll have the actual number in front of you.

I'm Ankit. I'm a software developer, and I've been investing in Indian stock markets for a few years now. And like most of you, I had no idea what my true returns were — until I built a tool to find out.

I called it XIRR Ledger. And today I'm going to show you exactly how it works.

---

## THE PROBLEM WITH CAGR

Let's start with what your broker actually shows you.

Most brokers show you CAGR — Compound Annual Growth Rate. And CAGR is fine — if you put all your money in on day one and never touched it again.

But that's not how anyone actually invests.

You add money every few months. You sell some stocks and withdraw. You transfer money to your broker account and then wait — sometimes weeks — before you find the right stock. That cash sits idle. It's doing nothing. But you pulled it out of your savings account where it was earning interest.

The moment any of that happens, CAGR gives you the wrong number. It just looks at your opening balance and closing balance and ignores everything in between.

That's not a return. That's a rough guess.

---

## THE RIGHT METRIC — XIRR

The right metric for active investors is XIRR — Extended Internal Rate of Return.

XIRR accounts for the exact timing of every single rupee. Every deposit into your broker account. Every withdrawal. Your current portfolio value. Your idle cash. All of it.

It gives you one honest number — your true annualised return.

---

## HOW BROKERS GET IT WRONG — SCREEN SHARE (Zerodha Console)

Let me show you something first. I'm going to open Zerodha Console right now.

*[Switch to screen share — open console.zerodha.com]*

So this is Zerodha Console. I'll go to Portfolio, then Holdings.

*[Click Portfolio > Holdings]*

Now scroll down a little. You'll see a small link here that says — "View Portfolio XIRR."

*[Point to the link]*

Sounds exactly like what we want, right? Let me click it.

*[Click the link — nothing loads]*

Nothing. Just a spinner. I've been trying this for literally years. It just never loads.

Now even if it did load — and for some of you it might actually show a number — that number is still wrong. Here's why.

Zerodha's XIRR starts from when you bought your first stock. Not from when you first transferred money into your account. So that 2 weeks your money sat idle before you found the right stock? Not counted.

And see all these charges in your ledger — brokerage, STT, DP charges, GST, stamp duty. Every single trade you make, these get quietly deducted. Zerodha's XIRR doesn't account for any of this.

*[Switch back to camera]*

Brokers calculate XIRR in a way that makes their platform look good. And honestly, that makes sense for them — their business model runs on your transactions. The more you trade, the more they earn. Showing you the full cost of those transactions isn't really in their interest.

XIRR Ledger calculates from your actual cash ledger. Every rupee in. Every rupee out. Every charge. No exceptions.

---

## APP WALKTHROUGH — SCREEN SHARE

Let me show you exactly how it works.

Go to xirrledger.com and click Launch Calculator.

Sign in with Google or enter your email — you'll get a quick OTP to verify.

Now for the ledger file. See this link in the top right — "How to download?"

*[Click "How to download?" — modal opens]*

This opens a guide for every supported broker. I'm on Zerodha, so let me walk through that tab.

Step 1 — click "Open Zerodha Statement" — it's a direct link, opens the statement page automatically if you're already signed in.

Step 2 — select All Segments as the category.

Step 3 — set the date range from your very first investment till today.

Step 4 — click the blue arrow, then click XLSX. One file. No password needed. That covers all your years in one download.

*[Close the modal]*

Now you also see this section below — "Optional: Zerodha dividend statement." For your dividends, just click this direct link right here.

*[Click the Zerodha Console → Reports → Downloads link]*

*[Download FY files — 2022-23, 2023-24, 2024-25, 2025-26 one by one]*

Four years, four files. That's it. Now back to the app.

*[Switch back to XIRR Ledger upload screen]*

I'll drop these dividend files in along with my ledger file. This adds your dividend income as cash inflows into the XIRR calculation — which most tools completely ignore. If you've never received dividends, skip this — it's optional.

Now drag and drop all your files here. You can mix files from multiple brokers in the same session — the app figures out what's what automatically.

Files validated. Now enter your current holdings value — the live market value of everything you're holding right now. Let me pull that up.

*[Switch to Kite dashboard → Holdings]*

This number here — current value — that's what you enter. Copy it.

*[Switch back to XIRR Ledger, paste holdings value]*

Now the cash balance — the money sitting idle in your account. Let me check that too.

*[Switch to Kite → Funds]*

This is your available cash. Copy that number as well.

*[Switch back to XIRR Ledger, paste cash balance]*

Hit Calculate XIRR. Give it about 30 seconds.

---

## THE RESULT — WITTY COMMENT

And here are my numbers. Two accounts analysed, combined.

My XIRR — minus 6.90%.

Yes. Negative. Take a moment.

Now before you feel too bad for me — keep in mind this result covers a period that included the Iran situation sending global markets into a bit of a spiral. When geopolitics decides to go to war with your portfolio, even the honest numbers look rough.

*[Point to Nifty 50 XIRR on screen]*

And look at this — Nifty 50's XIRR over the exact same period, with the exact same cash flow timing. Minus 1.53%. So even the index is in the red. The whole market has been hurting.

And then this banner right here — "Nifty 50 beat you by 5.37% — consider index funds." That's my gap. Even in a down market, the index did better than me.

Now that's a hard thing to read. But this is exactly why you need to know it. Because if I didn't run this, I'd have no idea. I might have assumed I was doing fine. I was not.

This IS the honest number. Not the flattering one. The real one.

---

## THE PDF REPORT

Let's click Download Report.

*[Open PDF — scroll to first page]*

The PDF starts with the same three numbers you saw on the results screen — your XIRR, Nifty's XIRR, and the performance gap. This is your headline. Mine says minus 6.90%, Nifty at minus 1.53%, and I underperformed by 5.37%.

Right below that is the Portfolio Summary. This is the full picture — your first investment date, how long you've been invested, total number of transactions, and then the money numbers — total invested, total withdrawn, current portfolio value, and your net gain or loss. And your XIRR at the bottom. I'm blurring the rupee amounts but you get the idea — everything is right here in one place.

Then comes the Nifty 50 Benchmark Comparison. This is the honest comparison. It shows what would have happened if every rupee you put into stocks had gone into Nifty 50 instead — on the exact same dates, in the exact same amounts. Your XIRR versus Nifty's XIRR, and the value difference. In my case — Nifty would have given me more money. Underperformed by 5.37%.

*[Scroll to next section]*

Now this is something I really like. Before the individual account breakdown, there's a motivational note — "Keep building your skills. You are 3.7 years into your investing journey. Nifty 50 is a tough benchmark — many investors only start beating it after 5 plus years of experience. Stay consistent." Honest, but not discouraging. I appreciate that.

Then the Individual Account Analysis. Since I uploaded two Zerodha accounts, you can see a capital distribution pie chart — 52.6% in one account, 47.4% in the other. And a profit and loss bar chart per account so you can instantly see which one is dragging more.

*[Scroll to individual account tables]*

Each account then gets its own detailed breakdown. My first account — XIRR minus 7.20%. My second — minus 6.72%. Both in the red, but now I know exactly which one is performing worse.

*[Scroll to final summary table]*

And at the very end — an Account Comparison table. Both accounts side by side, and then a combined row at the bottom. Total invested across both, total withdrawn, current combined value, and total net gain or loss. This is your complete financial picture in one line.

That's the full report. Everything your broker never told you — in one PDF.

---

## CLOSING

This report gets emailed to you automatically as well, so you have it saved.

The tool is completely free. No app to install. It works with Zerodha, Groww, and Fyers right now — more brokers coming.

One thing to be clear about — this is for equity investing only. Stocks. Not mutual funds. MF cash flows work differently and aren't supported yet.

If you've been investing for more than a year and you've never seen your real XIRR — you genuinely don't know how you're doing.

Link is in the description — xirrledger.com. Takes two minutes. Go find out.

If you have questions or want any features added, drop them in the comments. I read everything.

Thanks for watching.

---

*Script v2 — XIRR Ledger*
*Rewritten for teleprompter delivery*
