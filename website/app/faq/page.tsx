import type { Metadata } from 'next';
import FAQClient from './FAQClient';

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is XIRR and why is it important for Indian investors?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'XIRR (Extended Internal Rate of Return) is the most accurate way to measure investment returns when you invest money at irregular intervals — which is how most Indian retail investors actually invest in stocks. Unlike CAGR, which assumes a single lump-sum investment held to maturity, XIRR accounts for the exact date and amount of every cash flow. If you added ₹50,000 in January and ₹80,000 in July, XIRR treats each rupee differently based on how long it was actually invested. CAGR ignores this entirely. XIRR also accounts for idle cash in your broker account before you deploy it, STT, brokerage, DP charges, and all transaction costs, dividend income as cash inflows, and multiple accounts across different brokers. The result is one honest annualised return percentage — the number your broker does not show you.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the difference between XIRR and CAGR?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'CAGR assumes you invested all your money on a single day and never touched it again. It only looks at your starting value and ending value, ignoring everything in between. For lump-sum fixed deposits, CAGR is fine. XIRR is designed for real-world investing — where you buy stocks across multiple dates, add money periodically, withdraw some profits, and keep some cash idle in your account. XIRR gives each rupee its own start date, so the return is proportional to how long each rupee was actually at work. Example: you invest ₹1 lakh on January 1st and another ₹1 lakh on December 1st. By December 31st your portfolio is ₹2.1 lakh. CAGR would show a healthy return based on the total. But XIRR would show a much more modest return — because the second ₹1 lakh was only invested for one month, not a year. For anyone investing regularly in Indian stocks, XIRR is the only metric that makes sense.',
      },
    },
    {
      '@type': 'Question',
      name: 'Why does XIRR Ledger show a lower return than my broker?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Brokers show inflated returns for three reasons. First, idle cash is ignored: your broker starts counting from when you bought a stock — not from when you transferred money to the account. That gap (sometimes weeks) of idle cash is a real cost your broker does not count. Second, charges are excluded: STT, DP charges, brokerage, GST, SEBI fees, stamp duty — all deducted from your ledger but not counted in your broker\'s return calculation. Third, single-broker view: if you use multiple brokers, each shows only its own account with no combined number. XIRR Ledger reads your actual cash ledger — so every rupee in, every rupee out, and every fee is already captured. The number you see is what you actually earned.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which brokers are currently supported?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'XIRR Ledger currently supports Zerodha (XLSX format, one file covers all years), Groww (PDF format, password is your PAN in uppercase), and Fyers (CSV format, one file per financial year). You can upload files from all three brokers in the same session for a combined XIRR.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does XIRR Ledger support mutual funds?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. XIRR Ledger is built specifically for equity investing through broker accounts — Zerodha, Groww, and Fyers. Mutual fund investments use a different cash flow structure and are not supported at this time.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is XIRR Ledger free to use?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, completely free. No subscription, no credit card, no hidden charges. Sign in with Google or email OTP, upload your ledger files, and get your XIRR. A detailed PDF report is automatically emailed to you after every calculation.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the Nifty 50 benchmark comparison and how is it calculated?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The Nifty 50 comparison simulates investing the exact same amounts on the exact same dates into Nifty 50 instead of stocks. XIRR Ledger fetches historical Nifty 50 price data and calculates what your return would have been with index investing. This is the fairest possible benchmark — same money, same timing, different investment. If your XIRR is higher, you are genuinely beating the index.',
      },
    },
    {
      '@type': 'Question',
      name: 'How are STT and brokerage charges handled?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'STT, DP charges, brokerage, GST, SEBI fees and stamp duty are all deducted from your broker ledger balance on every trade. When XIRR Ledger reads your ledger, these deductions are automatically included as cash outflows. You do not need to enter charges manually — they are already in the ledger.',
      },
    },
    {
      '@type': 'Question',
      name: 'What does a negative XIRR mean?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A negative XIRR means your portfolio has lost value in annualised terms — the current value is less than what you invested, accounting for timing. This can happen during broad market downturns. Compare your XIRR with the Nifty 50 XIRR shown alongside — if Nifty is also negative, the market itself is down, not just your stock picks.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I combine multiple broker accounts?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Upload files from multiple brokers or multiple accounts in one session. The calculator identifies each account automatically, calculates individual XIRR per account, and gives you a single combined XIRR with a capital distribution breakdown and account comparison table in the PDF report.',
      },
    },
    {
      '@type': 'Question',
      name: 'How long does the calculation take?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Usually 20–40 seconds from the moment you click Calculate. The backend processes all your transactions, fetches historical Nifty 50 data for the exact same cash flow dates, and runs the XIRR computation. The PDF report is emailed to you automatically once processing is complete. Larger files with many years of history may take up to 60 seconds.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I download my ledger from Zerodha?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Log in to Zerodha Console and open the Account Statement page. Select All Segments as the category and set the date range from your very first investment to today. Click the download arrow and select XLSX format. One file covers all your years with no password required. For dividend income, go to Console → Reports → Downloads → Dividend Statement and download one file per financial year.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I download my ledger from Groww?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Method 1 (recommended for history from April 2023 onward): Open Groww Reports, scroll to Transactions → Groww Balance Statement, select PDF format, set the date range and download. Method 2 (for history before April 2023): Open Groww Balance, click All Transactions → Download statement, select a date range of maximum one year and repeat for each year. The password for all Groww PDFs is your PAN number in uppercase — for example, ABCDE1234F.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I download my ledger from Fyers?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Log in to Fyers and open the Ledger page under Reports. Select the Financial Year, click Generate and then Download CSV. Repeat for all years from your first investment. No password required — one CSV file per financial year.',
      },
    },
    {
      '@type': 'Question',
      name: 'What does the PDF report contain?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The PDF has four sections: Portfolio Summary (your XIRR, first investment date, investment period, total invested, total withdrawn, current value, dividend income, and net gain/loss), Nifty 50 Comparison (your XIRR vs Nifty XIRR, performance gap, and how much more or less you made compared to the index), Individual Account Analysis (capital distribution across your accounts, profit/loss per account, and a detailed breakdown for each account including XIRR), and Account Comparison Table (all accounts side by side with a combined total row). The report is automatically emailed to you after every calculation.',
      },
    },
    {
      '@type': 'Question',
      name: 'How is idle cash in my broker account handled?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'When you transfer money to your broker account, that is a real cash outflow — you moved it from a savings account where it earned interest to a broker account where it earns nothing until you invest. XIRR Ledger treats every bank transfer as a cash outflow on that exact date. If money sat idle for 3 weeks before you bought a stock, those 3 weeks count against your return. This is why our XIRR is often lower than what your broker shows — brokers start the clock when you buy, not when you transfer. Example: you transfer ₹1 lakh on March 1st but only invest it on March 22nd. Your broker ignores those 3 idle weeks. XIRR Ledger counts them, because your capital was committed from March 1st. You also enter your current available cash balance separately at the time of calculation, which is added to the final portfolio value.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is my data safe? Do you store my financial information?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Your ledger files are uploaded to a secure AWS S3 bucket over HTTPS and processed on our servers. Files are deleted after processing is complete. We do not store individual transaction data. Your email is used only to send the PDF report — we will never use it for marketing or spam. No registration is required; you sign in with Google or email OTP only.',
      },
    },
    {
      '@type': 'Question',
      name: 'What if my XIRR seems too high or too low?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Check three things: Holdings value — make sure you entered the current live market value of your portfolio, not the invested value. Cash balance — add the available cash in your broker account, as this is part of your current portfolio value. Ledger date range — make sure your ledger covers from your very first deposit to today, not just the last year. If all inputs look correct, the number is likely accurate. A low XIRR is often genuine — most retail investors underperform the index over 3–5 years after accounting for charges and idle cash.',
      },
    },
    {
      '@type': 'Question',
      name: 'The password for my Groww PDF is not working. What should I do?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The password is your PAN number. Make sure all letters are UPPERCASE — for example ABCDE1234F, not abcde1234f. Use the full 10-character PAN with no spaces. If it still does not work, try downloading the file again as Groww sometimes generates a corrupted PDF. If the issue persists, use the alternative download method — the yearly statement instead of the combined one.',
      },
    },
    {
      '@type': 'Question',
      name: 'Why is ledger-based calculation more accurate than manual entry?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Most XIRR calculators ask you to manually enter each transaction date and amount. This fails because manual errors directly corrupt the result, people forget transactions like partial withdrawals and quarterly charges, and entering hundreds of transactions for a multi-year portfolio is impractical. Your broker ledger has every transaction recorded with exact dates and amounts. Uploading it takes 30 seconds and gives a mathematically complete calculation with no guesswork or missing entries.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use XIRR to calculate returns on SIP investments?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes — XIRR is actually the most accurate metric for SIP (Systematic Investment Plan) returns because SIPs invest fixed amounts at regular intervals, which is exactly the irregular-cash-flow scenario XIRR is designed for. CAGR cannot handle SIPs correctly because it assumes a single lump-sum investment. If you invest ₹5,000 every month into a stock or ETF through your broker, XIRR calculates the true annualised return by accounting for the exact date and amount of each instalment. XIRR Ledger reads all these investments directly from your broker ledger so you do not need to enter each SIP transaction manually.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does XIRR work for F&O (futures and options) trading?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes — XIRR Ledger supports F&O trading accounts. All F&O premium paid, profits received, and charges (STT on options exercise, exchange charges, SEBI fees, GST) are captured in your broker ledger. When you upload your ledger, XIRR Ledger includes all these as cash flows in the XIRR computation. This gives F&O traders an honest picture of their annualised return, which is especially important because F&O involves high turnover and significant per-trade charges that inflate the apparent return when ignored.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the difference between XIRR and absolute return?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Absolute return is the total gain or loss expressed as a percentage of the amount invested, with no adjustment for time. If you invested ₹1 lakh and it grew to ₹1.3 lakh, your absolute return is 30% — regardless of whether it took 6 months or 6 years. XIRR (Extended Internal Rate of Return) annualises that return to account for time. The same 30% gain in 6 months is an XIRR of roughly 69% per year, while the same 30% gain in 6 years is an XIRR of about 4.5% per year. XIRR is the correct metric for comparing investments over different time periods or evaluating whether your returns are competitive with benchmarks like Nifty 50 or fixed deposit rates.',
      },
    },
  ],
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://xirrledger.com/' },
    { '@type': 'ListItem', position: 2, name: 'FAQ', item: 'https://xirrledger.com/faq/' },
  ],
};

export const metadata: Metadata = {
  title: 'FAQ — XIRR Ledger | Common Questions Answered',
  description: 'Everything about XIRR Ledger — what is XIRR, how it differs from CAGR, why broker returns are inflated, how STT charges affect your XIRR, and how to download your ledger from Zerodha, Groww and Fyers.',
  keywords: ['XIRR calculator FAQ', 'XIRR vs CAGR', 'what is XIRR', 'Zerodha XIRR', 'broker returns inflated', 'STT charges XIRR', 'negative XIRR meaning', 'Zerodha ledger download', 'Groww ledger download', 'portfolio returns India'],
  openGraph: {
    title: 'FAQ — XIRR Ledger | Common Questions Answered',
    description: 'Answers to the most common questions about XIRR Ledger — supported brokers, data privacy, and how to interpret your XIRR results.',
    type: 'website',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    url: 'https://xirrledger.com/faq/',
  },
  alternates: {
    canonical: 'https://xirrledger.com/faq/',
  },
};

export default function FAQPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <FAQClient />
    </>
  );
}
