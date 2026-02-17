'use client';

import { useState } from 'react';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="py-16">
      <div className="container-custom">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6">Frequently Asked Questions</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to know about XIRR Ledger and how it works
          </p>
        </div>

        {/* FAQ Sections */}
        <div className="max-w-4xl mx-auto">
          {faqCategories.map((category, catIndex) => (
            <div key={catIndex} className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: '#1f77b4' }}>{category.title}</h2>
              <div className="space-y-4">
                {category.questions.map((faq, faqIndex) => {
                  const index = catIndex * 100 + faqIndex;
                  return (
                    <div
                      key={index}
                      className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:border-primary transition"
                    >
                      <button
                        onClick={() => setOpenIndex(openIndex === index ? null : index)}
                        className="w-full px-6 py-4 text-left flex justify-between items-center gap-4"
                      >
                        <span className="font-semibold text-lg">{faq.question}</span>
                        <svg
                          className={`w-6 h-6 flex-shrink-0 transition-transform ${
                            openIndex === index ? 'transform rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openIndex === index && (
                        <div className="px-6 pb-6">
                          <div className="text-gray-600 leading-relaxed space-y-3">
                            {faq.answer}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 bg-gray-50 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Still Have Questions?</h2>
          <p className="text-xl text-gray-600 mb-8">
            We're here to help! Get in touch with us.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:contact@xirrledger.com"
              className="inline-block px-8 py-4 rounded-lg font-bold transition"
              style={{ backgroundColor: '#1f77b4', color: '#ffffff' }}
            >
              Email Us
            </a>
            <a
              href="https://wa.me/1234567890"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 rounded-lg font-bold transition"
              style={{ backgroundColor: '#22c55e', color: '#ffffff' }}
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

const faqCategories = [
  {
    title: "General Questions",
    questions: [
      {
        question: "What is XIRR and why is it important?",
        answer: (
          <div>
            <p className="mb-3">
              XIRR (Extended Internal Rate of Return) is the most accurate way to measure investment performance when you have irregular cash flows - multiple deposits and withdrawals at different times.
            </p>
            <p className="mb-3">
              Unlike simple returns, XIRR accounts for:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>The timing of each deposit and withdrawal</li>
              <li>The time value of money</li>
              <li>Compound growth over time</li>
            </ul>
            <p className="mt-3">
              This gives you a true annualized return rate that you can compare across different investments and time periods.
            </p>
          </div>
        )
      },
      {
        question: "Why is ledger-based calculation better than manual entry?",
        answer: (
          <div>
            <p className="mb-3">
              Ledger-based calculation is the ONLY way to get 100% accurate XIRR because:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>No manual errors:</strong> Human error is eliminated when typing dates and amounts</li>
              <li><strong>Complete transaction history:</strong> Your ledger captures ALL transactions automatically</li>
              <li><strong>Accurate dates:</strong> Exact transaction dates are critical for XIRR calculations</li>
              <li><strong>Instant upload:</strong> Takes seconds instead of hours of manual entry</li>
              <li><strong>Quarterly settlements:</strong> Automatically captures payouts you might forget</li>
            </ul>
          </div>
        )
      },
      {
        question: "Is my data safe? Do you store my financial information?",
        answer: (
          <div>
            <p className="mb-3">
              <strong>Absolutely safe!</strong> Your privacy and security are our top priorities:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>All calculations happen <strong>locally in your browser</strong></li>
              <li>Your ledger files are <strong>never uploaded</strong> to any server</li>
              <li>No data is stored or transmitted anywhere</li>
              <li>No registration or account creation required</li>
              <li>No tracking or analytics on your financial data</li>
            </ul>
            <p className="mt-3">
              Think of it like using a calculator on your phone - everything stays on your device.
            </p>
          </div>
        )
      }
    ]
  },
  {
    title: "Using the Calculator",
    questions: [
      {
        question: "Which brokers are currently supported?",
        answer: (
          <div>
            <p className="mb-3">Currently supported:</p>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-3">
              <li><strong>Zerodha</strong> - CSV format ledger files</li>
              <li><strong>Groww</strong> - PDF format ledger files (password-protected)</li>
            </ul>
            <p>
              <strong>Coming soon:</strong> Angel One, Upstox, ICICI Direct, and other popular Indian brokers.
            </p>
          </div>
        )
      },
      {
        question: "Can I combine multiple accounts from different brokers?",
        answer: (
          <div>
            <p>
              <strong>Yes!</strong> This is one of our most powerful features. You can upload ledger files from multiple accounts and even different brokers. The calculator will:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
              <li>Automatically group files from the same account (by PAN)</li>
              <li>Calculate XIRR for each account individually</li>
              <li>Provide a combined portfolio XIRR</li>
              <li>Generate a comprehensive comparison report</li>
            </ul>
          </div>
        )
      },
      {
        question: "How do I download my ledger from Zerodha?",
        answer: (
          <div>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Log in to Zerodha Console</li>
              <li>Go to Funds → View Statement</li>
              <li>Select "All segment category"</li>
              <li>Select date range (from first investment till now)</li>
              <li>Click Download CSV</li>
            </ol>
            <p className="mt-3">
              ✓ No password required for Zerodha CSV files
            </p>
          </div>
        )
      },
      {
        question: "How do I download my ledger from Groww?",
        answer: (
          <div>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Log in to Groww</li>
              <li>Go to Funds → All Transactions</li>
              <li>Select date & year (max 1 year per PDF)</li>
              <li>Click Download</li>
              <li><strong>Important:</strong> Repeat for ALL years from your first investment</li>
            </ol>
            <p className="mt-3">
              ⚠️ Groww limits downloads to 1 year per PDF, so you'll need multiple files for accurate XIRR over your entire investment period.
            </p>
            <p className="mt-2">
              🔐 Password: Your PAN number in UPPERCASE (e.g., ABCDE1234F)
            </p>
          </div>
        )
      }
    ]
  },
  {
    title: "Results & Reports",
    questions: [
      {
        question: "What is the Nifty 50 benchmark comparison?",
        answer: (
          <div>
            <p className="mb-3">
              The Nifty 50 comparison shows you how your portfolio would have performed if you had invested the same amounts on the same dates in the Nifty 50 index instead.
            </p>
            <p className="mb-3">
              This helps you answer the critical question: <strong>"Am I beating the market?"</strong>
            </p>
            <p>
              The calculator fetches historical Nifty 50 data and simulates buying/selling units on your transaction dates, then calculates the XIRR for that hypothetical portfolio.
            </p>
          </div>
        )
      },
      {
        question: "Can I download a report for tax filing?",
        answer: (
          <div>
            <p className="mb-3">
              <strong>Yes!</strong> You can generate and download a professional PDF report that includes:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>All portfolio metrics and XIRR calculations</li>
              <li>Individual account breakdowns</li>
              <li>Combined portfolio analysis</li>
              <li>Nifty 50 benchmark comparison</li>
              <li>Transaction summaries</li>
            </ul>
            <p className="mt-3">
              These reports are perfect for sharing with your CA or financial advisor.
            </p>
          </div>
        )
      }
    ]
  },
  {
    title: "Troubleshooting",
    questions: [
      {
        question: "What if my XIRR seems too high or too low?",
        answer: (
          <div>
            <p className="mb-3">First, verify your inputs:</p>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-3">
              <li>Check that your current holdings value is correct</li>
              <li>Ensure you've included available cash</li>
              <li>Make sure your ledger covers the entire investment period</li>
            </ul>
            <p>
              If everything looks correct, the XIRR might actually be accurate! Compare with the Nifty 50 benchmark to see if it makes sense relative to the market.
            </p>
          </div>
        )
      },
      {
        question: "The password for my Groww PDF isn't working. What should I do?",
        answer: (
          <div>
            <p className="mb-3">
              Groww PDFs are typically password-protected with your PAN number. Make sure:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Use all UPPERCASE letters (e.g., ABCDE1234F not abcde1234f)</li>
              <li>Include the complete 10-character PAN</li>
              <li>No extra spaces before or after</li>
            </ul>
            <p className="mt-3">
              If it still doesn't work, check your Groww settings to confirm the password or contact Groww support.
            </p>
          </div>
        )
      }
    ]
  }
];
