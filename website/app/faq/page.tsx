import type { Metadata } from 'next';
import FAQClient from './FAQClient';

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
  return <FAQClient />;
}
