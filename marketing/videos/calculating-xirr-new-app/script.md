# XIRR Ledger — Video Script

**Estimated duration:** 5–6 minutes at normal pace

---

## INTRO
*[Look at camera, casual tone]*

If you're investing in Indian stock markets — Zerodha, Groww, Fyers — you probably check your portfolio returns regularly.

But here's a question: *do you actually know your real return?*

Not the number your broker app shows. Your **actual, annualised return** — accounting for every rupee you've put in, and exactly when you put it in.

---

## THE PROBLEM WITH CAGR
*[Slightly frustrated tone]*

Most brokers show you something called CAGR. And CAGR is fine — if you invested all your money in one shot and never touched it again.

But that's not how anyone actually invests in stocks.

You add fresh capital every few months. You book some profits and withdraw. You transfer money to your broker account and then wait for the right entry. Some of that cash sits idle for weeks before you deploy it.

The moment you do any of that — CAGR gives you the wrong number. It just looks at your starting balance and ending balance and ignores everything in between.

That's not a return. That's a guess.

---

## THE RIGHT METRIC — XIRR

The right metric is called **XIRR** — Extended Internal Rate of Return.

XIRR accounts for the exact timing of every single cash flow. Every rupee you transferred to your broker, every rupee you withdrew, and today's portfolio value — it runs a precise calculation and gives you one clean number: your **true annualised return**.

This is the honest number.

---

## WHERE BROKERS FALL SHORT
*[Key point — lean forward]*

So why doesn't Zerodha or Groww show you this properly?

They do show some version of XIRR — but only for what's inside their app. If you trade on two brokers, they don't talk to each other. You have no single combined number.

And there's a bigger problem.

Your broker's XIRR starts from when you *bought a stock* — not from when you *transferred money* to your broker account. That cash sitting idle before you invested? They ignore it. But you moved it from your bank — where it was earning interest — to your broker account, where it earns nothing. That's a real cost, and your broker isn't counting it.

**So the number your broker shows you is better than your reality.**

---

## THE HIDDEN COST — STT & CHARGES
*[Direct, slightly provocative]*

And it gets worse.

Every time you buy or sell a stock, you pay STT — Securities Transaction Tax. Plus DP charges, SEBI fees, stamp duty, GST on brokerage. These aren't small numbers for active investors. Over a year, they can quietly eat thousands of rupees out of your returns.

Now here's the thing — your broker *knows* all of this. Every single charge is right there in your ledger.

But when they show you your returns? Those charges are conveniently not counted.

Why? Because if they showed you the real number — after all fees and taxes — it would look a lot worse. And a worse number means you might think twice about trading as frequently.

**Their business model runs on your transactions. It's not in their interest to show you how much those transactions actually cost you.**

XIRR Ledger calculates from your full ledger — which means every charge, every tax, every fee is already baked in. The number you see is what you actually made, after everything.

---

## INTRODUCING XIRR LEDGER
*[Confident, pull back to overview]*

That's why I built **XIRR Ledger**.

It calculates your true XIRR from your actual broker ledger — across all your stock market accounts combined — and benchmarks it against Nifty 50.

Let me show you exactly how it works.

---

## APP WALKTHROUGH
*[Switch to screen share — open xirrledger.com/calculator]*

### Step 1 — Sign In

So you land on this page. First step — just enter your name and email. You'll get a quick OTP to verify, and then you're in.

---

### Step 2 — Upload Your Ledger Files
*[Upload screen visible]*

Now this is where you upload your broker ledger files.

For **Zerodha** — go to Console, Funds, View Statement, select all segments and your full date range, and download the CSV or XLSX. That's your ledger.

For **Groww** — go to Funds, All Transactions, select the year and download the PDF. One file per year, your PAN is the password.

For **Fyers** — go to Reports, Ledger, and download the CSV.

*[Drag and drop file]*

You just drop the files here. You can upload from multiple brokers in the same session — it handles everything together in one calculation.

---

### Step 3 — Enter Current Holdings Value
*[Details screen visible]*

Once your files are validated, you come to this screen. Here you enter your **current holdings value** — the live market value of everything you currently hold in that account. You can check this directly in your broker app.

*[Fill in a number]*

That's it. One number per account.

---

### Results
*[Click Calculate, wait, results screen visible]*

Hit Calculate — it processes everything on the backend. Usually takes about 30 seconds.

And here's your result.

Your **XIRR** — your true annualised return from stock investing, after all charges, taxes and idle cash are accounted for. Right next to it, **Nifty 50's XIRR** over the exact same period with the exact same cash flows. So you instantly know — are you beating the index or not?

Below that — total invested, current value, net gain or loss, and how long you've been invested.

And a detailed PDF report is automatically emailed to you so you have it saved.

---

## IMPORTANT — STOCKS ONLY
*[Back to camera, clear and direct]*

One important thing to mention — this tool is specifically for **stock market investing**. Zerodha, Groww, Fyers equity accounts.

It works from your broker's cash ledger — the actual money movements in and out of your account. Mutual fund investments work differently and are not supported right now.

So if you're an equity investor — this is built exactly for you.

---

## CLOSING
*[Direct to camera]*

If you've been investing in stocks for more than a year and you've never seen your true XIRR — you genuinely don't know how you're performing.

You might be beating Nifty. You might be underperforming it badly. You won't know until you run the numbers honestly — with all the fees and idle cash counted.

It's completely free. No app to install. Takes 2 minutes.

Link is in the description — **xirrledger.com**

---

*Script by XIRR Ledger Team*
