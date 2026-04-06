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
        text: 'XIRR (Extended Internal Rate of Return) is the most accurate way to measure investment returns when you invest at irregular intervals. Unlike CAGR, XIRR accounts for the exact timing of every deposit and withdrawal, idle cash in your broker account, all transaction charges like STT and brokerage, and dividend income. It gives you one honest annualised return — the number your broker does not show you.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the difference between XIRR and CAGR?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'CAGR assumes you invested all your money on a single day and never touched it again. It only looks at your starting and ending value. XIRR is designed for real-world investing — where you add money regularly, withdraw sometimes, and keep cash idle in your account. XIRR gives each rupee its own start date, so the return reflects how long each rupee was actually invested. For anyone investing regularly in Indian stocks, XIRR is the only metric that makes sense.',
      },
    },
    {
      '@type': 'Question',
      name: 'Why does XIRR Ledger show a lower return than my broker?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Brokers show inflated XIRR for three reasons: they ignore idle cash before you buy a stock, they exclude STT, DP charges, brokerage, GST and stamp duty from the calculation, and they only show returns for their platform. XIRR Ledger reads your actual cash ledger where every rupee in, every rupee out, and every fee is captured. The number you see is what you actually earned.',
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
      <FAQClient />
    </>
  );
}
