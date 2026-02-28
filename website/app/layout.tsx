import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
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
      <head>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <link rel="preconnect" href="https://www.googletagmanager.com" />
        )}
      </head>
      <body className={inter.className}>
        <Navigation />
        <main>{children}</main>
        <Footer />
        {process.env.NEXT_PUBLIC_GA_ID && <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            strategy="lazyOnload"
          />
          <Script id="google-analytics" strategy="lazyOnload">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
            `}
          </Script>
        </>}
      </body>
    </html>
  );
}
