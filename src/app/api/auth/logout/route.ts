import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('auth-token')?.value

        if (token) {
            // Invalidar a sessão no banco
            await prisma.session.updateMany({
                where: { token },
                data: { isActive: false }
            })
        }

        // Remover cookie
        const response = NextResponse.json({
            success: true,
            message: 'Logout realizado com sucesso'
        })

        response.cookies.delete('auth-token')

        return response

    } catch (error) {
        console.error('Erro no logout:', error)
        return NextResponse.json(
            { success: false, message: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}
