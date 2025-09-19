import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import type { User, UserCondominiumAccess, Condominium } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key'

type UserWithAccess = User & {
    isAdmin?: boolean
    mustChangePassword?: boolean
    condominiumAccess: (UserCondominiumAccess & {
        condominium: Condominium
    })[]
}

export async function POST(request: NextRequest) {
    try {
        const { login, password } = await request.json()

        if (!login || !password) {
            return NextResponse.json(
                { success: false, message: 'Login e senha são obrigatórios' },
                { status: 400 }
            )
        }

        // Buscar usuário por email
        const user = await prisma.user.findFirst({
            where: {
                email: login
            },
            include: {
                condominiumAccess: {
                    include: {
                        condominium: true
                    }
                }
            }
        }) as UserWithAccess | null

        if (!user) {
            return NextResponse.json(
                { success: false, message: 'Usuário não encontrado' },
                { status: 401 }
            )
        }

        // Verificar senha
        const isValidPassword = await bcrypt.compare(password, user.password)

        if (!isValidPassword) {
            return NextResponse.json(
                { success: false, message: 'Senha incorreta' },
                { status: 401 }
            )
        }

        // Verificar se o usuário está ativo
        if (!user.isActive) {
            return NextResponse.json(
                { success: false, message: 'Usuário inativo' },
                { status: 401 }
            )
        }

        // Criar token JWT
        const token = jwt.sign(
            { 
                userId: user.id,
                email: user.email,
                isAdmin: user.isAdmin || false
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        )

        // Criar sessão no banco
        await prisma.session.create({
            data: {
                userId: user.id,
                token,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
            }
        })

        // Atualizar último login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        })

        // Preparar dados do usuário para retorno
        const userData = {
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin || false,
            mustChangePassword: user.mustChangePassword || false,
            condominiums: user.condominiumAccess.map(access => ({
                id: access.condominium.id,
                name: access.condominium.name,
                accessLevel: access.accessLevel
            }))
        }

        // Configurar cookie com o token
        const response = NextResponse.json({
            success: true,
            message: 'Login realizado com sucesso',
            user: userData
        })

        response.cookies.set('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 // 24 horas
        })

        return response

    } catch (error) {
        console.error('Erro no login:', error)
        return NextResponse.json(
            { success: false, message: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}
