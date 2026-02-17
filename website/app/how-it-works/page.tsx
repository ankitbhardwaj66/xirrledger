export default function HowItWorks() {
  return (
    <div className="py-16">
      <div className="container-custom">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6">How It Works</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Calculate your portfolio XIRR in 4 simple steps. Takes less than 5 minutes!
          </p>
        </div>

        {/* Steps */}
        <div className="max-w-4xl mx-auto mb-20">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-8 mb-12 last:mb-0">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg">
                  {i + 1}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                <p className="text-gray-600 mb-4">{step.description}</p>
                {step.note && (
                  <div className="bg-blue-50 border-l-4 border-primary p-4 rounded">
                    <p className="text-sm text-gray-700">{step.note}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Broker Guides */}
        <section id="broker-guides" className="mb-20">
          <h2 className="text-3xl font-bold mb-12 text-center">Broker-Specific Guides</h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Zerodha */}
            <div id="zerodha" className="bg-white border-2 border-blue-200 rounded-xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  Z
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Zerodha</h3>
                  <p className="text-gray-600 text-sm">CSV Format</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="bg-blue-100 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                    1
                  </span>
                  <p>Log in to <a href="https://console.zerodha.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Zerodha Console</a></p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-blue-100 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                    2
                  </span>
                  <p>Go to <strong>Funds → View Statement</strong></p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-blue-100 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                    3
                  </span>
                  <p>Select <strong>All segment category</strong></p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-blue-100 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                    4
                  </span>
                  <p>Select date range <strong>(from first investment till now)</strong></p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-blue-100 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                    5
                  </span>
                  <p>Click <strong>Download CSV</strong></p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t space-y-2">
                <p className="flex items-center gap-2 text-sm">
                  <span className="text-green-600">✓</span> File type: CSV
                </p>
                <p className="flex items-center gap-2 text-sm">
                  <span className="text-green-600">✓</span> Password: Not required
                </p>
              </div>
            </div>

            {/* Groww */}
            <div id="groww" className="bg-white border-2 border-green-200 rounded-xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  G
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Groww</h3>
                  <p className="text-gray-600 text-sm">PDF Format</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="bg-green-100 text-green-800 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                    1
                  </span>
                  <p>Log in to <a href="https://groww.in/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Groww</a></p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-green-100 text-green-800 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                    2
                  </span>
                  <p>Go to <strong>Funds → All Transactions</strong></p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-green-100 text-green-800 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                    3
                  </span>
                  <p>Select date & year <strong>(max 1 year per PDF)</strong></p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-green-100 text-green-800 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                    4
                  </span>
                  <p>Click <strong>Download</strong></p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-green-100 text-green-800 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                    5
                  </span>
                  <p><strong>Repeat for ALL years</strong> from first investment till now</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t space-y-2">
                <p className="flex items-center gap-2 text-sm">
                  <span className="text-green-600">✓</span> File type: PDF
                </p>
                <p className="flex items-center gap-2 text-sm">
                  <span className="text-green-600">✓</span> Password: Your PAN (uppercase)
                </p>
                <p className="flex items-center gap-2 text-sm text-amber-600">
                  <span>⚠</span> Download for entire period (multiple PDFs)
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="bg-gradient-to-br from-primary to-primary-dark text-white rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Follow the steps above and calculate your XIRR now!
          </p>
          <a
            href="https://xirrcalculatorr.streamlit.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-white text-primary px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition"
          >
            Launch Calculator
          </a>
        </div>
      </div>
    </div>
  );
}

const steps = [
  {
    title: "Download Your Ledger",
    description: "Export your trading ledger from your broker's website. For Zerodha, download the CSV file from Console. For Groww, download PDF statements for each year.",
    note: "💡 Tip: Make sure to select the entire date range from your first investment till today for accurate calculations."
  },
  {
    title: "Upload Files",
    description: "Upload your ledger files to the calculator. You can upload multiple files at once - from the same broker or different brokers. Files from the same account (PAN) will be automatically combined.",
    note: "🔒 Your data is processed locally in your browser and never uploaded to any server."
  },
  {
    title: "Enter Current Values",
    description: "Input your current portfolio values - holdings value and available cash. The calculator will show you separate input fields for each account if you have multiple.",
    note: "📊 You can find these values in your broker's app or website dashboard."
  },
  {
    title: "Get Your XIRR",
    description: "View detailed analysis with XIRR calculations, Nifty 50 benchmark comparison, and all key metrics. Download a professional PDF report for your records or tax filing.",
    note: "📄 PDF reports include all metrics and are perfect for sharing with financial advisors or CAs."
  }
];
