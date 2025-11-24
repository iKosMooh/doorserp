import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { PaymentStatus, Prisma } from "@prisma/client"

// PUT - Atualizar entrada financeira
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { 
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

    // Verificar se a entrada existe
    const existingEntry = await prisma.financialEntry.findUnique({
      where: { id },
      include: {
        category: true
      }
    })

    if (!existingEntry) {
      return NextResponse.json(
        { error: "Entrada financeira não encontrada" },
        { status: 404 }
      )
    }

    // Preparar dados para atualização
    const updateData: Prisma.FinancialEntryUncheckedUpdateInput = {}

    if (description !== undefined) updateData.description = description
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (type !== undefined) updateData.type = type
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate)
    
    if (status !== undefined) {
      updateData.status = status as PaymentStatus
      // Se marcar como pago, adicionar data de pagamento
      if (status === 'PAID') {
        if (paymentDate) {
          updateData.paidDate = new Date(paymentDate)
        } else if (!existingEntry.paidDate) {
          updateData.paidDate = new Date()
        }
        updateData.paidAmount = amount ? parseFloat(amount) : existingEntry.amount
      } else if (status !== 'PAID' && status !== 'PARTIAL') {
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
    if (unitNumber !== undefined || building !== undefined) {
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
      } else {
        // Limpar unidade se passar valores vazios
        updateData.unitId = null
        updateData.residentId = null
      }
    }

    // Atualizar entrada
    const updatedEntry = await prisma.financialEntry.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        unit: true,
        resident: {
          include: {
            user: true
          }
        }
      }
    })

    return NextResponse.json({
      id: updatedEntry.id,
      description: updatedEntry.description,
      amount: Number(updatedEntry.amount),
      type: updatedEntry.type,
      category: updatedEntry.category?.name || 'Sem categoria',
      dueDate: updatedEntry.dueDate?.toISOString() || updatedEntry.transactionDate.toISOString(),
      paymentDate: updatedEntry.paidDate?.toISOString() || null,
      status: updatedEntry.status,
      createdAt: updatedEntry.createdAt.toISOString(),
      unitNumber: updatedEntry.unit?.number || null,
      building: updatedEntry.unit?.block || null
    })

  } catch (error) {
    console.error("Erro ao atualizar entrada financeira:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// DELETE - Excluir entrada financeira
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // Excluir entrada
    await prisma.financialEntry.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: "Entrada financeira excluída com sucesso"
    })

  } catch (error) {
    console.error("Erro ao excluir entrada financeira:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// PATCH - Atualizar status da entrada
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, paymentDate } = body

    if (!status) {
      return NextResponse.json(
        { error: "Status é obrigatório" },
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

    // Preparar atualização
    const updateData: Prisma.FinancialEntryUncheckedUpdateInput = {
      status: status as PaymentStatus
    }

    // Se marcar como pago
    if (status === 'PAID') {
      updateData.paidDate = paymentDate ? new Date(paymentDate) : new Date()
      updateData.paidAmount = existingEntry.amount
    } else if (status !== 'PARTIAL') {
      updateData.paidDate = null
      updateData.paidAmount = 0
    }

    // Atualizar
    const updatedEntry = await prisma.financialEntry.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: `Status atualizado para ${status}`,
      entry: {
        id: updatedEntry.id,
        status: updatedEntry.status,
        paidDate: updatedEntry.paidDate,
        paidAmount: Number(updatedEntry.paidAmount)
      }
    })

  } catch (error) {
    console.error("Erro ao atualizar status:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
