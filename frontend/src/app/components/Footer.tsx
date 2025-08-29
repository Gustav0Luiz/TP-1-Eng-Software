// src/components/Footer.tsx
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-blue-100 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo / Marca */}
          <Link href="/" className="flex cursor-pointer items-center space-x-2">
            <Image src="/favicon.png" alt="Logo Vlib" width={20} height={20} />
            <span className="text-md font-serif font-bold text-blue-900">Vlib</span>
          </Link>

          {/* Links */}
          <nav className="flex space-x-6 text-gray-600 font-serif text-sm">
            <Link href="/" className="hover:text-blue-700 transition-colors">
              Sobre
            </Link>
            <Link href="/" className="hover:text-blue-700 transition-colors">
              Contato
            </Link>
            <Link href="/" className="hover:text-blue-700 transition-colors">
              Política de Privacidade
            </Link>
          </nav>

          {/* Direitos autorais */}
          <p className="text-gray-500 text-sm font-serif">
            © {new Date().getFullYear()} Vlib. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
