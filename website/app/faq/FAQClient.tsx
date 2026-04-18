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
    title: 'Understanding XIRR',
    questions: [
      {
        question: 'What is XIRR and why is it important for Indian investors?',
        answer: (
          <div>
            <p style={{ marginBottom: '10px' }}>
              XIRR (Extended Internal Rate of Return) is the most accurate way to measure your investment returns when you invest money at irregular intervals — which is how most Indian retail investors actually invest in stocks.
            </p>
            <p style={{ marginBottom: '10px' }}>
              Unlike CAGR (Compound Annual Growth Rate), XIRR accounts for the exact date and amount of every rupee you put in or took out. If you added ₹50,000 in January and ₹80,000 in July, XIRR treats those differently based on how long each rupee was actually invested. CAGR ignores this entirely.
            </p>
            <p style={{ marginBottom: '8px' }}>XIRR accounts for:</p>
            <ul style={{ paddingLeft: '20px', lineHeight: 2 }}>
              <li>The exact timing of every deposit and withdrawal</li>
              <li>Cash sitting idle in your broker account before deployment</li>
              <li>STT, brokerage, DP charges, and all transaction costs</li>
              <li>Dividend income as cash inflows</li>
              <li>Multiple accounts across different brokers</li>
            </ul>
            <p style={{ marginTop: '10px' }}>
              The result is one honest annualised return percentage — the number your broker doesn't show you.
            </p>
          </div>
        ),
      },
      {
        question: 'What is the difference between XIRR and CAGR?',
        answer: (
          <div>
            <p style={{ marginBottom: '10px' }}>
              CAGR assumes you invested all your money on a single day and never touched it again. It only looks at your starting value and ending value, ignoring everything in between. For lump-sum fixed deposits, CAGR is fine.
            </p>
            <p style={{ marginBottom: '10px' }}>
              XIRR is designed for real-world investing — where you buy stocks across multiple dates, add money periodically, withdraw some profits, and keep some cash idle in your account. XIRR gives each rupee its own "start date" in the calculation, so the return is proportional to how long each rupee was actually at work.
            </p>
            <p style={{ marginBottom: '8px' }}>Example:</p>
            <p style={{ marginBottom: '10px', color: '#94a3b8' }}>
              You invest ₹1 lakh on Jan 1st and another ₹1 lakh on Dec 1st. By Dec 31st your portfolio is ₹2.1 lakh. CAGR would show a healthy return based on the total. But XIRR would show a much more modest return — because the second ₹1 lakh was only invested for one month, not a year.
            </p>
            <p>For anyone who invests regularly in Indian stocks, XIRR is the only metric that makes sense.</p>
          </div>
        ),
      },
      {
        question: 'Why does XIRR Ledger show a lower return than what my broker shows?',
        answer: (
          <div>
            <p style={{ marginBottom: '10px' }}>
              This is one of the most common questions — and the answer reveals exactly why we built this tool.
            </p>
            <p style={{ marginBottom: '8px' }}>Your broker's XIRR is lower than reality for three reasons:</p>
            <ul style={{ paddingLeft: '20px', lineHeight: 2, marginBottom: '10px' }}>
              <li><strong style={{ color: '#e2e8f0' }}>Idle cash is ignored:</strong> Your broker starts counting from when you bought a stock — not from when you transferred money to the account. That gap (sometimes weeks) of idle cash is a real cost that your broker doesn't count.</li>
              <li><strong style={{ color: '#e2e8f0' }}>Charges are excluded:</strong> STT, DP charges, brokerage, GST, SEBI fees, stamp duty — all deducted from your ledger but not counted in your broker's return calculation.</li>
              <li><strong style={{ color: '#e2e8f0' }}>Single-broker view:</strong> If you use multiple brokers, each shows only its own account. No combined number.</li>
            </ul>
            <p>XIRR Ledger reads your actual cash ledger — so every rupee in, every rupee out, and every fee is already captured. The number you see is what you actually earned.</p>
          </div>
        ),
      },
      {
        question: 'What does a negative XIRR mean?',
        answer: (
          <div>
            <p style={{ marginBottom: '10px' }}>
              A negative XIRR means your portfolio has lost value in annualised terms — the current value of your investments is less than what you would have earned by keeping that money in a savings account or fixed deposit.
            </p>
            <p style={{ marginBottom: '10px' }}>
              This can happen during broad market downturns — for example, when global events like geopolitical tensions cause sustained market declines. A negative XIRR doesn't mean you've made poor decisions; it may simply mean you're in a down period.
            </p>
            <p>
              The Nifty 50 comparison next to your XIRR is the most useful context. If your XIRR is -6% but Nifty's XIRR over the same period is also -1.5%, you know the market itself is weak — not just your stock picks.
            </p>
          </div>
        ),
      },
      {
        question: 'Is XIRR Ledger free to use?',
        answer: (
          <div>
            <p style={{ marginBottom: '10px' }}>
              Yes, completely free. No subscription, no credit card, no hidden charges. You sign in with Google or your email, upload your ledger files, and get your results.
            </p>
            <p>A detailed PDF report is automatically emailed to you after every calculation — also free.</p>
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
              <li><strong style={{ color: '#e2e8f0' }}>Zerodha</strong> — XLSX format (one file covers all years)</li>
              <li><strong style={{ color: '#e2e8f0' }}>Groww</strong> — PDF format (password: your PAN in uppercase)</li>
              <li><strong style={{ color: '#e2e8f0' }}>Fyers</strong> — CSV format (one file per financial year)</li>
            </ul>
            <p>You can upload files from all three brokers in the same session to get a single combined XIRR across all your accounts.</p>
          </div>
        ),
      },
      {
        question: 'Does it support mutual funds?',
        answer: (
          <div>
            <p style={{ marginBottom: '10px' }}>
              No — XIRR Ledger is built specifically for equity investing (stocks) through broker accounts. Mutual fund investments work on a different cash flow model and are not supported at this time.
            </p>
            <p>If you invest in stocks through Zerodha, Groww, or Fyers, this tool is built for you.</p>
          </div>
        ),
      },
      {
        question: 'Can I combine multiple accounts from different brokers?',
        answer: (
          <div>
            <p style={{ marginBottom: '8px' }}>Yes — this is one of the most useful features. Upload files from multiple brokers or multiple accounts in the same session. The calculator will:</p>
            <ul style={{ paddingLeft: '20px', lineHeight: 2 }}>
              <li>Automatically identify each account from the file</li>
              <li>Calculate XIRR for each account individually</li>
              <li>Calculate a single combined XIRR across all accounts</li>
              <li>Show a capital distribution breakdown in the PDF report</li>
              <li>Compare your combined portfolio against Nifty 50</li>
            </ul>
          </div>
        ),
      },
      {
        question: 'How long does the calculation take?',
        answer: (
          <div>
            <p style={{ marginBottom: '10px' }}>
              Usually 20–40 seconds from the moment you click Calculate. The backend processes all your transactions, fetches historical Nifty 50 data for the exact same cash flow dates, and runs the XIRR computation. The PDF report is emailed to you automatically once processing is complete.
            </p>
            <p>Larger files with many years of history may take slightly longer — up to 60 seconds.</p>
          </div>
        ),
      },
      {
        question: 'How do I download my ledger from Zerodha?',
        answer: (
          <div>
            <ol style={{ paddingLeft: '20px', lineHeight: 2, marginBottom: '10px' }}>
              <li><a href="https://console.zerodha.com/funds/statement?segment=equity&src=kiteweb" target="_blank" rel="noopener noreferrer" style={{ color: GOLD, fontWeight: 600 }}>Open Zerodha Statement →</a> (logs in automatically if you're signed in)</li>
              <li>Select <strong style={{ color: '#e2e8f0' }}>All Segments</strong> as category</li>
              <li>Set date range from your very first investment till today</li>
              <li>Click the blue arrow → then click <strong style={{ color: '#e2e8f0' }}>XLSX</strong></li>
            </ol>
            <p style={{ color: '#10b981', marginBottom: '8px' }}>✓ One XLSX file covers all your years · No password required</p>
            <p style={{ color: '#94a3b8' }}>For dividend income: go to Console → Reports → Downloads → Dividend Statement. Download one file per financial year and upload alongside your ledger.</p>
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
            <p style={{ marginBottom: '8px', fontWeight: 600, color: '#64748b' }}>Method 2 — For history before Apr 2023:</p>
            <ol style={{ paddingLeft: '20px', lineHeight: 2, marginBottom: '12px' }}>
              <li><a href="https://groww.in/user/balance/inr" target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', fontWeight: 600 }}>Open Groww Balance →</a></li>
              <li>Click <strong style={{ color: '#e2e8f0' }}>All Transactions → Download statement</strong></li>
              <li>Select date range (max 1 year) → Repeat for each year</li>
            </ol>
            <p style={{ color: '#94a3b8' }}>Password for all Groww PDFs: your PAN in UPPERCASE (e.g., ABCDE1234F)</p>
          </div>
        ),
      },
      {
        question: 'How do I download my ledger from Fyers?',
        answer: (
          <div>
            <ol style={{ paddingLeft: '20px', lineHeight: 2, marginBottom: '10px' }}>
              <li><a href="https://fyers.in/web/reports/ledger" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', fontWeight: 600 }}>Open Fyers Ledger →</a> (direct link)</li>
              <li>Select the Financial Year</li>
              <li>Click <strong style={{ color: '#e2e8f0' }}>Generate</strong> then <strong style={{ color: '#e2e8f0' }}>Download CSV</strong></li>
              <li>Repeat for all years from your first investment</li>
            </ol>
            <p style={{ color: '#10b981' }}>✓ No password required · One CSV per financial year</p>
          </div>
        ),
      },
    ],
  },
  {
    title: 'Results & Reports',
    questions: [
      {
        question: 'What is the Nifty 50 benchmark comparison and how is it calculated?',
        answer: (
          <div>
            <p style={{ marginBottom: '10px' }}>
              The Nifty 50 comparison answers one question: if you had put the exact same money into Nifty 50 — on the exact same dates, in the exact same amounts — what would your return be today?
            </p>
            <p style={{ marginBottom: '10px' }}>
              XIRR Ledger fetches historical Nifty 50 price data and simulates buying index units on every date you made a deposit, and selling units on every date you withdrew. It then calculates the XIRR of that hypothetical portfolio using the same cash flows as yours. This is the fairest possible comparison — same money, same timing, different investment.
            </p>
            <p>
              If your XIRR is higher than Nifty's XIRR, you're genuinely beating the index. If it's lower, a low-cost index fund would have served you better.
            </p>
          </div>
        ),
      },
      {
        question: 'What does the PDF report contain?',
        answer: (
          <div>
            <p style={{ marginBottom: '8px' }}>The PDF has four sections:</p>
            <ul style={{ paddingLeft: '20px', lineHeight: 2, marginBottom: '10px' }}>
              <li><strong style={{ color: '#e2e8f0' }}>Portfolio Summary:</strong> Your XIRR, first investment date, investment period, total invested, total withdrawn, current value, dividend income, and net gain/loss.</li>
              <li><strong style={{ color: '#e2e8f0' }}>Nifty 50 Comparison:</strong> Your XIRR vs Nifty XIRR, performance gap, and how much more (or less) you made compared to the index.</li>
              <li><strong style={{ color: '#e2e8f0' }}>Individual Account Analysis:</strong> Capital distribution across your accounts (pie chart), profit/loss per account (bar chart), and a detailed breakdown for each account including XIRR.</li>
              <li><strong style={{ color: '#e2e8f0' }}>Account Comparison Table:</strong> All accounts side by side with a combined total row.</li>
            </ul>
            <p>The report is automatically emailed to you after every calculation and is suitable to share with your CA or financial advisor.</p>
          </div>
        ),
      },
      {
        question: 'How are STT and brokerage charges handled?',
        answer: (
          <div>
            <p style={{ marginBottom: '10px' }}>
              This is where XIRR Ledger differs from every other calculator. We don't ask you to enter charges manually — they're already captured in your broker's cash ledger.
            </p>
            <p style={{ marginBottom: '10px' }}>
              Every time you buy or sell a stock, your broker deducts STT (Securities Transaction Tax), DP charges, exchange transaction charges, SEBI fees, stamp duty, and GST on brokerage — all from your ledger balance. When we calculate your XIRR from the ledger, these deductions are automatically included as cash outflows.
            </p>
            <p>The result: your XIRR reflects what you actually earned after all costs — not a pre-tax, pre-fee estimate.</p>
          </div>
        ),
      },
      {
        question: 'How is idle cash in my broker account handled?',
        answer: (
          <div>
            <p style={{ marginBottom: '10px' }}>
              When you transfer money to your broker account, that's a real cash outflow from your perspective — you moved it from a savings account (where it earned interest) to a broker account (where it earns nothing until you invest it).
            </p>
            <p style={{ marginBottom: '10px' }}>
              XIRR Ledger treats every bank transfer to your broker as a cash outflow on that exact date. If that money sat idle for 3 weeks before you bought a stock, those 3 weeks count. This is why our XIRR is often lower than what your broker shows — brokers only start the clock when you buy, not when you transfer.
            </p>
            <p>You also enter your current available cash balance separately, which is added to the final portfolio value in the calculation.</p>
          </div>
        ),
      },
    ],
  },
  {
    title: 'Privacy & Security',
    questions: [
      {
        question: 'Is my data safe? Do you store my financial information?',
        answer: (
          <div>
            <p style={{ marginBottom: '10px' }}>
              Your ledger files are uploaded to a secure AWS S3 bucket over HTTPS and processed on our backend servers. We do not sell, share, or use your financial data for any purpose other than calculating your XIRR.
            </p>
            <p style={{ marginBottom: '8px' }}>Privacy details:</p>
            <ul style={{ paddingLeft: '20px', lineHeight: 2 }}>
              <li>No registration required — sign in with Google or email OTP only</li>
              <li>Files are deleted from our servers after processing</li>
              <li>We do not store individual transaction data</li>
              <li>Your email is only used to send the PDF report</li>
            </ul>
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
            <p style={{ marginBottom: '8px' }}>Check these three things:</p>
            <ul style={{ paddingLeft: '20px', lineHeight: 2, marginBottom: '10px' }}>
              <li><strong style={{ color: '#e2e8f0' }}>Holdings value:</strong> Make sure you entered the current live market value of your portfolio, not the invested value.</li>
              <li><strong style={{ color: '#e2e8f0' }}>Cash balance:</strong> Add the available cash sitting in your broker account — this is part of your current portfolio value.</li>
              <li><strong style={{ color: '#e2e8f0' }}>Ledger date range:</strong> Make sure your ledger covers from your very first deposit to the present day — not just the last year.</li>
            </ul>
            <p>If all inputs look correct, the number is likely accurate. A surprisingly low XIRR is often genuine — most retail investors underperform the index over 3–5 years, especially after accounting for charges and idle cash.</p>
          </div>
        ),
      },
      {
        question: "The password for my Groww PDF isn't working. What should I do?",
        answer: (
          <div>
            <p style={{ marginBottom: '8px' }}>The password is your PAN number. Make sure:</p>
            <ul style={{ paddingLeft: '20px', lineHeight: 2, marginBottom: '10px' }}>
              <li>All letters are <strong style={{ color: '#e2e8f0' }}>UPPERCASE</strong> — e.g., ABCDE1234F not abcde1234f</li>
              <li>The full 10-character PAN is used</li>
              <li>No spaces before or after the PAN</li>
            </ul>
            <p>If it still doesn't work, try downloading the file again — sometimes Groww generates a corrupted PDF. If the issue persists, contact Groww support or use the alternative download method (yearly statement instead of the combined one).</p>
          </div>
        ),
      },
      {
        question: 'Why is ledger-based calculation more accurate than manual entry?',
        answer: (
          <div>
            <p style={{ marginBottom: '8px' }}>Most online XIRR calculators ask you to manually enter each transaction date and amount. This fails for three reasons:</p>
            <ul style={{ paddingLeft: '20px', lineHeight: 2, marginBottom: '10px' }}>
              <li>Manual entry errors on dates or amounts directly corrupt the XIRR result</li>
              <li>People forget transactions — partial withdrawals, small deposits, quarterly charges</li>
              <li>Entering hundreds of transactions for a 3-year portfolio is impractical</li>
            </ul>
            <p>Your broker's ledger has every single transaction recorded with exact dates and amounts. Uploading it takes 30 seconds and gives you a calculation that is mathematically complete — no guesswork, no missing entries.</p>
          </div>
        ),
      },
      {
        question: 'Can I use XIRR to calculate returns on SIP investments?',
        answer: (
          <div>
            <p style={{ marginBottom: '10px' }}>
              Yes — XIRR is actually the most accurate metric for SIP returns. SIPs invest fixed amounts at regular intervals, which is exactly the irregular-cash-flow scenario XIRR is designed for. CAGR cannot handle SIPs correctly because it assumes a single lump-sum investment.
            </p>
            <p style={{ marginBottom: '10px' }}>
              If you invest ₹5,000 every month into a stock or ETF through your broker, XIRR calculates the true annualised return by accounting for the exact date and amount of each instalment.
            </p>
            <p>XIRR Ledger reads all these investments directly from your broker ledger — no manual entry of each SIP transaction needed.</p>
          </div>
        ),
      },
      {
        question: 'Does XIRR work for F&O (futures and options) trading?',
        answer: (
          <div>
            <p style={{ marginBottom: '10px' }}>
              Yes — XIRR Ledger supports F&O trading accounts. All F&O premium paid, profits received, and charges (STT on options exercise, exchange charges, SEBI fees, GST) are captured in your broker ledger.
            </p>
            <p style={{ marginBottom: '10px' }}>
              When you upload your ledger, all these cash flows are included in the XIRR computation. This is especially important for F&O traders because high turnover and per-trade charges significantly affect real returns — yet most traders only look at gross P&L.
            </p>
            <p>XIRR gives you the single honest annualised return on your deployed capital, after all charges.</p>
          </div>
        ),
      },
      {
        question: 'What is the difference between XIRR and absolute return?',
        answer: (
          <div>
            <p style={{ marginBottom: '10px' }}>
              Absolute return is the total gain or loss as a percentage of the amount invested, with no adjustment for time. If you invested ₹1 lakh and it grew to ₹1.3 lakh, your absolute return is 30% — whether it took 6 months or 6 years.
            </p>
            <p style={{ marginBottom: '10px' }}>
              XIRR annualises that return to account for time:
            </p>
            <ul style={{ paddingLeft: '20px', lineHeight: 2, marginBottom: '10px' }}>
              <li>30% gain in <strong style={{ color: '#e2e8f0' }}>6 months</strong> → XIRR ≈ <span style={{ fontFamily: 'var(--font-mono)', color: GOLD }}>69% per year</span></li>
              <li>30% gain in <strong style={{ color: '#e2e8f0' }}>6 years</strong> → XIRR ≈ <span style={{ fontFamily: 'var(--font-mono)', color: GOLD }}>4.5% per year</span></li>
            </ul>
            <p>XIRR is the correct metric for comparing investments over different time periods or benchmarking against Nifty 50 or fixed deposit rates.</p>
          </div>
        ),
      },
    ],
  },
];
