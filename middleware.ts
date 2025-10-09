import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key'

// Rotas que requerem autenticação
const protectedRoutes = [
  '/dashboard',
  '/home',
  '/resident-dashboard',
  '/residents',
  '/residents-management',
  '/employees',
  '/guests',
  '/units',
  '/financial',
  '/access-logs',
  '/settings',
  '/condominium-recognition',
  '/arduino-control',
  '/arduino-deploy',
  '/arduino-register',
  '/serial-monitor',
  '/face-recognition',
  '/recognized',
  '/change-password'
]

// Rotas de autenticação (usuário logado não deve acessar)
const authRoutes = ['/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('auth-token')?.value

  console.log(`Middleware: ${pathname}, Token: ${token ? 'presente' : 'ausente'}`)

  // Verificar se é rota protegida
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )

  // Verificar se é rota de autenticação
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  )

  console.log(`Rota protegida: ${isProtectedRoute}, Rota de auth: ${isAuthRoute}`)

  // Se não tem token e está tentando acessar rota protegida
  if (isProtectedRoute && !token) {
    console.log('Redirecionando para login - sem token em rota protegida')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Se tem token, verificar se é válido
  if (token) {
    try {
      jwt.verify(token, JWT_SECRET)
      console.log('Token válido')
      
      // Se está logado e tenta acessar rota de auth, redirecionar para dashboard
      if (isAuthRoute) {
        console.log('Redirecionando para dashboard - usuário logado tentando acessar login')
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } catch (error) {
      console.log('Token inválido:', error)
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
