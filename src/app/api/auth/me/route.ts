import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key'

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('auth-token')?.value

        if (!token) {
            return NextResponse.json(
                { success: false, message: 'Token não encontrado' },
                { status: 401 }
            )
        }

        // Verificar token
        let decoded: any
        try {
            decoded = jwt.verify(token, JWT_SECRET)
        } catch (error) {
            return NextResponse.json(
                { success: false, message: 'Token inválido' },
                { status: 401 }
            )
        }

        // Buscar usuário atualizado
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: {
                condominiumAccess: {
                    include: {
                        condominium: true
                    }
                }
            }
        })

        if (!user || !user.isActive) {
            return NextResponse.json(
                { success: false, message: 'Usuário não encontrado ou inativo' },
                { status: 401 }
            )
        }

        // Preparar dados do usuário
        const userData = {
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: (user as any).isAdmin || false,
            mustChangePassword: (user as any).mustChangePassword || false,
            condominiums: user.condominiumAccess.map(access => ({
                id: access.condominium.id,
                name: access.condominium.name,
                accessLevel: access.accessLevel
            }))
        }

        return NextResponse.json({
            success: true,
            user: userData
        })

    } catch (error) {
        console.error('Erro ao verificar autenticação:', error)
        return NextResponse.json(
            { success: false, message: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}
