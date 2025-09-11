import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key'

// Rotas que requerem autenticação
const protectedRoutes = [
  '/dashboard',
  '/residents',
  '/employees',
  '/guests',
  '/units',
  '/financial',
  '/access-logs',
  '/settings',
  '/condominium-recognition',
  '/arduino-control',
  '/face-recognition'
]

// Rotas de autenticação (usuário logado não deve acessar)
const authRoutes = ['/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('auth-token')?.value

  // Verificar se é rota protegida
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )

  // Verificar se é rota de autenticação
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  )

  // Se não tem token e está tentando acessar rota protegida
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Se tem token, verificar se é válido
  if (token) {
    try {
      jwt.verify(token, JWT_SECRET)
      
      // Se está logado e tenta acessar rota de auth, redirecionar para dashboard
      if (isAuthRoute) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } catch (error) {
      // Token inválido, remover e redirecionar para login se necessário
      const response = isProtectedRoute 
        ? NextResponse.redirect(new URL('/login', request.url))
        : NextResponse.next()
      
      response.cookies.delete('auth-token')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
