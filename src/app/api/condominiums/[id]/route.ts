import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as fs from 'fs'
import * as path from 'path'

// Função utilitária para excluir pastas de reconhecimento facial
function deleteFaceRecognitionFolder(folderName: string) {
  try {
    const labelsPath = path.join(process.cwd(), 'public', 'assets', 'lib', 'face-api', 'labels', folderName)
    if (fs.existsSync(labelsPath)) {
      fs.rmSync(labelsPath, { recursive: true, force: true })
      console.log(`Pasta de reconhecimento facial excluída: ${folderName}`)
    }
  } catch (error) {
    console.error(`Erro ao excluir pasta de reconhecimento facial ${folderName}:`, error)
  }
}

// GET /api/condominiums/[id] - Buscar condomínio por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const condominium = await prisma.condominium.findUnique({
      where: { id },
      include: {
        units: {
          select: {
            id: true,
            block: true,
            number: true,
            unitType: true,
            isOccupied: true
          }
        },
        residents: {
          select: {
            id: true,
            relationshipType: true,
            isActive: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        employees: {
          select: {
            id: true,
            position: true,
            department: true,
            isActive: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            units: true,
            residents: true,
            employees: true,
            guests: true,
            accessLogs: true
          }
        }
      }
    })

    if (!condominium) {
      return NextResponse.json(
        { error: 'Condomínio não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(condominium)
  } catch (error) {
    console.error('Erro ao buscar condomínio:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/condominiums/[id] - Atualizar condomínio
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Verificar se o condomínio existe
    const existingCondominium = await prisma.condominium.findUnique({
      where: { id }
    })

    if (!existingCondominium) {
      return NextResponse.json(
        { error: 'Condomínio não encontrado' },
        { status: 404 }
      )
    }

    // Validar dados obrigatórios
    if (!body.name || !body.address || !body.city || !body.state || !body.zipCode) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, address, city, state, zipCode' },
        { status: 400 }
      )
    }

    // Verificar se CNPJ já existe em outro condomínio (se fornecido)
    if (body.cnpj) {
      const cnpjExists = await prisma.condominium.findFirst({
        where: {
          cnpj: body.cnpj,
          id: { not: id } // Excluir o próprio condomínio da verificação
        }
      })

      if (cnpjExists) {
        return NextResponse.json(
          { error: 'CNPJ já está em uso por outro condomínio' },
          { status: 409 }
        )
      }
    }

    // Atualizar condomínio
    const updatedCondominium = await prisma.condominium.update({
      where: { id },
      data: {
        name: body.name,
        cnpj: body.cnpj || null,
        address: body.address,
        city: body.city,
        state: body.state,
        zipCode: body.zipCode,
        phone: body.phone || null,
        email: body.email || null,
        adminContact: body.adminContact || null,
        totalUnits: body.totalUnits || 0,
        isActive: body.isActive !== undefined ? body.isActive : true,
        subscriptionPlan: body.subscriptionPlan || 'BASIC',
        subscriptionExpiresAt: body.subscriptionExpiresAt || null
      }
    })

    return NextResponse.json({
      message: 'Condomínio atualizado com sucesso',
      condominium: updatedCondominium
    })
  } catch (error) {
    console.error('Erro ao atualizar condomínio:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/condominiums/[id] - Excluir condomínio e todos os dados relacionados
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verificar se o condomínio existe
    const existingCondominium = await prisma.condominium.findUnique({
      where: { id },
      include: {
        residents: {
          include: {
            user: true
          }
        },
        employees: {
          include: {
            user: true
          }
        }
      }
    })

    if (!existingCondominium) {
      return NextResponse.json(
        { error: 'Condomínio não encontrado' },
        { status: 404 }
      )
    }

    // Usar transação para garantir que tudo seja excluído ou nada seja excluído
    await prisma.$transaction(async (tx) => {
      console.log(`Iniciando exclusão em cascata do condomínio: ${existingCondominium.name}`)

      // 1. Excluir logs de acesso
      const deletedAccessLogs = await tx.accessLog.deleteMany({
        where: { condominiumId: id }
      })
      console.log(`${deletedAccessLogs.count} logs de acesso excluídos`)

      // 2. Excluir alertas de segurança
      const deletedSecurityAlerts = await tx.securityAlert.deleteMany({
        where: { condominiumId: id }
      })
      console.log(`${deletedSecurityAlerts.count} alertas de segurança excluídos`)

      // 3. Excluir entradas financeiras
      const deletedFinancialEntries = await tx.financialEntry.deleteMany({
        where: { condominiumId: id }
      })
      console.log(`${deletedFinancialEntries.count} entradas financeiras excluídas`)

      // 4. Excluir hóspedes
      const deletedGuests = await tx.guest.deleteMany({
        where: { condominiumId: id }
      })
      console.log(`${deletedGuests.count} hóspedes excluídos`)

      // 5. Excluir moradores
      const deletedResidents = await tx.resident.deleteMany({
        where: { condominiumId: id }
      })
      console.log(`${deletedResidents.count} moradores excluídos`)

      // 6. Excluir funcionários
      const deletedEmployees = await tx.employee.deleteMany({
        where: { condominiumId: id }
      })
      console.log(`${deletedEmployees.count} funcionários excluídos`)

      // 7. Excluir unidades
      const deletedUnits = await tx.unit.deleteMany({
        where: { condominiumId: id }
      })
      console.log(`${deletedUnits.count} unidades excluídas`)

      // 8. Excluir configurações do Arduino
      const deletedArduinoConfigs = await tx.arduinoConfiguration.deleteMany({
        where: { condominiumId: id }
      })
      console.log(`${deletedArduinoConfigs.count} configurações Arduino excluídas`)

      // 9. Excluir acessos de usuários ao condomínio
      const deletedUserAccess = await tx.userCondominiumAccess.deleteMany({
        where: { condominiumId: id }
      })
      console.log(`${deletedUserAccess.count} acessos de usuário excluídos`)

      // 10. Finalmente, excluir o condomínio
      await tx.condominium.delete({
        where: { id }
      })
      console.log('Condomínio excluído')
    })

    // 11. Excluir pastas de reconhecimento facial (após a transação para não afetar o rollback)
    try {
      // Excluir pastas dos moradores
      for (const resident of existingCondominium.residents) {
        if (resident.user.faceRecognitionFolder) {
          deleteFaceRecognitionFolder(resident.user.faceRecognitionFolder)
        }
      }

      // Excluir pastas dos funcionários
      for (const employee of existingCondominium.employees) {
        if (employee.user.faceRecognitionFolder) {
          deleteFaceRecognitionFolder(employee.user.faceRecognitionFolder)
        }
      }
    } catch (error) {
      console.error('Erro ao excluir pastas de reconhecimento facial:', error)
      // Não falha a operação se houver erro na exclusão das pastas
    }

    return NextResponse.json({
      message: `Condomínio "${existingCondominium.name}" e todos os dados relacionados foram excluídos com sucesso`,
      deletedData: {
        condominium: existingCondominium.name,
        residents: existingCondominium.residents.length,
        employees: existingCondominium.employees.length
      }
    })
  } catch (error) {
    console.error('Erro ao excluir condomínio:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao excluir condomínio' },
      { status: 500 }
    )
  }
}
