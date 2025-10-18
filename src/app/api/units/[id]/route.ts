import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { monthlyFee } = body

    if (!monthlyFee || monthlyFee < 0) {
      return NextResponse.json(
        { error: 'Taxa mensal inválida' },
        { status: 400 }
      )
    }

    const unit = await prisma.unit.update({
      where: { id },
      data: { monthlyFee }
    })

    return NextResponse.json({
      success: true,
      message: 'Taxa atualizada com sucesso',
      data: unit
    })

  } catch (error) {
    console.error('Erro ao atualizar unidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
