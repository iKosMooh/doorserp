import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const entries = await prisma.financialEntry.findMany({
      include: {
        resident: {
          include: {
            user: true,
            unit: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedEntries = entries.map((entry) => ({
      id: entry.id,
      description: entry.description,
      amount: entry.value ? Number(entry.value) : 0,
      type: entry.type,
      category: entry.category || '',
      dueDate: entry.dueDate?.toISOString() || entry.date.toISOString(),
      paymentDate: entry.paidDate?.toISOString() || null,
      status: entry.isPaid ? 'PAID' : 'PENDING',
      createdAt: entry.createdAt.toISOString(),
      residentId: entry.resident?.id || null,
      residentName: entry.resident?.user?.name || null,
      unitNumber: entry.resident?.unit?.number || null,
      building: entry.resident?.unit?.block || null
    }))

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
      unitId,
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

    // Se residentId foi fornecido, verificar se existe
    if (unitId) {
      const resident = await prisma.resident.findUnique({
        where: { id: unitId }
      })

      if (!resident) {
        return NextResponse.json(
          { error: "Morador não encontrado" },
          { status: 404 }
        )
      }
    }

    // Criar entrada financeira
    const entry = await prisma.financialEntry.create({
      data: {
        description,
        value: parseFloat(amount),
        type,
        category,
        dueDate: new Date(dueDate),
        isPaid: status === 'PAID',
        residentId: unitId || undefined
      }
    })

    return NextResponse.json({
      success: true,
      message: "Entrada financeira criada com sucesso",
      entry: {
        id: entry.id,
        description: entry.description,
        amount: Number(entry.value),
        type: entry.type,
        category: entry.category,
        dueDate: entry.dueDate,
        status: entry.isPaid ? 'PAID' : 'PENDING',
        createdAt: entry.createdAt
      }
    })

  } catch (error) {
    console.error("Erro ao criar entrada financeira:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, paymentDate, status } = body

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

    // Atualizar entrada
    const updatedEntry = await prisma.financialEntry.update({
      where: { id },
      data: {
        paidDate: paymentDate ? new Date(paymentDate) : undefined,
        isPaid: status === 'PAID' ? true : status === 'PENDING' ? false : undefined
      }
    })

    return NextResponse.json({
      success: true,
      message: "Entrada financeira atualizada com sucesso",
      entry: updatedEntry
    })

  } catch (error) {
    console.error("Erro ao atualizar entrada financeira:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
