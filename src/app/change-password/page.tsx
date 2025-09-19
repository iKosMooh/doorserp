'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function ChangePasswordPage() {
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')
        setSuccess('')

        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem')
            setIsLoading(false)
            return
        }

        if (newPassword.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres')
            setIsLoading(false)
            return
        }

        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                }),
            })

            const data = await response.json()

            if (data.success) {
                setSuccess('Senha alterada com sucesso! Redirecionando...')
                setTimeout(() => {
                    router.push('/dashboard')
                }, 2000)
            } else {
                setError(data.message || 'Erro ao alterar senha')
            }
        } catch {
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
                        Alterar Senha
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        É necessário alterar sua senha para continuar
                    </p>
                </div>
                
                <Card className="p-8">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}
                        
                        {success && (
                            <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded">
                                {success}
                            </div>
                        )}
                        
                        <div>
                            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                                Senha Atual
                            </label>
                            <input
                                id="currentPassword"
                                name="currentPassword"
                                type="password"
                                required
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Digite sua senha atual"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                                Nova Senha
                            </label>
                            <input
                                id="newPassword"
                                name="newPassword"
                                type="password"
                                required
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Digite sua nova senha"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                Confirmar Nova Senha
                            </label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Confirme sua nova senha"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        <div>
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                {isLoading ? 'Alterando...' : 'Alterar Senha'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    )
}
