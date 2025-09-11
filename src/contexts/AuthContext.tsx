'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface User {
    id: string
    email: string
    name: string
    isAdmin: boolean
    mustChangePassword: boolean
    condominiums: {
        id: string
        name: string
        accessLevel: string
    }[]
}

interface AuthContextType {
    user: User | null
    isLoading: boolean
    login: (email: string, password: string) => Promise<boolean>
    logout: () => Promise<void>
    selectedCondominium: string | null
    setSelectedCondominium: (id: string) => void
    availableCondominiums: { id: string; name: string }[]
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [selectedCondominium, setSelectedCondominium] = useState<string | null>(null)

    // Verificar se há uma sessão ativa ao carregar
    useEffect(() => {
        checkAuth()
    }, [])

    const checkAuth = async () => {
        try {
            const response = await fetch('/api/auth/me')
            if (response.ok) {
                const data = await response.json()
                if (data.success && data.user) {
                    setUser(data.user)
                    // Se o usuário tem apenas um condomínio, selecionar automaticamente
                    if (data.user.condominiums.length === 1) {
                        setSelectedCondominium(data.user.condominiums[0].id)
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ login: email, password }),
            })

            const data = await response.json()

            if (data.success) {
                setUser(data.user)
                // Se o usuário tem apenas um condomínio, selecionar automaticamente
                if (data.user.condominiums.length === 1) {
                    setSelectedCondominium(data.user.condominiums[0].id)
                }
                return true
            }
            return false
        } catch (error) {
            console.error('Erro no login:', error)
            return false
        }
    }

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' })
        } catch (error) {
            console.error('Erro no logout:', error)
        } finally {
            setUser(null)
            setSelectedCondominium(null)
        }
    }

    const availableCondominiums = user?.isAdmin 
        ? [] // Admin global verá todos os condomínios (será buscado da API)
        : user?.condominiums.map(c => ({ id: c.id, name: c.name })) || []

    const value = {
        user,
        isLoading,
        login,
        logout,
        selectedCondominium,
        setSelectedCondominium,
        availableCondominiums
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider')
    }
    return context
}
