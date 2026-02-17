export default function Features() {
  return (
    <div className="py-16">
      <div className="container-custom">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6">Comprehensive Features</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need for accurate portfolio analysis and performance tracking
          </p>
        </div>

        {/* Current Features */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-8 text-center">Current Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {currentFeatures.map((feature, i) => (
              <FeatureCard key={i} {...feature} />
            ))}
          </div>
        </section>

        {/* Roadmap */}
        <section className="bg-gray-50 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4 text-center">Coming Soon</h2>
          <p className="text-gray-600 text-center mb-12">We're constantly improving. Here's what's next:</p>

          <div className="grid md:grid-cols-3 gap-8">
            {roadmapFeatures.map((feature, i) => (
              <div key={i} className="bg-white rounded-lg p-6 border-2 border-primary/20">
                <div className="flex items-start gap-4">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                    Soon
                  </span>
                </div>
                <h3 className="text-xl font-bold mt-4 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, badge }: any) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition border border-gray-100">
      <div className="text-primary mb-4">
        <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
          <path d={icon} />
        </svg>
      </div>
      {badge && (
        <span className="inline-block bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full mb-3 font-semibold">
          {badge}
        </span>
      )}
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

const currentFeatures = [
  {
    icon: "M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z",
    title: "Ledger-Based Calculation",
    description: "The only calculator that works directly with your broker ledger files. Upload CSV or PDF files for 100% accurate XIRR calculations without manual data entry.",
    badge: "Core Feature"
  },
  {
    icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
    title: "Multi-Broker Support",
    description: "Currently supports Zerodha (CSV) and Groww (PDF). Combine ledgers from different brokers for consolidated portfolio analysis.",
    badge: "Popular"
  },
  {
    icon: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
    title: "Multi-Account Analysis",
    description: "Manage multiple trading accounts effortlessly. Get individual XIRR for each account plus combined portfolio metrics in one comprehensive report."
  },
  {
    icon: "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z",
    title: "Nifty 50 Benchmark",
    description: "Automatically compare your portfolio performance against Nifty 50 index. See if you're beating the market with detailed comparison metrics.",
    badge: "Essential"
  },
  {
    icon: "M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z",
    title: "PDF Report Generation",
    description: "Download professional PDF reports with all metrics, perfect for tax filing, financial advisors, or personal record keeping."
  },
  {
    icon: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z",
    title: "Comprehensive Metrics",
    description: "Track total invested, withdrawn, current value, net gain/loss, simple returns, annualized XIRR, and investment period - all in one place."
  },
  {
    icon: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z",
    title: "Privacy & Security",
    description: "All calculations happen locally in your browser. Your financial data never leaves your device. No registration or data storage required."
  },
  {
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
    title: "Automatic Transaction Detection",
    description: "Smart parsing of your ledger files automatically identifies deposits, withdrawals, payouts, and quarterly settlements."
  },
  {
    icon: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
    title: "Password-Protected PDFs",
    description: "Support for password-protected Groww PDFs. Securely process encrypted files with your PAN number as password."
  }
];

const roadmapFeatures = [
  {
    title: "More Brokers",
    description: "Adding support for Angel One, Upstox, ICICI Direct, and other popular Indian brokers."
  },
  {
    title: "More Indexes",
    description: "Compare against Sensex, Midcap 150, Smallcap 250, and sector-specific indexes."
  },
  {
    title: "Sector Analysis",
    description: "Detailed breakdown of returns by sectors to understand which areas of your portfolio are performing best."
  },
  {
    title: "Risk Metrics",
    description: "Advanced risk analysis including Sharpe ratio, max drawdown, volatility, and more."
  },
  {
    title: "Historical Tracking",
    description: "Track your XIRR over time and visualize performance trends with interactive charts."
  },
  {
    title: "Tax Optimizer",
    description: "Smart suggestions for tax-loss harvesting and capital gains optimization."
  }
];
