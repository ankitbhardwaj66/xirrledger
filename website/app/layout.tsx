import type { Metadata } from 'next';
import { Inter, IBM_Plex_Mono, Bricolage_Grotesque } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'], display: 'swap' });
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-mono',
});

const displayFont = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  display: 'swap',
  variable: '--font-display',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://xirrledger.com'),
  title: 'XIRR Ledger - The Only Ledger-Based XIRR Calculator',
  description: 'Calculate accurate portfolio returns from your actual trading ledger. Multi-broker support with Nifty 50 benchmark comparison. No manual entry required.',
  keywords: ['XIRR calculator', 'portfolio returns', 'trading ledger', 'Zerodha', 'Groww', 'Nifty 50', 'investment returns'],
  authors: [{ name: 'Ankit Bhardwaj' }],
  openGraph: {
    title: 'XIRR Ledger - Ledger-Based XIRR Calculator',
    description: 'Calculate accurate portfolio returns from your actual trading ledger',
    type: 'website',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://xirrledger.com/#organization',
  name: 'XIRR Ledger',
  url: 'https://xirrledger.com',
  logo: {
    '@type': 'ImageObject',
    url: 'https://xirrledger.com/logo-email.png',
    width: 512,
    height: 512,
  },
  description: 'The only ledger-based XIRR calculator for Indian investors. Upload your Zerodha, Groww, or Fyers ledger and get accurate portfolio returns with Nifty 50 benchmark comparison.',
  founder: {
    '@type': 'Person',
    name: 'Ankit Bhardwaj',
    url: 'https://ankitbhardwaj.in',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'contact@xirrledger.com',
    contactType: 'customer support',
  },
  sameAs: [
    'https://www.youtube.com/watch?v=ZXf0VT8RPmc',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`scroll-smooth ${mono.variable} ${displayFont.variable}`}>
      <head>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <link rel="preconnect" href="https://www.googletagmanager.com" />
        )}
      </head>
      <body className={inter.className}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
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
