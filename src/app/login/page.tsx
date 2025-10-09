'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
    const { user, isLoading: authLoading, login } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    // Verificar se o usuário já está logado
    useEffect(() => {
        if (!authLoading && user) {
            // Se o usuário já está logado, redirecionar para o dashboard
            console.log('Usuário já está logado, redirecionando para dashboard')
            router.push('/dashboard')
        }
    }, [user, authLoading, router])

    // Mostrar loading enquanto verifica a autenticação
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="text-lg text-gray-600">Verificando autenticação...</div>
                </div>
            </div>
        )
    }

    // Se o usuário já está logado, não mostrar a página de login
    if (user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="text-lg text-gray-600">Redirecionando...</div>
                </div>
            </div>
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const success = await login(email, password)
            
            if (success) {
                console.log('Login realizado com sucesso, redirecionando...')
                // Aguardar um pouco para garantir que o contexto foi atualizado
                setTimeout(() => {
                    router.push('/dashboard')
                }, 100)
            } else {
                setError('Email ou senha incorretos')
            }
        } catch (error) {
            console.error('Erro no login:', error)
            setError('Erro de conexão. Tente novamente.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Sistema de Portaria
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Entre com suas credenciais
                    </p>
                </div>
                
                <Card className="p-8">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}
                        
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Digite seu email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Senha
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Digite sua senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div>
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                {isLoading ? 'Entrando...' : 'Entrar'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    )
}
