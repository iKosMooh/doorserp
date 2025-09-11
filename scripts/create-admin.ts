import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdminUser() {
    try {
        // Verificar se já existe um admin global
        const existingAdmin = await prisma.user.findFirst({
            where: { 
                email: 'admin@doorserp.com'
            }
        })

        if (existingAdmin) {
            console.log('✅ Usuário admin já existe!')
            console.log('Email: admin@doorserp.com')
            return
        }

        // Criar senha hash
        const password = 'admin123'
        const hashedPassword = await bcrypt.hash(password, 12)

        // Criar usuário admin global
        const adminUser = await prisma.user.create({
            data: {
                email: 'admin@doorserp.com',
                password: hashedPassword,
                name: 'Administrador Global',
                isActive: true,
                isAdmin: true,
                isSuperAdmin: true,
                mustChangePassword: true
            }
        })

        console.log('✅ Usuário administrador criado com sucesso!')
        console.log('Email: admin@doorserp.com')
        console.log('Senha: admin123')
        console.log('⚠️ IMPORTANTE: Altere a senha no primeiro login!')
        
    } catch (error) {
        console.error('❌ Erro ao criar usuário admin:', error)
    } finally {
        await prisma.$disconnect()
    }
}

createAdminUser()
