import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Rotas públicas que não precisam de autenticação
  const publicPaths = ['/login', '/registrar', '/'];
  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname === path || 
    request.nextUrl.pathname.startsWith(`${path}/`)
  );

  // Se for uma rota pública, permite o acesso
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Para rotas que começam com /user/ (mas não são API routes)
  if (request.nextUrl.pathname.startsWith('/user/') && 
      !request.nextUrl.pathname.startsWith('/api/')) {
    
    // Verifica se há token nos cookies
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      // Redireciona para login se não estiver autenticado
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
