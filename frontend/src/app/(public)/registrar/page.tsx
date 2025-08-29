'use client';
import { UserPlus, BookOpen, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import Image from "next/image";
import { useState } from 'react';
import Footer from '@/app/components/Footer';

export default function Registrar() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white font-serif">
      {/* Header */}
      <header className="bg-white border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <Image src="/favicon.png" alt="Logo Vlib" width={27} height={27}/>
              <span className="text-2xl font-serif font-bold text-blue-900">Vlib</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Register Form */}
      <main className="max-w-md mx-auto px-4 py-12 sm:py-20">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <UserPlus className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-blue-900 font-serif">Registrar</h1>
            <p className="text-gray-600 mt-2 font-serif">Crie sua conta na Vlib</p>
          </div>

          <form className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2 font-serif">
                Nome completo
              </label>
              <input
                id="name"
                type="text"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-serif"
                placeholder="Seu nome completo"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 font-serif">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-serif"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2 font-serif">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-serif"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2 font-serif">
                Confirmar senha
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-serif"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <label htmlFor="terms" className="ml-2 text-sm text-gray-600 font-serif">
                Aceito os{' '}
                <Link href="#" className="text-blue-600 hover:text-blue-800">
                  termos de uso
                </Link>{' '}
                e{' '}
                <Link href="#" className="text-blue-600 hover:text-blue-800">
                  política de privacidade
                </Link>
              </label>
            </div>

            <button
              type="submit"
              className="cursor-pointer w-full flex justify-center items-center space-x-2 py-3 px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-serif"
            >
              <UserPlus className="h-5 w-5" />
              <span>Criar conta</span>
            </button>
          </form>

          <div className="text-center mt-6">
            <Link 
              href="/login"
              className="text-blue-600 hover:text-blue-900 transition-colors font-serif text-sm"
            >
              Já tem conta? Faça login
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
