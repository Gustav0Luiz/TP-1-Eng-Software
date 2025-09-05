'use client';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, User } from 'lucide-react';

interface Author {
  id: number;
  name: string;
}

interface Article {
  id: number;
  title: string;
  abstract: string;
  authors: Author[];
  created_at: string;
}

interface ArticleCarouselProps {
  articles: Article[];
}

export default function ArticleCarousel({ articles }: ArticleCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || articles.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === articles.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying, articles.length]);

  const goToPrevious = () => {
    setCurrentIndex(currentIndex === 0 ? articles.length - 1 : currentIndex - 1);
    setIsAutoPlaying(false);
  };

  const goToNext = () => {
    setCurrentIndex(currentIndex === articles.length - 1 ? 0 : currentIndex + 1);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (articles.length === 0) return null;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-blue-900 mb-2 font-serif">
          Artigos em Destaque
        </h2>
        <p className="text-gray-600 font-serif">
          Descubra os artigos mais recentes da nossa biblioteca
        </p>
      </div>

      <div 
        className="relative bg-white rounded-2xl shadow-xl overflow-hidden"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        {/* Main carousel container */}
        <div className="relative h-96 md:h-80">
          <div 
            className="flex transition-transform duration-500 ease-in-out h-full"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {articles.map((article, index) => (
              <div key={article.id} className="w-full flex-shrink-0 p-8 flex flex-col md:flex-row">
                {/* Content */}
                <div className="flex-1 pr-0 md:pr-8">
                  <h3 className="text-2xl font-bold text-blue-900 mb-4 font-serif leading-tight">
                    {article.title}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span className="font-serif">
                        {article.authors.map(author => author.name).join(', ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span className="font-serif">
                        {formatDate(article.created_at)}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-700 leading-relaxed font-serif text-justify">
                    {truncateText(article.abstract, 300)}
                  </p>

                  <button className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-serif">
                    Ler Artigo
                  </button>
                </div>

                {/* Decorative element */}
                <div className="hidden md:flex items-center justify-center w-32">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {index + 1}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation arrows */}
        {articles.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110"
              aria-label="Artigo anterior"
            >
              <ChevronLeft className="h-6 w-6 text-blue-600" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110"
              aria-label="Próximo artigo"
            >
              <ChevronRight className="h-6 w-6 text-blue-600" />
            </button>
          </>
        )}

        {/* Dots indicator */}
        {articles.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {articles.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentIndex
                    ? 'bg-blue-600 scale-125'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Ir para artigo ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Auto-play indicator */}
        {articles.length > 1 && isAutoPlaying && (
          <div className="absolute top-4 right-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>

      {/* Article counter */}
      <div className="text-center mt-4 text-sm text-gray-500 font-serif">
        {currentIndex + 1} de {articles.length} artigos
      </div>
    </div>
  );
}
