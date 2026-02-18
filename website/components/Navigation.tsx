'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container-custom">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 text-primary hover:text-primary-dark transition">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
            </svg>
            <span className="font-bold text-xl">XIRR Ledger</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-primary transition font-medium">
              Home
            </Link>
            <Link href="/features" className="text-gray-700 hover:text-primary transition font-medium">
              Features
            </Link>
            <Link href="/how-it-works" className="text-gray-700 hover:text-primary transition font-medium">
              How It Works
            </Link>
            <Link href="/blog" className="text-gray-700 hover:text-primary transition font-medium">
              Blog
            </Link>
            <Link href="/faq" className="text-gray-700 hover:text-primary transition font-medium">
              FAQ
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-primary transition font-medium">
              Contact
            </Link>
            <a
              href="/calculator"
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition font-semibold"
            >
              Launch Calculator
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-gray-700 hover:text-primary focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4">
            <Link href="/" className="block py-2 text-gray-700 hover:text-primary transition">
              Home
            </Link>
            <Link href="/features" className="block py-2 text-gray-700 hover:text-primary transition">
              Features
            </Link>
            <Link href="/how-it-works" className="block py-2 text-gray-700 hover:text-primary transition">
              How It Works
            </Link>
            <Link href="/blog" className="block py-2 text-gray-700 hover:text-primary transition">
              Blog
            </Link>
            <Link href="/faq" className="block py-2 text-gray-700 hover:text-primary transition">
              FAQ
            </Link>
            <Link href="/contact" className="block py-2 text-gray-700 hover:text-primary transition">
              Contact
            </Link>
            <a
              href="/calculator"
              className="block mt-2 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition text-center font-semibold"
            >
              Launch Calculator
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}
