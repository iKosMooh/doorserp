import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Gerar receitas recorrentes mensais baseadas nas unidades ativas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { condominiumId, referenceMonth, userId } = body

    if (!condominiumId || !referenceMonth || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Campos obrigatórios: condominiumId, referenceMonth, userId'
      }, { status: 400 })
    }

    // Buscar todas as unidades ativas do condomínio
    const allActiveUnits = await prisma.unit.findMany({
      where: {
        condominiumId,
        isActive: true
      },
      include: {
        residents: {
          where: { isActive: true },
          include: {
            user: true
          }
        }
      }
    })

    // Filtrar apenas unidades que têm moradores ativos (ocupadas)
    const activeUnits = allActiveUnits.filter(unit => 
      unit.residents && unit.residents.length > 0
    )

    if (activeUnits.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma unidade ativa com moradores encontrada. Certifique-se de que as unidades têm moradores cadastrados e ativos.'
      }, { status: 404 })
    }

    // Verificar se já existem receitas para este mês
    const existingEntries = await prisma.financialEntry.findMany({
      where: {
        condominiumId,
        referenceMonth,
        type: 'INCOME',
        description: {
          contains: 'Taxa Condominial'
        }
      }
    })

    if (existingEntries.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Já existem ${existingEntries.length} receitas para o mês ${referenceMonth}. Use a função de atualização em massa se precisar alterar os valores.`
      }, { status: 400 })
    }

    // Buscar ou criar categoria "Taxa Condominial"
    let category = await prisma.financialCategory.findFirst({
      where: {
        condominiumId,
        name: 'Taxa Condominial',
        type: 'INCOME'
      }
    })

    if (!category) {
      category = await prisma.financialCategory.create({
        data: {
          condominiumId,
          name: 'Taxa Condominial',
          description: 'Taxa mensal de condomínio',
          type: 'INCOME',
          isDefault: true
        }
      })
    }

    // Buscar ou criar conta financeira padrão
    let account = await prisma.financialAccount.findFirst({
      where: {
        condominiumId,
        isActive: true
      }
    })

    if (!account) {
      account = await prisma.financialAccount.create({
        data: {
          condominiumId,
          accountName: 'Conta Corrente Principal',
          accountType: 'CHECKING',
          currentBalance: 0
        }
      })
    }

    // Criar entradas financeiras para cada unidade
    const entries = []
    const [year, month] = referenceMonth.split('-')
    const dueDate = new Date(parseInt(year), parseInt(month) - 1, 10) // Vencimento dia 10

    for (const unit of activeUnits) {
      const resident = unit.residents[0]
      
      const entry = await prisma.financialEntry.create({
        data: {
          condominiumId,
          accountId: account.id,
          categoryId: category.id,
          description: `Taxa Condominial - ${unit.block}/${unit.number}`,
          amount: unit.monthlyFee,
          type: 'INCOME',
          status: 'PENDING',
          dueDate,
          referenceMonth,
          unitId: unit.id,
          residentId: resident?.id || null,
          isRecurring: true,
          recurrencePattern: 'MONTHLY',
          createdBy: userId
        }
      })

      entries.push(entry)
    }

    return NextResponse.json({
      success: true,
      message: `${entries.length} receitas recorrentes criadas com sucesso`,
      data: {
        count: entries.length,
        totalAmount: entries.reduce((sum, entry) => sum + Number(entry.amount), 0),
        referenceMonth
      }
    })

  } catch (error) {
    console.error('Erro ao gerar receitas recorrentes:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 })
  }
}

// PUT - Atualizar valores em massa
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { condominiumId, referenceMonth, newAmount, updateType, userId } = body

    if (!condominiumId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Campos obrigatórios: condominiumId, userId'
      }, { status: 400 })
    }

    // Se for atualizar valores de um mês específico
    if (updateType === 'month' && referenceMonth) {
      const whereClause = {
        condominiumId,
        type: 'INCOME' as const,
        referenceMonth,
        description: {
          contains: 'Taxa Condominial'
        }
      }

      // Atualizar as entradas existentes
      const updated = await prisma.financialEntry.updateMany({
        where: whereClause,
        data: {
          amount: newAmount
        }
      })

      return NextResponse.json({
        success: true,
        message: `${updated.count} receitas atualizadas com sucesso`,
        data: {
          count: updated.count,
          newAmount,
          referenceMonth
        }
      })
    }

    // Se for atualizar o valor base das unidades (monthlyFee)
    if (updateType === 'units') {
      const updated = await prisma.unit.updateMany({
        where: {
          condominiumId,
          isActive: true
        },
        data: {
          monthlyFee: newAmount
        }
      })

      return NextResponse.json({
        success: true,
        message: `${updated.count} unidades atualizadas com sucesso. As próximas receitas geradas usarão o novo valor.`,
        data: {
          count: updated.count,
          newAmount
        }
      })
    }

    return NextResponse.json({
      success: false,
      error: 'updateType inválido. Use "month" ou "units"'
    }, { status: 400 })

  } catch (error) {
    console.error('Erro ao atualizar valores em massa:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 })
  }
}

// GET - Verificar receitas de um mês
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const condominiumId = searchParams.get('condominiumId')
    const referenceMonth = searchParams.get('referenceMonth')

    if (!condominiumId) {
      return NextResponse.json({
        success: false,
        error: 'condominiumId é obrigatório'
      }, { status: 400 })
    }

    const whereClause = {
      condominiumId,
      type: 'INCOME' as const,
      isRecurring: true,
      ...(referenceMonth && { referenceMonth })
    }

    const entries = await prisma.financialEntry.findMany({
      where: whereClause,
      include: {
        unit: true,
        resident: {
          include: {
            user: true
          }
        },
        category: true
      },
      orderBy: {
        dueDate: 'desc'
      }
    })

    const summary = {
      total: entries.length,
      totalAmount: entries.reduce((sum, entry) => sum + Number(entry.amount), 0),
      paid: entries.filter(e => e.status === 'PAID').length,
      pending: entries.filter(e => e.status === 'PENDING').length,
      overdue: entries.filter(e => e.status === 'OVERDUE').length
    }

    return NextResponse.json({
      success: true,
      data: entries,
      summary
    })

  } catch (error) {
    console.error('Erro ao buscar receitas recorrentes:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 })
  }
}
