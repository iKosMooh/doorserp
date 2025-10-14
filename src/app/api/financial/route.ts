import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { PaymentStatus, Prisma } from "@prisma/client"

export async function GET() {
  try {
    const entries = await prisma.financialEntry.findMany({
      include: {
        resident: {
          include: {
            user: true
          }
        },
        unit: true,
        category: true,
        account: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const now = new Date()
    
    const formattedEntries = entries.map((entry) => {
      // Calcular status automático baseado na data
      let status = entry.status
      if (status === 'PENDING' && entry.dueDate && entry.dueDate < now) {
        status = 'OVERDUE' // Vencido se passou da data e ainda está pendente
      }

      return {
        id: entry.id,
        description: entry.description,
        amount: Number(entry.amount),
        type: entry.type,
        category: entry.category?.name || 'Sem categoria',
        dueDate: entry.dueDate?.toISOString() || entry.transactionDate.toISOString(),
        paymentDate: entry.paidDate?.toISOString() || null,
        status: status,
        createdAt: entry.createdAt.toISOString(),
        residentId: entry.resident?.id || null,
        residentName: entry.resident?.user?.name || null,
        unitNumber: entry.unit?.number || null,
        building: entry.unit?.block || null
      }
    })

    return NextResponse.json(formattedEntries)
  } catch (error) {
    console.error("Erro ao buscar entradas financeiras:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      description, 
      amount, 
      type, 
      category, 
      dueDate,
      unitNumber,
      building,
      status = "PENDING"
    } = body

    // Validações básicas
    if (!description || !amount || !type || !category || !dueDate) {
      return NextResponse.json(
        { error: "Descrição, valor, tipo, categoria e data de vencimento são obrigatórios" },
        { status: 400 }
      )
    }

    // Validar tipo
    if (!["INCOME", "EXPENSE"].includes(type)) {
      return NextResponse.json(
        { error: "Tipo deve ser INCOME ou EXPENSE" },
        { status: 400 }
      )
    }

    // Validar status
    if (!["PENDING", "PAID", "OVERDUE", "CANCELLED", "PARTIAL"].includes(status)) {
      return NextResponse.json(
        { error: "Status inválido" },
        { status: 400 }
      )
    }

    // Buscar primeiro condomínio (assumindo que existe pelo menos um)
    const firstCondominium = await prisma.condominium.findFirst()
    if (!firstCondominium) {
      return NextResponse.json(
        { error: "Nenhum condomínio encontrado. Crie um condomínio primeiro." },
        { status: 400 }
      )
    }

    // Buscar ou criar categoria padrão
    let financialCategory = await prisma.financialCategory.findFirst({
      where: {
        name: category,
        condominiumId: firstCondominium.id
      }
    })

    if (!financialCategory) {
      financialCategory = await prisma.financialCategory.create({
        data: {
          name: category,
          type: type,
          condominiumId: firstCondominium.id,
          isActive: true
        }
      })
    }

    // Buscar ou criar conta padrão
    let financialAccount = await prisma.financialAccount.findFirst({
      where: {
        condominiumId: firstCondominium.id
      }
    })

    if (!financialAccount) {
      financialAccount = await prisma.financialAccount.create({
        data: {
          accountName: "Conta Principal",
          accountType: "CHECKING",
          condominiumId: firstCondominium.id,
          currentBalance: 0,
          isActive: true
        }
      })
    }

    // Buscar usuário admin (primeiro usuário com isAdmin true)
    const adminUser = await prisma.user.findFirst({
      where: { isAdmin: true }
    })

    if (!adminUser) {
      return NextResponse.json(
        { error: "Nenhum usuário administrador encontrado" },
        { status: 400 }
      )
    }

    // Buscar unidade se fornecida
    let unitId: string | undefined = undefined
    let residentId: string | undefined = undefined

    if (unitNumber && building) {
      const unit = await prisma.unit.findFirst({
        where: {
          number: unitNumber,
          block: building,
          condominiumId: firstCondominium.id
        },
        include: {
          residents: {
            where: { isActive: true },
            take: 1
          }
        }
      })

      if (unit) {
        unitId = unit.id
        residentId = unit.residents[0]?.id
      }
    }

    // Criar entrada financeira
    const entry = await prisma.financialEntry.create({
      data: {
        description,
        amount: parseFloat(amount),
        type,
        categoryId: financialCategory.id,
        accountId: financialAccount.id,
        condominiumId: firstCondominium.id,
        createdBy: adminUser.id,
        transactionDate: new Date(),
        dueDate: new Date(dueDate),
        status: status as PaymentStatus,
        paidDate: status === 'PAID' ? new Date() : null,
        paidAmount: status === 'PAID' ? parseFloat(amount) : 0,
        unitId: unitId,
        residentId: residentId
      }
    })

    return NextResponse.json({
      success: true,
      message: "Entrada financeira criada com sucesso",
      entry: {
        id: entry.id,
        description: entry.description,
        amount: Number(entry.amount),
        type: entry.type,
        category: category,
        dueDate: entry.dueDate,
        status: entry.status,
        createdAt: entry.createdAt
      }
    })

  } catch (error) {
    console.error("Erro ao criar entrada financeira:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      id, 
      description,
      amount,
      type,
      category,
      dueDate,
      paymentDate, 
      status,
      unitNumber,
      building
    } = body

    if (!id) {
      return NextResponse.json(
        { error: "ID da entrada é obrigatório" },
        { status: 400 }
      )
    }

    // Verificar se a entrada existe
    const existingEntry = await prisma.financialEntry.findUnique({
      where: { id }
    })

    if (!existingEntry) {
      return NextResponse.json(
        { error: "Entrada financeira não encontrada" },
        { status: 404 }
      )
    }

    // Preparar dados para atualização
    const updateData: Prisma.FinancialEntryUncheckedUpdateInput = {}

    if (description) updateData.description = description
    if (amount) updateData.amount = parseFloat(amount)
    if (type) updateData.type = type
    if (dueDate) updateData.dueDate = new Date(dueDate)
    
    if (status) {
      updateData.status = status
      // Se marcar como pago, adicionar data de pagamento
      if (status === 'PAID' && !paymentDate) {
        updateData.paidDate = new Date()
        updateData.paidAmount = amount ? parseFloat(amount) : existingEntry.amount
      } else if (status === 'PAID' && paymentDate) {
        updateData.paidDate = new Date(paymentDate)
        updateData.paidAmount = amount ? parseFloat(amount) : existingEntry.amount
      } else if (status !== 'PAID') {
        updateData.paidDate = null
        updateData.paidAmount = 0
      }
    }

    // Atualizar categoria se fornecida
    if (category) {
      let financialCategory = await prisma.financialCategory.findFirst({
        where: {
          name: category,
          condominiumId: existingEntry.condominiumId
        }
      })

      if (!financialCategory) {
        financialCategory = await prisma.financialCategory.create({
          data: {
            name: category,
            type: type || existingEntry.type,
            condominiumId: existingEntry.condominiumId,
            isActive: true
          }
        })
      }

      updateData.categoryId = financialCategory.id
    }

    // Buscar unidade se fornecida
    if (unitNumber && building) {
      const unit = await prisma.unit.findFirst({
        where: {
          number: unitNumber,
          block: building,
          condominiumId: existingEntry.condominiumId
        },
        include: {
          residents: {
            where: { isActive: true },
            take: 1
          }
        }
      })

      if (unit) {
        updateData.unitId = unit.id
        updateData.residentId = unit.residents[0]?.id || null
      }
    }

    // Atualizar entrada
    const updatedEntry = await prisma.financialEntry.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: "Entrada financeira atualizada com sucesso",
      entry: {
        id: updatedEntry.id,
        description: updatedEntry.description,
        amount: Number(updatedEntry.amount),
        type: updatedEntry.type,
        dueDate: updatedEntry.dueDate,
        status: updatedEntry.status,
        paidDate: updatedEntry.paidDate
      }
    })

  } catch (error) {
    console.error("Erro ao atualizar entrada financeira:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
