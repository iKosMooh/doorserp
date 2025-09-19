import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key'

export async function POST(request: NextRequest) {
    try {
        const { currentPassword, newPassword } = await request.json()
        const token = request.cookies.get('auth-token')?.value

        if (!token) {
            return NextResponse.json(
                { success: false, message: 'Token não encontrado' },
                { status: 401 }
            )
        }

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { success: false, message: 'Senhas são obrigatórias' },
                { status: 400 }
            )
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { success: false, message: 'Nova senha deve ter pelo menos 6 caracteres' },
                { status: 400 }
            )
        }

        // Verificar token
        let decoded: { userId: string }
        try {
            decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
        } catch (error) {
            console.error('Erro ao verificar token:', error)
            return NextResponse.json(
                { success: false, message: 'Token inválido' },
                { status: 401 }
            )
        }

        // Buscar usuário
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        })

        if (!user) {
            return NextResponse.json(
                { success: false, message: 'Usuário não encontrado' },
                { status: 404 }
            )
        }

        // Verificar senha atual
        const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password)

        if (!isValidCurrentPassword) {
            return NextResponse.json(
                { success: false, message: 'Senha atual incorreta' },
                { status: 400 }
            )
        }

        // Hash da nova senha
        const hashedNewPassword = await bcrypt.hash(newPassword, 12)

        // Atualizar senha no banco
        await prisma.user.update({
            where: { id: user.id },
            data: { 
                password: hashedNewPassword,
                mustChangePassword: false
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Senha alterada com sucesso'
        })

    } catch (error) {
        console.error('Erro ao alterar senha:', error)
        return NextResponse.json(
            { success: false, message: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}
