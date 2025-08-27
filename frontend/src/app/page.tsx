'use client';
import { Search} from 'lucide-react';
import Header from './components/Header';
import Footer from './components/Footer';

export default function Home() {


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white font-serif">
      <Header />
      {/* Hero Section */}
      <main className="max-w-7xl min-h-[85vh] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
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
            <form action="/buscar" method="GET" className="relative flex flex-col sm:flex-row gap-2 sm:gap-0">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="q"                         
                  placeholder="Buscar artigos, autores, palavras-chave..."
                  className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 text-base sm:text-lg border border-gray-300 rounded-xl sm:rounded-r-none focus:ring-2 outline-none focus:ring-blue-500 focus:border-transparent shadow-lg font-serif"
                  required
                />
              </div>
              <button
                type="submit"
                className="cursor-pointer px-4 sm:px-6 py-3 sm:py-4 bg-blue-600 text-white rounded-xl sm:rounded-l-none hover:bg-blue-700 transition-colors font-serif text-base sm:text-lg"
              >
                Buscar
              </button>
            </form>
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
      {/*Footer */}
      <Footer/>
    </div>
  );
}