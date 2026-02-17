import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'XIRR Ledger - The Only Ledger-Based XIRR Calculator',
  description: 'Calculate accurate portfolio returns from your actual trading ledger. Multi-broker support with Nifty 50 benchmark comparison. No manual entry required.',
  keywords: ['XIRR calculator', 'portfolio returns', 'trading ledger', 'Zerodha', 'Groww', 'Nifty 50', 'investment returns'],
  authors: [{ name: 'Ankit Bhardwaj' }],
  openGraph: {
    title: 'XIRR Ledger - Ledger-Based XIRR Calculator',
    description: 'Calculate accurate portfolio returns from your actual trading ledger',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={inter.className}>
        <Navigation />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
