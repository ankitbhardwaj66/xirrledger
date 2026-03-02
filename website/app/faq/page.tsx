import type { Metadata } from 'next';
import FAQClient from './FAQClient';

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is XIRR and why is it important?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'XIRR (Extended Internal Rate of Return) is the most accurate way to measure investment performance when you have irregular cash flows — multiple deposits and withdrawals at different times. Unlike simple returns, XIRR accounts for the timing of each deposit and withdrawal, the time value of money, and compound growth over time.',
      },
    },
    {
      '@type': 'Question',
      name: 'Why is ledger-based calculation better than manual entry?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Ledger-based calculation eliminates manual errors, captures the complete transaction history automatically, uses exact transaction dates critical for XIRR, and takes seconds instead of hours of manual entry.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is my data safe? Do you store my financial information?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Your ledger files are processed securely and never stored on our servers. Reports are auto-deleted after 24 hours. No registration or account creation is required.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which brokers are currently supported?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Currently supported: Zerodha (CSV format), Groww (PDF format, password is your PAN), and Fyers (CSV format). You can combine files from all three brokers in a single calculation.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I combine multiple accounts from different brokers?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. The calculator automatically groups files from the same account by PAN, calculates XIRR for each account individually, and provides a combined portfolio XIRR.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the Nifty 50 benchmark comparison?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The Nifty 50 comparison shows how your portfolio would have performed if you had invested the same amounts on the same dates in the Nifty 50 index instead. This helps you answer: "Am I beating the market?"',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I download a report for tax filing?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. The PDF report includes all portfolio metrics, XIRR calculations, individual account breakdowns, combined portfolio analysis, Nifty 50 benchmark comparison, and transaction summaries. Perfect for sharing with your CA or financial advisor.',
      },
    },
  ],
};

export const metadata: Metadata = {
  title: 'FAQ — XIRR Ledger | Common Questions Answered',
  description: 'Answers to the most common questions about XIRR Ledger — how it works, which brokers are supported, data privacy, and how to interpret your XIRR results.',
  keywords: ['XIRR calculator FAQ', 'XIRR Ledger questions', 'how XIRR works', 'Zerodha ledger upload', 'XIRR vs CAGR', 'portfolio returns FAQ'],
  openGraph: {
    title: 'FAQ — XIRR Ledger | Common Questions Answered',
    description: 'Answers to the most common questions about XIRR Ledger — supported brokers, data privacy, and how to interpret your XIRR results.',
    type: 'website',
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
