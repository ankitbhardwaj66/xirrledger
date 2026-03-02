import type { Metadata } from 'next';
import Link from 'next/link';
import { FaEnvelope, FaWhatsapp, FaQuestionCircle, FaCommentDots, FaClipboardList } from 'react-icons/fa';

export const metadata: Metadata = {
  title: 'Contact Us — XIRR Ledger',
  description: 'Have questions or feedback about XIRR Ledger? Reach out via email or WhatsApp. We typically respond within 24 hours.',
  openGraph: {
    title: 'Contact Us — XIRR Ledger',
    description: 'Have questions or feedback about XIRR Ledger? Reach out via email or WhatsApp.',
    type: 'website',
    url: 'https://xirrledger.com/contact/',
  },
  alternates: {
    canonical: 'https://xirrledger.com/contact/',
  },
};

const GOLD = '#f59e0b';
const NAVY = '#0f172a';

const glass = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: '16px',
} as const;

export default function Contact() {
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
            ✦ We&apos;re Here to Help
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, color: '#ffffff', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Get in Touch
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
            Have questions, feedback, or need help? We&apos;re here for you.
          </p>
        </div>

        {/* ── Contact Cards ── */}
        <div className="grid md:grid-cols-2 gap-6" style={{ maxWidth: '760px', margin: '0 auto 3rem' }}>

          {/* Email */}
          <a href="mailto:contact@xirrledger.com" style={{ textDecoration: 'none' }}>
            <div style={{
              ...glass,
              padding: '32px',
              borderColor: 'rgba(245,158,11,0.15)',
              transition: 'border-color 0.2s',
              cursor: 'pointer',
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '14px',
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
              }}>
                <FaEnvelope size={24} color={GOLD} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '10px' }}>Email Us</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '16px' }}>
                For general inquiries, support, or feedback. We typically respond within 24 hours.
              </p>
              <p style={{ color: GOLD, fontWeight: 600, fontSize: '0.9rem' }}>
                contact@xirrledger.com →
              </p>
            </div>
          </a>

          {/* WhatsApp */}
          <a href="https://wa.me/916239618150" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <div style={{
              ...glass,
              padding: '32px',
              borderColor: 'rgba(34,197,94,0.15)',
              transition: 'border-color 0.2s',
              cursor: 'pointer',
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '14px',
                background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
              }}>
                <FaWhatsapp size={26} color='#4ade80' />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '10px' }}>WhatsApp</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '16px' }}>
                Need quick help or have urgent questions? Chat with us directly on WhatsApp.
              </p>
              <p style={{ color: '#4ade80', fontWeight: 600, fontSize: '0.9rem' }}>
                Chat with us →
              </p>
            </div>
          </a>
        </div>

        {/* ── FAQ nudge ── */}
        <div style={{
          ...glass,
          maxWidth: '760px', margin: '0 auto 4rem',
          padding: '28px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
          borderColor: 'rgba(245,158,11,0.12)',
        }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>Looking for Quick Answers?</h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>Check our FAQ — you might find your answer there.</p>
          </div>
          <Link href="/faq" style={{
            background: GOLD, color: '#0a1020',
            padding: '10px 22px', borderRadius: '8px',
            fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}>
            View FAQ
          </Link>
        </div>

        {/* ── What we help with ── */}
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff', textAlign: 'center', marginBottom: '1.5rem', letterSpacing: '-0.01em' }}>
            What Can We Help You With?
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: <FaQuestionCircle size={22} color={GOLD} />,
                title: 'Technical Support',
                desc: 'Having trouble uploading files or calculating XIRR? We\'ll help you troubleshoot.',
              },
              {
                icon: <FaCommentDots size={22} color={GOLD} />,
                title: 'Feedback',
                desc: 'Have suggestions for new features or improvements? We\'d love to hear from you.',
              },
              {
                icon: <FaClipboardList size={22} color={GOLD} />,
                title: 'Business Inquiries',
                desc: 'Interested in partnerships, licensing, or custom solutions? Let\'s talk.',
              },
            ].map((item, i) => (
              <div key={i} style={{ ...glass, padding: '22px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '10px',
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px',
                }}>
                  {item.icon}
                </div>
                <h3 style={{ fontSize: '0.97rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>{item.title}</h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: 1.65, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Final CTA ── */}
        <div style={{ textAlign: 'center', marginTop: '4rem' }}>
          <p style={{ color: '#475569', marginBottom: '24px', fontSize: '0.95rem', lineHeight: 1.7 }}>
            We&apos;re committed to making XIRR Ledger the best tool for portfolio analysis.<br />
            Your feedback helps us improve!
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
