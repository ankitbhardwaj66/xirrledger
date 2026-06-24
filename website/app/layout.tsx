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
  authors: [{ name: 'Ankit Bhardwaj' }],
  // Dev build (.env.dev sets NEXT_PUBLIC_NOINDEX=true) emits noindex so
  // dev.xirrledger.com stays out of Google's index. Prod has no flag → indexable.
  robots:
    process.env.NEXT_PUBLIC_NOINDEX === 'true'
      ? { index: false, follow: false }
      : undefined,
  openGraph: {
    title: 'XIRR Ledger - Ledger-Based XIRR Calculator',
    description: 'Calculate accurate portfolio returns from your actual trading ledger. Multi-broker support (Zerodha, Groww, Fyers) with Nifty 50 benchmark comparison. Free, no signup required.',
    type: 'website',
    url: 'https://xirrledger.com/',
    siteName: 'XIRR Ledger',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XIRR Ledger - Ledger-Based XIRR Calculator',
    description: 'Calculate accurate portfolio returns from your actual trading ledger. Multi-broker support (Zerodha, Groww, Fyers) with Nifty 50 benchmark comparison.',
    images: ['/opengraph-image'],
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
    'https://www.youtube.com/@xirrledger',
  ],
  foundingDate: '2024',
  areaServed: {
    '@type': 'Country',
    name: 'India',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN" className={`scroll-smooth ${mono.variable} ${displayFont.variable}`}>
      <head>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <link rel="preconnect" href="https://www.googletagmanager.com" />
            <link rel="preconnect" href="https://www.google-analytics.com" />
          </>
        )}
        <link rel="preconnect" href="https://img.youtube.com" />
        <link rel="preload" as="image" href="/video-thumb-xirr.jpg" />
      </head>
      <body className={inter.className}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
        <Navigation />
        <main>{children}</main>
        <Footer />
        {process.env.NEXT_PUBLIC_GA_ID && <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
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
