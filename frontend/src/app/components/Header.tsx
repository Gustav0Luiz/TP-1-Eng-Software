'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User, LogIn, Menu, X } from 'lucide-react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-blue-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex cursor-pointer items-center space-x-2">
            <Image src="/favicon.png" alt="Logo Vlib" width={27} height={27} />
            <span className="text-2xl font-serif font-bold text-blue-900">Vlib</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/registrar"
              className="flex items-center space-x-2 px-4 py-2 text-blue-700 hover:text-blue-900 transition-colors font-serif"
            >
              <User className="h-4 w-4" />
              <span>Registrar</span>
            </Link>
            <Link
              href="/login"
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-serif"
            >
              <LogIn className="h-4 w-4" />
              <span>Login</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-blue-600 hover:text-blue-900 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-blue-100 py-4">
            <div className="flex flex-col space-y-3">
              <Link
                href="/registrar"
                className="flex items-center space-x-2 px-4 py-2 text-blue-700 hover:text-blue-900 transition-colors font-serif"
              >
                <User className="h-4 w-4" />
                <span>Registrar</span>
              </Link>
              <Link
                href="/login"
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-serif"
              >
                <LogIn className="h-4 w-4" />
                <span>Login</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
