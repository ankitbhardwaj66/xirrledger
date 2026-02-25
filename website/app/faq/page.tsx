'use client';

import { useState } from 'react';
import { FaChevronDown, FaEnvelope, FaWhatsapp } from 'react-icons/fa';

const GOLD = '#f59e0b';
const NAVY = '#0f172a';

const glass = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: '12px',
} as const;

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div style={{ background: NAVY, minHeight: '100vh', paddingTop: '5rem', paddingBottom: '6rem' }}>
      <div className="container-custom">

        {/* ── Hero ── */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: '100px', padding: '5px 14px',
            fontSize: '12px', fontWeight: 600, color: GOLD,
            letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '20px',
          }}>
            ✦ Got Questions?
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, color: '#ffffff', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Frequently Asked Questions
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7 }}>
            Everything you need to know about XIRR Ledger and how it works
          </p>
        </div>

        {/* ── FAQ Sections ── */}
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          {faqCategories.map((category, catIndex) => (
            <div key={catIndex} style={{ marginBottom: '3rem' }}>
              <h2 style={{
                fontSize: '0.78rem', fontWeight: 700, color: GOLD,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                marginBottom: '1rem', paddingLeft: '4px',
              }}>
                {category.title}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {category.questions.map((faq, faqIndex) => {
                  const index = catIndex * 100 + faqIndex;
                  const isOpen = openIndex === index;
                  return (
                    <div key={index} style={{
                      ...glass,
                      borderColor: isOpen ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.09)',
                      transition: 'border-color 0.2s',
                      overflow: 'hidden',
                    }}>
                      <button
                        onClick={() => setOpenIndex(isOpen ? null : index)}
                        style={{
                          width: '100%', padding: '18px 20px',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px',
                          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: '0.97rem', color: '#e2e8f0', lineHeight: 1.5 }}>{faq.question}</span>
                        <span style={{
                          flexShrink: 0, color: isOpen ? GOLD : '#475569',
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.25s, color 0.2s',
                          display: 'flex',
                        }}>
                          <FaChevronDown size={15} />
                        </span>
                      </button>
                      {isOpen && (
                        <div style={{
                          padding: '0 20px 20px',
                          color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.75,
                        }}>
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── CTA ── */}
        <div style={{
          maxWidth: '780px', margin: '0 auto',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.03) 100%)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: '20px', padding: '48px 32px', textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', marginBottom: '10px', letterSpacing: '-0.01em' }}>
            Still Have Questions?
          </h2>
          <p style={{ color: '#64748b', marginBottom: '28px', fontSize: '0.95rem' }}>
            We&apos;re here to help. Get in touch with us.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="mailto:contact@xirrledger.com" style={{
              background: GOLD, color: '#0a1020',
              padding: '12px 26px', borderRadius: '10px',
              fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
            }}>
              <FaEnvelope size={15} /> Email Us
            </a>
            <a href="https://wa.me/916239618150" target="_blank" rel="noopener noreferrer" style={{
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
              color: '#4ade80', padding: '12px 26px', borderRadius: '10px',
              fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
            }}>
              <FaWhatsapp size={16} /> WhatsApp
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

const faqCategories = [
  {
    title: 'General Questions',
    questions: [
      {
        question: 'What is XIRR and why is it important?',
        answer: (
          <div>
            <p style={{ marginBottom: '10px' }}>
              XIRR (Extended Internal Rate of Return) is the most accurate way to measure investment performance when you have irregular cash flows — multiple deposits and withdrawals at different times.
            </p>
            <p style={{ marginBottom: '8px' }}>Unlike simple returns, XIRR accounts for:</p>
            <ul style={{ paddingLeft: '20px', lineHeight: 2 }}>
              <li>The timing of each deposit and withdrawal</li>
              <li>The time value of money</li>
              <li>Compound growth over time</li>
            </ul>
            <p style={{ marginTop: '10px' }}>
              This gives you a true annualized return rate that you can compare across different investments and time periods.
            </p>
          </div>
        ),
      },
      {
        question: 'Why is ledger-based calculation better than manual entry?',
        answer: (
          <div>
            <p style={{ marginBottom: '8px' }}>Ledger-based calculation is the ONLY way to get 100% accurate XIRR because:</p>
            <ul style={{ paddingLeft: '20px', lineHeight: 2 }}>
              <li><strong style={{ color: '#e2e8f0' }}>No manual errors:</strong> Human error is eliminated when typing dates and amounts</li>
              <li><strong style={{ color: '#e2e8f0' }}>Complete transaction history:</strong> Your ledger captures ALL transactions automatically</li>
              <li><strong style={{ color: '#e2e8f0' }}>Accurate dates:</strong> Exact transaction dates are critical for XIRR calculations</li>
              <li><strong style={{ color: '#e2e8f0' }}>Instant upload:</strong> Takes seconds instead of hours of manual entry</li>
              <li><strong style={{ color: '#e2e8f0' }}>Quarterly settlements:</strong> Automatically captures payouts you might forget</li>
            </ul>
          </div>
        ),
      },
      {
        question: 'Is my data safe? Do you store my financial information?',
        answer: (
          <div>
            <p style={{ marginBottom: '8px' }}><strong style={{ color: '#e2e8f0' }}>Absolutely safe!</strong> Your privacy and security are our top priorities:</p>
            <ul style={{ paddingLeft: '20px', lineHeight: 2 }}>
              <li>Your ledger files are processed securely and <strong style={{ color: '#e2e8f0' }}>never stored</strong> on our servers</li>
              <li>Reports are <strong style={{ color: '#e2e8f0' }}>auto-deleted after 24 hours</strong></li>
              <li>No registration or account creation required</li>
              <li>No tracking or analytics on your financial data</li>
            </ul>
          </div>
        ),
      },
    ],
  },
  {
    title: 'Using the Calculator',
    questions: [
      {
        question: 'Which brokers are currently supported?',
        answer: (
          <div>
            <p style={{ marginBottom: '8px' }}>Currently supported:</p>
            <ul style={{ paddingLeft: '20px', lineHeight: 2, marginBottom: '10px' }}>
              <li><strong style={{ color: '#e2e8f0' }}>Zerodha</strong> — CSV format ledger files</li>
              <li><strong style={{ color: '#e2e8f0' }}>Groww</strong> — PDF format ledger files (password: your PAN)</li>
              <li><strong style={{ color: '#e2e8f0' }}>Fyers</strong> — CSV format ledger files</li>
            </ul>
            <p>You can combine files from all three brokers in a single calculation to get your true combined portfolio XIRR.</p>
          </div>
        ),
      },
      {
        question: 'Can I combine multiple accounts from different brokers?',
        answer: (
          <div>
            <p style={{ marginBottom: '8px' }}><strong style={{ color: '#e2e8f0' }}>Yes!</strong> This is one of our most powerful features. The calculator will:</p>
            <ul style={{ paddingLeft: '20px', lineHeight: 2 }}>
              <li>Automatically group files from the same account (by PAN)</li>
              <li>Calculate XIRR for each account individually</li>
              <li>Provide a combined portfolio XIRR</li>
              <li>Generate a comprehensive comparison report</li>
            </ul>
          </div>
        ),
      },
      {
        question: 'How do I download my ledger from Zerodha?',
        answer: (
          <div>
            <ol style={{ paddingLeft: '20px', lineHeight: 2, marginBottom: '10px' }}>
              <li><a href="https://console.zerodha.com/funds/statement?segment=equity&src=kiteweb" target="_blank" rel="noopener noreferrer" style={{ color: GOLD, fontWeight: 600 }}>Open Zerodha Statement →</a> (direct link — no navigation needed)</li>
              <li>Select <strong style={{ color: '#e2e8f0' }}>All Segments</strong> as category</li>
              <li>Set date range from your first investment till today</li>
              <li>Click the <strong style={{ color: '#e2e8f0' }}>blue arrow →</strong> then click <strong style={{ color: '#e2e8f0' }}>CSV</strong></li>
            </ol>
            <p style={{ color: '#10b981' }}>✓ One CSV covers all years · No password required</p>
          </div>
        ),
      },
      {
        question: 'How do I download my ledger from Groww?',
        answer: (
          <div>
            <p style={{ marginBottom: '8px', fontWeight: 600, color: '#e2e8f0' }}>Method 1 — Recommended (single file, all history from Apr 2023):</p>
            <ol style={{ paddingLeft: '20px', lineHeight: 2, marginBottom: '12px' }}>
              <li><a href="https://groww.in/user/profile/report" target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', fontWeight: 600 }}>Open Groww Reports →</a></li>
              <li>Scroll to <strong style={{ color: '#e2e8f0' }}>Transactions → Groww Balance Statement</strong></li>
              <li>Select <strong style={{ color: '#e2e8f0' }}>PDF</strong> format, set date range → Download</li>
            </ol>
            <p style={{ marginBottom: '8px', fontWeight: 600, color: '#64748b' }}>Method 2 — Alternative (for history before Apr 2023):</p>
            <ol style={{ paddingLeft: '20px', lineHeight: 2, marginBottom: '12px' }}>
              <li><a href="https://groww.in/user/balance/inr" target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', fontWeight: 600 }}>Open Groww Balance →</a></li>
              <li>Click <strong style={{ color: '#e2e8f0' }}>All Transactions → Download statement</strong></li>
              <li>Select date range (max 1 year) → Repeat for all years</li>
            </ol>
            <p style={{ color: '#94a3b8' }}>🔐 Password for all Groww PDFs: your PAN in UPPERCASE (e.g., ABCDE1234F)</p>
          </div>
        ),
      },
      {
        question: 'How do I download my ledger from Fyers?',
        answer: (
          <div>
            <ol style={{ paddingLeft: '20px', lineHeight: 2, marginBottom: '10px' }}>
              <li><a href="https://fyers.in/web/reports/ledger" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', fontWeight: 600 }}>Open Fyers Ledger →</a> (direct link)</li>
              <li>Select the <strong style={{ color: '#e2e8f0' }}>Financial Year</strong></li>
              <li>Click <strong style={{ color: '#e2e8f0' }}>Generate</strong> then <strong style={{ color: '#e2e8f0' }}>Download CSV</strong></li>
              <li><strong style={{ color: '#e2e8f0' }}>Repeat for all years</strong> from your first investment</li>
            </ol>
            <p style={{ color: '#10b981' }}>✓ No password required · Download one CSV per financial year</p>
          </div>
        ),
      },
    ],
  },
  {
    title: 'Results & Reports',
    questions: [
      {
        question: 'What is the Nifty 50 benchmark comparison?',
        answer: (
          <div>
            <p style={{ marginBottom: '10px' }}>
              The Nifty 50 comparison shows how your portfolio would have performed if you had invested the same amounts on the same dates in the Nifty 50 index instead.
            </p>
            <p style={{ marginBottom: '10px' }}>
              This helps you answer the critical question: <strong style={{ color: '#e2e8f0' }}>"Am I beating the market?"</strong>
            </p>
            <p>
              The calculator fetches historical Nifty 50 data and simulates buying/selling units on your transaction dates, then calculates the XIRR for that hypothetical portfolio.
            </p>
          </div>
        ),
      },
      {
        question: 'Can I download a report for tax filing?',
        answer: (
          <div>
            <p style={{ marginBottom: '8px' }}><strong style={{ color: '#e2e8f0' }}>Yes!</strong> The PDF report includes:</p>
            <ul style={{ paddingLeft: '20px', lineHeight: 2, marginBottom: '10px' }}>
              <li>All portfolio metrics and XIRR calculations</li>
              <li>Individual account breakdowns</li>
              <li>Combined portfolio analysis</li>
              <li>Nifty 50 benchmark comparison</li>
              <li>Transaction summaries</li>
            </ul>
            <p>Perfect for sharing with your CA or financial advisor.</p>
          </div>
        ),
      },
    ],
  },
  {
    title: 'Troubleshooting',
    questions: [
      {
        question: 'What if my XIRR seems too high or too low?',
        answer: (
          <div>
            <p style={{ marginBottom: '8px' }}>First, verify your inputs:</p>
            <ul style={{ paddingLeft: '20px', lineHeight: 2, marginBottom: '10px' }}>
              <li>Check that your current holdings value is correct</li>
              <li>Ensure you&apos;ve included available cash</li>
              <li>Make sure your ledger covers the entire investment period</li>
            </ul>
            <p>
              If everything looks correct, the XIRR might actually be accurate! Compare with the Nifty 50 benchmark to see if it makes sense relative to the market.
            </p>
          </div>
        ),
      },
      {
        question: "The password for my Groww PDF isn't working. What should I do?",
        answer: (
          <div>
            <p style={{ marginBottom: '8px' }}>Make sure:</p>
            <ul style={{ paddingLeft: '20px', lineHeight: 2, marginBottom: '10px' }}>
              <li>Use all <strong style={{ color: '#e2e8f0' }}>UPPERCASE</strong> letters (e.g., ABCDE1234F not abcde1234f)</li>
              <li>Include the complete 10-character PAN</li>
              <li>No extra spaces before or after</li>
            </ul>
            <p>If it still doesn&apos;t work, check your Groww settings or contact Groww support.</p>
          </div>
        ),
      },
    ],
  },
];
