'use client';
import { Search, BookOpen, User, LogIn, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white font-serif">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex cursor-pointer items-center space-x-2">
              <Link href="/" className='flex cursor-pointer items-center space-x-2'>
                <BookOpen className="h-8 w-8 text-blue-600" />
                <span className="text-2xl font-serif font-bold text-blue-900">Vlib</span>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/registrar" className="flex cursor-pointer items-center space-x-2 px-4 py-2 text-blue-700 hover:text-blue-900 transition-colors font-serif">
                <User className="h-4 w-4" />
                <span>Registrar</span>
              </Link>
              <Link href="/login" className="flex cursor-pointer items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-serif">
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
                <Link href="/registrar" className="flex items-center space-x-2 px-4 py-2 text-blue-700 hover:text-blue-900 transition-colors font-serif">
                  <User className="h-4 w-4" />
                  <span>Registrar</span>
                </Link>
                <Link href="/login" className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-serif">
                  <LogIn className="h-4 w-4" />
                  <span>Login</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-blue-900 mb-6">
            Biblioteca Virtual de
            <span className="block text-blue-600">Artigos Científicos</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-600 mb-8 sm:mb-12 max-w-3xl mx-auto font-serif">
            Descubra, explore e acesse milhares de artigos científicos de alta qualidade. 
            Sua pesquisa acadêmica começa aqui.
          </p>

          {/* Search Bar */}
          <div className="max-w-4xl mx-auto px-2 sm:px-0">
            <div className="relative flex flex-col sm:flex-row gap-2 sm:gap-0">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar artigos, autores, palavras-chave..."
                  className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 text-base sm:text-lg border border-gray-300 rounded-xl sm:rounded-r-none focus:ring-2 outline-none focus:ring-blue-500 focus:border-transparent shadow-lg font-serif"
                />
              </div>
              <button className="cursor-pointer px-4 sm:px-6 py-3 sm:py-4 bg-blue-600 text-white rounded-xl sm:rounded-l-none hover:bg-blue-700 transition-colors font-serif text-base sm:text-lg">
                Buscar
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 font-serif">10K+</div>
              <div className="text-gray-600 font-serif">Artigos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 font-serif">500+</div>
              <div className="text-gray-600 font-serif">Autores</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 font-serif">50+</div>
              <div className="text-gray-600 font-serif">Áreas</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}