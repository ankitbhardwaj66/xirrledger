'use client';

export default function Contact() {
  return (
    <div className="py-16">
      <div className="container-custom">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6">Get in Touch</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Have questions, feedback, or need help? We're here for you!
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {/* Email Card */}
          <a
            href="mailto:contact@xirrledger.com"
            className="bg-white border-2 border-gray-200 rounded-2xl p-8 transition group shadow-lg hover:shadow-xl"
            style={{ borderColor: '#e5e7eb' }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1f77b4'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 transition"
              style={{ backgroundColor: 'rgba(31, 119, 180, 0.1)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1f77b4'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(31, 119, 180, 0.1)'}
            >
              <svg className="w-8 h-8 transition" fill="currentColor" viewBox="0 0 24 24"
                style={{ color: '#1f77b4' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#1f77b4'}
              >
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3">Email Us</h3>
            <p className="text-gray-600 mb-4">
              For general inquiries, support, or feedback. We typically respond within 24 hours.
            </p>
            <p className="font-semibold" style={{ color: '#1f77b4' }}>
              contact@xirrledger.com →
            </p>
          </a>

          {/* WhatsApp Card */}
          <a
            href="https://wa.me/1234567890"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border-2 border-gray-200 hover:border-green-500 rounded-2xl p-8 transition group shadow-lg hover:shadow-xl"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-green-500 transition">
              <svg className="w-8 h-8 text-green-600 group-hover:text-white transition" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3">WhatsApp</h3>
            <p className="text-gray-600 mb-4">
              Need quick help or have urgent questions? Chat with us directly on WhatsApp.
            </p>
            <p className="text-green-600 font-semibold group-hover:underline">
              Chat with us →
            </p>
          </a>
        </div>

        {/* FAQ Link */}
        <div className="bg-gray-50 rounded-2xl p-8 max-w-4xl mx-auto text-center mb-16">
          <h3 className="text-2xl font-bold mb-4">Looking for Quick Answers?</h3>
          <p className="text-gray-600 mb-6">
            Check out our FAQ section - you might find your answer there!
          </p>
          <a
            href="/faq"
            className="inline-block px-8 py-3 rounded-lg font-semibold transition"
            style={{ backgroundColor: '#1f77b4', color: '#ffffff' }}
          >
            View FAQ
          </a>
        </div>

        {/* What to Contact About */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">What Can We Help You With?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="mb-3">
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#1f77b4' }}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </div>
              <h3 className="font-bold text-lg mb-2">Technical Support</h3>
              <p className="text-gray-600 text-sm">
                Having trouble uploading files or calculating XIRR? We'll help you troubleshoot.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="mb-3">
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#1f77b4' }}>
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                </svg>
              </div>
              <h3 className="font-bold text-lg mb-2">Feedback</h3>
              <p className="text-gray-600 text-sm">
                Have suggestions for new features or improvements? We'd love to hear from you.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="mb-3">
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#1f77b4' }}>
                  <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
              </div>
              <h3 className="font-bold text-lg mb-2">Business Inquiries</h3>
              <p className="text-gray-600 text-sm">
                Interested in partnerships, licensing, or custom solutions? Let's talk.
              </p>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-6">
            We're committed to making XIRR Ledger the best tool for portfolio analysis.
            <br />
            Your feedback helps us improve!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:contact@xirrledger.com"
              className="inline-block px-8 py-3 rounded-lg font-semibold transition"
              style={{ backgroundColor: '#1f77b4', color: '#ffffff' }}
            >
              Email Us
            </a>
            <a
              href="https://wa.me/1234567890"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 rounded-lg font-semibold transition"
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
