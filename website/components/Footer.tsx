import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <h3 className="font-bold text-xl flex items-center space-x-2">
              <svg className="w-6 h-6 text-primary-light" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
              </svg>
              <span>XIRR Ledger</span>
            </h3>
            <p className="text-gray-400 text-sm">
              The only ledger-based XIRR calculator for accurate portfolio returns. Built by investors, for investors.
            </p>
            <div className="flex space-x-4">
              <a
                href="mailto:contact@xirrledger.com"
                className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-primary transition"
                title="Email"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </a>
              <a
                href="https://wa.me/1234567890"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-green-500 transition"
                title="WhatsApp"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link href="/" className="text-gray-400 hover:text-white transition">Home</Link></li>
              <li><Link href="/features" className="text-gray-400 hover:text-white transition">Features</Link></li>
              <li><Link href="/how-it-works" className="text-gray-400 hover:text-white transition">How It Works</Link></li>
              <li><Link href="/faq" className="text-gray-400 hover:text-white transition">FAQ</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-white transition">Contact</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://xirrcalculatorr.streamlit.app/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">
                  Launch App
                </a>
              </li>
              <li><Link href="/faq#what-is-xirr" className="text-gray-400 hover:text-white transition">What is XIRR?</Link></li>
              <li><Link href="/how-it-works#zerodha" className="text-gray-400 hover:text-white transition">Zerodha Guide</Link></li>
              <li><Link href="/how-it-works#groww" className="text-gray-400 hover:text-white transition">Groww Guide</Link></li>
            </ul>
          </div>

          {/* Coming Soon */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Coming Soon</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>• Angel One Support</li>
              <li>• Upstox Integration</li>
              <li>• Sensex Comparison</li>
              <li>• Sector Analysis</li>
              <li>• Risk Metrics</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-800 text-center space-y-2">
          <p className="text-gray-400 text-sm">
            © {currentYear} XIRR Ledger by <a href="https://ankitbhardwaj.in" target="_blank" rel="noopener noreferrer" className="text-primary-light hover:text-primary transition">Ankit Bhardwaj</a>. All rights reserved.
          </p>
          <p className="text-gray-500 text-xs">
            Disclaimer: This tool is for informational purposes only. Always verify calculations independently and consult with a financial advisor for investment decisions.
          </p>
        </div>
      </div>
    </footer>
  );
}
