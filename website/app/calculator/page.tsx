import type { Metadata } from 'next';
import CalculatorClient from './CalculatorClient';

export const metadata: Metadata = {
  title: 'XIRR Calculator — Upload Your Broker Ledger | XIRR Ledger',
  description: 'Upload your Zerodha, Groww, or Fyers ledger file and instantly get your portfolio XIRR with Nifty 50 benchmark comparison. No manual entry. Free.',
  keywords: ['XIRR calculator India', 'Zerodha XIRR', 'Groww XIRR', 'portfolio returns calculator', 'broker ledger XIRR', 'XIRR from ledger'],
  robots: { index: false, follow: true },
  openGraph: {
    title: 'XIRR Calculator — Upload Your Broker Ledger | XIRR Ledger',
    description: 'Upload your Zerodha, Groww, or Fyers ledger file and instantly get your portfolio XIRR with Nifty 50 benchmark comparison.',
    type: 'website',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    url: 'https://xirrledger.com/calculator/',
  },
  alternates: {
    canonical: 'https://xirrledger.com/calculator/',
  },
};

export default function CalculatorPage() {
  return <CalculatorClient />;
}
