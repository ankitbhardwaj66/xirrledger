import Link from 'next/link';

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-[#1f77b4] text-white py-20 overflow-hidden" style={{
        background: 'linear-gradient(135deg, #1f77b4 0%, #155a8a 100%)'
      }}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="container-custom relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight" style={{
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
              }}>
                The Only Ledger-Based XIRR Calculator
              </h1>
              <p className="text-xl mb-8 text-white font-normal leading-relaxed" style={{
                textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
              }}>
                Calculate accurate portfolio returns from your actual trading ledger. No manual entry. No spreadsheets. Just upload your broker files and get precise XIRR calculations instantly.
              </p>

              <div className="flex flex-wrap gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                  </svg>
                  <span>Ledger-Based Accuracy</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                  </svg>
                  <span>Multi-Broker Support</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
                  </svg>
                  <span>Benchmark Comparison</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <a
                  href="https://xirrcalculatorr.streamlit.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition text-center"
                  style={{ color: '#1f77b4' }}
                >
                  Try Now - It&apos;s Free
                </a>
                <Link
                  href="/how-it-works"
                  className="bg-transparent border-2 px-8 py-4 rounded-lg font-bold text-lg transition text-center"
                  style={{
                    borderColor: '#ffffff',
                    color: '#ffffff'
                  }}
                >
                  See How It Works
                </Link>
              </div>

              <p className="text-sm text-white font-medium" style={{
                textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
              }}>
                ✓ Free to use • No registration required • Privacy-focused
              </p>
            </div>

            <div className="hidden md:block">
              <div className="bg-white text-gray-900 rounded-2xl shadow-2xl p-6 transform hover:scale-105 transition duration-300">
                <div className="bg-primary-dark text-white p-4 rounded-lg mb-4 flex items-center gap-3">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
                  </svg>
                  <span className="font-semibold">Portfolio Analysis</span>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-gray-600">Total Invested</span>
                    <span className="font-bold text-lg">₹12,34,567</span>
                  </div>
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-gray-600">Current Value</span>
                    <span className="font-bold text-lg">₹15,67,890</span>
                  </div>
                  <div className="flex justify-between py-3 bg-green-50 -mx-6 px-6 rounded">
                    <span className="text-gray-600 font-semibold">XIRR (Annualized)</span>
                    <span className="font-bold text-2xl text-green-600">18.45%</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-gray-600">vs Nifty 50</span>
                    <span className="font-bold text-lg text-green-600">+4.2%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Ledger-Based Section */}
      <section className="py-20 bg-gray-50">
        <div className="container-custom">
          <h2 className="text-4xl font-bold text-center mb-4">Why Ledger-Based Calculation is the ONLY Accurate Way</h2>
          <p className="text-xl text-gray-600 text-center mb-12 max-w-3xl mx-auto">
            Most XIRR calculators require manual data entry, leading to errors and inaccuracies. We use your actual trading ledger for 100% accurate results.
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Traditional Calculators */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="text-gray-400 text-5xl mb-4">
                <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-center mb-6">Traditional Calculators</h3>
              <ul className="space-y-3">
                {[
                  'Manual data entry required',
                  'Prone to human errors',
                  'Time-consuming process',
                  'Missing transactions',
                  'No multi-account support',
                  'No benchmark comparison'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* XIRR Ledger */}
            <div className="rounded-2xl p-8 shadow-2xl transform md:scale-105" style={{
              backgroundColor: '#1f77b4',
              color: '#ffffff'
            }}>
              <div className="text-5xl mb-4">
                <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#ffffff' }}>
                  <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-center mb-6" style={{ color: '#ffffff' }}>XIRR Ledger</h3>
              <ul className="space-y-3">
                {[
                  'Automated ledger parsing',
                  '100% accurate calculations',
                  'Upload and done in seconds',
                  'All transactions captured',
                  'Multi-account & multi-broker',
                  'Nifty 50 benchmark included'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#86efac' }}>
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    <span style={{ color: '#ffffff' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container-custom">
          <h2 className="text-4xl font-bold text-center mb-4">Powerful Features for Serious Investors</h2>
          <p className="text-xl text-gray-600 text-center mb-12">Everything you need to accurately track your portfolio performance</p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                ),
                title: 'Upload Ledger Files',
                description: 'Simply upload your broker ledger files (CSV or PDF). No manual transaction entry required.'
              },
              {
                icon: (
                  <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                ),
                title: 'Multi-Broker Support',
                description: 'Works with Zerodha and Groww. Combine accounts from different brokers for consolidated analysis.'
              },
              {
                icon: (
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                ),
                title: 'Multi-Account Analysis',
                description: 'Analyze multiple accounts simultaneously with individual and combined portfolio XIRR calculations.'
              },
              {
                icon: (
                  <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
                ),
                title: 'Nifty 50 Benchmark',
                description: 'Compare your portfolio performance against Nifty 50 index to see if you\'re beating the market.'
              },
              {
                icon: (
                  <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/>
                ),
                title: 'PDF Reports',
                description: 'Generate professional PDF reports with all metrics for tax filing, advisors, or personal records.'
              },
              {
                icon: (
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                ),
                title: '100% Private & Secure',
                description: 'All calculations happen in your browser. Your data never leaves your device. No registration needed.'
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-primary hover:shadow-lg transition">
                <div className="text-primary mb-4">
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                    {feature.icon}
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/features" className="inline-block bg-primary text-white px-8 py-4 rounded-lg font-bold hover:bg-primary-dark transition">
              View All Features
            </Link>
          </div>
        </div>
      </section>

      {/* Sample Report Section */}
      <section className="py-16 bg-gray-50">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-200">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#dc2626' }}>
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#ffffff' }}>
                    <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/>
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3">See a Sample Report</h3>
                <p className="text-gray-600 mb-6">
                  Download a sample PDF report to see exactly what kind of analysis and metrics you'll get. Perfect for understanding the calculator's output before you try it.
                </p>
                <a
                  href="/sample_report.pdf"
                  download="XIRR_Sample_Report.pdf"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition"
                  style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Sample Report (PDF)
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative bg-[#1f77b4] text-white py-20 overflow-hidden" style={{
        background: 'linear-gradient(135deg, #1f77b4 0%, #155a8a 100%)'
      }}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="container-custom text-center relative z-10">
          <h2 className="text-4xl font-extrabold mb-4" style={{
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
          }}>Ready to Calculate Your Accurate XIRR?</h2>
          <p className="text-xl mb-8 text-white font-normal" style={{
            textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
          }}>
            Upload your ledger and get precise returns in minutes. No registration required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://xirrcalculatorr.streamlit.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition"
              style={{ color: '#1f77b4' }}
            >
              Launch Calculator Now
            </a>
            <Link
              href="/contact"
              className="bg-transparent border-2 px-8 py-4 rounded-lg font-bold text-lg transition"
              style={{
                borderColor: '#ffffff',
                color: '#ffffff'
              }}
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
