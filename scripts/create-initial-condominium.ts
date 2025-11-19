import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🏢 Iniciando criação de condomínio inicial...\n')

  try {
    // 1. Criar Condomínio
    console.log('📋 Criando condomínio...')
    const condominium = await prisma.condominium.upsert({
      where: { cnpj: '12.345.678/0001-90' },
      update: {},
      create: {
        name: 'Residencial Exemplo',
        address: 'Rua das Flores, 123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        phone: '(11) 3456-7890',
        email: 'contato@residencialexemplo.com.br',
        cnpj: '12.345.678/0001-90',
        isActive: true
      }
    })
    console.log(`✅ Condomínio criado: ${condominium.name} (ID: ${condominium.id})\n`)

    // 2. Criar Usuário Administrador
    console.log('👤 Criando usuário administrador...')
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@doorserp.com' },
      update: {},
      create: {
        email: 'admin@doorserp.com',
        name: 'Administrador Sistema',
        password: hashedPassword,
        isAdmin: true,
        isActive: true,
        phone: '(11) 99999-9999'
      }
    })
    console.log(`✅ Admin criado: ${adminUser.name} (Email: ${adminUser.email})\n`)

    // 3. Criar Unidades
    console.log('🏠 Criando unidades...')
    const units = []
    const blocks = ['A', 'B', 'C']
    
    for (const block of blocks) {
      for (let floor = 1; floor <= 10; floor++) {
        for (let apt = 1; apt <= 4; apt++) {
          const number = `${floor}0${apt}`
          
          const unit = await prisma.unit.create({
            data: {
              condominiumId: condominium.id,
              block,
              number,
              floor,
              area: 65 + (apt * 5), // 70m², 75m², 80m², 85m²
              bedrooms: apt <= 2 ? 2 : 3,
              bathrooms: 2,
              parkingSpaces: apt === 4 ? 2 : 1,
              unitType: 'APARTMENT',
              monthlyFee: 450.00,
              isOccupied: false,
              isActive: true
            }
          })
          
          units.push(unit)
        }
      }
    }
    console.log(`✅ ${units.length} unidades criadas (3 blocos x 10 andares x 4 aptos)\n`)

    // 4. Criar Moradores de Exemplo
    console.log('👥 Criando moradores de exemplo...')
    
    // Morador 1 - Proprietário
    const morador1Password = await bcrypt.hash('morador123', 10)
    const morador1User = await prisma.user.create({
      data: {
        email: 'joao.silva@email.com',
        name: 'João Silva',
        password: morador1Password,
        isAdmin: false,
        isActive: true,
        phone: '(11) 98765-4321',
        documentType: 'CPF',
        document: '123.456.789-01',
        birthDate: new Date('1985-05-15')
      }
    })

    const resident1 = await prisma.resident.create({
      data: {
        userId: morador1User.id,
        condominiumId: condominium.id,
        unitId: units[0].id, // Bloco A, Apt 101
        relationshipType: 'OWNER',
        emergencyContact: '(11) 98888-8888',
        isActive: true
      }
    })

    // Atualizar unidade como ocupada
    await prisma.unit.update({
      where: { id: units[0].id },
      data: { isOccupied: true }
    })

    console.log(`✅ Morador criado: ${morador1User.name} - Bloco ${units[0].block}, Apt ${units[0].number}`)

    // Morador 2 - Inquilino
    const morador2Password = await bcrypt.hash('morador123', 10)
    const morador2User = await prisma.user.create({
      data: {
        email: 'maria.santos@email.com',
        name: 'Maria Santos',
        password: morador2Password,
        isAdmin: false,
        isActive: true,
        phone: '(11) 98765-1234',
        documentType: 'CPF',
        document: '987.654.321-09',
        birthDate: new Date('1990-08-22')
      }
    })

    const resident2 = await prisma.resident.create({
      data: {
        userId: morador2User.id,
        condominiumId: condominium.id,
        unitId: units[5].id, // Bloco A, Apt 201
        relationshipType: 'TENANT',
        emergencyContact: '(11) 97777-7777',
        isActive: true
      }
    })

    await prisma.unit.update({
      where: { id: units[5].id },
      data: { isOccupied: true }
    })

    console.log(`✅ Morador criado: ${morador2User.name} - Bloco ${units[5].block}, Apt ${units[5].number}\n`)

    // 5. Criar Funcionários
    console.log('👷 Criando funcionários...')
    
    const employees = [
      {
        name: 'Carlos Porteiro',
        email: 'carlos.porteiro@residencial.com',
        phone: '(11) 91234-5678',
        documentNumber: '111.222.333-44',
        position: 'Porteiro',
        department: 'Portaria',
        shift: 'MORNING',
        salary: 2500.00
      },
      {
        name: 'Ana Zeladora',
        email: 'ana.zeladora@residencial.com',
        phone: '(11) 91234-5679',
        documentNumber: '555.666.777-88',
        position: 'Zeladora',
        department: 'Limpeza',
        shift: 'FULL_TIME',
        salary: 2200.00
      },
      {
        name: 'Roberto Síndico',
        email: 'roberto.sindico@residencial.com',
        phone: '(11) 91234-5680',
        documentNumber: '999.888.777-66',
        position: 'Síndico',
        department: 'Administração',
        shift: 'FULL_TIME',
        salary: 4500.00
      }
    ]

    for (const emp of employees) {
      const employeePassword = await bcrypt.hash('func123', 10)
      
      const user = await prisma.user.create({
        data: {
          email: emp.email,
          name: emp.name,
          password: employeePassword,
          isAdmin: false,
          isActive: true,
          phone: emp.phone,
          documentType: 'CPF',
          document: emp.documentNumber
        }
      })

      await prisma.employee.create({
        data: {
          userId: user.id,
          condominiumId: condominium.id,
          employeeCode: `EMP${String(employees.indexOf(emp) + 1).padStart(3, '0')}`,
          position: emp.position,
          department: emp.department,
          salary: emp.salary,
          hireDate: new Date(),
          isActive: true
        }
      })

      console.log(`✅ Funcionário criado: ${emp.name} - ${emp.position}`)
    }
    console.log('')

    // 6. Criar Convidado de Exemplo
    console.log('🎫 Criando convidado de exemplo...')
    
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dayAfter = new Date()
    dayAfter.setDate(dayAfter.getDate() + 2)

    const guest = await prisma.guest.create({
      data: {
        name: 'Pedro Visitante',
        document: '123.456.789-00',
        phone: '(11) 98888-7777',
        condominiumId: condominium.id,
        invitedByResidentId: resident1.id,
        validFrom: new Date(),
        validUntil: dayAfter,
        accessCode: `GUEST${Date.now().toString().slice(-6)}`,
        maxEntries: 5,
        currentEntries: 0,
        notes: 'Convidado de exemplo criado automaticamente',
        isActive: true
      }
    })
    console.log(`✅ Convidado criado: ${guest.name} - Código: ${guest.accessCode}\n`)

    // 7. Criar Configuração Arduino
    console.log('🔧 Criando configuração Arduino...')
    
    const arduinoConfig = await prisma.arduinoConfiguration.create({
      data: {
        condominiumId: condominium.id,
        deviceName: 'Arduino Portaria Principal',
        deviceCode: `ARD${Date.now().toString().slice(-8)}`,
        deviceType: 'MAIN_GATE',
        connectionPort: 'COM3',
        baudRate: 9600,
        deviceLocation: 'Portaria Principal - Bloco A',
        isActive: true
      }
    })
    console.log(`✅ Arduino configurado: ${arduinoConfig.deviceName} - Porta: ${arduinoConfig.connectionPort}\n`)

    // 8. Criar Categorias Financeiras
    console.log('💰 Criando categorias financeiras...')
    
    const categories = [
      { name: 'Taxa de Condomínio', type: 'INCOME' as const },
      { name: 'Água', type: 'EXPENSE' as const },
      { name: 'Luz', type: 'EXPENSE' as const },
      { name: 'Limpeza', type: 'EXPENSE' as const },
      { name: 'Manutenção', type: 'EXPENSE' as const },
      { name: 'Segurança', type: 'EXPENSE' as const },
      { name: 'Salários', type: 'EXPENSE' as const },
      { name: 'Multas', type: 'INCOME' as const }
    ]

    for (const cat of categories) {
      await prisma.financialCategory.create({
        data: {
          condominiumId: condominium.id,
          name: cat.name,
          type: cat.type,
          isActive: true
        }
      })
      console.log(`✅ Categoria criada: ${cat.name} (${cat.type})`)
    }
    console.log('')

    // 9. Criar Entradas Financeiras de Exemplo
    console.log('📊 Criando entradas financeiras de exemplo...')
    
    // Receitas - Taxa de condomínio dos moradores
    const taxaCategory = await prisma.financialCategory.findFirst({
      where: { name: 'Taxa de Condomínio', condominiumId: condominium.id }
    })

    const thisMonth = new Date()
    thisMonth.setDate(10) // Vencimento dia 10

    if (taxaCategory) {
      // Criar conta financeira padrão
      const defaultAccount = await prisma.financialAccount.create({
        data: {
          condominiumId: condominium.id,
          accountName: 'Conta Principal',
          accountType: 'CHECKING',
          isActive: true
        }
      })

      await prisma.financialEntry.create({
        data: {
          condominiumId: condominium.id,
          accountId: defaultAccount.id,
          categoryId: taxaCategory.id,
          description: `Taxa de Condomínio - Bloco ${units[0].block}, Apt ${units[0].number}`,
          amount: 450.00,
          type: 'INCOME',
          dueDate: thisMonth,
          status: 'PAID',
          unitId: units[0].id,
          createdBy: adminUser.id
        }
      })

      await prisma.financialEntry.create({
        data: {
          condominiumId: condominium.id,
          accountId: defaultAccount.id,
          categoryId: taxaCategory.id,
          description: `Taxa de Condomínio - Bloco ${units[5].block}, Apt ${units[5].number}`,
          amount: 450.00,
          type: 'INCOME',
          dueDate: thisMonth,
          status: 'PENDING',
          unitId: units[5].id,
          createdBy: adminUser.id
        }
      })
      console.log('✅ Receitas criadas: 2 taxas de condomínio')
    }

    // Despesas
    const luzCategory = await prisma.financialCategory.findFirst({
      where: { name: 'Luz', condominiumId: condominium.id }
    })

    if (luzCategory) {
      const defaultAccount = await prisma.financialAccount.findFirst({
        where: { condominiumId: condominium.id }
      })
      
      if (defaultAccount) {
        await prisma.financialEntry.create({
          data: {
            condominiumId: condominium.id,
            accountId: defaultAccount.id,
            categoryId: luzCategory.id,
            description: 'Conta de luz - Áreas comuns',
            amount: 850.00,
            type: 'EXPENSE',
            dueDate: new Date(),
            status: 'PAID',
            createdBy: adminUser.id
          }
        })
      }
      console.log('✅ Despesa criada: Conta de luz')
    }

    const aguaCategory = await prisma.financialCategory.findFirst({
      where: { name: 'Água', condominiumId: condominium.id }
    })

    if (aguaCategory) {
      const defaultAccount = await prisma.financialAccount.findFirst({
        where: { condominiumId: condominium.id }
      })
      
      if (defaultAccount) {
        await prisma.financialEntry.create({
          data: {
            condominiumId: condominium.id,
            accountId: defaultAccount.id,
            categoryId: aguaCategory.id,
            description: 'Conta de água - Áreas comuns',
            amount: 620.00,
            type: 'EXPENSE',
            dueDate: new Date(),
            status: 'PENDING',
            createdBy: adminUser.id
          }
        })
      }
      console.log('✅ Despesa criada: Conta de água')
    }
    console.log('')

    // 10. Criar Logs de Acesso de Exemplo
    console.log('📝 Criando logs de acesso...')
    
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)

    await prisma.accessLog.create({
      data: {
        condominiumId: condominium.id,
        userId: morador1User.id,
        accessType: 'RESIDENT',
        accessMethod: 'FACIAL_RECOGNITION',
        status: 'APPROVED',
        entryExit: 'ENTRY',
        location: `Portaria Principal - Bloco ${units[0].block}`,
        notes: `Reconhecimento facial: ${morador1User.name} (95.5% confiança)`,
        timestamp: twoHoursAgo
      }
    })

    await prisma.accessLog.create({
      data: {
        condominiumId: condominium.id,
        userId: morador2User.id,
        accessType: 'RESIDENT',
        accessMethod: 'FACIAL_RECOGNITION',
        status: 'APPROVED',
        entryExit: 'ENTRY',
        location: `Portaria Principal - Bloco ${units[5].block}`,
        notes: `Reconhecimento facial: ${morador2User.name} (92.3% confiança)`,
        timestamp: oneHourAgo
      }
    })

    await prisma.accessLog.create({
      data: {
        condominiumId: condominium.id,
        accessType: 'GUEST',
        accessMethod: 'ACCESS_CODE',
        status: 'APPROVED',
        entryExit: 'ENTRY',
        location: `Portaria Principal - Bloco ${units[0].block}`,
        notes: `Acesso por código QR: ${guest.name}`,
        timestamp: now
      }
    })

    console.log('✅ 3 logs de acesso criados\n')

    // Resumo Final
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎉 CONFIGURAÇÃO INICIAL CONCLUÍDA COM SUCESSO!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    console.log('📋 DADOS DE ACESSO:\n')
    console.log('👤 Administrador:')
    console.log(`   Email: admin@doorserp.com`)
    console.log(`   Senha: admin123\n`)
    
    console.log('🏠 Moradores:')
    console.log(`   Email: joao.silva@email.com`)
    console.log(`   Senha: morador123`)
    console.log(`   Unidade: Bloco ${units[0].block}, Apt ${units[0].number}\n`)
    
    console.log(`   Email: maria.santos@email.com`)
    console.log(`   Senha: morador123`)
    console.log(`   Unidade: Bloco ${units[5].block}, Apt ${units[5].number}\n`)
    
    console.log('👷 Funcionários (senha padrão: func123):')
    console.log(`   - carlos.porteiro@residencial.com`)
    console.log(`   - ana.zeladora@residencial.com`)
    console.log(`   - roberto.sindico@residencial.com\n`)
    
    console.log('📊 Estatísticas:')
    console.log(`   - Condomínio: ${condominium.name}`)
    console.log(`   - Unidades: ${units.length} (${units.filter(u => u.isOccupied).length} ocupadas)`)
    console.log(`   - Moradores: 2`)
    console.log(`   - Funcionários: 3`)
    console.log(`   - Convidados: 1`)
    console.log(`   - Logs de acesso: 3`)
    console.log(`   - Categorias financeiras: ${categories.length}`)
    console.log(`   - Entradas financeiras: 4\n`)
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✨ Sistema pronto para uso!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  } catch (error) {
    console.error('❌ Erro durante a criação:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
